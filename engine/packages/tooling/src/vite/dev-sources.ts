// SPDX-License-Identifier: MIT
import { existsSync, lstatSync, realpathSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { isAbsolute, relative, resolve, sep } from "node:path";

import launchEditor from "launch-editor";
import type { Plugin } from "vite";

import { createAuthoringProjectIndexOwnerV1 } from "../project/authoring-index.ts";
import { createAuthoringScenePortMiddlewareV1 } from "./authoring-scene-port.ts";
import { createChromeLayoutPortMiddlewareV1 } from "./chrome-layout-port.ts";
import { createMotionPortMiddlewareV1 } from "./motion-port.ts";
import { createRegionsPortMiddlewareV1 } from "./regions-port.ts";
import { createScenePortMiddlewareV1 } from "./scene-port.ts";

/**
 * The dev-sources port: a dev-server-only middleware that opens a Story
 * source file in the local editor, so DevTools "open source" actions can
 * jump from a running picture to the file that authored it. It exists only
 * under `vite dev` (`apply: "serve"`): production builds and previews have
 * no such endpoint, and the handler never reads or writes file contents —
 * it only asks the developer's own editor to open a path inside the app.
 */

export type DevSourceResolutionV1 =
  | { readonly kind: "file"; readonly filePath: string }
  | { readonly kind: "bad_request" | "not_found" };

export type DevSourceCreateResolutionV1 =
  | { readonly kind: "create"; readonly filePath: string; readonly directoryPath: string }
  | { readonly kind: "bad_request" | "already_exists" };

function escapesRootV1(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
}

function invalidRelativePathV1(relativePath: string): boolean {
  return (
    relativePath.length === 0 ||
    relativePath.includes("\0") ||
    relativePath.includes("\\") ||
    relativePath.startsWith("/") ||
    relativePath.split("/").includes("node_modules")
  );
}

/**
 * Resolves one project-relative path to a regular file below the
 * application root. Symlinked segments and files are rejected so a local
 * project link can never widen the endpoint beyond the project tree;
 * `node_modules` is out of scope — sources live in the Story's own tree.
 */
export function resolveDevSourcePathV1(
  appRoot: string,
  relativePath: string,
): DevSourceResolutionV1 {
  if (invalidRelativePathV1(relativePath)) {
    return { kind: "bad_request" };
  }

  const root = resolve(appRoot);
  const candidate = resolve(root, relativePath);
  if (escapesRootV1(root, candidate) || !existsSync(root) || !existsSync(candidate)) {
    return { kind: "not_found" };
  }

  try {
    let current = root;
    for (const segment of relative(root, candidate).split(sep)) {
      current = resolve(current, segment);
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) return { kind: "not_found" };
      if (current !== candidate && !stat.isDirectory()) {
        return { kind: "not_found" };
      }
    }
    if (!lstatSync(candidate).isFile()) return { kind: "not_found" };

    const realRoot = realpathSync(root);
    const realCandidate = realpathSync(candidate);
    if (escapesRootV1(realRoot, realCandidate)) {
      return { kind: "not_found" };
    }
  } catch {
    return { kind: "not_found" };
  }

  return { kind: "file", filePath: candidate };
}

/**
 * Resolves one project-relative path for creating a brand-new file below
 * the application root: same path-shape and containment discipline as
 * `resolveDevSourcePathV1`, but the file itself must not exist. Existing
 * ancestor segments must be real (non-symlink) directories so a linked
 * segment can never widen the endpoint; missing trailing directories are
 * the caller's to create (they become real directories).
 */
export function resolveDevSourceCreatePathV1(
  appRoot: string,
  relativePath: string,
): DevSourceCreateResolutionV1 {
  if (invalidRelativePathV1(relativePath)) {
    return { kind: "bad_request" };
  }

  const root = resolve(appRoot);
  const candidate = resolve(root, relativePath);
  if (escapesRootV1(root, candidate) || !existsSync(root) || candidate === root) {
    return { kind: "bad_request" };
  }
  if (existsSync(candidate)) return { kind: "already_exists" };

  try {
    let current = root;
    for (const segment of relative(root, candidate).split(sep)) {
      current = resolve(current, segment);
      if (!existsSync(current)) continue;
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) return { kind: "bad_request" };
      // An existing non-directory segment means the path routes through a
      // file; nothing can be created below it.
      if (current !== candidate && !stat.isDirectory()) {
        return { kind: "bad_request" };
      }
    }
    // Containment re-check after symlink resolution of the existing tree.
    let deepestExisting = root;
    for (const segment of relative(root, candidate).split(sep)) {
      const next = resolve(deepestExisting, segment);
      if (!existsSync(next)) break;
      deepestExisting = next;
    }
    const realRoot = realpathSync(root);
    const realDeepest = realpathSync(deepestExisting);
    if (deepestExisting !== root && escapesRootV1(realRoot, realDeepest)) {
      return { kind: "bad_request" };
    }
  } catch {
    return { kind: "bad_request" };
  }

  return {
    kind: "create",
    filePath: candidate,
    directoryPath: resolve(candidate, ".."),
  };
}

export const devSourcesOpenUrlV1 = "/__sillymaker/dev-sources/open";

export const devSourcesUrlPrefixV1 = "/__sillymaker/dev-sources/";

/**
 * Same-origin gate in front of every dev-sources endpoint. The dev server
 * binds to localhost, but any web page open in the developer's browser can
 * still fire requests at it (the classic CSRF shape): without this gate a
 * malicious page could pop the developer's editor or, knowing a digest,
 * write schema-valid scene/motion/regions/chrome-layout documents into the project tree.
 * Browsers attach `Sec-Fetch-Site` to every fetch they originate, so
 * anything that is not our own origin (or a direct user navigation) is
 * rejected whole. Requests without the header — curl, scripts, tests,
 * non-browser tooling — pass: the boundary defended here is the browser.
 */
export function createDevSourcesOriginGuardV1(): (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void {
  return (request, response, next) => {
    const [pathname = ""] = (request.url ?? "").split("?", 2);
    if (!pathname.startsWith(devSourcesUrlPrefixV1)) {
      next();
      return;
    }
    const site = request.headers["sec-fetch-site"];
    if (site === undefined || site === "same-origin" || site === "none") {
      next();
      return;
    }
    response.statusCode = 403;
    response.end("cross-origin request rejected");
  };
}

export interface CreateDevSourcesMiddlewareInputV1 {
  readonly appRoot: string;
  /** Injectable editor launcher; defaults to `launch-editor`. */
  launch?(filePath: string): void;
}

/** Connect-style handler; exported separately so tests can drive it. */
export function createDevSourcesMiddlewareV1(
  input: CreateDevSourcesMiddlewareInputV1,
): (request: IncomingMessage, response: ServerResponse, next: () => void) => void {
  const launch = input.launch ?? ((filePath: string) => launchEditor(filePath));
  return (request, response, next) => {
    const [pathname = "", query = ""] = (request.url ?? "").split("?", 2);
    if (pathname !== devSourcesOpenUrlV1) {
      next();
      return;
    }
    if (request.method !== "POST") {
      response.statusCode = 405;
      response.end("method not allowed");
      return;
    }
    const requestedPath = new URLSearchParams(query).get("path");
    const resolution = requestedPath === null
      ? { kind: "bad_request" as const }
      : resolveDevSourcePathV1(input.appRoot, requestedPath);
    if (resolution.kind !== "file") {
      response.statusCode = resolution.kind === "bad_request" ? 400 : 404;
      response.end("not found");
      return;
    }
    launch(resolution.filePath);
    response.statusCode = 204;
    response.end();
  };
}

/**
 * The `vite dev`-only plugin registering the origin guard ahead of the
 * dev-sources open, motion, regions, chrome-layout, Authoring Scene, and
 * low-level Scene ports.
 */
export function devSourcesPluginV1(appRoot: string): Plugin {
  return {
    name: "sillymaker:dev-sources",
    apply: "serve",
    configureServer(server) {
      const root = resolve(appRoot);
      const projectIndexOwner = createAuthoringProjectIndexOwnerV1(root);
      const invalidateProjectPath = (filePath: string): void => {
        const candidate = isAbsolute(filePath) ? resolve(filePath) : resolve(root, filePath);
        if (escapesRootV1(root, candidate)) return;
        projectIndexOwner.invalidate(relative(root, candidate).split(sep).join("/"));
      };
      server.watcher.on("add", invalidateProjectPath);
      server.watcher.on("change", invalidateProjectPath);
      server.watcher.on("unlink", invalidateProjectPath);
      server.middlewares.use(createDevSourcesOriginGuardV1());
      server.middlewares.use(createDevSourcesMiddlewareV1({ appRoot }));
      server.middlewares.use(createMotionPortMiddlewareV1({ appRoot, projectIndexOwner }));
      server.middlewares.use(createRegionsPortMiddlewareV1({ appRoot, projectIndexOwner }));
      server.middlewares.use(createChromeLayoutPortMiddlewareV1({ appRoot, projectIndexOwner }));
      server.middlewares.use(
        createAuthoringScenePortMiddlewareV1({ appRoot, projectIndexOwner }),
      );
      server.middlewares.use(createScenePortMiddlewareV1({ appRoot, projectIndexOwner }));
    },
  };
}

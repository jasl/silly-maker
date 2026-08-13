// SPDX-License-Identifier: MIT
import { existsSync, lstatSync, realpathSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { isAbsolute, relative, resolve, sep } from "node:path";

import launchEditor from "launch-editor";
import type { Plugin } from "vite";

import { createMotionPortMiddlewareV1 } from "./motion-port.ts";
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

function escapesRootV1(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
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
  if (
    relativePath.length === 0 ||
    relativePath.includes("\0") ||
    relativePath.includes("\\") ||
    relativePath.startsWith("/") ||
    relativePath.split("/").includes("node_modules")
  ) {
    return Object.freeze({ kind: "bad_request" });
  }

  const root = resolve(appRoot);
  const candidate = resolve(root, relativePath);
  if (escapesRootV1(root, candidate) || !existsSync(root) || !existsSync(candidate)) {
    return Object.freeze({ kind: "not_found" });
  }

  try {
    let current = root;
    for (const segment of relative(root, candidate).split(sep)) {
      current = resolve(current, segment);
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) return Object.freeze({ kind: "not_found" });
      if (current !== candidate && !stat.isDirectory()) {
        return Object.freeze({ kind: "not_found" });
      }
    }
    if (!lstatSync(candidate).isFile()) return Object.freeze({ kind: "not_found" });

    const realRoot = realpathSync(root);
    const realCandidate = realpathSync(candidate);
    if (escapesRootV1(realRoot, realCandidate)) {
      return Object.freeze({ kind: "not_found" });
    }
  } catch {
    return Object.freeze({ kind: "not_found" });
  }

  return Object.freeze({ kind: "file", filePath: candidate });
}

export const devSourcesOpenUrlV1 = "/__sillymaker/dev-sources/open";

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
      ? Object.freeze({ kind: "bad_request" as const })
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

/** The `vite dev`-only plugin registering the dev-sources, motion, and scene ports. */
export function devSourcesPluginV1(appRoot: string): Plugin {
  return {
    name: "sillymaker:dev-sources",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(createDevSourcesMiddlewareV1({ appRoot }));
      server.middlewares.use(createMotionPortMiddlewareV1({ appRoot }));
      server.middlewares.use(createScenePortMiddlewareV1({ appRoot }));
    },
  };
}

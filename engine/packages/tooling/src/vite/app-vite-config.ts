// SPDX-License-Identifier: MIT
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import react from "@vitejs/plugin-react";
import type { Plugin, PluginOption, UserConfig } from "vite";

import type { SillymakerAppConfigV1 } from "../project/config-types.ts";
import { defineSillymakerAppV1 } from "../project/config.ts";
import { applyStoryMetadataToHtmlV1, parseStoryMetadataV1 } from "../project/story-metadata.ts";
import {
  collectVersionStampV1,
  parseVersionStampReceiptInternalV1,
  versionStampPluginV1,
  versionStampReceiptEnvironmentKeyInternalV1,
} from "./version-stamp.ts";
import {
  copyRuntimeAssetsV1,
  parseRuntimeAssetContentTypesV1,
  resolveRuntimeAssetPathV1,
  runtimeAssetContentTypeV1,
} from "./runtime-assets.ts";

interface BuildIdentityModuleV1 {
  collect(): Promise<unknown>;
  createPlugin(input: { readonly initialIdentity: unknown }): Plugin;
}

/**
 * Identity collector modules load through the runtime-resolved `require`
 * channel — never a dynamic module expression — so build-identity closures
 * over this assembly stay statically analyzable.
 */
function loadBuildIdentityModuleV1(
  appRoot: string,
  identity: NonNullable<NonNullable<SillymakerAppConfigV1["web"]>["identity"]>,
): BuildIdentityModuleV1 {
  const requireFromAppV1 = createRequire(pathToFileURL(join(appRoot, "package.json")).href);
  const loaded: unknown = requireFromAppV1(resolve(appRoot, identity.module));
  if (typeof loaded !== "object" || loaded === null) {
    throw new TypeError("Story BuildIdentity collector module is invalid");
  }
  const collect = Reflect.get(loaded, identity.collectExport);
  const createPlugin = Reflect.get(loaded, identity.createPluginExport);
  if (typeof collect !== "function" || typeof createPlugin !== "function") {
    throw new TypeError("Story BuildIdentity collector module is invalid");
  }
  return Object.freeze({
    collect: () => collect() as Promise<unknown>,
    createPlugin: (input: { readonly initialIdentity: unknown }) => createPlugin(input) as Plugin,
  });
}

/**
 * Runtime Story assets live at `<appRoot>/assets/**` and are addressed by
 * application-root-relative runtimePaths (for example `assets/x.webp`).
 * This plugin keeps that one path true in every channel: the dev server
 * serves it from disk, and production builds copy the directory into dist
 * under the same relative path (the desktop shell then serves dist
 * verbatim).
 */
function runtimeAssetsPluginV1(
  appRoot: string,
  contentTypes?: Readonly<Record<string, string>>,
): Plugin {
  const assetsDir = resolve(appRoot, "assets");
  const urlPrefix = "/assets/";
  return {
    name: "sillymaker:runtime-assets",
    configureServer(server) {
      if (!existsSync(assetsDir)) return;
      server.middlewares.use((request, response, next) => {
        const url = request.url?.split("?")[0] ?? "";
        if (!url.startsWith(urlPrefix)) {
          next();
          return;
        }
        const resolution = resolveRuntimeAssetPathV1(assetsDir, url.slice(urlPrefix.length));
        if (resolution.kind !== "file") {
          response.statusCode = resolution.kind === "bad_request" ? 400 : 404;
          response.end("not found");
          return;
        }
        response.setHeader(
          "content-type",
          runtimeAssetContentTypeV1(resolution.filePath, contentTypes),
        );
        response.setHeader("x-content-type-options", "nosniff");
        response.end(readFileSync(resolution.filePath));
      });
    },
    async writeBundle(options) {
      if (!existsSync(assetsDir) || options.dir === undefined) return;
      await copyRuntimeAssetsV1(assetsDir, join(options.dir, "assets"));
    },
  };
}

/**
 * Injects share metadata (title/description/Open Graph/Twitter/favicon)
 * from `<appRoot>/metadata.json` into the page at dev and build time.
 * Applications without the file keep their hand-written head untouched.
 */
function storyMetadataPluginV1(appRoot: string): Plugin {
  const metadataPath = resolve(appRoot, "metadata.json");
  return {
    name: "sillymaker:story-metadata",
    transformIndexHtml(html) {
      if (!existsSync(metadataPath)) return html;
      const metadata = parseStoryMetadataV1(
        JSON.parse(readFileSync(metadataPath, "utf8")),
        metadataPath,
      );
      return applyStoryMetadataToHtmlV1(html, metadata);
    },
  };
}

export interface CreateSillymakerAppViteConfigInputV1 {
  /** Absolute application root (the directory holding `sillymaker.config.ts`). */
  readonly appRoot: string;
  /**
   * The application declaration. The app's `vite.config.ts` imports its own
   * `sillymaker.config.ts` statically and passes it here, keeping the whole
   * assembly closure statically analyzable.
   */
  readonly config: SillymakerAppConfigV1;
  /**
   * Optional dev-server content-type overrides for runtime assets
   * (`".ext"` → media type). Entries are merged over the engine defaults with
   * the application winning, so a Story can serve formats the engine does not
   * list yet. Production hosting assigns its own types; builds are unaffected.
   */
  readonly runtimeAssetContentTypes?: Readonly<Record<string, string>>;
}

/**
 * The whole dev/build assembly for one application project: React, runtime
 * assets, share metadata, the optional build-identity virtual module, and
 * the chunking policy. An application's `vite.config.ts` is one call:
 *
 * ```ts
 * export default defineConfig(() =>
 *   createSillymakerAppViteConfigV1({ appRoot: import.meta.dirname }),
 * );
 * ```
 */
export async function createSillymakerAppViteConfigV1(
  input: CreateSillymakerAppViteConfigInputV1,
): Promise<UserConfig> {
  const appRoot = resolve(input.appRoot);
  const config = defineSillymakerAppV1(input.config);
  const web = config.web ?? null;
  if (web === null) {
    throw new TypeError(`application "${config.applicationId}" declares no web target`);
  }

  const runtimeAssetContentTypes = input.runtimeAssetContentTypes === undefined
    ? undefined
    : parseRuntimeAssetContentTypesV1(input.runtimeAssetContentTypes);

  const plugins: PluginOption[] = [];
  if (web.identity !== null && web.identity !== undefined) {
    const identity = loadBuildIdentityModuleV1(appRoot, web.identity);
    plugins.push(identity.createPlugin({ initialIdentity: await identity.collect() }));
  }
  const versionStamp =
    parseVersionStampReceiptInternalV1(process.env[versionStampReceiptEnvironmentKeyInternalV1]) ??
      collectVersionStampV1({ appRoot });
  plugins.push(
    react(),
    runtimeAssetsPluginV1(appRoot, runtimeAssetContentTypes),
    storyMetadataPluginV1(appRoot),
    // Human-facing version stamp (package versions + git commits, all
    // soft-failing) — shown in the debug dock and readable by Stories
    // through readVersionStampV1.
    versionStampPluginV1(versionStamp),
  );

  return {
    root: appRoot,
    base: web.base,
    publicDir: false,
    resolve: {
      // External application projects consume engine packages through `file:`
      // links, so engine sources resolve React from the engine workspace's
      // node_modules while application code resolves the app-local copy. Two
      // physical React instances break the hooks dispatcher at runtime;
      // dedupe pins every import to the application's single copy.
      dedupe: ["react", "react-dom"],
    },
    plugins,
    build: {
      outDir: resolve(appRoot, web.outDir ?? "dist-web"),
      emptyOutDir: true,
      sourcemap: web.sourcemap,
      rollupOptions: {
        input: resolve(appRoot, web.applicationHtml),
        output: {
          // Dependencies get their own chunks: one for React and one for the
          // rest of node_modules. Application and engine code stay in the entry
          // chunk; release baselines measure the resulting raw/gzip sizes
          // instead of assuming a fixed warning threshold.
          advancedChunks: {
            groups: [
              { name: "vendor-react", test: /node_modules[/\\](react|react-dom|scheduler)[/\\]/ },
              { name: "vendor", test: /node_modules/ },
            ],
          },
        },
      },
    },
  } satisfies UserConfig;
}

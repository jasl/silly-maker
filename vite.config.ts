import { createRequire } from "node:module";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin, UserConfig } from "vite";

import type { StoryWebTargetV1 } from "@sillymaker/tooling/project/config-types";

import { projectTavernConfigV1 } from "./game/project.config.ts";

const repositoryRoot = import.meta.dirname;
const requireFromConfigV1 = createRequire(import.meta.url);

/**
 * Applications come from the shared project config; this file only turns the
 * selected web target into a Vite config. Adding a Story application never
 * changes this implementation.
 */
function resolveWebTargetV1(applicationId: string): StoryWebTargetV1 {
  const application = projectTavernConfigV1.applications.find(
    (candidate) => candidate.applicationId === applicationId,
  );
  const web = application?.web ?? null;
  if (web === null) {
    const webApplicationIds = projectTavernConfigV1.applications
      .filter((candidate) => candidate.web !== null)
      .map((candidate) => candidate.applicationId);
    throw new TypeError(
      `unknown web application "${applicationId}"; web applications: ${webApplicationIds.join(", ")}`,
    );
  }
  return web;
}

interface BuildIdentityModuleV1 {
  collect(root: string): Promise<unknown>;
  createPlugin(input: { readonly root: string; readonly initialIdentity: unknown }): Plugin;
}

function loadBuildIdentityModuleV1(web: StoryWebTargetV1): BuildIdentityModuleV1 {
  const loaded: unknown = requireFromConfigV1(resolve(repositoryRoot, web.identity.module));
  if (typeof loaded !== "object" || loaded === null) {
    throw new TypeError("Story BuildIdentity collector module is invalid");
  }
  const collect = Reflect.get(loaded, web.identity.collectExport);
  const createPlugin = Reflect.get(loaded, web.identity.createPluginExport);
  if (typeof collect !== "function" || typeof createPlugin !== "function") {
    throw new TypeError("Story BuildIdentity collector module is invalid");
  }
  return Object.freeze({
    collect: (root: string) => collect(root) as Promise<unknown>,
    createPlugin: (input: { readonly root: string; readonly initialIdentity: unknown }) =>
      createPlugin(input) as Plugin,
  });
}

export async function collectProjectTavernBuildIdentityV1(applicationId: string): Promise<unknown> {
  const web = resolveWebTargetV1(applicationId);
  return await loadBuildIdentityModuleV1(web).collect(repositoryRoot);
}

export async function createProjectTavernViteConfigV1(input: {
  readonly applicationId: string;
  readonly initialBuildIdentity?: unknown;
}): Promise<UserConfig> {
  const web = resolveWebTargetV1(input.applicationId);
  const identity = loadBuildIdentityModuleV1(web);
  const initialBuildIdentity =
    input.initialBuildIdentity ?? (await identity.collect(repositoryRoot));

  return {
    root: resolve(repositoryRoot, web.storyRoot),
    base: web.base,
    publicDir: false,
    plugins: [
      identity.createPlugin({ root: repositoryRoot, initialIdentity: initialBuildIdentity }),
      react(),
    ],
    build: {
      outDir: resolve(repositoryRoot, web.outDir),
      emptyOutDir: true,
      sourcemap: web.sourcemap,
      rollupOptions: {
        input: resolve(repositoryRoot, web.applicationHtml),
      },
    },
  } satisfies UserConfig;
}

/**
 * The Vite mode selects the application from the project config. Vite's
 * implicit `development`/`production` modes keep resolving the maintained
 * PoC player so bare `vite` invocations stay compatible.
 */
export default defineConfig(async ({ mode }) =>
  createProjectTavernViteConfigV1({
    applicationId: mode === "development" || mode === "production" ? "e2e" : mode,
  }),
);

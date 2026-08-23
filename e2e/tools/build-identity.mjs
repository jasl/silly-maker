// SPDX-License-Identifier: MIT
import { dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createStoryBuildIdentityOwnerV1 } from "@sillymaker/tooling/identity/story-build-identity";

export const e2eBuildIdentityVirtualSpecifierV1 =
  "@sillymaker/web/internal/application-build-identity";
const e2eBuildIdentityResolvedVirtualIdV1 = `\0${e2eBuildIdentityVirtualSpecifierV1}`;

const repositoryRootV1 = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
// Match Vite's forward-slash module-graph keys without importing Vite into the
// deterministic BuildIdentity collector closure.
const normalizeViteModulePathV1 = (path) => posix.normalize(path.replaceAll("\\", "/"));
const studioBindingModulePathV1 = normalizeViteModulePathV1(
  resolve(repositoryRootV1, "e2e/src/tooling/studio-binding.tsx"),
);

function reachesLoadedModuleV1(module, targets, visited = new Set()) {
  if (targets.has(module)) return true;
  if (visited.has(module)) return false;
  visited.add(module);
  for (const importer of module.importers ?? []) {
    if (reachesLoadedModuleV1(importer, targets, visited)) return true;
  }
  return false;
}

const ownerV1 = createStoryBuildIdentityOwnerV1({
  label: "E2E",
  storySourceRoot: "e2e/src/",
  simulation: {
    entry: "e2e/src/simulation-definition.ts",
    forbiddenPrefixes: ["e2e/src/presentation"],
  },
  presentation: {
    entry: "e2e/src/presentation.ts",
    forbiddenPrefixes: ["e2e/src/gameplay/"],
  },
  applicationEntries: [
    "e2e/src/application/entry.tsx",
    "engine/packages/tooling/src/identity/story-build-identity.mjs",
    "engine/packages/tooling/src/identity/collect-import-closure.mjs",
    "e2e/tools/build-identity.mjs",
    "e2e/vite.config.ts",
    "e2e/sillymaker.config.ts",
  ],
  virtual: {
    specifier: e2eBuildIdentityVirtualSpecifierV1,
    exportName: "applicationBuildIdentityInputInternalV1",
    pluginName: "sillymaker-e2e-build-identity",
  },
});

/** Collects the Engine Lab BuildIdentity input from live source bytes. */
export async function collectE2eBuildIdentityV1(root = repositoryRootV1) {
  return await ownerV1.collectBuildIdentityV1(root);
}

/** Returns the exact ESM source consumed by Vite's closed E2E virtual module. */
export function renderE2eBuildIdentityVirtualModuleV1(identity) {
  return ownerV1.renderVirtualModuleV1(identity);
}

/** Creates the Engine Lab Vite plugin without making the collector depend on Vite. */
export function createE2eBuildIdentityVirtualPluginV1(input) {
  const collectIdentity = typeof input.collectIdentity === "function"
    ? input.collectIdentity
    : collectE2eBuildIdentityV1;
  let currentIdentity = input.initialIdentity;
  let refreshedIdentity = currentIdentity;
  let refreshTail = Promise.resolve();
  const identityPlugin = ownerV1.createVirtualPluginV1({
    root: repositoryRootV1,
    initialIdentity: input.initialIdentity,
    collectIdentity: async () => {
      refreshedIdentity = await collectIdentity();
      return refreshedIdentity;
    },
  });

  const r2IdentityV1 = (identity) =>
    JSON.stringify({
      engineVersion: identity.engineVersion,
      engine: identity.engine,
      storySimulation: identity.storySimulation,
      storyPresentation: identity.storyPresentation,
    });

  return Object.freeze({
    ...identityPlugin,
    handleHotUpdate(context) {
      const refresh = refreshTail.then(async () => {
        const identityModules = await identityPlugin.handleHotUpdate?.(context);
        const nextIdentity = refreshedIdentity;
        const r2IdentityChanged = r2IdentityV1(nextIdentity) !== r2IdentityV1(currentIdentity);
        currentIdentity = nextIdentity;
        if (!r2IdentityChanged) return identityModules;

        const identityModule = context.server.moduleGraph.getModuleById(
          e2eBuildIdentityResolvedVirtualIdV1,
        );
        if (identityModule === undefined) {
          throw new TypeError("E2E BuildIdentity HMR candidate is unavailable");
        }
        // Engine Lab alone has a sibling Authoring Host. Its R2 path starts at
        // the virtual identity while the shared changed module is retained only
        // when its live importer graph reaches the Studio binding.
        const studioBindingModules = context.server.moduleGraph.getModulesByFile(
          studioBindingModulePathV1,
        ) ?? new Set();
        const authoringPropagationModules = studioBindingModules.size === 0
          ? []
          : context.modules.filter((module) => reachesLoadedModuleV1(module, studioBindingModules));
        return [...new Set([identityModule, ...authoringPropagationModules])];
      });
      refreshTail = refresh.then(
        () => undefined,
        () => undefined,
      );
      return refresh;
    },
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  void collectE2eBuildIdentityV1().then(
    (identity) => console.log(JSON.stringify(identity, null, 2)),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}

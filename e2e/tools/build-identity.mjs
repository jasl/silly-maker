// SPDX-License-Identifier: MIT
import { dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createStoryBuildIdentityOwnerV1 } from "@sillymaker/tooling/identity/story-build-identity";

export const e2eBuildIdentityVirtualSpecifierV1 = "virtual:sillymaker/e2e-build-identity";

const repositoryRootV1 = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
// Match Vite's forward-slash module-graph keys without importing Vite into the
// deterministic BuildIdentity collector closure.
const normalizeViteModulePathV1 = (path) => posix.normalize(path.replaceAll("\\", "/"));
const compositionModulePathV1 = normalizeViteModulePathV1(
  resolve(repositoryRootV1, "e2e/src/application/composition.tsx"),
);
const studioBindingModulePathV1 = normalizeViteModulePathV1(
  resolve(repositoryRootV1, "e2e/src/tooling/studio-binding.tsx"),
);
const buildIdentityInjectionMarkerV1 = "undefined /* __SILLYMAKER_E2E_BUILD_IDENTITY_V1__ */";
const transformedBuildIdentityBindingV1 = "const labBuildIdentityInputV1 = undefined;";
const injectedBuildIdentityBindingPrefixV1 = "const labBuildIdentityInputV1 = Object.freeze(";

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
    exportName: "e2eBuildIdentityV1",
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
  const identityPlugin = ownerV1.createVirtualPluginV1({
    root: repositoryRootV1,
    initialIdentity: input.initialIdentity,
  });
  let currentIdentity = input.initialIdentity;
  let refreshTail = Promise.resolve();

  const r2IdentityV1 = (identity) =>
    JSON.stringify({
      engineVersion: identity.engineVersion,
      engine: identity.engine,
      storySimulation: identity.storySimulation,
      storyPresentation: identity.storyPresentation,
    });

  const transformCompositionV1 = (source) => {
    const markerIndex = source.indexOf(buildIdentityInjectionMarkerV1);
    if (markerIndex !== -1) {
      if (markerIndex !== source.lastIndexOf(buildIdentityInjectionMarkerV1)) {
        throw new TypeError("E2E composition BuildIdentity injection marker is invalid");
      }
      return source.replace(
        buildIdentityInjectionMarkerV1,
        `Object.freeze(${JSON.stringify(currentIdentity)})`,
      );
    }

    // Rolldown presents TypeScript-transformed source to build plugins, after
    // stripping the comment marker but before changing this stable binding.
    const transformedBindingIndex = source.indexOf(transformedBuildIdentityBindingV1);
    if (transformedBindingIndex !== -1) {
      if (
        transformedBindingIndex !== source.lastIndexOf(transformedBuildIdentityBindingV1)
      ) {
        throw new TypeError("E2E composition BuildIdentity injection marker is invalid");
      }
      return source.replace(
        transformedBuildIdentityBindingV1,
        `${injectedBuildIdentityBindingPrefixV1}${JSON.stringify(currentIdentity)});`,
      );
    }

    const injectedBindingIndex = source.indexOf(injectedBuildIdentityBindingPrefixV1);
    if (
      injectedBindingIndex !== -1 &&
      injectedBindingIndex === source.lastIndexOf(injectedBuildIdentityBindingPrefixV1)
    ) {
      return null;
    }
    throw new TypeError("E2E composition BuildIdentity injection marker is invalid");
  };

  return Object.freeze({
    ...identityPlugin,
    transform(source, id) {
      const modulePath = normalizeViteModulePathV1(id.split("?", 1)[0]);
      if (modulePath !== compositionModulePathV1) return null;
      const code = transformCompositionV1(source);
      return code === null ? null : Object.freeze({ code, map: null });
    },
    handleHotUpdate(context) {
      const refresh = refreshTail.then(async () => {
        const identityModules = await identityPlugin.handleHotUpdate?.(context);
        const nextIdentity = await collectIdentity();
        const r2IdentityChanged = r2IdentityV1(nextIdentity) !== r2IdentityV1(currentIdentity);
        currentIdentity = nextIdentity;
        if (!r2IdentityChanged) {
          return identityModules;
        }
        const compositionModules = context.server.moduleGraph.getModulesByFile(
          compositionModulePathV1,
        ) ?? new Set();
        if (compositionModules.size === 0) {
          throw new TypeError("E2E composition HMR candidate is unavailable");
        }
        const studioBindingModules = context.server.moduleGraph.getModulesByFile(
          studioBindingModulePathV1,
        ) ?? new Set();
        const authoringPropagationModules = studioBindingModules.size === 0
          ? []
          : context.modules.filter((module) => reachesLoadedModuleV1(module, studioBindingModules));
        const candidateModules = new Set([
          ...compositionModules,
          ...authoringPropagationModules,
        ]);
        for (const module of candidateModules) {
          context.server.moduleGraph.invalidateModule(
            module,
            new Set(),
            context.timestamp,
            true,
          );
        }
        // Vite treats every returned module as an HMR propagation root. Once
        // live identity changes, starting again from every deep changed module
        // can hit an unaccepted branch and force a full reload. Return the
        // invalidated, literal-self-accepting composition R2 root plus only a
        // changed module whose live importer graph reaches the Studio binding.
        // Keeping that original propagation root lets Vite refresh its changed
        // bytes before the binding's private R1 publication, while unrelated
        // Scene/simulation modules remain behind the composition boundary.
        return [...candidateModules];
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

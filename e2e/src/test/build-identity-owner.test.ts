// SPDX-License-Identifier: MIT
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { digestBytes } from "@sillymaker/base";

// @ts-expect-error The BuildIdentity owner is deliberately Vite-facing ESM.
import * as buildIdentityOwnerV1 from "../../tools/build-identity.mjs";

const {
  collectE2eBuildIdentityV1,
  createE2eBuildIdentityVirtualPluginV1,
  digestE2eProcedureSceneSimulationV1,
  e2eBuildIdentityVirtualSpecifierV1,
} = buildIdentityOwnerV1;

const repositoryRootV1 = resolve(import.meta.dirname, "../../..");
const inspectorBindingModulePathV1 = resolve(
  repositoryRootV1,
  "e2e/src/tooling/inspector-binding.ts",
);
const resolvedIdentityModuleV1 = `\0${e2eBuildIdentityVirtualSpecifierV1}`;

function successorIdentityV1(identity: {
  readonly storySimulation: readonly {
    readonly path: string;
    readonly facet: "story_simulation";
    readonly sha256: string;
  }[];
}) {
  if (identity.storySimulation[0] === undefined) {
    throw new TypeError("E2E BuildIdentity has no simulation source record");
  }
  return Object.freeze({
    ...identity,
    storySimulation: Object.freeze([
      Object.freeze({
        ...identity.storySimulation[0],
        sha256: digestBytes(new TextEncoder().encode("accepted simulation source bytes")),
      }),
      ...identity.storySimulation.slice(1),
    ]),
  });
}

function presentationSuccessorIdentityV1(identity: {
  readonly storyPresentation: readonly {
    readonly path: string;
    readonly facet: "story_presentation";
    readonly sha256: string;
  }[];
}) {
  if (identity.storyPresentation[0] === undefined) {
    throw new TypeError("E2E BuildIdentity has no presentation source record");
  }
  return Object.freeze({
    ...identity,
    storyPresentation: Object.freeze([
      Object.freeze({
        ...identity.storyPresentation[0],
        sha256: digestBytes(new TextEncoder().encode("accepted presentation source bytes")),
      }),
      ...identity.storyPresentation.slice(1),
    ]),
  });
}

function applicationSuccessorIdentityV1(identity: {
  readonly application: readonly {
    readonly path: string;
    readonly facet: "application";
    readonly sha256: string;
  }[];
}) {
  if (identity.application[0] === undefined) {
    throw new TypeError("E2E BuildIdentity has no application source record");
  }
  return Object.freeze({
    ...identity,
    application: Object.freeze([
      Object.freeze({
        ...identity.application[0],
        sha256: digestBytes(new TextEncoder().encode("accepted application source bytes")),
      }),
      ...identity.application.slice(1),
    ]),
  });
}

describe("Engine Lab BuildIdentity composition owner", () => {
  it("publishes raw procedure source in presentation and replay semantics in simulation", async () => {
    const identity = await collectE2eBuildIdentityV1();
    expect(identity.storySimulation).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: "e2e/src/scenes/procedure/index.ts",
        facet: "story_simulation",
      }),
      expect.objectContaining({
        path: "e2e/src/scenes/procedure/procedure.authoring-scene.json",
        facet: "story_simulation",
      }),
    ]));
    expect(identity.storyPresentation).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: "e2e/src/scenes/procedure/procedure.authoring-scene.json",
        facet: "story_presentation",
      }),
    ]));
  });

  it("keeps reorder migratable but changes simulation identity for content edits", () => {
    type SourceV1 = {
      layers: Array<{
        layerId: string;
        roots: Array<{
          objectId: string;
          children?: Array<{
            objectId: string;
            visual?: { contentId: string };
          }>;
        }>;
      }>;
    };
    const original = JSON.parse(
      readFileSync(
        resolve(
          repositoryRootV1,
          "e2e/src/scenes/procedure/procedure.authoring-scene.json",
        ),
        "utf8",
      ),
    ) as SourceV1;
    const reordered = structuredClone(original);
    reordered.layers.reverse();
    const reorderedCharacters = reordered.layers.find(({ layerId }) =>
      layerId === "layer.e2e.characters"
    );
    const reorderedChildren = reorderedCharacters?.roots.find(({ objectId }) =>
      objectId === "tag.e2e.researchers"
    )?.children;
    if (reorderedChildren === undefined) throw new TypeError("procedure children unavailable");
    reorderedChildren.reverse();
    expect(digestE2eProcedureSceneSimulationV1(reordered)).toBe(
      digestE2eProcedureSceneSimulationV1(original),
    );

    const contentEdit = structuredClone(original);
    const alpha = contentEdit.layers
      .find(({ layerId }) => layerId === "layer.e2e.characters")
      ?.roots.find(({ objectId }) => objectId === "tag.e2e.researchers")
      ?.children?.find(({ objectId }) => objectId === "tag.e2e.alpha");
    if (alpha?.visual === undefined) throw new TypeError("procedure alpha unavailable");
    alpha.visual.contentId = "content.e2e.char.alpha.changed";
    expect(digestE2eProcedureSceneSimulationV1(contentEdit)).not.toBe(
      digestE2eProcedureSceneSimulationV1(original),
    );
  });

  it("publishes the canonical live collector through the shared Web fallback subpath", async () => {
    const identity = await collectE2eBuildIdentityV1();
    const plugin = createE2eBuildIdentityVirtualPluginV1({ initialIdentity: identity });

    expect(plugin.enforce).toBe("pre");
    expect(plugin.resolveId(e2eBuildIdentityVirtualSpecifierV1)).toBe(resolvedIdentityModuleV1);
    expect(plugin.resolveId("@sillymaker/web")).toBeNull();
    expect(plugin.load(resolvedIdentityModuleV1)).toContain(JSON.stringify(identity));
    expect(plugin.load("\0unrelated")).toBeNull();
  });

  it("publishes a changed collector value through the neutral identity root", async () => {
    const initialIdentity = await collectE2eBuildIdentityV1();
    const nextIdentity = successorIdentityV1(initialIdentity);
    const collectIdentity = vi.fn(() => Promise.resolve(nextIdentity));
    const plugin = createE2eBuildIdentityVirtualPluginV1({
      initialIdentity,
      collectIdentity,
    });
    const identityModule = Object.freeze({ id: resolvedIdentityModuleV1 });
    const changedSceneModule = Object.freeze({
      id: resolve(
        repositoryRootV1,
        "e2e/src/scenes/procedure/procedure.authoring-scene.json",
      ),
    });
    const invalidateModule = vi.fn();
    const context = {
      modules: [changedSceneModule],
      timestamp: Date.now(),
      server: {
        watcher: { add: vi.fn() },
        moduleGraph: {
          getModuleById: (id: string) =>
            id === resolvedIdentityModuleV1 ? identityModule : undefined,
          getModulesByFile: () => undefined,
          invalidateModule,
        },
      },
    };

    const candidates = await plugin.handleHotUpdate(context);
    const virtualSource = plugin.load(resolvedIdentityModuleV1);

    expect(collectIdentity).toHaveBeenCalledOnce();
    expect(candidates).toEqual([identityModule]);
    expect(candidates).not.toContain(changedSceneModule);
    expect(invalidateModule).toHaveBeenCalledWith(
      identityModule,
      expect.any(Set),
      context.timestamp,
      true,
    );
    expect(virtualSource).toContain(JSON.stringify(nextIdentity));
    expect(virtualSource).not.toContain(JSON.stringify(initialIdentity));
  });

  it("leaves application-only updates on Vite's normal propagation path", async () => {
    const initialIdentity = await collectE2eBuildIdentityV1();
    const nextIdentity = applicationSuccessorIdentityV1(initialIdentity);
    const plugin = createE2eBuildIdentityVirtualPluginV1({
      initialIdentity,
      collectIdentity: () => Promise.resolve(nextIdentity),
    });
    const identityModule = Object.freeze({ id: resolvedIdentityModuleV1 });
    const changedUiModule = Object.freeze({
      id: resolve(repositoryRootV1, "e2e/src/application/shell-ui.tsx"),
    });
    const invalidateModule = vi.fn();
    const context = {
      modules: [changedUiModule],
      timestamp: Date.now(),
      server: {
        watcher: { add: vi.fn() },
        moduleGraph: {
          getModuleById: (id: string) =>
            id === resolvedIdentityModuleV1 ? identityModule : undefined,
          getModulesByFile: () => undefined,
          invalidateModule,
        },
      },
    };

    const candidates = await plugin.handleHotUpdate(context);
    const virtualSource = plugin.load(resolvedIdentityModuleV1);

    // Either Vite's default (`undefined`) or the identity owner's unchanged
    // roots preserve the existing propagation path, including React Fast
    // Refresh boundaries reached before composition. A concurrent live-byte
    // collector refresh may choose the latter without creating an R2 root.
    expect(candidates ?? context.modules).toEqual([changedUiModule]);
    expect(context.modules).toEqual([changedUiModule]);
    expect(invalidateModule).toHaveBeenCalledOnce();
    expect(invalidateModule).toHaveBeenCalledWith(
      identityModule,
      expect.any(Set),
      context.timestamp,
      true,
    );
    expect(virtualSource).toContain(JSON.stringify(nextIdentity));
  });

  it("routes a shared R2 update through the Game root and the Inspector dependency", async () => {
    const initialIdentity = await collectE2eBuildIdentityV1();
    const nextIdentity = presentationSuccessorIdentityV1(initialIdentity);
    const plugin = createE2eBuildIdentityVirtualPluginV1({
      initialIdentity,
      collectIdentity: () => Promise.resolve(nextIdentity),
    });
    const identityModule = Object.freeze({ id: resolvedIdentityModuleV1 });
    const inspectorBindingModule = Object.freeze({
      id: inspectorBindingModulePathV1,
      importers: new Set(),
    });
    const changedPresentationModule = Object.freeze({
      id: resolve(repositoryRootV1, "e2e/src/presentation.ts"),
      importers: new Set([inspectorBindingModule]),
    });
    const invalidateModule = vi.fn();
    const context = {
      modules: [changedPresentationModule],
      timestamp: Date.now(),
      server: {
        watcher: { add: vi.fn() },
        moduleGraph: {
          getModuleById: (id: string) =>
            id === resolvedIdentityModuleV1 ? identityModule : undefined,
          getModulesByFile: (path: string) => {
            if (path === inspectorBindingModulePathV1) {
              return new Set([inspectorBindingModule]);
            }
            return undefined;
          },
          invalidateModule,
        },
      },
    };

    const candidates = await plugin.handleHotUpdate(context);

    expect(candidates).toEqual([identityModule, changedPresentationModule]);
    expect(candidates).not.toContain(inspectorBindingModule);
    expect(invalidateModule).toHaveBeenCalledWith(
      identityModule,
      expect.any(Set),
      context.timestamp,
      true,
    );
  });
});

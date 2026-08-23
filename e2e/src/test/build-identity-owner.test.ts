// SPDX-License-Identifier: MIT
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { digestBytes } from "@sillymaker/base";

// @ts-expect-error The BuildIdentity owner is deliberately Vite-facing ESM.
import * as buildIdentityOwnerV1 from "../../tools/build-identity.mjs";

const {
  collectE2eBuildIdentityV1,
  createE2eBuildIdentityVirtualPluginV1,
  e2eBuildIdentityVirtualSpecifierV1,
} = buildIdentityOwnerV1;

const repositoryRootV1 = resolve(import.meta.dirname, "../../..");
const studioBindingModulePathV1 = resolve(
  repositoryRootV1,
  "e2e/src/tooling/studio-binding.tsx",
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
      id: resolve(repositoryRootV1, "e2e/src/scenes/procedure/procedure.scene.json"),
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

  it("routes a shared R2 update through the Game root and the exact Studio dependency", async () => {
    const initialIdentity = await collectE2eBuildIdentityV1();
    const nextIdentity = presentationSuccessorIdentityV1(initialIdentity);
    const plugin = createE2eBuildIdentityVirtualPluginV1({
      initialIdentity,
      collectIdentity: () => Promise.resolve(nextIdentity),
    });
    const identityModule = Object.freeze({ id: resolvedIdentityModuleV1 });
    const studioBindingModule = Object.freeze({
      id: studioBindingModulePathV1,
      importers: new Set(),
    });
    const changedPresentationModule = Object.freeze({
      id: resolve(repositoryRootV1, "e2e/src/presentation.ts"),
      importers: new Set([studioBindingModule]),
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
            if (path === studioBindingModulePathV1) return new Set([studioBindingModule]);
            return undefined;
          },
          invalidateModule,
        },
      },
    };

    const candidates = await plugin.handleHotUpdate(context);

    expect(candidates).toEqual([identityModule, changedPresentationModule]);
    expect(candidates).not.toContain(studioBindingModule);
    expect(invalidateModule).toHaveBeenCalledWith(
      identityModule,
      expect.any(Set),
      context.timestamp,
      true,
    );
  });
});

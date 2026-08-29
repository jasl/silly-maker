// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  createSillyModRuntimeV1,
  createSillyModSelectionControllerV1,
  defineSillyModMetadataV1,
  SillyModErrorV1,
  type SillyCodeModDefinitionV1,
  type SillyModExtensionPointV1,
  type SillyModMetadataV1,
  type SillyModSourceV1,
} from "./index.ts";
import * as publicComposition from "../index.ts";

const engineApiV1 = { composition: "1.0.0" } as const;

interface TestMetadataInputV1 {
  readonly modId: string;
  readonly version?: string;
  readonly requires?: SillyModMetadataV1["dependencies"]["requires"];
  readonly optional?: SillyModMetadataV1["dependencies"]["optional"];
  readonly conflicts?: SillyModMetadataV1["dependencies"]["conflicts"];
  readonly engineApi?: Readonly<Record<string, string>>;
  readonly facets?: readonly string[];
}

function metadataV1(input: TestMetadataInputV1): SillyModMetadataV1 {
  return defineSillyModMetadataV1({
    contractRevision: 1,
    modId: input.modId,
    version: input.version ?? "1.0.0",
    engineApi: input.engineApi ?? { composition: "^1.0.0" },
    dependencies: {
      requires: input.requires ?? [],
      optional: input.optional ?? [],
      conflicts: input.conflicts ?? [],
    },
    facets: input.facets ?? ["base"],
  });
}

const pointV1: SillyModExtensionPointV1<string, readonly string[]> = {
  pointId: "scene.decorations",
  contributionKind: "scene-decoration",
  collisionPolicy: "reject",
  compile: ({ contributions }) => contributions.map((entry) => entry.payload),
};

function dataSourceV1(input: {
  readonly modId?: string;
  readonly version?: string;
  readonly requires?: SillyModMetadataV1["dependencies"]["requires"];
  readonly optional?: SillyModMetadataV1["dependencies"]["optional"];
  readonly conflicts?: SillyModMetadataV1["dependencies"]["conflicts"];
  readonly engineApi?: Readonly<Record<string, string>>;
  readonly contributionId?: string;
  readonly pointId?: string;
  readonly contributionKind?: string;
  readonly payload?: string;
} = {}): SillyModSourceV1<string> {
  const metadata = metadataV1({
    modId: input.modId ?? "mod.data",
    ...(input.version === undefined ? {} : { version: input.version }),
    ...(input.requires === undefined ? {} : { requires: input.requires }),
    ...(input.optional === undefined ? {} : { optional: input.optional }),
    ...(input.conflicts === undefined ? {} : { conflicts: input.conflicts }),
    ...(input.engineApi === undefined ? {} : { engineApi: input.engineApi }),
  });
  return {
    kind: "data",
    metadata,
    contributions: [{
      contributionId: input.contributionId ?? `${metadata.modId}.decoration`,
      pointId: input.pointId ?? pointV1.pointId,
      contributionKind: input.contributionKind ?? pointV1.contributionKind,
      payload: input.payload ?? metadata.modId,
    }],
  };
}

function codeSourceV1(input: {
  readonly modId?: string;
  readonly version?: string;
  readonly requires?: SillyModMetadataV1["dependencies"]["requires"];
  readonly contributionId?: string;
  readonly payload?: string;
  readonly setup?: SillyCodeModDefinitionV1<string>["setup"];
  readonly load?: () =>
    | SillyCodeModDefinitionV1<string>
    | PromiseLike<SillyCodeModDefinitionV1<string>>;
} = {}): SillyModSourceV1<string> {
  const metadata = metadataV1({
    modId: input.modId ?? "mod.code",
    ...(input.version === undefined ? {} : { version: input.version }),
    requires: input.requires ?? [{ modId: "mod.data", version: "^1.0.0" }],
    facets: ["base", "ui"],
  });
  const definition: SillyCodeModDefinitionV1<string> = {
    contributions: [{
      contributionId: input.contributionId ?? `${metadata.modId}.decoration`,
      pointId: pointV1.pointId,
      contributionKind: pointV1.contributionKind,
      payload: input.payload ?? metadata.modId,
    }],
    ...(input.setup === undefined ? {} : { setup: input.setup }),
  };
  return {
    kind: "code",
    metadata,
    load: input.load ?? (() => definition),
  };
}

function createRuntimeV1(input: {
  readonly catalog?: readonly SillyModSourceV1<string>[];
  readonly activeModIds?: readonly string[];
  readonly extensionPoints?: readonly SillyModExtensionPointV1<string, readonly string[]>[];
  readonly engineApi?: Readonly<Record<string, string>>;
  readonly onLifecycleDiagnostic?: Parameters<
    typeof createSillyModRuntimeV1
  >[0]["onLifecycleDiagnostic"];
} = {}) {
  return createSillyModRuntimeV1({
    applicationGeneration: "application.1",
    engineApi: input.engineApi ?? engineApiV1,
    catalog: input.catalog ?? [dataSourceV1(), codeSourceV1()],
    activeModIds: input.activeModIds ?? ["mod.data", "mod.code"],
    extensionPoints: input.extensionPoints ?? [pointV1],
    ...(input.onLifecycleDiagnostic === undefined
      ? {}
      : { onLifecycleDiagnostic: input.onLifecycleDiagnostic }),
  });
}

async function expectModFailureV1(
  operation: Promise<unknown> | (() => unknown),
  code: SillyModErrorV1["code"],
): Promise<SillyModErrorV1> {
  let error: unknown;
  try {
    if (typeof operation === "function") operation();
    else await operation;
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(SillyModErrorV1);
  expect((error as SillyModErrorV1).code).toBe(code);
  return error as SillyModErrorV1;
}

describe("public trusted Silly Mod runtime", () => {
  it("admits JSON-safe metadata once into a canonical value", async () => {
    const metadata = metadataV1({
      modId: "mod.metadata",
      engineApi: { ui: "^1.2.0", composition: "1.0.0" },
      requires: [
        { modId: "mod.zeta", version: "^2.0.0" },
        { modId: "mod.alpha", version: "*" },
      ],
      facets: ["ui", "base"],
    });

    expect(Object.keys(metadata.engineApi)).toEqual(["composition", "ui"]);
    expect(metadata.dependencies.requires.map((entry) => entry.modId)).toEqual([
      "mod.alpha",
      "mod.zeta",
    ]);
    expect(metadata.facets).toEqual(["base", "ui"]);
    await expectModFailureV1(
      () => metadataV1({ modId: "mod.invalid", version: "latest" }),
      "silly_mod.invalid_definition",
    );
    await expectModFailureV1(
      () => metadataV1({ modId: "mod.invalid", engineApi: { composition: "^1" } }),
      "silly_mod.invalid_definition",
    );
    await expectModFailureV1(
      () =>
        metadataV1({
          modId: "mod.invalid",
          requires: [{ modId: "mod.other", version: "^1.0.0" }],
          optional: [{ modId: "mod.other", version: "^1.0.0" }],
        }),
      "silly_mod.duplicate",
    );
  });

  it("does not impose an arbitrary length budget on trusted identifiers", async () => {
    const suffix = "x".repeat(256);
    const modId = `mod.${suffix}`;
    const pointId = `scene.${suffix}`;
    const contributionId = `decoration.${suffix}`;
    const contributionKind = `kind.${suffix}`;
    const point: SillyModExtensionPointV1<string, readonly string[]> = {
      pointId,
      contributionKind,
      collisionPolicy: "reject",
      compile: ({ contributions }) => contributions.map((entry) => entry.payload),
    };
    const runtime = await createSillyModRuntimeV1({
      applicationGeneration: `application.${suffix}`,
      engineApi: engineApiV1,
      catalog: [dataSourceV1({
        modId,
        pointId,
        contributionId,
        contributionKind,
        payload: "accepted",
      })],
      activeModIds: [modId],
      extensionPoints: [point],
    });

    expect(runtime.activeIdentity).toEqual([{ modId, version: "1.0.0" }]);
    expect(runtime.compiledPoints).toEqual([{ pointId, value: ["accepted"] }]);
    await runtime.dispose();
  });

  it("resolves dependencies and unrelated Mods canonically, independent of input order", async () => {
    const base = dataSourceV1({ modId: "mod.base", payload: "base" });
    const alpha = dataSourceV1({ modId: "mod.alpha", payload: "alpha" });
    const dependent = dataSourceV1({
      modId: "mod.dependent",
      payload: "dependent",
      requires: [{ modId: "mod.base", version: "^1.0.0" }],
      optional: [{ modId: "mod.alpha", version: "1.0.0" }],
    });
    const first = await createRuntimeV1({
      catalog: [dependent, base, alpha],
      activeModIds: ["mod.dependent", "mod.base", "mod.alpha"],
    });
    const second = await createRuntimeV1({
      catalog: [alpha, base, dependent],
      activeModIds: ["mod.alpha", "mod.base", "mod.dependent"],
    });

    expect(first.activeIdentity).toEqual([
      { modId: "mod.alpha", version: "1.0.0" },
      { modId: "mod.base", version: "1.0.0" },
      { modId: "mod.dependent", version: "1.0.0" },
    ]);
    expect(first.activeIdentity).toEqual(second.activeIdentity);
    expect(first.compiledPoints[0]?.value).toEqual(["alpha", "base", "dependent"]);
    expect(first.resolvedManifest).toEqual(second.resolvedManifest);
    expect(first.resolvedManifest.orderedMods[2]?.contributions).toEqual([
      {
        pointId: "scene.decorations",
        contributionId: "mod.dependent.decoration",
      },
    ]);
    await Promise.all([first.dispose(), second.dispose()]);
  });

  it("reports engine API, dependency, cycle, conflict, and version failures", async () => {
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [dataSourceV1({ engineApi: { ui: "^1.0.0" } })],
        activeModIds: ["mod.data"],
      }),
      "silly_mod.engine_api_missing",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [dataSourceV1({ engineApi: { constructor: "*" } })],
        activeModIds: ["mod.data"],
        engineApi: {},
      }),
      "silly_mod.engine_api_missing",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [dataSourceV1({ engineApi: { composition: "^2.0.0" } })],
        activeModIds: ["mod.data"],
      }),
      "silly_mod.engine_api_incompatible",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [
          dataSourceV1({ requires: [{ modId: "mod.missing", version: "^1.0.0" }] }),
        ],
        activeModIds: ["mod.data"],
      }),
      "silly_mod.dependency_missing",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [
          dataSourceV1({ modId: "mod.base", version: "2.0.0" }),
          dataSourceV1({
            modId: "mod.dependent",
            requires: [{ modId: "mod.base", version: "^1.0.0" }],
          }),
        ],
        activeModIds: ["mod.base", "mod.dependent"],
      }),
      "silly_mod.dependency_incompatible",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [
          dataSourceV1({
            modId: "mod.alpha",
            requires: [{ modId: "mod.beta", version: "*" }],
          }),
          dataSourceV1({
            modId: "mod.beta",
            requires: [{ modId: "mod.alpha", version: "*" }],
          }),
        ],
        activeModIds: ["mod.alpha", "mod.beta"],
      }),
      "silly_mod.dependency_cycle",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [
          dataSourceV1({
            modId: "mod.alpha",
            conflicts: [{ modId: "mod.beta", version: "^1.0.0" }],
          }),
          dataSourceV1({ modId: "mod.beta" }),
        ],
        activeModIds: ["mod.alpha", "mod.beta"],
      }),
      "silly_mod.conflict",
    );
  });

  it("keeps delimiter-bearing contribution identities unambiguous in the manifest", async () => {
    const firstPoint = {
      ...pointV1,
      pointId: "scene:decorations",
    } satisfies SillyModExtensionPointV1<string, readonly string[]>;
    const secondPoint = {
      ...pointV1,
      pointId: "scene",
    } satisfies SillyModExtensionPointV1<string, readonly string[]>;
    const first = await createRuntimeV1({
      catalog: [dataSourceV1({
        pointId: firstPoint.pointId,
        contributionId: "alpha",
      })],
      activeModIds: ["mod.data"],
      extensionPoints: [firstPoint],
    });
    const second = await createRuntimeV1({
      catalog: [dataSourceV1({
        pointId: secondPoint.pointId,
        contributionId: "decorations:alpha",
      })],
      activeModIds: ["mod.data"],
      extensionPoints: [secondPoint],
    });
    try {
      expect(first.resolvedManifest.orderedMods[0]?.contributions).toEqual([
        { pointId: "scene:decorations", contributionId: "alpha" },
      ]);
      expect(second.resolvedManifest.orderedMods[0]?.contributions).toEqual([
        { pointId: "scene", contributionId: "decorations:alpha" },
      ]);
      expect(first.resolvedManifest).not.toEqual(second.resolvedManifest);
    } finally {
      await Promise.all([first.dispose(), second.dispose()]);
    }
  });

  it("rejects unknown targets, kind mismatches, collisions, compile failures, and source mismatch", async () => {
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [dataSourceV1({ pointId: "scene.unknown" })],
        activeModIds: ["mod.data"],
      }),
      "silly_mod.target_unknown",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [dataSourceV1({ contributionKind: "wrong-kind" })],
        activeModIds: ["mod.data"],
      }),
      "silly_mod.kind_mismatch",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [
          dataSourceV1({ modId: "mod.alpha", contributionId: "shared" }),
          dataSourceV1({ modId: "mod.beta", contributionId: "shared" }),
        ],
        activeModIds: ["mod.alpha", "mod.beta"],
      }),
      "silly_mod.collision",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [dataSourceV1()],
        activeModIds: ["mod.data"],
        extensionPoints: [{
          ...pointV1,
          compile: () => {
            throw new Error("compile failed");
          },
        }],
      }),
      "silly_mod.compile_failed",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [{
          kind: "code",
          metadata: metadataV1({ modId: "mod.code" }),
          load: () => ({ contributions: null as never }),
        }],
        activeModIds: ["mod.code"],
      }),
      "silly_mod.invalid_definition",
    );
  });

  it("awaits setup handles, rolls back a failed candidate, and reports cleanup failures", async () => {
    const events: string[] = [];
    const rollbackOwner = codeSourceV1({
      modId: "mod.alpha",
      requires: [],
      setup() {
        events.push("alpha:setup");
        return {
          dispose: () => {
            events.push("alpha:rollback");
          },
        };
      },
    });
    const failure = codeSourceV1({
      modId: "mod.failure",
      requires: [{ modId: "mod.alpha", version: "^1.0.0" }],
      setup() {
        events.push("failure:setup");
        throw new Error("setup failed");
      },
    });
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [failure, rollbackOwner],
        activeModIds: ["mod.failure", "mod.alpha"],
      }),
      "silly_mod.setup_failed",
    );
    expect(events).toEqual(["alpha:setup", "failure:setup", "alpha:rollback"]);

    let releaseCleanup!: () => void;
    const cleanupGate = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const first = codeSourceV1({
      modId: "mod.first",
      requires: [],
      async setup() {
        events.push("first:setup");
        return {
          async dispose() {
            events.push("first:dispose:start");
            await cleanupGate;
            events.push("first:dispose:end");
          },
        };
      },
    });
    const runtime = await createRuntimeV1({ catalog: [first], activeModIds: ["mod.first"] });
    const disposal = runtime.dispose();
    await vi.waitFor(() => expect(events).toContain("first:dispose:start"));
    let disposed = false;
    void disposal.then(() => {
      disposed = true;
    });
    await Promise.resolve();
    expect(disposed).toBe(false);
    releaseCleanup();
    await disposal;
    expect(events).toContain("first:dispose:end");

    const diagnostics: unknown[] = [];
    const cleanupFailure = codeSourceV1({
      modId: "mod.cleanup-failure",
      requires: [],
      setup: () => ({
        dispose: () => {
          throw new Error("cleanup failed");
        },
      }),
    });
    const failingRuntime = await createRuntimeV1({
      catalog: [cleanupFailure],
      activeModIds: ["mod.cleanup-failure"],
      onLifecycleDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });
    await failingRuntime.dispose();
    expect(diagnostics).toEqual([expect.objectContaining({
      code: "silly_mod.cleanup_failed",
      modId: "mod.cleanup-failure",
      version: "1.0.0",
      phase: "dispose",
    })]);
  });

  it("publishes complete successors and keeps the predecessor on candidate or publication failure", async () => {
    const events: string[] = [];
    const source = (modId: string, setupFailure = false) =>
      codeSourceV1({
        modId,
        requires: [],
        payload: modId,
        setup() {
          events.push(`${modId}:setup`);
          if (setupFailure) throw new Error("candidate setup failed");
          return {
            dispose: () => {
              events.push(`${modId}:dispose`);
            },
          };
        },
      });
    const predecessor = source("mod.predecessor");
    const successor = source("mod.successor");
    const setupFailure = source("mod.setup-failure", true);
    const controller = createSillyModSelectionControllerV1({
      applicationGeneration: "application.1",
      engineApi: engineApiV1,
      extensionPoints: [pointV1],
    });
    const first = await controller.activate({
      selectionGeneration: 1,
      catalog: [predecessor],
      activeModIds: ["mod.predecessor"],
    });
    expect(controller.getState()).toEqual({ kind: "ready", current: first });

    await expectModFailureV1(
      controller.restart({
        selectionGeneration: 2,
        catalog: [setupFailure],
        activeModIds: ["mod.setup-failure"],
      }, () => undefined),
      "silly_mod.setup_failed",
    );
    expect(controller.getCurrent()).toBe(first);

    await expectModFailureV1(
      controller.restart({
        selectionGeneration: 3,
        catalog: [successor],
        activeModIds: ["mod.successor"],
      }, () => {
        events.push("publication:failed");
        throw new Error("publication failed");
      }),
      "silly_mod.publication_failed",
    );
    expect(controller.getCurrent()).toBe(first);
    expect(events).toContain("mod.successor:dispose");

    const second = await controller.restart({
      selectionGeneration: 4,
      catalog: [successor],
      activeModIds: ["mod.successor"],
    }, (candidate, previous) => {
      expect(previous).toBe(first);
      expect(controller.getCurrent()).toBe(first);
      expect(candidate.resolvedManifest.orderedMods[0]?.modId).toBe("mod.successor");
      events.push("publication:success");
    });
    expect(controller.getCurrent()).toBe(second);
    expect(events.indexOf("publication:success")).toBeLessThan(
      events.lastIndexOf("mod.predecessor:dispose"),
    );
    await controller.dispose();
  });

  it("keeps one predecessor across every resolver, loader, compiler, and setup rejection", async () => {
    const predecessor = dataSourceV1({ modId: "mod.predecessor", payload: "predecessor" });
    const controller = createSillyModSelectionControllerV1({
      applicationGeneration: "application.1",
      engineApi: engineApiV1,
      extensionPoints: [{
        ...pointV1,
        compile({ contributions }) {
          const values = contributions.map((entry) => entry.payload);
          if (values.includes("compile-failure")) throw new Error("compile failed");
          return values;
        },
      }],
    });
    const first = await controller.activate({
      selectionGeneration: 1,
      catalog: [predecessor],
      activeModIds: ["mod.predecessor"],
    });
    const duplicate = dataSourceV1({ modId: "mod.duplicate" });
    const cycleAlpha = dataSourceV1({
      modId: "mod.cycle-alpha",
      requires: [{ modId: "mod.cycle-beta", version: "*" }],
    });
    const cycleBeta = dataSourceV1({
      modId: "mod.cycle-beta",
      requires: [{ modId: "mod.cycle-alpha", version: "*" }],
    });
    const conflictAlpha = dataSourceV1({
      modId: "mod.conflict-alpha",
      conflicts: [{ modId: "mod.conflict-beta", version: "*" }],
    });
    const conflictBeta = dataSourceV1({ modId: "mod.conflict-beta" });
    const cases: readonly {
      readonly code: SillyModErrorV1["code"];
      readonly catalog: readonly SillyModSourceV1<string>[];
      readonly activeModIds: readonly string[];
    }[] = [
      {
        code: "silly_mod.duplicate",
        catalog: [duplicate, duplicate],
        activeModIds: ["mod.duplicate"],
      },
      {
        code: "silly_mod.mod_unknown",
        catalog: [],
        activeModIds: ["mod.unknown"],
      },
      {
        code: "silly_mod.dependency_missing",
        catalog: [dataSourceV1({
          modId: "mod.missing-dependent",
          requires: [{ modId: "mod.missing", version: "*" }],
        })],
        activeModIds: ["mod.missing-dependent"],
      },
      {
        code: "silly_mod.dependency_cycle",
        catalog: [cycleAlpha, cycleBeta],
        activeModIds: ["mod.cycle-alpha", "mod.cycle-beta"],
      },
      {
        code: "silly_mod.conflict",
        catalog: [conflictAlpha, conflictBeta],
        activeModIds: ["mod.conflict-alpha", "mod.conflict-beta"],
      },
      {
        code: "silly_mod.target_unknown",
        catalog: [dataSourceV1({ modId: "mod.target", pointId: "point.missing" })],
        activeModIds: ["mod.target"],
      },
      {
        code: "silly_mod.kind_mismatch",
        catalog: [dataSourceV1({ modId: "mod.kind", contributionKind: "wrong-kind" })],
        activeModIds: ["mod.kind"],
      },
      {
        code: "silly_mod.collision",
        catalog: [
          dataSourceV1({ modId: "mod.collision-alpha", contributionId: "shared" }),
          dataSourceV1({ modId: "mod.collision-beta", contributionId: "shared" }),
        ],
        activeModIds: ["mod.collision-alpha", "mod.collision-beta"],
      },
      {
        code: "silly_mod.load_failed",
        catalog: [codeSourceV1({
          modId: "mod.load-failure",
          requires: [],
          load: () => {
            throw new Error("load failed");
          },
        })],
        activeModIds: ["mod.load-failure"],
      },
      {
        code: "silly_mod.compile_failed",
        catalog: [dataSourceV1({ modId: "mod.compile", payload: "compile-failure" })],
        activeModIds: ["mod.compile"],
      },
      {
        code: "silly_mod.setup_failed",
        catalog: [codeSourceV1({
          modId: "mod.setup",
          requires: [],
          setup: () => {
            throw new Error("setup failed");
          },
        })],
        activeModIds: ["mod.setup"],
      },
    ];
    let selectionGeneration = 2;
    for (const candidate of cases) {
      const publish = vi.fn();
      await expectModFailureV1(
        controller.restart({
          selectionGeneration: selectionGeneration++,
          catalog: candidate.catalog,
          activeModIds: candidate.activeModIds,
        }, publish),
        candidate.code,
      );
      expect(publish).not.toHaveBeenCalled();
      expect(controller.getCurrent()).toBe(first);
      expect(controller.getState()).toEqual({ kind: "ready", current: first });
    }
    await controller.dispose();
  });

  it("exposes only public errors and rejects stale selection generations", async () => {
    const controller = createSillyModSelectionControllerV1({
      applicationGeneration: "application.1",
      engineApi: engineApiV1,
      extensionPoints: [pointV1],
    });
    const source = dataSourceV1();
    await controller.activate({
      selectionGeneration: 2,
      catalog: [source],
      activeModIds: ["mod.data"],
    });
    await expectModFailureV1(
      controller.restart(
        { selectionGeneration: 1, catalog: [source], activeModIds: ["mod.data"] },
        () => undefined,
      ),
      "silly_mod.selection_generation_stale",
    );
    await controller.dispose();
    await expectModFailureV1(controller.retry(), "silly_mod.disposed");

    expect(publicComposition).not.toHaveProperty("createSillyModRuntimeV1");
    expect(publicComposition).not.toHaveProperty("createApplicationModRuntimeInternalV1");
  });
});

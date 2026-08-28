// SPDX-License-Identifier: MIT
import {
  defineExtensionFactoryInternalV1,
  ExtensionRuntimeErrorInternalV1,
  type ExtensionSetupScopeInternalV1,
} from "../extension-runtime/internal.ts";
import { describe, expect, it, vi } from "vitest";

import {
  ApplicationModRuntimeErrorInternalV1,
  createApplicationModRuntimeInternalV1,
  createApplicationModSelectionControllerInternalV1,
  type ApplicationCodeModDefinitionInternalV1,
  type ApplicationModExtensionPointInternalV1,
  type ApplicationModSourceInternalV1,
} from "./internal.ts";
import * as publicComposition from "../index.ts";

const pointV1: ApplicationModExtensionPointInternalV1<string, readonly string[]> = {
  pointId: "scene.decorations",
  contributionKind: "scene-decoration",
  collisionPolicy: "reject",
  compile: ({ contributions }) => contributions.map((entry) => entry.payload),
};

function dataSourceV1(input: {
  readonly modId?: string;
  readonly generation?: string;
  readonly dependencies?: readonly string[];
  readonly contributionId?: string;
  readonly pointId?: string;
  readonly contributionKind?: string;
  readonly payload?: string;
} = {}): ApplicationModSourceInternalV1<string> {
  return {
    kind: "data",
    definition: {
      modId: input.modId ?? "mod.data",
      generation: input.generation ?? "data.1",
      dependencies: input.dependencies ?? [],
      contributions: [{
        contributionId: input.contributionId ?? "decoration.data",
        pointId: input.pointId ?? pointV1.pointId,
        contributionKind: input.contributionKind ?? pointV1.contributionKind,
        payload: input.payload ?? "data",
      }],
    },
  };
}

function codeSourceV1(input: {
  readonly definition?: ApplicationCodeModDefinitionInternalV1<string>;
  readonly load?: () =>
    | ApplicationCodeModDefinitionInternalV1<string>
    | PromiseLike<
      ApplicationCodeModDefinitionInternalV1<string>
    >;
} = {}): ApplicationModSourceInternalV1<string> {
  const definition = input.definition ?? {
    modId: "mod.code",
    generation: "code.1",
    dependencies: ["mod.data"],
    contributions: [{
      contributionId: "decoration.code",
      pointId: pointV1.pointId,
      contributionKind: pointV1.contributionKind,
      payload: "code",
    }],
  };
  return {
    kind: "code",
    modId: "mod.code",
    generation: "code.1",
    load: input.load ?? (() => definition),
  };
}

function createRuntimeV1(input: {
  readonly catalog?: readonly ApplicationModSourceInternalV1<string>[];
  readonly activeModIds?: readonly string[];
  readonly extensionPoints?: readonly ApplicationModExtensionPointInternalV1<
    string,
    readonly string[]
  >[];
}) {
  return createApplicationModRuntimeInternalV1({
    applicationGeneration: "application.1",
    catalog: input.catalog ?? [dataSourceV1(), codeSourceV1()],
    activeModIds: input.activeModIds ?? ["mod.data", "mod.code"],
    extensionPoints: input.extensionPoints ?? [pointV1],
  });
}

function lifecycleCodeSourceV1(input: {
  readonly modId: string;
  readonly generation: string;
  readonly payload: string;
  readonly setup: (scope: ExtensionSetupScopeInternalV1) => unknown;
}): ApplicationModSourceInternalV1<string> {
  const lifecycle = defineExtensionFactoryInternalV1({
    id: input.modId,
    generation: input.generation,
    setup: input.setup,
  });
  return {
    kind: "code",
    modId: input.modId,
    generation: input.generation,
    load: () => ({
      modId: input.modId,
      generation: input.generation,
      dependencies: [],
      contributions: [{
        contributionId: `${input.modId}.decoration`,
        pointId: pointV1.pointId,
        contributionKind: pointV1.contributionKind,
        payload: input.payload,
      }],
      lifecycle,
    }),
  };
}

async function expectModFailureV1(
  promise: Promise<unknown>,
  code: ApplicationModRuntimeErrorInternalV1["code"],
): Promise<void> {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApplicationModRuntimeErrorInternalV1);
  expect((error as ApplicationModRuntimeErrorInternalV1).code).toBe(code);
}

describe("private application Mod Runtime", () => {
  it("cold-compiles data and code contributions, mounts nested Direct lifecycles, and disposes", async () => {
    const events: string[] = [];
    const nested = defineExtensionFactoryInternalV1({
      id: "mod.code.nested",
      generation: "code.1",
      async setup(scope) {
        await scope.effect(() => {
          events.push("nested:install");
          return () => {
            events.push("nested:cleanup");
          };
        });
        return undefined;
      },
    });
    const lifecycle = defineExtensionFactoryInternalV1({
      id: "mod.code",
      generation: "code.1",
      async setup(scope) {
        await scope.effect(() => {
          events.push("code:install");
          return () => {
            events.push("code:cleanup");
          };
        });
        await scope.mountChild(nested);
        return undefined;
      },
    });
    const codeDefinition: ApplicationCodeModDefinitionInternalV1<string> = {
      modId: "mod.code",
      generation: "code.1",
      dependencies: ["mod.data"],
      contributions: [{
        contributionId: "decoration.shared",
        pointId: pointV1.pointId,
        contributionKind: pointV1.contributionKind,
        payload: "code",
      }],
      lifecycle,
    };
    const load = vi.fn(async () => codeDefinition);

    const runtime = await createRuntimeV1({
      catalog: [
        codeSourceV1({ load }),
        dataSourceV1({ contributionId: "decoration.shared" }),
      ],
      activeModIds: ["mod.code", "mod.data"],
      extensionPoints: [{ ...pointV1, collisionPolicy: "allow" }],
    });

    expect(load).toHaveBeenCalledOnce();
    expect(runtime.activeIdentity).toEqual([
      { modId: "mod.data", generation: "data.1" },
      { modId: "mod.code", generation: "code.1" },
    ]);
    expect(runtime.compiledPoints).toEqual([{
      pointId: pointV1.pointId,
      value: ["data", "code"],
    }]);
    expect(events).toEqual(["code:install", "nested:install"]);
    expect(runtime).not.toHaveProperty("activate");
    expect(runtime).not.toHaveProperty("install");
    expect(runtime).not.toHaveProperty("restart");
    expect(publicComposition).not.toHaveProperty("createApplicationModRuntimeInternalV1");

    await runtime.dispose();
    await runtime.dispose();
    expect(events).toEqual([
      "code:install",
      "nested:install",
      "nested:cleanup",
      "code:cleanup",
    ]);
  });

  it("admits inactive catalog identity without walking its definition body", async () => {
    const inactiveCodeLoad = vi.fn(() => {
      throw new Error("inactive code must stay cold");
    });
    const inactive = dataSourceV1({
      modId: "mod.inactive",
      generation: "inactive.1",
      dependencies: ["mod.missing", "mod.missing"],
    });

    const runtime = await createRuntimeV1({
      catalog: [dataSourceV1(), inactive, codeSourceV1({ load: inactiveCodeLoad })],
      activeModIds: ["mod.data"],
    });

    expect(runtime.activeIdentity).toEqual([{ modId: "mod.data", generation: "data.1" }]);
    expect(runtime.compiledPoints[0]?.value).toEqual(["data"]);
    expect(inactiveCodeLoad).not.toHaveBeenCalled();
    await runtime.dispose();
  });

  it("rejects missing dependencies, unknown targets, kind mismatches, and collisions", async () => {
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [dataSourceV1(), dataSourceV1()],
        activeModIds: ["mod.data"],
      }),
      "mod_runtime.duplicate",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [dataSourceV1({ dependencies: ["mod.missing"] })],
        activeModIds: ["mod.data"],
      }),
      "mod_runtime.dependency_missing",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [dataSourceV1({ pointId: "scene.unknown" })],
        activeModIds: ["mod.data"],
      }),
      "mod_runtime.target_unknown",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [dataSourceV1({ contributionKind: "narrative" })],
        activeModIds: ["mod.data"],
      }),
      "mod_runtime.kind_mismatch",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [
          dataSourceV1({ contributionId: "shared" }),
          codeSourceV1({
            definition: {
              modId: "mod.code",
              generation: "code.1",
              dependencies: ["mod.data"],
              contributions: [{
                contributionId: "shared",
                pointId: pointV1.pointId,
                contributionKind: pointV1.contributionKind,
                payload: "code",
              }],
            },
          }),
        ],
      }),
      "mod_runtime.collision",
    );
  });

  it("rejects code load and identity failures before lifecycle setup", async () => {
    const setup = vi.fn();
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [
          codeSourceV1({
            load: () => {
              throw new Error("load failed");
            },
          }),
        ],
        activeModIds: ["mod.code"],
      }),
      "mod_runtime.load_failed",
    );
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [
          codeSourceV1({
            load: () => ({
              modId: "mod.other",
              generation: "code.1",
              dependencies: [],
              contributions: [],
              lifecycle: defineExtensionFactoryInternalV1({
                id: "mod.other",
                generation: "code.1",
                setup,
              }),
            }),
          }),
        ],
        activeModIds: ["mod.code"],
      }),
      "mod_runtime.identity_mismatch",
    );
    expect(setup).not.toHaveBeenCalled();
  });

  it("reports application compile failure without mounting code lifecycle", async () => {
    const setup = vi.fn();
    const definition: ApplicationCodeModDefinitionInternalV1<string> = {
      modId: "mod.code",
      generation: "code.1",
      dependencies: [],
      contributions: [],
      lifecycle: defineExtensionFactoryInternalV1({
        id: "mod.code",
        generation: "code.1",
        setup,
      }),
    };
    await expectModFailureV1(
      createRuntimeV1({
        catalog: [codeSourceV1({ definition })],
        activeModIds: ["mod.code"],
        extensionPoints: [{
          ...pointV1,
          compile: () => {
            throw new Error("application compile failed");
          },
        }],
      }),
      "mod_runtime.compile_failed",
    );
    expect(setup).not.toHaveBeenCalled();
  });

  it("uses Direct parent-child rollback when code setup fails", async () => {
    const events: string[] = [];
    const definition: ApplicationCodeModDefinitionInternalV1<string> = {
      modId: "mod.code",
      generation: "code.1",
      dependencies: [],
      contributions: [],
      lifecycle: defineExtensionFactoryInternalV1({
        id: "mod.code",
        generation: "code.1",
        async setup(scope) {
          await scope.effect(() => {
            events.push("install");
            return () => {
              events.push("rollback");
            };
          });
          throw new Error("setup failed");
        },
      }),
    };

    const error = await createRuntimeV1({
      catalog: [codeSourceV1({ definition })],
      activeModIds: ["mod.code"],
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ExtensionRuntimeErrorInternalV1);
    expect((error as ExtensionRuntimeErrorInternalV1).code).toBe(
      "extension_runtime.setup_failed",
    );
    expect(events).toEqual(["install", "rollback"]);
  });

  it("replaces a complete immutable selection through candidate publication", async () => {
    const events: string[] = [];
    const base = lifecycleCodeSourceV1({
      modId: "mod.base",
      generation: "base.1",
      payload: "base",
      async setup(scope) {
        await scope.effect(() => {
          events.push("base:install");
          return () => {
            events.push("base:cleanup");
          };
        });
      },
    });
    const optional = lifecycleCodeSourceV1({
      modId: "mod.optional",
      generation: "optional.1",
      payload: "optional",
      async setup(scope) {
        await scope.effect(() => {
          events.push("optional:install");
          return () => {
            events.push("optional:cleanup");
          };
        });
      },
    });
    const controller = createApplicationModSelectionControllerInternalV1({
      applicationGeneration: "application.1",
      extensionPoints: [{ ...pointV1, collisionPolicy: "allow" }],
    });

    const first = await controller.activate({
      selectionGeneration: 1,
      catalog: [base, optional],
      activeModIds: ["mod.base"],
    });
    expect(first).toMatchObject({
      applicationGeneration: "application.1",
      selectionGeneration: 1,
      activeIdentity: [{ modId: "mod.base", generation: "base.1" }],
      compiledPoints: [{ pointId: pointV1.pointId, value: ["base"] }],
    });
    expect(events).toEqual(["base:install"]);

    const second = await controller.restart({
      selectionGeneration: 2,
      catalog: [base, optional],
      activeModIds: ["mod.base", "mod.optional"],
    }, (candidate, previous) => {
      expect(controller.getCurrent()).toBe(previous);
      expect(candidate.compiledPoints[0]?.value).toEqual(["base", "optional"]);
      expect(events).toEqual(["base:install", "base:install", "optional:install"]);
      events.push("selection:publish");
    });

    expect(second.selectionGeneration).toBe(2);
    expect(controller.getCurrent()).toBe(second);
    expect(events).toEqual([
      "base:install",
      "base:install",
      "optional:install",
      "selection:publish",
      "base:cleanup",
    ]);
    expect(controller).not.toHaveProperty("install");
    expect(controller).not.toHaveProperty("uninstall");
    expect(publicComposition).not.toHaveProperty(
      "createApplicationModSelectionControllerInternalV1",
    );

    await controller.dispose();
    await controller.dispose();
    expect(events).toEqual([
      "base:install",
      "base:install",
      "optional:install",
      "selection:publish",
      "base:cleanup",
      "optional:cleanup",
      "base:cleanup",
    ]);
  });

  it("retains the predecessor and cleans each failed successor exactly once", async () => {
    const events: string[] = [];
    const predecessor = lifecycleCodeSourceV1({
      modId: "mod.predecessor",
      generation: "predecessor.1",
      payload: "predecessor",
      async setup(scope) {
        await scope.effect(() => {
          events.push("predecessor:install");
          return () => {
            events.push("predecessor:cleanup");
          };
        });
      },
    });
    const compileFailure = dataSourceV1({
      modId: "mod.compile-failure",
      generation: "compile-failure.1",
      payload: "compile-failure",
    });
    const setupFailure = lifecycleCodeSourceV1({
      modId: "mod.setup-failure",
      generation: "setup-failure.1",
      payload: "setup-failure",
      async setup(scope) {
        await scope.effect(() => {
          events.push("setup-failure:install");
          return () => {
            events.push("setup-failure:cleanup");
          };
        });
        throw new Error("setup rejected candidate");
      },
    });
    const publicationFailure = lifecycleCodeSourceV1({
      modId: "mod.publication-failure",
      generation: "publication-failure.1",
      payload: "publication-failure",
      async setup(scope) {
        await scope.effect(() => {
          events.push("publication-failure:install");
          return () => {
            events.push("publication-failure:cleanup");
          };
        });
      },
    });
    const controller = createApplicationModSelectionControllerInternalV1({
      applicationGeneration: "application.1",
      extensionPoints: [{
        ...pointV1,
        compile(input) {
          const values = input.contributions.map((entry) => entry.payload);
          if (values.includes("compile-failure")) {
            throw new Error("compile rejected candidate");
          }
          return values;
        },
      }],
    });
    const first = await controller.activate({
      selectionGeneration: 1,
      catalog: [predecessor],
      activeModIds: ["mod.predecessor"],
    });

    const compileError = await controller.restart({
      selectionGeneration: 2,
      catalog: [compileFailure],
      activeModIds: ["mod.compile-failure"],
    }, () => undefined).catch((error: unknown) => error);
    expect(compileError).toBeInstanceOf(ExtensionRuntimeErrorInternalV1);
    expect((compileError as ExtensionRuntimeErrorInternalV1).code).toBe(
      "extension_runtime.load_failed",
    );
    expect((compileError as Error).cause).toBeInstanceOf(
      ApplicationModRuntimeErrorInternalV1,
    );
    expect(controller.getCurrent()).toBe(first);
    expect(events).toEqual(["predecessor:install"]);

    const setupError = await controller.restart({
      selectionGeneration: 3,
      catalog: [setupFailure],
      activeModIds: ["mod.setup-failure"],
    }, () => undefined).catch((error: unknown) => error);
    expect(setupError).toBeInstanceOf(ExtensionRuntimeErrorInternalV1);
    expect((setupError as ExtensionRuntimeErrorInternalV1).code).toBe(
      "extension_runtime.setup_failed",
    );
    expect(controller.getCurrent()).toBe(first);
    expect(events).toEqual([
      "predecessor:install",
      "setup-failure:install",
      "setup-failure:cleanup",
    ]);

    const publicationError = await controller.restart({
      selectionGeneration: 4,
      catalog: [publicationFailure],
      activeModIds: ["mod.publication-failure"],
    }, () => {
      events.push("publication-failure:publish");
      throw new Error("publication rejected candidate");
    }).catch((error: unknown) => error);
    expect(publicationError).toBeInstanceOf(ExtensionRuntimeErrorInternalV1);
    expect((publicationError as ExtensionRuntimeErrorInternalV1).code).toBe(
      "extension_runtime.publication_failed",
    );
    expect(controller.getCurrent()).toBe(first);
    expect(events).toEqual([
      "predecessor:install",
      "setup-failure:install",
      "setup-failure:cleanup",
      "publication-failure:install",
      "publication-failure:publish",
      "publication-failure:cleanup",
    ]);

    await controller.dispose();
    expect(events.at(-1)).toBe("predecessor:cleanup");
    expect(events.filter((event) => event === "setup-failure:cleanup")).toHaveLength(1);
    expect(events.filter((event) => event === "publication-failure:cleanup")).toHaveLength(1);
    expect(events.filter((event) => event === "predecessor:cleanup")).toHaveLength(1);
  });

  it("fences invalid and non-monotonic selection generations", async () => {
    const controller = createApplicationModSelectionControllerInternalV1({
      applicationGeneration: "application.1",
      extensionPoints: [pointV1],
    });
    const candidate = (selectionGeneration: number) => ({
      selectionGeneration,
      catalog: [dataSourceV1()],
      activeModIds: ["mod.data"],
    });

    await expectModFailureV1(
      controller.activate(candidate(0)),
      "mod_runtime.selection_generation_invalid",
    );
    await controller.activate(candidate(2));
    await expectModFailureV1(
      controller.restart(candidate(2), () => undefined),
      "mod_runtime.selection_generation_stale",
    );
    await expectModFailureV1(
      controller.restart(candidate(1), () => undefined),
      "mod_runtime.selection_generation_stale",
    );

    await controller.dispose();
  });
});

// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it } from "vitest";

import {
  CompositionErrorV1,
  createCompositionKernelV1,
  createCompositionRegistryTokenV1,
  createCompositionServiceTokenV1,
  defineCompositionPluginV1,
  defineCompositionProfileV1,
} from "./index.ts";
import type {
  CompositionDirectResolverV1,
  CompositionKernelV1,
  CompositionPluginScopeV1,
  CompositionProfileKindV1,
  CompositionProfileV1,
} from "./index.ts";
import {
  compileLegacyApplicationFactoryV1,
  defineLegacyApplicationPluginV1,
  defineLegacyApplicationProfileV1,
} from "./legacy.ts";
import type { LegacyApplicationFactoryV1 } from "./legacy.ts";

const kernelsV1: CompositionKernelV1[] = [];

afterEach(async () => {
  await Promise.all(kernelsV1.splice(0).map((kernel) => kernel.dispose()));
});

function kernelV1(): CompositionKernelV1 {
  const kernel = createCompositionKernelV1();
  kernelsV1.push(kernel);
  return kernel;
}

async function expectCompositionErrorV1(
  operation: Promise<unknown>,
  code: CompositionErrorV1["code"],
): Promise<CompositionErrorV1> {
  try {
    await operation;
  } catch (error) {
    expect(error).toBeInstanceOf(CompositionErrorV1);
    expect((error as CompositionErrorV1).code).toBe(code);
    return error as CompositionErrorV1;
  }
  throw new Error(`expected ${code}`);
}

async function settleWithinV1(
  operation: Promise<unknown>,
): Promise<
  | { readonly kind: "settled"; readonly value: unknown }
  | { readonly kind: "timeout" }
> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation.then(
        (value) => ({ kind: "settled" as const, value }),
        (error: unknown) => ({ kind: "settled" as const, value: error }),
      ),
      new Promise<{ readonly kind: "timeout" }>((resolve) => {
        timer = setTimeout(() => resolve({ kind: "timeout" }), 100);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function profileV1(
  plugins: CompositionProfileV1["plugins"],
  kind: CompositionProfileKindV1 = "live",
): CompositionProfileV1 {
  return defineCompositionProfileV1({ id: "test.profile", kind, plugins });
}

describe("composition profile preflight and activation", () => {
  it("keeps topology, boot identity, and registry order stable across declaration order", async () => {
    const service = createCompositionServiceTokenV1<{ readonly label: string }>(
      "test.service",
    );
    const registry = createCompositionRegistryTokenV1<string>("test.registry");
    const setupOrder: string[] = [];
    const provider = defineCompositionPluginV1({
      id: "z.provider",
      revision: 1,
      provides: [service],
      setup(scope) {
        setupOrder.push("provider");
        scope.provide(service, { label: "ready" });
      },
    });
    const consumer = defineCompositionPluginV1({
      id: "zz.consumer",
      revision: 1,
      requires: [service],
      setup(scope) {
        setupOrder.push(`consumer:${scope.use(service).label}`);
      },
    });
    const low = defineCompositionPluginV1({
      id: "b.low",
      revision: 1,
      contributes: [{ token: registry, id: "low", priority: 0 }],
      setup(scope) {
        setupOrder.push("low");
        scope.contribute(registry, { id: "low", value: "low", priority: 0 });
      },
    });
    const high = defineCompositionPluginV1({
      id: "a.high",
      revision: 1,
      contributes: [{ token: registry, id: "high", priority: 20 }],
      setup(scope) {
        setupOrder.push("high");
        scope.contribute(registry, { id: "high", value: "high", priority: 20 });
      },
    });

    const firstKernel = kernelV1();
    const first = await firstKernel.mount(
      profileV1([consumer, low, provider, high]),
    );
    expect(setupOrder).toEqual(["high", "low", "provider", "consumer:ready"]);
    setupOrder.length = 0;
    const secondKernel = kernelV1();
    const second = await secondKernel.mount(
      profileV1([high, provider, low, consumer]),
    );

    expect(second.bootDiagnostic.identity).toBe(first.bootDiagnostic.identity);
    expect(second.bootDiagnostic.pluginOrder).toEqual([
      "a.high",
      "b.low",
      "z.provider",
      "zz.consumer",
    ]);
    expect(
      second.compileDirectPlan((resolve) => ({
        service: resolve.use(service),
        registry: resolve.contributions(registry),
      })),
    ).toEqual({
      service: { label: "ready" },
      registry: [
        { id: "high", value: "high", priority: 20, pluginId: "a.high" },
        { id: "low", value: "low", priority: 0, pluginId: "b.low" },
      ],
    });
  });

  it("changes boot identity when a plugin revision changes", async () => {
    const service = createCompositionServiceTokenV1<number>("revision.service");
    const plugin = (revision: number) =>
      defineCompositionPluginV1({
        id: "revision.provider",
        revision,
        provides: [service],
        setup: (scope) => scope.provide(service, revision),
      });
    const first = await kernelV1().mount(profileV1([plugin(1)]));
    const second = await kernelV1().mount(profileV1([plugin(2)]));
    expect(second.bootDiagnostic.identity).not.toBe(
      first.bootDiagnostic.identity,
    );
  });

  it("validates identifiers, revisions, priorities, and declared registry delivery", async () => {
    const registry = createCompositionRegistryTokenV1<string>(
      "validated.registry",
    );
    expect(() => createCompositionServiceTokenV1("bad\nidentifier")).toThrow(
      "without control characters",
    );
    expect(() =>
      defineCompositionPluginV1({
        id: "bad.revision",
        revision: 0,
        setup() {},
      })
    ).toThrow("positive safe integer");
    expect(() =>
      defineCompositionPluginV1({
        id: "bad.priority",
        revision: 1,
        contributes: [{ token: registry, id: "entry", priority: 0.5 }],
        setup() {},
      })
    ).toThrow("priority must be a safe integer");

    const error = await expectCompositionErrorV1(
      kernelV1().mount(profileV1([
        defineCompositionPluginV1({
          id: "missing.registry.entry",
          revision: 1,
          contributes: [{ token: registry, id: "required-entry" }],
          setup() {},
        }),
      ])),
      "composition.setup_failed",
    );
    expect(error.cause).toBeInstanceOf(CompositionErrorV1);
    expect((error.cause as CompositionErrorV1).code).toBe(
      "composition.registry_entry_missing",
    );
  });

  it("does not let a same-id token substitute for the declared typed token", async () => {
    const numberToken = createCompositionServiceTokenV1<number>(
      "identity.service",
    );
    const stringToken = createCompositionServiceTokenV1<string>(
      "identity.service",
    );
    const error = await expectCompositionErrorV1(
      kernelV1().mount(profileV1([
        defineCompositionPluginV1({
          id: "identity.provider",
          revision: 1,
          provides: [numberToken],
          setup(scope) {
            scope.provide(stringToken, "not a number");
          },
        }),
      ])),
      "composition.setup_failed",
    );
    expect((error.cause as CompositionErrorV1).code).toBe(
      "composition.undeclared_service",
    );
  });

  it("rejects duplicate providers, missing providers, registry duplicates, and cycles before setup", async () => {
    const serviceA = createCompositionServiceTokenV1<number>("preflight.a");
    const serviceB = createCompositionServiceTokenV1<number>("preflight.b");
    const registry = createCompositionRegistryTokenV1<number>(
      "preflight.registry",
    );
    let setupCalls = 0;
    const plugin = (
      id: string,
      options: Partial<
        Pick<
          ReturnType<typeof defineCompositionPluginV1>,
          "requires" | "provides"
        >
      > = {},
    ) =>
      defineCompositionPluginV1({
        id,
        revision: 1,
        ...options,
        setup() {
          setupCalls += 1;
        },
      });

    await expectCompositionErrorV1(
      kernelV1().mount(profileV1([
        plugin("duplicate.a", { provides: [serviceA] }),
        plugin("duplicate.b", { provides: [serviceA] }),
      ])),
      "composition.duplicate_provider",
    );
    await expectCompositionErrorV1(
      kernelV1().mount(
        profileV1([plugin("missing", { requires: [serviceA] })]),
      ),
      "composition.missing_provider",
    );
    await expectCompositionErrorV1(
      kernelV1().mount(profileV1([
        plugin("cycle.a", { requires: [serviceB], provides: [serviceA] }),
        plugin("cycle.b", { requires: [serviceA], provides: [serviceB] }),
      ])),
      "composition.dependency_cycle",
    );
    const duplicateRegistry = (id: string) =>
      defineCompositionPluginV1({
        id,
        revision: 1,
        contributes: [{ token: registry, id: "same-entry" }],
        setup(scope) {
          setupCalls += 1;
          scope.contribute(registry, { id: "same-entry", value: 1 });
        },
      });
    await expectCompositionErrorV1(
      kernelV1().mount(profileV1([
        duplicateRegistry("registry.a"),
        duplicateRegistry("registry.b"),
      ])),
      "composition.duplicate_registry_entry",
    );
    const sameIdNumber = createCompositionServiceTokenV1<number>(
      "preflight.same-id",
    );
    const sameIdString = createCompositionServiceTokenV1<string>(
      "preflight.same-id",
    );
    await expectCompositionErrorV1(
      kernelV1().mount(profileV1([
        plugin("same-id.provider", { provides: [sameIdNumber] }),
        plugin("same-id.consumer", { requires: [sameIdString] }),
      ])),
      "composition.invalid_definition",
    );
    expect(setupCalls).toBe(0);
  });
});

describe("composition lifecycle", () => {
  it("rolls back staged effects atomically and closes captured scopes", async () => {
    const events: string[] = [];
    let capturedScope: CompositionPluginScopeV1 | null = null;
    const first = defineCompositionPluginV1({
      id: "a.first",
      revision: 1,
      setup(scope) {
        capturedScope = scope;
        void scope.effect(() => {
          events.push("install:first");
          return () => {
            events.push("cleanup:first");
          };
        });
      },
    });
    const failing = defineCompositionPluginV1({
      id: "b.failing",
      revision: 1,
      setup(scope) {
        void scope.effect(() => {
          events.push("install:failing");
          return () => {
            events.push("cleanup:failing");
          };
        });
        throw new Error("setup exploded");
      },
    });
    const kernel = kernelV1();
    await expectCompositionErrorV1(
      kernel.mount(profileV1([failing, first])),
      "composition.setup_failed",
    );

    expect(kernel.getSnapshot()).toBeNull();
    expect(events).toEqual([
      "install:first",
      "install:failing",
      "cleanup:failing",
      "cleanup:first",
    ]);
    expect(() => capturedScope!.effect(() => undefined)).toThrow(
      "plugin scope a.first is closed",
    );
  });

  it("fails lifecycle reentry fast and continues sibling cleanup", async () => {
    const events: string[] = [];
    const diagnostics: unknown[] = [];
    const kernel = createCompositionKernelV1({
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic);
        throw new Error("observer failures are isolated");
      },
    });
    kernelsV1.push(kernel);
    await kernel.mount(profileV1([
      defineCompositionPluginV1({
        id: "cleanup.plugin",
        revision: 1,
        async setup(scope) {
          await scope.effect(() => () => {
            events.push("cleanup:first");
          });
          await scope.effect(() => () => {
            events.push("cleanup:closed-scope");
            void scope.effect(() => undefined);
          });
          await scope.effect(() => async () => {
            events.push("cleanup:reentrant");
            await kernel.dispose();
          });
        },
      }),
    ]));

    await kernel.dispose();
    expect(events).toEqual([
      "cleanup:reentrant",
      "cleanup:closed-scope",
      "cleanup:first",
    ]);
    expect(diagnostics).toHaveLength(2);
    expect(kernel.getDiagnostics()).toEqual([
      expect.objectContaining({
        code: "composition.cleanup_failed",
        profileId: "test.profile",
        pluginId: "cleanup.plugin",
        phase: "dispose",
      }),
      expect.objectContaining({
        code: "composition.cleanup_failed",
        profileId: "test.profile",
        pluginId: "cleanup.plugin",
        phase: "dispose",
      }),
    ]);
    expect(
      kernel.getDiagnostics().map((diagnostic) => (diagnostic.error as CompositionErrorV1).code),
    ).toEqual(
      ["composition.lifecycle_busy", "composition.scope_closed"],
    );
  });

  it("rejects setup lifecycle reentry without deadlocking", async () => {
    const kernel = kernelV1();
    const plugin = defineCompositionPluginV1({
      id: "reentrant.setup",
      revision: 1,
      async setup() {
        await kernel.dispose();
      },
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const outcome = await Promise.race([
      kernel.mount(profileV1([plugin])).catch((error: unknown) => error),
      new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), 100);
      }),
    ]);
    if (timer !== undefined) clearTimeout(timer);
    expect(outcome).not.toBe("timeout");
    expect(outcome).toBeInstanceOf(CompositionErrorV1);
    expect((outcome as CompositionErrorV1).code).toBe(
      "composition.setup_failed",
    );
    expect(((outcome as CompositionErrorV1).cause as CompositionErrorV1).code)
      .toBe("composition.lifecycle_busy");
  });

  it("keeps the old live snapshot until a candidate fully mounts and retains it on failure", async () => {
    const service = createCompositionServiceTokenV1<string>("live.service");
    const provider = (revision: number, value: string) =>
      defineCompositionPluginV1({
        id: "live.provider",
        revision,
        provides: [service],
        setup: (scope) => scope.provide(service, value),
      });
    const kernel = kernelV1();
    const original = await kernel.mount(profileV1([provider(1, "old")]));
    const originalDirectPlan = original.compileDirectPlan((resolve) => {
      const value = resolve.use(service);
      return () => value;
    });
    let enterCandidate!: () => void;
    let releaseCandidate!: () => void;
    const entered = new Promise<void>((resolve) => enterCandidate = resolve);
    const gate = new Promise<void>((resolve) => releaseCandidate = resolve);
    const candidate = defineCompositionPluginV1({
      id: "live.provider",
      revision: 2,
      provides: [service],
      async setup() {
        enterCandidate();
        await gate;
        throw new Error("candidate rejected");
      },
    });

    const reload = kernel.reload(profileV1([candidate]), () => undefined);
    await entered;
    expect(kernel.getSnapshot()).toBe(original);
    releaseCandidate();
    await expectCompositionErrorV1(reload, "composition.setup_failed");
    expect(kernel.getSnapshot()).toBe(original);
    expect(original.compileDirectPlan((resolve) => resolve.use(service))).toBe(
      "old",
    );

    const replacement = await kernel.reload(profileV1([provider(3, "new")]), () => undefined);
    expect(kernel.getSnapshot()).toBe(replacement);
    expect(replacement.compileDirectPlan((resolve) => resolve.use(service)))
      .toBe("new");
    expect(originalDirectPlan()).toBe("old");
    expect(() => original.compileDirectPlan((resolve) => resolve.use(service)))
      .toThrow("is no longer mounted");
  });

  it("keeps the old provider current until consumer publication acknowledges the candidate", async () => {
    const service = createCompositionServiceTokenV1<{ readonly read: () => string }>(
      "live.publication.service",
    );
    const events = new EventTarget();
    const deliveries: string[] = [];
    let oldAlive = true;
    const provider = (revision: number, value: string) =>
      defineCompositionPluginV1({
        id: "live.publication.provider",
        revision,
        provides: [service],
        async setup(scope) {
          scope.provide(
            service,
            Object.freeze({
              read: () => {
                if (value === "old" && !oldAlive) throw new Error("old provider retired early");
                return value;
              },
            }),
          );
          await scope.effect(() => {
            const listener = (): void => {
              deliveries.push(value);
            };
            events.addEventListener("probe", listener);
            return () => {
              events.removeEventListener("probe", listener);
              if (value === "old") oldAlive = false;
            };
          });
        },
      });
    const kernel = kernelV1();
    const original = await kernel.mount(profileV1([provider(1, "old")]));
    const oldPlan = original.compileDirectPlan((resolve) => resolve.use(service));
    let publicationCalled = false;
    let enterPublication!: () => void;
    let acknowledgePublication!: () => void;
    const publicationEntered = new Promise<void>((resolve) => enterPublication = resolve);
    const publicationAcknowledged = new Promise<void>((resolve) =>
      acknowledgePublication = resolve
    );

    const reload = kernel.reload(
      profileV1([provider(2, "new")]),
      async (candidate, previous) => {
        publicationCalled = true;
        expect(previous).toBe(original);
        expect(kernel.getSnapshot()).toBe(original);
        expect(oldPlan.read()).toBe("old");
        expect(candidate.compileDirectPlan((resolve) => resolve.use(service)).read()).toBe("new");
        events.dispatchEvent(new Event("probe"));
        expect(deliveries).toEqual(["old", "new"]);
        enterPublication();
        await publicationAcknowledged;
      },
    );

    await publicationEntered;
    expect(publicationCalled).toBe(true);
    expect(kernel.getSnapshot()).toBe(original);
    expect(oldPlan.read()).toBe("old");
    acknowledgePublication();
    const replacement = await reload;
    expect(kernel.getSnapshot()).toBe(replacement);
    expect(oldAlive).toBe(false);
    events.dispatchEvent(new Event("probe"));
    expect(deliveries).toEqual(["old", "new", "new"]);
    expect(() => original.compileDirectPlan(() => undefined)).toThrow("is no longer mounted");
    await kernel.dispose();
  });

  it.each(["synchronous", "asynchronous"] as const)(
    "rolls a candidate back after %s consumer publication failure",
    async (failureKind) => {
      const service = createCompositionServiceTokenV1<string>(
        `live.publication.failure.${failureKind}`,
      );
      const events: string[] = [];
      const provider = (revision: number, value: string) =>
        defineCompositionPluginV1({
          id: "live.publication.failure-provider",
          revision,
          provides: [service],
          async setup(scope) {
            scope.provide(service, value);
            await scope.effect(() => {
              events.push(`install:${value}`);
              return () => {
                events.push(`dispose:${value}`);
              };
            });
          },
        });
      const kernel = kernelV1();
      const original = await kernel.mount(profileV1([provider(1, "old")]));
      const publicationFailure = new Error(`${failureKind} publication failed`);

      await expect(kernel.reload(
        profileV1([provider(2, "candidate")]),
        failureKind === "synchronous"
          ? () => {
            throw publicationFailure;
          }
          : async () => {
            await Promise.resolve();
            throw publicationFailure;
          },
      )).rejects.toBe(publicationFailure);

      expect(kernel.getSnapshot()).toBe(original);
      expect(original.compileDirectPlan((resolve) => resolve.use(service))).toBe("old");
      expect(events).toEqual([
        "install:old",
        "install:candidate",
        "dispose:candidate",
      ]);
      await kernel.dispose();
      expect(events).toEqual([
        "install:old",
        "install:candidate",
        "dispose:candidate",
        "dispose:old",
      ]);
    },
  );

  it("rejects overlapping lifecycle mutation and accepts a later reload", async () => {
    const events: string[] = [];
    const gates = new Map<number, () => void>();
    const entered = new Map<number, () => void>();
    const enteredPromises = new Map<number, Promise<void>>();
    for (const revision of [2]) {
      enteredPromises.set(
        revision,
        new Promise((resolve) => entered.set(revision, resolve)),
      );
    }
    const plugin = (revision: number, wait = false) =>
      defineCompositionPluginV1({
        id: "serial.plugin",
        revision,
        async setup() {
          events.push(`start:${revision}`);
          entered.get(revision)?.();
          if (wait) {
            await new Promise<void>((resolve) => gates.set(revision, resolve));
          }
          events.push(`finish:${revision}`);
        },
      });
    const kernel = kernelV1();
    await kernel.mount(profileV1([plugin(1)]));
    const second = kernel.reload(profileV1([plugin(2, true)]), () => undefined);
    await enteredPromises.get(2);
    await expectCompositionErrorV1(
      kernel.reload(profileV1([plugin(3)]), () => undefined),
      "composition.lifecycle_busy",
    );
    expect(events).not.toContain("start:3");
    gates.get(2)!();
    await second;
    await kernel.reload(profileV1([plugin(3)]), () => undefined);
    expect(events).toEqual([
      "start:1",
      "finish:1",
      "start:2",
      "finish:2",
      "start:3",
      "finish:3",
    ]);
  });

  it("returns authoritative mount only after permanent sealing", async () => {
    const plugin = (revision: number) =>
      defineCompositionPluginV1({
        id: "authority.plugin",
        revision,
        setup() {},
      });
    const kernel = kernelV1();
    const snapshot = await kernel.mount(
      profileV1([plugin(1)], "authoritative"),
    );
    await expectCompositionErrorV1(
      kernel.reload(profileV1([plugin(2)], "authoritative"), () => undefined),
      "composition.authoritative_sealed",
    );
    expect(kernel.getSnapshot()).toBe(snapshot);
  });
});

describe("direct plans and legacy application adapter", () => {
  it("expires the resolver after synchronous compilation and keeps command activation direct", async () => {
    const commands = createCompositionServiceTokenV1<(value: number) => number>(
      "commands",
    );
    const kernel = kernelV1();
    const snapshot = await kernel.mount(profileV1([
      defineCompositionPluginV1({
        id: "commands.provider",
        revision: 1,
        provides: [commands],
        setup: (scope) => scope.provide(commands, (value) => value + 1),
      }),
    ], "authoritative"));
    let captured: CompositionDirectResolverV1 | null = null;
    let compileCalls = 0;
    const directCommand = snapshot.compileDirectPlan((resolve) => {
      captured = resolve;
      compileCalls += 1;
      const dispatch = resolve.use(commands);
      return (value: number) => dispatch(value);
    });

    for (let index = 0; index < 1_000; index += 1) {
      expect(directCommand(index)).toBe(index + 1);
    }
    expect(compileCalls).toBe(1);
    expect(() => captured!.use(commands)).toThrow(
      "valid only inside its synchronous compile callback",
    );
    expect(() => snapshot.compileDirectPlan(async () => undefined)).toThrow(
      "direct plan compilation must finish synchronously",
    );
    await kernel.dispose();
    expect(() => snapshot.compileDirectPlan((resolve) => resolve.use(commands)))
      .toThrow("is no longer mounted");
    expect(directCommand(1)).toBe(2);
  });

  it("keeps the legacy factory cold until authoritative mount and direct compilation complete", async () => {
    interface Application {
      readonly name: string;
    }
    const factoryToken = createCompositionServiceTokenV1<
      LegacyApplicationFactoryV1<Application>
    >("legacy.factory");
    expect(() =>
      defineLegacyApplicationPluginV1({
        id: "legacy.invalid-revision",
        revision: 0,
        factory: factoryToken,
        prepare() {},
        create: () => ({ name: "invalid" }),
        dispose() {},
      })
    ).toThrow("positive safe integer");
    const events: string[] = [];
    let setupComplete = false;
    let activeApplications = 0;
    const plugin = defineLegacyApplicationPluginV1({
      id: "a.legacy.application",
      revision: 7,
      factory: factoryToken,
      prepare() {
        events.push("prepare");
        return "legacy";
      },
      create(name) {
        expect(setupComplete).toBe(true);
        events.push(`create:${name}`);
        activeApplications += 1;
        return { name };
      },
      dispose(application) {
        events.push(`dispose:${application.name}`);
        activeApplications -= 1;
      },
    });
    const trailingSetup = defineCompositionPluginV1({
      id: "z.setup.complete",
      revision: 1,
      setup() {
        setupComplete = true;
        events.push("setup:complete");
      },
    });
    const profile = defineLegacyApplicationProfileV1({
      id: "legacy.profile",
      application: plugin,
      plugins: [trailingSetup],
    });
    const kernel = kernelV1();
    const snapshot = await kernel.mount(profile);
    expect(events).toEqual(["prepare", "setup:complete"]);
    expect(activeApplications).toBe(0);
    await expectCompositionErrorV1(
      kernel.reload(profile, () => undefined),
      "composition.authoritative_sealed",
    );

    const coldFactory = snapshot.compileDirectPlan((resolve) => resolve.use(factoryToken));
    await expectCompositionErrorV1(
      coldFactory.create(),
      "composition.factory_inactive",
    );
    const factory = compileLegacyApplicationFactoryV1(snapshot, factoryToken);
    expect(events).toEqual(["prepare", "setup:complete"]);

    const lease = await factory.create();
    expect(lease.application).toEqual({ name: "legacy" });
    expect(activeApplications).toBe(1);
    await lease.dispose();
    await lease.dispose();
    expect(activeApplications).toBe(0);
    expect(events).toEqual([
      "prepare",
      "setup:complete",
      "create:legacy",
      "dispose:legacy",
    ]);
  });

  it("rejects concurrent and reentrant legacy creation without a second authority", async () => {
    interface Application {
      readonly id: number;
    }
    const factoryToken = createCompositionServiceTokenV1<
      LegacyApplicationFactoryV1<Application>
    >("legacy.single-authority.factory");
    let factory: LegacyApplicationFactoryV1<Application>;
    let releaseCreation!: () => void;
    let enterCreation!: () => void;
    const entered = new Promise<void>((resolve) => enterCreation = resolve);
    const gate = new Promise<void>((resolve) => releaseCreation = resolve);
    let reentrantCode: CompositionErrorV1["code"] | null = null;
    let activeApplications = 0;
    let peakApplications = 0;
    const plugin = defineLegacyApplicationPluginV1({
      id: "legacy.single-authority",
      revision: 1,
      factory: factoryToken,
      prepare() {},
      async create() {
        enterCreation();
        try {
          await factory.create();
        } catch (error) {
          reentrantCode = (error as CompositionErrorV1).code;
        }
        await gate;
        activeApplications += 1;
        peakApplications = Math.max(peakApplications, activeApplications);
        return { id: 1 };
      },
      dispose() {
        activeApplications -= 1;
      },
    });
    const kernel = kernelV1();
    const snapshot = await kernel.mount(defineLegacyApplicationProfileV1({
      id: "legacy.single-authority.profile",
      application: plugin,
    }));
    factory = compileLegacyApplicationFactoryV1(snapshot, factoryToken);

    const first = factory.create();
    await expectCompositionErrorV1(
      factory.create(),
      "composition.lifecycle_busy",
    );
    await entered;
    expect(reentrantCode).toBe("composition.lifecycle_busy");
    releaseCreation();
    const firstLease = await first;
    await expectCompositionErrorV1(
      factory.create(),
      "composition.application_active",
    );
    expect(peakApplications).toBe(1);

    await firstLease.dispose();
    const secondLease = await factory.create();
    expect(peakApplications).toBe(1);
    await secondLease.dispose();
  });

  it("fails kernel cleanup fast while factory creation owns lifecycle activity", async () => {
    const factoryToken = createCompositionServiceTokenV1<
      LegacyApplicationFactoryV1<{ readonly id: number }>
    >("legacy.creation-race.factory");
    let enterCreation!: () => void;
    let releaseCreation!: () => void;
    const entered = new Promise<void>((resolve) => enterCreation = resolve);
    const gate = new Promise<void>((resolve) => releaseCreation = resolve);
    const disposed: number[] = [];
    const plugin = defineLegacyApplicationPluginV1({
      id: "legacy.creation-race",
      revision: 1,
      factory: factoryToken,
      prepare() {},
      async create() {
        enterCreation();
        await gate;
        return { id: 1 };
      },
      dispose(application) {
        disposed.push(application.id);
      },
    });
    const kernel = kernelV1();
    const profile = defineLegacyApplicationProfileV1({
      id: "legacy.creation-race.profile",
      application: plugin,
    });
    const snapshot = await kernel.mount(profile);
    const factory = compileLegacyApplicationFactoryV1(snapshot, factoryToken);
    const creation = factory.create();
    await entered;
    await expectCompositionErrorV1(
      kernel.reload(profile, () => undefined),
      "composition.lifecycle_busy",
    );
    await expectCompositionErrorV1(
      kernel.dispose(),
      "composition.lifecycle_busy",
    );
    releaseCreation();
    const lease = await creation;
    expect(disposed).toEqual([]);
    await kernel.dispose();
    expect(disposed).toEqual([1]);
    await lease.dispose();
  });

  it("fails kernel reentry from legacy create and dispose callbacks without deadlocking", async () => {
    const factoryToken = createCompositionServiceTokenV1<
      LegacyApplicationFactoryV1<{ readonly id: number }>
    >("legacy.kernel-reentry.factory");
    const kernel = kernelV1();
    let reenterCreate = true;
    let createInnerCode: CompositionErrorV1["code"] | null = null;
    let disposeInnerCode: CompositionErrorV1["code"] | null = null;
    const plugin = defineLegacyApplicationPluginV1({
      id: "legacy.kernel-reentry",
      revision: 1,
      factory: factoryToken,
      prepare() {},
      async create() {
        if (reenterCreate) {
          try {
            await kernel.dispose();
          } catch (error) {
            createInnerCode = (error as CompositionErrorV1).code;
            throw error;
          }
        }
        return { id: 1 };
      },
      async dispose() {
        try {
          await kernel.dispose();
        } catch (error) {
          disposeInnerCode = (error as CompositionErrorV1).code;
          throw error;
        }
      },
    });
    const snapshot = await kernel.mount(defineLegacyApplicationProfileV1({
      id: "legacy.kernel-reentry.profile",
      application: plugin,
    }));
    const factory = compileLegacyApplicationFactoryV1(snapshot, factoryToken);

    const createOutcome = await settleWithinV1(factory.create());
    expect(createOutcome.kind).toBe("settled");
    expect((createOutcome as { readonly value: CompositionErrorV1 }).value.code).toBe(
      "composition.lifecycle_busy",
    );
    expect(createInnerCode).toBe("composition.lifecycle_busy");
    reenterCreate = false;
    const lease = await factory.create();
    const disposeOutcome = await settleWithinV1(lease.dispose());
    expect(disposeOutcome.kind).toBe("settled");
    expect((disposeOutcome as { readonly value: CompositionErrorV1 }).value.code).toBe(
      "composition.lifecycle_busy",
    );
    expect(disposeInnerCode).toBe("composition.lifecycle_busy");

    await kernel.dispose();
    expect(kernel.getDiagnostics()).toEqual([
      expect.objectContaining({
        code: "composition.cleanup_failed",
        pluginId: "legacy.kernel-reentry",
        phase: "dispose",
      }),
    ]);
    expect(
      (kernel.getDiagnostics()[0]!.error as AggregateError).errors,
    ).toEqual([
      expect.objectContaining({ code: "composition.lifecycle_busy" }),
    ]);
  });

  it("retains failed lease cleanup for kernel diagnostics and continues sibling factories", async () => {
    const healthyToken = createCompositionServiceTokenV1<
      LegacyApplicationFactoryV1<{ readonly id: "healthy" }>
    >("legacy.healthy.factory");
    const failingToken = createCompositionServiceTokenV1<
      LegacyApplicationFactoryV1<{ readonly id: "failing" }>
    >("legacy.failing.factory");
    const events: string[] = [];
    const healthy = defineLegacyApplicationPluginV1({
      id: "a.legacy.healthy",
      revision: 1,
      factory: healthyToken,
      prepare() {},
      create: () => ({ id: "healthy" as const }),
      dispose(application) {
        events.push(`dispose:${application.id}`);
      },
    });
    const cleanupFailure = new Error("legacy cleanup failed");
    const failing = defineLegacyApplicationPluginV1({
      id: "z.legacy.failing",
      revision: 1,
      factory: failingToken,
      prepare() {},
      create: () => ({ id: "failing" as const }),
      dispose(application) {
        events.push(`dispose:${application.id}`);
        throw cleanupFailure;
      },
    });
    const kernel = kernelV1();
    const snapshot = await kernel.mount(defineLegacyApplicationProfileV1({
      id: "legacy.cleanup.profile",
      application: healthy,
      plugins: [failing],
    }));
    const healthyLease = await compileLegacyApplicationFactoryV1(
      snapshot,
      healthyToken,
    ).create();
    const failingLease = await compileLegacyApplicationFactoryV1(
      snapshot,
      failingToken,
    ).create();
    await expect(failingLease.dispose()).rejects.toBe(cleanupFailure);

    await kernel.dispose();
    expect(events).toEqual(["dispose:failing", "dispose:healthy"]);
    expect(kernel.getDiagnostics()).toEqual([
      expect.objectContaining({
        code: "composition.cleanup_failed",
        pluginId: "z.legacy.failing",
        phase: "dispose",
      }),
    ]);
    expect(
      (kernel.getDiagnostics()[0]!.error as AggregateError).errors,
    ).toContain(cleanupFailure);
    await healthyLease.dispose();
  });
});

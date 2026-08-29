// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  admitRequiredExtensionsInternalV1,
  createBoundExtensionFactoryInternalV1,
  createExtensionActivationControllerInternalV1,
  createExtensionLifecycleBackendInternalV1,
  defineExtensionCandidateSourceInternalV1,
  defineExtensionFactoryInternalV1,
  ExtensionRuntimeErrorInternalV1,
  mountExtensionFactoryInternalV1,
} from "./internal.ts";
import type {
  BoundExtensionConsumerInternalV1,
  ExtensionActivationControllerInternalV1,
  ExtensionBackendMountOptionsInternalV1,
  ExtensionCandidateSourceInternalV1,
  ExtensionFactoryInternalV1,
  ExtensionLifecycleBackendInternalV1,
  ExtensionMountedHandleInternalV1,
  RequiredExtensionAdmissionInputInternalV1,
} from "./internal.ts";

interface ConsumerInternalV1 {
  readonly label: string;
}

interface DeferredInternalV1<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T | PromiseLike<T>) => void;
  readonly reject: (error: unknown) => void;
}

function deferredInternalV1<T>(): DeferredInternalV1<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function consumerFactoryInternalV1(
  id: string,
  generation: string,
  setup: ExtensionFactoryInternalV1<ConsumerInternalV1>["setup"],
): ExtensionFactoryInternalV1<ConsumerInternalV1> {
  return defineExtensionFactoryInternalV1({ id, generation, setup });
}

function sourceInternalV1(
  factory: ExtensionFactoryInternalV1<ConsumerInternalV1>,
  load?: () =>
    | ExtensionFactoryInternalV1<ConsumerInternalV1>
    | PromiseLike<ExtensionFactoryInternalV1<ConsumerInternalV1>>,
): ExtensionCandidateSourceInternalV1<ConsumerInternalV1> {
  return defineExtensionCandidateSourceInternalV1({
    id: factory.id,
    generation: factory.generation,
    load: load ?? (() => factory),
  });
}

async function expectRuntimeErrorInternalV1(
  operation: Promise<unknown>,
  code: ExtensionRuntimeErrorInternalV1["code"],
): Promise<ExtensionRuntimeErrorInternalV1> {
  try {
    await operation;
  } catch (error) {
    expect(error).toBeInstanceOf(ExtensionRuntimeErrorInternalV1);
    expect((error as ExtensionRuntimeErrorInternalV1).code).toBe(code);
    return error as ExtensionRuntimeErrorInternalV1;
  }
  throw new Error(`expected ${code}`);
}

async function settleWithinInternalV1(operation: Promise<unknown>): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation.then(
        (value) => value,
        (error: unknown) => error,
      ),
      new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), 100);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

const backendCasesInternalV1: readonly {
  readonly name: string;
  readonly create: () => ExtensionLifecycleBackendInternalV1;
  mount<TConsumer>(
    factory: ExtensionFactoryInternalV1<TConsumer>,
    options?: ExtensionBackendMountOptionsInternalV1,
  ): Promise<ExtensionMountedHandleInternalV1<TConsumer>>;
}[] = Object.freeze([
  Object.freeze({
    name: "selected",
    create: createExtensionLifecycleBackendInternalV1,
    mount: mountExtensionFactoryInternalV1,
  }),
]);

for (const backendCase of backendCasesInternalV1) {
  it(`${backendCase.name} mounts the same neutral factory without an activation controller`, async () => {
    const events: string[] = [];
    const cleanupEntered = deferredInternalV1<void>();
    const cleanupGate = deferredInternalV1<void>();
    const child = consumerFactoryInternalV1(`${backendCase.name}.child`, "g1", async (scope) => {
      await scope.effect(() => {
        events.push("install:child:one");
        return () => {
          events.push("cleanup:child:one");
        };
      });
      await scope.effect(() => {
        events.push("install:child:two");
        return () => {
          events.push("cleanup:child:two");
        };
      });
      return Object.freeze({ label: "child" });
    });
    const parent = consumerFactoryInternalV1(`${backendCase.name}.parent`, "g1", async (scope) => {
      await scope.effect(() => {
        events.push("install:parent:one");
        return () => {
          events.push("cleanup:parent:one");
        };
      });
      await scope.effect(() => {
        events.push("install:parent:two");
        return async () => {
          events.push("cleanup:parent:two");
          cleanupEntered.resolve();
          await cleanupGate.promise;
        };
      });
      const mountedChild = await scope.mountChild(child);
      return Object.freeze({ label: `parent:${mountedChild.consumer.label}` });
    });

    const handle = await backendCase.mount(parent);
    expect(handle.consumer).toEqual({ label: "parent:child" });
    expect(events).toEqual([
      "install:parent:one",
      "install:parent:two",
      "install:child:one",
      "install:child:two",
    ]);

    const firstDispose = handle.dispose();
    const secondDispose = handle.dispose();
    expect(secondDispose).toBe(firstDispose);
    await cleanupEntered.promise;
    expect(events).toEqual([
      "install:parent:one",
      "install:parent:two",
      "install:child:one",
      "install:child:two",
      "cleanup:child:two",
      "cleanup:child:one",
      "cleanup:parent:two",
    ]);
    cleanupGate.resolve();
    await firstDispose;
    await handle.dispose();
    expect(events.at(-1)).toBe("cleanup:parent:one");
    expect(events.filter((event) => event.startsWith("cleanup:"))).toHaveLength(4);
  });
}

for (const backendCase of backendCasesInternalV1) {
  describe(`${backendCase.name} extension lifecycle conformance`, () => {
    function controllerInternalV1(
      id = "conformance.extension",
      onDiagnostic?: Parameters<
        typeof createExtensionActivationControllerInternalV1
      >[0]["onDiagnostic"],
      backend = backendCase.create(),
    ): ExtensionActivationControllerInternalV1<ConsumerInternalV1> {
      return createExtensionActivationControllerInternalV1<ConsumerInternalV1>({
        id,
        backend,
        ...(onDiagnostic === undefined ? {} : { onDiagnostic }),
      });
    }

    it("admits exactly one required domain and local binding before any mount", async () => {
      interface ProviderInternalV1 {
        readonly label: string;
      }
      type DomainBuilderInternalV1 = (
        provider: ProviderInternalV1,
      ) => ExtensionFactoryInternalV1<ConsumerInternalV1>;

      let backendMounts = 0;
      let effectInstalls = 0;
      const backend = backendCase.create();
      const countedBackend: ExtensionLifecycleBackendInternalV1 = Object.freeze({
        async mount<TConsumer>(
          factory: ExtensionFactoryInternalV1<TConsumer>,
          options?: ExtensionBackendMountOptionsInternalV1,
        ): Promise<ExtensionMountedHandleInternalV1<TConsumer>> {
          backendMounts += 1;
          return await backend.mount(factory, options);
        },
      });
      const provider = defineExtensionFactoryInternalV1<ProviderInternalV1>({
        id: "binding.provider",
        generation: "generation.one",
        async setup(scope) {
          await scope.effect(() => {
            effectInstalls += 1;
          });
          return Object.freeze({ label: "provider" });
        },
      });
      const domainBuilder: DomainBuilderInternalV1 = (selectedProvider) =>
        consumerFactoryInternalV1("domain.dependent", "generation.one", async (scope) => {
          await scope.effect(() => {
            effectInstalls += 1;
          });
          return Object.freeze({ label: `dependent:${selectedProvider.label}` });
        });
      const domainCandidate = Object.freeze({ id: "domain.required", value: domainBuilder });
      const bindingCandidate = Object.freeze({ id: "binding.required", value: provider });
      const mountAdmitted = async (
        input: RequiredExtensionAdmissionInputInternalV1<
          DomainBuilderInternalV1,
          ExtensionFactoryInternalV1<ProviderInternalV1>
        >,
      ): Promise<
        ExtensionMountedHandleInternalV1<
          BoundExtensionConsumerInternalV1<ProviderInternalV1, ConsumerInternalV1>
        >
      > => {
        const admitted = admitRequiredExtensionsInternalV1(input);
        const domain = admitted.domains[0];
        const binding = admitted.localBindings[0];
        if (domain === undefined || binding === undefined) {
          throw new Error("admission did not return its required selections");
        }
        return await countedBackend.mount(createBoundExtensionFactoryInternalV1({
          id: "domain.bound",
          generation: "generation.one",
          provider: binding.value,
          createDependent: domain.value,
        }));
      };
      const selection = (
        selectedDomains: readonly typeof domainCandidate[],
        selectedLocalBindings: readonly typeof bindingCandidate[],
      ): RequiredExtensionAdmissionInputInternalV1<
        DomainBuilderInternalV1,
        ExtensionFactoryInternalV1<ProviderInternalV1>
      > => ({
        selectedDomains,
        requiredDomainIds: ["domain.required"],
        selectedLocalBindings,
        requiredLocalBindingIds: ["binding.required"],
      });

      await expectRuntimeErrorInternalV1(
        mountAdmitted(selection([], [bindingCandidate])),
        "extension_runtime.required_domain_missing",
      );
      await expectRuntimeErrorInternalV1(
        mountAdmitted(selection([domainCandidate, domainCandidate], [bindingCandidate])),
        "extension_runtime.required_domain_ambiguous",
      );
      await expectRuntimeErrorInternalV1(
        mountAdmitted(selection([domainCandidate], [])),
        "extension_runtime.required_local_binding_missing",
      );
      await expectRuntimeErrorInternalV1(
        mountAdmitted(selection([domainCandidate], [bindingCandidate, bindingCandidate])),
        "extension_runtime.required_local_binding_ambiguous",
      );
      expect({ backendMounts, effectInstalls }).toEqual({ backendMounts: 0, effectInstalls: 0 });

      const handle = await mountAdmitted(selection([domainCandidate], [bindingCandidate]));
      expect(handle.consumer).toEqual({
        provider: { label: "provider" },
        dependent: { label: "dependent:provider" },
      });
      expect({ backendMounts, effectInstalls }).toEqual({ backendMounts: 1, effectInstalls: 2 });
      await handle.dispose();
    });

    it("treats provider loss as bound-owner disposal and recovers with one new generation", async () => {
      interface ProviderInternalV1 {
        readonly generation: string;
      }
      const events: string[] = [];
      const dependentMounts = new Map<string, number>();
      let activeProviders = 0;
      let activeDependents = 0;
      const boundFactory = (
        generation: string,
      ): ExtensionFactoryInternalV1<
        BoundExtensionConsumerInternalV1<ProviderInternalV1, ConsumerInternalV1>
      > => {
        const provider = defineExtensionFactoryInternalV1<ProviderInternalV1>({
          id: "recovery.provider",
          generation,
          async setup(scope) {
            await scope.effect(() => {
              events.push(`install:provider:${generation}`);
              activeProviders += 1;
              return () => {
                events.push(`cleanup:provider:${generation}`);
                activeProviders -= 1;
              };
            });
            return Object.freeze({ generation });
          },
        });
        const createDependent = (
          selectedProvider: ProviderInternalV1,
        ): ExtensionFactoryInternalV1<ConsumerInternalV1> =>
          consumerFactoryInternalV1("recovery.dependent", generation, async (scope) => {
            expect(activeProviders).toBe(1);
            expect(selectedProvider.generation).toBe(generation);
            dependentMounts.set(generation, (dependentMounts.get(generation) ?? 0) + 1);
            await scope.effect(() => {
              events.push(`install:dependent:${generation}`);
              activeDependents += 1;
              return () => {
                events.push(`cleanup:dependent:${generation}`);
                activeDependents -= 1;
              };
            });
            return Object.freeze({ label: `dependent:${selectedProvider.generation}` });
          });
        const admitted = admitRequiredExtensionsInternalV1({
          selectedDomains: [{ id: "domain.required", value: createDependent }],
          requiredDomainIds: ["domain.required"],
          selectedLocalBindings: [{ id: "binding.required", value: provider }],
          requiredLocalBindingIds: ["binding.required"],
        });
        const domain = admitted.domains[0];
        const binding = admitted.localBindings[0];
        if (domain === undefined || binding === undefined) {
          throw new Error("admission did not return its required selections");
        }
        return createBoundExtensionFactoryInternalV1({
          id: "recovery.bound-domain",
          generation,
          provider: binding.value,
          createDependent: domain.value,
        });
      };

      const backend = backendCase.create();
      const first = await backend.mount(boundFactory("generation.one"));
      expect({ activeProviders, activeDependents }).toEqual({
        activeProviders: 1,
        activeDependents: 1,
      });
      expect(dependentMounts.get("generation.one")).toBe(1);

      // Explicit loss disposes the entire bound owner; no automatic provider
      // selection or dependent recovery occurs behind the caller's back.
      await first.dispose();
      expect({ activeProviders, activeDependents }).toEqual({
        activeProviders: 0,
        activeDependents: 0,
      });
      expect(events.slice(-2)).toEqual([
        "cleanup:dependent:generation.one",
        "cleanup:provider:generation.one",
      ]);

      const recovered = await backend.mount(boundFactory("generation.two"));
      expect(dependentMounts.get("generation.two")).toBe(1);
      expect({ activeProviders, activeDependents }).toEqual({
        activeProviders: 1,
        activeDependents: 1,
      });
      await recovered.dispose();
      expect(events.slice(-2)).toEqual([
        "cleanup:dependent:generation.two",
        "cleanup:provider:generation.two",
      ]);
      expect({ activeProviders, activeDependents }).toEqual({
        activeProviders: 0,
        activeDependents: 0,
      });
    });

    it("isolates optional sibling failure and retry from an already-ready sibling", async () => {
      const backend = backendCase.create();
      let readyResources = 0;
      let optionalResources = 0;
      const readyController = controllerInternalV1("sibling.ready", undefined, backend);
      const optionalController = controllerInternalV1("sibling.optional", undefined, backend);
      const readyFactory = consumerFactoryInternalV1(
        "sibling.ready",
        "generation.one",
        async (scope) => {
          await scope.effect(() => {
            readyResources += 1;
            return () => {
              readyResources -= 1;
            };
          });
          return Object.freeze({ label: "ready" });
        },
      );
      await readyController.activate(sourceInternalV1(readyFactory));

      const optionalFactory = consumerFactoryInternalV1(
        "sibling.optional",
        "generation.one",
        async (scope) => {
          await scope.effect(() => {
            optionalResources += 1;
            return () => {
              optionalResources -= 1;
            };
          });
          return Object.freeze({ label: "optional" });
        },
      );
      let optionalLoads = 0;
      const optionalSource = sourceInternalV1(optionalFactory, () => {
        optionalLoads += 1;
        if (optionalLoads === 1) throw new Error("optional loader failed");
        return optionalFactory;
      });
      await expectRuntimeErrorInternalV1(
        optionalController.activate(optionalSource),
        "extension_runtime.load_failed",
      );
      expect(readyController.getCurrent()).toMatchObject({
        generation: "generation.one",
        consumer: { label: "ready" },
      });
      expect({ readyResources, optionalResources }).toEqual({
        readyResources: 1,
        optionalResources: 0,
      });

      await expect(optionalController.retry()).resolves.toEqual({ label: "optional" });
      expect(readyController.getCurrent()?.consumer.label).toBe("ready");
      expect({ readyResources, optionalResources }).toEqual({
        readyResources: 1,
        optionalResources: 1,
      });
      await optionalController.dispose();
      expect({ readyResources, optionalResources }).toEqual({
        readyResources: 1,
        optionalResources: 0,
      });
      await readyController.dispose();
      expect(readyResources).toBe(0);
    });

    it("owns nested children and releases child/effect resources in reverse order", async () => {
      const events: string[] = [];
      const child = consumerFactoryInternalV1("owned.child", "generation.one", async (scope) => {
        await scope.effect(() => {
          events.push("install:child:one");
          return () => {
            events.push("cleanup:child:one");
          };
        });
        await scope.effect(() => {
          events.push("install:child:two");
          return () => {
            events.push("cleanup:child:two");
          };
        });
        return Object.freeze({ label: "child" });
      });
      const parent = consumerFactoryInternalV1(
        "owned.parent",
        "generation.one",
        async (scope) => {
          await scope.effect(() => {
            events.push("install:parent:one");
            return () => {
              events.push("cleanup:parent:one");
            };
          });
          await scope.effect(() => {
            events.push("install:parent:two");
            return () => {
              events.push("cleanup:parent:two");
            };
          });
          const mountedChild = await scope.mountChild(child);
          return Object.freeze({ label: `parent:${mountedChild.consumer.label}` });
        },
      );

      const handle = await backendCase.create().mount(parent);
      expect(handle.consumer.label).toBe("parent:child");
      await handle.dispose();
      expect(events).toEqual([
        "install:parent:one",
        "install:parent:two",
        "install:child:one",
        "install:child:two",
        "cleanup:child:two",
        "cleanup:child:one",
        "cleanup:parent:two",
        "cleanup:parent:one",
      ]);
    });

    it("drains effects appended by an asynchronous installer before reporting ready", async () => {
      const outerGate = deferredInternalV1<void>();
      const innerEntered = deferredInternalV1<void>();
      const innerGate = deferredInternalV1<void>();
      const events: string[] = [];
      const factory = consumerFactoryInternalV1(
        "nested.effect",
        "generation.one",
        (scope) => {
          void scope.effect(async () => {
            await outerGate.promise;
            void scope.effect(async () => {
              innerEntered.resolve();
              await innerGate.promise;
              events.push("install:inner");
              return () => {
                events.push("cleanup:inner");
              };
            });
            events.push("install:outer");
            return () => {
              events.push("cleanup:outer");
            };
          });
          return Object.freeze({ label: "nested-effect" });
        },
      );

      let ready = false;
      const mounting = backendCase.create().mount(factory);
      void mounting.then(() => {
        ready = true;
      });
      await Promise.resolve();
      expect(ready).toBe(false);
      outerGate.resolve();
      await innerEntered.promise;
      expect(ready).toBe(false);
      innerGate.resolve();
      const handle = await mounting;
      expect(ready).toBe(true);
      expect(events).toEqual(["install:outer", "install:inner"]);
      await handle.dispose();
      expect(events).toEqual([
        "install:outer",
        "install:inner",
        "cleanup:inner",
        "cleanup:outer",
      ]);
    });

    it("is single-flight per id and generation and isolates state observers", async () => {
      const controller = controllerInternalV1();
      const loadGate = deferredInternalV1<ExtensionFactoryInternalV1<ConsumerInternalV1>>();
      const factory = consumerFactoryInternalV1(
        "conformance.extension",
        "generation.one",
        () => Object.freeze({ label: "one" }),
      );
      let loadCalls = 0;
      let loaderJoin: Promise<ConsumerInternalV1> | null = null;
      let source!: ExtensionCandidateSourceInternalV1<ConsumerInternalV1>;
      source = sourceInternalV1(factory, () => {
        loadCalls += 1;
        loaderJoin = controller.activate(source);
        return loadGate.promise;
      });
      const observedKinds: string[] = [];
      let observerJoin: Promise<ConsumerInternalV1> | null = null;
      controller.subscribe(() => {
        throw new Error("observer failure must be isolated");
      });
      controller.subscribe(() => {
        const state = controller.getState();
        observedKinds.push(state.kind);
        if (state.kind === "loading") observerJoin = controller.activate(source);
      });

      expect(controller.getState()).toEqual({ kind: "idle" });
      const first = controller.activate(source);
      const second = controller.activate(source);
      expect(second).toBe(first);
      expect(observerJoin).toBe(first);
      expect(loaderJoin).toBe(first);
      expect(loadCalls).toBe(1);
      expect(controller.getState()).toMatchObject({
        kind: "loading",
        id: "conformance.extension",
        generation: "generation.one",
        previous: null,
      });

      loadGate.resolve(factory);
      await expect(first).resolves.toEqual({ label: "one" });
      expect(controller.getState()).toMatchObject({
        kind: "ready",
        current: { generation: "generation.one", consumer: { label: "one" } },
      });
      expect(controller.getCurrent()).toMatchObject({
        generation: "generation.one",
        consumer: { label: "one" },
      });
      expect(observedKinds).toEqual(["loading", "ready"]);

      await controller.dispose();
      expect(controller.getState()).toEqual({ kind: "disposed" });
      expect(observedKinds).toEqual(["loading", "ready", "disposed"]);
      await expectRuntimeErrorInternalV1(
        controller.activate(source),
        "extension_runtime.disposed",
      );
    });

    it("joins the same generation while asynchronous setup is pending", async () => {
      const controller = controllerInternalV1("setup-join.extension");
      const setupEntered = deferredInternalV1<void>();
      const setupGate = deferredInternalV1<void>();
      let setupCalls = 0;
      const factory = consumerFactoryInternalV1(
        "setup-join.extension",
        "generation.one",
        async () => {
          setupCalls += 1;
          setupEntered.resolve();
          await setupGate.promise;
          return Object.freeze({ label: "joined" });
        },
      );
      const source = sourceInternalV1(factory);

      const first = controller.activate(source);
      await setupEntered.promise;
      const second = controller.activate(source);
      expect(second).toBe(first);
      expect(setupCalls).toBe(1);

      setupGate.resolve();
      await expect(first).resolves.toEqual({ label: "joined" });
      await expect(second).resolves.toEqual({ label: "joined" });
      expect(setupCalls).toBe(1);
      await controller.dispose();
    });

    it("joins the same restart while candidate asynchronous setup is pending", async () => {
      const controller = controllerInternalV1("restart-join.extension");
      const predecessor = consumerFactoryInternalV1(
        "restart-join.extension",
        "generation.one",
        () => Object.freeze({ label: "one" }),
      );
      await controller.activate(sourceInternalV1(predecessor));

      const setupEntered = deferredInternalV1<void>();
      const setupGate = deferredInternalV1<void>();
      let setupCalls = 0;
      let publishCalls = 0;
      const candidate = consumerFactoryInternalV1(
        "restart-join.extension",
        "generation.two",
        async () => {
          setupCalls += 1;
          setupEntered.resolve();
          await setupGate.promise;
          return Object.freeze({ label: "two" });
        },
      );
      const candidateSource = sourceInternalV1(candidate);
      const first = controller.restart(candidateSource, () => {
        publishCalls += 1;
      });
      await setupEntered.promise;
      const second = controller.restart(candidateSource, () => {
        throw new Error("joined restart must not run a second publisher");
      });
      expect(second).toBe(first);
      expect(setupCalls).toBe(1);

      setupGate.resolve();
      await expect(first).resolves.toEqual({ label: "two" });
      await expect(second).resolves.toEqual({ label: "two" });
      expect({ setupCalls, publishCalls }).toEqual({ setupCalls: 1, publishCalls: 1 });
      await controller.dispose();
    });

    it("fences and cleans a candidate disposed during asynchronous setup", async () => {
      const controller = controllerInternalV1("setup-dispose.extension");
      const setupEntered = deferredInternalV1<void>();
      const setupGate = deferredInternalV1<void>();
      let resources = 0;
      let cleanupCalls = 0;
      const factory = consumerFactoryInternalV1(
        "setup-dispose.extension",
        "generation.one",
        async (scope) => {
          await scope.effect(() => {
            resources += 1;
            return () => {
              cleanupCalls += 1;
              resources -= 1;
            };
          });
          setupEntered.resolve();
          await setupGate.promise;
          return Object.freeze({ label: "late" });
        },
      );

      const activation = controller.activate(sourceInternalV1(factory));
      const activationOutcome = expectRuntimeErrorInternalV1(
        activation,
        "extension_runtime.disposed",
      );
      await setupEntered.promise;
      const firstDispose = controller.dispose();
      const secondDispose = controller.dispose();
      expect(secondDispose).toBe(firstDispose);
      expect(controller.getState()).toEqual({ kind: "disposed" });
      expect(resources).toBe(1);

      setupGate.resolve();
      await activationOutcome;
      await firstDispose;
      expect({ resources, cleanupCalls }).toEqual({ resources: 0, cleanupCalls: 1 });
      expect(controller.getCurrent()).toBeNull();
      expect(controller.dispose()).toBe(firstDispose);
    });

    it("awaits restart candidate and predecessor cleanup when disposed during mount", async () => {
      const controller = controllerInternalV1("restart-mount-dispose.extension");
      const events: string[] = [];
      const predecessorCleanupEntered = deferredInternalV1<void>();
      const predecessorCleanupGate = deferredInternalV1<void>();
      const predecessor = consumerFactoryInternalV1(
        "restart-mount-dispose.extension",
        "generation.one",
        async (scope) => {
          await scope.effect(() => async () => {
            events.push("predecessor:cleanup:start");
            predecessorCleanupEntered.resolve();
            await predecessorCleanupGate.promise;
            events.push("predecessor:cleanup:end");
          });
          return Object.freeze({ label: "one" });
        },
      );
      await controller.activate(sourceInternalV1(predecessor));

      const candidateSetupEntered = deferredInternalV1<void>();
      const candidateSetupGate = deferredInternalV1<void>();
      const candidateCleanupEntered = deferredInternalV1<void>();
      const candidateCleanupGate = deferredInternalV1<void>();
      const candidate = consumerFactoryInternalV1(
        "restart-mount-dispose.extension",
        "generation.two",
        async (scope) => {
          await scope.effect(() => async () => {
            events.push("candidate:cleanup:start");
            candidateCleanupEntered.resolve();
            await candidateCleanupGate.promise;
            events.push("candidate:cleanup:end");
          });
          candidateSetupEntered.resolve();
          await candidateSetupGate.promise;
          return Object.freeze({ label: "two" });
        },
      );
      let publishCalls = 0;
      const restart = controller.restart(sourceInternalV1(candidate), () => {
        publishCalls += 1;
      });
      const restartOutcome = expectRuntimeErrorInternalV1(
        restart,
        "extension_runtime.disposed",
      );
      await candidateSetupEntered.promise;

      let disposalSettled = false;
      const disposal = controller.dispose().then(() => {
        disposalSettled = true;
      });
      expect(controller.getState()).toEqual({ kind: "disposed" });
      expect(controller.getCurrent()).toBeNull();
      candidateSetupGate.resolve();
      await candidateCleanupEntered.promise;
      expect(events).toEqual(["candidate:cleanup:start"]);
      expect(disposalSettled).toBe(false);

      candidateCleanupGate.resolve();
      await predecessorCleanupEntered.promise;
      expect(events).toEqual([
        "candidate:cleanup:start",
        "candidate:cleanup:end",
        "predecessor:cleanup:start",
      ]);
      expect(disposalSettled).toBe(false);
      predecessorCleanupGate.resolve();

      await restartOutcome;
      await disposal;
      expect(events).toEqual([
        "candidate:cleanup:start",
        "candidate:cleanup:end",
        "predecessor:cleanup:start",
        "predecessor:cleanup:end",
      ]);
      expect(publishCalls).toBe(0);
      expect(controller.getState()).toEqual({ kind: "disposed" });
      expect(controller.getCurrent()).toBeNull();
    });

    it("awaits restart candidate and predecessor cleanup when disposed during publication", async () => {
      const controller = controllerInternalV1("restart-publication-dispose.extension");
      const events: string[] = [];
      const predecessorCleanupEntered = deferredInternalV1<void>();
      const predecessorCleanupGate = deferredInternalV1<void>();
      const predecessor = consumerFactoryInternalV1(
        "restart-publication-dispose.extension",
        "generation.one",
        async (scope) => {
          await scope.effect(() => async () => {
            events.push("predecessor:cleanup:start");
            predecessorCleanupEntered.resolve();
            await predecessorCleanupGate.promise;
            events.push("predecessor:cleanup:end");
          });
          return Object.freeze({ label: "one" });
        },
      );
      await controller.activate(sourceInternalV1(predecessor));

      const candidateCleanupEntered = deferredInternalV1<void>();
      const candidateCleanupGate = deferredInternalV1<void>();
      const candidate = consumerFactoryInternalV1(
        "restart-publication-dispose.extension",
        "generation.two",
        async (scope) => {
          await scope.effect(() => async () => {
            events.push("candidate:cleanup:start");
            candidateCleanupEntered.resolve();
            await candidateCleanupGate.promise;
            events.push("candidate:cleanup:end");
          });
          return Object.freeze({ label: "two" });
        },
      );
      const publicationEntered = deferredInternalV1<void>();
      const publicationGate = deferredInternalV1<void>();
      const readyGenerations: string[] = [];
      controller.subscribe(() => {
        const state = controller.getState();
        if (state.kind === "ready") readyGenerations.push(state.current.generation);
      });
      const restart = controller.restart(sourceInternalV1(candidate), async () => {
        events.push("publication:start");
        publicationEntered.resolve();
        await publicationGate.promise;
        events.push("publication:end");
      });
      const restartOutcome = expectRuntimeErrorInternalV1(
        restart,
        "extension_runtime.disposed",
      );
      await publicationEntered.promise;

      let disposalSettled = false;
      const disposal = controller.dispose().then(() => {
        disposalSettled = true;
      });
      expect(controller.getState()).toEqual({ kind: "disposed" });
      expect(controller.getCurrent()).toBeNull();
      publicationGate.resolve();
      await candidateCleanupEntered.promise;
      expect(events).toEqual([
        "publication:start",
        "publication:end",
        "candidate:cleanup:start",
      ]);
      expect(disposalSettled).toBe(false);

      candidateCleanupGate.resolve();
      await predecessorCleanupEntered.promise;
      expect(events).toEqual([
        "publication:start",
        "publication:end",
        "candidate:cleanup:start",
        "candidate:cleanup:end",
        "predecessor:cleanup:start",
      ]);
      expect(disposalSettled).toBe(false);
      predecessorCleanupGate.resolve();

      await restartOutcome;
      await disposal;
      expect(events.at(-1)).toBe("predecessor:cleanup:end");
      expect(readyGenerations).not.toContain("generation.two");
      expect(controller.getState()).toEqual({ kind: "disposed" });
      expect(controller.getCurrent()).toBeNull();
    });

    it("keeps handles and controllers idempotent after asynchronous cleanup enters", async () => {
      const handleCleanupEntered = deferredInternalV1<void>();
      const handleCleanupGate = deferredInternalV1<void>();
      let handleCleanupCalls = 0;
      const handle = await backendCase.create().mount(consumerFactoryInternalV1(
        "handle-dispose.extension",
        "generation.one",
        async (scope) => {
          await scope.effect(() => async () => {
            handleCleanupCalls += 1;
            handleCleanupEntered.resolve();
            await handleCleanupGate.promise;
          });
          return Object.freeze({ label: "handle" });
        },
      ));
      const firstHandleDispose = handle.dispose();
      await handleCleanupEntered.promise;
      const secondHandleDispose = handle.dispose();
      expect(secondHandleDispose).toBe(firstHandleDispose);
      handleCleanupGate.resolve();
      await firstHandleDispose;
      expect(handleCleanupCalls).toBe(1);

      const controllerCleanupEntered = deferredInternalV1<void>();
      const controllerCleanupGate = deferredInternalV1<void>();
      let controllerCleanupCalls = 0;
      const controller = controllerInternalV1("controller-dispose.extension");
      const factory = consumerFactoryInternalV1(
        "controller-dispose.extension",
        "generation.one",
        async (scope) => {
          await scope.effect(() => async () => {
            controllerCleanupCalls += 1;
            controllerCleanupEntered.resolve();
            await controllerCleanupGate.promise;
          });
          return Object.freeze({ label: "controller" });
        },
      );
      await controller.activate(sourceInternalV1(factory));
      const firstControllerDispose = controller.dispose();
      await controllerCleanupEntered.promise;
      const secondControllerDispose = controller.dispose();
      expect(secondControllerDispose).toBe(firstControllerDispose);
      controllerCleanupGate.resolve();
      await firstControllerDispose;
      expect(controllerCleanupCalls).toBe(1);
    });

    it("does not let a never-settling resource-free loader block disposal", async () => {
      const controller = controllerInternalV1("never.extension");
      let setupCalls = 0;
      const factory = consumerFactoryInternalV1(
        "never.extension",
        "generation.never",
        () => {
          setupCalls += 1;
          return Object.freeze({ label: "never" });
        },
      );
      const never = new Promise<ExtensionFactoryInternalV1<ConsumerInternalV1>>(() => undefined);
      void controller.activate(sourceInternalV1(factory, () => never));
      expect(controller.getState()).toMatchObject({ kind: "loading" });

      const outcome = await settleWithinInternalV1(controller.dispose());
      expect(outcome).not.toBe("timeout");
      expect(controller.getState()).toEqual({ kind: "disposed" });
      expect(setupCalls).toBe(0);
    });

    it("wraps loader/setup failures, requires explicit retry, and fences factory identity", async () => {
      const controller = controllerInternalV1("retry.extension");
      const factory = consumerFactoryInternalV1(
        "retry.extension",
        "generation.retry",
        () => Object.freeze({ label: "recovered" }),
      );
      let loadCalls = 0;
      const source = sourceInternalV1(factory, () => {
        loadCalls += 1;
        if (loadCalls === 1) throw new Error("loader exploded");
        return factory;
      });

      await expectRuntimeErrorInternalV1(
        controller.activate(source),
        "extension_runtime.load_failed",
      );
      expect(controller.getState()).toMatchObject({
        kind: "error",
        generation: "generation.retry",
        error: { code: "extension_runtime.load_failed" },
      });
      await expectRuntimeErrorInternalV1(
        controller.activate(source),
        "extension_runtime.retry_required",
      );
      expect(loadCalls).toBe(1);
      const retryOne = controller.retry();
      const retryTwo = controller.retry();
      expect(retryTwo).toBe(retryOne);
      await expect(retryOne).resolves.toEqual({ label: "recovered" });
      expect(loadCalls).toBe(2);
      await controller.dispose();

      const mismatchController = controllerInternalV1("mismatch.extension");
      const expected = consumerFactoryInternalV1(
        "mismatch.extension",
        "generation.expected",
        () => Object.freeze({ label: "expected" }),
      );
      const mismatched = consumerFactoryInternalV1(
        "mismatch.extension",
        "generation.wrong",
        () => Object.freeze({ label: "wrong" }),
      );
      await expectRuntimeErrorInternalV1(
        mismatchController.activate(sourceInternalV1(expected, () => mismatched)),
        "extension_runtime.factory_mismatch",
      );
      await mismatchController.dispose();

      const setupController = controllerInternalV1("setup.extension");
      const setupFailure = consumerFactoryInternalV1(
        "setup.extension",
        "generation.failed",
        () => {
          throw new Error("setup exploded");
        },
      );
      const setupError = await expectRuntimeErrorInternalV1(
        setupController.activate(sourceInternalV1(setupFailure)),
        "extension_runtime.setup_failed",
      );
      expect(setupError.cause).toEqual(new Error("setup exploded"));
      await setupController.dispose();
    });

    it("fences a late mounted result and releases it exactly once", async () => {
      const mounted = deferredInternalV1<void>();
      const returnHandle = deferredInternalV1<void>();
      const backend = backendCase.create();
      const delayedBackend: ExtensionLifecycleBackendInternalV1 = Object.freeze({
        async mount<TConsumer>(
          factory: ExtensionFactoryInternalV1<TConsumer>,
          options?: ExtensionBackendMountOptionsInternalV1,
        ): Promise<ExtensionMountedHandleInternalV1<TConsumer>> {
          const handle = await backend.mount(factory, options);
          mounted.resolve();
          await returnHandle.promise;
          return handle;
        },
      });
      const controller = controllerInternalV1("late.extension", undefined, delayedBackend);
      let resources = 0;
      let cleanupCalls = 0;
      const factory = consumerFactoryInternalV1(
        "late.extension",
        "generation.late",
        async (scope) => {
          await scope.effect(() => {
            resources += 1;
            return () => {
              cleanupCalls += 1;
              resources -= 1;
            };
          });
          return Object.freeze({ label: "late" });
        },
      );

      const activation = controller.activate(sourceInternalV1(factory));
      await mounted.promise;
      const disposal = controller.dispose();
      expect(controller.getState()).toEqual({ kind: "disposed" });
      expect(resources).toBe(1);
      returnHandle.resolve();
      await expectRuntimeErrorInternalV1(activation, "extension_runtime.disposed");
      await disposal;
      await controller.dispose();
      expect(resources).toBe(0);
      expect(cleanupCalls).toBe(1);
      expect(controller.getCurrent()).toBeNull();
    });

    it("fails new same-owner setup and cleanup transitions without deadlock", async () => {
      let setupController!: ExtensionActivationControllerInternalV1<ConsumerInternalV1>;
      setupController = controllerInternalV1("reentry.setup");
      const setupFactory = consumerFactoryInternalV1(
        "reentry.setup",
        "generation.one",
        async () => {
          await Promise.resolve();
          await setupController.retry();
          return Object.freeze({ label: "unreachable" });
        },
      );
      const setupOutcome = await settleWithinInternalV1(
        setupController.activate(sourceInternalV1(setupFactory)),
      );
      expect(setupOutcome).not.toBe("timeout");
      expect(setupOutcome).toBeInstanceOf(ExtensionRuntimeErrorInternalV1);
      expect((setupOutcome as ExtensionRuntimeErrorInternalV1).code).toBe(
        "extension_runtime.setup_failed",
      );
      expect((setupOutcome as ExtensionRuntimeErrorInternalV1).cause).toMatchObject({
        code: "extension_runtime.reentrant_transition",
      });
      await setupController.dispose();

      const diagnostics: unknown[] = [];
      const cleanupEvents: string[] = [];
      let cleanupController!: ExtensionActivationControllerInternalV1<ConsumerInternalV1>;
      cleanupController = controllerInternalV1("reentry.cleanup", (diagnostic) => {
        diagnostics.push(diagnostic);
        throw new Error("diagnostic observer failure must be isolated");
      });
      const cleanupFactory = consumerFactoryInternalV1(
        "reentry.cleanup",
        "generation.one",
        async (scope) => {
          await scope.effect(() => () => {
            cleanupEvents.push("cleanup:first");
          });
          await scope.effect(() => async () => {
            cleanupEvents.push("cleanup:reentrant");
            await Promise.resolve();
            await cleanupController.retry();
          });
          return Object.freeze({ label: "cleanup" });
        },
      );
      await cleanupController.activate(sourceInternalV1(cleanupFactory));
      const cleanupOutcome = await settleWithinInternalV1(cleanupController.dispose());
      expect(cleanupOutcome).not.toBe("timeout");
      expect(cleanupEvents).toEqual(["cleanup:reentrant", "cleanup:first"]);
      expect(diagnostics).toEqual([
        expect.objectContaining({
          code: "extension_runtime.cleanup_failed",
          id: "reentry.cleanup",
          error: expect.objectContaining({
            code: "extension_runtime.reentrant_transition",
          }),
        }),
      ]);
    });

    it("retains the predecessor when staging or publication fails", async () => {
      const controller = controllerInternalV1("restart.extension");
      const liveGenerations = new Set<string>();
      const cleanupCalls = new Map<string, number>();
      const trackedFactory = (
        generation: string,
        setupFailure = false,
      ): ExtensionFactoryInternalV1<ConsumerInternalV1> =>
        consumerFactoryInternalV1("restart.extension", generation, async (scope) => {
          await scope.effect(() => {
            liveGenerations.add(generation);
            return () => {
              liveGenerations.delete(generation);
              cleanupCalls.set(generation, (cleanupCalls.get(generation) ?? 0) + 1);
            };
          });
          if (setupFailure) throw new Error(`setup failed:${generation}`);
          return Object.freeze({ label: generation });
        });

      const first = trackedFactory("generation.one");
      await controller.activate(sourceInternalV1(first));
      expect(liveGenerations).toEqual(new Set(["generation.one"]));

      const failedSetup = trackedFactory("generation.setup-failed", true);
      await expectRuntimeErrorInternalV1(
        controller.restart(sourceInternalV1(failedSetup), () => undefined),
        "extension_runtime.setup_failed",
      );
      expect(controller.getCurrent()).toMatchObject({
        generation: "generation.one",
        consumer: { label: "generation.one" },
      });
      expect(liveGenerations).toEqual(new Set(["generation.one"]));
      expect(cleanupCalls.get("generation.setup-failed")).toBe(1);

      const failedPublication = trackedFactory("generation.publish-failed");
      const publicationError = await expectRuntimeErrorInternalV1(
        controller.restart(sourceInternalV1(failedPublication), (candidate, previous) => {
          expect(candidate.consumer.label).toBe("generation.publish-failed");
          expect(previous.consumer.label).toBe("generation.one");
          expect(liveGenerations).toEqual(
            new Set(["generation.one", "generation.publish-failed"]),
          );
          throw new Error("publisher rejected candidate");
        }),
        "extension_runtime.publication_failed",
      );
      expect(publicationError.cause).toEqual(new Error("publisher rejected candidate"));
      expect(controller.getState()).toMatchObject({
        kind: "ready",
        current: { generation: "generation.one" },
      });
      expect(controller.getCurrent()?.consumer.label).toBe("generation.one");
      expect(cleanupCalls.get("generation.publish-failed")).toBe(1);
      await expectRuntimeErrorInternalV1(
        controller.retry(),
        "extension_runtime.retry_unavailable",
      );

      const publicationGate = deferredInternalV1<void>();
      const successor = trackedFactory("generation.two");
      let loadCalls = 0;
      let publishCalls = 0;
      const successorSource = sourceInternalV1(successor, () => {
        loadCalls += 1;
        return successor;
      });
      const restartOne = controller.restart(successorSource, async () => {
        publishCalls += 1;
        expect(controller.getCurrent()?.generation).toBe("generation.one");
        expect(liveGenerations).toEqual(new Set(["generation.one", "generation.two"]));
        await publicationGate.promise;
      });
      const restartTwo = controller.restart(successorSource, () => {
        throw new Error("the joined publisher must not run");
      });
      expect(restartTwo).toBe(restartOne);
      await Promise.resolve();
      expect(loadCalls).toBe(1);
      expect(controller.getState()).toMatchObject({
        kind: "loading",
        generation: "generation.two",
        previous: { generation: "generation.one" },
      });
      publicationGate.resolve();
      await expect(restartOne).resolves.toEqual({ label: "generation.two" });
      expect(publishCalls).toBe(1);
      expect(controller.getCurrent()?.generation).toBe("generation.two");
      expect(cleanupCalls.get("generation.one")).toBe(1);
      expect(liveGenerations).toEqual(new Set(["generation.two"]));

      await controller.dispose();
      expect(cleanupCalls.get("generation.two")).toBe(1);
      expect(liveGenerations.size).toBe(0);
    });

    it("returns listener and timer resources to zero over repeated activation", async () => {
      const target = new EventTarget();
      let listeners = 0;
      let timers = 0;
      for (let cycle = 0; cycle < 20; cycle += 1) {
        const id = `residual.extension.${String(cycle)}`;
        const controller = controllerInternalV1(id);
        const factory = consumerFactoryInternalV1(id, "generation.one", async (scope) => {
          await scope.effect(() => {
            const listener = (): void => undefined;
            target.addEventListener("probe", listener);
            listeners += 1;
            return () => {
              target.removeEventListener("probe", listener);
              listeners -= 1;
            };
          });
          await scope.effect(() => {
            const timer = setInterval(() => undefined, 60_000);
            timers += 1;
            return () => {
              clearInterval(timer);
              timers -= 1;
            };
          });
          return Object.freeze({ label: id });
        });
        await controller.activate(sourceInternalV1(factory));
        expect({ listeners, timers }).toEqual({ listeners: 1, timers: 1 });
        await controller.dispose();
        expect({ listeners, timers }).toEqual({ listeners: 0, timers: 0 });
      }
    });
  });
}

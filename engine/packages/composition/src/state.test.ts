// SPDX-License-Identifier: MIT
import {
  createStateAuthoringKitV1,
  getStateModuleContractRevisionV1,
  type StateAnyModuleV1,
  type StateAuthoringKitV1,
  type StateModuleCompositionV1,
  type StateWorkflowTypeMapV1,
} from "@sillymaker/state";
import { afterEach, describe, expect, it } from "vitest";

import {
  createCompositionKernelV1,
  createCompositionServiceTokenV1,
  type CompositionKernelV1,
} from "./index.ts";
import { defineLegacyApplicationPluginV1, type LegacyApplicationFactoryV1 } from "./legacy.ts";
import {
  activateStateApplicationV1,
  compileStateModuleCompositionV1,
  defineStateCompositionProfileV1,
  defineStateModulePluginV1,
} from "./state.ts";

interface PilotStateV1 {
  readonly simulation: {
    readonly alpha: { readonly value: number };
    readonly zeta: { readonly value: number };
  };
}

interface PilotTypesV1 extends StateWorkflowTypeMapV1<PilotStateV1> {
  readonly event: never;
  readonly rejection: never;
  readonly fault: { readonly code: "pilot.failed" };
}

const sliceSchemaV1 = Object.freeze({
  parse(value: unknown) {
    if (
      value === null || typeof value !== "object" ||
      !Number.isSafeInteger(Reflect.get(value, "value"))
    ) {
      throw new TypeError("invalid pilot slice");
    }
    return Object.freeze({ value: Reflect.get(value, "value") as number });
  },
});

const kernelsV1: CompositionKernelV1[] = [];

afterEach(async () => {
  await Promise.all(kernelsV1.splice(0).map((kernel) => kernel.dispose()));
});

function kernelV1(): CompositionKernelV1 {
  const kernel = createCompositionKernelV1();
  kernelsV1.push(kernel);
  return kernel;
}

function definePilotModuleV1(
  kit: ReturnType<typeof createStateAuthoringKitV1<PilotTypesV1>>,
  id: "pilot.alpha" | "pilot.zeta",
  contractRevision: number,
  slot: "simulation.alpha" | "simulation.zeta",
) {
  return kit.defineModule({
    id,
    contractRevision,
    state: {
      slot,
      schema: sliceSchemaV1,
      initial: () => Object.freeze({ value: 0 }),
    },
    reducers: {},
  });
}

describe("Composition State module integration", () => {
  it("uses the State revision admitted before mutable definition aliases change", () => {
    const kit = createStateAuthoringKitV1<PilotTypesV1>();
    const definition = {
      id: "pilot.alpha",
      contractRevision: 3,
      state: {
        slot: "simulation.alpha",
        schema: sliceSchemaV1,
        initial: () => Object.freeze({ value: 0 }),
      },
      reducers: {},
    };
    const module = kit.defineModule(definition);
    Reflect.set(definition, "contractRevision", 99);

    expect(getStateModuleContractRevisionV1(module)).toBe(3);
    expect(defineStateModulePluginV1(module).revision).toBe(3);
    expect(kit.composeModules([module]).modules[0]?.descriptor.contractRevision)
      .toBe(3);
  });

  it("stabilizes module identity and compiles bindings once before authoritative use", async () => {
    const kit = createStateAuthoringKitV1<PilotTypesV1>();
    const alpha = definePilotModuleV1(
      kit,
      "pilot.alpha",
      2,
      "simulation.alpha",
    );
    const zeta = definePilotModuleV1(
      kit,
      "pilot.zeta",
      7,
      "simulation.zeta",
    );
    expect(defineStateModulePluginV1(alpha)).toMatchObject({
      id: "pilot.alpha",
      revision: 2,
    });

    const forwardProfile = defineStateCompositionProfileV1({
      id: "pilot.state-profile",
      modules: [alpha, zeta],
    });
    const reverseProfile = defineStateCompositionProfileV1({
      id: "pilot.state-profile",
      modules: [zeta, alpha],
    });
    const forwardKernel = kernelV1();
    const reverseKernel = kernelV1();
    const forwardSnapshot = await forwardKernel.mount(forwardProfile);
    const reverseSnapshot = await reverseKernel.mount(reverseProfile);

    expect(reverseSnapshot.bootDiagnostic.identity).toBe(
      forwardSnapshot.bootDiagnostic.identity,
    );
    expect(forwardSnapshot.bootDiagnostic.pluginOrder).toEqual([
      "pilot.alpha",
      "pilot.zeta",
    ]);

    const forward = compileStateModuleCompositionV1(forwardSnapshot, kit);
    const reverse = compileStateModuleCompositionV1(reverseSnapshot, kit);
    const expectedBindings = [
      { id: "pilot.alpha", contractRevision: 2 },
      { id: "pilot.zeta", contractRevision: 7 },
    ];
    expect(
      forward.modules.map(({ descriptor }) => ({
        id: descriptor.id,
        contractRevision: descriptor.contractRevision,
      })),
    ).toEqual(expectedBindings);
    expect(
      reverse.modules.map(({ descriptor }) => ({
        id: descriptor.id,
        contractRevision: descriptor.contractRevision,
      })),
    ).toEqual(expectedBindings);

    await expect(forwardKernel.reload(reverseProfile, () => undefined)).rejects.toMatchObject({
      code: "composition.authoritative_sealed",
    });
    await forwardKernel.dispose();
    expect(forward.modules.map(({ descriptor }) => descriptor.id)).toEqual([
      "pilot.alpha",
      "pilot.zeta",
    ]);
    expect(() => compileStateModuleCompositionV1(forwardSnapshot, kit)).toThrow(
      "is no longer mounted",
    );
  });

  it("activates a State application only after its direct plan compiles", async () => {
    interface PilotSessionV1 {
      readonly moduleIds: readonly string[];
    }
    const kit = createStateAuthoringKitV1<PilotTypesV1>();
    const alpha = definePilotModuleV1(
      kit,
      "pilot.alpha",
      2,
      "simulation.alpha",
    );
    const zeta = definePilotModuleV1(
      kit,
      "pilot.zeta",
      7,
      "simulation.zeta",
    );
    const factoryToken = createCompositionServiceTokenV1<
      LegacyApplicationFactoryV1<PilotSessionV1>
    >("pilot.session.factory");
    const events: string[] = [];
    let directPlan:
      | ReturnType<
        typeof compileStateModuleCompositionV1<PilotTypesV1>
      >
      | null = null;
    const compilingKit: StateAuthoringKitV1<PilotTypesV1> = Object.freeze({
      ...kit,
      composeModules<const TModules extends readonly StateAnyModuleV1[]>(
        modules: TModules,
      ): StateModuleCompositionV1<PilotTypesV1, TModules> {
        const composition = kit.composeModules(modules);
        directPlan = composition;
        events.push("state:compiled");
        return composition;
      },
    });
    const sessionPlugin = defineLegacyApplicationPluginV1({
      id: "pilot.session",
      revision: 1,
      factory: factoryToken,
      prepare() {
        events.push("session:prepare");
      },
      create() {
        if (directPlan === null) {
          throw new Error("State plan must compile before Session creation");
        }
        events.push("session:create");
        return Object.freeze({
          moduleIds: Object.freeze(
            directPlan.modules.map(({ descriptor }) => String(descriptor.id)),
          ),
        });
      },
      dispose() {
        events.push("session:dispose");
      },
    });
    const profile = defineStateCompositionProfileV1({
      id: "pilot.session-profile",
      modules: [zeta, alpha],
      plugins: [sessionPlugin],
    });
    const kernel = kernelV1();
    const snapshot = await kernel.mount(profile);
    expect(events).toEqual(["session:prepare"]);

    const activation = await activateStateApplicationV1(
      snapshot,
      compilingKit,
      factoryToken,
    );
    expect(activation.stateComposition).toBe(directPlan);
    expect(activation.lease.application.moduleIds).toEqual([
      "pilot.alpha",
      "pilot.zeta",
    ]);
    expect(events).toEqual([
      "session:prepare",
      "state:compiled",
      "session:create",
    ]);

    await kernel.dispose();
    expect(events.at(-1)).toBe("session:dispose");
    await activation.lease.dispose();
  });

  it("does not activate the legacy factory when State compilation fails", async () => {
    const kit = createStateAuthoringKitV1<PilotTypesV1>();
    const alpha = definePilotModuleV1(
      kit,
      "pilot.alpha",
      2,
      "simulation.alpha",
    );
    const factoryToken = createCompositionServiceTokenV1<
      LegacyApplicationFactoryV1<{ readonly created: true }>
    >("pilot.failed-session.factory");
    const sessionPlugin = defineLegacyApplicationPluginV1({
      id: "pilot.failed-session",
      revision: 1,
      factory: factoryToken,
      prepare() {},
      create() {
        return Object.freeze({ created: true as const });
      },
      dispose() {},
    });
    const snapshot = await kernelV1().mount(defineStateCompositionProfileV1({
      id: "pilot.failed-session-profile",
      modules: [alpha],
      plugins: [sessionPlugin],
    }));
    const failingKit: StateAuthoringKitV1<PilotTypesV1> = Object.freeze({
      ...kit,
      composeModules() {
        throw new Error("State compilation failed");
      },
    });

    await expect(
      activateStateApplicationV1(snapshot, failingKit, factoryToken),
    ).rejects.toThrow("State compilation failed");
    const inactiveFactory = snapshot.compileDirectPlan((resolver) => resolver.use(factoryToken));
    await expect(inactiveFactory.create()).rejects.toMatchObject({
      code: "composition.factory_inactive",
    });
  });
});

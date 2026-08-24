// SPDX-License-Identifier: MIT
import {
  type GameBootstrapInputV1,
  type GameSimulationTypeMapV1,
  type RngDrawTraceV1,
  type RngStateV1,
  type RuntimeSchemaV1,
} from "@sillymaker/base";
import { describe, expect, test } from "vitest";

import { createStateAuthoringKitV1 } from "./index.ts";
import { createLegacyGameplayModuleBindingsV1 } from "./legacy.ts";
import type { StateModuleCompositionV1 } from "./index.ts";

interface LegacyAdapterStateV1 {
  readonly simulation: {
    readonly alpha: { readonly value: number };
    readonly beta: { readonly value: number };
  };
}

interface LegacyAdapterTypesV1
  extends GameSimulationTypeMapV1<GameBootstrapInputV1, LegacyAdapterStateV1, RngStateV1> {
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly command: { readonly kind: "legacy.run" };
  readonly event: never;
  readonly rejection: never;
  readonly fault: never;
  readonly queries: { readValue(): number };
  readonly viewModel: { readonly value: number };
}

const sliceSchemaV1: RuntimeSchemaV1<{ readonly value: number }> = Object.freeze({
  parse(value: unknown) {
    if (value === null || typeof value !== "object") {
      throw new TypeError("invalid adapter State slice");
    }
    const parsed = Reflect.get(value, "value");
    if (!Number.isSafeInteger(parsed)) throw new TypeError("invalid adapter State value");
    return Object.freeze({ value: parsed as number });
  },
});

function createCompositionV1() {
  const kit = createStateAuthoringKitV1<LegacyAdapterTypesV1>();
  const alphaRead = kit.defineCapability<{ read(): number }>("adapter.alpha.read");
  const alpha = kit.defineModule({
    id: "adapter.alpha",
    contractRevision: 2,
    state: {
      slot: "simulation.alpha",
      schema: sliceSchemaV1,
      initial: () => Object.freeze({ value: 1 }),
    },
    provides: (provide) => [
      provide(alphaRead, ({ readOwnState }) => ({ read: () => readOwnState().value })),
    ],
    reducers: {},
  });
  const beta = kit.defineModule({
    id: "adapter.beta",
    contractRevision: 5,
    state: {
      slot: "simulation.beta",
      schema: sliceSchemaV1,
      initial: () => Object.freeze({ value: 2 }),
    },
    requires: { alpha: alphaRead },
    initializesAfter: ["adapter.alpha"],
    reducers: {},
  });
  return kit.composeModules([alpha, beta]);
}

describe("legacy State authoring adapter", () => {
  test("re-admits every binding in tuple order with the aggregate command Schema", () => {
    const composition = createCompositionV1();
    const commandSchema: RuntimeSchemaV1<LegacyAdapterTypesV1["command"]> = {
      parse(value: unknown) {
        if (
          value === null || typeof value !== "object" ||
          Reflect.get(value, "kind") !== "legacy.run"
        ) {
          throw new TypeError("invalid legacy command");
        }
        return Object.freeze({ kind: "legacy.run" as const });
      },
    };
    const originalCommandParse = commandSchema.parse;

    const bindings = createLegacyGameplayModuleBindingsV1(composition, commandSchema);

    expect(bindings.map(({ descriptor }) => descriptor.id)).toEqual([
      "adapter.alpha",
      "adapter.beta",
    ]);
    expect(bindings).toHaveLength(composition.modules.length);
    for (const [index, binding] of bindings.entries()) {
      const source = composition.modules[index]!;
      expect(binding.bindingKind).toBe("stateful");
      if (binding.bindingKind !== "stateful") throw new Error("expected stateful binding");
      expect(binding.descriptor).toEqual(source.descriptor);
      expect(binding.descriptor).not.toBe(source.descriptor);
      expect(binding.descriptor.stateSlots).not.toBe(source.descriptor.stateSlots);
      expect(binding.descriptor.dependencies).not.toBe(source.descriptor.dependencies);
      expect(binding.commandSchema).toBe(commandSchema);
      for (
        const key of [
          "querySchema",
          "queryResultSchema",
          "stateSchema",
          "reducers",
          "queries",
          "createInitialState",
          "createReadPort",
        ] as const
      ) {
        expect(binding[key]).toBe(Reflect.get(source, key));
      }
      expect(binding.localInvariants).toEqual(Reflect.get(source, "localInvariants"));
      expect(binding.localInvariants).not.toBe(Reflect.get(source, "localInvariants"));
    }
    expect(commandSchema.parse).toBe(originalCommandParse);
  });

  test("rejects incomplete neutral aliases and invalid aggregate command Schemas", () => {
    const composition = createCompositionV1();
    const incomplete = Object.freeze({
      ...composition,
      modules: Object.freeze([
        Object.freeze({ descriptor: composition.modules[0]!.descriptor }),
      ]),
    }) as unknown as StateModuleCompositionV1<
      LegacyAdapterTypesV1,
      readonly []
    >;
    const commandSchema: RuntimeSchemaV1<LegacyAdapterTypesV1["command"]> = Object.freeze({
      parse: () => Object.freeze({ kind: "legacy.run" as const }),
    });

    expect(() => createLegacyGameplayModuleBindingsV1(incomplete, commandSchema)).toThrow(
      "invalid GameplayModule bindingKind",
    );
    expect(() =>
      createLegacyGameplayModuleBindingsV1(
        composition,
        { parse: 1 } as unknown as RuntimeSchemaV1<LegacyAdapterTypesV1["command"]>,
      )
    ).toThrow("invalid GameplayModule command Schema parse");
  });
});

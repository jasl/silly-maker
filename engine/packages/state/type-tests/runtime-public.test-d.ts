// SPDX-License-Identifier: MIT
import type { NonNegativeSafeInteger, RunIntegrityV1, RuntimeSchemaV1 } from "@sillymaker/base";
import {
  createStateRuntimeV1,
  type StateRuntimeDefinitionV1,
  type StateRuntimeTypeMapV1,
  type StateRuntimeV1,
  type StateSessionV1,
  type StateSnapshotV1,
} from "@sillymaker/state";
import {
  createLegacyStateRuntimeAdapterV1,
  type LegacyStateRuntimeAdapterV1,
} from "@sillymaker/state/legacy";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

interface ConsumerStateV1 {
  readonly value: number;
}

interface ConsumerRngStateV1 {
  readonly cursor: number;
}

interface ConsumerTypesV1 extends StateRuntimeTypeMapV1<ConsumerStateV1, ConsumerRngStateV1> {
  readonly command: { readonly kind: "advance" };
  readonly fact: { readonly kind: "advanced" };
  readonly rejection: { readonly code: "blocked" };
  readonly fault: { readonly code: "failed" };
  readonly rngDrawTrace: never;
  readonly debugCommand: never;
  readonly debugValidationError: never;
  readonly executionContext: undefined;
}

type RootValueKeysV1 = ExpectV1<
  EqualV1<
    keyof typeof import("@sillymaker/state"),
    | "createStateAuthoringKitV1"
    | "createStateRuntimeV1"
    | "getStateModuleContractRevisionV1"
  >
>;
type RuntimeKeysV1 = ExpectV1<EqualV1<keyof StateRuntimeV1<ConsumerTypesV1>, "session">>;
type SessionKeysV1 = ExpectV1<
  EqualV1<
    keyof StateSessionV1<ConsumerTypesV1>,
    "dispatch" | "getCurrentSnapshot" | "getLastFaultCause" | "getStatus" | "subscribe"
  >
>;
type SnapshotKeysV1 = ExpectV1<
  EqualV1<
    keyof StateSnapshotV1<ConsumerStateV1, ConsumerRngStateV1>,
    "commandSequence" | "integrity" | "rng" | "state"
  >
>;

declare const commandSchemaV1: RuntimeSchemaV1<ConsumerTypesV1["command"]>;
declare const commandSequenceV1: NonNegativeSafeInteger;
declare const integrityV1: RunIntegrityV1;

const definitionV1: StateRuntimeDefinitionV1<ConsumerTypesV1> = {
  initialSnapshot: {
    state: { value: 0 },
    rng: { cursor: 0 },
    commandSequence: commandSequenceV1,
    integrity: integrityV1,
  },
  commandSchema: commandSchemaV1,
  executionContext: undefined,
  executeAttempt(snapshot) {
    return {
      result: { kind: "rejected", snapshot, reasons: [{ code: "blocked" }] },
      diagnostics: {
        committedRngBefore: snapshot.rng,
        attemptedDraws: [],
        committedRngAfter: snapshot.rng,
      },
    };
  },
  normalizeUnexpectedDispatchFault(_error, snapshot) {
    return {
      result: { kind: "faulted", snapshot, fault: { code: "failed" } },
      diagnostics: {
        committedRngBefore: snapshot.rng,
        attemptedDraws: [],
        committedRngAfter: snapshot.rng,
      },
    };
  },
};

const runtimeV1 = createStateRuntimeV1(definitionV1);
runtimeV1 satisfies StateRuntimeV1<ConsumerTypesV1>;
void runtimeV1.session.dispatch({ kind: "advance" });

const legacyV1 = createLegacyStateRuntimeAdapterV1(definitionV1);
legacyV1 satisfies LegacyStateRuntimeAdapterV1<ConsumerTypesV1>;
legacyV1.runtime.session satisfies StateSessionV1<ConsumerTypesV1>;
legacyV1.composition.session satisfies typeof legacyV1.runtime.session;
legacyV1.runtimeControl satisfies typeof legacyV1.composition.runtimeControl;

// @ts-expect-error legacy runtime names are not exported by the neutral root
import type { GameSessionV1 } from "@sillymaker/state";
// @ts-expect-error Cordis types are not exported by the neutral root
import type { Context } from "@sillymaker/state";

type _NoLegacyRuntimeNameV1 = GameSessionV1;
type _NoCordisContextV1 = Context;
void (0 as unknown as RootValueKeysV1);
void (0 as unknown as RuntimeKeysV1);
void (0 as unknown as SessionKeysV1);
void (0 as unknown as SnapshotKeysV1);
void (0 as unknown as _NoLegacyRuntimeNameV1);
void (0 as unknown as _NoCordisContextV1);

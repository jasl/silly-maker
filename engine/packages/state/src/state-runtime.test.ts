// SPDX-License-Identifier: MIT
import {
  createPristineRunIntegrityV1,
  parseNonNegativeSafeInteger,
  type DeepReadonly,
  type RuntimeSchemaV1,
} from "@sillymaker/base";
import { describe, expect, test } from "vitest";

import { createStateRuntimeV1 } from "./index.ts";
import { createLegacyStateRuntimeAdapterV1 } from "./legacy.ts";
import type {
  StateCommandAttemptV1,
  StateFinalizedCommandAttemptV1,
  StateRuntimeDefinitionV1,
  StateRuntimeTypeMapV1,
  StateSnapshotV1,
} from "./state-runtime.ts";

interface CounterStateV1 {
  readonly value: number;
}

interface CounterRngStateV1 {
  readonly cursor: number;
}

interface CounterSnapshotV1 extends StateSnapshotV1<CounterStateV1, CounterRngStateV1> {}

type CounterCommandV1 =
  | { readonly kind: "increment"; readonly amount: number }
  | { readonly kind: "reject" }
  | { readonly kind: "fault" }
  | { readonly kind: "throw" };

interface CounterEventV1 {
  readonly kind: "incremented";
  readonly value: number;
}

interface CounterRejectionV1 {
  readonly code: "blocked";
}

interface CounterFaultV1 {
  readonly code: "expected" | "unexpected";
}

interface CounterTypesV1 extends StateRuntimeTypeMapV1<CounterStateV1, CounterRngStateV1> {
  readonly snapshot: CounterSnapshotV1;
  readonly rngDrawTrace: never;
  readonly command: CounterCommandV1;
  readonly event: CounterEventV1;
  readonly rejection: CounterRejectionV1;
  readonly fault: CounterFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: never;
  readonly executionContext: { readonly source: "state-test" };
}

const commandSchemaV1: RuntimeSchemaV1<CounterCommandV1> = Object.freeze({
  parse(value: unknown): CounterCommandV1 {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid counter command");
    }
    const command = value as Readonly<Record<string, unknown>>;
    if (command.kind === "increment" && typeof command.amount === "number") {
      return { kind: "increment", amount: command.amount };
    }
    if (command.kind === "reject" || command.kind === "fault" || command.kind === "throw") {
      return { kind: command.kind };
    }
    throw new TypeError("invalid counter command");
  },
});

function createInitialSnapshotV1(): CounterSnapshotV1 {
  return {
    state: { value: 1 },
    rng: { cursor: 0 },
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  };
}

function diagnosticsV1(snapshot: DeepReadonly<CounterSnapshotV1>) {
  return {
    committedRngBefore: snapshot.rng,
    attemptedDraws: [],
    candidateRngAfter: snapshot.rng,
    committedRngAfter: snapshot.rng,
  } as const;
}

function faultAttemptV1(
  snapshot: DeepReadonly<CounterSnapshotV1>,
  code: CounterFaultV1["code"],
): StateCommandAttemptV1<CounterTypesV1> {
  return {
    result: { kind: "faulted", snapshot, fault: { code } },
    diagnostics: diagnosticsV1(snapshot),
  };
}

function createDefinitionV1(
  attempts: StateFinalizedCommandAttemptV1<CounterTypesV1>[] = [],
): StateRuntimeDefinitionV1<CounterTypesV1> {
  return {
    initialSnapshot: createInitialSnapshotV1(),
    commandSchema: commandSchemaV1,
    executionContext: { source: "state-test" },
    executeAttempt(snapshot, command) {
      if (command.kind === "throw") throw new Error("synthetic executor failure");
      if (command.kind === "reject") {
        return {
          result: { kind: "rejected", snapshot, reasons: [{ code: "blocked" }] },
          diagnostics: diagnosticsV1(snapshot),
        };
      }
      if (command.kind === "fault") return faultAttemptV1(snapshot, "expected");
      const next: CounterSnapshotV1 = {
        state: { value: snapshot.state.value + command.amount },
        rng: snapshot.rng,
        commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
        integrity: snapshot.integrity,
      };
      return {
        result: {
          kind: "committed",
          snapshot: next,
          events: [{ kind: "incremented", value: next.state.value }],
        },
        diagnostics: diagnosticsV1(snapshot),
      };
    },
    normalizeUnexpectedDispatchFault(_error, snapshot) {
      return faultAttemptV1(snapshot, "unexpected");
    },
    onAttempt(attempt) {
      attempts.push(attempt);
    },
  };
}

describe("State Runtime compatibility facade", () => {
  test("exposes the original session and runtime control through the legacy adapter", async () => {
    const attempts: StateFinalizedCommandAttemptV1<CounterTypesV1>[] = [];
    const adapter = createLegacyStateRuntimeAdapterV1(createDefinitionV1(attempts));

    expect(adapter.runtime.session).toBe(adapter.composition.session);
    expect(adapter.runtimeControl).toBe(adapter.composition.runtimeControl);
    expect(adapter.runtimeControl.inspectForRuntime().snapshot).toBe(
      adapter.runtime.session.getCurrentSnapshot(),
    );

    const committed = await adapter.runtime.session.dispatch({ kind: "increment", amount: 2 });
    expect(committed.kind).toBe("executed");
    if (committed.kind !== "executed") throw new Error("expected committed execution");
    expect(committed.execution).toBe(attempts[0]?.result);
    expect(committed.execution).toMatchObject({
      kind: "committed",
      snapshot: { state: { value: 3 }, commandSequence: 1 },
      events: [{ kind: "incremented", value: 3 }],
    });
    expect(adapter.runtimeControl.inspectForRuntime().snapshot).toBe(
      adapter.runtime.session.getCurrentSnapshot(),
    );

    const current = adapter.runtime.session.getCurrentSnapshot();
    const rejected = await adapter.runtime.session.dispatch({ kind: "reject" });
    expect(rejected.kind).toBe("executed");
    if (rejected.kind !== "executed") throw new Error("expected rejected execution");
    expect(rejected.execution).toBe(attempts[1]?.result);
    expect(rejected.execution).toEqual({
      kind: "rejected",
      snapshot: current,
      reasons: [{ code: "blocked" }],
    });
    expect(adapter.runtime.session.getCurrentSnapshot()).toBe(current);

    const faulted = await adapter.runtime.session.dispatch({ kind: "fault" });
    expect(faulted.kind).toBe("executed");
    if (faulted.kind !== "executed") throw new Error("expected faulted execution");
    expect(faulted.execution).toBe(attempts[2]?.result);
    expect(faulted.execution).toEqual({
      kind: "faulted",
      snapshot: current,
      fault: { code: "expected" },
    });
    expect(adapter.runtime.session.getStatus()).toBe("fault_paused");
    const entries = adapter.composition.commandLog.entries();
    expect(entries).toHaveLength(3);
    expect(entries[0]?.preStateDigest).toBe(attempts[0]?.preStateDigest);
    expect(entries[0]?.postStateDigest).toBe(attempts[0]?.postStateDigest);
    expect(attempts[1]?.postStateDigest).toBe(attempts[1]?.preStateDigest);
    expect(attempts[2]?.postStateDigest).toBe(attempts[2]?.preStateDigest);
  });

  test("keeps the neutral root to one session reference and preserves fault normalization", async () => {
    const attempts: StateFinalizedCommandAttemptV1<CounterTypesV1>[] = [];
    const runtime = createStateRuntimeV1(createDefinitionV1(attempts));

    expect(Object.keys(runtime)).toEqual(["session"]);
    expect(runtime.session.getStatus()).toBe("ready");

    const before = runtime.session.getCurrentSnapshot();
    const result = await runtime.session.dispatch({ kind: "throw" });
    expect(result.kind).toBe("executed");
    if (result.kind !== "executed") throw new Error("expected normalized execution");
    expect(result.execution).toBe(attempts[0]?.result);
    expect(result.execution).toEqual({
      kind: "faulted",
      snapshot: before,
      fault: { code: "unexpected" },
    });
    expect(runtime.session.getCurrentSnapshot()).toBe(before);
    expect(runtime.session.getStatus()).toBe("fault_paused");
    expect(runtime.session.getLastFaultCause()?.message).toContain("synthetic executor failure");
  });

  test("forwards optional availability and HMR reporting through the explicit Base input", async () => {
    let invalidationReports = 0;
    const adapter = createLegacyStateRuntimeAdapterV1({
      ...createDefinitionV1(),
      available: false,
      onHmrInvalidated() {
        invalidationReports += 1;
      },
    });

    await expect(adapter.runtime.session.dispatch({ kind: "increment", amount: 1 })).resolves
      .toEqual({ kind: "not_executed", code: "session_unavailable" });
    adapter.composition.invalidationController.invalidateForHmr();
    adapter.composition.invalidationController.invalidateForHmr();

    expect(adapter.runtime.session.getStatus()).toBe("hmr_invalidated");
    expect(invalidationReports).toBe(1);
  });

  test("installs persistence-style replacements through the exact runtime control and replay anchor", async () => {
    const adapter = createLegacyStateRuntimeAdapterV1(createDefinitionV1());
    await adapter.runtime.session.dispatch({ kind: "increment", amount: 2 });
    expect(adapter.composition.commandLog.entries()).toHaveLength(1);

    const current = adapter.runtime.session.getCurrentSnapshot();
    const replacement: CounterSnapshotV1 = {
      state: { value: 40 },
      rng: current.rng,
      commandSequence: parseNonNegativeSafeInteger(8),
      integrity: current.integrity,
    };
    const result = await adapter.runtimeControl.enqueueAuthoritative(
      async () => ({
        kind: "replace" as const,
        snapshot: replacement,
        result: "replaced" as const,
        anchor: "replace_replay_base" as const,
      }),
      () => "faulted" as const,
    );

    expect(result).toBe("replaced");
    expect(adapter.runtime.session.getCurrentSnapshot()).toBe(replacement);
    expect(adapter.runtimeControl.inspectForRuntime().snapshot).toBe(replacement);
    expect(adapter.composition.commandLog.replayBase()).toBe(replacement);
    expect(adapter.composition.commandLog.entries()).toEqual([]);

    const committed = await adapter.runtime.session.dispatch({ kind: "increment", amount: 2 });
    expect(committed).toMatchObject({
      kind: "executed",
      execution: {
        kind: "committed",
        snapshot: { state: { value: 42 }, commandSequence: 9 },
      },
    });
    expect(adapter.composition.commandLog.entries()[0]?.preStateDigest).toBe(
      adapter.composition.commandLog.replayBaseStateDigest(),
    );
  });
});

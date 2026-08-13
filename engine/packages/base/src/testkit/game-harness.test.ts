// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  engineDebugPatchErrorCodeV1,
  engineDebugPatchStateKindV1,
} from "../runtime/diagnostics/state-patch.ts";
import type { GameHarnessSemanticAdapterV1 } from "./game-harness.ts";
import { createGameHarnessV1 } from "./game-harness.ts";
import type { SyntheticCounterCommandV1, SyntheticSimulationTypesV1 } from "./synthetic-counter.ts";
import { createSyntheticCounterGamePackageV1 } from "./synthetic-counter.ts";

interface SyntheticQueriesV1 {
  readonly count: number;
  readonly parity: "even" | "odd";
}

interface SyntheticInvocationV1 {
  readonly kind: "invoke";
  readonly actionId: SyntheticCounterCommandV1["kind"];
}

type SyntheticResultV1 =
  | { readonly kind: "committed"; readonly count: number }
  | { readonly kind: "rejected" }
  | { readonly kind: "faulted" }
  | { readonly kind: "not_executed"; readonly code: string };

const syntheticActionIdsV1 = Object.freeze(
  [
    "synthetic.increment",
    "synthetic.reject",
    "synthetic.fault",
  ] as const,
);

const syntheticAdapterV1 = {
  createQueries: (state: {
    readonly simulation: { readonly counter: { readonly count: number } };
  }) =>
    Object.freeze({
      count: state.simulation.counter.count,
      parity: state.simulation.counter.count % 2 === 0 ? ("even" as const) : ("odd" as const),
    }),
  projectGameView: (queries: SyntheticQueriesV1) => queries,
  projectNarrativeView: () => null,
  actions: (queries: SyntheticQueriesV1) =>
    Object.freeze(
      syntheticActionIdsV1.map((actionId) =>
        Object.freeze({ actionId, countBefore: queries.count })
      ),
    ),
  preview: (queries: SyntheticQueriesV1) => Object.freeze({ countBefore: queries.count }),
  parseInvocation(value: unknown): SyntheticInvocationV1 {
    const actionId = (value as { readonly actionId?: unknown } | null)?.actionId;
    if (!syntheticActionIdsV1.includes(actionId as (typeof syntheticActionIdsV1)[number])) {
      throw new TypeError("invalid synthetic invocation");
    }
    return Object.freeze({
      kind: "invoke",
      actionId: actionId as SyntheticCounterCommandV1["kind"],
    });
  },
  commandForInvocation: (invocation: SyntheticInvocationV1) =>
    Object.freeze({ kind: invocation.actionId }),
  projectDispatchResult(result: {
    readonly kind: string;
    readonly code?: string;
    readonly execution?: {
      readonly kind: string;
      readonly snapshot?: { readonly state?: unknown };
      readonly facts?: readonly { readonly count: number }[];
    };
  }): SyntheticResultV1 {
    if (result.kind !== "executed" || result.execution === undefined) {
      return Object.freeze({
        kind: "not_executed" as const,
        code: result.code ?? "unknown",
      });
    }
    if (result.execution.kind === "committed") {
      return Object.freeze({
        kind: "committed" as const,
        count: result.execution.facts?.[0]?.count ?? 0,
      });
    }
    return result.execution.kind === "rejected"
      ? Object.freeze({ kind: "rejected" as const })
      : Object.freeze({ kind: "faulted" as const });
  },
  invalidInvocationResult: () =>
    Object.freeze({ kind: "not_executed" as const, code: "validation_failed" as const }),
};

function createSyntheticHarnessV1(
  options: { readonly debugTools?: boolean; readonly seed?: number } = {},
) {
  return createGameHarnessV1({
    entry: createSyntheticCounterGamePackageV1(),
    semantic: syntheticAdapterV1 as unknown as GameHarnessSemanticAdapterV1<
      SyntheticSimulationTypesV1,
      SyntheticQueriesV1,
      SyntheticQueriesV1,
      null,
      { readonly actionId: string; readonly countBefore: number },
      SyntheticInvocationV1,
      { readonly countBefore: number },
      SyntheticResultV1
    >,
    ...(options.seed === undefined ? {} : { seed: options.seed }),
    ...(options.debugTools === undefined
      ? {}
      : { capabilities: { debugTools: options.debugTools } }),
  });
}

const incrementV1 = Object.freeze({ kind: "invoke" as const, actionId: "synthetic.increment" });

describe("createGameHarnessV1", () => {
  it("drives the synthetic story end to end without any story-private setup", async () => {
    const harness = await createSyntheticHarnessV1();

    expect(harness.observe().game.count).toBe(0);
    await expect(harness.dispatch(incrementV1)).resolves.toEqual({
      kind: "committed",
      count: 1,
    });
    expect(harness.observe().game).toEqual({ count: 1, parity: "odd" });
    expect(harness.trace()).toEqual([
      expect.objectContaining({ ordinal: 1, outcome: "committed" }),
    ]);
    await harness.dispose();
  });

  it("returns identical digests and traces for two harnesses with the same seed", async () => {
    const results: string[] = [];
    for (let run = 0; run < 2; run += 1) {
      const harness = await createSyntheticHarnessV1({ seed: 77 });
      await harness.dispatch(incrementV1);
      await harness.dispatch(incrementV1);
      results.push(harness.stateDigest() + JSON.stringify(harness.trace()));
      await harness.dispose();
    }
    expect(results[0]).toBe(results[1]);
  });

  it("rejects invalid invocations with a structured result instead of throwing", async () => {
    const harness = await createSyntheticHarnessV1();
    await expect(harness.dispatch({ actionId: "synthetic.unknown" } as never)).resolves.toEqual({
      kind: "not_executed",
      code: "validation_failed",
    });
    await harness.dispose();
  });

  it("keeps the normal surface free of raw snapshots and state setters", async () => {
    const harness = await createSyntheticHarnessV1();
    const committed = await harness.dispatch(incrementV1);
    expect(JSON.stringify(committed)).not.toContain("snapshot");
    expect(JSON.stringify(harness.observe())).not.toContain("rng");
    expect("dispatchDebug" in harness.semantic).toBe(false);
    expect(harness.admin.debugControl).toBeUndefined();

    const inspected = harness.admin.inspectForTest();
    expect(inspected.snapshot.commandSequence).toBe(1);
    await harness.dispose();
  });

  it("exposes debug control only when the capability is enabled", async () => {
    const withDebug = await createSyntheticHarnessV1({ debugTools: true });
    expect(withDebug.admin.debugControl).toBeDefined();
    await withDebug.dispose();
  });

  it("gives structured outcomes for every operation after disposal", async () => {
    const harness = await createSyntheticHarnessV1();
    await harness.dispatch(incrementV1);
    await expect(harness.dispose()).resolves.toEqual({ kind: "disposed" });

    await expect(harness.dispatch(incrementV1)).resolves.toEqual({ kind: "harness_disposed" });
    await expect(harness.preview(incrementV1)).resolves.toEqual({ kind: "harness_disposed" });
    await expect(harness.waitForIdle()).resolves.toEqual({ kind: "harness_disposed" });
    await expect(harness.saves.save("quick")).resolves.toEqual({
      kind: "faulted",
      code: "runtime_disposed",
    });
    await expect(harness.dispose()).resolves.toEqual({ kind: "disposed" });
  });

  it("round-trips saves through the harness persistence port", async () => {
    const harness = await createSyntheticHarnessV1();
    await harness.dispatch(incrementV1);
    const saved = harness.stateDigest();
    await expect(harness.saves.save("manual.1")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.1",
    });
    await harness.dispatch(incrementV1);
    await expect(harness.saves.load("manual.1")).resolves.toMatchObject({ kind: "loaded" });
    expect(harness.stateDigest()).toBe(saved);
    await harness.dispose();
  });

  it("applies the engine state patch through debugControl and replays it", async () => {
    const harness = await createSyntheticHarnessV1({ debugTools: true });
    const patch = Object.freeze({
      kind: engineDebugPatchStateKindV1,
      path: Object.freeze(["simulation", "counter", "count"]),
      value: 7,
    });
    const result = await harness.admin.debugControl!.execute(patch as never, () => true);
    expect(result.kind).toBe("executed");
    expect(harness.observe().game).toEqual({ count: 7, parity: "odd" });
    expect(harness.admin.commandLog().at(-1)).toMatchObject({
      source: "debug",
      command: patch,
    });
    const replay = await harness.admin.replayAuthoritatively();
    expect(replay).toMatchObject({ authoritative: true, matches: true });
    await harness.dispose();
  });

  it("rejects an invalid engine state patch without pausing the session", async () => {
    const harness = await createSyntheticHarnessV1({ debugTools: true });
    const result = await harness.admin.debugControl!.execute(
      Object.freeze({
        kind: engineDebugPatchStateKindV1,
        path: Object.freeze(["simulation", "counter", "count"]),
        value: -1,
      }) as never,
      () => true,
    );
    expect(result).toMatchObject({
      kind: "validation_failed",
      errors: [{ code: engineDebugPatchErrorCodeV1 }],
    });
    expect(harness.observe().game.count).toBe(0);
    expect(harness.admin.inspectForTest().snapshot.commandSequence).toBe(0);
    await harness.dispose();
  });
});

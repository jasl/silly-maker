// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "../../contracts/canonical-json.ts";
import { commitAttemptV1 } from "../../contracts/execution.ts";
import type { HostAtomicRecordStoreV1, IsoUtcInstant } from "../../contracts/host.ts";
import { createMemoryHostRecordStoreV1 } from "../../contracts/host.ts";
import type { SessionLeaseOwnerId } from "../../contracts/application.ts";
import { createTransactionalRngV1 } from "../../contracts/rng.ts";
import { parseNonNegativeSafeInteger } from "../../contracts/values.ts";
import { createFixedBootstrapEntropyV1 } from "../../testkit/fixed-bootstrap-entropy.ts";
import { deterministicBuildIdentityInputV1 } from "../../testkit/resolver-fixtures.ts";
import type {
  SyntheticCounterCommandV1,
  SyntheticSimulationTypesV1,
} from "../../testkit/synthetic-counter.ts";
import { createSyntheticCounterGamePackageV1 } from "../../testkit/synthetic-counter.ts";
import type {
  CoreApplicationHostServicesV1,
  CoreAutosavePolicyV1,
  CoreSchedulerV1,
  CoreSemanticAdapterV1,
} from "./core-game-application.ts";
import {
  createCoreGameApplicationInstanceV1,
  defineCoreGameApplicationV1,
  resolveCoreGameApplicationV1,
} from "./core-game-application.ts";

interface SyntheticQueriesV1 {
  readonly count: number;
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

interface DebugCounterCommandV1 {
  readonly kind: "debug.synthetic.add";
  readonly amount: number;
}

type DebugSyntheticSimulationTypesV1 = Omit<SyntheticSimulationTypesV1, "debugCommand"> & {
  readonly debugCommand: DebugCounterCommandV1;
};

const syntheticActionIdsV1 = Object.freeze([
  "synthetic.increment",
  "synthetic.reject",
  "synthetic.fault",
] as const);

const adapterV1 = {
  createQueries: (state: {
    readonly simulation: { readonly counter: { readonly count: number } };
  }) => Object.freeze({ count: state.simulation.counter.count }),
  projectGameView: (queries: SyntheticQueriesV1) => queries,
  projectNarrativeView: () => null,
  actions: (queries: SyntheticQueriesV1) =>
    Object.freeze(
      syntheticActionIdsV1.map((actionId) => Object.freeze({ actionId, count: queries.count })),
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

const definitionV1 = defineCoreGameApplicationV1({
  entry: createSyntheticCounterGamePackageV1(),
  semantic: adapterV1 as unknown as CoreSemanticAdapterV1<
    SyntheticSimulationTypesV1,
    SyntheticQueriesV1,
    SyntheticQueriesV1,
    null,
    { readonly actionId: string; readonly count: number },
    SyntheticInvocationV1,
    { readonly countBefore: number },
    SyntheticResultV1
  >,
});

function debugDefinitionFixtureV1() {
  const baseEntry = createSyntheticCounterGamePackageV1();
  let debugExecuteCalls = 0;
  const debugCommandSchemaV1 = Object.freeze({
    parse(value: unknown): DebugCounterCommandV1 {
      if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.keys(value).sort().join("\0") !== "amount\0kind" ||
        Reflect.get(value, "kind") !== "debug.synthetic.add"
      ) {
        throw new TypeError("invalid synthetic debug command");
      }
      return Object.freeze({
        kind: "debug.synthetic.add" as const,
        amount: parseNonNegativeSafeInteger(Reflect.get(value, "amount")),
      });
    },
  });
  const story = baseEntry.define();
  const simulation = story.simulation;
  const debugStory = Object.freeze({
    ...story,
    simulation: Object.freeze({
      ...simulation,
      createGameSimulation(program: Parameters<typeof simulation.createGameSimulation>[0]) {
        const gameSimulation = simulation.createGameSimulation(program);
        return Object.freeze({
          ...gameSimulation,
          debugCommandSchema: debugCommandSchemaV1,
          debugCommandExecutor: Object.freeze({
            validate() {
              return Object.freeze({ kind: "allowed" as const });
            },
            executeAttempt(
              snapshot: SyntheticSimulationTypesV1["snapshot"],
              command: DebugCounterCommandV1,
            ) {
              debugExecuteCalls += 1;
              const rng = createTransactionalRngV1(snapshot.rng);
              const count = parseNonNegativeSafeInteger(
                snapshot.state.simulation.counter.count + command.amount,
              );
              const next = Object.freeze({
                state: Object.freeze({
                  simulation: Object.freeze({
                    counter: Object.freeze({ count }),
                  }),
                }),
                rng: rng.candidateState(),
                commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
                integrity: snapshot.integrity,
              });
              return commitAttemptV1(snapshot, next, rng, [
                Object.freeze({
                  kind: "synthetic.incremented" as const,
                  count,
                }),
              ]);
            },
          }),
        });
      },
    }),
  });
  const entry = Object.freeze({
    ...baseEntry,
    define: () => debugStory,
  });
  const definition = defineCoreGameApplicationV1({
    entry,
    semantic: adapterV1 as unknown as CoreSemanticAdapterV1<
      DebugSyntheticSimulationTypesV1,
      SyntheticQueriesV1,
      SyntheticQueriesV1,
      null,
      { readonly actionId: string; readonly count: number },
      SyntheticInvocationV1,
      { readonly countBefore: number },
      SyntheticResultV1
    >,
  });
  return Object.freeze({
    definition,
    debugExecuteCalls: () => debugExecuteCalls,
  });
}

function resolvedApplicationV1() {
  const result = resolveCoreGameApplicationV1(definitionV1, {
    buildIdentityInput: deterministicBuildIdentityInputV1,
  });
  if (result.kind !== "resolved") throw new Error("synthetic story must resolve");
  return result.application;
}

const resumingDefinitionV1 = defineCoreGameApplicationV1({
  ...definitionV1,
  resumeFromAutosave: true,
});

function resolvedResumingApplicationV1() {
  const result = resolveCoreGameApplicationV1(resumingDefinitionV1, {
    buildIdentityInput: deterministicBuildIdentityInputV1,
  });
  if (result.kind !== "resolved") throw new Error("synthetic story must resolve");
  return result.application;
}

const ownerIdV1 = "owner.sillymaker.test.core-application" as SessionLeaseOwnerId;
const instantV1 = "2026-07-20T00:00:00.000Z" as IsoUtcInstant;

function hostServicesV1(
  records: HostAtomicRecordStoreV1,
  seeds: readonly number[] = [77],
): CoreApplicationHostServicesV1 {
  return Object.freeze({
    entropy: createFixedBootstrapEntropyV1({
      uuids: seeds.map((seed) => `9e2f1a34-6d2b-4c33-8a41-5a3f6c1b2d${String((seed % 90) + 10)}`),
      seeds,
    }),
    records,
    now: () => instantV1,
    ownerId: ownerIdV1,
    nextHandoffRequestId: () => "handoff.sillymaker.test.core-application",
  });
}

function countingRecordsV1() {
  const store = createMemoryHostRecordStoreV1();
  const writes: string[] = [];
  const spy: HostAtomicRecordStoreV1 = {
    read: (namespace, key) => store.read(namespace, key),
    list: (namespace) => store.list(namespace),
    commit: (mutations) => {
      for (const mutation of mutations) {
        if (mutation.kind === "put") writes.push(mutation.key);
      }
      return store.commit(mutations);
    },
  };
  return {
    counting: Object.freeze(spy),
    writes,
    autoWrites: () => writes.filter((key) => key.includes(":auto.current")),
  };
}

function manualSchedulerV1() {
  const scheduled: { callback: () => void; delayMs: number; cancelled: boolean }[] = [];
  const scheduler: CoreSchedulerV1 = Object.freeze({
    schedule(callback: () => void, delayMs: number) {
      const entry = { callback, delayMs, cancelled: false };
      scheduled.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
  });
  const runLast = () => {
    const entry = scheduled.at(-1);
    if (entry === undefined || entry.cancelled) throw new Error("no scheduled autosave flush");
    entry.callback();
  };
  return { scheduler, scheduled, runLast };
}

async function createInstanceV1(options?: {
  records?: HostAtomicRecordStoreV1;
  autosave?: CoreAutosavePolicyV1;
  scheduler?: CoreSchedulerV1;
  seeds?: readonly number[];
}) {
  return createCoreGameApplicationInstanceV1(resolvedApplicationV1(), {
    host: hostServicesV1(options?.records ?? createMemoryHostRecordStoreV1(), options?.seeds),
    ...(options?.autosave === undefined ? {} : { autosave: options.autosave }),
    ...(options?.scheduler === undefined ? {} : { scheduler: options.scheduler }),
  });
}

const incrementV1 = Object.freeze({ kind: "invoke" as const, actionId: "synthetic.increment" });

describe("resolveCoreGameApplicationV1", () => {
  it("reports resolution failures structurally instead of throwing", () => {
    const broken = defineCoreGameApplicationV1({
      ...definitionV1,
      entry: Object.freeze({
        ...createSyntheticCounterGamePackageV1(),
        define: () => {
          throw new TypeError("synthetic definition exploded");
        },
      }),
    });
    const result = resolveCoreGameApplicationV1(broken);
    expect(result.kind).toBe("failed");
    if (result.kind === "failed") expect(result.failure.code.length).toBeGreaterThan(0);
  });
});

describe("createCoreGameApplicationInstanceV1", () => {
  it("plays, saves, and restores through the composed surfaces", async () => {
    const instance = await createInstanceV1();
    await expect(instance.semantic.dispatch(incrementV1)).resolves.toEqual({
      kind: "committed",
      count: 1,
    });
    const digest = instance.admin.stateDigest();
    await expect(instance.persistence.save("manual.1")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.1",
    });
    await instance.semantic.dispatch(incrementV1);
    await expect(instance.persistence.load("manual.1")).resolves.toMatchObject({ kind: "loaded" });
    expect(instance.admin.stateDigest()).toBe(digest);
    await instance.dispose();
  });

  it("replays the Core command log authoritatively through isolated attempts", async () => {
    const instance = await createInstanceV1();
    await instance.semantic.dispatch(incrementV1);
    await instance.semantic.dispatch(
      Object.freeze({ kind: "invoke" as const, actionId: "synthetic.reject" as const }),
    );
    await instance.semantic.dispatch(incrementV1);

    const snapshotBefore = instance.admin.inspectForTest().snapshot;
    const digestBefore = instance.admin.stateDigest();
    const commandLogBytesBefore = canonicalJsonBytes(instance.admin.commandLog());
    const statusBefore = instance.semantic.observe().status;
    await expect(instance.admin.replayAuthoritatively()).resolves.toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: false,
      matches: true,
      executedEntries: 3,
      mismatches: [],
    });
    expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
    expect(instance.admin.stateDigest()).toBe(digestBefore);
    expect(canonicalJsonBytes(instance.admin.commandLog())).toEqual(commandLogBytesBefore);
    expect(instance.semantic.observe().status).toBe(statusBefore);
    expect(instance.semantic.observe().game).toEqual({ count: 2 });
    await instance.dispose();
  });

  it("replays a debug-sourced Core entry with identical modified integrity in isolation", async () => {
    const fixture = debugDefinitionFixtureV1();
    const resolved = resolveCoreGameApplicationV1(fixture.definition, {
      buildIdentityInput: deterministicBuildIdentityInputV1,
    });
    if (resolved.kind !== "resolved") {
      throw new TypeError(
        `debug synthetic story must resolve: ${JSON.stringify(resolved.failure)}`,
      );
    }
    const instance = await createCoreGameApplicationInstanceV1(resolved.application, {
      host: hostServicesV1(createMemoryHostRecordStoreV1()),
      capabilities: { debugTools: true },
    });
    const debugControl = instance.admin.debugControl;
    if (debugControl === undefined) throw new TypeError("debug control must be enabled");

    await expect(
      debugControl.execute(Object.freeze({ kind: "debug.synthetic.add", amount: 5 }), () => true),
    ).resolves.toMatchObject({
      kind: "executed",
      attempt: { result: { kind: "committed" } },
    });
    expect(fixture.debugExecuteCalls()).toBe(1);
    expect(instance.admin.commandLog()).toMatchObject([
      {
        source: "debug",
        command: { kind: "debug.synthetic.add", amount: 5 },
        outcome: { kind: "committed" },
      },
    ]);

    const snapshotBefore = instance.admin.inspectForTest().snapshot;
    expect(snapshotBefore.state.simulation.counter.count).toBe(5);
    expect(snapshotBefore.integrity).toEqual({
      mode: "modified",
      mutationCount: 1,
      firstMutationSequence: 1,
      reasons: [
        {
          kind: "debug_command",
          commandKind: "debug.synthetic.add",
          sequence: 1,
        },
      ],
    });
    const digestBefore = instance.admin.stateDigest();
    const commandLogBytesBefore = canonicalJsonBytes(instance.admin.commandLog());
    const statusBefore = instance.semantic.observe().status;

    await expect(instance.admin.replayAuthoritatively()).resolves.toEqual({
      authoritative: true,
      identityMatch: true,
      visualMatch: false,
      matches: true,
      executedEntries: 1,
      mismatches: [],
    });
    expect(fixture.debugExecuteCalls()).toBe(2);
    expect(instance.admin.inspectForTest().snapshot).toBe(snapshotBefore);
    expect(instance.admin.stateDigest()).toBe(digestBefore);
    expect(canonicalJsonBytes(instance.admin.commandLog())).toEqual(commandLogBytesBefore);
    expect(instance.semantic.observe().status).toBe(statusBefore);
    await instance.dispose();
  });

  it("leaves no active owner behind after a failed construction", async () => {
    const { counting, writes } = countingRecordsV1();
    const throwingHost: CoreApplicationHostServicesV1 = Object.freeze({
      ...hostServicesV1(counting),
      entropy: Object.freeze({
        nextUuidV4: (): string => {
          throw new RangeError("entropy unavailable");
        },
        nextNonZeroUint32: (): never => {
          throw new RangeError("entropy unavailable");
        },
      }),
    });
    await expect(
      createCoreGameApplicationInstanceV1(resolvedApplicationV1(), { host: throwingHost }),
    ).rejects.toThrow("entropy unavailable");
    expect(writes).toEqual([]);

    // The same records store afterwards supports a fully writable instance.
    const healthy = await createInstanceV1({ records: counting });
    await expect(healthy.persistence.save("manual.1")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.1",
    });
    await healthy.dispose();
  });

  it("advances the presentation epoch on load/import/restart but never on dispatch", async () => {
    const instance = await createInstanceV1({ seeds: [77, 78] });
    expect(instance.presentationAnchor()).toEqual({ epoch: 0, origin: "bootstrap" });

    const anchors: unknown[] = [];
    const unsubscribe = instance.subscribePresentationAnchor((anchor) => anchors.push(anchor));

    await instance.semantic.dispatch(incrementV1);
    expect(instance.presentationAnchor().epoch).toBe(0);

    const staleGuard = instance.bindToCurrentEpoch((value: number) => value * 2);
    expect(staleGuard(21)).toEqual({ kind: "current", value: 42 });

    await instance.persistence.save("manual.1");
    await instance.semantic.dispatch(incrementV1);
    await expect(instance.persistence.load("manual.1")).resolves.toMatchObject({ kind: "loaded" });
    expect(instance.presentationAnchor()).toEqual({ epoch: 1, origin: "load" });
    expect(staleGuard(21)).toEqual({ kind: "stale_epoch" });
    expect(anchors).toEqual([{ epoch: 1, origin: "load" }]);

    // A failed load leaves state and epoch untouched.
    await expect(instance.persistence.load("quick")).resolves.toMatchObject({ kind: "rejected" });
    expect(instance.presentationAnchor().epoch).toBe(1);

    const exported = await instance.persistence.exportCurrentSave();
    const bytes = (exported as { readonly bytes: Uint8Array }).bytes;
    await expect(instance.persistence.importSave(bytes)).resolves.toMatchObject({
      kind: "imported",
    });
    expect(instance.presentationAnchor()).toEqual({ epoch: 2, origin: "import" });

    await expect(instance.lifecycle.restart()).resolves.toEqual({
      kind: "anchored",
      commandSequence: 0,
    });
    expect(instance.presentationAnchor()).toEqual({ epoch: 3, origin: "restart" });
    expect(instance.semantic.observe().game).toEqual({ count: 0 });

    unsubscribe();
    await instance.dispose();
  });

  it("verifies the debounced autosave policy with a deterministic scheduler", async () => {
    const { counting, autoWrites } = countingRecordsV1();
    const { scheduler, scheduled, runLast } = manualSchedulerV1();
    const instance = await createInstanceV1({
      records: counting,
      autosave: { mode: "debounced", delayMs: 250 },
      scheduler,
    });

    await instance.semantic.dispatch(incrementV1);
    await instance.semantic.dispatch(incrementV1);
    await instance.autoSaveIdle();
    expect(autoWrites()).toEqual([]);
    expect(scheduled.at(-1)?.delayMs).toBe(250);

    runLast();
    await instance.autoSaveIdle();
    expect(autoWrites()).toHaveLength(1);

    // Explicit slot saves stay available while the debounce is pending.
    await instance.semantic.dispatch(incrementV1);
    await expect(instance.persistence.save("quick")).resolves.toEqual({
      kind: "saved",
      slotId: "quick",
    });

    // A pagehide-style flush writes the pending Snapshot immediately.
    await instance.flushAutoSave();
    expect(autoWrites()).toHaveLength(2);
    await instance.dispose();
  });

  it("honors checkpointEveryCommands and the default every-commit policy", async () => {
    const checkpointed = countingRecordsV1();
    const { scheduler } = manualSchedulerV1();
    const instance = await createInstanceV1({
      records: checkpointed.counting,
      autosave: { mode: "debounced", delayMs: 1_000, checkpointEveryCommands: 2 },
      scheduler,
    });
    await instance.semantic.dispatch(incrementV1);
    await instance.semantic.dispatch(incrementV1);
    await instance.autoSaveIdle();
    expect(checkpointed.autoWrites()).toHaveLength(1);
    await instance.dispose();

    const everyCommit = countingRecordsV1();
    const immediate = await createInstanceV1({ records: everyCommit.counting });
    await immediate.semantic.dispatch(incrementV1);
    await immediate.autoSaveIdle();
    expect(everyCommit.autoWrites()).toHaveLength(1);
    await immediate.dispose();
  });

  it("resumes the previous session's autosave at boot when opted in", async () => {
    const records = createMemoryHostRecordStoreV1();
    // First session: advance two steps; the debounced autosave lands with each commit (every_commit default).
    const first = await createCoreGameApplicationInstanceV1(resolvedResumingApplicationV1(), {
      host: hostServicesV1(records),
    });
    await first.semantic.dispatch(incrementV1);
    await first.semantic.dispatch(incrementV1);
    await first.autoSaveIdle();
    const countBefore = (first.semantic.observe().game as { readonly count: number }).count;
    expect(countBefore).toBe(2);
    await first.dispose();

    // Second session (same records): an opted-in definition adopts auto.current at boot.
    const second = await createCoreGameApplicationInstanceV1(resolvedResumingApplicationV1(), {
      host: hostServicesV1(records),
    });
    expect((second.semantic.observe().game as { readonly count: number }).count).toBe(2);
    // Intentional semantics: boot-resume completes before the anchor subscription
    // exists — to presentation this is the bootstrap origin, not a load, so the
    // "load origin dismisses the title screen" behavior never fires; that is what makes the title screen's Continue truthful.
    expect(second.presentationAnchor().origin).toBe("bootstrap");
    await second.dispose();

    // Definitions that do not opt in keep the old semantics: same records still start fresh.
    const fresh = await createCoreGameApplicationInstanceV1(resolvedApplicationV1(), {
      host: hostServicesV1(records),
    });
    expect((fresh.semantic.observe().game as { readonly count: number }).count).toBe(0);
    await fresh.dispose();
  });

  it("keeps the fresh bootstrap when the autosave slot is empty", async () => {
    const instance = await createCoreGameApplicationInstanceV1(resolvedResumingApplicationV1(), {
      host: hostServicesV1(createMemoryHostRecordStoreV1()),
    });
    expect((instance.semantic.observe().game as { readonly count: number }).count).toBe(0);
    expect(instance.presentationAnchor().origin).toBe("bootstrap");
    await instance.dispose();
  });

  it("releases the lease and answers structurally after disposal", async () => {
    const records = createMemoryHostRecordStoreV1();
    const instance = await createInstanceV1({ records });
    await instance.semantic.dispatch(incrementV1);
    await expect(instance.dispose()).resolves.toEqual({ kind: "disposed" });
    await expect(instance.dispose()).resolves.toEqual({ kind: "disposed" });
    expect(instance.isDisposed()).toBe(true);

    await expect(instance.semantic.dispatch(incrementV1)).resolves.toEqual({
      kind: "not_executed",
      code: "hmr_invalidated",
    });
    await expect(instance.persistence.save("manual.1")).resolves.toMatchObject({
      kind: "faulted",
      code: "runtime_disposed",
    });

    // Disposal left the lease unowned (no active owner); a successor over the
    // same records takes it over through the public lease port and writes.
    const successor = await createInstanceV1({ records });
    await expect(successor.persistence.lease.getStatus()).resolves.toMatchObject({
      kind: "unowned",
    });
    await expect(successor.persistence.lease.takeOver()).resolves.toMatchObject({
      kind: "updated",
      status: { kind: "owned" },
    });
    await expect(successor.persistence.save("manual.1")).resolves.toEqual({
      kind: "saved",
      slotId: "manual.1",
    });
    await successor.dispose();
  });
});

// SPDX-License-Identifier: MIT
import { createGameAuthoringKitV1 } from "../authoring/game-authoring-kit.ts";
import { createContentDatabaseV1, defineContentTableV1 } from "../contracts/content-database.ts";
import { digestBytes } from "../contracts/digest.ts";
import { faultAttemptV1 } from "../contracts/execution.ts";
import type { CommandExecutionAttemptEnvelopeV1 } from "../contracts/execution.ts";
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
} from "../contracts/gameplay-module.ts";
import type { BuildProvenanceV1 } from "../contracts/provenance.ts";
import {
  createTransactionalRngV1,
  type RngDrawTraceV1,
  type RngStateV1,
} from "../contracts/rng.ts";
import type { GameSnapshotEnvelopeV1 } from "../contracts/snapshot.ts";
import { createPristineRunIntegrityV1 } from "../contracts/snapshot.ts";
import type { DeepReadonly, RuntimeSchemaV1 } from "../contracts/values.ts";
import {
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
} from "../contracts/values.ts";
import { drawFromEventPoolV1 } from "../contracts/event-pool.ts";
import { replayAuthoritativelyFromAttemptsInternalV1 } from "../runtime/diagnostics/replay.ts";
import { createGameSessionV1 } from "../runtime/session/game-session.ts";

interface OrderingContentRowV1 extends Readonly<Record<string, unknown>> {
  readonly id: string;
  readonly label: string;
  readonly score: number;
}

interface OrderingSliceV1 {
  readonly value: number;
}

interface OrderingStateV1 {
  readonly simulation: {
    readonly dash: OrderingSliceV1;
    readonly underscore: OrderingSliceV1;
  };
}

interface OrderingCommandV1 {
  readonly kind: "ordering.commit";
}

interface OrderingFactV1 {
  readonly kind: "ordering.value_applied";
  readonly owner: "order.a-1" | "order.a_1";
  readonly value: number;
}

interface OrderingRejectionV1 {
  readonly code: "ordering.rejected";
}

interface OrderingFaultV1 {
  readonly code: "ordering.faulted";
}

interface OrderingTypesV1
  extends GameSimulationTypeMapV1<GameBootstrapInputV1, OrderingStateV1, RngStateV1> {
  readonly snapshot: GameSnapshotEnvelopeV1<OrderingStateV1, RngStateV1>;
  readonly command: OrderingCommandV1;
  readonly fact: OrderingFactV1;
  readonly rejection: OrderingRejectionV1;
  readonly fault: OrderingFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: never;
  readonly rngState: RngStateV1;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly executionContext: undefined;
}

type OrderingSnapshotV1 = OrderingTypesV1["snapshot"];
type OrderingAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  OrderingSnapshotV1,
  OrderingFactV1,
  OrderingRejectionV1,
  OrderingFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

interface OrderingTraceV1 {
  readonly proposalOrder: string[];
  readonly applyOrder: string[];
}

function isRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const orderingContentRowSchemaV1: RuntimeSchemaV1<OrderingContentRowV1> = Object.freeze({
  parse(value: unknown): OrderingContentRowV1 {
    if (!isRecordV1(value) || Object.keys(value).sort().join("\0") !== "id\0label\0score") {
      throw new TypeError("invalid authoritative ordering content row");
    }
    if (typeof value.id !== "string" || typeof value.label !== "string") {
      throw new TypeError("invalid authoritative ordering content strings");
    }
    return Object.freeze({
      id: value.id,
      label: value.label,
      score: parseNonNegativeSafeInteger(value.score),
    });
  },
});

const orderingIntegerRowSchemaV1: RuntimeSchemaV1<OrderingContentRowV1> = Object.freeze({
  parse(value: unknown): OrderingContentRowV1 {
    if (!isRecordV1(value) || Object.keys(value).sort().join("\0") !== "id\0label\0score") {
      throw new TypeError("invalid authoritative integer ordering row");
    }
    if (
      typeof value.id !== "string" ||
      typeof value.label !== "string" ||
      typeof value.score !== "number" ||
      !Number.isSafeInteger(value.score) ||
      Object.is(value.score, -0)
    ) {
      throw new TypeError("invalid authoritative integer ordering values");
    }
    return Object.freeze({ id: value.id, label: value.label, score: value.score });
  },
});

function runContentDatabaseVectorsV1() {
  const labels = ["\ue000", "\u{1f600}", "\u00e9", "e\u0301", "a_1", "a-1", "a", "A"];
  const labelsTable = defineContentTableV1<OrderingContentRowV1>({
    tableId: "table.det2e.labels",
    schema: orderingContentRowSchemaV1,
    primaryKey: "id",
    rows: labels.map((label, index) => ({ id: `label.${String(index)}`, label, score: index })),
  });
  const integersTable = defineContentTableV1<OrderingContentRowV1>({
    tableId: "table.det2e.integers",
    schema: orderingIntegerRowSchemaV1,
    primaryKey: "id",
    rows: [
      { id: "integer.maximum", label: "maximum", score: Number.MAX_SAFE_INTEGER },
      { id: "integer.zero", label: "zero", score: 0 },
      { id: "integer.minimum", label: "minimum", score: Number.MIN_SAFE_INTEGER },
    ],
  });
  const database = createContentDatabaseV1({ tables: [labelsTable, integersTable] });
  const labelsView = database.table(labelsTable);
  const integersView = database.table(integersTable);
  return Object.freeze({
    utf16Ascending: Object.freeze(
      labelsView.findMany({ orderBy: "label", direction: "asc" }).map((row) => row.label),
    ),
    utf16Descending: Object.freeze(
      labelsView.findMany({ orderBy: "label", direction: "desc" }).map((row) => row.label),
    ),
    safeIntegersAscending: Object.freeze(
      integersView.findMany({ orderBy: "score", direction: "asc" }).map((row) => row.score),
    ),
    safeIntegersDescending: Object.freeze(
      integersView.findMany({ orderBy: "score", direction: "desc" }).map((row) => row.score),
    ),
  });
}

function runEventPoolVectorsV1() {
  const candidates = Object.freeze([
    Object.freeze({
      eventId: "event.alpha",
      weight: 2,
      condition: Object.freeze({
        kind: "number" as const,
        key: "score",
        op: "gte" as const,
        value: 4,
      }),
    }),
    Object.freeze({ eventId: "event.beta", weight: 3, condition: null }),
    Object.freeze({
      eventId: "event.hidden",
      weight: 4,
      condition: Object.freeze({
        kind: "flag" as const,
        flag: "hidden.enabled",
        present: true,
      }),
    }),
  ]);
  const context = Object.freeze({
    numbers: Object.freeze({ score: 4 }),
    flags: Object.freeze([]),
    labels: Object.freeze({ phase: "neutral" }),
  });
  const ordinaryRng = createTransactionalRngV1(parseNonZeroUint32(97));
  const ordinaryResult = drawFromEventPoolV1({
    candidates,
    context,
    rng: ordinaryRng,
    purpose: "check:det2e.event-pool",
  });
  const forcedRng = createTransactionalRngV1(parseNonZeroUint32(97));
  const forcedResult = drawFromEventPoolV1({
    candidates,
    context,
    rng: forcedRng,
    purpose: "check:det2e.event-pool",
    force: "event.beta",
  });
  return Object.freeze({
    ordinary: Object.freeze({
      result: ordinaryResult,
      candidateRng: ordinaryRng.candidateState(),
      attemptedDraws: ordinaryRng.attemptedDraws(),
    }),
    forced: Object.freeze({
      result: forcedResult,
      candidateRng: forcedRng.candidateState(),
      attemptedDraws: forcedRng.attemptedDraws(),
    }),
  });
}

function orderingSliceSchemaV1(label: string): RuntimeSchemaV1<OrderingSliceV1> {
  return Object.freeze({
    parse(value: unknown): OrderingSliceV1 {
      if (!isRecordV1(value) || Object.keys(value).join("\0") !== "value") {
        throw new TypeError(`invalid ${label} ordering slice`);
      }
      return Object.freeze({ value: parseNonNegativeSafeInteger(value.value) });
    },
  });
}

const orderingStateSchemaV1: RuntimeSchemaV1<OrderingStateV1> = Object.freeze({
  parse(value: unknown): OrderingStateV1 {
    if (!isRecordV1(value) || !isRecordV1(value.simulation)) {
      throw new TypeError("invalid authoritative ordering state");
    }
    return Object.freeze({
      simulation: Object.freeze({
        dash: orderingSliceSchemaV1("dash").parse(value.simulation.dash),
        underscore: orderingSliceSchemaV1("underscore").parse(value.simulation.underscore),
      }),
    });
  },
});

const orderingCommandSchemaV1: RuntimeSchemaV1<OrderingCommandV1> = Object.freeze({
  parse(value: unknown): OrderingCommandV1 {
    if (!isRecordV1(value) || Object.keys(value).join("\0") !== "kind") {
      throw new TypeError("invalid authoritative ordering command");
    }
    if (value.kind !== "ordering.commit") {
      throw new TypeError("unknown authoritative ordering command");
    }
    return Object.freeze({ kind: value.kind });
  },
});

function createOrderingTransactionRunnerV1(trace?: OrderingTraceV1) {
  const kit = createGameAuthoringKitV1<OrderingTypesV1>();
  const dash = kit.defineStatefulModule({
    id: "order.a-1",
    contractRevision: 1,
    state: {
      slot: "simulation.dash",
      schema: orderingSliceSchemaV1("dash"),
      initial: () => Object.freeze({ value: 1 }),
    },
    owner: {
      operationSchema: Object.freeze({
        parse(value: unknown) {
          if (!isRecordV1(value)) throw new TypeError("invalid dash ordering operation");
          return Object.freeze({ delta: parseNonNegativeSafeInteger(value.delta) });
        },
      }),
      propose(state, operation) {
        trace?.proposalOrder.push("order.a-1");
        const value = parseNonNegativeSafeInteger(state.value + operation.delta);
        return Object.freeze({
          kind: "proposed" as const,
          proposal: Object.freeze({
            payload: operation,
            facts: Object.freeze([
              Object.freeze({
                kind: "ordering.value_applied" as const,
                owner: "order.a-1" as const,
                value,
              }),
            ]),
          }),
        });
      },
      apply(state, proposal) {
        trace?.applyOrder.push("order.a-1");
        return Object.freeze({
          value: parseNonNegativeSafeInteger(state.value + proposal.payload.delta),
        });
      },
    },
  });
  const underscore = kit.defineStatefulModule({
    id: "order.a_1",
    contractRevision: 1,
    state: {
      slot: "simulation.underscore",
      schema: orderingSliceSchemaV1("underscore"),
      initial: () => Object.freeze({ value: 10 }),
    },
    owner: {
      operationSchema: Object.freeze({
        parse(value: unknown) {
          if (!isRecordV1(value)) throw new TypeError("invalid underscore ordering operation");
          return Object.freeze({ delta: parseNonNegativeSafeInteger(value.delta) });
        },
      }),
      propose(state, operation) {
        trace?.proposalOrder.push("order.a_1");
        const value = parseNonNegativeSafeInteger(state.value + operation.delta);
        return Object.freeze({
          kind: "proposed" as const,
          proposal: Object.freeze({
            payload: operation,
            facts: Object.freeze([
              Object.freeze({
                kind: "ordering.value_applied" as const,
                owner: "order.a_1" as const,
                value,
              }),
            ]),
          }),
        });
      },
      apply(state, proposal) {
        trace?.applyOrder.push("order.a_1");
        return Object.freeze({
          value: parseNonNegativeSafeInteger(state.value + proposal.payload.delta),
        });
      },
    },
  });
  const runner = kit.composeModules([underscore, dash]).createTransactionRunner({
    stateSchema: orderingStateSchemaV1,
    createFault: () => Object.freeze({ code: "ordering.faulted" as const }),
  });
  return Object.freeze({ dash, underscore, runner });
}

function executeOrderingAttemptV1(
  snapshot: DeepReadonly<OrderingSnapshotV1>,
  trace?: OrderingTraceV1,
): OrderingAttemptV1 {
  const { dash, underscore, runner } = createOrderingTransactionRunnerV1(trace);
  return runner.execute(snapshot, createTransactionalRngV1(snapshot.rng), (transaction) => {
    transaction.propose(underscore, { delta: parseNonNegativeSafeInteger(3) });
    transaction.propose(dash, { delta: parseNonNegativeSafeInteger(2) });
    return transaction.complete();
  }) as OrderingAttemptV1;
}

function initialOrderingSnapshotV1(): OrderingSnapshotV1 {
  return {
    state: {
      simulation: {
        dash: { value: 1 },
        underscore: { value: 10 },
      },
    },
    rng: createTransactionalRngV1(parseNonZeroUint32(97)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  };
}

const orderingDigestV1 = (label: string) =>
  digestBytes(new TextEncoder().encode(`det2e-authoritative-ordering:${label}`));

const orderingProvenanceV1: BuildProvenanceV1 = Object.freeze({
  story: Object.freeze({
    id: "story.det2e-authoritative-ordering",
    revision: parsePositiveSafeInteger(1),
    digest: orderingDigestV1("story"),
  }),
  engine: Object.freeze({
    version: "det2e-authoritative-ordering-v1",
    digest: orderingDigestV1("engine"),
  }),
  resolved: Object.freeze({
    stateContractRevision: parsePositiveSafeInteger(1),
    stateContractDigest: orderingDigestV1("state-contract"),
    simulationDigest: orderingDigestV1("simulation"),
    presentationDigest: orderingDigestV1("presentation"),
    patchSet: Object.freeze({
      digest: orderingDigestV1("patch-set"),
      simulationDigest: orderingDigestV1("patch-set-simulation"),
      presentationDigest: orderingDigestV1("patch-set-presentation"),
      appliedHotfixes: Object.freeze([]),
    }),
  }),
});

async function runTransactionVectorV1() {
  const trace: OrderingTraceV1 = { proposalOrder: [], applyOrder: [] };
  const replayTrace: OrderingTraceV1 = { proposalOrder: [], applyOrder: [] };
  const created = createGameSessionV1<OrderingTypesV1>({
    initialSnapshot: initialOrderingSnapshotV1(),
    commandSchema: orderingCommandSchemaV1,
    executionContext: undefined,
    executeAttempt(snapshot) {
      return executeOrderingAttemptV1(snapshot, trace);
    },
    normalizeUnexpectedDispatchFault(_error, snapshot) {
      return faultAttemptV1(
        snapshot,
        createTransactionalRngV1(snapshot.rng),
        Object.freeze({ code: "ordering.faulted" as const }),
      );
    },
  });
  const dispatch = await created.session.dispatch(Object.freeze({ kind: "ordering.commit" }));
  if (dispatch.kind !== "executed" || dispatch.execution.kind !== "committed") {
    throw new TypeError("authoritative ordering vector did not commit");
  }
  const commandLog = created.commandLog.entries();
  const replay = await replayAuthoritativelyFromAttemptsInternalV1({
    identity: Object.freeze({ provenance: orderingProvenanceV1 }),
    replayBase: created.commandLog.replayBase(),
    replayBaseStateDigest: created.commandLog.replayBaseStateDigest(),
    commandLog,
    currentSnapshot: created.session.getCurrentSnapshot(),
    projectStableRejection: (rejection: OrderingRejectionV1) => rejection,
    projectStableFault: (fault: OrderingFaultV1) => fault,
    executeAttempt(snapshot, logged) {
      if (logged.source !== "game") {
        throw new TypeError("authoritative ordering vector has no DebugCommand");
      }
      return executeOrderingAttemptV1(snapshot, replayTrace);
    },
  });
  return Object.freeze({
    proposalOrder: Object.freeze([...trace.proposalOrder]),
    applyOrder: Object.freeze([...trace.applyOrder]),
    replayProposalOrder: Object.freeze([...replayTrace.proposalOrder]),
    replayApplyOrder: Object.freeze([...replayTrace.applyOrder]),
    facts: dispatch.execution.facts,
    candidateSnapshot: dispatch.execution.snapshot,
    commandLog,
    replay,
  });
}

/**
 * Browser-neutral DET2e vector seam. Its returned data is suitable for running
 * unchanged under Deno, Node-compatible Vitest, or a browser harness. DET4
 * exposes it only through the narrow determinism-vectors testkit subpath; it
 * intentionally has no broad package-barrel export.
 */
export async function runAuthoritativeOrderingVectorsV1() {
  return Object.freeze({
    eventPool: runEventPoolVectorsV1(),
    contentDatabase: runContentDatabaseVectorsV1(),
    transaction: await runTransactionVectorV1(),
  });
}

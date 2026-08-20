// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createGameAuthoringKitV1 } from "../authoring/game-authoring-kit.ts";
import {
  anyRealtimeMonitorActiveV1,
  parseMonitorAccumulatorV1,
  parseMonitorDeclarationsV1,
  settleMonitorsV1,
} from "./authoritative-monitor.ts";
import type { MonitorDeclarationV1 } from "./authoritative-monitor.ts";
import { digestCanonical } from "./digest.ts";
import type { GameBootstrapInputV1, GameSimulationTypeMapV1 } from "./gameplay-module.ts";
import { createTransactionalRngV1 } from "./rng.ts";
import type { RngStateV1 } from "./rng.ts";
import type { GameSnapshotEnvelopeV1 } from "./snapshot.ts";
import { createPristineRunIntegrityV1 } from "./snapshot.ts";
import type { RuntimeSchemaV1 } from "./values.ts";
import { parseNonNegativeSafeInteger, parseNonZeroUint32 } from "./values.ts";

interface ProbeStateV1 {
  readonly running: boolean;
  readonly held: boolean;
}

type ProbeEventV1 =
  | { readonly kind: "watch.alert_crossed" }
  | { readonly kind: "watch.charge_crossed" };

function probeDeclarationsV1(): readonly MonitorDeclarationV1<ProbeStateV1, ProbeEventV1>[] {
  return parseMonitorDeclarationsV1<ProbeStateV1, ProbeEventV1>([
    {
      id: "watch.alert",
      everyMs: 500,
      retention: "clear",
      event: { kind: "watch.alert_crossed" },
      activeWhen: (state) => state.running,
    },
    {
      id: "watch.charge",
      everyMs: 700,
      retention: "retain",
      event: { kind: "watch.charge_crossed" },
      activeWhen: (state) => state.held,
    },
  ]);
}

describe("monitor declaration admission", () => {
  it("parses a declaration vector preserving declaration order", () => {
    const declarations = probeDeclarationsV1();
    expect(declarations.map((entry) => entry.id)).toEqual(["watch.alert", "watch.charge"]);
    expect(Object.isFrozen(declarations)).toBe(true);
    expect(Object.isFrozen(declarations[0])).toBe(true);
    // The payload is emitted by reference once per crossing, so admission
    // freezes it against post-admission mutation.
    expect(Object.isFrozen(declarations[0]?.event)).toBe(true);
  });

  const validEntry = {
    id: "a",
    everyMs: 1,
    retention: "clear",
    event: { kind: "watch.alert_crossed" },
    activeWhen: () => true,
  };

  it.each([
    ["not an array", { id: "watch.alert" }, "array_expected"],
    // eslint-disable-next-line no-sparse-arrays -- the hole is the case under test
    ["a sparse declaration vector", [validEntry, , validEntry], "sparse_array"],
    ["extra key", [{ ...validEntry, extra: 1 }], "object_keys"],
    [
      "undefined predicate",
      [{ ...validEntry, activeWhen: undefined }],
      "monitor_predicate_invalid",
    ],
    ["empty id", [{ ...validEntry, id: "" }], "monitor_id_invalid"],
    ["a __proto__ id", [{ ...validEntry, id: "__proto__" }], "monitor_id_invalid"],
    ["a constructor id", [{ ...validEntry, id: "constructor" }], "monitor_id_invalid"],
    ["duplicate id", [validEntry, { ...validEntry, everyMs: 2 }], "monitor_id_duplicate"],
    ["zero cadence", [{ ...validEntry, everyMs: 0 }], "monitor_cadence_invalid"],
    ["fractional cadence", [{ ...validEntry, everyMs: 1.5 }], "monitor_cadence_invalid"],
    ["unknown retention", [{ ...validEntry, retention: "sticky" }], "monitor_retention_invalid"],
    ["unknown pace", [{ ...validEntry, pace: "fast" }], "monitor_pace_invalid"],
    ["non-function predicate", [{ ...validEntry, activeWhen: true }], "monitor_predicate_invalid"],
    ["kindless event payload", [{ ...validEntry, event: { count: 1 } }], "monitor_event_invalid"],
    ["null event payload", [{ ...validEntry, event: null }], "monitor_event_invalid"],
  ])("rejects %s", (_label, value, reason) => {
    expect(() => parseMonitorDeclarationsV1(value as never)).toThrowError(new RegExp(reason));
  });

  it("normalizes the pace hint and exposes the realtime-window predicate", () => {
    const declarations = parseMonitorDeclarationsV1<
      { readonly menuUp: boolean },
      { readonly kind: string }
    >([
      {
        id: "watch.gauge",
        everyMs: 200,
        retention: "clear",
        pace: "realtime",
        event: { kind: "watch.gauge_crossed" },
        activeWhen: (state) => state.menuUp,
      },
      {
        id: "watch.drip",
        everyMs: 300,
        retention: "retain",
        event: { kind: "watch.drip_crossed" },
        activeWhen: () => true,
      },
    ]);
    // Absent pace normalizes to cinematic so Hosts always read a definite value.
    expect(declarations.map((entry) => entry.pace)).toEqual(["realtime", "cinematic"]);
    // The Host predicate follows the realtime declaration's own gate: the
    // always-active cinematic drip never pins the rate.
    expect(anyRealtimeMonitorActiveV1(declarations, { menuUp: true })).toBe(true);
    expect(anyRealtimeMonitorActiveV1(declarations, { menuUp: false })).toBe(false);
  });

  it("parses an accumulator record and rejects non-integer accumulations", () => {
    expect(parseMonitorAccumulatorV1({ "watch.alert": 0, "watch.charge": 350 })).toEqual({
      "watch.alert": 0,
      "watch.charge": 350,
    });
    expect(() => parseMonitorAccumulatorV1([])).toThrowError(/object_expected/);
    expect(() => parseMonitorAccumulatorV1({ a: -1 })).toThrowError(
      /monitor_accumulation_invalid/,
    );
    expect(() => parseMonitorAccumulatorV1({ a: 0.5 })).toThrowError(
      /monitor_accumulation_invalid/,
    );
  });

  it("rejects accumulator records with dangerous keys, accessors, or symbol keys", () => {
    // A JSON.parse'd Save payload can carry an own __proto__ key; browsers
    // (unlike Deno) keep the Annex-B accessor, so admission must reject it
    // instead of letting runtimes disagree about the admitted state.
    expect(() => parseMonitorAccumulatorV1(JSON.parse('{"__proto__": 250}'))).toThrowError(
      /monitor_id_invalid/,
    );
    expect(() => parseMonitorAccumulatorV1({ constructor: 1 })).toThrowError(
      /monitor_id_invalid/,
    );
    expect(() =>
      parseMonitorAccumulatorV1({
        get gauge() {
          return 5;
        },
      })
    ).toThrowError(/data_property_expected/);
    expect(() => parseMonitorAccumulatorV1({ [Symbol("gauge")]: 5, gauge: 5 })).toThrowError(
      /symbol_key/,
    );
    // Escaped failure pointers: a slash inside the id stays one segment.
    expect(() => parseMonitorAccumulatorV1({ "a/b": -1 })).toThrowError(/\/a~1b/);
  });
});

describe("monitor settlement arithmetic", () => {
  const declarations = probeDeclarationsV1();
  const bothActive: ProbeStateV1 = { running: true, held: true };
  const bothInactive: ProbeStateV1 = { running: false, held: false };

  it("accumulates active monitors and emits payloads in declaration order", () => {
    const settlement = settleMonitorsV1({
      declarations,
      accumulator: { "watch.alert": 400, "watch.charge": 600 },
      elapsedMs: 1200,
      state: bothActive,
    });
    // alert: (400, 1600] crosses 500, 1000, 1500; charge: (600, 1800] crosses 700, 1400.
    expect(settlement.events.map((event) => event.kind)).toEqual([
      "watch.alert_crossed",
      "watch.alert_crossed",
      "watch.alert_crossed",
      "watch.charge_crossed",
      "watch.charge_crossed",
    ]);
    expect(settlement.accumulator).toEqual({ "watch.alert": 1600, "watch.charge": 1800 });
  });

  it("clears inactive clear-retention monitors and retains retain-retention ones", () => {
    const settlement = settleMonitorsV1({
      declarations,
      accumulator: { "watch.alert": 499, "watch.charge": 699 },
      elapsedMs: 50,
      state: bothInactive,
    });
    expect(settlement.events).toEqual([]);
    expect(settlement.accumulator).toEqual({ "watch.charge": 699 });
  });

  it("drops undeclared accumulator ids and zero retained accumulations", () => {
    const settlement = settleMonitorsV1({
      declarations,
      accumulator: { "watch.retired": 900, "watch.charge": 0 },
      elapsedMs: 100,
      state: bothInactive,
    });
    expect(settlement.accumulator).toEqual({});
  });

  it("is batch invariant: split settlements equal the single settlement", () => {
    const single = settleMonitorsV1({
      declarations,
      accumulator: {},
      elapsedMs: 1500,
      state: bothActive,
    });
    let accumulator = parseMonitorAccumulatorV1({});
    let splitEvents = 0;
    for (const _ of [0, 1, 2]) {
      const step = settleMonitorsV1({
        declarations,
        accumulator,
        elapsedMs: 500,
        state: bothActive,
      });
      accumulator = step.accumulator;
      splitEvents += step.events.length;
    }
    expect(accumulator).toEqual(single.accumulator);
    expect(splitEvents).toBe(single.events.length);
  });

  it("rejects non-positive or unsafe elapsed milliseconds", () => {
    for (const elapsedMs of [0, -1, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        settleMonitorsV1({ declarations, accumulator: {}, elapsedMs, state: bothActive })
      ).toThrowError(TypeError);
    }
  });

  it("treats an id colliding with an Object.prototype member as own data", () => {
    const collidingDeclarations = parseMonitorDeclarationsV1<ProbeStateV1, ProbeEventV1>([
      {
        id: "toString",
        everyMs: 500,
        retention: "retain",
        event: { kind: "watch.alert_crossed" },
        activeWhen: (state) => state.running,
      },
    ]);
    // The first settlement must read "absent" (0), not the inherited function.
    const first = settleMonitorsV1({
      declarations: collidingDeclarations,
      accumulator: {},
      elapsedMs: 600,
      state: { running: true, held: false },
    });
    expect(first.accumulator).toEqual({ toString: 600 });
    expect(first.events.length).toBe(1);
    // An inactive retain settlement keeps the own entry unchanged.
    const second = settleMonitorsV1({
      declarations: collidingDeclarations,
      accumulator: first.accumulator,
      elapsedMs: 100,
      state: { running: false, held: false },
    });
    expect(second.accumulator).toEqual({ toString: 600 });
  });
});

// ---------------------------------------------------------------------------
// Acceptance fixture: a minimal kit story whose single time verb settles two
// declared monitors — an alert gauge (clear) and a held charge (retain) —
// emitting the declared domain event once per crossing. Session-level
// invariants (command log, replay parity) are locked by the existing session
// and workload suites; this fixture proves the monitor contract composes
// with the transaction runner and stays batch invariant end to end.
// ---------------------------------------------------------------------------

interface WatchFlagsStateV1 {
  readonly running: boolean;
  readonly held: boolean;
}

interface WatchMonitorsStateV1 {
  readonly accumulator: Readonly<Record<string, number>>;
}

interface WatchGaugeStateV1 {
  readonly alerts: number;
  readonly charges: number;
}

interface WatchStateV1 {
  readonly simulation: {
    readonly flags: WatchFlagsStateV1;
    readonly monitors: WatchMonitorsStateV1;
    readonly gauge: WatchGaugeStateV1;
  };
}

type WatchCommandV1 =
  | { readonly kind: "watch.set_flags"; readonly running: boolean; readonly held: boolean }
  | { readonly kind: "watch.time"; readonly elapsedMs: number };

type WatchEventV1 =
  | { readonly kind: "watch.flags_set"; readonly next: WatchFlagsStateV1 }
  | { readonly kind: "watch.monitors_set"; readonly next: Readonly<Record<string, number>> }
  | { readonly kind: "watch.alert_crossed" }
  | { readonly kind: "watch.charge_crossed" };

interface WatchTypesV1 extends
  GameSimulationTypeMapV1<
    GameBootstrapInputV1,
    WatchStateV1,
    RngStateV1
  > {
  readonly snapshot: GameSnapshotEnvelopeV1<WatchStateV1, RngStateV1>;
  readonly command: WatchCommandV1;
  readonly event: WatchEventV1;
  readonly rejection: { readonly code: "watch.rejected" };
  readonly fault: { readonly code: "watch.faulted" };
}

const watchDeclarationsV1 = parseMonitorDeclarationsV1<WatchStateV1, WatchEventV1>([
  {
    id: "watch.alert",
    everyMs: 500,
    retention: "clear",
    event: { kind: "watch.alert_crossed" },
    activeWhen: (state) => state.simulation.flags.running,
  },
  {
    id: "watch.charge",
    everyMs: 700,
    retention: "retain",
    event: { kind: "watch.charge_crossed" },
    activeWhen: (state) => state.simulation.flags.held,
  },
]);

const watchEventSchemaV1: RuntimeSchemaV1<WatchEventV1> = Object.freeze({
  parse(value: unknown): WatchEventV1 {
    const kind = (value as { readonly kind?: unknown } | null)?.kind;
    if (kind === "watch.flags_set") {
      const next = (value as { readonly next?: unknown }).next as WatchFlagsStateV1;
      if (typeof next?.running !== "boolean" || typeof next?.held !== "boolean") {
        throw new TypeError("invalid watch.flags_set");
      }
      return Object.freeze({ kind, next: Object.freeze({ ...next }) });
    }
    if (kind === "watch.monitors_set") {
      const next = parseMonitorAccumulatorV1((value as { readonly next?: unknown }).next);
      return Object.freeze({ kind, next });
    }
    if (kind === "watch.alert_crossed" || kind === "watch.charge_crossed") {
      return Object.freeze({ kind });
    }
    throw new TypeError("invalid watch event");
  },
});

function createWatchRunnerV1() {
  const kit = createGameAuthoringKitV1<WatchTypesV1>();
  const flags = kit.defineStatefulModule({
    id: "watch.flags",
    contractRevision: 1,
    state: {
      slot: "simulation.flags",
      schema: Object.freeze({
        parse(value: unknown): WatchFlagsStateV1 {
          const record = value as WatchFlagsStateV1;
          if (typeof record?.running !== "boolean" || typeof record?.held !== "boolean") {
            throw new TypeError("invalid watch flags state");
          }
          return Object.freeze({ running: record.running, held: record.held });
        },
      }),
      initial: () => Object.freeze({ running: false, held: false }),
    },
    reducers: {
      "watch.flags_set": (_state, event) => event.next,
    },
  });
  const monitors = kit.defineStatefulModule({
    id: "watch.monitors",
    contractRevision: 1,
    state: {
      slot: "simulation.monitors",
      schema: Object.freeze({
        parse(value: unknown): WatchMonitorsStateV1 {
          const record = value as { readonly accumulator?: unknown };
          return Object.freeze({
            accumulator: parseMonitorAccumulatorV1(record?.accumulator),
          });
        },
      }),
      initial: () => Object.freeze({ accumulator: Object.freeze({}) }),
    },
    reducers: {
      "watch.monitors_set": (_state, event) => Object.freeze({ accumulator: event.next }),
    },
  });
  const gauge = kit.defineStatefulModule({
    id: "watch.gauge",
    contractRevision: 1,
    state: {
      slot: "simulation.gauge",
      schema: Object.freeze({
        parse(value: unknown): WatchGaugeStateV1 {
          const record = value as WatchGaugeStateV1;
          parseNonNegativeSafeInteger(record?.alerts);
          parseNonNegativeSafeInteger(record?.charges);
          return Object.freeze({ alerts: record.alerts, charges: record.charges });
        },
      }),
      initial: () => Object.freeze({ alerts: 0, charges: 0 }),
    },
    reducers: {
      "watch.alert_crossed": (state) => Object.freeze({ ...state, alerts: state.alerts + 1 }),
      "watch.charge_crossed": (state) => Object.freeze({ ...state, charges: state.charges + 1 }),
    },
  });
  const composition = kit.composeModules([flags, monitors, gauge]);
  const runner = composition.createTransactionRunner({
    stateSchema: Object.freeze({
      parse(value: unknown): WatchStateV1 {
        return Object.freeze({ simulation: (value as WatchStateV1).simulation });
      },
    }),
    eventSchema: watchEventSchemaV1,
    createFault: () => Object.freeze({ code: "watch.faulted" as const }),
    validateCandidate: () => [],
  });
  return runner;
}

type WatchSnapshotV1 = WatchTypesV1["snapshot"];

function initialWatchSnapshotV1(): WatchSnapshotV1 {
  return Object.freeze({
    state: Object.freeze({
      simulation: Object.freeze({
        flags: Object.freeze({ running: false, held: false }),
        monitors: Object.freeze({ accumulator: Object.freeze({}) }),
        gauge: Object.freeze({ alerts: 0, charges: 0 }),
      }),
    }),
    rng: createTransactionalRngV1(parseNonZeroUint32(41)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  });
}

function executeWatchCommandV1(
  runner: ReturnType<typeof createWatchRunnerV1>,
  snapshot: WatchSnapshotV1,
  command: WatchCommandV1,
): { readonly snapshot: WatchSnapshotV1; readonly events: readonly WatchEventV1[] } {
  const attempt = runner.execute(
    snapshot,
    createTransactionalRngV1(snapshot.rng),
    (transaction) => {
      if (command.kind === "watch.set_flags") {
        transaction.emit({
          kind: "watch.flags_set",
          next: { running: command.running, held: command.held },
        });
        return transaction.complete();
      }
      // The single time verb: fold the pending hold first (none in this
      // fixture), then settle every declared monitor in declaration order.
      const settlement = settleMonitorsV1({
        declarations: watchDeclarationsV1,
        accumulator: snapshot.state.simulation.monitors.accumulator,
        elapsedMs: command.elapsedMs,
        state: snapshot.state,
      });
      transaction.emit({ kind: "watch.monitors_set", next: settlement.accumulator });
      for (const event of settlement.events) {
        transaction.emit(event);
      }
      return transaction.complete();
    },
  );
  if (attempt.result.kind !== "committed") {
    throw new Error(`watch command did not commit: ${attempt.result.kind}`);
  }
  return { snapshot: attempt.result.snapshot, events: attempt.result.events };
}

function playWatchScriptV1(commands: readonly WatchCommandV1[]): {
  readonly state: WatchStateV1;
  readonly digest: string;
} {
  const runner = createWatchRunnerV1();
  let snapshot = initialWatchSnapshotV1();
  for (const command of commands) {
    snapshot = executeWatchCommandV1(runner, snapshot, command).snapshot;
  }
  return {
    state: snapshot.state,
    digest: digestCanonical("sillymaker:state-contract:v1", snapshot.state),
  };
}

describe("monitor acceptance story", () => {
  it("settles {500,500,500} and {1500} to the same terminal digest and gauge", () => {
    const start: WatchCommandV1 = { kind: "watch.set_flags", running: true, held: false };
    const split = playWatchScriptV1([
      start,
      { kind: "watch.time", elapsedMs: 500 },
      { kind: "watch.time", elapsedMs: 500 },
      { kind: "watch.time", elapsedMs: 500 },
    ]);
    const single = playWatchScriptV1([start, { kind: "watch.time", elapsedMs: 1500 }]);
    expect(split.state.simulation.gauge.alerts).toBe(3);
    expect(split.state.simulation.monitors.accumulator).toEqual({ "watch.alert": 1500 });
    expect(split.digest).toBe(single.digest);
  });

  it("emits crossing events in declaration order inside one commit", () => {
    const runner = createWatchRunnerV1();
    let snapshot = initialWatchSnapshotV1();
    snapshot = executeWatchCommandV1(runner, snapshot, {
      kind: "watch.set_flags",
      running: true,
      held: true,
    }).snapshot;
    const { events } = executeWatchCommandV1(runner, snapshot, {
      kind: "watch.time",
      elapsedMs: 1500,
    });
    expect(events.map((event) => event.kind)).toEqual([
      "watch.monitors_set",
      "watch.alert_crossed",
      "watch.alert_crossed",
      "watch.alert_crossed",
      "watch.charge_crossed",
      "watch.charge_crossed",
    ]);
  });

  it("clear retention restarts from zero after an inactive settlement", () => {
    const result = playWatchScriptV1([
      { kind: "watch.set_flags", running: true, held: false },
      { kind: "watch.time", elapsedMs: 800 }, // acc 800, one crossing at 500
      { kind: "watch.set_flags", running: false, held: false },
      { kind: "watch.time", elapsedMs: 500 }, // inactive: clear drops the 800
      { kind: "watch.set_flags", running: true, held: false },
      { kind: "watch.time", elapsedMs: 400 }, // fresh 0 -> 400, no crossing
    ]);
    expect(result.state.simulation.gauge.alerts).toBe(1);
    expect(result.state.simulation.monitors.accumulator).toEqual({ "watch.alert": 400 });
  });

  it("retain retention resumes the accumulation where it left off", () => {
    const result = playWatchScriptV1([
      { kind: "watch.set_flags", running: false, held: true },
      { kind: "watch.time", elapsedMs: 500 }, // charge 500, no crossing of 700
      { kind: "watch.set_flags", running: false, held: false },
      { kind: "watch.time", elapsedMs: 9999 }, // inactive: retained at 500
      { kind: "watch.set_flags", running: false, held: true },
      { kind: "watch.time", elapsedMs: 300 }, // 500 -> 800 crosses 700 once
    ]);
    expect(result.state.simulation.gauge.charges).toBe(1);
    expect(result.state.simulation.monitors.accumulator).toEqual({ "watch.charge": 800 });
  });

  it("a mid-gauge save/load resumes to the same terminal digest", () => {
    const script: readonly WatchCommandV1[] = [
      { kind: "watch.set_flags", running: true, held: true },
      { kind: "watch.time", elapsedMs: 300 },
    ];
    const uninterrupted = playWatchScriptV1([
      ...script,
      { kind: "watch.time", elapsedMs: 400 },
    ]);

    const runner = createWatchRunnerV1();
    let snapshot = initialWatchSnapshotV1();
    for (const command of script) {
      snapshot = executeWatchCommandV1(runner, snapshot, command).snapshot;
    }
    // Save: the accumulator is plain data inside the state, so a canonical
    // JSON round-trip is the persistence boundary for this fixture.
    const saved = JSON.parse(JSON.stringify(snapshot)) as WatchSnapshotV1;
    const loadedRunner = createWatchRunnerV1();
    const resumed = executeWatchCommandV1(loadedRunner, {
      ...saved,
      commandSequence: parseNonNegativeSafeInteger(saved.commandSequence),
      integrity: snapshot.integrity,
    }, { kind: "watch.time", elapsedMs: 400 });

    expect(resumed.snapshot.state.simulation.gauge.alerts).toBe(1);
    expect(digestCanonical("sillymaker:state-contract:v1", resumed.snapshot.state)).toBe(
      uninterrupted.digest,
    );
  });

  it("interleaved flag flips and ticks replay to the pinned terminal state", () => {
    const script: readonly WatchCommandV1[] = [
      { kind: "watch.set_flags", running: true, held: false },
      { kind: "watch.time", elapsedMs: 400 }, // alert 400 (no crossing); charge inactive
      { kind: "watch.set_flags", running: true, held: true },
      { kind: "watch.time", elapsedMs: 650 }, // alert 400->1050 crosses 500, 1000; charge 650
      { kind: "watch.set_flags", running: false, held: true },
      { kind: "watch.time", elapsedMs: 200 }, // alert clears; charge 650->850 crosses 700
      { kind: "watch.time", elapsedMs: 1000 }, // charge 850->1850 crosses 1400
    ];
    const first = playWatchScriptV1(script);
    expect(first.state.simulation.gauge).toEqual({ alerts: 2, charges: 2 });
    expect(first.state.simulation.monitors.accumulator).toEqual({ "watch.charge": 1850 });
    expect(playWatchScriptV1(script).digest).toBe(first.digest);
  });
});

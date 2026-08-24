// SPDX-License-Identifier: MIT
import { z } from "zod";

import type { MonitorAccumulatorV1, MonitorDeclarationV1, RuntimeSchemaV1 } from "@sillymaker/base";
import {
  anyRealtimeMonitorActiveV1,
  parseMonitorAccumulatorV1,
  parseMonitorDeclarationsV1,
} from "@sillymaker/base";
import { createRuntimeSchemaV1 } from "@sillymaker/base/authoring/runtime-schema";

import type { LabNarrativeStateV1 } from "./narrative.ts";
import { labDrillChamberNodeIdV1, labDrillDecisionDefinitionIdV1 } from "./narrative.ts";

/**
 * The Lab's authoritative monitors: the conformance rig for the three
 * declared archetypes, one declaration each.
 *
 * - The **decision gauge** charges while the drill decision menu is
 *   pending — a realtime reaction span, so the Host pins the presentation
 *   rate to 1x while it runs. Releasing the pulse converts the charge to
 *   credits; venting discards it.
 * - The **ambient igniter** self-fires while the drill chamber say is on
 *   screen — the scene-scoped span gated purely by narrative position.
 * - The **collector drip** accumulates while the collector toggle is
 *   engaged, across whatever interactions come and go — the
 *   pending-independent continuous span, with `retain` so disengaging
 *   keeps the partial progress.
 *
 * Declarations are code (admitted once at module load); the accumulator
 * and every crossing counter live in the `lab.monitors` state slice like
 * any other versioned Story data.
 */

export interface LabMonitorsStateV1 {
  /** Accumulated milliseconds per monitor id (engine settlement state). */
  readonly accumulator: MonitorAccumulatorV1;
  /** Gauge crossings since the drill decision opened; 0 after capture. */
  readonly gaugeLevel: number;
  /** Lifetime ambient self-ignitions while the chamber say was up. */
  readonly ambientIgnitions: number;
  /** Whether the sample collector is engaged (the drip predicate). */
  readonly collectorEngaged: boolean;
  /** Lifetime units dripped by the engaged collector. */
  readonly collectorUnits: number;
}

export function createInitialLabMonitorsStateV1(): LabMonitorsStateV1 {
  return ({
    accumulator: {},
    gaugeLevel: 0,
    ambientIgnitions: 0,
    collectorEngaged: false,
    collectorUnits: 0,
  });
}

export const labMonitorsStateSchemaV1: RuntimeSchemaV1<LabMonitorsStateV1> = createRuntimeSchemaV1(
  {
    parse(value: unknown): LabMonitorsStateV1 {
      const record = z
        .strictObject({
          accumulator: z.unknown(),
          gaugeLevel: z.number().int().nonnegative(),
          ambientIgnitions: z.number().int().nonnegative(),
          collectorEngaged: z.boolean(),
          collectorUnits: z.number().int().nonnegative(),
        })
        .parse(value);
      return ({
        accumulator: parseMonitorAccumulatorV1(record.accumulator, "/accumulator"),
        gaugeLevel: record.gaugeLevel,
        ambientIgnitions: record.ambientIgnitions,
        collectorEngaged: record.collectorEngaged,
        collectorUnits: record.collectorUnits,
      });
    },
  },
  { subject: { kind: "module", id: "lab.monitors" } },
);

/**
 * Crossing payloads declared on the monitors; the simulation folds them
 * into its domain-event union and the `lab.monitors` reducers count them.
 */
export type LabMonitorCrossingEventV1 =
  | { readonly kind: "lab.gauge_charged" }
  | { readonly kind: "lab.ambient_ignited" }
  | { readonly kind: "lab.collector_dripped" };

/**
 * What the monitor predicates read: a structural slice of the simulation
 * state, so declarations stay decoupled from the full Story state shape.
 */
export interface LabMonitorGateViewV1 {
  readonly narrative: LabNarrativeStateV1;
  readonly monitors: LabMonitorsStateV1;
}

export const labGaugeMonitorIdV1 = "monitor.e2e.gauge";
export const labAmbientMonitorIdV1 = "monitor.e2e.ambient";
export const labCollectorMonitorIdV1 = "monitor.e2e.collector";

export const labGaugeEveryMsV1 = 200;
export const labAmbientEveryMsV1 = 300;
export const labCollectorEveryMsV1 = 250;

export const labMonitorDeclarationsV1: readonly MonitorDeclarationV1<
  LabMonitorGateViewV1,
  LabMonitorCrossingEventV1
>[] = parseMonitorDeclarationsV1([
  {
    id: labGaugeMonitorIdV1,
    everyMs: labGaugeEveryMsV1,
    retention: "clear",
    pace: "realtime",
    event: { kind: "lab.gauge_charged" },
    activeWhen: (state) =>
      state.narrative.pending !== null &&
      state.narrative.pending.definitionId === labDrillDecisionDefinitionIdV1,
  },
  {
    id: labAmbientMonitorIdV1,
    everyMs: labAmbientEveryMsV1,
    retention: "clear",
    event: { kind: "lab.ambient_ignited" },
    activeWhen: (state) => state.narrative.cursor === labDrillChamberNodeIdV1,
  },
  {
    id: labCollectorMonitorIdV1,
    everyMs: labCollectorEveryMsV1,
    retention: "retain",
    event: { kind: "lab.collector_dripped" },
    activeWhen: (state) => state.monitors.collectorEngaged,
  },
]);

/** Whether any monitor wants session time — the Host reporting gate. */
export function labMonitorReportingActiveV1(state: LabMonitorGateViewV1): boolean {
  return labMonitorDeclarationsV1.some((declaration) => declaration.activeWhen(state));
}

/** Whether a realtime-pace monitor is up — the Host rate-pin gate. */
export function labMonitorRealtimeActiveV1(state: LabMonitorGateViewV1): boolean {
  return anyRealtimeMonitorActiveV1(labMonitorDeclarationsV1, state);
}

/** Structural equality so a no-change settlement emits no journal entry. */
export function labMonitorAccumulatorEqualV1(
  a: MonitorAccumulatorV1,
  b: MonitorAccumulatorV1,
): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => Object.hasOwn(b, key) && a[key] === b[key]);
}

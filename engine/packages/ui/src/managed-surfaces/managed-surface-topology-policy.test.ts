// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import {
  type ManagedSurfaceTopologyPolicyProjectionInternalV1,
  type ManagedSurfaceTopologyPolicyRowInternalV1,
  projectManagedSurfaceTopologyPolicyInternalV1,
} from "./managed-surface-topology-policy.ts";

type LifecycleV1 = ManagedSurfaceTopologyPolicyRowInternalV1<object>["lifecycle"];

function subjectV1(label: string): object {
  return { label };
}

function rowV1<TSubject extends object>(
  subject: TSubject,
  layerOrder: number,
  lifecycle: LifecycleV1 = "ready",
  blocksLower = false,
): ManagedSurfaceTopologyPolicyRowInternalV1<TSubject> {
  return {
    subject,
    layerOrder: parseNonNegativeSafeInteger(layerOrder),
    lifecycle,
    blocksLower,
  };
}

function phasesV1<TSubject extends object>(
  projection: readonly ManagedSurfaceTopologyPolicyProjectionInternalV1<TSubject>[],
): readonly ManagedSurfaceTopologyPolicyProjectionInternalV1<TSubject>["phase"][] {
  return projection.map(({ phase }) => phase);
}

describe("managed surface topology policy", () => {
  it("stably orders by layer and supplied preorder while preserving subject identity", () => {
    const opaqueSubject = {};
    const sameLayerFirst = subjectV1("same-layer-first");
    const sameLayerSecond = subjectV1("same-layer-second");
    const lowest = subjectV1("lowest");
    const rows = [
      rowV1(opaqueSubject, 30),
      rowV1(sameLayerFirst, 10),
      rowV1(sameLayerSecond, 10),
      rowV1(lowest, 0),
    ];
    const originalOrder = [...rows];

    const projection = projectManagedSurfaceTopologyPolicyInternalV1(rows);

    expect(projection).toHaveLength(4);
    expect(projection[0]?.subject).toBe(lowest);
    expect(projection[1]?.subject).toBe(sameLayerFirst);
    expect(projection[2]?.subject).toBe(sameLayerSecond);
    expect(projection[3]?.subject).toBe(opaqueSubject);
    expect(phasesV1(projection)).toEqual(["active", "active", "active", "active"]);
    originalOrder.forEach((row, index) => expect(rows[index]).toBe(row));
  });

  it("suspends only ready rows below the last blocker and leaves preparations preparing", () => {
    const rows = Object.freeze([
      rowV1(subjectV1("lower-ready"), 0),
      rowV1(subjectV1("lower-fallback"), 10, "preparing", true),
      rowV1(subjectV1("middle-ready"), 20),
      rowV1(subjectV1("topmost-blocker"), 30, "ready", true),
      rowV1(subjectV1("higher-ready"), 40),
      rowV1(subjectV1("higher-preparation"), 50, "preparing"),
    ]);

    expect(phasesV1(projectManagedSurfaceTopologyPolicyInternalV1(rows))).toEqual([
      "suspended",
      "preparing",
      "suspended",
      "active",
      "active",
      "preparing",
    ]);
  });

  it.each([
    {
      label: "initial or child blocking fallback",
      blocksLower: true,
      lowerPhase: "suspended" as const,
    },
    {
      label: "hidden primary replacement preparation",
      blocksLower: false,
      lowerPhase: "active" as const,
    },
  ])("lets the caller express $label", ({ blocksLower, lowerPhase }) => {
    const lower = subjectV1("retained-visible-runtime");
    const candidate = subjectV1("preparing-candidate");
    const projection = projectManagedSurfaceTopologyPolicyInternalV1(Object.freeze([
      rowV1(lower, 0),
      rowV1(candidate, 20, "preparing", blocksLower),
    ]));

    expect(projection[0]?.subject).toBe(lower);
    expect(projection[0]?.phase).toBe(lowerPhase);
    expect(projection[1]?.subject).toBe(candidate);
    expect(projection[1]?.phase).toBe("preparing");
  });

  it("uses supplied equal-layer order rather than inventing an identity tie-breaker", () => {
    const first = subjectV1("first");
    const blocker = subjectV1("blocker");
    const last = subjectV1("last");

    const blockerInTheMiddle = projectManagedSurfaceTopologyPolicyInternalV1(Object.freeze([
      rowV1(first, 10),
      rowV1(blocker, 10, "ready", true),
      rowV1(last, 10),
    ]));
    expect(phasesV1(blockerInTheMiddle)).toEqual(["suspended", "active", "active"]);
    expect(blockerInTheMiddle[0]?.subject).toBe(first);
    expect(blockerInTheMiddle[1]?.subject).toBe(blocker);
    expect(blockerInTheMiddle[2]?.subject).toBe(last);

    const blockerFirst = projectManagedSurfaceTopologyPolicyInternalV1(Object.freeze([
      rowV1(blocker, 10, "ready", true),
      rowV1(first, 10),
      rowV1(last, 10),
    ]));
    expect(phasesV1(blockerFirst)).toEqual(["active", "active", "active"]);
    expect(blockerFirst[0]?.subject).toBe(blocker);
    expect(blockerFirst[1]?.subject).toBe(first);
    expect(blockerFirst[2]?.subject).toBe(last);
  });

  it("returns an empty projection without replacing or mutating the input", () => {
    const rows: readonly ManagedSurfaceTopologyPolicyRowInternalV1<object>[] = [];

    const projection = projectManagedSurfaceTopologyPolicyInternalV1(rows);

    expect(projection).toEqual([]);
  });

  it.each([
    ["negative zero", -0],
    ["negative", -1],
    ["fractional", 0.5],
    ["NaN", Number.NaN],
    ["positive infinity", Number.POSITIVE_INFINITY],
    ["negative infinity", Number.NEGATIVE_INFINITY],
    ["unsafe integer", Number.MAX_SAFE_INTEGER + 1],
  ])("fails closed for a $label layer order", (_label, layerOrder) => {
    const row = Object.freeze({
      subject: subjectV1("invalid-layer"),
      layerOrder,
      lifecycle: "ready",
      blocksLower: false,
    }) as unknown as ManagedSurfaceTopologyPolicyRowInternalV1<object>;

    expect(() => projectManagedSurfaceTopologyPolicyInternalV1(Object.freeze([row])))
      .toThrow(TypeError);
  });

  it.each([
    ["unknown lifecycle", { lifecycle: "active", blocksLower: false }],
    ["non-boolean blocker", { lifecycle: "ready", blocksLower: 1 }],
  ])("fails closed for $label", (_label, invalid) => {
    const row = Object.freeze({
      subject: subjectV1("invalid-row"),
      layerOrder: parseNonNegativeSafeInteger(0),
      ...invalid,
    }) as unknown as ManagedSurfaceTopologyPolicyRowInternalV1<object>;

    expect(() => projectManagedSurfaceTopologyPolicyInternalV1(Object.freeze([row])))
      .toThrow(TypeError);
  });

  it.each([
    ["null", null],
    ["string", "not-a-subject"],
    ["number", 1],
  ])("fails closed for a $label subject", (_label, subject) => {
    const row = Object.freeze({
      subject,
      layerOrder: parseNonNegativeSafeInteger(0),
      lifecycle: "ready",
      blocksLower: false,
    }) as unknown as ManagedSurfaceTopologyPolicyRowInternalV1<object>;

    expect(() => projectManagedSurfaceTopologyPolicyInternalV1(Object.freeze([row])))
      .toThrow(TypeError);
  });

  it("rejects duplicate exact subjects without coalescing distinct lookalikes", () => {
    const duplicate = subjectV1("duplicate");
    expect(() =>
      projectManagedSurfaceTopologyPolicyInternalV1(Object.freeze([
        rowV1(duplicate, 0),
        rowV1(duplicate, 10, "ready", true),
      ]))
    ).toThrow(TypeError);

    const first = subjectV1("lookalike");
    const second = subjectV1("lookalike");
    const projection = projectManagedSurfaceTopologyPolicyInternalV1(Object.freeze([
      rowV1(first, 0),
      rowV1(second, 0),
    ]));
    expect(projection[0]?.subject).toBe(first);
    expect(projection[1]?.subject).toBe(second);
  });
});

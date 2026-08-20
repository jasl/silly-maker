// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import {
  maxPersistenceSafepointSpanCommitsV1,
  parsePersistenceSafepointPolicyV1,
} from "./persistence-safepoint.ts";
import type { PersistenceSafepointClassificationV1 } from "./persistence-safepoint.ts";

interface ProbeStateV1 {
  readonly inFlight: boolean;
}

const classifyV1 = (state: ProbeStateV1): PersistenceSafepointClassificationV1 =>
  state.inFlight ? "in_flight" : "safepoint";

describe("parsePersistenceSafepointPolicyV1", () => {
  it("admits a bounded declaration and freezes it", () => {
    const policy = parsePersistenceSafepointPolicyV1<ProbeStateV1>({
      classify: classifyV1,
      maxInFlightCommits: 8,
    });
    expect(Object.isFrozen(policy)).toBe(true);
    expect(policy.maxInFlightCommits).toBe(8);
    expect(policy.classify({ inFlight: true })).toBe("in_flight");
    expect(policy.classify({ inFlight: false })).toBe("safepoint");
  });

  it("admits the bound boundaries", () => {
    expect(
      parsePersistenceSafepointPolicyV1<ProbeStateV1>({
        classify: classifyV1,
        maxInFlightCommits: 1,
      }).maxInFlightCommits,
    ).toBe(1);
    expect(
      parsePersistenceSafepointPolicyV1<ProbeStateV1>({
        classify: classifyV1,
        maxInFlightCommits: maxPersistenceSafepointSpanCommitsV1,
      }).maxInFlightCommits,
    ).toBe(maxPersistenceSafepointSpanCommitsV1);
  });

  it.each([
    ["null", null, "object_expected at /persistenceSafepoint"],
    ["array", [], "object_expected at /persistenceSafepoint"],
    [
      "missing bound (unbounded span)",
      { classify: classifyV1 },
      "object_keys at /persistenceSafepoint",
    ],
    [
      "missing classifier",
      { maxInFlightCommits: 8 },
      "object_keys at /persistenceSafepoint",
    ],
    [
      "extra key",
      { classify: classifyV1, maxInFlightCommits: 8, pace: "cinematic" },
      "object_keys at /persistenceSafepoint",
    ],
    [
      "non-function classifier",
      { classify: "safepoint", maxInFlightCommits: 8 },
      "safepoint_classifier_invalid at /persistenceSafepoint/classify",
    ],
    [
      "undefined bound",
      { classify: classifyV1, maxInFlightCommits: undefined },
      "safepoint_bound_invalid at /persistenceSafepoint/maxInFlightCommits",
    ],
    [
      "zero bound",
      { classify: classifyV1, maxInFlightCommits: 0 },
      "safepoint_bound_invalid at /persistenceSafepoint/maxInFlightCommits",
    ],
    [
      "negative bound",
      { classify: classifyV1, maxInFlightCommits: -1 },
      "safepoint_bound_invalid at /persistenceSafepoint/maxInFlightCommits",
    ],
    [
      "fractional bound",
      { classify: classifyV1, maxInFlightCommits: 1.5 },
      "safepoint_bound_invalid at /persistenceSafepoint/maxInFlightCommits",
    ],
    [
      "bound above the cap",
      { classify: classifyV1, maxInFlightCommits: maxPersistenceSafepointSpanCommitsV1 + 1 },
      "safepoint_bound_invalid at /persistenceSafepoint/maxInFlightCommits",
    ],
    [
      "unsafe bound",
      { classify: classifyV1, maxInFlightCommits: Number.MAX_SAFE_INTEGER + 1 },
      "safepoint_bound_invalid at /persistenceSafepoint/maxInFlightCommits",
    ],
    [
      "NaN bound",
      { classify: classifyV1, maxInFlightCommits: Number.NaN },
      "safepoint_bound_invalid at /persistenceSafepoint/maxInFlightCommits",
    ],
  ])("rejects %s", (_label, candidate, message) => {
    expect(() => parsePersistenceSafepointPolicyV1(candidate as never)).toThrowError(message);
  });
});

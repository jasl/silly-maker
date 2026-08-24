// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { CanonicalJsonError } from "../contracts/canonical-json.ts";
import {
  admitCommandAttemptEvidenceInternalV1,
  admitDebugValidationResultInternalV1,
} from "./finalized-evidence-admission.ts";

function fixtureSnapshot(count = 0) {
  return { rng: { cursor: count }, commandSequence: count };
}

function fixtureDiagnostics(snapshot = fixtureSnapshot()) {
  return {
    committedRngBefore: snapshot.rng,
    attemptedDraws: [],
    candidateRngAfter: snapshot.rng,
    committedRngAfter: snapshot.rng,
  };
}

describe("finalized evidence admission", () => {
  it("normalizes committed evidence into detached canonical data", () => {
    const before = fixtureSnapshot();
    const event = { kind: "fixture.event", amount: 1 };
    const admitted = admitCommandAttemptEvidenceInternalV1(
      before,
      {
        result: { kind: "committed", snapshot: fixtureSnapshot(1), events: [event] },
        diagnostics: fixtureDiagnostics(before),
      },
      { parseEvent: (value) => ({ ...(value as typeof event), admitted: true }) },
    );

    expect(admitted.result.kind).toBe("committed");
    if (admitted.result.kind !== "committed") return;
    expect(admitted.result.events).toEqual([{ ...event, admitted: true }]);
    expect(admitted.result.events[0]).not.toBe(event);
  });

  it("preserves rejected and faulted non-commit Snapshot identity", () => {
    const before = fixtureSnapshot();
    const rejected = admitCommandAttemptEvidenceInternalV1(before, {
      result: { kind: "rejected", snapshot: before, reasons: [{ code: "fixture" }] },
      diagnostics: fixtureDiagnostics(before),
    });
    const faulted = admitCommandAttemptEvidenceInternalV1(before, {
      result: { kind: "faulted", snapshot: before, fault: { code: "fixture" } },
      diagnostics: fixtureDiagnostics(before),
    });

    expect(rejected.result.snapshot).toBe(before);
    expect(faulted.result.snapshot).toBe(before);
    expect(() =>
      admitCommandAttemptEvidenceInternalV1(before, {
        result: { kind: "rejected", snapshot: fixtureSnapshot(), reasons: [] },
        diagnostics: fixtureDiagnostics(before),
      })
    ).toThrow("Non-committed command attempt changed the Snapshot");
  });

  it("rejects non-canonical admitted evidence", () => {
    const before = fixtureSnapshot();
    expect(() =>
      admitCommandAttemptEvidenceInternalV1(before, {
        result: {
          kind: "committed",
          snapshot: fixtureSnapshot(1),
          events: [{ amount: 0.25 }],
        },
        diagnostics: fixtureDiagnostics(before),
      })
    ).toThrow(CanonicalJsonError);
  });

  it("normalizes Debug validation results without descriptor authentication", () => {
    expect(admitDebugValidationResultInternalV1({ kind: "allowed" }, undefined)).toEqual({
      kind: "allowed",
    });
    expect(
      admitDebugValidationResultInternalV1(
        { kind: "validation_failed", errors: [{ code: "raw" }] },
        (value) => ({ ...(value as { code: string }), admitted: true }),
      ),
    ).toEqual({
      kind: "validation_failed",
      errors: [{ code: "raw", admitted: true }],
    });
  });
});

// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { CanonicalJsonError } from "../contracts/canonical-json.ts";
import {
  acceptCoreTypedCommandAttemptInternalV1,
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
  it("admits public committed evidence into detached canonical data", () => {
    const before = fixtureSnapshot();
    const event = { kind: "fixture.event", amount: 1 };
    const admitted = admitCommandAttemptEvidenceInternalV1(
      before,
      {
        result: { kind: "committed", snapshot: fixtureSnapshot(1), events: [event] },
        diagnostics: fixtureDiagnostics(before),
      },
    );

    expect(admitted.result.kind).toBe("committed");
    if (admitted.result.kind !== "committed") return;
    expect(admitted.result.events).toEqual([event]);
    expect(admitted.result.events[0]).not.toBe(event);
  });

  it("trusts typed Core evidence while retaining result and Snapshot invariants", () => {
    const before = fixtureSnapshot();
    const event = { kind: "fixture.event", amount: 1 };
    const candidate = {
      result: { kind: "committed" as const, snapshot: fixtureSnapshot(1), events: [event] },
      diagnostics: fixtureDiagnostics(before),
    };
    let validated: unknown;

    const accepted = acceptCoreTypedCommandAttemptInternalV1(
      before,
      candidate,
      (snapshot) => {
        validated = snapshot;
      },
      (rejection) => rejection as { readonly code: string },
    );
    expect(accepted).toBe(candidate);
    expect(accepted.result.kind).toBe("committed");
    if (accepted.result.kind === "committed") expect(accepted.result.events[0]).toBe(event);
    expect(validated).toBe(candidate.result.snapshot);

    expect(() =>
      acceptCoreTypedCommandAttemptInternalV1(
        before,
        {
          result: { kind: "rejected", snapshot: fixtureSnapshot(), reasons: [] },
          diagnostics: fixtureDiagnostics(before),
        },
        undefined,
        (rejection) => rejection as { readonly code: string },
      )
    ).toThrow("Non-committed command attempt changed the Snapshot");
    expect(() =>
      acceptCoreTypedCommandAttemptInternalV1(
        before,
        candidate,
        undefined,
        (rejection) => rejection as { readonly code: string },
        {
          kind: "require",
          resultKind: "faulted",
          message: "fallback must fault",
        },
      )
    ).toThrow("fallback must fault");
    expect(() =>
      acceptCoreTypedCommandAttemptInternalV1(
        before,
        {
          result: { kind: "unknown", snapshot: before },
          diagnostics: fixtureDiagnostics(before),
        } as never,
        undefined,
        (rejection) => rejection as { readonly code: string },
      )
    ).toThrow("Command attempt result has an invalid kind");
  });

  it("normalizes each Core rejection once at the Story executor boundary", () => {
    const before = fixtureSnapshot();
    const raw = { code: " fixture " };
    let parses = 0;
    const accepted = acceptCoreTypedCommandAttemptInternalV1(
      before,
      {
        result: { kind: "rejected", snapshot: before, reasons: [raw] },
        diagnostics: fixtureDiagnostics(before),
      },
      undefined,
      (value) => {
        parses += 1;
        return { code: (value as { readonly code: string }).code.trim() };
      },
    );

    expect(parses).toBe(1);
    expect(accepted.result).toMatchObject({
      kind: "rejected",
      reasons: [{ code: "fixture" }],
    });
    expect(accepted.result.snapshot).toBe(before);
    expect(accepted.diagnostics).toBeDefined();
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
    const parsed = { code: "raw", admitted: true };
    const admitted = admitDebugValidationResultInternalV1(
      { kind: "validation_failed", errors: [{ code: "raw" }] },
      () => parsed,
    );
    expect(admitted).toEqual({
      kind: "validation_failed",
      errors: [{ code: "raw", admitted: true }],
    });
    if (admitted.kind === "validation_failed") expect(admitted.errors[0]).toBe(parsed);
  });
});

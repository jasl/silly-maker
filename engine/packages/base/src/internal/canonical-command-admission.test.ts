// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { CanonicalJsonError, canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { admitCanonicalCommandInternalV1 } from "./canonical-command-admission.ts";
import { createPurposeTaggedSnapshotWorkCounterV1 } from "./snapshot-work-instrumentation.ts";

describe("canonical command admission", () => {
  it("returns one detached canonical projection", () => {
    const raw = {
      kind: "fixture.command" as const,
      payload: [{ value: 1 }],
    };
    const counter = createPurposeTaggedSnapshotWorkCounterV1();

    const admitted = admitCanonicalCommandInternalV1(raw, counter.instrumentation);

    expect(admitted).toEqual(raw);
    expect(admitted).not.toBe(raw);
    expect(admitted.payload).not.toBe(raw.payload);
    expect(admitted.payload[0]).not.toBe(raw.payload[0]);
    expect(canonicalJsonBytes(admitted)).toEqual(canonicalJsonBytes(raw));
    expect(counter.snapshot()).toMatchObject({
      commandAdmissionCanonicalTraversals: 1,
      totalPhysicalCanonicalTraversals: 1,
    });
  });

  it("rejects non-canonical command data at the ingress", () => {
    let failure: unknown;
    try {
      admitCanonicalCommandInternalV1({ kind: "fixture.command", amount: 0.25 });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(CanonicalJsonError);
    expect(failure).toMatchObject({ code: "number.not_integer", path: "/amount" });
  });
});

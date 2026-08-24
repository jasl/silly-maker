// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { CanonicalJsonError, canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { createPurposeTaggedSnapshotWorkCounterV1 } from "./snapshot-work-instrumentation.ts";
import { admitCanonicalBootstrapInternalV1 } from "./canonical-bootstrap-admission.ts";

describe("admitCanonicalBootstrapInternalV1", () => {
  it("creates one detached canonical projection for the bootstrap handoff", () => {
    const counter = createPurposeTaggedSnapshotWorkCounterV1();
    const nested = { count: 1 };
    const bootstrap = {
      rngSeed: 97,
      first: nested,
      second: nested,
      labels: ["猫", "cafe"],
    };
    const expectedBytes = canonicalJsonBytes(bootstrap);

    const admitted = admitCanonicalBootstrapInternalV1(
      bootstrap,
      counter.instrumentation,
    );

    expect(admitted).toEqual(bootstrap);
    expect(admitted).not.toBe(bootstrap);
    expect(admitted.first).not.toBe(nested);
    expect(admitted.second).not.toBe(nested);
    expect(admitted.first).not.toBe(admitted.second);
    expect(canonicalJsonBytes(admitted)).toEqual(expectedBytes);
    expect(counter.snapshot().bootstrapAdmissionCanonicalTraversals).toBe(1);
  });

  it.each([
    {
      label: "fractional number",
      value: { rngSeed: 97, invalid: 0.25 },
      code: "number.not_integer",
      path: "/invalid",
    },
    {
      label: "undefined member",
      value: { rngSeed: 97, invalid: undefined },
      code: "value.undefined",
      path: "/invalid",
    },
    {
      label: "sparse array",
      value: (() => {
        const invalid: unknown[] = [];
        invalid.length = 1;
        return { rngSeed: 97, invalid };
      })(),
      code: "value.sparse_array",
      path: "/invalid/0",
    },
  ])("rejects canonical-invalid bootstrap data: $label", ({ value, code, path }) => {
    const counter = createPurposeTaggedSnapshotWorkCounterV1();

    let error: unknown;
    try {
      admitCanonicalBootstrapInternalV1(value, counter.instrumentation);
    } catch (cause) {
      error = cause;
    }
    expect(error).toBeInstanceOf(CanonicalJsonError);
    expect(error).toMatchObject({ code, path });
    expect(counter.snapshot().bootstrapAdmissionCanonicalTraversals).toBe(1);
  });
});

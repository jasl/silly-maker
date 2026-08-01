// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  authoritativeDeterminismTraceExpectedV1,
  collectAuthoritativeDeterminismTraceV1,
} from "../testing/authoritative-determinism-driver.ts";

const fixedBootstrapInputV1 = Object.freeze({
  schemaVersion: 1 as const,
  rngSeed: 97,
});

describe("authoritative determinism runtime trace", () => {
  it("matches the exact compact Deno baseline", async () => {
    const trace = await collectAuthoritativeDeterminismTraceV1(fixedBootstrapInputV1);

    expect(trace).toEqual(authoritativeDeterminismTraceExpectedV1);
    expect(JSON.stringify(trace)).toBe(JSON.stringify(authoritativeDeterminismTraceExpectedV1));
    expect(JSON.parse(JSON.stringify(trace))).toEqual(authoritativeDeterminismTraceExpectedV1);
  });

  it("rejects malformed or non-ordinary bootstrap values before Session construction", async () => {
    await expect(
      collectAuthoritativeDeterminismTraceV1(
        Object.freeze({ schemaVersion: 1, rngSeed: 97, extra: true }) as never,
      ),
    ).rejects.toThrow("invalid authoritative determinism bootstrap input");
    await expect(
      collectAuthoritativeDeterminismTraceV1(
        Object.assign(Object.create(null), { schemaVersion: 1, rngSeed: 97 }),
      ),
    ).rejects.toThrow("invalid authoritative determinism bootstrap input");
    await expect(
      collectAuthoritativeDeterminismTraceV1(
        Object.freeze({ schemaVersion: 1, rngSeed: 0 }),
      ),
    ).rejects.toThrow("invalid NonZeroUint32");
  });
});

// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  authoritativeDeterminismTraceExpectedV1,
  collectAuthoritativeDeterminismTraceV1,
} from "../tooling/authoritative-determinism-trace.ts";

describe("authoritative determinism runtime trace", () => {
  it("matches the exact compact Deno baseline", async () => {
    const trace = await collectAuthoritativeDeterminismTraceV1();

    expect(trace).toEqual(authoritativeDeterminismTraceExpectedV1);
    expect(JSON.parse(JSON.stringify(trace))).toEqual(authoritativeDeterminismTraceExpectedV1);
  });
});

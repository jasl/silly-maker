// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.ts";

test.describe("authoritative determinism browser trace", () => {
  test("installed desktop browsers match the exact Deno tooling vector", async ({
    page,
  }, testInfo) => {
    expect(["chromium", "webkit"]).toContain(testInfo.project.name);
    await gotoLabV1(page);

    const traces = await page.evaluate(async (specifier) => {
      const module = await import(specifier) as {
        readonly authoritativeDeterminismTraceExpectedV1: unknown;
        collectAuthoritativeDeterminismTraceV1(input: {
          readonly schemaVersion: 1;
          readonly rngSeed: number;
        }): Promise<unknown>;
      };
      return {
        actual: await module.collectAuthoritativeDeterminismTraceV1({
          schemaVersion: 1,
          rngSeed: 97,
        }),
        expected: module.authoritativeDeterminismTraceExpectedV1,
      };
    }, "/src/tooling/authoritative-determinism-trace.ts");

    expect(traces.actual).toEqual(traces.expected);
    expect(JSON.stringify(traces.actual)).toBe(JSON.stringify(traces.expected));
  });
});

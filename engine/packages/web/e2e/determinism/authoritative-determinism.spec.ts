// SPDX-License-Identifier: MIT
import { expect, test } from "../../../../../scripts/testing/playwright-test.ts";

interface BrowserTripwireResultV1 {
  readonly workerTerminations: number;
  readonly result: {
    readonly kind: string;
    readonly value?: unknown;
  };
}

interface BrowserDeterminismObservationV1 {
  readonly tripwire: BrowserTripwireResultV1;
  readonly tripwireExpected: unknown;
  readonly matrix: {
    readonly actual: unknown;
    readonly expected: unknown;
    readonly divergence: unknown;
  };
}

test("matches the guarded authoritative vectors", async ({ page }, testInfo) => {
  const project = testInfo.project.name;
  const repeat = testInfo.repeatEachIndex + 1;
  const label = `${project} repeat ${String(repeat)}`;

  await page.goto("/");
  const observation = await page.evaluate(
    async (input): Promise<BrowserDeterminismObservationV1> => {
      const { project: runtimeProject, repeat: runtimeRepeat, specifier } = input;
      const matrix = await import(specifier) as {
        readonly authoritativeDeterminismMatrixExpectedV1: unknown;
        readonly authoritativeDeterminismTraceExpectedV1: unknown;
        collectAuthoritativeDeterminismMatrixV1(): Promise<unknown>;
        compareAuthoritativeDeterminismMatrixV1(input: {
          readonly project: string;
          readonly repeat: number;
          readonly expected: unknown;
          readonly actual: unknown;
        }): unknown;
        runAuthoritativeDeterminismTripwireV1(input: {
          readonly bootstrapInput: { readonly schemaVersion: 1; readonly rngSeed: number };
          readonly scenario: "trace";
        }): Promise<BrowserTripwireResultV1>;
      };
      const tripwire = await matrix.runAuthoritativeDeterminismTripwireV1({
        bootstrapInput: Object.freeze({ schemaVersion: 1, rngSeed: 97 }),
        scenario: "trace",
      });
      const actual = await matrix.collectAuthoritativeDeterminismMatrixV1();
      return {
        tripwire,
        tripwireExpected: matrix.authoritativeDeterminismTraceExpectedV1,
        matrix: {
          actual,
          expected: matrix.authoritativeDeterminismMatrixExpectedV1,
          divergence: matrix.compareAuthoritativeDeterminismMatrixV1({
            project: runtimeProject,
            repeat: runtimeRepeat,
            expected: matrix.authoritativeDeterminismMatrixExpectedV1,
            actual,
          }),
        },
      };
    },
    {
      project,
      repeat,
      specifier: "/src/tooling/authoritative-determinism-matrix.ts",
    },
  );

  expect(observation.tripwire.workerTerminations, `${label}: Worker termination`).toBe(1);
  expect(observation.tripwire.result.kind, `${label}: tripwire result`).toBe("passed");
  expect(observation.tripwire.result.value, `${label}: tripwire value`).toEqual(
    observation.tripwireExpected,
  );
  expect(
    JSON.stringify(observation.tripwire.result.value),
    `${label}: tripwire exact JSON`,
  ).toBe(JSON.stringify(observation.tripwireExpected));
  expect(observation.matrix.divergence, `${label}: first matrix divergence`).toBeNull();
  expect(observation.matrix.actual, `${label}: matrix value`).toEqual(observation.matrix.expected);
  expect(JSON.stringify(observation.matrix.actual), `${label}: matrix exact JSON`).toBe(
    JSON.stringify(observation.matrix.expected),
  );
});

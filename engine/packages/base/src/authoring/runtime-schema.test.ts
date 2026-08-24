// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AuthoringDiagnosticErrorV1 } from "../contracts/diagnostic-envelope.ts";
import { createRuntimeSchemaV1, fromStandardSchemaV1 } from "./runtime-schema.ts";

function diagnosticsOfV1(run: () => unknown) {
  try {
    run();
  } catch (error) {
    if (error instanceof AuthoringDiagnosticErrorV1) return error.diagnostics;
    throw error;
  }
  throw new Error("expected the schema to throw");
}

describe("createRuntimeSchemaV1", () => {
  const schema = createRuntimeSchemaV1(
    {
      parse(value: unknown): { readonly count: number } {
        if (
          value === null ||
          typeof value !== "object" ||
          typeof (value as { count?: unknown }).count !== "number"
        ) {
          throw new TypeError("count must be a number");
        }
        return { count: (value as { count: number }).count };
      },
    },
    { subject: { kind: "module", id: "lab.samples" } },
  );

  it("returns canonical output for a legal value", () => {
    const parsed = schema.parse({ count: 3 });
    expect(parsed).toEqual({ count: 3 });
  });

  it("wraps parse failures into a stable diagnostic with the subject", () => {
    const diagnostics = diagnosticsOfV1(() => schema.parse({ count: "three" }));
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "authoring.schema.invalid_value",
        phase: "definition",
        message: "count must be a number",
        subject: { kind: "module", id: "lab.samples" },
      }),
    ]);
  });

  it("rejects non-canonical outputs with a pointer to the offending value", () => {
    const diagnostics = diagnosticsOfV1(() =>
      createRuntimeSchemaV1({
        parse: () => ({ ratio: 0.5 }),
      }).parse({})
    );
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "authoring.schema.not_canonical_json",
        location: { jsonPointer: "/ratio" },
        details: { canonicalCode: "number.not_integer" },
      }),
    ]);
  });

  it("lets structured diagnostics from the inner parse pass through unchanged", () => {
    const inner = createRuntimeSchemaV1({
      parse(): never {
        throw new TypeError("inner failure");
      },
    });
    const outer = createRuntimeSchemaV1({ parse: (value) => inner.parse(value) });
    const diagnostics = diagnosticsOfV1(() => outer.parse({}));
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toBe("inner failure");
  });
});

describe("fromStandardSchemaV1 (official Zod adapter)", () => {
  const labState = z.strictObject({
    collected: z.number().int().nonnegative(),
    tags: z.array(z.string().min(1)),
  });

  it("parses through Zod and returns canonical output", () => {
    const schema = fromStandardSchemaV1(labState);
    const parsed = schema.parse({ collected: 2, tags: ["stable"] });
    expect(parsed).toEqual({ collected: 2, tags: ["stable"] });
  });

  it("reports one diagnostic per issue with JSON pointers", () => {
    const schema = fromStandardSchemaV1(labState, {
      subject: { kind: "module", id: "lab.samples" },
    });
    const diagnostics = diagnosticsOfV1(() =>
      schema.parse({ collected: -1, tags: ["", "ok"], extra: true })
    );
    expect(diagnostics.length).toBeGreaterThanOrEqual(3);
    const pointers = diagnostics.map((diagnostic) => diagnostic.location?.jsonPointer);
    expect(pointers).toContain("/collected");
    expect(pointers).toContain("/tags/0");
    for (const diagnostic of diagnostics) {
      expect(diagnostic.code).toBe("authoring.schema.invalid_value");
      expect(diagnostic.subject).toEqual({ kind: "module", id: "lab.samples" });
    }
  });

  it("rejects async standard schemas with a stable diagnostic", () => {
    const schema = fromStandardSchemaV1(labState.refine(async () => true));
    const diagnostics = diagnosticsOfV1(() => schema.parse({ collected: 1, tags: [] }));
    expect(diagnostics).toEqual([
      expect.objectContaining({ code: "authoring.schema.async_unsupported" }),
    ]);
  });

  it("rejects non-canonical Zod outputs such as floats", () => {
    const schema = fromStandardSchemaV1(z.strictObject({ ratio: z.number() }));
    const diagnostics = diagnosticsOfV1(() => schema.parse({ ratio: 0.25 }));
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "authoring.schema.not_canonical_json",
        location: { jsonPointer: "/ratio" },
      }),
    ]);
  });
});

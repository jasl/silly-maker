// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "./canonical-json.ts";
import {
  AuthoringDiagnosticErrorV1,
  createDiagnosticV1,
  diagnosticEnvelopeV1Schema,
  extractDiagnosticsV1,
  formatDiagnosticHumanV1,
  formatDiagnosticsHumanV1,
  parseDiagnosticEnvelopeV1,
} from "./diagnostic-envelope.ts";

const fullEnvelopeV1 = {
  code: "authoring.schema.invalid_value",
  severity: "error" as const,
  phase: "definition" as const,
  message: "collected must be a non-negative integer",
  subject: { kind: "module", id: "lab.samples" },
  location: { jsonPointer: "/collected" },
  related: [
    {
      message: "declared here",
      location: { file: "src/gameplay/state.ts", line: 12 },
    },
  ],
  suggestion: "Use a non-negative safe integer.",
  docsId: "authoring.schemas",
  details: { expected: "non-negative integer" },
};

describe("DiagnosticEnvelopeV1", () => {
  it("parses a complete envelope", () => {
    const parsed = parseDiagnosticEnvelopeV1(fullEnvelopeV1);
    expect(parsed).toEqual(fullEnvelopeV1);
  });

  it("is itself Strict/Canonical JSON and round-trips through its own schema", () => {
    const parsed = parseDiagnosticEnvelopeV1(fullEnvelopeV1);
    expect(() => canonicalJsonBytes(parsed)).not.toThrow();
    const roundTripped = diagnosticEnvelopeV1Schema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(roundTripped).toEqual(parsed);
  });

  it.each([
    ["unknown field", { ...fullEnvelopeV1, extra: true }],
    ["invalid code format", { ...fullEnvelopeV1, code: "NotStable" }],
    ["single-segment code", { ...fullEnvelopeV1, code: "authoring" }],
    ["invalid severity", { ...fullEnvelopeV1, severity: "fatal" }],
    ["invalid phase", { ...fullEnvelopeV1, phase: "compile" }],
    ["empty message", { ...fullEnvelopeV1, message: "" }],
    ["non-object details", { ...fullEnvelopeV1, details: [] }],
    ["non-strict details", { ...fullEnvelopeV1, details: { at: 0.5 } }],
    ["bad pointer", { ...fullEnvelopeV1, location: { jsonPointer: "collected" } }],
  ])("rejects %s", (_label, value) => {
    expect(() => parseDiagnosticEnvelopeV1(value)).toThrowError(TypeError);
  });

  it("applies error/definition defaults through createDiagnosticV1", () => {
    const diagnostic = createDiagnosticV1({
      code: "authoring.module.duplicate_state_slot",
      message: "duplicate State slot in GameplayModule",
      subject: { kind: "module", id: "lab.samples" },
    });
    expect(diagnostic).toMatchObject({
      severity: "error",
      phase: "definition",
      details: {},
    });
  });

  it("carries validated diagnostics on AuthoringDiagnosticErrorV1 as a TypeError", () => {
    const error = new AuthoringDiagnosticErrorV1([fullEnvelopeV1]);
    expect(error).toBeInstanceOf(TypeError);
    expect(error.message).toBe(fullEnvelopeV1.message);
    expect(error.diagnostics).toHaveLength(1);
    expect(() => new AuthoringDiagnosticErrorV1([])).toThrowError(TypeError);
  });

  it("extracts diagnostics structurally and rejects malformed carriers", () => {
    const carrier = new AuthoringDiagnosticErrorV1([fullEnvelopeV1]);
    expect(extractDiagnosticsV1(carrier)).toEqual(carrier.diagnostics);
    expect(extractDiagnosticsV1(new Error("plain"))).toBeNull();
    expect(extractDiagnosticsV1({ diagnostics: [{ code: "broken" }] })).toBeNull();
    expect(extractDiagnosticsV1({ diagnostics: [] })).toBeNull();
    expect(extractDiagnosticsV1(null)).toBeNull();
  });

  it("formats human-readable lines with pointer, subject, and suggestion", () => {
    const line = formatDiagnosticHumanV1(parseDiagnosticEnvelopeV1(fullEnvelopeV1));
    expect(line).toContain("error authoring.schema.invalid_value:");
    expect(line).toContain("(at /collected)");
    expect(line).toContain("[module lab.samples]");
    expect(line).toContain("suggestion: Use a non-negative safe integer.");
    expect(
      formatDiagnosticsHumanV1([
        parseDiagnosticEnvelopeV1(fullEnvelopeV1),
        createDiagnosticV1({ code: "authoring.schema.async_unsupported", message: "async" }),
      ]).split("\n").length,
    ).toBeGreaterThanOrEqual(2);
  });
});

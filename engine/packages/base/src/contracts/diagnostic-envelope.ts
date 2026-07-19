// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "./canonical-json.js";
import { parseStrictJsonObject } from "./presentation-data.js";
import type { StrictJsonObjectV1 } from "./strict-json.js";
import type { RuntimeSchemaV1 } from "./values.js";

export type DiagnosticSeverityV1 = "error" | "warning" | "info";

export type DiagnosticPhaseV1 =
  | "definition"
  | "resolution"
  | "lint"
  | "build"
  | "scenario"
  | "runtime"
  | "presentation"
  | "asset"
  | "media";

export interface DiagnosticSubjectV1 {
  readonly kind: string;
  readonly id: string;
}

export interface DiagnosticLocationV1 {
  readonly file?: string;
  readonly line?: number;
  readonly column?: number;
  readonly jsonPointer?: string;
}

export interface DiagnosticRelatedLocationV1 {
  readonly message: string;
  readonly location: DiagnosticLocationV1;
}

/**
 * The shared, versioned diagnostic shape for every engine phase. Codes are
 * stable machine identifiers; messages may improve over time. `details` must
 * be Strict JSON so a diagnostic can always be serialized, aggregated, and
 * consumed by CLI/Agent surfaces without loss.
 */
export interface DiagnosticEnvelopeV1 {
  readonly code: string;
  readonly severity: DiagnosticSeverityV1;
  readonly phase: DiagnosticPhaseV1;
  readonly message: string;
  readonly subject?: DiagnosticSubjectV1;
  readonly location?: DiagnosticLocationV1;
  readonly related?: readonly DiagnosticRelatedLocationV1[];
  readonly suggestion?: string;
  readonly docsId?: string;
  readonly details: StrictJsonObjectV1;
}

const severitiesV1 = new Set<DiagnosticSeverityV1>(["error", "warning", "info"]);
const phasesV1 = new Set<DiagnosticPhaseV1>([
  "definition",
  "resolution",
  "lint",
  "build",
  "scenario",
  "runtime",
  "presentation",
  "asset",
  "media",
]);
const codePatternV1 = /^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/u;

const envelopeKeysV1 = new Set([
  "code",
  "severity",
  "phase",
  "message",
  "subject",
  "location",
  "related",
  "suggestion",
  "docsId",
  "details",
]);
const locationKeysV1 = new Set(["file", "line", "column", "jsonPointer"]);

function requireOwnedRecord(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length > 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throw new TypeError(`${label} accessors are forbidden`);
    }
  }
  return value as Record<string, unknown>;
}

function parseNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

function parseSubjectV1(value: unknown): DiagnosticSubjectV1 {
  const record = requireOwnedRecord(value, "diagnostic subject");
  if (Object.keys(record).toSorted().join("\0") !== "id\0kind") {
    throw new TypeError("invalid diagnostic subject fields");
  }
  return Object.freeze({
    kind: parseNonEmptyString(record.kind, "diagnostic subject kind"),
    id: parseNonEmptyString(record.id, "diagnostic subject id"),
  });
}

function parseLocationV1(value: unknown): DiagnosticLocationV1 {
  const record = requireOwnedRecord(value, "diagnostic location");
  const keys = Object.keys(record);
  if (keys.length === 0 || keys.some((key) => !locationKeysV1.has(key))) {
    throw new TypeError("invalid diagnostic location fields");
  }
  const location: {
    file?: string;
    line?: number;
    column?: number;
    jsonPointer?: string;
  } = {};
  if (record.file !== undefined) {
    location.file = parseNonEmptyString(record.file, "diagnostic location file");
  }
  for (const key of ["line", "column"] as const) {
    const raw = record[key];
    if (raw === undefined) continue;
    if (typeof raw !== "number" || !Number.isSafeInteger(raw) || raw < 1) {
      throw new TypeError(`invalid diagnostic location ${key}`);
    }
    location[key] = raw;
  }
  if (record.jsonPointer !== undefined) {
    const pointer = record.jsonPointer;
    if (typeof pointer !== "string" || (pointer !== "" && !pointer.startsWith("/"))) {
      throw new TypeError("invalid diagnostic location jsonPointer");
    }
    location.jsonPointer = pointer;
  }
  return Object.freeze(location);
}

function parseRelatedV1(value: unknown): readonly DiagnosticRelatedLocationV1[] {
  if (!Array.isArray(value)) throw new TypeError("invalid diagnostic related list");
  return Object.freeze(
    value.map((entry) => {
      const record = requireOwnedRecord(entry, "diagnostic related entry");
      if (Object.keys(record).toSorted().join("\0") !== "location\0message") {
        throw new TypeError("invalid diagnostic related entry fields");
      }
      return Object.freeze({
        message: parseNonEmptyString(record.message, "diagnostic related message"),
        location: parseLocationV1(record.location),
      });
    }),
  );
}

export function parseDiagnosticEnvelopeV1(value: unknown): DiagnosticEnvelopeV1 {
  const record = requireOwnedRecord(value, "diagnostic envelope");
  const keys = Object.keys(record);
  if (keys.some((key) => !envelopeKeysV1.has(key))) {
    throw new TypeError("unknown diagnostic envelope field");
  }
  const code = parseNonEmptyString(record.code, "diagnostic code");
  if (!codePatternV1.test(code)) throw new TypeError("invalid diagnostic code format");
  const severity = record.severity;
  if (typeof severity !== "string" || !severitiesV1.has(severity as DiagnosticSeverityV1)) {
    throw new TypeError("invalid diagnostic severity");
  }
  const phase = record.phase;
  if (typeof phase !== "string" || !phasesV1.has(phase as DiagnosticPhaseV1)) {
    throw new TypeError("invalid diagnostic phase");
  }
  let details: StrictJsonObjectV1;
  try {
    details = parseStrictJsonObject(record.details, "/details");
  } catch {
    throw new TypeError("invalid diagnostic details");
  }
  const envelope: {
    code: string;
    severity: DiagnosticSeverityV1;
    phase: DiagnosticPhaseV1;
    message: string;
    subject?: DiagnosticSubjectV1;
    location?: DiagnosticLocationV1;
    related?: readonly DiagnosticRelatedLocationV1[];
    suggestion?: string;
    docsId?: string;
    details: StrictJsonObjectV1;
  } = {
    code,
    severity: severity as DiagnosticSeverityV1,
    phase: phase as DiagnosticPhaseV1,
    message: parseNonEmptyString(record.message, "diagnostic message"),
    details,
  };
  if (record.subject !== undefined) envelope.subject = parseSubjectV1(record.subject);
  if (record.location !== undefined) envelope.location = parseLocationV1(record.location);
  if (record.related !== undefined) envelope.related = parseRelatedV1(record.related);
  if (record.suggestion !== undefined) {
    envelope.suggestion = parseNonEmptyString(record.suggestion, "diagnostic suggestion");
  }
  if (record.docsId !== undefined) {
    envelope.docsId = parseNonEmptyString(record.docsId, "diagnostic docsId");
  }
  // A diagnostic must always be serializable evidence: enforce canonical JSON.
  canonicalJsonBytes(envelope);
  return Object.freeze(envelope);
}

export const diagnosticEnvelopeV1Schema: RuntimeSchemaV1<DiagnosticEnvelopeV1> = Object.freeze({
  parse: parseDiagnosticEnvelopeV1,
});

export interface CreateDiagnosticInputV1 {
  readonly code: string;
  readonly message: string;
  readonly severity?: DiagnosticSeverityV1;
  readonly phase?: DiagnosticPhaseV1;
  readonly subject?: DiagnosticSubjectV1;
  readonly location?: DiagnosticLocationV1;
  readonly related?: readonly DiagnosticRelatedLocationV1[];
  readonly suggestion?: string;
  readonly docsId?: string;
  readonly details?: StrictJsonObjectV1;
}

export function createDiagnosticV1(input: CreateDiagnosticInputV1): DiagnosticEnvelopeV1 {
  return parseDiagnosticEnvelopeV1({
    code: input.code,
    severity: input.severity ?? "error",
    phase: input.phase ?? "definition",
    message: input.message,
    ...(input.subject === undefined ? {} : { subject: input.subject }),
    ...(input.location === undefined ? {} : { location: input.location }),
    ...(input.related === undefined ? {} : { related: input.related }),
    ...(input.suggestion === undefined ? {} : { suggestion: input.suggestion }),
    ...(input.docsId === undefined ? {} : { docsId: input.docsId }),
    details: input.details ?? {},
  });
}

/**
 * TypeError subclass so existing `instanceof TypeError` handling keeps
 * working while structured consumers read `.diagnostics`.
 */
export class AuthoringDiagnosticErrorV1 extends TypeError {
  override readonly name: string = "AuthoringDiagnosticError";
  readonly diagnostics: readonly DiagnosticEnvelopeV1[];

  constructor(diagnostics: readonly DiagnosticEnvelopeV1[], message?: string) {
    const parsed = Object.freeze(diagnostics.map(parseDiagnosticEnvelopeV1));
    const first = parsed[0];
    if (first === undefined) {
      throw new TypeError("AuthoringDiagnosticError requires at least one diagnostic");
    }
    super(message ?? first.message);
    this.diagnostics = parsed;
  }
}

/**
 * Reads a structurally valid diagnostics list from an arbitrary thrown value
 * without depending on class identity across module instances.
 */
export function extractDiagnosticsV1(error: unknown): readonly DiagnosticEnvelopeV1[] | null {
  if (error === null || typeof error !== "object") return null;
  const descriptor = Object.getOwnPropertyDescriptor(error, "diagnostics");
  if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
    return null;
  }
  const value = descriptor.value;
  if (!Array.isArray(value) || value.length === 0) return null;
  try {
    return Object.freeze(value.map(parseDiagnosticEnvelopeV1));
  } catch {
    return null;
  }
}

export function formatDiagnosticHumanV1(diagnostic: DiagnosticEnvelopeV1): string {
  const subject = diagnostic.subject
    ? ` [${diagnostic.subject.kind} ${diagnostic.subject.id}]`
    : "";
  const pointer =
    diagnostic.location?.jsonPointer !== undefined
      ? ` (at ${diagnostic.location.jsonPointer === "" ? "/" : diagnostic.location.jsonPointer})`
      : diagnostic.location?.file !== undefined
        ? ` (${diagnostic.location.file}${
            diagnostic.location.line === undefined ? "" : `:${diagnostic.location.line}`
          })`
        : "";
  const suggestion =
    diagnostic.suggestion === undefined ? "" : `\n  suggestion: ${diagnostic.suggestion}`;
  return `${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}${pointer}${subject}${suggestion}`;
}

export function formatDiagnosticsHumanV1(diagnostics: readonly DiagnosticEnvelopeV1[]): string {
  return diagnostics.map(formatDiagnosticHumanV1).join("\n");
}

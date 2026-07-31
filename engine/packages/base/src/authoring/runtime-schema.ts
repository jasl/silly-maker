// SPDX-License-Identifier: MIT
import { CanonicalJsonError, canonicalJsonBytes } from "../contracts/canonical-json.ts";
import type {
  DiagnosticEnvelopeV1,
  DiagnosticSubjectV1,
} from "../contracts/diagnostic-envelope.ts";
import {
  AuthoringDiagnosticErrorV1,
  extractDiagnosticsV1,
} from "../contracts/diagnostic-envelope.ts";
import type { RuntimeSchemaV1 } from "../contracts/values.ts";
import { deepFreezeAuthoringValueV1 } from "./define-gameplay-module.ts";

export interface RuntimeSchemaOptionsV1 {
  /** Attached to every diagnostic this schema produces. */
  readonly subject?: DiagnosticSubjectV1;
}

function errorMessageV1(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  return String(error);
}

function invalidValueDiagnosticV1(
  message: string,
  options: RuntimeSchemaOptionsV1 | undefined,
  location?: { readonly jsonPointer: string },
): DiagnosticEnvelopeV1 {
  return Object.freeze({
    code: "authoring.schema.invalid_value",
    severity: "error" as const,
    phase: "definition" as const,
    message,
    ...(options?.subject === undefined ? {} : { subject: options.subject }),
    ...(location === undefined ? {} : { location: Object.freeze({ ...location }) }),
    details: Object.freeze({}),
  });
}

function finalizeCanonicalValueV1<TValue>(
  value: TValue,
  options: RuntimeSchemaOptionsV1 | undefined,
): TValue {
  try {
    canonicalJsonBytes(value);
  } catch (error) {
    if (error instanceof CanonicalJsonError) {
      throw new AuthoringDiagnosticErrorV1([
        Object.freeze({
          code: "authoring.schema.not_canonical_json",
          severity: "error" as const,
          phase: "definition" as const,
          message: `schema output is not canonical JSON: ${error.code}`,
          ...(options?.subject === undefined ? {} : { subject: options.subject }),
          location: Object.freeze({ jsonPointer: error.path }),
          suggestion:
            "Return plain data only: no functions, undefined, non-integer numbers, or cyclic references.",
          details: Object.freeze({ canonicalCode: error.code }),
        }),
      ]);
    }
    throw error;
  }
  return deepFreezeAuthoringValueV1(value);
}

/**
 * Wraps a Story-owned parse function into the engine schema contract: the
 * output must be canonical JSON, is deep-frozen, and every failure surfaces
 * as a stable structured diagnostic instead of a bare exception.
 */
export function createRuntimeSchemaV1<TValue>(
  input: {
    readonly parse: (value: unknown) => TValue;
  },
  options?: RuntimeSchemaOptionsV1,
): RuntimeSchemaV1<TValue> {
  return Object.freeze({
    parse(value: unknown): TValue {
      let parsed: TValue;
      try {
        parsed = input.parse(value);
      } catch (error) {
        if (extractDiagnosticsV1(error) !== null) throw error;
        throw new AuthoringDiagnosticErrorV1([
          invalidValueDiagnosticV1(errorMessageV1(error), options),
        ]);
      }
      return finalizeCanonicalValueV1(parsed, options);
    },
  });
}

interface StandardSchemaIssueLikeV1 {
  readonly message: string;
  readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[] | undefined;
}

type StandardSchemaResultLikeV1<TOutput> =
  | { readonly value: TOutput; readonly issues?: undefined }
  | { readonly issues: readonly StandardSchemaIssueLikeV1[] };

/**
 * The published Standard Schema V1 interface, typed structurally so the
 * engine keeps zero dependency on any specific validation library. Zod 4
 * implements this interface and is the officially supported adapter input.
 */
export interface StandardSchemaLikeV1<TOutput> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) => StandardSchemaResultLikeV1<TOutput> | Promise<StandardSchemaResultLikeV1<TOutput>>;
  };
}

export type StandardSchemaOutputV1<TSchema> = TSchema extends {
  readonly "~standard": {
    readonly types?: { readonly output: infer TOutput } | undefined;
  };
} ? TOutput
  : never;

function pointerSegmentV1(segment: PropertyKey | { readonly key: PropertyKey }): string {
  const key = typeof segment === "object" && segment !== null && "key" in segment
    ? segment.key
    : segment;
  return String(key).replaceAll("~", "~0").replaceAll("/", "~1");
}

function issuePointerV1(issue: StandardSchemaIssueLikeV1): string | null {
  if (issue.path === undefined || issue.path.length === 0) return null;
  return `/${issue.path.map(pointerSegmentV1).join("/")}`;
}

/**
 * Adapts a Standard Schema (for example a Zod 4 schema) into the engine's
 * RuntimeSchema contract with canonical-JSON output, deep-freeze, and one
 * structured diagnostic per validation issue.
 */
export function fromStandardSchemaV1<TSchema extends StandardSchemaLikeV1<unknown>>(
  schema: TSchema,
  options?: RuntimeSchemaOptionsV1,
): RuntimeSchemaV1<StandardSchemaOutputV1<TSchema>> {
  const standard = schema["~standard"];
  if (standard.version !== 1 || typeof standard.validate !== "function") {
    throw new TypeError("fromStandardSchemaV1 requires a Standard Schema V1 implementation");
  }
  return Object.freeze({
    parse(value: unknown): StandardSchemaOutputV1<TSchema> {
      const result = standard.validate(value);
      if (result !== null && typeof result === "object" && "then" in result) {
        throw new AuthoringDiagnosticErrorV1([
          Object.freeze({
            code: "authoring.schema.async_unsupported",
            severity: "error" as const,
            phase: "definition" as const,
            message:
              `${standard.vendor} schema validated asynchronously; runtime schemas must be synchronous`,
            ...(options?.subject === undefined ? {} : { subject: options.subject }),
            details: Object.freeze({ vendor: standard.vendor }),
          }),
        ]);
      }
      if (result.issues !== undefined) {
        const diagnostics = result.issues.map((issue) => {
          const pointer = issuePointerV1(issue);
          return invalidValueDiagnosticV1(
            issue.message,
            options,
            pointer === null ? undefined : { jsonPointer: pointer },
          );
        });
        throw new AuthoringDiagnosticErrorV1(
          diagnostics,
          `schema validation failed with ${diagnostics.length} issue(s)`,
        );
      }
      return finalizeCanonicalValueV1(result.value as StandardSchemaOutputV1<TSchema>, options);
    },
  });
}

// SPDX-License-Identifier: MIT

/**
 * The versioned JSONL agent protocol. One JSON value per line; stdout carries
 * protocol lines only. The method set is closed: no eval, no file paths, no
 * DebugTools, no generic command surface.
 */
export const jsonlProtocolVersionV1 = 1;

export const jsonlAgentMethodsV1 = Object.freeze([
  "hello",
  "observe",
  "describeActions",
  "preview",
  "dispatch",
  "waitForIdle",
  "exportDiagnostics",
  "save",
  "load",
  "exportSave",
  "importSave",
  "shutdown",
] as const);

export type JsonlAgentMethodV1 = (typeof jsonlAgentMethodsV1)[number];

export interface JsonlRequestV1 {
  readonly v: typeof jsonlProtocolVersionV1;
  readonly id: string;
  readonly method: JsonlAgentMethodV1;
  readonly params?: Readonly<Record<string, unknown>>;
}

export type JsonlProtocolErrorCodeV1 =
  | "protocol.invalid_json"
  | "protocol.unsupported_version"
  | "protocol.invalid_request"
  | "protocol.unknown_method"
  | "protocol.line_too_long"
  | "protocol.depth_exceeded"
  | "protocol.request_timeout"
  | "protocol.capability_disabled"
  | "protocol.shutting_down"
  | "protocol.internal_error";

export interface JsonlResponseOkV1 {
  readonly v: typeof jsonlProtocolVersionV1;
  readonly id: string;
  readonly ok: true;
  readonly result: unknown;
}

export interface JsonlResponseErrorV1 {
  readonly v: typeof jsonlProtocolVersionV1;
  readonly id: string | null;
  readonly ok: false;
  readonly error: {
    readonly code: JsonlProtocolErrorCodeV1;
    readonly message: string;
  };
}

export interface JsonlEventV1 {
  readonly v: typeof jsonlProtocolVersionV1;
  readonly event: "publication";
  readonly publication: unknown;
}

export type JsonlOutputLineV1 = JsonlResponseOkV1 | JsonlResponseErrorV1 | JsonlEventV1;

export interface JsonlHostLimitsV1 {
  readonly maxLineBytes: number;
  readonly maxDepth: number;
  readonly requestTimeoutMs: number;
}

export const defaultJsonlHostLimitsV1: JsonlHostLimitsV1 = Object.freeze({
  maxLineBytes: 262_144,
  maxDepth: 32,
  requestTimeoutMs: 30_000,
});

const errorMessageLimitV1 = 512;

/** Bounded, stack-free error text safe for the protocol stream. */
export function boundProtocolMessageV1(value: unknown): string {
  const raw =
    typeof value === "string" ? value : value instanceof Error ? value.message : String(value);
  const firstLine = raw.split("\n", 1)[0] ?? "";
  return firstLine.length > errorMessageLimitV1
    ? `${firstLine.slice(0, errorMessageLimitV1 - 1)}…`
    : firstLine;
}

export function jsonDepthExceedsV1(value: unknown, maxDepth: number): boolean {
  const walk = (current: unknown, depth: number): boolean => {
    if (depth > maxDepth) return true;
    if (current === null || typeof current !== "object") return false;
    for (const child of Array.isArray(current) ? current : Object.values(current)) {
      if (walk(child, depth + 1)) return true;
    }
    return false;
  };
  return walk(value, 1);
}

export type JsonlRequestParseResultV1 =
  | { readonly kind: "request"; readonly request: JsonlRequestV1 }
  | {
      readonly kind: "invalid";
      readonly id: string | null;
      readonly code: JsonlProtocolErrorCodeV1;
      readonly message: string;
    };

export function parseJsonlRequestLineV1(
  line: string,
  limits: JsonlHostLimitsV1,
): JsonlRequestParseResultV1 {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return Object.freeze({
      kind: "invalid" as const,
      id: null,
      code: "protocol.invalid_json" as const,
      message: "request line is not valid JSON",
    });
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return Object.freeze({
      kind: "invalid" as const,
      id: null,
      code: "protocol.invalid_request" as const,
      message: "request must be a JSON object",
    });
  }
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" && record.id.length > 0 ? record.id : null;
  if (record.v !== jsonlProtocolVersionV1) {
    return Object.freeze({
      kind: "invalid" as const,
      id,
      code: "protocol.unsupported_version" as const,
      message: "request v must be 1",
    });
  }
  if (id === null) {
    return Object.freeze({
      kind: "invalid" as const,
      id: null,
      code: "protocol.invalid_request" as const,
      message: "request id must be a non-empty string",
    });
  }
  if (jsonDepthExceedsV1(record, limits.maxDepth)) {
    return Object.freeze({
      kind: "invalid" as const,
      id,
      code: "protocol.depth_exceeded" as const,
      message: "request exceeds the maximum JSON depth",
    });
  }
  const method = record.method;
  if (typeof method !== "string" || !jsonlAgentMethodsV1.includes(method as JsonlAgentMethodV1)) {
    return Object.freeze({
      kind: "invalid" as const,
      id,
      code: "protocol.unknown_method" as const,
      message: "request method is not part of the agent protocol",
    });
  }
  const params = record.params;
  if (
    params !== undefined &&
    (params === null || typeof params !== "object" || Array.isArray(params))
  ) {
    return Object.freeze({
      kind: "invalid" as const,
      id,
      code: "protocol.invalid_request" as const,
      message: "request params must be an object when present",
    });
  }
  return Object.freeze({
    kind: "request" as const,
    request: Object.freeze({
      v: jsonlProtocolVersionV1,
      id,
      method: method as JsonlAgentMethodV1,
      ...(params === undefined ? {} : { params: params as Readonly<Record<string, unknown>> }),
    }),
  });
}

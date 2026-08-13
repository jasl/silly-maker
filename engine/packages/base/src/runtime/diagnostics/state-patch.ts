// SPDX-License-Identifier: MIT
import { commitAttemptV1 } from "../../contracts/execution.ts";
import type { CommandExecutionAttemptEnvelopeV1 } from "../../contracts/execution.ts";
import { createTransactionalRngV1 } from "../../contracts/rng.ts";
import type { RngDrawTraceV1, RngStateV1 } from "../../contracts/rng.ts";
import type { RuntimeSchemaV1 } from "../../contracts/values.ts";
import { parseNonNegativeSafeInteger } from "../../contracts/values.ts";

/** Reserved debug command kind; Core intercepts it before the Story executor. */
export const engineDebugPatchStateKindV1 = "sillymaker.debug.patch_state";

export const engineDebugPatchErrorCodeV1 = "engine.debug.patch_invalid";

const engineDebugPatchMaxPathSegmentsV1 = 32;
const engineDebugPatchMaxSegmentLengthV1 = 64;
const dangerousPathSegmentsV1 = new Set(["__proto__", "prototype", "constructor"]);

export interface EngineDebugPatchStateCommandV1 {
  readonly kind: typeof engineDebugPatchStateKindV1;
  readonly path: readonly string[];
  readonly value: EngineStatePatchLeafV1;
}

export type EngineStatePatchLeafV1 = string | number | boolean | null;

export interface EngineDebugPatchValidationErrorV1 {
  readonly code: typeof engineDebugPatchErrorCodeV1;
  readonly detail: string;
}

export type EngineDebugPatchValidationResultV1 =
  | { readonly kind: "allowed" }
  | {
    readonly kind: "validation_failed";
    readonly errors: readonly EngineDebugPatchValidationErrorV1[];
  };

export interface EnginePatchableSnapshotV1 {
  readonly state: unknown;
  readonly rng: RngStateV1;
  readonly commandSequence: number;
  readonly integrity: unknown;
}

export class EngineDebugPatchErrorV1 extends TypeError {
  readonly code = engineDebugPatchErrorCodeV1;
  readonly detail: string;

  constructor(detail: string) {
    super(`${engineDebugPatchErrorCodeV1}: ${detail}`);
    this.name = "EngineDebugPatchErrorV1";
    this.detail = detail;
  }
}

export function isEngineDebugPatchStateKindV1(command: unknown): boolean {
  if (command === null || typeof command !== "object" || Array.isArray(command)) {
    return false;
  }
  return (command as { readonly kind?: unknown }).kind === engineDebugPatchStateKindV1;
}

export function isEngineDebugPatchValidationErrorV1(
  value: unknown,
): value is EngineDebugPatchValidationErrorV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as { readonly code?: unknown; readonly detail?: unknown };
  return record.code === engineDebugPatchErrorCodeV1 && typeof record.detail === "string";
}

export function parseEngineDebugPatchStateCommandV1(
  value: unknown,
): EngineDebugPatchStateCommandV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new EngineDebugPatchErrorV1("command must be a plain object");
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new EngineDebugPatchErrorV1("command must be a plain object");
  }
  const keys = Object.keys(value).sort();
  if (keys.join("\0") !== "kind\0path\0value") {
    throw new EngineDebugPatchErrorV1("command must have exact keys kind, path, value");
  }
  const record = value as {
    readonly kind: unknown;
    readonly path: unknown;
    readonly value: unknown;
  };
  if (record.kind !== engineDebugPatchStateKindV1) {
    throw new EngineDebugPatchErrorV1("unexpected command kind");
  }
  if (!Array.isArray(record.path) || record.path.length === 0) {
    throw new EngineDebugPatchErrorV1("path must be a non-empty array of strings");
  }
  if (record.path.length > engineDebugPatchMaxPathSegmentsV1) {
    throw new EngineDebugPatchErrorV1("path exceeds the segment limit");
  }
  const path: string[] = [];
  for (const segment of record.path) {
    if (typeof segment !== "string" || segment.length === 0) {
      throw new EngineDebugPatchErrorV1("path segments must be non-empty strings");
    }
    if (segment.length > engineDebugPatchMaxSegmentLengthV1) {
      throw new EngineDebugPatchErrorV1("path segment exceeds the length limit");
    }
    if (dangerousPathSegmentsV1.has(segment)) {
      throw new EngineDebugPatchErrorV1("path segment is not allowed");
    }
    path.push(segment);
  }
  if (!isEngineStatePatchLeafV1(record.value)) {
    throw new EngineDebugPatchErrorV1(
      "value must be a JSON leaf (string, integer, boolean, or null)",
    );
  }
  if (typeof record.value === "number") {
    if (!Number.isSafeInteger(record.value) || Object.is(record.value, -0)) {
      throw new EngineDebugPatchErrorV1("numeric value must be a safe integer");
    }
  }
  return Object.freeze({
    kind: engineDebugPatchStateKindV1,
    path: Object.freeze([...path]),
    value: record.value,
  });
}

export function validateEngineStatePatchV1(
  snapshot: EnginePatchableSnapshotV1,
  command: unknown,
  stateSchema: RuntimeSchemaV1<unknown>,
): EngineDebugPatchValidationResultV1 {
  const prepared = prepareEngineStatePatchV1(snapshot.state, command, stateSchema);
  if (prepared.kind === "invalid") {
    return Object.freeze({
      kind: "validation_failed",
      errors: Object.freeze([patchErrorV1(prepared.detail)]),
    });
  }
  return Object.freeze({ kind: "allowed" });
}

export function executeEngineStatePatchV1<TSnapshot extends EnginePatchableSnapshotV1>(
  snapshot: TSnapshot,
  command: unknown,
  stateSchema: RuntimeSchemaV1<unknown>,
): CommandExecutionAttemptEnvelopeV1<
  TSnapshot,
  never,
  never,
  never,
  RngStateV1,
  RngDrawTraceV1
> {
  const prepared = prepareEngineStatePatchV1(snapshot.state, command, stateSchema);
  if (prepared.kind === "invalid") {
    throw new EngineDebugPatchErrorV1(prepared.detail);
  }
  const rng = createTransactionalRngV1(snapshot.rng);
  const next = Object.freeze({
    ...snapshot,
    state: prepared.state,
    rng: rng.candidateState(),
    commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence + 1),
    integrity: snapshot.integrity,
  }) as TSnapshot;
  return commitAttemptV1(snapshot, next, rng, []);
}

function prepareEngineStatePatchV1(
  state: unknown,
  command: unknown,
  stateSchema: RuntimeSchemaV1<unknown>,
): { readonly kind: "ok"; readonly state: unknown } | {
  readonly kind: "invalid";
  readonly detail: string;
} {
  let parsed: EngineDebugPatchStateCommandV1;
  try {
    parsed = parseEngineDebugPatchStateCommandV1(command);
  } catch (error) {
    return Object.freeze({
      kind: "invalid",
      detail: error instanceof EngineDebugPatchErrorV1 ? error.detail : "invalid patch command",
    });
  }
  const replaced = replaceExistingLeafV1(state, parsed.path, parsed.value);
  if (replaced.kind === "invalid") return replaced;
  try {
    return Object.freeze({ kind: "ok", state: stateSchema.parse(replaced.state) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "state schema rejected the patch";
    return Object.freeze({ kind: "invalid", detail: message });
  }
}

function replaceExistingLeafV1(
  root: unknown,
  path: readonly string[],
  value: EngineStatePatchLeafV1,
): { readonly kind: "ok"; readonly state: unknown } | {
  readonly kind: "invalid";
  readonly detail: string;
} {
  try {
    return Object.freeze({
      kind: "ok",
      state: replaceAtPathV1(root, path, value, 0),
    });
  } catch (error) {
    return Object.freeze({
      kind: "invalid",
      detail: error instanceof EngineDebugPatchErrorV1 ? error.detail : "failed to apply path",
    });
  }
}

function replaceAtPathV1(
  current: unknown,
  path: readonly string[],
  value: EngineStatePatchLeafV1,
  depth: number,
): unknown {
  const key = path[depth];
  if (key === undefined) {
    throw new EngineDebugPatchErrorV1("path is empty");
  }
  const isLeaf = depth === path.length - 1;
  if (Array.isArray(current)) {
    if (!/^(?:0|[1-9]\d*)$/u.test(key)) {
      throw new EngineDebugPatchErrorV1(`array index is not canonical: ${formatPathV1(path)}`);
    }
    const index = Number(key);
    if (index >= current.length) {
      throw new EngineDebugPatchErrorV1(`path does not exist: ${formatPathV1(path)}`);
    }
    const next = [...current];
    next[index] = isLeaf
      ? replaceLeafValueV1(current[index], value, path)
      : replaceAtPathV1(current[index], path, value, depth + 1);
    return next;
  }
  if (!isPlainObjectV1(current)) {
    throw new EngineDebugPatchErrorV1(
      `path is not a container: ${formatPathV1(path.slice(0, depth))}`,
    );
  }
  if (!Object.prototype.hasOwnProperty.call(current, key)) {
    throw new EngineDebugPatchErrorV1(`path does not exist: ${formatPathV1(path)}`);
  }
  if (isLeaf) {
    return Object.freeze({
      ...current,
      [key]: replaceLeafValueV1(current[key], value, path),
    });
  }
  return Object.freeze({
    ...current,
    [key]: replaceAtPathV1(current[key], path, value, depth + 1),
  });
}

function replaceLeafValueV1(
  current: unknown,
  value: EngineStatePatchLeafV1,
  path: readonly string[],
): EngineStatePatchLeafV1 {
  if (!isEngineStatePatchLeafV1(current)) {
    throw new EngineDebugPatchErrorV1(`path is not a leaf: ${formatPathV1(path)}`);
  }
  if (leafKindV1(current) !== leafKindV1(value)) {
    throw new EngineDebugPatchErrorV1(`leaf type mismatch at ${formatPathV1(path)}`);
  }
  return value;
}

function isEngineStatePatchLeafV1(value: unknown): value is EngineStatePatchLeafV1 {
  return value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number";
}

function leafKindV1(value: EngineStatePatchLeafV1): "null" | "string" | "boolean" | "number" {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  return "number";
}

function isPlainObjectV1(value: unknown): value is Record<string, unknown> {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function formatPathV1(path: readonly string[]): string {
  return path.join(".");
}

function patchErrorV1(detail: string): EngineDebugPatchValidationErrorV1 {
  return Object.freeze({
    code: engineDebugPatchErrorCodeV1,
    detail,
  });
}

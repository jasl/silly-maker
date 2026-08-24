// SPDX-License-Identifier: MIT
import type { StrictJsonValueV1 } from "../contracts/strict-json.ts";
import type { DeepReadonly, PositiveSafeInteger } from "../contracts/values.ts";
import { parsePositiveSafeInteger } from "../contracts/values.ts";
import {
  canonicalJsonNumberFailureInternalV1,
  compareCanonicalJsonCodePointsInternalV1,
  defineCanonicalJsonProjectionMemberInternalV1,
  encodeCanonicalJsonUtf8InternalV1,
  visitCanonicalJsonStringSegmentsInternalV1,
} from "./canonical-json-primitives.ts";

export interface BoundedCanonicalJsonLimitsInternalV1 {
  readonly maxBytes: PositiveSafeInteger;
  readonly maxDepth: PositiveSafeInteger;
  readonly maxNodes: PositiveSafeInteger;
}

export type BoundedCanonicalJsonRejectionCodeInternalV1 =
  | "canonical.invalid"
  | "limit.bytes"
  | "limit.depth"
  | "limit.nodes";

export type BoundedCanonicalJsonProjectionResultInternalV1 =
  | {
    readonly kind: "projected";
    readonly value: DeepReadonly<StrictJsonValueV1>;
    readonly bytes: Uint8Array;
  }
  | {
    readonly kind: "rejected";
    readonly code: BoundedCanonicalJsonRejectionCodeInternalV1;
  };

type BoundedCanonicalJsonRejectionInternalV1 = Extract<
  BoundedCanonicalJsonProjectionResultInternalV1,
  { readonly kind: "rejected" }
>;

type ProjectionStepInternalV1 =
  | { readonly kind: "value"; readonly value: StrictJsonValueV1 }
  | BoundedCanonicalJsonRejectionInternalV1;

const canonicalInvalidInternalV1 = {
  kind: "rejected",
  code: "canonical.invalid",
} as const;
const bytesExceededInternalV1 = {
  kind: "rejected",
  code: "limit.bytes",
} as const;
const depthExceededInternalV1 = {
  kind: "rejected",
  code: "limit.depth",
} as const;
const nodesExceededInternalV1 = {
  kind: "rejected",
  code: "limit.nodes",
} as const;

function isCanonicalArrayIndexInternalV1(value: string, length: number): boolean {
  if (value.length === 0 || value.length > 10) return false;
  if (value.length > 1 && value.charCodeAt(0) === 0x30) return false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x30 || code > 0x39) return false;
  }
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 && index < length && String(index) === value;
}

/**
 * Descriptor-safe canonical capture with deterministic first-event hard stops.
 * Reflection failures intentionally escape with their exact thrown identity.
 *
 * @internal
 */
export function projectBoundedCanonicalJsonInternalV1(
  value: unknown,
  limits: DeepReadonly<BoundedCanonicalJsonLimitsInternalV1>,
): BoundedCanonicalJsonProjectionResultInternalV1 {
  const maxBytes = parsePositiveSafeInteger(limits.maxBytes);
  const maxDepth = parsePositiveSafeInteger(limits.maxDepth);
  const maxNodes = parsePositiveSafeInteger(limits.maxNodes);
  const output: number[] = [];
  const active = new Set<object>();
  let nodes = 0;

  const writeByte = (byte: number): boolean => {
    if (output.length >= maxBytes) return false;
    output.push(byte);
    return true;
  };

  const writeAscii = (text: string): boolean => {
    for (let index = 0; index < text.length; index += 1) {
      if (!writeByte(text.charCodeAt(index))) return false;
    }
    return true;
  };

  const writeUtf8 = (text: string): boolean => {
    const bytes = encodeCanonicalJsonUtf8InternalV1(text);
    for (const byte of bytes) {
      if (!writeByte(byte)) return false;
    }
    return true;
  };

  const writeCanonicalString = (
    text: string,
  ): BoundedCanonicalJsonRejectionInternalV1 | null => {
    if (!writeByte(0x22)) return bytesExceededInternalV1;
    const scanned = visitCanonicalJsonStringSegmentsInternalV1(text, writeUtf8);
    if (scanned === "invalid") return canonicalInvalidInternalV1;
    if (scanned === "stopped") return bytesExceededInternalV1;
    return writeByte(0x22) ? null : bytesExceededInternalV1;
  };

  const entryFailure = (
    depth: number,
  ): BoundedCanonicalJsonRejectionInternalV1 | null => {
    if (depth > maxDepth) return depthExceededInternalV1;
    if (nodes >= maxNodes) return nodesExceededInternalV1;
    return null;
  };

  const projectEnteredValue = (
    current: unknown,
    depth: number,
  ): ProjectionStepInternalV1 => {
    if (current === null) {
      return writeAscii("null") ? { kind: "value", value: null } : bytesExceededInternalV1;
    }
    if (typeof current === "boolean") {
      return writeAscii(current ? "true" : "false")
        ? { kind: "value", value: current }
        : bytesExceededInternalV1;
    }
    if (typeof current === "string") {
      const rejection = writeCanonicalString(current);
      return rejection ?? { kind: "value", value: current };
    }
    if (typeof current === "number") {
      if (canonicalJsonNumberFailureInternalV1(current) !== null) {
        return canonicalInvalidInternalV1;
      }
      return writeAscii(String(current))
        ? { kind: "value", value: current }
        : bytesExceededInternalV1;
    }
    if (typeof current !== "object") return canonicalInvalidInternalV1;

    if (active.has(current)) return canonicalInvalidInternalV1;
    active.add(current);
    try {
      if (Array.isArray(current)) {
        if (Object.getPrototypeOf(current) !== Array.prototype) {
          return canonicalInvalidInternalV1;
        }
        const ownKeys = Reflect.ownKeys(current);
        if (ownKeys.some((key) => typeof key === "symbol")) {
          return canonicalInvalidInternalV1;
        }
        const lengthDescriptor = Object.getOwnPropertyDescriptor(current, "length");
        if (
          lengthDescriptor === undefined ||
          lengthDescriptor.get !== undefined ||
          lengthDescriptor.set !== undefined ||
          !("value" in lengthDescriptor) ||
          typeof lengthDescriptor.value !== "number" ||
          !Number.isInteger(lengthDescriptor.value) ||
          lengthDescriptor.value < 0 ||
          lengthDescriptor.value > 0xffff_ffff
        ) {
          return canonicalInvalidInternalV1;
        }
        const length = lengthDescriptor.value;
        if (ownKeys.length !== length + 1) return canonicalInvalidInternalV1;
        let hasLength = false;
        for (const key of ownKeys as string[]) {
          if (key === "length") {
            hasLength = true;
            continue;
          }
          if (!isCanonicalArrayIndexInternalV1(key, length)) {
            return canonicalInvalidInternalV1;
          }
        }
        if (!hasLength || !writeByte(0x5b)) {
          return hasLength ? bytesExceededInternalV1 : canonicalInvalidInternalV1;
        }

        const projection: StrictJsonValueV1[] = [];
        for (let index = 0; index < length; index += 1) {
          if (index !== 0 && !writeByte(0x2c)) return bytesExceededInternalV1;
          const childEntryFailure = entryFailure(depth + 1);
          if (childEntryFailure !== null) return childEntryFailure;
          const descriptor = Object.getOwnPropertyDescriptor(current, String(index));
          if (
            descriptor === undefined ||
            descriptor.get !== undefined ||
            descriptor.set !== undefined ||
            !("value" in descriptor)
          ) {
            return canonicalInvalidInternalV1;
          }
          nodes += 1;
          const child = projectEnteredValue(descriptor.value, depth + 1);
          if (child.kind === "rejected") return child;
          defineCanonicalJsonProjectionMemberInternalV1(
            projection,
            String(index),
            child.value,
          );
        }
        if (!writeByte(0x5d)) return bytesExceededInternalV1;
        return { kind: "value", value: projection };
      }

      if (Object.getPrototypeOf(current) !== Object.prototype) {
        return canonicalInvalidInternalV1;
      }
      const ownKeys = Reflect.ownKeys(current);
      if (ownKeys.some((key) => typeof key === "symbol")) {
        return canonicalInvalidInternalV1;
      }
      const keys = ownKeys as string[];
      for (const key of keys) {
        const scanned = visitCanonicalJsonStringSegmentsInternalV1(key, () => true);
        if (scanned !== "complete") return canonicalInvalidInternalV1;
      }
      keys.sort(compareCanonicalJsonCodePointsInternalV1);
      if (!writeByte(0x7b)) return bytesExceededInternalV1;

      const projection = {} as Record<string, StrictJsonValueV1>;
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index]!;
        if (index !== 0 && !writeByte(0x2c)) return bytesExceededInternalV1;
        const keyRejection = writeCanonicalString(key);
        if (keyRejection !== null) return keyRejection;
        if (!writeByte(0x3a)) return bytesExceededInternalV1;
        const childEntryFailure = entryFailure(depth + 1);
        if (childEntryFailure !== null) return childEntryFailure;
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (
          descriptor === undefined ||
          descriptor.get !== undefined ||
          descriptor.set !== undefined ||
          !("value" in descriptor)
        ) {
          return canonicalInvalidInternalV1;
        }
        nodes += 1;
        const child = projectEnteredValue(descriptor.value, depth + 1);
        if (child.kind === "rejected") return child;
        defineCanonicalJsonProjectionMemberInternalV1(projection, key, child.value);
      }
      if (!writeByte(0x7d)) return bytesExceededInternalV1;
      return { kind: "value", value: projection };
    } finally {
      active.delete(current);
    }
  };

  const rootFailure = entryFailure(1);
  if (rootFailure !== null) return rootFailure;
  nodes += 1;
  const projected = projectEnteredValue(value, 1);
  if (projected.kind === "rejected") return projected;
  return {
    kind: "projected",
    value: projected.value as DeepReadonly<StrictJsonValueV1>,
    bytes: Uint8Array.from(output),
  };
}

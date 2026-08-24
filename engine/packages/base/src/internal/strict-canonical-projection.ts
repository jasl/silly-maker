// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytesWithStrictLimitsInternalV1,
  parseStrictJson,
} from "../contracts/strict-json.ts";
import type { StrictJsonLimitsV1, StrictJsonValueV1 } from "../contracts/strict-json.ts";
import type { DeepReadonly } from "../contracts/values.ts";

/** @internal Admits one value and returns a detached Strict Canonical JSON projection. */
export function projectStrictCanonicalJsonInternalV1(
  value: unknown,
  limits: DeepReadonly<StrictJsonLimitsV1>,
): DeepReadonly<StrictJsonValueV1> {
  const encoded = canonicalJsonBytesWithStrictLimitsInternalV1(value, limits);
  if (!encoded.ok) {
    throw new TypeError(`Strict canonical projection exceeds ${encoded.error.code}`);
  }
  const parsed = parseStrictJson(encoded.bytes, limits);
  if (!parsed.ok) {
    throw new TypeError(`Strict canonical projection failed ${parsed.error.code}`);
  }
  return parsed.value as DeepReadonly<StrictJsonValueV1>;
}

// SPDX-License-Identifier: MIT
import type { StrictJsonObjectV1 } from "./strict-json.ts";

/**
 * The explicit asset demand plan. Loaders consume plans instead of
 * accumulating one-shot requests forever: a plan expresses priority, load
 * group, budgets, retry, and retention, and revoking a plan (stage
 * retarget, Story unload, HMR, application disposal) cancels everything it
 * still holds. A failed settled request may open a new load cycle under a
 * later plan instead of staying cached as failed, and pending assets never
 * block simulation progression.
 */

export type AssetDemandPriorityV1 = "blocking" | "opportunistic";

export interface AssetDemandEntryV1 {
  readonly assetId: string;
  readonly priority: AssetDemandPriorityV1;
  readonly group: string;
}

export interface AssetDemandRetryPolicyV1 {
  readonly maxAttempts: number;
  readonly backoffMs: number;
}

export type AssetDemandRetentionV1 =
  { readonly kind: "while_demanded" } | { readonly kind: "retain_all" };

export interface AssetDemandPlanV1 {
  readonly planId: string;
  readonly entries: readonly AssetDemandEntryV1[];
  readonly maxConcurrent: number;
  readonly retry: AssetDemandRetryPolicyV1;
  readonly retention: AssetDemandRetentionV1;
}

export interface CreateAssetDemandPlanInputV1 {
  readonly planId: string;
  readonly entries: readonly AssetDemandEntryV1[];
  readonly maxConcurrent?: number;
  readonly retry?: AssetDemandRetryPolicyV1;
  readonly retention?: AssetDemandRetentionV1;
}

export function createAssetDemandPlanV1(input: CreateAssetDemandPlanInputV1): AssetDemandPlanV1 {
  if (input.planId.length === 0) throw new TypeError("asset demand plan requires a planId");
  const seen = new Set<string>();
  for (const entry of input.entries) {
    if (seen.has(entry.assetId)) {
      throw new TypeError(`asset demand plan duplicates ${entry.assetId}`);
    }
    seen.add(entry.assetId);
  }
  const maxConcurrent = input.maxConcurrent ?? 4;
  if (!Number.isSafeInteger(maxConcurrent) || maxConcurrent < 1) {
    throw new TypeError("asset demand plan requires a positive maxConcurrent");
  }
  const retry = input.retry ?? Object.freeze({ maxAttempts: 2, backoffMs: 250 });
  if (!Number.isSafeInteger(retry.maxAttempts) || retry.maxAttempts < 1) {
    throw new TypeError("asset demand retry requires at least one attempt");
  }
  if (!Number.isSafeInteger(retry.backoffMs) || retry.backoffMs < 0) {
    throw new TypeError("asset demand retry requires a non-negative backoff");
  }
  return Object.freeze({
    planId: input.planId,
    entries: Object.freeze(input.entries.map((entry) => Object.freeze({ ...entry }))),
    maxConcurrent,
    retry: Object.freeze({ ...retry }),
    retention: Object.freeze(input.retention ?? { kind: "while_demanded" as const }),
  });
}

/**
 * One commit-only transient presentation effect. Effects are produced by
 * the Story adapter from committed command facts, stamped with a monotonic
 * per-instance sequence and the presentation epoch at commit time. They are
 * never stored in State or Saves, load/bootstrap publications carry no
 * history, and consumers keep an instance-local consumed watermark so
 * same-epoch re-projection never re-executes an effect.
 */
export interface TransientEffectV1 {
  readonly effectSequence: number;
  readonly epoch: number;
  readonly effectId: string;
  readonly payload: StrictJsonObjectV1;
}

/** The Story-side effect request before the instance stamps sequence/epoch. */
export interface TransientEffectRequestV1 {
  readonly effectId: string;
  readonly payload: StrictJsonObjectV1;
}

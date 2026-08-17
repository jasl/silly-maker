// SPDX-License-Identifier: MIT
import type { NonNegativeSafeInteger } from "./values.ts";

export type RuntimeSessionStatusV1 = "ready" | "busy" | "fault_paused" | "hmr_invalidated";

/**
 * Non-authoritative capture of the raw error behind the session's most
 * recent unexpected fault. Debug/presentation data only: it is never part
 * of the attempt envelope, CommandLog evidence, Save, digest, or replay —
 * fault normalizers keep mapping errors to the Story's coded fault, and
 * this record just preserves what they were shown.
 */
export interface SessionFaultCauseV1 {
  /** Which session surface caught the throw. */
  readonly at: "dispatch" | "debug" | "session";
  readonly message: string;
  /** Leading stack frames (trimmed); empty when the throw carried none. */
  readonly stackSummary: readonly string[];
}

export type SessionDispatchOperationResultV1<TExecutionResult> =
  | { readonly kind: "executed"; readonly execution: TExecutionResult }
  | {
    readonly kind: "not_executed";
    readonly code: "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
  };

export type SessionAnchorResultV1 =
  | { readonly kind: "anchored"; readonly commandSequence: NonNegativeSafeInteger }
  | {
    readonly kind: "rejected";
    readonly code: "busy" | "fault_paused" | "hmr_invalidated" | "validation_failed";
  }
  | { readonly kind: "faulted"; readonly code: string };

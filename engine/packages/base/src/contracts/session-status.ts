// SPDX-License-Identifier: MIT
import type { NonNegativeSafeInteger } from "./values.js";

export type RuntimeSessionStatusV1 = "ready" | "busy" | "fault_paused" | "hmr_invalidated";

export type SessionDispatchOperationResultV1<TExecutionResult> =
  | { readonly kind: "executed"; readonly execution: TExecutionResult }
  | {
      readonly kind: "not_executed";
      readonly code:
        "session_unavailable" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    };

export type SessionAnchorResultV1 =
  | { readonly kind: "anchored"; readonly commandSequence: NonNegativeSafeInteger }
  | {
      readonly kind: "rejected";
      readonly code: "busy" | "fault_paused" | "hmr_invalidated" | "validation_failed";
    }
  | { readonly kind: "faulted"; readonly code: string };

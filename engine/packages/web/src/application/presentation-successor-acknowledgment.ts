// SPDX-License-Identifier: MIT
import type { GameUiPresentationAnchorEventInternalV1 } from "@sillymaker/ui/internal";

type PresentationSuccessorAnchorInternalV1 = GameUiPresentationAnchorEventInternalV1["anchor"];

export type PresentationSuccessorAcknowledgmentOutcomeInternalV1 =
  | { readonly kind: "installed"; readonly anchor: PresentationSuccessorAnchorInternalV1 }
  | {
    readonly kind: "failed";
    readonly anchor: PresentationSuccessorAnchorInternalV1;
    readonly error: unknown;
  }
  | { readonly kind: "mismatched" }
  | { readonly kind: "missing" };

export type PresentationSuccessorNonAnchoredOutcomeInternalV1 =
  | { readonly kind: "unobserved" }
  | { readonly kind: "desynchronized" };

export interface PresentationSuccessorAcknowledgmentProducerPortInternalV1 {
  installed(input: PresentationSuccessorInstalledInputInternalV1): void;
  failed(input: PresentationSuccessorFailedInputInternalV1): void;
}

interface PresentationSuccessorInstalledInputInternalV1 {
  readonly token: object;
  readonly anchor: PresentationSuccessorAnchorInternalV1;
}

interface PresentationSuccessorFailedInputInternalV1 {
  readonly token: object | null;
  readonly anchor: PresentationSuccessorAnchorInternalV1;
  readonly error: unknown;
}

export interface PresentationSuccessorAcknowledgmentBrokerInternalV1 {
  readonly producer: PresentationSuccessorAcknowledgmentProducerPortInternalV1;
  arm(token: object): void;
  bindExpected(token: object, anchor: PresentationSuccessorAnchorInternalV1): void;
  take(token: object): PresentationSuccessorAcknowledgmentOutcomeInternalV1;
  takeNonAnchored(token: object): PresentationSuccessorNonAnchoredOutcomeInternalV1;
  cancel(token: object): void;
  dispose(): void;
}

type AcknowledgmentRecordInternalV1 =
  | Exclude<
    PresentationSuccessorAcknowledgmentOutcomeInternalV1,
    { readonly kind: "missing" } | { readonly kind: "mismatched" }
  >
  | {
    readonly kind: "pending";
    readonly expectedAnchor: PresentationSuccessorAnchorInternalV1 | null;
  }
  | { readonly kind: "mismatched" };

const pendingAcknowledgmentV1: AcknowledgmentRecordInternalV1 = Object.freeze({
  kind: "pending",
  expectedAnchor: null,
});
const missingAcknowledgmentV1: PresentationSuccessorAcknowledgmentOutcomeInternalV1 = Object.freeze(
  {
    kind: "missing",
  },
);
const mismatchedAcknowledgmentV1: AcknowledgmentRecordInternalV1 = Object.freeze({
  kind: "mismatched",
});
const unobservedNonAnchoredV1: PresentationSuccessorNonAnchoredOutcomeInternalV1 = Object.freeze({
  kind: "unobserved",
});
const desynchronizedNonAnchoredV1: PresentationSuccessorNonAnchoredOutcomeInternalV1 = Object
  .freeze({
    kind: "desynchronized",
  });

function requireTokenV1(token: object): void {
  if (token === null || typeof token !== "object") {
    throw new TypeError("web.presentation_successor_acknowledgment_token_invalid");
  }
}

/**
 * @internal Bounded exact-token broker shared by the Web lifecycle wrapper and
 * the hosted UI anchor-event producer. It retains only currently armed
 * operations and never infers correlation from ordering or a latest receipt.
 */
export function createPresentationSuccessorAcknowledgmentBrokerInternalV1(input: {
  signalTerminal(error: Error): void;
}): PresentationSuccessorAcknowledgmentBrokerInternalV1 {
  const records = new Map<object, AcknowledgmentRecordInternalV1>();
  let disposed = false;
  const failMismatch = (token: object): never => {
    records.set(token, mismatchedAcknowledgmentV1);
    const error = new Error("ui.presentation_successor_activation_failed");
    try {
      input.signalTerminal(error);
    } catch {
      // The activation failure remains the observer diagnostic even if an
      // injected terminal callback violates its no-throw contract.
      throw error;
    }
    // The throw reaches the UI activation closure or Base event observer so
    // local sealing and observer diagnostics cannot diverge from Web teardown.
    throw error;
  };

  const producer: PresentationSuccessorAcknowledgmentProducerPortInternalV1 = Object.freeze({
    installed(receipt: PresentationSuccessorInstalledInputInternalV1): void {
      if (disposed) return;
      const current = records.get(receipt.token);
      if (current?.kind === "pending") {
        if (
          current.expectedAnchor === null ||
          !Object.is(current.expectedAnchor, receipt.anchor)
        ) {
          failMismatch(receipt.token);
        }
        records.set(receipt.token, Object.freeze({ kind: "installed", anchor: receipt.anchor }));
        return;
      }
      if (current?.kind === "installed" && !Object.is(current.anchor, receipt.anchor)) {
        failMismatch(receipt.token);
      }
      if (current?.kind === "mismatched") {
        failMismatch(receipt.token);
      }
    },
    failed(receipt: PresentationSuccessorFailedInputInternalV1): void {
      if (disposed) return;
      if (receipt.token !== null) {
        const current = records.get(receipt.token);
        if (current?.kind === "pending") {
          records.set(
            receipt.token,
            Object.freeze({
              kind: "failed",
              anchor: receipt.anchor,
              error: receipt.error,
            }),
          );
        }
      }
      input.signalTerminal(new Error("ui.presentation_successor_activation_failed"));
    },
  });

  return Object.freeze({
    producer,
    arm(token: object): void {
      requireTokenV1(token);
      if (disposed) {
        throw new TypeError("web.presentation_successor_acknowledgment_broker_disposed");
      }
      if (records.has(token)) {
        throw new TypeError("web.presentation_successor_acknowledgment_token_already_armed");
      }
      records.set(token, pendingAcknowledgmentV1);
    },
    bindExpected(token: object, anchor: PresentationSuccessorAnchorInternalV1): void {
      requireTokenV1(token);
      if (disposed) return;
      const current = records.get(token);
      if (current?.kind === "pending") {
        if (current.expectedAnchor === null) {
          records.set(token, Object.freeze({ kind: "pending", expectedAnchor: anchor }));
        } else if (!Object.is(current.expectedAnchor, anchor)) {
          failMismatch(token);
        }
        return;
      }
      if (current?.kind === "installed" && !Object.is(current.anchor, anchor)) {
        failMismatch(token);
      }
      if (current?.kind === "mismatched") {
        failMismatch(token);
      }
    },
    take(token: object): PresentationSuccessorAcknowledgmentOutcomeInternalV1 {
      requireTokenV1(token);
      const record = records.get(token);
      records.delete(token);
      return record === undefined || record.kind === "pending" ? missingAcknowledgmentV1 : record;
    },
    takeNonAnchored(token: object): PresentationSuccessorNonAnchoredOutcomeInternalV1 {
      requireTokenV1(token);
      const record = records.get(token);
      records.delete(token);
      return record === undefined ||
          (record.kind === "pending" && record.expectedAnchor === null)
        ? unobservedNonAnchoredV1
        : desynchronizedNonAnchoredV1;
    },
    cancel(token: object): void {
      requireTokenV1(token);
      records.delete(token);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      records.clear();
    },
  });
}

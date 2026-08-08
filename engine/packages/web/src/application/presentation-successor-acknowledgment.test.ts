// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { CorePresentationAnchorV1 } from "@sillymaker/base/runtime";
import { describe, expect, it, vi } from "vitest";

import { createPresentationSuccessorAcknowledgmentBrokerInternalV1 } from "./presentation-successor-acknowledgment.ts";

const restartAnchorV1 = Object.freeze({
  epoch: parseNonNegativeSafeInteger(1),
  origin: "restart",
}) satisfies CorePresentationAnchorV1;
const loadAnchorV1 = Object.freeze({
  epoch: parseNonNegativeSafeInteger(2),
  origin: "load",
}) satisfies CorePresentationAnchorV1;
const equalButForeignRestartAnchorV1 = Object.freeze({
  epoch: parseNonNegativeSafeInteger(1),
  origin: "restart",
}) satisfies CorePresentationAnchorV1;

describe("presentation successor acknowledgment broker", () => {
  it("correlates concurrent/reentrant settlements only by exact token identity", () => {
    const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
      signalTerminal: vi.fn(),
    });
    const firstToken = Object.freeze({});
    const secondToken = Object.freeze({});
    broker.arm(firstToken);
    broker.arm(secondToken);
    broker.bindExpected(firstToken, restartAnchorV1);
    broker.bindExpected(secondToken, loadAnchorV1);

    broker.producer.installed({ token: secondToken, anchor: loadAnchorV1 });
    broker.producer.installed({ token: firstToken, anchor: restartAnchorV1 });

    expect(broker.take(firstToken)).toEqual({ kind: "installed", anchor: restartAnchorV1 });
    expect(broker.take(secondToken)).toEqual({ kind: "installed", anchor: loadAnchorV1 });
    expect(broker.take(firstToken)).toEqual({ kind: "missing" });
  });

  it("does not retain or redirect unarmed expected anchors or foreign installed receipts", () => {
    const signalTerminal = vi.fn();
    const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({ signalTerminal });
    const expectedToken = Object.freeze({});
    const foreignToken = Object.freeze({});
    broker.arm(expectedToken);
    broker.bindExpected(expectedToken, restartAnchorV1);

    broker.bindExpected(foreignToken, loadAnchorV1);
    broker.producer.installed({ token: foreignToken, anchor: loadAnchorV1 });
    expect(broker.take(expectedToken)).toEqual({ kind: "missing" });

    // A later operation cannot consume either old foreign observation.
    broker.arm(foreignToken);
    expect(() => broker.producer.installed({ token: foreignToken, anchor: loadAnchorV1 })).toThrow(
      "ui.presentation_successor_activation_failed",
    );
    expect(broker.take(foreignToken)).toEqual({ kind: "mismatched" });
    expect(signalTerminal).toHaveBeenCalledOnce();
  });

  it("requires exact bound anchor identity and fails closed on a conflicting duplicate", () => {
    const events: string[] = [];
    const signalTerminal = vi.fn(() => events.push("terminal"));
    const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({ signalTerminal });
    const wrongReceiptToken = Object.freeze({});
    const conflictingBindingToken = Object.freeze({});
    broker.arm(wrongReceiptToken);
    broker.bindExpected(wrongReceiptToken, restartAnchorV1);
    expect(() =>
      broker.producer.installed({
        token: wrongReceiptToken,
        anchor: equalButForeignRestartAnchorV1,
      })
    ).toThrow("ui.presentation_successor_activation_failed");
    events.push("producer-returned");

    broker.arm(conflictingBindingToken);
    broker.bindExpected(conflictingBindingToken, restartAnchorV1);
    broker.bindExpected(conflictingBindingToken, restartAnchorV1);
    expect(() => broker.bindExpected(conflictingBindingToken, loadAnchorV1)).toThrow(
      "ui.presentation_successor_activation_failed",
    );

    expect(events).toEqual(["terminal", "producer-returned", "terminal"]);
    expect(broker.take(wrongReceiptToken)).toEqual({ kind: "mismatched" });
    expect(broker.take(conflictingBindingToken)).toEqual({ kind: "mismatched" });
  });

  it("marks an armed exact token failed and synchronously signals terminal for every origin", () => {
    const events: string[] = [];
    const signalTerminal = vi.fn(() => events.push("terminal"));
    const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({ signalTerminal });
    const token = Object.freeze({});
    const failure = new Error("activation failed");
    broker.arm(token);
    broker.bindExpected(token, restartAnchorV1);

    broker.producer.failed({ token, anchor: restartAnchorV1, error: failure });
    events.push("producer-returned");

    expect(events).toEqual(["terminal", "producer-returned"]);
    expect(broker.take(token)).toEqual({
      kind: "failed",
      anchor: restartAnchorV1,
      error: failure,
    });

    broker.producer.failed({ token: null, anchor: loadAnchorV1, error: failure });
    broker.producer.failed({ token: Object.freeze({}), anchor: loadAnchorV1, error: failure });
    expect(signalTerminal).toHaveBeenCalledTimes(3);
  });

  it("settles each armed token once without letting a duplicate overwrite the first outcome", () => {
    const signalTerminal = vi.fn();
    const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({ signalTerminal });
    const installedToken = Object.freeze({});
    const failedToken = Object.freeze({});
    const failure = new Error("activation failed");
    broker.arm(installedToken);
    broker.arm(failedToken);
    broker.bindExpected(installedToken, restartAnchorV1);
    broker.bindExpected(failedToken, restartAnchorV1);

    broker.producer.installed({ token: installedToken, anchor: restartAnchorV1 });
    broker.producer.installed({ token: installedToken, anchor: restartAnchorV1 });
    broker.producer.failed({ token: installedToken, anchor: loadAnchorV1, error: failure });
    broker.producer.failed({ token: failedToken, anchor: restartAnchorV1, error: failure });
    broker.producer.installed({ token: failedToken, anchor: loadAnchorV1 });

    expect(broker.take(installedToken)).toEqual({ kind: "installed", anchor: restartAnchorV1 });
    expect(broker.take(failedToken)).toEqual({
      kind: "failed",
      anchor: restartAnchorV1,
      error: failure,
    });
    // Producer failures are terminal even if the same token had already installed.
    expect(signalTerminal).toHaveBeenCalledTimes(2);
  });

  it("promotes a conflicting duplicate installed receipt to mismatched", () => {
    const signalTerminal = vi.fn();
    const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({ signalTerminal });
    const token = Object.freeze({});
    broker.arm(token);
    broker.bindExpected(token, restartAnchorV1);
    broker.producer.installed({ token, anchor: restartAnchorV1 });
    expect(() => broker.producer.installed({ token, anchor: loadAnchorV1 })).toThrow(
      "ui.presentation_successor_activation_failed",
    );

    expect(broker.take(token)).toEqual({ kind: "mismatched" });
    expect(signalTerminal).toHaveBeenCalledOnce();
  });

  it("cancels non-anchored operations and clears all live entries on disposal", () => {
    const signalTerminal = vi.fn();
    const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({ signalTerminal });
    const cancelledToken = Object.freeze({});
    const disposedToken = Object.freeze({});
    broker.arm(cancelledToken);
    broker.arm(disposedToken);
    broker.cancel(cancelledToken);
    broker.producer.installed({ token: cancelledToken, anchor: restartAnchorV1 });

    expect(broker.take(cancelledToken)).toEqual({ kind: "missing" });
    broker.dispose();
    expect(broker.take(disposedToken)).toEqual({ kind: "missing" });
    expect(() => broker.arm(Object.freeze({}))).toThrow(
      "web.presentation_successor_acknowledgment_broker_disposed",
    );

    broker.producer.failed({
      token: disposedToken,
      anchor: restartAnchorV1,
      error: new Error("late"),
    });
    expect(signalTerminal).not.toHaveBeenCalled();
  });
});

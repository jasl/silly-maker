// SPDX-License-Identifier: MIT
import { parseNonNegativeSafeInteger } from "@sillymaker/base";
import type { SessionAnchorResultV1 } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import { createWebApplicationTerminalSupervisorInternalV1 } from "./application-terminal-supervisor.ts";
import { createCompositionBoundRestartLifecycleInternalV1 } from "./composition-bound-restart-lifecycle.ts";
import { createPresentationSuccessorAcknowledgmentBrokerInternalV1 } from "./presentation-successor-acknowledgment.ts";

const restartAnchorV1 = {
  epoch: parseNonNegativeSafeInteger(1),
  origin: "restart" as const,
};

function anchoredResultV1(commandSequence = 0): SessionAnchorResultV1 {
  return ({
    kind: "anchored",
    commandSequence: parseNonNegativeSafeInteger(commandSequence),
  });
}

function deferredV1<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return ({ promise, resolve });
}

function immediateTerminalV1() {
  let terminalError: Error | null = null;
  const signalTerminal = (error: Error): void => {
    terminalError ??= error;
  };
  const terminate = vi.fn((error: Error): Promise<never> => {
    signalTerminal(error);
    return Promise.reject(terminalError);
  });
  return ({
    getTerminalError: () => terminalError,
    signalTerminal,
    terminate,
  });
}

describe("composition-bound restart lifecycle", () => {
  it("rejects an already-terminal application without allocating or queueing a restart", async () => {
    const release = deferredV1<"released">();
    const terminal = createWebApplicationTerminalSupervisorInternalV1({
      fenceSteps: [],
      cleanupSteps: [],
      releaseCorePersistence: () => release.promise,
    });
    const primary = new Error("ui.presentation_successor_activation_failed");
    terminal.signalTerminal(primary);
    const prepareRestart = vi.fn(() => ({
      publicationContext: {},
      run: vi.fn(() => Promise.resolve(anchoredResultV1())),
    }));
    const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
      signalTerminal: terminal.signalTerminal,
    });
    const lifecycle = createCompositionBoundRestartLifecycleInternalV1({
      prepareRestart,
      acknowledgments: broker,
      terminal,
    });

    const restart = lifecycle.restart();
    expect(prepareRestart).not.toHaveBeenCalled();
    release.resolve("released");
    await expect(restart).rejects.toBe(primary);
  });

  it("arms the exact prepared token before run and exposes only a matching installed result", async () => {
    const terminal = immediateTerminalV1();
    const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
      signalTerminal: (error) => {
        void terminal.terminate(error).catch(() => undefined);
      },
    });
    const token = {};
    const result = anchoredResultV1();
    const lifecycle = createCompositionBoundRestartLifecycleInternalV1({
      prepareRestart: () => ({
        publicationContext: token,
        run: () => {
          // This settlement is dropped unless arm happened before run.
          broker.bindExpected(token, restartAnchorV1);
          broker.producer.installed({ token, anchor: restartAnchorV1 });
          return Promise.resolve(result);
        },
      }),
      acknowledgments: broker,
      terminal,
    });

    await expect(lifecycle.restart()).resolves.toBe(result);
    expect(terminal.terminate).not.toHaveBeenCalled();
  });

  it.each(
    [
      { kind: "rejected", code: "busy" },
      { kind: "faulted", code: "story.failure" },
    ] as const,
  )(
    "preserves valid $kind and cancels its unused armed entry",
    async (raw: SessionAnchorResultV1) => {
      const terminal = immediateTerminalV1();
      const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
        signalTerminal: vi.fn(),
      });
      const token = {};
      const lifecycle = createCompositionBoundRestartLifecycleInternalV1({
        prepareRestart: () => ({ publicationContext: token, run: () => Promise.resolve(raw) }),
        acknowledgments: broker,
        terminal,
      });

      await expect(lifecycle.restart()).resolves.toEqual(raw);
      broker.producer.installed({ token, anchor: restartAnchorV1 });
      expect(broker.take(token)).toEqual({ kind: "missing" });
      expect(terminal.terminate).not.toHaveBeenCalled();
    },
  );

  it.each(["missing", "foreign"] as const)(
    "terminalizes anchored with a %s successor acknowledgment",
    async (kind: "missing" | "foreign") => {
      const terminal = immediateTerminalV1();
      const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
        signalTerminal: vi.fn(),
      });
      const token = {};
      const foreignToken = {};
      const lifecycle = createCompositionBoundRestartLifecycleInternalV1({
        prepareRestart: () => ({
          publicationContext: token,
          run: () => {
            broker.bindExpected(token, restartAnchorV1);
            if (kind === "foreign") {
              broker.producer.installed({ token: foreignToken, anchor: restartAnchorV1 });
            }
            return Promise.resolve(anchoredResultV1());
          },
        }),
        acknowledgments: broker,
        terminal,
      });

      await expect(lifecycle.restart()).rejects.toThrow(
        "ui.presentation_successor_activation_failed",
      );
      expect(terminal.terminate).toHaveBeenCalledOnce();
    },
  );

  it("terminalizes an anchored result whose installed receipt carries a different anchor", async () => {
    const events: string[] = [];
    const terminal = immediateTerminalV1();
    const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
      signalTerminal: (error) => {
        events.push("terminal");
        terminal.signalTerminal(error);
      },
    });
    const token = {};
    const mismatchedAnchor = {
      epoch: parseNonNegativeSafeInteger(2),
      origin: "restart" as const,
    };
    const lifecycle = createCompositionBoundRestartLifecycleInternalV1({
      prepareRestart: () => ({
        publicationContext: token,
        run: () => {
          broker.bindExpected(token, restartAnchorV1);
          try {
            broker.producer.installed({ token, anchor: mismatchedAnchor });
          } catch {
            // Faithful Core observer isolation: the internal callback failure
            // is diagnosed while the authoritative operation still settles.
            events.push("observer-diagnostic");
          }
          return Promise.resolve(anchoredResultV1());
        },
      }),
      acknowledgments: broker,
      terminal,
    });

    const restart = lifecycle.restart().catch((error: unknown) => {
      events.push("raw-continuation");
      throw error;
    });
    await expect(restart).rejects.toThrow(
      "ui.presentation_successor_activation_failed",
    );
    expect(events).toEqual(["terminal", "observer-diagnostic", "raw-continuation"]);
    expect(terminal.terminate).toHaveBeenCalledOnce();
  });

  it.each([
    {
      observed: "event" as const,
      raw: { kind: "rejected" as const, code: "busy" as const },
    },
    {
      observed: "installed" as const,
      raw: { kind: "rejected" as const, code: "busy" as const },
    },
    {
      observed: "event" as const,
      raw: { kind: "faulted" as const, code: "story.failure" },
    },
    {
      observed: "installed" as const,
      raw: { kind: "faulted" as const, code: "story.failure" },
    },
  ])(
    "terminalizes $raw.kind after its token has an observed $observed settlement",
    async ({ observed, raw }) => {
      const terminal = immediateTerminalV1();
      const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
        signalTerminal: vi.fn(),
      });
      const token = {};
      const lifecycle = createCompositionBoundRestartLifecycleInternalV1({
        prepareRestart: () => ({
          publicationContext: token,
          run: () => {
            broker.bindExpected(token, restartAnchorV1);
            if (observed === "installed") {
              broker.producer.installed({ token, anchor: restartAnchorV1 });
            }
            return Promise.resolve(raw);
          },
        }),
        acknowledgments: broker,
        terminal,
      });

      await expect(lifecycle.restart()).rejects.toThrow(
        "ui.presentation_successor_activation_failed",
      );
      expect(terminal.terminate).toHaveBeenCalledOnce();
    },
  );

  it("keeps a producer failure terminal and hides it until shared teardown settles", async () => {
    const release = deferredV1<"released">();
    let broker!: ReturnType<typeof createPresentationSuccessorAcknowledgmentBrokerInternalV1>;
    const terminal = createWebApplicationTerminalSupervisorInternalV1({
      fenceSteps: [],
      cleanupSteps: [{ name: "broker", run: () => broker.dispose() }],
      releaseCorePersistence: () => release.promise,
    });
    broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
      signalTerminal: terminal.signalTerminal,
    });
    const token = {};
    const lifecycle = createCompositionBoundRestartLifecycleInternalV1({
      prepareRestart: () => ({
        publicationContext: token,
        run: () => {
          broker.bindExpected(token, restartAnchorV1);
          broker.producer.failed({
            token,
            anchor: restartAnchorV1,
            error: new Error("activation failed"),
          });
          return Promise.resolve(anchoredResultV1());
        },
      }),
      acknowledgments: broker,
      terminal,
    });

    let settled = false;
    const restart = lifecycle.restart().finally(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    release.resolve("released");
    await expect(restart).rejects.toThrow("ui.presentation_successor_activation_failed");
  });

  it("preserves pre-commit synchronous run failures as asynchronous original rejections", async () => {
    const failure = new Error("raw restart failed");
    const terminal = immediateTerminalV1();
    const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
      signalTerminal: vi.fn(),
    });
    const lifecycle = createCompositionBoundRestartLifecycleInternalV1({
      prepareRestart: () => ({
        publicationContext: {},
        run: () => {
          throw failure;
        },
      }),
      acknowledgments: broker,
      terminal,
    });

    let returned = false;
    const restart = lifecycle.restart();
    returned = true;
    expect(returned).toBe(true);
    await expect(restart).rejects.toBe(failure);
    expect(terminal.terminate).not.toHaveBeenCalled();
  });

  it("preserves a raw Promise rejection and cancels its exact acknowledgment arm", async () => {
    const failure = new Error("raw restart rejected");
    const terminal = immediateTerminalV1();
    const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
      signalTerminal: vi.fn(),
    });
    const token = {};
    const lifecycle = createCompositionBoundRestartLifecycleInternalV1({
      prepareRestart: () => ({
        publicationContext: token,
        run: () => Promise.reject(failure),
      }),
      acknowledgments: broker,
      terminal,
    });

    await expect(lifecycle.restart()).rejects.toBe(failure);
    broker.producer.installed({ token, anchor: restartAnchorV1 });
    expect(broker.take(token)).toEqual({ kind: "missing" });
    expect(terminal.terminate).not.toHaveBeenCalled();
  });

  it.each([
    { settlement: "sync throw" as const, observation: "event" as const },
    { settlement: "sync throw" as const, observation: "installed" as const },
    { settlement: "Promise reject" as const, observation: "event" as const },
    { settlement: "Promise reject" as const, observation: "installed" as const },
  ])(
    "terminalizes $settlement after an exact $observation was already observed",
    async ({ settlement, observation }) => {
      const rawFailure = new Error("raw restart failed after replacement event");
      const terminal = immediateTerminalV1();
      const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
        signalTerminal: vi.fn(),
      });
      const token = {};
      const lifecycle = createCompositionBoundRestartLifecycleInternalV1({
        prepareRestart: () => ({
          publicationContext: token,
          run: () => {
            broker.bindExpected(token, restartAnchorV1);
            if (observation === "installed") {
              broker.producer.installed({ token, anchor: restartAnchorV1 });
            }
            if (settlement === "sync throw") throw rawFailure;
            return Promise.reject(rawFailure);
          },
        }),
        acknowledgments: broker,
        terminal,
      });

      await expect(lifecycle.restart()).rejects.toThrow(
        "ui.presentation_successor_activation_failed",
      );
      expect(terminal.terminate).toHaveBeenCalledOnce();
    },
  );

  it("correlates concurrent restart completions without FIFO inference", async () => {
    const firstRaw = deferredV1<SessionAnchorResultV1>();
    const secondRaw = deferredV1<SessionAnchorResultV1>();
    const firstToken = {};
    const secondToken = {};
    const prepared = [
      { publicationContext: firstToken, run: () => firstRaw.promise },
      { publicationContext: secondToken, run: () => secondRaw.promise },
    ];
    const terminal = immediateTerminalV1();
    const broker = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
      signalTerminal: vi.fn(),
    });
    const lifecycle = createCompositionBoundRestartLifecycleInternalV1({
      prepareRestart: () => prepared.shift()!,
      acknowledgments: broker,
      terminal,
    });

    const first = lifecycle.restart();
    const second = lifecycle.restart();
    broker.bindExpected(secondToken, restartAnchorV1);
    broker.producer.installed({ token: secondToken, anchor: restartAnchorV1 });
    secondRaw.resolve(anchoredResultV1(2));
    await expect(second).resolves.toEqual({ kind: "anchored", commandSequence: 2 });
    broker.bindExpected(firstToken, restartAnchorV1);
    broker.producer.installed({ token: firstToken, anchor: restartAnchorV1 });
    firstRaw.resolve(anchoredResultV1(1));
    await expect(first).resolves.toEqual({ kind: "anchored", commandSequence: 1 });
  });
});

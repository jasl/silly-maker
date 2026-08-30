// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  hasUnownedProcessExecutionV1,
  pollPassiveProcessProjectionV1,
  pollOwnedAgentRunLeaseV1,
  recoverLostAgentRunExecutionV1,
  startAgentRunLeaseMonitorV1,
} from "../ui/agent-run-lease-monitor.ts";

function deferredV1<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Agent run lease monitor", () => {
  it("discovers another tab's acquired attempt and projects the composer as read-only", async () => {
    let projection = {
      processId: "process.shared",
      activeAttemptId: null as string | null,
    };
    const refresh = vi.fn(() => {
      projection = {
        processId: "process.shared",
        activeAttemptId: "attempt.other-tab",
      };
      return Promise.resolve();
    });
    const ownsAttempt = (attemptId: string): boolean => attemptId === "attempt.this-tab";

    await expect(pollPassiveProcessProjectionV1({
      processId: "process.shared",
      read: () => projection,
      ownsAttempt,
      refresh,
    })).resolves.toBe("continue");
    expect(refresh).toHaveBeenCalledOnce();
    expect(hasUnownedProcessExecutionV1({
      activeAttemptId: projection.activeAttemptId,
      ownsAttempt,
    })).toBe(true);
  });

  it("stops passive projection polling once this tab owns the active attempt", async () => {
    const refresh = vi.fn();
    await expect(pollPassiveProcessProjectionV1({
      processId: "process.shared",
      read: () => ({
        processId: "process.shared",
        activeAttemptId: "attempt.this-tab",
      }),
      ownsAttempt: (attemptId) => attemptId === "attempt.this-tab",
      refresh,
    })).resolves.toBe("stop");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("treats a terminal-in-progress idle renewal as owned instead of cancelling it", async () => {
    const onLost = vi.fn();
    await expect(pollOwnedAgentRunLeaseV1({
      renew: async () => "idle",
      onLost,
    })).resolves.toBe("continue");
    expect(onLost).not.toHaveBeenCalled();
  });

  it("cancels the exact run and releases its Workspace before Process recovery", async () => {
    const operations: string[] = [];
    await expect(pollOwnedAgentRunLeaseV1({
      renew: async () => "lost",
      onLost: () =>
        recoverLostAgentRunExecutionV1({
          cancelRun: async () => {
            operations.push("cancel");
          },
          releaseWorkspace: async () => {
            operations.push("release");
          },
          reloadProcess: async () => {
            operations.push("reload");
          },
        }),
    })).resolves.toBe("stop");
    expect(operations).toEqual(["cancel", "release", "reload"]);
  });

  it("still releases and reloads after an exact cancellation transport failure", async () => {
    const operations: string[] = [];
    const failure = new Error("cancel transport failed");
    await expect(recoverLostAgentRunExecutionV1({
      cancelRun: async () => {
        operations.push("cancel");
        throw failure;
      },
      releaseWorkspace: async () => {
        operations.push("release");
      },
      reloadProcess: async () => {
        operations.push("reload");
      },
    })).rejects.toBe(failure);
    expect(operations).toEqual(["cancel", "release", "reload"]);
  });

  it("starts the next deadline only after the preceding renewal settles", async () => {
    vi.useFakeTimers();
    const first = deferredV1<"continue">();
    const poll = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue("stop");
    const monitor = startAgentRunLeaseMonitorV1({
      intervalMilliseconds: 10,
      poll,
      onError: vi.fn(),
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(poll).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(100);
    expect(poll).toHaveBeenCalledOnce();

    first.resolve("continue");
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(9);
    expect(poll).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(2);
    await monitor.drain();
  });

  it("cancels a pending deadline and drains an operation already in flight", async () => {
    vi.useFakeTimers();
    const active = deferredV1<"continue">();
    const poll = vi.fn(() => active.promise);
    const monitor = startAgentRunLeaseMonitorV1({
      intervalMilliseconds: 10,
      poll,
      onError: vi.fn(),
    });

    await vi.advanceTimersByTimeAsync(10);
    const drained = monitor.drain();
    await vi.advanceTimersByTimeAsync(100);
    expect(poll).toHaveBeenCalledOnce();

    active.resolve("continue");
    await drained;
    await vi.advanceTimersByTimeAsync(100);
    expect(poll).toHaveBeenCalledOnce();
  });

  it("stops and reports a rejected operation without an unhandled retry", async () => {
    vi.useFakeTimers();
    const error = new Error("renew failed");
    const onError = vi.fn();
    const poll = vi.fn().mockRejectedValue(error);
    const monitor = startAgentRunLeaseMonitorV1({
      intervalMilliseconds: 10,
      poll,
      onError,
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(onError).toHaveBeenCalledWith(error);
    await vi.advanceTimersByTimeAsync(100);
    expect(poll).toHaveBeenCalledOnce();
    await monitor.drain();
  });
});

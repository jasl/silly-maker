// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import { act, cleanup, render } from "@testing-library/react";
import { Suspense, startTransition } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type ProgramOwnedExecutionMonitorV1,
  useProcessExecutionMonitorV1,
} from "./use-process-execution-monitor.ts";

function MonitorHarnessV1(props: {
  readonly activeAttemptId: string | null;
  readonly ownedExecution: ProgramOwnedExecutionMonitorV1 | null;
  readonly readProjection: () => {
    readonly processId: string;
    readonly activeAttemptId: string | null;
  } | null;
  readonly isOwnedAttempt: (attemptId: string) => boolean;
  readonly refreshPassive: () => Promise<void>;
  readonly registerDrain: (drain: () => Promise<void>) => () => void;
  readonly onError: (error: unknown) => void;
  readonly suspendWith?: Promise<never>;
}) {
  useProcessExecutionMonitorV1({
    processId: "process.monitor",
    activeAttemptId: props.activeAttemptId,
    ownedExecution: props.ownedExecution,
    readProjection: props.readProjection,
    isOwnedAttempt: props.isOwnedAttempt,
    refreshPassive: props.refreshPassive,
    intervalMilliseconds: 1_000,
    registerDrain: props.registerDrain,
    onError: props.onError,
  });
  if (props.suspendWith !== undefined) throw props.suspendWith;
  return null;
}

describe("Program Process execution monitor", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("starts while idle and keeps refreshing after another owner acquires the Process", async () => {
    let projection = { processId: "process.monitor", activeAttemptId: null as string | null };
    const refreshPassive = vi.fn(async () => {
      projection = { processId: "process.monitor", activeAttemptId: "attempt.remote" };
    });
    const unregister = vi.fn();
    const registerDrain = vi.fn((_drain: () => Promise<void>) => unregister);

    render(
      <MonitorHarnessV1
        activeAttemptId={null}
        ownedExecution={null}
        readProjection={() => projection}
        isOwnedAttempt={() => false}
        refreshPassive={refreshPassive}
        registerDrain={registerDrain}
        onError={vi.fn()}
      />,
    );

    await act(() => vi.advanceTimersByTimeAsync(1_000));
    await act(() => vi.advanceTimersByTimeAsync(1_000));

    expect(refreshPassive).toHaveBeenCalledTimes(2);
    expect(registerDrain).toHaveBeenCalledTimes(1);
  });

  it("renews an owned attempt and performs exact lost-run recovery before stopping", async () => {
    const recoverLost = vi.fn(async () => undefined);
    const renew = vi.fn(async () => "lost" as const);
    const onError = vi.fn();
    render(
      <MonitorHarnessV1
        activeAttemptId="attempt.local"
        ownedExecution={{ attemptId: "attempt.local", renew, recoverLost }}
        readProjection={() => ({
          processId: "process.monitor",
          activeAttemptId: "attempt.local",
        })}
        isOwnedAttempt={(attemptId) => attemptId === "attempt.local"}
        refreshPassive={vi.fn(async () => undefined)}
        registerDrain={() => () => undefined}
        onError={onError}
      />,
    );

    await act(() => vi.advanceTimersByTimeAsync(1_000));
    await act(() => vi.advanceTimersByTimeAsync(5_000));

    expect(renew).toHaveBeenCalledTimes(1);
    expect(recoverLost).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("shares one drain settlement between React cleanup and the application registry", () => {
    let registeredDrain: (() => Promise<void>) | null = null;
    const unregister = vi.fn(() => {
      void registeredDrain?.();
    });
    const mounted = render(
      <MonitorHarnessV1
        activeAttemptId={null}
        ownedExecution={null}
        readProjection={() => ({ processId: "process.monitor", activeAttemptId: null })}
        isOwnedAttempt={() => false}
        refreshPassive={vi.fn(async () => undefined)}
        registerDrain={(drain) => {
          registeredDrain = drain;
          return unregister;
        }}
        onError={vi.fn()}
      />,
    );

    expect(registeredDrain).not.toBeNull();
    const firstSettlement = registeredDrain!();
    expect(registeredDrain!()).toBe(firstSettlement);

    mounted.unmount();

    expect(unregister).toHaveBeenCalledTimes(1);
    expect(registeredDrain!()).toBe(firstSettlement);
  });

  it("keeps the last committed callbacks when a transition render is abandoned", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const committedRefresh = vi.fn(async () => undefined);
    const abandonedRefresh = vi.fn(async () => undefined);
    const registerDrain = vi.fn(() => () => undefined);
    const onError = vi.fn();
    const neverSettles = new Promise<never>(() => undefined);

    await act(async () => {
      root.render(
        <Suspense fallback={null}>
          <MonitorHarnessV1
            activeAttemptId={null}
            ownedExecution={null}
            readProjection={() => ({ processId: "process.monitor", activeAttemptId: null })}
            isOwnedAttempt={() => false}
            refreshPassive={committedRefresh}
            registerDrain={registerDrain}
            onError={onError}
          />
        </Suspense>,
      );
    });

    await act(async () => {
      startTransition(() => {
        root.render(
          <Suspense fallback={null}>
            <MonitorHarnessV1
              activeAttemptId={null}
              ownedExecution={null}
              readProjection={() => ({ processId: "process.monitor", activeAttemptId: null })}
              isOwnedAttempt={() => false}
              refreshPassive={abandonedRefresh}
              registerDrain={registerDrain}
              onError={onError}
              suspendWith={neverSettles}
            />
          </Suspense>,
        );
      });
      await Promise.resolve();
    });

    await act(() => vi.advanceTimersByTimeAsync(1_000));

    expect(committedRefresh).toHaveBeenCalledTimes(1);
    expect(abandonedRefresh).not.toHaveBeenCalled();
    expect(registerDrain).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();

    await act(async () => root.unmount());
    container.remove();
  });
});

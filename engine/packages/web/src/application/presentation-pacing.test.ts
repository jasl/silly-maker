// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";
import { createManualPresentationClockV1 } from "@sillymaker/ui";
import { installPresentationPacingInternalV1 } from "./presentation-pacing.ts";
import type { InstallPresentationPacingInputInternalV1 } from "./presentation-pacing.ts";

interface PacingHarnessV1 {
  readonly clock: ReturnType<typeof createManualPresentationClockV1>;
  readonly dispatch: ReturnType<typeof vi.fn>;
  readonly reportFailure: ReturnType<typeof vi.fn>;
  pinCount(): number;
  setSnapshot(snapshot: unknown): void;
  setPending(pending: { kind: string; pace?: string } | null): void;
  install(
    overrides?: Partial<InstallPresentationPacingInputInternalV1>,
  ): { dispose(): void };
}

function createHarnessV1(input?: {
  readonly enabledWhen?: (publication: unknown) => boolean;
  readonly realtimeWindow?: (publication: unknown) => boolean;
  readonly hidden?: () => boolean;
}): PacingHarnessV1 {
  const clock = createManualPresentationClockV1();
  const dispatch = vi.fn((_elapsedMs: number) => Promise.resolve());
  const reportFailure = vi.fn();
  let snapshot: unknown = {};
  let pending: { kind: string; pace?: string } | null = null;
  let activePins = 0;
  const presentationListeners = new Set<() => void>();
  const narrativeListeners = new Set<() => void>();

  return {
    clock,
    dispatch,
    reportFailure,
    pinCount: () => activePins,
    setSnapshot(next: unknown): void {
      snapshot = next;
      for (const listener of [...presentationListeners]) listener();
    },
    setPending(next: { kind: string; pace?: string } | null): void {
      pending = next;
      for (const listener of [...narrativeListeners]) listener();
    },
    install(overrides?: Partial<InstallPresentationPacingInputInternalV1>) {
      return installPresentationPacingInternalV1({
        presentation: {
          getSnapshot: () => snapshot,
          subscribe: (listener) => {
            presentationListeners.add(listener);
            return () => presentationListeners.delete(listener);
          },
        },
        narrative: {
          getCurrentSelectionInternalV1: () => ({ pending }),
          subscribeInternalV1: (listener) => {
            narrativeListeners.add(listener);
            return () => narrativeListeners.delete(listener);
          },
        },
        rate: {
          pinRealtime: () => {
            activePins += 1;
            let released = false;
            return () => {
              if (released) return;
              released = true;
              activePins -= 1;
            };
          },
        },
        clock,
        timeReporting: {
          quantumMs: 100,
          enabledWhen: input?.enabledWhen ?? (() => true),
          dispatch,
        },
        realtimeWindow: input?.realtimeWindow ?? null,
        visibility: input?.hidden === undefined ? null : {
          isHidden: input.hidden,
          subscribe: () => () => undefined,
        },
        reportFailure,
        ...overrides,
      });
    },
  };
}

describe("installPresentationPacingInternalV1", () => {
  it("reports session time only while the declared predicate holds", () => {
    const harness = createHarnessV1({
      enabledWhen: (publication) => (publication as { active?: boolean }).active === true,
    });
    harness.install();

    harness.clock.advance(500);
    expect(harness.dispatch).not.toHaveBeenCalled();

    harness.setSnapshot({ active: true });
    harness.clock.advance(100);
    expect(harness.dispatch.mock.calls).toEqual([[100]]);

    harness.setSnapshot({ active: false });
    harness.clock.advance(500);
    expect(harness.dispatch).toHaveBeenCalledTimes(1);
  });

  it("yields to a pending hold and re-anchors when the hold resolves", () => {
    const harness = createHarnessV1();
    harness.install();

    harness.setPending({ kind: "hold" });
    harness.clock.advance(5_000);
    expect(harness.dispatch).not.toHaveBeenCalled();

    harness.setPending(null);
    harness.clock.advance(100);
    expect(harness.dispatch.mock.calls).toEqual([[100]]);

    // Non-hold pendings (say, choice) do not close the gate.
    harness.setPending({ kind: "say" });
    harness.clock.advance(100);
    expect(harness.dispatch.mock.calls).toEqual([[100], [100]]);
  });

  it("drops hidden-document time instead of accumulating it", () => {
    let hidden = false;
    const harness = createHarnessV1({ hidden: () => hidden });
    harness.install();

    hidden = true;
    harness.setSnapshot({});
    harness.clock.advance(10_000);
    expect(harness.dispatch).not.toHaveBeenCalled();

    hidden = false;
    harness.setSnapshot({});
    harness.clock.advance(100);
    expect(harness.dispatch.mock.calls).toEqual([[100]]);
  });

  it("pins the rate for a realtime hold and releases when it ends", () => {
    const harness = createHarnessV1();
    harness.install();

    harness.setPending({ kind: "hold", pace: "cinematic" });
    expect(harness.pinCount()).toBe(0);

    harness.setPending({ kind: "hold", pace: "realtime" });
    expect(harness.pinCount()).toBe(1);

    harness.setPending(null);
    expect(harness.pinCount()).toBe(0);
  });

  it("pins for the story-declared realtime window and holds one pin across overlap", () => {
    const harness = createHarnessV1({
      realtimeWindow: (publication) => (publication as { window?: boolean }).window === true,
    });
    harness.install();

    harness.setSnapshot({ window: true });
    expect(harness.pinCount()).toBe(1);

    // A realtime hold overlapping the declared window keeps the single pin.
    harness.setPending({ kind: "hold", pace: "realtime" });
    expect(harness.pinCount()).toBe(1);

    harness.setSnapshot({ window: false });
    expect(harness.pinCount()).toBe(1);

    harness.setPending(null);
    expect(harness.pinCount()).toBe(0);
  });

  it("latches reporting off when the predicate throws and reports once", () => {
    const harness = createHarnessV1({
      enabledWhen: () => {
        throw new Error("broken predicate");
      },
    });
    harness.install();

    harness.setSnapshot({});
    harness.setSnapshot({});
    expect(harness.reportFailure).toHaveBeenCalledTimes(1);
    expect(harness.reportFailure.mock.calls[0]?.[0]).toBe("pacing.reporting_predicate_failed");

    harness.clock.advance(1_000);
    expect(harness.dispatch).not.toHaveBeenCalled();
  });

  it("treats a throwing realtime predicate as inactive but keeps the engine hold pin", () => {
    const harness = createHarnessV1({
      realtimeWindow: () => {
        throw new Error("broken window predicate");
      },
    });
    harness.install();

    expect(harness.reportFailure).toHaveBeenCalledTimes(1);
    expect(harness.reportFailure.mock.calls[0]?.[0]).toBe("pacing.realtime_predicate_failed");
    expect(harness.pinCount()).toBe(0);

    harness.setPending({ kind: "hold", pace: "realtime" });
    expect(harness.pinCount()).toBe(1);
    expect(harness.reportFailure).toHaveBeenCalledTimes(1);
  });

  it("latches reporting off when the story dispatch rejects", async () => {
    const harness = createHarnessV1();
    harness.dispatch.mockImplementation(() => Promise.reject(new Error("miswired")));
    harness.install();

    harness.clock.advance(100);
    expect(harness.dispatch).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(harness.reportFailure).toHaveBeenCalledTimes(1);
    });
    expect(harness.reportFailure.mock.calls[0]?.[0]).toBe("pacing.time_report_failed");

    harness.clock.advance(1_000);
    expect(harness.dispatch).toHaveBeenCalledTimes(1);
  });

  it("reports without a narrative runtime and skips pins it never took", () => {
    const harness = createHarnessV1();
    harness.install({ narrative: null });

    harness.clock.advance(100);
    expect(harness.dispatch.mock.calls).toEqual([[100]]);
    expect(harness.pinCount()).toBe(0);
  });

  it("dispose releases the outstanding pin and stops reporting", () => {
    const harness = createHarnessV1({
      realtimeWindow: (publication) => (publication as { window?: boolean }).window === true,
    });
    const pacing = harness.install();

    harness.setSnapshot({ window: true });
    expect(harness.pinCount()).toBe(1);

    pacing.dispose();
    expect(harness.pinCount()).toBe(0);
    harness.clock.advance(1_000);
    expect(harness.dispatch).not.toHaveBeenCalled();
    pacing.dispose();
  });
});

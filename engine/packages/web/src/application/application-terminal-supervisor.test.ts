// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  createWebApplicationTerminalSupervisorInternalV1,
  type WebApplicationTerminalSupervisorInternalV1,
} from "./application-terminal-supervisor.ts";

function deferredV1<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return ({ promise, resolve, reject });
}

describe("Web application terminal supervisor", () => {
  it("selects ordinary release separately from exact rebootstrap handoff", async () => {
    const ordinaryRelease = vi.fn(async (mode: "ordinary" | "rebootstrap") => {
      expect(mode).toBe("ordinary");
      return undefined;
    });
    const ordinary = createWebApplicationTerminalSupervisorInternalV1({
      fenceSteps: [],
      cleanupSteps: [],
      releaseCorePersistence: ordinaryRelease,
    });

    await expect(ordinary.disposeOrdinarily()).resolves.toBeUndefined();
    expect(ordinaryRelease).toHaveBeenCalledOnce();

    const handoff = { kind: "handoff" as const };
    const rebootstrapRelease = vi.fn(async (mode: "ordinary" | "rebootstrap") => {
      expect(mode).toBe("rebootstrap");
      return handoff;
    });
    const rebootstrap = createWebApplicationTerminalSupervisorInternalV1({
      fenceSteps: [],
      cleanupSteps: [],
      releaseCorePersistence: rebootstrapRelease,
    });

    await expect(rebootstrap.disposeForRebootstrap()).resolves.toBe(handoff);
    expect(rebootstrapRelease).toHaveBeenCalledOnce();
  });

  it("installs one disposal promise before synchronous fence/cleanup reentry", async () => {
    const events: string[] = [];
    const release = deferredV1<"released">();
    let supervisor!: WebApplicationTerminalSupervisorInternalV1<"released">;
    let fenceReentry: Promise<"released"> | undefined;
    let unmountReentry: Promise<"released"> | undefined;
    supervisor = createWebApplicationTerminalSupervisorInternalV1({
      fenceSteps: [
        {
          name: "core",
          run() {
            events.push("fence:core");
            fenceReentry = supervisor.disposeForRebootstrap();
          },
        },
        { name: "presentation", run: () => events.push("fence:presentation") },
      ],
      cleanupSteps: [
        {
          name: "root",
          run() {
            events.push("cleanup:root");
            unmountReentry = supervisor.disposeForRebootstrap();
          },
        },
        { name: "composition", run: () => events.push("cleanup:composition") },
      ],
      releaseCorePersistence: () => {
        events.push("release");
        return release.promise;
      },
    });

    const disposal = supervisor.disposeForRebootstrap();
    expect(fenceReentry).toBe(disposal);
    expect(unmountReentry).toBe(disposal);
    expect(supervisor.isDisposalStarted()).toBe(true);
    expect(events).toEqual([
      "fence:core",
      "fence:presentation",
      "cleanup:root",
      "cleanup:composition",
      "release",
    ]);

    release.resolve("released");
    await expect(disposal).resolves.toBe("released");
    expect(supervisor.disposeForRebootstrap()).toBe(disposal);
  });

  it("drains every fence before cleanup when the first fence reentrantly terminalizes", async () => {
    const events: string[] = [];
    const primary = new Error("ui.presentation_successor_activation_failed");
    let supervisor!: WebApplicationTerminalSupervisorInternalV1<"released">;
    let terminal!: Promise<never>;
    supervisor = createWebApplicationTerminalSupervisorInternalV1({
      fenceSteps: [
        {
          name: "first",
          run() {
            events.push("fence:first");
            terminal = supervisor.terminate(primary);
            void terminal.catch(() => undefined);
          },
        },
        { name: "second", run: () => events.push("fence:second") },
      ],
      cleanupSteps: [{ name: "root", run: () => events.push("cleanup") }],
      releaseCorePersistence: async () => {
        events.push("release");
        return "released" as const;
      },
    });

    const disposal = supervisor.disposeForRebootstrap();
    expect(events).toEqual(["fence:first", "fence:second", "cleanup", "release"]);
    await expect(disposal).resolves.toBe("released");
    await expect(terminal).rejects.toBe(primary);
  });

  it("closes Host and presentation ingress before Core invalidation can re-enter held callbacks", async () => {
    const events: string[] = [];
    let automationOpen = true;
    let pointerOpen = true;
    let presentationOpen = true;
    let durableMutations = 0;
    const heldAutomation = () => automationOpen && (durableMutations += 1);
    const heldPointer = () => pointerOpen && (durableMutations += 1);
    const heldPresentationIntent = () => presentationOpen && (durableMutations += 1);
    const supervisor = createWebApplicationTerminalSupervisorInternalV1({
      fenceSteps: [
        {
          name: "automation",
          run() {
            automationOpen = false;
            events.push("automation");
          },
        },
        {
          name: "pointer",
          run() {
            pointerOpen = false;
            events.push("pointer");
          },
        },
        {
          name: "presentation",
          run() {
            presentationOpen = false;
            events.push("presentation");
          },
        },
        {
          name: "core",
          run() {
            events.push("core");
            heldAutomation();
            heldPointer();
            heldPresentationIntent();
          },
        },
      ],
      cleanupSteps: [],
      releaseCorePersistence: async () => "released" as const,
    });

    await expect(supervisor.disposeForRebootstrap()).resolves.toBe("released");
    expect(events).toEqual(["automation", "pointer", "presentation", "core"]);
    expect(durableMutations).toBe(0);
  });

  it("isolates every cleanup and a throwing failure reporter while always reaching release", async () => {
    const events: string[] = [];
    const reportFailure = vi.fn(() => {
      events.push("report");
      throw new Error("logger failed");
    });
    const supervisor = createWebApplicationTerminalSupervisorInternalV1({
      fenceSteps: [
        {
          name: "broken-fence",
          run() {
            events.push("fence:broken");
            throw new Error("fence failed");
          },
        },
        { name: "later-fence", run: () => events.push("fence:later") },
      ],
      cleanupSteps: [
        {
          name: "broken-cleanup",
          run() {
            events.push("cleanup:broken");
            throw new Error("cleanup failed");
          },
        },
        { name: "later-cleanup", run: () => events.push("cleanup:later") },
      ],
      releaseCorePersistence: async () => {
        events.push("release");
        return "released" as const;
      },
      reportFailure,
    });

    await expect(supervisor.disposeForRebootstrap()).resolves.toBe("released");
    expect(events).toEqual([
      "fence:broken",
      "report",
      "fence:later",
      "cleanup:broken",
      "report",
      "cleanup:later",
      "release",
    ]);
    expect(reportFailure).toHaveBeenCalledTimes(2);
  });

  it("latches the first terminal error synchronously and rejects only after teardown", async () => {
    const release = deferredV1<"released">();
    const events: string[] = [];
    const supervisor = createWebApplicationTerminalSupervisorInternalV1({
      fenceSteps: [{ name: "core", run: () => events.push("fence") }],
      cleanupSteps: [{ name: "root", run: () => events.push("unmount") }],
      releaseCorePersistence: () => {
        events.push("release");
        return release.promise;
      },
    });
    const primary = new Error("ui.presentation_successor_activation_failed");
    const later = new Error("ui.lifecycle_restart_result_invalid");

    supervisor.signalTerminal(primary);
    expect(supervisor.getTerminalError()).toBe(primary);
    expect(events).toEqual(["fence", "unmount", "release"]);

    let rejected = false;
    const terminal = supervisor.terminate(later).catch((error: unknown) => {
      rejected = true;
      throw error;
    });
    await Promise.resolve();
    expect(rejected).toBe(false);

    release.resolve("released");
    await expect(terminal).rejects.toBe(primary);
    expect(supervisor.getTerminalError()).toBe(primary);
  });

  it("unmounts the live Root before a raw restart Promise continuation can publish title state", async () => {
    let resolveRestart!: (value: { readonly kind: "anchored" }) => void;
    const rawRestart = new Promise<{ readonly kind: "anchored" }>((resolve) => {
      resolveRestart = resolve;
    });
    let rootMounted = true;
    let titleVisible = false;
    const events: string[] = [];
    const supervisor = createWebApplicationTerminalSupervisorInternalV1({
      fenceSteps: [{ name: "ingress", run: () => events.push("fence") }],
      cleanupSteps: [
        {
          name: "root",
          run() {
            rootMounted = false;
            events.push("unmount");
          },
        },
      ],
      releaseCorePersistence: async () => {
        events.push("release");
        return "released" as const;
      },
    });
    const caller = rawRestart.then(() => {
      events.push("caller-continuation");
      if (rootMounted) titleVisible = true;
    });

    // This is the producer-side anchor callback: it runs before Core resolves
    // the raw restart Promise to the already-mounted DefaultGameRoot caller.
    supervisor.signalTerminal(new Error("ui.presentation_successor_activation_failed"));
    resolveRestart({ kind: "anchored" });
    await caller;

    expect(events).toEqual(["fence", "unmount", "release", "caller-continuation"]);
    expect(titleVisible).toBe(false);
  });

  it.each(["fulfilled", "rejected"] as const)(
    "keeps pagehide cleanup and release behind a %s autosave flush across ordinary reentry",
    async (settlement) => {
      const flush = deferredV1<void>();
      const events: string[] = [];
      const supervisor = createWebApplicationTerminalSupervisorInternalV1({
        fenceSteps: [{ name: "core", run: () => events.push("fence") }],
        cleanupSteps: [{ name: "root", run: () => events.push("unmount") }],
        releaseCorePersistence: async () => {
          events.push("release");
          return "released" as const;
        },
      });

      const pagehide = supervisor.disposeForPageHide(() => {
        events.push("flush");
        return flush.promise;
      });
      const ordinary = supervisor.disposeForRebootstrap();

      expect(ordinary).toBe(pagehide);
      expect(events).toEqual(["fence", "flush"]);
      if (settlement === "fulfilled") flush.resolve();
      else flush.reject(new Error("flush failed"));
      await expect(pagehide).resolves.toBe("released");
      expect(events).toEqual(["fence", "flush", "unmount", "release"]);
    },
  );

  it("unmounts synchronously on terminal pagehide concurrency but defers release behind flush", async () => {
    const flush = deferredV1<void>();
    const events: string[] = [];
    const supervisor = createWebApplicationTerminalSupervisorInternalV1({
      fenceSteps: [{ name: "core", run: () => events.push("fence") }],
      cleanupSteps: [{ name: "root", run: () => events.push("unmount") }],
      releaseCorePersistence: async () => {
        events.push("release");
        return "released" as const;
      },
    });
    const primary = new Error("ui.presentation_successor_activation_failed");

    const pagehide = supervisor.disposeForPageHide(() => {
      events.push("flush");
      return flush.promise;
    });
    const terminal = supervisor.terminate(primary);

    expect(events).toEqual(["fence", "flush", "unmount"]);
    flush.resolve();
    await expect(pagehide).resolves.toBe("released");
    await expect(terminal).rejects.toBe(primary);
    expect(events).toEqual(["fence", "flush", "unmount", "release"]);
  });

  it("keeps the terminal primary error when Core/Persistence release rejects", async () => {
    const releaseFailure = new Error("release failed");
    const reportFailure = vi.fn();
    const supervisor = createWebApplicationTerminalSupervisorInternalV1({
      fenceSteps: [],
      cleanupSteps: [],
      releaseCorePersistence: () => Promise.reject(releaseFailure),
      reportFailure,
    });
    const primary = new Error("ui.presentation_successor_activation_failed");

    await expect(supervisor.terminate(primary)).rejects.toBe(primary);
    expect(reportFailure).toHaveBeenCalledWith("core_persistence_release", releaseFailure);
  });

  it("preserves Core/Persistence release rejection for an ordinary disposal", async () => {
    const releaseFailure = new Error("release failed");
    const supervisor = createWebApplicationTerminalSupervisorInternalV1({
      fenceSteps: [],
      cleanupSteps: [],
      releaseCorePersistence: () => Promise.reject(releaseFailure),
    });

    await expect(supervisor.disposeForRebootstrap()).rejects.toBe(releaseFailure);
  });
});

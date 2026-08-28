// SPDX-License-Identifier: MIT

export interface WebApplicationFenceStepInternalV1 {
  readonly name: string;
  run(): void;
}

export interface WebApplicationCleanupStepInternalV1 {
  readonly name: string;
  run(): void | PromiseLike<void>;
}

export type WebApplicationPersistenceReleaseModeInternalV1 =
  | "ordinary"
  | "rebootstrap";

export interface WebApplicationTerminalSupervisorInternalV1<TDisposition> {
  isDisposalStarted(): boolean;
  getTerminalError(): Error | null;
  disposeOrdinarily(): Promise<void>;
  disposeForRebootstrap(): Promise<TDisposition>;
  /** Fences immediately, then preserves the pagehide flush-before-release barrier. */
  disposeForPageHide(flush: () => Promise<void>): Promise<TDisposition>;
  /** Synchronously latches/fences and starts teardown without creating a rejected Promise. */
  signalTerminal(error: Error): void;
  /** Rejects with the first terminal error only after the shared teardown settles. */
  terminate(error: Error): Promise<never>;
}

/**
 * @internal Owns one deferred-first Web teardown. The shared Promise exists
 * before any caller-controlled fence, React unmount, Story cleanup, or Core
 * disposal can synchronously re-enter the supervisor.
 */
export function createWebApplicationTerminalSupervisorInternalV1<TDisposition>(input: {
  readonly fenceSteps: readonly WebApplicationFenceStepInternalV1[];
  readonly cleanupSteps: readonly WebApplicationCleanupStepInternalV1[];
  releaseCorePersistence(
    mode: WebApplicationPersistenceReleaseModeInternalV1,
  ): Promise<TDisposition> | TDisposition;
  terminalReleaseMode?(): WebApplicationPersistenceReleaseModeInternalV1;
  reportFailure?(step: string, error: unknown): void;
}): WebApplicationTerminalSupervisorInternalV1<TDisposition> {
  let resolveDisposal!: (value: TDisposition | PromiseLike<TDisposition>) => void;
  let rejectDisposal!: (reason: unknown) => void;
  const disposalPromise = new Promise<TDisposition>((resolve, reject) => {
    resolveDisposal = resolve;
    rejectDisposal = reject;
  });
  // Producer-side terminal signals intentionally return void. Keep their
  // release failure observed while preserving the original rejected Promise
  // for explicit disposal callers.
  void disposalPromise.catch(() => undefined);
  let disposalStarted = false;
  let disposalMode: WebApplicationPersistenceReleaseModeInternalV1 | null = null;
  let fencesRunning = false;
  let fencesCompleted = false;
  let cleanupStarted = false;
  let cleanupRequested = false;
  let releaseStarted = false;
  let cleanupWaitStarted = false;
  let releaseWaitStarted = false;
  let pageHideBarrier: Promise<void> | null = null;
  let terminalError: Error | null = null;

  const reportFailure = (step: string, error: unknown): void => {
    try {
      input.reportFailure?.(step, error);
    } catch {
      // Host diagnostics are best-effort and never participate in teardown precedence.
    }
  };
  const runFenceStep = (step: WebApplicationFenceStepInternalV1): void => {
    try {
      step.run();
    } catch (error) {
      reportFailure(`fence:${step.name}`, error);
    }
  };
  const runFences = (): void => {
    if (fencesCompleted || fencesRunning) return;
    fencesRunning = true;
    try {
      for (const step of input.fenceSteps) runFenceStep(step);
    } finally {
      fencesRunning = false;
      fencesCompleted = true;
      drainCleanup();
    }
  };
  const startRelease = (): void => {
    if (releaseStarted) return;
    releaseStarted = true;
    let release: Promise<TDisposition>;
    try {
      release = Promise.resolve(input.releaseCorePersistence(disposalMode ?? "ordinary"));
    } catch (error) {
      reportFailure("core_persistence_release", error);
      rejectDisposal(error);
      return;
    }
    void release.then(resolveDisposal, (error: unknown) => {
      reportFailure("core_persistence_release", error);
      rejectDisposal(error);
    });
  };
  const startReleaseAfterBarrier = (): void => {
    if (releaseStarted || releaseWaitStarted) return;
    if (pageHideBarrier === null) {
      startRelease();
      return;
    }
    releaseWaitStarted = true;
    void pageHideBarrier.then(startRelease);
  };
  const runCleanupSteps = (startIndex: number): void => {
    for (let index = startIndex; index < input.cleanupSteps.length; index += 1) {
      const step = input.cleanupSteps[index]!;
      let result: void | PromiseLike<void>;
      try {
        result = step.run();
      } catch (error) {
        reportFailure(`cleanup:${step.name}`, error);
        continue;
      }
      // A contextually-void callback may still return an incidental value
      // (for example Array#push). Only an actual PromiseLike makes cleanup
      // asynchronous.
      if (typeof (result as PromiseLike<void> | undefined)?.then !== "function") continue;
      void Promise.resolve(result).then(
        () => runCleanupSteps(index + 1),
        (error: unknown) => {
          reportFailure(`cleanup:${step.name}`, error);
          runCleanupSteps(index + 1);
        },
      );
      return;
    }
    startReleaseAfterBarrier();
  };
  const drainCleanup = (): void => {
    if (!cleanupRequested || !fencesCompleted || cleanupStarted) return;
    cleanupRequested = false;
    cleanupStarted = true;
    runCleanupSteps(0);
  };
  const requestCleanup = (): void => {
    cleanupRequested = true;
    drainCleanup();
  };
  const startCleanupAfterBarrier = (): void => {
    if (cleanupStarted || cleanupWaitStarted) return;
    if (pageHideBarrier === null) {
      requestCleanup();
      return;
    }
    cleanupWaitStarted = true;
    void pageHideBarrier.then(requestCleanup);
  };
  const startDisposal = (mode: WebApplicationPersistenceReleaseModeInternalV1): void => {
    if (disposalStarted) return;
    disposalStarted = true;
    disposalMode = mode;
    runFences();
    requestCleanup();
  };
  const latchTerminal = (error: Error): Error => {
    terminalError ??= error;
    if (!disposalStarted) {
      disposalStarted = true;
      disposalMode = input.terminalReleaseMode?.() ?? "ordinary";
    }
    runFences();
    // Terminal presentation failure cannot leave the mounted Root alive until
    // a pagehide flush settles. Core/Persistence release still stays behind
    // that already-established durability barrier.
    requestCleanup();
    return terminalError;
  };

  return ({
    isDisposalStarted: () => disposalStarted,
    getTerminalError: () => terminalError,
    disposeOrdinarily(): Promise<void> {
      startDisposal("ordinary");
      return disposalPromise.then(() => undefined);
    },
    disposeForRebootstrap(): Promise<TDisposition> {
      startDisposal("rebootstrap");
      return disposalPromise;
    },
    disposeForPageHide(flush: () => Promise<void>): Promise<TDisposition> {
      if (disposalStarted) return disposalPromise;
      disposalStarted = true;
      disposalMode = "ordinary";
      let resolveBarrier!: () => void;
      pageHideBarrier = new Promise<void>((resolve) => {
        resolveBarrier = resolve;
      });
      runFences();
      let flushPromise: Promise<void>;
      try {
        flushPromise = Promise.resolve(flush());
      } catch {
        flushPromise = Promise.resolve();
      }
      void flushPromise.then(resolveBarrier, resolveBarrier);
      startCleanupAfterBarrier();
      return disposalPromise;
    },
    signalTerminal(error: Error): void {
      latchTerminal(error);
    },
    terminate(error: Error): Promise<never> {
      const primary = latchTerminal(error);
      return disposalPromise.then(
        () => {
          throw primary;
        },
        () => {
          throw primary;
        },
      );
    },
  });
}

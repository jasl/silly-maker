// SPDX-License-Identifier: MIT

export interface WebApplicationDisposalStepInternalV1 {
  readonly name: string;
  run(): void;
}

export interface WebApplicationTerminalSupervisorInternalV1<TDisposition> {
  isDisposalStarted(): boolean;
  getTerminalError(): Error | null;
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
  readonly fenceSteps: readonly WebApplicationDisposalStepInternalV1[];
  readonly cleanupSteps: readonly WebApplicationDisposalStepInternalV1[];
  releaseCorePersistence(): Promise<TDisposition> | TDisposition;
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
  const runStep = (phase: "fence" | "cleanup", step: WebApplicationDisposalStepInternalV1) => {
    try {
      step.run();
    } catch (error) {
      reportFailure(`${phase}:${step.name}`, error);
    }
  };
  const runFences = (): void => {
    if (fencesCompleted || fencesRunning) return;
    fencesRunning = true;
    try {
      for (const step of input.fenceSteps) runStep("fence", step);
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
      release = Promise.resolve(input.releaseCorePersistence());
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
  const drainCleanup = (): void => {
    if (!cleanupRequested || !fencesCompleted || cleanupStarted) return;
    cleanupRequested = false;
    cleanupStarted = true;
    for (const step of input.cleanupSteps) runStep("cleanup", step);
    startReleaseAfterBarrier();
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
  const startOrdinaryDisposal = (): void => {
    if (disposalStarted) return;
    disposalStarted = true;
    runFences();
    requestCleanup();
  };
  const latchTerminal = (error: Error): Error => {
    terminalError ??= error;
    disposalStarted = true;
    runFences();
    // Terminal presentation failure cannot leave the mounted Root alive until
    // a pagehide flush settles. Core/Persistence release still stays behind
    // that already-established durability barrier.
    requestCleanup();
    return terminalError;
  };

  return Object.freeze({
    isDisposalStarted: () => disposalStarted,
    getTerminalError: () => terminalError,
    disposeForRebootstrap(): Promise<TDisposition> {
      startOrdinaryDisposal();
      return disposalPromise;
    },
    disposeForPageHide(flush: () => Promise<void>): Promise<TDisposition> {
      if (disposalStarted) return disposalPromise;
      disposalStarted = true;
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

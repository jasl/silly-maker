// SPDX-License-Identifier: MIT

export type AgentRunLeaseMonitorDispositionV1 = "continue" | "stop";

export interface AgentRunLeaseMonitorV1 {
  stop(): void;
  drain(): Promise<void>;
}

export async function pollOwnedAgentRunLeaseV1(input: {
  readonly renew: () => Promise<"renewed" | "idle" | "lost">;
  readonly onLost: () => Promise<void>;
}): Promise<AgentRunLeaseMonitorDispositionV1> {
  const renewal = await input.renew();
  if (renewal === "renewed" || renewal === "idle") return "continue";
  await input.onLost();
  return "stop";
}

export interface PassiveProcessProjectionV1 {
  readonly processId: string;
  readonly activeAttemptId: string | null;
}

/**
 * Invalidates a passive tab's routed Process projection without participating
 * in execution ownership. IndexedDB lease/generation checks remain the only
 * correctness authority; this poll merely makes another tab's commit visible.
 */
export async function pollPassiveProcessProjectionV1(input: {
  readonly processId: string;
  readonly read: () => PassiveProcessProjectionV1 | null;
  readonly ownsAttempt: (attemptId: string) => boolean;
  readonly refresh: () => Promise<void>;
}): Promise<AgentRunLeaseMonitorDispositionV1> {
  const before = input.read();
  if (before?.processId !== input.processId) return "stop";
  if (before.activeAttemptId !== null && input.ownsAttempt(before.activeAttemptId)) return "stop";
  await input.refresh();
  const after = input.read();
  if (after?.processId !== input.processId) return "stop";
  return after.activeAttemptId !== null && input.ownsAttempt(after.activeAttemptId)
    ? "stop"
    : "continue";
}

export function hasUnownedProcessExecutionV1(input: {
  readonly activeAttemptId: string | null;
  readonly ownsAttempt: (attemptId: string) => boolean;
}): boolean {
  return input.activeAttemptId !== null && !input.ownsAttempt(input.activeAttemptId);
}

/** Releases the stale execution resources before asking the Process authority to recover. */
export async function recoverLostAgentRunExecutionV1(input: {
  readonly cancelRun: () => Promise<void>;
  readonly releaseWorkspace: () => Promise<void>;
  readonly reloadProcess: () => Promise<void>;
}): Promise<void> {
  let firstFailure: unknown = null;
  for (const operation of [input.cancelRun, input.releaseWorkspace, input.reloadProcess]) {
    try {
      await operation();
    } catch (error) {
      firstFailure ??= error;
    }
  }
  if (firstFailure !== null) throw firstFailure;
}

/**
 * Runs one lease/recovery operation at a time. The next deadline starts only
 * after the preceding async operation settles, so a suspended page cannot
 * accumulate overlapping renewals when it resumes.
 */
export function startAgentRunLeaseMonitorV1(input: {
  readonly intervalMilliseconds: number;
  readonly poll: () => Promise<AgentRunLeaseMonitorDispositionV1>;
  readonly onError: (error: unknown) => void;
}): AgentRunLeaseMonitorV1 {
  let stopped = false;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let activeSettlement: Promise<void> = Promise.resolve();

  const schedule = (): void => {
    if (stopped) return;
    timeout = setTimeout(() => {
      timeout = null;
      activeSettlement = (async (): Promise<void> => {
        try {
          const disposition = await input.poll();
          if (disposition === "stop") stopped = true;
        } catch (error) {
          stopped = true;
          try {
            input.onError(error);
          } catch {
            // Diagnostics cannot escape the stopped monitor.
          }
        } finally {
          schedule();
        }
      })();
    }, input.intervalMilliseconds);
  };

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  schedule();
  return {
    stop,
    async drain() {
      stop();
      await activeSettlement;
    },
  };
}

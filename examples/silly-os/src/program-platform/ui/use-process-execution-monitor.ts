// SPDX-License-Identifier: MIT

import { useEffect, useLayoutEffect, useRef } from "react";

import {
  pollOwnedAgentRunLeaseV1,
  pollPassiveProcessProjectionV1,
  startAgentRunLeaseMonitorV1,
} from "../../ui/agent-run-lease-monitor.ts";

export interface ProgramOwnedExecutionMonitorV1 {
  readonly attemptId: string;
  readonly renew: () => Promise<"renewed" | "idle" | "lost">;
  readonly recoverLost: () => Promise<void>;
}

/**
 * Joins Process projection invalidation and owned-lease renewal to the Program
 * container lifetime. Program adapters provide persistence-specific refresh
 * and recovery operations; the fixed Host owns scheduling and drain semantics.
 */
export function useProcessExecutionMonitorV1(input: {
  readonly processId: string | null;
  readonly activeAttemptId: string | null;
  readonly ownedExecution: ProgramOwnedExecutionMonitorV1 | null;
  readonly isOwnedAttempt: (attemptId: string) => boolean;
  readonly readProjection: () => {
    readonly processId: string;
    readonly activeAttemptId: string | null;
  } | null;
  readonly refreshPassive: () => Promise<void>;
  readonly intervalMilliseconds: number;
  readonly registerDrain: (drain: () => Promise<void>) => () => void;
  readonly onError: (error: unknown) => void;
}): void {
  const latest = useRef(input);
  useLayoutEffect(() => {
    latest.current = input;
  }, [input]);
  const ownedAttemptId = input.ownedExecution?.attemptId ?? null;
  const {
    activeAttemptId,
    intervalMilliseconds,
    processId,
    registerDrain,
  } = input;

  useEffect(() => {
    if (processId === null) return undefined;
    const monitor = startAgentRunLeaseMonitorV1({
      intervalMilliseconds,
      poll: async () => {
        const current = latest.current;
        if (ownedAttemptId !== null) {
          const owned = current.ownedExecution;
          if (owned === null || owned.attemptId !== ownedAttemptId) return "stop";
          return await pollOwnedAgentRunLeaseV1({
            renew: owned.renew,
            onLost: owned.recoverLost,
          });
        }
        return await pollPassiveProcessProjectionV1({
          processId,
          read: current.readProjection,
          ownsAttempt: current.isOwnedAttempt,
          refresh: current.refreshPassive,
        });
      },
      onError: (error) => latest.current.onError(error),
    });
    let drainSettlement: Promise<void> | null = null;
    const drainOnce = (): Promise<void> => {
      drainSettlement ??= monitor.drain();
      return drainSettlement;
    };
    const unregisterDrain = registerDrain(drainOnce);
    return () => {
      const settlement = drainOnce();
      unregisterDrain();
      void settlement.catch((error: unknown) => latest.current.onError(error));
    };
  }, [
    activeAttemptId,
    intervalMilliseconds,
    ownedAttemptId,
    processId,
    registerDrain,
  ]);
}

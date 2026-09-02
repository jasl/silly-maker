// SPDX-License-Identifier: MIT

import { LoaderCircle, RotateCcw, TriangleAlert } from "lucide-react";
import {
  Fragment,
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { ProcessNetworkAccessV1 } from "../../../src/program-platform/capabilities/process-network-access.ts";
import {
  type ProgramRuntimeSurfacePropsV1,
  shouldRetryProgramWorkspaceCleanupV1,
} from "../../../src/program-platform/ui/program-runtime-surface.ts";
import { ProgramUiContainerV1 } from "../../../src/program-platform/ui/program-ui-container.tsx";
import { useProcessExecutionMonitorV1 } from "../../../src/program-platform/ui/use-process-execution-monitor.ts";
import { CollectionStateV1 } from "../../../src/ui/collection-state.tsx";
import {
  hasUnownedProcessExecutionV1,
  recoverLostAgentRunExecutionV1,
} from "../../../src/ui/agent-run-lease-monitor.ts";
import { ButtonV1 } from "../../../src/ui/design-system/button.tsx";
import {
  createCreatorProgramAgentPortV1,
  type CreatorAgentPortV1,
  type CreatorAgentSnapshotV1,
} from "../runtime-profile/browser-creator-agent-port.ts";
import { creatorProgramRuntimeProfileV1 } from "../runtime-profile/creator-runtime-profile-descriptor.ts";
import type {
  CreatorControllerV1,
  CreatorDurabilityStateV1,
} from "../runtime/creator-controller.ts";
import { creatorProcessExecutionLeaseRenewalIntervalMillisecondsV1 } from "../runtime/creator-controller.ts";
import type { CreatorAgentRunRequestV1 } from "../runtime/contracts.ts";
import { acknowledgeAppliedAgentTerminalV1 } from "./agent-terminal-acknowledgement.ts";
import { getCreatorProgramCopyV1 } from "./creator-program-copy.ts";
import type { ProgramWorkspaceSessionViewStateV1 } from "./program-workspace.tsx";
import { useCreatorWorkspaceExportV1 } from "./use-creator-workspace-export.ts";

const CreatorHomeV1 = lazy(async () => {
  const module = await import("./creator-home.tsx");
  return { default: module.CreatorHomeV1 };
});

const ProgramWorkspaceV1 = lazy(async () => {
  const module = await import("./program-workspace.tsx");
  return { default: module.ProgramWorkspaceV1 };
});

export function ActiveCreatorProcessBoundaryV1({
  processId,
  children,
}: {
  readonly processId: string;
  readonly children: ReactNode;
}): ReactNode {
  return <Fragment key={processId}>{children}</Fragment>;
}

export interface CreatorWorkspaceViewStateStoreV1 {
  read(processId: string): ProgramWorkspaceSessionViewStateV1 | undefined;
  write(processId: string, state: ProgramWorkspaceSessionViewStateV1): void;
  clear(): void;
}

export function createCreatorWorkspaceViewStateStoreV1(): CreatorWorkspaceViewStateStoreV1 {
  const states = new Map<string, ProgramWorkspaceSessionViewStateV1>();
  return {
    read: (processId) => states.get(processId),
    write(processId, state) {
      states.set(processId, { ...state });
    },
    clear() {
      states.clear();
    },
  };
}

type CreatorConversationRestoreControllerV1 = Pick<
  CreatorControllerV1,
  "getSnapshot" | "openProgram" | "restoreTranscriptAround"
>;

/**
 * Keeps the retained anchor out of ChatPane's one-shot initial restore until
 * the controller has mounted the transcript page that owns that anchor.
 */
export async function openCreatorProgramWithRetainedConversationV1(
  controller: CreatorConversationRestoreControllerV1,
  viewStates: CreatorWorkspaceViewStateStoreV1,
  programId: string,
): Promise<boolean> {
  const opened = await controller.openProgram(programId);
  if (opened.kind !== "completed" || !opened.value) return false;
  const active = controller.getSnapshot().activeProcess;
  if (active === null) return true;
  const anchor = viewStates.read(active.process.processId)?.conversation.scrollAnchor;
  if (
    anchor?.kind === "entry" &&
    !active.transcript.entries.some((entry) =>
      entry.entryId === anchor.entryId && entry.sequence === anchor.sequence
    )
  ) {
    await controller.restoreTranscriptAround(anchor.sequence);
  }
  return true;
}

const creatorWorkspaceViewStateSessionKeyV1 = "creator.workspace-view-states.v1";

function creatorWorkspaceViewStateStoreV1(value: unknown): CreatorWorkspaceViewStateStoreV1 | null {
  if (
    typeof value !== "object" || value === null ||
    !("read" in value) || typeof value.read !== "function" ||
    !("write" in value) || typeof value.write !== "function" ||
    !("clear" in value) || typeof value.clear !== "function"
  ) return null;
  return value as CreatorWorkspaceViewStateStoreV1;
}

function storageOperationV1(value: CreatorDurabilityStateV1): string {
  return value.phase === "saving" || value.phase === "failed" ? value.operation : "none";
}

type CreatorProgramSurfaceDrainPortV1 = Pick<
  ReturnType<typeof createCreatorProgramAgentPortV1>,
  "getSnapshot" | "closeWorkspace" | "dispose"
>;

type CreatorProgramSurfaceDrainBlockerV1 =
  | "active_run"
  | "retained_terminal"
  | "terminal_settlement";

/** Derives exact-port work even before submit has published an active snapshot. */
export function readCreatorProgramSurfaceDrainBlockerV1(input: {
  readonly port: Pick<CreatorAgentPortV1, "getSnapshot">;
  readonly ownsRun: (agentRunId: string) => boolean;
  readonly ownsAnyRun: () => boolean;
  readonly terminalSettlementPending: boolean;
}): CreatorProgramSurfaceDrainBlockerV1 | null {
  if (input.terminalSettlementPending) return "terminal_settlement";
  if (
    input.port.getSnapshot().terminalRuns.some(({ run }) => input.ownsRun(run.agentRunId))
  ) return "retained_terminal";
  return input.ownsAnyRun() ? "active_run" : null;
}

interface CreatorOwnedAgentRunV1 {
  readonly run: CreatorAgentRunRequestV1;
  readonly port: CreatorAgentPortV1;
}

interface CreatorAgentSubmissionFenceV1 {
  readonly port: CreatorAgentPortV1;
}

type CreatorAgentTerminalSettlementV1 =
  | { readonly kind: "released" }
  | {
    readonly kind: "retained";
    readonly reason: "persistence";
    readonly persistence: Awaited<ReturnType<CreatorControllerV1["recordAgentRunTerminal"]>>;
  }
  | {
    readonly kind: "retained";
    readonly reason: "workspace_unavailable";
    readonly diagnostic: unknown;
  };

interface CreatorWorkspaceCleanupV1 {
  readonly workspaceSessionId: string;
  readonly retryRevision: number;
}

/** One terminal attempt; retained results are retried by the Surface lease cadence. */
export async function settleCreatorOwnedAgentTerminalV1(input: {
  readonly agentRunId: string;
  readonly leaseWasLost: boolean;
  readonly persist: () => ReturnType<CreatorControllerV1["recordAgentRunTerminal"]>;
  readonly acknowledgeTerminal: CreatorAgentPortV1["acknowledgeTerminal"];
}): Promise<CreatorAgentTerminalSettlementV1> {
  if (input.leaseWasLost) {
    const acknowledged = await input.acknowledgeTerminal(input.agentRunId);
    return acknowledged.kind === "workspace_unavailable"
      ? {
        kind: "retained",
        reason: "workspace_unavailable",
        diagnostic: acknowledged.diagnostic,
      }
      : { kind: "released" };
  }

  const persistence = await input.persist();
  const acknowledged = await acknowledgeAppliedAgentTerminalV1({
    persistence,
    agentRunId: input.agentRunId,
    acknowledgeTerminal: input.acknowledgeTerminal,
  });
  if (acknowledged.kind === "retained") {
    return { kind: "retained", reason: "persistence", persistence };
  }
  if (acknowledged.kind === "workspace_unavailable") {
    return {
      kind: "retained",
      reason: "workspace_unavailable",
      diagnostic: acknowledged.diagnostic,
    };
  }
  return { kind: "released" };
}

/** Keeps terminal retry cadence independent from unrelated Agent publications. */
export function useCreatorOwnedAgentTerminalSettlementV1(input: {
  readonly port: CreatorAgentPortV1 | null;
  readonly terminalAgentRunId: string | null;
  readonly latestAgentSnapshotRef: { current: CreatorAgentSnapshotV1 | null };
  readonly ownedRuns: Map<string, CreatorOwnedAgentRunV1>;
  readonly leaseLostRuns: Set<string>;
  readonly terminalSettlingRuns: Map<string, CreatorAgentPortV1>;
  readonly terminalSettlementRef: { current: Promise<void> };
  readonly recordAgentRunTerminal: CreatorControllerV1["recordAgentRunTerminal"];
  readonly requestWorkspaceCleanup: (workspaceSessionId: string) => void;
  readonly reportFailure: (code: string, error: unknown) => void;
  readonly retryIntervalMilliseconds?: number;
}): void {
  const [retryRevision, setRetryRevision] = useState(0);
  const {
    latestAgentSnapshotRef,
    leaseLostRuns,
    ownedRuns,
    port,
    recordAgentRunTerminal,
    reportFailure,
    requestWorkspaceCleanup,
    terminalAgentRunId,
    terminalSettlementRef,
    terminalSettlingRuns,
  } = input;
  const retryIntervalMilliseconds = input.retryIntervalMilliseconds ??
    creatorProcessExecutionLeaseRenewalIntervalMillisecondsV1;

  useEffect(() => {
    if (port === null || terminalAgentRunId === null) return undefined;
    const terminal = latestAgentSnapshotRef.current?.terminalRuns.find(({ run }) =>
      run.agentRunId === terminalAgentRunId
    );
    if (terminal === undefined) return undefined;
    const ownership = ownedRuns.get(terminal.run.agentRunId);
    if (
      ownership?.port !== port ||
      terminalSettlingRuns.get(terminal.run.agentRunId) === port
    ) return undefined;
    const agentRunId = terminal.run.agentRunId;
    const leaseWasLost = leaseLostRuns.has(agentRunId);
    terminalSettlingRuns.set(agentRunId, port);
    let current = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retained = false;
    const settlement = terminalSettlementRef.current.then(async () => {
      try {
        const result = await settleCreatorOwnedAgentTerminalV1({
          agentRunId,
          leaseWasLost,
          persist: () => recordAgentRunTerminal(terminal),
          acknowledgeTerminal: (exactAgentRunId) => port.acknowledgeTerminal(exactAgentRunId),
        });
        if (result.kind === "retained") {
          retained = true;
          if (result.reason === "workspace_unavailable") {
            reportFailure(
              "silly_os.browser_pi_workspace_receipt_acknowledge_failed",
              result.diagnostic,
            );
          } else if (result.persistence.kind !== "busy") {
            reportFailure(
              "silly_os.browser_pi_terminal_rejected",
              result.persistence,
            );
          }
          return;
        }
        const currentOwnership = ownedRuns.get(agentRunId);
        if (currentOwnership?.port !== port) return;
        ownedRuns.delete(agentRunId);
        leaseLostRuns.delete(agentRunId);
        const workspace = port.getSnapshot().workspace;
        if (workspace.descriptor !== null) {
          requestWorkspaceCleanup(workspace.descriptor.workspaceSessionId);
        }
      } catch (error) {
        reportFailure("silly_os.browser_pi_terminal_rejected", error);
        retained = true;
      }
    }).finally(() => {
      if (terminalSettlingRuns.get(agentRunId) === port) {
        terminalSettlingRuns.delete(agentRunId);
      }
      if (current && retained && ownedRuns.get(agentRunId)?.port === port) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          if (!current) return;
          setRetryRevision((revision) => revision + 1);
        }, retryIntervalMilliseconds);
      }
    });
    terminalSettlementRef.current = settlement;
    void settlement;
    return () => {
      current = false;
      if (retryTimer !== null) clearTimeout(retryTimer);
    };
  }, [
    latestAgentSnapshotRef,
    leaseLostRuns,
    ownedRuns,
    port,
    recordAgentRunTerminal,
    reportFailure,
    requestWorkspaceCleanup,
    retryIntervalMilliseconds,
    retryRevision,
    terminalAgentRunId,
    terminalSettlementRef,
    terminalSettlingRuns,
  ]);
}

/** Releases only the requested still-current Workspace session. */
export async function settleCreatorWorkspaceCleanupV1(input: {
  readonly port: Pick<CreatorProgramSurfaceDrainPortV1, "getSnapshot" | "closeWorkspace">;
  readonly workspaceSessionId: string;
  readonly reportFailure: (code: string, error: unknown) => void;
}): Promise<"released" | "retry" | "blocked"> {
  const workspace = input.port.getSnapshot().workspace;
  if (
    workspace.descriptor === null ||
    ["closed", "forgotten", "disposed"].includes(workspace.phase) ||
    workspace.descriptor.workspaceSessionId !== input.workspaceSessionId
  ) return "released";
  const closed = await input.port.closeWorkspace(input.workspaceSessionId);
  if (closed.kind !== "unavailable") return "released";
  input.reportFailure(
    "silly_os.browser_pi_workspace_close_failed",
    closed.diagnostic,
  );
  return shouldRetryProgramWorkspaceCleanupV1(closed.diagnostic) ? "retry" : "blocked";
}

/**
 * Quiesces transient work without retiring the still-mounted Agent port. A
 * controller close may decline after quiescence, so each later attempt checks
 * and closes the then-current Workspace again. Retirement is final and is only
 * called after route commit or Surface unmount.
 */
export function createCreatorProgramSurfaceLifecycleV1(input: {
  readonly port: CreatorProgramSurfaceDrainPortV1;
  readonly drainWorkspaceExport: () => Promise<void>;
  readonly readBlocker: () => CreatorProgramSurfaceDrainBlockerV1 | null;
  readonly runWorkspaceCloseExclusive: <T>(operation: () => Promise<T>) => Promise<T>;
  readonly reportFailure: (code: string, error: unknown) => void;
}): {
  readonly quiesce: () => Promise<void>;
  readonly retire: () => Promise<void>;
} {
  let quiesceSettlement: Promise<void> | null = null;
  let retireSettlement: Promise<void> | null = null;
  const quiesce = (): Promise<void> => {
    if (quiesceSettlement !== null) return quiesceSettlement;
    const settlement = (async (): Promise<void> => {
      const initialBlocker = input.readBlocker();
      if (initialBlocker !== null) {
        throw new Error(`Creator Agent port still owns ${initialBlocker}`);
      }
      await input.drainWorkspaceExport();
      const afterExportBlocker = input.readBlocker();
      if (afterExportBlocker !== null) {
        throw new Error(`Creator Agent port still owns ${afterExportBlocker}`);
      }
      const workspace = input.port.getSnapshot().workspace;
      const workspaceSessionId = workspace.descriptor?.workspaceSessionId ?? null;
      if (workspaceSessionId !== null) {
        const released = await input.runWorkspaceCloseExclusive(() =>
          settleCreatorWorkspaceCleanupV1({
            port: input.port,
            workspaceSessionId,
            reportFailure: input.reportFailure,
          })
        );
        if (released !== "released") {
          throw new Error("Creator Agent Workspace close failed", {
            cause: input.port.getSnapshot().workspace.diagnostic,
          });
        }
      }
      const afterCloseBlocker = input.readBlocker();
      if (afterCloseBlocker !== null) {
        throw new Error(`Creator Agent port acquired ${afterCloseBlocker} while closing`);
      }
    })();
    quiesceSettlement = settlement;
    void settlement.finally(() => {
      if (quiesceSettlement === settlement) quiesceSettlement = null;
    }).catch(() => undefined);
    return settlement;
  };
  const retire = (): Promise<void> => {
    if (retireSettlement !== null) return retireSettlement;
    const settlement = input.port.dispose();
    retireSettlement = settlement;
    void settlement.catch(() => {
      if (retireSettlement === settlement) retireSettlement = null;
    });
    return settlement;
  };
  return { quiesce, retire };
}

/** Owns the exact lazy Creator Agent port outside React render. */
export function useCreatorProgramAgentPortOwnerV1(input: {
  readonly agentHost: ProgramRuntimeSurfacePropsV1["host"]["agentHost"];
  readonly registerAgentDrain: (drain: () => Promise<void>) => () => void;
  readonly registerProgramDrain: ProgramRuntimeSurfacePropsV1["host"]["registerProgramDrain"];
  readonly readWorkspaceExportDrain: () => () => Promise<void>;
  readonly readPortDrainBlocker: (
    port: CreatorAgentPortV1,
  ) => CreatorProgramSurfaceDrainBlockerV1 | null;
  readonly revokePortOwnership: (port: CreatorAgentPortV1) => void;
  readonly runWorkspaceCloseExclusive: <T>(operation: () => Promise<T>) => Promise<T>;
  readonly reportFailure: (code: string, error: unknown) => void;
}): CreatorAgentPortV1 | null {
  const [port, setPort] = useState<CreatorAgentPortV1 | null>(null);
  const {
    agentHost,
    registerAgentDrain,
    registerProgramDrain,
    readWorkspaceExportDrain,
    readPortDrainBlocker,
    revokePortOwnership,
    runWorkspaceCloseExclusive,
    reportFailure,
  } = input;
  useLayoutEffect(() => {
    if (agentHost === null) {
      setPort(null);
      return undefined;
    }
    const ownedPort = createCreatorProgramAgentPortV1(agentHost);
    const lifecycle = createCreatorProgramSurfaceLifecycleV1({
      port: ownedPort,
      drainWorkspaceExport: () => readWorkspaceExportDrain()(),
      readBlocker: () => readPortDrainBlocker(ownedPort),
      runWorkspaceCloseExclusive,
      reportFailure,
    });
    const unregisterAgentDrain = registerAgentDrain(lifecycle.retire);
    const unregisterProgramDrain = registerProgramDrain(lifecycle);
    setPort(ownedPort);
    return () => {
      revokePortOwnership(ownedPort);
      setPort((current) => current === ownedPort ? null : current);
      unregisterProgramDrain();
      unregisterAgentDrain();
    };
  }, [
    agentHost,
    readPortDrainBlocker,
    readWorkspaceExportDrain,
    registerAgentDrain,
    registerProgramDrain,
    reportFailure,
    revokePortOwnership,
    runWorkspaceCloseExclusive,
  ]);
  return port;
}

/** Program-owned controller, Agent facade, recovery and UI composition. */
export function CreatorProgramSurfaceV1({
  controller: opaqueController,
  host,
}: ProgramRuntimeSurfacePropsV1): ReactNode {
  const controller = opaqueController as CreatorControllerV1;
  const copy = useMemo(() => getCreatorProgramCopyV1(host.copy), [host.copy]);
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const activeProcessId = snapshot.activeProcess?.process.processId ?? null;
  const [viewStates] = useState(() => {
    const retained = creatorWorkspaceViewStateStoreV1(
      host.sessionState.read(creatorWorkspaceViewStateSessionKeyV1),
    );
    if (retained !== null) return retained;
    const created = createCreatorWorkspaceViewStateStoreV1();
    host.sessionState.write(creatorWorkspaceViewStateSessionKeyV1, created);
    return created;
  });
  const [processNetworkAccess, setProcessNetworkAccess] = useState<ProcessNetworkAccessV1 | null>(
    null,
  );
  const [networkAccessMutationPending, setNetworkAccessMutationPending] = useState(false);
  const networkAccessEpochRef = useRef(0);
  const networkAccessMutationPendingRef = useRef(false);
  const [conversationRestorePending, setConversationRestorePending] = useState(false);
  const conversationRestoreEpochRef = useRef(0);
  const [ownedRuns] = useState(() => new Map<string, CreatorOwnedAgentRunV1>());
  const [agentSubmissionFences] = useState(
    () => new Set<CreatorAgentSubmissionFenceV1>(),
  );
  const [leaseLostRuns] = useState(() => new Set<string>());
  const [terminalSettlingRuns] = useState(() => new Map<string, CreatorAgentPortV1>());
  const [workspaceCleanup, setWorkspaceCleanup] = useState<CreatorWorkspaceCleanupV1 | null>(null);
  const workspaceCleanupSessionIdRef = useRef<string | null>(null);
  const terminalSettlementRef = useRef<Promise<void>>(Promise.resolve());
  const workspaceExportDrainRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const workspaceCloseTailRef = useRef<Promise<void>>(Promise.resolve());
  const registerAgentDrain = host.registerAgentDrain;
  const registerProgramDrain = host.registerProgramDrain;
  const reportFailure = host.reportFailure;
  const readWorkspaceExportDrainV1 = useCallback(() => workspaceExportDrainRef.current, []);
  const runWorkspaceCloseExclusiveV1 = useCallback(async <T,>(
    operation: () => Promise<T>,
  ): Promise<T> => {
    const predecessor = workspaceCloseTailRef.current;
    let release!: () => void;
    workspaceCloseTailRef.current = new Promise<void>((resolve) => {
      release = resolve;
    });
    await predecessor;
    try {
      return await operation();
    } finally {
      release();
    }
  }, []);
  const readPortDrainBlockerV1 = useCallback((exactPort: CreatorAgentPortV1) => {
    return readCreatorProgramSurfaceDrainBlockerV1({
      port: exactPort,
      ownsRun: (agentRunId) => ownedRuns.get(agentRunId)?.port === exactPort,
      ownsAnyRun: () => {
        for (const fence of agentSubmissionFences) {
          if (fence.port === exactPort) return true;
        }
        for (const ownership of ownedRuns.values()) {
          if (ownership.port === exactPort) return true;
        }
        return false;
      },
      terminalSettlementPending: [...terminalSettlingRuns.values()].some((settlingPort) =>
        settlingPort === exactPort
      ),
    });
  }, [agentSubmissionFences, ownedRuns, terminalSettlingRuns]);
  const revokePortOwnershipV1 = useCallback((exactPort: CreatorAgentPortV1): void => {
    for (const fence of agentSubmissionFences) {
      if (fence.port === exactPort) agentSubmissionFences.delete(fence);
    }
    for (const [agentRunId, ownership] of ownedRuns) {
      if (ownership.port !== exactPort) continue;
      ownedRuns.delete(agentRunId);
      leaseLostRuns.delete(agentRunId);
    }
  }, [agentSubmissionFences, leaseLostRuns, ownedRuns]);
  const port = useCreatorProgramAgentPortOwnerV1({
    agentHost: host.agentHost,
    registerAgentDrain,
    registerProgramDrain,
    readWorkspaceExportDrain: readWorkspaceExportDrainV1,
    readPortDrainBlocker: readPortDrainBlockerV1,
    revokePortOwnership: revokePortOwnershipV1,
    runWorkspaceCloseExclusive: runWorkspaceCloseExclusiveV1,
    reportFailure,
  });
  const agentSnapshot = useSyncExternalStore(
    port?.subscribe ?? (() => () => undefined),
    port?.getSnapshot ?? (() => null),
    port?.getSnapshot ?? (() => null),
  );
  const latestAgentSnapshotRef = useRef(agentSnapshot);
  useLayoutEffect(() => {
    latestAgentSnapshotRef.current = agentSnapshot;
  }, [agentSnapshot]);
  const terminalAgentRunId = agentSnapshot?.terminalRuns[0]?.run.agentRunId ?? null;
  const requestWorkspaceCleanupV1 = useCallback((workspaceSessionId: string): void => {
    workspaceCleanupSessionIdRef.current = workspaceSessionId;
    setWorkspaceCleanup((current) =>
      current?.workspaceSessionId === workspaceSessionId
        ? { ...current, retryRevision: current.retryRevision + 1 }
        : { workspaceSessionId, retryRevision: 0 }
    );
  }, []);
  const clearWorkspaceCleanupV1 = useCallback((workspaceSessionId: string): void => {
    if (workspaceCleanupSessionIdRef.current === workspaceSessionId) {
      workspaceCleanupSessionIdRef.current = null;
    }
    setWorkspaceCleanup((current) =>
      current?.workspaceSessionId === workspaceSessionId ? null : current
    );
  }, []);
  const processNetworkAccessCapability = host.processNetworkAccess;
  const activeAttemptId = snapshot.activeProcess?.process.activeAttempt?.attemptId ?? null;
  const ownedRunOwnership = activeAttemptId === null
    ? null
    : ownedRuns.get(activeAttemptId) ?? null;
  const ownedRun = ownedRunOwnership?.port === port ? ownedRunOwnership.run : null;
  const ownsAttemptV1 = useCallback(
    (attemptId: string): boolean => port !== null && ownedRuns.get(attemptId)?.port === port,
    [ownedRuns, port],
  );
  const unownedProcessExecutionActive = hasUnownedProcessExecutionV1({
    activeAttemptId,
    ownsAttempt: ownsAttemptV1,
  });
  const workspaceExportTarget = useMemo(() => {
    const active = snapshot.activeProcess;
    const subject = active?.subject ?? null;
    const workspaceId = active?.process.checkpoint?.workspaceId ?? null;
    if (active === null || subject === null || workspaceId === null) return null;
    return {
      processId: active.process.processId,
      programId: subject.currentProgram.programId,
      workspaceId,
      programName: subject.currentProgram.name,
    };
  }, [snapshot.activeProcess]);
  const workspaceExport = useCreatorWorkspaceExportV1({
    port,
    target: workspaceExportTarget,
    enabled: snapshot.durability.phase === "ready" && agentSnapshot?.phase === "ready" &&
      agentSnapshot.terminalRuns.length === 0 && !unownedProcessExecutionActive &&
      workspaceCleanup === null &&
      agentSnapshot.workspace.phase !== "opening" &&
      agentSnapshot.workspace.phase !== "closing",
    reportFailure,
  });
  const drainWorkspaceExport = workspaceExport.drain;

  useLayoutEffect(() => {
    workspaceExportDrainRef.current = drainWorkspaceExport;
  }, [drainWorkspaceExport]);

  useEffect(() => {
    const epoch = networkAccessEpochRef.current + 1;
    networkAccessEpochRef.current = epoch;
    if (activeProcessId === null || processNetworkAccessCapability === null) return;
    void processNetworkAccessCapability.load(activeProcessId).then((access) => {
      if (networkAccessEpochRef.current !== epoch) return;
      if (access !== null && access.processId !== activeProcessId) {
        reportFailure("silly_os.browser_network_access_scope_failed", access);
        return;
      }
      setProcessNetworkAccess(access);
    }, (error: unknown) => {
      if (networkAccessEpochRef.current !== epoch) return;
      reportFailure("silly_os.browser_network_access_load_failed", error);
    });
  }, [activeProcessId, processNetworkAccessCapability, reportFailure]);

  useEffect(() => {
    if (port === null || workspaceCleanup === null) return undefined;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const retryV1 = () => {
      if (cancelled || retryTimer !== null) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        setWorkspaceCleanup((current) =>
          current?.workspaceSessionId === workspaceCleanup.workspaceSessionId
            ? { ...current, retryRevision: current.retryRevision + 1 }
            : current
        );
      }, creatorProcessExecutionLeaseRenewalIntervalMillisecondsV1);
    };
    void runWorkspaceCloseExclusiveV1(() =>
      settleCreatorWorkspaceCleanupV1({
        port,
        workspaceSessionId: workspaceCleanup.workspaceSessionId,
        reportFailure,
      })
    ).then((result) => {
      if (cancelled) return;
      if (result === "retry") {
        retryV1();
        return;
      }
      if (result === "released") {
        clearWorkspaceCleanupV1(workspaceCleanup.workspaceSessionId);
      }
    }).catch((error: unknown) => {
      if (cancelled) return;
      reportFailure("silly_os.browser_pi_workspace_close_failed", error);
    });
    return () => {
      cancelled = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
    };
  }, [
    clearWorkspaceCleanupV1,
    port,
    reportFailure,
    runWorkspaceCloseExclusiveV1,
    workspaceCleanup,
  ]);

  useCreatorOwnedAgentTerminalSettlementV1({
    port,
    terminalAgentRunId,
    latestAgentSnapshotRef,
    ownedRuns,
    leaseLostRuns,
    terminalSettlingRuns,
    terminalSettlementRef,
    recordAgentRunTerminal: controller.recordAgentRunTerminal,
    requestWorkspaceCleanup: requestWorkspaceCleanupV1,
    reportFailure,
  });

  const recoverLostOwnedRunV1 = useCallback(async (
    run: CreatorAgentRunRequestV1,
  ): Promise<void> => {
    if (port === null) return;
    leaseLostRuns.add(run.agentRunId);
    try {
      await recoverLostAgentRunExecutionV1({
        cancelRun: async () => {
          const cancelled = await port.cancel(run.agentRunId);
          if (cancelled.kind === "unavailable") {
            host.reportFailure(
              "silly_os.browser_pi_cancel_after_lease_loss_failed",
              cancelled.diagnostic,
            );
          }
        },
        releaseWorkspace: async () => {
          const workspace = port.getSnapshot().workspace;
          if (workspace.descriptor === null) return;
          const closed = await port.closeWorkspace(workspace.descriptor.workspaceSessionId);
          if (closed.kind === "unavailable") {
            throw new Error("Creator Workspace release after lease loss failed", {
              cause: closed.diagnostic,
            });
          }
        },
        reloadProcess: async () => {
          const recovered = await controller.reloadLatestTranscript();
          if (recovered.kind !== "completed") {
            throw new Error("Creator Process recovery after lease loss failed", {
              cause: recovered,
            });
          }
        },
      });
    } catch (error) {
      leaseLostRuns.delete(run.agentRunId);
      throw error;
    }
  }, [controller, host, leaseLostRuns, port]);

  useProcessExecutionMonitorV1({
    processId: activeProcessId,
    activeAttemptId,
    ownedExecution: ownedRun === null ? null : {
      attemptId: ownedRun.agentRunId,
      renew: async () => {
        const result = await controller.renewAgentRunLease(ownedRun);
        return result.kind === "completed" ? result.value : "lost";
      },
      recoverLost: () => recoverLostOwnedRunV1(ownedRun),
    },
    isOwnedAttempt: ownsAttemptV1,
    readProjection: () => {
      const current = controller.getSnapshot().activeProcess?.process ?? null;
      return current === null ? null : {
        processId: current.processId,
        activeAttemptId: current.activeAttempt?.attemptId ?? null,
      };
    },
    refreshPassive: async () => {
      const recovered = await controller.refreshActiveProcess();
      if (recovered.kind === "failed") {
        throw new Error("Creator passive Process refresh failed", { cause: recovered });
      }
    },
    intervalMilliseconds: creatorProcessExecutionLeaseRenewalIntervalMillisecondsV1,
    registerDrain: registerAgentDrain,
    onError: (error) => host.reportFailure("silly_os.process_execution_monitor_failed", error),
  });

  const configureDeterministicAgentV1 = async (credential: string): Promise<void> => {
    if (port === null || credential.length === 0) return;
    const result = await port.configureCredential(credential);
    if (result.kind !== "configured") {
      host.reportFailure("silly_os.browser_pi_configure_failed", result.diagnostic);
      return;
    }
    const tested = await port.testConnection();
    if (tested.kind !== "ready") {
      host.reportFailure("silly_os.browser_pi_connection_test_failed", tested.diagnostic);
      return;
    }
  };

  const submitPreparedAgentRunV1 = async (
    exactPort: CreatorAgentPortV1,
    run: CreatorAgentRunRequestV1,
    workspaceSessionId: string,
  ): Promise<boolean> => {
    ownedRuns.set(run.agentRunId, { run, port: exactPort });
    let terminalAttempted = false;
    try {
      const submitted = await exactPort.submit(run);
      if (submitted.kind === "submitted") return true;
      if (ownedRuns.get(run.agentRunId)?.port === exactPort) {
        ownedRuns.delete(run.agentRunId);
      }
      terminalAttempted = true;
      await controller.recordAgentRunTerminal({
        run,
        outcome: "failed",
        diagnosticCode: submitted.diagnostic.code,
      });
      host.reportFailure("silly_os.browser_pi_submit_failed", submitted.diagnostic);
      return false;
    } catch (error) {
      if (ownedRuns.get(run.agentRunId)?.port === exactPort) {
        ownedRuns.delete(run.agentRunId);
      }
      if (!terminalAttempted) {
        try {
          await controller.recordAgentRunTerminal({
            run,
            outcome: "failed",
            diagnosticCode: "run_failed",
          });
        } catch (terminalError) {
          host.reportFailure("silly_os.browser_pi_terminal_rejected", terminalError);
        }
      }
      host.reportFailure("silly_os.browser_pi_submit_failed", error);
      return false;
    } finally {
      if (ownedRuns.get(run.agentRunId)?.port !== exactPort) {
        requestWorkspaceCleanupV1(workspaceSessionId);
      }
    }
  };

  const submitAgentRunV1 = async (text: string): Promise<boolean> => {
    if (port === null || agentSnapshot?.phase !== "ready") return false;
    const exactPort = port;
    const fence: CreatorAgentSubmissionFenceV1 = { port: exactPort };
    let workspaceSessionId: string | null = null;
    let submitted = false;
    agentSubmissionFences.add(fence);
    try {
      await terminalSettlementRef.current;
      const cleanupPending = await runWorkspaceCloseExclusiveV1(() =>
        Promise.resolve(workspaceCleanupSessionIdRef.current !== null)
      );
      if (cleanupPending) return false;
      const active = controller.getSnapshot().activeProcess;
      const process = active?.process ?? null;
      const program = active?.subject?.currentProgram ?? null;
      const workspaceId = process?.checkpoint?.workspaceId ?? null;
      if (process === null || program === null || workspaceId === null) return false;
      const opened = await exactPort.openWorkspace({
        processId: process.processId,
        programId: program.programId,
        workspaceId,
      });
      if (opened.kind !== "opened") {
        host.reportFailure("silly_os.browser_pi_workspace_open_failed", opened.diagnostic);
        return false;
      }
      workspaceSessionId = opened.descriptor.workspaceSessionId;
      const prepared = await controller.prepareAgentRun(text);
      if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
        host.reportFailure("silly_os.browser_pi_submit_rejected", prepared);
        return false;
      }
      submitted = await submitPreparedAgentRunV1(
        exactPort,
        prepared.value.run,
        opened.descriptor.workspaceSessionId,
      );
      return submitted;
    } catch (error) {
      host.reportFailure("silly_os.browser_pi_submit_rejected", error);
      return false;
    } finally {
      if (!submitted && workspaceSessionId !== null) {
        requestWorkspaceCleanupV1(workspaceSessionId);
      }
      agentSubmissionFences.delete(fence);
    }
  };

  const retryInterruptedAgentRunV1 = async (): Promise<boolean> => {
    if (port === null || agentSnapshot?.phase !== "ready") return false;
    const exactPort = port;
    const fence: CreatorAgentSubmissionFenceV1 = { port: exactPort };
    let workspaceSessionId: string | null = null;
    let submitted = false;
    agentSubmissionFences.add(fence);
    try {
      await terminalSettlementRef.current;
      const cleanupPending = await runWorkspaceCloseExclusiveV1(() =>
        Promise.resolve(workspaceCleanupSessionIdRef.current !== null)
      );
      if (cleanupPending) return false;
      const active = controller.getSnapshot().activeProcess;
      const process = active?.process ?? null;
      const program = active?.subject?.currentProgram ?? null;
      const workspaceId = process?.checkpoint?.workspaceId ?? null;
      if (
        process === null || process.status !== "interrupted_retryable" || program === null ||
        workspaceId === null
      ) return false;
      const opened = await exactPort.openWorkspace({
        processId: process.processId,
        programId: program.programId,
        workspaceId,
      });
      if (opened.kind !== "opened") {
        host.reportFailure("silly_os.browser_pi_workspace_open_failed", opened.diagnostic);
        return false;
      }
      workspaceSessionId = opened.descriptor.workspaceSessionId;
      const refreshed = await controller.reloadLatestTranscript();
      if (refreshed.kind === "failed") {
        host.reportFailure("silly_os.process_execution_recovery_failed", refreshed);
        return false;
      }
      const prepared = await controller.retryInterruptedAgentRun();
      if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
        host.reportFailure("silly_os.browser_pi_submit_rejected", prepared);
        return false;
      }
      submitted = await submitPreparedAgentRunV1(
        exactPort,
        prepared.value.run,
        opened.descriptor.workspaceSessionId,
      );
      return submitted;
    } catch (error) {
      host.reportFailure("silly_os.process_execution_recovery_failed", error);
      return false;
    } finally {
      if (!submitted && workspaceSessionId !== null) {
        requestWorkspaceCleanupV1(workspaceSessionId);
      }
      agentSubmissionFences.delete(fence);
    }
  };

  const setProcessNetworkAccessV1 = async (enabled: boolean): Promise<boolean> => {
    const processId = activeProcessId;
    const capability = processNetworkAccessCapability;
    const mutationEpoch = networkAccessEpochRef.current;
    if (
      processId === null || capability === null ||
      processNetworkAccess?.processId !== processId || networkAccessMutationPendingRef.current
    ) return false;
    networkAccessMutationPendingRef.current = true;
    setNetworkAccessMutationPending(true);
    try {
      const mutation = await capability.set({ processId, enabled });
      if (mutation.kind === "missing") {
        host.reportFailure("silly_os.browser_network_access_failed", "process_missing");
        return false;
      }
      if (networkAccessEpochRef.current === mutationEpoch) {
        setProcessNetworkAccess(mutation.value);
      }
      const workspace = port?.getSnapshot().workspace;
      if (port !== null && workspace?.phase === "open" && workspace.descriptor !== null) {
        const synchronized = await port.synchronizeNetworkAccess(mutation.value);
        if (synchronized.kind === "unavailable") {
          await port.forget();
          host.reportFailure(
            "silly_os.browser_network_access_sync_failed",
            synchronized.diagnostic,
          );
          return false;
        }
      }
      return true;
    } catch (error) {
      if (!enabled) await port?.forget().catch(() => undefined);
      host.reportFailure("silly_os.browser_network_access_failed", error);
      return false;
    } finally {
      networkAccessMutationPendingRef.current = false;
      setNetworkAccessMutationPending(false);
    }
  };

  const onHomeV1 = async (): Promise<void> => {
    await host.onOpenProgramLibrary();
  };
  const openProgramV1 = useCallback((programId: string): void => {
    const epoch = conversationRestoreEpochRef.current + 1;
    conversationRestoreEpochRef.current = epoch;
    setConversationRestorePending(true);
    void openCreatorProgramWithRetainedConversationV1(controller, viewStates, programId).catch(
      (error: unknown) => {
        host.reportFailure("silly_os.creator_conversation_restore_failed", error);
      },
    ).finally(() => {
      if (conversationRestoreEpochRef.current === epoch) {
        setConversationRestorePending(false);
      }
    });
  }, [controller, host, viewStates]);
  const fallback = (
    <main className="program-route-state" data-silly-os-view="creator-loading">
      <div className="program-route-state__content">
        <CollectionStateV1
          icon={LoaderCircle}
          iconMotion="spin"
          title={host.copy.openingProgram}
          role="status"
          aria-live="polite"
        />
      </div>
    </main>
  );
  const deterministicAgentReady = agentSnapshot?.phase === "ready" ||
    agentSnapshot?.phase === "running" || agentSnapshot?.phase === "completed";

  return (
    <section
      className="program-runtime-surface"
      data-program-runtime-profile={creatorProgramRuntimeProfileV1}
      data-program-storage-state={snapshot.durability.phase}
      data-program-storage-operation={storageOperationV1(snapshot.durability)}
    >
      <ProgramUiContainerV1
        presentation="integrated"
        processId={snapshot.activeProcess?.process.processId ?? null}
        locale={host.locale}
        run={null}
        surface={
          <>
            {snapshot.route === "home"
              ? (
                <Suspense fallback={fallback}>
                  <CreatorHomeV1
                    copy={copy}
                    createDisabled={snapshot.durability.phase !== "ready" ||
                      (host.deterministicAgent && !deterministicAgentReady)}
                    programCatalog={{
                      status:
                        snapshot.catalog.phase === "failed" && snapshot.catalog.summaries.length > 0
                          ? "ready"
                          : snapshot.catalog.phase,
                      programs: snapshot.catalog.summaries,
                      openDisabled: snapshot.durability.phase !== "ready",
                      onEdit: openProgramV1,
                      hasMore: snapshot.catalog.nextCursor !== null,
                      onLoadMore: () => void controller.loadMorePrograms(),
                    }}
                    onLocaleChange={host.onLocaleChange}
                    theme={host.theme}
                    onThemeChange={host.onThemeChange}
                    onOpenSettings={() => host.onOpenSettings("home")}
                    onOpenProgramLibrary={() => void onHomeV1()}
                    {...(host.deterministicAgent
                      ? {
                        piAgentSetup: {
                          runtime: "deterministic_test" as const,
                          status: deterministicAgentReady
                            ? "ready" as const
                            : agentSnapshot?.phase === "failed"
                            ? "failed" as const
                            : port === null
                            ? "loading" as const
                            : "available" as const,
                          onInitialize: (credential: string) => {
                            void configureDeterministicAgentV1(credential);
                          },
                        },
                      }
                      : {
                        providerModel: host.providerModel("home"),
                        programAgentReadiness: host.agentReadiness,
                        onOpenCreatorSettings: (target: "providers" | "credential_vault") =>
                          host.onOpenAgentSettings("home", target),
                      })}
                    onCreate={(intent) => {
                      void controller.submitIntent(intent).then((result) => {
                        if (result.kind !== "completed" || result.value.kind !== "created") {
                          host.reportFailure("silly_os.creator_intent_rejected", result);
                        }
                      });
                    }}
                  />
                </Suspense>
              )
              : snapshot.route === "process_loading" || snapshot.activeProcess === null ||
                  conversationRestorePending
              ? fallback
              : (
                <ActiveCreatorProcessBoundaryV1
                  processId={snapshot.activeProcess.process.processId}
                >
                  <Suspense fallback={fallback}>
                    <ProgramWorkspaceV1
                      copy={copy}
                      activeProcess={snapshot.activeProcess}
                      initialViewState={viewStates.read(snapshot.activeProcess.process.processId)}
                      onViewStateChange={(next) => {
                        viewStates.write(snapshot.activeProcess!.process.processId, next);
                      }}
                      onHome={() => void onHomeV1()}
                      onLocaleChange={host.onLocaleChange}
                      theme={host.theme}
                      onThemeChange={host.onThemeChange}
                      onOpenSettings={() => host.onOpenSettings("workspace")}
                      programAgentReadiness={host.agentReadiness}
                      homeDisabled={snapshot.durability.phase === "saving" ||
                        workspaceExport.pending}
                      {...(host.deterministicAgent ? {} : {
                        providerModel: host.providerModel("workspace"),
                        onOpenCreatorSettings: (target: "providers" | "credential_vault") =>
                          host.onOpenAgentSettings("workspace", target),
                      })}
                      decisionPending={snapshot.durability.phase === "saving"}
                      agentInteractionPending={snapshot.durability.phase === "saving" ||
                        agentSnapshot?.phase === "running" || unownedProcessExecutionActive ||
                        workspaceExport.pending || workspaceCleanup !== null}
                      {...(!workspaceExport.available ? {} : {
                        workspaceExport: workspaceExport.state,
                        workspaceExportDisabled: workspaceExport.disabled,
                        onExportWorkspace: workspaceExport.start,
                        onCancelWorkspaceExport: workspaceExport.cancel,
                      })}
                      {...(processNetworkAccess?.processId !== activeProcessId ? {} : {
                        networkAccess: {
                          enabled: processNetworkAccess.enabled,
                          pending: networkAccessMutationPending,
                          onChange: setProcessNetworkAccessV1,
                        },
                      })}
                      onAccept={() => {
                        const proposal = snapshot.activeProcess?.subject?.head.proposal;
                        if (proposal !== undefined) void controller.acceptProposal(proposal);
                      }}
                      onReject={() => {
                        const proposal = snapshot.activeProcess?.subject?.head.proposal;
                        if (proposal !== undefined) void controller.rejectProposal(proposal);
                      }}
                      onSend={async (text) => {
                        if (host.agentReadiness.status !== "ready") return false;
                        if (await submitAgentRunV1(text)) return true;
                        if (host.deterministicAgent || host.agentReadiness.status !== "ready") {
                          return false;
                        }
                        const result = await controller.sendFollowUp(text);
                        return result.kind === "completed" && result.value.kind === "sent";
                      }}
                      onRetryInterruptedAgentRun={retryInterruptedAgentRunV1}
                      onLoadOlderTranscript={async () => {
                        const result = await controller.loadOlderTranscript();
                        return result.kind === "completed" && result.value;
                      }}
                      {...(agentSnapshot === null ||
                          (host.deterministicAgent && !deterministicAgentReady)
                        ? {}
                        : {
                          executionWorkspace: agentSnapshot.workspace,
                          piAgentRun: {
                            runtime: host.deterministicAgent
                              ? "deterministic_test" as const
                              : "pi_provider" as const,
                            status: agentSnapshot.phase === "running"
                              ? "running" as const
                              : agentSnapshot.phase === "failed"
                              ? "failed" as const
                              : "ready" as const,
                            draft: agentSnapshot.draft,
                            diagnosticPath: agentSnapshot.diagnostic?.path ?? null,
                            onCancel: () =>
                              void port?.cancel(agentSnapshot.activeRunId ?? undefined),
                            onForget: host.forgetAgent,
                          },
                        })}
                    />
                  </Suspense>
                </ActiveCreatorProcessBoundaryV1>
              )}
            {(snapshot.durability.phase === "saving" ||
              snapshot.durability.phase === "failed") && (
              <aside
                className={`program-storage-status is-${snapshot.durability.phase}`}
                role={snapshot.durability.phase === "failed" ? "alert" : "status"}
                aria-live="polite"
              >
                {snapshot.durability.phase === "saving"
                  ? <LoaderCircle className="is-spinning" size={16} aria-hidden="true" />
                  : <TriangleAlert size={16} aria-hidden="true" />}
                <span>
                  {snapshot.durability.phase === "saving"
                    ? copy.savingProgram
                    : host.copy.persistenceFailure}
                </span>
                {snapshot.durability.phase === "failed" &&
                  snapshot.durability.recovery !== null && (
                  <ButtonV1
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={RotateCcw}
                    onClick={() => void controller.retry()}
                  >
                    {host.copy.retry}
                  </ButtonV1>
                )}
              </aside>
            )}
          </>
        }
      />
    </section>
  );
}

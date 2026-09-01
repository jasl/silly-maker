// SPDX-License-Identifier: MIT

import { LoaderCircle, RotateCcw, TriangleAlert } from "lucide-react";
import {
  Fragment,
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { ProcessNetworkAccessV1 } from "../../../src/program-platform/capabilities/process-network-access.ts";
import type { ProgramRuntimeSurfacePropsV1 } from "../../../src/program-platform/ui/program-runtime-surface.ts";
import { ProgramUiContainerV1 } from "../../../src/program-platform/ui/program-ui-container.tsx";
import { useProcessExecutionMonitorV1 } from "../../../src/program-platform/ui/use-process-execution-monitor.ts";
import { CollectionStateV1 } from "../../../src/ui/collection-state.tsx";
import {
  hasUnownedProcessExecutionV1,
  recoverLostAgentRunExecutionV1,
} from "../../../src/ui/agent-run-lease-monitor.ts";
import { ButtonV1 } from "../../../src/ui/design-system/button.tsx";
import { createCreatorProgramAgentPortV1 } from "../runtime-profile/browser-creator-agent-port.ts";
import { creatorProgramRuntimeProfileV1 } from "../runtime-profile/creator-runtime-profile-descriptor.ts";
import type {
  CreatorControllerV1,
  CreatorDurabilityStateV1,
} from "../runtime/creator-controller.ts";
import { creatorProcessExecutionLeaseRenewalIntervalMillisecondsV1 } from "../runtime/creator-controller.ts";
import type { CreatorAgentRunRequestV1 } from "../runtime/contracts.ts";
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
  const port = useMemo(
    () => host.agentHost === null ? null : createCreatorProgramAgentPortV1(host.agentHost),
    [host.agentHost],
  );
  const agentSnapshot = useSyncExternalStore(
    port?.subscribe ?? (() => () => undefined),
    port?.getSnapshot ?? (() => null),
    port?.getSnapshot ?? (() => null),
  );
  const [processNetworkAccess, setProcessNetworkAccess] = useState<ProcessNetworkAccessV1 | null>(
    null,
  );
  const [networkAccessMutationPending, setNetworkAccessMutationPending] = useState(false);
  const networkAccessEpochRef = useRef(0);
  const networkAccessMutationPendingRef = useRef(false);
  const [conversationRestorePending, setConversationRestorePending] = useState(false);
  const conversationRestoreEpochRef = useRef(0);
  const [ownedRuns] = useState(() => new Map<string, CreatorAgentRunRequestV1>());
  const [leaseLostRuns] = useState(() => new Set<string>());
  const terminalSettlementRef = useRef<Promise<void>>(Promise.resolve());
  const registerAgentDrain = host.registerAgentDrain;
  const reportFailure = host.reportFailure;
  const processNetworkAccessCapability = host.processNetworkAccess;
  const activeAttemptId = snapshot.activeProcess?.process.activeAttempt?.attemptId ?? null;
  const ownedRun = activeAttemptId === null ? null : ownedRuns.get(activeAttemptId) ?? null;
  const unownedProcessExecutionActive = hasUnownedProcessExecutionV1({
    activeAttemptId,
    ownsAttempt: (attemptId) => ownedRuns.has(attemptId),
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
      agentSnapshot.workspace.phase !== "opening" &&
      agentSnapshot.workspace.phase !== "closing",
    reportFailure,
  });
  const drainWorkspaceExport = workspaceExport.drain;

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
    if (port === null) return undefined;
    return registerAgentDrain(async () => {
      const workspaceExportSettlement = drainWorkspaceExport();
      await Promise.all([
        terminalSettlementRef.current.catch(() => undefined),
        workspaceExportSettlement,
      ]);
      await port.dispose();
    });
  }, [drainWorkspaceExport, port, registerAgentDrain]);

  useEffect(() => {
    if (port === null || agentSnapshot === null) return;
    const terminal = agentSnapshot.terminalRuns[0];
    if (terminal === undefined || !ownedRuns.has(terminal.run.agentRunId)) return;
    const leaseWasLost = leaseLostRuns.delete(terminal.run.agentRunId);
    ownedRuns.delete(terminal.run.agentRunId);
    const settlement = terminalSettlementRef.current.then(async () => {
      try {
        if (leaseWasLost) {
          const acknowledged = await port.acknowledgeTerminal(terminal.run.agentRunId);
          if (acknowledged.kind === "workspace_unavailable") {
            host.reportFailure(
              "silly_os.browser_pi_workspace_receipt_acknowledge_failed",
              acknowledged.diagnostic,
            );
          }
          return;
        }
        const persisted = await controller.recordAgentRunTerminal(terminal);
        if (persisted.kind === "busy") return;
        if (persisted.kind !== "completed") {
          host.reportFailure("silly_os.browser_pi_terminal_rejected", persisted);
          return;
        }
        const acknowledged = await port.acknowledgeTerminal(terminal.run.agentRunId);
        if (acknowledged.kind === "workspace_unavailable") {
          host.reportFailure(
            "silly_os.browser_pi_workspace_receipt_acknowledge_failed",
            acknowledged.diagnostic,
          );
          return;
        }
        const workspace = port.getSnapshot().workspace;
        if (workspace.descriptor !== null) {
          await port.closeWorkspace(workspace.descriptor.workspaceSessionId);
        }
      } catch (error) {
        host.reportFailure("silly_os.browser_pi_terminal_rejected", error);
      }
    });
    terminalSettlementRef.current = settlement;
    void settlement;
  }, [agentSnapshot, controller, host, leaseLostRuns, ownedRuns, port]);

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
    isOwnedAttempt: (attemptId) => ownedRuns.has(attemptId),
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
    run: CreatorAgentRunRequestV1,
    workspaceSessionId: string,
  ): Promise<boolean> => {
    if (port === null) return false;
    ownedRuns.set(run.agentRunId, run);
    const submitted = await port.submit(run);
    if (submitted.kind === "submitted") return true;
    ownedRuns.delete(run.agentRunId);
    await controller.recordAgentRunTerminal({
      run,
      outcome: "failed",
      diagnosticCode: submitted.diagnostic.code,
    });
    await port.closeWorkspace(workspaceSessionId);
    host.reportFailure("silly_os.browser_pi_submit_failed", submitted.diagnostic);
    return false;
  };

  const submitAgentRunV1 = async (text: string): Promise<boolean> => {
    if (port === null || agentSnapshot?.phase !== "ready") return false;
    await terminalSettlementRef.current;
    const active = controller.getSnapshot().activeProcess;
    const process = active?.process ?? null;
    const program = active?.subject?.currentProgram ?? null;
    const workspaceId = process?.checkpoint?.workspaceId ?? null;
    if (process === null || program === null || workspaceId === null) return false;
    const opened = await port.openWorkspace({
      processId: process.processId,
      programId: program.programId,
      workspaceId,
    });
    if (opened.kind !== "opened") {
      host.reportFailure("silly_os.browser_pi_workspace_open_failed", opened.diagnostic);
      return false;
    }
    const prepared = await controller.prepareAgentRun(text);
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      await port.closeWorkspace(opened.descriptor.workspaceSessionId);
      host.reportFailure("silly_os.browser_pi_submit_rejected", prepared);
      return false;
    }
    return await submitPreparedAgentRunV1(
      prepared.value.run,
      opened.descriptor.workspaceSessionId,
    );
  };

  const retryInterruptedAgentRunV1 = async (): Promise<boolean> => {
    if (port === null || agentSnapshot?.phase !== "ready") return false;
    await terminalSettlementRef.current;
    const active = controller.getSnapshot().activeProcess;
    const process = active?.process ?? null;
    const program = active?.subject?.currentProgram ?? null;
    const workspaceId = process?.checkpoint?.workspaceId ?? null;
    if (
      process === null || process.status !== "interrupted_retryable" || program === null ||
      workspaceId === null
    ) return false;
    const opened = await port.openWorkspace({
      processId: process.processId,
      programId: program.programId,
      workspaceId,
    });
    if (opened.kind !== "opened") {
      host.reportFailure("silly_os.browser_pi_workspace_open_failed", opened.diagnostic);
      return false;
    }
    const refreshed = await controller.reloadLatestTranscript();
    if (refreshed.kind === "failed") {
      await port.closeWorkspace(opened.descriptor.workspaceSessionId);
      host.reportFailure("silly_os.process_execution_recovery_failed", refreshed);
      return false;
    }
    const prepared = await controller.retryInterruptedAgentRun();
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      await port.closeWorkspace(opened.descriptor.workspaceSessionId);
      host.reportFailure("silly_os.browser_pi_submit_rejected", prepared);
      return false;
    }
    return await submitPreparedAgentRunV1(
      prepared.value.run,
      opened.descriptor.workspaceSessionId,
    );
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
    if (await controller.openHome()) await host.onOpenProgramLibrary();
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
                        workspaceExport.pending}
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

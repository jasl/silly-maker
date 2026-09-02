// SPDX-License-Identifier: MIT

import { LoaderCircle, RotateCcw, TriangleAlert } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { defaultProcessExecutionLeaseRenewalIntervalMillisecondsV1 } from "../../../src/program-platform/process/process-execution-repository.ts";
import {
  type ProgramRuntimeSurfacePropsV1,
  shouldRetryProgramWorkspaceCleanupV1,
} from "../../../src/program-platform/ui/program-runtime-surface.ts";
import type { ProgramRunProjectionV1 } from "../../../src/program-platform/ui/program-ui-container.tsx";
import { useProcessExecutionMonitorV1 } from "../../../src/program-platform/ui/use-process-execution-monitor.ts";
import { CollectionStateV1 } from "../../../src/ui/collection-state.tsx";
import { recoverLostAgentRunExecutionV1 } from "../../../src/ui/agent-run-lease-monitor.ts";
import { ButtonV1 } from "../../../src/ui/design-system/button.tsx";
import {
  createTranslationProgramAgentPortV1,
  type TranslationAgentPortV1,
} from "../runtime-profile/browser-translation-agent-port.ts";
import { createTranslationBatchBudgetForModelV1 } from "../runtime-profile/translation-runtime-profile.ts";
import { translationProgramRuntimeProfileV1 } from "../runtime-profile/translation-runtime-profile-descriptor.ts";
import type { TranslationAgentRunRequestV1 } from "../runtime/translation-agent-contracts.ts";
import type { TranslationProcessExportArtifactV1 } from "../runtime/translation-process-export.ts";
import type { TranslationProcessControllerV1 } from "../runtime/translation-process-controller.ts";
import { acknowledgeTranslationAgentTerminalV1 } from "./agent-terminal-acknowledgement.ts";
import {
  TranslationProcessWorkspaceV1,
  type TranslationWorkspaceSessionViewStateV1,
} from "./translation-process-workspace.tsx";

const translationWorkspaceViewStateSessionKeyPrefixV1 = "translation.workspace-view-state.v1:";

function downloadTranslationArtifactV1(artifact: TranslationProcessExportArtifactV1): void {
  const bytes = new Uint8Array(artifact.bytes.byteLength);
  bytes.set(artifact.bytes);
  const url = URL.createObjectURL(new Blob([bytes], { type: artifact.mediaType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = artifact.fileName;
  anchor.rel = "noopener";
  anchor.hidden = true;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

type TranslationBatchBudgetV1 = Parameters<
  TranslationProcessControllerV1["prepareAgentBatch"]
>[0];
type TranslationRunPreparationV1 = (
  budget: TranslationBatchBudgetV1,
) => ReturnType<TranslationProcessControllerV1["prepareAgentBatch"]>;

interface TranslationWorkspaceCleanupV1 {
  readonly workspaceSessionId: string;
  readonly retryRevision: number;
}

interface OwnedTranslationRunV1 {
  readonly port: TranslationAgentPortV1;
  readonly run: TranslationAgentRunRequestV1;
}

interface TranslationAgentSubmissionFenceV1 {
  readonly port: TranslationAgentPortV1;
}

function retainedTranslationWorkspaceViewStateV1(
  value: unknown,
): TranslationWorkspaceSessionViewStateV1 | undefined {
  if (
    typeof value !== "object" || value === null ||
    !("mode" in value) || (value.mode !== "guided" && value.mode !== "conversation") ||
    !("draft" in value) || typeof value.draft !== "string" ||
    !("conversation" in value) || typeof value.conversation !== "object" ||
    value.conversation === null
  ) return undefined;
  const candidateDraftValue = "candidateDraft" in value ? value.candidateDraft : null;
  if (
    candidateDraftValue !== null &&
    (typeof candidateDraftValue !== "object" ||
      !("candidateId" in candidateDraftValue) ||
      typeof candidateDraftValue.candidateId !== "string" ||
      !("overrides" in candidateDraftValue) ||
      !Array.isArray(candidateDraftValue.overrides) ||
      candidateDraftValue.overrides.some((override) =>
        typeof override !== "object" || override === null ||
        !("unitId" in override) || typeof override.unitId !== "string" ||
        !("target" in override) || typeof override.target !== "string"
      ) ||
      new Set(candidateDraftValue.overrides.map((override) => override.unitId)).size !==
        candidateDraftValue.overrides.length)
  ) return undefined;
  const admittedCandidateDraft = candidateDraftValue as {
    readonly candidateId: string;
    readonly overrides: readonly { readonly unitId: string; readonly target: string }[];
  } | null;
  const candidateDraft = admittedCandidateDraft === null ? null : {
    candidateId: admittedCandidateDraft.candidateId,
    overrides: admittedCandidateDraft.overrides.map(({ unitId, target }) => ({ unitId, target })),
  };
  return {
    mode: value.mode,
    draft: value.draft,
    conversation: value.conversation as TranslationWorkspaceSessionViewStateV1["conversation"],
    candidateDraft,
  };
}

/** Program-owned controller, typed Agent facade and Translation UI composition. */
export function TranslationProgramSurfaceV1({
  controller: opaqueController,
  host,
}: ProgramRuntimeSurfacePropsV1): ReactNode {
  const controller = opaqueController as TranslationProcessControllerV1;
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const [port, setPort] = useState<TranslationAgentPortV1 | null>(null);
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
  const [ownedRuns] = useState(() => new Map<string, OwnedTranslationRunV1>());
  const [agentSubmissionFences] = useState(
    () => new Set<TranslationAgentSubmissionFenceV1>(),
  );
  const [leaseLostRuns] = useState(() => new Set<string>());
  const [terminalSettlingRuns] = useState(() => new Set<string>());
  const [terminalRetryRevision, setTerminalRetryRevision] = useState(0);
  const [workspaceCleanup, setWorkspaceCleanup] = useState<TranslationWorkspaceCleanupV1 | null>(
    null,
  );
  const workspaceCleanupSessionIdRef = useRef<string | null>(null);
  const terminalSettlementRef = useRef<Promise<void>>(Promise.resolve());
  const workspaceCloseTailRef = useRef<Promise<void>>(Promise.resolve());
  const registerAgentDrain = host.registerAgentDrain;
  const registerProgramDrain = host.registerProgramDrain;
  const reportFailure = host.reportFailure;
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

  useLayoutEffect(() => {
    if (host.agentHost === null) {
      setPort(null);
      return undefined;
    }
    const exactPort = createTranslationProgramAgentPortV1(host.agentHost);
    let quiesceSettlement: Promise<void> | null = null;
    let retireSettlement: Promise<void> | null = null;
    const quiesceV1 = (): Promise<void> => {
      if (quiesceSettlement !== null) return quiesceSettlement;
      const settlement = (async (): Promise<void> => {
        await terminalSettlementRef.current;
        const assertSettledV1 = (): void => {
          if ([...agentSubmissionFences].some((fence) => fence.port === exactPort)) {
            throw new Error("Translation Agent preparation is still pending");
          }
          const exactSnapshot = exactPort.getSnapshot();
          const ownedRunIds = new Set(
            [...ownedRuns]
              .filter(([, owned]) => owned.port === exactPort)
              .map(([agentRunId]) => agentRunId),
          );
          if (
            (exactSnapshot.activeRunId !== null && ownedRunIds.has(exactSnapshot.activeRunId)) ||
            exactSnapshot.terminalRuns.some(({ run }) => ownedRunIds.has(run.agentRunId)) ||
            ownedRunIds.size > 0
          ) {
            throw new Error("Translation Agent terminal is still pending");
          }
        };
        assertSettledV1();
        await runWorkspaceCloseExclusiveV1(async () => {
          const workspace = exactPort.getSnapshot().workspace;
          if (
            workspace.descriptor === null ||
            ["closed", "disposed", "forgotten"].includes(workspace.phase)
          ) return;
          const closed = await exactPort.closeWorkspace(
            workspace.descriptor.workspaceSessionId,
          );
          if (closed.kind === "unavailable") {
            reportFailure(
              "silly_os.translation_agent_workspace_close_failed",
              closed.diagnostic,
            );
            throw new Error("Translation Agent Workspace close failed", {
              cause: closed.diagnostic,
            });
          }
          // closeWorkspace must not manufacture an unpersisted terminal. A
          // future automatic-cancel policy needs an explicit
          // cancel -> persist/ack -> close contract instead.
          assertSettledV1();
        });
      })();
      quiesceSettlement = settlement;
      void settlement.finally(() => {
        if (quiesceSettlement === settlement) quiesceSettlement = null;
      }).catch(() => undefined);
      return settlement;
    };
    const retireV1 = (): Promise<void> => {
      if (retireSettlement !== null) return retireSettlement;
      const settlement = exactPort.dispose();
      retireSettlement = settlement;
      void settlement.catch(() => {
        if (retireSettlement === settlement) retireSettlement = null;
      });
      return settlement;
    };
    const unregisterAgentDrain = registerAgentDrain(retireV1);
    const unregisterProgramDrain = registerProgramDrain({
      quiesce: quiesceV1,
      retire: retireV1,
    });
    setPort(exactPort);
    return () => {
      for (const fence of agentSubmissionFences) {
        if (fence.port === exactPort) agentSubmissionFences.delete(fence);
      }
      for (const [agentRunId, owned] of ownedRuns) {
        if (owned.port !== exactPort) continue;
        ownedRuns.delete(agentRunId);
        leaseLostRuns.delete(agentRunId);
        terminalSettlingRuns.delete(agentRunId);
      }
      setPort((current) => current === exactPort ? null : current);
      unregisterProgramDrain();
      unregisterAgentDrain();
    };
  }, [
    agentSubmissionFences,
    host.agentHost,
    leaseLostRuns,
    ownedRuns,
    registerAgentDrain,
    registerProgramDrain,
    reportFailure,
    runWorkspaceCloseExclusiveV1,
    terminalSettlingRuns,
  ]);

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
      }, defaultProcessExecutionLeaseRenewalIntervalMillisecondsV1);
    };
    void runWorkspaceCloseExclusiveV1(async () => {
      const workspace = port.getSnapshot().workspace;
      if (
        workspace.descriptor === null ||
        ["closed", "disposed", "forgotten"].includes(workspace.phase) ||
        workspace.descriptor.workspaceSessionId !== workspaceCleanup.workspaceSessionId
      ) {
        clearWorkspaceCleanupV1(workspaceCleanup.workspaceSessionId);
        return "released" as const;
      }
      const closed = await port.closeWorkspace(workspaceCleanup.workspaceSessionId);
      if (closed.kind === "unavailable") {
        reportFailure(
          "silly_os.translation_agent_workspace_close_failed",
          closed.diagnostic,
        );
        return shouldRetryProgramWorkspaceCleanupV1(closed.diagnostic)
          ? "retry" as const
          : "blocked" as const;
      }
      clearWorkspaceCleanupV1(workspaceCleanup.workspaceSessionId);
      return "released" as const;
    }).then((result) => {
      if (cancelled) return;
      if (result === "retry") {
        retryV1();
        return;
      }
    }).catch((error: unknown) => {
      if (cancelled) return;
      reportFailure("silly_os.translation_agent_workspace_close_failed", error);
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

  useEffect(() => {
    if (port === null || terminalAgentRunId === null) return undefined;
    const terminal = latestAgentSnapshotRef.current?.terminalRuns.find(({ run }) =>
      run.agentRunId === terminalAgentRunId
    );
    if (
      terminal === undefined || ownedRuns.get(terminal.run.agentRunId)?.port !== port ||
      terminalSettlingRuns.has(terminal.run.agentRunId)
    ) return undefined;
    terminalSettlingRuns.add(terminal.run.agentRunId);
    let current = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRetryV1 = () => {
      if (!current || retryTimer !== null) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (!current) return;
        setTerminalRetryRevision((revision) => revision + 1);
      }, defaultProcessExecutionLeaseRenewalIntervalMillisecondsV1);
    };
    const leaseWasLost = leaseLostRuns.has(terminal.run.agentRunId);
    const settlement = terminalSettlementRef.current.then(async () => {
      try {
        if (leaseWasLost) {
          const acknowledged = await port.acknowledgeTerminal(terminal.run.agentRunId);
          if (acknowledged.kind === "workspace_unavailable") {
            reportFailure(
              "silly_os.translation_agent_workspace_receipt_acknowledge_failed",
              acknowledged.diagnostic,
            );
            scheduleRetryV1();
            return;
          }
          leaseLostRuns.delete(terminal.run.agentRunId);
          if (ownedRuns.get(terminal.run.agentRunId)?.port === port) {
            ownedRuns.delete(terminal.run.agentRunId);
          }
          return;
        }
        const persisted = await controller.recordAgentRunTerminal(terminal);
        const acknowledged = await acknowledgeTranslationAgentTerminalV1({
          persistence: persisted,
          agentRunId: terminal.run.agentRunId,
          recover: async () => {
            const recovered = await controller.refreshActiveProcess();
            if (recovered.kind === "failed") {
              throw new Error("Translation Process terminal recovery failed", {
                cause: recovered,
              });
            }
          },
          acknowledgeTerminal: (agentRunId) => port.acknowledgeTerminal(agentRunId),
        });
        if (acknowledged.kind === "retained") {
          reportFailure("silly_os.translation_agent_terminal_rejected", persisted);
          scheduleRetryV1();
          return;
        }
        if (acknowledged.kind === "workspace_unavailable") {
          reportFailure(
            "silly_os.translation_agent_workspace_receipt_acknowledge_failed",
            acknowledged.diagnostic,
          );
          scheduleRetryV1();
          return;
        }
        leaseLostRuns.delete(terminal.run.agentRunId);
        if (ownedRuns.get(terminal.run.agentRunId)?.port === port) {
          ownedRuns.delete(terminal.run.agentRunId);
        }
        const workspace = port.getSnapshot().workspace;
        if (workspace.descriptor !== null) {
          requestWorkspaceCleanupV1(workspace.descriptor.workspaceSessionId);
        }
      } catch (error) {
        reportFailure("silly_os.translation_agent_terminal_rejected", error);
        scheduleRetryV1();
      } finally {
        terminalSettlingRuns.delete(terminal.run.agentRunId);
      }
    });
    terminalSettlementRef.current = settlement;
    void settlement;
    return () => {
      current = false;
      if (retryTimer !== null) clearTimeout(retryTimer);
    };
  }, [
    controller,
    leaseLostRuns,
    ownedRuns,
    port,
    reportFailure,
    requestWorkspaceCleanupV1,
    terminalAgentRunId,
    terminalSettlingRuns,
    terminalRetryRevision,
  ]);

  const recoverLostOwnedRunV1 = useCallback(async (
    run: TranslationAgentRunRequestV1,
  ): Promise<void> => {
    if (port === null) return;
    leaseLostRuns.add(run.agentRunId);
    try {
      await recoverLostAgentRunExecutionV1({
        cancelRun: async () => {
          const cancelled = await port.cancel(run.agentRunId);
          if (cancelled.kind === "unavailable") {
            host.reportFailure(
              "silly_os.translation_agent_cancel_after_lease_loss_failed",
              cancelled.diagnostic,
            );
          }
        },
        releaseWorkspace: async () => {
          const workspace = port.getSnapshot().workspace;
          if (workspace.descriptor === null) return;
          const closed = await port.closeWorkspace(workspace.descriptor.workspaceSessionId);
          if (closed.kind === "unavailable") {
            throw new Error("Translation Workspace release after lease loss failed", {
              cause: closed.diagnostic,
            });
          }
        },
        reloadProcess: async () => {
          const recovered = await controller.refreshActiveProcess();
          if (recovered.kind === "failed") {
            throw new Error("Translation Process recovery after lease loss failed", {
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

  const activeProcessId = snapshot.activeProcess?.process.processId ?? null;
  const activeAttemptId = snapshot.activeProcess?.process.activeAttempt?.attemptId ?? null;
  const owned = activeAttemptId === null ? null : ownedRuns.get(activeAttemptId) ?? null;
  const ownedRun = owned?.port === port ? owned.run : null;
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
        throw new Error("Translation passive Process refresh failed", { cause: recovered });
      }
    },
    intervalMilliseconds: defaultProcessExecutionLeaseRenewalIntervalMillisecondsV1,
    registerDrain: registerAgentDrain,
    onError: (error) =>
      host.reportFailure("silly_os.translation_process_execution_monitor_failed", error),
  });

  const openLibraryV1 = async (): Promise<void> => {
    await host.onOpenProgramLibrary();
  };

  const submitPreparedTranslationRunV1 = async (
    prepare: TranslationRunPreparationV1,
    prepareFailureCode: string,
  ): Promise<boolean> => {
    if (port === null || agentSnapshot?.phase !== "ready") return false;
    const exactPort = port;
    const fence: TranslationAgentSubmissionFenceV1 = { port: exactPort };
    let workspaceSessionId: string | null = null;
    let run: TranslationAgentRunRequestV1 | null = null;
    let submitted = false;
    let terminalAttempted = false;
    agentSubmissionFences.add(fence);
    try {
      await terminalSettlementRef.current;
      const cleanupPending = await runWorkspaceCloseExclusiveV1(async () =>
        workspaceCleanupSessionIdRef.current !== null
      );
      if (cleanupPending || exactPort.getSnapshot().phase !== "ready") return false;
      const active = controller.getSnapshot().activeProcess;
      if (active === null) return false;
      const opened = await exactPort.openWorkspace({
        processId: active.process.processId,
        programId: active.programPackage.reference.programId,
        workspaceId: active.workspace.workspaceId,
      });
      if (opened.kind !== "opened") {
        host.reportFailure("silly_os.browser_pi_workspace_open_failed", opened.diagnostic);
        return false;
      }
      workspaceSessionId = opened.descriptor.workspaceSessionId;
      const model = host.activeModel;
      const instructions = active.programPackage.instructions;
      const budget = model === null || instructions === null
        ? null
        : createTranslationBatchBudgetForModelV1({
          contextWindow: model.contextWindow,
          maximumOutputTokens: model.maximumOutputTokens,
          instructions,
        });
      if (budget === null) {
        host.reportFailure("silly_os.translation_agent_budget_unavailable", {
          programPackage: active.programPackage.reference,
          model,
        });
        return false;
      }
      const prepared = await prepare(budget);
      if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
        host.reportFailure(prepareFailureCode, prepared);
        return false;
      }
      run = prepared.value.run;
      ownedRuns.set(run.agentRunId, { port: exactPort, run });
      const submission = await exactPort.submit(run);
      if (submission.kind === "submitted") {
        submitted = true;
        return true;
      }
      if (ownedRuns.get(run.agentRunId)?.port === exactPort) ownedRuns.delete(run.agentRunId);
      terminalAttempted = true;
      await controller.recordAgentRunTerminal({
        run,
        outcome: "failed",
        diagnosticCode: submission.diagnostic.code === "connection_failed"
          ? "connection_failed"
          : submission.diagnostic.code === "protocol_invalid" ||
              submission.diagnostic.code === "submit_invalid"
          ? "protocol_invalid"
          : "run_failed",
      });
      host.reportFailure("silly_os.translation_agent_submit_failed", submission.diagnostic);
      return false;
    } catch (error) {
      if (run !== null && ownedRuns.get(run.agentRunId)?.port === exactPort) {
        ownedRuns.delete(run.agentRunId);
      }
      if (run !== null && !terminalAttempted) {
        try {
          await controller.recordAgentRunTerminal({
            run,
            outcome: "failed",
            diagnosticCode: "run_failed",
          });
        } catch (terminalError) {
          host.reportFailure("silly_os.translation_agent_terminal_rejected", terminalError);
        }
      }
      host.reportFailure("silly_os.translation_agent_submit_failed", error);
      return false;
    } finally {
      if (!submitted && workspaceSessionId !== null) {
        requestWorkspaceCleanupV1(workspaceSessionId);
      }
      agentSubmissionFences.delete(fence);
    }
  };

  const submitTranslationV1 = (instruction: string): Promise<boolean> =>
    submitPreparedTranslationRunV1(
      (budget) => controller.prepareAgentBatch(budget, instruction),
      "silly_os.translation_agent_prepare_failed",
    );

  const submitCandidateRetranslationV1 = (
    input: Parameters<TranslationProcessControllerV1["preparePendingCandidateRetranslation"]>[1],
  ): Promise<boolean> =>
    submitPreparedTranslationRunV1(
      (budget) => controller.preparePendingCandidateRetranslation(budget, input),
      "silly_os.translation_candidate_retranslation_prepare_failed",
    );

  const run: ProgramRunProjectionV1 | null = agentSnapshot === null ? null : {
    status: agentSnapshot.phase === "running"
      ? "running"
      : agentSnapshot.phase === "failed"
      ? "failed"
      : "idle",
    label: host.locale === "zh-CN" ? "翻译 Agent" : "Translation Agent",
    recentLines: [],
    ...(agentSnapshot.phase === "running" && agentSnapshot.activeRunId !== null
      ? {
        onCancel: () => {
          void port?.cancel(agentSnapshot.activeRunId ?? undefined);
        },
      }
      : {}),
  };

  if (snapshot.route === "process" && snapshot.activeProcess !== null) {
    const processId = snapshot.activeProcess.process.processId;
    const viewStateSessionKey = `${translationWorkspaceViewStateSessionKeyPrefixV1}${processId}`;
    const initialViewState = retainedTranslationWorkspaceViewStateV1(
      host.sessionState.read(viewStateSessionKey),
    );
    return (
      <section
        className="program-runtime-surface"
        data-program-runtime-profile={translationProgramRuntimeProfileV1}
      >
        <TranslationProcessWorkspaceV1
          key={processId}
          copy={host.copy}
          activeProcess={snapshot.activeProcess}
          onHome={() => void openLibraryV1()}
          onLocaleChange={host.onLocaleChange}
          theme={host.theme}
          onThemeChange={host.onThemeChange}
          onOpenSettings={() => host.onOpenSettings("workspace")}
          sourceImport={snapshot.sourceImport}
          agentRun={run}
          {...(host.deterministicAgent ? {} : { providerModel: host.providerModel("workspace") })}
          {...(agentSnapshot === null ? {} : {
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
              onCancel: () => void port?.cancel(agentSnapshot.activeRunId ?? undefined),
              onForget: host.forgetAgent,
            },
          })}
          onLoadTranslationRowWindow={controller.loadTranslationRowWindow}
          onExport={async () => {
            const result = await controller.exportCompletedTranslation();
            if (result.kind !== "completed" || result.value.kind !== "exported") {
              host.reportFailure("silly_os.translation_export_failed", result);
              return;
            }
            downloadTranslationArtifactV1(result.value.artifact);
          }}
          onLoadOlderTranscript={async () => {
            const result = await controller.loadOlderTranscript();
            if (result.kind === "completed") return result.value;
            host.reportFailure("silly_os.translation_transcript_load_older_failed", result);
            return false;
          }}
          onReloadLatestTranscript={async () => {
            const result = await controller.reloadLatestTranscript();
            if (result.kind === "completed") return result.value;
            host.reportFailure("silly_os.translation_transcript_reload_latest_failed", result);
            return false;
          }}
          onUpdateSettingsOverride={controller.updateSettingsOverride}
          {...(initialViewState === undefined ? {} : { initialViewState })}
          onViewStateChange={(next) => host.sessionState.write(viewStateSessionKey, next)}
          {...(port !== null && agentSnapshot?.phase === "ready" && workspaceCleanup === null
            ? {
              onSubmitInstruction: submitTranslationV1,
              onRetranslateCandidate: submitCandidateRetranslationV1,
            }
            : {})}
          onAcceptCandidate={async (input) => {
            const result = await controller.acceptPendingCandidate(input);
            if (result.kind !== "completed") {
              host.reportFailure("silly_os.translation_candidate_accept_failed", result);
            }
          }}
          onRejectCandidate={async (input) => {
            const result = await controller.rejectPendingCandidate(input);
            if (result.kind !== "completed") {
              host.reportFailure("silly_os.translation_candidate_reject_failed", result);
            }
          }}
          onImportFile={async ({ file, sourceLocale, targetLocale }) => {
            const result = await controller.importSource({
              source: { kind: "file", file },
              sourceLocale,
              targetLocale,
            });
            if (result.kind === "completed") return;
            throw new Error(
              `sillyos.translation.${
                result.kind === "failed" ? result.code : "translation_import_busy"
              }`,
            );
          }}
          onOperationError={(error) => {
            host.reportFailure("silly_os.translation_operation_failed", error);
          }}
        />
      </section>
    );
  }

  const failed = snapshot.durability.phase === "failed";
  return (
    <section
      className="program-runtime-surface"
      data-program-runtime-profile={translationProgramRuntimeProfileV1}
    >
      <main
        className="program-route-state"
        data-silly-os-view={failed ? "translation-failed" : "translation-loading"}
      >
        <div className="program-route-state__content">
          <CollectionStateV1
            icon={failed ? TriangleAlert : LoaderCircle}
            {...(failed ? { tone: "danger" as const } : { iconMotion: "spin" as const })}
            title={failed ? host.copy.persistenceFailure : host.copy.openingProgram}
            {...(failed ? { description: snapshot.durability.code, role: "alert" as const } : {
              role: "status" as const,
              "aria-live": "polite" as const,
            })}
            {...(failed && snapshot.durability.recovery === "retry"
              ? {
                action: (
                  <ButtonV1
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={RotateCcw}
                    onClick={() => void controller.retry()}
                  >
                    {host.copy.retry}
                  </ButtonV1>
                ),
              }
              : {})}
          />
        </div>
      </main>
    </section>
  );
}

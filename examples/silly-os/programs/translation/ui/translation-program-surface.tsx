// SPDX-License-Identifier: MIT

import { LoaderCircle, RotateCcw, TriangleAlert } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { defaultProcessExecutionLeaseRenewalIntervalMillisecondsV1 } from "../../../src/program-platform/process/process-execution-repository.ts";
import type { ProgramRuntimeSurfacePropsV1 } from "../../../src/program-platform/ui/program-runtime-surface.ts";
import type { ProgramRunProjectionV1 } from "../../../src/program-platform/ui/program-ui-container.tsx";
import { useProcessExecutionMonitorV1 } from "../../../src/program-platform/ui/use-process-execution-monitor.ts";
import { CollectionStateV1 } from "../../../src/ui/collection-state.tsx";
import { recoverLostAgentRunExecutionV1 } from "../../../src/ui/agent-run-lease-monitor.ts";
import { ButtonV1 } from "../../../src/ui/design-system/button.tsx";
import { createTranslationProgramAgentPortV1 } from "../runtime-profile/browser-translation-agent-port.ts";
import { createTranslationBatchBudgetForModelV1 } from "../runtime-profile/translation-runtime-profile.ts";
import { translationProgramRuntimeProfileV1 } from "../runtime-profile/translation-runtime-profile-descriptor.ts";
import type { TranslationAgentRunRequestV1 } from "../runtime/translation-agent-contracts.ts";
import type { TranslationProcessExportArtifactV1 } from "../runtime/translation-process-export.ts";
import type { TranslationProcessControllerV1 } from "../runtime/translation-process-controller.ts";
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
      !("targets" in candidateDraftValue) ||
      !Array.isArray(candidateDraftValue.targets) ||
      candidateDraftValue.targets.some((target) =>
        typeof target !== "object" || target === null ||
        !("unitId" in target) || typeof target.unitId !== "string" ||
        !("target" in target) || typeof target.target !== "string"
      ))
  ) return undefined;
  const admittedCandidateDraft = candidateDraftValue as {
    readonly candidateId: string;
    readonly targets: readonly { readonly unitId: string; readonly target: string }[];
  } | null;
  const candidateDraft = admittedCandidateDraft === null ? null : {
    candidateId: admittedCandidateDraft.candidateId,
    targets: admittedCandidateDraft.targets.map(({ unitId, target }) => ({ unitId, target })),
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
  const port = useMemo(
    () => host.agentHost === null ? null : createTranslationProgramAgentPortV1(host.agentHost),
    [host.agentHost],
  );
  const agentSnapshot = useSyncExternalStore(
    port?.subscribe ?? (() => () => undefined),
    port?.getSnapshot ?? (() => null),
    port?.getSnapshot ?? (() => null),
  );
  const [ownedRuns] = useState(() => new Map<string, TranslationAgentRunRequestV1>());
  const [leaseLostRuns] = useState(() => new Set<string>());
  const terminalSettlementRef = useRef<Promise<void>>(Promise.resolve());
  const registerAgentDrain = host.registerAgentDrain;

  useEffect(() => {
    if (port === null) return undefined;
    return registerAgentDrain(async () => {
      await terminalSettlementRef.current.catch(() => undefined);
      await port.dispose();
    });
  }, [port, registerAgentDrain]);

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
              "silly_os.translation_agent_workspace_receipt_acknowledge_failed",
              acknowledged.diagnostic,
            );
          }
          return;
        }
        const persisted = await controller.recordAgentRunTerminal(terminal);
        if (persisted.kind !== "completed") {
          host.reportFailure("silly_os.translation_agent_terminal_rejected", persisted);
          return;
        }
        const acknowledged = await port.acknowledgeTerminal(terminal.run.agentRunId);
        if (acknowledged.kind === "workspace_unavailable") {
          host.reportFailure(
            "silly_os.translation_agent_workspace_receipt_acknowledge_failed",
            acknowledged.diagnostic,
          );
          return;
        }
        const workspace = port.getSnapshot().workspace;
        if (workspace.descriptor !== null) {
          await port.closeWorkspace(workspace.descriptor.workspaceSessionId);
        }
      } catch (error) {
        host.reportFailure("silly_os.translation_agent_terminal_rejected", error);
      }
    });
    terminalSettlementRef.current = settlement;
    void settlement;
  }, [agentSnapshot, controller, host, leaseLostRuns, ownedRuns, port]);

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
  const ownedRun = activeAttemptId === null ? null : ownedRuns.get(activeAttemptId) ?? null;
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
    if (controller.openHome()) await host.onOpenProgramLibrary();
  };

  const submitPreparedTranslationRunV1 = async (
    prepare: TranslationRunPreparationV1,
    prepareFailureCode: string,
  ): Promise<boolean> => {
    if (port === null || agentSnapshot?.phase !== "ready") return false;
    await terminalSettlementRef.current;
    const active = controller.getSnapshot().activeProcess;
    if (active === null) return false;
    const opened = await port.openWorkspace({
      processId: active.process.processId,
      programId: active.programPackage.reference.programId,
      workspaceId: active.workspace.workspaceId,
    });
    if (opened.kind !== "opened") {
      host.reportFailure("silly_os.browser_pi_workspace_open_failed", opened.diagnostic);
      return false;
    }
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
      await port.closeWorkspace(opened.descriptor.workspaceSessionId);
      host.reportFailure("silly_os.translation_agent_budget_unavailable", {
        programPackage: active.programPackage.reference,
        model,
      });
      return false;
    }
    const prepared = await prepare(budget);
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      await port.closeWorkspace(opened.descriptor.workspaceSessionId);
      host.reportFailure(prepareFailureCode, prepared);
      return false;
    }
    const run = prepared.value.run;
    ownedRuns.set(run.agentRunId, run);
    const submitted = await port.submit(run);
    if (submitted.kind === "submitted") return true;
    ownedRuns.delete(run.agentRunId);
    await controller.recordAgentRunTerminal({
      run,
      outcome: "failed",
      diagnosticCode: submitted.diagnostic.code === "connection_failed"
        ? "connection_failed"
        : submitted.diagnostic.code === "protocol_invalid" ||
            submitted.diagnostic.code === "submit_invalid"
        ? "protocol_invalid"
        : "run_failed",
    });
    await port.closeWorkspace(opened.descriptor.workspaceSessionId);
    host.reportFailure("silly_os.translation_agent_submit_failed", submitted.diagnostic);
    return false;
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
          {...(port !== null && agentSnapshot?.phase === "ready"
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

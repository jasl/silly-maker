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
import type { TranslationProcessControllerV1 } from "../runtime/translation-process-controller.ts";
import { TranslationProcessWorkspaceV1 } from "./translation-process-workspace.tsx";

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

  const startTranslationV1 = async (): Promise<void> => {
    if (port === null || agentSnapshot?.phase !== "ready") return;
    const active = controller.getSnapshot().activeProcess;
    if (active === null) return;
    const opened = await port.openWorkspace({
      processId: active.process.processId,
      programId: active.programPackage.reference.programId,
      workspaceId: active.workspace.workspaceId,
    });
    if (opened.kind !== "opened") {
      host.reportFailure("silly_os.browser_pi_workspace_open_failed", opened.diagnostic);
      return;
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
      return;
    }
    const prepared = await controller.prepareAgentBatch(budget);
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      await port.closeWorkspace(opened.descriptor.workspaceSessionId);
      if (prepared.kind !== "completed" || prepared.value.kind !== "complete") {
        host.reportFailure("silly_os.translation_agent_prepare_failed", prepared);
      }
      return;
    }
    const run = prepared.value.run;
    ownedRuns.set(run.agentRunId, run);
    const submitted = await port.submit(run);
    if (submitted.kind === "submitted") return;
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
  };

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
    return (
      <section
        className="program-runtime-surface"
        data-program-runtime-profile={translationProgramRuntimeProfileV1}
      >
        <TranslationProcessWorkspaceV1
          copy={host.copy}
          activeProcess={snapshot.activeProcess}
          onHome={() => void openLibraryV1()}
          onLocaleChange={host.onLocaleChange}
          theme={host.theme}
          onThemeChange={host.onThemeChange}
          onOpenSettings={() => host.onOpenSettings("workspace")}
          sourceImport={snapshot.sourceImport}
          agentRun={run}
          onLoadTranslationRowWindow={controller.loadTranslationRowWindow}
          onUpdateSettingsOverride={controller.updateSettingsOverride}
          {...(port !== null && agentSnapshot?.phase === "ready"
            ? { onStartTranslation: startTranslationV1 }
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

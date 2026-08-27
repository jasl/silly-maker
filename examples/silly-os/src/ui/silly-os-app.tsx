// SPDX-License-Identifier: MIT
import { LoaderCircle, RotateCcw, TriangleAlert } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type { BrowserPiWorkerRuntimeV1 } from "../agent/browser-pi-worker-protocol.ts";
import { getSillyOsCopyV1, resolveSillyOsCopyV1, type SillyOsLocaleV1 } from "../content/copy.ts";
import type {
  CreatorControllerV1,
  CreatorDurabilityStateV1,
} from "../product/creator-controller.ts";
import {
  acknowledgeAppliedAgentTerminalV1,
  canConsumeAgentTerminalV1,
} from "./agent-terminal-acknowledgement.ts";
import { CreatorHomeV1 } from "./creator-home.tsx";
import { ProgramWorkspaceV1 } from "./program-workspace.tsx";
import "./silly-os.css";

export interface SillyOsAppPropsV1 {
  readonly controller: CreatorControllerV1;
  readonly reportFailure: (code: string, error: unknown) => void;
}

type BrowserCreatorAgentModuleV1 = typeof import("../agent/creator-agent-port.ts");
type BrowserCreatorAgentPortV1 = ReturnType<
  BrowserCreatorAgentModuleV1["createBrowserCreatorAgentPortV1"]
>;
type BrowserCreatorAgentSnapshotV1 = ReturnType<BrowserCreatorAgentPortV1["getSnapshot"]>;
type PiAgentSetupStatusV1 = "loading" | "available" | "initializing" | "ready" | "failed";

function requestedBrowserPiRuntimeV1(): BrowserPiWorkerRuntimeV1 | null {
  if (typeof location === "undefined") return null;
  const requested = new URLSearchParams(location.search).get("agent");
  if (requested === "pi-test") return "deterministic_test";
  if (requested === "pi-openai") return "openai_direct";
  return null;
}

function piAgentRunStatusV1(
  phase: BrowserCreatorAgentSnapshotV1["phase"],
): "connecting" | "ready" | "running" | "completed" | "failed" | "disposed" {
  switch (phase) {
    case "uninitialized":
    case "initializing":
      return "connecting";
    case "ready":
      return "ready";
    case "running":
      return "running";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "forgotten":
    case "disposed":
      return "disposed";
  }
  const exhaustive: never = phase;
  return exhaustive;
}

function storageOperationV1(
  durability: CreatorDurabilityStateV1,
): string | undefined {
  return "operation" in durability ? durability.operation : undefined;
}

export function SillyOsAppV1({ controller, reportFailure }: SillyOsAppPropsV1): ReactNode {
  const initialCopy = resolveSillyOsCopyV1();
  const [locale, setLocale] = useState<SillyOsLocaleV1>(initialCopy.locale);
  const [piRuntime] = useState(requestedBrowserPiRuntimeV1);
  const piAgentRequested = piRuntime !== null;
  const [piAgentSetupStatus, setPiAgentSetupStatus] = useState<PiAgentSetupStatusV1>("loading");
  const [agentPort, setAgentPort] = useState<BrowserCreatorAgentPortV1 | null>(null);
  const [agentSnapshot, setAgentSnapshot] = useState<BrowserCreatorAgentSnapshotV1 | null>(null);
  const agentFactoryRef = useRef<
    BrowserCreatorAgentModuleV1["createBrowserCreatorAgentPortV1"] | null
  >(null);
  const agentPortRef = useRef<BrowserCreatorAgentPortV1 | null>(null);
  const agentSetupEpochRef = useRef(0);
  const agentTeardownRef = useRef<Promise<void>>(Promise.resolve());
  const agentWorkspaceLifecycleRef = useRef<Promise<void>>(Promise.resolve());
  const claimedTerminalRunIdsRef = useRef(new Set<string>());
  const controllerSnapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const snapshot = controllerSnapshot.session;
  const durability = controllerSnapshot.durability;
  const copy = getSillyOsCopyV1(locale);
  const routedProgramId = snapshot.route === "workspace"
    ? snapshot.program?.programId ?? null
    : null;
  const routedWorkspaceId = snapshot.route === "workspace"
    ? snapshot.workspace?.workspaceId ?? null
    : null;

  useEffect(() => {
    void controller.initialize();
  }, [controller]);

  useEffect(() => {
    if (!piAgentRequested) return undefined;
    let current = true;
    void import("../agent/creator-agent-port.ts").then(
      (module) => {
        if (!current) return;
        agentFactoryRef.current = module.createBrowserCreatorAgentPortV1;
        setPiAgentSetupStatus("available");
      },
      (error: unknown) => {
        if (!current) return;
        setPiAgentSetupStatus("failed");
        reportFailure("silly_os.browser_pi_adapter_unavailable", error);
      },
    );
    return () => {
      current = false;
      agentFactoryRef.current = null;
    };
  }, [piAgentRequested, reportFailure]);

  useEffect(() => {
    if (agentPort === null) {
      setAgentSnapshot(null);
      return undefined;
    }
    const update = (): void => setAgentSnapshot(agentPort.getSnapshot());
    update();
    return agentPort.subscribe(update);
  }, [agentPort]);

  useEffect(() => {
    const port = agentPortRef.current;
    const terminal = agentSnapshot?.terminalRuns[0];
    if (
      port === null || terminal === undefined || !canConsumeAgentTerminalV1(durability.phase) ||
      claimedTerminalRunIdsRef.current.has(terminal.run.agentRunId)
    ) return;
    claimedTerminalRunIdsRef.current.add(terminal.run.agentRunId);
    void (async (): Promise<void> => {
      try {
        const persistence = await controller.recordAgentRunTerminal(terminal);
        if (persistence.kind === "busy") return;
        const acknowledgement = await acknowledgeAppliedAgentTerminalV1({
          persistence,
          agentRunId: terminal.run.agentRunId,
          receipts: port.getSnapshot().workspace.receipts,
          acknowledgeWorkspaceReceipts: (throughSequence) =>
            port.acknowledgeWorkspaceReceipts(throughSequence),
          acknowledgeTerminal: (agentRunId) => port.acknowledgeTerminal(agentRunId),
        });
        if (acknowledgement.kind === "retained") {
          reportFailure("silly_os.browser_pi_terminal_rejected", persistence);
        } else if (acknowledgement.kind === "workspace_unavailable") {
          reportFailure(
            "silly_os.browser_pi_workspace_receipt_acknowledge_failed",
            acknowledgement.diagnostic,
          );
        } else if (acknowledgement.kind === "terminal_unavailable") {
          reportFailure("silly_os.browser_pi_terminal_acknowledge_failed", terminal.run.agentRunId);
        }
      } catch (error) {
        reportFailure("silly_os.browser_pi_terminal_rejected", error);
      } finally {
        claimedTerminalRunIdsRef.current.delete(terminal.run.agentRunId);
      }
    })();
  }, [agentSnapshot, controller, durability.phase, reportFailure]);

  const queueAgentWorkspaceV1 = useCallback((
    port: BrowserCreatorAgentPortV1,
    desired: { readonly programId: string; readonly workspaceId: string } | null,
  ): Promise<boolean> => {
    const operation = agentWorkspaceLifecycleRef.current.then(async () => {
      if (agentPortRef.current !== port) {
        return false;
      }
      const current = port.getSnapshot().workspace;
      if (desired === null) {
        if (current.descriptor === null || current.phase === "closed") {
          return true;
        }
        const closed = await port.closeWorkspace(current.descriptor.workspaceSessionId);
        if (closed.kind === "unavailable") {
          reportFailure("silly_os.browser_pi_workspace_close_failed", closed.diagnostic);
          return false;
        }
        return true;
      }
      if (
        current.phase === "open" && current.descriptor?.programId === desired.programId &&
        current.descriptor.workspaceId === desired.workspaceId
      ) {
        return true;
      }
      if (current.descriptor !== null && current.phase !== "closed") {
        const closed = await port.closeWorkspace(current.descriptor.workspaceSessionId);
        if (closed.kind === "unavailable") {
          reportFailure("silly_os.browser_pi_workspace_close_failed", closed.diagnostic);
          return false;
        }
      }
      if (agentPortRef.current !== port) {
        return false;
      }
      const opened = await port.openWorkspace(desired);
      if (opened.kind === "unavailable") {
        reportFailure("silly_os.browser_pi_workspace_open_failed", opened.diagnostic);
        return false;
      }
      return true;
    }).catch((error: unknown) => {
      reportFailure("silly_os.browser_pi_workspace_lifecycle_failed", error);
      return false;
    });
    agentWorkspaceLifecycleRef.current = operation.then(() => undefined);
    return operation;
  }, [reportFailure]);

  useEffect(() => {
    const port = agentPortRef.current;
    if (port === null || piAgentSetupStatus !== "ready") return;
    const desired = routedProgramId !== null && routedWorkspaceId !== null
      ? { programId: routedProgramId, workspaceId: routedWorkspaceId }
      : null;
    void queueAgentWorkspaceV1(port, desired);
  }, [
    agentPort,
    piAgentSetupStatus,
    queueAgentWorkspaceV1,
    routedProgramId,
    routedWorkspaceId,
  ]);

  useEffect(() => {
    return () => {
      agentSetupEpochRef.current += 1;
      const current = agentPortRef.current;
      agentPortRef.current = null;
      if (current !== null) {
        agentTeardownRef.current = agentTeardownRef.current.then(() => current.dispose()).catch(
          () => undefined,
        );
      }
    };
  }, []);

  const changeLocaleV1 = (next: SillyOsLocaleV1): void => {
    setLocale(next);
    const url = new URL(location.href);
    url.searchParams.set("locale", next);
    history.replaceState(history.state, "", url);
  };

  const initializePiAgentV1 = (suppliedCredential: string): void => {
    const factory = agentFactoryRef.current;
    if (factory === null || piRuntime === null || suppliedCredential.length === 0) {
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.browser_pi_adapter_unavailable", "factory_unavailable");
      return;
    }
    const epoch = ++agentSetupEpochRef.current;
    setPiAgentSetupStatus("initializing");
    let credential = suppliedCredential;
    let port: BrowserCreatorAgentPortV1;
    try {
      port = factory({ apiKey: credential, runtime: piRuntime });
    } catch (error) {
      credential = "";
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.browser_pi_initialize_failed", error);
      return;
    }
    credential = "";
    const predecessor = agentPortRef.current;
    agentPortRef.current = null;
    setAgentPort(null);
    setAgentSnapshot(null);
    claimedTerminalRunIdsRef.current.clear();
    if (predecessor !== null) {
      agentTeardownRef.current = agentTeardownRef.current.then(() => predecessor.dispose()).catch(
        () => undefined,
      );
    }
    void (async (): Promise<void> => {
      await agentTeardownRef.current;
      if (agentSetupEpochRef.current !== epoch) {
        await port.forget();
        return;
      }
      agentPortRef.current = port;
      setAgentPort(port);
      const result = await port.initialize();
      if (agentSetupEpochRef.current !== epoch || agentPortRef.current !== port) return;
      if (result.kind === "ready") {
        setPiAgentSetupStatus("ready");
        return;
      }
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.browser_pi_initialize_failed", result.diagnostic);
    })();
  };

  const forgetPiAgentV1 = (): void => {
    agentSetupEpochRef.current += 1;
    const current = agentPortRef.current;
    agentPortRef.current = null;
    setAgentPort(null);
    setAgentSnapshot(null);
    claimedTerminalRunIdsRef.current.clear();
    setPiAgentSetupStatus(agentFactoryRef.current === null ? "loading" : "available");
    if (current !== null) {
      agentTeardownRef.current = agentTeardownRef.current.then(() => current.forget()).catch(
        () => undefined,
      );
    }
  };

  const sendFollowUpV1 = async (text: string): Promise<boolean> => {
    if (!piAgentRequested) {
      const result = await controller.sendFollowUp(text);
      if (result.kind === "completed" && result.value.kind === "sent") return true;
      reportFailure("silly_os.follow_up_rejected", result);
      return false;
    }
    const port = agentPortRef.current;
    if (port === null || piAgentSetupStatus !== "ready") {
      reportFailure("silly_os.browser_pi_unavailable", "initialize_required");
      return false;
    }
    const currentSession = controller.getSnapshot().session;
    if (
      currentSession.route !== "workspace" || currentSession.program === null ||
      currentSession.workspace === null ||
      !await queueAgentWorkspaceV1(port, {
        programId: currentSession.program.programId,
        workspaceId: currentSession.workspace.workspaceId,
      })
    ) {
      reportFailure("silly_os.browser_pi_workspace_unavailable", "workspace_not_open");
      return false;
    }
    const prepared = controller.prepareAgentRun(text);
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      reportFailure("silly_os.browser_pi_submit_rejected", prepared);
      return false;
    }
    const result = await port.submit(prepared.value.run);
    if (result.kind === "submitted") return true;
    reportFailure("silly_os.browser_pi_submit_failed", result.diagnostic);
    return false;
  };

  const retryAgentWorkspaceV1 = (): void => {
    const port = agentPortRef.current;
    const currentSession = controller.getSnapshot().session;
    if (
      port === null || currentSession.route !== "workspace" || currentSession.program === null ||
      currentSession.workspace === null
    ) return;
    void queueAgentWorkspaceV1(port, {
      programId: currentSession.program.programId,
      workspaceId: currentSession.workspace.workspaceId,
    });
  };

  const agentMutationPending = agentSnapshot?.phase === "running" ||
    (agentSnapshot?.terminalRuns.length ?? 0) > 0;
  const agentWorkspaceLifecyclePending = agentSnapshot?.workspace.phase === "opening" ||
    agentSnapshot?.workspace.phase === "closing";
  const executionWorkspaceReady = !piAgentRequested ||
    (snapshot.route === "workspace" && snapshot.program !== null && snapshot.workspace !== null &&
      agentSnapshot?.workspace.phase === "open" &&
      agentSnapshot.workspace.descriptor?.programId === snapshot.program.programId &&
      agentSnapshot.workspace.descriptor.workspaceId === snapshot.workspace.workspaceId);

  return (
    <div
      className="silly-os"
      lang={locale}
      data-locale={locale}
      data-program-storage-state={durability.phase}
      data-program-storage-operation={storageOperationV1(durability)}
      data-agent-workspace-state={agentSnapshot?.workspace.phase}
    >
      {snapshot.route === "home"
        ? (
          <CreatorHomeV1
            copy={copy}
            createDisabled={durability.phase !== "ready" ||
              (piAgentRequested && piAgentSetupStatus !== "ready")}
            programCatalog={{
              status: durability.phase === "loading" && durability.operation === "catalog"
                ? "loading"
                : durability.phase === "failed" && durability.operation === "catalog"
                ? "failed"
                : "ready",
              programs: controllerSnapshot.recentPrograms,
              openDisabled: durability.phase !== "ready" ||
                (piAgentRequested && piAgentSetupStatus !== "ready"),
              onOpen: (programId) => {
                void controller.openProgram(programId).then((result) => {
                  if (result.kind !== "completed") {
                    reportFailure("silly_os.program_open_failed", result);
                  }
                });
              },
            }}
            onLocaleChange={changeLocaleV1}
            {...(piAgentRequested && piRuntime !== null
              ? {
                piAgentSetup: {
                  runtime: piRuntime,
                  status: piAgentSetupStatus,
                  onInitialize: initializePiAgentV1,
                },
              }
              : {})}
            onCreate={(intent, resourceNames) => {
              void controller.submitIntent(intent).then(async (result) => {
                if (result.kind !== "completed" || result.value.kind !== "created") {
                  reportFailure("silly_os.creator_intent_rejected", result);
                  return;
                }
                if (resourceNames.length === 0) return;
                const resourceSummary = locale === "zh-CN"
                  ? `已添加这些附件名称：${
                    resourceNames.join("、")
                  }。文件内容尚未发送给 Agent Host。`
                  : `Added these attachment names: ${
                    resourceNames.join(", ")
                  }. File contents were not sent to an Agent Host.`;
                await sendFollowUpV1(resourceSummary);
              });
            }}
          />
        )
        : (
          <ProgramWorkspaceV1
            key={snapshot.workspace?.workspaceId}
            copy={copy}
            snapshot={snapshot}
            homeDisabled={durability.phase === "saving" ||
              durability.phase === "reconciling" || agentMutationPending ||
              agentWorkspaceLifecyclePending}
            mutationPending={durability.phase === "saving" ||
              durability.phase === "reconciling" || agentMutationPending ||
              !executionWorkspaceReady}
            onHome={() => controller.openHome()}
            onLocaleChange={changeLocaleV1}
            onAccept={() => {
              const proposal = snapshot.proposal;
              if (proposal === null) {
                reportFailure("silly_os.proposal_unavailable", proposal);
                return;
              }
              void controller.acceptProposal(proposal).then((result) => {
                if (
                  result.kind !== "completed" ||
                  result.value.kind === "unavailable" || result.value.kind === "stale"
                ) {
                  reportFailure("silly_os.proposal_accept_failed", result);
                }
              });
            }}
            onReject={() => {
              const proposal = snapshot.proposal;
              if (proposal === null) {
                reportFailure("silly_os.proposal_unavailable", proposal);
                return;
              }
              void controller.rejectProposal(proposal).then((result) => {
                if (
                  result.kind !== "completed" ||
                  result.value.kind === "unavailable" || result.value.kind === "stale"
                ) {
                  reportFailure("silly_os.proposal_reject_failed", result);
                }
              });
            }}
            onSend={sendFollowUpV1}
            {...(agentSnapshot === null ? {} : {
              executionWorkspace: agentSnapshot.workspace,
              onRetryExecutionWorkspace: retryAgentWorkspaceV1,
              piAgentRun: {
                runtime: piRuntime ?? "deterministic_test",
                status: piAgentRunStatusV1(agentSnapshot.phase),
                draft: agentSnapshot.draft,
                diagnosticPath: agentSnapshot.diagnostic?.path ?? null,
                onCancel: () => {
                  const current = agentPortRef.current;
                  const activeRunId = agentSnapshot.activeRunId;
                  if (current === null || activeRunId === null) return;
                  void current.cancel(activeRunId).then((result) => {
                    if (result.kind === "unavailable") {
                      reportFailure("silly_os.browser_pi_cancel_failed", result.diagnostic);
                    }
                  });
                },
                onForget: forgetPiAgentV1,
              },
            })}
          />
        )}
      {(durability.phase === "saving" || durability.phase === "reconciling" ||
        durability.phase === "failed") && (
        <aside
          className={`program-storage-status is-${durability.phase}`}
          role={durability.phase === "failed" ? "alert" : "status"}
          aria-live="polite"
        >
          {durability.phase === "saving" || durability.phase === "reconciling"
            ? <LoaderCircle className="is-spinning" size={16} aria-hidden="true" />
            : <TriangleAlert size={16} aria-hidden="true" />}
          <span>
            {durability.phase === "saving"
              ? copy.savingProgram
              : durability.phase === "reconciling"
              ? copy.persistenceOutcomeUnknown
              : durability.code === "conflict"
              ? copy.persistenceConflict
              : copy.persistenceFailure}
          </span>
          {durability.phase === "failed" && durability.recovery !== null && (
            <button
              type="button"
              onClick={() => void controller.retry()}
            >
              <RotateCcw size={14} aria-hidden="true" />
              {copy.retry}
            </button>
          )}
        </aside>
      )}
    </div>
  );
}

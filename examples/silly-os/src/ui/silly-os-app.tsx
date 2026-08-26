// SPDX-License-Identifier: MIT
import { LoaderCircle, RotateCcw, TriangleAlert } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { BrowserPiWorkerRuntimeV1 } from "../agent/browser-pi-worker-protocol.ts";
import { getSillyOsCopyV1, resolveSillyOsCopyV1, type SillyOsLocaleV1 } from "../content/copy.ts";
import type { CreatorAgentSubmitV1 } from "../product/contracts.ts";
import type {
  CreatorControllerV1,
  CreatorDurabilityStateV1,
} from "../product/creator-controller.ts";
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
  const claimedRunIdRef = useRef<string | null>(null);
  const controllerSnapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const snapshot = controllerSnapshot.session;
  const durability = controllerSnapshot.durability;
  const copy = getSillyOsCopyV1(locale);

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
    const current = agentSnapshot;
    if (
      current?.phase !== "completed" || current.activeRunId === null ||
      current.candidate === null || claimedRunIdRef.current === current.activeRunId
    ) return;
    const operation = controller.applyProgramRevisionCandidate({
      candidate: current.candidate,
      finalAssistantReply: current.draft,
    });
    claimedRunIdRef.current = current.activeRunId;
    void operation.then((result) => {
      if (result.kind !== "completed" || result.value.kind !== "applied") {
        reportFailure("silly_os.browser_pi_candidate_rejected", result);
      }
    });
  }, [agentSnapshot, controller, reportFailure]);

  useEffect(() => {
    return () => {
      agentSetupEpochRef.current += 1;
      const current = agentPortRef.current;
      agentPortRef.current = null;
      if (current !== null) void current.dispose();
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
    agentPortRef.current = port;
    setAgentPort(port);
    claimedRunIdRef.current = null;
    if (predecessor !== null) void predecessor.dispose();
    void port.initialize().then((result) => {
      if (agentSetupEpochRef.current !== epoch || agentPortRef.current !== port) return;
      if (result.kind === "ready") {
        setPiAgentSetupStatus("ready");
        return;
      }
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.browser_pi_initialize_failed", result.diagnostic);
    });
  };

  const forgetPiAgentV1 = (): void => {
    agentSetupEpochRef.current += 1;
    const current = agentPortRef.current;
    agentPortRef.current = null;
    setAgentPort(null);
    setAgentSnapshot(null);
    claimedRunIdRef.current = null;
    setPiAgentSetupStatus(agentFactoryRef.current === null ? "loading" : "available");
    if (current !== null) void current.forget();
  };

  const sendFollowUpV1 = async (text: string): Promise<boolean> => {
    if (!piAgentRequested) {
      const result = await controller.sendFollowUp(text);
      if (result.kind === "completed" && result.value.kind === "sent") return true;
      reportFailure("silly_os.follow_up_rejected", result);
      return false;
    }
    const port = agentPortRef.current;
    const current = controller.getSnapshot().session;
    const proposal = current.proposal;
    const program = current.program;
    if (
      port === null || piAgentSetupStatus !== "ready" || proposal === null || program === null ||
      proposal.programRevision !== program.revision
    ) {
      reportFailure("silly_os.browser_pi_unavailable", "initialize_required");
      return false;
    }
    const input: CreatorAgentSubmitV1 = {
      revision: 1,
      proposalId: proposal.proposalId,
      programId: program.programId,
      baseProgramRevision: program.revision,
      text,
    };
    const result = await port.submit(input);
    if (result.kind === "submitted") return true;
    reportFailure("silly_os.browser_pi_submit_failed", result.diagnostic);
    return false;
  };

  return (
    <div
      className="silly-os"
      lang={locale}
      data-locale={locale}
      data-program-storage-state={durability.phase}
      data-program-storage-operation={storageOperationV1(durability)}
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
            mutationPending={durability.phase === "saving" || durability.phase === "reconciling"}
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
              piAgentRun: {
                runtime: piRuntime ?? "deterministic_test",
                status: piAgentRunStatusV1(agentSnapshot.phase),
                draft: agentSnapshot.draft,
                diagnosticPath: agentSnapshot.diagnostic?.path ?? null,
                onCancel: () => {
                  const current = agentPortRef.current;
                  if (current === null) return;
                  void current.cancel().then((result) => {
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

// SPDX-License-Identifier: MIT
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { getSillyOsCopyV1, resolveSillyOsCopyV1, type SillyOsLocaleV1 } from "../content/copy.ts";
import type { CreatorAgentSubmitV1 } from "../product/contracts.ts";
import { createCreatorSessionV1 } from "../product/creator-session.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";
import { CreatorHomeV1 } from "./creator-home.tsx";
import { ProgramWorkspaceV1 } from "./program-workspace.tsx";
import "./silly-os.css";

export interface SillyOsAppPropsV1 {
  readonly reportFailure: (code: string, error: unknown) => void;
}

type BrowserCreatorAgentModuleV1 = typeof import("../agent/creator-agent-port.ts");
type BrowserCreatorAgentPortV1 = ReturnType<
  BrowserCreatorAgentModuleV1["createBrowserCreatorAgentPortV1"]
>;
type BrowserCreatorAgentSnapshotV1 = ReturnType<BrowserCreatorAgentPortV1["getSnapshot"]>;
type PiTestSetupStatusV1 = "loading" | "available" | "initializing" | "ready" | "failed";

function browserPiTestRequestedV1(): boolean {
  return typeof location !== "undefined" &&
    new URLSearchParams(location.search).get("agent") === "pi-test";
}

function piTestRunStatusV1(
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

export function SillyOsAppV1({ reportFailure }: SillyOsAppPropsV1): ReactNode {
  const [session] = useState(() =>
    createCreatorSessionV1({ creator: createDeterministicFakeCreatorV1() })
  );
  const initialCopy = resolveSillyOsCopyV1();
  const [locale, setLocale] = useState<SillyOsLocaleV1>(initialCopy.locale);
  const [piTestRequested] = useState(browserPiTestRequestedV1);
  const [piTestSetupStatus, setPiTestSetupStatus] = useState<PiTestSetupStatusV1>("loading");
  const [agentPort, setAgentPort] = useState<BrowserCreatorAgentPortV1 | null>(null);
  const [agentSnapshot, setAgentSnapshot] = useState<BrowserCreatorAgentSnapshotV1 | null>(null);
  const agentFactoryRef = useRef<
    BrowserCreatorAgentModuleV1["createBrowserCreatorAgentPortV1"] | null
  >(null);
  const agentPortRef = useRef<BrowserCreatorAgentPortV1 | null>(null);
  const agentSetupEpochRef = useRef(0);
  const consumedRunIdRef = useRef<string | null>(null);
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const copy = getSillyOsCopyV1(locale);

  useEffect(() => {
    if (!piTestRequested) return undefined;
    let current = true;
    void import("../agent/creator-agent-port.ts").then(
      (module) => {
        if (!current) return;
        agentFactoryRef.current = module.createBrowserCreatorAgentPortV1;
        setPiTestSetupStatus("available");
      },
      (error: unknown) => {
        if (!current) return;
        setPiTestSetupStatus("failed");
        reportFailure("silly_os.browser_pi_adapter_unavailable", error);
      },
    );
    return () => {
      current = false;
      agentFactoryRef.current = null;
    };
  }, [piTestRequested, reportFailure]);

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
      current.candidate === null || consumedRunIdRef.current === current.activeRunId
    ) return;
    consumedRunIdRef.current = current.activeRunId;
    const result = session.applyProgramRevisionCandidate({
      candidate: current.candidate,
      finalAssistantReply: current.draft,
    });
    if (result.kind !== "applied") {
      reportFailure("silly_os.browser_pi_candidate_rejected", result);
    }
  }, [agentSnapshot, reportFailure, session]);

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

  const initializePiTestV1 = (syntheticKey: string): void => {
    const factory = agentFactoryRef.current;
    if (factory === null || syntheticKey.length === 0) {
      setPiTestSetupStatus("failed");
      reportFailure("silly_os.browser_pi_adapter_unavailable", "factory_unavailable");
      return;
    }
    const epoch = ++agentSetupEpochRef.current;
    setPiTestSetupStatus("initializing");
    let credential = syntheticKey;
    let port: BrowserCreatorAgentPortV1;
    try {
      port = factory({ apiKey: credential, runtime: "deterministic_test" });
    } catch (error) {
      credential = "";
      setPiTestSetupStatus("failed");
      reportFailure("silly_os.browser_pi_initialize_failed", error);
      return;
    }
    credential = "";
    const predecessor = agentPortRef.current;
    agentPortRef.current = port;
    setAgentPort(port);
    consumedRunIdRef.current = null;
    if (predecessor !== null) void predecessor.dispose();
    void port.initialize().then((result) => {
      if (agentSetupEpochRef.current !== epoch || agentPortRef.current !== port) return;
      if (result.kind === "ready") {
        setPiTestSetupStatus("ready");
        return;
      }
      setPiTestSetupStatus("failed");
      reportFailure("silly_os.browser_pi_initialize_failed", result.diagnostic);
    });
  };

  const forgetPiTestV1 = (): void => {
    agentSetupEpochRef.current += 1;
    const current = agentPortRef.current;
    agentPortRef.current = null;
    setAgentPort(null);
    setAgentSnapshot(null);
    consumedRunIdRef.current = null;
    setPiTestSetupStatus(agentFactoryRef.current === null ? "loading" : "available");
    if (current !== null) void current.forget();
  };

  const sendFollowUpV1 = async (text: string): Promise<boolean> => {
    if (!piTestRequested) {
      const result = session.sendFollowUp(text);
      if (result.kind === "sent") return true;
      reportFailure("silly_os.follow_up_rejected", result);
      return false;
    }
    const port = agentPortRef.current;
    const current = session.getSnapshot();
    const proposal = current.proposal;
    const program = current.program;
    if (
      port === null || piTestSetupStatus !== "ready" || proposal === null || program === null ||
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
    <div className="silly-os" lang={locale} data-locale={locale}>
      {snapshot.route === "home"
        ? (
          <CreatorHomeV1
            copy={copy}
            createDisabled={piTestRequested && piTestSetupStatus !== "ready"}
            onLocaleChange={changeLocaleV1}
            {...(piTestRequested
              ? {
                piTestSetup: {
                  status: piTestSetupStatus,
                  onInitialize: initializePiTestV1,
                },
              }
              : {})}
            onCreate={(intent, resourceNames) => {
              const result = session.submitIntent(intent);
              if (result.kind !== "created") {
                reportFailure("silly_os.creator_intent_rejected", result.reason);
                return;
              }
              if (resourceNames.length > 0) {
                const resourceSummary = locale === "zh-CN"
                  ? `已添加这些附件名称：${
                    resourceNames.join("、")
                  }。文件内容尚未发送给 Agent Host。`
                  : `Added these attachment names: ${
                    resourceNames.join(", ")
                  }. File contents were not sent to an Agent Host.`;
                void sendFollowUpV1(resourceSummary);
              }
            }}
          />
        )
        : (
          <ProgramWorkspaceV1
            key={snapshot.workspace?.workspaceId}
            copy={copy}
            snapshot={snapshot}
            onHome={() => session.openHome()}
            onLocaleChange={changeLocaleV1}
            onAccept={() => {
              const proposal = snapshot.proposal;
              if (proposal === null) {
                reportFailure("silly_os.proposal_unavailable", proposal);
                return;
              }
              const result = session.acceptProposal(proposal);
              if (result.kind === "unavailable" || result.kind === "stale") {
                reportFailure(
                  result.kind === "stale"
                    ? "silly_os.proposal_stale"
                    : "silly_os.proposal_unavailable",
                  result,
                );
              }
            }}
            onReject={() => {
              const proposal = snapshot.proposal;
              if (proposal === null) {
                reportFailure("silly_os.proposal_unavailable", proposal);
                return;
              }
              const result = session.rejectProposal(proposal);
              if (result.kind === "unavailable" || result.kind === "stale") {
                reportFailure(
                  result.kind === "stale"
                    ? "silly_os.proposal_stale"
                    : "silly_os.proposal_unavailable",
                  result,
                );
              }
            }}
            onSend={sendFollowUpV1}
            {...(agentSnapshot === null ? {} : {
              piTestRun: {
                status: piTestRunStatusV1(agentSnapshot.phase),
                draft: agentSnapshot.draft,
                onCancel: () => {
                  const current = agentPortRef.current;
                  if (current === null) return;
                  void current.cancel().then((result) => {
                    if (result.kind === "unavailable") {
                      reportFailure("silly_os.browser_pi_cancel_failed", result.diagnostic);
                    }
                  });
                },
                onForget: forgetPiTestV1,
              },
            })}
          />
        )}
    </div>
  );
}

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

import type {
  BrowserPiModelSelectionV1,
  BrowserPiProviderCatalogWireV1,
  BrowserPiWorkerRuntimeV1,
} from "../agent/browser-pi-worker-protocol.ts";
import { getSillyOsCopyV1, resolveSillyOsCopyV1, type SillyOsLocaleV1 } from "../content/copy.ts";
import type {
  CreatorControllerV1,
  CreatorDurabilityStateV1,
} from "../product/creator-controller.ts";
import type { BrowserProgramWorkspaceAuthorityV1 } from "../product/browser-program-workspace-authority.ts";
import {
  acknowledgeAppliedAgentTerminalV1,
  canConsumeAgentTerminalV1,
} from "./agent-terminal-acknowledgement.ts";
import { CreatorHomeV1 } from "./creator-home.tsx";
import { ProgramWorkspaceV1 } from "./program-workspace.tsx";
import {
  type ProviderSettingsAvailabilityV1,
  type ProviderSettingsCatalogV1,
  type ProviderSettingsProfileV1,
  type ProviderSettingsSelectionV1,
  ProviderSettingsV1,
} from "./provider-settings.tsx";
import type { WorkpieceBrowserStorageV1, WorkpieceWorkspaceExportV1 } from "./workpiece-pane.tsx";
import {
  createBrowserWorkspaceWindowStoragePortV1,
  inspectBrowserWorkspaceStorageV1,
  requestBrowserWorkspaceStoragePersistenceV1,
  type BrowserWorkspaceStorageInspectionV1,
} from "../workspace/browser-workspace-storage-policy.ts";
import "./silly-os.css";

export interface SillyOsAppPropsV1 {
  readonly controller: CreatorControllerV1;
  readonly workspaceAuthority: BrowserProgramWorkspaceAuthorityV1;
  readonly agentDrainRegistry: SillyOsAgentDrainRegistryV1;
  readonly reportFailure: (code: string, error: unknown) => void;
}

export interface SillyOsAgentDrainRegistryV1 {
  isAccepting(): boolean;
  register(drain: () => Promise<void>): () => void;
}

type BrowserCreatorAgentModuleV1 = typeof import("../agent/creator-agent-port.ts");
type BrowserCreatorAgentPortV1 = ReturnType<
  BrowserCreatorAgentModuleV1["createBrowserCreatorAgentPortV1"]
>;
type BrowserCreatorAgentSnapshotV1 = ReturnType<BrowserCreatorAgentPortV1["getSnapshot"]>;
type BrowserCreatorAgentExportInputV1 = Parameters<BrowserCreatorAgentPortV1["exportWorkspace"]>[0];
type BrowserCreatorAgentExportReadyV1 = Parameters<
  BrowserCreatorAgentExportInputV1["onReady"]
>[0];
type PiAgentSetupStatusV1 = "loading" | "available" | "initializing" | "ready" | "failed";

function requestedBrowserPiRuntimeV1(): BrowserPiWorkerRuntimeV1 {
  if (typeof location === "undefined") return "pi_provider";
  const requested = new URLSearchParams(location.search).get("agent");
  if (requested === "pi-test") return "deterministic_test";
  return "pi_provider";
}

function settingsAvailabilityV1(
  status: "qualified" | "candidate" | "unavailable",
): ProviderSettingsAvailabilityV1 {
  if (status === "qualified") return { status };
  if (status === "candidate") return { status, reason: "qualification_pending" };
  return { status, reason: "not_qualified" };
}

function projectProviderSettingsCatalogV1(
  catalog: BrowserPiProviderCatalogWireV1,
): ProviderSettingsCatalogV1 {
  return {
    phase: "ready",
    providers: catalog.providers.map((provider) => ({
      providerId: provider.id,
      name: provider.name,
      availability: settingsAvailabilityV1(provider.availability),
      models: provider.models.map((model) => ({
        providerId: provider.id,
        modelId: model.id,
        name: model.name,
        availability: settingsAvailabilityV1(model.availability),
      })),
    })),
  };
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

function projectBrowserStorageInspectionV1(
  inspection: BrowserWorkspaceStorageInspectionV1,
  current: WorkpieceBrowserStorageV1,
): WorkpieceBrowserStorageV1 {
  if (inspection.kind === "unavailable") {
    return { phase: "unavailable", persistenceRequest: "idle" };
  }
  const persistenceRequest = inspection.persisted
    ? current.phase === "available" && current.persistenceRequest === "granted"
      ? "granted" as const
      : "idle" as const
    : current.phase === "available" &&
        (current.persistenceRequest === "denied" || current.persistenceRequest === "unavailable")
    ? current.persistenceRequest
    : "idle" as const;
  return {
    phase: "available",
    persisted: inspection.persisted,
    persistenceRequest,
    ...(inspection.usageBytes === undefined ? {} : { usageBytes: inspection.usageBytes }),
    ...(inspection.quotaBytes === undefined ? {} : { quotaBytes: inspection.quotaBytes }),
    ...(inspection.remainingBytes === undefined
      ? {}
      : { remainingBytes: inspection.remainingBytes }),
  };
}

function workspaceArchiveFileNameV1(programName: string): string {
  const slug = programName.replaceAll(/[^\p{Letter}\p{Number}]+/gu, "-").replaceAll(
    /^-+|-+$/gu,
    "",
  ).toLowerCase();
  return `${slug.length === 0 ? "sillyos-program" : slug}.sillyos.zip`;
}

const workspaceDownloadHandoffMillisecondsV1 = 1_000;

/** Clicks a Host-owned blob URL and retains its OPFS backing through browser handoff. */
async function startWorkspaceDownloadV1(
  ready: BrowserCreatorAgentExportReadyV1,
  programName: string,
  commitRelease: () => boolean,
  onCommitted: () => void,
): Promise<"release" | "cancel"> {
  const link = document.createElement("a");
  link.href = ready.downloadUrl;
  link.download = workspaceArchiveFileNameV1(programName);
  link.rel = "noopener";
  link.hidden = true;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
  }
  if (!commitRelease()) return "cancel";
  onCommitted();
  await new Promise<void>((resolve) => {
    setTimeout(resolve, workspaceDownloadHandoffMillisecondsV1);
  });
  return "release";
}

export function SillyOsAppV1({
  controller,
  workspaceAuthority,
  agentDrainRegistry,
  reportFailure,
}: SillyOsAppPropsV1): ReactNode {
  const initialCopy = resolveSillyOsCopyV1();
  const [locale, setLocale] = useState<SillyOsLocaleV1>(initialCopy.locale);
  const [piRuntime] = useState(requestedBrowserPiRuntimeV1);
  const internalPiTest = piRuntime === "deterministic_test";
  const [piAgentSetupStatus, setPiAgentSetupStatus] = useState<PiAgentSetupStatusV1>("loading");
  const [activeProviderSelection, setActiveProviderSelection] = useState<
    BrowserPiModelSelectionV1 | null
  >(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providerCatalog, setProviderCatalog] = useState<ProviderSettingsCatalogV1>({
    phase: "loading",
  });
  const [agentPort, setAgentPort] = useState<BrowserCreatorAgentPortV1 | null>(null);
  const [agentSnapshot, setAgentSnapshot] = useState<BrowserCreatorAgentSnapshotV1 | null>(null);
  const [browserStoragePort] = useState(() =>
    typeof window === "undefined" ? null : createBrowserWorkspaceWindowStoragePortV1(window)
  );
  const [browserStorage, setBrowserStorage] = useState<WorkpieceBrowserStorageV1>({
    phase: "checking",
    persistenceRequest: "idle",
  });
  const [workspaceExport, setWorkspaceExport] = useState<WorkpieceWorkspaceExportV1>({
    phase: "idle",
  });
  const agentFactoryRef = useRef<
    BrowserCreatorAgentModuleV1["createBrowserCreatorAgentPortV1"] | null
  >(null);
  const agentPortRef = useRef<BrowserCreatorAgentPortV1 | null>(null);
  const agentSetupEpochRef = useRef(0);
  const providerCatalogEpochRef = useRef(0);
  const settingsReturnViewRef = useRef<"home" | "workspace">("home");
  const agentSetupSettlementRef = useRef<Promise<void>>(Promise.resolve());
  const agentTeardownRef = useRef<Promise<void>>(Promise.resolve());
  const agentWorkspaceLifecycleRef = useRef<Promise<void>>(Promise.resolve());
  const agentTerminalSettlementRef = useRef<Promise<void>>(Promise.resolve());
  const browserStorageOperationEpochRef = useRef(0);
  const browserStorageRequestPendingRef = useRef(false);
  const workspaceExportEpochRef = useRef(0);
  const workspaceExportAbortRef = useRef<AbortController | null>(null);
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
  const executionWorkspaceSessionId = agentSnapshot?.workspace.descriptor?.workspaceSessionId ??
    null;
  const executionWorkspaceGeneration = agentSnapshot?.workspace.descriptor?.generation ?? null;

  const queueAgentPortTeardownV1 = useCallback((
    port: BrowserCreatorAgentPortV1,
    finalPhase: "forgotten" | "disposed",
  ): Promise<void> => {
    const precedingTeardown = agentTeardownRef.current;
    const workspaceSettlement = agentWorkspaceLifecycleRef.current;
    const terminalSettlement = agentTerminalSettlementRef.current;
    const teardown = Promise.all([
      precedingTeardown.catch(() => undefined),
      workspaceSettlement.catch(() => undefined),
      terminalSettlement.catch(() => undefined),
    ]).then(() => finalPhase === "forgotten" ? port.forget() : port.dispose()).catch(
      () => undefined,
    );
    agentTeardownRef.current = teardown;
    return teardown;
  }, []);

  const drainAgentGraphV1 = useCallback(async (): Promise<void> => {
    agentSetupEpochRef.current += 1;
    providerCatalogEpochRef.current += 1;
    browserStorageOperationEpochRef.current += 1;
    workspaceExportEpochRef.current += 1;
    workspaceExportAbortRef.current?.abort();
    workspaceExportAbortRef.current = null;
    claimedTerminalRunIdsRef.current.clear();
    const current = agentPortRef.current;
    agentPortRef.current = null;
    if (current !== null) void queueAgentPortTeardownV1(current, "disposed");
    await Promise.all([
      agentSetupSettlementRef.current.catch(() => undefined),
      agentWorkspaceLifecycleRef.current.catch(() => undefined),
      agentTerminalSettlementRef.current.catch(() => undefined),
      agentTeardownRef.current.catch(() => undefined),
    ]);
    await agentTeardownRef.current.catch(() => undefined);
  }, [queueAgentPortTeardownV1]);

  useEffect(() => {
    void controller.initialize();
  }, [controller]);

  useEffect(() => {
    if (!agentDrainRegistry.isAccepting()) return undefined;
    let current = true;
    void import("../agent/creator-agent-port.ts").then(
      (module) => {
        if (!current || !agentDrainRegistry.isAccepting()) return;
        agentFactoryRef.current = module.createBrowserCreatorAgentPortV1;
        setPiAgentSetupStatus("available");
      },
      (error: unknown) => {
        if (!current || !agentDrainRegistry.isAccepting()) return;
        setPiAgentSetupStatus("failed");
        reportFailure("silly_os.browser_pi_adapter_unavailable", error);
      },
    );
    return () => {
      current = false;
      agentFactoryRef.current = null;
    };
  }, [agentDrainRegistry, reportFailure]);

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
    if (browserStorageRequestPendingRef.current) return undefined;
    const epoch = ++browserStorageOperationEpochRef.current;
    if (browserStoragePort === null) {
      setBrowserStorage({ phase: "unavailable", persistenceRequest: "idle" });
      return undefined;
    }
    void inspectBrowserWorkspaceStorageV1(browserStoragePort).then((inspection) => {
      if (browserStorageOperationEpochRef.current !== epoch) return;
      setBrowserStorage((current) => {
        const projected = projectBrowserStorageInspectionV1(inspection, current);
        return projected.phase === "available" && !projected.persisted &&
            browserStoragePort.persist === undefined
          ? { ...projected, persistenceRequest: "unavailable" }
          : projected;
      });
    });
    return () => {
      if (browserStorageOperationEpochRef.current === epoch) {
        browserStorageOperationEpochRef.current += 1;
      }
    };
  }, [
    browserStoragePort,
    executionWorkspaceGeneration,
    executionWorkspaceSessionId,
  ]);

  useEffect(() => {
    workspaceExportEpochRef.current += 1;
    workspaceExportAbortRef.current?.abort();
    workspaceExportAbortRef.current = null;
    setWorkspaceExport({ phase: "idle" });
  }, [executionWorkspaceSessionId, routedProgramId, routedWorkspaceId]);

  useEffect(() => {
    const port = agentPortRef.current;
    const terminal = agentSnapshot?.terminalRuns[0];
    if (
      port === null || terminal === undefined || !canConsumeAgentTerminalV1(durability.phase) ||
      claimedTerminalRunIdsRef.current.has(terminal.run.agentRunId)
    ) return;
    claimedTerminalRunIdsRef.current.add(terminal.run.agentRunId);
    const settlement = (async (): Promise<void> => {
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
    agentTerminalSettlementRef.current = settlement;
  }, [agentSnapshot, controller, durability.phase, reportFailure]);

  const queueAgentWorkspaceV1 = useCallback((
    port: BrowserCreatorAgentPortV1,
    desired: { readonly programId: string; readonly workspaceId: string } | null,
  ): Promise<boolean> => {
    const operation = agentWorkspaceLifecycleRef.current.then(async () => {
      if (!agentDrainRegistry.isAccepting() || agentPortRef.current !== port) {
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
      if (!agentDrainRegistry.isAccepting() || agentPortRef.current !== port) {
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
  }, [agentDrainRegistry, reportFailure]);

  useEffect(() => {
    const port = agentPortRef.current;
    if (
      port === null || piAgentSetupStatus !== "ready" || !agentDrainRegistry.isAccepting()
    ) return;
    const desired = routedProgramId !== null && routedWorkspaceId !== null
      ? { programId: routedProgramId, workspaceId: routedWorkspaceId }
      : null;
    void queueAgentWorkspaceV1(port, desired);
  }, [
    agentPort,
    agentDrainRegistry,
    piAgentSetupStatus,
    queueAgentWorkspaceV1,
    routedProgramId,
    routedWorkspaceId,
  ]);

  useEffect(() => {
    return agentDrainRegistry.register(drainAgentGraphV1);
  }, [agentDrainRegistry, drainAgentGraphV1]);

  const changeLocaleV1 = (next: SillyOsLocaleV1): void => {
    setLocale(next);
    const url = new URL(location.href);
    url.searchParams.set("locale", next);
    history.replaceState(history.state, "", url);
  };

  const loadProviderCatalogV1 = (): void => {
    const epoch = ++providerCatalogEpochRef.current;
    setProviderCatalog({ phase: "loading" });
    void import("../agent/browser-pi-catalog-port.ts").then(
      ({ queryBrowserPiProviderCatalogV1 }) => queryBrowserPiProviderCatalogV1(),
    ).then((result) => {
      if (providerCatalogEpochRef.current !== epoch || !agentDrainRegistry.isAccepting()) return;
      if (result.kind === "ready") {
        setProviderCatalog(projectProviderSettingsCatalogV1(result.catalog));
        return;
      }
      setProviderCatalog({ phase: "failed", diagnosticCode: result.code });
      reportFailure("silly_os.browser_pi_catalog_unavailable", result.code);
    }, (error: unknown) => {
      if (providerCatalogEpochRef.current !== epoch || !agentDrainRegistry.isAccepting()) return;
      setProviderCatalog({ phase: "failed", diagnosticCode: "worker_failed" });
      reportFailure("silly_os.browser_pi_catalog_unavailable", error);
    });
  };

  const openSettingsV1 = (): void => {
    settingsReturnViewRef.current = snapshot.route;
    setSettingsOpen(true);
    if (providerCatalog.phase === "loading") loadProviderCatalogV1();
  };

  const closeSettingsV1 = (): void => {
    setSettingsOpen(false);
    const returnView = settingsReturnViewRef.current;
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-open-settings="${returnView}"]`)?.focus();
    });
  };

  const initializePiAgentV1 = (
    selection: BrowserPiModelSelectionV1 | null,
    suppliedCredential: string,
  ): void => {
    const factory = agentFactoryRef.current;
    setActiveProviderSelection(piRuntime === "pi_provider" ? selection : null);
    if (
      !agentDrainRegistry.isAccepting() || factory === null || suppliedCredential.length === 0 ||
      (piRuntime === "pi_provider" && selection === null)
    ) {
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.browser_pi_adapter_unavailable", "factory_unavailable");
      return;
    }
    const epoch = ++agentSetupEpochRef.current;
    setPiAgentSetupStatus("initializing");
    let credential = suppliedCredential;
    let port: BrowserCreatorAgentPortV1;
    try {
      port = piRuntime === "deterministic_test"
        ? factory({
          apiKey: credential,
          runtime: "deterministic_test",
          workspaceAuthority,
        })
        : factory({
          apiKey: credential,
          runtime: "pi_provider",
          selection: selection as BrowserPiModelSelectionV1,
          workspaceAuthority,
        });
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
      void queueAgentPortTeardownV1(predecessor, "disposed");
    }
    const setup = (async (): Promise<void> => {
      await agentTeardownRef.current;
      if (agentSetupEpochRef.current !== epoch || !agentDrainRegistry.isAccepting()) {
        await port.forget().catch(() => undefined);
        return;
      }
      agentPortRef.current = port;
      setAgentPort(port);
      const result = await port.initialize();
      if (
        agentSetupEpochRef.current !== epoch || agentPortRef.current !== port ||
        !agentDrainRegistry.isAccepting()
      ) return;
      if (result.kind === "ready") {
        setPiAgentSetupStatus("ready");
        return;
      }
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.browser_pi_initialize_failed", result.diagnostic);
    })();
    agentSetupSettlementRef.current = setup;
  };

  const forgetPiAgentV1 = (): void => {
    agentSetupEpochRef.current += 1;
    workspaceExportEpochRef.current += 1;
    workspaceExportAbortRef.current?.abort();
    workspaceExportAbortRef.current = null;
    setWorkspaceExport({ phase: "idle" });
    const current = agentPortRef.current;
    agentPortRef.current = null;
    setAgentPort(null);
    setAgentSnapshot(null);
    setActiveProviderSelection(null);
    claimedTerminalRunIdsRef.current.clear();
    setPiAgentSetupStatus(agentFactoryRef.current === null ? "loading" : "available");
    if (current !== null) {
      void queueAgentPortTeardownV1(current, "forgotten");
    }
  };

  const openHomeV1 = async (): Promise<void> => {
    const port = agentPortRef.current;
    if (port !== null && !await queueAgentWorkspaceV1(port, null)) {
      reportFailure("silly_os.home_close_failed", "agent_workspace_close_failed");
      return;
    }
    if (!await controller.openHome()) {
      reportFailure("silly_os.home_close_failed", "workspace_authority_close_failed");
    }
  };

  const sendFollowUpV1 = async (text: string): Promise<boolean> => {
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

  const requestStoragePersistenceV1 = (): void => {
    const workspace = agentPortRef.current?.getSnapshot().workspace;
    if (
      browserStoragePort === null || workspace?.phase !== "open" ||
      (workspace.descriptor?.generation ?? 0) <= 1 || browserStorage.phase !== "available" ||
      browserStorage.persisted || browserStorage.persistenceRequest !== "idle" ||
      browserStorageRequestPendingRef.current
    ) return;
    const epoch = ++browserStorageOperationEpochRef.current;
    browserStorageRequestPendingRef.current = true;
    setBrowserStorage({ ...browserStorage, persistenceRequest: "requesting" });
    void requestBrowserWorkspaceStoragePersistenceV1(browserStoragePort).then((result) => {
      if (browserStorageOperationEpochRef.current !== epoch) return;
      browserStorageRequestPendingRef.current = false;
      setBrowserStorage((current) => {
        if (current.phase !== "available") return current;
        if (result.kind === "unavailable") {
          return { ...current, persistenceRequest: "unavailable" };
        }
        return result.persisted
          ? { ...current, persisted: true, persistenceRequest: "granted" }
          : { ...current, persisted: false, persistenceRequest: "denied" };
      });
    });
  };

  const exportWorkspaceV1 = (): void => {
    const port = agentPortRef.current;
    const currentSession = controller.getSnapshot().session;
    const currentAgent = port?.getSnapshot();
    const descriptor = currentAgent?.workspace.descriptor;
    if (
      port === null || workspaceExportAbortRef.current !== null ||
      piAgentSetupStatus !== "ready" || durability.phase !== "ready" ||
      currentSession.route !== "workspace" || currentSession.program === null ||
      currentSession.workspace === null || currentAgent?.phase === "running" ||
      (currentAgent?.terminalRuns.length ?? 0) !== 0 ||
      currentAgent?.workspace.phase !== "open" || descriptor === null || descriptor === undefined ||
      descriptor.programId !== currentSession.program.programId ||
      descriptor.workspaceId !== currentSession.workspace.workspaceId
    ) return;

    const epoch = ++workspaceExportEpochRef.current;
    const abortController = new AbortController();
    workspaceExportAbortRef.current = abortController;
    setWorkspaceExport({
      phase: "exporting",
      filesCompleted: 0,
      filesTotal: 0,
      bytesWritten: 0,
      bytesTotal: 0,
    });
    const programName = currentSession.program.name;
    void port.exportWorkspace({
      workspaceSessionId: descriptor.workspaceSessionId,
      signal: abortController.signal,
      onProgress: (progress) => {
        if (
          workspaceExportEpochRef.current !== epoch || abortController.signal.aborted
        ) return;
        setWorkspaceExport({ phase: "exporting", ...progress });
      },
      onReady: (ready, commitRelease) => {
        if (
          workspaceExportEpochRef.current !== epoch || abortController.signal.aborted
        ) return "cancel";
        return startWorkspaceDownloadV1(
          ready,
          programName,
          commitRelease,
          () => {
            if (workspaceExportEpochRef.current !== epoch) return;
            setWorkspaceExport({
              phase: "finalizing",
              filesCompleted: ready.filesCompleted,
              filesTotal: ready.filesTotal,
              bytesWritten: ready.bytesWritten,
              bytesTotal: ready.bytesTotal,
            });
          },
        );
      },
    }).then((result) => {
      if (workspaceExportEpochRef.current !== epoch) return;
      if (result.kind === "released") {
        setWorkspaceExport({
          phase: "download-started",
          filesCompleted: result.filesCompleted,
          filesTotal: result.filesTotal,
          bytesWritten: result.bytesWritten,
          bytesTotal: result.bytesTotal,
        });
        return;
      }
      if (result.kind === "cancelled") {
        setWorkspaceExport({
          phase: "cancelled",
          filesCompleted: result.filesCompleted,
          filesTotal: result.filesTotal,
          bytesWritten: result.bytesWritten,
          bytesTotal: result.bytesTotal,
        });
        return;
      }
      setWorkspaceExport({
        phase: "failed",
        diagnosticCode: result.diagnostic.code,
      });
      reportFailure("silly_os.browser_workspace_export_failed", result.diagnostic);
    }, (error: unknown) => {
      if (workspaceExportEpochRef.current !== epoch) return;
      setWorkspaceExport({ phase: "failed", diagnosticCode: "request_failed" });
      reportFailure("silly_os.browser_workspace_export_failed", error);
    }).finally(() => {
      if (
        workspaceExportEpochRef.current === epoch &&
        workspaceExportAbortRef.current === abortController
      ) workspaceExportAbortRef.current = null;
    });
  };

  const cancelWorkspaceExportV1 = (): void => {
    const abortController = workspaceExportAbortRef.current;
    if (abortController === null) return;
    setWorkspaceExport((current) =>
      current.phase === "exporting" ? { ...current, phase: "cancelling" } : current
    );
    abortController.abort();
  };

  const agentMutationPending = agentSnapshot?.phase === "running" ||
    (agentSnapshot?.terminalRuns.length ?? 0) > 0;
  const agentWorkspaceLifecyclePending = agentSnapshot?.workspace.phase === "opening" ||
    agentSnapshot?.workspace.phase === "closing";
  const executionWorkspaceReady = snapshot.route === "workspace" && snapshot.program !== null &&
    snapshot.workspace !== null && agentSnapshot?.workspace.phase === "open" &&
    agentSnapshot.workspace.descriptor?.programId === snapshot.program.programId &&
    agentSnapshot.workspace.descriptor.workspaceId === snapshot.workspace.workspaceId;
  const workspaceExportPending = workspaceExport.phase === "exporting" ||
    workspaceExport.phase === "cancelling" || workspaceExport.phase === "finalizing";
  const workspaceExportAvailable = agentPort !== null &&
    executionWorkspaceReady && executionWorkspaceSessionId !== null;
  const workspaceExportDisabled = durability.phase !== "ready" || agentMutationPending ||
    agentWorkspaceLifecyclePending || !executionWorkspaceReady || workspaceExportPending;
  const providerSettingsProfile: ProviderSettingsProfileV1 = activeProviderSelection === null ||
      internalPiTest
    ? { phase: "disconnected", active: null }
    : piAgentSetupStatus === "initializing"
    ? { phase: "initializing", active: activeProviderSelection }
    : piAgentSetupStatus === "ready"
    ? { phase: "ready", active: activeProviderSelection }
    : piAgentSetupStatus === "failed"
    ? {
      phase: "failed",
      active: activeProviderSelection,
      diagnosticCode: agentSnapshot?.diagnostic?.code ?? "initialization_failed",
    }
    : { phase: "disconnected", active: null };

  return (
    <div
      className="silly-os"
      lang={locale}
      data-locale={locale}
      data-program-storage-state={durability.phase}
      data-program-storage-operation={storageOperationV1(durability)}
      data-agent-workspace-state={agentSnapshot?.workspace.phase}
      data-browser-storage-state={browserStorage.phase}
      data-browser-storage-persisted={browserStorage.phase === "available"
        ? String(browserStorage.persisted)
        : undefined}
      data-browser-storage-persistence-request={browserStorage.persistenceRequest}
      data-workspace-export-state={workspaceExport.phase}
    >
      {settingsOpen && !internalPiTest
        ? (
          <ProviderSettingsV1
            copy={copy}
            catalog={providerCatalog}
            profile={providerSettingsProfile}
            onBack={closeSettingsV1}
            onLocaleChange={changeLocaleV1}
            onRetryCatalog={loadProviderCatalogV1}
            onInitialize={(selection: ProviderSettingsSelectionV1, credential: string) => {
              initializePiAgentV1(selection, credential);
            }}
            onForget={forgetPiAgentV1}
          />
        )
        : snapshot.route === "home"
        ? (
          <CreatorHomeV1
            copy={copy}
            createDisabled={durability.phase !== "ready" || piAgentSetupStatus !== "ready"}
            programCatalog={{
              status: durability.phase === "loading" && durability.operation === "catalog"
                ? "loading"
                : durability.phase === "failed" && durability.operation === "catalog"
                ? "failed"
                : "ready",
              programs: controllerSnapshot.recentPrograms,
              openDisabled: durability.phase !== "ready" || piAgentSetupStatus !== "ready",
              onOpen: (programId) => {
                void controller.openProgram(programId).then((result) => {
                  if (result.kind !== "completed") {
                    reportFailure("silly_os.program_open_failed", result);
                  }
                });
              },
            }}
            onLocaleChange={changeLocaleV1}
            {...(internalPiTest
              ? {
                piAgentSetup: {
                  runtime: "deterministic_test" as const,
                  status: piAgentSetupStatus,
                  onInitialize: (credential: string) => initializePiAgentV1(null, credential),
                },
              }
              : {})}
            {...(internalPiTest ? {} : {
              onOpenSettings: openSettingsV1,
              providerSetup: {
                status: piAgentSetupStatus,
                onOpenSettings: openSettingsV1,
              },
            })}
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
            workspaceReview={controllerSnapshot.workspaceReview}
            homeDisabled={durability.phase === "saving" || agentMutationPending ||
              agentWorkspaceLifecyclePending || workspaceExportPending}
            mutationPending={durability.phase === "saving" || agentMutationPending ||
              !executionWorkspaceReady || workspaceExportPending}
            onHome={() => void openHomeV1()}
            onLocaleChange={changeLocaleV1}
            {...(internalPiTest ? {} : { onOpenSettings: openSettingsV1 })}
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
              browserStorage,
              onRetryExecutionWorkspace: retryAgentWorkspaceV1,
              onRequestStoragePersistence: requestStoragePersistenceV1,
              ...(workspaceExportAvailable
                ? {
                  workspaceExport,
                  workspaceExportDisabled,
                  onExportWorkspace: exportWorkspaceV1,
                  onCancelWorkspaceExport: cancelWorkspaceExportV1,
                }
                : {}),
              piAgentRun: {
                runtime: piRuntime,
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
      {(durability.phase === "saving" || durability.phase === "failed") && (
        <aside
          className={`program-storage-status is-${durability.phase}`}
          role={durability.phase === "failed" ? "alert" : "status"}
          aria-live="polite"
        >
          {durability.phase === "saving"
            ? <LoaderCircle className="is-spinning" size={16} aria-hidden="true" />
            : <TriangleAlert size={16} aria-hidden="true" />}
          <span>
            {durability.phase === "saving"
              ? copy.savingProgram
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

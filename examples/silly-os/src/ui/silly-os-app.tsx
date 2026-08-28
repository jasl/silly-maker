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
  BrowserPiCustomModelApiV1,
  BrowserPiModelSelectionV1,
  BrowserPiWorkerRuntimeV1,
} from "../agent/browser-pi-worker-protocol.ts";
import { getSillyOsCopyV1, resolveSillyOsCopyV1, type SillyOsLocaleV1 } from "../content/copy.ts";
import type {
  CreatorControllerV1,
  CreatorDurabilityStateV1,
} from "../product/creator-controller.ts";
import type { BrowserProgramWorkspaceAuthorityV1 } from "../product/browser-program-workspace-authority.ts";
import {
  browserProviderSettingsRevisionV2,
  createBrowserProviderSettingsRepositoryV1,
  type BrowserProviderBuiltinModelRefV1,
  type BrowserProviderPreferredModelRefV1,
  type BrowserProviderSettingsRepositoryV1,
  type BrowserProviderSettingsSnapshotV1,
} from "../product/browser-provider-settings-repository.ts";
import {
  acknowledgeAppliedAgentTerminalV1,
  canConsumeAgentTerminalV1,
} from "./agent-terminal-acknowledgement.ts";
import { CreatorHomeV1 } from "./creator-home.tsx";
import { ProgramWorkspaceV1 } from "./program-workspace.tsx";
import {
  type ProviderSettingsCatalogV1,
  type ProviderSettingsCustomProfileDraftV1,
  type ProviderSettingsCustomProfileV1,
  type ProviderSettingsProfileV1,
  type ProviderSettingsSelectionV1,
  ProviderSettingsV1,
} from "./provider-settings.tsx";
import { projectProviderSettingsCatalogV1 } from "./provider-settings-catalog.ts";
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
type PiAgentSetupStatusV1 =
  | "loading"
  | "available"
  | "saving"
  | "credential_saved"
  | "testing"
  | "ready"
  | "test_failed"
  | "failed";
type SettingsReturnTargetV1 = "home" | "home-models" | "workspace" | "workspace-models";

function agentWorkerHoldsCredentialV1(status: PiAgentSetupStatusV1): boolean {
  switch (status) {
    case "credential_saved":
    case "testing":
    case "ready":
    case "test_failed":
      return true;
    case "loading":
    case "available":
    case "saving":
    case "failed":
      return false;
  }
  const exhaustive: never = status;
  return exhaustive;
}

export function providerApiKeyWarningRequiredV1(status: PiAgentSetupStatusV1): boolean {
  return !agentWorkerHoldsCredentialV1(status);
}

function agentRuntimeUsableV1(
  runtime: BrowserPiWorkerRuntimeV1,
  status: PiAgentSetupStatusV1,
): boolean {
  return runtime === "deterministic_test"
    ? status === "ready"
    : agentWorkerHoldsCredentialV1(status);
}

function requestedBrowserPiRuntimeV1(): BrowserPiWorkerRuntimeV1 {
  if (typeof location === "undefined") return "pi_provider";
  const requested = new URLSearchParams(location.search).get("agent");
  if (requested === "pi-test") return "deterministic_test";
  return "pi_provider";
}

function createProviderSettingsRepositoryV1(): BrowserProviderSettingsRepositoryV1 | null {
  if (typeof window === "undefined") return null;
  try {
    return createBrowserProviderSettingsRepositoryV1({ storage: window.localStorage });
  } catch {
    return null;
  }
}

interface CreatorProviderModelChoiceV1 {
  readonly value: string;
  readonly modelName: string;
  readonly providerName: string;
  readonly selection: BrowserPiModelSelectionV1;
  readonly preference: BrowserProviderPreferredModelRefV1;
}

function browserPiCustomModelApiV1(value: string): BrowserPiCustomModelApiV1 | null {
  switch (value) {
    case "openai-completions":
    case "openai-responses":
    case "anthropic-messages":
    case "google-generative-ai":
      return value;
    default:
      return null;
  }
}

function builtinModelRefKeyV1(value: BrowserProviderBuiltinModelRefV1): string {
  return JSON.stringify(["builtin", value.providerId, value.modelId]);
}

function customModelRefKeyV1(profileId: string): string {
  return JSON.stringify(["custom", profileId]);
}

function sameProviderSelectionV1(
  left: BrowserPiModelSelectionV1 | null,
  right: BrowserPiModelSelectionV1 | null,
): boolean {
  if (left === null || right === null || left.kind !== right.kind) return left === right;
  return left.kind === "builtin" && right.kind === "builtin"
    ? left.providerId === right.providerId && left.modelId === right.modelId &&
      left.api === right.api && left.baseUrl === right.baseUrl
    : left.kind === "custom" && right.kind === "custom" &&
      left.profile.profileId === right.profile.profileId &&
      left.profile.api === right.profile.api && left.profile.baseUrl === right.profile.baseUrl &&
      left.profile.modelId === right.profile.modelId;
}

/** Built-ins share one credential scope only on the same Provider endpoint. */
export function selectionsShareCredentialScopeV1(
  active: BrowserPiModelSelectionV1,
  candidate: BrowserPiModelSelectionV1,
): boolean {
  if (active.kind === "builtin" && candidate.kind === "builtin") {
    return active.providerId === candidate.providerId && active.baseUrl === candidate.baseUrl;
  }
  return sameProviderSelectionV1(active, candidate);
}

function providerPreferenceFromSelectionV1(
  selection: BrowserPiModelSelectionV1,
): BrowserProviderPreferredModelRefV1 {
  return selection.kind === "builtin"
    ? {
      kind: "builtin",
      providerId: selection.providerId,
      modelId: selection.modelId,
    }
    : { kind: "custom", profileId: selection.profile.profileId };
}

function creatorProviderModelChoicesV1(
  catalog: ProviderSettingsCatalogV1,
  customProfiles: readonly ProviderSettingsCustomProfileV1[],
  enabledBuiltinModels: readonly BrowserProviderBuiltinModelRefV1[],
): readonly CreatorProviderModelChoiceV1[] {
  const enabled = new Set(enabledBuiltinModels.map(builtinModelRefKeyV1));
  const builtinChoices = catalog.phase === "ready"
    ? catalog.providers.flatMap((provider) =>
      provider.models.flatMap((model): readonly CreatorProviderModelChoiceV1[] => {
        const api = browserPiCustomModelApiV1(model.api);
        const preference: BrowserProviderPreferredModelRefV1 = {
          kind: "builtin",
          providerId: provider.providerId,
          modelId: model.modelId,
        };
        if (
          model.availability.status !== "available" || api === null ||
          !enabled.has(builtinModelRefKeyV1(preference))
        ) return [];
        return [{
          value: builtinModelRefKeyV1(preference),
          modelName: model.name,
          providerName: provider.name,
          selection: {
            kind: "builtin",
            providerId: provider.providerId,
            modelId: model.modelId,
            api,
            baseUrl: model.baseUrl,
          },
          preference,
        }];
      })
    )
    : [];
  const customChoices = customProfiles.map((profile): CreatorProviderModelChoiceV1 => ({
    value: customModelRefKeyV1(profile.profileId),
    modelName: profile.modelId,
    providerName: profile.displayName,
    selection: { kind: "custom", profile },
    preference: { kind: "custom", profileId: profile.profileId },
  }));
  return [...builtinChoices, ...customChoices];
}

function preferredModelValueV1(
  preferred: BrowserProviderPreferredModelRefV1 | null,
  choices: readonly CreatorProviderModelChoiceV1[],
): string | null {
  if (preferred === null) return null;
  const key = preferred.kind === "builtin"
    ? builtinModelRefKeyV1(preferred)
    : customModelRefKeyV1(preferred.profileId);
  return choices.some((choice) => choice.value === key) ? key : null;
}

function emptyProviderSettingsSnapshotV1(): BrowserProviderSettingsSnapshotV1 {
  return Object.freeze({
    revision: browserProviderSettingsRevisionV2,
    customProfiles: Object.freeze([]),
    enabledBuiltinModels: Object.freeze([]),
    preferredModel: null,
  });
}

function piAgentRunStatusV1(
  phase: BrowserCreatorAgentSnapshotV1["phase"],
): "connecting" | "ready" | "running" | "completed" | "failed" | "disposed" {
  switch (phase) {
    case "uninitialized":
    case "configuring":
    case "configured":
    case "testing":
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
  const [providerModelSelectionPending, setProviderModelSelectionPending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providerCatalog, setProviderCatalog] = useState<ProviderSettingsCatalogV1>({
    phase: "loading",
  });
  const [providerSettingsRepository] = useState(createProviderSettingsRepositoryV1);
  const [providerSettingsSnapshot, setProviderSettingsSnapshot] = useState<
    BrowserProviderSettingsSnapshotV1
  >(() => {
    if (providerSettingsRepository === null) return emptyProviderSettingsSnapshotV1();
    try {
      return providerSettingsRepository.read();
    } catch (error) {
      reportFailure("silly_os.provider_settings_load_failed", error);
      return emptyProviderSettingsSnapshotV1();
    }
  });
  const customProviderProfiles = providerSettingsSnapshot.customProfiles;
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
  const providerModelSelectionEpochRef = useRef(0);
  const providerModelSelectionPendingRef = useRef(false);
  const providerModelSelectionSettlementRef = useRef<Promise<void>>(Promise.resolve());
  const providerCatalogEpochRef = useRef(0);
  const settingsReturnTargetRef = useRef<SettingsReturnTargetV1>("home");
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
    const modelSelectionSettlement = providerModelSelectionSettlementRef.current;
    const workspaceSettlement = agentWorkspaceLifecycleRef.current;
    const terminalSettlement = agentTerminalSettlementRef.current;
    const teardown = Promise.all([
      precedingTeardown.catch(() => undefined),
      modelSelectionSettlement.catch(() => undefined),
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
    providerModelSelectionEpochRef.current += 1;
    providerModelSelectionPendingRef.current = false;
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
      providerModelSelectionSettlementRef.current.catch(() => undefined),
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
      port === null || !agentRuntimeUsableV1(piRuntime, piAgentSetupStatus) ||
      !agentDrainRegistry.isAccepting()
    ) return;
    const desired = routedProgramId !== null && routedWorkspaceId !== null
      ? { programId: routedProgramId, workspaceId: routedWorkspaceId }
      : null;
    void queueAgentWorkspaceV1(port, desired);
  }, [
    agentPort,
    agentDrainRegistry,
    piAgentSetupStatus,
    piRuntime,
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

  const loadProviderCatalogV1 = useCallback((): void => {
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
  }, [agentDrainRegistry, reportFailure]);

  useEffect(() => {
    if (!internalPiTest) loadProviderCatalogV1();
  }, [internalPiTest, loadProviderCatalogV1]);

  useEffect(() => {
    if (providerCatalog.phase !== "ready" || providerSettingsRepository === null) return;
    const availableBuiltinModelKeys = new Set(
      providerCatalog.providers.flatMap((provider) =>
        provider.models
          .filter((model) => model.availability.status === "available")
          .map((model) =>
            builtinModelRefKeyV1({ providerId: provider.providerId, modelId: model.modelId })
          )
      ),
    );
    const missing = providerSettingsSnapshot.enabledBuiltinModels.filter((model) =>
      !availableBuiltinModelKeys.has(builtinModelRefKeyV1(model))
    );
    const preferred = providerSettingsSnapshot.preferredModel;
    const preferredMissing = preferred?.kind === "builtin" &&
      !availableBuiltinModelKeys.has(builtinModelRefKeyV1(preferred));
    if (missing.length === 0 && !preferredMissing) return;
    try {
      for (const model of missing) {
        providerSettingsRepository.setBuiltinModelEnabled(model, false);
      }
      if (preferredMissing) providerSettingsRepository.setPreferredModel(null);
      setProviderSettingsSnapshot(providerSettingsRepository.read());
    } catch (error) {
      reportFailure("silly_os.provider_settings_save_failed", error);
    }
  }, [
    providerCatalog,
    providerSettingsRepository,
    providerSettingsSnapshot.enabledBuiltinModels,
    providerSettingsSnapshot.preferredModel,
    reportFailure,
  ]);

  const openSettingsV1 = (): void => {
    settingsReturnTargetRef.current = snapshot.route;
    setSettingsOpen(true);
    if (providerCatalog.phase === "loading") loadProviderCatalogV1();
  };

  const openModelSettingsV1 = (surface: "home" | "workspace"): void => {
    settingsReturnTargetRef.current = `${surface}-models`;
    setSettingsOpen(true);
    if (providerCatalog.phase === "loading") loadProviderCatalogV1();
  };

  const closeSettingsV1 = (): void => {
    setSettingsOpen(false);
    const returnTarget = settingsReturnTargetRef.current;
    const returnSelector = returnTarget === "home-models" || returnTarget === "workspace-models"
      ? `[data-model-picker-surface="${
        returnTarget === "home-models" ? "home" : "workspace"
      }"] [role="combobox"]`
      : `[data-open-settings="${returnTarget}"]`;
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(returnSelector)?.focus();
    });
  };

  const persistProviderPreferenceV1 = (selection: BrowserPiModelSelectionV1): void => {
    if (providerSettingsRepository === null) return;
    try {
      providerSettingsRepository.setPreferredModel(providerPreferenceFromSelectionV1(selection));
      setProviderSettingsSnapshot(providerSettingsRepository.read());
    } catch (error) {
      reportFailure("silly_os.provider_settings_save_failed", error);
    }
  };

  const selectProviderModelChoiceV1 = (choice: CreatorProviderModelChoiceV1): void => {
    const port = agentPortRef.current;
    if (
      port === null || activeProviderSelection === null ||
      providerModelSelectionPendingRef.current || !agentDrainRegistry.isAccepting()
    ) return;
    if (sameProviderSelectionV1(activeProviderSelection, choice.selection)) {
      persistProviderPreferenceV1(choice.selection);
      return;
    }

    const setupEpoch = agentSetupEpochRef.current;
    const selectionEpoch = ++providerModelSelectionEpochRef.current;
    providerModelSelectionPendingRef.current = true;
    setProviderModelSelectionPending(true);
    const selection = (async (): Promise<void> => {
      try {
        const result = await port.selectModel(choice.selection);
        if (
          providerModelSelectionEpochRef.current !== selectionEpoch ||
          agentSetupEpochRef.current !== setupEpoch || agentPortRef.current !== port ||
          !agentDrainRegistry.isAccepting()
        ) return;
        if (result.kind !== "selected") {
          reportFailure("silly_os.browser_pi_model_select_failed", result.diagnostic);
          return;
        }
        persistProviderPreferenceV1(choice.selection);
        setActiveProviderSelection(choice.selection);
      } catch (error) {
        if (
          providerModelSelectionEpochRef.current === selectionEpoch &&
          agentSetupEpochRef.current === setupEpoch && agentPortRef.current === port &&
          agentDrainRegistry.isAccepting()
        ) reportFailure("silly_os.browser_pi_model_select_failed", error);
      } finally {
        if (providerModelSelectionEpochRef.current === selectionEpoch) {
          providerModelSelectionPendingRef.current = false;
          setProviderModelSelectionPending(false);
        }
      }
    })();
    providerModelSelectionSettlementRef.current = selection;
  };

  const savePiAgentCredentialV1 = (
    selection: BrowserPiModelSelectionV1 | null,
    suppliedCredential: string,
    testAfterSave = false,
  ): void => {
    providerModelSelectionEpochRef.current += 1;
    providerModelSelectionPendingRef.current = false;
    setProviderModelSelectionPending(false);
    const factory = agentFactoryRef.current;
    if (selection !== null) persistProviderPreferenceV1(selection);
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
    setPiAgentSetupStatus("saving");
    let credential = suppliedCredential;
    let port!: BrowserCreatorAgentPortV1;
    const onConnectionLost = (): void => {
      if (
        agentSetupEpochRef.current !== epoch || agentPortRef.current !== port ||
        !agentDrainRegistry.isAccepting()
      ) return;
      agentSetupEpochRef.current += 1;
      providerModelSelectionEpochRef.current += 1;
      providerModelSelectionPendingRef.current = false;
      setProviderModelSelectionPending(false);
      workspaceExportEpochRef.current += 1;
      workspaceExportAbortRef.current?.abort();
      workspaceExportAbortRef.current = null;
      setWorkspaceExport({ phase: "idle" });
      agentPortRef.current = null;
      setAgentPort(null);
      setAgentSnapshot(null);
      claimedTerminalRunIdsRef.current.clear();
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.browser_pi_connection_lost", {
        code: "connection_failed",
      });
      void queueAgentPortTeardownV1(port, "disposed");
    };
    try {
      port = piRuntime === "deterministic_test"
        ? factory({
          onConnectionLost,
          runtime: "deterministic_test",
          workspaceAuthority,
        })
        : factory({
          onConnectionLost,
          runtime: "pi_provider",
          selection: selection as BrowserPiModelSelectionV1,
          workspaceAuthority,
        });
    } catch (error) {
      credential = "";
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.browser_pi_configure_failed", error);
      return;
    }
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
      const configuration = port.configureCredential(credential);
      credential = "";
      const configured = await configuration;
      if (
        agentSetupEpochRef.current !== epoch || agentPortRef.current !== port ||
        !agentDrainRegistry.isAccepting()
      ) return;
      if (configured.kind !== "configured") {
        setPiAgentSetupStatus("failed");
        reportFailure("silly_os.browser_pi_configure_failed", configured.diagnostic);
        return;
      }
      setPiAgentSetupStatus("credential_saved");
      if (!testAfterSave) return;
      setPiAgentSetupStatus("testing");
      const tested = await port.testConnection();
      if (
        agentSetupEpochRef.current !== epoch || agentPortRef.current !== port ||
        !agentDrainRegistry.isAccepting()
      ) return;
      if (tested.kind === "ready") {
        setPiAgentSetupStatus("ready");
        return;
      }
      setPiAgentSetupStatus("test_failed");
      reportFailure("silly_os.browser_pi_connection_test_failed", tested.diagnostic);
    })();
    agentSetupSettlementRef.current = setup;
  };

  const testPiAgentConnectionV1 = (): void => {
    const port = agentPortRef.current;
    if (
      port === null || !agentDrainRegistry.isAccepting() ||
      (piAgentSetupStatus !== "credential_saved" && piAgentSetupStatus !== "ready" &&
        piAgentSetupStatus !== "test_failed")
    ) {
      reportFailure("silly_os.browser_pi_connection_test_failed", "credential_not_saved");
      return;
    }
    const epoch = agentSetupEpochRef.current;
    setPiAgentSetupStatus("testing");
    const test = (async (): Promise<void> => {
      const result = await port.testConnection();
      if (
        agentSetupEpochRef.current !== epoch || agentPortRef.current !== port ||
        !agentDrainRegistry.isAccepting()
      ) return;
      if (result.kind === "ready") {
        setPiAgentSetupStatus("ready");
        return;
      }
      setPiAgentSetupStatus("test_failed");
      reportFailure("silly_os.browser_pi_connection_test_failed", result.diagnostic);
    })();
    agentSetupSettlementRef.current = test;
  };

  const forgetPiAgentV1 = (): void => {
    agentSetupEpochRef.current += 1;
    providerModelSelectionEpochRef.current += 1;
    providerModelSelectionPendingRef.current = false;
    setProviderModelSelectionPending(false);
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

  const setBuiltinModelEnabledV1 = (
    model: BrowserProviderBuiltinModelRefV1,
    enabled: boolean,
  ): void => {
    if (providerSettingsRepository === null) {
      reportFailure("silly_os.provider_settings_save_failed", "storage_unavailable");
      return;
    }
    try {
      providerSettingsRepository.setBuiltinModelEnabled(model, enabled);
      const nextSnapshot = providerSettingsRepository.read();
      setProviderSettingsSnapshot(nextSnapshot);
      if (
        !enabled && activeProviderSelection?.kind === "builtin" &&
        activeProviderSelection.providerId === model.providerId &&
        activeProviderSelection.modelId === model.modelId
      ) {
        const nextChoice = creatorProviderModelChoicesV1(
          providerCatalog,
          nextSnapshot.customProfiles,
          nextSnapshot.enabledBuiltinModels,
        ).find((choice) =>
          selectionsShareCredentialScopeV1(activeProviderSelection, choice.selection)
        );
        if (nextChoice !== undefined) selectProviderModelChoiceV1(nextChoice);
      }
    } catch (error) {
      reportFailure("silly_os.provider_settings_save_failed", error);
    }
  };

  const createCustomProviderProfileV1 = (
    draft: ProviderSettingsCustomProfileDraftV1,
  ): ProviderSettingsCustomProfileV1 | null => {
    if (providerSettingsRepository === null) {
      reportFailure("silly_os.provider_settings_save_failed", "storage_unavailable");
      return null;
    }
    try {
      const created = providerSettingsRepository.add({
        profileId: `custom.${crypto.randomUUID()}`,
        displayName: draft.displayName,
        api: draft.api,
        baseUrl: draft.baseUrl,
        modelId: draft.modelId,
        contextWindow: draft.contextWindow,
        maxTokens: draft.maxTokens,
      });
      setProviderSettingsSnapshot(providerSettingsRepository.read());
      return created;
    } catch (error) {
      reportFailure("silly_os.provider_settings_save_failed", error);
      return null;
    }
  };

  const removeCustomProviderProfileV1 = (profileId: string): void => {
    if (providerSettingsRepository === null) return;
    try {
      if (
        activeProviderSelection?.kind === "custom" &&
        activeProviderSelection.profile.profileId === profileId
      ) forgetPiAgentV1();
      providerSettingsRepository.remove(profileId);
      setProviderSettingsSnapshot(providerSettingsRepository.read());
    } catch (error) {
      reportFailure("silly_os.provider_settings_remove_failed", error);
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
    if (port === null || !agentRuntimeUsableV1(piRuntime, piAgentSetupStatus)) {
      reportFailure("silly_os.browser_pi_unavailable", "credential_required");
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
      !agentRuntimeUsableV1(piRuntime, piAgentSetupStatus) || durability.phase !== "ready" ||
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
    : piAgentSetupStatus === "saving"
    ? { phase: "saving", active: activeProviderSelection }
    : piAgentSetupStatus === "credential_saved"
    ? { phase: "credential_saved", active: activeProviderSelection }
    : piAgentSetupStatus === "testing"
    ? { phase: "testing", active: activeProviderSelection }
    : piAgentSetupStatus === "ready"
    ? { phase: "ready", active: activeProviderSelection }
    : piAgentSetupStatus === "test_failed"
    ? { phase: "test_failed", active: activeProviderSelection }
    : piAgentSetupStatus === "failed"
    ? {
      phase: "failed",
      active: activeProviderSelection,
      diagnosticCode: agentSnapshot?.diagnostic?.code ?? "worker_unavailable",
    }
    : { phase: "disconnected", active: null };
  const creatorProviderModelChoices = creatorProviderModelChoicesV1(
    providerCatalog,
    customProviderProfiles,
    providerSettingsSnapshot.enabledBuiltinModels,
  );
  const credentialBoundProviderModelChoices = activeProviderSelection !== null &&
      agentWorkerHoldsCredentialV1(piAgentSetupStatus)
    ? creatorProviderModelChoices.filter((choice) =>
      selectionsShareCredentialScopeV1(activeProviderSelection, choice.selection)
    )
    : [];
  const creatorProviderModelValue = preferredModelValueV1(
    providerSettingsSnapshot.preferredModel,
    credentialBoundProviderModelChoices,
  );
  const preferredProviderChoice = credentialBoundProviderModelChoices.find(
    ({ value }) => value === creatorProviderModelValue,
  ) ?? null;
  const preferredProviderIsActive = preferredProviderChoice !== null &&
    sameProviderSelectionV1(activeProviderSelection, preferredProviderChoice.selection);
  const creatorProviderModelStatus = providerModelSelectionPending
    ? "initializing" as const
    : preferredProviderIsActive && agentWorkerHoldsCredentialV1(piAgentSetupStatus)
    ? "ready" as const
    : "required" as const;

  const selectCreatorProviderModelV1 = (value: string): void => {
    const choice = credentialBoundProviderModelChoices.find((candidate) =>
      candidate.value === value
    );
    if (choice !== undefined) selectProviderModelChoiceV1(choice);
  };
  const creatorProviderModelV1 = (surface: "home" | "workspace") => ({
    status: creatorProviderModelStatus,
    selectedValue: creatorProviderModelValue,
    options: credentialBoundProviderModelChoices.map((choice) => ({
      value: choice.value,
      modelName: choice.modelName,
      providerName: choice.providerName,
    })),
    onSelect: selectCreatorProviderModelV1,
    onOpenSettings: () => openModelSettingsV1(surface),
  } as const);

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
            customProfiles={customProviderProfiles}
            profile={providerSettingsProfile}
            preferredBuiltinModel={providerSettingsSnapshot.preferredModel?.kind === "builtin"
              ? providerSettingsSnapshot.preferredModel
              : null}
            onBack={closeSettingsV1}
            onLocaleChange={changeLocaleV1}
            onRetryCatalog={loadProviderCatalogV1}
            enabledBuiltinModels={providerSettingsSnapshot.enabledBuiltinModels}
            onSetBuiltinModelEnabled={setBuiltinModelEnabledV1}
            onSaveCredential={(selection: ProviderSettingsSelectionV1, credential: string) => {
              savePiAgentCredentialV1(selection, credential);
            }}
            onTestConnection={testPiAgentConnectionV1}
            onCreateCustomProfile={createCustomProviderProfileV1}
            onRemoveCustomProfile={removeCustomProviderProfileV1}
            onForget={forgetPiAgentV1}
          />
        )
        : snapshot.route === "home"
        ? (
          <CreatorHomeV1
            copy={copy}
            createDisabled={durability.phase !== "ready" ||
              !agentRuntimeUsableV1(piRuntime, piAgentSetupStatus) ||
              (!internalPiTest && creatorProviderModelStatus !== "ready")}
            programCatalog={{
              status: durability.phase === "loading" && durability.operation === "catalog"
                ? "loading"
                : durability.phase === "failed" && durability.operation === "catalog"
                ? "failed"
                : "ready",
              programs: controllerSnapshot.recentPrograms,
              openDisabled: durability.phase !== "ready" ||
                !agentRuntimeUsableV1(piRuntime, piAgentSetupStatus),
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
                  status: piAgentSetupStatus === "saving" ||
                      piAgentSetupStatus === "credential_saved" ||
                      piAgentSetupStatus === "testing"
                    ? "initializing" as const
                    : piAgentSetupStatus === "test_failed"
                    ? "failed" as const
                    : piAgentSetupStatus,
                  onInitialize: (credential: string) =>
                    savePiAgentCredentialV1(null, credential, true),
                },
              }
              : {})}
            {...(internalPiTest ? {} : {
              onOpenSettings: openSettingsV1,
              providerModel: creatorProviderModelV1("home"),
              ...(providerApiKeyWarningRequiredV1(piAgentSetupStatus)
                ? {
                  providerSetup: {
                    status: piAgentSetupStatus,
                    onOpenSettings: openSettingsV1,
                  },
                }
                : {}),
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
            {...(internalPiTest ? {} : { providerModel: creatorProviderModelV1("workspace") })}
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

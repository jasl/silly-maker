// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type {
  BrowserProgramAgentControlPortV1,
  BrowserProgramAgentControlSnapshotV1,
  BrowserProgramAgentHostV1,
} from "../agent/browser-program-agent-host-contracts.ts";
import type {
  BrowserPiCustomModelApiV1,
  BrowserPiModelSelectionV1,
  BrowserPiReasoningEffortV1,
  BrowserPiWorkerRuntimeV1,
} from "../agent/browser-pi-worker-protocol.ts";
import {
  browserAgentPreferencesRevisionV1,
  createBrowserAgentPreferencesRepositoryV1,
  defaultBrowserAgentReasoningEffortV1,
  type BrowserAgentPreferencesRepositoryV1,
  type BrowserAgentPreferencesSnapshotV1,
} from "../application/preferences/browser-agent-preferences-repository.ts";
import { recommendedBrowserProviderBuiltinModelRefsV1 } from "../application/preferences/browser-provider-model-recommendations.ts";
import {
  browserProviderSettingsRevisionV3,
  createBrowserProviderSettingsRepositoryV1,
  type BrowserProviderBuiltinModelRefV1,
  type BrowserProviderLastSuccessfulModelRefV1,
  type BrowserProviderSettingsRepositoryV1,
  type BrowserProviderSettingsSnapshotV1,
} from "../application/preferences/browser-provider-settings-repository.ts";
import {
  isProgramModelManualSelectionCurrentV1,
  type ProgramModelManualSelectionV1,
  resolveProgramModelDefaultV1,
} from "../application/preferences/program-model-default.ts";
import type { BrowserProgramWorkspaceAuthorityV1 } from "../application/workspace/browser-program-workspace-authority.ts";
import {
  createBrowserDataResetCoordinatorV1,
  runBrowserDataResetOperationV1,
  subscribeBrowserDataResetRemoteV1,
  type BrowserDataResetCoordinatorV1,
} from "../application/data-reset/browser-data-reset-coordinator.ts";
import {
  credentialVaultBindingsEqualV2,
  type CredentialVaultBindingV2,
  type CredentialVaultListV2,
} from "../credential/credential-vault-contracts.ts";
import {
  credentialVaultBindingForConnectionV2,
  credentialVaultBindingForSelectionV2,
  type CredentialVaultConnectionIdentityV2,
} from "../credential/provider-credential-binding.ts";
import { activeAgentUsesAnyCredentialBindingV1 } from "../credential/provider-credential-currentness.ts";
import type {
  ProgramSurfaceActiveModelV1,
  ProgramSurfaceAgentReadinessV1,
  ProgramSurfaceModelControlV1,
} from "../program-platform/ui/program-runtime-surface.ts";
import type { ProgramPackageServiceV1 } from "../program-platform/installation/program-package-service.ts";
import {
  credentialVaultCanHandoffProviderCredentialV1,
  credentialVaultHasProviderCredentialV1,
  projectAgentReadinessV1,
  projectCredentialVaultStatusV1,
} from "./agent-readiness.ts";
import {
  type ProviderSettingsCatalogV1,
  type ProviderSettingsClearAllV1,
  type ProviderSettingsConnectionTestV1,
  type ProviderSettingsCredentialOperationV1,
  type ProviderSettingsCredentialReceiptV1,
  type ProviderSettingsCustomProfileDraftV1,
  type ProviderSettingsCustomProfileV1,
  type ProviderSettingsPropsV1,
  type ProviderSettingsSectionV1,
  type ProviderSettingsSelectionV1,
  type ProviderSettingsStorageEstimateV1,
  type ProviderSettingsStorageUsageV1,
  type ProviderSettingsVaultOperationV1,
  type ProviderSettingsVaultV1,
} from "./provider-settings.tsx";
import { projectProviderSettingsCatalogV1 } from "./provider-settings-catalog.ts";

type BrowserCredentialVaultModuleV1 =
  typeof import("../credential/browser-credential-vault-port.ts");
type BrowserCredentialVaultPortV1 = ReturnType<
  BrowserCredentialVaultModuleV1["createBrowserCredentialVaultPortV2"]
>;

type ProgramAgentSetupStatusV1 =
  | "loading"
  | "saving"
  | "ready"
  | "failed";

interface ProgramProviderModelChoiceV1 {
  readonly value: string;
  readonly modelId: string;
  readonly modelName: string;
  readonly providerName: string;
  readonly contextWindow: number;
  readonly maxTokens: number;
  readonly supportedReasoningEfforts: readonly BrowserPiReasoningEffortV1[];
  readonly defaultReasoningEffort: BrowserPiReasoningEffortV1;
  readonly selection: BrowserPiModelSelectionV1;
  readonly modelRef: BrowserProviderLastSuccessfulModelRefV1;
}

function requestedBrowserPiRuntimeV1(): BrowserPiWorkerRuntimeV1 {
  if (typeof location === "undefined") return "pi_provider";
  return new URLSearchParams(location.search).get("agent") === "pi-test"
    ? "deterministic_test"
    : "pi_provider";
}

function createProviderSettingsRepositoryV1(): BrowserProviderSettingsRepositoryV1 | null {
  if (typeof window === "undefined") return null;
  try {
    return createBrowserProviderSettingsRepositoryV1({ storage: window.localStorage });
  } catch {
    return null;
  }
}

function createAgentPreferencesRepositoryV1(): BrowserAgentPreferencesRepositoryV1 | null {
  if (typeof window === "undefined") return null;
  try {
    return createBrowserAgentPreferencesRepositoryV1({ storage: window.localStorage });
  } catch {
    return null;
  }
}

function createDataResetCoordinatorV1(): BrowserDataResetCoordinatorV1 | null {
  if (typeof window === "undefined") return null;
  try {
    return createBrowserDataResetCoordinatorV1({
      storage: window.localStorage,
      eventTarget: window,
    });
  } catch {
    return null;
  }
}

function emptyProviderSettingsSnapshotV1(): BrowserProviderSettingsSnapshotV1 {
  return Object.freeze({
    revision: browserProviderSettingsRevisionV3,
    customProfiles: Object.freeze([]),
    enabledBuiltinModels: Object.freeze([]),
    lastSuccessfulModel: null,
  });
}

function defaultAgentPreferencesSnapshotV1(): BrowserAgentPreferencesSnapshotV1 {
  return Object.freeze({
    revision: browserAgentPreferencesRevisionV1,
    preferredReasoningEffort: defaultBrowserAgentReasoningEffortV1,
  });
}

function initializeProviderSettingsV1(): {
  readonly repository: BrowserProviderSettingsRepositoryV1 | null;
  readonly snapshot: BrowserProviderSettingsSnapshotV1;
  readonly failure?: unknown;
} {
  const repository = createProviderSettingsRepositoryV1();
  if (repository === null) return { repository, snapshot: emptyProviderSettingsSnapshotV1() };
  try {
    return { repository, snapshot: repository.read() };
  } catch (failure) {
    return { repository, snapshot: emptyProviderSettingsSnapshotV1(), failure };
  }
}

function initializeAgentPreferencesV1(): {
  readonly repository: BrowserAgentPreferencesRepositoryV1 | null;
  readonly snapshot: BrowserAgentPreferencesSnapshotV1;
  readonly failure?: unknown;
} {
  const repository = createAgentPreferencesRepositoryV1();
  if (repository === null) return { repository, snapshot: defaultAgentPreferencesSnapshotV1() };
  try {
    return { repository, snapshot: repository.read() };
  } catch (failure) {
    return { repository, snapshot: defaultAgentPreferencesSnapshotV1(), failure };
  }
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

export function selectionsShareCredentialScopeV1(
  active: BrowserPiModelSelectionV1,
  candidate: BrowserPiModelSelectionV1,
): boolean {
  if (active.kind === "builtin" && candidate.kind === "builtin") {
    return active.providerId === candidate.providerId && active.baseUrl === candidate.baseUrl;
  }
  return sameProviderSelectionV1(active, candidate);
}

function modelRefFromSelectionV1(
  selection: BrowserPiModelSelectionV1,
): BrowserProviderLastSuccessfulModelRefV1 {
  return selection.kind === "builtin"
    ? { kind: "builtin", providerId: selection.providerId, modelId: selection.modelId }
    : { kind: "custom", profileId: selection.profile.profileId };
}

function programProviderModelChoicesV1(
  catalog: ProviderSettingsCatalogV1,
  customProfiles: readonly ProviderSettingsCustomProfileV1[],
  enabledBuiltinModels: readonly BrowserProviderBuiltinModelRefV1[],
): readonly ProgramProviderModelChoiceV1[] {
  const enabled = new Set(enabledBuiltinModels.map(builtinModelRefKeyV1));
  const builtinChoices = catalog.phase === "ready"
    ? catalog.providers.flatMap((provider) =>
      provider.models.flatMap((model): readonly ProgramProviderModelChoiceV1[] => {
        const api = browserPiCustomModelApiV1(model.api);
        const modelRef: BrowserProviderLastSuccessfulModelRefV1 = {
          kind: "builtin",
          providerId: provider.providerId,
          modelId: model.modelId,
        };
        if (
          model.availability.status !== "available" || api === null ||
          !enabled.has(builtinModelRefKeyV1(modelRef))
        ) return [];
        return [{
          value: builtinModelRefKeyV1(modelRef),
          modelId: model.modelId,
          modelName: model.name,
          providerName: provider.name,
          contextWindow: model.contextWindow,
          maxTokens: model.maxTokens,
          supportedReasoningEfforts: model.supportedReasoningEfforts,
          defaultReasoningEffort: model.defaultReasoningEffort,
          selection: {
            kind: "builtin",
            providerId: provider.providerId,
            modelId: model.modelId,
            api,
            baseUrl: model.baseUrl,
          },
          modelRef,
        }];
      })
    )
    : [];
  return [
    ...builtinChoices,
    ...customProfiles.map((profile): ProgramProviderModelChoiceV1 => ({
      value: customModelRefKeyV1(profile.profileId),
      modelId: profile.modelId,
      modelName: profile.modelId,
      providerName: profile.displayName,
      contextWindow: profile.contextWindow,
      maxTokens: profile.maxTokens,
      supportedReasoningEfforts: Object.freeze(["off"]),
      defaultReasoningEffort: "off",
      selection: { kind: "custom", profile },
      modelRef: { kind: "custom", profileId: profile.profileId },
    })),
  ];
}

function providerSettingsVaultFromListV1(snapshot: CredentialVaultListV2): ProviderSettingsVaultV1 {
  return Object.freeze({
    phase: snapshot.state,
    protection: snapshot.protection,
    state: snapshot.state,
    bindings: snapshot.bindings,
  });
}

function credentialVaultDiagnosticCodeV1(error: unknown): string {
  if (error !== null && typeof error === "object" && "code" in error) {
    const code = (error as { readonly code?: unknown }).code;
    if (typeof code === "string" && code.length > 0) return code;
  }
  return "operation_failed";
}

function providerSettingsVaultBusyV1(
  operation: ProviderSettingsVaultOperationV1,
  current: ProviderSettingsVaultV1,
): ProviderSettingsVaultV1 {
  return Object.freeze({
    phase: "busy",
    operation,
    protection: current.protection,
    state: current.state,
    bindings: current.bindings,
  });
}

function providerSettingsVaultFailedV1(
  operation: ProviderSettingsVaultOperationV1,
  current: ProviderSettingsVaultV1,
  error: unknown,
): ProviderSettingsVaultV1 {
  return Object.freeze({
    phase: "failed",
    operation,
    diagnosticCode: credentialVaultDiagnosticCodeV1(error),
    protection: current.protection,
    state: current.state,
    bindings: current.bindings,
  });
}

function admittedStorageByteCountV1(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function controlStorageEstimateV1(value: StorageEstimate): ProviderSettingsStorageEstimateV1 {
  const usageBytes = admittedStorageByteCountV1(value.usage);
  const quotaBytes = admittedStorageByteCountV1(value.quota);
  return {
    phase: "available",
    ...(usageBytes === undefined ? {} : { usageBytes }),
    ...(quotaBytes === undefined ? {} : { quotaBytes }),
  };
}

const credentialSaveReceiptMillisecondsV1 = 2_400;
const resolvedVoidPromiseV1 = Promise.resolve();
const noRecommendedModelPatternsV1: readonly string[] = [];

export interface ProgramAgentProviderOwnerV1 {
  readonly runtime: BrowserPiWorkerRuntimeV1;
  readonly agentHost: BrowserProgramAgentHostV1 | null;
  readonly forgetAgent: () => Promise<boolean>;
  readonly controlSnapshot: BrowserProgramAgentControlSnapshotV1 | null;
  readonly readiness: ProgramSurfaceAgentReadinessV1;
  readonly activeModel: ProgramSurfaceActiveModelV1 | null;
  readonly providerModel: (surface: "home" | "workspace") => ProgramSurfaceModelControlV1;
  readonly settingsOpen: boolean;
  readonly settingsInitialSection: ProviderSettingsSectionV1;
  readonly openSettings: (input?: {
    readonly section?: ProviderSettingsSectionV1;
    readonly returnSurface?: "home" | "workspace";
    readonly returnTarget?: "surface_settings" | "model_selector";
  }) => void;
  readonly closeSettings: () => void;
  readonly settingsProps: Omit<
    ProviderSettingsPropsV1,
    "copy" | "onBack" | "onLocaleChange" | "theme" | "onThemeChange"
  >;
}

interface ProgramAgentDrainRegistryV1 {
  isAccepting(): boolean;
  register(drain: () => Promise<void>): () => void;
}

interface ProgramAgentHostRetirementOwnerV1 {
  track(settlement: Promise<void>): Promise<void>;
  drain(): Promise<void>;
}

export function createProgramAgentHostRetirementOwnerV1(): ProgramAgentHostRetirementOwnerV1 {
  const settlements = new Set<Promise<void>>();
  return {
    track(settlement) {
      const tracked = settlement.catch(() => undefined);
      settlements.add(tracked);
      void tracked.then(() => settlements.delete(tracked));
      return tracked;
    },
    async drain() {
      while (settlements.size > 0) await Promise.all([...settlements]);
    },
  };
}

export function useProgramAgentProviderOwnerV1(input: {
  readonly workspaceAuthority: BrowserProgramWorkspaceAuthorityV1;
  readonly programPackages: ProgramPackageServiceV1;
  readonly programModelSelectionContext: {
    readonly scopeKey: string;
    readonly recommendedModelPatterns: readonly string[];
  } | null;
  readonly agentDrainRegistry: ProgramAgentDrainRegistryV1;
  readonly resetProductPreferences: () => void;
  readonly reportFailure: (code: string, error: unknown) => void;
}): ProgramAgentProviderOwnerV1 {
  const {
    agentDrainRegistry,
    programModelSelectionContext,
    programPackages,
    reportFailure,
    resetProductPreferences,
    workspaceAuthority,
  } = input;
  const modelSelectionScopeKey = programModelSelectionContext?.scopeKey ?? "sillyos.default";
  const recommendedModelPatterns = programModelSelectionContext?.recommendedModelPatterns ??
    noRecommendedModelPatternsV1;
  const [runtime] = useState(requestedBrowserPiRuntimeV1);
  const deterministicAgent = runtime === "deterministic_test";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<ProviderSettingsSectionV1>(
    "general",
  );
  const settingsReturnSurfaceRef = useRef<"home" | "workspace">("home");
  const settingsReturnTargetRef = useRef<"surface_settings" | "model_selector">(
    "surface_settings",
  );
  const [providerCatalog, setProviderCatalog] = useState<ProviderSettingsCatalogV1>({
    phase: deterministicAgent ? "ready" : "loading",
    ...(deterministicAgent ? { providers: Object.freeze([]) } : {}),
  } as ProviderSettingsCatalogV1);
  const [providerSettingsInitialization] = useState(initializeProviderSettingsV1);
  const providerSettingsRepository = providerSettingsInitialization.repository;
  const [agentPreferencesInitialization] = useState(initializeAgentPreferencesV1);
  const agentPreferencesRepository = agentPreferencesInitialization.repository;
  const [providerSettingsSnapshot, setProviderSettingsSnapshot] = useState(
    providerSettingsInitialization.snapshot,
  );
  const [agentPreferencesSnapshot, setAgentPreferencesSnapshot] = useState(
    agentPreferencesInitialization.snapshot,
  );
  const [dataResetCoordinator] = useState(createDataResetCoordinatorV1);
  const [credentialVault, setCredentialVault] = useState<ProviderSettingsVaultV1>({
    phase: deterministicAgent ? "unlocked" : "unavailable",
    ...(deterministicAgent ? { protection: "device", state: "unlocked" } : {
      diagnosticCode: "initializing",
      protection: null,
      state: null,
    }),
    bindings: Object.freeze([]),
  } as ProviderSettingsVaultV1);
  const [credentialOperation, setCredentialOperation] = useState<
    ProviderSettingsCredentialOperationV1
  >({ phase: "idle", target: null });
  const [credentialReceipt, setCredentialReceipt] = useState<
    ProviderSettingsCredentialReceiptV1 | null
  >(null);
  const [connectionTest, setConnectionTest] = useState<ProviderSettingsConnectionTestV1>({
    phase: "disconnected",
    active: null,
  });
  const [storageUsage, setStorageUsage] = useState<ProviderSettingsStorageUsageV1>({
    control: { phase: "checking" },
    workspace: { phase: "checking" },
  });
  const [clearAll, setClearAll] = useState<ProviderSettingsClearAllV1>({ phase: "idle" });
  const [setupStatus, setSetupStatus] = useState<ProgramAgentSetupStatusV1>("loading");
  const failedModelTargetKeyRef = useRef<string | null>(null);
  const [activeSelection, setActiveSelection] = useState<BrowserPiModelSelectionV1 | null>(null);
  const [manualSelection, setManualSelection] = useState<ProgramModelManualSelectionV1 | null>(
    null,
  );
  const [effectiveReasoningEffort, setEffectiveReasoningEffort] = useState<
    BrowserPiReasoningEffortV1 | null
  >(null);
  const [modelSelectionPending, setModelSelectionPending] = useState(false);
  const [reasoningSelectionPending, setReasoningSelectionPending] = useState(false);
  const [agentHost, setAgentHost] = useState<BrowserProgramAgentHostV1 | null>(null);
  const [deterministicHostGeneration, setDeterministicHostGeneration] = useState(0);
  const [providerHostGeneration, setProviderHostGeneration] = useState(0);
  const [controlPort, setControlPort] = useState<BrowserProgramAgentControlPortV1 | null>(null);
  const [controlSnapshot, setControlSnapshot] = useState<
    BrowserProgramAgentControlSnapshotV1 | null
  >(null);

  const vaultPortRef = useRef<BrowserCredentialVaultPortV1 | null>(null);
  const vaultRef = useRef(credentialVault);
  const vaultEpochRef = useRef(0);
  const vaultOperationEpochRef = useRef(0);
  const vaultSettlementRef = useRef<Promise<void>>(resolvedVoidPromiseV1);
  const hostRef = useRef<BrowserProgramAgentHostV1 | null>(null);
  const hostFailureTargetKeyRef = useRef<string | null>(null);
  const agentForgetSettlementRef = useRef<Promise<boolean> | null>(null);
  const controlPortRef = useRef<BrowserProgramAgentControlPortV1 | null>(null);
  const activeSelectionRef = useRef<BrowserPiModelSelectionV1 | null>(null);
  const setupEpochRef = useRef(0);
  const setupPendingRef = useRef(false);
  const setupSettlementRef = useRef<Promise<void>>(resolvedVoidPromiseV1);
  const modelEpochRef = useRef(0);
  const modelSettlementRef = useRef<Promise<void>>(resolvedVoidPromiseV1);
  const reasoningEpochRef = useRef(0);
  const reasoningSettlementRef = useRef<Promise<void>>(resolvedVoidPromiseV1);
  const connectionTestEpochRef = useRef(0);
  const providerCatalogEpochRef = useRef(0);
  const storageUsageEpochRef = useRef(0);
  const [hostRetirementOwner] = useState(createProgramAgentHostRetirementOwnerV1);
  const clearAllPendingRef = useRef(false);
  const resetRemoteRef = useRef<() => void>(() => undefined);
  const reportFailureRef = useRef(reportFailure);

  useLayoutEffect(() => {
    vaultRef.current = credentialVault;
    activeSelectionRef.current = activeSelection;
    reportFailureRef.current = reportFailure;
  }, [activeSelection, credentialVault, reportFailure]);

  useEffect(() => {
    const receipt = credentialReceipt;
    if (receipt === null) return undefined;
    const timeout = setTimeout(() => {
      setCredentialReceipt((current) => current === receipt ? null : current);
    }, credentialSaveReceiptMillisecondsV1);
    return () => clearTimeout(timeout);
  }, [credentialReceipt]);

  useEffect(() => {
    if (controlPort === null) {
      setControlSnapshot(null);
      return undefined;
    }
    const update = (): void => setControlSnapshot(controlPort.getSnapshot());
    update();
    return controlPort.subscribe(update);
  }, [controlPort]);

  useEffect(() => {
    if (!("failure" in providerSettingsInitialization)) return;
    reportFailure("silly_os.provider_settings_load_failed", providerSettingsInitialization.failure);
  }, [providerSettingsInitialization, reportFailure]);
  useEffect(() => {
    if (!("failure" in agentPreferencesInitialization)) return;
    reportFailure("silly_os.agent_preferences_load_failed", agentPreferencesInitialization.failure);
  }, [agentPreferencesInitialization, reportFailure]);

  const retireHostV1 = useCallback((phase: "forgotten" | "disposed"): Promise<void> => {
    setupEpochRef.current += 1;
    setupPendingRef.current = false;
    modelEpochRef.current += 1;
    reasoningEpochRef.current += 1;
    connectionTestEpochRef.current += 1;
    const host = hostRef.current;
    const control = controlPortRef.current;
    hostRef.current = null;
    hostFailureTargetKeyRef.current = null;
    controlPortRef.current = null;
    activeSelectionRef.current = null;
    setAgentHost(null);
    setControlPort(null);
    setControlSnapshot(null);
    setActiveSelection(null);
    setEffectiveReasoningEffort(null);
    setModelSelectionPending(false);
    setReasoningSelectionPending(false);
    setConnectionTest({ phase: "disconnected", active: null });
    if (host === null) return Promise.resolve();
    control?.revokeCredential();
    return hostRetirementOwner.track(phase === "forgotten" ? host.forget() : host.dispose());
  }, [hostRetirementOwner]);

  const forgetAgentV1 = useCallback((): Promise<boolean> => {
    const activeForget = agentForgetSettlementRef.current;
    if (activeForget !== null) return activeForget;
    if (!agentDrainRegistry.isAccepting()) return Promise.resolve(false);
    setSetupStatus("loading");
    let settlement!: Promise<boolean>;
    settlement = (async (): Promise<boolean> => {
      try {
        await retireHostV1("forgotten");
        if (!agentDrainRegistry.isAccepting()) return false;
        if (agentForgetSettlementRef.current === settlement) {
          agentForgetSettlementRef.current = null;
        }
        if (deterministicAgent) {
          setDeterministicHostGeneration((generation) => generation + 1);
        } else {
          setProviderHostGeneration((generation) => generation + 1);
        }
        return true;
      } finally {
        if (agentForgetSettlementRef.current === settlement) {
          agentForgetSettlementRef.current = null;
        }
      }
    })();
    agentForgetSettlementRef.current = settlement;
    return settlement;
  }, [agentDrainRegistry, deterministicAgent, retireHostV1]);

  useEffect(() =>
    agentDrainRegistry.register(async () => {
      vaultEpochRef.current += 1;
      vaultOperationEpochRef.current += 1;
      vaultPortRef.current?.close();
      vaultPortRef.current = null;
      await Promise.all([
        setupSettlementRef.current.catch(() => undefined),
        modelSettlementRef.current.catch(() => undefined),
        reasoningSettlementRef.current.catch(() => undefined),
        vaultSettlementRef.current.catch(() => undefined),
        retireHostV1("disposed"),
      ]);
      await hostRetirementOwner.drain();
    }), [agentDrainRegistry, hostRetirementOwner, retireHostV1]);

  const loadProviderCatalogV1 = useCallback((): void => {
    if (deterministicAgent) return;
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
      reportFailureRef.current("silly_os.browser_pi_catalog_unavailable", result.code);
    }, (error: unknown) => {
      if (providerCatalogEpochRef.current !== epoch || !agentDrainRegistry.isAccepting()) return;
      setProviderCatalog({ phase: "failed", diagnosticCode: "worker_failed" });
      reportFailureRef.current("silly_os.browser_pi_catalog_unavailable", error);
    });
  }, [agentDrainRegistry, deterministicAgent]);

  useEffect(() => {
    loadProviderCatalogV1();
  }, [loadProviderCatalogV1]);

  useEffect(() => {
    if (
      deterministicAgent || providerCatalog.phase !== "ready" ||
      providerSettingsRepository === null
    ) return;
    const availableBuiltinModelKeys = new Set(
      providerCatalog.providers.flatMap((provider) =>
        provider.models
          .filter((model) => model.availability.status === "available")
          .map((model) =>
            builtinModelRefKeyV1({ providerId: provider.providerId, modelId: model.modelId })
          )
      ),
    );
    try {
      const initialization = providerSettingsRepository.initializeBuiltinModelDefaults(
        recommendedBrowserProviderBuiltinModelRefsV1(providerCatalog.providers),
      );
      const missing = initialization.snapshot.enabledBuiltinModels.filter((model) =>
        !availableBuiltinModelKeys.has(builtinModelRefKeyV1(model))
      );
      for (const model of missing) providerSettingsRepository.setBuiltinModelEnabled(model, false);
      if (!initialization.initialized && missing.length === 0) return;
      setProviderSettingsSnapshot(providerSettingsRepository.read());
    } catch (error) {
      reportFailure("silly_os.provider_settings_save_failed", error);
    }
  }, [deterministicAgent, providerCatalog, providerSettingsRepository, reportFailure]);

  useEffect(() => {
    if (deterministicAgent || !agentDrainRegistry.isAccepting()) return undefined;
    const epoch = ++vaultEpochRef.current;
    let current = true;
    setCredentialVault({
      phase: "unavailable",
      diagnosticCode: "initializing",
      protection: null,
      state: null,
      bindings: Object.freeze([]),
    });
    const initialize = import("../credential/browser-credential-vault-port.ts").then(
      async ({ createBrowserCredentialVaultPortV2 }) => {
        if (!current || vaultEpochRef.current !== epoch || !agentDrainRegistry.isAccepting()) {
          return;
        }
        const port = createBrowserCredentialVaultPortV2();
        vaultPortRef.current = port;
        const snapshot = await port.client.initialize();
        if (
          !current || vaultEpochRef.current !== epoch || vaultPortRef.current !== port ||
          !agentDrainRegistry.isAccepting()
        ) return;
        const next = providerSettingsVaultFromListV1(snapshot);
        vaultRef.current = next;
        setCredentialVault(next);
      },
    ).catch((error: unknown) => {
      if (!current || vaultEpochRef.current !== epoch) return;
      vaultPortRef.current?.close();
      vaultPortRef.current = null;
      const next: ProviderSettingsVaultV1 = {
        phase: "unavailable",
        diagnosticCode: credentialVaultDiagnosticCodeV1(error),
        protection: null,
        state: null,
        bindings: Object.freeze([]),
      };
      vaultRef.current = next;
      setCredentialVault(next);
      reportFailureRef.current("silly_os.credential_vault_unavailable", error);
    });
    vaultSettlementRef.current = initialize.then(() => undefined);
    return () => {
      current = false;
      vaultEpochRef.current += 1;
      const port = vaultPortRef.current;
      vaultPortRef.current = null;
      port?.close();
    };
  }, [agentDrainRegistry, deterministicAgent]);

  const recordSuccessfulModelV1 = useCallback((selection: BrowserPiModelSelectionV1): void => {
    if (providerSettingsRepository === null) return;
    try {
      providerSettingsRepository.setLastSuccessfulModel(modelRefFromSelectionV1(selection));
      setProviderSettingsSnapshot(providerSettingsRepository.read());
    } catch (error) {
      reportFailure("silly_os.provider_settings_save_failed", error);
    }
  }, [providerSettingsRepository, reportFailure]);

  const persistReasoningEffortPreferenceV1 = useCallback((
    preferredReasoningEffort: BrowserPiReasoningEffortV1,
  ): void => {
    if (agentPreferencesRepository === null) return;
    try {
      agentPreferencesRepository.setPreferredReasoningEffort(preferredReasoningEffort);
      setAgentPreferencesSnapshot(agentPreferencesRepository.read());
    } catch (error) {
      reportFailure("silly_os.agent_preferences_save_failed", error);
    }
  }, [agentPreferencesRepository, reportFailure]);

  const createCredentialVaultHandoffV1 = useCallback((
    vaultPort: BrowserCredentialVaultPortV1,
    binding: CredentialVaultBindingV2,
    workerEpoch: number,
    operationEpoch: number,
  ) =>
  (
    expectedBinding: CredentialVaultBindingV2,
    handoffId: string,
    deliveryPort: MessagePort,
  ): Promise<void> => {
    if (
      vaultPortRef.current !== vaultPort || vaultEpochRef.current !== workerEpoch ||
      vaultOperationEpochRef.current !== operationEpoch ||
      !credentialVaultCanHandoffProviderCredentialV1(vaultRef.current) ||
      !credentialVaultBindingsEqualV2(expectedBinding, binding)
    ) {
      deliveryPort.close();
      return Promise.reject(new TypeError("sillyos.credential_vault.handoff_stale"));
    }
    return vaultPort.client.handoff(expectedBinding, handoffId, deliveryPort);
  }, []);

  const configureHostV1 = useCallback((
    selection: BrowserPiModelSelectionV1 | null,
    configure: (control: BrowserProgramAgentControlPortV1) => ReturnType<
      BrowserProgramAgentControlPortV1["configureCredential"]
    >,
    failureTargetKey: string | null,
  ): Promise<boolean> => {
    if (
      !agentDrainRegistry.isAccepting() ||
      (runtime === "pi_provider" && selection === null)
    ) return Promise.resolve(false);
    const epoch = ++setupEpochRef.current;
    setupPendingRef.current = true;
    modelEpochRef.current += 1;
    reasoningEpochRef.current += 1;
    setModelSelectionPending(false);
    setReasoningSelectionPending(false);
    setEffectiveReasoningEffort(null);
    setSetupStatus("saving");
    const settlement = (async (): Promise<boolean> => {
      let candidateHost: BrowserProgramAgentHostV1 | null = null;
      try {
        const [agentModule, networkModule] = await Promise.all([
          import("../application/program-agent-composition.ts"),
          import("../network/browser-network-broker-frame-transport.ts"),
        ]);
        if (setupEpochRef.current !== epoch || !agentDrainRegistry.isAccepting()) return false;
        const onConnectionLost = (): void => {
          if (hostRef.current !== candidateHost) return;
          const failedTargetKey = hostFailureTargetKeyRef.current;
          if (failedTargetKey !== null) failedModelTargetKeyRef.current = failedTargetKey;
          void retireHostV1("disposed");
          setSetupStatus("failed");
          reportFailureRef.current("silly_os.browser_pi_connection_lost", {
            code: "connection_failed",
          });
        };
        candidateHost = runtime === "deterministic_test"
          ? agentModule.createBrowserProgramAgentHostV1({
            runtime: "deterministic_test",
            preferredReasoningEffort: agentPreferencesSnapshot.preferredReasoningEffort,
            workspaceAuthority,
            openNetworkBroker: () => networkModule.createBrowserNetworkBrokerFrameTransportV1(),
            onConnectionLost,
            onRunCompleted: recordSuccessfulModelV1,
          })
          : agentModule.createBrowserProgramAgentHostV1({
            runtime: "pi_provider",
            selection: selection!,
            preferredReasoningEffort: agentPreferencesSnapshot.preferredReasoningEffort,
            workspaceAuthority,
            openNetworkBroker: () => networkModule.createBrowserNetworkBrokerFrameTransportV1(),
            onConnectionLost,
            onRunCompleted: recordSuccessfulModelV1,
          });
        const candidateControl = candidateHost.createControlPort();
        const configured = await configure(candidateControl);
        if (
          configured.kind !== "configured" || setupEpochRef.current !== epoch ||
          !agentDrainRegistry.isAccepting()
        ) {
          await candidateHost.dispose();
          if (configured.kind !== "configured") {
            setSetupStatus("failed");
            reportFailure("silly_os.browser_pi_configure_failed", configured.diagnostic);
          }
          return false;
        }
        const predecessor = hostRef.current;
        hostRef.current = candidateHost;
        hostFailureTargetKeyRef.current = failureTargetKey;
        controlPortRef.current = candidateControl;
        activeSelectionRef.current = runtime === "pi_provider" ? selection : null;
        setAgentHost(candidateHost);
        setControlPort(candidateControl);
        setActiveSelection(activeSelectionRef.current);
        setEffectiveReasoningEffort(configured.effectiveReasoningEffort);
        setSetupStatus("ready");
        if (predecessor !== null && predecessor !== candidateHost) {
          await hostRetirementOwner.track(predecessor.forget());
        }
        return true;
      } catch (error) {
        if (candidateHost !== null && candidateHost !== hostRef.current) {
          await candidateHost.dispose().catch(() => undefined);
        }
        if (setupEpochRef.current === epoch) {
          setSetupStatus("failed");
          reportFailure("silly_os.browser_pi_configure_failed", error);
        }
        return false;
      } finally {
        if (setupEpochRef.current === epoch) setupPendingRef.current = false;
      }
    })();
    setupSettlementRef.current = settlement.then(() => undefined);
    return settlement;
  }, [
    agentDrainRegistry,
    agentPreferencesSnapshot.preferredReasoningEffort,
    hostRetirementOwner,
    recordSuccessfulModelV1,
    reportFailure,
    retireHostV1,
    runtime,
    workspaceAuthority,
  ]);

  const activateVaultSelectionV1 = useCallback((
    selection: BrowserPiModelSelectionV1,
    failureTargetKey: string | null,
  ): Promise<boolean> => {
    const vaultPort = vaultPortRef.current;
    let binding: CredentialVaultBindingV2;
    try {
      binding = credentialVaultBindingForSelectionV2(selection);
    } catch (error) {
      setSetupStatus("failed");
      reportFailure("silly_os.credential_vault_binding_invalid", error);
      return Promise.resolve(false);
    }
    if (
      vaultPort === null || !credentialVaultCanHandoffProviderCredentialV1(vaultRef.current) ||
      !vaultRef.current.bindings.some((candidate) =>
        credentialVaultBindingsEqualV2(candidate, binding)
      )
    ) return Promise.resolve(false);
    const workerEpoch = vaultEpochRef.current;
    const operationEpoch = ++vaultOperationEpochRef.current;
    return configureHostV1(
      selection,
      (control) =>
        control.configureCredentialHandoff({
          binding,
          handoff: createCredentialVaultHandoffV1(
            vaultPort,
            binding,
            workerEpoch,
            operationEpoch,
          ),
        }),
      failureTargetKey,
    );
  }, [configureHostV1, createCredentialVaultHandoffV1, reportFailure]);

  useEffect(() => {
    if (
      !deterministicAgent || hostRef.current !== null || setupStatus === "failed" ||
      agentForgetSettlementRef.current !== null || !agentDrainRegistry.isAccepting()
    ) {
      return undefined;
    }
    let current = true;
    let candidate: BrowserProgramAgentHostV1 | null = null;
    void Promise.all([
      import("../application/program-agent-composition.ts"),
      import("../network/browser-network-broker-frame-transport.ts"),
    ]).then(([agentModule, networkModule]) => {
      if (!current || !agentDrainRegistry.isAccepting()) return;
      candidate = agentModule.createBrowserProgramAgentHostV1({
        runtime: "deterministic_test",
        preferredReasoningEffort: agentPreferencesSnapshot.preferredReasoningEffort,
        workspaceAuthority,
        openNetworkBroker: () => networkModule.createBrowserNetworkBrokerFrameTransportV1(),
        onConnectionLost: () => {
          if (hostRef.current !== candidate) return;
          void retireHostV1("disposed");
          setSetupStatus("failed");
        },
      });
      const control = candidate.createControlPort();
      hostRef.current = candidate;
      controlPortRef.current = control;
      setAgentHost(candidate);
      setControlPort(control);
      setSetupStatus("ready");
    }).catch((error: unknown) => {
      if (candidate !== null && candidate !== hostRef.current) {
        void hostRetirementOwner.track(candidate.dispose());
      }
      if (!current) return;
      setSetupStatus("failed");
      reportFailureRef.current("silly_os.browser_pi_adapter_unavailable", error);
    });
    return () => {
      current = false;
    };
  }, [
    agentDrainRegistry,
    agentPreferencesSnapshot.preferredReasoningEffort,
    deterministicHostGeneration,
    deterministicAgent,
    hostRetirementOwner,
    retireHostV1,
    setupStatus,
    workspaceAuthority,
  ]);

  const modelChoices = useMemo(() =>
    programProviderModelChoicesV1(
      providerCatalog,
      providerSettingsSnapshot.customProfiles,
      providerSettingsSnapshot.enabledBuiltinModels,
    ), [
    providerCatalog,
    providerSettingsSnapshot.customProfiles,
    providerSettingsSnapshot.enabledBuiltinModels,
  ]);
  const usableModelChoices = useMemo(
    () =>
      modelChoices.filter((choice) =>
        credentialVaultHasProviderCredentialV1(credentialVault, choice.selection)
      ),
    [credentialVault, modelChoices],
  );
  const activeChoice = activeSelection === null
    ? null
    : usableModelChoices.find((choice) =>
      sameProviderSelectionV1(choice.selection, activeSelection)
    ) ??
      null;
  useEffect(() => {
    if (
      deterministicAgent || providerCatalog.phase !== "ready" || activeSelection === null ||
      activeChoice !== null
    ) return;
    void retireHostV1("forgotten");
  }, [activeChoice, activeSelection, deterministicAgent, providerCatalog.phase, retireHostV1]);
  const automaticChoice = useMemo(() =>
    resolveProgramModelDefaultV1({
      recommendedModelPatterns,
      choices: usableModelChoices,
      lastSuccessfulModel: providerSettingsSnapshot.lastSuccessfulModel,
    }), [
    providerSettingsSnapshot.lastSuccessfulModel,
    recommendedModelPatterns,
    usableModelChoices,
  ]);
  const manualSelectionCurrent = isProgramModelManualSelectionCurrentV1(
    manualSelection,
    modelSelectionScopeKey,
    activeChoice?.value ?? null,
  );
  const selectedChoice = manualSelectionCurrent ? activeChoice : automaticChoice;
  const automaticTargetKey = automaticChoice === null
    ? `${modelSelectionScopeKey}\0manual`
    : `${modelSelectionScopeKey}\0${automaticChoice.value}`;
  const selectedTargetKey = selectedChoice === null
    ? `${modelSelectionScopeKey}\0manual`
    : `${modelSelectionScopeKey}\0${selectedChoice.value}`;
  useLayoutEffect(() => {
    if (
      selectedChoice !== null && controlPortRef.current !== null &&
      sameProviderSelectionV1(activeSelection, selectedChoice.selection)
    ) {
      hostFailureTargetKeyRef.current = selectedTargetKey;
    }
  }, [activeSelection, selectedChoice, selectedTargetKey]);
  const selectedModelValue = selectedChoice?.value ?? null;
  const selectedIsActive = selectedChoice !== null &&
    sameProviderSelectionV1(activeSelection, selectedChoice.selection) &&
    (controlSnapshot?.phase === "ready" || controlSnapshot?.phase === "completed" ||
      controlSnapshot?.phase === "failed");
  const reasoningOptions = selectedChoice?.supportedReasoningEfforts ??
    Object.freeze(["off"] as const);
  const reasoningValue = effectiveReasoningEffort !== null &&
      reasoningOptions.includes(effectiveReasoningEffort)
    ? effectiveReasoningEffort
    : selectedChoice?.defaultReasoningEffort ?? "off";
  const setupFailureCurrent = failedModelTargetKeyRef.current === selectedTargetKey ||
    (setupStatus === "failed" && failedModelTargetKeyRef.current === null);
  const modelStatus = selectedChoice === null
    ? "required" as const
    : modelSelectionPending || setupPendingRef.current
    ? "initializing" as const
    : selectedIsActive
    ? "ready" as const
    : setupFailureCurrent
    ? "failed" as const
    : "initializing" as const;
  const readiness: ProgramSurfaceAgentReadinessV1 = deterministicAgent
    ? setupStatus === "failed"
      ? { status: "agent_failed", recoveryTarget: null }
      : agentHost === null
      ? { status: "agent_initializing", recoveryTarget: null }
      : { status: "ready", recoveryTarget: null }
    : projectAgentReadinessV1({
      catalogStatus: providerCatalog.phase,
      vaultStatus: projectCredentialVaultStatusV1(credentialVault),
      hasEnabledConfiguredModel: modelChoices.length > 0,
      hasModelWithCredentialedProvider: usableModelChoices.length > 0,
      hasSelectedModel: selectedChoice !== null,
      agentStatus: modelStatus === "failed"
        ? "failed"
        : modelStatus === "ready"
        ? "ready"
        : "initializing",
    });

  const selectConfiguredModelV1 = useCallback((
    choice: ProgramProviderModelChoiceV1,
    failureTargetKey: string,
  ): Promise<boolean> => {
    const control = controlPortRef.current;
    const active = activeSelectionRef.current;
    if (
      control === null || active === null ||
      !selectionsShareCredentialScopeV1(active, choice.selection)
    ) return Promise.resolve(false);
    if (sameProviderSelectionV1(active, choice.selection)) {
      hostFailureTargetKeyRef.current = failureTargetKey;
      return Promise.resolve(true);
    }
    const epoch = ++modelEpochRef.current;
    setModelSelectionPending(true);
    const settlement = (async (): Promise<boolean> => {
      try {
        const selected = await control.selectModel(choice.selection);
        if (
          modelEpochRef.current !== epoch || controlPortRef.current !== control ||
          !agentDrainRegistry.isAccepting()
        ) return false;
        if (selected.kind !== "selected") {
          setSetupStatus("failed");
          reportFailure("silly_os.browser_pi_model_select_failed", selected.diagnostic);
          return false;
        }
        activeSelectionRef.current = selected.selection;
        hostFailureTargetKeyRef.current = failureTargetKey;
        setActiveSelection(selected.selection);
        setEffectiveReasoningEffort(selected.effectiveReasoningEffort);
        setSetupStatus("ready");
        return true;
      } catch (error) {
        if (modelEpochRef.current === epoch) {
          setSetupStatus("failed");
          reportFailure("silly_os.browser_pi_model_select_failed", error);
        }
        return false;
      } finally {
        if (modelEpochRef.current === epoch) setModelSelectionPending(false);
      }
    })();
    modelSettlementRef.current = settlement.then(() => undefined);
    return settlement;
  }, [agentDrainRegistry, reportFailure]);

  const selectModelChoiceV1 = useCallback((choice: ProgramProviderModelChoiceV1): void => {
    if (
      deterministicAgent || setupPendingRef.current || modelSelectionPending ||
      reasoningSelectionPending ||
      !credentialVaultCanHandoffProviderCredentialV1(vaultRef.current)
    ) return;
    const active = activeSelectionRef.current;
    const nextManualSelection = {
      scopeKey: modelSelectionScopeKey,
      choiceValue: choice.value,
    };
    setManualSelection(nextManualSelection);
    let settlement: Promise<boolean>;
    if (
      controlPortRef.current !== null && active !== null &&
      selectionsShareCredentialScopeV1(active, choice.selection)
    ) {
      settlement = selectConfiguredModelV1(
        choice,
        `${nextManualSelection.scopeKey}\0${nextManualSelection.choiceValue}`,
      );
    } else {
      settlement = activateVaultSelectionV1(
        choice.selection,
        `${nextManualSelection.scopeKey}\0${nextManualSelection.choiceValue}`,
      );
    }
    void settlement.then((selected) => {
      if (selected) {
        if (
          hostRef.current !== null &&
          hostFailureTargetKeyRef.current ===
            `${nextManualSelection.scopeKey}\0${nextManualSelection.choiceValue}`
        ) {
          failedModelTargetKeyRef.current = null;
        }
        return;
      }
      failedModelTargetKeyRef.current =
        `${nextManualSelection.scopeKey}\0${nextManualSelection.choiceValue}`;
      setManualSelection((current) =>
        current?.scopeKey === nextManualSelection.scopeKey &&
          current.choiceValue === nextManualSelection.choiceValue
          ? null
          : current
      );
    });
  }, [
    activateVaultSelectionV1,
    deterministicAgent,
    modelSelectionScopeKey,
    modelSelectionPending,
    reasoningSelectionPending,
    selectConfiguredModelV1,
  ]);

  const selectReasoningEffortV1 = useCallback((
    preferredReasoningEffort: BrowserPiReasoningEffortV1,
  ): void => {
    const control = controlPortRef.current;
    if (
      deterministicAgent || control === null || setupPendingRef.current ||
      modelSelectionPending || reasoningSelectionPending
    ) return;
    const epoch = ++reasoningEpochRef.current;
    setReasoningSelectionPending(true);
    const settlement = (async (): Promise<void> => {
      try {
        const selected = await control.selectReasoningEffort(preferredReasoningEffort);
        if (
          reasoningEpochRef.current !== epoch || controlPortRef.current !== control ||
          !agentDrainRegistry.isAccepting()
        ) return;
        if (selected.kind !== "selected") {
          reportFailure(
            "silly_os.browser_pi_reasoning_effort_select_failed",
            selected.diagnostic,
          );
          return;
        }
        setEffectiveReasoningEffort(selected.effectiveReasoningEffort);
        persistReasoningEffortPreferenceV1(selected.preferredReasoningEffort);
      } catch (error) {
        if (reasoningEpochRef.current === epoch) {
          reportFailure("silly_os.browser_pi_reasoning_effort_select_failed", error);
        }
      } finally {
        if (reasoningEpochRef.current === epoch) setReasoningSelectionPending(false);
      }
    })();
    reasoningSettlementRef.current = settlement;
  }, [
    agentDrainRegistry,
    deterministicAgent,
    modelSelectionPending,
    persistReasoningEffortPreferenceV1,
    reasoningSelectionPending,
    reportFailure,
  ]);

  useEffect(() => {
    if (
      deterministicAgent || manualSelectionCurrent ||
      agentForgetSettlementRef.current !== null ||
      !credentialVaultCanHandoffProviderCredentialV1(credentialVault) ||
      credentialOperation.phase !== "idle" || connectionTest.phase === "testing" ||
      (settingsOpen && connectionTest.phase !== "disconnected") ||
      failedModelTargetKeyRef.current === automaticTargetKey || setupPendingRef.current ||
      modelSelectionPending ||
      reasoningSelectionPending || !agentDrainRegistry.isAccepting()
    ) return;
    const active = activeSelectionRef.current;
    if (selectedChoice === null) {
      if (providerCatalog.phase !== "ready") return;
      failedModelTargetKeyRef.current = null;
      if (active !== null) void retireHostV1("disposed");
      return;
    }
    if (controlPortRef.current !== null && active !== null) {
      if (sameProviderSelectionV1(active, selectedChoice.selection)) {
        hostFailureTargetKeyRef.current = automaticTargetKey;
        failedModelTargetKeyRef.current = null;
        return;
      }
      if (selectionsShareCredentialScopeV1(active, selectedChoice.selection)) {
        void selectConfiguredModelV1(selectedChoice, automaticTargetKey).then((selected) => {
          if (selected) {
            if (
              hostRef.current !== null &&
              hostFailureTargetKeyRef.current === automaticTargetKey
            ) {
              failedModelTargetKeyRef.current = null;
            }
            return;
          }
          failedModelTargetKeyRef.current = automaticTargetKey;
        });
        return;
      }
    }
    void activateVaultSelectionV1(selectedChoice.selection, automaticTargetKey).then((selected) => {
      if (selected) {
        if (
          hostRef.current !== null && hostFailureTargetKeyRef.current === automaticTargetKey
        ) {
          failedModelTargetKeyRef.current = null;
        }
        return;
      }
      failedModelTargetKeyRef.current = automaticTargetKey;
    });
  }, [
    activateVaultSelectionV1,
    agentDrainRegistry,
    automaticTargetKey,
    connectionTest.phase,
    credentialOperation.phase,
    credentialVault,
    deterministicAgent,
    manualSelectionCurrent,
    modelSelectionPending,
    providerCatalog.phase,
    providerHostGeneration,
    reasoningSelectionPending,
    retireHostV1,
    selectedChoice,
    selectConfiguredModelV1,
    settingsOpen,
  ]);

  const openSettings = useCallback((openInput?: {
    readonly section?: ProviderSettingsSectionV1;
    readonly returnSurface?: "home" | "workspace";
    readonly returnTarget?: "surface_settings" | "model_selector";
  }): void => {
    settingsReturnSurfaceRef.current = openInput?.returnSurface ?? "home";
    settingsReturnTargetRef.current = openInput?.returnTarget ?? "surface_settings";
    setSettingsInitialSection(openInput?.section ?? "general");
    setSettingsOpen(true);
    if (providerCatalog.phase === "loading") loadProviderCatalogV1();
  }, [loadProviderCatalogV1, providerCatalog.phase]);

  const closeSettings = useCallback((): void => {
    setCredentialReceipt(null);
    if (connectionTest.phase === "testing") {
      connectionTestEpochRef.current += 1;
      setConnectionTest({ phase: "disconnected", active: null });
    }
    setSettingsOpen(false);
    const surface = settingsReturnSurfaceRef.current;
    const returnTarget = settingsReturnTargetRef.current;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const element = document.querySelector<HTMLElement>(
          returnTarget === "model_selector"
            ? `[data-model-picker-surface="${surface}"] [role="combobox"]`
            : `[data-open-settings="${surface}"]`,
        );
        element?.focus();
      });
    });
  }, [connectionTest.phase]);

  const providerModel = useCallback(
    (surface: "home" | "workspace"): ProgramSurfaceModelControlV1 => ({
      status: modelStatus,
      disabled: !credentialVaultCanHandoffProviderCredentialV1(credentialVault),
      selectedValue: selectedModelValue,
      options: usableModelChoices.map((choice) => ({
        value: choice.value,
        modelName: choice.modelName,
        providerName: choice.providerName,
      })),
      reasoningEffort: {
        status: reasoningSelectionPending
          ? "initializing"
          : setupStatus === "failed"
          ? "failed"
          : "ready",
        selectedValue: reasoningValue,
        options: reasoningOptions,
        onSelect: selectReasoningEffortV1,
      },
      onSelect: (value) => {
        const choice = usableModelChoices.find((candidate) => candidate.value === value);
        if (choice !== undefined) selectModelChoiceV1(choice);
      },
      onOpenSettings: () =>
        openSettings({
          section: "providers",
          returnSurface: surface,
          returnTarget: "model_selector",
        }),
    }),
    [
      credentialVault,
      modelStatus,
      openSettings,
      reasoningOptions,
      reasoningSelectionPending,
      reasoningValue,
      selectModelChoiceV1,
      selectReasoningEffortV1,
      selectedModelValue,
      setupStatus,
      usableModelChoices,
    ],
  );

  const refreshStorageUsageV1 = useCallback((): void => {
    const epoch = ++storageUsageEpochRef.current;
    setStorageUsage({ control: { phase: "checking" }, workspace: { phase: "checking" } });
    const controlEstimate = typeof navigator !== "undefined" &&
        typeof navigator.storage?.estimate === "function"
      ? navigator.storage.estimate()
      : Promise.reject(new TypeError("sillyos.storage_estimate.unavailable"));
    void Promise.allSettled([controlEstimate, workspaceAuthority.inspectStorage()]).then(
      ([controlResult, workspaceResult]) => {
        if (storageUsageEpochRef.current !== epoch) return;
        setStorageUsage({
          control: controlResult.status === "fulfilled"
            ? controlStorageEstimateV1(controlResult.value)
            : { phase: "unavailable", diagnosticCode: "control_estimate_unavailable" },
          workspace: workspaceResult.status === "fulfilled"
            ? {
              phase: "available",
              ...(workspaceResult.value.usageBytes === undefined
                ? {}
                : { usageBytes: workspaceResult.value.usageBytes }),
              ...(workspaceResult.value.quotaBytes === undefined
                ? {}
                : { quotaBytes: workspaceResult.value.quotaBytes }),
            }
            : { phase: "unavailable", diagnosticCode: "workspace_estimate_unavailable" },
        });
      },
    );
  }, [workspaceAuthority]);

  useEffect(() => {
    if (settingsOpen && !deterministicAgent) refreshStorageUsageV1();
  }, [deterministicAgent, refreshStorageUsageV1, settingsOpen]);

  const runVaultOperationV1 = useCallback((
    operation: ProviderSettingsVaultOperationV1,
    execute: (port: BrowserCredentialVaultPortV1) => Promise<CredentialVaultListV2>,
  ): void => {
    const port = vaultPortRef.current;
    if (port === null || !agentDrainRegistry.isAccepting()) {
      const error = new TypeError("sillyos.credential_vault.port_unavailable");
      const next: ProviderSettingsVaultV1 = {
        phase: "unavailable",
        diagnosticCode: credentialVaultDiagnosticCodeV1(error),
        protection: null,
        state: null,
        bindings: vaultRef.current.bindings,
      };
      vaultRef.current = next;
      setCredentialVault(next);
      reportFailure("silly_os.credential_vault_unavailable", error);
      return;
    }
    const workerEpoch = vaultEpochRef.current;
    const operationEpoch = ++vaultOperationEpochRef.current;
    const previous = vaultRef.current;
    const busy = providerSettingsVaultBusyV1(operation, previous);
    vaultRef.current = busy;
    setCredentialVault(busy);
    const settlement = execute(port).then((snapshot) => {
      if (
        vaultEpochRef.current !== workerEpoch ||
        vaultOperationEpochRef.current !== operationEpoch || vaultPortRef.current !== port ||
        !agentDrainRegistry.isAccepting()
      ) return;
      const next = providerSettingsVaultFromListV1(snapshot);
      vaultRef.current = next;
      setCredentialVault(next);
    }).catch((error: unknown) => {
      if (
        vaultEpochRef.current !== workerEpoch ||
        vaultOperationEpochRef.current !== operationEpoch || vaultPortRef.current !== port
      ) return;
      const failed = providerSettingsVaultFailedV1(operation, previous, error);
      vaultRef.current = failed;
      setCredentialVault(failed);
      reportFailure(`silly_os.credential_vault_${operation}_failed`, error);
    });
    vaultSettlementRef.current = settlement;
  }, [agentDrainRegistry, reportFailure]);

  const setCredentialVaultPasswordV1 = useCallback((supplied: string): void => {
    let passphrase = supplied;
    runVaultOperationV1("set_password", (port) => {
      const result = port.client.setPassword(passphrase);
      passphrase = "";
      return result;
    });
  }, [runVaultOperationV1]);
  const useAutomaticCredentialVaultV1 = useCallback((): void => {
    runVaultOperationV1("use_device", (port) => port.client.useDevice());
  }, [runVaultOperationV1]);
  const unlockCredentialVaultV1 = useCallback((supplied: string): void => {
    let passphrase = supplied;
    runVaultOperationV1("unlock", (port) => {
      const result = port.client.unlock(passphrase);
      passphrase = "";
      return result;
    });
  }, [runVaultOperationV1]);
  const lockCredentialVaultV1 = useCallback((): void => {
    void retireHostV1("forgotten");
    runVaultOperationV1("lock", (port) => port.client.lock());
  }, [retireHostV1, runVaultOperationV1]);

  const testProviderConnectionV1 = useCallback((selection: ProviderSettingsSelectionV1): void => {
    const piSelection: BrowserPiModelSelectionV1 = selection;
    setCredentialReceipt(null);
    let binding: CredentialVaultBindingV2;
    try {
      binding = credentialVaultBindingForSelectionV2(piSelection);
    } catch (error) {
      reportFailure("silly_os.credential_vault_binding_invalid", error);
      return;
    }
    if (
      !credentialVaultCanHandoffProviderCredentialV1(vaultRef.current) ||
      !vaultRef.current.bindings.some((candidate) =>
        credentialVaultBindingsEqualV2(candidate, binding)
      )
    ) {
      setConnectionTest({
        phase: "failed",
        active: selection,
        diagnosticCode: "credential_unavailable",
      });
      return;
    }
    const epoch = ++connectionTestEpochRef.current;
    setConnectionTest({ phase: "testing", active: selection });
    const settlement = (async (): Promise<void> => {
      const active = activeSelectionRef.current;
      if (
        controlPortRef.current === null || active === null ||
        !selectionsShareCredentialScopeV1(active, piSelection)
      ) {
        if (!await activateVaultSelectionV1(piSelection, null)) {
          if (connectionTestEpochRef.current === epoch) {
            setConnectionTest({
              phase: "failed",
              active: selection,
              diagnosticCode: "credential_handoff_failed",
            });
          }
          return;
        }
      }
      const control = controlPortRef.current;
      if (control === null || connectionTestEpochRef.current !== epoch) return;
      const tested = await control.testConnection(piSelection);
      if (
        controlPortRef.current !== control || connectionTestEpochRef.current !== epoch ||
        !agentDrainRegistry.isAccepting()
      ) return;
      if (tested.kind === "ready") {
        setConnectionTest({ phase: "ready", active: selection });
      } else {
        setConnectionTest({ phase: "test_failed", active: selection });
        reportFailure("silly_os.browser_pi_connection_test_failed", tested.diagnostic);
      }
    })().catch((error: unknown) => {
      if (connectionTestEpochRef.current !== epoch) return;
      setConnectionTest({
        phase: "failed",
        active: selection,
        diagnosticCode: credentialVaultDiagnosticCodeV1(error),
      });
      reportFailure("silly_os.browser_pi_connection_test_failed", error);
    });
    setupSettlementRef.current = settlement;
  }, [activateVaultSelectionV1, agentDrainRegistry, reportFailure]);

  const saveProviderCredentialV1 = useCallback((
    connections: readonly CredentialVaultConnectionIdentityV2[],
    suppliedCredential: string,
  ): void => {
    const vaultPort = vaultPortRef.current;
    const target = connections[0];
    let bindings: readonly CredentialVaultBindingV2[];
    try {
      if (target === undefined) {
        throw new TypeError("sillyos.credential_vault.binding_invalid/empty");
      }
      bindings = Object.freeze(connections.map(credentialVaultBindingForConnectionV2));
    } catch (error) {
      reportFailure("silly_os.credential_vault_binding_invalid", error);
      return;
    }
    if (
      suppliedCredential.length === 0 || vaultPort === null ||
      !credentialVaultCanHandoffProviderCredentialV1(vaultRef.current)
    ) {
      reportFailure("silly_os.credential_vault_save_failed", "vault_locked");
      return;
    }
    const workerEpoch = vaultEpochRef.current;
    const operationEpoch = ++vaultOperationEpochRef.current;
    const replacesActive = activeAgentUsesAnyCredentialBindingV1(
      activeSelectionRef.current,
      bindings,
    );
    connectionTestEpochRef.current += 1;
    setConnectionTest({ phase: "disconnected", active: null });
    if (replacesActive) void retireHostV1("forgotten");
    setCredentialReceipt(null);
    setCredentialOperation({ phase: "saving", target });
    let credential = suppliedCredential;
    const settlement = (async (): Promise<void> => {
      try {
        for (const binding of bindings) await vaultPort.client.upsert(binding, credential);
        credential = "";
        if (
          vaultPortRef.current !== vaultPort || vaultEpochRef.current !== workerEpoch ||
          vaultOperationEpochRef.current !== operationEpoch || !agentDrainRegistry.isAccepting()
        ) return;
        const snapshot = await vaultPort.client.list();
        if (
          vaultPortRef.current !== vaultPort || vaultEpochRef.current !== workerEpoch ||
          vaultOperationEpochRef.current !== operationEpoch || !agentDrainRegistry.isAccepting()
        ) return;
        const next = providerSettingsVaultFromListV1(snapshot);
        vaultRef.current = next;
        setCredentialVault(next);
        failedModelTargetKeyRef.current = null;
        setSetupStatus((current) => current === "failed" ? "loading" : current);
        setCredentialOperation({ phase: "idle", target: null });
        setCredentialReceipt({ kind: "saved", target });
      } catch (error) {
        if (
          vaultPortRef.current === vaultPort && vaultEpochRef.current === workerEpoch &&
          vaultOperationEpochRef.current === operationEpoch
        ) {
          setCredentialOperation({
            phase: "failed",
            target,
            diagnosticCode: credentialVaultDiagnosticCodeV1(error),
          });
          reportFailure("silly_os.credential_vault_save_failed", error);
        }
      } finally {
        credential = "";
      }
    })();
    vaultSettlementRef.current = settlement;
  }, [
    agentDrainRegistry,
    reportFailure,
    retireHostV1,
  ]);

  const forgetCredentialV1 = useCallback((bindings: readonly CredentialVaultBindingV2[]): void => {
    const first = bindings[0];
    if (first === undefined) return;
    const matches = (candidate: CredentialVaultBindingV2): boolean =>
      bindings.some((binding) => credentialVaultBindingsEqualV2(candidate, binding));
    const active = activeSelectionRef.current;
    if (active !== null && matches(credentialVaultBindingForSelectionV2(active))) {
      void retireHostV1("forgotten");
    }
    const vaultPort = vaultPortRef.current;
    if (vaultPort === null) {
      reportFailure("silly_os.credential_vault_forget_failed", "vault_unavailable");
      return;
    }
    const target: CredentialVaultConnectionIdentityV2 = first.bindingId.startsWith("builtin:")
      ? {
        kind: "builtin",
        providerId: first.bindingId.slice("builtin:".length),
        baseUrl: first.baseUrl,
      }
      : {
        kind: "custom",
        profileId: first.bindingId.slice("custom:".length),
        baseUrl: first.baseUrl,
      };
    const workerEpoch = vaultEpochRef.current;
    const operationEpoch = ++vaultOperationEpochRef.current;
    setCredentialReceipt(null);
    setCredentialOperation({ phase: "forgetting", target });
    const settlement = (async (): Promise<void> => {
      try {
        let firstFailure: unknown = null;
        for (const binding of bindings) {
          try {
            await vaultPort.client.forget(binding);
          } catch (error) {
            firstFailure ??= error;
          }
        }
        const snapshot = await vaultPort.client.list();
        if (
          vaultPortRef.current !== vaultPort || vaultEpochRef.current !== workerEpoch ||
          vaultOperationEpochRef.current !== operationEpoch
        ) return;
        const next = providerSettingsVaultFromListV1(snapshot);
        vaultRef.current = next;
        setCredentialVault(next);
        setCredentialOperation(
          firstFailure === null ? { phase: "idle", target: null } : {
            phase: "failed",
            target,
            diagnosticCode: credentialVaultDiagnosticCodeV1(firstFailure),
          },
        );
        if (firstFailure !== null) {
          reportFailure("silly_os.credential_vault_forget_failed", firstFailure);
        }
      } catch (error) {
        setCredentialOperation({
          phase: "failed",
          target,
          diagnosticCode: credentialVaultDiagnosticCodeV1(error),
        });
        reportFailure("silly_os.credential_vault_forget_failed", error);
      }
    })();
    vaultSettlementRef.current = settlement;
  }, [reportFailure, retireHostV1]);

  const setBuiltinModelEnabledV1 = useCallback((
    model: BrowserProviderBuiltinModelRefV1,
    enabled: boolean,
  ): void => {
    if (providerSettingsRepository === null) {
      reportFailure("silly_os.provider_settings_save_failed", "storage_unavailable");
      return;
    }
    try {
      providerSettingsRepository.setBuiltinModelEnabled(model, enabled);
      const next = providerSettingsRepository.read();
      setProviderSettingsSnapshot(next);
      const active = activeSelectionRef.current;
      if (
        !enabled && active?.kind === "builtin" && active.providerId === model.providerId &&
        active.modelId === model.modelId
      ) {
        void retireHostV1("forgotten");
      }
    } catch (error) {
      reportFailure("silly_os.provider_settings_save_failed", error);
    }
  }, [
    providerSettingsRepository,
    reportFailure,
    retireHostV1,
  ]);

  const createCustomProviderProfileV1 = useCallback((
    draft: ProviderSettingsCustomProfileDraftV1,
  ): ProviderSettingsCustomProfileV1 | null => {
    if (providerSettingsRepository === null) return null;
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
  }, [providerSettingsRepository, reportFailure]);

  const removeCustomProviderProfileV1 = useCallback((profileId: string): void => {
    if (providerSettingsRepository === null) return;
    try {
      if (
        activeSelectionRef.current?.kind === "custom" &&
        activeSelectionRef.current.profile.profileId === profileId
      ) void retireHostV1("forgotten");
      providerSettingsRepository.remove(profileId);
      setProviderSettingsSnapshot(providerSettingsRepository.read());
    } catch (error) {
      reportFailure("silly_os.provider_settings_remove_failed", error);
    }
  }, [providerSettingsRepository, reportFailure, retireHostV1]);

  const resetCredentialVaultV1 = useCallback(async (): Promise<CredentialVaultListV2> => {
    await vaultSettlementRef.current.catch(() => undefined);
    const current = vaultPortRef.current;
    if (current !== null) return await current.client.reset();
    const { createBrowserCredentialVaultPortV2 } = await import(
      "../credential/browser-credential-vault-port.ts"
    );
    const temporary = createBrowserCredentialVaultPortV2();
    try {
      await temporary.client.initialize();
      return await temporary.client.reset();
    } finally {
      temporary.close();
    }
  }, []);

  const clearAllDataV1 = useCallback((): void => {
    if (clearAllPendingRef.current) return;
    clearAllPendingRef.current = true;
    storageUsageEpochRef.current += 1;
    vaultOperationEpochRef.current += 1;
    setClearAll({ phase: "clearing" });
    setCredentialReceipt(null);
    void (async (): Promise<void> => {
      const [authorityResult, vaultResult, providerResult, packagesResult] =
        await runBrowserDataResetOperationV1({
          coordinator: dataResetCoordinator,
          reportCoordinationFailure: (error) => {
            reportFailureRef.current("silly_os.data_reset_coordination_unavailable", error);
          },
          revokeLocalCapabilities: () => {
            void retireHostV1("forgotten");
          },
          awaitSettledOperations: async () => {
            await Promise.all([
              setupSettlementRef.current.catch(() => undefined),
              modelSettlementRef.current.catch(() => undefined),
              reasoningSettlementRef.current.catch(() => undefined),
              vaultSettlementRef.current.catch(() => undefined),
            ]);
            await hostRetirementOwner.drain();
          },
          resetProgramWorkspaceData: () => workspaceAuthority.resetStoredData(),
          resetCredentialVault: resetCredentialVaultV1,
          resetProviderSettings: async () => {
            if (providerSettingsRepository === null || agentPreferencesRepository === null) {
              throw new TypeError("sillyos.provider_settings.repository_unavailable");
            }
            providerSettingsRepository.clear();
            agentPreferencesRepository.clear();
            resetProductPreferences();
            if (typeof location !== "undefined") {
              const url = new URL(location.href);
              url.searchParams.delete("locale");
              history.replaceState(history.state, "", url);
            }
          },
          resetProgramPackages: () => programPackages.reset(),
        });
      const failures: string[] = [];
      if (authorityResult.status === "rejected") {
        failures.push("program_workspace_data_reset_failed");
      } else {
        if (authorityResult.value.programDataRepository.kind !== "cleared") {
          failures.push("program_data_repository_retained");
        }
        if (authorityResult.value.workspaceVolumes.kind !== "cleared") {
          failures.push("workspace_volumes_retained");
        }
      }
      if (vaultResult.status === "rejected") failures.push("credential_vault_reset_failed");
      else {
        const next = providerSettingsVaultFromListV1(vaultResult.value);
        vaultRef.current = next;
        setCredentialVault(next);
      }
      if (providerResult.status === "rejected") failures.push("provider_settings_clear_failed");
      else {
        setProviderSettingsSnapshot(emptyProviderSettingsSnapshotV1());
        setAgentPreferencesSnapshot(defaultAgentPreferencesSnapshotV1());
      }
      if (packagesResult.status === "rejected") failures.push("program_packages_reset_failed");
      if (failures.length === 0) {
        window.location.reload();
        return;
      }
      const diagnosticCode = failures.join(",");
      setClearAll({ phase: "failed", diagnosticCode });
      reportFailureRef.current("silly_os.clear_all_data_failed", { failures });
      refreshStorageUsageV1();
    })().catch((error: unknown) => {
      setClearAll({ phase: "failed", diagnosticCode: "clear_all_failed" });
      reportFailureRef.current("silly_os.clear_all_data_failed", error);
      refreshStorageUsageV1();
    }).finally(() => {
      clearAllPendingRef.current = false;
    });
  }, [
    agentPreferencesRepository,
    dataResetCoordinator,
    hostRetirementOwner,
    providerSettingsRepository,
    refreshStorageUsageV1,
    resetCredentialVaultV1,
    resetProductPreferences,
    retireHostV1,
    workspaceAuthority,
    programPackages,
  ]);

  useLayoutEffect(() => {
    resetRemoteRef.current = () => {
      setClearAll({ phase: "clearing" });
      void retireHostV1("forgotten");
      window.location.reload();
    };
  }, [retireHostV1]);

  useEffect(() => {
    if (dataResetCoordinator === null) return undefined;
    return subscribeBrowserDataResetRemoteV1({
      coordinator: dataResetCoordinator,
      isLocalResetPending: () => clearAllPendingRef.current,
      isAccepting: agentDrainRegistry.isAccepting,
      onRemoteReset: () => resetRemoteRef.current(),
    });
  }, [agentDrainRegistry.isAccepting, dataResetCoordinator]);

  const activeModel: ProgramSurfaceActiveModelV1 | null = activeChoice === null
    ? deterministicAgent ? { contextWindow: 32_768, maximumOutputTokens: 8_192 } : null
    : { contextWindow: activeChoice.contextWindow, maximumOutputTokens: activeChoice.maxTokens };

  const settingsProps = useMemo<ProgramAgentProviderOwnerV1["settingsProps"]>(() => ({
    catalog: providerCatalog,
    customProfiles: providerSettingsSnapshot.customProfiles,
    enabledBuiltinModels: providerSettingsSnapshot.enabledBuiltinModels,
    lastSuccessfulBuiltinModel: providerSettingsSnapshot.lastSuccessfulModel?.kind === "builtin"
      ? providerSettingsSnapshot.lastSuccessfulModel
      : null,
    connectionTest,
    credentialOperation,
    credentialReceipt,
    vault: credentialVault,
    storageUsage,
    clearAll,
    initialSection: settingsInitialSection,
    onRetryCatalog: loadProviderCatalogV1,
    onSaveCredential: saveProviderCredentialV1,
    onTestConnection: testProviderConnectionV1,
    onSetVaultPassword: setCredentialVaultPasswordV1,
    onUseAutomaticVault: useAutomaticCredentialVaultV1,
    onUnlockVault: unlockCredentialVaultV1,
    onLockVault: lockCredentialVaultV1,
    onForgetCredential: forgetCredentialV1,
    onRefreshStorageUsage: refreshStorageUsageV1,
    onClearAllData: clearAllDataV1,
    onSetBuiltinModelEnabled: setBuiltinModelEnabledV1,
    onCreateCustomProfile: createCustomProviderProfileV1,
    onRemoveCustomProfile: removeCustomProviderProfileV1,
  }), [
    clearAll,
    clearAllDataV1,
    connectionTest,
    createCustomProviderProfileV1,
    credentialOperation,
    credentialReceipt,
    credentialVault,
    forgetCredentialV1,
    loadProviderCatalogV1,
    lockCredentialVaultV1,
    providerCatalog,
    providerSettingsSnapshot,
    refreshStorageUsageV1,
    removeCustomProviderProfileV1,
    saveProviderCredentialV1,
    setBuiltinModelEnabledV1,
    setCredentialVaultPasswordV1,
    settingsInitialSection,
    storageUsage,
    testProviderConnectionV1,
    unlockCredentialVaultV1,
    useAutomaticCredentialVaultV1,
  ]);

  return {
    runtime,
    agentHost,
    forgetAgent: forgetAgentV1,
    controlSnapshot,
    readiness,
    activeModel,
    providerModel,
    settingsOpen,
    settingsInitialSection,
    openSettings,
    closeSettings,
    settingsProps,
  };
}

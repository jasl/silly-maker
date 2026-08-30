// SPDX-License-Identifier: MIT
import { LoaderCircle, RotateCcw, TriangleAlert } from "lucide-react";
import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type {
  BrowserPiCustomModelApiV1,
  BrowserPiModelSelectionV1,
  BrowserPiReasoningEffortV1,
  BrowserPiWorkerRuntimeV1,
} from "../agent/browser-pi-worker-protocol.ts";
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
import {
  activeAgentUsesAnyCredentialBindingV1,
  shouldRevokeAgentAfterBuiltinModelVisibilityChangeV1,
} from "../credential/provider-credential-currentness.ts";
import {
  getSillyOsCopyV1,
  resolveSillyOsCopyV1,
  resolveSillyOsLocaleQueryOverrideV1,
  type SillyOsLocaleV1,
} from "../content/copy.ts";
import type {
  CreatorControllerV1,
  CreatorDurabilityStateV1,
} from "../product/creator-controller.ts";
import { creatorProcessExecutionLeaseRenewalIntervalMillisecondsV1 } from "../product/creator-controller.ts";
import type { CreatorAgentRunRequestV1 } from "../product/contracts.ts";
import {
  createBrowserDataResetCoordinatorV1,
  runBrowserDataResetOperationV1,
  subscribeBrowserDataResetRemoteV1,
  type BrowserDataResetCoordinatorV1,
} from "../product/browser-data-reset-coordinator.ts";
import type { BrowserProgramWorkspaceAuthorityV1 } from "../product/browser-program-workspace-authority.ts";
import type { ProgramNetworkAccessV1 } from "../product/program-network-access.ts";
import {
  createBrowserProductPreferencesRepositoryV1,
  defaultBrowserProductPreferencesSnapshotV1,
  type BrowserProductPreferencesRepositoryV1,
  type SillyOsThemeModeV1,
} from "../product/browser-product-preferences-repository.ts";
import {
  applySillyOsDocumentPreferencesV1,
  resolveSillyOsColorSchemeV1,
} from "../product/browser-product-theme.ts";
import {
  browserAgentPreferencesRevisionV1,
  createBrowserAgentPreferencesRepositoryV1,
  defaultBrowserAgentReasoningEffortV1,
  type BrowserAgentPreferencesRepositoryV1,
  type BrowserAgentPreferencesSnapshotV1,
} from "../product/browser-agent-preferences-repository.ts";
import { recommendedBrowserProviderBuiltinModelRefsV1 } from "../product/browser-provider-model-recommendations.ts";
import { browserWorkspaceDownloadFileNameMaximumUtf8BytesV1 } from "../workspace/browser-workspace-host-protocol.ts";
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
import {
  type AgentRunLeaseMonitorV1,
  hasUnownedProcessExecutionV1,
  pollOwnedAgentRunLeaseV1,
  pollPassiveProcessProjectionV1,
  recoverLostAgentRunExecutionV1,
  startAgentRunLeaseMonitorV1,
} from "./agent-run-lease-monitor.ts";
import { CreatorHomeV1 } from "./creator-home.tsx";
import {
  creatorVaultCanHandoffProviderCredentialV1,
  creatorVaultHasProviderCredentialV1,
  type CreatorReadinessRecoveryTargetV1,
  projectCreatorReadinessV1,
  projectCreatorVaultStatusV1,
} from "./creator-readiness.ts";
import { ButtonV1 } from "./design-system/button.tsx";
import { CollectionStateV1 } from "./collection-state.tsx";
import { SillyOsOverlayHostV1 } from "./design-system/overlay-host.tsx";
import {
  createDefaultProgramWorkspaceSessionViewStateV1,
  type ProgramWorkspaceSessionViewStateV1,
  ProgramWorkspaceV1,
} from "./program-workspace.tsx";
import {
  type ProviderSettingsCatalogV1,
  type ProviderSettingsClearAllV1,
  type ProviderSettingsConnectionTestV1,
  type ProviderSettingsCredentialOperationV1,
  type ProviderSettingsCredentialReceiptV1,
  type ProviderSettingsCustomProfileDraftV1,
  type ProviderSettingsCustomProfileV1,
  type ProviderSettingsSectionV1,
  type ProviderSettingsSelectionV1,
  type ProviderSettingsStorageEstimateV1,
  type ProviderSettingsStorageUsageV1,
  type ProviderSettingsVaultOperationV1,
  type ProviderSettingsVaultV1,
  ProviderSettingsV1,
} from "./provider-settings.tsx";
import { projectProviderSettingsCatalogV1 } from "./provider-settings-catalog.ts";
import type { WorkpieceWorkspaceExportV1 } from "./workpiece-pane.tsx";
import "./design-system/tokens.css";
import "./design-system/components.css";
import "./collection-state.css";
import "./composer-model-picker.css";
import "./creator-home.css";
import "./settings.css";
import "./provider-settings.css";
import "./chat.css";
import "./workspace-view.css";
import "./silly-os.css";
import "./design-system/tailwind.css";

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

/**
 * Makes Process identity the lifetime boundary for rich Conversation UI while
 * leaving the surrounding product shell mounted.
 */
export function ActiveProcessMountBoundaryV1({
  processId,
  children,
}: {
  readonly processId: string;
  readonly children: ReactNode;
}): ReactNode {
  return <Fragment key={processId}>{children}</Fragment>;
}

export interface ProgramWorkspaceSessionViewStateStoreV1 {
  read(processId: string): ProgramWorkspaceSessionViewStateV1;
  write(processId: string, state: ProgramWorkspaceSessionViewStateV1): void;
  clear(): void;
}

/**
 * Retains only inexpensive, serializable view preferences while a Process rich
 * UI subtree is unmounted. Transcript DOM and other React-owned resources stay
 * inside the keyed Process lifetime.
 */
export function createProgramWorkspaceSessionViewStateStoreV1(): ProgramWorkspaceSessionViewStateStoreV1 {
  const states = new Map<string, ProgramWorkspaceSessionViewStateV1>();
  return {
    read(processId) {
      return states.get(processId) ?? createDefaultProgramWorkspaceSessionViewStateV1();
    },
    write(processId, state) {
      states.set(processId, { ...state });
    },
    clear() {
      states.clear();
    },
  };
}

type BrowserCreatorAgentModuleV1 = typeof import("../agent/creator-agent-port.ts");
type BrowserNetworkBrokerModuleV1 =
  typeof import("../network/browser-network-broker-frame-transport.ts");
type BrowserCredentialVaultModuleV1 =
  typeof import("../credential/browser-credential-vault-port.ts");
type BrowserCreatorAgentPortV1 = ReturnType<
  BrowserCreatorAgentModuleV1["createBrowserCreatorAgentPortV1"]
>;
type BrowserCreatorAgentSnapshotV1 = ReturnType<BrowserCreatorAgentPortV1["getSnapshot"]>;
type BrowserCreatorAgentExportInputV1 = Parameters<BrowserCreatorAgentPortV1["exportWorkspace"]>[0];
type BrowserCreatorAgentExportReadyV1 = Parameters<
  BrowserCreatorAgentExportInputV1["onReady"]
>[0];
type BrowserCredentialVaultPortV1 = ReturnType<
  BrowserCredentialVaultModuleV1["createBrowserCredentialVaultPortV2"]
>;
type PiAgentSetupStatusV1 =
  | "loading"
  | "available"
  | "saving"
  | "credential_saved"
  | "testing"
  | "ready"
  | "test_failed"
  | "failed";
type SettingsReturnTargetV1 =
  | "home"
  | "home-models"
  | "home-readiness"
  | "workspace"
  | "workspace-models"
  | "workspace-readiness";

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

function createAgentPreferencesRepositoryV1(): BrowserAgentPreferencesRepositoryV1 | null {
  if (typeof window === "undefined") return null;
  try {
    return createBrowserAgentPreferencesRepositoryV1({ storage: window.localStorage });
  } catch {
    return null;
  }
}

function createProductPreferencesRepositoryV1(): BrowserProductPreferencesRepositoryV1 | null {
  if (typeof window === "undefined") return null;
  try {
    return createBrowserProductPreferencesRepositoryV1({
      storage: window.localStorage,
      eventTarget: window,
    });
  } catch {
    return null;
  }
}

function subscribeUnavailableProductPreferencesV1(): () => void {
  return () => undefined;
}

function getUnavailableProductPreferencesV1() {
  return defaultBrowserProductPreferencesSnapshotV1;
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

interface CreatorProviderModelChoiceV1 {
  readonly value: string;
  readonly modelName: string;
  readonly providerName: string;
  readonly supportedReasoningEfforts: readonly BrowserPiReasoningEffortV1[];
  readonly defaultReasoningEffort: BrowserPiReasoningEffortV1;
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
          supportedReasoningEfforts: model.supportedReasoningEfforts,
          defaultReasoningEffort: model.defaultReasoningEffort,
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
    supportedReasoningEfforts: Object.freeze(["off"]),
    defaultReasoningEffort: "off",
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

function providerSettingsVaultFromListV1(
  snapshot: CredentialVaultListV2,
): ProviderSettingsVaultV1 {
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

const workspaceArchiveFileNameSuffixV1 = ".sillyos.zip";
const workspaceArchiveFileNameSlugMaximumUtf8BytesV1 =
  browserWorkspaceDownloadFileNameMaximumUtf8BytesV1 -
  new TextEncoder().encode(workspaceArchiveFileNameSuffixV1).byteLength;

function utf8PrefixV1(value: string, maximumBytes: number): string {
  const encoder = new TextEncoder();
  let byteLength = 0;
  let result = "";
  for (const character of value) {
    const characterBytes = encoder.encode(character).byteLength;
    if (byteLength + characterBytes > maximumBytes) break;
    result += character;
    byteLength += characterBytes;
  }
  return result;
}

export function workspaceArchiveFileNameV1(programName: string): string {
  const slug = programName.toLowerCase().replaceAll(/[^\p{Letter}\p{Number}]+/gu, "-").replaceAll(
    /^-+|-+$/gu,
    "",
  );
  const boundedSlug = utf8PrefixV1(
    slug.length === 0 ? "sillyos-program" : slug,
    workspaceArchiveFileNameSlugMaximumUtf8BytesV1,
  ).replaceAll(/-+$/gu, "");
  return `${
    boundedSlug.length === 0 ? "sillyos-program" : boundedSlug
  }${workspaceArchiveFileNameSuffixV1}`;
}

const workspaceDownloadHandoffMillisecondsV1 = 1_000;
const credentialSaveReceiptMillisecondsV1 = 2_400;
const resolvedVoidPromiseV1 = Promise.resolve();

/** Retains the Sandbox-owned archive through the browser download handoff. */
async function commitWorkspaceDownloadV1(
  ready: BrowserCreatorAgentExportReadyV1,
  startDownload: () => Promise<void>,
  onCommitted: () => void,
): Promise<"release" | "cancel"> {
  await startDownload();
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
  const [processViewStates] = useState(createProgramWorkspaceSessionViewStateStoreV1);
  const [processConversationRestorePending, setProcessConversationRestorePending] = useState(false);
  const processConversationRestoreEpochRef = useRef(0);
  const [productPreferencesRepository] = useState(createProductPreferencesRepositoryV1);
  const productPreferences = useSyncExternalStore(
    productPreferencesRepository?.subscribe ?? subscribeUnavailableProductPreferencesV1,
    productPreferencesRepository?.getSnapshot ?? getUnavailableProductPreferencesV1,
    getUnavailableProductPreferencesV1,
  );
  const [locale, setLocale] = useState<SillyOsLocaleV1>(() =>
    resolveSillyOsCopyV1(productPreferences.locale).locale
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches
  );
  const colorScheme = resolveSillyOsColorSchemeV1(productPreferences.theme, systemPrefersDark);
  const [piRuntime] = useState(requestedBrowserPiRuntimeV1);
  const internalPiTest = piRuntime === "deterministic_test";
  const [piAgentSetupStatus, setPiAgentSetupStatus] = useState<PiAgentSetupStatusV1>("loading");
  const [activeProviderSelection, setActiveProviderSelection] = useState<
    BrowserPiModelSelectionV1 | null
  >(null);
  const [providerModelSelectionPending, setProviderModelSelectionPending] = useState(false);
  const [reasoningEffortSelectionPending, setReasoningEffortSelectionPending] = useState(false);
  const [effectiveReasoningEffort, setEffectiveReasoningEffort] = useState<
    BrowserPiReasoningEffortV1 | null
  >(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providerCatalog, setProviderCatalog] = useState<ProviderSettingsCatalogV1>({
    phase: "loading",
  });
  const [providerSettingsInitialization] = useState(initializeProviderSettingsV1);
  const providerSettingsRepository = providerSettingsInitialization.repository;
  const [agentPreferencesInitialization] = useState(initializeAgentPreferencesV1);
  const agentPreferencesRepository = agentPreferencesInitialization.repository;
  const [dataResetCoordinator] = useState(createDataResetCoordinatorV1);
  const [providerSettingsSnapshot, setProviderSettingsSnapshot] = useState<
    BrowserProviderSettingsSnapshotV1
  >(providerSettingsInitialization.snapshot);
  const [agentPreferencesSnapshot, setAgentPreferencesSnapshot] = useState<
    BrowserAgentPreferencesSnapshotV1
  >(agentPreferencesInitialization.snapshot);
  const [credentialVault, setCredentialVault] = useState<ProviderSettingsVaultV1>({
    phase: "unavailable",
    diagnosticCode: "initializing",
    protection: null,
    state: null,
    bindings: Object.freeze([]),
  });
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

  useEffect(() => {
    const receipt = credentialReceipt;
    if (receipt === null) return undefined;
    const timeout = setTimeout(() => {
      setCredentialReceipt((current) => current === receipt ? null : current);
    }, credentialSaveReceiptMillisecondsV1);
    return () => clearTimeout(timeout);
  }, [credentialReceipt]);
  const [settingsInitialSection, setSettingsInitialSection] = useState<ProviderSettingsSectionV1>(
    "general",
  );
  const customProviderProfiles = providerSettingsSnapshot.customProfiles;
  const [agentPort, setAgentPort] = useState<BrowserCreatorAgentPortV1 | null>(null);
  const [agentSnapshot, setAgentSnapshot] = useState<BrowserCreatorAgentSnapshotV1 | null>(null);
  const [workspaceExport, setWorkspaceExport] = useState<WorkpieceWorkspaceExportV1>({
    phase: "idle",
  });
  const [programNetworkAccess, setProgramNetworkAccess] = useState<
    ProgramNetworkAccessV1 | null
  >(null);
  const [networkAccessMutationPending, setNetworkAccessMutationPending] = useState(false);
  const agentFactoryRef = useRef<
    BrowserCreatorAgentModuleV1["createBrowserCreatorAgentPortV1"] | null
  >(null);
  const networkBrokerFactoryRef = useRef<
    BrowserNetworkBrokerModuleV1["createBrowserNetworkBrokerFrameTransportV1"] | null
  >(null);
  const credentialVaultPortRef = useRef<BrowserCredentialVaultPortV1 | null>(null);
  const credentialVaultStateRef = useRef<ProviderSettingsVaultV1>(credentialVault);
  const credentialVaultEpochRef = useRef(0);
  const credentialVaultOperationEpochRef = useRef(0);
  const credentialVaultSettlementRef = useRef<Promise<void>>(resolvedVoidPromiseV1);
  const agentPortRef = useRef<BrowserCreatorAgentPortV1 | null>(null);
  const activeProviderSelectionRef = useRef<BrowserPiModelSelectionV1 | null>(
    activeProviderSelection,
  );
  const agentSetupEpochRef = useRef(0);
  const agentConfigurationPendingRef = useRef(false);
  const connectionTestEpochRef = useRef(0);
  const providerModelSelectionEpochRef = useRef(0);
  const providerModelSelectionPendingRef = useRef(false);
  const providerModelSelectionSettlementRef = useRef<Promise<void>>(resolvedVoidPromiseV1);
  const reasoningEffortSelectionEpochRef = useRef(0);
  const reasoningEffortSelectionPendingRef = useRef(false);
  const reasoningEffortSelectionSettlementRef = useRef<Promise<void>>(resolvedVoidPromiseV1);
  const providerCatalogEpochRef = useRef(0);
  const settingsReturnTargetRef = useRef<SettingsReturnTargetV1>("home");
  const agentSetupSettlementRef = useRef<Promise<void>>(resolvedVoidPromiseV1);
  const agentTeardownRef = useRef<Promise<void>>(resolvedVoidPromiseV1);
  const agentWorkspaceLifecycleRef = useRef<Promise<void>>(resolvedVoidPromiseV1);
  const agentTerminalSettlementRef = useRef<Promise<void>>(resolvedVoidPromiseV1);
  const ownedAgentRunsRef = useRef(new Map<string, CreatorAgentRunRequestV1>());
  const leaseLostAgentRunIdsRef = useRef(new Set<string>());
  const ownedAgentLeaseMonitorRef = useRef<AgentRunLeaseMonitorV1 | null>(null);
  const unownedProcessRecoveryMonitorRef = useRef<AgentRunLeaseMonitorV1 | null>(null);
  const agentLeaseMonitorSettlementsRef = useRef(new Set<Promise<void>>());
  const workspaceExportEpochRef = useRef(0);
  const networkAccessEpochRef = useRef(0);
  const networkAccessMutationPendingRef = useRef(false);
  const storageUsageEpochRef = useRef(0);
  const clearAllPendingRef = useRef(false);
  const remoteResetActionRef = useRef<() => void>(() => undefined);
  const reportFailureRef = useRef(reportFailure);
  const workspaceExportAbortRef = useRef<AbortController | null>(null);
  const claimedTerminalRunIdsRef = useRef(new Set<string>());
  const controllerSnapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const snapshot = controllerSnapshot;
  const durability = controllerSnapshot.durability;
  const copy = getSillyOsCopyV1(locale);
  const routedProgram = snapshot.route === "process"
    ? snapshot.activeProcess?.subject?.currentProgram ?? null
    : null;
  const routedProgramId = routedProgram?.programId ?? null;
  const routedProgramIdRef = useRef(routedProgramId);
  const routedWorkspaceId = snapshot.route === "process"
    ? snapshot.activeProcess?.subject?.head.workspaceId ?? null
    : null;
  const activeProcessId = snapshot.route === "process"
    ? snapshot.activeProcess?.process.processId ?? null
    : null;
  const activeProcessAttemptId = snapshot.route === "process"
    ? snapshot.activeProcess?.process.activeAttempt?.attemptId ?? null
    : null;
  const executionWorkspaceSessionId = agentSnapshot?.workspace.descriptor?.workspaceSessionId ??
    null;

  useLayoutEffect(() => {
    credentialVaultStateRef.current = credentialVault;
    activeProviderSelectionRef.current = activeProviderSelection;
    reportFailureRef.current = reportFailure;
    routedProgramIdRef.current = routedProgramId;
  }, [activeProviderSelection, credentialVault, reportFailure, routedProgramId]);

  const initializationFailuresReportedRef = useRef(false);
  useEffect(() => {
    if (initializationFailuresReportedRef.current) return;
    initializationFailuresReportedRef.current = true;
    if ("failure" in providerSettingsInitialization) {
      reportFailure(
        "silly_os.provider_settings_load_failed",
        providerSettingsInitialization.failure,
      );
    }
    if ("failure" in agentPreferencesInitialization) {
      reportFailure(
        "silly_os.agent_preferences_load_failed",
        agentPreferencesInitialization.failure,
      );
    }
  }, [agentPreferencesInitialization, providerSettingsInitialization, reportFailure]);

  useEffect(() => {
    if (typeof matchMedia !== "function") return undefined;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const onChangeV1 = (event: MediaQueryListEvent): void => setSystemPrefersDark(event.matches);
    setSystemPrefersDark(query.matches);
    query.addEventListener("change", onChangeV1);
    return () => query.removeEventListener("change", onChangeV1);
  }, []);

  useEffect(() => {
    const navigationOverride = resolveSillyOsLocaleQueryOverrideV1();
    const next = navigationOverride ?? resolveSillyOsCopyV1(productPreferences.locale).locale;
    if (next !== locale) setLocale(next);
  }, [locale, productPreferences.locale]);

  useEffect(() => {
    applySillyOsDocumentPreferencesV1({ document, locale, colorScheme });
  }, [colorScheme, locale]);

  useEffect(() => {
    const epoch = ++networkAccessEpochRef.current;
    setProgramNetworkAccess(null);
    if (routedProgramId === null) return;
    void workspaceAuthority.loadProgramNetworkAccess(routedProgramId).then((access) => {
      if (networkAccessEpochRef.current !== epoch) return;
      setProgramNetworkAccess(access);
    }, (error: unknown) => {
      if (networkAccessEpochRef.current !== epoch) return;
      reportFailureRef.current("silly_os.browser_network_access_load_failed", error);
    });
  }, [routedProgramId, workspaceAuthority]);

  const queueAgentPortTeardownV1 = useCallback((
    port: BrowserCreatorAgentPortV1,
    finalPhase: "forgotten" | "disposed",
  ): Promise<void> => {
    const precedingTeardown = agentTeardownRef.current;
    const modelSelectionSettlement = providerModelSelectionSettlementRef.current;
    const reasoningSelectionSettlement = reasoningEffortSelectionSettlementRef.current;
    const workspaceSettlement = agentWorkspaceLifecycleRef.current;
    const terminalSettlement = agentTerminalSettlementRef.current;
    const teardown = finalPhase === "forgotten"
      ? port.forget().catch(() => undefined)
      : Promise.all([
        precedingTeardown.catch(() => undefined),
        modelSelectionSettlement.catch(() => undefined),
        reasoningSelectionSettlement.catch(() => undefined),
        workspaceSettlement.catch(() => undefined),
        terminalSettlement.catch(() => undefined),
      ]).then(() => port.dispose()).catch(() => undefined);
    agentTeardownRef.current = teardown;
    return teardown;
  }, []);

  const trackAgentLeaseMonitorDrainV1 = useCallback((
    monitor: AgentRunLeaseMonitorV1,
  ): Promise<void> => {
    const settlement = monitor.drain().catch((error: unknown) => {
      reportFailureRef.current("silly_os.process_execution_monitor_failed", error);
    });
    agentLeaseMonitorSettlementsRef.current.add(settlement);
    void settlement.finally(() => agentLeaseMonitorSettlementsRef.current.delete(settlement));
    return settlement;
  }, []);

  const drainAgentLeaseMonitorsV1 = useCallback(async (): Promise<void> => {
    const monitors = [
      ownedAgentLeaseMonitorRef.current,
      unownedProcessRecoveryMonitorRef.current,
    ].filter((monitor): monitor is AgentRunLeaseMonitorV1 => monitor !== null);
    ownedAgentLeaseMonitorRef.current = null;
    unownedProcessRecoveryMonitorRef.current = null;
    for (const monitor of monitors) void trackAgentLeaseMonitorDrainV1(monitor);
    while (agentLeaseMonitorSettlementsRef.current.size > 0) {
      await Promise.all([...agentLeaseMonitorSettlementsRef.current]);
    }
  }, [trackAgentLeaseMonitorDrainV1]);

  const drainAgentGraphV1 = useCallback(async (): Promise<void> => {
    agentSetupEpochRef.current += 1;
    agentConfigurationPendingRef.current = false;
    connectionTestEpochRef.current += 1;
    providerModelSelectionEpochRef.current += 1;
    providerModelSelectionPendingRef.current = false;
    reasoningEffortSelectionEpochRef.current += 1;
    reasoningEffortSelectionPendingRef.current = false;
    providerCatalogEpochRef.current += 1;
    workspaceExportEpochRef.current += 1;
    workspaceExportAbortRef.current?.abort();
    workspaceExportAbortRef.current = null;
    claimedTerminalRunIdsRef.current.clear();
    ownedAgentRunsRef.current.clear();
    leaseLostAgentRunIdsRef.current.clear();
    credentialVaultEpochRef.current += 1;
    credentialVaultOperationEpochRef.current += 1;
    const credentialVaultPort = credentialVaultPortRef.current;
    credentialVaultPortRef.current = null;
    credentialVaultPort?.close();
    const current = agentPortRef.current;
    agentPortRef.current = null;
    if (current !== null) void queueAgentPortTeardownV1(current, "disposed");
    await Promise.all([
      agentSetupSettlementRef.current.catch(() => undefined),
      providerModelSelectionSettlementRef.current.catch(() => undefined),
      reasoningEffortSelectionSettlementRef.current.catch(() => undefined),
      agentWorkspaceLifecycleRef.current.catch(() => undefined),
      agentTerminalSettlementRef.current.catch(() => undefined),
      drainAgentLeaseMonitorsV1(),
      agentTeardownRef.current.catch(() => undefined),
      credentialVaultSettlementRef.current.catch(() => undefined),
    ]);
    await agentTeardownRef.current.catch(() => undefined);
  }, [drainAgentLeaseMonitorsV1, queueAgentPortTeardownV1]);

  useEffect(() => {
    void controller.initialize();
  }, [controller]);

  useEffect(() => () => processViewStates.clear(), [processViewStates]);

  useEffect(() => {
    if (!agentDrainRegistry.isAccepting()) return undefined;
    let current = true;
    void Promise.all([
      import("../agent/creator-agent-port.ts"),
      import("../network/browser-network-broker-frame-transport.ts"),
    ]).then(
      ([agentModule, networkModule]) => {
        if (!current || !agentDrainRegistry.isAccepting()) return;
        agentFactoryRef.current = agentModule.createBrowserCreatorAgentPortV1;
        networkBrokerFactoryRef.current = networkModule.createBrowserNetworkBrokerFrameTransportV1;
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
      networkBrokerFactoryRef.current = null;
    };
  }, [agentDrainRegistry, reportFailure]);

  useEffect(() => {
    if (internalPiTest || !agentDrainRegistry.isAccepting()) return undefined;
    const epoch = ++credentialVaultEpochRef.current;
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
        if (
          !current || credentialVaultEpochRef.current !== epoch ||
          !agentDrainRegistry.isAccepting()
        ) return;
        const port = createBrowserCredentialVaultPortV2();
        credentialVaultPortRef.current = port;
        const vaultSnapshot = await port.client.initialize();
        if (
          !current || credentialVaultEpochRef.current !== epoch ||
          credentialVaultPortRef.current !== port || !agentDrainRegistry.isAccepting()
        ) return;
        const nextVault = providerSettingsVaultFromListV1(vaultSnapshot);
        credentialVaultStateRef.current = nextVault;
        setCredentialVault(nextVault);
      },
    ).catch((error: unknown) => {
      if (!current || credentialVaultEpochRef.current !== epoch) return;
      credentialVaultPortRef.current?.close();
      credentialVaultPortRef.current = null;
      setCredentialVault({
        phase: "unavailable",
        diagnosticCode: credentialVaultDiagnosticCodeV1(error),
        protection: null,
        state: null,
        bindings: Object.freeze([]),
      });
      reportFailureRef.current("silly_os.credential_vault_unavailable", error);
    });
    credentialVaultSettlementRef.current = initialize.then(() => undefined);
    return () => {
      current = false;
      credentialVaultEpochRef.current += 1;
      const port = credentialVaultPortRef.current;
      credentialVaultPortRef.current = null;
      port?.close();
    };
  }, [agentDrainRegistry, internalPiTest]);

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
    workspaceExportEpochRef.current += 1;
    workspaceExportAbortRef.current?.abort();
    workspaceExportAbortRef.current = null;
    setWorkspaceExport({ phase: "idle" });
  }, [executionWorkspaceSessionId, routedProgramId, routedWorkspaceId]);

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

  const recoverLostOwnedAgentRunV1 = useCallback(async (
    port: BrowserCreatorAgentPortV1,
    run: CreatorAgentRunRequestV1,
  ): Promise<void> => {
    leaseLostAgentRunIdsRef.current.add(run.agentRunId);
    ownedAgentRunsRef.current.delete(run.agentRunId);
    await recoverLostAgentRunExecutionV1({
      cancelRun: async () => {
        const cancelled = await port.cancel(run.agentRunId);
        if (cancelled.kind === "unavailable") {
          reportFailureRef.current(
            "silly_os.browser_pi_cancel_after_lease_loss_failed",
            cancelled.diagnostic,
          );
        }
      },
      releaseWorkspace: async () => {
        if (!await queueAgentWorkspaceV1(port, null)) {
          reportFailureRef.current(
            "silly_os.browser_pi_workspace_release_after_lease_loss_failed",
            run.processId,
          );
        }
      },
      reloadProcess: async () => {
        const recovered = await controller.reloadLatestTranscript();
        if (recovered.kind === "failed") {
          reportFailureRef.current(
            "silly_os.process_execution_recovery_failed",
            recovered,
          );
        }
      },
    });
  }, [controller, queueAgentWorkspaceV1]);

  useEffect(() => {
    const port = agentPortRef.current;
    const terminal = agentSnapshot?.terminalRuns[0];
    if (
      port === null || terminal === undefined || !canConsumeAgentTerminalV1(durability.phase) ||
      claimedTerminalRunIdsRef.current.has(terminal.run.agentRunId)
    ) return;
    claimedTerminalRunIdsRef.current.add(terminal.run.agentRunId);
    ownedAgentRunsRef.current.delete(terminal.run.agentRunId);
    const settlement = (async (): Promise<void> => {
      let releaseLeaseLostMarker = true;
      try {
        if (leaseLostAgentRunIdsRef.current.has(terminal.run.agentRunId)) {
          const acknowledgement = await port.acknowledgeTerminal(terminal.run.agentRunId);
          if (acknowledgement.kind === "workspace_unavailable") {
            releaseLeaseLostMarker = false;
            reportFailure(
              "silly_os.browser_pi_workspace_receipt_acknowledge_failed",
              acknowledgement.diagnostic,
            );
          }
          return;
        }
        const persistence = await controller.recordAgentRunTerminal(terminal);
        if (persistence.kind === "busy") return;
        if (persistence.kind === "completed" && persistence.value.kind !== "applied") {
          await recoverLostOwnedAgentRunV1(port, terminal.run).catch(
            (error: unknown) => {
              reportFailure("silly_os.process_execution_recovery_failed", error);
            },
          );
        }
        const acknowledgement = await acknowledgeAppliedAgentTerminalV1({
          persistence,
          agentRunId: terminal.run.agentRunId,
          acknowledgeTerminal: (agentRunId) => port.acknowledgeTerminal(agentRunId),
        });
        if (acknowledgement.kind === "retained") {
          reportFailure("silly_os.browser_pi_terminal_rejected", persistence);
        } else if (acknowledgement.kind === "workspace_unavailable") {
          if (leaseLostAgentRunIdsRef.current.has(terminal.run.agentRunId)) {
            releaseLeaseLostMarker = false;
          }
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
        if (releaseLeaseLostMarker) {
          leaseLostAgentRunIdsRef.current.delete(terminal.run.agentRunId);
        }
      }
    })();
    agentTerminalSettlementRef.current = settlement;
  }, [
    agentSnapshot,
    controller,
    durability.phase,
    recoverLostOwnedAgentRunV1,
    reportFailure,
  ]);

  useEffect(() => {
    const port = agentPortRef.current;
    const activeRunId = agentSnapshot?.activeRunId ?? null;
    const run = activeRunId === null ? null : ownedAgentRunsRef.current.get(activeRunId) ?? null;
    if (port === null || run === null || !agentDrainRegistry.isAccepting()) return undefined;

    const monitor = startAgentRunLeaseMonitorV1({
      intervalMilliseconds: creatorProcessExecutionLeaseRenewalIntervalMillisecondsV1,
      poll: () =>
        pollOwnedAgentRunLeaseV1({
          renew: async () => {
            const renewal = await controller.renewAgentRunLease(run);
            return renewal.kind === "completed" ? renewal.value : "lost";
          },
          onLost: () => recoverLostOwnedAgentRunV1(port, run),
        }),
      onError: (error) => {
        reportFailureRef.current("silly_os.process_execution_renewal_failed", error);
      },
    });
    ownedAgentLeaseMonitorRef.current = monitor;
    return () => {
      if (ownedAgentLeaseMonitorRef.current === monitor) {
        ownedAgentLeaseMonitorRef.current = null;
      }
      void trackAgentLeaseMonitorDrainV1(monitor);
    };
  }, [
    agentDrainRegistry,
    agentSnapshot?.activeRunId,
    controller,
    recoverLostOwnedAgentRunV1,
    trackAgentLeaseMonitorDrainV1,
  ]);

  useEffect(() => {
    if (
      activeProcessId === null ||
      (activeProcessAttemptId !== null && ownedAgentRunsRef.current.has(activeProcessAttemptId)) ||
      !agentDrainRegistry.isAccepting()
    ) return undefined;
    const processId = activeProcessId;
    let recoveryFailureReported = false;

    const monitor = startAgentRunLeaseMonitorV1({
      intervalMilliseconds: creatorProcessExecutionLeaseRenewalIntervalMillisecondsV1,
      poll: () =>
        pollPassiveProcessProjectionV1({
          processId,
          read: () => {
            const current = controller.getSnapshot();
            const process = current.route === "process" ? current.activeProcess?.process : null;
            return process === null || process === undefined ? null : {
              processId: process.processId,
              activeAttemptId: process.activeAttempt?.attemptId ?? null,
            };
          },
          ownsAttempt: (attemptId) => ownedAgentRunsRef.current.has(attemptId),
          refresh: async () => {
            const recovered = await controller.refreshActiveProcess();
            if (recovered.kind === "failed") {
              if (!recoveryFailureReported) {
                recoveryFailureReported = true;
                reportFailureRef.current("silly_os.process_execution_recovery_failed", recovered);
              }
            } else {
              recoveryFailureReported = false;
            }
          },
        }),
      onError: (error) => {
        reportFailureRef.current("silly_os.process_execution_recovery_failed", error);
      },
    });
    unownedProcessRecoveryMonitorRef.current = monitor;
    return () => {
      if (unownedProcessRecoveryMonitorRef.current === monitor) {
        unownedProcessRecoveryMonitorRef.current = null;
      }
      void trackAgentLeaseMonitorDrainV1(monitor);
    };
  }, [
    agentDrainRegistry,
    activeProcessAttemptId,
    activeProcessId,
    controller,
    trackAgentLeaseMonitorDrainV1,
  ]);

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

  const refreshStorageUsageV1 = useCallback((): void => {
    const epoch = ++storageUsageEpochRef.current;
    setStorageUsage({
      control: { phase: "checking" },
      workspace: { phase: "checking" },
    });
    const controlEstimate = typeof navigator !== "undefined" &&
        typeof navigator.storage?.estimate === "function"
      ? navigator.storage.estimate()
      : Promise.reject(new TypeError("sillyos.storage_estimate.unavailable"));
    void Promise.allSettled([
      controlEstimate,
      workspaceAuthority.inspectStorage(),
    ]).then(([controlResult, workspaceResult]) => {
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
    });
  }, [workspaceAuthority]);

  useEffect(() => {
    if (settingsOpen && !internalPiTest) refreshStorageUsageV1();
  }, [internalPiTest, refreshStorageUsageV1, settingsOpen]);

  const changeLocaleV1 = (next: SillyOsLocaleV1): void => {
    if (productPreferencesRepository !== null) {
      try {
        productPreferencesRepository.setLocale(next);
      } catch (error) {
        reportFailureRef.current("silly_os.product_preferences_save_failed", error);
      }
    }
    setLocale(next);
    const url = new URL(location.href);
    url.searchParams.set("locale", next);
    history.replaceState(history.state, "", url);
  };

  const changeThemeV1 = (next: SillyOsThemeModeV1): void => {
    if (productPreferencesRepository === null) return;
    try {
      productPreferencesRepository.setTheme(next);
    } catch (error) {
      reportFailureRef.current("silly_os.product_preferences_save_failed", error);
    }
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
    try {
      const initialization = providerSettingsRepository.initializeBuiltinModelDefaults(
        recommendedBrowserProviderBuiltinModelRefsV1(providerCatalog.providers),
      );
      const missing = initialization.snapshot.enabledBuiltinModels.filter((model) =>
        !availableBuiltinModelKeys.has(builtinModelRefKeyV1(model))
      );
      const preferred = initialization.snapshot.preferredModel;
      const preferredMissing = preferred?.kind === "builtin" &&
        !availableBuiltinModelKeys.has(builtinModelRefKeyV1(preferred));
      for (const model of missing) {
        providerSettingsRepository.setBuiltinModelEnabled(model, false);
      }
      if (preferredMissing) providerSettingsRepository.setPreferredModel(null);
      if (!initialization.initialized && missing.length === 0 && !preferredMissing) return;
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
    settingsReturnTargetRef.current = snapshot.route === "home" ? "home" : "workspace";
    setSettingsInitialSection("general");
    setSettingsOpen(true);
    if (providerCatalog.phase === "loading") loadProviderCatalogV1();
  };

  const openModelSettingsV1 = (surface: "home" | "workspace"): void => {
    settingsReturnTargetRef.current = `${surface}-models`;
    setSettingsInitialSection("providers");
    setSettingsOpen(true);
    if (providerCatalog.phase === "loading") loadProviderCatalogV1();
  };

  const openCreatorReadinessSettingsV1 = (
    surface: "home" | "workspace",
    target: Exclude<CreatorReadinessRecoveryTargetV1, null>,
  ): void => {
    settingsReturnTargetRef.current = `${surface}-readiness`;
    setSettingsInitialSection(target);
    setSettingsOpen(true);
    if (providerCatalog.phase === "loading") loadProviderCatalogV1();
  };

  const closeSettingsV1 = (): void => {
    setCredentialReceipt(null);
    setSettingsOpen(false);
    const returnTarget = settingsReturnTargetRef.current;
    const returnSelector = returnTarget === "home-models" || returnTarget === "workspace-models"
      ? `[data-model-picker-surface="${
        returnTarget === "home-models" ? "home" : "workspace"
      }"] [role="combobox"]`
      : returnTarget === "home-readiness" || returnTarget === "workspace-readiness"
      ? `[data-creator-readiness-surface="${
        returnTarget === "home-readiness" ? "home" : "workspace"
      }"] button`
      : `[data-open-settings="${returnTarget}"]`;
    const fallbackSelector = returnTarget.startsWith("home")
      ? "#creator-intent"
      : "#workspace-follow-up";
    requestAnimationFrame(() => {
      const returnElement = document.querySelector<HTMLElement>(returnSelector) ??
        document.querySelector<HTMLElement>(fallbackSelector);
      returnElement?.focus();
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

  const persistReasoningEffortPreferenceV1 = (
    preferredReasoningEffort: BrowserPiReasoningEffortV1,
  ): void => {
    if (agentPreferencesRepository === null) return;
    try {
      agentPreferencesRepository.setPreferredReasoningEffort(preferredReasoningEffort);
      setAgentPreferencesSnapshot(agentPreferencesRepository.read());
    } catch (error) {
      reportFailure("silly_os.agent_preferences_save_failed", error);
    }
  };

  const configurePiAgentCredentialV1 = (
    selection: BrowserPiModelSelectionV1 | null,
    configureCredential: (
      port: BrowserCreatorAgentPortV1,
    ) => ReturnType<BrowserCreatorAgentPortV1["configureCredential"]>,
    options: {
      readonly persistPreference?: boolean;
      readonly onConfigured?: (port: BrowserCreatorAgentPortV1) => Promise<void> | void;
    } = {},
  ): Promise<boolean> => {
    providerModelSelectionEpochRef.current += 1;
    providerModelSelectionPendingRef.current = false;
    reasoningEffortSelectionEpochRef.current += 1;
    reasoningEffortSelectionPendingRef.current = false;
    setProviderModelSelectionPending(false);
    setReasoningEffortSelectionPending(false);
    setEffectiveReasoningEffort(null);
    const factory = agentFactoryRef.current;
    const networkBrokerFactory = networkBrokerFactoryRef.current;
    if (
      !agentDrainRegistry.isAccepting() || factory === null || networkBrokerFactory === null ||
      (piRuntime === "pi_provider" && selection === null)
    ) {
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.browser_pi_adapter_unavailable", "factory_unavailable");
      return Promise.resolve(false);
    }
    const epoch = ++agentSetupEpochRef.current;
    agentConfigurationPendingRef.current = true;
    setPiAgentSetupStatus("saving");
    let port!: BrowserCreatorAgentPortV1;
    const onConnectionLost = (): void => {
      if (
        agentSetupEpochRef.current !== epoch || agentPortRef.current !== port ||
        !agentDrainRegistry.isAccepting()
      ) return;
      agentSetupEpochRef.current += 1;
      agentConfigurationPendingRef.current = false;
      connectionTestEpochRef.current += 1;
      providerModelSelectionEpochRef.current += 1;
      providerModelSelectionPendingRef.current = false;
      reasoningEffortSelectionEpochRef.current += 1;
      reasoningEffortSelectionPendingRef.current = false;
      setProviderModelSelectionPending(false);
      setReasoningEffortSelectionPending(false);
      setEffectiveReasoningEffort(null);
      workspaceExportEpochRef.current += 1;
      workspaceExportAbortRef.current?.abort();
      workspaceExportAbortRef.current = null;
      setWorkspaceExport({ phase: "idle" });
      agentPortRef.current = null;
      setAgentPort(null);
      setAgentSnapshot(null);
      activeProviderSelectionRef.current = null;
      setActiveProviderSelection(null);
      setConnectionTest({ phase: "disconnected", active: null });
      claimedTerminalRunIdsRef.current.clear();
      ownedAgentRunsRef.current.clear();
      leaseLostAgentRunIdsRef.current.clear();
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
          openNetworkBroker: () => networkBrokerFactory(),
          runtime: "deterministic_test",
          preferredReasoningEffort: agentPreferencesSnapshot.preferredReasoningEffort,
          workspaceAuthority,
        })
        : factory({
          onConnectionLost,
          openNetworkBroker: () => networkBrokerFactory(),
          runtime: "pi_provider",
          preferredReasoningEffort: agentPreferencesSnapshot.preferredReasoningEffort,
          selection: selection as BrowserPiModelSelectionV1,
          workspaceAuthority,
        });
    } catch (error) {
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.browser_pi_configure_failed", error);
      agentConfigurationPendingRef.current = false;
      return Promise.resolve(false);
    }
    const predecessor = agentPortRef.current;
    agentPortRef.current = null;
    setAgentPort(null);
    setAgentSnapshot(null);
    activeProviderSelectionRef.current = null;
    setActiveProviderSelection(null);
    claimedTerminalRunIdsRef.current.clear();
    ownedAgentRunsRef.current.clear();
    leaseLostAgentRunIdsRef.current.clear();
    if (predecessor !== null) {
      void queueAgentPortTeardownV1(predecessor, "disposed");
    }
    const setup = (async (): Promise<boolean> => {
      try {
        await agentTeardownRef.current;
        if (agentSetupEpochRef.current !== epoch || !agentDrainRegistry.isAccepting()) {
          await port.forget().catch(() => undefined);
          return false;
        }
        agentPortRef.current = port;
        setAgentPort(port);
        const configured = await configureCredential(port);
        if (
          agentSetupEpochRef.current !== epoch || agentPortRef.current !== port ||
          !agentDrainRegistry.isAccepting()
        ) return false;
        if (configured.kind !== "configured") {
          setPiAgentSetupStatus("failed");
          reportFailure("silly_os.browser_pi_configure_failed", configured.diagnostic);
          return false;
        }
        setEffectiveReasoningEffort(configured.effectiveReasoningEffort);
        const configuredSelection = piRuntime === "pi_provider" ? selection : null;
        activeProviderSelectionRef.current = configuredSelection;
        setActiveProviderSelection(configuredSelection);
        if (configuredSelection !== null && options.persistPreference === true) {
          persistProviderPreferenceV1(configuredSelection);
        }
        setPiAgentSetupStatus("credential_saved");
        await options.onConfigured?.(port);
        return agentSetupEpochRef.current === epoch && agentPortRef.current === port &&
          agentDrainRegistry.isAccepting();
      } catch (error) {
        if (
          agentSetupEpochRef.current === epoch && agentPortRef.current === port &&
          agentDrainRegistry.isAccepting()
        ) {
          setPiAgentSetupStatus("failed");
          reportFailure("silly_os.browser_pi_configure_failed", error);
        }
        return false;
      } finally {
        if (agentSetupEpochRef.current === epoch) agentConfigurationPendingRef.current = false;
      }
    })();
    agentSetupSettlementRef.current = setup.then(() => undefined);
    return setup;
  };

  const savePiAgentCredentialV1 = (
    selection: BrowserPiModelSelectionV1 | null,
    suppliedCredential: string,
    testAfterSave = false,
  ): void => {
    let credential = suppliedCredential;
    if (credential.length === 0) {
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.browser_pi_configure_failed", "credential_required");
      return;
    }
    void configurePiAgentCredentialV1(
      selection,
      (port) => {
        const configuration = port.configureCredential(credential);
        credential = "";
        return configuration;
      },
      testAfterSave
        ? {
          onConfigured: async (port): Promise<void> => {
            setPiAgentSetupStatus("testing");
            const tested = await port.testConnection();
            if (tested.kind === "ready") {
              setPiAgentSetupStatus("ready");
              return;
            }
            setPiAgentSetupStatus("test_failed");
            reportFailure("silly_os.browser_pi_connection_test_failed", tested.diagnostic);
          },
        }
        : {},
    );
  };

  const forgetPiAgentV1 = (): void => {
    agentSetupEpochRef.current += 1;
    agentConfigurationPendingRef.current = false;
    connectionTestEpochRef.current += 1;
    providerModelSelectionEpochRef.current += 1;
    providerModelSelectionPendingRef.current = false;
    reasoningEffortSelectionEpochRef.current += 1;
    reasoningEffortSelectionPendingRef.current = false;
    setProviderModelSelectionPending(false);
    setReasoningEffortSelectionPending(false);
    setEffectiveReasoningEffort(null);
    workspaceExportEpochRef.current += 1;
    workspaceExportAbortRef.current?.abort();
    workspaceExportAbortRef.current = null;
    setWorkspaceExport({ phase: "idle" });
    const current = agentPortRef.current;
    agentPortRef.current = null;
    setAgentPort(null);
    setAgentSnapshot(null);
    activeProviderSelectionRef.current = null;
    setActiveProviderSelection(null);
    setConnectionTest({ phase: "disconnected", active: null });
    claimedTerminalRunIdsRef.current.clear();
    ownedAgentRunsRef.current.clear();
    leaseLostAgentRunIdsRef.current.clear();
    setPiAgentSetupStatus(agentFactoryRef.current === null ? "loading" : "available");
    if (current !== null) {
      current.revokeCredential();
      void queueAgentPortTeardownV1(current, "forgotten");
    }
  };

  const remoteResetActionV1 = (): void => {
    setClearAll({ phase: "clearing" });
    forgetPiAgentV1();
    // Unloading closes the Agent Worker, Sandbox iframe, and their shared
    // Workspace leases. The fresh controller starts at Home against the reset
    // repositories; localStorage carries only this invalidation signal.
    window.location.reload();
  };
  useLayoutEffect(() => {
    remoteResetActionRef.current = remoteResetActionV1;
  });

  useEffect(() => {
    if (dataResetCoordinator === null) return undefined;
    return subscribeBrowserDataResetRemoteV1({
      coordinator: dataResetCoordinator,
      isLocalResetPending: () => clearAllPendingRef.current,
      isAccepting: () => agentDrainRegistry.isAccepting(),
      onRemoteReset: () => remoteResetActionRef.current(),
    });
  }, [agentDrainRegistry, dataResetCoordinator]);

  const resetCredentialVaultForClearV1 = async (): Promise<CredentialVaultListV2> => {
    await credentialVaultSettlementRef.current.catch(() => undefined);
    const current = credentialVaultPortRef.current;
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
  };

  const clearAllDataV1 = (): void => {
    if (clearAllPendingRef.current) return;
    clearAllPendingRef.current = true;
    storageUsageEpochRef.current += 1;
    credentialVaultOperationEpochRef.current += 1;
    setClearAll({ phase: "clearing" });
    setCredentialReceipt(null);

    void (async (): Promise<void> => {
      const [authorityResult, vaultResult, providerResult] = await runBrowserDataResetOperationV1({
        coordinator: dataResetCoordinator,
        reportCoordinationFailure: (error) => {
          reportFailureRef.current("silly_os.data_reset_coordination_unavailable", error);
        },
        revokeLocalCapabilities: forgetPiAgentV1,
        awaitSettledOperations: async () => {
          await Promise.all([
            agentSetupSettlementRef.current.catch(() => undefined),
            providerModelSelectionSettlementRef.current.catch(() => undefined),
            reasoningEffortSelectionSettlementRef.current.catch(() => undefined),
            agentWorkspaceLifecycleRef.current.catch(() => undefined),
            agentTerminalSettlementRef.current.catch(() => undefined),
            agentTeardownRef.current.catch(() => undefined),
            credentialVaultSettlementRef.current.catch(() => undefined),
          ]);
        },
        resetProductWorkspace: () => workspaceAuthority.resetStoredData(),
        resetCredentialVault: resetCredentialVaultForClearV1,
        resetProviderSettings: async () => {
          if (providerSettingsRepository === null) {
            throw new TypeError("sillyos.provider_settings.repository_unavailable");
          }
          if (agentPreferencesRepository === null) {
            throw new TypeError("sillyos.agent_preferences.repository_unavailable");
          }
          providerSettingsRepository.clear();
          agentPreferencesRepository.clear();
          const url = new URL(location.href);
          url.searchParams.delete("locale");
          history.replaceState(history.state, "", url);
          productPreferencesRepository?.clear();
        },
      });

      const diagnosticCodes: string[] = [];
      if (authorityResult.status === "rejected") {
        diagnosticCodes.push("product_workspace_reset_failed");
      } else {
        if (authorityResult.value.productRepository.kind !== "cleared") {
          diagnosticCodes.push(
            authorityResult.value.productRepository.kind === "failed"
              ? authorityResult.value.productRepository.diagnosticCode
              : "product_repository_retained",
          );
        }
        if (authorityResult.value.workspaceVolumes.kind !== "cleared") {
          diagnosticCodes.push(
            authorityResult.value.workspaceVolumes.kind === "failed"
              ? authorityResult.value.workspaceVolumes.diagnosticCode
              : "workspace_volumes_retained",
          );
        }
      }
      if (vaultResult.status === "rejected") {
        diagnosticCodes.push("credential_vault_reset_failed");
      } else {
        const nextVault = providerSettingsVaultFromListV1(vaultResult.value);
        credentialVaultStateRef.current = nextVault;
        setCredentialVault(nextVault);
      }
      if (providerResult.status === "rejected") {
        diagnosticCodes.push("provider_settings_clear_failed");
      } else {
        setProviderSettingsSnapshot(emptyProviderSettingsSnapshotV1());
        setAgentPreferencesSnapshot(defaultAgentPreferencesSnapshotV1());
      }

      if (diagnosticCodes.length === 0) {
        window.location.reload();
        return;
      }
      const diagnosticCode = diagnosticCodes.join(",");
      setClearAll({ phase: "failed", diagnosticCode });
      reportFailureRef.current("silly_os.clear_all_data_failed", {
        diagnosticCodes,
        authorityStatus: authorityResult.status,
        vaultStatus: vaultResult.status,
        providerStatus: providerResult.status,
      });
      refreshStorageUsageV1();
    })().catch((error: unknown) => {
      setClearAll({ phase: "failed", diagnosticCode: "clear_all_failed" });
      reportFailureRef.current("silly_os.clear_all_data_failed", error);
      refreshStorageUsageV1();
    }).finally(() => {
      clearAllPendingRef.current = false;
    });
  };

  const runCredentialVaultStateOperationV1 = (
    operation: ProviderSettingsVaultOperationV1,
    execute: (
      port: BrowserCredentialVaultPortV1,
    ) => Promise<CredentialVaultListV2>,
  ): void => {
    const port = credentialVaultPortRef.current;
    if (port === null || !agentDrainRegistry.isAccepting()) {
      const error = new TypeError("sillyos.credential_vault.port_unavailable");
      setCredentialVault({
        phase: "unavailable",
        diagnosticCode: credentialVaultDiagnosticCodeV1(error),
        protection: null,
        state: null,
        bindings: credentialVaultStateRef.current.bindings,
      });
      reportFailure("silly_os.credential_vault_unavailable", error);
      return;
    }
    const workerEpoch = credentialVaultEpochRef.current;
    const operationEpoch = ++credentialVaultOperationEpochRef.current;
    const previous = credentialVaultStateRef.current;
    const busy = providerSettingsVaultBusyV1(operation, previous);
    credentialVaultStateRef.current = busy;
    setCredentialVault(busy);
    const settlement = execute(port).then((vaultSnapshot) => {
      if (
        credentialVaultEpochRef.current !== workerEpoch ||
        credentialVaultOperationEpochRef.current !== operationEpoch ||
        credentialVaultPortRef.current !== port || !agentDrainRegistry.isAccepting()
      ) return;
      const nextVault = providerSettingsVaultFromListV1(vaultSnapshot);
      credentialVaultStateRef.current = nextVault;
      setCredentialVault(nextVault);
    }).catch((error: unknown) => {
      if (
        credentialVaultEpochRef.current !== workerEpoch ||
        credentialVaultOperationEpochRef.current !== operationEpoch ||
        credentialVaultPortRef.current !== port
      ) return;
      const failed = providerSettingsVaultFailedV1(operation, previous, error);
      credentialVaultStateRef.current = failed;
      setCredentialVault(failed);
      reportFailure(`silly_os.credential_vault_${operation}_failed`, error);
    });
    credentialVaultSettlementRef.current = settlement;
  };

  const setCredentialVaultPasswordV1 = (suppliedPassphrase: string): void => {
    let passphrase = suppliedPassphrase;
    runCredentialVaultStateOperationV1("set_password", (port) => {
      const operation = port.client.setPassword(passphrase);
      passphrase = "";
      return operation;
    });
  };

  const useAutomaticCredentialVaultV1 = (): void => {
    runCredentialVaultStateOperationV1("use_device", (port) => port.client.useDevice());
  };

  const unlockCredentialVaultV1 = (suppliedPassphrase: string): void => {
    let passphrase = suppliedPassphrase;
    runCredentialVaultStateOperationV1("unlock", (port) => {
      const operation = port.client.unlock(passphrase);
      passphrase = "";
      return operation;
    });
  };

  const lockCredentialVaultV1 = (): void => {
    forgetPiAgentV1();
    runCredentialVaultStateOperationV1("lock", (port) => port.client.lock());
  };

  const createCredentialVaultHandoffV1 = (
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
      credentialVaultPortRef.current !== vaultPort ||
      credentialVaultEpochRef.current !== workerEpoch ||
      credentialVaultOperationEpochRef.current !== operationEpoch ||
      !creatorVaultCanHandoffProviderCredentialV1(credentialVaultStateRef.current) ||
      !credentialVaultBindingsEqualV2(expectedBinding, binding)
    ) {
      deliveryPort.close();
      return Promise.reject(new TypeError("sillyos.credential_vault.handoff_stale"));
    }
    return vaultPort.client.handoff(expectedBinding, handoffId, deliveryPort);
  };

  const activateVaultSelectionV1 = (
    selection: BrowserPiModelSelectionV1,
    persistPreference: boolean,
  ): Promise<boolean> => {
    const vaultPort = credentialVaultPortRef.current;
    let binding: CredentialVaultBindingV2;
    try {
      binding = credentialVaultBindingForSelectionV2(selection);
    } catch (error) {
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.credential_vault_binding_invalid", error);
      return Promise.resolve(false);
    }
    if (
      vaultPort === null || credentialVaultStateRef.current.state !== "unlocked" ||
      !credentialVaultStateRef.current.bindings.some((candidate) =>
        credentialVaultBindingsEqualV2(candidate, binding)
      )
    ) {
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.credential_vault_handoff_failed", "binding_unavailable");
      return Promise.resolve(false);
    }
    if (!creatorVaultCanHandoffProviderCredentialV1(credentialVaultStateRef.current)) {
      return Promise.resolve(false);
    }
    const workerEpoch = credentialVaultEpochRef.current;
    const operationEpoch = ++credentialVaultOperationEpochRef.current;
    return configurePiAgentCredentialV1(
      selection,
      (port) =>
        port.configureCredentialHandoff({
          binding,
          handoff: createCredentialVaultHandoffV1(
            vaultPort,
            binding,
            workerEpoch,
            operationEpoch,
          ),
        }),
      { persistPreference },
    );
  };

  const selectConfiguredModelV1 = (
    choice: CreatorProviderModelChoiceV1,
    persistPreference: boolean,
  ): Promise<boolean> => {
    const port = agentPortRef.current;
    const activeSelection = activeProviderSelectionRef.current;
    if (
      port === null || activeSelection === null ||
      !agentWorkerHoldsCredentialV1(piAgentSetupStatus) ||
      !selectionsShareCredentialScopeV1(activeSelection, choice.selection)
    ) return Promise.resolve(false);
    if (sameProviderSelectionV1(activeSelection, choice.selection)) {
      if (persistPreference) persistProviderPreferenceV1(choice.selection);
      return Promise.resolve(true);
    }
    const epoch = ++providerModelSelectionEpochRef.current;
    providerModelSelectionPendingRef.current = true;
    setProviderModelSelectionPending(true);
    const settlement = (async (): Promise<boolean> => {
      try {
        const selected = await port.selectModel(choice.selection);
        if (
          providerModelSelectionEpochRef.current !== epoch ||
          agentPortRef.current !== port || !agentDrainRegistry.isAccepting()
        ) return false;
        if (selected.kind !== "selected") {
          reportFailure("silly_os.browser_pi_model_select_failed", selected.diagnostic);
          return false;
        }
        activeProviderSelectionRef.current = selected.selection;
        setActiveProviderSelection(selected.selection);
        setEffectiveReasoningEffort(selected.effectiveReasoningEffort);
        if (persistPreference) persistProviderPreferenceV1(selected.selection);
        return true;
      } catch (error) {
        if (
          providerModelSelectionEpochRef.current === epoch &&
          agentPortRef.current === port && agentDrainRegistry.isAccepting()
        ) reportFailure("silly_os.browser_pi_model_select_failed", error);
        return false;
      } finally {
        if (providerModelSelectionEpochRef.current === epoch) {
          providerModelSelectionPendingRef.current = false;
          setProviderModelSelectionPending(false);
        }
      }
    })();
    providerModelSelectionSettlementRef.current = settlement.then(() => undefined);
    return settlement;
  };

  const selectProviderModelChoiceV1 = (choice: CreatorProviderModelChoiceV1): void => {
    if (
      internalPiTest || agentConfigurationPendingRef.current ||
      providerModelSelectionPendingRef.current || reasoningEffortSelectionPendingRef.current ||
      !creatorVaultCanHandoffProviderCredentialV1(credentialVaultStateRef.current)
    ) return;
    const activeSelection = activeProviderSelectionRef.current;
    if (
      agentPortRef.current !== null && activeSelection !== null &&
      agentWorkerHoldsCredentialV1(piAgentSetupStatus) &&
      selectionsShareCredentialScopeV1(activeSelection, choice.selection)
    ) {
      void selectConfiguredModelV1(choice, true);
      return;
    }
    void activateVaultSelectionV1(choice.selection, true);
  };

  const selectReasoningEffortV1 = (preferredReasoningEffort: BrowserPiReasoningEffortV1): void => {
    const port = agentPortRef.current;
    if (
      internalPiTest || port === null || agentSnapshot?.phase === "running" ||
      !agentWorkerHoldsCredentialV1(piAgentSetupStatus) ||
      agentConfigurationPendingRef.current || providerModelSelectionPendingRef.current ||
      reasoningEffortSelectionPendingRef.current
    ) return;

    const epoch = ++reasoningEffortSelectionEpochRef.current;
    reasoningEffortSelectionPendingRef.current = true;
    setReasoningEffortSelectionPending(true);
    const settlement = (async (): Promise<void> => {
      try {
        const selected = await port.selectReasoningEffort(preferredReasoningEffort);
        if (
          reasoningEffortSelectionEpochRef.current !== epoch ||
          agentPortRef.current !== port || !agentDrainRegistry.isAccepting()
        ) return;
        if (selected.kind !== "selected") {
          reportFailure("silly_os.browser_pi_reasoning_effort_select_failed", selected.diagnostic);
          return;
        }
        setEffectiveReasoningEffort(selected.effectiveReasoningEffort);
        persistReasoningEffortPreferenceV1(selected.preferredReasoningEffort);
      } catch (error) {
        if (
          reasoningEffortSelectionEpochRef.current === epoch &&
          agentPortRef.current === port && agentDrainRegistry.isAccepting()
        ) reportFailure("silly_os.browser_pi_reasoning_effort_select_failed", error);
      } finally {
        if (reasoningEffortSelectionEpochRef.current === epoch) {
          reasoningEffortSelectionPendingRef.current = false;
          setReasoningEffortSelectionPending(false);
        }
      }
    })();
    reasoningEffortSelectionSettlementRef.current = settlement;
  };

  const testProviderConnectionV1 = (selection: ProviderSettingsSelectionV1): void => {
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
      !creatorVaultCanHandoffProviderCredentialV1(credentialVaultStateRef.current) ||
      !credentialVaultStateRef.current.bindings.some((candidate) =>
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
      try {
        const activeSelection = activeProviderSelectionRef.current;
        if (
          agentPortRef.current === null || activeSelection === null ||
          !agentWorkerHoldsCredentialV1(piAgentSetupStatus) ||
          !selectionsShareCredentialScopeV1(activeSelection, piSelection)
        ) {
          if (!await activateVaultSelectionV1(piSelection, false)) {
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
        const port = agentPortRef.current;
        if (
          port === null || connectionTestEpochRef.current !== epoch ||
          !agentDrainRegistry.isAccepting()
        ) return;
        const tested = await port.testConnection(piSelection);
        if (
          connectionTestEpochRef.current !== epoch || agentPortRef.current !== port ||
          !agentDrainRegistry.isAccepting()
        ) return;
        if (tested.kind === "ready") {
          setConnectionTest({ phase: "ready", active: selection });
          return;
        }
        setConnectionTest({ phase: "test_failed", active: selection });
        reportFailure("silly_os.browser_pi_connection_test_failed", tested.diagnostic);
      } catch (error) {
        if (connectionTestEpochRef.current !== epoch || !agentDrainRegistry.isAccepting()) return;
        setConnectionTest({
          phase: "failed",
          active: selection,
          diagnosticCode: credentialVaultDiagnosticCodeV1(error),
        });
        reportFailure("silly_os.browser_pi_connection_test_failed", error);
      }
    })();
    agentSetupSettlementRef.current = settlement;
  };

  const saveProviderCredentialV1 = (
    connections: readonly CredentialVaultConnectionIdentityV2[],
    suppliedCredential: string,
  ): void => {
    const vaultPort = credentialVaultPortRef.current;
    const operationTarget = connections[0];
    let bindings: readonly CredentialVaultBindingV2[];
    try {
      if (operationTarget === undefined) {
        throw new TypeError("sillyos.credential_vault.binding_invalid/empty");
      }
      bindings = Object.freeze(connections.map(credentialVaultBindingForConnectionV2));
    } catch (error) {
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.credential_vault_binding_invalid", error);
      return;
    }
    if (
      suppliedCredential.length === 0 || vaultPort === null ||
      !creatorVaultCanHandoffProviderCredentialV1(credentialVaultStateRef.current)
    ) {
      setPiAgentSetupStatus("failed");
      reportFailure("silly_os.credential_vault_save_failed", "vault_locked");
      return;
    }
    const workerEpoch = credentialVaultEpochRef.current;
    const operationEpoch = ++credentialVaultOperationEpochRef.current;
    const replacesActiveCredential = activeAgentUsesAnyCredentialBindingV1(
      activeProviderSelectionRef.current,
      bindings,
    );
    connectionTestEpochRef.current += 1;
    setConnectionTest({ phase: "disconnected", active: null });
    if (replacesActiveCredential) forgetPiAgentV1();
    setCredentialReceipt(null);
    setCredentialOperation({ phase: "saving", target: operationTarget });
    let credential = suppliedCredential;
    const settlement = (async (): Promise<void> => {
      try {
        for (const binding of bindings) {
          await vaultPort.client.upsert(binding, credential);
        }
        credential = "";
        if (
          credentialVaultPortRef.current !== vaultPort ||
          credentialVaultEpochRef.current !== workerEpoch ||
          credentialVaultOperationEpochRef.current !== operationEpoch ||
          !creatorVaultCanHandoffProviderCredentialV1(credentialVaultStateRef.current) ||
          !agentDrainRegistry.isAccepting()
        ) return;
        const vaultSnapshot = await vaultPort.client.list();
        if (
          credentialVaultPortRef.current !== vaultPort ||
          credentialVaultEpochRef.current !== workerEpoch ||
          credentialVaultOperationEpochRef.current !== operationEpoch ||
          !agentDrainRegistry.isAccepting()
        ) return;
        const nextVault = providerSettingsVaultFromListV1(vaultSnapshot);
        credentialVaultStateRef.current = nextVault;
        setCredentialVault(nextVault);
        setCredentialOperation({ phase: "idle", target: null });
        setCredentialReceipt({ kind: "saved", target: operationTarget });
        const availableChoices = creatorProviderModelChoicesV1(
          providerCatalog,
          providerSettingsSnapshot.customProfiles,
          providerSettingsSnapshot.enabledBuiltinModels,
        ).filter((choice) => {
          try {
            const choiceBinding = credentialVaultBindingForSelectionV2(choice.selection);
            return nextVault.bindings.some((candidate) =>
              credentialVaultBindingsEqualV2(candidate, choiceBinding)
            );
          } catch {
            return false;
          }
        });
        const preferredValue = preferredModelValueV1(
          providerSettingsSnapshot.preferredModel,
          availableChoices,
        );
        const choice = availableChoices.find(({ value }) => value === preferredValue) ??
          availableChoices[0];
        if (choice !== undefined) void activateVaultSelectionV1(choice.selection, false);
      } catch (error) {
        if (
          credentialVaultPortRef.current === vaultPort &&
          credentialVaultEpochRef.current === workerEpoch &&
          credentialVaultOperationEpochRef.current === operationEpoch
        ) {
          setCredentialOperation({
            phase: "failed",
            target: operationTarget,
            diagnosticCode: credentialVaultDiagnosticCodeV1(error),
          });
          reportFailure("silly_os.credential_vault_save_failed", error);
        }
      } finally {
        credential = "";
      }
    })();
    credentialVaultSettlementRef.current = settlement;
  };

  const forgetCredentialV1 = (bindings: readonly CredentialVaultBindingV2[]): void => {
    const firstBinding = bindings[0];
    if (firstBinding === undefined) {
      reportFailure("silly_os.credential_vault_forget_failed", "binding_unavailable");
      return;
    }
    const matchesAnyBindingV1 = (candidate: CredentialVaultBindingV2): boolean =>
      bindings.some((binding) => credentialVaultBindingsEqualV2(candidate, binding));
    const activeSelection = activeProviderSelectionRef.current;
    const activeBinding = activeSelection === null
      ? null
      : credentialVaultBindingForSelectionV2(activeSelection);
    if (activeBinding !== null && matchesAnyBindingV1(activeBinding)) forgetPiAgentV1();
    const testedSelection = connectionTest.active;
    if (
      testedSelection !== null &&
      matchesAnyBindingV1(credentialVaultBindingForSelectionV2(testedSelection))
    ) {
      connectionTestEpochRef.current += 1;
      setConnectionTest({ phase: "disconnected", active: null });
    }
    const vaultPort = credentialVaultPortRef.current;
    if (vaultPort === null) {
      reportFailure("silly_os.credential_vault_forget_failed", "vault_unavailable");
      return;
    }
    const target: CredentialVaultConnectionIdentityV2 = firstBinding.bindingId.startsWith(
        "builtin:",
      )
      ? {
        kind: "builtin",
        providerId: firstBinding.bindingId.slice("builtin:".length),
        baseUrl: firstBinding.baseUrl,
      }
      : {
        kind: "custom",
        profileId: firstBinding.bindingId.slice("custom:".length),
        baseUrl: firstBinding.baseUrl,
      };
    const workerEpoch = credentialVaultEpochRef.current;
    const operationEpoch = ++credentialVaultOperationEpochRef.current;
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
        const vaultSnapshot = await vaultPort.client.list();
        if (
          credentialVaultPortRef.current !== vaultPort ||
          credentialVaultEpochRef.current !== workerEpoch ||
          credentialVaultOperationEpochRef.current !== operationEpoch
        ) return;
        const nextVault = providerSettingsVaultFromListV1(vaultSnapshot);
        credentialVaultStateRef.current = nextVault;
        setCredentialVault(nextVault);
        if (firstFailure === null) {
          setCredentialOperation({ phase: "idle", target: null });
        } else {
          setCredentialOperation({
            phase: "failed",
            target,
            diagnosticCode: credentialVaultDiagnosticCodeV1(firstFailure),
          });
          reportFailure("silly_os.credential_vault_forget_failed", firstFailure);
        }
      } catch (error) {
        if (
          credentialVaultPortRef.current === vaultPort &&
          credentialVaultEpochRef.current === workerEpoch &&
          credentialVaultOperationEpochRef.current === operationEpoch
        ) {
          setCredentialOperation({
            phase: "failed",
            target,
            diagnosticCode: credentialVaultDiagnosticCodeV1(error),
          });
          reportFailure("silly_os.credential_vault_forget_failed", error);
        }
      }
    })();
    credentialVaultSettlementRef.current = settlement;
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
      const activeSelection = activeProviderSelectionRef.current;
      if (
        !enabled && activeSelection?.kind === "builtin" &&
        activeSelection.providerId === model.providerId &&
        activeSelection.modelId === model.modelId
      ) {
        const nextChoice = creatorProviderModelChoicesV1(
          providerCatalog,
          nextSnapshot.customProfiles,
          nextSnapshot.enabledBuiltinModels,
        ).find((choice) => selectionsShareCredentialScopeV1(activeSelection, choice.selection));
        if (nextChoice !== undefined) {
          selectProviderModelChoiceV1(nextChoice);
        } else if (
          shouldRevokeAgentAfterBuiltinModelVisibilityChangeV1({
            activeSelection,
            changedModel: model,
            enabled,
            sameCredentialScopeReplacementAvailable: false,
          })
        ) {
          forgetPiAgentV1();
        }
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
    processConversationRestoreEpochRef.current += 1;
    setProcessConversationRestorePending(false);
    const port = agentPortRef.current;
    if (port !== null && !await queueAgentWorkspaceV1(port, null)) {
      reportFailure("silly_os.home_close_failed", "agent_workspace_close_failed");
      return;
    }
    if (!await controller.openHome()) {
      reportFailure("silly_os.home_close_failed", "workspace_authority_close_failed");
    }
  };

  const openProgramV1 = async (programId: string): Promise<void> => {
    const epoch = processConversationRestoreEpochRef.current + 1;
    processConversationRestoreEpochRef.current = epoch;
    setProcessConversationRestorePending(true);
    try {
      const result = await controller.openProgram(programId);
      if (result.kind === "failed") {
        reportFailure("silly_os.program_open_failed", result);
        return;
      }
      const activeProcess = controller.getSnapshot().activeProcess;
      if (result.kind !== "completed" || !result.value || activeProcess === null) return;
      const anchor = processViewStates.read(activeProcess.process.processId).conversation
        .scrollAnchor;
      if (
        anchor.kind === "entry" &&
        !activeProcess.transcript.entries.some((entry) =>
          entry.sequence === anchor.sequence && entry.entryId === anchor.entryId
        )
      ) {
        const restored = await controller.restoreTranscriptAround(anchor.sequence);
        if (restored.kind === "failed") {
          reportFailure("silly_os.transcript_restore_failed", restored);
        }
      }
    } finally {
      if (processConversationRestoreEpochRef.current === epoch) {
        setProcessConversationRestorePending(false);
      }
    }
  };

  const sendFollowUpV1 = async (text: string): Promise<boolean> => {
    const port = agentPortRef.current;
    if (port === null || !agentRuntimeUsableV1(piRuntime, piAgentSetupStatus)) {
      reportFailure("silly_os.browser_pi_unavailable", "credential_required");
      return false;
    }
    const currentSession = controller.getSnapshot();
    const activeSubject = currentSession.activeProcess?.subject ?? null;
    if (
      currentSession.route !== "process" || activeSubject === null ||
      !await queueAgentWorkspaceV1(port, {
        programId: activeSubject.currentProgram.programId,
        workspaceId: activeSubject.head.workspaceId,
      })
    ) {
      reportFailure("silly_os.browser_pi_workspace_unavailable", "workspace_not_open");
      return false;
    }
    const prepared = await controller.prepareAgentRun(text);
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      reportFailure("silly_os.browser_pi_submit_rejected", prepared);
      return false;
    }
    const run = prepared.value.run;
    ownedAgentRunsRef.current.set(run.agentRunId, run);
    let submitted = false;
    try {
      const result = await port.submit(run);
      if (result.kind === "submitted") {
        submitted = true;
        return true;
      }
      const terminal = await controller.recordAgentRunTerminal({
        run,
        outcome: "failed",
        diagnosticCode: result.diagnostic.code,
      });
      if (
        terminal.kind !== "completed" || terminal.value.kind !== "applied" ||
        terminal.value.outcome !== "failed"
      ) {
        reportFailure("silly_os.browser_pi_submit_terminal_failed", terminal);
      }
      reportFailure("silly_os.browser_pi_submit_failed", result.diagnostic);
      return false;
    } catch (error) {
      await recoverLostOwnedAgentRunV1(port, run).catch((recoveryError: unknown) => {
        reportFailure("silly_os.process_execution_recovery_failed", recoveryError);
      });
      reportFailure("silly_os.browser_pi_submit_failed", error);
      return false;
    } finally {
      if (!submitted) ownedAgentRunsRef.current.delete(run.agentRunId);
    }
  };

  const retryInterruptedAgentRunV1 = async (): Promise<boolean> => {
    const port = agentPortRef.current;
    if (port === null || !agentRuntimeUsableV1(piRuntime, piAgentSetupStatus)) {
      reportFailure("silly_os.browser_pi_unavailable", "credential_required");
      return false;
    }
    const currentSession = controller.getSnapshot();
    const activeSubject = currentSession.activeProcess?.subject ?? null;
    if (
      currentSession.route !== "process" || activeSubject === null ||
      currentSession.activeProcess?.process.status !== "interrupted_retryable" ||
      !await queueAgentWorkspaceV1(port, {
        programId: activeSubject.currentProgram.programId,
        workspaceId: activeSubject.head.workspaceId,
      })
    ) {
      reportFailure("silly_os.browser_pi_workspace_unavailable", "workspace_not_open");
      return false;
    }
    const prepared = await controller.retryInterruptedAgentRun();
    if (prepared.kind !== "completed" || prepared.value.kind !== "prepared") {
      reportFailure("silly_os.browser_pi_submit_rejected", prepared);
      return false;
    }
    const run = prepared.value.run;
    ownedAgentRunsRef.current.set(run.agentRunId, run);
    let submitted = false;
    try {
      const result = await port.submit(run);
      if (result.kind === "submitted") {
        submitted = true;
        return true;
      }
      const terminal = await controller.recordAgentRunTerminal({
        run,
        outcome: "failed",
        diagnosticCode: result.diagnostic.code,
      });
      if (
        terminal.kind !== "completed" || terminal.value.kind !== "applied" ||
        terminal.value.outcome !== "failed"
      ) {
        reportFailure("silly_os.browser_pi_submit_terminal_failed", terminal);
      }
      reportFailure("silly_os.browser_pi_submit_failed", result.diagnostic);
      return false;
    } catch (error) {
      await recoverLostOwnedAgentRunV1(port, run).catch((recoveryError: unknown) => {
        reportFailure("silly_os.process_execution_recovery_failed", recoveryError);
      });
      reportFailure("silly_os.browser_pi_submit_failed", error);
      return false;
    } finally {
      if (!submitted) ownedAgentRunsRef.current.delete(run.agentRunId);
    }
  };

  const setProgramNetworkAccessV1 = async (enabled: boolean): Promise<boolean> => {
    const programId = routedProgramId;
    const mutationEpoch = networkAccessEpochRef.current;
    if (
      programId === null || networkAccessMutationPendingRef.current ||
      programNetworkAccess?.programId !== programId
    ) return false;
    networkAccessMutationPendingRef.current = true;
    setNetworkAccessMutationPending(true);
    try {
      const mutation = await workspaceAuthority.setProgramNetworkAccess({
        programId,
        enabled,
      });
      if (mutation.kind === "missing") {
        reportFailure("silly_os.browser_network_access_failed", "program_missing");
        return false;
      }
      const access = mutation.value;
      if (
        networkAccessEpochRef.current === mutationEpoch &&
        routedProgramIdRef.current === programId
      ) setProgramNetworkAccess(access);
      const port = agentPortRef.current;
      const descriptor = port?.getSnapshot().workspace.descriptor ?? null;
      if (port !== null && descriptor?.programId === programId) {
        const synchronized = await port.synchronizeNetworkAccess(access);
        if (synchronized.kind !== "synchronized") {
          // The durable mutation is authoritative. Terminate a Worker whose
          // stale cache could otherwise retain enabled network access.
          forgetPiAgentV1();
          reportFailure("silly_os.browser_network_access_sync_failed", synchronized.diagnostic);
          return false;
        }
      }
      return true;
    } catch (error) {
      if (!enabled) {
        const port = agentPortRef.current;
        if (port?.getSnapshot().workspace.descriptor?.programId === programId) {
          // A failed response can follow a committed disable. Revoke the only
          // Worker that may still cache enabled access instead of guessing the
          // mutation outcome or allowing it to continue egress.
          forgetPiAgentV1();
        }
      }
      reportFailure("silly_os.browser_network_access_failed", error);
      return false;
    } finally {
      networkAccessMutationPendingRef.current = false;
      setNetworkAccessMutationPending(false);
    }
  };

  const retryAgentWorkspaceV1 = (): void => {
    const port = agentPortRef.current;
    const currentSession = controller.getSnapshot();
    const activeSubject = currentSession.activeProcess?.subject ?? null;
    if (
      port === null || currentSession.route !== "process" || activeSubject === null
    ) return;
    void queueAgentWorkspaceV1(port, {
      programId: activeSubject.currentProgram.programId,
      workspaceId: activeSubject.head.workspaceId,
    });
  };

  const exportWorkspaceV1 = (): void => {
    const port = agentPortRef.current;
    const currentSession = controller.getSnapshot();
    const activeSubject = currentSession.activeProcess?.subject ?? null;
    const currentAgent = port?.getSnapshot();
    const descriptor = currentAgent?.workspace.descriptor;
    if (
      port === null || workspaceExportAbortRef.current !== null ||
      !agentRuntimeUsableV1(piRuntime, piAgentSetupStatus) || durability.phase !== "ready" ||
      currentSession.route !== "process" || activeSubject === null ||
      currentAgent?.phase === "running" ||
      (currentAgent?.terminalRuns.length ?? 0) !== 0 ||
      currentAgent?.workspace.phase !== "open" || descriptor === null || descriptor === undefined ||
      descriptor.programId !== activeSubject.currentProgram.programId ||
      descriptor.workspaceId !== activeSubject.head.workspaceId
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
    const programName = activeSubject.currentProgram.name;
    void port.exportWorkspace({
      workspaceSessionId: descriptor.workspaceSessionId,
      fileName: workspaceArchiveFileNameV1(programName),
      signal: abortController.signal,
      onProgress: (progress) => {
        if (
          workspaceExportEpochRef.current !== epoch || abortController.signal.aborted
        ) return;
        setWorkspaceExport({ phase: "exporting", ...progress });
      },
      onReady: (ready, startDownload) => {
        if (
          workspaceExportEpochRef.current !== epoch || abortController.signal.aborted
        ) return "cancel";
        return commitWorkspaceDownloadV1(
          ready,
          startDownload,
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
    reasoningEffortSelectionPending ||
    (agentSnapshot?.terminalRuns.length ?? 0) > 0;
  const unownedProcessExecutionActive = hasUnownedProcessExecutionV1({
    activeAttemptId: activeProcessAttemptId,
    ownsAttempt: (attemptId) => ownedAgentRunsRef.current.has(attemptId),
  });
  const agentWorkspaceLifecyclePending = agentSnapshot?.workspace.phase === "opening" ||
    agentSnapshot?.workspace.phase === "closing";
  const executionWorkspaceReady = routedProgramId !== null && routedWorkspaceId !== null &&
    agentSnapshot?.workspace.phase === "open" &&
    agentSnapshot.workspace.descriptor?.programId === routedProgramId &&
    agentSnapshot.workspace.descriptor.workspaceId === routedWorkspaceId;
  const workspaceExportPending = workspaceExport.phase === "exporting" ||
    workspaceExport.phase === "cancelling" || workspaceExport.phase === "finalizing";
  const workspaceExportAvailable = agentPort !== null &&
    executionWorkspaceReady && executionWorkspaceSessionId !== null;
  const workspaceExportDisabled = durability.phase !== "ready" || agentMutationPending ||
    agentWorkspaceLifecyclePending || !executionWorkspaceReady ||
    workspaceExportPending;
  const creatorProviderModelChoices = creatorProviderModelChoicesV1(
    providerCatalog,
    customProviderProfiles,
    providerSettingsSnapshot.enabledBuiltinModels,
  );
  const usableProviderModelChoices = creatorProviderModelChoices.filter((choice) =>
    creatorVaultHasProviderCredentialV1(credentialVault, choice.selection)
  );
  const creatorProviderModelValue = preferredModelValueV1(
    providerSettingsSnapshot.preferredModel,
    usableProviderModelChoices,
  ) ?? usableProviderModelChoices[0]?.value ?? null;
  const preferredProviderChoice = usableProviderModelChoices.find(
    ({ value }) => value === creatorProviderModelValue,
  ) ?? null;
  const preferredProviderIsActive = preferredProviderChoice !== null &&
    agentPort !== null && agentWorkerHoldsCredentialV1(piAgentSetupStatus) &&
    sameProviderSelectionV1(activeProviderSelection, preferredProviderChoice.selection);
  const creatorReasoningEffortOptions = preferredProviderChoice?.supportedReasoningEfforts ??
    Object.freeze(["off"] as const);
  const provisionalReasoningEffort = preferredProviderChoice?.defaultReasoningEffort ?? "off";
  const creatorReasoningEffortValue = effectiveReasoningEffort !== null &&
      creatorReasoningEffortOptions.includes(effectiveReasoningEffort)
    ? effectiveReasoningEffort
    : provisionalReasoningEffort;
  const creatorProviderModelStatus = usableProviderModelChoices.length === 0
    ? "required" as const
    : providerModelSelectionPending || agentConfigurationPendingRef.current
    ? "initializing" as const
    : preferredProviderIsActive
    ? "ready" as const
    : piAgentSetupStatus === "failed"
    ? "failed" as const
    : "initializing" as const;
  const creatorReadiness = projectCreatorReadinessV1({
    catalogStatus: providerCatalog.phase,
    vaultStatus: projectCreatorVaultStatusV1(credentialVault),
    hasEnabledConfiguredModel: creatorProviderModelChoices.length > 0,
    hasModelWithCredentialedProvider: usableProviderModelChoices.length > 0,
    agentStatus: creatorProviderModelStatus === "failed"
      ? "failed"
      : creatorProviderModelStatus === "ready"
      ? "ready"
      : "initializing",
  });
  const liveCreatorReady = internalPiTest || creatorReadiness.status === "ready";
  const credentialVaultCanHandoff = creatorVaultCanHandoffProviderCredentialV1(credentialVault);

  const selectCreatorProviderModelV1 = (value: string): void => {
    if (!credentialVaultCanHandoff) return;
    const choice = usableProviderModelChoices.find((candidate) => candidate.value === value);
    if (choice !== undefined) selectProviderModelChoiceV1(choice);
  };
  const creatorProviderModelV1 = (surface: "home" | "workspace") => ({
    status: creatorProviderModelStatus,
    disabled: !credentialVaultCanHandoff,
    selectedValue: creatorProviderModelValue,
    options: usableProviderModelChoices.map((choice) => ({
      value: choice.value,
      modelName: choice.modelName,
      providerName: choice.providerName,
    })),
    reasoningEffort: {
      status: reasoningEffortSelectionPending
        ? "initializing" as const
        : piAgentSetupStatus === "failed"
        ? "failed" as const
        : "ready" as const,
      selectedValue: creatorReasoningEffortValue,
      options: creatorReasoningEffortOptions,
      onSelect: selectReasoningEffortV1,
    },
    onSelect: selectCreatorProviderModelV1,
    onOpenSettings: () => openModelSettingsV1(surface),
  } as const);

  const preferredProviderChoiceRef = useRef(preferredProviderChoice);
  const selectConfiguredModelRef = useRef(selectConfiguredModelV1);
  const activateVaultSelectionRef = useRef(activateVaultSelectionV1);
  useLayoutEffect(() => {
    preferredProviderChoiceRef.current = preferredProviderChoice;
    selectConfiguredModelRef.current = selectConfiguredModelV1;
    activateVaultSelectionRef.current = activateVaultSelectionV1;
  });

  useEffect(() => {
    const choice = preferredProviderChoiceRef.current;
    if (
      internalPiTest || choice === null || !credentialVaultCanHandoff ||
      credentialOperation.phase !== "idle" ||
      connectionTest.phase === "testing" || piAgentSetupStatus === "failed" ||
      agentFactoryRef.current === null || networkBrokerFactoryRef.current === null ||
      agentConfigurationPendingRef.current || providerModelSelectionPendingRef.current ||
      reasoningEffortSelectionPendingRef.current ||
      !agentDrainRegistry.isAccepting()
    ) return;
    const port = agentPortRef.current;
    const activeSelection = activeProviderSelectionRef.current;
    if (
      port !== null && activeSelection !== null &&
      agentWorkerHoldsCredentialV1(piAgentSetupStatus)
    ) {
      if (sameProviderSelectionV1(activeSelection, choice.selection)) return;
      if (selectionsShareCredentialScopeV1(activeSelection, choice.selection)) {
        void selectConfiguredModelRef.current(choice, false);
        return;
      }
    }
    void activateVaultSelectionRef.current(choice.selection, false);
  }, [
    activeProviderSelection,
    agentDrainRegistry,
    agentPort,
    connectionTest.phase,
    creatorProviderModelValue,
    credentialOperation.phase,
    credentialVaultCanHandoff,
    internalPiTest,
    piAgentSetupStatus,
    providerModelSelectionPending,
  ]);

  return (
    <div
      className="silly-os"
      lang={locale}
      data-locale={locale}
      data-theme-mode={productPreferences.theme}
      data-color-scheme={colorScheme}
      data-program-storage-state={durability.phase}
      data-program-storage-operation={storageOperationV1(durability)}
      data-agent-workspace-state={agentSnapshot?.workspace.phase}
      data-workspace-export-state={workspaceExport.phase}
    >
      <SillyOsOverlayHostV1>
        {settingsOpen && !internalPiTest
          ? (
            <ProviderSettingsV1
              copy={copy}
              catalog={providerCatalog}
              customProfiles={customProviderProfiles}
              preferredBuiltinModel={providerSettingsSnapshot.preferredModel?.kind === "builtin"
                ? providerSettingsSnapshot.preferredModel
                : null}
              connectionTest={connectionTest}
              credentialOperation={credentialOperation}
              credentialReceipt={credentialReceipt}
              storageUsage={storageUsage}
              clearAll={clearAll}
              initialSection={settingsInitialSection}
              onBack={closeSettingsV1}
              onLocaleChange={changeLocaleV1}
              theme={productPreferences.theme}
              onThemeChange={changeThemeV1}
              onRetryCatalog={loadProviderCatalogV1}
              enabledBuiltinModels={providerSettingsSnapshot.enabledBuiltinModels}
              onSetBuiltinModelEnabled={setBuiltinModelEnabledV1}
              vault={credentialVault}
              onSetVaultPassword={setCredentialVaultPasswordV1}
              onUseAutomaticVault={useAutomaticCredentialVaultV1}
              onUnlockVault={unlockCredentialVaultV1}
              onLockVault={lockCredentialVaultV1}
              onRefreshStorageUsage={refreshStorageUsageV1}
              onClearAllData={clearAllDataV1}
              onSaveCredential={saveProviderCredentialV1}
              onForgetCredential={forgetCredentialV1}
              onTestConnection={testProviderConnectionV1}
              onCreateCustomProfile={createCustomProviderProfileV1}
              onRemoveCustomProfile={removeCustomProviderProfileV1}
            />
          )
          : snapshot.route === "home"
          ? (
            <CreatorHomeV1
              copy={copy}
              createDisabled={durability.phase !== "ready" ||
                (internalPiTest && !agentRuntimeUsableV1(piRuntime, piAgentSetupStatus)) ||
                reasoningEffortSelectionPending ||
                !liveCreatorReady}
              programCatalog={{
                status: snapshot.catalog.phase === "failed" &&
                    snapshot.catalog.summaries.length > 0
                  ? "ready"
                  : snapshot.catalog.phase,
                programs: snapshot.catalog.summaries,
                openDisabled: durability.phase !== "ready",
                onOpen: (programId) => {
                  void openProgramV1(programId);
                },
                hasMore: snapshot.catalog.nextCursor !== null,
                onLoadMore: () => {
                  void controller.loadMorePrograms().then((result) => {
                    if (result.kind === "failed") {
                      reportFailure("silly_os.program_catalog_more_failed", result);
                    }
                  });
                },
              }}
              onLocaleChange={changeLocaleV1}
              theme={productPreferences.theme}
              onThemeChange={changeThemeV1}
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
                creatorReadiness,
                onOpenCreatorSettings: (
                  target: Exclude<CreatorReadinessRecoveryTargetV1, null>,
                ) => openCreatorReadinessSettingsV1("home", target),
                ...(creatorReadiness.status === "ready"
                  ? { providerModel: creatorProviderModelV1("home") }
                  : {}),
              })}
              onCreate={(intent) => {
                void controller.submitIntent(intent).then((result) => {
                  if (result.kind !== "completed" || result.value.kind !== "created") {
                    reportFailure("silly_os.creator_intent_rejected", result);
                  }
                });
              }}
            />
          )
          : snapshot.route === "process_loading" || snapshot.activeProcess === null ||
              processConversationRestorePending
          ? (
            <main className="creator-home" data-silly-os-view="process-loading">
              <div className="creator-home__route-state">
                <CollectionStateV1
                  icon={LoaderCircle}
                  iconMotion="spin"
                  title={copy.openingProgram}
                  role="status"
                  aria-live="polite"
                />
              </div>
            </main>
          )
          : (
            <ActiveProcessMountBoundaryV1 processId={snapshot.activeProcess.process.processId}>
              <ProgramWorkspaceV1
                copy={copy}
                activeProcess={snapshot.activeProcess}
                initialViewState={processViewStates.read(
                  snapshot.activeProcess.process.processId,
                )}
                onViewStateChange={(next) => {
                  processViewStates.write(snapshot.activeProcess!.process.processId, next);
                }}
                homeDisabled={durability.phase === "saving" || agentMutationPending ||
                  agentWorkspaceLifecyclePending || workspaceExportPending}
                decisionPending={durability.phase === "saving"}
                agentInteractionPending={durability.phase === "saving" || agentMutationPending ||
                  unownedProcessExecutionActive || !executionWorkspaceReady ||
                  workspaceExportPending || !liveCreatorReady}
                onHome={() => void openHomeV1()}
                onLocaleChange={changeLocaleV1}
                theme={productPreferences.theme}
                onThemeChange={changeThemeV1}
                {...(internalPiTest ? {} : { onOpenSettings: openSettingsV1 })}
                onAccept={() => {
                  const proposal = snapshot.activeProcess?.subject?.head.proposal ?? null;
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
                  const proposal = snapshot.activeProcess?.subject?.head.proposal ?? null;
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
                onRetryInterruptedAgentRun={retryInterruptedAgentRunV1}
                onLoadOlderTranscript={async () => {
                  const result = await controller.loadOlderTranscript();
                  if (result.kind === "completed") return result.value;
                  if (result.kind === "failed") {
                    reportFailure("silly_os.transcript_older_failed", result);
                  }
                  return false;
                }}
                {...(internalPiTest ? {} : {
                  creatorReadiness,
                  onOpenCreatorSettings: (
                    target: Exclude<CreatorReadinessRecoveryTargetV1, null>,
                  ) => openCreatorReadinessSettingsV1("workspace", target),
                  ...(creatorReadiness.status === "ready"
                    ? { providerModel: creatorProviderModelV1("workspace") }
                    : {}),
                })}
                {...(programNetworkAccess?.programId !== routedProgramId ? {} : {
                  networkAccess: {
                    enabled: programNetworkAccess.enabled,
                    pending: networkAccessMutationPending,
                    onChange: setProgramNetworkAccessV1,
                  },
                })}
                {...(agentSnapshot === null ? {} : {
                  executionWorkspace: agentSnapshot.workspace,
                  onRetryExecutionWorkspace: retryAgentWorkspaceV1,
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
            </ActiveProcessMountBoundaryV1>
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
              <ButtonV1
                type="button"
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={() => void controller.retry()}
              >
                {copy.retry}
              </ButtonV1>
            )}
          </aside>
        )}
      </SillyOsOverlayHostV1>
    </div>
  );
}

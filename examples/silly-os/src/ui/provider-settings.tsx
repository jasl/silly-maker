// SPDX-License-Identifier: MIT
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Cloud,
  Eye,
  EyeOff,
  Globe2,
  HardDrive,
  KeyRound,
  Laptop,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Moon,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  sillyOsLocaleRegistryV1,
  type SillyOsCopyV1,
  type SillyOsLocaleV1,
} from "../content/copy.ts";
import type { BrowserPiReasoningEffortV1 } from "../agent/browser-pi-worker-protocol.ts";
import type { SillyOsThemeModeV1 } from "../product/browser-product-preferences-repository.ts";
import { CollectionStateV1 } from "./collection-state.tsx";
import {
  credentialVaultBindingsEqualV2,
  type CredentialVaultBindingV2,
  type CredentialVaultProtectionV2,
} from "../credential/credential-vault-contracts.ts";
import {
  credentialVaultBindingForConnectionV2,
  type CredentialVaultConnectionIdentityV2,
} from "../credential/provider-credential-binding.ts";
import { ButtonV1 as Button, IconButtonV1 } from "./design-system/button.tsx";
import {
  AlertDialogActionV1,
  AlertDialogCancelV1,
  AlertDialogContentV1,
  AlertDialogDescriptionV1,
  AlertDialogTitleV1,
  AlertDialogTriggerV1,
  AlertDialogV1,
} from "./design-system/alert-dialog.tsx";
import { BadgeV1 } from "./design-system/badge.tsx";
import { CheckboxV1 } from "./design-system/checkbox.tsx";
import {
  CardContentV1,
  CardDescriptionV1,
  CardHeaderV1,
  CardTitleV1,
  CardV1,
} from "./design-system/card.tsx";
import { NativeSelectV1 } from "./design-system/native-select.tsx";
import {
  FieldDescriptionV1,
  FieldErrorV1,
  FieldGroupV1,
  FieldLabelV1,
  FieldLegendV1,
  FieldSetV1,
  FieldV1,
} from "./design-system/field.tsx";
import {
  InputGroupAddonV1,
  InputGroupInputV1,
  InputGroupV1,
  InputV1,
} from "./design-system/input.tsx";
import {
  StatusActionV1,
  StatusContentV1,
  StatusDescriptionV1,
  StatusTitleV1,
  StatusV1,
} from "./design-system/status.tsx";
import { ToggleGroupItemV1, ToggleGroupV1 } from "./design-system/toggle-group.tsx";
import { SillyOsBrandV1 } from "./product-chrome.tsx";
import { ProductMenuV1 } from "./product-menu.tsx";
import { ProviderCatalogRowV1 } from "./provider-catalog-row.tsx";
import { formatStorageBytesV1 } from "./storage-format.ts";

export type ProviderSettingsAvailabilityV1 =
  | { readonly status: "available" }
  | {
    readonly status: "unavailable";
    readonly reason:
      | "browser_runtime_unavailable"
      | "credential_flow_unavailable"
      | "public_http_unavailable"
      | "route_configuration_unavailable";
  };

export interface ProviderSettingsBuiltinModelRefV1 {
  readonly providerId: string;
  readonly modelId: string;
}

export type ProviderSettingsCustomApiV1 =
  | "openai-completions"
  | "openai-responses"
  | "anthropic-messages"
  | "google-generative-ai";

export interface ProviderSettingsModelV1 {
  readonly providerId: string;
  readonly modelId: string;
  readonly name: string;
  readonly api: string;
  readonly baseUrl: string;
  readonly contextWindow: number;
  readonly maxTokens: number;
  readonly supportedReasoningEfforts: readonly BrowserPiReasoningEffortV1[];
  readonly defaultReasoningEffort: BrowserPiReasoningEffortV1;
  readonly availability: ProviderSettingsAvailabilityV1;
}

export interface ProviderSettingsProviderV1 {
  readonly providerId: string;
  readonly name: string;
  readonly baseUrl: string | null;
  readonly availability: ProviderSettingsAvailabilityV1;
  readonly models: readonly ProviderSettingsModelV1[];
}

export interface ProviderSettingsCustomProfileV1 {
  readonly profileId: string;
  readonly displayName: string;
  readonly api: ProviderSettingsCustomApiV1;
  readonly baseUrl: string;
  readonly modelId: string;
  readonly contextWindow: number;
  readonly maxTokens: number;
}

export interface ProviderSettingsCustomProfileDraftV1 {
  readonly displayName: string;
  readonly api: ProviderSettingsCustomApiV1;
  readonly baseUrl: string;
  readonly modelId: string;
  readonly contextWindow: number;
  readonly maxTokens: number;
}

export type ProviderSettingsCatalogV1 =
  | { readonly phase: "loading" }
  | { readonly phase: "failed"; readonly diagnosticCode: string }
  | {
    readonly phase: "ready";
    readonly providers: readonly ProviderSettingsProviderV1[];
  };

export type ProviderSettingsSelectionV1 =
  | {
    readonly kind: "builtin";
    readonly providerId: string;
    readonly modelId: string;
    readonly api: ProviderSettingsCustomApiV1;
    readonly baseUrl: string;
  }
  | {
    readonly kind: "custom";
    readonly profile: ProviderSettingsCustomProfileV1;
  };

export type ProviderSettingsConnectionTestV1 =
  | { readonly phase: "disconnected"; readonly active: null }
  | {
    readonly phase: "testing" | "ready" | "test_failed";
    readonly active: ProviderSettingsSelectionV1;
  }
  | {
    readonly phase: "failed";
    readonly active: ProviderSettingsSelectionV1;
    readonly diagnosticCode: string;
  };

interface ProviderSettingsVaultBindingsV1 {
  readonly bindings: readonly CredentialVaultBindingV2[];
}

interface ProviderSettingsVaultProtectionV1 {
  readonly protection: CredentialVaultProtectionV2 | null;
  readonly state: "locked" | "unlocked" | null;
}

export type ProviderSettingsVaultOperationV1 =
  | "initialize"
  | "set_password"
  | "use_device"
  | "unlock"
  | "lock";

export type ProviderSettingsVaultV1 =
  | (
    & { readonly phase: "locked" | "unlocked" }
    & ProviderSettingsVaultBindingsV1
    & ProviderSettingsVaultProtectionV1
  )
  | (
    & {
      readonly phase: "unavailable";
      readonly diagnosticCode?: string;
      readonly protection: null;
      readonly state: null;
    }
    & ProviderSettingsVaultBindingsV1
  )
  | (
    & { readonly phase: "busy"; readonly operation: ProviderSettingsVaultOperationV1 }
    & ProviderSettingsVaultBindingsV1
    & ProviderSettingsVaultProtectionV1
  )
  | (
    & {
      readonly phase: "failed";
      readonly operation: ProviderSettingsVaultOperationV1;
      readonly diagnosticCode: string;
    }
    & ProviderSettingsVaultBindingsV1
    & ProviderSettingsVaultProtectionV1
  );

export type ProviderSettingsSectionV1 = "general" | "providers" | "credential_vault";

export type ProviderSettingsCredentialOperationV1 =
  | { readonly phase: "idle"; readonly target: null }
  | {
    readonly phase: "saving" | "forgetting";
    readonly target: CredentialVaultConnectionIdentityV2;
  }
  | {
    readonly phase: "failed";
    readonly target: CredentialVaultConnectionIdentityV2;
    readonly diagnosticCode: string;
  };

export interface ProviderSettingsCredentialReceiptV1 {
  readonly kind: "saved";
  readonly target: CredentialVaultConnectionIdentityV2;
}

export type ProviderSettingsStorageEstimateV1 =
  | { readonly phase: "checking" }
  | {
    readonly phase: "available";
    readonly usageBytes?: number;
    readonly quotaBytes?: number;
  }
  | { readonly phase: "unavailable"; readonly diagnosticCode?: string };

export interface ProviderSettingsStorageUsageV1 {
  readonly control: ProviderSettingsStorageEstimateV1;
  readonly workspace: ProviderSettingsStorageEstimateV1;
}

export type ProviderSettingsClearAllV1 =
  | { readonly phase: "idle" }
  | { readonly phase: "clearing" }
  | { readonly phase: "failed"; readonly diagnosticCode: string };

export interface ProviderSettingsPropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly catalog: ProviderSettingsCatalogV1;
  readonly customProfiles: readonly ProviderSettingsCustomProfileV1[];
  readonly enabledBuiltinModels: readonly ProviderSettingsBuiltinModelRefV1[];
  readonly preferredBuiltinModel: ProviderSettingsBuiltinModelRefV1 | null;
  readonly connectionTest: ProviderSettingsConnectionTestV1;
  readonly credentialOperation: ProviderSettingsCredentialOperationV1;
  readonly credentialReceipt: ProviderSettingsCredentialReceiptV1 | null;
  readonly vault: ProviderSettingsVaultV1;
  readonly storageUsage: ProviderSettingsStorageUsageV1;
  readonly clearAll: ProviderSettingsClearAllV1;
  readonly initialSection?: ProviderSettingsSectionV1;
  readonly onBack: () => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly theme: SillyOsThemeModeV1;
  readonly onThemeChange: (theme: SillyOsThemeModeV1) => void;
  readonly onRetryCatalog: () => void;
  readonly onSaveCredential: (
    targets: readonly CredentialVaultConnectionIdentityV2[],
    credential: string,
  ) => void;
  readonly onTestConnection: (selection: ProviderSettingsSelectionV1) => void;
  readonly onSetVaultPassword: (passphrase: string) => void;
  readonly onUseAutomaticVault: () => void;
  readonly onUnlockVault: (passphrase: string) => void;
  readonly onLockVault: () => void;
  readonly onForgetCredential: (bindings: readonly CredentialVaultBindingV2[]) => void;
  readonly onRefreshStorageUsage: () => void;
  readonly onClearAllData: () => void;
  readonly onSetBuiltinModelEnabled: (
    model: ProviderSettingsBuiltinModelRefV1,
    enabled: boolean,
  ) => void;
  readonly onCreateCustomProfile: (
    draft: ProviderSettingsCustomProfileDraftV1,
  ) => ProviderSettingsCustomProfileV1 | null;
  readonly onRemoveCustomProfile: (profileId: string) => void;
}

const emptyProvidersV1: readonly ProviderSettingsProviderV1[] = Object.freeze([]);

function assertNeverV1(value: never): never {
  throw new Error(`Unexpected Provider settings value: ${String(value)}`);
}

function sameSelectionV1(
  left: ProviderSettingsSelectionV1 | null,
  right: ProviderSettingsSelectionV1 | null,
): boolean {
  if (left === null || right === null || left.kind !== right.kind) return false;
  if (left.kind === "builtin" && right.kind === "builtin") {
    return left.providerId === right.providerId && left.modelId === right.modelId &&
      left.api === right.api && left.baseUrl === right.baseUrl;
  }
  if (left.kind === "custom" && right.kind === "custom") {
    return left.profile.profileId === right.profile.profileId &&
      left.profile.api === right.profile.api && left.profile.baseUrl === right.profile.baseUrl &&
      left.profile.modelId === right.profile.modelId;
  }
  return false;
}

function inspectedKeyV1(kind: "builtin" | "custom", id: string): string {
  return `${kind}:${id}`;
}

function builtinModelKeyV1(model: ProviderSettingsBuiltinModelRefV1): string {
  return `${model.providerId}\u0000${model.modelId}`;
}

function isProviderSettingsCustomApiV1(value: string): value is ProviderSettingsCustomApiV1 {
  switch (value) {
    case "openai-completions":
    case "openai-responses":
    case "anthropic-messages":
    case "google-generative-ai":
      return true;
    default:
      return false;
  }
}

function builtinProviderCredentialConnectionsV1(
  provider: ProviderSettingsProviderV1,
): readonly Extract<CredentialVaultConnectionIdentityV2, { readonly kind: "builtin" }>[] {
  const baseUrls = [
    provider.baseUrl,
    ...provider.models.filter((model) =>
      model.availability.status === "available" && isProviderSettingsCustomApiV1(model.api)
    ).map((model) => model.baseUrl),
  ];
  const connections: Extract<
    CredentialVaultConnectionIdentityV2,
    { readonly kind: "builtin" }
  >[] = [];
  const admittedBaseUrls = new Set<string>();
  for (const baseUrl of baseUrls) {
    if (baseUrl === null) continue;
    const connection = { kind: "builtin", providerId: provider.providerId, baseUrl } as const;
    try {
      const binding = credentialVaultBindingForConnectionV2(connection);
      if (admittedBaseUrls.has(binding.baseUrl)) continue;
      admittedBaseUrls.add(binding.baseUrl);
      connections.push(Object.freeze({ ...connection, baseUrl: binding.baseUrl }));
    } catch {
      // Invalid catalog routes do not become credential scopes.
    }
  }
  return Object.freeze(connections);
}

function vaultHasAnyCredentialConnectionV1(
  vault: ProviderSettingsVaultV1,
  connections: readonly CredentialVaultConnectionIdentityV2[],
): boolean {
  return connections.some((connection) => {
    const binding = credentialVaultBindingForConnectionOrNullV1(connection);
    return binding !== null &&
      vault.bindings.some((candidate) => credentialVaultBindingsEqualV2(candidate, binding));
  });
}

function credentialVaultBindingForConnectionOrNullV1(
  connection: CredentialVaultConnectionIdentityV2 | null,
): CredentialVaultBindingV2 | null {
  if (connection === null) return null;
  try {
    return credentialVaultBindingForConnectionV2(connection);
  } catch {
    return null;
  }
}

function preferredProviderIdV1(
  providers: readonly ProviderSettingsProviderV1[],
  activeProviderId: string | undefined,
): string | null {
  if (
    activeProviderId !== undefined &&
    providers.some((provider) => provider.providerId === activeProviderId)
  ) return activeProviderId;
  return providers.find((provider) => provider.availability.status === "available")?.providerId ??
    providers[0]?.providerId ?? null;
}

function availabilityLabelV1(
  copy: SillyOsCopyV1,
  availability: ProviderSettingsAvailabilityV1,
): string {
  switch (availability.status) {
    case "available":
      return copy.providerStatusAvailable;
    case "unavailable":
      return copy.providerStatusUnavailable;
  }
  return assertNeverV1(availability);
}

function modelAvailabilityDescriptionV1(
  copy: SillyOsCopyV1,
  availability: ProviderSettingsAvailabilityV1,
): string {
  if (availability.status === "available") return copy.providerStatusAvailable;
  const reason = availability.reason;
  switch (reason) {
    case "browser_runtime_unavailable":
      return copy.providerBrowserUnavailable;
    case "credential_flow_unavailable":
      return copy.providerCredentialUnavailable;
    case "public_http_unavailable":
      return copy.providerPublicHttpUnavailable;
    case "route_configuration_unavailable":
      return copy.providerRouteConfigurationUnavailable;
  }
  return assertNeverV1(reason);
}

function AvailabilityChipV1({
  copy,
  availability,
}: {
  readonly copy: SillyOsCopyV1;
  readonly availability: ProviderSettingsAvailabilityV1;
}): ReactNode {
  return (
    <BadgeV1
      className="provider-settings__availability"
      data-availability={availability.status}
      variant={availability.status === "available" ? "success" : "neutral"}
    >
      {availability.status === "available" ? <Check size={11} aria-hidden="true" /> : null}
      {availabilityLabelV1(copy, availability)}
    </BadgeV1>
  );
}

function SettingsTopbarV1({
  copy,
  onBack,
  onLocaleChange,
  theme,
  onThemeChange,
}: {
  readonly copy: SillyOsCopyV1;
  readonly onBack: () => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly theme: SillyOsThemeModeV1;
  readonly onThemeChange: (theme: SillyOsThemeModeV1) => void;
}): ReactNode {
  return (
    <header className="silly-os-topbar silly-os-settings__topbar">
      <div className="silly-os-settings__topbar-leading">
        <IconButtonV1
          className="silly-os-settings__back"
          variant="ghost"
          size="sm"
          icon={ArrowLeft}
          autoFocus
          accessibleName={copy.settingsBack}
          onClick={onBack}
        />
        <SillyOsBrandV1 copy={copy} />
        <span className="silly-os-settings__crumb" aria-hidden="true">/</span>
        <span className="silly-os-settings__title" id="silly-os-settings-title">
          {copy.settings}
        </span>
      </div>
      <ProductMenuV1
        copy={copy}
        theme={theme}
        surface="settings"
        onThemeChange={onThemeChange}
        onLocaleChange={onLocaleChange}
      />
    </header>
  );
}

function SettingsNavigationV1({
  copy,
  section,
  onSelect,
}: {
  readonly copy: SillyOsCopyV1;
  readonly section: ProviderSettingsSectionV1;
  readonly onSelect: (section: ProviderSettingsSectionV1) => void;
}): ReactNode {
  const items = [
    {
      section: "general" as const,
      label: copy.settingsCategoryGeneral,
      icon: Settings2,
    },
    {
      section: "providers" as const,
      label: copy.settingsCategoryProviders,
      icon: Cloud,
    },
    {
      section: "credential_vault" as const,
      label: copy.settingsCategoryCredentialVault,
      icon: ShieldCheck,
    },
  ];
  return (
    <aside className="silly-os-settings__navigation" aria-label={copy.settings}>
      <nav>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.section}
              type="button"
              className={section === item.section ? "is-active" : undefined}
              aria-current={section === item.section ? "page" : undefined}
              onClick={() => onSelect(item.section)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

interface StorageEstimateMetricV1 {
  readonly value: string;
  readonly quota: string | null;
  readonly usageBytes: number | null;
  readonly diagnosticCode?: string;
}

function admittedStorageNumberV1(value: number | undefined): number | null {
  return value !== undefined && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function storageEstimateMetricV1(
  copy: SillyOsCopyV1,
  estimate: ProviderSettingsStorageEstimateV1,
): StorageEstimateMetricV1 {
  if (estimate.phase === "checking") {
    return { value: copy.settingsStorageChecking, quota: null, usageBytes: null };
  }
  if (estimate.phase === "unavailable") {
    return {
      value: copy.settingsStorageUnavailable,
      quota: null,
      usageBytes: null,
      ...(estimate.diagnosticCode === undefined ? {} : { diagnosticCode: estimate.diagnosticCode }),
    };
  }
  const usageBytes = admittedStorageNumberV1(estimate.usageBytes);
  const quotaBytes = admittedStorageNumberV1(estimate.quotaBytes);
  return {
    value: usageBytes === null
      ? copy.settingsStorageUsageUnavailable
      : formatStorageBytesV1(usageBytes, copy.locale),
    quota: quotaBytes === null
      ? null
      : `${copy.settingsStorageQuota}: ${formatStorageBytesV1(quotaBytes, copy.locale)}`,
    usageBytes,
  };
}

function StorageEstimateV1({
  label,
  description,
  metric,
}: {
  readonly label: string;
  readonly description: string;
  readonly metric: StorageEstimateMetricV1;
}): ReactNode {
  return (
    <article
      className="silly-os-settings__storage-estimate"
      data-diagnostic-code={metric.diagnosticCode}
    >
      <div>
        <strong>{label}</strong>
        <small>{description}</small>
      </div>
      <div className="silly-os-settings__storage-value">
        <strong>{metric.value}</strong>
        {metric.quota === null ? null : <small>{metric.quota}</small>}
      </div>
    </article>
  );
}

function GeneralSettingsV1({
  copy,
  storageUsage,
  clearAll,
  onLocaleChange,
  theme,
  onThemeChange,
  onRefreshStorageUsage,
  onClearAllData,
}: {
  readonly copy: SillyOsCopyV1;
  readonly storageUsage: ProviderSettingsStorageUsageV1;
  readonly clearAll: ProviderSettingsClearAllV1;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly theme: SillyOsThemeModeV1;
  readonly onThemeChange: (theme: SillyOsThemeModeV1) => void;
  readonly onRefreshStorageUsage: () => void;
  readonly onClearAllData: () => void;
}): ReactNode {
  const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false);
  const [clearSubmitted, setClearSubmitted] = useState(false);
  const clearSubmittedRef = useRef(false);
  const clearBusy = clearAll.phase === "clearing";
  const storageChecking = storageUsage.control.phase === "checking" ||
    storageUsage.workspace.phase === "checking";

  const controlMetric = storageEstimateMetricV1(copy, storageUsage.control);
  const workspaceMetric = storageEstimateMetricV1(copy, storageUsage.workspace);
  const reportedUsageBytes = [controlMetric.usageBytes, workspaceMetric.usageBytes].filter(
    (value): value is number => value !== null,
  );
  const reportedUsageTotal = reportedUsageBytes.length === 0
    ? null
    : reportedUsageBytes.reduce((total, value) => total + value, 0);

  return (
    <div className="silly-os-settings__standalone">
      <header>
        <Settings2 size={22} aria-hidden="true" />
        <div>
          <h1>{copy.settingsCategoryGeneral}</h1>
          <p>{copy.settingsGeneralDescription}</p>
        </div>
      </header>
      <CardV1 className="silly-os-settings__preference-card">
        <CardHeaderV1>
          <CardTitleV1>{copy.settingsTheme}</CardTitleV1>
          <CardDescriptionV1>{copy.settingsThemeDescription}</CardDescriptionV1>
        </CardHeaderV1>
        <CardContentV1>
          <ToggleGroupV1
            type="single"
            value={theme}
            aria-label={copy.settingsTheme}
            onValueChange={(value) => {
              if (value === "system" || value === "light" || value === "dark") {
                onThemeChange(value);
              }
            }}
          >
            <ToggleGroupItemV1 value="system" aria-label={copy.themeSystem}>
              <Laptop className="sos:size-4" aria-hidden="true" />
              <span className="sos:hidden sos:sm:inline">{copy.themeSystem}</span>
            </ToggleGroupItemV1>
            <ToggleGroupItemV1 value="light" aria-label={copy.themeLight}>
              <Sun className="sos:size-4" aria-hidden="true" />
              <span className="sos:hidden sos:sm:inline">{copy.themeLight}</span>
            </ToggleGroupItemV1>
            <ToggleGroupItemV1 value="dark" aria-label={copy.themeDark}>
              <Moon className="sos:size-4" aria-hidden="true" />
              <span className="sos:hidden sos:sm:inline">{copy.themeDark}</span>
            </ToggleGroupItemV1>
          </ToggleGroupV1>
        </CardContentV1>
      </CardV1>
      <CardV1 className="silly-os-settings__preference-card">
        <CardHeaderV1>
          <CardTitleV1>{copy.settingsLanguage}</CardTitleV1>
          <CardDescriptionV1>{copy.settingsLanguageDescription}</CardDescriptionV1>
        </CardHeaderV1>
        <CardContentV1>
          <NativeSelectV1
            controlSize="large"
            aria-label={copy.settingsLanguage}
            value={copy.locale}
            onChange={(event) => onLocaleChange(event.currentTarget.value as SillyOsLocaleV1)}
          >
            {sillyOsLocaleRegistryV1.map((locale) => (
              <option key={locale.value} value={locale.value}>{locale.label}</option>
            ))}
          </NativeSelectV1>
        </CardContentV1>
      </CardV1>
      <CardV1
        className="silly-os-settings__data-card"
        aria-labelledby="silly-os-data-management-title"
      >
        <CardHeaderV1 className="silly-os-settings__data-heading">
          <span aria-hidden="true">
            <HardDrive size={19} />
          </span>
          <div>
            <CardTitleV1 id="silly-os-data-management-title">
              {copy.settingsDataManagement}
            </CardTitleV1>
            <CardDescriptionV1>{copy.settingsDataManagementDescription}</CardDescriptionV1>
          </div>
        </CardHeaderV1>
        <CardContentV1>
          <div className="silly-os-settings__storage-grid" aria-live="polite">
            <StorageEstimateV1
              label={copy.settingsStorageSillyOsData}
              description={copy.settingsStorageSillyOsDataDescription}
              metric={controlMetric}
            />
            <StorageEstimateV1
              label={copy.settingsStorageWorkspaceData}
              description={copy.settingsStorageWorkspaceDataDescription}
              metric={workspaceMetric}
            />
          </div>
          <div className="silly-os-settings__storage-summary">
            <div>
              {reportedUsageTotal === null ? null : (
                <p>
                  <span>{copy.settingsStorageReportedTotal}</span>
                  <strong>{formatStorageBytesV1(reportedUsageTotal, copy.locale)}</strong>
                </p>
              )}
              <small>{copy.settingsStorageAdvisory}</small>
            </div>
            <Button
              type="button"
              variant="secondary"
              icon={RefreshCcw}
              disabled={storageChecking || clearBusy}
              onClick={onRefreshStorageUsage}
            >
              {copy.settingsStorageRefresh}
            </Button>
          </div>
          <AlertDialogV1
            open={clearConfirmationOpen}
            onOpenChange={(open) => {
              if (!open && clearBusy) return;
              clearSubmittedRef.current = false;
              setClearSubmitted(false);
              setClearConfirmationOpen(open);
            }}
          >
            <div className="silly-os-settings__clear-row">
              <div>
                <strong>{copy.settingsClearAllTitle}</strong>
                <p>{copy.settingsClearAllDescription}</p>
              </div>
              <AlertDialogTriggerV1>
                <Button
                  type="button"
                  variant="destructive"
                  icon={Trash2}
                  disabled={clearBusy}
                >
                  {copy.settingsClearAllAction}
                </Button>
              </AlertDialogTriggerV1>
            </div>
            <AlertDialogContentV1
              className="silly-os-settings__clear-dialog"
              aria-busy={clearBusy || undefined}
              onEscapeKeyDown={(event) => {
                if (clearBusy) event.preventDefault();
              }}
            >
              <span className="silly-os-settings__clear-dialog-mark" aria-hidden="true">
                <Trash2 size={21} />
              </span>
              <div className="silly-os-settings__clear-dialog-copy">
                <AlertDialogTitleV1>{copy.settingsClearAllConfirmTitle}</AlertDialogTitleV1>
                <AlertDialogDescriptionV1>
                  {copy.settingsClearAllConfirmDescription}
                </AlertDialogDescriptionV1>
                <StatusV1 variant="warning" icon={TriangleAlert}>
                  <StatusContentV1>
                    <StatusTitleV1>{copy.settingsClearAllConfirmWarning}</StatusTitleV1>
                  </StatusContentV1>
                </StatusV1>
                {clearAll.phase === "failed"
                  ? (
                    <StatusV1
                      className="silly-os-settings__clear-error"
                      variant="danger"
                      data-diagnostic-code={clearAll.diagnosticCode}
                      role="alert"
                    >
                      <StatusContentV1>
                        <StatusTitleV1>{copy.settingsClearAllFailed}</StatusTitleV1>
                      </StatusContentV1>
                    </StatusV1>
                  )
                  : null}
              </div>
              <div className="silly-os-settings__clear-dialog-actions">
                <AlertDialogCancelV1>
                  <Button type="button" variant="secondary" disabled={clearBusy}>
                    {copy.settingsClearAllCancel}
                  </Button>
                </AlertDialogCancelV1>
                <AlertDialogActionV1>
                  <Button
                    type="button"
                    variant="destructive"
                    icon={clearBusy ? LoaderCircle : Trash2}
                    aria-busy={clearBusy || undefined}
                    disabled={clearBusy || clearSubmitted}
                    onClick={(event) => {
                      event.preventDefault();
                      if (clearSubmittedRef.current || clearBusy) return;
                      clearSubmittedRef.current = true;
                      setClearSubmitted(true);
                      onClearAllData();
                    }}
                  >
                    {clearBusy ? copy.settingsClearingAll : copy.settingsClearAllAction}
                  </Button>
                </AlertDialogActionV1>
              </div>
            </AlertDialogContentV1>
          </AlertDialogV1>
          {clearAll.phase === "failed" && !clearConfirmationOpen
            ? (
              <StatusV1
                className="silly-os-settings__clear-error"
                variant="danger"
                icon={TriangleAlert}
                data-diagnostic-code={clearAll.diagnosticCode}
                role="alert"
              >
                <StatusContentV1>
                  <StatusTitleV1>{copy.settingsClearAllFailed}</StatusTitleV1>
                </StatusContentV1>
              </StatusV1>
            )
            : null}
        </CardContentV1>
      </CardV1>
    </div>
  );
}

function CatalogStateV1({
  copy,
  catalog,
  onRetry,
}: {
  readonly copy: SillyOsCopyV1;
  readonly catalog: Extract<ProviderSettingsCatalogV1, { readonly phase: "loading" | "failed" }>;
  readonly onRetry: () => void;
}): ReactNode {
  if (catalog.phase === "loading") {
    return (
      <CollectionStateV1
        className="provider-settings__catalog-state"
        icon={LoaderCircle}
        iconMotion="spin"
        title={copy.providerCatalogLoading}
        description={copy.providerCatalogLoadingDescription}
        role="status"
        aria-live="polite"
      />
    );
  }
  return (
    <CollectionStateV1
      className="provider-settings__catalog-state"
      icon={TriangleAlert}
      tone="danger"
      title={copy.providerCatalogFailed}
      description={copy.providerCatalogFailedDescription}
      action={<Button variant="secondary" onClick={onRetry}>{copy.retry}</Button>}
      data-diagnostic-code={catalog.diagnosticCode}
      role="alert"
    />
  );
}

function vaultStatusCopyV1(
  copy: SillyOsCopyV1,
  vault: ProviderSettingsVaultV1,
): { readonly title: string; readonly description: string } {
  switch (vault.phase) {
    case "locked":
      return {
        title: copy.credentialVaultLockedTitle,
        description: copy.credentialVaultLockedDescription,
      };
    case "unlocked":
      return {
        title: copy.credentialVaultUnlockedTitle,
        description: copy.credentialVaultUnlockedDescription,
      };
    case "unavailable":
      return {
        title: copy.credentialVaultUnavailableTitle,
        description: copy.credentialVaultUnavailableDescription,
      };
    case "busy":
      return {
        title: copy.credentialVaultBusyTitle,
        description: copy.credentialVaultBusyDescription,
      };
    case "failed":
      return {
        title: copy.credentialVaultFailedTitle,
        description: copy.credentialVaultFailedDescription,
      };
  }
  return assertNeverV1(vault);
}

function CredentialVaultPassphraseFormV1({
  copy,
  mode,
  disabled,
  onSubmit,
}: {
  readonly copy: SillyOsCopyV1;
  readonly mode: "set_password" | "change_password" | "unlock";
  readonly disabled?: boolean;
  readonly onSubmit: (passphrase: string) => void;
}): ReactNode {
  const passphraseRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const [mismatch, setMismatch] = useState(false);
  const passphraseId = useId();
  const confirmationId = useId();
  const mismatchId = useId();

  const submitV1 = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const passphraseInput = passphraseRef.current;
    const confirmationInput = confirmationRef.current;
    const passphrase = passphraseInput?.value ?? "";
    if (passphrase.length === 0) return;
    if (mode !== "unlock" && confirmationInput?.value !== passphrase) {
      setMismatch(true);
      confirmationInput?.focus();
      return;
    }
    setMismatch(false);
    if (passphraseInput !== null) passphraseInput.value = "";
    if (confirmationInput !== null) confirmationInput.value = "";
    onSubmit(passphrase);
  };

  return (
    <form className="provider-settings__vault-form" onSubmit={submitV1}>
      <FieldGroupV1
        className="provider-settings__vault-fields"
        data-field-count={mode === "unlock" ? "one" : "two"}
      >
        <FieldV1>
          <FieldLabelV1 htmlFor={passphraseId}>{copy.credentialVaultPassphrase}</FieldLabelV1>
          <InputV1
            id={passphraseId}
            controlSize="sm"
            ref={passphraseRef}
            type="password"
            required
            autoComplete={mode === "unlock" ? "current-password" : "new-password"}
            disabled={disabled}
            onInput={() => setMismatch(false)}
          />
        </FieldV1>
        {mode !== "unlock"
          ? (
            <FieldV1 data-invalid={mismatch || undefined}>
              <FieldLabelV1 htmlFor={confirmationId}>
                {copy.credentialVaultConfirmPassphrase}
              </FieldLabelV1>
              <InputV1
                id={confirmationId}
                controlSize="sm"
                ref={confirmationRef}
                type="password"
                required
                autoComplete="new-password"
                disabled={disabled}
                aria-invalid={mismatch || undefined}
                aria-describedby={mismatch ? mismatchId : undefined}
                onInput={() => setMismatch(false)}
              />
            </FieldV1>
          )
          : null}
      </FieldGroupV1>
      <Button type="submit" variant="secondary" icon={LockKeyhole} disabled={disabled}>
        {mode === "set_password"
          ? copy.credentialVaultSwitchToPassword
          : mode === "change_password"
          ? copy.credentialVaultChangePassword
          : copy.credentialVaultUnlock}
      </Button>
      {mismatch
        ? (
          <FieldErrorV1 id={mismatchId}>
            {copy.credentialVaultPassphraseMismatch}
          </FieldErrorV1>
        )
        : null}
    </form>
  );
}

function CredentialVaultPanelV1({
  copy,
  vault,
  onSetVaultPassword,
  onUseAutomaticVault,
  onUnlockVault,
  onLockVault,
  onForgetCredential,
}: {
  readonly copy: SillyOsCopyV1;
  readonly vault: ProviderSettingsVaultV1;
  readonly onSetVaultPassword: ProviderSettingsPropsV1["onSetVaultPassword"];
  readonly onUseAutomaticVault: ProviderSettingsPropsV1["onUseAutomaticVault"];
  readonly onUnlockVault: ProviderSettingsPropsV1["onUnlockVault"];
  readonly onLockVault: ProviderSettingsPropsV1["onLockVault"];
  readonly onForgetCredential: ProviderSettingsPropsV1["onForgetCredential"];
}): ReactNode {
  const status = vaultStatusCopyV1(copy, vault);
  const unlocked = vault.state === "unlocked";
  const passwordMode = vault.protection === "password";
  const busy = vault.phase === "busy";
  const canForget = unlocked && !busy;
  const statusIcon = busy
    ? LoaderCircle
    : vault.phase === "failed" || vault.phase === "unavailable"
    ? TriangleAlert
    : vault.phase === "unlocked"
    ? ShieldCheck
    : LockKeyhole;
  const statusVariant = vault.phase === "failed" || vault.phase === "unavailable"
    ? "danger" as const
    : vault.phase === "unlocked"
    ? "success" as const
    : "info" as const;

  return (
    <section
      className="provider-settings__section provider-settings__vault"
      data-vault-phase={vault.phase}
      aria-label={copy.credentialVaultTitle}
    >
      <StatusV1
        className="provider-settings__vault-status"
        variant={statusVariant}
        icon={statusIcon}
        role={vault.phase === "failed" || vault.phase === "unavailable"
          ? "alert"
          : vault.phase === "busy"
          ? "status"
          : undefined}
        data-busy={busy || undefined}
        data-diagnostic-code={vault.phase === "failed" || vault.phase === "unavailable"
          ? vault.diagnosticCode
          : undefined}
      >
        <StatusContentV1>
          <StatusTitleV1>{status.title}</StatusTitleV1>
          <StatusDescriptionV1>{status.description}</StatusDescriptionV1>
        </StatusContentV1>
        {passwordMode && unlocked
          ? (
            <StatusActionV1>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={onLockVault}
              >
                {copy.credentialVaultLock}
              </Button>
            </StatusActionV1>
          )
          : null}
      </StatusV1>
      <div className="provider-settings__vault-mode">
        <div>
          <strong>{copy.credentialVaultModeTitle}</strong>
          <span data-vault-mode={vault.protection ?? "unavailable"}>
            {vault.protection === "device"
              ? copy.credentialVaultAutomaticMode
              : vault.protection === "password"
              ? copy.credentialVaultPasswordMode
              : copy.credentialVaultUnavailableTitle}
          </span>
        </div>
        <p>
          {vault.protection === "device"
            ? copy.credentialVaultAutomaticDescription
            : vault.protection === "password"
            ? copy.credentialVaultPasswordDescription
            : copy.credentialVaultUnavailableDescription}
        </p>
      </div>
      {passwordMode && vault.state === "locked"
        ? (
          <CredentialVaultPassphraseFormV1
            copy={copy}
            mode="unlock"
            disabled={busy}
            onSubmit={onUnlockVault}
          />
        )
        : unlocked
        ? (
          <div className="provider-settings__vault-protection-actions">
            {passwordMode
              ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={onUseAutomaticVault}
                >
                  {copy.credentialVaultSwitchToAutomatic}
                </Button>
              )
              : null}
            <CredentialVaultPassphraseFormV1
              copy={copy}
              mode={passwordMode ? "change_password" : "set_password"}
              disabled={busy}
              onSubmit={onSetVaultPassword}
            />
          </div>
        )
        : null}
      {vault.protection !== null
        ? (
          <p className="provider-settings__vault-security-notice">
            {vault.protection === "device"
              ? copy.credentialVaultAutomaticSecurityNotice
              : copy.credentialVaultPasswordSecurityNotice}
          </p>
        )
        : null}
      <div className="provider-settings__vault-bindings">
        <div>
          <strong>{copy.credentialVaultBindingsTitle}</strong>
          <span>
            {String(vault.bindings.length)} {copy.credentialVaultBindingsCountSuffix}
          </span>
        </div>
        {vault.bindings.length === 0 ? <p>{copy.credentialVaultBindingsEmpty}</p> : (
          <ul>
            {vault.bindings.map((binding) => (
              <li key={`${binding.bindingId}\u0000${binding.baseUrl}`}>
                <span>
                  <code title={binding.bindingId}>{binding.bindingId}</code>
                  <small title={binding.baseUrl}>{binding.baseUrl}</small>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!canForget}
                  aria-label={`${copy.credentialVaultForgetBinding} ${binding.bindingId} ${binding.baseUrl}`}
                  onClick={() =>
                    onForgetCredential(Object.freeze([binding]))}
                >
                  {copy.credentialVaultForgetBinding}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

interface ProviderConnectionTargetV1 {
  readonly connection: CredentialVaultConnectionIdentityV2 | null;
  readonly saveTargets: readonly CredentialVaultConnectionIdentityV2[];
  readonly testSelection: ProviderSettingsSelectionV1 | null;
  readonly endpoints: readonly string[];
  readonly testModels: readonly ProviderSettingsModelV1[];
  readonly configurable: boolean;
  readonly unavailableMessage: string;
  readonly custom: boolean;
}

function connectionTargetKeyV1(
  connection: CredentialVaultConnectionIdentityV2 | null,
): string {
  if (connection === null) return "none";
  return connection.kind === "builtin"
    ? `builtin:${connection.providerId}:${connection.baseUrl}`
    : `custom:${connection.profileId}:${connection.baseUrl}`;
}

function connectionTargetsKeyV1(
  connections: readonly CredentialVaultConnectionIdentityV2[],
): string {
  return connections.length === 0 ? "none" : connections.map(connectionTargetKeyV1).join("\u0000");
}

function sameConnectionIdentityV1(
  left: CredentialVaultConnectionIdentityV2 | null,
  right: CredentialVaultConnectionIdentityV2 | null,
): boolean {
  if (left === null || right === null || left.kind !== right.kind) return left === right;
  return left.kind === "builtin" && right.kind === "builtin"
    ? left.providerId === right.providerId && left.baseUrl === right.baseUrl
    : left.kind === "custom" && right.kind === "custom" &&
      left.profileId === right.profileId && left.baseUrl === right.baseUrl;
}

function ProviderConnectionTestV1({
  copy,
  target,
  connectionTest,
  mutationPending,
  hasStoredBinding,
  onSelectTestModel,
  onTestConnection,
}: {
  readonly copy: SillyOsCopyV1;
  readonly target: ProviderConnectionTargetV1;
  readonly connectionTest: ProviderSettingsConnectionTestV1;
  readonly mutationPending: boolean;
  readonly hasStoredBinding: boolean;
  readonly onSelectTestModel: (modelId: string) => void;
  readonly onTestConnection: ProviderSettingsPropsV1["onTestConnection"];
}): ReactNode {
  const testMatches = sameSelectionV1(connectionTest.active, target.testSelection);
  const testing = connectionTest.phase === "testing" && testMatches;
  const ready = connectionTest.phase === "ready" && testMatches;
  const testFailed = connectionTest.phase === "test_failed" && testMatches;
  const testWorkerFailed = connectionTest.phase === "failed" && testMatches;
  const statusCopy = testing
    ? copy.providerTesting
    : ready
    ? copy.providerConnectionPassed
    : testFailed
    ? copy.providerConnectionFailed
    : testWorkerFailed
    ? copy.providerWorkerUnavailable
    : null;
  const statusModelId = testing || ready || testFailed || testWorkerFailed
    ? target.testSelection?.kind === "builtin"
      ? target.testSelection.modelId
      : target.testSelection?.profile.modelId ?? null
    : null;
  const statusIcon = testing
    ? LoaderCircle
    : testFailed || testWorkerFailed
    ? TriangleAlert
    : Check;
  const statusVariant = testFailed || testWorkerFailed
    ? "danger" as const
    : ready
    ? "success" as const
    : "info" as const;

  return (
    <section
      className="provider-settings__connection-test"
      aria-labelledby="connection-test-title"
    >
      <div className="provider-settings__connection-test-heading">
        <strong id="connection-test-title">{copy.providerTestConnection}</strong>
        <small>{copy.providerConnectionTestNotice}</small>
      </div>
      {statusCopy === null ? null : (
        <StatusV1
          className="provider-settings__connection-status"
          variant={statusVariant}
          icon={statusIcon}
          data-busy={testing || undefined}
          data-diagnostic-code={connectionTest.phase === "failed"
            ? connectionTest.diagnosticCode
            : undefined}
          role={testFailed || testWorkerFailed ? "alert" : "status"}
        >
          <StatusContentV1>
            <StatusTitleV1>{statusCopy}</StatusTitleV1>
            {statusModelId === null
              ? null
              : <StatusDescriptionV1>{statusModelId}</StatusDescriptionV1>}
          </StatusContentV1>
        </StatusV1>
      )}
      {!target.custom
        ? (
          <label className="provider-settings__connection-model">
            <span>
              <strong>{copy.providerConnectionModelLabel}</strong>
              <small>{copy.providerConnectionModelDescription}</small>
            </span>
            <NativeSelectV1
              value={target.testSelection?.kind === "builtin" ? target.testSelection.modelId : ""}
              disabled={target.testModels.length === 0 || mutationPending}
              onChange={(event) => onSelectTestModel(event.currentTarget.value)}
            >
              {target.testModels.length === 0
                ? <option value="">{copy.providerConnectionModelEmpty}</option>
                : target.testModels.map((model) => (
                  <option key={model.modelId} value={model.modelId}>
                    {model.name} · {model.modelId}
                  </option>
                ))}
            </NativeSelectV1>
          </label>
        )
        : null}
      <div className="provider-settings__connection-actions">
        <Button
          type="button"
          variant="secondary"
          disabled={!hasStoredBinding || target.testSelection === null || mutationPending ||
            testing}
          onClick={() => {
            if (target.testSelection !== null) onTestConnection(target.testSelection);
          }}
        >
          {testing ? copy.providerTesting : copy.providerTestConnection}
        </Button>
        <small>
          {hasStoredBinding
            ? copy.providerTestResultPointInTime
            : copy.providerTestRequiresSavedKey}
        </small>
      </div>
    </section>
  );
}

function ProviderConnectionSectionV1({
  copy,
  target,
  connectionTest,
  credentialOperation,
  credentialReceipt,
  vault,
  onSelectTestModel,
  onSaveCredential,
  onTestConnection,
  onForgetCredential,
  onOpenVaultSettings,
}: {
  readonly copy: SillyOsCopyV1;
  readonly target: ProviderConnectionTargetV1;
  readonly connectionTest: ProviderSettingsConnectionTestV1;
  readonly credentialOperation: ProviderSettingsCredentialOperationV1;
  readonly credentialReceipt: ProviderSettingsCredentialReceiptV1 | null;
  readonly vault: ProviderSettingsVaultV1;
  readonly onSelectTestModel: (modelId: string) => void;
  readonly onSaveCredential: ProviderSettingsPropsV1["onSaveCredential"];
  readonly onTestConnection: ProviderSettingsPropsV1["onTestConnection"];
  readonly onForgetCredential: ProviderSettingsPropsV1["onForgetCredential"];
  readonly onOpenVaultSettings: () => void;
}): ReactNode {
  const [keyVisible, setKeyVisible] = useState(false);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const apiKeyId = useId();
  const storedBinding = credentialVaultBindingForConnectionOrNullV1(target.connection);
  const hasStoredBinding = storedBinding !== null &&
    vault.bindings.some((binding) => credentialVaultBindingsEqualV2(binding, storedBinding));
  const storedSaveTargetBindings = target.saveTargets.flatMap((connection) => {
    const binding = credentialVaultBindingForConnectionOrNullV1(connection);
    if (binding === null) return [];
    const stored = vault.bindings.find((candidate) =>
      credentialVaultBindingsEqualV2(candidate, binding)
    );
    return stored === undefined ? [] : [stored];
  });
  const vaultUnlocked = vault.state === "unlocked" && vault.phase !== "busy";
  const credentialMatches = target.saveTargets.some((connection) =>
    sameConnectionIdentityV1(credentialOperation.target, connection)
  );
  const saving = credentialOperation.phase === "saving" && credentialMatches;
  const forgetting = credentialOperation.phase === "forgetting" && credentialMatches;
  const credentialFailed = credentialOperation.phase === "failed" && credentialMatches;
  const hasCredentialSaveReceipt = credentialReceipt !== null &&
    target.saveTargets.some((connection) =>
      sameConnectionIdentityV1(credentialReceipt.target, connection)
    );
  const mutationPending = saving || forgetting;

  const submitV1 = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const input = keyInputRef.current;
    if (!target.configurable || target.saveTargets.length === 0 || input?.value.length === 0) {
      return;
    }
    let credential = input?.value ?? "";
    if (input !== null) input.value = "";
    onSaveCredential(target.saveTargets, credential);
    credential = "";
  };

  const credentialStatusCopy = saving
    ? copy.providerSaving
    : forgetting
    ? copy.providerDeletingCredential
    : credentialFailed
    ? copy.providerWorkerUnavailable
    : hasCredentialSaveReceipt
    ? copy.providerCredentialSaved
    : null;
  const showingCredentialReceipt = hasCredentialSaveReceipt && !saving && !forgetting &&
    !credentialFailed;
  const credentialStatusIcon = saving || forgetting
    ? LoaderCircle
    : credentialFailed
    ? TriangleAlert
    : Check;
  const credentialStatusVariant = credentialFailed ? "danger" as const : "info" as const;

  return (
    <section
      className="provider-settings__section provider-settings__credential"
      aria-labelledby="connection-title"
      data-connection-target={connectionTargetKeyV1(target.connection)}
    >
      <div className="provider-settings__section-heading">
        <div>
          <h3 id="connection-title">{copy.providerConnectionTitle}</h3>
          <p>{copy.providerConnectionDescription}</p>
        </div>
        <KeyRound size={18} aria-hidden="true" />
      </div>
      <div className="provider-settings__endpoint">
        <div>
          <Globe2 size={16} aria-hidden="true" />
          <span>
            <strong>{copy.providerEndpointLabel}</strong>
            <small>
              {target.custom
                ? copy.providerEndpointCustomDescription
                : copy.providerEndpointPresetDescription}
            </small>
          </span>
        </div>
        {target.endpoints.length === 0
          ? <p>{copy.providerEndpointManaged}</p>
          : target.endpoints.map((endpoint, index) => (
            <InputV1
              key={endpoint}
              controlSize="sm"
              aria-label={target.endpoints.length === 1
                ? copy.providerEndpointLabel
                : `${copy.providerEndpointLabel} ${String(index + 1)}`}
              value={endpoint}
              readOnly
              spellCheck={false}
              data-endpoint-editable={target.custom ? "custom-profile" : "false"}
            />
          ))}
      </div>
      {!target.configurable || target.connection === null
        ? (
          <p className="provider-settings__connection-note" role="status">
            {target.unavailableMessage}
          </p>
        )
        : !vaultUnlocked
        ? (
          <div className="provider-settings__connection-note" role="status">
            <span>
              {vault.phase === "unavailable"
                ? copy.credentialVaultUnavailableDescription
                : copy.credentialVaultLockedDescription}
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={onOpenVaultSettings}>
              {copy.credentialVaultTitle}
            </Button>
          </div>
        )
        : (
          <form
            className="provider-settings__credential-form"
            data-key-saved={String(hasStoredBinding)}
            onSubmit={submitV1}
          >
            {credentialStatusCopy !== null
              ? (
                <StatusV1
                  className="provider-settings__connection-status"
                  variant={credentialStatusVariant}
                  icon={credentialStatusIcon}
                  data-busy={saving || forgetting || undefined}
                  data-diagnostic-code={credentialOperation.phase === "failed"
                    ? credentialOperation.diagnosticCode
                    : undefined}
                  data-credential-receipt={showingCredentialReceipt ? "saved" : undefined}
                  role={credentialFailed ? "alert" : "status"}
                >
                  <StatusContentV1>
                    <StatusTitleV1>{credentialStatusCopy}</StatusTitleV1>
                  </StatusContentV1>
                </StatusV1>
              )
              : null}
            <FieldLabelV1 htmlFor={apiKeyId}>{copy.providerKeyLabel}</FieldLabelV1>
            <div className="provider-settings__credential-controls">
              <InputGroupV1 className="provider-settings__key-input">
                <InputGroupInputV1
                  id={apiKeyId}
                  controlSize="sm"
                  ref={keyInputRef}
                  type={keyVisible ? "text" : "password"}
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={hasStoredBinding
                    ? copy.providerReplacementKeyPlaceholder
                    : copy.providerKeyPlaceholder}
                  disabled={mutationPending}
                />
                <InputGroupAddonV1>
                  <IconButtonV1
                    type="button"
                    variant="ghost"
                    size="sm"
                    accessibleName={keyVisible ? copy.providerHideKey : copy.providerShowKey}
                    icon={keyVisible ? EyeOff : Eye}
                    onClick={() => setKeyVisible((current) => !current)}
                  />
                </InputGroupAddonV1>
              </InputGroupV1>
              <span className="provider-settings__credential-actions">
                <Button type="submit" variant="primary" disabled={mutationPending}>
                  {saving
                    ? copy.providerSaving
                    : hasStoredBinding
                    ? copy.providerUpdateCredential
                    : copy.providerSaveCredential}
                </Button>
                {storedSaveTargetBindings.length > 0
                  ? (
                    <IconButtonV1
                      type="button"
                      variant="destructive"
                      icon={Trash2}
                      accessibleName={copy.providerDeleteCredential}
                      title={copy.providerDeleteCredential}
                      aria-busy={forgetting}
                      disabled={mutationPending}
                      onClick={() => onForgetCredential(Object.freeze(storedSaveTargetBindings))}
                    />
                  )
                  : null}
              </span>
            </div>
            <ProviderConnectionTestV1
              copy={copy}
              target={target}
              connectionTest={connectionTest}
              mutationPending={mutationPending}
              hasStoredBinding={hasStoredBinding}
              onSelectTestModel={onSelectTestModel}
              onTestConnection={onTestConnection}
            />
          </form>
        )}
    </section>
  );
}

function CustomProfileFormV1({
  copy,
  failed,
  onCreate,
}: {
  readonly copy: SillyOsCopyV1;
  readonly failed: boolean;
  readonly onCreate: (draft: ProviderSettingsCustomProfileDraftV1) => void;
}): ReactNode {
  const fieldPrefix = useId();
  const fieldIdV1 = (name: string): string => `${fieldPrefix}-${name}`;
  return (
    <form
      className="provider-settings__custom-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onCreate({
          displayName: String(form.get("displayName") ?? ""),
          api: String(form.get("api") ?? "openai-completions") as ProviderSettingsCustomApiV1,
          baseUrl: String(form.get("baseUrl") ?? ""),
          modelId: String(form.get("modelId") ?? ""),
          contextWindow: Number(form.get("contextWindow")),
          maxTokens: Number(form.get("maxTokens")),
        });
      }}
    >
      <header className="provider-settings__detail-heading">
        <div>
          <span className="provider-settings__detail-mark is-custom" aria-hidden="true">
            <Plus size={19} />
          </span>
          <div>
            <h2 id="provider-detail-title">{copy.providerAddCustomTitle}</h2>
            <p>{copy.providerAddCustomDescription}</p>
          </div>
        </div>
      </header>
      {failed
        ? (
          <StatusV1
            className="provider-settings__connection-error"
            variant="danger"
            icon={TriangleAlert}
            role="alert"
          >
            <StatusContentV1>
              <StatusTitleV1>{copy.providerCustomSaveFailed}</StatusTitleV1>
            </StatusContentV1>
          </StatusV1>
        )
        : null}
      <FieldGroupV1 className="provider-settings__form-grid">
        <FieldV1>
          <FieldLabelV1 htmlFor={fieldIdV1("display-name")}>
            {copy.providerCustomNameLabel}
          </FieldLabelV1>
          <InputV1
            id={fieldIdV1("display-name")}
            name="displayName"
            required
            maxLength={80}
            autoFocus
          />
        </FieldV1>
        <FieldV1>
          <FieldLabelV1 htmlFor={fieldIdV1("api")}>{copy.providerCustomApiLabel}</FieldLabelV1>
          <NativeSelectV1 id={fieldIdV1("api")} name="api" defaultValue="openai-completions">
            <option value="openai-completions">OpenAI Chat Completions</option>
            <option value="openai-responses">OpenAI Responses</option>
            <option value="anthropic-messages">Anthropic Messages</option>
            <option value="google-generative-ai">Google Generative AI</option>
          </NativeSelectV1>
        </FieldV1>
        <FieldV1 className="is-wide">
          <FieldLabelV1 htmlFor={fieldIdV1("base-url")}>
            {copy.providerEndpointLabel}
          </FieldLabelV1>
          <InputV1
            id={fieldIdV1("base-url")}
            name="baseUrl"
            type="url"
            required
            maxLength={2_048}
            placeholder="https://api.example.com/v1"
            spellCheck={false}
          />
          <FieldDescriptionV1>{copy.providerCustomEndpointHint}</FieldDescriptionV1>
        </FieldV1>
        <FieldV1 className="is-wide">
          <FieldLabelV1 htmlFor={fieldIdV1("model-id")}>
            {copy.providerCustomModelLabel}
          </FieldLabelV1>
          <InputV1
            id={fieldIdV1("model-id")}
            name="modelId"
            required
            maxLength={160}
            spellCheck={false}
          />
        </FieldV1>
        <FieldV1>
          <FieldLabelV1 htmlFor={fieldIdV1("context-window")}>
            {copy.providerContextWindowLabel}
          </FieldLabelV1>
          <InputV1
            id={fieldIdV1("context-window")}
            name="contextWindow"
            type="number"
            required
            min={1_024}
            max={32_000_000}
            defaultValue={128_000}
          />
        </FieldV1>
        <FieldV1>
          <FieldLabelV1 htmlFor={fieldIdV1("max-tokens")}>
            {copy.providerMaxTokensLabel}
          </FieldLabelV1>
          <InputV1
            id={fieldIdV1("max-tokens")}
            name="maxTokens"
            type="number"
            required
            min={1}
            max={4_000_000}
            defaultValue={16_384}
          />
        </FieldV1>
      </FieldGroupV1>
      <p className="provider-settings__custom-disclosure">
        {copy.providerCustomPersistenceNotice}
      </p>
      <Button type="submit" variant="primary" icon={Plus}>
        {copy.providerSaveCustom}
      </Button>
    </form>
  );
}

export function ProviderSettingsV1({
  copy,
  catalog,
  customProfiles,
  enabledBuiltinModels,
  preferredBuiltinModel,
  connectionTest,
  credentialOperation,
  credentialReceipt,
  vault,
  storageUsage,
  clearAll,
  initialSection = "general",
  onBack,
  onLocaleChange,
  theme,
  onThemeChange,
  onRetryCatalog,
  onSaveCredential,
  onTestConnection,
  onSetVaultPassword,
  onUseAutomaticVault,
  onUnlockVault,
  onLockVault,
  onForgetCredential,
  onRefreshStorageUsage,
  onClearAllData,
  onSetBuiltinModelEnabled,
  onCreateCustomProfile,
  onRemoveCustomProfile,
}: ProviderSettingsPropsV1): ReactNode {
  const providers = catalog.phase === "ready" ? catalog.providers : emptyProvidersV1;
  const activeBuiltinProviderId = connectionTest.active?.kind === "builtin"
    ? connectionTest.active.providerId
    : undefined;
  const initialProviderId = preferredProviderIdV1(providers, activeBuiltinProviderId);
  const [section, setSection] = useState<ProviderSettingsSectionV1>(initialSection);
  const [inspectedKey, setInspectedKey] = useState<string | null>(
    initialProviderId === null ? null : inspectedKeyV1("builtin", initialProviderId),
  );
  const [connectionModelId, setConnectionModelId] = useState<string | null>(null);
  const [providerQuery, setProviderQuery] = useState("");
  const [modelQuery, setModelQuery] = useState("");
  const [mobileView, setMobileView] = useState<"providers" | "detail">("providers");
  const [customCreationFailed, setCustomCreationFailed] = useState(false);
  const detailBackRef = useRef<HTMLButtonElement>(null);
  const providerButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  const inspectedProviderId = inspectedKey?.startsWith("builtin:")
    ? inspectedKey.slice("builtin:".length)
    : null;
  const inspectedCustomProfileId = inspectedKey?.startsWith("custom:")
    ? inspectedKey.slice("custom:".length)
    : null;
  const inspectedProvider = useMemo(
    () => providers.find((provider) => provider.providerId === inspectedProviderId) ?? null,
    [inspectedProviderId, providers],
  );
  const inspectedCustomProfile = useMemo(
    () => customProfiles.find((custom) => custom.profileId === inspectedCustomProfileId) ?? null,
    [customProfiles, inspectedCustomProfileId],
  );
  const creatingCustomProfile = inspectedKey === "custom:new";
  const enabledModelKeys = useMemo(
    () => new Set(enabledBuiltinModels.map(builtinModelKeyV1)),
    [enabledBuiltinModels],
  );

  useEffect(() => {
    setInspectedKey((current) => {
      if (current === "custom:new") return current;
      if (current?.startsWith("builtin:")) {
        const id = current.slice("builtin:".length);
        if (providers.some((provider) => provider.providerId === id)) return current;
      }
      if (current?.startsWith("custom:")) {
        const id = current.slice("custom:".length);
        if (customProfiles.some((custom) => custom.profileId === id)) return current;
      }
      const preferred = preferredProviderIdV1(providers, activeBuiltinProviderId);
      if (preferred !== null) return inspectedKeyV1("builtin", preferred);
      return customProfiles[0] === undefined
        ? null
        : inspectedKeyV1("custom", customProfiles[0].profileId);
    });
  }, [activeBuiltinProviderId, customProfiles, providers]);

  useEffect(() => {
    if (inspectedProvider === null) {
      setConnectionModelId(null);
      return;
    }
    const testModels = inspectedProvider.models.filter((model) =>
      model.availability.status === "available" &&
      isProviderSettingsCustomApiV1(model.api)
    );
    const activeSelection = connectionTest.active;
    setConnectionModelId((current) => {
      if (current !== null && testModels.some((model) => model.modelId === current)) {
        return current;
      }
      if (
        activeSelection?.kind === "builtin" &&
        activeSelection.providerId === inspectedProvider.providerId &&
        testModels.some((model) => model.modelId === activeSelection.modelId)
      ) return activeSelection.modelId;
      if (
        preferredBuiltinModel?.providerId === inspectedProvider.providerId &&
        testModels.some((model) => model.modelId === preferredBuiltinModel.modelId)
      ) return preferredBuiltinModel.modelId;
      return testModels[0]?.modelId ?? null;
    });
  }, [connectionTest.active, inspectedProvider, preferredBuiltinModel]);

  useEffect(() => {
    setModelQuery("");
  }, [inspectedKey]);

  const filteredProviders = useMemo(() => {
    const query = providerQuery.trim().toLocaleLowerCase(copy.locale);
    if (query.length === 0) return providers;
    return providers.filter((provider) =>
      provider.name.toLocaleLowerCase(copy.locale).includes(query) ||
      provider.providerId.toLocaleLowerCase(copy.locale).includes(query)
    );
  }, [copy.locale, providerQuery, providers]);

  const filteredCustomProfiles = useMemo(() => {
    const query = providerQuery.trim().toLocaleLowerCase(copy.locale);
    if (query.length === 0) return customProfiles;
    return customProfiles.filter((custom) =>
      custom.displayName.toLocaleLowerCase(copy.locale).includes(query) ||
      custom.baseUrl.toLocaleLowerCase(copy.locale).includes(query) ||
      custom.modelId.toLocaleLowerCase(copy.locale).includes(query)
    );
  }, [copy.locale, customProfiles, providerQuery]);

  const filteredModels = useMemo(() => {
    if (inspectedProvider === null) return [];
    const query = modelQuery.trim().toLocaleLowerCase(copy.locale);
    if (query.length === 0) return inspectedProvider.models;
    return inspectedProvider.models.filter((model) =>
      model.name.toLocaleLowerCase(copy.locale).includes(query) ||
      model.modelId.toLocaleLowerCase(copy.locale).includes(query)
    );
  }, [copy.locale, inspectedProvider, modelQuery]);

  const testModels = useMemo(
    () =>
      inspectedProvider?.models.filter((model): model is ProviderSettingsModelV1 & {
        readonly api: ProviderSettingsCustomApiV1;
      } =>
        model.availability.status === "available" &&
        isProviderSettingsCustomApiV1(model.api)
      ) ?? [],
    [inspectedProvider],
  );
  const testModel = testModels.find((model) => model.modelId === connectionModelId) ??
    null;
  const testSelection: ProviderSettingsSelectionV1 | null = inspectedCustomProfile !== null
    ? { kind: "custom", profile: inspectedCustomProfile }
    : inspectedProvider !== null && testModel !== null
    ? {
      kind: "builtin",
      providerId: inspectedProvider.providerId,
      modelId: testModel.modelId,
      api: testModel.api,
      baseUrl: testModel.baseUrl,
    }
    : null;
  const builtinCredentialConnections = inspectedProvider === null
    ? Object.freeze([])
    : builtinProviderCredentialConnectionsV1(inspectedProvider);
  const builtinTestCredentialConnection = testSelection?.kind === "builtin"
    ? builtinCredentialConnections.find((connection) => {
      const binding = credentialVaultBindingForConnectionOrNullV1(connection);
      const testBinding = credentialVaultBindingForConnectionOrNullV1({
        kind: "builtin",
        providerId: testSelection.providerId,
        baseUrl: testSelection.baseUrl,
      });
      return binding !== null && testBinding !== null &&
        credentialVaultBindingsEqualV2(binding, testBinding);
    }) ?? null
    : null;
  const customCredentialConnection = inspectedCustomProfile === null ? null : ({
    kind: "custom",
    profileId: inspectedCustomProfile.profileId,
    baseUrl: inspectedCustomProfile.baseUrl,
  } as const);
  const admittedCustomCredentialConnection =
    credentialVaultBindingForConnectionOrNullV1(customCredentialConnection) !== null
      ? customCredentialConnection
      : null;
  const credentialConnection: CredentialVaultConnectionIdentityV2 | null =
    admittedCustomCredentialConnection ?? builtinTestCredentialConnection ??
      builtinCredentialConnections[0] ?? null;
  const saveTargets: readonly CredentialVaultConnectionIdentityV2[] =
    admittedCustomCredentialConnection === null
      ? builtinCredentialConnections
      : Object.freeze([admittedCustomCredentialConnection]);
  const connectionTarget: ProviderConnectionTargetV1 = {
    connection: credentialConnection,
    saveTargets,
    testSelection,
    endpoints: Object.freeze(saveTargets.map((connection) => connection.baseUrl)),
    testModels: inspectedCustomProfile === null ? testModels : [],
    configurable: saveTargets.length > 0,
    unavailableMessage: inspectedProvider === null
      ? copy.selectedModelUnavailable
      : credentialConnection === null
      ? copy.providerCredentialUnavailable
      : copy.selectedModelUnavailable,
    custom: inspectedCustomProfile !== null,
  };

  const inspectTargetV1 = (key: string): void => {
    setInspectedKey(key);
    setCustomCreationFailed(false);
    setMobileView("detail");
    if (typeof matchMedia !== "undefined" && matchMedia("(max-width: 767px)").matches) {
      requestAnimationFrame(() => detailBackRef.current?.focus());
    }
  };

  const showProviderListV1 = (): void => {
    setMobileView("providers");
    const key = inspectedKey;
    requestAnimationFrame(() => {
      if (key !== null) providerButtonRefs.current.get(key)?.focus();
    });
  };

  return (
    <main
      className="silly-os-settings"
      data-silly-os-view="settings"
      aria-labelledby="silly-os-settings-title"
    >
      <SettingsTopbarV1
        copy={copy}
        onBack={onBack}
        onLocaleChange={onLocaleChange}
        theme={theme}
        onThemeChange={onThemeChange}
      />
      <div className="silly-os-settings__body">
        <SettingsNavigationV1 copy={copy} section={section} onSelect={setSection} />
        <section className="silly-os-settings__content" data-settings-section={section}>
          {section === "general"
            ? (
              <GeneralSettingsV1
                copy={copy}
                storageUsage={storageUsage}
                clearAll={clearAll}
                onLocaleChange={onLocaleChange}
                theme={theme}
                onThemeChange={onThemeChange}
                onRefreshStorageUsage={onRefreshStorageUsage}
                onClearAllData={onClearAllData}
              />
            )
            : section === "credential_vault"
            ? (
              <div className="silly-os-settings__standalone">
                <header>
                  <ShieldCheck size={22} aria-hidden="true" />
                  <div>
                    <h1>{copy.settingsCategoryCredentialVault}</h1>
                    <p>{copy.credentialVaultDescription}</p>
                  </div>
                </header>
                <CredentialVaultPanelV1
                  copy={copy}
                  vault={vault}
                  onSetVaultPassword={onSetVaultPassword}
                  onUseAutomaticVault={onUseAutomaticVault}
                  onUnlockVault={onUnlockVault}
                  onLockVault={onLockVault}
                  onForgetCredential={onForgetCredential}
                />
              </div>
            )
            : catalog.phase !== "ready"
            ? <CatalogStateV1 copy={copy} catalog={catalog} onRetry={onRetryCatalog} />
            : (
              <div className="provider-settings" data-mobile-view={mobileView}>
                <aside className="provider-settings__catalog" aria-labelledby="provider-list-title">
                  <div className="provider-settings__catalog-heading">
                    <div>
                      <Cloud size={18} aria-hidden="true" />
                      <h1 id="provider-list-title">{copy.providerSettingsTitle}</h1>
                    </div>
                    <p>{copy.providerSettingsDescription}</p>
                    <label className="provider-settings__search">
                      <span className="silly-os-visually-hidden">{copy.providerSearchLabel}</span>
                      <Search size={15} aria-hidden="true" />
                      <InputV1
                        controlSize="sm"
                        type="search"
                        value={providerQuery}
                        placeholder={copy.providerSearchPlaceholder}
                        onChange={(event) => setProviderQuery(event.currentTarget.value)}
                      />
                    </label>
                  </div>
                  <nav
                    className="provider-settings__provider-list"
                    aria-label={copy.providersLabel}
                  >
                    <section aria-labelledby="built-in-provider-section">
                      <h2 id="built-in-provider-section">{copy.providerBuiltInSection}</h2>
                      {providers.length === 0
                        ? (
                          <CollectionStateV1
                            className="provider-settings__collection-state"
                            icon={Cloud}
                            title={copy.providerCatalogEmpty}
                          />
                        )
                        : (
                          <ul>
                            {filteredProviders.map((provider) => {
                              const key = inspectedKeyV1("builtin", provider.providerId);
                              const credentialAvailable = vaultHasAnyCredentialConnectionV1(
                                vault,
                                builtinProviderCredentialConnectionsV1(provider),
                              );
                              return (
                                <li key={provider.providerId}>
                                  <ProviderCatalogRowV1
                                    ref={(element) => {
                                      if (element === null) providerButtonRefs.current.delete(key);
                                      else providerButtonRefs.current.set(key, element);
                                    }}
                                    kind="builtin"
                                    label={provider.name}
                                    detail={provider.providerId}
                                    active={key === inspectedKey}
                                    status={credentialAvailable
                                      ? (
                                        <AvailabilityChipV1
                                          copy={copy}
                                          availability={{ status: "available" }}
                                        />
                                      )
                                      : undefined}
                                    facts={`${
                                      String(provider.models.length)
                                    } ${copy.modelsCountSuffix}`}
                                    data-provider-id={provider.providerId}
                                    data-credential-status={credentialAvailable
                                      ? "available"
                                      : "unset"}
                                    onClick={() => inspectTargetV1(key)}
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        )}
                    </section>
                    <section aria-labelledby="custom-provider-section">
                      <div className="provider-settings__list-section-heading">
                        <h2 id="custom-provider-section">{copy.providerCustomSection}</h2>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Plus}
                          data-add-custom-endpoint="true"
                          onClick={() => inspectTargetV1("custom:new")}
                        >
                          {copy.providerAddCustom}
                        </Button>
                      </div>
                      {customProfiles.length === 0
                        ? (
                          <button
                            type="button"
                            className="provider-settings__custom-empty"
                            onClick={() => inspectTargetV1("custom:new")}
                          >
                            <Plus size={16} aria-hidden="true" />
                            <span>{copy.providerCustomEmpty}</span>
                          </button>
                        )
                        : (
                          <ul>
                            {filteredCustomProfiles.map((custom) => {
                              const key = inspectedKeyV1("custom", custom.profileId);
                              return (
                                <li key={custom.profileId}>
                                  <ProviderCatalogRowV1
                                    ref={(element) => {
                                      if (element === null) providerButtonRefs.current.delete(key);
                                      else providerButtonRefs.current.set(key, element);
                                    }}
                                    kind="custom"
                                    label={custom.displayName}
                                    detail={custom.modelId}
                                    active={key === inspectedKey}
                                    status={
                                      <BadgeV1
                                        className="provider-settings__custom-status"
                                        variant="success"
                                      >
                                        {copy.providerStatusAvailable}
                                      </BadgeV1>
                                    }
                                    facts={custom.api}
                                    data-custom-profile-id={custom.profileId}
                                    data-connection-status="available"
                                    onClick={() => inspectTargetV1(key)}
                                  />
                                </li>
                              );
                            })}
                          </ul>
                        )}
                    </section>
                    {providerQuery.trim().length > 0 && filteredProviders.length === 0 &&
                        filteredCustomProfiles.length === 0
                      ? (
                        <CollectionStateV1
                          className="provider-settings__collection-state"
                          icon={Search}
                          title={copy.providerSearchEmpty}
                          role="status"
                          aria-live="polite"
                        />
                      )
                      : null}
                  </nav>
                </aside>

                <section
                  className="provider-settings__detail"
                  aria-labelledby={inspectedKey === null ? undefined : "provider-detail-title"}
                >
                  {inspectedKey === null
                    ? (
                      <CollectionStateV1
                        className="provider-settings__detail-empty"
                        icon={Cloud}
                        title={copy.providerDetailEmpty}
                      />
                    )
                    : (
                      <>
                        <button
                          ref={detailBackRef}
                          type="button"
                          className="provider-settings__mobile-back"
                          onClick={showProviderListV1}
                        >
                          <ChevronLeft size={18} aria-hidden="true" />
                          {copy.backToProviders}
                        </button>
                        <div className="provider-settings__detail-scroll">
                          {creatingCustomProfile
                            ? (
                              <CustomProfileFormV1
                                copy={copy}
                                failed={customCreationFailed}
                                onCreate={(draft) => {
                                  const created = onCreateCustomProfile(draft);
                                  if (created === null) {
                                    setCustomCreationFailed(true);
                                    return;
                                  }
                                  inspectTargetV1(inspectedKeyV1("custom", created.profileId));
                                }}
                              />
                            )
                            : inspectedProvider !== null
                            ? (
                              <>
                                <header className="provider-settings__detail-heading">
                                  <div>
                                    <span
                                      className="provider-settings__detail-mark"
                                      aria-hidden="true"
                                    >
                                      <Cloud size={19} />
                                    </span>
                                    <div>
                                      <h2 id="provider-detail-title">{inspectedProvider.name}</h2>
                                      <code>{inspectedProvider.providerId}</code>
                                    </div>
                                  </div>
                                </header>

                                <ProviderConnectionSectionV1
                                  key={connectionTargetsKeyV1(connectionTarget.saveTargets)}
                                  copy={copy}
                                  target={connectionTarget}
                                  connectionTest={connectionTest}
                                  credentialOperation={credentialOperation}
                                  credentialReceipt={credentialReceipt}
                                  vault={vault}
                                  onSelectTestModel={setConnectionModelId}
                                  onSaveCredential={onSaveCredential}
                                  onTestConnection={onTestConnection}
                                  onForgetCredential={onForgetCredential}
                                  onOpenVaultSettings={() => setSection("credential_vault")}
                                />

                                <section
                                  className="provider-settings__section"
                                  aria-labelledby="models-title"
                                >
                                  <div className="provider-settings__section-heading">
                                    <div>
                                      <h3 id="models-title">{copy.providerModelsTitle}</h3>
                                      <p>{copy.providerModelsDescription}</p>
                                    </div>
                                    <BadgeV1 className="provider-settings__model-count">
                                      {String(
                                        enabledBuiltinModels.filter((model) =>
                                          model.providerId === inspectedProvider.providerId
                                        ).length,
                                      )} / {String(
                                        inspectedProvider.models.length,
                                      )}
                                    </BadgeV1>
                                  </div>
                                  {inspectedProvider.models.length === 0
                                    ? (
                                      <CollectionStateV1
                                        className="provider-settings__collection-state"
                                        icon={Cloud}
                                        title={copy.providerModelsEmpty}
                                      />
                                    )
                                    : (
                                      <>
                                        <label className="provider-settings__search is-model-search">
                                          <span className="silly-os-visually-hidden">
                                            {copy.modelSearchLabel}
                                          </span>
                                          <Search size={15} aria-hidden="true" />
                                          <InputV1
                                            controlSize="sm"
                                            type="search"
                                            value={modelQuery}
                                            placeholder={copy.modelSearchPlaceholder}
                                            onChange={(event) =>
                                              setModelQuery(event.currentTarget.value)}
                                          />
                                        </label>
                                        {filteredModels.length === 0
                                          ? (
                                            <CollectionStateV1
                                              className="provider-settings__collection-state"
                                              icon={Search}
                                              title={copy.modelSearchEmpty}
                                              role="status"
                                              aria-live="polite"
                                            />
                                          )
                                          : (
                                            <FieldSetV1 className="provider-settings__model-list">
                                              <FieldLegendV1 className="silly-os-visually-hidden">
                                                {copy.creatorModelSelection}
                                              </FieldLegendV1>
                                              {filteredModels.map((model) => {
                                                const available = model.availability.status ===
                                                  "available";
                                                const enabled = available &&
                                                  enabledModelKeys.has(builtinModelKeyV1(model));
                                                return (
                                                  <label
                                                    key={model.modelId}
                                                    className={enabled
                                                      ? "provider-settings__model is-active"
                                                      : "provider-settings__model"}
                                                    data-model-id={model.modelId}
                                                    data-availability={model.availability.status}
                                                  >
                                                    <CheckboxV1
                                                      value={model.modelId}
                                                      checked={enabled}
                                                      disabled={!available}
                                                      onChange={(event) =>
                                                        onSetBuiltinModelEnabled(
                                                          {
                                                            providerId: model.providerId,
                                                            modelId: model.modelId,
                                                          },
                                                          event.currentTarget.checked,
                                                        )}
                                                    />
                                                    <span className="provider-settings__model-copy">
                                                      <strong>{model.name}</strong>
                                                      <code>{model.modelId}</code>
                                                    </span>
                                                    {!available
                                                      ? (
                                                        <span className="provider-settings__model-status">
                                                          <AvailabilityChipV1
                                                            copy={copy}
                                                            availability={model.availability}
                                                          />
                                                          <small>
                                                            {modelAvailabilityDescriptionV1(
                                                              copy,
                                                              model.availability,
                                                            )}
                                                          </small>
                                                        </span>
                                                      )
                                                      : null}
                                                  </label>
                                                );
                                              })}
                                            </FieldSetV1>
                                          )}
                                      </>
                                    )}
                                </section>
                              </>
                            )
                            : inspectedCustomProfile !== null
                            ? (
                              <>
                                <header className="provider-settings__detail-heading is-custom">
                                  <div>
                                    <span
                                      className="provider-settings__detail-mark is-custom"
                                      aria-hidden="true"
                                    >
                                      <Globe2 size={19} />
                                    </span>
                                    <div>
                                      <h2 id="provider-detail-title">
                                        {inspectedCustomProfile.displayName}
                                      </h2>
                                      <code>{inspectedCustomProfile.api}</code>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Trash2}
                                    onClick={() =>
                                      onRemoveCustomProfile(inspectedCustomProfile.profileId)}
                                  >
                                    {copy.providerRemoveCustom}
                                  </Button>
                                  <p>{copy.providerCustomDescription}</p>
                                </header>

                                <ProviderConnectionSectionV1
                                  key={connectionTargetsKeyV1(connectionTarget.saveTargets)}
                                  copy={copy}
                                  target={connectionTarget}
                                  connectionTest={connectionTest}
                                  credentialOperation={credentialOperation}
                                  credentialReceipt={credentialReceipt}
                                  vault={vault}
                                  onSelectTestModel={setConnectionModelId}
                                  onSaveCredential={onSaveCredential}
                                  onTestConnection={onTestConnection}
                                  onForgetCredential={onForgetCredential}
                                  onOpenVaultSettings={() => setSection("credential_vault")}
                                />

                                <section
                                  className="provider-settings__section provider-settings__custom-facts"
                                  aria-labelledby="custom-model-title"
                                >
                                  <div className="provider-settings__section-heading">
                                    <div>
                                      <h3 id="custom-model-title">
                                        {copy.providerCustomModelProfileTitle}
                                      </h3>
                                      <p>{copy.providerCustomModelProfileDescription}</p>
                                    </div>
                                  </div>
                                  <dl>
                                    <div>
                                      <dt>{copy.providerCustomModelLabel}</dt>
                                      <dd>
                                        <code>{inspectedCustomProfile.modelId}</code>
                                      </dd>
                                    </div>
                                    <div>
                                      <dt>{copy.providerContextWindowLabel}</dt>
                                      <dd>
                                        {inspectedCustomProfile.contextWindow.toLocaleString()}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt>{copy.providerMaxTokensLabel}</dt>
                                      <dd>{inspectedCustomProfile.maxTokens.toLocaleString()}</dd>
                                    </div>
                                  </dl>
                                </section>
                              </>
                            )
                            : null}
                        </div>
                      </>
                    )}
                </section>
              </div>
            )}
        </section>
      </div>
    </main>
  );
}

// SPDX-License-Identifier: MIT
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Cloud,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import type { SillyOsCopyV1, SillyOsLocaleV1 } from "../content/copy.ts";
import { SillyButtonV1 as Button } from "./controls.tsx";
import { LocaleSwitchV1, SillyOsBrandV1 } from "./product-chrome.tsx";

export type ProviderSettingsAvailabilityV1 =
  | { readonly status: "qualified" }
  | { readonly status: "candidate"; readonly reason: "qualification_pending" }
  | {
    readonly status: "unavailable";
    readonly reason:
      | "browser_runtime_unavailable"
      | "credential_flow_unavailable"
      | "public_http_unavailable"
      | "not_qualified";
  };

export interface ProviderSettingsModelV1 {
  readonly providerId: string;
  readonly modelId: string;
  readonly name: string;
  readonly api: string;
  readonly baseUrl: string;
  readonly availability: ProviderSettingsAvailabilityV1;
}

export interface ProviderSettingsProviderV1 {
  readonly providerId: string;
  readonly name: string;
  readonly baseUrl: string | null;
  readonly availability: ProviderSettingsAvailabilityV1;
  readonly models: readonly ProviderSettingsModelV1[];
}

export type ProviderSettingsCustomApiV1 =
  | "openai-completions"
  | "openai-responses"
  | "anthropic-messages"
  | "google-generative-ai";

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
  }
  | {
    readonly kind: "custom";
    readonly profile: ProviderSettingsCustomProfileV1;
  };

export type ProviderSettingsProfileV1 =
  | { readonly phase: "disconnected"; readonly active: null }
  | {
    readonly phase: "initializing" | "ready" | "forgetting";
    readonly active: ProviderSettingsSelectionV1;
  }
  | {
    readonly phase: "failed";
    readonly active: ProviderSettingsSelectionV1;
    readonly diagnosticCode: string;
  };

export interface ProviderSettingsPropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly catalog: ProviderSettingsCatalogV1;
  readonly customProfiles: readonly ProviderSettingsCustomProfileV1[];
  readonly profile: ProviderSettingsProfileV1;
  readonly onBack: () => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly onRetryCatalog: () => void;
  readonly onInitialize: (
    selection: ProviderSettingsSelectionV1,
    credential: string,
  ) => void;
  readonly onCreateCustomProfile: (
    draft: ProviderSettingsCustomProfileDraftV1,
  ) => ProviderSettingsCustomProfileV1 | null;
  readonly onRemoveCustomProfile: (profileId: string) => void;
  readonly onForget: () => void;
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
    return left.providerId === right.providerId && left.modelId === right.modelId;
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

function firstQualifiedModelIdV1(provider: ProviderSettingsProviderV1): string | null {
  return provider.models.find((model) => model.availability.status === "qualified")?.modelId ??
    null;
}

function preferredProviderIdV1(
  providers: readonly ProviderSettingsProviderV1[],
  activeProviderId: string | undefined,
): string | null {
  if (
    activeProviderId !== undefined &&
    providers.some((provider) => provider.providerId === activeProviderId)
  ) return activeProviderId;
  return providers.find((provider) => provider.availability.status === "qualified")?.providerId ??
    providers.find((provider) => provider.availability.status === "candidate")?.providerId ??
    providers[0]?.providerId ?? null;
}

function availabilityLabelV1(
  copy: SillyOsCopyV1,
  availability: ProviderSettingsAvailabilityV1,
): string {
  switch (availability.status) {
    case "qualified":
      return copy.providerStatusQualified;
    case "candidate":
      return copy.providerStatusCandidate;
    case "unavailable":
      return copy.providerStatusUnavailable;
  }
  return assertNeverV1(availability);
}

function availabilityDescriptionV1(
  copy: SillyOsCopyV1,
  availability: ProviderSettingsAvailabilityV1,
): string {
  if (availability.status === "qualified") return copy.providerQualifiedDescription;
  switch (availability.reason) {
    case "qualification_pending":
      return copy.providerQualificationPending;
    case "browser_runtime_unavailable":
      return copy.providerBrowserUnavailable;
    case "credential_flow_unavailable":
      return copy.providerCredentialUnavailable;
    case "public_http_unavailable":
      return copy.providerPublicHttpUnavailable;
    case "not_qualified":
      return copy.providerNotQualified;
  }
  return assertNeverV1(availability);
}

function AvailabilityChipV1({
  copy,
  availability,
}: {
  readonly copy: SillyOsCopyV1;
  readonly availability: ProviderSettingsAvailabilityV1;
}): ReactNode {
  return (
    <span
      className="provider-settings__availability"
      data-availability={availability.status}
    >
      {availability.status === "qualified" ? <Check size={11} aria-hidden="true" /> : null}
      {availabilityLabelV1(copy, availability)}
    </span>
  );
}

function SettingsTopbarV1({
  copy,
  onBack,
  onLocaleChange,
}: {
  readonly copy: SillyOsCopyV1;
  readonly onBack: () => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
}): ReactNode {
  return (
    <header className="silly-os-topbar silly-os-settings__topbar">
      <div className="silly-os-settings__topbar-leading">
        <Button
          className="silly-os-settings__back"
          variant="ghost"
          shape="square"
          size="sm"
          icon={ArrowLeft}
          autoFocus
          aria-label={copy.settingsBack}
          onClick={onBack}
        />
        <SillyOsBrandV1 copy={copy} />
        <span className="silly-os-settings__crumb" aria-hidden="true">/</span>
        <span className="silly-os-settings__title" id="silly-os-settings-title">
          {copy.settings}
        </span>
      </div>
      <LocaleSwitchV1 copy={copy} onChange={onLocaleChange} />
    </header>
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
      <div className="provider-settings__catalog-state" role="status">
        <LoaderCircle className="is-spinning" size={22} aria-hidden="true" />
        <strong>{copy.providerCatalogLoading}</strong>
        <span>{copy.providerCatalogLoadingDescription}</span>
      </div>
    );
  }
  return (
    <div
      className="provider-settings__catalog-state is-failed"
      data-diagnostic-code={catalog.diagnosticCode}
      role="alert"
    >
      <TriangleAlert size={22} aria-hidden="true" />
      <strong>{copy.providerCatalogFailed}</strong>
      <span>{copy.providerCatalogFailedDescription}</span>
      <Button variant="secondary" onClick={onRetry}>{copy.retry}</Button>
    </div>
  );
}

interface ProviderConnectionTargetV1 {
  readonly selection: ProviderSettingsSelectionV1 | null;
  readonly providerName: string;
  readonly modelName: string | null;
  readonly endpoint: string | null;
  readonly activatable: boolean;
  readonly unavailableMessage: string;
  readonly custom: boolean;
}

function connectionTargetKeyV1(selection: ProviderSettingsSelectionV1 | null): string {
  if (selection === null) return "none";
  return selection.kind === "builtin"
    ? `builtin:${selection.providerId}:${selection.modelId}`
    : `custom:${selection.profile.profileId}:${selection.profile.api}:${selection.profile.modelId}`;
}

function ProviderConnectionSectionV1({
  copy,
  target,
  profile,
  onInitialize,
  onForget,
}: {
  readonly copy: SillyOsCopyV1;
  readonly target: ProviderConnectionTargetV1;
  readonly profile: ProviderSettingsProfileV1;
  readonly onInitialize: ProviderSettingsPropsV1["onInitialize"];
  readonly onForget: ProviderSettingsPropsV1["onForget"];
}): ReactNode {
  const [keyVisible, setKeyVisible] = useState(false);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const matches = sameSelectionV1(profile.active, target.selection);
  const initializing = profile.phase === "initializing" && matches;
  const forgetting = profile.phase === "forgetting" && matches;
  const connected = profile.phase === "ready" && matches;
  const failed = profile.phase === "failed" && matches;

  const submitV1 = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const input = keyInputRef.current;
    if (!target.activatable || target.selection === null || input?.value.length === 0) return;
    let credential = input?.value ?? "";
    if (input !== null) input.value = "";
    onInitialize(target.selection, credential);
    credential = "";
  };

  return (
    <section
      className="provider-settings__section provider-settings__credential"
      aria-labelledby="connection-title"
      data-connection-target={connectionTargetKeyV1(target.selection)}
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
        {target.endpoint === null ? <p>{copy.providerEndpointManaged}</p> : (
          <input
            aria-label={copy.providerEndpointLabel}
            value={target.endpoint}
            readOnly
            spellCheck={false}
            data-endpoint-editable={target.custom ? "custom-profile" : "false"}
          />
        )}
      </div>
      {!target.activatable || target.selection === null
        ? (
          <p className="provider-settings__connection-note" role="status">
            {target.unavailableMessage}
          </p>
        )
        : connected || forgetting
        ? (
          <div
            className="provider-settings__connection is-connected"
            data-connection-phase={profile.phase}
            role="status"
          >
            <Check size={18} aria-hidden="true" />
            <span>
              <strong>
                {target.custom ? copy.providerCustomVerified : copy.providerConnected}
              </strong>
              <small>{target.providerName} · {target.modelName}</small>
            </span>
            <Button variant="secondary" disabled={forgetting} onClick={onForget}>
              {forgetting ? copy.providerForgetting : copy.providerForget}
            </Button>
          </div>
        )
        : (
          <form
            className="provider-settings__credential-form"
            data-connection-phase={failed
              ? "failed"
              : initializing
              ? "initializing"
              : "disconnected"}
            onSubmit={submitV1}
          >
            {failed
              ? (
                <p
                  className="provider-settings__connection-error"
                  data-diagnostic-code={profile.phase === "failed"
                    ? profile.diagnosticCode
                    : undefined}
                  role="alert"
                >
                  <TriangleAlert size={16} aria-hidden="true" />
                  {copy.providerConnectionFailed}
                </p>
              )
              : null}
            <p>{copy.providerConnectionTestNotice}</p>
            <label htmlFor="provider-api-key">{copy.providerKeyLabel}</label>
            <div className="provider-settings__credential-controls">
              <span className="provider-settings__key-input">
                <input
                  id="provider-api-key"
                  ref={keyInputRef}
                  type={keyVisible ? "text" : "password"}
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={copy.providerKeyPlaceholder}
                  disabled={initializing}
                />
                <button
                  type="button"
                  aria-label={keyVisible ? copy.providerHideKey : copy.providerShowKey}
                  onClick={() => setKeyVisible((current) => !current)}
                >
                  {keyVisible
                    ? <EyeOff size={16} aria-hidden="true" />
                    : <Eye size={16} aria-hidden="true" />}
                </button>
              </span>
              <Button type="submit" variant="primary" disabled={initializing}>
                {initializing ? copy.providerTesting : copy.providerTestConnection}
              </Button>
            </div>
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
          <p className="provider-settings__connection-error" role="alert">
            <TriangleAlert size={16} aria-hidden="true" />
            {copy.providerCustomSaveFailed}
          </p>
        )
        : null}
      <div className="provider-settings__form-grid">
        <label>
          <span>{copy.providerCustomNameLabel}</span>
          <input name="displayName" required maxLength={80} autoFocus />
        </label>
        <label>
          <span>{copy.providerCustomApiLabel}</span>
          <select name="api" defaultValue="openai-completions">
            <option value="openai-completions">OpenAI Chat Completions</option>
            <option value="openai-responses">OpenAI Responses</option>
            <option value="anthropic-messages">Anthropic Messages</option>
            <option value="google-generative-ai">Google Generative AI</option>
          </select>
        </label>
        <label className="is-wide">
          <span>{copy.providerEndpointLabel}</span>
          <input
            name="baseUrl"
            type="url"
            required
            maxLength={2_048}
            placeholder="https://api.example.com/v1"
            spellCheck={false}
          />
          <small>{copy.providerCustomEndpointHint}</small>
        </label>
        <label className="is-wide">
          <span>{copy.providerCustomModelLabel}</span>
          <input name="modelId" required maxLength={160} spellCheck={false} />
        </label>
        <label>
          <span>{copy.providerContextWindowLabel}</span>
          <input
            name="contextWindow"
            type="number"
            required
            min={1_024}
            max={32_000_000}
            defaultValue={128_000}
          />
        </label>
        <label>
          <span>{copy.providerMaxTokensLabel}</span>
          <input
            name="maxTokens"
            type="number"
            required
            min={1}
            max={4_000_000}
            defaultValue={16_384}
          />
        </label>
      </div>
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
  profile,
  onBack,
  onLocaleChange,
  onRetryCatalog,
  onInitialize,
  onCreateCustomProfile,
  onRemoveCustomProfile,
  onForget,
}: ProviderSettingsPropsV1): ReactNode {
  const providers = catalog.phase === "ready" ? catalog.providers : emptyProvidersV1;
  const activeBuiltinProviderId = profile.active?.kind === "builtin"
    ? profile.active.providerId
    : undefined;
  const initialProviderId = preferredProviderIdV1(providers, activeBuiltinProviderId);
  const [inspectedKey, setInspectedKey] = useState<string | null>(
    initialProviderId === null ? null : inspectedKeyV1("builtin", initialProviderId),
  );
  const [draftModelId, setDraftModelId] = useState<string | null>(
    profile.active?.kind === "builtin" && profile.active.providerId === initialProviderId
      ? profile.active.modelId
      : null,
  );
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
      setDraftModelId(null);
      return;
    }
    const activeSelection = profile.active;
    setDraftModelId((current) => {
      if (current !== null && inspectedProvider.models.some((model) => model.modelId === current)) {
        return current;
      }
      if (
        activeSelection?.kind === "builtin" &&
        activeSelection.providerId === inspectedProvider.providerId &&
        inspectedProvider.models.some((model) => model.modelId === activeSelection.modelId)
      ) return activeSelection.modelId;
      return firstQualifiedModelIdV1(inspectedProvider);
    });
  }, [inspectedProvider, profile.active]);

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

  const draftModel = inspectedProvider?.models.find((model) => model.modelId === draftModelId) ??
    null;
  const draftSelection: ProviderSettingsSelectionV1 | null = inspectedCustomProfile !== null
    ? { kind: "custom", profile: inspectedCustomProfile }
    : inspectedProvider !== null && draftModel !== null
    ? { kind: "builtin", providerId: inspectedProvider.providerId, modelId: draftModel.modelId }
    : null;
  const activatable = inspectedCustomProfile !== null ||
    (inspectedProvider?.availability.status === "qualified" &&
      draftModel?.availability.status === "qualified");
  const connectionTarget: ProviderConnectionTargetV1 = {
    selection: draftSelection,
    providerName: inspectedCustomProfile?.displayName ?? inspectedProvider?.name ?? "",
    modelName: inspectedCustomProfile?.modelId ?? draftModel?.name ?? null,
    endpoint: inspectedCustomProfile?.baseUrl ?? draftModel?.baseUrl ??
      inspectedProvider?.baseUrl ?? null,
    activatable,
    unavailableMessage: inspectedProvider === null
      ? copy.selectedModelUnavailable
      : draftModelId === null
      ? copy.chooseQualifiedModel
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
      <SettingsTopbarV1 copy={copy} onBack={onBack} onLocaleChange={onLocaleChange} />
      {catalog.phase !== "ready"
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
                  <input
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
                    ? <p className="provider-settings__empty">{copy.providerCatalogEmpty}</p>
                    : (
                      <ul>
                        {filteredProviders.map((provider) => {
                          const key = inspectedKeyV1("builtin", provider.providerId);
                          return (
                            <li key={provider.providerId}>
                              <button
                                ref={(element) => {
                                  if (element === null) providerButtonRefs.current.delete(key);
                                  else providerButtonRefs.current.set(key, element);
                                }}
                                type="button"
                                className={key === inspectedKey ? "is-active" : undefined}
                                data-provider-id={provider.providerId}
                                data-availability={provider.availability.status}
                                aria-current={key === inspectedKey ? "page" : undefined}
                                onClick={() => inspectTargetV1(key)}
                              >
                                <span
                                  className="provider-settings__provider-mark"
                                  aria-hidden="true"
                                >
                                  <Cloud size={16} />
                                </span>
                                <span className="provider-settings__provider-copy">
                                  <strong title={provider.name}>{provider.name}</strong>
                                  <small>{provider.providerId}</small>
                                </span>
                                <span className="provider-settings__provider-meta">
                                  <AvailabilityChipV1
                                    copy={copy}
                                    availability={provider.availability}
                                  />
                                  <small>
                                    {String(provider.models.length)} {copy.modelsCountSuffix}
                                  </small>
                                </span>
                              </button>
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
                          const isConnected = profile.phase === "ready" &&
                            profile.active?.kind === "custom" &&
                            profile.active.profile.profileId === custom.profileId;
                          return (
                            <li key={custom.profileId}>
                              <button
                                ref={(element) => {
                                  if (element === null) providerButtonRefs.current.delete(key);
                                  else providerButtonRefs.current.set(key, element);
                                }}
                                type="button"
                                className={key === inspectedKey ? "is-active" : undefined}
                                data-custom-profile-id={custom.profileId}
                                data-connection-status={isConnected ? "verified" : "untested"}
                                aria-current={key === inspectedKey ? "page" : undefined}
                                onClick={() => inspectTargetV1(key)}
                              >
                                <span
                                  className="provider-settings__provider-mark is-custom"
                                  aria-hidden="true"
                                >
                                  <Globe2 size={16} />
                                </span>
                                <span className="provider-settings__provider-copy">
                                  <strong title={custom.displayName}>{custom.displayName}</strong>
                                  <small>{custom.modelId}</small>
                                </span>
                                <span className="provider-settings__provider-meta">
                                  <span className="provider-settings__custom-status">
                                    {isConnected
                                      ? copy.providerCustomVerified
                                      : copy.providerCustomStatus}
                                  </span>
                                  <small>{custom.api}</small>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                </section>
                {providerQuery.trim().length > 0 && filteredProviders.length === 0 &&
                    filteredCustomProfiles.length === 0
                  ? (
                    <p className="provider-settings__empty" role="status">
                      {copy.providerSearchEmpty}
                    </p>
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
                  <div className="provider-settings__detail-empty" role="status">
                    <Cloud size={24} aria-hidden="true" />
                    <strong>{copy.providerDetailEmpty}</strong>
                  </div>
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
                              <AvailabilityChipV1
                                copy={copy}
                                availability={inspectedProvider.availability}
                              />
                              <p>
                                {availabilityDescriptionV1(
                                  copy,
                                  inspectedProvider.availability,
                                )}
                              </p>
                            </header>

                            <ProviderConnectionSectionV1
                              key={connectionTargetKeyV1(connectionTarget.selection)}
                              copy={copy}
                              target={connectionTarget}
                              profile={profile}
                              onInitialize={onInitialize}
                              onForget={onForget}
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
                                <span>{String(inspectedProvider.models.length)}</span>
                              </div>
                              {inspectedProvider.models.length === 0
                                ? (
                                  <p className="provider-settings__empty">
                                    {copy.providerModelsEmpty}
                                  </p>
                                )
                                : (
                                  <>
                                    <label className="provider-settings__search is-model-search">
                                      <span className="silly-os-visually-hidden">
                                        {copy.modelSearchLabel}
                                      </span>
                                      <Search size={15} aria-hidden="true" />
                                      <input
                                        type="search"
                                        value={modelQuery}
                                        placeholder={copy.modelSearchPlaceholder}
                                        onChange={(event) =>
                                          setModelQuery(event.currentTarget.value)}
                                      />
                                    </label>
                                    {filteredModels.length === 0
                                      ? (
                                        <p className="provider-settings__empty" role="status">
                                          {copy.modelSearchEmpty}
                                        </p>
                                      )
                                      : (
                                        <fieldset className="provider-settings__model-list">
                                          <legend className="silly-os-visually-hidden">
                                            {copy.creatorModelSelection}
                                          </legend>
                                          {filteredModels.map((model) => {
                                            const selectable = inspectedProvider.availability
                                                  .status === "qualified" &&
                                              model.availability.status === "qualified";
                                            return (
                                              <label
                                                key={model.modelId}
                                                className={model.modelId === draftModelId
                                                  ? "provider-settings__model is-active"
                                                  : "provider-settings__model"}
                                                data-model-id={model.modelId}
                                                data-availability={model.availability.status}
                                              >
                                                <input
                                                  type="radio"
                                                  name="creator-model"
                                                  value={model.modelId}
                                                  checked={model.modelId === draftModelId}
                                                  disabled={!selectable}
                                                  onChange={() => setDraftModelId(model.modelId)}
                                                />
                                                <span className="provider-settings__model-copy">
                                                  <strong>{model.name}</strong>
                                                  <code>{model.modelId}</code>
                                                </span>
                                                <span className="provider-settings__model-status">
                                                  <AvailabilityChipV1
                                                    copy={copy}
                                                    availability={model.availability}
                                                  />
                                                  {selectable ? null : (
                                                    <small>
                                                      {availabilityDescriptionV1(
                                                        copy,
                                                        model.availability,
                                                      )}
                                                    </small>
                                                  )}
                                                </span>
                                              </label>
                                            );
                                          })}
                                        </fieldset>
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
                              key={connectionTargetKeyV1(connectionTarget.selection)}
                              copy={copy}
                              target={connectionTarget}
                              profile={profile}
                              onInitialize={onInitialize}
                              onForget={onForget}
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
                                  <dd>{inspectedCustomProfile.contextWindow.toLocaleString()}</dd>
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
    </main>
  );
}

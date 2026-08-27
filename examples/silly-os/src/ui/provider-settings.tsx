// SPDX-License-Identifier: MIT
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Cloud,
  KeyRound,
  LoaderCircle,
  Search,
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
  readonly availability: ProviderSettingsAvailabilityV1;
}

export interface ProviderSettingsProviderV1 {
  readonly providerId: string;
  readonly name: string;
  readonly availability: ProviderSettingsAvailabilityV1;
  readonly models: readonly ProviderSettingsModelV1[];
}

export type ProviderSettingsCatalogV1 =
  | { readonly phase: "loading" }
  | { readonly phase: "failed"; readonly diagnosticCode: string }
  | {
    readonly phase: "ready";
    readonly providers: readonly ProviderSettingsProviderV1[];
  };

export interface ProviderSettingsSelectionV1 {
  readonly providerId: string;
  readonly modelId: string;
}

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
  readonly profile: ProviderSettingsProfileV1;
  readonly onBack: () => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly onRetryCatalog: () => void;
  readonly onInitialize: (
    selection: ProviderSettingsSelectionV1,
    credential: string,
  ) => void;
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
  return left !== null && right !== null && left.providerId === right.providerId &&
    left.modelId === right.modelId;
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

export function ProviderSettingsV1({
  copy,
  catalog,
  profile,
  onBack,
  onLocaleChange,
  onRetryCatalog,
  onInitialize,
  onForget,
}: ProviderSettingsPropsV1): ReactNode {
  const providers = catalog.phase === "ready" ? catalog.providers : emptyProvidersV1;
  const initialProviderId = preferredProviderIdV1(providers, profile.active?.providerId);
  const [inspectedProviderId, setInspectedProviderId] = useState<string | null>(
    initialProviderId,
  );
  const [draftModelId, setDraftModelId] = useState<string | null>(
    profile.active?.providerId === initialProviderId ? profile.active.modelId : null,
  );
  const [providerQuery, setProviderQuery] = useState("");
  const [modelQuery, setModelQuery] = useState("");
  const [mobileView, setMobileView] = useState<"providers" | "detail">("providers");
  const keyInputRef = useRef<HTMLInputElement>(null);
  const detailBackRef = useRef<HTMLButtonElement>(null);
  const providerButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  const inspectedProvider = useMemo(
    () => providers.find((provider) => provider.providerId === inspectedProviderId) ?? null,
    [inspectedProviderId, providers],
  );

  useEffect(() => {
    if (providers.length === 0) {
      setInspectedProviderId(null);
      return;
    }
    setInspectedProviderId((current) => {
      if (current !== null && providers.some((provider) => provider.providerId === current)) {
        return current;
      }
      return preferredProviderIdV1(providers, profile.active?.providerId);
    });
  }, [profile.active?.providerId, providers]);

  useEffect(() => {
    if (inspectedProvider === null) {
      setDraftModelId(null);
      return;
    }
    setDraftModelId((current) => {
      if (current !== null && inspectedProvider.models.some((model) => model.modelId === current)) {
        return current;
      }
      if (
        profile.active?.providerId === inspectedProvider.providerId &&
        inspectedProvider.models.some((model) => model.modelId === profile.active?.modelId)
      ) return profile.active.modelId;
      return null;
    });
  }, [inspectedProvider, profile.active]);

  useEffect(() => {
    setModelQuery("");
  }, [inspectedProviderId]);

  const filteredProviders = useMemo(() => {
    const query = providerQuery.trim().toLocaleLowerCase(copy.locale);
    if (query.length === 0) return providers;
    return providers.filter((provider) =>
      provider.name.toLocaleLowerCase(copy.locale).includes(query) ||
      provider.providerId.toLocaleLowerCase(copy.locale).includes(query)
    );
  }, [copy.locale, providerQuery, providers]);

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
  const draftSelection = inspectedProvider !== null && draftModel !== null
    ? { providerId: inspectedProvider.providerId, modelId: draftModel.modelId }
    : null;
  const activatable = inspectedProvider?.availability.status === "qualified" &&
    draftModel?.availability.status === "qualified";
  const profileMatchesDraft = sameSelectionV1(profile.active, draftSelection);
  const initializing = profile.phase === "initializing" && profileMatchesDraft;
  const forgetting = profile.phase === "forgetting" && profileMatchesDraft;
  const connected = profile.phase === "ready" && profileMatchesDraft;
  const failed = profile.phase === "failed" && profileMatchesDraft;

  const inspectProviderV1 = (providerId: string): void => {
    setInspectedProviderId(providerId);
    setMobileView("detail");
    if (typeof matchMedia !== "undefined" && matchMedia("(max-width: 767px)").matches) {
      requestAnimationFrame(() => detailBackRef.current?.focus());
    }
  };

  const showProviderListV1 = (): void => {
    setMobileView("providers");
    const providerId = inspectedProviderId;
    requestAnimationFrame(() => {
      if (providerId !== null) providerButtonRefs.current.get(providerId)?.focus();
    });
  };

  const submitCredentialV1 = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const input = keyInputRef.current;
    if (!activatable || draftSelection === null || input === null || input.value.length === 0) {
      return;
    }
    let credential = input.value;
    input.value = "";
    onInitialize(draftSelection, credential);
    credential = "";
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
              {providers.length === 0
                ? (
                  <p className="provider-settings__empty" role="status">
                    {copy.providerCatalogEmpty}
                  </p>
                )
                : filteredProviders.length === 0
                ? (
                  <p className="provider-settings__empty" role="status">
                    {copy.providerSearchEmpty}
                  </p>
                )
                : (
                  <nav
                    className="provider-settings__provider-list"
                    aria-label={copy.providersLabel}
                  >
                    <ul>
                      {filteredProviders.map((provider) => (
                        <li key={provider.providerId}>
                          <button
                            ref={(element) => {
                              if (element === null) {
                                providerButtonRefs.current.delete(provider.providerId);
                              } else {
                                providerButtonRefs.current.set(provider.providerId, element);
                              }
                            }}
                            type="button"
                            className={provider.providerId === inspectedProviderId
                              ? "is-active"
                              : undefined}
                            data-provider-id={provider.providerId}
                            data-availability={provider.availability.status}
                            aria-current={provider.providerId === inspectedProviderId
                              ? "page"
                              : undefined}
                            onClick={() => inspectProviderV1(provider.providerId)}
                          >
                            <span className="provider-settings__provider-mark" aria-hidden="true">
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
                      ))}
                    </ul>
                  </nav>
                )}
            </aside>

            <section
              className="provider-settings__detail"
              aria-labelledby={inspectedProvider === null ? undefined : "provider-detail-title"}
            >
              {inspectedProvider === null
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
                      <header className="provider-settings__detail-heading">
                        <div>
                          <span className="provider-settings__detail-mark" aria-hidden="true">
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
                        <p>{availabilityDescriptionV1(copy, inspectedProvider.availability)}</p>
                      </header>

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
                          ? <p className="provider-settings__empty">{copy.providerModelsEmpty}</p>
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
                                  onChange={(event) => setModelQuery(event.currentTarget.value)}
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
                                      const selectable = inspectedProvider.availability.status ===
                                          "qualified" &&
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

                      <section
                        className="provider-settings__section provider-settings__credential"
                        aria-labelledby="credential-title"
                      >
                        <div className="provider-settings__section-heading">
                          <div>
                            <h3 id="credential-title">{copy.creatorModelTitle}</h3>
                            <p>{copy.creatorModelDescription}</p>
                          </div>
                          <KeyRound size={18} aria-hidden="true" />
                        </div>
                        {!activatable || draftSelection === null
                          ? (
                            <p className="provider-settings__connection-note" role="status">
                              {draftModelId === null
                                ? copy.chooseQualifiedModel
                                : copy.selectedModelUnavailable}
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
                                <strong>{copy.providerConnected}</strong>
                                <small>{inspectedProvider.name} · {draftModel.name}</small>
                              </span>
                              <Button
                                variant="secondary"
                                disabled={forgetting}
                                onClick={onForget}
                              >
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
                              onSubmit={submitCredentialV1}
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
                              <p>{copy.providerKeyMemoryOnly}</p>
                              <label htmlFor="provider-api-key">{copy.providerKeyLabel}</label>
                              <div>
                                <input
                                  id="provider-api-key"
                                  ref={keyInputRef}
                                  type="password"
                                  required
                                  autoComplete="off"
                                  spellCheck={false}
                                  placeholder={copy.providerKeyPlaceholder}
                                  disabled={initializing}
                                />
                                <Button type="submit" variant="primary" disabled={initializing}>
                                  {initializing
                                    ? copy.providerInitializing
                                    : copy.providerInitialize}
                                </Button>
                              </div>
                            </form>
                          )}
                      </section>
                    </div>
                  </>
                )}
            </section>
          </div>
        )}
    </main>
  );
}

// SPDX-License-Identifier: MIT

import { ArrowLeft, LoaderCircle, TriangleAlert } from "lucide-react";
import {
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import type { ActiveProgramRuntimeHandleV1 } from "../application/program-runtime-controller.ts";
import {
  createBrowserProductPreferencesRepositoryV1,
  defaultBrowserProductPreferencesSnapshotV1,
  type BrowserProductPreferencesRepositoryV1,
  type SillyOsThemeModeV1,
} from "../application/preferences/browser-product-preferences-repository.ts";
import {
  applySillyOsDocumentPreferencesV1,
  resolveSillyOsColorSchemeV1,
} from "../application/preferences/browser-product-theme.ts";
import type { BrowserProgramWorkspaceAuthorityV1 } from "../application/workspace/browser-program-workspace-authority.ts";
import {
  getSillyOsCopyV1,
  resolveSillyOsCopyV1,
  resolveSillyOsLocaleQueryOverrideV1,
  type SillyOsLocaleV1,
} from "../content/copy.ts";
import type { ProgramPackageServiceV1 } from "../program-platform/installation/program-package-service.ts";
import type { InstalledProgramPackageReferenceV1 } from "../program-platform/package/program-package-archive.ts";
import type { DecodeProgramPackageZipOptionsV1 } from "../program-platform/package/program-package-zip.ts";
import type { ReadOnlyProcessConversationControllerV1 } from "../program-platform/process/read-only-process-conversation-controller.ts";
import type {
  RecentProcessSummaryListInputV1,
  RecentProcessSummaryPageV1,
} from "../program-platform/process/program-process-repository.ts";
import { ProgramLibraryV1 } from "../program-platform/ui/program-library.tsx";
import { ReadOnlyProcessConversationViewV1 } from "../program-platform/ui/read-only-process-conversation.tsx";
import type {
  ProgramRuntimeSurfaceModuleV1,
  ProgramSurfaceHostV1,
} from "../program-platform/ui/program-runtime-surface.ts";
import { selectProgramSurfaceProcessNetworkAccessV1 } from "../program-platform/ui/program-runtime-surface.ts";
import {
  createProgramSurfaceSessionStateOwnerV1,
  type ProgramSurfaceSessionStateV1,
} from "../program-platform/ui/program-surface-session-state.ts";
import { CollectionStateV1 } from "./collection-state.tsx";
import { ButtonV1 } from "./design-system/button.tsx";
import { SillyOsOverlayHostV1 } from "./design-system/overlay-host.tsx";
import { ProductMenuV1 } from "./product-menu.tsx";
import { useProgramAgentProviderOwnerV1 } from "./program-agent-provider-owner.ts";
import { SillyOsBrandV1 } from "./product-chrome.tsx";
import { ProviderSettingsV1 } from "./provider-settings.tsx";
import "./design-system/tokens.css";
import "./design-system/components.css";
import "./collection-state.css";
import "./composer-model-picker.css";
import "./settings.css";
import "./provider-settings.css";
import "./chat.css";
import "./silly-os.css";
import "./design-system/tailwind.css";

export interface SillyOsAgentDrainRegistryV1 {
  isAccepting(): boolean;
  register(drain: () => Promise<void>): () => void;
}

export interface SillyOsAppPropsV1 {
  readonly activeProgram: ActiveProgramRuntimeHandleV1 | null;
  readonly readOnlyConversationController: ReadOnlyProcessConversationControllerV1;
  readonly workspaceAuthority: BrowserProgramWorkspaceAuthorityV1;
  readonly programPackages: ProgramPackageServiceV1;
  readonly programPackageZipDecodeOptions: DecodeProgramPackageZipOptionsV1;
  readonly onLaunchProgramPackage: (
    reference: InstalledProgramPackageReferenceV1,
  ) => Promise<"program">;
  readonly listRecentProcesses: (
    input: RecentProcessSummaryListInputV1,
  ) => Promise<RecentProcessSummaryPageV1>;
  readonly onOpenRecentProcess: (
    processId: string,
  ) => Promise<"library" | "program" | "conversation">;
  readonly onOpenProgramLibrary: () => Promise<boolean>;
  readonly onCloseReadOnlyProcess: () => "library" | "program";
  readonly activeProgramRoute: "library" | "program" | "conversation";
  readonly agentDrainRegistry: SillyOsAgentDrainRegistryV1;
  readonly reportFailure: (code: string, error: unknown) => void;
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

function unavailablePreferencesV1() {
  return defaultBrowserProductPreferencesSnapshotV1;
}

function subscribeUnavailableV1(): () => void {
  return () => undefined;
}

function ActiveProcessMountBoundaryV1({
  processId,
  children,
}: {
  readonly processId: string;
  readonly children: ReactNode;
}): ReactNode {
  return <div key={processId} className="active-process-mount-boundary">{children}</div>;
}

function SillyOsSettingsV1({
  copy,
  locale,
  theme,
  onLocaleChange,
  onThemeChange,
  onBack,
}: {
  readonly copy: ReturnType<typeof getSillyOsCopyV1>;
  readonly locale: SillyOsLocaleV1;
  readonly theme: SillyOsThemeModeV1;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly onThemeChange: (theme: SillyOsThemeModeV1) => void;
  readonly onBack: () => void;
}): ReactNode {
  return (
    <main className="silly-os-settings" data-silly-os-view="settings">
      <header className="silly-os-topbar silly-os-settings__topbar">
        <ButtonV1
          className="silly-os-settings__back"
          type="button"
          size="sm"
          variant="ghost"
          icon={ArrowLeft}
          onClick={onBack}
        >
          {copy.settingsBack}
        </ButtonV1>
        <SillyOsBrandV1 copy={copy} />
        <ProductMenuV1
          copy={copy}
          theme={theme}
          surface="settings"
          onThemeChange={onThemeChange}
          onLocaleChange={onLocaleChange}
        />
      </header>
      <section className="silly-os-settings__panel" data-settings-section="general">
        <h1>{copy.settings}</h1>
        <label>
          <span>{copy.settingsLanguage}</span>
          <select
            value={locale}
            onChange={(event) => onLocaleChange(event.currentTarget.value as SillyOsLocaleV1)}
          >
            <option value="en">English</option>
            <option value="zh-CN">简体中文</option>
          </select>
        </label>
        <label>
          <span>{copy.settingsTheme}</span>
          <select
            value={theme}
            onChange={(event) => onThemeChange(event.currentTarget.value as SillyOsThemeModeV1)}
          >
            <option value="system">{copy.themeSystem}</option>
            <option value="light">{copy.themeLight}</option>
            <option value="dark">{copy.themeDark}</option>
          </select>
        </label>
      </section>
    </main>
  );
}

function ActiveProgramSurfaceV1({
  runtime,
  host,
  sessionState,
}: {
  readonly runtime: ActiveProgramRuntimeHandleV1;
  readonly host: Omit<ProgramSurfaceHostV1, "registerProgramDrain" | "sessionState">;
  readonly sessionState: ProgramSurfaceSessionStateV1;
}): ReactNode {
  const [surface, setSurface] = useState<
    | { readonly kind: "loading"; readonly runtime: ActiveProgramRuntimeHandleV1 }
    | {
      readonly kind: "ready";
      readonly runtime: ActiveProgramRuntimeHandleV1;
      readonly Surface: ProgramRuntimeSurfaceModuleV1["Surface"];
    }
    | {
      readonly kind: "failed";
      readonly runtime: ActiveProgramRuntimeHandleV1;
      readonly error: unknown;
    }
  >({ kind: "loading", runtime });

  useEffect(() => {
    let current = true;
    setSurface({ kind: "loading", runtime });
    void runtime.loadSurface().then((module) => {
      if (current) setSurface({ kind: "ready", runtime, Surface: module.Surface });
    }, (error: unknown) => {
      if (current) setSurface({ kind: "failed", runtime, error });
    });
    return () => {
      current = false;
    };
  }, [runtime]);

  const currentSurface = surface.runtime === runtime
    ? surface
    : { kind: "loading" as const, runtime };
  if (currentSurface.kind === "ready") {
    const Surface: ComponentType<{ controller: unknown; host: ProgramSurfaceHostV1 }> =
      currentSurface.Surface;
    const processNetworkAccess = selectProgramSurfaceProcessNetworkAccessV1(
      runtime.programPackage.manifest.capabilityIds,
      host.processNetworkAccess,
    );
    return (
      <Surface
        controller={runtime.controller}
        host={{
          ...host,
          processNetworkAccess,
          registerProgramDrain: runtime.surfaceDrainOwner.register,
          sessionState,
        }}
      />
    );
  }
  return (
    <main
      className="program-route-state"
      data-silly-os-view={currentSurface.kind === "failed" ? "program-failed" : "program-loading"}
    >
      <div className="program-route-state__content">
        <CollectionStateV1
          icon={currentSurface.kind === "failed" ? TriangleAlert : LoaderCircle}
          {...(currentSurface.kind === "failed"
            ? { tone: "danger" as const, role: "alert" as const }
            : {
              iconMotion: "spin" as const,
              role: "status" as const,
              "aria-live": "polite" as const,
            })}
          title={currentSurface.kind === "failed"
            ? host.copy.persistenceFailure
            : host.copy.openingProgram}
          {...(currentSurface.kind === "failed" && currentSurface.error instanceof Error
            ? { description: currentSurface.error.message }
            : {})}
        />
      </div>
    </main>
  );
}

export function SillyOsAppV1({
  activeProgram,
  readOnlyConversationController,
  workspaceAuthority,
  programPackages,
  programPackageZipDecodeOptions,
  onLaunchProgramPackage,
  listRecentProcesses,
  onOpenRecentProcess,
  onOpenProgramLibrary,
  onCloseReadOnlyProcess,
  activeProgramRoute,
  agentDrainRegistry,
  reportFailure,
}: SillyOsAppPropsV1): ReactNode {
  const route = activeProgramRoute;
  const [preferencesRepository] = useState(createProductPreferencesRepositoryV1);
  const [surfaceSessionStateOwner] = useState(createProgramSurfaceSessionStateOwnerV1);
  const preferences = useSyncExternalStore(
    preferencesRepository?.subscribe ?? subscribeUnavailableV1,
    preferencesRepository?.getSnapshot ?? unavailablePreferencesV1,
    unavailablePreferencesV1,
  );
  const [navigationLocaleOverride] = useState(resolveSillyOsLocaleQueryOverrideV1);
  const [locale, setLocale] = useState<SillyOsLocaleV1>(() =>
    navigationLocaleOverride ?? resolveSillyOsCopyV1(preferences.locale).locale
  );
  const [systemDark, setSystemDark] = useState(() =>
    typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches
  );
  const copy = getSillyOsCopyV1(locale);
  const colorScheme = resolveSillyOsColorSchemeV1(preferences.theme, systemDark);
  const conversation = useSyncExternalStore(
    readOnlyConversationController.subscribe,
    readOnlyConversationController.getSnapshot,
    readOnlyConversationController.getSnapshot,
  );
  const resetProductPreferencesV1 = useCallback(
    () => preferencesRepository?.clear(),
    [preferencesRepository],
  );
  const programModelSelectionContext = useMemo(() => {
    if (activeProgram === null) return null;
    const { reference, manifest } = activeProgram.programPackage;
    return {
      scopeKey: JSON.stringify([
        reference.programId,
        reference.packageVersion,
        reference.contentDigest,
      ]),
      recommendedModelPatterns: manifest.recommendedModelPatterns ?? [],
    };
  }, [activeProgram]);
  const agentProvider = useProgramAgentProviderOwnerV1({
    workspaceAuthority,
    programPackages,
    programModelSelectionContext,
    agentDrainRegistry,
    resetProductPreferences: resetProductPreferencesV1,
    reportFailure,
  });

  useEffect(() => {
    if (navigationLocaleOverride === null) {
      setLocale(resolveSillyOsCopyV1(preferences.locale).locale);
    }
  }, [navigationLocaleOverride, preferences.locale]);
  const closeAgentSettingsV1 = agentProvider.closeSettings;
  const openAgentSettingsV1 = agentProvider.openSettings;
  const surfaceAgentHostV1 = agentProvider.agentHost;
  const surfaceAgentRuntimeV1 = agentProvider.runtime;
  const surfaceAgentReadinessV1 = agentProvider.readiness;
  const surfaceActiveModelV1 = agentProvider.activeModel;
  const surfaceProviderModelV1 = agentProvider.providerModel;
  const processNetworkAccess = useMemo(
    () => ({
      load: (processId: string) => workspaceAuthority.loadProcessNetworkAccess(processId),
      set: (input: { readonly processId: string; readonly enabled: boolean }) =>
        workspaceAuthority.setProcessNetworkAccess(input),
    }),
    [workspaceAuthority],
  );

  useEffect(() => {
    if (typeof matchMedia !== "function") return undefined;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const update = (): void => setSystemDark(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    applySillyOsDocumentPreferencesV1({ document, locale, colorScheme });
  }, [colorScheme, locale]);
  useEffect(() => () => surfaceSessionStateOwner.clear(), [surfaceSessionStateOwner]);

  const changeLocaleV1 = useCallback((next: SillyOsLocaleV1): void => {
    try {
      preferencesRepository?.setLocale(next);
    } catch (error) {
      reportFailure("silly_os.product_preferences_save_failed", error);
    }
    setLocale(next);
    if (typeof location !== "undefined") {
      const url = new URL(location.href);
      url.searchParams.set("locale", next);
      history.replaceState(history.state, "", url);
    }
  }, [preferencesRepository, reportFailure]);

  const changeThemeV1 = useCallback((next: SillyOsThemeModeV1): void => {
    try {
      preferencesRepository?.setTheme(next);
    } catch (error) {
      reportFailure("silly_os.product_preferences_save_failed", error);
    }
  }, [preferencesRepository, reportFailure]);

  const openLibraryV1 = useCallback(async (): Promise<boolean> => {
    const opened = await onOpenProgramLibrary();
    if (opened) {
      closeAgentSettingsV1();
    }
    return opened;
  }, [closeAgentSettingsV1, onOpenProgramLibrary]);

  const surfaceHost = useMemo<
    Omit<ProgramSurfaceHostV1, "registerProgramDrain" | "sessionState">
  >(() => ({
    copy,
    locale,
    theme: preferences.theme,
    agentHost: surfaceAgentHostV1,
    deterministicAgent: surfaceAgentRuntimeV1 === "deterministic_test",
    forgetAgent: agentProvider.forgetAgent,
    agentReadiness: surfaceAgentReadinessV1,
    activeModel: surfaceActiveModelV1,
    processNetworkAccess,
    providerModel: surfaceProviderModelV1,
    onLocaleChange: changeLocaleV1,
    onThemeChange: changeThemeV1,
    onOpenSettings: (surface) =>
      openAgentSettingsV1(surface === undefined ? undefined : { returnSurface: surface }),
    onOpenAgentSettings: (surface, target) =>
      openAgentSettingsV1({ section: target, returnSurface: surface }),
    onOpenProgramLibrary: openLibraryV1,
    registerAgentDrain: agentDrainRegistry.register,
    reportFailure,
  }), [
    agentDrainRegistry.register,
    changeLocaleV1,
    changeThemeV1,
    copy,
    locale,
    openLibraryV1,
    openAgentSettingsV1,
    preferences.theme,
    processNetworkAccess,
    reportFailure,
    surfaceActiveModelV1,
    surfaceAgentHostV1,
    surfaceAgentReadinessV1,
    surfaceAgentRuntimeV1,
    surfaceProviderModelV1,
    agentProvider.forgetAgent,
  ]);

  return (
    <div
      className="silly-os"
      lang={locale}
      data-locale={locale}
      data-theme-mode={preferences.theme}
      data-color-scheme={colorScheme}
      data-agent-workspace-state={agentProvider.controlSnapshot?.workspace.phase ?? "closed"}
    >
      <SillyOsOverlayHostV1>
        <div
          className="silly-os-route-layer"
          inert={agentProvider.settingsOpen || undefined}
          aria-hidden={agentProvider.settingsOpen || undefined}
        >
          {route === "library"
            ? (
              <main className="program-library-route" data-silly-os-view="program-library">
                <ProgramLibraryV1
                  service={programPackages}
                  zipDecodeOptions={programPackageZipDecodeOptions}
                  locale={locale}
                  listRecentProcesses={listRecentProcesses}
                  onOpenSettings={() => agentProvider.openSettings()}
                  onOpenProcess={async (processId) => {
                    await onOpenRecentProcess(processId);
                  }}
                  onLaunch={async (reference) => {
                    try {
                      await onLaunchProgramPackage(reference);
                    } catch (error) {
                      reportFailure("silly_os.program_package_launch_failed", error);
                    }
                  }}
                />
              </main>
            )
            : route === "conversation"
            ? conversation.phase === "ready" && conversation.conversation !== null
              ? (
                <ActiveProcessMountBoundaryV1
                  processId={conversation.conversation.process.processId}
                >
                  <ReadOnlyProcessConversationViewV1
                    copy={copy}
                    conversation={conversation.conversation}
                    onHome={onCloseReadOnlyProcess}
                    onLoadOlderTranscript={async () => {
                      const result = await readOnlyConversationController.loadOlderTranscript();
                      return result.kind === "completed" && result.value;
                    }}
                    onReloadLatestTranscript={async () => {
                      const result = await readOnlyConversationController.reloadLatestTranscript();
                      return result.kind === "completed" && result.value;
                    }}
                  />
                </ActiveProcessMountBoundaryV1>
              )
              : (
                <main
                  className="program-route-state"
                  data-silly-os-view="read-only-conversation-loading"
                >
                  <div className="program-route-state__content">
                    <CollectionStateV1
                      icon={conversation.phase === "failed" ? TriangleAlert : LoaderCircle}
                      {...(conversation.phase === "failed"
                        ? { tone: "danger" as const, role: "alert" as const }
                        : { iconMotion: "spin" as const, role: "status" as const })}
                      title={conversation.phase === "failed"
                        ? copy.persistenceFailure
                        : copy.openingProgram}
                    />
                  </div>
                </main>
              )
            : activeProgram === null
            ? (
              <main className="program-route-state" data-silly-os-view="program-loading">
                <div className="program-route-state__content">
                  <CollectionStateV1
                    icon={LoaderCircle}
                    iconMotion="spin"
                    title={copy.openingProgram}
                  />
                </div>
              </main>
            )
            : (
              <ActiveProgramSurfaceV1
                runtime={activeProgram}
                host={surfaceHost}
                sessionState={surfaceSessionStateOwner.forPackage(
                  activeProgram.programPackage.reference,
                )}
              />
            )}
        </div>
        {agentProvider.settingsOpen && (
          <div className="program-settings-overlay">
            {agentProvider.runtime === "deterministic_test"
              ? (
                <SillyOsSettingsV1
                  copy={copy}
                  locale={locale}
                  theme={preferences.theme}
                  onLocaleChange={changeLocaleV1}
                  onThemeChange={changeThemeV1}
                  onBack={agentProvider.closeSettings}
                />
              )
              : (
                <ProviderSettingsV1
                  copy={copy}
                  {...agentProvider.settingsProps}
                  onBack={agentProvider.closeSettings}
                  onLocaleChange={changeLocaleV1}
                  theme={preferences.theme}
                  onThemeChange={changeThemeV1}
                />
              )}
          </div>
        )}
      </SillyOsOverlayHostV1>
    </div>
  );
}

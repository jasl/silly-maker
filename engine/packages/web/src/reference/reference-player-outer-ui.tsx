// SPDX-License-Identifier: MIT
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { ComponentType, ReactElement, ReactNode } from "react";

import type { RuntimeCapabilityPortV1 } from "@sillymaker/base";
import { engineDebugPatchStateKindV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { PresentationFreezePortV1, PresentationRatePortV1 } from "@sillymaker/ui";
import {
  createDevDockContributionSetV1,
  createDevDockControlV1,
} from "@sillymaker/ui/internal/dev-dock-host";
import {
  DevelopmentToolLauncherInternalV1,
} from "@sillymaker/ui/internal/development-tool-launcher";
import { createEmbeddedAuthoringLauncherPortInternalV1 } from "@sillymaker/ui/internal/embedded-authoring-launcher";
import type {
  DevDockControlV1,
  DevDockContributionLoadHandleV1,
  DevDockContributionPublicationPortV1,
  DevDockContributionSetV1,
  DevDockPositionV1,
  StateTunerPortV1,
} from "@sillymaker/ui/reference/dev-dock";
import {
  defaultSettingsLabelsV1,
  DefaultSettingsSectionsV1,
} from "@sillymaker/ui/reference/settings";
import type { DefaultSettingsLabelsV1 } from "@sillymaker/ui/reference/settings";

import type {
  BoundWebGameOuterUiV1,
  WebGameOuterUiHostInputV1,
  WebGameOuterUiV1,
} from "../application/start-web-game-application.tsx";
import type { ReferencePlayerDevDockRuntimePropsInternalV1 } from "./reference-player-dev-dock-runtime.tsx";

interface ReferenceStateTunerInstanceV1 {
  readonly admin: {
    inspectForTest(): { readonly snapshot: { readonly state: unknown } };
    readonly debugControl?: {
      execute(
        command: never,
        isCapabilityEnabled: () => boolean,
      ): Promise<
        | {
          readonly kind: "executed";
          readonly attempt: { readonly result: { readonly kind: string } };
        }
        | { readonly kind: "validation_failed"; readonly errors: readonly unknown[] }
        | { readonly kind: "capability_disabled" }
        | { readonly kind: "not_executed"; readonly code: string }
      >;
    };
  };
  readonly semantic: { subscribe(listener: () => void): () => void };
}

function formatDebugValidationErrorsV1(errors: readonly unknown[]): string {
  return errors.map((error) => {
    if (error !== null && typeof error === "object" && "code" in error) {
      const code = String((error as { readonly code: unknown }).code);
      const detail =
        "detail" in error && typeof (error as { readonly detail?: unknown }).detail === "string"
          ? (error as { readonly detail: string }).detail
          : undefined;
      return detail === undefined || detail.length === 0 ? code : `${code}: ${detail}`;
    }
    return String(error);
  }).join("; ");
}

function createReferenceStateTunerPortV1(input: {
  readonly instance: ReferenceStateTunerInstanceV1;
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly prepareMutation: () => Promise<void>;
}): StateTunerPortV1 {
  const { instance, capabilities } = input;
  return ({
    read: () => instance.admin.inspectForTest().snapshot.state,
    subscribe: (listener: () => void) => instance.semantic.subscribe(listener),
    async patch(path: readonly string[], value: string | number | boolean | null) {
      const debugControl = instance.admin.debugControl;
      if (debugControl === undefined) {
        return ({
          kind: "rejected" as const,
          message: "需要重新加载后才能写入（启动时未开启开发者工具）",
        });
      }
      const capabilityState = capabilities.state.getCurrent();
      if (!capabilityState.debugTools || !capabilityState.cheats) {
        return ({ kind: "capability_disabled" as const });
      }
      try {
        await input.prepareMutation();
      } catch {
        return ({
          kind: "rejected" as const,
          message: "所需文本内容尚未就绪",
        });
      }
      const result = await debugControl.execute(
        ({
          kind: engineDebugPatchStateKindV1,
          path: [...path],
          value,
        }) as never,
        () => {
          const state = capabilities.state.getCurrent();
          return state.debugTools && state.cheats;
        },
      );
      switch (result.kind) {
        case "executed":
          return result.attempt.result.kind === "committed"
            ? ({ kind: "committed" as const })
            : ({ kind: "rejected" as const, message: result.attempt.result.kind });
        case "validation_failed":
          return ({
            kind: "validation_failed" as const,
            message: formatDebugValidationErrorsV1(result.errors),
          });
        case "capability_disabled":
          return ({ kind: "capability_disabled" as const });
        case "not_executed":
          return ({ kind: "rejected" as const, message: result.code });
        default: {
          const exhaustive: never = result;
          throw new TypeError(`unknown debug result ${String(exhaustive)}`);
        }
      }
    },
  });
}

interface InteractionLazyReferenceDevDockPropsInternalV1 {
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly contributions: DevDockContributionSetV1;
  readonly contributionPublication?: DevDockContributionPublicationPortV1;
  readonly inputRouter: WebGameOuterUiHostInputV1["inputRouter"];
  readonly control: DevDockControlV1;
  readonly freeze: PresentationFreezePortV1;
  readonly rate: PresentationRatePortV1;
  readonly observeOpenState: (open: boolean) => void;
  readonly savePort: WebGameOuterUiHostInputV1["savePort"];
  readonly clearAllSaves: WebGameOuterUiHostInputV1["clearAllSaves"];
  readonly onReloadCurrentState: WebGameOuterUiHostInputV1["reloadCurrentState"];
  readonly onReinitialize: () => void | Promise<unknown>;
  readonly faultCause: WebGameOuterUiHostInputV1["faultCause"];
  readonly stateTuner: StateTunerPortV1;
  readonly load?: () => Promise<DevDockContributionLoadHandleV1>;
  readonly position?: DevDockPositionV1;
  readonly chip?: boolean;
  readonly movableChip?: boolean;
  readonly info?: ReactNode;
}

type ReferencePlayerDevDockRuntimeComponentInternalV1 = ComponentType<
  ReferencePlayerDevDockRuntimePropsInternalV1
>;

type ReferencePlayerDevDockRuntimeLoadInternalV1 =
  | { readonly kind: "pending" }
  | {
    readonly kind: "ready";
    readonly component: ReferencePlayerDevDockRuntimeComponentInternalV1;
  }
  | { readonly kind: "error" };

/** Keeps only the combined launcher resident until debug is explicitly used. */
function InteractionLazyReferenceDevDockInternalV1(
  props: InteractionLazyReferenceDevDockPropsInternalV1,
): ReactElement | null {
  const capabilityState = useSyncExternalStore(
    props.capabilities.state.subscribe,
    props.capabilities.state.getCurrent,
    props.capabilities.state.getCurrent,
  );
  const authoringLauncher = useMemo(
    () => createEmbeddedAuthoringLauncherPortInternalV1(),
    [],
  );
  const authoringState = useSyncExternalStore(
    authoringLauncher.state.subscribe,
    authoringLauncher.state.getCurrent,
    authoringLauncher.state.getCurrent,
  );
  const openWindowCount = useSyncExternalStore(
    props.control.openPanelIds.subscribe,
    () => props.control.openPanelIds.getCurrent().length,
    () => props.control.openPanelIds.getCurrent().length,
  );
  const [runtimeRequested, setRuntimeRequested] = useState(false);
  const [runtimeLoad, setRuntimeLoad] = useState<ReferencePlayerDevDockRuntimeLoadInternalV1>({
    kind: "pending",
  });
  const [expandOnMount, setExpandOnMount] = useState(false);
  const [runtimeCommitted, setRuntimeCommitted] = useState(false);
  const [launcherPosition, setLauncherPosition] = useState<DevDockPositionV1>(
    props.position ?? "top_right",
  );
  const chip = props.chip !== false;
  const fallbackVisible = chip && (capabilityState.debugTools || authoringState.available);
  useLayoutEffect(() => {
    if (!fallbackVisible || runtimeCommitted) return undefined;
    return authoringLauncher.claimHost();
  }, [authoringLauncher, fallbackVisible, runtimeCommitted]);
  // A control may request a panel before its registry exists. Convert that
  // imperative demand into the same monotonic runtime selection as a click;
  // this is not derived display state mirrored from the panel count.
  useEffect(() => {
    if (!capabilityState.debugTools || openWindowCount === 0) return;
    setRuntimeRequested(true);
  }, [capabilityState.debugTools, openWindowCount]);
  useEffect(() => {
    if (!runtimeRequested) return undefined;
    let current = true;
    void import("./reference-player-dev-dock-runtime.tsx")
      .then((runtime) => {
        if (!current) return;
        setRuntimeLoad({
          kind: "ready",
          component: runtime.ReferencePlayerDevDockRuntimeInternalV1,
        });
      })
      .catch(() => {
        if (current) setRuntimeLoad({ kind: "error" });
      });
    return () => {
      current = false;
    };
  }, [runtimeRequested]);
  const onRuntimeCommitted = useCallback((): void => {
    setRuntimeCommitted(true);
  }, []);

  const runtimeFailure = runtimeLoad.kind === "error"
    ? (
      <div data-development-tool-runtime-failure="true" role="alert">
        <span>调试工具加载失败，游戏仍可继续。</span>
        <button type="button" onClick={() => globalThis.location.reload()}>重新加载</button>
      </div>
    )
    : null;

  const fallback = fallbackVisible
    ? (
      <DevelopmentToolLauncherInternalV1
        position={launcherPosition}
        onPositionChange={setLauncherPosition}
        {...(props.movableChip === undefined ? {} : { movable: props.movableChip })}
        {...(authoringState.available
          ? {
            authoringAction: {
              label: "打开内嵌制作",
              onActivate: authoringLauncher.activate,
            },
          }
          : {})}
        {...(capabilityState.debugTools
          ? {
            debugAction: {
              label: "调试",
              expanded: expandOnMount,
              onActivate() {
                setExpandOnMount(true);
                setRuntimeRequested(true);
              },
            },
          }
          : {})}
      >
        {runtimeFailure}
      </DevelopmentToolLauncherInternalV1>
    )
    : null;

  if (!runtimeRequested) return fallback;
  if (runtimeLoad.kind !== "ready") return fallback;
  const Runtime = runtimeLoad.component;
  return (
    <Runtime
      capabilities={props.capabilities}
      contributions={props.contributions}
      inputRouter={props.inputRouter}
      control={props.control}
      freeze={props.freeze}
      rate={props.rate}
      observeOpenState={(state) => props.observeOpenState(state.open)}
      savePort={props.savePort}
      clearAllSaves={props.clearAllSaves}
      onReloadCurrentState={props.onReloadCurrentState}
      onReinitialize={props.onReinitialize}
      faultCause={props.faultCause}
      stateTuner={props.stateTuner}
      position={launcherPosition}
      chip={chip}
      defaultExpanded={expandOnMount}
      onCommitted={onRuntimeCommitted}
      onPositionChangeInternalV1={setLauncherPosition}
      {...(props.movableChip === undefined ? {} : { movableChip: props.movableChip })}
      {...(props.contributionPublication === undefined
        ? {}
        : { contributionPublication: props.contributionPublication })}
      {...(props.load === undefined ? {} : { load: props.load })}
      {...(props.info === undefined ? {} : { info: props.info })}
    />
  );
}

/**
 * First-party, copy/eject-friendly outer Player composition. Products select
 * it explicitly; the default Web Player never imports this module.
 */
export function createReferencePlayerOuterUiV1(input: {
  readonly instance: ReferenceStateTunerInstanceV1;
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly presentationFreeze: PresentationFreezePortV1;
  readonly presentationRate: PresentationRatePortV1;
  readonly settingsLabels?: Partial<DefaultSettingsLabelsV1>;
  readonly contributions?: DevDockContributionSetV1;
  readonly contributionPublication?: DevDockContributionPublicationPortV1;
  readonly control?: DevDockControlV1;
  readonly loadContributions?: () => Promise<DevDockContributionLoadHandleV1>;
  readonly position?: DevDockPositionV1;
  readonly chip?: boolean;
  /** Omit the preset's generic rows when the product already owns Settings. */
  readonly includeSettingsSections?: boolean;
  readonly movableChip?: boolean;
  readonly showDeveloperTools?: boolean;
  readonly info?: ReactNode;
}): WebGameOuterUiV1 {
  const control = input.control ?? createDevDockControlV1();
  const contributions = createDevDockContributionSetV1(
    input.contributions ?? { panels: [] },
  );
  const settingsLabels = {
    ...defaultSettingsLabelsV1,
    ...input.settingsLabels,
  };
  const loadContributions = input.loadContributions;
  return ({
    bindHost(host: WebGameOuterUiHostInputV1): BoundWebGameOuterUiV1 {
      const stateTuner = createReferenceStateTunerPortV1({
        instance: input.instance,
        capabilities: input.capabilities,
        prepareMutation: host.prepareStateMutation,
      });
      const load = loadContributions === undefined
        ? undefined
        : async (): Promise<DevDockContributionLoadHandleV1> => {
          const loaded = await loadContributions();
          return {
            contributions: loaded.contributions,
            acknowledgeCommitted() {
              loaded.acknowledgeCommitted?.();
              host.signalOptionalCapabilityReady();
            },
            ...(loaded.dispose === undefined ? {} : { dispose: () => loaded.dispose?.() }),
          };
        };
      return ({
        settingsSections: input.includeSettingsSections === false ? [] : [
          <DefaultSettingsSectionsV1
            key="sillymaker-reference-settings"
            playerProfile={input.playerProfile}
            capabilities={input.capabilities}
            showDeveloperTools={input.showDeveloperTools !== false}
            labels={{
              bgmVolumeLabel: settingsLabels.bgmVolumeLabel,
              voiceVolumeLabel: settingsLabels.voiceVolumeLabel,
              sfxVolumeLabel: settingsLabels.sfxVolumeLabel,
              mutedLabel: settingsLabels.mutedLabel,
              ...(settingsLabels.skipCutscenesLabel === undefined ? {} : {
                skipCutscenesLabel: settingsLabels.skipCutscenesLabel,
              }),
              textSpeedLabel: settingsLabels.textSpeedLabel,
              autoWaitLabel: settingsLabels.autoWaitLabel,
              fullscreenLabel: settingsLabels.fullscreenLabel,
              developerToolsLabel: settingsLabels.developerToolsLabel,
            }}
          />,
        ],
        renderAuxiliarySurface({ returnToTitle }: {
          readonly returnToTitle: () => Promise<void>;
        }): ReactNode {
          return (
            <InteractionLazyReferenceDevDockInternalV1
              capabilities={input.capabilities}
              contributions={contributions}
              {...(input.contributionPublication === undefined
                ? {}
                : { contributionPublication: input.contributionPublication })}
              inputRouter={host.inputRouter}
              control={control}
              freeze={input.presentationFreeze}
              rate={input.presentationRate}
              observeOpenState={host.observeOpenState}
              savePort={host.savePort}
              clearAllSaves={host.clearAllSaves}
              onReloadCurrentState={host.reloadCurrentState}
              onReinitialize={returnToTitle}
              faultCause={host.faultCause}
              stateTuner={stateTuner}
              {...(load === undefined ? {} : { load })}
              {...(input.position === undefined ? {} : { position: input.position })}
              {...(input.chip === undefined ? {} : { chip: input.chip })}
              {...(input.movableChip === undefined ? {} : { movableChip: input.movableChip })}
              {...(input.info === undefined ? {} : { info: input.info })}
            />
          );
        },
      });
    },
  });
}

// SPDX-License-Identifier: MIT
import type { ReactNode } from "react";

import type { RuntimeCapabilityPortV1 } from "@sillymaker/base";
import { engineDebugPatchStateKindV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { PresentationFreezePortV1, PresentationRatePortV1 } from "@sillymaker/ui";
import type {
  DevDockControlV1,
  DevDockContributionSetV1,
  DevDockPositionV1,
  StateTunerPortV1,
} from "@sillymaker/ui/reference/dev-dock";
import {
  createDevDockContributionSetV1,
  createDevDockControlV1,
  ReferenceDevDockV1,
} from "@sillymaker/ui/reference/dev-dock";
import { bindDevDockContributionAcceptanceInternalV1 } from "@sillymaker/ui/reference/internal";
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
  readonly control?: DevDockControlV1;
  readonly loadContributions?: () => Promise<DevDockContributionSetV1>;
  readonly position?: DevDockPositionV1;
  readonly chip?: boolean;
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
        : async (): Promise<DevDockContributionSetV1> =>
          bindDevDockContributionAcceptanceInternalV1(
            await loadContributions(),
            host.signalOptionalCapabilityReady,
          );
      return ({
        settingsSections: [
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
            <ReferenceDevDockV1
              capabilities={input.capabilities}
              contributions={contributions}
              inputRouter={host.inputRouter}
              control={control}
              freeze={input.presentationFreeze}
              rate={input.presentationRate}
              observeOpenState={(state) => host.observeOpenState(state.open)}
              savePort={host.savePort}
              clearAllSaves={host.clearAllSaves}
              onReloadCurrentState={host.reloadCurrentState}
              onReinitialize={returnToTitle}
              faultCause={host.faultCause}
              stateTuner={stateTuner}
              {...(load === undefined ? {} : { load })}
              {...(input.position === undefined ? {} : { position: input.position })}
              {...(input.chip === undefined ? {} : { chip: input.chip })}
              {...(input.info === undefined ? {} : { info: input.info })}
            />
          );
        },
      });
    },
  });
}

// SPDX-License-Identifier: MIT
import { useState, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode } from "react";

import type { DeepReadonly, RuntimeCapabilityPortV1 } from "@sillymaker/base";

import { DevDockV1, createDevDockContributionSetV1 } from "../debug/DevDock.js";
import type { DevDockContributionSetV1, DevDockOpenStateV1 } from "../debug/DevDock.js";
import type { PresentationIntentRouterV1 } from "../interaction/presentation-intent-router.js";
import { OverlayHostV1 } from "../overlays/overlay-host.js";
import type { OverlayRendererResolverV1 } from "../overlays/overlay-host.js";
import type { SaveOverlayLabelsV1, SaveOverlayPortV1 } from "../persistence/save-overlay.js";
import { SaveOverlayV1 } from "../persistence/save-overlay.js";
import { useReadonlyViewV1 } from "../runtime/create-view-bridge.js";
import type { RuntimePresentationPublicationV1 } from "../runtime/runtime-presentation-store.js";
import { GameShell } from "../shell/game-shell.js";
import type { GameShellViewportOptionsV1 } from "../shell/game-shell.js";
import { SettingsLauncherV1 } from "../system/settings-launcher.js";
import { SystemDialogHostV1 } from "../system/system-dialog-host.js";
import { Button } from "../primitives/Button.js";
import type { GameUiCompositionV1, GameUiOverlayIdV1 } from "./create-game-ui-composition.js";
import styles from "./default-game-root.module.css";

/** Player-facing labels of the default surfaces; Stories override per locale. */
export interface DefaultGameRootLabelsV1 {
  readonly systemMenuLabel: string;
  readonly saveLabel: string;
  readonly settingsLabel: string;
  readonly settingsTitle: string;
  readonly settingsEmptyText: string;
  readonly closeLabel: string;
}

export const defaultGameRootLabelsV1: DefaultGameRootLabelsV1 = Object.freeze({
  systemMenuLabel: "System",
  saveLabel: "Save",
  settingsLabel: "Settings",
  settingsTitle: "Settings",
  settingsEmptyText: "No settings available yet.",
  closeLabel: "Close",
});

export interface DefaultGameRootSlotContextV1<TPublication, TSemantic> {
  readonly publication: DeepReadonly<TPublication>;
  readonly semantic: TSemantic;
  readonly intents: PresentationIntentRouterV1;
}

/**
 * Story extension points. Every slot receives the current presentation
 * publication plus the semantic port; adding a Story overlay or layer
 * contribution never modifies the composer.
 */
export interface DefaultGameRootSlotsV1<TPublication, TSemantic, TOverlayId extends string> {
  background?(context: DefaultGameRootSlotContextV1<TPublication, TSemantic>): ReactNode;
  character?(context: DefaultGameRootSlotContextV1<TPublication, TSemantic>): ReactNode;
  sceneInteraction?(context: DefaultGameRootSlotContextV1<TPublication, TSemantic>): ReactNode;
  hud?(context: DefaultGameRootSlotContextV1<TPublication, TSemantic>): ReactNode;
  narrative?(context: DefaultGameRootSlotContextV1<TPublication, TSemantic>): ReactNode;
  systemMenuExtras?(context: DefaultGameRootSlotContextV1<TPublication, TSemantic>): ReactNode;
  overlayResolver?(
    context: DefaultGameRootSlotContextV1<TPublication, TSemantic>,
  ): OverlayRendererResolverV1<TOverlayId>;
}

export interface DefaultGameRootPropsV1<
  TSemanticPublication,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId extends string,
  TSemantic,
> {
  readonly composition: GameUiCompositionV1<
    TSemanticPublication,
    TStoryUiState,
    TView,
    TAssetId,
    TOverlayId
  >;
  readonly semantic: TSemantic;
  readonly accessibleName: string;
  readonly applicationId: string;
  readonly viewport: GameShellViewportOptionsV1;
  readonly capabilities?: RuntimeCapabilityPortV1;
  readonly saveUi?: {
    readonly port: SaveOverlayPortV1;
    readonly labels: SaveOverlayLabelsV1;
  };
  readonly labels?: Partial<DefaultGameRootLabelsV1>;
  readonly slots?: DefaultGameRootSlotsV1<
    RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>,
    TSemantic,
    TOverlayId
  >;
  readonly devDockContributions?: DevDockContributionSetV1;
}

const closedDevDockStateV1 = Object.freeze({
  leftOpen: false,
  rightOpen: false,
}) satisfies DevDockOpenStateV1;
const emptyDevDockContributionsV1 = createDevDockContributionSetV1({ panels: [] });

function createDefaultOverlayResolverV1<TOverlayId extends string>(input: {
  readonly storyResolver: OverlayRendererResolverV1<TOverlayId> | null;
  readonly saveUi:
    { readonly port: SaveOverlayPortV1; readonly labels: SaveOverlayLabelsV1 } | undefined;
  readonly inputRouter: Parameters<typeof SaveOverlayV1>[0]["inputRouter"];
}): OverlayRendererResolverV1<GameUiOverlayIdV1<TOverlayId>> {
  return Object.freeze({
    resolve(overlayId: DeepReadonly<GameUiOverlayIdV1<TOverlayId>>) {
      if (overlayId === "system.save") {
        if (input.saveUi === undefined) return null;
        return Object.freeze({
          accessibleName: input.saveUi.labels.accessibleName,
          content: (
            <SaveOverlayV1
              port={input.saveUi.port}
              labels={input.saveUi.labels}
              inputRouter={input.inputRouter}
            />
          ),
        });
      }
      return input.storyResolver?.resolve(overlayId as DeepReadonly<TOverlayId>) ?? null;
    },
  });
}

function DefaultDevDockV1(props: {
  readonly capabilities: RuntimeCapabilityPortV1;
  readonly contributions: DevDockContributionSetV1;
  readonly composition: {
    readonly input: GameUiCompositionV1<never, never, never, never, never>["input"];
  };
}): ReactElement | null {
  const capabilities = useSyncExternalStore(
    props.capabilities.state.subscribe,
    props.capabilities.state.getCurrent,
    props.capabilities.state.getCurrent,
  );
  const [openState, setOpenState] = useState<DevDockOpenStateV1>(closedDevDockStateV1);
  if (!capabilities.debugTools) return null;
  return (
    <DevDockV1
      capabilities={props.capabilities}
      contributions={props.contributions}
      inputRouter={props.composition.input}
      openState={openState}
      onOpenStateChange={setOpenState}
    />
  );
}

/**
 * The default GameRoot: a complete playable shell over a composed UI with
 * zero Story React code. The stage renders inside a managed GameViewport;
 * default surfaces (Save, Settings, dialogs) satisfy the designed baseline;
 * the resident player DOM carries no debug vocabulary — DevDock is the only
 * debug host and appears solely behind the `debug_tools` capability.
 */
export function DefaultGameRootV1<
  TSemanticPublication,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId extends string,
  TSemantic,
>(
  props: DefaultGameRootPropsV1<
    TSemanticPublication,
    TStoryUiState,
    TView,
    TAssetId,
    TOverlayId,
    TSemantic
  >,
): ReactElement {
  type PublicationV1 = RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>;
  const labels = Object.freeze({ ...defaultGameRootLabelsV1, ...props.labels });
  const publication = useSyncExternalStore(
    props.composition.presentation.subscribe,
    props.composition.presentation.getSnapshot,
    props.composition.presentation.getSnapshot,
  ) as DeepReadonly<PublicationV1>;
  const anchor = useReadonlyViewV1(props.composition.anchor);

  const slotContext: DefaultGameRootSlotContextV1<PublicationV1, TSemantic> = Object.freeze({
    publication,
    semantic: props.semantic,
    intents: props.composition.intents,
  });
  const slots = props.slots ?? {};
  const overlayResolver = createDefaultOverlayResolverV1<TOverlayId>({
    storyResolver: slots.overlayResolver?.(slotContext) ?? null,
    saveUi: props.saveUi,
    inputRouter: props.composition.input,
  });

  const layers = Object.freeze({
    background: (
      <div
        className={styles["default-root__stage-slot"]}
        key={`background:${String(anchor.epoch)}`}
      >
        {slots.background?.(slotContext) ?? null}
      </div>
    ),
    character: (
      <div className={styles["default-root__stage-slot"]} key={`character:${String(anchor.epoch)}`}>
        {slots.character?.(slotContext) ?? null}
      </div>
    ),
    sceneInteraction: slots.sceneInteraction?.(slotContext) ?? null,
    hud: slots.hud?.(slotContext) ?? null,
    workspaceOverlay: (
      <OverlayHostV1
        store={props.composition.overlaySession}
        rendererResolver={overlayResolver}
        inputRouter={props.composition.input}
        closeLabel={labels.closeLabel}
      />
    ),
    narrative: slots.narrative?.(slotContext) ?? null,
    system: (
      <SystemDialogHostV1
        inputRouter={props.composition.input}
        store={props.composition.systemDialogSession}
        settings={Object.freeze({
          title: labels.settingsTitle,
          closeLabel: labels.closeLabel,
          sections: Object.freeze([]),
          emptyText: labels.settingsEmptyText,
        })}
      >
        <div
          role="group"
          aria-label={labels.systemMenuLabel}
          className={styles["default-root__system-menu"]}
          data-default-system-menu="true"
        >
          {props.saveUi === undefined ? null : (
            <Button
              onClick={() =>
                props.composition.intents.execute(
                  Object.freeze({ kind: "overlay.open" as const, overlayId: "system.save" }),
                )
              }
            >
              {labels.saveLabel}
            </Button>
          )}
          <SettingsLauncherV1 label={labels.settingsLabel} />
          {slots.systemMenuExtras?.(slotContext) ?? null}
        </div>
      </SystemDialogHostV1>
    ),
  });

  return (
    <div
      role="application"
      aria-label={props.accessibleName}
      data-application-id={props.applicationId}
      data-presentation-epoch={anchor.epoch}
      data-presentation-origin={anchor.origin}
      data-presentation-revision={publication.revision}
      className={styles["default-root"]}
    >
      <GameShell
        accessibleName={props.accessibleName}
        layers={layers}
        inputRouter={props.composition.input}
        viewport={props.viewport}
        devDock={
          props.capabilities === undefined ? null : (
            <DefaultDevDockV1
              capabilities={props.capabilities}
              contributions={props.devDockContributions ?? emptyDevDockContributionsV1}
              composition={props.composition}
            />
          )
        }
      />
    </div>
  );
}

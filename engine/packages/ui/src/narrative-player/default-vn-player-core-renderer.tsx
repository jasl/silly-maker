// SPDX-License-Identifier: MIT
import { useId } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from "react";

import type { NarrativeSurfaceDialogueRendererPropsV1 } from "../narrative/narrative-surface-composition.tsx";
import { systemInputActionIdsV1 } from "../input/contracts.ts";
import type { DefaultVnPlayerSystemControlsInternalV1 } from "./default-vn-player-system.tsx";

import styles from "./default-vn-player-core.module.css";

const narrativeFocusScopeSelectorV1 = "[data-narrative-surface-focus-scope]";

export interface DefaultVnPlayerLabelsInternalV1 {
  readonly advance: string;
  readonly playbackControls: string;
  readonly back: string;
  readonly forward: string;
  readonly voice: string;
  readonly skip: string;
  readonly auto: string;
  readonly showUi: string;
  readonly menu: string;
  readonly resume: string;
  readonly save: string;
  readonly quickSave: string;
  readonly quickLoad: string;
  readonly settings: string;
  readonly returnToTitle: string;
  readonly quickSaveComplete: string;
  readonly quickLoadDescription: string;
  readonly confirm: string;
  readonly cancel: string;
  readonly operationFailed: string;
  readonly quickLoadUnavailable: string;
}

function focusChromeRestoreSurfaceV1(element: HTMLButtonElement | null): void {
  element?.focus({ preventScroll: true });
}

function closestNarrativeFocusScopeV1(target: HTMLElement): HTMLElement | null {
  return target.closest<HTMLElement>(narrativeFocusScopeSelectorV1);
}

function returnNarrativeFocusOnEscapeV1(event: KeyboardEvent<HTMLElement>): void {
  if (event.code !== "Escape") return;
  event.preventDefault();
  event.stopPropagation();
  closestNarrativeFocusScopeV1(event.currentTarget)?.focus({ preventScroll: true });
}

function restoreNarrativeFocusAfterPointerActivationV1(
  event: MouseEvent<HTMLElement>,
  activate: () => void,
): void {
  const focusScope = event.detail === 0 ? null : closestNarrativeFocusScopeV1(event.currentTarget);
  activate();
  focusScope?.focus({ preventScroll: true });
}

type DefaultVnPlayerDialoguePropsV1 = Extract<
  NarrativeSurfaceDialogueRendererPropsV1,
  { readonly kind: "dialogue" }
>;
type DefaultVnPlayerSayPropsV1 = Omit<DefaultVnPlayerDialoguePropsV1, "pending"> & {
  readonly pending: Extract<DefaultVnPlayerDialoguePropsV1["pending"], { readonly kind: "say" }>;
};
type DefaultVnPlayerChoicePropsV1 = Omit<DefaultVnPlayerDialoguePropsV1, "pending"> & {
  readonly pending: Extract<
    DefaultVnPlayerDialoguePropsV1["pending"],
    { readonly kind: "choice" }
  >;
};

interface DefaultVnPlayerRollbackInternalV1 {
  readonly backAvailable: boolean;
  readonly forwardAvailable: boolean;
  readonly onBack: () => void;
  readonly onForward: () => void;
}

export function DefaultVnPlayerPlaybackButtonInternalV1(props: {
  readonly children: string;
  readonly disabled?: boolean;
  readonly dataNavigation?: "back" | "forward";
  readonly pressed?: boolean;
  readonly dataPlayback?: "auto" | "skip";
  readonly dataVoice?: boolean;
  readonly dataSystem?: "menu" | "saves" | "quick-save" | "quick-load" | "settings";
  readonly dataAttributes?: Readonly<Record<`data-${string}`, string>>;
  readonly onActivate: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      className={styles["playback-button"]}
      disabled={props.disabled ?? false}
      {...(props.dataNavigation === undefined
        ? {}
        : { "data-dialogue-navigation": props.dataNavigation })}
      {...(props.dataPlayback === undefined ? {} : {
        "data-dialogue-playback": props.dataPlayback,
        "aria-pressed": props.pressed ?? false,
      })}
      {...(props.dataVoice === true ? { "data-dialogue-voice-replay": "true" } : {})}
      {...(props.dataSystem === undefined
        ? {}
        : { "data-dialogue-system-action": props.dataSystem })}
      {...props.dataAttributes}
      data-secondary-action={systemInputActionIdsV1.cancel}
      onClick={(event) => {
        event.stopPropagation();
        restoreNarrativeFocusAfterPointerActivationV1(event, props.onActivate);
      }}
    >
      {props.children}
    </button>
  );
}

function DefaultVnPlayerSayV1(
  props: DefaultVnPlayerSayPropsV1 & {
    readonly labels: DefaultVnPlayerLabelsInternalV1;
    readonly rollback: DefaultVnPlayerRollbackInternalV1;
    readonly system: DefaultVnPlayerSystemControlsInternalV1 | null;
    readonly auxiliaryPlaybackControl: ReactNode;
  },
): ReactElement {
  const playerView = props.playerView.kind === "say" ? props.playerView : null;
  const resolvedSpeakerText = playerView?.resolvedSpeakerText ??
    (props.pending.speakerTextId === null ? null : props.resolveText(props.pending.speakerTextId));
  const resolvedText = playerView?.resolvedText ?? props.resolveText(props.pending.textId);
  const revealedCharacters = playerView?.revealedCharacters ?? 0;
  const revealComplete = playerView?.revealComplete ?? false;
  const textId = useId();

  return (
    <div className={styles["narrative-root"]} data-default-vn-player="say">
      <button
        type="button"
        className={styles["advance-surface"]}
        data-dialogue-advance="true"
        data-pointer-action-surface="true"
        data-secondary-action={systemInputActionIdsV1.cancel}
        aria-label={props.labels.advance}
        aria-describedby={textId}
        tabIndex={-1}
        onClick={(event) => restoreNarrativeFocusAfterPointerActivationV1(event, props.onActivate)}
      />
      <section
        className={styles["dialogue-window"]}
        data-dialogue="say"
        data-dialogue-occurrence={props.pending.occurrenceId}
        data-dialogue-reveal={revealComplete ? "complete" : "revealing"}
      >
        {resolvedSpeakerText === null
          ? null
          : <strong className={styles["speaker-name"]}>{resolvedSpeakerText}</strong>}
        <p id={textId} className={styles["dialogue-text"]}>
          {resolvedText.slice(0, revealedCharacters)}
        </p>
        <nav
          className={styles["playback-bar"]}
          aria-label={props.labels.playbackControls}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={returnNarrativeFocusOnEscapeV1}
        >
          <DefaultVnPlayerPlaybackButtonInternalV1
            dataNavigation="back"
            disabled={!props.rollback.backAvailable}
            onActivate={props.rollback.onBack}
          >
            {props.labels.back}
          </DefaultVnPlayerPlaybackButtonInternalV1>
          <DefaultVnPlayerPlaybackButtonInternalV1
            dataNavigation="forward"
            disabled={!props.rollback.forwardAvailable}
            onActivate={props.rollback.onForward}
          >
            {props.labels.forward}
          </DefaultVnPlayerPlaybackButtonInternalV1>
          {props.auxiliaryPlaybackControl}
          {props.voiceReplayAvailable
            ? (
              <DefaultVnPlayerPlaybackButtonInternalV1 dataVoice onActivate={props.onReplayVoice}>
                {props.labels.voice}
              </DefaultVnPlayerPlaybackButtonInternalV1>
            )
            : null}
          <DefaultVnPlayerPlaybackButtonInternalV1
            dataPlayback="skip"
            pressed={props.playerView.playbackMode === "skip"}
            onActivate={props.onToggleSkip}
          >
            {props.labels.skip}
          </DefaultVnPlayerPlaybackButtonInternalV1>
          <DefaultVnPlayerPlaybackButtonInternalV1
            dataPlayback="auto"
            pressed={props.playerView.playbackMode === "auto"}
            onActivate={props.onToggleAuto}
          >
            {props.labels.auto}
          </DefaultVnPlayerPlaybackButtonInternalV1>
          {props.system === null ? null : (
            <>
              <DefaultVnPlayerPlaybackButtonInternalV1
                dataSystem="menu"
                disabled={props.system.busy}
                onActivate={props.system.openMenu}
              >
                {props.labels.menu}
              </DefaultVnPlayerPlaybackButtonInternalV1>
              {props.system.savesAvailable
                ? (
                  <DefaultVnPlayerPlaybackButtonInternalV1
                    dataSystem="saves"
                    disabled={props.system.busy}
                    onActivate={props.system.openSaves}
                  >
                    {props.labels.save}
                  </DefaultVnPlayerPlaybackButtonInternalV1>
                )
                : null}
              {props.system.quickAvailable
                ? (
                  <>
                    <DefaultVnPlayerPlaybackButtonInternalV1
                      dataSystem="quick-save"
                      disabled={props.system.busy}
                      onActivate={props.system.quickSave}
                    >
                      {props.labels.quickSave}
                    </DefaultVnPlayerPlaybackButtonInternalV1>
                    <DefaultVnPlayerPlaybackButtonInternalV1
                      dataSystem="quick-load"
                      disabled={props.system.busy}
                      onActivate={props.system.quickLoad}
                    >
                      {props.labels.quickLoad}
                    </DefaultVnPlayerPlaybackButtonInternalV1>
                  </>
                )
                : null}
              <DefaultVnPlayerPlaybackButtonInternalV1
                dataSystem="settings"
                disabled={props.system.busy}
                onActivate={props.system.openSettings}
              >
                {props.labels.settings}
              </DefaultVnPlayerPlaybackButtonInternalV1>
            </>
          )}
        </nav>
        {props.system?.panelOpen === true || props.system?.statusText === null ||
            props.system?.statusText === undefined
          ? null
          : (
            <p className={styles["system-operation-toast"]} role="status">
              {props.system.statusText}
            </p>
          )}
        <span
          className={styles["continue-indicator"]}
          data-dialogue-continue-indicator={revealComplete ? "visible" : "hidden"}
          aria-hidden="true"
        >
          ▾
        </span>
      </section>
    </div>
  );
}

function DefaultVnPlayerChoiceV1(
  props: DefaultVnPlayerChoicePropsV1 & {
    readonly labels: DefaultVnPlayerLabelsInternalV1;
    readonly rollback: DefaultVnPlayerRollbackInternalV1;
    readonly system: DefaultVnPlayerSystemControlsInternalV1 | null;
  },
): ReactElement {
  const promptId = useId();
  const reasonIdPrefix = useId();
  return (
    <div
      className={styles["choice-root"]}
      data-default-vn-player="choice"
      data-dialogue="choice"
      data-dialogue-occurrence={props.pending.occurrenceId}
    >
      <div className={styles["choice-scrim"]} aria-hidden="true" />
      <section className={styles["choice-panel"]} aria-labelledby={promptId}>
        <p id={promptId} className={styles["choice-prompt"]}>
          {props.resolveText(props.pending.promptTextId)}
        </p>
        <div className={styles["choice-options"]} role="group">
          {props.pending.options.map((option, index) => {
            const availability = props.choiceAvailability?.[index];
            const enabled = availability?.choiceId === option.choiceId &&
              availability.status === "enabled";
            const reasonId = `${reasonIdPrefix}-${String(index)}`;
            return (
              <div key={option.choiceId} className={styles["choice-option"]}>
                <button
                  type="button"
                  className={styles["choice-button"]}
                  data-dialogue-choice={option.choiceId}
                  data-secondary-action={systemInputActionIdsV1.cancel}
                  disabled={!enabled}
                  aria-describedby={enabled ? undefined : reasonId}
                  onClick={() => {
                    if (enabled) props.onChoose(option.choiceId);
                  }}
                >
                  {props.resolveText(option.textId)}
                </button>
                {enabled ? null : (
                  <small
                    id={reasonId}
                    className={styles["choice-reason"]}
                    data-dialogue-choice-reason={option.choiceId}
                  >
                    {(availability?.reasonTextIds ?? []).map((textId) => props.resolveText(textId))
                      .join(" · ")}
                  </small>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <nav
        className={styles["playback-bar"]}
        aria-label={props.labels.playbackControls}
        onKeyDown={returnNarrativeFocusOnEscapeV1}
      >
        <DefaultVnPlayerPlaybackButtonInternalV1
          dataNavigation="back"
          disabled={!props.rollback.backAvailable}
          onActivate={props.rollback.onBack}
        >
          {props.labels.back}
        </DefaultVnPlayerPlaybackButtonInternalV1>
        <DefaultVnPlayerPlaybackButtonInternalV1
          dataNavigation="forward"
          disabled={!props.rollback.forwardAvailable}
          onActivate={props.rollback.onForward}
        >
          {props.labels.forward}
        </DefaultVnPlayerPlaybackButtonInternalV1>
        {props.system === null ? null : (
          <>
            <DefaultVnPlayerPlaybackButtonInternalV1
              dataSystem="menu"
              disabled={props.system.busy}
              onActivate={props.system.openMenu}
            >
              {props.labels.menu}
            </DefaultVnPlayerPlaybackButtonInternalV1>
            {props.system.savesAvailable
              ? (
                <DefaultVnPlayerPlaybackButtonInternalV1
                  dataSystem="saves"
                  disabled={props.system.busy}
                  onActivate={props.system.openSaves}
                >
                  {props.labels.save}
                </DefaultVnPlayerPlaybackButtonInternalV1>
              )
              : null}
            {props.system.quickAvailable
              ? (
                <>
                  <DefaultVnPlayerPlaybackButtonInternalV1
                    dataSystem="quick-save"
                    disabled={props.system.busy}
                    onActivate={props.system.quickSave}
                  >
                    {props.labels.quickSave}
                  </DefaultVnPlayerPlaybackButtonInternalV1>
                  <DefaultVnPlayerPlaybackButtonInternalV1
                    dataSystem="quick-load"
                    disabled={props.system.busy}
                    onActivate={props.system.quickLoad}
                  >
                    {props.labels.quickLoad}
                  </DefaultVnPlayerPlaybackButtonInternalV1>
                </>
              )
              : null}
            <DefaultVnPlayerPlaybackButtonInternalV1
              dataSystem="settings"
              disabled={props.system.busy}
              onActivate={props.system.openSettings}
            >
              {props.labels.settings}
            </DefaultVnPlayerPlaybackButtonInternalV1>
          </>
        )}
      </nav>
      {props.system?.panelOpen === true || props.system?.statusText === null ||
          props.system?.statusText === undefined
        ? null
        : (
          <p className={styles["system-operation-toast"]} role="status">
            {props.system.statusText}
          </p>
        )}
    </div>
  );
}

export function DefaultVnPlayerChromeHiddenSurfaceInternalV1(props: {
  readonly label: string;
  readonly occurrenceId: string;
  readonly onShow: () => void;
}): ReactElement {
  const show = (target: HTMLElement): void => {
    const focusScope = closestNarrativeFocusScopeV1(target);
    props.onShow();
    focusScope?.focus({ preventScroll: true });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.code !== "KeyH" && event.code !== "Enter" && event.code !== "Space") return;
    event.preventDefault();
    event.stopPropagation();
    show(event.currentTarget);
  };
  return (
    <button
      type="button"
      className={styles["restore-chrome-surface"]}
      data-dialogue-chrome-hidden="true"
      data-dialogue-occurrence={props.occurrenceId}
      data-pointer-action-surface="true"
      data-secondary-action={systemInputActionIdsV1.cancel}
      data-blocking-focus-scope="true"
      aria-label={props.label}
      ref={focusChromeRestoreSurfaceV1}
      onClick={(event) => show(event.currentTarget)}
      onKeyDown={onKeyDown}
    />
  );
}

export function DefaultVnPlayerRendererInternalV1(props: {
  readonly labels: DefaultVnPlayerLabelsInternalV1;
  readonly renderer: NarrativeSurfaceDialogueRendererPropsV1;
  readonly rollback: DefaultVnPlayerRollbackInternalV1;
  readonly system: DefaultVnPlayerSystemControlsInternalV1 | null;
  readonly auxiliaryPlaybackControl: ReactNode;
}): ReactElement | null {
  if (props.renderer.pending.kind === "say") {
    return (
      <DefaultVnPlayerSayV1
        {...props.renderer}
        pending={props.renderer.pending}
        labels={props.labels}
        rollback={props.rollback}
        system={props.system}
        auxiliaryPlaybackControl={props.auxiliaryPlaybackControl}
      />
    );
  }
  if (props.renderer.pending.kind === "choice") {
    return (
      <DefaultVnPlayerChoiceV1
        {...props.renderer}
        pending={props.renderer.pending}
        labels={props.labels}
        rollback={props.rollback}
        system={props.system}
      />
    );
  }
  return null;
}

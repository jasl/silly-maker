// SPDX-License-Identifier: MIT
import { useId } from "react";
import type { ReactElement, ReactNode } from "react";

import { systemInputActionIdsV1 } from "../input/contracts.ts";
import type {
  NarrativeSurfaceDialogueRendererPropsV1,
  NarrativeSurfaceHistoryFeatureV1,
  NarrativeSurfaceHistoryRendererPropsV1,
} from "../narrative/narrative-surface-composition.tsx";
import { DefaultVnPlayerPlaybackButtonInternalV1 } from "./default-vn-player-core-renderer.tsx";

import styles from "./default-vn-player-history.module.css";

export interface DefaultVnPlayerHistoryLabelsInternalV1 {
  readonly history: string;
  readonly historyTitle: string;
  readonly historyEmpty: string;
  readonly historyClose: string;
}

export type DefaultVnPlayerHistoryLabelKeyInternalV1 = keyof DefaultVnPlayerHistoryLabelsInternalV1;

export const defaultVnPlayerHistoryLabelsInternalV1: DefaultVnPlayerHistoryLabelsInternalV1 = {
  history: "History",
  historyTitle: "Dialogue history",
  historyEmpty: "No dialogue yet.",
  historyClose: "Close history",
};

export type DefaultVnPlayerHistoryLabelsV1 = DefaultVnPlayerHistoryLabelsInternalV1;
export type DefaultVnPlayerHistoryLabelKeyV1 = DefaultVnPlayerHistoryLabelKeyInternalV1;
export const defaultVnPlayerHistoryLabelsV1 = defaultVnPlayerHistoryLabelsInternalV1;

export interface CreateDefaultVnPlayerHistoryInputV1 {
  /** Optional product text IDs, resolved through the Narrative text resolver on every render. */
  readonly labelTextIds?: Readonly<Partial<Record<DefaultVnPlayerHistoryLabelKeyV1, string>>>;
}

export interface DefaultVnPlayerHistoryV1 {
  readonly feature: NarrativeSurfaceHistoryFeatureV1;
  readonly renderOpenControl: (
    props: NarrativeSurfaceDialogueRendererPropsV1,
  ) => ReactNode;
}

function resolveHistoryLabelsV1(
  props: Readonly<{ readonly resolveText: (textId: string) => string }>,
  textIds: CreateDefaultVnPlayerHistoryInputV1["labelTextIds"],
): DefaultVnPlayerHistoryLabelsV1 {
  const resolve = (key: DefaultVnPlayerHistoryLabelKeyV1): string => {
    const textId = textIds?.[key];
    return textId === undefined ? defaultVnPlayerHistoryLabelsV1[key] : props.resolveText(textId);
  };
  return {
    history: resolve("history"),
    historyTitle: resolve("historyTitle"),
    historyEmpty: resolve("historyEmpty"),
    historyClose: resolve("historyClose"),
  };
}

/** Creates the focused, presentation-only default History capability. */
export function createDefaultVnPlayerHistoryV1(
  input: CreateDefaultVnPlayerHistoryInputV1 = {},
): DefaultVnPlayerHistoryV1 {
  const HistoryRenderer = (
    props: NarrativeSurfaceHistoryRendererPropsV1,
  ): ReactElement => (
    <DefaultVnPlayerHistoryRendererInternalV1
      {...props}
      labels={resolveHistoryLabelsV1(props, input.labelTextIds)}
    />
  );
  return {
    feature: { renderer: HistoryRenderer },
    renderOpenControl: (renderer) => (
      <DefaultVnPlayerHistoryOpenControlInternalV1
        renderer={renderer}
        label={resolveHistoryLabelsV1(renderer, input.labelTextIds).history}
      />
    ),
  };
}

export function DefaultVnPlayerHistoryOpenControlInternalV1(props: {
  readonly renderer: NarrativeSurfaceDialogueRendererPropsV1;
  readonly label: string;
}): ReactElement | null {
  const history = props.renderer.history;
  if (history === null) return null;
  return (
    <DefaultVnPlayerPlaybackButtonInternalV1
      dataAttributes={{ "data-dialogue-history-open": "true" }}
      disabled={!history.available}
      onActivate={history.onOpen}
    >
      {props.label}
    </DefaultVnPlayerPlaybackButtonInternalV1>
  );
}

export function DefaultVnPlayerHistoryRendererInternalV1(
  props: NarrativeSurfaceHistoryRendererPropsV1 & {
    readonly labels: DefaultVnPlayerHistoryLabelsInternalV1;
  },
): ReactElement {
  const titleId = useId();
  return (
    <dialog
      open
      className={styles["history-root"]}
      data-default-vn-player="history"
      data-dialogue-history="true"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={styles["history-backdrop"]}
        aria-label={props.labels.historyClose}
        data-secondary-action={systemInputActionIdsV1.cancel}
        tabIndex={-1}
        onClick={props.onCloseHistory}
      />
      <div className={styles["history-panel"]}>
        <header className={styles["history-header"]}>
          <h2 id={titleId} className={styles["history-title"]}>
            {props.labels.historyTitle}
          </h2>
          <button
            type="button"
            className={styles["history-close"]}
            data-dialogue-history-close="true"
            data-secondary-action={systemInputActionIdsV1.cancel}
            onClick={props.onCloseHistory}
          >
            {props.labels.historyClose}
          </button>
        </header>
        {props.history.entries.length === 0
          ? <p className={styles["history-empty"]}>{props.labels.historyEmpty}</p>
          : (
            <ol className={styles["history-list"]} tabIndex={0}>
              {props.history.entries.map((entry) => (
                <li
                  key={entry.occurrenceId}
                  className={styles["history-entry"]}
                  data-dialogue-history-entry={entry.kind}
                >
                  {entry.speakerTextId === null
                    ? null
                    : (
                      <strong className={styles["history-speaker"]}>
                        {props.resolveText(entry.speakerTextId)}
                      </strong>
                    )}
                  <span>{props.resolveText(entry.textId)}</span>
                </li>
              ))}
            </ol>
          )}
      </div>
    </dialog>
  );
}

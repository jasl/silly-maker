// SPDX-License-Identifier: MIT
import { useId } from "react";
import type { ReactElement } from "react";

import { systemInputActionIdsV1 } from "../input/contracts.ts";
import type {
  NarrativeSurfaceDialogueRendererPropsV1,
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

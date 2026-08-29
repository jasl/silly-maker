// SPDX-License-Identifier: MIT
import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import type { CoreRollbackPortV1 } from "@sillymaker/base/runtime";
import {
  inputHandledV1,
  inputIgnoredV1,
  type InputRouterV1,
  playerInputActionIdsV1,
} from "@sillymaker/ui";

import styles from "./ending-surface.module.css";

export interface VnLastSoundCheckEndingSurfacePropsV1 {
  readonly title: string;
  readonly kicker: string;
  readonly summary: string;
  readonly backLabel: string;
  readonly returnLabel: string;
  readonly returningLabel: string;
  readonly returnFailure: string;
  readonly input: InputRouterV1;
  readonly rollback: CoreRollbackPortV1;
  readonly onReturnToTitle: () => Promise<void>;
}

/** Product-owned ending presentation; lifecycle authority stays with the Host. */
export function VnLastSoundCheckEndingSurfaceV1(
  props: VnLastSoundCheckEndingSurfacePropsV1,
): ReactElement {
  const [returning, setReturning] = useState(false);
  const [failed, setFailed] = useState(false);
  const rollbackSteps = useSyncExternalStore(
    props.rollback.subscribe,
    () => props.rollback.available().steps,
    () => props.rollback.available().steps,
  );
  const canRollback = rollbackSteps > 0 && !returning;

  useEffect(
    () =>
      props.input.register({
        context: "narrative",
        handle: (event) => {
          if (
            event.kind !== "action" ||
            event.actionId !== playerInputActionIdsV1.rollback ||
            !canRollback
          ) {
            return inputIgnoredV1;
          }
          void props.rollback.toPrevious();
          return inputHandledV1;
        },
      }),
    [canRollback, props.input, props.rollback],
  );

  const returnToTitle = async (): Promise<void> => {
    if (returning) return;
    setReturning(true);
    setFailed(false);
    try {
      await props.onReturnToTitle();
    } catch {
      setFailed(true);
      setReturning(false);
    }
  };

  return (
    <section
      className={styles.root}
      data-vn-last-sound-check-ending="true"
      aria-labelledby="vn-last-sound-check-ending-title"
    >
      <div className={styles.panel}>
        <p className={styles.kicker}>{props.kicker}</p>
        <h2 id="vn-last-sound-check-ending-title" className={styles.title}>
          {props.title}
        </h2>
        <p className={styles.summary}>{props.summary}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles["back-button"]}
            disabled={!canRollback}
            onClick={() => void props.rollback.toPrevious()}
          >
            {props.backLabel}
          </button>
          <button
            type="button"
            className={styles["return-button"]}
            disabled={returning}
            onClick={() => void returnToTitle()}
          >
            {returning ? props.returningLabel : props.returnLabel}
          </button>
        </div>
        {failed
          ? (
            <p className={styles.failure} role="alert">
              {props.returnFailure}
            </p>
          )
          : null}
      </div>
    </section>
  );
}

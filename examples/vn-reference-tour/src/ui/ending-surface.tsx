// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

import styles from "./ending-surface.module.css";

export interface VnReferenceTourEndingSurfacePropsV1 {
  readonly title: string;
  readonly kicker: string;
  readonly summary: string;
  readonly returnLabel: string;
  readonly returningLabel: string;
  readonly returnFailure: string;
  readonly onReturnToTitle: () => Promise<void>;
}

/** Product-owned ending presentation; lifecycle authority stays with the Host. */
export function VnReferenceTourEndingSurfaceV1(
  props: VnReferenceTourEndingSurfacePropsV1,
): ReactElement {
  const returnButtonRef = useRef<HTMLButtonElement>(null);
  const [returning, setReturning] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    returnButtonRef.current?.focus({ preventScroll: true });
  }, []);

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
      data-vn-reference-tour-ending="true"
      aria-labelledby="vn-reference-tour-ending-title"
    >
      <div className={styles.panel}>
        <p className={styles.kicker}>{props.kicker}</p>
        <h2 id="vn-reference-tour-ending-title" className={styles.title}>
          {props.title}
        </h2>
        <p className={styles.summary}>{props.summary}</p>
        <button
          ref={returnButtonRef}
          type="button"
          className={styles["return-button"]}
          disabled={returning}
          onClick={() => void returnToTitle()}
        >
          {returning ? props.returningLabel : props.returnLabel}
        </button>
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

// SPDX-License-Identifier: MIT
import { useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { Button } from "../primitives/button.tsx";
import styles from "./overlay-host.module.css";

/** @internal Content-only renderer; the managed System Host owns the child lifecycle. */
export interface ActionConfirmationContentPropsInternalV1 {
  readonly title: string;
  readonly titleId?: string;
  readonly description: ReactNode;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly pendingText: string;
  confirm(): void;
  cancel(): void;
}

/** @internal Content-only renderer; it never owns portal, input, focus, or opener state. */
export function ActionConfirmationContentV1(
  props: ActionConfirmationContentPropsInternalV1,
): ReactElement {
  const startedRef = useRef(false);
  const [pending, setPending] = useState(false);

  const confirm = (): void => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPending(true);
    props.confirm();
  };

  return (
    <div data-action-confirmation-content="true">
      <h2 id={props.titleId}>{props.title}</h2>
      <div>{props.description}</div>
      <div className={styles["blocking-dialog__actions"]}>
        <Button disabled={pending} onClick={confirm}>
          {props.confirmLabel}
        </Button>
        <Button onClick={props.cancel}>{props.cancelLabel}</Button>
      </div>
      <p
        className={styles["blocking-dialog__result"]}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {pending ? props.pendingText : ""}
      </p>
    </div>
  );
}

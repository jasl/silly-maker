// SPDX-License-Identifier: MIT
import type { ReactElement, ReactNode } from "react";

import { Button } from "./button.tsx";
import styles from "./panel.module.css";

/**
 * The window chrome every in-game panel shares (the Window_Base of this
 * engine): a visible title bar with optional actions and a close button,
 * and a keyboard-focusable scrollable content region. Gameplay windows
 * (album, shop, inventory…) mount it inside the workspace overlay session;
 * transient surfaces (dialogue history…) render it directly. Styling comes
 * from the published --silly-* tokens only.
 */
export interface PanelPropsV1 {
  readonly title: ReactNode;
  /** Identifies the title for the content region's aria-labelledby. */
  readonly titleId?: string;
  /** Extra header controls, rendered between the title and close. */
  readonly actions?: ReactNode;
  onClose?(): void;
  readonly closeLabel?: string;
  readonly children: ReactNode;
  /** Marks the root for tests/automation, e.g. data-cc-history. */
  readonly rootAttributes?: Readonly<Record<`data-${string}`, string>>;
}

export function PanelV1(props: PanelPropsV1): ReactElement {
  return (
    <section className={styles["panel"]} {...(props.rootAttributes ?? {})}>
      <header className={styles["panel__header"]}>
        <h2 className={styles["panel__title"]} id={props.titleId}>
          {props.title}
        </h2>
        {props.actions ?? null}
        {props.onClose === undefined
          ? null
          : (
            <Button data-panel-close="true" onClick={props.onClose}>
              {props.closeLabel ?? "Close"}
            </Button>
          )}
      </header>
      <div
        className={styles["panel__content"]}
        data-panel-content="true"
        tabIndex={0}
        {...(props.titleId === undefined ? {} : { "aria-labelledby": props.titleId })}
      >
        {props.children}
      </div>
    </section>
  );
}

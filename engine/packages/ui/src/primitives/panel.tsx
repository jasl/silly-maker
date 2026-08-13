// SPDX-License-Identifier: MIT
import type { ComponentPropsWithRef, ReactElement, ReactNode } from "react";

import { Button } from "./button.tsx";
import { IconButton } from "./icon-button.tsx";
import styles from "./panel.module.css";

export type PanelCloseControlV1 = "label" | "icon";

/**
 * The window chrome every in-game panel shares (the Window_Base of this
 * engine): a visible title bar with optional actions and a close button,
 * and a keyboard-focusable scrollable content region. Gameplay windows
 * (album, shop, inventory…) mount it inside the workspace overlay session;
 * transient surfaces (dialogue history…) render it directly. Floating
 * debug windows reuse the same chrome. Styling comes from the published
 * --silly-* tokens only.
 */
export interface PanelPropsV1 {
  readonly title: ReactNode;
  /** Identifies the title for the content region's aria-labelledby. */
  readonly titleId?: string;
  /** Extra header controls, rendered between the title and close. */
  readonly actions?: ReactNode;
  onClose?(): void;
  readonly closeLabel?: string;
  /**
   * Visible labelled button (default, gameplay overlays) or an icon
   * button whose accessible name is `closeLabel` (compact debug windows).
   */
  readonly closeControl?: PanelCloseControlV1;
  /** Extra data attributes on the close control (test/automation hooks). */
  readonly closeAttributes?: Readonly<Record<`data-${string}`, string>>;
  /** Extra props on the title bar (drag handles, test hooks). */
  readonly headerProps?:
    & Omit<ComponentPropsWithRef<"header">, "children">
    & Readonly<Partial<Record<`data-${string}`, string>>>;
  readonly children: ReactNode;
  /** Marks the root for tests/automation, e.g. data-cc-history. */
  readonly rootAttributes?: Readonly<Record<`data-${string}`, string>>;
}

function mergeClassNameV1(base: string | undefined, className: string | undefined): string {
  if (base === undefined || base.length === 0) return className ?? "";
  if (className === undefined || className.length === 0) return base;
  return `${base} ${className}`;
}

function PanelCloseIconV1(): ReactElement {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" focusable="false">
      <path
        d="M2.2 2.2l7.6 7.6M9.8 2.2l-7.6 7.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PanelCloseButtonV1(props: {
  readonly closeControl: PanelCloseControlV1;
  readonly closeLabel: string;
  readonly closeAttributes: Readonly<Record<`data-${string}`, string>>;
  onClose(): void;
}): ReactElement {
  const { closeControl, closeLabel, closeAttributes, onClose } = props;
  switch (closeControl) {
    case "label":
      return (
        <Button data-panel-close="true" onClick={onClose} {...closeAttributes}>
          {closeLabel}
        </Button>
      );
    case "icon":
      return (
        <IconButton
          accessibleName={closeLabel}
          title={closeLabel}
          className={styles["panel__close-icon"]}
          data-panel-close="true"
          onClick={onClose}
          {...closeAttributes}
        >
          <PanelCloseIconV1 />
        </IconButton>
      );
    default: {
      const exhaustive: never = closeControl;
      throw new TypeError(`ui.panel_invalid_close_control:${String(exhaustive)}`);
    }
  }
}

export function PanelV1(props: PanelPropsV1): ReactElement {
  const closeLabel = props.closeLabel ?? "Close";
  const closeControl = props.closeControl ?? "label";
  const { className: headerClassName, ...headerProps } = props.headerProps ?? {};
  return (
    <section className={styles["panel"]} {...(props.rootAttributes ?? {})}>
      <header
        {...headerProps}
        className={mergeClassNameV1(styles["panel__header"], headerClassName)}
      >
        <h2 className={styles["panel__title"]} id={props.titleId}>
          {props.title}
        </h2>
        {props.actions ?? null}
        {props.onClose === undefined ? null : (
          <PanelCloseButtonV1
            closeControl={closeControl}
            closeLabel={closeLabel}
            closeAttributes={props.closeAttributes ?? {}}
            onClose={props.onClose}
          />
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

// SPDX-License-Identifier: MIT
import type { ReactElement, ReactNode } from "react";

import { Button } from "../primitives/button.tsx";
import styles from "./settings-dialog.module.css";

/** @internal Content-only renderer; the managed System Host owns Dialog lifecycle. */
export interface SettingsDialogContentPropsInternalV1 {
  readonly title: string;
  readonly closeLabel: string;
  readonly sections: readonly ReactNode[];
  readonly emptyText: string;
  close(): void;
}

/** @internal Content-only renderer; it never owns portal, input, focus, or readiness. */
export function SettingsDialogContentV1(
  props: SettingsDialogContentPropsInternalV1,
): ReactElement {
  return (
    <div data-settings-dialog-content="true" className={styles["content"]}>
      <h2 className={styles["title"]}>{props.title}</h2>
      {props.sections.length === 0
        ? <p data-settings-empty="true">{props.emptyText}</p>
        : (
          <div data-settings-section-list="true" className={styles["sections"]}>
            {props.sections.map((section, index) => (
              <div key={index} data-testid="settings-section">
                {section}
              </div>
            ))}
          </div>
        )}
      <Button className={styles["close"]} onClick={props.close}>{props.closeLabel}</Button>
    </div>
  );
}

// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";
import { useState } from "react";
import type { CodeSurfaceViewPropsV1 } from "@sillymaker/ui/code-surface";
import type { LabCodeSurfaceContextV1 } from "../code-surface-catalog.ts";
import styles from "./conformance-shell.module.css";

interface ShellPropsV1 {
  readonly title: string;
}

export function LabCodeSurfaceShellV1(
  props: CodeSurfaceViewPropsV1<LabCodeSurfaceContextV1, ShellPropsV1, "detail">,
): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <section className={styles.shell} aria-label={props.props.title}>
      <header className={styles.header}>
        <h2>{props.props.title}</h2>
        <button type="button" onClick={() => setOpen((current) => !current)}>
          {open ? "Close details" : "Open details"}
        </button>
      </header>
      {open ? <div className={styles.detail}>{props.slots.detail}</div> : null}
    </section>
  );
}

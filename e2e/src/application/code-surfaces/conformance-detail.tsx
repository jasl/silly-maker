// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";
import { useState } from "react";
import type { CodeSurfaceViewPropsV1 } from "@sillymaker/ui/code-surface";
import type { LabCodeSurfaceContextV1 } from "../code-surface-catalog.ts";
import styles from "./conformance-detail.module.css";

interface DetailPropsV1 {
  readonly actionLabel: string;
  readonly draftLabel: string;
}

export function LabCodeSurfaceDetailV1(
  props: CodeSurfaceViewPropsV1<LabCodeSurfaceContextV1, DetailPropsV1, never>,
): ReactElement {
  const [draft, setDraft] = useState("");
  return (
    <div className={styles.detail}>
      <label>
        <span>{props.props.draftLabel}</span>
        <textarea value={draft} onChange={(event) => setDraft(event.currentTarget.value)} />
      </label>
      <button type="button" onClick={() => void props.context.collectSample()}>
        {props.props.actionLabel}
      </button>
    </div>
  );
}

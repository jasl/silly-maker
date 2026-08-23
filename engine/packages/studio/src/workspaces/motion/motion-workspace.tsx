// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import { MotionWorkbenchLauncherV1 } from "@sillymaker/ui/debug";
import type {
  MotionSourceIoV1,
  MotionWorkbenchCloseParticipantV1,
  MotionWorkbenchStoreV1,
} from "@sillymaker/ui/debug";

import styles from "../../studio-app.module.css";
import type { StudioMotionWorkbenchModelV1 } from "./motion-cases.ts";

/** The embedded Motion workspace: the shared Workbench over scene cases. */
export function MotionWorkspaceSectionV1(props: {
  readonly workbench: StudioMotionWorkbenchModelV1;
  readonly loading: boolean;
  /** The shell's motion port — the same io that enumerated the sources. */
  readonly io?: MotionSourceIoV1;
  /** Host-owned editor selection; the visible R1 root never replaces it. */
  readonly store: MotionWorkbenchStoreV1;
  readonly registerCloseParticipant?: (
    participant: MotionWorkbenchCloseParticipantV1,
  ) => () => void;
  /** Connected R1 probes render the same Host but never own user transitions. */
  readonly guardSelectionChanges?: boolean;
}): ReactElement {
  if (props.loading) {
    return (
      <div className={styles["workbench"]}>
        <h2>Motion 工坊</h2>
        <p role="status">正在加载 Motion 文档…</p>
      </div>
    );
  }
  if (props.workbench.kind === "none") {
    return (
      <div className={styles["workbench"]}>
        <h2>Motion 工坊</h2>
        <p>当前项目没有可预览的 Motion case。</p>
      </div>
    );
  }
  if (props.workbench.kind === "unavailable") {
    return (
      <div className={styles["workbench"]}>
        <h2>Motion 工坊</h2>
        <p role="alert">Motion 工坊暂不可用。</p>
        <ul>
          {props.workbench.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      </div>
    );
  }
  return (
    <div className={styles["workbench"]}>
      <h2>Motion 工坊</h2>
      <MotionWorkbenchLauncherV1
        store={props.store}
        sources={props.workbench.sources}
        fallbackPreview={props.workbench.fallbackPreview}
        cases={props.workbench.cases}
        {...(props.io === undefined ? {} : { io: props.io })}
        {...(props.guardSelectionChanges === undefined
          ? {}
          : { guardSelectionChanges: props.guardSelectionChanges })}
        {...(props.registerCloseParticipant === undefined
          ? {}
          : { registerCloseParticipant: props.registerCloseParticipant })}
      />
    </div>
  );
}

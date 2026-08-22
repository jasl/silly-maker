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
  readonly workbench: Extract<StudioMotionWorkbenchModelV1, { kind: "ready" }>;
  /** The shell's motion port — the same io that enumerated the sources. */
  readonly io: MotionSourceIoV1;
  /** Host-owned editor selection; the visible R1 root never replaces it. */
  readonly store: MotionWorkbenchStoreV1;
  readonly registerCloseParticipant?: (
    participant: MotionWorkbenchCloseParticipantV1,
  ) => () => void;
  /** Connected R1 probes render the same Host but never own user transitions. */
  readonly guardSelectionChanges?: boolean;
}): ReactElement {
  return (
    <section className={styles["workbench"]} aria-label="Motion 工坊">
      <h2>Motion 工坊</h2>
      <MotionWorkbenchLauncherV1
        store={props.store}
        sources={props.workbench.sources}
        fallbackPreview={props.workbench.fallbackPreview}
        cases={props.workbench.cases}
        io={props.io}
        {...(props.guardSelectionChanges === undefined
          ? {}
          : { guardSelectionChanges: props.guardSelectionChanges })}
        {...(props.registerCloseParticipant === undefined
          ? {}
          : { registerCloseParticipant: props.registerCloseParticipant })}
      />
    </section>
  );
}

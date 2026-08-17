// SPDX-License-Identifier: MIT
import { useMemo } from "react";
import type { ReactElement } from "react";

import { createMotionWorkbenchStoreV1, MotionWorkbenchLauncherV1 } from "@sillymaker/ui/debug";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import styles from "../../studio-app.module.css";
import type { StudioMotionWorkbenchModelV1 } from "./motion-cases.ts";

/** The embedded Motion workspace: the shared Workbench over scene cases. */
export function MotionWorkspaceSectionV1(props: {
  readonly workbench: Extract<StudioMotionWorkbenchModelV1, { kind: "ready" }>;
  /** The shell's motion port — the same io that enumerated the sources. */
  readonly io: MotionSourceIoV1;
}): ReactElement {
  const store = useMemo(() => createMotionWorkbenchStoreV1(), []);
  return (
    <section className={styles["workbench"]} aria-label="Motion 工坊">
      <h2>Motion 工坊</h2>
      <MotionWorkbenchLauncherV1
        store={store}
        sources={props.workbench.sources}
        fallbackPreview={props.workbench.fallbackPreview}
        cases={props.workbench.cases}
        io={props.io}
      />
    </section>
  );
}

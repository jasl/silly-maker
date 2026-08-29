// SPDX-License-Identifier: MIT
import { ProgressMeter as EngineProgressMeter } from "@sillymaker/ui";
import { type ComponentProps, forwardRef, type ReactNode, type Ref } from "react";

import { cnV1 } from "./utils.ts";

export type ProgressPropsV1 = ComponentProps<typeof EngineProgressMeter>;

/** Product appearance over the public SillyMaker native progress contract. */
export const ProgressV1 = forwardRef(function ProgressV1(
  { className, ...props }: ProgressPropsV1,
  ref: Ref<HTMLProgressElement>,
): ReactNode {
  return (
    <EngineProgressMeter
      ref={ref}
      data-slot="progress"
      className={cnV1("sos-progress", className)}
      {...props}
    />
  );
});

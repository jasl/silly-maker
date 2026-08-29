// SPDX-License-Identifier: MIT
import { ChevronDown } from "lucide-react";
import { type ComponentProps, type ReactNode } from "react";

import { cnV1 } from "./utils.ts";

/** Styled native select for small product registries such as locale. */
export function NativeSelectV1({
  className,
  children,
  controlSize = "base",
  ...props
}: ComponentProps<"select"> & {
  readonly controlSize?: "sm" | "base" | "large";
}): ReactNode {
  return (
    <span className="sos-native-select-wrapper">
      <select
        data-slot="native-select"
        data-size={controlSize}
        className={cnV1("sos-native-select", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" />
    </span>
  );
}

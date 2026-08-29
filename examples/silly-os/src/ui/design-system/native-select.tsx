// SPDX-License-Identifier: MIT
import { ChevronDown } from "lucide-react";
import { type ComponentProps, type ReactNode } from "react";

import { cnV1 } from "./utils.ts";

/** Styled native select for small product registries such as locale. */
export function NativeSelectV1({
  className,
  children,
  ...props
}: ComponentProps<"select">): ReactNode {
  return (
    <span className="sos:relative sos:inline-flex sos:min-w-44">
      <select
        className={cnV1(
          "sos:min-h-[44px] sos:w-full sos:appearance-none sos:rounded-control sos:[border:1px_solid_var(--sos-line)] sos:bg-surface sos:py-2 sos:pr-9 sos:pl-3 sos:text-sm sos:[font-weight:500] sos:text-foreground sos:outline-none",
          "sos:focus-visible:[outline:2px_solid_var(--sos-focus)] sos:disabled:cursor-not-allowed sos:disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="sos:pointer-events-none sos:absolute sos:top-1/2 sos:right-3 sos:size-4 sos:[translate:0_-50%] sos:text-muted-foreground"
        aria-hidden="true"
      />
    </span>
  );
}

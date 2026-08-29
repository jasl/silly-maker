// SPDX-License-Identifier: MIT
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type ComponentProps, type ReactNode } from "react";

import { cnV1 } from "./utils.ts";

export function ToggleGroupV1({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Root>): ReactNode {
  return (
    <ToggleGroupPrimitive.Root
      className={cnV1(
        "sos:inline-flex sos:items-center sos:gap-1 sos:rounded-card sos:[border:1px_solid_var(--sos-line)] sos:bg-muted sos:p-1",
        className,
      )}
      {...props}
    />
  );
}

export function ToggleGroupItemV1({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item>): ReactNode {
  return (
    <ToggleGroupPrimitive.Item
      className={cnV1(
        "sos:inline-flex sos:min-h-control sos:items-center sos:justify-center sos:gap-2 sos:rounded-control sos:px-3 sos:text-sm sos:[font-weight:500] sos:text-muted-foreground sos:outline-none",
        "sos:hover:text-foreground sos:focus-visible:[outline:2px_solid_var(--sos-focus)] sos:data-[state=on]:bg-surface sos:data-[state=on]:text-foreground sos:data-[state=on]:[box-shadow:var(--sos-shadow-control)]",
        className,
      )}
      {...props}
    />
  );
}

// SPDX-License-Identifier: MIT
import { type ComponentProps, type ReactNode } from "react";

import { cnV1 } from "./utils.ts";

export type BadgeVariantV1 = "neutral" | "success" | "warning" | "danger";

export function BadgeV1({
  className,
  variant = "neutral",
  ...props
}: ComponentProps<"span"> & { readonly variant?: BadgeVariantV1 }): ReactNode {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cnV1("sos-badge", className)}
      {...props}
    />
  );
}

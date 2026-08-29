// SPDX-License-Identifier: MIT
import { type ComponentProps, type ReactNode } from "react";

import type { StatusVariantV1 } from "./status.tsx";
import { cnV1 } from "./utils.ts";

export function BadgeV1({
  className,
  variant = "neutral",
  ...props
}: ComponentProps<"span"> & { readonly variant?: StatusVariantV1 }): ReactNode {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cnV1("sos-badge", className)}
      {...props}
    />
  );
}

// SPDX-License-Identifier: MIT
import type { LucideIcon } from "lucide-react";
import { type ComponentProps, type ReactNode } from "react";

import { cnV1 } from "./utils.ts";

export type StatusVariantV1 = "neutral" | "info" | "success" | "warning" | "danger";

export function StatusV1({
  className,
  variant = "neutral",
  icon: Icon,
  children,
  ...props
}: ComponentProps<"div"> & {
  readonly variant?: StatusVariantV1;
  readonly icon?: LucideIcon;
}): ReactNode {
  return (
    <div
      data-slot="status"
      data-variant={variant}
      className={cnV1("sos-status", className)}
      {...props}
    >
      {Icon === undefined ? null : <Icon data-slot="status-icon" aria-hidden="true" />}
      {children}
    </div>
  );
}

export function StatusContentV1({ className, ...props }: ComponentProps<"span">): ReactNode {
  return (
    <span
      data-slot="status-content"
      className={cnV1("sos-status__content", className)}
      {...props}
    />
  );
}

export function StatusTitleV1({ className, ...props }: ComponentProps<"strong">): ReactNode {
  return (
    <strong data-slot="status-title" className={cnV1("sos-status__title", className)} {...props} />
  );
}

export function StatusDescriptionV1({ className, ...props }: ComponentProps<"small">): ReactNode {
  return (
    <small
      data-slot="status-description"
      className={cnV1("sos-status__description", className)}
      {...props}
    />
  );
}

export function StatusActionV1({ className, ...props }: ComponentProps<"span">): ReactNode {
  return (
    <span data-slot="status-action" className={cnV1("sos-status__action", className)} {...props} />
  );
}

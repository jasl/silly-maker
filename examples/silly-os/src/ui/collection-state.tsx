// SPDX-License-Identifier: MIT
import type { LucideIcon } from "lucide-react";
import { type ComponentProps, type ReactNode } from "react";

import { cnV1 } from "./design-system/utils.ts";

type CollectionStateToneV1 = "neutral" | "danger";
type CollectionStateIconMotionV1 = "none" | "spin";

type CollectionStateV1Props = {
  readonly icon: LucideIcon;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  readonly tone?: CollectionStateToneV1;
  readonly iconMotion?: CollectionStateIconMotionV1;
  readonly className?: ComponentProps<"div">["className"];
  readonly role?: ComponentProps<"div">["role"];
  readonly "aria-live"?: ComponentProps<"div">["aria-live"];
  readonly "data-diagnostic-code"?: string;
  readonly "data-testid"?: string;
};

/**
 * A presentational state for an otherwise empty collection surface.
 *
 * The caller owns state, copy, actions, and live-region semantics. In
 * particular, a static empty state receives no implicit `role` or `aria-live`.
 */
export function CollectionStateV1({
  className,
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  iconMotion = "none",
  role,
  "aria-live": ariaLive,
  "data-diagnostic-code": diagnosticCode,
  "data-testid": testId,
}: CollectionStateV1Props): ReactNode {
  return (
    <div
      data-slot="collection-state"
      data-tone={tone}
      data-icon-motion={iconMotion}
      data-diagnostic-code={diagnosticCode}
      data-testid={testId}
      className={cnV1("sos-collection-state", className)}
      role={role}
      aria-live={ariaLive}
    >
      <span data-slot="collection-state-icon" aria-hidden="true">
        <Icon />
      </span>
      <div data-slot="collection-state-content">
        <strong data-slot="collection-state-title">{title}</strong>
        {description === undefined
          ? null
          : <p data-slot="collection-state-description">{description}</p>}
      </div>
      {action === undefined ? null : <div data-slot="collection-state-action">{action}</div>}
    </div>
  );
}

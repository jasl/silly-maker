// SPDX-License-Identifier: MIT
import { Button as EngineButton, IconButton as EngineIconButton } from "@sillymaker/ui";
import type { LucideIcon } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef, type ReactNode, type Ref } from "react";

import { cnV1 } from "./utils.ts";

export type ButtonVariantV1 = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSizeV1 = "sm" | "base";

export interface ButtonPropsV1 extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariantV1;
  readonly size?: ButtonSizeV1;
  readonly icon?: LucideIcon;
}

/** Product styling and variants over the public SillyMaker button primitive. */
export const ButtonV1 = forwardRef(function ButtonV1(
  {
    variant = "secondary",
    size = "base",
    icon: Icon,
    className,
    children,
    ...props
  }: ButtonPropsV1,
  ref: Ref<HTMLButtonElement>,
): ReactNode {
  return (
    <EngineButton
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cnV1("sos-button", className)}
      {...props}
    >
      {Icon === undefined ? null : <Icon data-icon="inline-start" aria-hidden="true" />}
      {children}
    </EngineButton>
  );
});

export type IconButtonPropsV1 =
  & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "aria-label" | "children"
  >
  & {
    readonly accessibleName: string;
    readonly icon: LucideIcon;
    readonly variant?: ButtonVariantV1;
    readonly size?: ButtonSizeV1;
  };

/** Icon-only action with a required accessible name and fixed square geometry. */
export const IconButtonV1 = forwardRef(function IconButtonV1(
  {
    accessibleName,
    icon: Icon,
    variant = "secondary",
    size = "base",
    className,
    ...props
  }: IconButtonPropsV1,
  ref: Ref<HTMLButtonElement>,
): ReactNode {
  return (
    <EngineIconButton
      ref={ref}
      accessibleName={accessibleName}
      data-slot="icon-button"
      data-variant={variant}
      data-size={size}
      className={cnV1("sos-icon-button", className)}
      {...props}
    >
      <Icon aria-hidden="true" />
    </EngineIconButton>
  );
});

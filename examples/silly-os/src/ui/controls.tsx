// SPDX-License-Identifier: MIT
import type { LucideIcon } from "lucide-react";
import { type ButtonHTMLAttributes, type ReactNode, type Ref, forwardRef } from "react";

export interface SillyButtonPropsV1 extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: "primary" | "secondary" | "ghost";
  readonly size?: "sm" | "base";
  readonly shape?: "base" | "square";
  readonly icon?: LucideIcon;
}

/** Product-local button styling over a native semantic button. */
export const SillyButtonV1 = forwardRef(function SillyButtonV1(
  {
    variant = "secondary",
    size = "base",
    shape = "base",
    icon: Icon,
    className,
    children,
    disabled,
    ...props
  }: SillyButtonPropsV1,
  ref: Ref<HTMLButtonElement>,
): ReactNode {
  const classes = [
    "silly-button",
    `silly-button--${variant}`,
    `silly-button--${size}`,
    `silly-button--${shape}`,
    className,
  ].filter(Boolean).join(" ");
  return (
    <button ref={ref} className={classes} disabled={disabled} {...props}>
      {Icon === undefined ? null : <Icon size={size === "sm" ? 14 : 16} aria-hidden="true" />}
      {children}
    </button>
  );
});

export interface SillyTabItemV1 {
  readonly value: string;
  readonly label: ReactNode;
}

export interface SillyTabsPropsV1 {
  readonly tabs: readonly SillyTabItemV1[];
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly className?: string;
  readonly listClassName?: string;
  readonly labels?: { readonly tabList?: string };
}

/** Compact controlled tabs used by the product workspace. */
export function SillyTabsV1({
  tabs,
  value,
  onValueChange,
  className,
  listClassName,
  labels,
}: SillyTabsPropsV1): ReactNode {
  return (
    <div className={["silly-tabs", className].filter(Boolean).join(" ")}>
      <div
        className={["silly-tabs__list", listClassName].filter(Boolean).join(" ")}
        role="tablist"
        aria-label={labels?.tabList ?? "Workpiece views"}
      >
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            key={tab.value}
            aria-selected={tab.value === value}
            tabIndex={tab.value === value ? 0 : -1}
            className={tab.value === value ? "is-active" : undefined}
            onClick={() => onValueChange(tab.value)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const tabButtons = event.currentTarget.parentElement?.querySelectorAll<
                HTMLButtonElement
              >(
                "[role=tab]",
              );
              const current = tabs.findIndex((candidate) => candidate.value === value);
              const direction = event.key === "ArrowRight" ? 1 : -1;
              const next = (current + direction + tabs.length) % tabs.length;
              const nextTab = tabs[next];
              if (nextTab === undefined) return;
              onValueChange(nextTab.value);
              requestAnimationFrame(() => {
                tabButtons?.[next]?.focus();
              });
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

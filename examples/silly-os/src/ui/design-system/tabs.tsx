// SPDX-License-Identifier: MIT
import { type ReactNode } from "react";

import { cnV1 } from "./utils.ts";

export interface TabsItemV1 {
  readonly value: string;
  readonly label: ReactNode;
  readonly id?: string;
  readonly controls?: string;
}

export interface TabsPropsV1 {
  readonly tabs: readonly TabsItemV1[];
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly className?: string;
  readonly listClassName?: string;
  readonly labels?: { readonly tabList?: string };
}

/** Compact controlled tabs with roving focus for product-defined views. */
export function TabsV1({
  tabs,
  value,
  onValueChange,
  className,
  listClassName,
  labels,
}: TabsPropsV1): ReactNode {
  return (
    <div data-slot="tabs" className={cnV1("sos-tabs", className)}>
      <div
        data-slot="tabs-list"
        className={cnV1("sos-tabs__list", listClassName)}
        role="tablist"
        aria-label={labels?.tabList ?? "View tabs"}
      >
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            key={tab.value}
            id={tab.id}
            aria-controls={tab.controls}
            aria-selected={tab.value === value}
            tabIndex={tab.value === value ? 0 : -1}
            data-state={tab.value === value ? "active" : "inactive"}
            onClick={() => onValueChange(tab.value)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const tabButtons = event.currentTarget.parentElement?.querySelectorAll<
                HTMLButtonElement
              >("[role=tab]");
              const current = tabs.findIndex((candidate) => candidate.value === value);
              const direction = event.key === "ArrowRight" ? 1 : -1;
              const next = (current + direction + tabs.length) % tabs.length;
              const nextTab = tabs[next];
              if (nextTab === undefined) return;
              onValueChange(nextTab.value);
              requestAnimationFrame(() => tabButtons?.[next]?.focus());
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

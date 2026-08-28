// SPDX-License-Identifier: MIT
import type { ReactNode } from "react";

/** Panel grouping metadata kept for contribution compatibility. */
export type DevDockSideV1 = "left" | "right";

/** True when the debug launcher is expanded or any tool window is open. */
export interface DevDockOpenStateV1 {
  readonly open: boolean;
}

/** Launcher corner and cascade origin for newly opened windows. */
export type DevDockPositionV1 =
  | "top_right"
  | "top_left"
  | "bottom_right"
  | "bottom_left";

export type DevDockPanelAuthorityV1 = "read_only" | "cheat";
export type DevDockPanelStageModeV1 = "live" | "frozen";

export interface DevDockPanelV1 {
  readonly id: string;
  readonly side: DevDockSideV1;
  readonly title: string;
  readonly authority: DevDockPanelAuthorityV1;
  readonly stage?: DevDockPanelStageModeV1;
  readonly render: () => ReactNode;
}

export interface DevDockContributionSetV1 {
  readonly panels: readonly DevDockPanelV1[];
}

const devDockPositionsV1: readonly DevDockPositionV1[] = [
  "top_right",
  "top_left",
  "bottom_right",
  "bottom_left",
];

function validatePanelV1(panel: DevDockPanelV1): DevDockPanelV1 {
  if (panel === null || typeof panel !== "object" || Array.isArray(panel)) {
    throw new TypeError("ui.devdock_invalid_panel");
  }
  if (typeof panel.id !== "string" || panel.id.length === 0 || typeof panel.render !== "function") {
    throw new TypeError("ui.devdock_invalid_panel");
  }
  if (panel.side !== "left" && panel.side !== "right") {
    throw new TypeError("ui.devdock_invalid_side");
  }
  if (panel.authority !== "read_only" && panel.authority !== "cheat") {
    throw new TypeError("ui.devdock_invalid_authority");
  }
  if (panel.stage !== undefined && panel.stage !== "live" && panel.stage !== "frozen") {
    throw new TypeError("ui.devdock_invalid_stage_mode");
  }
  if (typeof panel.title !== "string" || panel.title.length === 0) {
    throw new TypeError("ui.devdock_invalid_panel");
  }
  return {
    id: panel.id,
    side: panel.side,
    title: panel.title,
    authority: panel.authority,
    stage: panel.stage ?? "live",
    render: panel.render,
  };
}

/** Validates and copies one application-supplied panel registry. */
export function createDevDockContributionSetV1(
  input: DevDockContributionSetV1,
): DevDockContributionSetV1 {
  if (input === null || typeof input !== "object" || !Array.isArray(input.panels)) {
    throw new TypeError("ui.devdock_invalid_contributions");
  }
  const ids = new Set<string>();
  const panels = input.panels.map((candidate) => {
    const panel = validatePanelV1(candidate);
    if (ids.has(panel.id)) throw new TypeError("ui.devdock_duplicate_panel_id");
    ids.add(panel.id);
    return panel;
  });
  return { panels };
}

/** @internal Combines already-admitted contribution sets without re-admitting each panel. */
export function combineDevDockContributionSetsInternalV1(
  sets: readonly DevDockContributionSetV1[],
): DevDockContributionSetV1 {
  const ids = new Set<string>();
  const panels: DevDockPanelV1[] = [];
  for (const set of sets) {
    for (const panel of set.panels) {
      if (ids.has(panel.id)) throw new TypeError("ui.devdock_duplicate_panel_id");
      ids.add(panel.id);
      panels.push(panel);
    }
  }
  return { panels };
}

export function isDevDockPositionV1(value: string): value is DevDockPositionV1 {
  return devDockPositionsV1.includes(value as DevDockPositionV1);
}

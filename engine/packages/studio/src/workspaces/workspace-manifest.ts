// SPDX-License-Identifier: MIT
import type { StudioBindingV1 } from "../core/binding.ts";

/** Closed V1 workspace set. This is build-known metadata, not a plugin registry. */
export type AuthoringWorkspaceIdInternalV1 = "scene" | "motion" | "regions" | "flow";

export interface AuthoringWorkspaceManifestEntryInternalV1 {
  readonly id: AuthoringWorkspaceIdInternalV1;
  readonly label: string;
  readonly activation: "resident" | "progressive";
  /** Current workspaces are layout-insensitive; future geometry workspaces must opt in here. */
  readonly readiness: "layout" | "connected";
}

const sceneWorkspaceInternalV1 = Object.freeze({
  id: "scene" as const,
  label: "Scene Construction",
  activation: "resident" as const,
  readiness: "layout" as const,
});

const motionWorkspaceInternalV1 = Object.freeze({
  id: "motion" as const,
  label: "Motion 工坊",
  activation: "resident" as const,
  readiness: "layout" as const,
});

const regionsWorkspaceInternalV1 = Object.freeze({
  id: "regions" as const,
  label: "Regions",
  activation: "resident" as const,
  readiness: "layout" as const,
});

const flowWorkspaceInternalV1 = Object.freeze({
  id: "flow" as const,
  label: "Narrative 流程",
  activation: "progressive" as const,
  readiness: "layout" as const,
});

export function authoringWorkspaceManifestInternalV1(input: {
  readonly binding: StudioBindingV1;
  readonly hasRegionsIo: boolean;
}): readonly AuthoringWorkspaceManifestEntryInternalV1[] {
  return Object.freeze([
    sceneWorkspaceInternalV1,
    motionWorkspaceInternalV1,
    ...(input.hasRegionsIo ? [regionsWorkspaceInternalV1] : []),
    ...(input.binding.flow === undefined ? [] : [flowWorkspaceInternalV1]),
  ]);
}

// SPDX-License-Identifier: MIT

/** Closed V1 workspace set. This is build-known metadata, not a plugin registry. */
export type AuthoringWorkspaceIdInternalV1 = "scene" | "motion" | "regions" | "chrome" | "flow";

export interface AuthoringWorkspaceManifestEntryInternalV1 {
  readonly id: AuthoringWorkspaceIdInternalV1;
  readonly label: string;
  readonly activation: "resident" | "progressive";
  /** Geometry previews that need a connected tree opt in explicitly. */
  readonly readiness: "layout" | "connected";
}

export interface AuthoringWorkspaceContractInternalV1 {
  readonly ids: readonly AuthoringWorkspaceIdInternalV1[];
  readonly signature: string;
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

const chromeWorkspaceInternalV1 = Object.freeze({
  id: "chrome" as const,
  label: "界面布局",
  activation: "resident" as const,
  readiness: "connected" as const,
});

const flowWorkspaceInternalV1 = Object.freeze({
  id: "flow" as const,
  label: "Narrative 流程",
  activation: "progressive" as const,
  readiness: "layout" as const,
});

export function authoringWorkspaceManifestInternalV1(input: {
  readonly hasFlow: boolean;
  readonly hasRegionsIo: boolean;
  readonly hasChromeIo: boolean;
}): readonly AuthoringWorkspaceManifestEntryInternalV1[] {
  return Object.freeze([
    sceneWorkspaceInternalV1,
    motionWorkspaceInternalV1,
    ...(input.hasRegionsIo ? [regionsWorkspaceInternalV1] : []),
    ...(input.hasChromeIo ? [chromeWorkspaceInternalV1] : []),
    ...(input.hasFlow ? [flowWorkspaceInternalV1] : []),
  ]);
}

/** Structural R1 identity; presentation labels deliberately remain replaceable. */
export function authoringWorkspaceContractInternalV1(
  manifest: readonly AuthoringWorkspaceManifestEntryInternalV1[],
): AuthoringWorkspaceContractInternalV1 {
  const ids = Object.freeze(manifest.map((workspace) => workspace.id));
  const signature = JSON.stringify(
    manifest.map((workspace) => [workspace.id, workspace.activation, workspace.readiness]),
  );
  return Object.freeze({ ids, signature });
}

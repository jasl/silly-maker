// SPDX-License-Identifier: MIT
import type { ReactNode } from "react";

import type { StageTagV1 } from "@sillymaker/base";
import type {
  AdmittedAuthoringSceneV1,
  AuthoringSceneFacetProjectionV1,
} from "@sillymaker/base/authoring/scene";

import type {
  SceneAuthoringExecutionResultV1,
  SceneAuthoringOperationV1,
} from "./scene-operations/contract.ts";

/**
 * Current, revision-fenced Scene view exposed to one game-selected Inspector
 * property tool. Retained callbacks become inactive when that tool view retires.
 * The view deliberately omits source IO, Save, Host, and Session.
 */
export interface SceneInspectorRenderInputV1 {
  readonly scene: AdmittedAuthoringSceneV1;
  readonly facets: AuthoringSceneFacetProjectionV1;
  readonly selectedObjectId: StageTagV1 | null;
  readonly documentIdentity: string;
  readonly draftRevision: number;
  readonly busy: boolean;
  readonly publicationRole: "visible" | "probe";
  selectObject(objectId: StageTagV1 | null): boolean;
  execute(
    operation: SceneAuthoringOperationV1,
    coalesceKey?: string,
  ): SceneAuthoringExecutionResultV1;
}

/** A build-known game/editor Mod contribution beside the core Object Inspector. */
export interface SceneInspectorContributionV1 {
  readonly id: string;
  readonly title: string;
  render(input: SceneInspectorRenderInputV1): ReactNode;
}

/**
 * Focused Scene Inspector extension point. Other document families keep their
 * own editor contracts instead of entering a generic workspace registry.
 */
export interface SceneInspectorContributionSetV1 {
  readonly properties: readonly SceneInspectorContributionV1[];
}

export const emptySceneInspectorContributionSetInternalV1: SceneInspectorContributionSetV1 = {
  properties: [],
};

/** Once-only public binding admission; internal rendering trusts this copy. */
export function admitSceneInspectorContributionSetInternalV1(
  value: SceneInspectorContributionSetV1 | undefined,
): SceneInspectorContributionSetV1 {
  if (value === undefined) return emptySceneInspectorContributionSetInternalV1;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("studio.scene_inspector_contributions_invalid");
  }
  if (!Array.isArray(value.properties)) {
    throw new TypeError("studio.scene_inspector_contributions_invalid");
  }

  const ids = new Set<string>();
  const properties = value.properties.map((contribution) => {
    if (contribution === null || typeof contribution !== "object" || Array.isArray(contribution)) {
      throw new TypeError("studio.scene_inspector_contribution_invalid");
    }
    if (typeof contribution.id !== "string" || contribution.id.length === 0) {
      throw new TypeError("studio.scene_inspector_contribution_invalid");
    }
    if (ids.has(contribution.id)) {
      throw new TypeError(`studio.scene_inspector_contribution_duplicate:${contribution.id}`);
    }
    if (typeof contribution.title !== "string" || contribution.title.length === 0) {
      throw new TypeError("studio.scene_inspector_contribution_invalid");
    }
    if (typeof contribution.render !== "function") {
      throw new TypeError("studio.scene_inspector_contribution_invalid");
    }
    ids.add(contribution.id);
    return {
      id: contribution.id,
      title: contribution.title,
      render: contribution.render,
    };
  });
  return { properties };
}

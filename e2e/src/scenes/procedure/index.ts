// SPDX-License-Identifier: MIT
// The procedure scene source is the single authoring authority for its
// background, character identities, placements, and opening appearances.
import { sceneFromDocumentV1 } from "@sillymaker/base/authoring/scene";
import type { SceneV1 } from "@sillymaker/base/authoring/scene";

import procedureSceneDocumentV1 from "./procedure.scene.json" with { type: "json" };

export const labProcedureSceneV1: SceneV1 = sceneFromDocumentV1(procedureSceneDocumentV1);

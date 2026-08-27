// SPDX-License-Identifier: MIT
import type { StrictJsonObjectV1 } from "@sillymaker/base/strict-json";
import { defineCodeSurfaceCatalogV1, defineCodeSurfaceV1 } from "@sillymaker/ui/code-surface";
import { z } from "zod";

import type { ElectronicPetGameViewV1, ElectronicPetSceneGestureResultV1 } from "../game/kernel.ts";
import type { ElectronicPetInteractionOutcomeV1 } from "../game/state.ts";

export interface ElectronicPetSceneContextV1 {
  readonly view: ElectronicPetGameViewV1;
  dispatchGesture(
    result: ElectronicPetSceneGestureResultV1,
  ): Promise<ElectronicPetInteractionOutcomeV1 | null>;
  reportFailure(error: unknown): void;
}

const propsSchemaV1 = z.strictObject({ quality: z.enum(["balanced", "quality"]) });
export type ElectronicPetScenePropsV1 = z.infer<typeof propsSchemaV1>;

const homeCanvasDefinitionV1 = defineCodeSurfaceV1<
  ElectronicPetSceneContextV1,
  ElectronicPetScenePropsV1,
  never
>({
  viewId: "view.electronic-pet.home-canvas.v1",
  slotIds: [],
  admitProps: (value: StrictJsonObjectV1) => propsSchemaV1.parse(value),
  load: () => import("./pet-scene-view.tsx"),
  source: "src/presentation/pet-scene-view.tsx",
  authoring: {
    label: "Electronic Pet home canvas",
    preview: "opaque",
    stateOwner: "authoritative_via_port",
    properties: [{ propId: "quality", label: "Render quality", valueKind: "string" }],
  },
  policy: {
    input: "application",
    nativeText: "allowed",
    portal: "none",
  },
});

export const electronicPetSceneCatalogV1 = defineCodeSurfaceCatalogV1([
  homeCanvasDefinitionV1,
]);

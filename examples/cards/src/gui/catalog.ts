// SPDX-License-Identifier: MIT
import type { StrictJsonObjectV1 } from "@sillymaker/base/strict-json";
import { defineCodeSurfaceCatalogV1, defineCodeSurfaceV1 } from "@sillymaker/ui/code-surface";
import { z } from "zod";

export interface CardsCodeSurfaceContextV1 {
  readonly productId: "feature-cards";
}

const screenPropsSchemaV1 = z.strictObject({
  eyebrow: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  moduleCountLabel: z.string().min(1).max(40),
  helpText: z.string().min(1).max(180),
});

const cardPropsSchemaV1 = z.strictObject({
  cardId: z.enum(["layout", "motion", "input"]),
  order: z.number().int().min(0).max(2),
  title: z.string().min(1).max(60),
  caption: z.string().min(1).max(100),
  detail: z.string().min(1).max(240),
  accent: z.enum(["blue", "emerald", "amber"]),
});

export type CardsScreenPropsV1 = z.infer<typeof screenPropsSchemaV1>;
export type FeatureCardPropsV1 = z.infer<typeof cardPropsSchemaV1>;

const codeSurfacePolicyV1 = {
  input: "application",
  nativeText: "allowed",
  portal: "none",
} as const;

const screenDefinitionV1 = defineCodeSurfaceV1<
  CardsCodeSurfaceContextV1,
  CardsScreenPropsV1,
  "cards"
>({
  viewId: "view.cards.screen.v1",
  slotIds: ["cards"],
  admitProps: (value: StrictJsonObjectV1) => screenPropsSchemaV1.parse(value),
  load: () => import("./views/cards-screen.tsx"),
  source: "src/gui/views/cards-screen.tsx",
  authoring: {
    label: "Feature Cards screen",
    preview: "slots",
    stateOwner: "react_local",
    properties: [
      { propId: "eyebrow", label: "Eyebrow", valueKind: "string" },
      { propId: "title", label: "Title", valueKind: "string" },
      { propId: "moduleCountLabel", label: "Module count", valueKind: "string" },
      { propId: "helpText", label: "Input help", valueKind: "string" },
    ],
  },
  policy: codeSurfacePolicyV1,
});

const cardDefinitionV1 = defineCodeSurfaceV1<
  CardsCodeSurfaceContextV1,
  FeatureCardPropsV1,
  never
>({
  viewId: "view.cards.feature-card.v1",
  slotIds: [],
  admitProps: (value: StrictJsonObjectV1) => cardPropsSchemaV1.parse(value),
  load: () => import("./views/feature-card.tsx"),
  source: "src/gui/views/feature-card.tsx",
  authoring: {
    label: "Feature card",
    preview: "opaque",
    stateOwner: "react_local",
    properties: [
      { propId: "cardId", label: "Stable card ID", valueKind: "string" },
      { propId: "order", label: "Order", valueKind: "number" },
      { propId: "title", label: "Title", valueKind: "string" },
      { propId: "caption", label: "Caption", valueKind: "string" },
      { propId: "detail", label: "Detail", valueKind: "string" },
      { propId: "accent", label: "Accent", valueKind: "string" },
    ],
  },
  policy: codeSurfacePolicyV1,
});

export const cardsCodeSurfaceCatalogV1 = defineCodeSurfaceCatalogV1([
  screenDefinitionV1,
  cardDefinitionV1,
]);

// SPDX-License-Identifier: MIT
import type { StrictJsonObjectV1 } from "@sillymaker/base/strict-json";
import { defineCodeSurfaceCatalogV1, defineCodeSurfaceV1 } from "@sillymaker/ui/code-surface";
import { z } from "zod";

export interface WebsiteHomeConsoleContextV1 {
  readonly productId: "website-home-console";
}

const screenPropsSchemaV1 = z.strictObject({
  label: z.string().min(1),
  statusLabel: z.string().min(1),
  routeLabel: z.string().min(1),
  openLabel: z.string().min(1),
  previousLabel: z.string().min(1),
  nextLabel: z.string().min(1),
  helpText: z.string().min(1),
});

const routePropsSchemaV1 = z.strictObject({
  routeId: z.string().min(1),
  order: z.number().int().min(0),
  number: z.string().min(1),
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  href: z.string().min(1),
  accent: z.enum(["indigo", "mint", "amber", "violet"]),
  tags: z.array(z.string().min(1)),
});

export type HomeConsoleScreenPropsV1 = z.infer<typeof screenPropsSchemaV1>;
export type HomeConsoleRoutePropsV1 = z.infer<typeof routePropsSchemaV1>;

const policyV1 = {
  input: "application",
  nativeText: "allowed",
  portal: "none",
} as const;

const screenDefinitionV1 = defineCodeSurfaceV1<
  WebsiteHomeConsoleContextV1,
  HomeConsoleScreenPropsV1,
  "routes"
>({
  viewId: "view.website.home-console.screen.v1",
  slotIds: ["routes"],
  admitProps: (value: StrictJsonObjectV1) => screenPropsSchemaV1.parse(value),
  load: () => import("./views/home-console-screen.tsx"),
  source: "src/home-console/views/home-console-screen.tsx",
  authoring: {
    label: "Website home navigation console",
    preview: "slots",
    stateOwner: "react_local",
    properties: [
      { propId: "label", label: "Console label", valueKind: "string" },
      { propId: "helpText", label: "Input help", valueKind: "string" },
    ],
  },
  policy: policyV1,
});

const routeDefinitionV1 = defineCodeSurfaceV1<
  WebsiteHomeConsoleContextV1,
  HomeConsoleRoutePropsV1,
  never
>({
  viewId: "view.website.home-console.route.v1",
  slotIds: [],
  admitProps: (value: StrictJsonObjectV1) => routePropsSchemaV1.parse(value),
  load: () => import("./views/home-console-route.tsx"),
  source: "src/home-console/views/home-console-route.tsx",
  authoring: {
    label: "Website home route",
    preview: "opaque",
    stateOwner: "ui_session",
    properties: [
      { propId: "title", label: "Title", valueKind: "string" },
      { propId: "summary", label: "Summary", valueKind: "string" },
      { propId: "href", label: "Destination", valueKind: "string" },
      { propId: "tags", label: "Tags", valueKind: "json" },
    ],
  },
  policy: policyV1,
});

export const websiteHomeConsoleCatalogV1 = defineCodeSurfaceCatalogV1([
  screenDefinitionV1,
  routeDefinitionV1,
]);

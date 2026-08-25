// SPDX-License-Identifier: MIT
import type { StrictJsonObjectV1 } from "@sillymaker/base";
import { defineCodeSurfaceCatalogV1, defineCodeSurfaceV1 } from "@sillymaker/ui/code-surface";

export interface LabCodeSurfaceContextV1 {
  collectSample(): Promise<void>;
}

interface ShellPropsV1 {
  readonly title: string;
}

interface DetailPropsV1 {
  readonly actionLabel: string;
  readonly draftLabel: string;
}

function exactStringPropsV1<const TKey extends string>(
  value: StrictJsonObjectV1,
  keys: readonly TKey[],
): Readonly<Record<TKey, string>> {
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => typeof value[key] !== "string")
  ) {
    throw new TypeError("code_surface_props_invalid");
  }
  return Object.fromEntries(keys.map((key) => [key, value[key]])) as Readonly<
    Record<TKey, string>
  >;
}

const shellDefinitionV1 = defineCodeSurfaceV1<
  LabCodeSurfaceContextV1,
  ShellPropsV1,
  "detail"
>({
  viewId: "view.e2e.code-surface-shell",
  slotIds: ["detail"],
  admitProps: (value) => exactStringPropsV1(value, ["title"]),
  load: () =>
    import("./code-surfaces/conformance-shell.tsx").then((module) => ({
      default: module.LabCodeSurfaceShellV1,
    })),
  source: "src/application/code-surfaces/conformance-shell.tsx",
  authoring: {
    label: "Conformance shell",
    properties: [{ propId: "title", label: "Title", valueKind: "string" }],
    preview: "slots",
    stateOwner: "react_local",
  },
  policy: { input: "application", nativeText: "allowed", portal: "none" },
});

const detailDefinitionV1 = defineCodeSurfaceV1<
  LabCodeSurfaceContextV1,
  DetailPropsV1,
  never
>({
  viewId: "view.e2e.code-surface-detail",
  slotIds: [],
  admitProps: (value) => exactStringPropsV1(value, ["actionLabel", "draftLabel"]),
  load: () =>
    import("./code-surfaces/conformance-detail.tsx").then((module) => ({
      default: module.LabCodeSurfaceDetailV1,
    })),
  source: "src/application/code-surfaces/conformance-detail.tsx",
  authoring: {
    label: "Conformance detail",
    properties: [
      { propId: "actionLabel", label: "Action label", valueKind: "string" },
      { propId: "draftLabel", label: "Draft label", valueKind: "string" },
    ],
    preview: "opaque",
    stateOwner: "react_local",
  },
  policy: { input: "application", nativeText: "allowed", portal: "none" },
});

/** Literal child imports stay owned by this build-known, lazily loaded catalog. */
export const labCodeSurfaceCatalogV1 = defineCodeSurfaceCatalogV1<LabCodeSurfaceContextV1>([
  shellDefinitionV1,
  detailDefinitionV1,
]);

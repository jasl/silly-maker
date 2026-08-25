// SPDX-License-Identifier: MIT
import type { ComponentType } from "react";
import type { StrictJsonObjectV1 } from "@sillymaker/base";
import {
  compileCodeSurfaceCompositionV1,
  defineCodeSurfaceCatalogV1,
  defineCodeSurfaceV1,
  type CodeSurfaceViewPropsV1,
} from "@sillymaker/ui/code-surface";

interface ContextV1 {
  readonly dispatch: (actionId: "action.test") => Promise<void>;
}

interface PropsV1 {
  readonly title: string;
}

type SlotsV1 = "content" | "toolbar";

declare const ViewV1: ComponentType<CodeSurfaceViewPropsV1<ContextV1, PropsV1, SlotsV1>>;
declare const documentV1: import("@sillymaker/base").GuiCompositionDocumentV1;

const definitionV1 = defineCodeSurfaceV1({
  viewId: "view.test.shell",
  slotIds: ["toolbar", "content"],
  admitProps(value: StrictJsonObjectV1): PropsV1 {
    if (typeof value.title !== "string") throw new TypeError("title_required");
    return { title: value.title };
  },
  load: async () => ({ default: ViewV1 }),
  authoring: {
    label: "Test shell",
    properties: [{ propId: "title", label: "Title", valueKind: "string" }],
    preview: "slots",
    stateOwner: "react_local",
  },
  policy: { input: "application", nativeText: "allowed", portal: "none" },
});

const catalogV1 = defineCodeSurfaceCatalogV1<ContextV1>([definitionV1]);
const compositionV1 = compileCodeSurfaceCompositionV1(documentV1, catalogV1);
compositionV1.render({ dispatch: async () => undefined });

defineCodeSurfaceV1<ContextV1, PropsV1, SlotsV1>({
  viewId: "view.test.bad",
  // @ts-expect-error slot names are definition-specific.
  slotIds: ["other"],
  admitProps: () => ({ title: "bad" }),
  load: async () => ({ default: ViewV1 }),
  authoring: {
    label: "Bad",
    properties: [],
    preview: "opaque",
    stateOwner: "react_local",
  },
  policy: { input: "application", nativeText: "allowed", portal: "none" },
});

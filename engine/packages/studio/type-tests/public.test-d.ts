// SPDX-License-Identifier: MIT
import {
  sceneAuthoringOperationSchemaRevisionV1,
  type InspectorBindingV1,
  type SceneAuthoringOperationV1,
  type SceneInspectorContributionSetV1,
  type SceneInspectorRenderInputV1,
} from "@sillymaker/studio";
import { parseStageTagV1 } from "@sillymaker/base";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

type SceneInspectorForbiddenKeysV1 = ExpectV1<
  EqualV1<
    Extract<keyof SceneInspectorRenderInputV1, "host" | "session" | "sceneIo" | "save">,
    never
  >
>;

const operationV1: SceneAuthoringOperationV1 = {
  schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
  kind: "scene.object.set_appearance",
  objectId: parseStageTagV1("tag.type-test.object"),
  key: "mood",
  value: "happy",
};

const contributionsV1 = {
  properties: [{
    id: "tool.type-test.properties",
    title: "Properties",
    render: (input: SceneInspectorRenderInputV1) => {
      input.execute(operationV1);
      return null;
    },
  }],
} satisfies SceneInspectorContributionSetV1;

const bindingV1 = {
  catalog: { resolveContent: () => null },
  renderers: {},
  sceneInspector: contributionsV1,
  async dispose() {},
} satisfies InspectorBindingV1;

export type { SceneInspectorForbiddenKeysV1 };
void bindingV1;

// @ts-expect-error lifecycle backend/owner remains package-private
export type { SceneAuthoringLocalAdapterV1 } from "@sillymaker/studio";

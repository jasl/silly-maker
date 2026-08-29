// SPDX-License-Identifier: MIT
// PascalCase React presentation (Vite Fast Refresh–safe).
// Application binding, projector, slots, and labels live in `composition.tsx`.
import type { ReactElement } from "react";

import type { DeepReadonly } from "@sillymaker/base";
import type { ChromeLayoutDocument } from "@sillymaker/base/story";
import { Button } from "@sillymaker/ui";

import { templateHudBoxNameV1, templateHudChromeLayoutV1 } from "../chrome/index.ts";
import { templateUiTextV1 } from "../content/presentation.ts";
import type { TemplateActionIdV1 } from "./semantic.ts";
import type { TemplateApplicationInstanceV1 } from "./core-definition.ts";
import type { TemplateUiPublicationV1 } from "./composition.tsx";

type TemplateSemanticPortV1 = TemplateApplicationInstanceV1["semantic"];

const actionTextIdsV1: Readonly<Record<TemplateActionIdV1, string>> = {
  "template.begin_story": "text.template.action.begin",
  "template.earn_coin": "text.template.action.earn",
};

export function TemplateHudV1(props: {
  readonly publication: DeepReadonly<TemplateUiPublicationV1>;
  readonly semantic: TemplateSemanticPortV1;
  /** Preview/test override; normal runtime reads the checked layout document. */
  readonly layout?: ChromeLayoutDocument;
}): ReactElement | null {
  // Geometry comes from the checked chrome-layout document; runtime admission
  // guarantees the box exists, and a preview override missing it simply hides
  // the strip.
  const box = (props.layout ?? templateHudChromeLayoutV1).boxes[templateHudBoxNameV1];
  if (box === undefined) return null;
  return (
    <div
      data-template-hud="true"
      style={{
        position: "absolute",
        insetInlineStart: `${String(box.x)}px`,
        insetBlockStart: `${String(box.y)}px`,
        inlineSize: `${String(box.width)}px`,
        minBlockSize: `${String(box.height)}px`,
        display: "flex",
        gap: "12px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <span data-template-coins={String(props.publication.view.coins)}>
        {templateUiTextV1("text.template.hud.coins")}
        {String(props.publication.view.coins)}
      </span>
      {props.publication.semantic.narrative.phase === "completed"
        ? (
          <span data-template-narrative="completed">
            {templateUiTextV1("text.template.narrative.completed")}
          </span>
        )
        : null}
      {props.publication.semantic.actions.map((action) => (
        <Button
          key={action.actionId}
          disabled={!action.enabled}
          data-template-action-id={action.actionId}
          onClick={() =>
            void props.semantic.dispatch(
              { kind: "invoke" as const, actionId: action.actionId },
            )}
        >
          {templateUiTextV1(actionTextIdsV1[action.actionId])}
        </Button>
      ))}
    </div>
  );
}

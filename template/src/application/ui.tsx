// SPDX-License-Identifier: MIT
// PascalCase React presentation (Vite Fast Refresh–safe).
// Application binding, projector, slots, and labels live in `composition.tsx`.
import type { ReactElement } from "react";

import type { DeepReadonly, NarrativeHistoryV1, PendingInteractionV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { DialogueResolutionV1 } from "@sillymaker/ui";
import { Button, DialoguePanelV1 } from "@sillymaker/ui";

import type { TemplateActionIdV1, TemplateInvocationV1 } from "./semantic.ts";
import type { TemplateApplicationInstanceV1 } from "./core-definition.ts";
import type { TemplateUiPublicationV1 } from "./composition.tsx";
import { templateUiTextV1 } from "./composition.tsx";

type TemplateSemanticPortV1 = TemplateApplicationInstanceV1["semantic"];

const actionTextIdsV1: Readonly<Record<TemplateActionIdV1, string>> = Object.freeze({
  "template.begin_story": "text.template.action.begin",
  "template.earn_coin": "text.template.action.earn",
});

function resolveV1(
  semantic: TemplateSemanticPortV1,
  expectedOccurrenceId: string,
  resolution: DeepReadonly<TemplateInvocationV1> extends never ? never : unknown,
): void {
  void semantic.dispatch(
    Object.freeze({
      kind: "resolve" as const,
      expectedOccurrenceId,
      resolution,
    }) as never,
  );
}

/**
 * The minimal narrative panel: renders the pending say or choice from the
 * published narrative view and dispatches semantic resolutions. The Engine
 * Lab's player (`e2e/src/application/narrative-ui.tsx`) shows
 * the full version with typewriter, auto/skip, history, and voice replay.
 */
export function TemplateNarrativePanelV1(props: {
  readonly publication: DeepReadonly<TemplateUiPublicationV1>;
  readonly semantic: TemplateSemanticPortV1;
  readonly playerProfile: PlayerProfileStoreV1;
}): ReactElement | null {
  const narrative = props.publication.semantic.narrative;
  const pending = narrative.pending;
  const panelStyle = {
    position: "absolute" as const,
    insetInline: "160px",
    insetBlockEnd: "48px",
    padding: "24px 32px",
    borderRadius: "16px",
    background: "rgba(16, 20, 26, 0.82)",
    color: "#f2efe8",
    fontSize: "22px",
    lineHeight: 1.6,
  };

  if (pending === null) {
    if (narrative.phase !== "completed") return null;
    return (
      <div data-template-narrative="completed" style={panelStyle}>
        {templateUiTextV1("text.template.narrative.completed")}
      </div>
    );
  }

  return (
    <DialoguePanelV1
      pending={pending as PendingInteractionV1}
      history={narrative.history as NarrativeHistoryV1}
      playerProfile={props.playerProfile}
      uiText={templateUiTextV1}
      onResolve={(occurrenceId: string, resolution: DialogueResolutionV1) =>
        resolveV1(props.semantic, occurrenceId, resolution as never)}
      labels={{
        advanceLabel: templateUiTextV1("text.template.narrative.advance"),
        autoLabel: templateUiTextV1("text.template.playback.auto"),
        skipLabel: templateUiTextV1("text.template.playback.skip"),
        historyLabel: templateUiTextV1("text.template.playback.history"),
        historyTitle: templateUiTextV1("text.template.playback.history.title"),
        historyEmptyText: templateUiTextV1("text.template.playback.history.empty"),
        historyCloseLabel: templateUiTextV1("text.template.playback.history.close"),
      }}
      panelStyle={panelStyle}
    />
  );
}

export function TemplateHudV1(props: {
  readonly publication: DeepReadonly<TemplateUiPublicationV1>;
  readonly semantic: TemplateSemanticPortV1;
}): ReactElement {
  return (
    <div data-template-hud="true" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <span data-template-coins={String(props.publication.view.coins)}>
        {templateUiTextV1("text.template.hud.coins")}
        {String(props.publication.view.coins)}
      </span>
      {props.publication.semantic.actions.map((action) => (
        <Button
          key={action.actionId}
          disabled={!action.enabled}
          data-template-action-id={action.actionId}
          onClick={() =>
            void props.semantic.dispatch(
              Object.freeze({ kind: "invoke" as const, actionId: action.actionId }),
            )}
        >
          {templateUiTextV1(actionTextIdsV1[action.actionId])}
        </Button>
      ))}
    </div>
  );
}

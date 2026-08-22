// SPDX-License-Identifier: MIT
// PascalCase React presentation (Vite Fast Refresh–safe).
// Application binding, projector, slots, and labels live in `composition.tsx`.
import type { ReactElement } from "react";

import type { DeepReadonly } from "@sillymaker/base";
import type { ChromeLayoutDocument } from "@sillymaker/base/story";
import type { NarrativeSurfaceRendererPropsV1 } from "@sillymaker/ui";
import { Button } from "@sillymaker/ui";

import { templateHudBoxNameV1, templateHudChromeLayoutV1 } from "../chrome/index.ts";
import type { TemplateActionIdV1 } from "./semantic.ts";
import type { TemplateApplicationInstanceV1 } from "./core-definition.ts";
import type { TemplateUiPublicationV1 } from "./composition.tsx";
import { templateUiTextV1 } from "./composition.tsx";

type TemplateSemanticPortV1 = TemplateApplicationInstanceV1["semantic"];

const actionTextIdsV1: Readonly<Record<TemplateActionIdV1, string>> = Object.freeze({
  "template.begin_story": "text.template.action.begin",
  "template.earn_coin": "text.template.action.earn",
});

const templateNarrativePanelStyleV1 = Object.freeze({
  position: "absolute" as const,
  insetInline: "160px",
  insetBlockEnd: "48px",
  padding: "24px 32px",
  borderRadius: "16px",
  background: "rgba(16, 20, 26, 0.82)",
  color: "#f2efe8",
  fontSize: "22px",
  lineHeight: 1.6,
});

/** Passive product skin for the composition-owned Narrative runtime. */
export function TemplateNarrativeRendererV1(
  props: NarrativeSurfaceRendererPropsV1,
): ReactElement | null {
  if (props.kind === "history") {
    return (
      <section
        data-template-narrative="history"
        data-dialogue-history="true"
        style={templateNarrativePanelStyleV1}
      >
        <header style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <strong>{props.resolveText("text.template.playback.history.title")}</strong>
          <Button data-dialogue-history-close="true" onClick={props.onCloseHistory}>
            {props.resolveText("text.template.playback.history.close")}
          </Button>
        </header>
        {props.history.entries.length === 0
          ? <p>{props.resolveText("text.template.playback.history.empty")}</p>
          : (
            <ol style={{ display: "grid", gap: "10px", paddingInlineStart: "24px" }}>
              {props.history.entries.map((entry) => (
                <li key={entry.occurrenceId} data-dialogue-history-entry={entry.kind}>
                  {entry.speakerTextId === null
                    ? null
                    : <strong>{props.resolveText(entry.speakerTextId)}：</strong>}
                  {props.resolveText(entry.textId)}
                </li>
              ))}
            </ol>
          )}
      </section>
    );
  }

  const pending = props.pending;
  if (pending.kind === "say") {
    const playerView = props.playerView.kind === "say" ? props.playerView : null;
    const resolvedSpeakerText = playerView?.resolvedSpeakerText ??
      (pending.speakerTextId === null ? null : props.resolveText(pending.speakerTextId));
    const resolvedText = playerView?.resolvedText ?? props.resolveText(pending.textId);
    const revealedCharacters = playerView?.revealedCharacters ?? 0;
    const revealComplete = playerView?.revealComplete ?? false;
    return (
      <div
        data-template-narrative="say"
        data-dialogue="say"
        data-dialogue-occurrence={pending.occurrenceId}
        data-dialogue-reveal={revealComplete ? "complete" : "revealing"}
        style={templateNarrativePanelStyleV1}
      >
        {resolvedSpeakerText === null
          ? null
          : (
            <strong style={{ display: "block", color: "#ffd9a0" }}>
              {resolvedSpeakerText}
            </strong>
          )}
        <p style={{ margin: "8px 0 16px", minBlockSize: "1.6em" }}>
          {resolvedText.slice(0, revealedCharacters)}
        </p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Button data-dialogue-advance="true" onClick={props.onActivate}>
            {props.resolveText("text.template.narrative.advance")}
          </Button>
          <Button
            data-dialogue-playback="auto"
            aria-pressed={props.playerView.playbackMode === "auto"}
            onClick={props.onToggleAuto}
          >
            {props.resolveText("text.template.playback.auto")}
          </Button>
          <Button
            data-dialogue-playback="skip"
            aria-pressed={props.playerView.playbackMode === "skip"}
            onClick={props.onToggleSkip}
          >
            {props.resolveText("text.template.playback.skip")}
          </Button>
          <Button data-dialogue-history-open="true" onClick={props.onOpenHistory}>
            {props.resolveText("text.template.playback.history")}
          </Button>
        </div>
      </div>
    );
  }

  if (pending.kind === "choice") {
    return (
      <div
        data-template-narrative="choice"
        data-dialogue="choice"
        data-dialogue-occurrence={pending.occurrenceId}
        style={templateNarrativePanelStyleV1}
      >
        <p style={{ margin: "0 0 16px" }}>{props.resolveText(pending.promptTextId)}</p>
        <div role="group" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {pending.options.map((option, index) => {
            const availability = props.choiceAvailability?.[index];
            const enabled = availability?.choiceId === option.choiceId &&
              availability.status === "enabled";
            const reasonId = `template-choice-reason-${String(index)}`;
            return (
              <span key={option.choiceId} style={{ display: "grid", gap: "4px" }}>
                <Button
                  data-dialogue-choice={option.choiceId}
                  disabled={!enabled}
                  aria-describedby={enabled ? undefined : reasonId}
                  onClick={() => {
                    if (enabled) props.onChoose(option.choiceId);
                  }}
                >
                  {props.resolveText(option.textId)}
                </Button>
                {enabled
                  ? null
                  : (
                    <small id={reasonId} data-dialogue-choice-reason={option.choiceId}>
                      {(availability?.reasonTextIds ?? []).map((textId) =>
                        props.resolveText(textId)
                      ).join(" · ")}
                    </small>
                  )}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

export function TemplateHudV1(props: {
  readonly publication: DeepReadonly<TemplateUiPublicationV1>;
  readonly semantic: TemplateSemanticPortV1;
  /** Studio chrome-fixture override: the workspace passes its live draft. */
  readonly layout?: ChromeLayoutDocument;
}): ReactElement | null {
  // Geometry comes from the chrome-layout document (authored data, same
  // file the Studio Chrome workspace edits); runtime admission guarantees
  // the box exists, and a fixture draft missing it simply hides the strip.
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
              Object.freeze({ kind: "invoke" as const, actionId: action.actionId }),
            )}
        >
          {templateUiTextV1(actionTextIdsV1[action.actionId])}
        </Button>
      ))}
    </div>
  );
}

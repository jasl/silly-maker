// SPDX-License-Identifier: MIT
// PascalCase React presentation (Vite Fast Refresh–safe).
// Application binding, projector, slots, and labels live in `composition.tsx`.
import type { ReactElement } from "react";

import type { DeepReadonly } from "@sillymaker/base";
import type {
  NarrativeSurfaceDialogueRendererPropsV1,
  NarrativeSurfaceHistoryRendererPropsV1,
} from "@sillymaker/ui";
import { Button } from "@sillymaker/ui";

import type { BookshopActionIdV1 } from "./semantic.ts";
import type { BookshopApplicationInstanceV1 } from "./core-definition.ts";
import type { BookshopUiPublicationV1 } from "./composition.tsx";
import { bookshopUiTextV1 } from "./composition.tsx";

type BookshopSemanticPortV1 = BookshopApplicationInstanceV1["semantic"];

const actionTextIdsV1: Readonly<Record<BookshopActionIdV1, string>> = {
  "bookshop.begin_story": "text.bookshop.action.begin",
  "bookshop.earn_coin": "text.bookshop.action.earn",
};

const bookshopNarrativePanelStyleV1 = {
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

/** Passive product skin for the composition-owned Narrative runtime. */
export function BookshopNarrativeDialogueRendererV1(
  props: NarrativeSurfaceDialogueRendererPropsV1,
): ReactElement | null {
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
        data-bookshop-narrative="say"
        data-dialogue="say"
        data-dialogue-occurrence={pending.occurrenceId}
        data-dialogue-reveal={revealComplete ? "complete" : "revealing"}
        style={bookshopNarrativePanelStyleV1}
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
            {props.resolveText("text.bookshop.narrative.advance")}
          </Button>
          <Button
            data-dialogue-playback="auto"
            aria-pressed={props.playerView.playbackMode === "auto"}
            onClick={props.onToggleAuto}
          >
            {props.resolveText("text.bookshop.playback.auto")}
          </Button>
          <Button
            data-dialogue-playback="skip"
            aria-pressed={props.playerView.playbackMode === "skip"}
            onClick={props.onToggleSkip}
          >
            {props.resolveText("text.bookshop.playback.skip")}
          </Button>
          {props.history === null ? null : (
            <Button
              data-dialogue-history-open="true"
              disabled={!props.history.available}
              onClick={props.history.onOpen}
            >
              {props.resolveText("text.bookshop.playback.history")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (pending.kind === "choice") {
    return (
      <div
        data-bookshop-narrative="choice"
        data-dialogue="choice"
        data-dialogue-occurrence={pending.occurrenceId}
        style={bookshopNarrativePanelStyleV1}
      >
        <p style={{ margin: "0 0 16px" }}>{props.resolveText(pending.promptTextId)}</p>
        <div role="group" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {pending.options.map((option, index) => {
            const availability = props.choiceAvailability?.[index];
            const enabled = availability?.choiceId === option.choiceId &&
              availability.status === "enabled";
            const reasonId = `bookshop-choice-reason-${String(index)}`;
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

/** Optional History presentation selected explicitly by the Bookshop application. */
export function BookshopNarrativeHistoryRendererV1(
  props: NarrativeSurfaceHistoryRendererPropsV1,
): ReactElement {
  return (
    <section
      data-bookshop-narrative="history"
      data-dialogue-history="true"
      style={bookshopNarrativePanelStyleV1}
    >
      <header style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
        <strong>{props.resolveText("text.bookshop.playback.history.title")}</strong>
        <Button data-dialogue-history-close="true" onClick={props.onCloseHistory}>
          {props.resolveText("text.bookshop.playback.history.close")}
        </Button>
      </header>
      {props.history.entries.length === 0
        ? <p>{props.resolveText("text.bookshop.playback.history.empty")}</p>
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

export function BookshopHudV1(props: {
  readonly publication: DeepReadonly<BookshopUiPublicationV1>;
  readonly semantic: BookshopSemanticPortV1;
}): ReactElement {
  return (
    <div data-bookshop-hud="true" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <span data-bookshop-coins={String(props.publication.view.coins)}>
        {bookshopUiTextV1("text.bookshop.hud.coins")}
        {String(props.publication.view.coins)}
      </span>
      {props.publication.semantic.narrative.phase === "completed"
        ? (
          <span data-bookshop-narrative="completed">
            {bookshopUiTextV1("text.bookshop.narrative.completed")}
          </span>
        )
        : null}
      {props.publication.semantic.actions.map((action) => (
        <Button
          key={action.actionId}
          disabled={!action.enabled}
          data-bookshop-action-id={action.actionId}
          onClick={() =>
            void props.semantic.dispatch(
              { kind: "invoke" as const, actionId: action.actionId },
            )}
        >
          {bookshopUiTextV1(actionTextIdsV1[action.actionId])}
        </Button>
      ))}
    </div>
  );
}

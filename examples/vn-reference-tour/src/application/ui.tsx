// SPDX-License-Identifier: MIT
// PascalCase React presentation (Vite Fast Refresh–safe).
// Application binding, projector, slots, and labels live in `composition.tsx`.
import type { ReactElement } from "react";

import type { NarrativeSurfaceRendererPropsV1 } from "@sillymaker/ui";
import { Button } from "@sillymaker/ui";

const vnReferenceTourNarrativePanelStyleV1 = {
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
export function VnReferenceTourNarrativeRendererV1(
  props: NarrativeSurfaceRendererPropsV1,
): ReactElement | null {
  if (props.kind === "history") {
    return (
      <section
        data-vn-reference-tour-narrative="history"
        data-dialogue-history="true"
        style={vnReferenceTourNarrativePanelStyleV1}
      >
        <header style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <strong>{props.resolveText("text.vn-reference-tour.playback.history.title")}</strong>
          <Button data-dialogue-history-close="true" onClick={props.onCloseHistory}>
            {props.resolveText("text.vn-reference-tour.playback.history.close")}
          </Button>
        </header>
        {props.history.entries.length === 0
          ? <p>{props.resolveText("text.vn-reference-tour.playback.history.empty")}</p>
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
        data-vn-reference-tour-narrative="say"
        data-dialogue="say"
        data-dialogue-occurrence={pending.occurrenceId}
        data-dialogue-reveal={revealComplete ? "complete" : "revealing"}
        style={vnReferenceTourNarrativePanelStyleV1}
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
            {props.resolveText("text.vn-reference-tour.narrative.advance")}
          </Button>
          <Button
            data-dialogue-playback="auto"
            aria-pressed={props.playerView.playbackMode === "auto"}
            onClick={props.onToggleAuto}
          >
            {props.resolveText("text.vn-reference-tour.playback.auto")}
          </Button>
          <Button
            data-dialogue-playback="skip"
            aria-pressed={props.playerView.playbackMode === "skip"}
            onClick={props.onToggleSkip}
          >
            {props.resolveText("text.vn-reference-tour.playback.skip")}
          </Button>
          <Button data-dialogue-history-open="true" onClick={props.onOpenHistory}>
            {props.resolveText("text.vn-reference-tour.playback.history")}
          </Button>
        </div>
      </div>
    );
  }

  if (pending.kind === "choice") {
    return (
      <div
        data-vn-reference-tour-narrative="choice"
        data-dialogue="choice"
        data-dialogue-occurrence={pending.occurrenceId}
        style={vnReferenceTourNarrativePanelStyleV1}
      >
        <p style={{ margin: "0 0 16px" }}>{props.resolveText(pending.promptTextId)}</p>
        <div role="group" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {pending.options.map((option, index) => {
            const availability = props.choiceAvailability?.[index];
            const enabled = availability?.choiceId === option.choiceId &&
              availability.status === "enabled";
            const reasonId = `vnReferenceTour-choice-reason-${String(index)}`;
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

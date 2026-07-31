// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import type { NarrativeHistoryV1, PendingInteractionV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";

import type { PresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import { createAnimationFramePresentationClockV1 } from "../presentation-run/presentation-clock.ts";
import { createPlaybackControllerV1 } from "../player/playback-controller.ts";
import type { PlaybackModeV1 } from "../player/playback-controller.ts";
import { createTextRevealV1 } from "../player/text-reveal.ts";
import { Button } from "../primitives/button.tsx";
import { PanelV1 } from "../primitives/panel.tsx";
import { useReducedMotionV1 } from "../system/use-reduced-motion.ts";
import { AdvanceSurfaceV1 } from "./advance-surface.tsx";

/**
 * The assembled VN dialogue player every Story re-implemented by hand:
 * typewriter reveal (profile text speed, reduced-motion instant), the
 * explicit playback machine (auto waits after the full reveal, skip-read
 * stops at unread lines), Seen marking from the authoritative history, the
 * history panel over the saveable backlog, the click-anywhere advance
 * surface, and the quick menu. Everything flows through engine-standard
 * shapes: PendingInteraction in, the shared resolution contract out. The
 * panel renders say and choice interactions and stays out of the way for
 * every other pending kind.
 */

export interface DialoguePanelLabelsV1 {
  readonly advanceLabel: string;
  readonly autoLabel: string;
  readonly skipLabel: string;
  readonly historyLabel: string;
  readonly historyTitle: string;
  readonly historyEmptyText: string;
  readonly historyCloseLabel: string;
}

export type DialogueResolutionV1 = { readonly kind: "advance" } | {
  readonly kind: "choose";
  readonly choiceId: string;
};

export interface DialoguePanelPropsV1 {
  readonly pending: PendingInteractionV1 | null;
  readonly history: NarrativeHistoryV1;
  readonly playerProfile: PlayerProfileStoreV1;
  uiText(textId: string): string;
  onResolve(occurrenceId: string, resolution: DialogueResolutionV1): void;
  readonly labels: DialoguePanelLabelsV1;
  /** Story-appended quick-menu controls (rollback…). */
  readonly quickMenuExtras?: ReactNode;
  /** The dialogue box skin; layout stays with the Story. */
  readonly panelStyle?: CSSProperties;
  /** Injectable clock for deterministic tests. */
  readonly clock?: PresentationClockV1;
}

const defaultPanelStyleV1: CSSProperties = {
  position: "absolute",
  insetInline: "min(160px, 6%)",
  insetBlockEnd: "min(48px, 4%)",
  maxBlockSize: "70%",
  overflowY: "auto",
  padding: "clamp(8px, 3%, 32px)",
  borderRadius: "16px",
  background: "rgba(16, 20, 26, 0.82)",
  color: "#f2efe8",
  fontSize: "clamp(14px, 2.5vw, 22px)",
  lineHeight: 1.6,
};

function useProfilePreferencesV1(playerProfile: PlayerProfileStoreV1) {
  const [, setVersion] = useState(0);
  useEffect(
    () => playerProfile.subscribe(() => setVersion((current) => current + 1)),
    [playerProfile],
  );
  return playerProfile.current().preferences;
}

export function DialoguePanelV1(props: DialoguePanelPropsV1): ReactElement | null {
  const { pending, playerProfile, uiText, onResolve } = props;
  const preferences = useProfilePreferencesV1(playerProfile);
  const reducedMotion = useReducedMotionV1();
  const [fallbackClock] = useState<PresentationClockV1>(
    () => props.clock ?? createAnimationFramePresentationClockV1(),
  );
  const clock = props.clock ?? fallbackClock;
  const [, setPlaybackVersion] = useState(0);
  const [revealVersion, setRevealVersion] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  // Seen marking: every say that lands in the authoritative history marks
  // the Host profile; loading an older save never rewinds this.
  const markedRef = useRef(new Set<string>());
  useEffect(() => {
    for (const entry of props.history.entries) {
      if (entry.kind !== "say" || markedRef.current.has(entry.occurrenceId)) continue;
      markedRef.current.add(entry.occurrenceId);
      void playerProfile.markSeen(entry.definitionId, entry.seenRevision);
    }
  }, [playerProfile, props.history]);

  // Typewriter: one reveal per say occurrence; transient, rebuilt on load.
  const sayText = pending?.kind === "say" ? uiText(pending.textId) : null;
  const sayOccurrenceId = pending?.kind === "say" ? pending.occurrenceId : null;
  const reveal = useMemo(() => {
    if (sayOccurrenceId === null || sayText === null) return null;
    return createTextRevealV1({
      textLength: sayText.length,
      charactersPerSecond: preferences.textRevealCharsPerSecond,
      clock,
      reducedMotion,
    });
  }, [sayOccurrenceId, sayText, preferences.textRevealCharsPerSecond, clock, reducedMotion]);
  useEffect(() => {
    if (reveal === null) return () => {};
    const unsubscribe = reveal.subscribe(() => setRevealVersion((current) => current + 1));
    return () => {
      unsubscribe();
      reveal.dispose();
    };
  }, [reveal]);

  // The playback machine dispatches through the same resolution contract
  // as manual clicks; the session queue front fences anything stale.
  const controller = useMemo(
    () =>
      createPlaybackControllerV1({
        clock,
        policy: Object.freeze({
          autoWaitMs: preferences.autoWaitMs,
          skipStepMs: 40,
          skipPolicy: preferences.skipPolicy,
        }),
        isSeen: (definitionId, seenRevision) => {
          const recorded = playerProfile.current().seen[definitionId];
          return recorded !== undefined && recorded >= seenRevision;
        },
        advance: (occurrenceId) => onResolve(occurrenceId, Object.freeze({ kind: "advance" })),
      }),
    [clock, preferences.autoWaitMs, preferences.skipPolicy, playerProfile, onResolve],
  );
  useEffect(() => {
    const unsubscribe = controller.subscribe(() => setPlaybackVersion((current) => current + 1));
    return () => {
      unsubscribe();
      controller.dispose();
    };
  }, [controller]);
  const revealComplete = reveal?.isComplete() ?? true;
  useEffect(() => {
    controller.observeBoundary(
      Object.freeze({
        kind: pending?.kind ?? null,
        occurrenceId: pending?.occurrenceId ?? null,
        definitionId: pending?.definitionId ?? null,
        seenRevision: pending?.seenRevision ?? 1,
        textRevealComplete: revealComplete,
      }) as never,
    );
  }, [controller, pending, revealComplete, revealVersion]);
  const mode = controller.mode();
  const toggleMode = (next: PlaybackModeV1): void => {
    controller.setMode(mode === next ? "normal" : next);
  };

  const panelStyle = props.panelStyle ?? defaultPanelStyleV1;

  if (pending === null) return null;
  if (pending.kind === "say" && sayText !== null) {
    const revealed = reveal === null ? sayText : sayText.slice(0, reveal.revealedCharacters());
    const advance = (): void => {
      if (reveal !== null && !reveal.isComplete()) {
        reveal.revealAll();
        return;
      }
      onResolve(pending.occurrenceId, Object.freeze({ kind: "advance" }));
    };
    return (
      <>
        {showHistory ? null : <AdvanceSurfaceV1 onAdvance={advance} />}
        <div
          data-dialogue="say"
          data-dialogue-occurrence={pending.occurrenceId}
          data-dialogue-reveal={revealComplete ? "complete" : "revealing"}
          style={panelStyle}
        >
          {showHistory
            ? (
              <div
                style={{
                  position: "absolute",
                  insetInline: "min(200px, 10%)",
                  insetBlock: "min(60px, 8%)",
                  display: "grid",
                  padding: "clamp(12px, 3%, 32px)",
                  borderRadius: "16px",
                  background: "rgba(12, 15, 20, 0.94)",
                  pointerEvents: "auto",
                }}
              >
                <PanelV1
                  title={props.labels.historyTitle}
                  titleId="dialogue-history-title"
                  onClose={() => setShowHistory(false)}
                  closeLabel={props.labels.historyCloseLabel}
                  rootAttributes={{ "data-dialogue-history": "true" }}
                >
                  {props.history.entries.length === 0
                    ? <p>{props.labels.historyEmptyText}</p>
                    : (
                      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "10px" }}>
                        {props.history.entries.map((entry) => (
                          <li key={entry.occurrenceId} data-dialogue-history-entry={entry.kind}>
                            {entry.speakerTextId === null
                              ? null
                              : (
                                <strong style={{ color: "#ffd9a0", marginInlineEnd: "8px" }}>
                                  {uiText(entry.speakerTextId)}
                                </strong>
                              )}
                            <span>{uiText(entry.textId)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                </PanelV1>
              </div>
            )
            : null}
          {pending.speakerTextId === null
            ? null
            : (
              <strong style={{ display: "block", color: "#ffd9a0" }}>
                {uiText(pending.speakerTextId)}
              </strong>
            )}
          <p style={{ margin: "8px 0 16px", minBlockSize: "1.6em" }} onClick={advance}>
            {revealed}
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Button data-dialogue-advance="true" onClick={advance}>
              {props.labels.advanceLabel}
            </Button>
            <Button
              data-dialogue-playback="auto"
              aria-pressed={mode === "auto"}
              onClick={() => toggleMode("auto")}
            >
              {props.labels.autoLabel}
              {mode === "auto" ? " ●" : ""}
            </Button>
            <Button
              data-dialogue-playback="skip"
              aria-pressed={mode === "skip"}
              onClick={() => toggleMode("skip")}
            >
              {props.labels.skipLabel}
              {mode === "skip" ? " ●" : ""}
            </Button>
            <Button data-dialogue-history-open="true" onClick={() => setShowHistory(true)}>
              {props.labels.historyLabel}
            </Button>
            {props.quickMenuExtras ?? null}
          </div>
        </div>
      </>
    );
  }
  if (pending.kind === "choice") {
    return (
      <div
        data-dialogue="choice"
        data-dialogue-occurrence={pending.occurrenceId}
        style={panelStyle}
      >
        <p style={{ margin: "0 0 16px" }}>{uiText(pending.promptTextId)}</p>
        <div role="group" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {pending.options.map((option) => (
            <Button
              key={option.choiceId}
              data-dialogue-choice={option.choiceId}
              onClick={() =>
                onResolve(
                  pending.occurrenceId,
                  Object.freeze({ kind: "choose", choiceId: option.choiceId }),
                )}
            >
              {uiText(option.textId)}
            </Button>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

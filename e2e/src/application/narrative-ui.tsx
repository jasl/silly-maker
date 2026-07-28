// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";

import type { DeepReadonly, InteractionResolutionV1 } from "@sillymaker/base";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type {
  InputRouterV1,
  PlaybackModeV1,
  PresentationClockV1,
  TextRevealV1,
} from "@sillymaker/ui";
import {
  Button,
  createAnimationFramePresentationClockV1,
  createPlaybackControllerV1,
  createTextRevealV1,
  inputHandledV1,
  inputIgnoredV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
  useReducedMotionV1,
} from "@sillymaker/ui";

import type { LabUiPublicationV1 } from "./composition.tsx";
import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import { labUiTextV1 } from "./composition.tsx";

type LabSemanticPortV1 = LabApplicationInstanceV1["semantic"];

function labResolveV1(
  semantic: LabSemanticPortV1,
  expectedOccurrenceId: string,
  resolution: InteractionResolutionV1,
): void {
  void semantic.dispatch(
    Object.freeze({ kind: "resolve" as const, expectedOccurrenceId, resolution }),
  );
}

export interface LabNarrativePlayerInputV1 {
  readonly publication: DeepReadonly<LabUiPublicationV1>;
  readonly semantic: LabSemanticPortV1;
  readonly profile: PlayerProfileStoreV1;
  /** The composition input router for keyboard/gamepad action handling. */
  readonly input?: InputRouterV1;
  /** Injectable for deterministic tests; defaults to the rAF clock. */
  readonly clock?: PresentationClockV1;
  /** Player-controlled voice replay wired from the audio presenter. */
  replayVoice?(): boolean;
}

function useProfileVersionV1(profile: PlayerProfileStoreV1): number {
  const [version, setVersion] = useState(0);
  useEffect(() => profile.subscribe(() => setVersion((current) => current + 1)), [profile]);
  return version;
}

/**
 * The Engine Lab VN player: typewriter reveal with two-step confirm, an
 * explicit normal/auto/skip playback machine that dispatches the exact same
 * semantic resolutions a click would, a player-readable history backlog
 * from authoritative State, seen tracking into the Host profile, voice
 * replay, and hide-UI. Playback mode, reveal cursors, and hidden state are
 * UI transient — never persisted, never authoritative.
 */
export function LabNarrativePlayerV1(props: LabNarrativePlayerInputV1): ReactElement | null {
  const { publication, semantic, profile } = props;
  const narrative = publication.semantic.narrative;
  const pending = narrative.pending;
  const profileVersion = useProfileVersionV1(profile);
  const preferences = profile.current().preferences;

  const [clock] = useState<PresentationClockV1>(
    () => props.clock ?? createAnimationFramePresentationClockV1(),
  );
  const [, setPlaybackVersion] = useState(0);
  const [revealVersion, setRevealVersion] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Seen tracking: every say that lands in the authoritative history marks
  // the Host profile. Loading an older save never rewinds this.
  const markedRef = useRef(new Set<string>());
  useEffect(() => {
    for (const entry of narrative.history.entries) {
      if (entry.kind !== "say" || markedRef.current.has(entry.occurrenceId)) continue;
      markedRef.current.add(entry.occurrenceId);
      void profile.markSeen(entry.definitionId, entry.seenRevision);
    }
  }, [profile, narrative.history]);

  // Typewriter reveal: one controller per say occurrence; the cursor is
  // transient and rebuilds after load.
  const sayText = pending?.kind === "say" ? labUiTextV1(pending.textId) : null;
  const sayOccurrenceId = pending?.kind === "say" ? pending.occurrenceId : null;
  const reducedMotion = useReducedMotionV1();
  const reveal: TextRevealV1 | null = useMemo(() => {
    if (sayOccurrenceId === null || sayText === null) return null;
    return createTextRevealV1({
      textLength: sayText.length,
      charactersPerSecond: preferences.textRevealCharsPerSecond,
      clock,
      reducedMotion,
    });
    // A new occurrence or speed preference builds a fresh reveal.
  }, [sayOccurrenceId, sayText, preferences.textRevealCharsPerSecond, clock, reducedMotion]);
  useEffect(() => {
    if (reveal === null) return () => {};
    const unsubscribe = reveal.subscribe(() => setRevealVersion((current) => current + 1));
    return () => {
      unsubscribe();
      reveal.dispose();
    };
  }, [reveal]);

  // The explicit playback machine dispatches through the same resolution
  // contract as manual clicks; the queue front fences anything stale.
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
          const recorded = profile.current().seen[definitionId];
          return recorded !== undefined && recorded >= seenRevision;
        },
        advance: (occurrenceId) =>
          labResolveV1(semantic, occurrenceId, Object.freeze({ kind: "advance" as const })),
      }),
    [clock, preferences.autoWaitMs, preferences.skipPolicy, profile, semantic],
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
      }),
    );
  }, [controller, pending, revealComplete, revealVersion, profileVersion]);

  const mode = controller.mode();
  const setMode = (next: PlaybackModeV1): void => {
    controller.setMode(controller.mode() === next ? "normal" : next);
  };

  // Keyboard/gamepad actions arrive through the Input Router's narrative
  // context. The handler reads the LATEST state through this ref, consumes
  // only what the current pending interaction supports (advance resolves a
  // say through the exact same semantic contract as a click), treats the
  // player controls as pure presentation, and returns ignored for anything
  // else so unrelated actions keep routing.
  const inputStateRef = useRef<{
    sayOccurrenceId: string | null;
    reveal: TextRevealV1 | null;
    toggleMode: (next: PlaybackModeV1) => void;
    toggleHistory: () => void;
    toggleHidden: () => void;
    replayVoice: (() => boolean) | undefined;
  }>({
    sayOccurrenceId: null,
    reveal: null,
    toggleMode: () => {},
    toggleHistory: () => {},
    toggleHidden: () => {},
    replayVoice: undefined,
  });
  inputStateRef.current = {
    sayOccurrenceId,
    reveal,
    toggleMode: setMode,
    toggleHistory: () => setShowHistory((current) => !current),
    toggleHidden: () => setHidden((current) => !current),
    replayVoice: props.replayVoice,
  };
  const input = props.input;
  useEffect(() => {
    if (input === undefined) return () => {};
    return input.register({
      context: "narrative",
      handle: (event) => {
        if (event.kind !== "action") return inputIgnoredV1;
        const state = inputStateRef.current;
        if (event.actionId === systemInputActionIdsV1.narrativeAdvance) {
          if (state.sayOccurrenceId === null) return inputIgnoredV1;
          if (state.reveal !== null && !state.reveal.isComplete()) {
            state.reveal.revealAll();
            return inputHandledV1;
          }
          labResolveV1(
            semantic,
            state.sayOccurrenceId,
            Object.freeze({ kind: "advance" as const }),
          );
          return inputHandledV1;
        }
        if (event.actionId === playerInputActionIdsV1.toggleAuto) {
          state.toggleMode("auto");
          return inputHandledV1;
        }
        if (event.actionId === playerInputActionIdsV1.toggleSkip) {
          state.toggleMode("skip");
          return inputHandledV1;
        }
        if (event.actionId === playerInputActionIdsV1.toggleHistory) {
          state.toggleHistory();
          return inputHandledV1;
        }
        if (event.actionId === playerInputActionIdsV1.toggleUi) {
          state.toggleHidden();
          return inputHandledV1;
        }
        if (event.actionId === playerInputActionIdsV1.replayVoice) {
          return state.replayVoice?.() === true ? inputHandledV1 : inputIgnoredV1;
        }
        return inputIgnoredV1;
      },
    });
  }, [input, semantic]);

  if (hidden) {
    // Hide UI is pure presentation: authoritative State is untouched and
    // the pending interaction stays exactly where it was.
    return (
      <Button data-lab-player="show-ui" onClick={() => setHidden(false)}>
        {labUiTextV1("text.e2e.lab.player.show_ui")}
      </Button>
    );
  }

  return (
    <div data-lab-player="root" data-lab-playback-mode={mode}>
      <div role="group" aria-label={labUiTextV1("text.e2e.lab.player.controls")}>
        <Button
          data-lab-player="auto"
          aria-pressed={mode === "auto"}
          onClick={() => setMode("auto")}
        >
          {labUiTextV1("text.e2e.lab.player.auto")}
        </Button>
        <Button
          data-lab-player="skip"
          aria-pressed={mode === "skip"}
          onClick={() => setMode("skip")}
        >
          {labUiTextV1("text.e2e.lab.player.skip")}
        </Button>
        <Button
          data-lab-player="history"
          aria-pressed={showHistory}
          onClick={() => setShowHistory((current) => !current)}
        >
          {labUiTextV1("text.e2e.lab.player.history")}
        </Button>
        <Button data-lab-player="hide-ui" onClick={() => setHidden(true)}>
          {labUiTextV1("text.e2e.lab.player.hide_ui")}
        </Button>
        {pending?.kind === "say" && props.replayVoice !== undefined ? (
          <Button data-lab-player="replay-voice" onClick={() => props.replayVoice?.()}>
            {labUiTextV1("text.e2e.lab.player.replay_voice")}
          </Button>
        ) : null}
      </div>

      {showHistory ? (
        <section
          data-lab-player="history-panel"
          aria-label={labUiTextV1("text.e2e.lab.player.history")}
        >
          <ol>
            {narrative.history.entries.map((entry) => (
              <li key={entry.occurrenceId} data-lab-history-kind={entry.kind}>
                {entry.speakerTextId === null ? null : (
                  <strong>{labUiTextV1(entry.speakerTextId)}：</strong>
                )}
                {labUiTextV1(entry.textId)}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <LabPendingInteractionV1
        publication={publication}
        semantic={semantic}
        reveal={reveal}
        sayText={sayText}
      />
    </div>
  );
}

/** Renders the pending boundary; say lines run the typewriter two-step. */
function LabPendingInteractionV1(props: {
  readonly publication: DeepReadonly<LabUiPublicationV1>;
  readonly semantic: LabSemanticPortV1;
  readonly reveal: TextRevealV1 | null;
  readonly sayText: string | null;
}): ReactElement | null {
  const { publication, semantic, reveal, sayText } = props;
  const narrative = publication.semantic.narrative;
  const pending = narrative.pending;

  // Pause boundaries auto-resume after their duration; stale timers are
  // rejected at the queue front.
  const pauseOccurrenceId = pending?.kind === "pause" ? pending.occurrenceId : null;
  const pauseDurationMs = pending?.kind === "pause" ? pending.durationMs : null;
  useEffect(() => {
    if (pauseOccurrenceId === null || pauseDurationMs === null) return () => {};
    const timer = setTimeout(() => {
      labResolveV1(semantic, pauseOccurrenceId, Object.freeze({ kind: "resume" as const }));
    }, pauseDurationMs);
    return () => clearTimeout(timer);
  }, [semantic, pauseOccurrenceId, pauseDurationMs]);

  if (pending === null) {
    return narrative.phase === "completed" && narrative.calibration !== null ? (
      <p data-lab-narrative="calibrated">
        {labUiTextV1("text.e2e.lab.narrative.cal.done")}（{String(narrative.calibration)}）
      </p>
    ) : null;
  }

  if (pending.kind === "say") {
    const revealed =
      reveal === null || sayText === null
        ? (sayText ?? "")
        : sayText.slice(0, reveal.revealedCharacters());
    const complete = reveal?.isComplete() ?? true;
    return (
      <div data-lab-interaction="say" data-lab-occurrence={pending.occurrenceId}>
        {pending.speakerTextId === null ? null : (
          <strong>{labUiTextV1(pending.speakerTextId)}</strong>
        )}
        <p data-lab-say-reveal={complete ? "complete" : "revealing"}>{revealed}</p>
        <Button
          onClick={() => {
            // Two-step confirm: the first activation reveals the full text,
            // only the second resolves the say.
            if (reveal !== null && !reveal.isComplete()) {
              reveal.revealAll();
              return;
            }
            labResolveV1(
              semantic,
              pending.occurrenceId,
              Object.freeze({ kind: "advance" as const }),
            );
          }}
        >
          {labUiTextV1("text.e2e.lab.narrative.cal.advance")}
        </Button>
      </div>
    );
  }

  if (pending.kind === "choice") {
    return (
      <div data-lab-interaction="choice" data-lab-occurrence={pending.occurrenceId}>
        <p>{labUiTextV1(pending.promptTextId)}</p>
        <div role="group" aria-label={labUiTextV1(pending.promptTextId)}>
          {(narrative.choiceOptions ?? []).map((option) => (
            <Button
              key={option.choiceId}
              disabled={!option.enabled}
              data-lab-choice-id={option.choiceId}
              title={
                option.blockedBy === null
                  ? undefined
                  : labUiTextV1("text.e2e.lab.narrative.cal.precise.locked")
              }
              onClick={() =>
                labResolveV1(
                  semantic,
                  pending.occurrenceId,
                  Object.freeze({ kind: "choose" as const, choiceId: option.choiceId }),
                )
              }
            >
              {labUiTextV1(option.textId)}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (pending.kind === "pause") {
    return (
      <div data-lab-interaction="pause" data-lab-occurrence={pending.occurrenceId}>
        <p>{labUiTextV1("text.e2e.lab.narrative.cal.waiting")}</p>
        {pending.skippable ? (
          <Button
            onClick={() =>
              labResolveV1(
                semantic,
                pending.occurrenceId,
                Object.freeze({ kind: "resume" as const }),
              )
            }
          >
            {labUiTextV1("text.e2e.lab.narrative.cal.skip")}
          </Button>
        ) : null}
      </div>
    );
  }

  if (pending.kind === "custom") {
    const min = typeof pending.params.min === "number" ? pending.params.min : 1;
    const max = typeof pending.params.max === "number" ? pending.params.max : 1;
    const values = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
    return (
      <div data-lab-interaction="custom" data-lab-occurrence={pending.occurrenceId}>
        <p>{labUiTextV1("text.e2e.lab.narrative.cal.dial")}</p>
        <div role="group" aria-label={labUiTextV1("text.e2e.lab.narrative.cal.dial")}>
          {values.map((value) => (
            <Button
              key={value}
              data-lab-dial-value={value}
              onClick={() =>
                labResolveV1(
                  semantic,
                  pending.occurrenceId,
                  Object.freeze({ kind: "custom" as const, payload: Object.freeze({ value }) }),
                )
              }
            >
              {String(value)}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <p data-lab-interaction="barrier" data-lab-occurrence={pending.occurrenceId}>
      {labUiTextV1("text.e2e.lab.narrative.cal.waiting")}
    </p>
  );
}

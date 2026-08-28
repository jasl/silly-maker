// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import type { DeepReadonly, StrictJsonObjectV1, TimeTickV1 } from "@sillymaker/base";
import type {
  NarrativeSurfaceDefinitionV1,
  NarrativeSurfaceDialogueRendererPropsV1,
  NarrativeSurfaceHistoryRendererPropsV1,
  NarrativeSurfaceResolutionRequestV1,
  NarrativeSurfaceSelectionV1,
} from "@sillymaker/ui";
import { Button, defineNarrativeSurfaceV1, useStagePointerGestureFenceV1 } from "@sillymaker/ui";

import { labCancelChoiceIdV1 } from "../gameplay/narrative-runtime.ts";
import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import { labUiTextV1 } from "./ui-text.ts";

type LabSemanticPublicationV1 = ReturnType<LabApplicationInstanceV1["semantic"]["observe"]>;

const noChoiceReasonsV1: readonly string[] = [];
const lockedChoiceReasonsV1 = [
  "text.e2e.lab.narrative.cal.precise.locked",
];

/** Projects the current semantic publication into the one production Narrative selection. */
export function projectLabNarrativeSurfaceSelectionV1(
  publication: LabSemanticPublicationV1,
): NarrativeSurfaceSelectionV1 {
  const narrative = publication.narrative;
  const pending = narrative.pending;
  const choiceAvailability = pending?.kind === "choice"
    ? (pending.options.map((option, index) => {
      const observed = narrative.choiceOptions?.[index];
      const enabled = observed?.choiceId === option.choiceId && observed.enabled;
      return ({
        choiceId: option.choiceId,
        status: enabled ? "enabled" as const : "disabled" as const,
        reasonTextIds: enabled ? noChoiceReasonsV1 : lockedChoiceReasonsV1,
      });
    }))
    : null;
  return ({
    pending,
    history: narrative.history,
    choiceAvailability,
  });
}

/** Creates the Engine Lab's high-level production Narrative declaration. */
export function createLabNarrativeSurfaceDefinitionV1(
  input: Readonly<{
    readonly semantic: LabApplicationInstanceV1["semantic"];
    readonly replayCurrentVoice: () => boolean;
  }>,
): NarrativeSurfaceDefinitionV1<LabSemanticPublicationV1> {
  return defineNarrativeSurfaceV1({
    selectNarrative: projectLabNarrativeSurfaceSelectionV1,
    dispatchResolution: async (request: NarrativeSurfaceResolutionRequestV1) => {
      await input.semantic.dispatch({
        kind: "resolve" as const,
        expectedOccurrenceId: request.expectedOccurrenceId,
        resolution: request.resolution,
      });
    },
    dispatchTime: async (tick: DeepReadonly<TimeTickV1>) => {
      await input.semantic.dispatch({
        kind: "time" as const,
        tick,
      });
    },
    renderer: LabNarrativeDialogueRendererV1,
    history: { renderer: LabNarrativeHistoryRendererV1 },
    resolveText: (_locale: string | null, textId: string) => labUiTextV1(textId),
    replayCurrentVoice: input.replayCurrentVoice,
  });
}

/** Passive History skin selected explicitly beside the Engine Lab dialogue renderer. */
export function LabNarrativeHistoryRendererV1(
  props: NarrativeSurfaceHistoryRendererPropsV1,
): ReactElement {
  return (
    <section
      data-dialogue-history="true"
      data-lab-player="history-panel"
      aria-label={labUiTextV1("text.e2e.lab.player.history")}
    >
      <ol>
        {props.history.entries.map((entry) => (
          <li key={entry.occurrenceId} data-lab-history-kind={entry.kind}>
            {entry.speakerTextId === null
              ? null
              : <strong>{props.resolveText(entry.speakerTextId)}：</strong>}
            {props.resolveText(entry.textId)}
          </li>
        ))}
      </ol>
      <Button data-lab-player="history-close" onClick={props.onCloseHistory}>
        关闭回顾
      </Button>
    </section>
  );
}

/** Passive dialogue skin over composition-owned player state and fenced callbacks. */
export function LabNarrativeDialogueRendererV1(
  props: NarrativeSurfaceDialogueRendererPropsV1,
): ReactElement {
  const mode = props.playerView.playbackMode;
  return (
    <div data-lab-player="root" data-lab-playback-mode={mode}>
      <div role="group" aria-label={labUiTextV1("text.e2e.lab.player.controls")}>
        <Button
          data-lab-player="auto"
          aria-pressed={mode === "auto"}
          onClick={props.onToggleAuto}
        >
          {labUiTextV1("text.e2e.lab.player.auto")}
        </Button>
        <Button
          data-lab-player="skip"
          aria-pressed={mode === "skip"}
          onClick={props.onToggleSkip}
        >
          {labUiTextV1("text.e2e.lab.player.skip")}
        </Button>
        {props.history === null ? null : (
          <Button
            data-dialogue-history-open="true"
            data-lab-player="history"
            disabled={!props.history.available}
            onClick={props.history.onOpen}
          >
            {labUiTextV1("text.e2e.lab.player.history")}
          </Button>
        )}
        {props.pending.kind === "say"
          ? (
            <Button data-lab-player="replay-voice" onClick={props.onReplayVoice}>
              {labUiTextV1("text.e2e.lab.player.replay_voice")}
            </Button>
          )
          : null}
      </div>
      <LabPendingNarrativeV1 {...props} />
    </div>
  );
}

function LabPendingNarrativeV1(
  props: NarrativeSurfaceDialogueRendererPropsV1,
): ReactElement {
  const pending = props.pending;
  const armDismissFence = useStagePointerGestureFenceV1("narrative");
  if (pending.kind === "say") {
    const view = props.playerView.kind === "say" ? props.playerView : null;
    const text = view?.resolvedText ?? props.resolveText(pending.textId);
    const speakerText = view?.resolvedSpeakerText ??
      (pending.speakerTextId === null ? null : props.resolveText(pending.speakerTextId));
    const revealedCharacters = view?.revealedCharacters ?? 0;
    const revealComplete = view?.revealComplete ?? false;
    return (
      <div data-lab-interaction="say" data-lab-occurrence={pending.occurrenceId}>
        {speakerText === null ? null : <strong>{speakerText}</strong>}
        <p data-lab-say-reveal={revealComplete ? "complete" : "revealing"}>
          {text.slice(0, revealedCharacters)}
        </p>
        <Button onClick={props.onActivate}>
          {labUiTextV1("text.e2e.lab.narrative.cal.advance")}
        </Button>
      </div>
    );
  }

  if (pending.kind === "choice") {
    return (
      <div data-lab-interaction="choice" data-lab-occurrence={pending.occurrenceId}>
        <p>{props.resolveText(pending.promptTextId)}</p>
        <div role="group" aria-label={props.resolveText(pending.promptTextId)}>
          {pending.options.map((option, index) => {
            const availability = props.choiceAvailability?.[index];
            const disabled = availability?.choiceId !== option.choiceId ||
              availability.status !== "enabled";
            const reasonTextId = availability?.reasonTextIds[0];
            if (option.choiceId === labCancelChoiceIdV1) {
              return (
                <Button
                  key={option.choiceId}
                  disabled={disabled}
                  data-lab-choice-id={option.choiceId}
                  data-lab-choice-cancel="true"
                  title={reasonTextId === undefined ? undefined : props.resolveText(reasonTextId)}
                  onPointerUp={(event) => {
                    if (event.button !== 0) return;
                    armDismissFence(event);
                    props.onChoose(option.choiceId);
                  }}
                  onClick={(event) => {
                    if (event.detail !== 0) return;
                    props.onChoose(option.choiceId);
                  }}
                >
                  {props.resolveText(option.textId)}
                </Button>
              );
            }
            return (
              <Button
                key={option.choiceId}
                disabled={disabled}
                data-lab-choice-id={option.choiceId}
                title={reasonTextId === undefined ? undefined : props.resolveText(reasonTextId)}
                onClick={() => props.onChoose(option.choiceId)}
              >
                {props.resolveText(option.textId)}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  if (pending.kind === "hold") {
    return (
      <div data-lab-interaction="hold" data-lab-occurrence={pending.occurrenceId}>
        <p>{labUiTextV1("text.e2e.lab.narrative.cal.waiting")}</p>
        {pending.skippable
          ? (
            <Button data-lab-resume="true" onClick={props.onResume}>
              {labUiTextV1("text.e2e.lab.narrative.cal.skip")}
            </Button>
          )
          : null}
      </div>
    );
  }

  if (pending.kind === "custom") {
    const min = typeof pending.params.min === "number" ? pending.params.min : 1;
    const max = typeof pending.params.max === "number" ? pending.params.max : 1;
    const values = Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => min + index);
    return (
      <div
        data-lab-interaction="custom"
        data-lab-occurrence={pending.occurrenceId}
        data-lab-custom-surface={pending.surfaceId}
      >
        <p>{labUiTextV1("text.e2e.lab.narrative.cal.dial")}</p>
        <div role="group" aria-label={labUiTextV1("text.e2e.lab.narrative.cal.dial")}>
          {values.map((value) => (
            <Button
              key={value}
              data-lab-dial-value={value}
              onClick={() => props.onSubmitCustom(({ value }) satisfies StrictJsonObjectV1)}
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

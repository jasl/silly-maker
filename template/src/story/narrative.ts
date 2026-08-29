// SPDX-License-Identifier: MIT
import type {
  InteractionResolutionContext,
  InteractionResolution,
  NarrativeHistory,
  PendingInteraction,
  SemanticStageState,
  TimeTick,
} from "@sillymaker/base/story";
import { emptyNarrativeHistory } from "@sillymaker/base/story";
import { createVnInteractionRuntimeV1 } from "@sillymaker/vn/interaction";

import type {
  TemplateChoiceEffectV1,
  TemplateChoiceOptionV1,
  TemplateInteractionDocV1,
  TemplateNarrativeNodeV1,
  TemplatePredicateV1,
  TemplateSceneBindingV1,
} from "./narrative-kit.ts";
import { compileTemplateInteractionDocV1 } from "./narrative-kit.ts";
import { templateOpeningCueIdsV1, templateOpeningSceneV1 } from "../scenes/opening/index.ts";

export type { TemplateChoiceOptionV1, TemplateNarrativeNodeV1 } from "./narrative-kit.ts";

/**
 * The starter narrative: a pure-data interaction document compiled by the
 * kit in `narrative-kit.ts`, not a DSL. Authors edit control and stable text
 * references here; dialogue copy lives in the build-known content packs and
 * resident UI copy in `presentation.ts`. The runner below almost never changes.
 *
 * Block kinds:
 * - `say`     one line of dialogue; stops and waits for the player.
 * - `stage`   scene ops (open / cue by short key) or `setAppearance`.
 * - `choice`  a menu; each option may set flags and move to its own block.
 * - `branch`  declarative flag routing; the last case may be the else arm.
 * - `hold`    holds the screen for an authoritative duration; expiry (or a
 *             skippable hold's fold) advances. Optional `ops` open a stage
 *             batch before the wait; optional `when` arms abort the wait
 *             the instant a declared flag condition holds (evaluated at
 *             open and at every hold-fenced settlement, first match wins).
 *             Remaining time is authoritative State.
 * - `end`     finishes the narrative run.
 *
 * The Engine Lab (`e2e`) additionally demonstrates `barrier`
 * (transition-acknowledged) and `custom` interaction surfaces.
 */

export interface TemplateNarrativeStateV1 {
  readonly phase: "idle" | "active" | "completed";
  /** The node the runner executes next; null when idle/completed. */
  readonly cursor: string | null;
  readonly pending: PendingInteraction | null;
  /** Monotonic occurrence sequence; never resets, so re-entry re-fences. */
  readonly sequence: number;
  /** Sorted unique story flags set by choices; branches route on them. */
  readonly flags: readonly string[];
  /** The player-readable backlog; enters Saves and restores exactly. */
  readonly history: NarrativeHistory;
}

export function createInitialTemplateNarrativeStateV1(): TemplateNarrativeStateV1 {
  return ({
    phase: "idle" as const,
    cursor: null,
    pending: null,
    sequence: 0,
    flags: [],
    history: emptyNarrativeHistory,
  });
}

/** Stage vocabulary shared by the script and the content catalog. */
export const templateLayersV1 = {
  background: "layer.template.background",
  characters: "layer.template.characters",
};

export const templateTagsV1 = {
  background: "tag.background",
  mei: "tag.mei",
};

export const templateContentIdsV1 = {
  backgroundCourtyard: "content.template.background.courtyard",
  backgroundStudy: "content.template.background.study",
  characterMei: "content.template.character.mei",
  effectMist: "content.template.effect.mist",
};

export const templateEntryNodeIdV1 = "node.template.opening";
export const templateCatFlagV1 = "flag.template.cat_found";
/** Set by the hurried option; the fetch hold's `when` arm reroutes on it. */
export const templateHurriedFlagV1 = "flag.template.hurried";

/** Scene short names the document's stage ops resolve against. */
const templateSceneRegistryV1: Readonly<Record<string, TemplateSceneBindingV1>> = {
  opening: {
    scene: templateOpeningSceneV1,
    cues: {
      courtyard: templateOpeningCueIdsV1.courtyard,
      mist: templateOpeningCueIdsV1.mist,
      meiEnters: templateOpeningCueIdsV1.meiEnters,
      meiFetches: templateOpeningCueIdsV1.meiFetches,
      meiReturns: templateOpeningCueIdsV1.meiReturns,
    },
  },
};

/**
 * The placeholder scene: a short "rain has just stopped" vignette proving
 * every block kind once. Replace it wholesale when starting a real game.
 * Visual composition (entries, placements, entrance motion) lives in
 * `src/scenes/opening/opening.authoring-scene.json`; stage blocks reference its cues
 * by short key (idempotent ensure semantics — re-entry never double-shows
 * content).
 *
 * The document is pure control data. Dialogue copy lives in build-known
 * content packs; explicit text IDs keep the runtime plan small and stable
 * while tooling can join the same IDs back to authoring copy. Admission
 * still rejects unknown speakers, duplicate names, unresolved jumps, and
 * bad stage ops at construction time.
 */
export const templateOpeningDocV1: TemplateInteractionDocV1 = {
  prefix: "template",
  docId: "doc.template.opening",
  speakers: { mei: { textId: "text.template.speaker.mei" } },
  entry: "opening",
  blocks: [
    {
      kind: "stage",
      name: "opening",
      // The courtyard plus its drifting mist band (the mist entry declares
      // an ambient loop in the scene document; the stage samples it while
      // the entry stays settled).
      ops: [{ scene: "opening", cue: "courtyard" }, { scene: "opening", cue: "mist" }],
      next: "mei-enters",
    },
    {
      kind: "stage",
      name: "mei-enters",
      ops: [{ scene: "opening", cue: "meiEnters" }],
      next: "greeting",
    },
    {
      kind: "say",
      name: "greeting",
      speaker: "mei",
      textId: "text.template.line.greeting",
      next: "first-choice",
    },
    {
      kind: "choice",
      name: "first-choice",
      // Keeps the pre-kit textId so existing saves and digests hold.
      promptTextId: "text.template.choice.prompt",
      options: [
        {
          name: "look",
          textId: "text.template.choice.look",
          setFlags: [templateCatFlagV1],
          next: "cat-line",
        },
        {
          // The hurried path proves the hold `when` arm: the flag set here
          // reroutes the fetch hold at entry, so the off-frame wait never
          // opens and the close-up line plays instead.
          name: "hurry",
          textId: "text.template.choice.hurry",
          setFlags: [templateCatFlagV1, templateHurriedFlagV1],
          next: "cat-line",
        },
        {
          name: "inside",
          textId: "text.template.choice.inside",
          next: "inside-line",
        },
      ],
    },
    {
      kind: "say",
      name: "cat-line",
      speaker: "mei",
      // Keeps the pre-kit textId so existing saves and digests hold.
      textId: "text.template.line.cat",
      next: "mei-smiles",
    },
    {
      kind: "stage",
      name: "mei-smiles",
      // Mid-scene appearance beats stay script-owned: scene cues cover
      // show/hide composition, not expression changes on standing content.
      ops: [
        {
          setAppearance: {
            layerId: templateLayersV1.characters,
            tag: templateTagsV1.mei,
            appearance: { expression: "smiling" },
          },
        },
      ],
      next: "mei-fetches",
    },
    {
      kind: "hold",
      name: "mei-fetches",
      // Mid-beat exit: Mei darts to the eaves for the kitten. Both edges of
      // this beat are explicit cuts in the scene document — her return
      // shares the enter edge with the ceremonial entrance motion, and the
      // dispatch context (cue identity) selects which presentation plays.
      // The opening ops commit before the wait (never a silent flash), then
      // the screen holds for an authoritative 600ms while she is off-frame;
      // remaining time is saveable State, so a mid-hold load resumes the
      // beat instead of replaying a wall clock.
      //
      // The `when` arm is the declared-condition abort: a player who
      // hurried over is already at the eaves, so the wait reroutes to the
      // close-up line the instant the condition holds — here at hold open,
      // because the flag was set before the hold; a flag written mid-hold
      // would cut the timeline at that instant instead.
      ops: [{ scene: "opening", cue: "meiFetches" }],
      durationMs: 600,
      when: [{ when: { flag: templateHurriedFlagV1 }, next: "hurry-line" }],
      next: "fetch-line",
    },
    {
      kind: "say",
      name: "fetch-line",
      speaker: null,
      textId: "text.template.line.fetch-line",
      next: "mei-returns",
    },
    {
      kind: "say",
      name: "hurry-line",
      speaker: null,
      textId: "text.template.line.hurry-line",
      next: "mei-returns",
    },
    {
      kind: "stage",
      name: "mei-returns",
      ops: [{ scene: "opening", cue: "meiReturns" }],
      next: "ending-gate",
    },
    {
      kind: "say",
      name: "inside-line",
      speaker: null,
      // Keeps the pre-kit textId so existing saves and digests hold.
      textId: "text.template.line.inside",
      next: "ending-gate",
    },
    {
      kind: "branch",
      name: "ending-gate",
      cases: [
        { when: { flag: templateCatFlagV1 }, next: "ending-warm" },
        { next: "ending-plain" },
      ],
    },
    {
      kind: "say",
      name: "ending-warm",
      speaker: "mei",
      textId: "text.template.line.ending-warm",
      next: "close",
    },
    {
      kind: "say",
      name: "ending-plain",
      speaker: null,
      textId: "text.template.line.ending-plain",
      next: "close",
    },
    { kind: "end", name: "close" },
  ],
};

export const templateCompiledOpeningV1 = compileTemplateInteractionDocV1({
  doc: templateOpeningDocV1,
  scenes: templateSceneRegistryV1,
});

export const templateScriptV1: readonly TemplateNarrativeNodeV1[] = templateCompiledOpeningV1.nodes;

function withFlagsV1(flags: readonly string[], added: readonly string[]): readonly string[] {
  if (added.length === 0) return flags;
  return [...new Set([...flags, ...added])].toSorted();
}

const templateNarrativeRuntimeV1 = createVnInteractionRuntimeV1<
  TemplateNarrativeStateV1,
  TemplateChoiceEffectV1,
  TemplatePredicateV1
>({
  entryNodeId: templateCompiledOpeningV1.entryNodeId,
  nodes: templateCompiledOpeningV1.nodes,
  errorPrefix: "template",
  matchesPredicate: (state, predicate) => state.flags.includes(predicate.flag),
  applyChoiceEffect: (state, effect) => ({
    ...state,
    flags: withFlagsV1(state.flags, effect.setFlags),
  }),
});

export const templateNodeIdsV1: readonly string[] = templateNarrativeRuntimeV1.nodeIds;

export function templateChoiceOptionsForV1(
  definitionId: string,
): readonly TemplateChoiceOptionV1[] {
  return templateNarrativeRuntimeV1.choiceOptionsFor(definitionId);
}

/** The single choice-availability rule shared by view, preview, and dispatch. */
export function templateChoiceBlockedByV1(
  option: TemplateChoiceOptionV1,
  coins: number,
): "template.insufficient_coins" | null {
  const cost = option.effect?.consumesCoins ?? 0;
  return coins >= cost ? null : "template.insufficient_coins";
}

/**
 * The one resolution context shared by the action catalog, preview, and
 * queue-front dispatch, so all three surfaces agree on availability.
 */
export function templateInteractionContextV1(
  pending: PendingInteraction | null,
  coins: number,
): InteractionResolutionContext {
  return {
    isChoiceEnabled(choiceId: string): boolean {
      if (pending === null || pending.kind !== "choice") return false;
      const option = templateChoiceOptionsForV1(pending.definitionId).find(
        (candidate) => candidate.choiceId === choiceId,
      );
      return option !== undefined && templateChoiceBlockedByV1(option, coins) === null;
    },
    isCustomPayloadValid(): boolean {
      return false;
    },
  };
}

export type TemplateNarrativeRunResultV1 = ReturnType<
  typeof templateNarrativeRuntimeV1.runUntilInteraction
>;

export function runTemplateNarrativeUntilInteractionV1(
  narrative: TemplateNarrativeStateV1,
  stage: SemanticStageState,
): TemplateNarrativeRunResultV1 {
  return templateNarrativeRuntimeV1.runUntilInteraction(narrative, stage);
}

export function templateNarrativeAfterResolutionV1(
  narrative: TemplateNarrativeStateV1,
  resolution: InteractionResolution,
): TemplateNarrativeStateV1 {
  return templateNarrativeRuntimeV1.afterResolution(narrative, resolution);
}

export type TemplateNarrativeTimeContinuationV1 = ReturnType<
  typeof templateNarrativeRuntimeV1.afterTimeTick
>;

export function templateNarrativeAfterTimeTickV1(
  narrative: TemplateNarrativeStateV1,
  tick: TimeTick,
): TemplateNarrativeTimeContinuationV1 {
  return templateNarrativeRuntimeV1.afterTimeTick(narrative, tick);
}

export function templateNarrativeAtBeginV1(
  narrative: TemplateNarrativeStateV1,
): TemplateNarrativeStateV1 {
  return templateNarrativeRuntimeV1.atBegin(narrative);
}

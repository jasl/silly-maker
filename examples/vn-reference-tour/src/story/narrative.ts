// SPDX-License-Identifier: MIT
import type {
  InteractionResolutionContext,
  InteractionResolution,
  NarrativeHistory,
  PendingInteraction,
  SemanticStageState,
  StageCueDispatch,
  StageMutation,
  TimeTick,
} from "@sillymaker/base/story";
import {
  appendNarrativeHistory,
  interactionOccurrenceId,
  emptyNarrativeHistory,
  parsePendingInteraction,
  reduceAdmittedStageMutations,
  settleHoldTimeline,
} from "@sillymaker/base/story";

import type {
  VnReferenceTourChoiceOptionV1,
  VnReferenceTourInteractionDocV1,
  VnReferenceTourNarrativeNodeV1,
  VnReferenceTourSceneBindingV1,
} from "./narrative-kit.ts";
import { compileVnReferenceTourInteractionDocV1 } from "./narrative-kit.ts";
import {
  vnReferenceTourOpeningCueIdsV1,
  vnReferenceTourOpeningSceneV1,
} from "../scenes/opening/index.ts";

export type {
  VnReferenceTourChoiceOptionV1,
  VnReferenceTourNarrativeNodeV1,
} from "./narrative-kit.ts";

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
 *             batch before the wait. Remaining time is authoritative State.
 * - `end`     finishes the narrative run.
 *
 * The Engine Lab (`e2e`) additionally demonstrates `barrier`
 * (transition-acknowledged) and `custom` interaction surfaces.
 */

export interface VnReferenceTourNarrativeStateV1 {
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

export function createInitialVnReferenceTourNarrativeStateV1(): VnReferenceTourNarrativeStateV1 {
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
export const vnReferenceTourLayersV1 = {
  background: "layer.vn-reference-tour.background",
  characters: "layer.vn-reference-tour.characters",
};

export const vnReferenceTourTagsV1 = {
  background: "tag.background",
  mei: "tag.mei",
};

export const vnReferenceTourContentIdsV1 = {
  backgroundCourtyard: "content.vn-reference-tour.background.courtyard",
  backgroundStudy: "content.vn-reference-tour.background.study",
  characterMei: "content.vn-reference-tour.character.mei",
  effectMist: "content.vn-reference-tour.effect.mist",
};

export const vnReferenceTourEntryNodeIdV1 = "node.vn-reference-tour.opening";
export const vnReferenceTourCatFlagV1 = "flag.vn-reference-tour.cat_found";

/** Scene short names the document's stage ops resolve against. */
const vnReferenceTourSceneRegistryV1: Readonly<Record<string, VnReferenceTourSceneBindingV1>> = {
  opening: {
    scene: vnReferenceTourOpeningSceneV1,
    cues: {
      courtyard: vnReferenceTourOpeningCueIdsV1.courtyard,
      mist: vnReferenceTourOpeningCueIdsV1.mist,
      meiEnters: vnReferenceTourOpeningCueIdsV1.meiEnters,
      meiFetches: vnReferenceTourOpeningCueIdsV1.meiFetches,
      meiReturns: vnReferenceTourOpeningCueIdsV1.meiReturns,
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
export const vnReferenceTourOpeningDocV1: VnReferenceTourInteractionDocV1 = {
  prefix: "vn-reference-tour",
  docId: "doc.vn-reference-tour.opening",
  speakers: { mei: { textId: "text.vn-reference-tour.speaker.mei" } },
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
      textId: "text.vn-reference-tour.line.greeting",
      next: "first-choice",
    },
    {
      kind: "choice",
      name: "first-choice",
      // Explicit while this M0 scaffold is replaced atomically in M1.
      promptTextId: "text.vn-reference-tour.choice.prompt",
      options: [
        {
          name: "look",
          textId: "text.vn-reference-tour.choice.look",
          setFlags: [vnReferenceTourCatFlagV1],
          next: "cat-line",
        },
        {
          name: "inside",
          textId: "text.vn-reference-tour.choice.inside",
          next: "inside-line",
        },
      ],
    },
    {
      kind: "say",
      name: "cat-line",
      speaker: "mei",
      // Explicit while this M0 scaffold is replaced atomically in M1.
      textId: "text.vn-reference-tour.line.cat",
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
            layerId: vnReferenceTourLayersV1.characters,
            tag: vnReferenceTourTagsV1.mei,
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
      ops: [{ scene: "opening", cue: "meiFetches" }],
      durationMs: 600,
      next: "fetch-line",
    },
    {
      kind: "say",
      name: "fetch-line",
      speaker: null,
      textId: "text.vn-reference-tour.line.fetch-line",
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
      // Explicit while this M0 scaffold is replaced atomically in M1.
      textId: "text.vn-reference-tour.line.inside",
      next: "ending-gate",
    },
    {
      kind: "branch",
      name: "ending-gate",
      cases: [
        { when: { flag: vnReferenceTourCatFlagV1 }, next: "ending-warm" },
        { next: "ending-plain" },
      ],
    },
    {
      kind: "say",
      name: "ending-warm",
      speaker: "mei",
      textId: "text.vn-reference-tour.line.ending-warm",
      next: "close",
    },
    {
      kind: "say",
      name: "ending-plain",
      speaker: null,
      textId: "text.vn-reference-tour.line.ending-plain",
      next: "close",
    },
    { kind: "end", name: "close" },
  ],
};

export const vnReferenceTourCompiledOpeningV1 = compileVnReferenceTourInteractionDocV1({
  doc: vnReferenceTourOpeningDocV1,
  scenes: vnReferenceTourSceneRegistryV1,
});

export const vnReferenceTourScriptV1: readonly VnReferenceTourNarrativeNodeV1[] =
  vnReferenceTourCompiledOpeningV1.nodes;

const nodesByIdV1: ReadonlyMap<string, VnReferenceTourNarrativeNodeV1> = new Map(
  vnReferenceTourScriptV1.map((node) => [node.nodeId, node]),
);

export const vnReferenceTourNodeIdsV1: readonly string[] = vnReferenceTourScriptV1.map((node) =>
  node.nodeId
);

function requireNodeV1(nodeId: string): VnReferenceTourNarrativeNodeV1 {
  const node = nodesByIdV1.get(nodeId);
  if (node === undefined) throw new TypeError(`vn-reference-tour.narrative_node_missing:${nodeId}`);
  return node;
}

export function vnReferenceTourChoiceOptionsForV1(
  definitionId: string,
): readonly VnReferenceTourChoiceOptionV1[] {
  for (const node of vnReferenceTourScriptV1) {
    if (node.kind === "choice" && node.definitionId === definitionId) return node.options;
  }
  return [];
}

/**
 * The one resolution context shared by the action catalog, preview, and
 * queue-front dispatch, so all three surfaces agree on availability.
 */
export function vnReferenceTourInteractionContextV1(
  pending: PendingInteraction | null,
): InteractionResolutionContext {
  return {
    isChoiceEnabled(choiceId: string): boolean {
      if (pending === null || pending.kind !== "choice") return false;
      const option = vnReferenceTourChoiceOptionsForV1(pending.definitionId).find(
        (candidate) => candidate.choiceId === choiceId,
      );
      return option !== undefined;
    },
    isCustomPayloadValid(): boolean {
      return false;
    },
  };
}

export interface VnReferenceTourNarrativeRunResultV1 {
  readonly narrative: VnReferenceTourNarrativeStateV1;
  readonly stageMutations: readonly StageMutation[];
  /**
   * Presentation edge context for this run's stage mutations: the scene
   * dispatches of every stage node that actually mutated the stage, in
   * execution order. Idempotent re-entries (no mutations) contribute none.
   */
  readonly stageDispatches: readonly StageCueDispatch[];
}

function pendingForNodeV1(
  node: VnReferenceTourNarrativeNodeV1,
  sequence: number,
): PendingInteraction {
  const occurrenceId = interactionOccurrenceId(sequence);
  switch (node.kind) {
    case "say":
      return parsePendingInteraction({
        kind: "say",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        speakerTextId: node.speakerTextId,
        textId: node.textId,
        advancePolicy: "confirm",
      });
    case "choice":
      return parsePendingInteraction({
        kind: "choice",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        promptTextId: node.promptTextId,
        options: node.options.map(({ choiceId, textId }) => ({ choiceId, textId })),
      });
    case "hold":
      return parsePendingInteraction({
        kind: "hold",
        definitionId: node.definitionId,
        seenRevision: node.seenRevision,
        occurrenceId,
        totalMs: node.durationMs,
        remainingMs: node.durationMs,
        skippable: node.skippable,
      });
    default:
      throw new TypeError(`vn-reference-tour.narrative_node_not_interactive:${node.nodeId}`);
  }
}

/**
 * Executes pure nodes from the cursor until the next interaction boundary
 * or the end of the script. Stage mutations are collected for the stage
 * owner and applied to a local view so later nodes observe them.
 * Deterministic: the same narrative state and stage produce the same result.
 */
export function runVnReferenceTourNarrativeUntilInteractionV1(
  narrative: VnReferenceTourNarrativeStateV1,
  stage: SemanticStageState,
): VnReferenceTourNarrativeRunResultV1 {
  if (narrative.cursor === null) {
    throw new TypeError("vn-reference-tour.narrative_cursor_missing");
  }
  let cursor: string | null = narrative.cursor;
  let sequence = narrative.sequence;
  let localStage = stage;
  const collected: StageMutation[] = [];
  const collectedDispatches: StageCueDispatch[] = [];

  for (let steps = 0; steps < 64; steps += 1) {
    if (cursor === null) break;
    const node = requireNodeV1(cursor);
    if (node.kind === "branch") {
      const next = node.choose({ flags: narrative.flags });
      if (!node.successors.includes(next)) {
        throw new TypeError(`vn-reference-tour.narrative_branch_invalid:${node.nodeId}`);
      }
      cursor = next;
      continue;
    }
    if (node.kind === "stage") {
      const mutations = node.mutations(localStage);
      if (mutations.length > 0) {
        const outcome = reduceAdmittedStageMutations(localStage, mutations);
        if (outcome.kind !== "applied") {
          throw new TypeError(`vn-reference-tour.narrative_stage_invalid:${node.nodeId}`);
        }
        localStage = outcome.state;
        collected.push(...mutations);
        collectedDispatches.push(...node.dispatches);
      }
      cursor = node.next;
      continue;
    }
    if (node.kind === "end") {
      return ({
        narrative: {
          phase: "completed" as const,
          cursor: null,
          pending: null,
          sequence,
          flags: narrative.flags,
          history: narrative.history,
        },
        stageMutations: collected,
        stageDispatches: collectedDispatches,
      });
    }
    sequence += 1;
    return ({
      narrative: {
        phase: "active" as const,
        cursor: node.nodeId,
        pending: pendingForNodeV1(node, sequence),
        sequence,
        flags: narrative.flags,
        history: narrative.history,
      },
      stageMutations: collected,
      stageDispatches: collectedDispatches,
    });
  }
  throw new TypeError("vn-reference-tour.narrative_runaway_script");
}

function withFlagsV1(flags: readonly string[], added: readonly string[]): readonly string[] {
  if (added.length === 0) return flags;
  return ([...new Set([...flags, ...added])].toSorted());
}

/**
 * Applies an accepted input resolution to the pending node: moves the
 * cursor to the continuation, records flags, and appends the history
 * entry. Always consumes the pending boundary — holds are pure
 * time-settlement boundaries and never reach here (the shared evaluator
 * rejects every input resolution against them). The caller runs the
 * script from the returned cursor; validation already happened in that
 * evaluator.
 */
export function vnReferenceTourNarrativeAfterResolutionV1(
  narrative: VnReferenceTourNarrativeStateV1,
  resolution: InteractionResolution,
): VnReferenceTourNarrativeStateV1 {
  const pending = narrative.pending;
  if (pending === null || narrative.cursor === null) {
    throw new TypeError("vn-reference-tour.narrative_nothing_pending");
  }
  const node = requireNodeV1(narrative.cursor);
  let next: string;
  let flags = narrative.flags;
  let history = narrative.history;
  if (node.kind === "choice" && resolution.kind === "choose") {
    const option = node.options.find((candidate) => candidate.choiceId === resolution.choiceId);
    if (option === undefined) throw new TypeError("vn-reference-tour.narrative_choice_missing");
    next = option.next;
    flags = withFlagsV1(flags, option.setFlags);
    history = appendNarrativeHistory(history, {
      kind: "choice",
      occurrenceId: pending.occurrenceId,
      definitionId: pending.definitionId,
      seenRevision: pending.seenRevision,
      speakerTextId: null,
      textId: option.textId,
      voiceAssetId: null,
    });
  } else if (node.kind === "say") {
    next = node.next;
    history = appendNarrativeHistory(history, {
      kind: "say",
      occurrenceId: pending.occurrenceId,
      definitionId: pending.definitionId,
      seenRevision: pending.seenRevision,
      speakerTextId: node.speakerTextId,
      textId: node.textId,
      voiceAssetId: null,
    });
  } else {
    throw new TypeError(`vn-reference-tour.narrative_resolution_mismatch:${node.nodeId}`);
  }
  return ({
    phase: "active" as const,
    cursor: next,
    pending: null,
    sequence: narrative.sequence,
    flags,
    history,
  });
}

/**
 * The continuation of an accepted hold-scoped time tick: `holding` is a
 * partial settlement — the same occurrence stays pending with its
 * authoritative `remainingMs` decremented and the caller commits that
 * state without running the script; `advanced` means the occurrence ended
 * — expiry continues from the node's `next` — and the caller runs the
 * script from there. Its hold fence was already checked by
 * `evaluateTimeTick`.
 */
export type VnReferenceTourNarrativeTimeContinuationV1 =
  | { readonly kind: "advanced"; readonly narrative: VnReferenceTourNarrativeStateV1 }
  | { readonly kind: "holding"; readonly narrative: VnReferenceTourNarrativeStateV1 };

export function vnReferenceTourNarrativeAfterTimeTickV1(
  narrative: VnReferenceTourNarrativeStateV1,
  tick: TimeTick,
): VnReferenceTourNarrativeTimeContinuationV1 {
  const pending = narrative.pending;
  if (pending === null || pending.kind !== "hold" || narrative.cursor === null) {
    throw new TypeError("vn-reference-tour.narrative_no_hold_pending");
  }
  const node = requireNodeV1(narrative.cursor);
  if (node.kind !== "hold") {
    throw new TypeError(`vn-reference-tour.narrative_resolution_mismatch:${node.nodeId}`);
  }
  // This product declares no hold-owned tick effects or frame swaps.
  const outcome = settleHoldTimeline({
    pending,
    elapsedMs: tick.elapsedMs,
  });
  if (outcome.kind === "holding") {
    return ({
      kind: "holding" as const,
      narrative: { ...narrative, pending: outcome.pending },
    });
  }
  if (outcome.kind === "rerouted") {
    throw new TypeError("vn-reference-tour.unexpected_hold_reroute");
  }
  return ({
    kind: "advanced" as const,
    narrative: {
      phase: "active" as const,
      cursor: node.next,
      pending: null,
      sequence: narrative.sequence,
      flags: narrative.flags,
      history: narrative.history,
    },
  });
}

export function vnReferenceTourNarrativeAtBeginV1(
  narrative: VnReferenceTourNarrativeStateV1,
): VnReferenceTourNarrativeStateV1 {
  return ({
    phase: "active" as const,
    cursor: vnReferenceTourEntryNodeIdV1,
    pending: null,
    sequence: narrative.sequence,
    flags: narrative.flags,
    history: narrative.history,
  });
}

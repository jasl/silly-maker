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
  applyElapsedToHold,
  interactionOccurrenceId,
  emptyNarrativeHistory,
  parsePendingInteraction,
  reduceStageMutations,
} from "@sillymaker/base/story";

import type {
  TemplateChoiceOptionV1,
  TemplateFlowGraphV1,
  TemplateInteractionDocV1,
  TemplateNarrativeNodeV1,
  TemplateSceneBindingV1,
} from "./narrative-kit.ts";
import { compileTemplateInteractionDocV1 } from "./narrative-kit.ts";
import { templateOpeningCueIdsV1, templateOpeningSceneV1 } from "../scenes/opening/index.ts";

export type { TemplateChoiceOptionV1, TemplateNarrativeNodeV1 } from "./narrative-kit.ts";

/**
 * The starter narrative: a pure-data interaction document compiled by the
 * kit in `narrative-kit.ts`, not a DSL. Authors edit the document blocks
 * (dialogue inline) and the text catalog in `presentation.ts`; the runner
 * below almost never changes.
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
  return Object.freeze({
    phase: "idle" as const,
    cursor: null,
    pending: null,
    sequence: 0,
    flags: Object.freeze([]),
    history: emptyNarrativeHistory,
  });
}

/** Stage vocabulary shared by the script and the content catalog. */
export const templateLayersV1 = Object.freeze({
  background: "layer.template.background",
  characters: "layer.template.characters",
});

export const templateTagsV1 = Object.freeze({
  background: "tag.background",
  mei: "tag.mei",
});

export const templateContentIdsV1 = Object.freeze({
  backgroundCourtyard: "content.template.background.courtyard",
  backgroundStudy: "content.template.background.study",
  characterMei: "content.template.character.mei",
  effectMist: "content.template.effect.mist",
});

export const templateEntryNodeIdV1 = "node.template.opening";
export const templateCatFlagV1 = "flag.template.cat_found";

/** Scene short names the document's stage ops resolve against. */
const templateSceneRegistryV1: Readonly<Record<string, TemplateSceneBindingV1>> = Object.freeze({
  opening: Object.freeze({
    scene: templateOpeningSceneV1,
    cues: Object.freeze({
      courtyard: templateOpeningCueIdsV1.courtyard,
      mist: templateOpeningCueIdsV1.mist,
      meiEnters: templateOpeningCueIdsV1.meiEnters,
      meiFetches: templateOpeningCueIdsV1.meiFetches,
      meiReturns: templateOpeningCueIdsV1.meiReturns,
    }),
  }),
});

/**
 * The placeholder scene: a short "rain has just stopped" vignette proving
 * every block kind once. Replace it wholesale when starting a real game.
 * Visual composition (entries, placements, entrance motion) lives in
 * `src/scenes/opening/opening.scene.json`; stage blocks reference its cues
 * by short key (idempotent ensure semantics — re-entry never double-shows
 * content).
 *
 * The document is pure data. Dialogue lives inline: one short name per
 * block derives its node, interaction, and text ids, and the collected
 * default-locale entries merge into the presentation catalog (other
 * locales override by the same textIds). Adding a line touches only this
 * array; admission rejects unknown speakers, duplicate names, unresolved
 * jumps, and bad stage ops at construction time.
 */
const templateOpeningDocV1: TemplateInteractionDocV1 = {
  prefix: "template",
  docId: "doc.template.opening",
  speakers: { mei: "小梅" },
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
      text: "雨停了。院子里的青石板还亮着水光。",
      next: "first-choice",
    },
    {
      kind: "choice",
      name: "first-choice",
      prompt: "接下来做什么？",
      // Keeps the pre-kit textId so existing saves and digests hold.
      promptTextId: "text.template.choice.prompt",
      options: [
        {
          name: "look",
          text: "去看看檐下的动静",
          setFlags: [templateCatFlagV1],
          next: "cat-line",
        },
        { name: "inside", text: "先回屋里", next: "inside-line" },
      ],
    },
    {
      kind: "say",
      name: "cat-line",
      speaker: "mei",
      text: "看，檐角下躲着一只小猫，毛都淋湿了。",
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
      ops: [{ scene: "opening", cue: "meiFetches" }],
      durationMs: 600,
      next: "fetch-line",
    },
    {
      kind: "say",
      name: "fetch-line",
      speaker: null,
      text: "她提起裙角小跑过去，屋檐的影子里传来一阵轻响。",
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
      text: "你转身回屋，把伞立在门边。",
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
      text: "小梅把小猫抱进屋里，朝你眨了眨眼。今天是个好日子。",
      next: "close",
    },
    {
      kind: "say",
      name: "ending-plain",
      speaker: null,
      text: "屋里茶还温着。院子里的雨声停了。",
      next: "close",
    },
    { kind: "end", name: "close" },
  ],
};

const templateCompiledOpeningV1 = compileTemplateInteractionDocV1({
  doc: templateOpeningDocV1,
  scenes: templateSceneRegistryV1,
});

export const templateScriptV1: readonly TemplateNarrativeNodeV1[] = templateCompiledOpeningV1.nodes;

/** Default-locale entries the inline script declares; merged by presentation. */
export const templateScriptTextEntriesV1 = templateCompiledOpeningV1.textEntries;

/** Read-only flow projection (labeled edges, doc grouping); Studio renders it. */
export const templateFlowGraphV1: TemplateFlowGraphV1 = templateCompiledOpeningV1.flowGraph;

const nodesByIdV1: ReadonlyMap<string, TemplateNarrativeNodeV1> = new Map(
  templateScriptV1.map((node) => [node.nodeId, node]),
);

export const templateNodeIdsV1: readonly string[] = Object.freeze(
  templateScriptV1.map((node) => node.nodeId),
);

function requireNodeV1(nodeId: string): TemplateNarrativeNodeV1 {
  const node = nodesByIdV1.get(nodeId);
  if (node === undefined) throw new TypeError(`template.narrative_node_missing:${nodeId}`);
  return node;
}

export function templateChoiceOptionsForV1(
  definitionId: string,
): readonly TemplateChoiceOptionV1[] {
  for (const node of templateScriptV1) {
    if (node.kind === "choice" && node.definitionId === definitionId) return node.options;
  }
  return Object.freeze([]);
}

/** The single choice-availability rule shared by view, preview, and dispatch. */
export function templateChoiceBlockedByV1(
  option: TemplateChoiceOptionV1,
  coins: number,
): "template.insufficient_coins" | null {
  return coins >= option.consumesCoins ? null : "template.insufficient_coins";
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

export interface TemplateNarrativeRunResultV1 {
  readonly narrative: TemplateNarrativeStateV1;
  readonly stageMutations: readonly StageMutation[];
  /**
   * Presentation edge context for this run's stage mutations: the scene
   * dispatches of every stage node that actually mutated the stage, in
   * execution order. Idempotent re-entries (no mutations) contribute none.
   */
  readonly stageDispatches: readonly StageCueDispatch[];
}

function pendingForNodeV1(node: TemplateNarrativeNodeV1, sequence: number): PendingInteraction {
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
      throw new TypeError(`template.narrative_node_not_interactive:${node.nodeId}`);
  }
}

/**
 * Executes pure nodes from the cursor until the next interaction boundary
 * or the end of the script. Stage mutations are collected for the stage
 * owner and applied to a local view so later nodes observe them.
 * Deterministic: the same narrative state and stage produce the same result.
 */
export function runTemplateNarrativeUntilInteractionV1(
  narrative: TemplateNarrativeStateV1,
  stage: SemanticStageState,
): TemplateNarrativeRunResultV1 {
  if (narrative.cursor === null) {
    throw new TypeError("template.narrative_cursor_missing");
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
        throw new TypeError(`template.narrative_branch_invalid:${node.nodeId}`);
      }
      cursor = next;
      continue;
    }
    if (node.kind === "stage") {
      const mutations = node.mutations(localStage);
      if (mutations.length > 0) {
        const outcome = reduceStageMutations(localStage, mutations);
        if (outcome.kind !== "applied") {
          throw new TypeError(`template.narrative_stage_invalid:${node.nodeId}`);
        }
        localStage = outcome.state;
        collected.push(...mutations);
        collectedDispatches.push(...node.dispatches);
      }
      cursor = node.next;
      continue;
    }
    if (node.kind === "end") {
      return Object.freeze({
        narrative: Object.freeze({
          phase: "completed" as const,
          cursor: null,
          pending: null,
          sequence,
          flags: narrative.flags,
          history: narrative.history,
        }),
        stageMutations: Object.freeze(collected),
        stageDispatches: Object.freeze(collectedDispatches),
      });
    }
    sequence += 1;
    return Object.freeze({
      narrative: Object.freeze({
        phase: "active" as const,
        cursor: node.nodeId,
        pending: pendingForNodeV1(node, sequence),
        sequence,
        flags: narrative.flags,
        history: narrative.history,
      }),
      stageMutations: Object.freeze(collected),
      stageDispatches: Object.freeze(collectedDispatches),
    });
  }
  throw new TypeError("template.narrative_runaway_script");
}

function withFlagsV1(flags: readonly string[], added: readonly string[]): readonly string[] {
  if (added.length === 0) return flags;
  return Object.freeze([...new Set([...flags, ...added])].toSorted());
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
export function templateNarrativeAfterResolutionV1(
  narrative: TemplateNarrativeStateV1,
  resolution: InteractionResolution,
): TemplateNarrativeStateV1 {
  const pending = narrative.pending;
  if (pending === null || narrative.cursor === null) {
    throw new TypeError("template.narrative_nothing_pending");
  }
  const node = requireNodeV1(narrative.cursor);
  let next: string;
  let flags = narrative.flags;
  let history = narrative.history;
  if (node.kind === "choice" && resolution.kind === "choose") {
    const option = node.options.find((candidate) => candidate.choiceId === resolution.choiceId);
    if (option === undefined) throw new TypeError("template.narrative_choice_missing");
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
    throw new TypeError(`template.narrative_resolution_mismatch:${node.nodeId}`);
  }
  return Object.freeze({
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
 * state without running the script; `advanced` means the hold expired and
 * the caller runs the script from the node's successor. The tick goes
 * through the shared `applyElapsedToHold` arithmetic; its hold fence was
 * already checked by `evaluateTimeTick`.
 */
export type TemplateNarrativeTimeContinuationV1 =
  | { readonly kind: "advanced"; readonly narrative: TemplateNarrativeStateV1 }
  | { readonly kind: "holding"; readonly narrative: TemplateNarrativeStateV1 };

export function templateNarrativeAfterTimeTickV1(
  narrative: TemplateNarrativeStateV1,
  tick: TimeTick,
): TemplateNarrativeTimeContinuationV1 {
  const pending = narrative.pending;
  if (pending === null || pending.kind !== "hold" || narrative.cursor === null) {
    throw new TypeError("template.narrative_no_hold_pending");
  }
  const node = requireNodeV1(narrative.cursor);
  if (node.kind !== "hold") {
    throw new TypeError(`template.narrative_resolution_mismatch:${node.nodeId}`);
  }
  const outcome = applyElapsedToHold(pending, tick.elapsedMs);
  if (outcome.kind === "holding") {
    return Object.freeze({
      kind: "holding" as const,
      narrative: Object.freeze({ ...narrative, pending: outcome.pending }),
    });
  }
  return Object.freeze({
    kind: "advanced" as const,
    narrative: Object.freeze({
      phase: "active" as const,
      cursor: node.next,
      pending: null,
      sequence: narrative.sequence,
      flags: narrative.flags,
      history: narrative.history,
    }),
  });
}

export function templateNarrativeAtBeginV1(
  narrative: TemplateNarrativeStateV1,
): TemplateNarrativeStateV1 {
  return Object.freeze({
    phase: "active" as const,
    cursor: templateEntryNodeIdV1,
    pending: null,
    sequence: narrative.sequence,
    flags: narrative.flags,
    history: narrative.history,
  });
}

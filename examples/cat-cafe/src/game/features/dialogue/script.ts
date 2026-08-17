// SPDX-License-Identifier: MIT
import type {
  InteractionResolutionContext,
  InteractionResolution,
  NarrativeHistory,
  PendingInteraction,
  SemanticStageState,
  StageMutation,
} from "@sillymaker/base/story";
import {
  appendNarrativeHistory,
  interactionOccurrenceId,
  emptyNarrativeHistory,
  parsePendingInteraction,
  reduceStageMutations,
} from "@sillymaker/base/story";

import { catcafeOpeningCueIdsV1, catcafeOpeningSceneV1 } from "../../../scenes/opening/index.ts";

/**
 * The starter narrative: a typed TypeScript script, not a DSL. Authors edit
 * `catcafeScriptV1` (the node array) and the text catalog in
 * `presentation.ts`; the runner below almost never changes.
 *
 * Node kinds:
 * - `say`     one line of dialogue; stops and waits for the player.
 * - `stage`   pure stage mutations (show/hide/replace/appearance/...).
 * - `choice`  a menu; each option may set flags and move to its own node.
 * - `branch`  pure routing on saved flags; must land in `successors`.
 * - `end`     finishes the narrative run.
 *
 * The Engine Lab (`e2e`) additionally demonstrates `pause`,
 * `barrier` (transition-acknowledged), and `custom` interaction surfaces.
 */

export interface CatcafeNarrativeStateV1 {
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

export function createInitialCatcafeNarrativeStateV1(): CatcafeNarrativeStateV1 {
  return Object.freeze({
    phase: "idle" as const,
    cursor: null,
    pending: null,
    sequence: 0,
    flags: Object.freeze([]),
    history: emptyNarrativeHistory,
  });
}

export interface CatcafeChoiceOptionV1 {
  readonly choiceId: string;
  readonly textId: string;
  /** Coins atomically consumed by the resolve command; 0 for free options. */
  readonly consumesCoins: number;
  /** Flags recorded into narrative state when this option is chosen. */
  readonly setFlags: readonly string[];
  readonly next: string;
}

export type CatcafeNarrativeNodeV1 =
  | {
    readonly kind: "say";
    readonly nodeId: string;
    readonly definitionId: string;
    readonly seenRevision: number;
    readonly speakerTextId: string | null;
    readonly textId: string;
    readonly next: string;
  }
  | {
    readonly kind: "stage";
    readonly nodeId: string;
    readonly mutations: (stage: SemanticStageState) => readonly StageMutation[];
    /** Static annotation of contents this node may show (for lint). */
    readonly mayShow: readonly string[];
    readonly next: string;
  }
  | {
    readonly kind: "choice";
    readonly nodeId: string;
    readonly definitionId: string;
    readonly seenRevision: number;
    readonly promptTextId: string;
    readonly options: readonly CatcafeChoiceOptionV1[];
  }
  | {
    readonly kind: "branch";
    readonly nodeId: string;
    /** Static successor annotation for the lint/prediction graph. */
    readonly successors: readonly string[];
    /** Pure flag-conditioned routing; must pick a successor. */
    readonly choose: (context: { readonly flags: readonly string[] }) => string;
  }
  | { readonly kind: "end"; readonly nodeId: string };

/** Stage vocabulary shared by the script and the content catalog. */
export const catcafeLayersV1 = Object.freeze({
  background: "layer.catcafe.background",
  characters: "layer.catcafe.characters",
});

export const catcafeTagsV1 = Object.freeze({
  background: "tag.background",
  xiaoyu: "tag.xiaoyu",
});

export const catcafeContentIdsV1 = Object.freeze({
  backgroundShopfront: "content.catcafe.background.shopfront",
  backgroundBackyard: "content.catcafe.background.backyard",
  characterXiaoyu: "content.catcafe.character.xiaoyu",
});

export const catcafeEntryNodeIdV1 = "node.catcafe.opening";
export const catcafeNamedFlagV1 = "flag.catcafe.named";

/**
 * The placeholder scene: a short "rain has just stopped" vignette proving
 * every node kind once. Replace it wholesale when starting a real game.
 * Visual composition (entries, placements, entrance motion) lives in
 * `src/scenes/opening/opening.scene.json`; stage nodes reference its cues.
 */
export const catcafeScriptV1: readonly CatcafeNarrativeNodeV1[] = [
  {
    kind: "stage",
    nodeId: "node.catcafe.opening",
    mutations: (stage) =>
      catcafeOpeningSceneV1.cueMutations(catcafeOpeningCueIdsV1.shopfront, stage),
    mayShow: catcafeOpeningSceneV1.cueMayShow(catcafeOpeningCueIdsV1.shopfront),
    next: "node.catcafe.rain",
  },
  {
    kind: "say",
    nodeId: "node.catcafe.rain",
    definitionId: "interaction.catcafe.rain",
    seenRevision: 1,
    speakerTextId: null,
    textId: "text.cc.line.rain",
    next: "node.catcafe.box",
  },
  {
    kind: "say",
    nodeId: "node.catcafe.box",
    definitionId: "interaction.catcafe.box",
    seenRevision: 1,
    speakerTextId: null,
    textId: "text.cc.line.box",
    next: "node.catcafe.kitten-enters",
  },
  {
    kind: "stage",
    nodeId: "node.catcafe.kitten-enters",
    mutations: (stage) =>
      catcafeOpeningSceneV1.cueMutations(catcafeOpeningCueIdsV1.kittenEnters, stage),
    mayShow: catcafeOpeningSceneV1.cueMayShow(catcafeOpeningCueIdsV1.kittenEnters),
    next: "node.catcafe.meet",
  },
  {
    kind: "say",
    nodeId: "node.catcafe.meet",
    definitionId: "interaction.catcafe.meet",
    seenRevision: 1,
    speakerTextId: null,
    textId: "text.cc.line.meet",
    next: "node.catcafe.name-choice",
  },
  {
    kind: "choice",
    nodeId: "node.catcafe.name-choice",
    definitionId: "interaction.catcafe.name-choice",
    seenRevision: 1,
    promptTextId: "text.cc.choice.name",
    options: [
      {
        choiceId: "choice.catcafe.name-xiaoyu",
        textId: "text.cc.choice.name.xiaoyu",
        consumesCoins: 0,
        setFlags: [catcafeNamedFlagV1],
        next: "node.catcafe.named",
      },
      {
        choiceId: "choice.catcafe.name-later",
        textId: "text.cc.choice.name.later",
        consumesCoins: 0,
        setFlags: [],
        next: "node.catcafe.unnamed",
      },
    ],
  },
  {
    kind: "say",
    nodeId: "node.catcafe.named",
    definitionId: "interaction.catcafe.named",
    seenRevision: 1,
    speakerTextId: null,
    textId: "text.cc.line.named",
    next: "node.catcafe.tutorial",
  },
  {
    kind: "say",
    nodeId: "node.catcafe.unnamed",
    definitionId: "interaction.catcafe.unnamed",
    seenRevision: 1,
    speakerTextId: null,
    textId: "text.cc.line.unnamed",
    next: "node.catcafe.tutorial",
  },
  {
    kind: "say",
    nodeId: "node.catcafe.tutorial",
    definitionId: "interaction.catcafe.tutorial",
    seenRevision: 1,
    speakerTextId: null,
    textId: "text.cc.line.tutorial",
    next: "node.catcafe.close",
  },
  { kind: "end", nodeId: "node.catcafe.close" },
];

const nodesByIdV1: ReadonlyMap<string, CatcafeNarrativeNodeV1> = new Map(
  catcafeScriptV1.map((node) => [node.nodeId, node]),
);

export const catcafeNodeIdsV1: readonly string[] = Object.freeze(
  catcafeScriptV1.map((node) => node.nodeId),
);

function requireNodeV1(nodeId: string): CatcafeNarrativeNodeV1 {
  const node = nodesByIdV1.get(nodeId);
  if (node === undefined) throw new TypeError(`catcafe.narrative_node_missing:${nodeId}`);
  return node;
}

export function catcafeChoiceOptionsForV1(definitionId: string): readonly CatcafeChoiceOptionV1[] {
  for (const node of catcafeScriptV1) {
    if (node.kind === "choice" && node.definitionId === definitionId) return node.options;
  }
  return Object.freeze([]);
}

/** The single choice-availability rule shared by view, preview, and dispatch. */
export function catcafeChoiceBlockedByV1(
  option: CatcafeChoiceOptionV1,
  coins: number,
): "catcafe.insufficient_coins" | null {
  return coins >= option.consumesCoins ? null : "catcafe.insufficient_coins";
}

/**
 * The one resolution context shared by the action catalog, preview, and
 * queue-front dispatch, so all three surfaces agree on availability.
 */
export function catcafeInteractionContextV1(
  pending: PendingInteraction | null,
  coins: number,
): InteractionResolutionContext {
  return {
    isChoiceEnabled(choiceId: string): boolean {
      if (pending === null || pending.kind !== "choice") return false;
      const option = catcafeChoiceOptionsForV1(pending.definitionId).find(
        (candidate) => candidate.choiceId === choiceId,
      );
      return option !== undefined && catcafeChoiceBlockedByV1(option, coins) === null;
    },
    isCustomPayloadValid(): boolean {
      return false;
    },
  };
}

export interface CatcafeNarrativeRunResultV1 {
  readonly narrative: CatcafeNarrativeStateV1;
  readonly stageMutations: readonly StageMutation[];
}

function pendingForNodeV1(node: CatcafeNarrativeNodeV1, sequence: number): PendingInteraction {
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
    default:
      throw new TypeError(`catcafe.narrative_node_not_interactive:${node.nodeId}`);
  }
}

/**
 * Executes pure nodes from the cursor until the next interaction boundary
 * or the end of the script. Stage mutations are collected for the stage
 * owner and applied to a local view so later nodes observe them.
 * Deterministic: the same narrative state and stage produce the same result.
 */
export function runCatcafeNarrativeUntilInteractionV1(
  narrative: CatcafeNarrativeStateV1,
  stage: SemanticStageState,
): CatcafeNarrativeRunResultV1 {
  if (narrative.cursor === null) {
    throw new TypeError("catcafe.narrative_cursor_missing");
  }
  let cursor: string | null = narrative.cursor;
  let sequence = narrative.sequence;
  let localStage = stage;
  const collected: StageMutation[] = [];

  for (let steps = 0; steps < 64; steps += 1) {
    if (cursor === null) break;
    const node = requireNodeV1(cursor);
    if (node.kind === "branch") {
      const next = node.choose({ flags: narrative.flags });
      if (!node.successors.includes(next)) {
        throw new TypeError(`catcafe.narrative_branch_invalid:${node.nodeId}`);
      }
      cursor = next;
      continue;
    }
    if (node.kind === "stage") {
      const mutations = node.mutations(localStage);
      if (mutations.length > 0) {
        const outcome = reduceStageMutations(localStage, mutations);
        if (outcome.kind !== "applied") {
          throw new TypeError(`catcafe.narrative_stage_invalid:${node.nodeId}`);
        }
        localStage = outcome.state;
        collected.push(...mutations);
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
    });
  }
  throw new TypeError("catcafe.narrative_runaway_script");
}

function withFlagsV1(flags: readonly string[], added: readonly string[]): readonly string[] {
  if (added.length === 0) return flags;
  return Object.freeze([...new Set([...flags, ...added])].toSorted());
}

/**
 * Applies an accepted resolution to the pending node: moves the cursor to
 * the continuation, records flags, and appends the history entry. The
 * caller runs the script afterwards; validation already happened in the
 * shared evaluator.
 */
export function catcafeNarrativeAfterResolutionV1(
  narrative: CatcafeNarrativeStateV1,
  resolution: InteractionResolution,
): CatcafeNarrativeStateV1 {
  const pending = narrative.pending;
  if (pending === null || narrative.cursor === null) {
    throw new TypeError("catcafe.narrative_nothing_pending");
  }
  const node = requireNodeV1(narrative.cursor);
  let next: string;
  let flags = narrative.flags;
  let history = narrative.history;
  if (node.kind === "choice" && resolution.kind === "choose") {
    const option = node.options.find((candidate) => candidate.choiceId === resolution.choiceId);
    if (option === undefined) throw new TypeError("catcafe.narrative_choice_missing");
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
    throw new TypeError(`catcafe.narrative_resolution_mismatch:${node.nodeId}`);
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

export function catcafeNarrativeAtBeginV1(
  narrative: CatcafeNarrativeStateV1,
): CatcafeNarrativeStateV1 {
  return Object.freeze({
    phase: "active" as const,
    cursor: catcafeEntryNodeIdV1,
    pending: null,
    sequence: narrative.sequence,
    flags: narrative.flags,
    history: narrative.history,
  });
}

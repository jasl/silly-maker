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
  parseStageMutation,
  reduceStageMutations,
} from "@sillymaker/base/story";

/**
 * The starter narrative: a typed TypeScript script, not a DSL. Authors edit
 * `bookshopScriptV1` (the node array) and the text catalog in
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

export interface BookshopNarrativeStateV1 {
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

export function createInitialBookshopNarrativeStateV1(): BookshopNarrativeStateV1 {
  return Object.freeze({
    phase: "idle" as const,
    cursor: null,
    pending: null,
    sequence: 0,
    flags: Object.freeze([]),
    history: emptyNarrativeHistory,
  });
}

export interface BookshopChoiceOptionV1 {
  readonly choiceId: string;
  readonly textId: string;
  /** Coins atomically consumed by the resolve command; 0 for free options. */
  readonly consumesCoins: number;
  /** Flags recorded into narrative state when this option is chosen. */
  readonly setFlags: readonly string[];
  readonly next: string;
}

export type BookshopNarrativeNodeV1 =
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
      readonly options: readonly BookshopChoiceOptionV1[];
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
export const bookshopLayersV1 = Object.freeze({
  background: "layer.bookshop.background",
  characters: "layer.bookshop.characters",
});

export const bookshopTagsV1 = Object.freeze({
  background: "tag.background",
  zhou: "tag.zhou",
  cheng: "tag.cheng",
});

export const bookshopContentIdsV1 = Object.freeze({
  backgroundShop: "content.bookshop.background.shop",
  backgroundYard: "content.bookshop.background.yard",
  characterZhou: "content.bookshop.character.zhou",
  characterCheng: "content.bookshop.character.cheng",
});

export const bookshopEntryNodeIdV1 = "node.bookshop.opening";
export const bookshopHelpedFlagV1 = "flag.bookshop.helped";

function batchV1(batch: readonly unknown[]): readonly StageMutation[] {
  return Object.freeze(
    batch.map((mutation, index) => parseStageMutation(mutation, `/mutations/${String(index)}`)),
  );
}

function hasTagV1(stage: SemanticStageState, layerId: string, tag: string): boolean {
  const layer = stage.layers.find((candidate) => candidate.layerId === layerId);
  return layer !== undefined && layer.entries.some((entry) => entry.tag === tag);
}

/**
 * 《打烊前的旧书店》：雨夜打烊前，店主老周与常客阿澄的短篇。
 * 两条 flag 路线在后院汇合，再经一次金币选择后分支结局。
 */
export const bookshopScriptV1: readonly BookshopNarrativeNodeV1[] = [
  {
    kind: "stage",
    nodeId: "node.bookshop.opening",
    mutations: (stage) =>
      hasTagV1(stage, bookshopLayersV1.characters, bookshopTagsV1.zhou)
        ? []
        : batchV1([
            {
              // `show` places new content; `replace` swaps content already
              // on stage (a background change mid-scene, for example).
              kind: hasTagV1(stage, bookshopLayersV1.background, bookshopTagsV1.background)
                ? "replace"
                : "show",
              layerId: bookshopLayersV1.background,
              tag: bookshopTagsV1.background,
              contentId: bookshopContentIdsV1.backgroundShop,
              ...(hasTagV1(stage, bookshopLayersV1.background, bookshopTagsV1.background)
                ? {}
                : { zOrder: 0 }),
            },
            {
              kind: "show",
              layerId: bookshopLayersV1.characters,
              tag: bookshopTagsV1.zhou,
              contentId: bookshopContentIdsV1.characterZhou,
              zOrder: 10,
              placement: { x: 480, y: 880, scalePermille: 1000, mirrored: false },
              appearance: { expression: "calm" },
            },
          ]),
    mayShow: [bookshopContentIdsV1.backgroundShop, bookshopContentIdsV1.characterZhou],
    next: "node.bookshop.opening-narration",
  },
  {
    kind: "say",
    nodeId: "node.bookshop.opening-narration",
    definitionId: "interaction.bookshop.opening-narration",
    seenRevision: 1,
    speakerTextId: null,
    textId: "text.bookshop.line.opening-narration",
    next: "node.bookshop.opening-zhou",
  },
  {
    kind: "say",
    nodeId: "node.bookshop.opening-zhou",
    definitionId: "interaction.bookshop.opening-zhou",
    seenRevision: 1,
    speakerTextId: "text.bookshop.speaker.zhou",
    textId: "text.bookshop.line.opening-zhou",
    next: "node.bookshop.cheng-enters",
  },
  {
    kind: "stage",
    nodeId: "node.bookshop.cheng-enters",
    mutations: (stage) =>
      hasTagV1(stage, bookshopLayersV1.characters, bookshopTagsV1.cheng)
        ? []
        : batchV1([
            {
              kind: "show",
              layerId: bookshopLayersV1.characters,
              tag: bookshopTagsV1.cheng,
              contentId: bookshopContentIdsV1.characterCheng,
              zOrder: 11,
              placement: { x: 1180, y: 880, scalePermille: 1000, mirrored: false },
              appearance: { expression: "eager" },
            },
          ]),
    mayShow: [bookshopContentIdsV1.characterCheng],
    next: "node.bookshop.cheng-asks",
  },
  {
    kind: "say",
    nodeId: "node.bookshop.cheng-asks",
    definitionId: "interaction.bookshop.cheng-asks",
    seenRevision: 1,
    speakerTextId: "text.bookshop.speaker.cheng",
    textId: "text.bookshop.line.cheng-asks",
    next: "node.bookshop.zhou-replies",
  },
  {
    kind: "say",
    nodeId: "node.bookshop.zhou-replies",
    definitionId: "interaction.bookshop.zhou-replies",
    seenRevision: 1,
    speakerTextId: "text.bookshop.speaker.zhou",
    textId: "text.bookshop.line.zhou-replies",
    next: "node.bookshop.first-choice",
  },
  {
    kind: "choice",
    nodeId: "node.bookshop.first-choice",
    definitionId: "interaction.bookshop.first-choice",
    seenRevision: 1,
    promptTextId: "text.bookshop.choice.first-prompt",
    options: [
      {
        choiceId: "choice.bookshop.help",
        textId: "text.bookshop.choice.help",
        consumesCoins: 0,
        setFlags: [bookshopHelpedFlagV1],
        next: "node.bookshop.help-line-1",
      },
      {
        choiceId: "choice.bookshop.usher",
        textId: "text.bookshop.choice.usher",
        consumesCoins: 0,
        setFlags: [],
        next: "node.bookshop.usher-line-1",
      },
    ],
  },
  {
    kind: "say",
    nodeId: "node.bookshop.help-line-1",
    definitionId: "interaction.bookshop.help-line-1",
    seenRevision: 1,
    speakerTextId: "text.bookshop.speaker.cheng",
    textId: "text.bookshop.line.help-1",
    next: "node.bookshop.help-line-2",
  },
  {
    kind: "say",
    nodeId: "node.bookshop.help-line-2",
    definitionId: "interaction.bookshop.help-line-2",
    seenRevision: 1,
    speakerTextId: "text.bookshop.speaker.zhou",
    textId: "text.bookshop.line.help-2",
    next: "node.bookshop.to-yard",
  },
  {
    kind: "say",
    nodeId: "node.bookshop.usher-line-1",
    definitionId: "interaction.bookshop.usher-line-1",
    seenRevision: 1,
    speakerTextId: "text.bookshop.speaker.zhou",
    textId: "text.bookshop.line.usher-1",
    next: "node.bookshop.usher-line-2",
  },
  {
    kind: "say",
    nodeId: "node.bookshop.usher-line-2",
    definitionId: "interaction.bookshop.usher-line-2",
    seenRevision: 1,
    speakerTextId: "text.bookshop.speaker.cheng",
    textId: "text.bookshop.line.usher-2",
    next: "node.bookshop.to-yard",
  },
  {
    kind: "stage",
    nodeId: "node.bookshop.to-yard",
    mutations: () =>
      batchV1([
        {
          kind: "replace",
          layerId: bookshopLayersV1.background,
          tag: bookshopTagsV1.background,
          contentId: bookshopContentIdsV1.backgroundYard,
        },
        {
          kind: "setAppearance",
          layerId: bookshopLayersV1.characters,
          tag: bookshopTagsV1.zhou,
          appearance: { expression: "soft" },
        },
      ]),
    mayShow: [bookshopContentIdsV1.backgroundYard],
    next: "node.bookshop.yard-line",
  },
  {
    kind: "say",
    nodeId: "node.bookshop.yard-line",
    definitionId: "interaction.bookshop.yard-line",
    seenRevision: 1,
    speakerTextId: null,
    textId: "text.bookshop.line.yard",
    next: "node.bookshop.second-choice",
  },
  {
    kind: "choice",
    nodeId: "node.bookshop.second-choice",
    definitionId: "interaction.bookshop.second-choice",
    seenRevision: 1,
    promptTextId: "text.bookshop.choice.second-prompt",
    options: [
      {
        choiceId: "choice.bookshop.buy",
        textId: "text.bookshop.choice.buy",
        consumesCoins: 1,
        setFlags: [],
        next: "node.bookshop.after-buy",
      },
      {
        choiceId: "choice.bookshop.leave-book",
        textId: "text.bookshop.choice.leave-book",
        consumesCoins: 0,
        setFlags: [],
        next: "node.bookshop.after-leave-book",
      },
    ],
  },
  {
    kind: "say",
    nodeId: "node.bookshop.after-buy",
    definitionId: "interaction.bookshop.after-buy",
    seenRevision: 1,
    speakerTextId: "text.bookshop.speaker.zhou",
    textId: "text.bookshop.line.after-buy",
    next: "node.bookshop.ending-gate",
  },
  {
    kind: "say",
    nodeId: "node.bookshop.after-leave-book",
    definitionId: "interaction.bookshop.after-leave-book",
    seenRevision: 1,
    speakerTextId: "text.bookshop.speaker.cheng",
    textId: "text.bookshop.line.after-leave-book",
    next: "node.bookshop.ending-gate",
  },
  {
    kind: "branch",
    nodeId: "node.bookshop.ending-gate",
    successors: ["node.bookshop.ending-helped", "node.bookshop.ending-plain"],
    choose: ({ flags }) =>
      flags.includes(bookshopHelpedFlagV1)
        ? "node.bookshop.ending-helped"
        : "node.bookshop.ending-plain",
  },
  {
    kind: "say",
    nodeId: "node.bookshop.ending-helped",
    definitionId: "interaction.bookshop.ending-helped",
    seenRevision: 1,
    speakerTextId: "text.bookshop.speaker.zhou",
    textId: "text.bookshop.line.ending-helped",
    next: "node.bookshop.close",
  },
  {
    kind: "say",
    nodeId: "node.bookshop.ending-plain",
    definitionId: "interaction.bookshop.ending-plain",
    seenRevision: 1,
    speakerTextId: null,
    textId: "text.bookshop.line.ending-plain",
    next: "node.bookshop.close",
  },
  { kind: "end", nodeId: "node.bookshop.close" },
];

const nodesByIdV1: ReadonlyMap<string, BookshopNarrativeNodeV1> = new Map(
  bookshopScriptV1.map((node) => [node.nodeId, node]),
);

export const bookshopNodeIdsV1: readonly string[] = Object.freeze(
  bookshopScriptV1.map((node) => node.nodeId),
);

function requireNodeV1(nodeId: string): BookshopNarrativeNodeV1 {
  const node = nodesByIdV1.get(nodeId);
  if (node === undefined) throw new TypeError(`bookshop.narrative_node_missing:${nodeId}`);
  return node;
}

export function bookshopChoiceOptionsForV1(
  definitionId: string,
): readonly BookshopChoiceOptionV1[] {
  for (const node of bookshopScriptV1) {
    if (node.kind === "choice" && node.definitionId === definitionId) return node.options;
  }
  return Object.freeze([]);
}

/** The single choice-availability rule shared by view, preview, and dispatch. */
export function bookshopChoiceBlockedByV1(
  option: BookshopChoiceOptionV1,
  coins: number,
): "bookshop.insufficient_coins" | null {
  return coins >= option.consumesCoins ? null : "bookshop.insufficient_coins";
}

/**
 * The one resolution context shared by the action catalog, preview, and
 * queue-front dispatch, so all three surfaces agree on availability.
 */
export function bookshopInteractionContextV1(
  pending: PendingInteraction | null,
  coins: number,
): InteractionResolutionContext {
  return {
    isChoiceEnabled(choiceId: string): boolean {
      if (pending === null || pending.kind !== "choice") return false;
      const option = bookshopChoiceOptionsForV1(pending.definitionId).find(
        (candidate) => candidate.choiceId === choiceId,
      );
      return option !== undefined && bookshopChoiceBlockedByV1(option, coins) === null;
    },
    isCustomPayloadValid(): boolean {
      return false;
    },
  };
}

export interface BookshopNarrativeRunResultV1 {
  readonly narrative: BookshopNarrativeStateV1;
  readonly stageMutations: readonly StageMutation[];
}

function pendingForNodeV1(node: BookshopNarrativeNodeV1, sequence: number): PendingInteraction {
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
      throw new TypeError(`bookshop.narrative_node_not_interactive:${node.nodeId}`);
  }
}

/**
 * Executes pure nodes from the cursor until the next interaction boundary
 * or the end of the script. Stage mutations are collected for the stage
 * owner and applied to a local view so later nodes observe them.
 * Deterministic: the same narrative state and stage produce the same result.
 */
export function runBookshopNarrativeUntilInteractionV1(
  narrative: BookshopNarrativeStateV1,
  stage: SemanticStageState,
): BookshopNarrativeRunResultV1 {
  if (narrative.cursor === null) {
    throw new TypeError("bookshop.narrative_cursor_missing");
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
        throw new TypeError(`bookshop.narrative_branch_invalid:${node.nodeId}`);
      }
      cursor = next;
      continue;
    }
    if (node.kind === "stage") {
      const mutations = node.mutations(localStage);
      if (mutations.length > 0) {
        const outcome = reduceStageMutations(localStage, mutations);
        if (outcome.kind !== "applied") {
          throw new TypeError(`bookshop.narrative_stage_invalid:${node.nodeId}`);
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
  throw new TypeError("bookshop.narrative_runaway_script");
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
export function bookshopNarrativeAfterResolutionV1(
  narrative: BookshopNarrativeStateV1,
  resolution: InteractionResolution,
): BookshopNarrativeStateV1 {
  const pending = narrative.pending;
  if (pending === null || narrative.cursor === null) {
    throw new TypeError("bookshop.narrative_nothing_pending");
  }
  const node = requireNodeV1(narrative.cursor);
  let next: string;
  let flags = narrative.flags;
  let history = narrative.history;
  if (node.kind === "choice" && resolution.kind === "choose") {
    const option = node.options.find((candidate) => candidate.choiceId === resolution.choiceId);
    if (option === undefined) throw new TypeError("bookshop.narrative_choice_missing");
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
    throw new TypeError(`bookshop.narrative_resolution_mismatch:${node.nodeId}`);
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

export function bookshopNarrativeAtBeginV1(
  narrative: BookshopNarrativeStateV1,
): BookshopNarrativeStateV1 {
  return Object.freeze({
    phase: "active" as const,
    cursor: bookshopEntryNodeIdV1,
    pending: null,
    sequence: narrative.sequence,
    flags: narrative.flags,
    history: narrative.history,
  });
}

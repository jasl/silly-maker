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
 * `templateScriptV1` (the node array) and the text catalog in
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

export interface TemplateChoiceOptionV1 {
  readonly choiceId: string;
  readonly textId: string;
  /** Coins atomically consumed by the resolve command; 0 for free options. */
  readonly consumesCoins: number;
  /** Flags recorded into narrative state when this option is chosen. */
  readonly setFlags: readonly string[];
  readonly next: string;
}

export type TemplateNarrativeNodeV1 =
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
    readonly options: readonly TemplateChoiceOptionV1[];
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
});

export const templateEntryNodeIdV1 = "node.template.opening";
export const templateCatFlagV1 = "flag.template.cat_found";

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
 * The placeholder scene: a short "rain has just stopped" vignette proving
 * every node kind once. Replace it wholesale when starting a real game.
 */
export const templateScriptV1: readonly TemplateNarrativeNodeV1[] = [
  {
    kind: "stage",
    nodeId: "node.template.opening",
    mutations: (stage) =>
      hasTagV1(stage, templateLayersV1.characters, templateTagsV1.mei) ? [] : batchV1([
        {
          // `show` places new content; `replace` swaps content already
          // on stage (a background change mid-scene, for example).
          kind: hasTagV1(stage, templateLayersV1.background, templateTagsV1.background)
            ? "replace"
            : "show",
          layerId: templateLayersV1.background,
          tag: templateTagsV1.background,
          contentId: templateContentIdsV1.backgroundCourtyard,
          ...(hasTagV1(stage, templateLayersV1.background, templateTagsV1.background)
            ? {}
            : { zOrder: 0 }),
        },
        {
          kind: "show",
          layerId: templateLayersV1.characters,
          tag: templateTagsV1.mei,
          contentId: templateContentIdsV1.characterMei,
          zOrder: 10,
          placement: {
            x: 1180,
            y: 880,
            scalePermille: 1000,
            opacityPermille: 1000,
            mirrored: false,
          },
          appearance: { expression: "calm" },
        },
      ]),
    mayShow: [templateContentIdsV1.backgroundCourtyard, templateContentIdsV1.characterMei],
    next: "node.template.greeting",
  },
  {
    kind: "say",
    nodeId: "node.template.greeting",
    definitionId: "interaction.template.greeting",
    seenRevision: 1,
    speakerTextId: "text.template.speaker.mei",
    textId: "text.template.line.greeting",
    next: "node.template.first-choice",
  },
  {
    kind: "choice",
    nodeId: "node.template.first-choice",
    definitionId: "interaction.template.first-choice",
    seenRevision: 1,
    promptTextId: "text.template.choice.prompt",
    options: [
      {
        choiceId: "choice.template.look",
        textId: "text.template.choice.look",
        consumesCoins: 0,
        setFlags: [templateCatFlagV1],
        next: "node.template.cat-line",
      },
      {
        choiceId: "choice.template.inside",
        textId: "text.template.choice.inside",
        consumesCoins: 0,
        setFlags: [],
        next: "node.template.inside-line",
      },
    ],
  },
  {
    kind: "say",
    nodeId: "node.template.cat-line",
    definitionId: "interaction.template.cat-line",
    seenRevision: 1,
    speakerTextId: "text.template.speaker.mei",
    textId: "text.template.line.cat",
    next: "node.template.mei-smiles",
  },
  {
    kind: "stage",
    nodeId: "node.template.mei-smiles",
    mutations: () =>
      batchV1([
        {
          kind: "setAppearance",
          layerId: templateLayersV1.characters,
          tag: templateTagsV1.mei,
          appearance: { expression: "smiling" },
        },
      ]),
    mayShow: [],
    next: "node.template.ending-gate",
  },
  {
    kind: "say",
    nodeId: "node.template.inside-line",
    definitionId: "interaction.template.inside-line",
    seenRevision: 1,
    speakerTextId: null,
    textId: "text.template.line.inside",
    next: "node.template.ending-gate",
  },
  {
    kind: "branch",
    nodeId: "node.template.ending-gate",
    successors: ["node.template.ending-warm", "node.template.ending-plain"],
    choose: ({ flags }) =>
      flags.includes(templateCatFlagV1)
        ? "node.template.ending-warm"
        : "node.template.ending-plain",
  },
  {
    kind: "say",
    nodeId: "node.template.ending-warm",
    definitionId: "interaction.template.ending-warm",
    seenRevision: 1,
    speakerTextId: "text.template.speaker.mei",
    textId: "text.template.line.ending-warm",
    next: "node.template.close",
  },
  {
    kind: "say",
    nodeId: "node.template.ending-plain",
    definitionId: "interaction.template.ending-plain",
    seenRevision: 1,
    speakerTextId: null,
    textId: "text.template.line.ending-plain",
    next: "node.template.close",
  },
  { kind: "end", nodeId: "node.template.close" },
];

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
  throw new TypeError("template.narrative_runaway_script");
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

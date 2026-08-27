// SPDX-License-Identifier: MIT
import type {
  Scene,
  SemanticStageState,
  StageCueDispatch,
  StageMutation,
} from "@sillymaker/base/story";
import { parseStageMutation } from "@sillymaker/base/story";

/**
 * The interaction-document kit (the VN Reference Tour flavor of
 * `docs/engine/proposals/interaction-table-authoring.md`).
 *
 * A document is PURE DATA: say/choice/stage/branch/hold/end blocks with
 * short names. Every id the runtime needs derives from one stable short name
 * (`node.<prefix>.<name>`, `interaction.<prefix>.<name>`,
 * `text.<prefix>.line.<name>`, …), and every derived id accepts an explicit
 * override, so migrating an existing script keeps its ids (and therefore its
 * saves and digests) byte-identical. Copy may stay inline for a tiny Story or
 * be omitted when a build-known content pack owns the explicit text id. The
 * compiler validates everything at admission (unknown speakers, duplicate
 * names, unresolved jumps, bad stage ops fail construction loudly), emits the
 * exact node objects the hand-written script used, and collects only copy the
 * document actually keeps inline. The Player compiler never constructs
 * tooling-only source metadata or a second graph.
 *
 * Behavior stays in TypeScript: stage composition is referenced through
 * scene documents (open/cue by short key) or a closed mutation vocabulary
 * (`setAppearance`), and branching is a declarative flag test. This is
 * ordinary data construction — no DSL, no runtime, no new engine API.
 */

// ---- Runtime IR (unchanged; the runner in narrative.ts consumes this) ----

export interface VnReferenceTourChoiceOptionV1 {
  readonly choiceId: string;
  readonly textId: string;
  /** Flags recorded into narrative state when this option is chosen. */
  readonly setFlags: readonly string[];
  readonly next: string;
}

export type VnReferenceTourNarrativeNodeV1 =
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
    readonly mutations: (stage: SemanticStageState) => readonly StageMutation[];
    readonly nodeId: string;
    /** Static annotation of contents this node may show (for lint). */
    readonly mayShow: readonly string[];
    /**
     * Static annotation of the scene dispatches this node performs (cue
     * references and whole-scene opens), in op order. The runner forwards
     * them as presentation edge context when the node actually mutates the
     * stage; `setAppearance` ops contribute none.
     */
    readonly dispatches: readonly StageCueDispatch[];
    readonly next: string;
  }
  | {
    readonly kind: "choice";
    readonly nodeId: string;
    readonly definitionId: string;
    readonly seenRevision: number;
    readonly promptTextId: string;
    readonly options: readonly VnReferenceTourChoiceOptionV1[];
  }
  | {
    readonly kind: "branch";
    readonly nodeId: string;
    /** Static successor annotation for the lint/prediction graph. */
    readonly successors: readonly string[];
    /** Pure flag-conditioned routing; must pick a successor. */
    readonly choose: (context: { readonly flags: readonly string[] }) => string;
  }
  | {
    /** Holds the screen for an authoritative duration; expiry advances. */
    readonly kind: "hold";
    readonly nodeId: string;
    readonly definitionId: string;
    readonly seenRevision: number;
    /** Authoritative dwell in milliseconds; never a wall-clock deadline. */
    readonly durationMs: number;
    /** Player input may fold the remaining wait into one tick. */
    readonly skippable: boolean;
    readonly next: string;
  }
  | { readonly kind: "end"; readonly nodeId: string };

// ---- Document input (pure data; no functions) ----

export interface VnReferenceTourSayBlockV1 {
  readonly kind: "say";
  readonly name: string;
  /** A key declared in `speakers`; null narrates without a speaker. */
  readonly speaker: string | null;
  /** Inline default-locale copy; omit when `textId` resolves from a content pack. */
  readonly text?: string;
  /** Override the derived `text.<prefix>.line.<name>` (keeps old saves). */
  readonly textId?: string;
  /** Override the derived `interaction.<prefix>.<name>`. */
  readonly definitionId?: string;
  readonly next: string;
  /** Bump when the line's meaning changes and Seen should reset. */
  readonly seenRevision?: number;
}

export interface VnReferenceTourChoiceOptionInputV1 {
  readonly name: string;
  /** Inline default-locale copy; omit when `textId` resolves elsewhere. */
  readonly text?: string;
  readonly textId?: string;
  readonly next: string;
  readonly setFlags?: readonly string[];
}

export interface VnReferenceTourChoiceBlockV1 {
  readonly kind: "choice";
  readonly name: string;
  /** Inline default-locale prompt; omit when `promptTextId` resolves elsewhere. */
  readonly prompt?: string;
  readonly promptTextId?: string;
  readonly definitionId?: string;
  readonly options: readonly VnReferenceTourChoiceOptionInputV1[];
  readonly seenRevision?: number;
}

/**
 * One stage operation. Scene composition (show/hide, placements, cue
 * motions) is referenced by scene short name + cue key; mid-scene
 * appearance beats on standing content stay script-owned through the
 * closed `setAppearance` vocabulary.
 */
export type VnReferenceTourStageOpV1 =
  | { readonly scene: string; readonly open: true }
  | { readonly scene: string; readonly cue: string }
  | {
    readonly setAppearance: {
      readonly layerId: string;
      readonly tag: string;
      readonly appearance: Readonly<Record<string, string>>;
    };
  };

export interface VnReferenceTourStageBlockV1 {
  readonly kind: "stage";
  readonly name: string;
  readonly ops: readonly VnReferenceTourStageOpV1[];
  readonly next: string;
}

export interface VnReferenceTourBranchCaseV1 {
  /** Route here when the flag is set; omit on the last case for else. */
  readonly when?: { readonly flag: string };
  readonly next: string;
}

export interface VnReferenceTourBranchBlockV1 {
  readonly kind: "branch";
  readonly name: string;
  readonly cases: readonly VnReferenceTourBranchCaseV1[];
}

/**
 * An authoritative timed hold between two beats (the engine `hold`
 * interaction): the screen holds for `durationMs`, the Narrative Host
 * reports elapsed milliseconds as hold-fenced time-tick commits, and
 * expiry advances to `next`. Remaining time lives in authoritative State,
 * so a mid-hold Save restores the wait instead of replaying a wall clock.
 * Ported frame-based waits can convert here: `round(frames × 1000 / 60)`.
 */
export interface VnReferenceTourHoldBlockV1 {
  readonly kind: "hold";
  readonly name: string;
  /** Positive integer milliseconds. */
  readonly durationMs: number;
  /** Player input folds the remaining wait; original WAIT is never skippable. */
  readonly skippable?: boolean;
  /**
   * Optional opening stage batch: compiles to a stage node entered before
   * the hold, so the held picture is real committed stage state (never a
   * silent flash). Jumps to this block land on the stage node.
   */
  readonly ops?: readonly VnReferenceTourStageOpV1[];
  /** Override the derived `interaction.<prefix>.<name>`. */
  readonly definitionId?: string;
  readonly seenRevision?: number;
  readonly next: string;
}

export interface VnReferenceTourEndBlockV1 {
  readonly kind: "end";
  readonly name: string;
}

export type VnReferenceTourInteractionBlockV1 =
  | VnReferenceTourSayBlockV1
  | VnReferenceTourChoiceBlockV1
  | VnReferenceTourStageBlockV1
  | VnReferenceTourBranchBlockV1
  | VnReferenceTourHoldBlockV1
  | VnReferenceTourEndBlockV1;

export interface VnReferenceTourInteractionDocV1 {
  /** The id prefix, e.g. `"vn-reference-tour"` → `node.vn-reference-tour.<name>`. */
  readonly prefix: string;
  readonly docId: string;
  /**
   * Speaker key → inline default-locale name or an explicit text reference.
   * The object form may omit copy when a content pack owns the text.
   */
  readonly speakers?: Readonly<
    Record<string, string | { readonly textId: string; readonly text?: string }>
  >;
  readonly entry: string;
  readonly blocks: readonly VnReferenceTourInteractionBlockV1[];
}

/** Scene handle the compiler resolves stage ops against. */
export interface VnReferenceTourSceneBindingV1 {
  readonly scene: Scene;
  /** Short cue key → real cue id (`courtyard` → `cue.vn-reference-tour.opening.courtyard`). */
  readonly cues?: Readonly<Record<string, string>>;
}

export interface VnReferenceTourCompileInputV1 {
  readonly doc: VnReferenceTourInteractionDocV1;
  readonly scenes?: Readonly<Record<string, VnReferenceTourSceneBindingV1>>;
  /** `@label` cross-document targets → real nodeIds. */
  readonly externalTargets?: Readonly<Record<string, string>>;
}

export interface VnReferenceTourCompiledInteractionV1 {
  readonly entryNodeId: string;
  readonly nodes: readonly VnReferenceTourNarrativeNodeV1[];
  /** Default-locale entries collected from the inline block text. */
  readonly textEntries: readonly { readonly textId: string; readonly text: string }[];
}

// ---- Compiler ----

function failV1(doc: VnReferenceTourInteractionDocV1, at: string, reason: string): never {
  throw new TypeError(`vn-reference-tour.interaction_doc_invalid:${doc.docId}/${at}:${reason}`);
}

export function compileVnReferenceTourInteractionDocV1(
  input: VnReferenceTourCompileInputV1,
): VnReferenceTourCompiledInteractionV1 {
  const { doc } = input;
  const scenes = input.scenes ?? {};
  const externalTargets = input.externalTargets ?? {};
  const nodeId = (name: string): string => `node.${doc.prefix}.${name}`;

  const blockNames = new Set<string>();
  /** Hold blocks with an opening stage batch; jumps land on `<name>-stage`. */
  const holdOpsBlocks = new Set<string>();
  for (const block of doc.blocks) {
    if (blockNames.has(block.name)) failV1(doc, block.name, "duplicate_block_name");
    blockNames.add(block.name);
    if (block.kind === "hold" && block.ops !== undefined && block.ops.length > 0) {
      const stageName = `${block.name}-stage`;
      if (blockNames.has(stageName)) failV1(doc, stageName, "duplicate_block_name");
      blockNames.add(stageName);
      holdOpsBlocks.add(block.name);
    }
  }
  if (!blockNames.has(doc.entry)) failV1(doc, doc.entry, "entry_missing");

  const textByTextId = new Map<string, string>();
  const collectText = (at: string, textId: string, text: string): string => {
    const existing = textByTextId.get(textId);
    if (existing !== undefined && existing !== text) failV1(doc, at, `text_conflict:${textId}`);
    textByTextId.set(textId, text);
    return textId;
  };
  const resolveTextId = (
    at: string,
    explicitTextId: string | undefined,
    derivedTextId: string,
    text: string | undefined,
  ): string => {
    if (text === undefined && explicitTextId === undefined) {
      failV1(doc, at, "text_id_required_without_inline_text");
    }
    const textId = explicitTextId ?? derivedTextId;
    if (text !== undefined) collectText(at, textId, text);
    return textId;
  };
  const speakerTextId = (at: string, key: string | null): string | null => {
    if (key === null) return null;
    const speaker = input.doc.speakers?.[key];
    if (speaker === undefined) failV1(doc, at, `speaker_unknown:${key}`);
    return typeof speaker === "string" ? `text.${doc.prefix}.speaker.${key}` : speaker.textId;
  };
  for (const [key, speaker] of Object.entries(doc.speakers ?? {})) {
    if (typeof speaker === "string") {
      collectText(`speakers/${key}`, `text.${doc.prefix}.speaker.${key}`, speaker);
    } else if (speaker.text !== undefined) {
      collectText(`speakers/${key}`, speaker.textId, speaker.text);
    }
  }
  const resolveNext = (at: string, next: string): string => {
    if (next.startsWith("@")) {
      const target = externalTargets[next.slice(1)];
      if (target === undefined) failV1(doc, at, `external_target_unknown:${next}`);
      return target;
    }
    if (!blockNames.has(next)) failV1(doc, at, `next_unresolved:${next}`);
    // A hold block with an opening stage batch is entered through its
    // compiled stage node so the held picture commits before the wait.
    if (holdOpsBlocks.has(next)) return nodeId(`${next}-stage`);
    return nodeId(next);
  };

  const compileStageOps = (blockName: string, ops: readonly VnReferenceTourStageOpV1[]) =>
    ops.map((op, index) => {
      const at = `${blockName}/op-${String(index)}`;
      if ("setAppearance" in op) {
        const parsed = parseStageMutation(
          {
            kind: "setAppearance",
            layerId: op.setAppearance.layerId,
            tag: op.setAppearance.tag,
            appearance: op.setAppearance.appearance,
          },
          `/${at}`,
        );
        const mutations = [parsed];
        return ({
          mutations: () => mutations,
          mayShow: [] as readonly string[],
          dispatches: [] as readonly StageCueDispatch[],
        });
      }
      const binding = scenes[op.scene];
      if (binding === undefined) failV1(doc, at, `scene_unknown:${op.scene}`);
      if ("open" in op) {
        return ({
          mutations: (stage: SemanticStageState) => binding.scene.openMutations(stage),
          mayShow: binding.scene.mayShow,
          dispatches: [
            { sceneId: binding.scene.sceneId, open: true as const },
          ] as readonly StageCueDispatch[],
        });
      }
      const cueId = binding.cues?.[op.cue];
      if (cueId === undefined) failV1(doc, at, `cue_unknown:${op.scene}/${op.cue}`);
      return ({
        mutations: (stage: SemanticStageState) => binding.scene.cueMutations(cueId, stage),
        mayShow: binding.scene.cueMayShow(cueId),
        dispatches: [
          { sceneId: binding.scene.sceneId, cueId },
        ] as readonly StageCueDispatch[],
      });
    });

  const nodes: VnReferenceTourNarrativeNodeV1[] = [];

  for (const block of doc.blocks) {
    const id = nodeId(block.name);
    switch (block.kind) {
      case "say": {
        const textId = resolveTextId(
          block.name,
          block.textId,
          `text.${doc.prefix}.line.${block.name}`,
          block.text,
        );
        nodes.push({
          kind: "say",
          nodeId: id,
          definitionId: block.definitionId ?? `interaction.${doc.prefix}.${block.name}`,
          seenRevision: block.seenRevision ?? 1,
          speakerTextId: speakerTextId(block.name, block.speaker),
          textId,
          next: resolveNext(block.name, block.next),
        });
        break;
      }
      case "choice": {
        const promptTextId = resolveTextId(
          block.name,
          block.promptTextId,
          `text.${doc.prefix}.choice.${block.name}.prompt`,
          block.prompt,
        );
        // Same-name options inside one choice would silently share their
        // derived choice/text ids; reuse across different choices stays
        // legal (a shared "back" label is meant to share its entry).
        const optionNames = new Set<string>();
        const options = block.options.map((option): VnReferenceTourChoiceOptionV1 => {
          if (optionNames.has(option.name)) {
            failV1(doc, `${block.name}/${option.name}`, "duplicate_option_name");
          }
          optionNames.add(option.name);
          const at = `${block.name}/${option.name}`;
          return ({
            choiceId: `choice.${doc.prefix}.${option.name}`,
            textId: resolveTextId(
              at,
              option.textId,
              `text.${doc.prefix}.choice.${option.name}`,
              option.text,
            ),
            setFlags: [...(option.setFlags ?? [])],
            next: resolveNext(at, option.next),
          });
        });
        nodes.push({
          kind: "choice",
          nodeId: id,
          definitionId: block.definitionId ?? `interaction.${doc.prefix}.${block.name}`,
          seenRevision: block.seenRevision ?? 1,
          promptTextId,
          options: options,
        });
        break;
      }
      case "stage": {
        if (block.ops.length === 0) failV1(doc, block.name, "stage_ops_empty");
        const compiledOps = compileStageOps(block.name, block.ops);
        const lastOp = compiledOps.at(-1);
        if (lastOp === undefined) failV1(doc, block.name, "stage_ops_empty");
        nodes.push({
          kind: "stage",
          nodeId: id,
          mutations: (
            stage: SemanticStageState,
          ) => (compiledOps.flatMap((op) => [...op.mutations(stage)])),
          mayShow: lastOp.mayShow,
          dispatches: compiledOps.flatMap((op) => [...op.dispatches]),
          next: resolveNext(block.name, block.next),
        });
        break;
      }
      case "branch": {
        if (block.cases.length === 0) failV1(doc, block.name, "branch_cases_empty");
        let seenElse = false;
        const compiledCases = block.cases.map((branchCase, index) => {
          const at = `${block.name}/case-${String(index)}`;
          if (branchCase.when === undefined) {
            if (seenElse) failV1(doc, at, "branch_else_duplicate");
            if (index !== block.cases.length - 1) failV1(doc, at, "branch_else_not_last");
            seenElse = true;
          } else {
            if (seenElse) failV1(doc, at, "branch_case_after_else");
            if (typeof branchCase.when.flag !== "string" || branchCase.when.flag.length === 0) {
              failV1(doc, at, "branch_flag_invalid");
            }
          }
          return ({
            flag: branchCase.when?.flag,
            next: resolveNext(at, branchCase.next),
          });
        });
        nodes.push({
          kind: "branch",
          nodeId: id,
          successors: compiledCases.map((branchCase) => branchCase.next),
          choose: (context: { readonly flags: readonly string[] }): string => {
            for (const branchCase of compiledCases) {
              if (branchCase.flag === undefined || context.flags.includes(branchCase.flag)) {
                return branchCase.next;
              }
            }
            throw new TypeError(`vn-reference-tour.narrative_branch_unmatched:${id}`);
          },
        });
        break;
      }
      case "hold": {
        if (!Number.isSafeInteger(block.durationMs) || block.durationMs < 1) {
          failV1(doc, block.name, "hold_duration_invalid");
        }
        if (holdOpsBlocks.has(block.name)) {
          const stageName = `${block.name}-stage`;
          const stageId = nodeId(stageName);
          const compiledOps = compileStageOps(stageName, block.ops ?? []);
          const lastOp = compiledOps.at(-1);
          if (lastOp === undefined) failV1(doc, stageName, "stage_ops_empty");
          nodes.push({
            kind: "stage",
            nodeId: stageId,
            mutations: (
              stage: SemanticStageState,
            ) => (compiledOps.flatMap((op) => [...op.mutations(stage)])),
            mayShow: lastOp.mayShow,
            dispatches: compiledOps.flatMap((op) => [...op.dispatches]),
            next: id,
          });
        }
        nodes.push({
          kind: "hold",
          nodeId: id,
          definitionId: block.definitionId ?? `interaction.${doc.prefix}.${block.name}`,
          seenRevision: block.seenRevision ?? 1,
          durationMs: block.durationMs,
          skippable: block.skippable ?? false,
          next: resolveNext(block.name, block.next),
        });
        break;
      }
      case "end": {
        nodes.push({ kind: "end", nodeId: id });
        break;
      }
      default: {
        const exhaustive: never = block;
        throw new TypeError(
          `vn-reference-tour.interaction_doc_block_unknown:${String(exhaustive)}`,
        );
      }
    }
  }

  return ({
    entryNodeId: holdOpsBlocks.has(doc.entry) ? nodeId(`${doc.entry}-stage`) : nodeId(doc.entry),
    nodes: nodes,
    textEntries: [...textByTextId.entries()].map(([textId, text]) => ({ textId, text })),
  });
}

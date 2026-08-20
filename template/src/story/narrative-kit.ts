// SPDX-License-Identifier: MIT
import type {
  Scene,
  SemanticStageState,
  StageCueDispatch,
  StageMutation,
} from "@sillymaker/base/story";
import { parseStageMutation } from "@sillymaker/base/story";

/**
 * The interaction-document kit (the template flavor of
 * `docs/engine/proposals/interaction-table-authoring.md`).
 *
 * A document is PURE DATA: say/choice/stage/branch/hold/end blocks with
 * short names. Every id the runtime needs derives from one stable short name
 * (`node.<prefix>.<name>`, `interaction.<prefix>.<name>`,
 * `text.<prefix>.line.<name>`, …), the default-locale line lives inline
 * with its block, and every derived id accepts an explicit override, so
 * migrating an existing script keeps its ids (and therefore its saves and
 * digests) byte-identical. The compiler validates everything at admission
 * (unknown speakers, duplicate names, unresolved jumps, bad stage ops fail
 * construction loudly), emits the exact node objects the hand-written
 * script used, collects the text entries the presentation catalog merges,
 * and projects the read-only `NarrativeFlowGraph` (labeled edges, document
 * grouping, no layout) that Studio's Flow workspace renders.
 *
 * Behavior stays in TypeScript: stage composition is referenced through
 * scene documents (open/cue by short key) or a closed mutation vocabulary
 * (`setAppearance`), and branching is a declarative flag test. This is
 * ordinary data construction — no DSL, no runtime, no new engine API.
 */

// ---- Runtime IR (unchanged; the runner in narrative.ts consumes this) ----

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

export interface TemplateSayBlockV1 {
  readonly kind: "say";
  readonly name: string;
  /** A key declared in `speakers`; null narrates without a speaker. */
  readonly speaker: string | null;
  readonly text: string;
  /** Override the derived `text.<prefix>.line.<name>` (keeps old saves). */
  readonly textId?: string;
  /** Override the derived `interaction.<prefix>.<name>`. */
  readonly definitionId?: string;
  readonly next: string;
  /** Bump when the line's meaning changes and Seen should reset. */
  readonly seenRevision?: number;
}

export interface TemplateChoiceOptionInputV1 {
  readonly name: string;
  readonly text: string;
  readonly textId?: string;
  readonly next: string;
  readonly consumesCoins?: number;
  readonly setFlags?: readonly string[];
}

export interface TemplateChoiceBlockV1 {
  readonly kind: "choice";
  readonly name: string;
  readonly prompt: string;
  readonly promptTextId?: string;
  readonly definitionId?: string;
  readonly options: readonly TemplateChoiceOptionInputV1[];
  readonly seenRevision?: number;
}

/**
 * One stage operation. Scene composition (show/hide, placements, cue
 * motions) is referenced by scene short name + cue key; mid-scene
 * appearance beats on standing content stay script-owned through the
 * closed `setAppearance` vocabulary.
 */
export type TemplateStageOpV1 =
  | { readonly scene: string; readonly open: true }
  | { readonly scene: string; readonly cue: string }
  | {
    readonly setAppearance: {
      readonly layerId: string;
      readonly tag: string;
      readonly appearance: Readonly<Record<string, string>>;
    };
  };

export interface TemplateStageBlockV1 {
  readonly kind: "stage";
  readonly name: string;
  readonly ops: readonly TemplateStageOpV1[];
  readonly next: string;
}

export interface TemplateBranchCaseV1 {
  /** Route here when the flag is set; omit on the last case for else. */
  readonly when?: { readonly flag: string };
  readonly next: string;
}

export interface TemplateBranchBlockV1 {
  readonly kind: "branch";
  readonly name: string;
  readonly cases: readonly TemplateBranchCaseV1[];
}

/**
 * An authoritative timed hold between two beats (the engine `hold`
 * interaction): the screen holds for `durationMs`, the Narrative Host
 * reports elapsed milliseconds as hold-fenced time-tick commits, and
 * expiry advances to `next`. Remaining time lives in authoritative State,
 * so a mid-hold Save restores the wait instead of replaying a wall clock.
 * Ported MV `WAIT n` frame counts convert here: `round(n × 1000 / 60)`.
 */
export interface TemplateHoldBlockV1 {
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
  readonly ops?: readonly TemplateStageOpV1[];
  /** Override the derived `interaction.<prefix>.<name>`. */
  readonly definitionId?: string;
  readonly seenRevision?: number;
  readonly next: string;
}

export interface TemplateEndBlockV1 {
  readonly kind: "end";
  readonly name: string;
}

export type TemplateInteractionBlockV1 =
  | TemplateSayBlockV1
  | TemplateChoiceBlockV1
  | TemplateStageBlockV1
  | TemplateBranchBlockV1
  | TemplateHoldBlockV1
  | TemplateEndBlockV1;

export interface TemplateInteractionDocV1 {
  /** The id prefix, e.g. `"template"` → `node.template.<name>`. */
  readonly prefix: string;
  readonly docId: string;
  /** Speaker key → default-locale display name (`text.<p>.speaker.<key>`). */
  readonly speakers?: Readonly<Record<string, string>>;
  readonly entry: string;
  readonly blocks: readonly TemplateInteractionBlockV1[];
}

/** Scene handle the compiler resolves stage ops against. */
export interface TemplateSceneBindingV1 {
  readonly scene: Scene;
  /** Short cue key → real cue id (`courtyard` → `cue.template.opening.courtyard`). */
  readonly cues?: Readonly<Record<string, string>>;
}

export interface TemplateCompileInputV1 {
  readonly doc: TemplateInteractionDocV1;
  readonly scenes?: Readonly<Record<string, TemplateSceneBindingV1>>;
  /** `@label` cross-document targets → real nodeIds. */
  readonly externalTargets?: Readonly<Record<string, string>>;
}

// ---- Flow-graph projection (shape frozen by the main-repo proposal) ----

export interface TemplateFlowGraphNodeV1 {
  readonly nodeId: string;
  readonly kind:
    | "say"
    | "menu"
    | "effect"
    | "roll"
    | "stage"
    | "branch"
    | "flag"
    | "barrier"
    | "hold"
    | "end";
  readonly docId: string | null;
  readonly blockName: string | null;
  readonly summary: string;
  readonly source: string;
}

export type TemplateFlowGraphEdgeLabelV1 =
  | { readonly kind: "next" }
  | {
    readonly kind: "choice";
    readonly choiceId: string;
    readonly textId: string;
    /** Authored option copy when the block inlined it. */
    readonly text?: string;
    readonly gates: readonly string[];
  }
  | { readonly kind: "roll"; readonly outcome: string }
  | { readonly kind: "branch"; readonly condition: string }
  | { readonly kind: "call"; readonly label: string };

export interface TemplateFlowGraphEdgeV1 {
  readonly from: string;
  readonly to: string;
  readonly label: TemplateFlowGraphEdgeLabelV1;
}

export interface TemplateFlowGraphV1 {
  readonly nodes: readonly TemplateFlowGraphNodeV1[];
  readonly edges: readonly TemplateFlowGraphEdgeV1[];
}

export interface TemplateCompiledInteractionV1 {
  readonly entryNodeId: string;
  readonly nodes: readonly TemplateNarrativeNodeV1[];
  /** Default-locale entries collected from the inline block text. */
  readonly textEntries: readonly { readonly textId: string; readonly text: string }[];
  readonly flowGraph: TemplateFlowGraphV1;
}

// ---- Compiler ----

function failV1(doc: TemplateInteractionDocV1, at: string, reason: string): never {
  throw new TypeError(`template.interaction_doc_invalid:${doc.docId}/${at}:${reason}`);
}

export function compileTemplateInteractionDocV1(
  input: TemplateCompileInputV1,
): TemplateCompiledInteractionV1 {
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
  const speakerTextId = (at: string, key: string | null): string | null => {
    if (key === null) return null;
    if (input.doc.speakers?.[key] === undefined) failV1(doc, at, `speaker_unknown:${key}`);
    return `text.${doc.prefix}.speaker.${key}`;
  };
  for (const [key, name] of Object.entries(doc.speakers ?? {})) {
    collectText(`speakers/${key}`, `text.${doc.prefix}.speaker.${key}`, name);
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

  const compileStageOps = (blockName: string, ops: readonly TemplateStageOpV1[]) =>
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
        const mutations = Object.freeze([parsed]);
        return Object.freeze({
          mutations: () => mutations,
          mayShow: Object.freeze([]) as readonly string[],
          dispatches: Object.freeze([]) as readonly StageCueDispatch[],
          summary: `appearance:${op.setAppearance.tag}`,
        });
      }
      const binding = scenes[op.scene];
      if (binding === undefined) failV1(doc, at, `scene_unknown:${op.scene}`);
      if ("open" in op) {
        return Object.freeze({
          mutations: (stage: SemanticStageState) => binding.scene.openMutations(stage),
          mayShow: binding.scene.mayShow,
          dispatches: Object.freeze([
            { sceneId: binding.scene.sceneId, open: true as const },
          ]) as readonly StageCueDispatch[],
          summary: `open:${binding.scene.sceneId}`,
        });
      }
      const cueId = binding.cues?.[op.cue];
      if (cueId === undefined) failV1(doc, at, `cue_unknown:${op.scene}/${op.cue}`);
      return Object.freeze({
        mutations: (stage: SemanticStageState) => binding.scene.cueMutations(cueId, stage),
        mayShow: binding.scene.cueMayShow(cueId),
        dispatches: Object.freeze([
          { sceneId: binding.scene.sceneId, cueId },
        ]) as readonly StageCueDispatch[],
        summary: `cue:${binding.scene.sceneId}/${op.cue}`,
      });
    });

  const nodes: TemplateNarrativeNodeV1[] = [];
  const graphNodes: TemplateFlowGraphNodeV1[] = [];
  const graphEdges: TemplateFlowGraphEdgeV1[] = [];
  const edge = (
    at: string,
    from: string,
    next: string,
    label: TemplateFlowGraphEdgeLabelV1,
  ): void => {
    const isExternal = next.startsWith("@");
    graphEdges.push(Object.freeze({
      from,
      to: resolveNext(at, next),
      label: isExternal && label.kind === "next"
        ? Object.freeze({ kind: "call" as const, label: next.slice(1) })
        : label,
    }));
  };

  for (const block of doc.blocks) {
    const id = nodeId(block.name);
    const source = `interaction-doc:${doc.docId}#${block.name}`;
    switch (block.kind) {
      case "say": {
        const textId = collectText(
          block.name,
          block.textId ?? `text.${doc.prefix}.line.${block.name}`,
          block.text,
        );
        nodes.push(Object.freeze({
          kind: "say",
          nodeId: id,
          definitionId: block.definitionId ?? `interaction.${doc.prefix}.${block.name}`,
          seenRevision: block.seenRevision ?? 1,
          speakerTextId: speakerTextId(block.name, block.speaker),
          textId,
          next: resolveNext(block.name, block.next),
        }));
        graphNodes.push(Object.freeze({
          nodeId: id,
          kind: "say",
          docId: doc.docId,
          blockName: block.name,
          summary: block.text ?? textId,
          source,
        }));
        edge(block.name, id, block.next, Object.freeze({ kind: "next" as const }));
        break;
      }
      case "choice": {
        const promptTextId = collectText(
          block.name,
          block.promptTextId ?? `text.${doc.prefix}.choice.${block.name}.prompt`,
          block.prompt,
        );
        // Same-name options inside one choice would silently share their
        // derived choice/text ids; reuse across different choices stays
        // legal (a shared "back" label is meant to share its entry).
        const optionNames = new Set<string>();
        const options = block.options.map((option): TemplateChoiceOptionV1 => {
          if (optionNames.has(option.name)) {
            failV1(doc, `${block.name}/${option.name}`, "duplicate_option_name");
          }
          optionNames.add(option.name);
          const at = `${block.name}/${option.name}`;
          return Object.freeze({
            choiceId: `choice.${doc.prefix}.${option.name}`,
            textId: collectText(
              at,
              option.textId ?? `text.${doc.prefix}.choice.${option.name}`,
              option.text,
            ),
            consumesCoins: option.consumesCoins ?? 0,
            setFlags: Object.freeze([...(option.setFlags ?? [])]),
            next: resolveNext(at, option.next),
          });
        });
        nodes.push(Object.freeze({
          kind: "choice",
          nodeId: id,
          definitionId: block.definitionId ?? `interaction.${doc.prefix}.${block.name}`,
          seenRevision: block.seenRevision ?? 1,
          promptTextId,
          options: Object.freeze(options),
        }));
        graphNodes.push(Object.freeze({
          nodeId: id,
          kind: "menu",
          docId: doc.docId,
          blockName: block.name,
          summary: [
            block.prompt ?? promptTextId,
            ...block.options.map((option) => option.text ?? option.name),
          ].join(" / "),
          source,
        }));
        for (const [index, option] of block.options.entries()) {
          const compiled = options[index];
          if (compiled === undefined) continue;
          edge(
            `${block.name}/${option.name}`,
            id,
            option.next,
            Object.freeze({
              kind: "choice" as const,
              choiceId: compiled.choiceId,
              textId: compiled.textId,
              text: option.text,
              gates: Object.freeze(
                compiled.consumesCoins > 0 ? [`coins:${String(compiled.consumesCoins)}`] : [],
              ),
            }),
          );
        }
        break;
      }
      case "stage": {
        if (block.ops.length === 0) failV1(doc, block.name, "stage_ops_empty");
        const compiledOps = compileStageOps(block.name, block.ops);
        const lastOp = compiledOps.at(-1);
        if (lastOp === undefined) failV1(doc, block.name, "stage_ops_empty");
        nodes.push(Object.freeze({
          kind: "stage",
          nodeId: id,
          mutations: (stage: SemanticStageState) =>
            Object.freeze(compiledOps.flatMap((op) => [...op.mutations(stage)])),
          mayShow: lastOp.mayShow,
          dispatches: Object.freeze(compiledOps.flatMap((op) => [...op.dispatches])),
          next: resolveNext(block.name, block.next),
        }));
        graphNodes.push(Object.freeze({
          nodeId: id,
          kind: "stage",
          docId: doc.docId,
          blockName: block.name,
          summary: compiledOps.map((op) => op.summary).join(" + "),
          source,
        }));
        edge(block.name, id, block.next, Object.freeze({ kind: "next" as const }));
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
          return Object.freeze({
            flag: branchCase.when?.flag,
            next: resolveNext(at, branchCase.next),
          });
        });
        nodes.push(Object.freeze({
          kind: "branch",
          nodeId: id,
          successors: Object.freeze(compiledCases.map((branchCase) => branchCase.next)),
          choose: (context: { readonly flags: readonly string[] }): string => {
            for (const branchCase of compiledCases) {
              if (branchCase.flag === undefined || context.flags.includes(branchCase.flag)) {
                return branchCase.next;
              }
            }
            throw new TypeError(`template.narrative_branch_unmatched:${id}`);
          },
        }));
        graphNodes.push(Object.freeze({
          nodeId: id,
          kind: "branch",
          docId: doc.docId,
          blockName: block.name,
          summary: compiledCases
            .map((branchCase) => branchCase.flag === undefined ? "else" : `flag ${branchCase.flag}`)
            .join(" | "),
          source,
        }));
        for (const [index, branchCase] of block.cases.entries()) {
          edge(
            `${block.name}/case-${String(index)}`,
            id,
            branchCase.next,
            Object.freeze({
              kind: "branch" as const,
              condition: branchCase.when === undefined ? "else" : `flag ${branchCase.when.flag}`,
            }),
          );
        }
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
          nodes.push(Object.freeze({
            kind: "stage",
            nodeId: stageId,
            mutations: (stage: SemanticStageState) =>
              Object.freeze(compiledOps.flatMap((op) => [...op.mutations(stage)])),
            mayShow: lastOp.mayShow,
            dispatches: Object.freeze(compiledOps.flatMap((op) => [...op.dispatches])),
            next: id,
          }));
          graphNodes.push(Object.freeze({
            nodeId: stageId,
            kind: "stage",
            docId: doc.docId,
            blockName: stageName,
            summary: compiledOps.map((op) => op.summary).join(" + "),
            source,
          }));
          graphEdges.push(Object.freeze({
            from: stageId,
            to: id,
            label: Object.freeze({ kind: "next" as const }),
          }));
        }
        nodes.push(Object.freeze({
          kind: "hold",
          nodeId: id,
          definitionId: block.definitionId ?? `interaction.${doc.prefix}.${block.name}`,
          seenRevision: block.seenRevision ?? 1,
          durationMs: block.durationMs,
          skippable: block.skippable ?? false,
          next: resolveNext(block.name, block.next),
        }));
        graphNodes.push(Object.freeze({
          nodeId: id,
          kind: "hold",
          docId: doc.docId,
          blockName: block.name,
          summary: `hold ${String(block.durationMs)}ms${
            (block.skippable ?? false) ? " skippable" : ""
          }`,
          source,
        }));
        edge(block.name, id, block.next, Object.freeze({ kind: "next" as const }));
        break;
      }
      case "end": {
        nodes.push(Object.freeze({ kind: "end", nodeId: id }));
        graphNodes.push(Object.freeze({
          nodeId: id,
          kind: "end",
          docId: doc.docId,
          blockName: block.name,
          summary: "end",
          source,
        }));
        break;
      }
      default: {
        const exhaustive: never = block;
        throw new TypeError(`template.interaction_doc_block_unknown:${String(exhaustive)}`);
      }
    }
  }

  return Object.freeze({
    entryNodeId: holdOpsBlocks.has(doc.entry) ? nodeId(`${doc.entry}-stage`) : nodeId(doc.entry),
    nodes: Object.freeze(nodes),
    textEntries: Object.freeze(
      [...textByTextId.entries()].map(([textId, text]) => Object.freeze({ textId, text })),
    ),
    flowGraph: Object.freeze({
      nodes: Object.freeze(graphNodes),
      edges: Object.freeze(graphEdges),
    }),
  });
}

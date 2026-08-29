// SPDX-License-Identifier: MIT
import type {
  InteractionResolution,
  NarrativeHistory,
  PendingInteraction,
  Scene,
  SemanticStageState,
  StageCueDispatch,
  StageMutation,
  TimeTick,
} from "@sillymaker/base/story";
import type { StrictJsonValueV1 } from "@sillymaker/base/strict-json";
import {
  appendNarrativeHistory,
  interactionOccurrenceId,
  parsePendingInteraction,
  parseStageMutation,
  reduceAdmittedStageMutations,
  settleHoldTimeline,
} from "@sillymaker/base/story";

export interface VnNarrativeCoreStateV1 {
  readonly phase: "idle" | "active" | "completed";
  readonly cursor: string | null;
  readonly pending: PendingInteraction | null;
  readonly sequence: number;
  readonly history: NarrativeHistory;
}

export interface VnChoiceOptionV1<TChoiceEffect extends StrictJsonValueV1> {
  readonly choiceId: string;
  readonly textId: string;
  readonly effect: TChoiceEffect | null;
  readonly next: string;
}

export type VnNarrativeNodeV1<
  TChoiceEffect extends StrictJsonValueV1,
  TPredicate extends StrictJsonValueV1,
> =
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
    readonly mayShow: readonly string[];
    readonly dispatches: readonly StageCueDispatch[];
    readonly next: string;
  }
  | {
    readonly kind: "choice";
    readonly nodeId: string;
    readonly definitionId: string;
    readonly seenRevision: number;
    readonly promptTextId: string;
    readonly options: readonly VnChoiceOptionV1<TChoiceEffect>[];
  }
  | {
    readonly kind: "branch";
    readonly nodeId: string;
    readonly cases: readonly {
      readonly predicate: TPredicate | null;
      readonly next: string;
    }[];
    readonly successors: readonly string[];
  }
  | {
    readonly kind: "hold";
    readonly nodeId: string;
    readonly definitionId: string;
    readonly seenRevision: number;
    readonly durationMs: number;
    readonly tickQuantumMs?: number;
    readonly skippable: boolean;
    readonly when: readonly { readonly predicate: TPredicate; readonly next: string }[];
    readonly next: string;
  }
  | { readonly kind: "end"; readonly nodeId: string };

export interface VnSayBlockV1 {
  readonly kind: "say";
  readonly name: string;
  readonly speaker: string | null;
  readonly text?: string;
  readonly textId?: string;
  readonly definitionId?: string;
  readonly next: string;
  readonly seenRevision?: number;
}

export interface VnChoiceOptionInputV1<TChoiceEffect extends StrictJsonValueV1> {
  readonly name: string;
  readonly text?: string;
  readonly textId?: string;
  readonly next: string;
  readonly effect?: TChoiceEffect;
}

export interface VnChoiceBlockV1<TChoiceEffect extends StrictJsonValueV1> {
  readonly kind: "choice";
  readonly name: string;
  readonly prompt?: string;
  readonly promptTextId?: string;
  readonly definitionId?: string;
  readonly options: readonly VnChoiceOptionInputV1<TChoiceEffect>[];
  readonly seenRevision?: number;
}

export type VnStageOperationV1 =
  | { readonly scene: string; readonly open: true }
  | { readonly scene: string; readonly cue: string }
  | {
    readonly setAppearance: {
      readonly layerId: string;
      readonly tag: string;
      readonly appearance: Readonly<Record<string, string>>;
    };
  };

export interface VnStageBlockV1 {
  readonly kind: "stage";
  readonly name: string;
  readonly ops: readonly VnStageOperationV1[];
  readonly next: string;
}

export interface VnBranchCaseV1<TPredicate extends StrictJsonValueV1> {
  readonly when?: TPredicate;
  readonly next: string;
}

export interface VnBranchBlockV1<TPredicate extends StrictJsonValueV1> {
  readonly kind: "branch";
  readonly name: string;
  readonly cases: readonly VnBranchCaseV1<TPredicate>[];
}

export interface VnHoldWhenArmV1<TPredicate extends StrictJsonValueV1> {
  readonly when: TPredicate;
  readonly next: string;
}

export interface VnHoldBlockV1<TPredicate extends StrictJsonValueV1> {
  readonly kind: "hold";
  readonly name: string;
  readonly durationMs: number;
  readonly tickQuantumMs?: number;
  readonly skippable?: boolean;
  readonly ops?: readonly VnStageOperationV1[];
  readonly when?: readonly VnHoldWhenArmV1<TPredicate>[];
  readonly definitionId?: string;
  readonly seenRevision?: number;
  readonly next: string;
}

export interface VnEndBlockV1 {
  readonly kind: "end";
  readonly name: string;
}

export type VnInteractionBlockV1<
  TChoiceEffect extends StrictJsonValueV1,
  TPredicate extends StrictJsonValueV1,
> =
  | VnSayBlockV1
  | VnChoiceBlockV1<TChoiceEffect>
  | VnStageBlockV1
  | VnBranchBlockV1<TPredicate>
  | VnHoldBlockV1<TPredicate>
  | VnEndBlockV1;

export interface VnInteractionDocumentV1<
  TChoiceEffect extends StrictJsonValueV1,
  TPredicate extends StrictJsonValueV1,
> {
  readonly prefix: string;
  readonly docId: string;
  readonly speakers?: Readonly<
    Record<string, string | { readonly textId: string; readonly text?: string }>
  >;
  readonly entry: string;
  readonly blocks: readonly VnInteractionBlockV1<TChoiceEffect, TPredicate>[];
}

export interface VnSceneBindingV1 {
  readonly scene: Scene;
  readonly cues?: Readonly<Record<string, string>>;
}

export interface CompileVnInteractionDocumentInputV1<
  TChoiceEffect extends StrictJsonValueV1,
  TPredicate extends StrictJsonValueV1,
> {
  readonly doc: VnInteractionDocumentV1<TChoiceEffect, TPredicate>;
  readonly scenes?: Readonly<Record<string, VnSceneBindingV1>>;
  readonly externalTargets?: Readonly<Record<string, string>>;
  /** Product prefix retained in diagnostics while migrating an existing Story. */
  readonly errorPrefix?: string;
}

export interface CompiledVnInteractionDocumentV1<
  TChoiceEffect extends StrictJsonValueV1,
  TPredicate extends StrictJsonValueV1,
> {
  readonly entryNodeId: string;
  readonly nodes: readonly VnNarrativeNodeV1<TChoiceEffect, TPredicate>[];
  readonly textEntries: readonly { readonly textId: string; readonly text: string }[];
}

export function compileVnInteractionDocumentV1<
  TChoiceEffect extends StrictJsonValueV1,
  TPredicate extends StrictJsonValueV1,
>(
  input: CompileVnInteractionDocumentInputV1<TChoiceEffect, TPredicate>,
): CompiledVnInteractionDocumentV1<TChoiceEffect, TPredicate> {
  const { doc } = input;
  const scenes = input.scenes ?? {};
  const externalTargets = input.externalTargets ?? {};
  const fail = (at: string, reason: string): never => {
    throw new TypeError(
      `${input.errorPrefix ?? "vn"}.interaction_doc_invalid:${doc.docId}/${at}:${reason}`,
    );
  };
  const nodeId = (name: string): string => `node.${doc.prefix}.${name}`;
  const blockNames = new Set<string>();
  const declaredBlockNames = new Set<string>();
  const holdOpsBlocks = new Set<string>();
  const definitionIds = new Set<string>();
  const definitionIdFor = (blockName: string, explicit: string | undefined): string => {
    const definitionId = explicit ?? `interaction.${doc.prefix}.${blockName}`;
    if (definitionIds.has(definitionId)) {
      fail(blockName, `duplicate_definition_id:${definitionId}`);
    }
    definitionIds.add(definitionId);
    return definitionId;
  };
  for (const block of doc.blocks) {
    if (blockNames.has(block.name)) fail(block.name, "duplicate_block_name");
    blockNames.add(block.name);
    declaredBlockNames.add(block.name);
    if (block.kind === "hold" && (block.ops?.length ?? 0) > 0) {
      const stageName = `${block.name}-stage`;
      if (blockNames.has(stageName)) fail(stageName, "duplicate_block_name");
      blockNames.add(stageName);
      holdOpsBlocks.add(block.name);
    }
  }
  if (!declaredBlockNames.has(doc.entry)) fail(doc.entry, "entry_missing");

  const textByTextId = new Map<string, string>();
  const collectText = (at: string, textId: string, text: string): string => {
    const existing = textByTextId.get(textId);
    if (existing !== undefined && existing !== text) fail(at, `text_conflict:${textId}`);
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
      fail(at, "text_id_required_without_inline_text");
    }
    const textId = explicitTextId ?? derivedTextId;
    if (text !== undefined) collectText(at, textId, text);
    return textId;
  };
  const speakerTextId = (at: string, key: string | null): string | null => {
    if (key === null) return null;
    const speaker = doc.speakers?.[key] ?? fail(at, `speaker_unknown:${key}`);
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
      return externalTargets[next.slice(1)] ?? fail(at, `external_target_unknown:${next}`);
    }
    if (!declaredBlockNames.has(next)) fail(at, `next_unresolved:${next}`);
    return nodeId(holdOpsBlocks.has(next) ? `${next}-stage` : next);
  };
  const compileStageOps = (blockName: string, ops: readonly VnStageOperationV1[]) =>
    ops.map((op, index) => {
      const at = `${blockName}/op-${String(index)}`;
      if ("setAppearance" in op) {
        const parsed = parseStageMutation({
          kind: "setAppearance",
          layerId: op.setAppearance.layerId,
          tag: op.setAppearance.tag,
          appearance: op.setAppearance.appearance,
        }, `/${at}`);
        return {
          mutations: (_stage: SemanticStageState) => [parsed] as const,
          mayShow: [] as readonly string[],
          dispatches: [] as readonly StageCueDispatch[],
        };
      }
      const binding = scenes[op.scene] ?? fail(at, `scene_unknown:${op.scene}`);
      if ("open" in op) {
        return {
          mutations: (stage: SemanticStageState) => binding.scene.openMutations(stage),
          mayShow: binding.scene.mayShow,
          dispatches: [{ sceneId: binding.scene.sceneId, open: true as const }],
        };
      }
      const cueId = binding.cues?.[op.cue] ?? fail(at, `cue_unknown:${op.scene}/${op.cue}`);
      return {
        mutations: (stage: SemanticStageState) => binding.scene.cueMutations(cueId, stage),
        mayShow: binding.scene.cueMayShow(cueId),
        dispatches: [{ sceneId: binding.scene.sceneId, cueId }],
      };
    });

  const nodes: VnNarrativeNodeV1<TChoiceEffect, TPredicate>[] = [];
  for (const block of doc.blocks) {
    const id = nodeId(block.name);
    switch (block.kind) {
      case "say":
        nodes.push({
          kind: "say",
          nodeId: id,
          definitionId: definitionIdFor(block.name, block.definitionId),
          seenRevision: block.seenRevision ?? 1,
          speakerTextId: speakerTextId(block.name, block.speaker),
          textId: resolveTextId(
            block.name,
            block.textId,
            `text.${doc.prefix}.line.${block.name}`,
            block.text,
          ),
          next: resolveNext(block.name, block.next),
        });
        break;
      case "choice":
        if (block.options.length === 0) fail(block.name, "choice_options_empty");
        {
          const optionNames = new Set<string>();
          for (const option of block.options) {
            if (optionNames.has(option.name)) {
              fail(`${block.name}/${option.name}`, "duplicate_option_name");
            }
            optionNames.add(option.name);
          }
        }
        nodes.push({
          kind: "choice",
          nodeId: id,
          definitionId: definitionIdFor(block.name, block.definitionId),
          seenRevision: block.seenRevision ?? 1,
          promptTextId: resolveTextId(
            `${block.name}/prompt`,
            block.promptTextId,
            `text.${doc.prefix}.choice.${block.name}.prompt`,
            block.prompt,
          ),
          options: block.options.map((option) => ({
            choiceId: `choice.${doc.prefix}.${option.name}`,
            textId: resolveTextId(
              `${block.name}/${option.name}`,
              option.textId,
              `text.${doc.prefix}.choice.${option.name}`,
              option.text,
            ),
            effect: option.effect ?? null,
            next: resolveNext(`${block.name}/${option.name}`, option.next),
          })),
        });
        break;
      case "stage": {
        if (block.ops.length === 0) fail(block.name, "stage_ops_empty");
        const compiled = compileStageOps(block.name, block.ops);
        nodes.push({
          kind: "stage",
          nodeId: id,
          mutations: (stage) => compiled.flatMap((op) => [...op.mutations(stage)]),
          mayShow: [...new Set(compiled.flatMap((op) => [...op.mayShow]))],
          dispatches: compiled.flatMap((op) => [...op.dispatches]),
          next: resolveNext(block.name, block.next),
        });
        break;
      }
      case "branch": {
        if (block.cases.length === 0) fail(block.name, "branch_cases_empty");
        let seenElse = false;
        const cases = block.cases.map((branchCase, index) => {
          const at = `${block.name}/case-${String(index)}`;
          if (branchCase.when === undefined) {
            if (seenElse) fail(at, "branch_else_duplicate");
            if (index !== block.cases.length - 1) fail(at, "branch_else_not_last");
            seenElse = true;
          } else if (seenElse) {
            fail(at, "branch_case_after_else");
          }
          return {
            predicate: branchCase.when ?? null,
            next: resolveNext(at, branchCase.next),
          };
        });
        nodes.push({
          kind: "branch",
          nodeId: id,
          cases,
          successors: [...new Set(cases.map((branchCase) => branchCase.next))],
        });
        break;
      }
      case "hold": {
        if (!Number.isSafeInteger(block.durationMs) || block.durationMs < 1) {
          fail(block.name, "hold_duration_invalid");
        }
        if (
          block.tickQuantumMs !== undefined &&
          (!Number.isSafeInteger(block.tickQuantumMs) || block.tickQuantumMs < 1)
        ) {
          fail(block.name, "hold_tick_quantum_invalid");
        }
        if (block.when !== undefined && block.when.length === 0) {
          fail(block.name, "hold_when_empty");
        }
        if (holdOpsBlocks.has(block.name)) {
          const stageName = `${block.name}-stage`;
          const compiled = compileStageOps(stageName, block.ops ?? []);
          nodes.push({
            kind: "stage",
            nodeId: nodeId(stageName),
            mutations: (stage) => compiled.flatMap((op) => [...op.mutations(stage)]),
            mayShow: [...new Set(compiled.flatMap((op) => [...op.mayShow]))],
            dispatches: compiled.flatMap((op) => [...op.dispatches]),
            next: id,
          });
        }
        nodes.push({
          kind: "hold",
          nodeId: id,
          definitionId: definitionIdFor(block.name, block.definitionId),
          seenRevision: block.seenRevision ?? 1,
          durationMs: block.durationMs,
          ...(block.tickQuantumMs === undefined ? {} : { tickQuantumMs: block.tickQuantumMs }),
          skippable: block.skippable ?? false,
          when: (block.when ?? []).map((arm, index) => ({
            predicate: arm.when,
            next: resolveNext(`${block.name}/when-${String(index)}`, arm.next),
          })),
          next: resolveNext(block.name, block.next),
        });
        break;
      }
      case "end":
        nodes.push({ kind: "end", nodeId: id });
        break;
      default: {
        const exhaustive: never = block;
        throw new TypeError(`vn.interaction_doc_block_unknown:${String(exhaustive)}`);
      }
    }
  }
  return {
    entryNodeId: holdOpsBlocks.has(doc.entry) ? nodeId(`${doc.entry}-stage`) : nodeId(doc.entry),
    nodes,
    textEntries: [...textByTextId].map(([textId, text]) => ({ textId, text })),
  };
}

export interface VnNarrativeRunResultV1<TState extends VnNarrativeCoreStateV1> {
  readonly narrative: TState;
  readonly stageMutations: readonly StageMutation[];
  readonly stageDispatches: readonly StageCueDispatch[];
}

export type VnNarrativeTimeContinuationV1<TState extends VnNarrativeCoreStateV1> =
  | { readonly kind: "advanced"; readonly narrative: TState }
  | { readonly kind: "holding"; readonly narrative: TState };

export interface CreateVnInteractionRuntimeInputV1<
  TState extends VnNarrativeCoreStateV1,
  TChoiceEffect extends StrictJsonValueV1,
  TPredicate extends StrictJsonValueV1,
> {
  readonly entryNodeId: string;
  readonly nodes: readonly VnNarrativeNodeV1<TChoiceEffect, TPredicate>[];
  readonly errorPrefix: string;
  matchesPredicate(state: TState, predicate: TPredicate): boolean;
  applyChoiceEffect(state: TState, effect: TChoiceEffect): TState;
  onBegin?(state: TState): TState;
}

export interface VnInteractionRuntimeV1<
  TState extends VnNarrativeCoreStateV1,
  TChoiceEffect extends StrictJsonValueV1,
> {
  readonly nodeIds: readonly string[];
  choiceOptionsFor(definitionId: string): readonly VnChoiceOptionV1<TChoiceEffect>[];
  runUntilInteraction(
    narrative: TState,
    stage: SemanticStageState,
  ): VnNarrativeRunResultV1<TState>;
  afterResolution(narrative: TState, resolution: InteractionResolution): TState;
  afterTimeTick(
    narrative: TState,
    tick: TimeTick,
  ): VnNarrativeTimeContinuationV1<TState>;
  atBegin(narrative: TState): TState;
}

export function createVnInteractionRuntimeV1<
  TState extends VnNarrativeCoreStateV1,
  TChoiceEffect extends StrictJsonValueV1,
  TPredicate extends StrictJsonValueV1,
>(
  input: CreateVnInteractionRuntimeInputV1<TState, TChoiceEffect, TPredicate>,
): VnInteractionRuntimeV1<TState, TChoiceEffect> {
  const nodesById = new Map(input.nodes.map((node) => [node.nodeId, node]));
  const choicesByDefinitionId = new Map<string, readonly VnChoiceOptionV1<TChoiceEffect>[]>();
  for (const node of input.nodes) {
    if (node.kind === "choice" && !choicesByDefinitionId.has(node.definitionId)) {
      choicesByDefinitionId.set(node.definitionId, node.options);
    }
  }
  const fail = (code: string, reference = ""): never => {
    throw new TypeError(`${input.errorPrefix}.${code}${reference === "" ? "" : `:${reference}`}`);
  };
  const requireNode = (nodeId: string): VnNarrativeNodeV1<TChoiceEffect, TPredicate> =>
    nodesById.get(nodeId) ?? fail("narrative_node_missing", nodeId);
  const pendingForNode = (
    node: VnNarrativeNodeV1<TChoiceEffect, TPredicate>,
    sequence: number,
  ): PendingInteraction => {
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
          ...(node.tickQuantumMs === undefined ? {} : { tickQuantumMs: node.tickQuantumMs }),
          skippable: node.skippable,
        });
      default:
        return fail("narrative_node_not_interactive", node.nodeId);
    }
  };
  const core = (state: TState, value: VnNarrativeCoreStateV1): TState => ({ ...state, ...value });

  return {
    nodeIds: [...nodesById.keys()],
    choiceOptionsFor(definitionId) {
      return choicesByDefinitionId.get(definitionId) ?? [];
    },
    runUntilInteraction(narrative, stage) {
      if (narrative.cursor === null) return fail("narrative_cursor_missing");
      let cursor: string | null = narrative.cursor;
      let sequence = narrative.sequence;
      let localStage = stage;
      const collected: StageMutation[] = [];
      const collectedDispatches: StageCueDispatch[] = [];
      const visitedPureNodes = new Set<string>();
      while (cursor !== null) {
        const node = requireNode(cursor);
        if (node.kind === "branch" || node.kind === "stage" || node.kind === "end") {
          if (visitedPureNodes.has(node.nodeId)) return fail("narrative_pure_cycle", node.nodeId);
          visitedPureNodes.add(node.nodeId);
        }
        if (node.kind === "branch") {
          const selected = node.cases.find((branchCase) =>
            branchCase.predicate === null || input.matchesPredicate(narrative, branchCase.predicate)
          );
          if (selected === undefined || !node.successors.includes(selected.next)) {
            return fail("narrative_branch_invalid", node.nodeId);
          }
          cursor = selected.next;
          continue;
        }
        if (node.kind === "stage") {
          const mutations = node.mutations(localStage);
          if (mutations.length > 0) {
            const outcome = reduceAdmittedStageMutations(localStage, mutations);
            if (outcome.kind !== "applied") return fail("narrative_stage_invalid", node.nodeId);
            localStage = outcome.state;
            collected.push(...mutations);
            collectedDispatches.push(...node.dispatches);
          }
          cursor = node.next;
          continue;
        }
        if (node.kind === "end") {
          return {
            narrative: core(narrative, {
              phase: "completed",
              cursor: null,
              pending: null,
              sequence,
              history: narrative.history,
            }),
            stageMutations: collected,
            stageDispatches: collectedDispatches,
          };
        }
        if (node.kind === "hold") {
          const arm = node.when.find((candidate) =>
            input.matchesPredicate(narrative, candidate.predicate)
          );
          if (arm !== undefined) {
            if (visitedPureNodes.has(node.nodeId)) {
              return fail("narrative_pure_cycle", node.nodeId);
            }
            visitedPureNodes.add(node.nodeId);
            cursor = arm.next;
            continue;
          }
        }
        sequence += 1;
        return {
          narrative: core(narrative, {
            phase: "active",
            cursor: node.nodeId,
            pending: pendingForNode(node, sequence),
            sequence,
            history: narrative.history,
          }),
          stageMutations: collected,
          stageDispatches: collectedDispatches,
        };
      }
      return fail("narrative_cursor_missing");
    },
    afterResolution(narrative, resolution) {
      const pending = narrative.pending;
      if (pending === null || narrative.cursor === null) return fail("narrative_nothing_pending");
      const node = requireNode(narrative.cursor);
      let next: string;
      let state = narrative;
      let history = narrative.history;
      if (node.kind === "choice" && resolution.kind === "choose") {
        const option = node.options.find((candidate) => candidate.choiceId === resolution.choiceId);
        if (option === undefined) return fail("narrative_choice_missing");
        next = option.next;
        if (option.effect !== null) state = input.applyChoiceEffect(state, option.effect);
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
        return fail("narrative_resolution_mismatch", node.nodeId);
      }
      return core(state, {
        phase: "active",
        cursor: next,
        pending: null,
        sequence: state.sequence,
        history,
      });
    },
    afterTimeTick(narrative, tick) {
      const pending = narrative.pending;
      if (pending === null || pending.kind !== "hold" || narrative.cursor === null) {
        return fail("narrative_no_hold_pending");
      }
      const node = requireNode(narrative.cursor);
      if (node.kind !== "hold") return fail("narrative_resolution_mismatch", node.nodeId);
      const outcome = settleHoldTimeline({
        pending,
        elapsedMs: tick.elapsedMs,
        arms: node.when.map((arm) => () => input.matchesPredicate(narrative, arm.predicate)),
      });
      if (outcome.kind === "holding") {
        return { kind: "holding", narrative: { ...narrative, pending: outcome.pending } };
      }
      let cursor = node.next;
      if (outcome.kind === "rerouted") {
        const arm = node.when[outcome.armIndex];
        if (arm === undefined) return fail("narrative_hold_arm_missing", node.nodeId);
        cursor = arm.next;
      }
      return {
        kind: "advanced",
        narrative: core(narrative, {
          phase: "active",
          cursor,
          pending: null,
          sequence: narrative.sequence,
          history: narrative.history,
        }),
      };
    },
    atBegin(narrative) {
      const started = core(narrative, {
        phase: "active",
        cursor: input.entryNodeId,
        pending: null,
        sequence: narrative.sequence,
        history: narrative.history,
      });
      return input.onBegin?.(started) ?? started;
    },
  };
}

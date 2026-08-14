// SPDX-License-Identifier: MIT
import type { SemanticStageState, StageMutation } from "@sillymaker/base/story";

/**
 * Script builders: one stable short name per node derives every id the
 * runtime needs (`node.<prefix>.<name>`, `interaction.<prefix>.<name>`,
 * `text.<prefix>.line.<name>`, …), and the default-locale line lives inline
 * with the node instead of in a second file. The builders emit the exact
 * node objects the hand-written script used plus the collected text
 * entries, so the presentation catalog merges them and other locales
 * override by the same derived textIds. This is ordinary TypeScript data
 * construction — no DSL, no runtime, no new engine API — and every derived
 * id accepts an explicit override, so migrating an existing script can
 * keep its ids (and therefore its saves and digests) byte-identical.
 */

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

export interface TemplateScriptTextEntryV1 {
  readonly textId: string;
  readonly text: string;
}

export interface TemplateScriptV1 {
  readonly nodes: readonly TemplateNarrativeNodeV1[];
  /** Default-locale entries collected from the inline script text. */
  readonly textEntries: readonly TemplateScriptTextEntryV1[];
}

export interface TemplateSayInputV1 {
  readonly kind: "say";
  readonly name: string;
  /** A key declared in `speakers`; null narrates without a speaker. */
  readonly speaker: string | null;
  readonly text: string;
  /** Short name of the next node. */
  readonly next: string;
  /** Bump when the line's meaning changes and Seen should reset. */
  readonly seenRevision?: number;
  readonly textId?: string;
}

export interface TemplateChoiceOptionInputV1 {
  readonly name: string;
  readonly text: string;
  readonly next: string;
  readonly consumesCoins?: number;
  readonly setFlags?: readonly string[];
  readonly textId?: string;
}

export interface TemplateChoiceInputV1 {
  readonly kind: "choice";
  readonly name: string;
  readonly prompt: string;
  readonly options: readonly TemplateChoiceOptionInputV1[];
  readonly seenRevision?: number;
  readonly promptTextId?: string;
}

export interface TemplateStageInputV1 {
  readonly kind: "stage";
  readonly name: string;
  readonly mutations: (stage: SemanticStageState) => readonly StageMutation[];
  readonly mayShow: readonly string[];
  readonly next: string;
}

export interface TemplateBranchInputV1 {
  readonly kind: "branch";
  readonly name: string;
  /** Short names; `choose` also returns a short name from this list. */
  readonly successors: readonly string[];
  readonly choose: (context: { readonly flags: readonly string[] }) => string;
}

export interface TemplateEndInputV1 {
  readonly kind: "end";
  readonly name: string;
}

export type TemplateScriptNodeInputV1 =
  | TemplateSayInputV1
  | TemplateChoiceInputV1
  | TemplateStageInputV1
  | TemplateBranchInputV1
  | TemplateEndInputV1;

export interface DefineTemplateScriptInputV1 {
  /** The Story prefix, e.g. `"template"` → `node.template.<name>`. */
  readonly prefix: string;
  /** Speaker key → default-locale display name (`text.<p>.speaker.<key>`). */
  readonly speakers?: Readonly<Record<string, string>>;
  readonly nodes: readonly TemplateScriptNodeInputV1[];
}

export function defineTemplateScriptV1(input: DefineTemplateScriptInputV1): TemplateScriptV1 {
  const prefix = input.prefix;
  const nodeId = (name: string): string => `node.${prefix}.${name}`;
  const textByTextId = new Map<string, string>();
  const nodeNames = new Set<string>();

  const collectText = (textId: string, text: string): string => {
    const existing = textByTextId.get(textId);
    if (existing !== undefined && existing !== text) {
      throw new TypeError(`${prefix}.script_text_conflict:${textId}`);
    }
    textByTextId.set(textId, text);
    return textId;
  };

  const speakerTextId = (key: string): string => {
    if (input.speakers?.[key] === undefined) {
      throw new TypeError(`${prefix}.script_speaker_unknown:${key}`);
    }
    return `text.${prefix}.speaker.${key}`;
  };
  for (const [key, name] of Object.entries(input.speakers ?? {})) {
    collectText(`text.${prefix}.speaker.${key}`, name);
  }

  const nodes = input.nodes.map((node): TemplateNarrativeNodeV1 => {
    if (nodeNames.has(node.name)) {
      throw new TypeError(`${prefix}.script_duplicate_node:${node.name}`);
    }
    nodeNames.add(node.name);
    switch (node.kind) {
      case "say":
        return Object.freeze({
          kind: "say",
          nodeId: nodeId(node.name),
          definitionId: `interaction.${prefix}.${node.name}`,
          seenRevision: node.seenRevision ?? 1,
          speakerTextId: node.speaker === null ? null : speakerTextId(node.speaker),
          textId: collectText(node.textId ?? `text.${prefix}.line.${node.name}`, node.text),
          next: nodeId(node.next),
        });
      case "choice":
        return Object.freeze({
          kind: "choice",
          nodeId: nodeId(node.name),
          definitionId: `interaction.${prefix}.${node.name}`,
          seenRevision: node.seenRevision ?? 1,
          promptTextId: collectText(
            node.promptTextId ?? `text.${prefix}.choice.${node.name}.prompt`,
            node.prompt,
          ),
          options: Object.freeze(
            node.options.map((option): TemplateChoiceOptionV1 =>
              Object.freeze({
                choiceId: `choice.${prefix}.${option.name}`,
                textId: collectText(
                  option.textId ?? `text.${prefix}.choice.${option.name}`,
                  option.text,
                ),
                consumesCoins: option.consumesCoins ?? 0,
                setFlags: Object.freeze([...(option.setFlags ?? [])]),
                next: nodeId(option.next),
              })
            ),
          ),
        });
      case "stage":
        return Object.freeze({
          kind: "stage",
          nodeId: nodeId(node.name),
          mutations: node.mutations,
          mayShow: node.mayShow,
          next: nodeId(node.next),
        });
      case "branch": {
        const successors = Object.freeze(node.successors.map(nodeId));
        const choose = node.choose;
        return Object.freeze({
          kind: "branch",
          nodeId: nodeId(node.name),
          successors,
          choose: (context) => nodeId(choose(context)),
        });
      }
      case "end":
        return Object.freeze({ kind: "end", nodeId: nodeId(node.name) });
      default: {
        const exhaustive: never = node;
        throw new TypeError(`${prefix}.script_node_unknown:${String(exhaustive)}`);
      }
    }
  });

  return Object.freeze({
    nodes: Object.freeze(nodes),
    textEntries: Object.freeze(
      [...textByTextId.entries()].map(([textId, text]) => Object.freeze({ textId, text })),
    ),
  });
}

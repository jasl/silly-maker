// SPDX-License-Identifier: MIT
import type {
  CompiledVnInteractionDocumentV1,
  VnBranchBlockV1,
  VnChoiceOptionV1,
  VnEndBlockV1,
  VnHoldBlockV1,
  VnInteractionDocumentV1,
  VnNarrativeNodeV1,
  VnSayBlockV1,
  VnSceneBindingV1,
  VnStageBlockV1,
  VnStageOperationV1,
} from "@sillymaker/vn/interaction";
import { compileVnInteractionDocumentV1 } from "@sillymaker/vn/interaction";

/** Product-owned choice behavior; the VN Genre Mod keeps it opaque. */
export type TemplateChoiceEffectV1 = {
  readonly consumesCoins: number;
  readonly setFlags: readonly string[];
};

/** Product-owned branch/hold condition; the VN Genre Mod only invokes it. */
export type TemplatePredicateV1 = {
  readonly flag: string;
};

export type TemplateChoiceOptionV1 = VnChoiceOptionV1<TemplateChoiceEffectV1>;
export type TemplateNarrativeNodeV1 = VnNarrativeNodeV1<
  TemplateChoiceEffectV1,
  TemplatePredicateV1
>;
export type TemplateSayBlockV1 = VnSayBlockV1;
export type TemplateStageOpV1 = VnStageOperationV1;
export type TemplateStageBlockV1 = VnStageBlockV1;
export type TemplateBranchCaseV1 = VnBranchBlockV1<TemplatePredicateV1>["cases"][number];
export type TemplateBranchBlockV1 = VnBranchBlockV1<TemplatePredicateV1>;
export type TemplateHoldWhenArmV1 = NonNullable<
  VnHoldBlockV1<TemplatePredicateV1>["when"]
>[number];
export type TemplateHoldBlockV1 = VnHoldBlockV1<TemplatePredicateV1>;
export type TemplateEndBlockV1 = VnEndBlockV1;
export type TemplateSceneBindingV1 = VnSceneBindingV1;

/** Compact starter syntax normalized into one opaque Genre-Mod effect. */
export interface TemplateChoiceOptionInputV1 {
  readonly name: string;
  readonly text?: string;
  readonly textId?: string;
  readonly next: string;
  readonly consumesCoins?: number;
  readonly setFlags?: readonly string[];
}

export interface TemplateChoiceBlockV1 {
  readonly kind: "choice";
  readonly name: string;
  readonly prompt?: string;
  readonly promptTextId?: string;
  readonly definitionId?: string;
  readonly options: readonly TemplateChoiceOptionInputV1[];
  readonly seenRevision?: number;
}

export type TemplateInteractionBlockV1 =
  | TemplateSayBlockV1
  | TemplateChoiceBlockV1
  | TemplateStageBlockV1
  | TemplateBranchBlockV1
  | TemplateHoldBlockV1
  | TemplateEndBlockV1;

export interface TemplateInteractionDocV1 {
  readonly prefix: string;
  readonly docId: string;
  readonly speakers?: Readonly<
    Record<string, string | { readonly textId: string; readonly text?: string }>
  >;
  readonly entry: string;
  readonly blocks: readonly TemplateInteractionBlockV1[];
}

export interface TemplateCompileInputV1 {
  readonly doc: TemplateInteractionDocV1;
  readonly scenes?: Readonly<Record<string, TemplateSceneBindingV1>>;
  readonly externalTargets?: Readonly<Record<string, string>>;
}

export type TemplateCompiledInteractionV1 = CompiledVnInteractionDocumentV1<
  TemplateChoiceEffectV1,
  TemplatePredicateV1
>;

/** Thin product adapter over the first-party VN interaction compiler. */
export function compileTemplateInteractionDocV1(
  input: TemplateCompileInputV1,
): TemplateCompiledInteractionV1 {
  const blocks: VnInteractionDocumentV1<
    TemplateChoiceEffectV1,
    TemplatePredicateV1
  >["blocks"] = input.doc.blocks.map((block) => {
    if (block.kind === "branch") {
      block.cases.forEach((branchCase, index) => {
        if (branchCase.when !== undefined && branchCase.when.flag.length === 0) {
          throw new TypeError(
            `template.interaction_doc_invalid:${input.doc.docId}/${block.name}/case-${
              String(index)
            }:branch_flag_invalid`,
          );
        }
      });
      return block;
    }
    if (block.kind === "hold") {
      block.when?.forEach((arm, index) => {
        if (arm.when.flag.length === 0) {
          throw new TypeError(
            `template.interaction_doc_invalid:${input.doc.docId}/${block.name}/when-${
              String(index)
            }:hold_when_flag_invalid`,
          );
        }
      });
      return block;
    }
    if (block.kind !== "choice") return block;
    return {
      ...block,
      options: block.options.map((option) => ({
        name: option.name,
        ...(option.text === undefined ? {} : { text: option.text }),
        ...(option.textId === undefined ? {} : { textId: option.textId }),
        next: option.next,
        effect: {
          consumesCoins: option.consumesCoins ?? 0,
          setFlags: option.setFlags ?? [],
        },
      })),
    };
  });
  return compileVnInteractionDocumentV1({
    doc: {
      prefix: input.doc.prefix,
      docId: input.doc.docId,
      ...(input.doc.speakers === undefined ? {} : { speakers: input.doc.speakers }),
      entry: input.doc.entry,
      blocks,
    },
    ...(input.scenes === undefined ? {} : { scenes: input.scenes }),
    ...(input.externalTargets === undefined ? {} : { externalTargets: input.externalTargets }),
    errorPrefix: "template",
  });
}

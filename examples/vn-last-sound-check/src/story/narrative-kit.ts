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

export type VnLastSoundCheckSignalChoiceV1 = "archive" | "present";

export type VnLastSoundCheckChoiceEffectV1 = {
  readonly setSignalChoice: VnLastSoundCheckSignalChoiceV1 | null;
};

export type VnLastSoundCheckPredicateV1 = {
  readonly signalChoice: VnLastSoundCheckSignalChoiceV1;
};

export type VnLastSoundCheckChoiceOptionV1 = VnChoiceOptionV1<
  VnLastSoundCheckChoiceEffectV1
>;
export type VnLastSoundCheckNarrativeNodeV1 = VnNarrativeNodeV1<
  VnLastSoundCheckChoiceEffectV1,
  VnLastSoundCheckPredicateV1
>;
export type VnLastSoundCheckSayBlockV1 = VnSayBlockV1;
export type VnLastSoundCheckStageOpV1 = VnStageOperationV1;
export type VnLastSoundCheckStageBlockV1 = VnStageBlockV1;
export type VnLastSoundCheckBranchCaseV1 = VnBranchBlockV1<
  VnLastSoundCheckPredicateV1
>["cases"][number];
export type VnLastSoundCheckBranchBlockV1 = VnBranchBlockV1<
  VnLastSoundCheckPredicateV1
>;
export type VnLastSoundCheckHoldBlockV1 = VnHoldBlockV1<VnLastSoundCheckPredicateV1>;
export type VnLastSoundCheckEndBlockV1 = VnEndBlockV1;
export type VnLastSoundCheckSceneBindingV1 = VnSceneBindingV1;

export interface VnLastSoundCheckChoiceOptionInputV1 {
  readonly name: string;
  readonly text?: string;
  readonly textId?: string;
  readonly next: string;
  readonly setSignalChoice?: VnLastSoundCheckSignalChoiceV1;
}

export interface VnLastSoundCheckChoiceBlockV1 {
  readonly kind: "choice";
  readonly name: string;
  readonly prompt?: string;
  readonly promptTextId?: string;
  readonly definitionId?: string;
  readonly options: readonly VnLastSoundCheckChoiceOptionInputV1[];
  readonly seenRevision?: number;
}

export type VnLastSoundCheckInteractionBlockV1 =
  | VnLastSoundCheckSayBlockV1
  | VnLastSoundCheckChoiceBlockV1
  | VnLastSoundCheckStageBlockV1
  | VnLastSoundCheckBranchBlockV1
  | VnLastSoundCheckHoldBlockV1
  | VnLastSoundCheckEndBlockV1;

export interface VnLastSoundCheckInteractionDocV1 {
  readonly prefix: string;
  readonly docId: string;
  readonly speakers?: Readonly<
    Record<string, string | { readonly textId: string; readonly text?: string }>
  >;
  readonly entry: string;
  readonly blocks: readonly VnLastSoundCheckInteractionBlockV1[];
}

export interface VnLastSoundCheckCompileInputV1 {
  readonly doc: VnLastSoundCheckInteractionDocV1;
  readonly scenes?: Readonly<Record<string, VnLastSoundCheckSceneBindingV1>>;
}

export type VnLastSoundCheckCompiledInteractionV1 = CompiledVnInteractionDocumentV1<
  VnLastSoundCheckChoiceEffectV1,
  VnLastSoundCheckPredicateV1
>;

/** Product vocabulary admitted once, then compiled by the official VN Genre Mod. */
export function compileVnLastSoundCheckInteractionDocV1(
  input: VnLastSoundCheckCompileInputV1,
): VnLastSoundCheckCompiledInteractionV1 {
  const blocks: VnInteractionDocumentV1<
    VnLastSoundCheckChoiceEffectV1,
    VnLastSoundCheckPredicateV1
  >["blocks"] = input.doc.blocks.map((block) => {
    if (block.kind !== "choice") return block;
    return {
      ...block,
      options: block.options.map((option) => ({
        name: option.name,
        ...(option.text === undefined ? {} : { text: option.text }),
        ...(option.textId === undefined ? {} : { textId: option.textId }),
        next: option.next,
        effect: { setSignalChoice: option.setSignalChoice ?? null },
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
    errorPrefix: "vn-last-sound-check",
  });
}

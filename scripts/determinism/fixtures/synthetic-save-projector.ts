// SPDX-License-Identifier: MIT

/** Deterministic projector owner for the authority-map identity contract. */
export function syntheticSummarizeSaveV1(
  state: Readonly<{ readonly count: number }>,
): readonly string[] {
  return [`count ${String(state.count)}`];
}

export function mismatchedSyntheticSummarizeSaveV1(): readonly string[] {
  return [];
}

export const syntheticSaveDefinitionV1 = {
  summarizeSave: syntheticSummarizeSaveV1,
};

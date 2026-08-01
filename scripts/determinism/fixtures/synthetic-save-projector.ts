// SPDX-License-Identifier: MIT

/** Deterministic projector owner for the authority-map identity contract. */
export function syntheticSummarizeSaveV1(
  state: Readonly<{ readonly count: number }>,
): readonly string[] {
  return Object.freeze([`count ${String(state.count)}`]);
}

export function mismatchedSyntheticSummarizeSaveV1(): readonly string[] {
  return Object.freeze([]);
}

export const syntheticSaveDefinitionV1 = Object.freeze({
  summarizeSave: syntheticSummarizeSaveV1,
});

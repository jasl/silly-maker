// SPDX-License-Identifier: MIT
// Stage slice · frame table: the cat's content-box size per growth stage.
// React-free so both the content catalog (headless presentation facet,
// which turns it into StageContentGeometry) and the React renderers can
// share one source of truth for the drawn box.

export const catcafeCatFrameSizeV1 = (stage: string): { width: number; height: number } => {
  const height = stage === "adolescent" ? 440 : stage === "junior" ? 380 : 320;
  return { width: Math.round(height * 0.75), height };
};

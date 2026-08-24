// SPDX-License-Identifier: MIT

/**
 * Facet-neutral semantic stage identifiers shared by the simulation facet
 * (which writes them into authoritative stage state) and the presentation
 * facet (whose catalog resolves them into renderer bindings).
 */

export const labStageIdV1 = "stage.e2e.lab";

export const labStageLayerIdsV1 = [
  "layer.e2e.background",
  "layer.e2e.characters",
  "layer.e2e.props",
] as const;

export const labStageTagsV1 = {
  background: "tag.e2e.bg",
  alpha: "tag.e2e.alpha",
  beta: "tag.e2e.beta",
  crate: "tag.e2e.crate",
  beacon: "tag.e2e.beacon",
  banner: "tag.e2e.banner",
} as const;

export const labStageContentIdsV1 = {
  backgroundLab: "content.e2e.bg.lab",
  backgroundStoreroom: "content.e2e.bg.storeroom",
  characterAlpha: "content.e2e.char.alpha",
  characterBeta: "content.e2e.char.beta",
  propCrate: "content.e2e.prop.crate",
  propBeacon: "content.e2e.prop.beacon",
  propBanner: "content.e2e.prop.banner",
} as const;

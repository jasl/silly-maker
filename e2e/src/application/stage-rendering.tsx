// SPDX-License-Identifier: MIT
// Static stage registries live outside the component-only Fast Refresh boundary.
import type { AssetUrlRegistryV1, SemanticStageEntryRendererV1 } from "@sillymaker/ui";

/**
 * The crate-glow hover reveal (shaped-hit-regions drill): the region's
 * declared `hoverAssetId` resolved to an inline SVG matching the collection
 * port's octagon in the crate's 166×126 geometry box. Reveal is feedback
 * only — activation flows through the shell's stage contribution.
 */
const labCrateGlowUrlV1 = `data:image/svg+xml,${
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 166 126">' +
      '<polygon points="20 0, 146 0, 166 20, 166 106, 146 126, 20 126, 0 106, 0 20" ' +
      'fill="rgba(255, 214, 130, 0.4)" stroke="#ffd682" stroke-width="4"/></svg>',
  )
}`;

/**
 * The Lab's stage asset port. The conformance Story ships no media files,
 * so hover-reveal art resolves to a static data URI; everything else keeps
 * the code-native fallback. Static registry — the revision never moves.
 */
export const labStageAssetsV1: AssetUrlRegistryV1 = {
  resolve: (assetId: never, usage: never) =>
    (usage as string) === "stage_hover_reveal" &&
      (assetId as string) === "asset.e2e.lab.crate-glow"
      ? ({ delivery: "runtime_image", url: labCrateGlowUrlV1 })
      : ({ delivery: "code_fallback" }),
  observe: () => ({ revision: 0 }),
  subscribe: () => () => {},
};

/**
 * Code-native stage entry renderers keyed by the catalog's renderer IDs.
 * They draw from Strict JSON props only; missing registrations fall back to
 * the host's code-native placeholder with a diagnostic.
 */
export const labStageRenderersV1: Readonly<Record<string, SemanticStageEntryRendererV1>> = Object
  .freeze({
    "renderer.e2e.lab.stage-background": ({ entry }) => (
      <div
        data-lab-surface={String(entry.props.surface)}
        style={{
          width: "1600px",
          height: "1000px",
          background: entry.props.surface === "storeroom"
            ? "linear-gradient(180deg, #3a3630, #17140f)"
            : "linear-gradient(180deg, #2b3a4a, #101820)",
        }}
      />
    ),
    // The catalog geometry owns each content box and anchor; renderers
    // fill the engine-provided box without their own translate.
    "renderer.e2e.lab.stage-character": ({ entry, frameIndex }) => (
      <figure
        data-lab-character={entry.contentId}
        data-lab-pose={String(entry.props.pose)}
        data-lab-expression={String(entry.props.expression)}
        data-lab-frame-asset={frameIndex === null
          ? undefined
          : (entry.frameAssetIds[frameIndex] as string)}
        style={{
          margin: 0,
          width: "100%",
          height: "100%",
          borderRadius: "110px 110px 12px 12px",
          // frame 1 is the mid-entrance step pose; the tint swap is the
          // one-shot frame-set drill made visible.
          background: frameIndex === 1 ? "rgba(189, 205, 214, 0.85)" : "rgba(214, 205, 189, 0.85)",
        }}
      >
        <figcaption style={{ paddingBlockStart: "1rem", textAlign: "center", color: "#20242c" }}>
          {entry.accessibleName} · {String(entry.props.expression)}
        </figcaption>
      </figure>
    ),
    "renderer.e2e.lab.stage-prop": ({ entry, frameIndex }) => (
      <div
        data-lab-prop={entry.contentId}
        data-lab-latch={typeof entry.props.latch === "string" ? entry.props.latch : undefined}
        data-lab-frame-asset={frameIndex === null
          ? undefined
          : (entry.frameAssetIds[frameIndex] as string)}
        style={entry.props.variant === "banner"
          ? {
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            border: "3px solid #8a5a2b",
            background: "#b3452e",
          }
          : {
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            border: entry.props.latch === "engaged" ? "3px solid #5eead4" : "3px solid #9c8a63",
            // frame 1 is the beacon's lit frame from the ambient loop drill.
            background: frameIndex === 1 ? "#b8a15a" : "#6f6146",
          }}
      />
    ),
  });

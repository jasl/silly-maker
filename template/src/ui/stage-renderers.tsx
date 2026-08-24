// SPDX-License-Identifier: MIT
import type { SemanticStageEntryRendererV1 } from "@sillymaker/ui";

/**
 * Code-native stage renderers keyed by the content catalog's renderer IDs.
 * A real game replaces these with image-backed renderers; the placeholders
 * keep the starter runnable with zero media bytes. Both the application
 * composition and the dev-only Studio binding consume this one module, so
 * the Studio canvas draws exactly what the game draws.
 */
export const templateStageRenderersV1: Readonly<Record<string, SemanticStageEntryRendererV1>> = {
  "renderer.template.background": ({ entry }) => (
    <div
      data-template-surface={String(entry.props.surface)}
      style={{
        width: "1600px",
        height: "900px",
        background: entry.props.surface === "study"
          ? "linear-gradient(180deg, #4a3f33, #1c150e)"
          : "linear-gradient(180deg, #6d8a96, #2c3b42)",
      }}
    />
  ),
  // A horizontally tileable fog band (period 320px): the ambient drift
  // moves exactly one period per loop, so the sawtooth wrap is seamless.
  "renderer.template.mist": () => (
    <div
      data-template-mist="true"
      style={{
        width: "100%",
        height: "100%",
        background: "repeating-linear-gradient(90deg, " +
          "rgba(236, 244, 248, 0) 0px, rgba(236, 244, 248, 0.5) 80px, " +
          "rgba(236, 244, 248, 0.14) 160px, rgba(236, 244, 248, 0.42) 240px, " +
          "rgba(236, 244, 248, 0) 320px)",
        filter: "blur(6px)",
      }}
    />
  ),
  "renderer.template.character": ({ entry, frameIndex }) => (
    // The catalog geometry owns the content box and anchor; the figure
    // just fills it. `frameIndex` steps through the content's declared
    // `frameAssetIds` (0 = eyes open, 1 = eyes closed) — the blink is a
    // `frame` motion track, not a renderer CSS animation. An image-backed
    // game would swap textures here instead of redrawing the eyes.
    <figure
      data-template-character={entry.contentId}
      data-template-expression={String(entry.props.expression)}
      data-template-frame-asset={frameIndex === null
        ? undefined
        : String(entry.frameAssetIds[frameIndex])}
      style={{
        margin: 0,
        width: "100%",
        height: "100%",
        borderRadius: "110px 110px 16px 16px",
        background: "rgba(238, 228, 210, 0.9)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          insetBlockStart: "84px",
          insetInlineStart: 0,
          width: "100%",
          textAlign: "center",
          fontSize: "24px",
          letterSpacing: "12px",
          color: "#33302a",
        }}
      >
        {frameIndex === 1 ? "˘ ˘" : "• •"}
      </span>
      <figcaption style={{ paddingBlockEnd: "1rem", color: "#33302a" }}>
        {entry.accessibleName} · {String(entry.props.expression)}
      </figcaption>
    </figure>
  ),
};

// SPDX-License-Identifier: MIT
import type { SemanticStageEntryRendererV1 } from "@sillymaker/ui";

/**
 * M1 authoring renderers keyed by the product content catalog. M2 replaces
 * these compatible placeholders with the final visual treatment; Player and
 * Inspector already consume this same module, so author edits never target a
 * separate wireframe scene.
 */
export const vnReferenceTourStageRenderersV1: Readonly<
  Record<string, SemanticStageEntryRendererV1>
> = {
  "renderer.vn-reference-tour.background": ({ entry }) => (
    <div
      data-vn-reference-tour-surface={String(entry.props.surface)}
      style={{
        width: "1600px",
        height: "900px",
        background: entry.props.surface === "rooftop-antenna"
          ? "linear-gradient(180deg, #9ec8dc 0%, #dce7df 48%, #69737a 49%, #30383d 100%)"
          : "linear-gradient(180deg, #182432 0%, #27384a 58%, #141b22 59%, #0c1117 100%)",
      }}
    />
  ),
  "renderer.vn-reference-tour.light": () => (
    <div
      data-vn-reference-tour-light="first-light"
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "12px",
        background: "linear-gradient(145deg, rgba(252, 210, 132, 0.82), rgba(148, 196, 222, 0.22))",
        boxShadow: "0 0 54px rgba(246, 202, 122, 0.3)",
      }}
    />
  ),
  "renderer.vn-reference-tour.prop": ({ entry }) => (
    <div
      data-vn-reference-tour-prop={String(entry.props.kind)}
      data-vn-reference-tour-prop-state={String(entry.props.state)}
      style={{
        boxSizing: "border-box",
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        border: "3px solid rgba(214, 226, 232, 0.62)",
        borderRadius: String(entry.props.kind).includes("light") ? "999px" : "18px",
        color: "#e9f1f3",
        background: String(entry.props.kind).includes("light")
          ? "radial-gradient(circle, #e8c36d 0 28%, #735b28 31% 46%, #1d2730 49%)"
          : "linear-gradient(150deg, #4b5e68, #202b32)",
        boxShadow: "0 12px 28px rgba(0, 0, 0, 0.28)",
        fontSize: "22px",
        fontWeight: 700,
        textAlign: "center",
      }}
    >
      {entry.accessibleName}
    </div>
  ),
  "renderer.vn-reference-tour.character": ({ entry, frameIndex }) => (
    <figure
      data-vn-reference-tour-character={entry.contentId}
      data-vn-reference-tour-expression={String(entry.props.expression)}
      data-vn-reference-tour-frame-asset={frameIndex === null
        ? undefined
        : String(entry.frameAssetIds[frameIndex])}
      style={{
        margin: 0,
        width: "100%",
        height: "100%",
        borderRadius: "130px 130px 28px 28px",
        background: entry.props.character === "lin"
          ? "linear-gradient(160deg, #d7e5ec, #718b9d)"
          : "linear-gradient(160deg, #eadfcd, #9a806a)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        position: "relative",
        border: "4px solid rgba(244, 246, 243, 0.75)",
        boxShadow: "0 22px 40px rgba(0, 0, 0, 0.28)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          insetBlockStart: "118px",
          insetInlineStart: 0,
          width: "100%",
          textAlign: "center",
          fontSize: "30px",
          letterSpacing: "12px",
          color: "#17212a",
        }}
      >
        {frameIndex === 1 ? "˘ ˘" : "• •"}
      </span>
      <figcaption
        style={{ paddingBlockEnd: "1.25rem", color: "#17212a", fontWeight: 700 }}
      >
        {entry.accessibleName} · {String(entry.props.expression)}
      </figcaption>
    </figure>
  ),
};

// SPDX-License-Identifier: MIT
import type { SemanticStageEntryRendererV1 } from "@sillymaker/ui";

/**
 * Code-native stage renderers keyed by the content catalog's renderer IDs.
 * A real game replaces these with image-backed renderers; the placeholders
 * keep the starter runnable with zero media bytes. Both the application
 * composition and the dev-only Studio binding consume this one module, so
 * the Studio canvas draws exactly what the game draws.
 */
export const templateStageRenderersV1: Readonly<Record<string, SemanticStageEntryRendererV1>> =
  Object.freeze({
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
    "renderer.template.character": ({ entry }) => (
      // The catalog geometry owns the content box and anchor; the figure
      // just fills it.
      <figure
        data-template-character={entry.contentId}
        data-template-expression={String(entry.props.expression)}
        style={{
          margin: 0,
          width: "100%",
          height: "100%",
          borderRadius: "110px 110px 16px 16px",
          background: "rgba(238, 228, 210, 0.9)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <figcaption style={{ paddingBlockEnd: "1rem", color: "#33302a" }}>
          {entry.accessibleName} · {String(entry.props.expression)}
        </figcaption>
      </figure>
    ),
  });

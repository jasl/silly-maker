// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";
import type { AssetUrlRegistryV1, SemanticStageEntryRendererV1 } from "@sillymaker/ui";
import { useAssetUrlV1 } from "@sillymaker/ui";

type StageRendererInputV1 = Parameters<SemanticStageEntryRendererV1>[0];

function VnBackgroundV1(props: {
  readonly registry: AssetUrlRegistryV1 | null;
  readonly entry: StageRendererInputV1["entry"];
}): ReactElement {
  const url = useAssetUrlV1(
    props.registry,
    String(props.entry.props.assetId),
    "scene_background",
  );
  const surface = String(props.entry.props.surface);
  if (url !== null) {
    return (
      <img
        src={url}
        alt=""
        data-vn-last-sound-check-surface={surface}
        style={{ width: "1600px", height: "900px", objectFit: "cover", display: "block" }}
      />
    );
  }
  return (
    <div
      data-vn-last-sound-check-surface={surface}
      data-vn-last-sound-check-media-fallback="true"
      style={{
        width: "1600px",
        height: "900px",
        background: surface === "rooftop-antenna"
          ? "linear-gradient(180deg, #9ec8dc 0%, #dce7df 48%, #69737a 49%, #30383d 100%)"
          : "linear-gradient(180deg, #182432 0%, #27384a 58%, #141b22 59%, #0c1117 100%)",
      }}
    />
  );
}

function VnCharacterV1(props: {
  readonly registry: AssetUrlRegistryV1 | null;
  readonly entry: StageRendererInputV1["entry"];
  readonly frameIndex: StageRendererInputV1["frameIndex"];
}): ReactElement {
  const frameAssetId = props.frameIndex === null
    ? String(props.entry.props.assetId)
    : String(props.entry.frameAssetIds[props.frameIndex] ?? props.entry.props.assetId);
  const url = useAssetUrlV1(props.registry, frameAssetId, "character_pose");
  const expression = String(props.entry.props.expression);
  const character = String(props.entry.props.character);
  if (url !== null) {
    return (
      <figure
        data-vn-last-sound-check-character={props.entry.contentId}
        data-vn-last-sound-check-expression={expression}
        data-vn-last-sound-check-frame-asset={frameAssetId}
        style={{
          margin: 0,
          width: "100%",
          height: "100%",
          filter: "drop-shadow(0 22px 26px rgba(11, 19, 28, 0.32))",
        }}
      >
        <img
          src={url}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center bottom",
            display: "block",
          }}
        />
      </figure>
    );
  }
  return (
    <figure
      data-vn-last-sound-check-character={props.entry.contentId}
      data-vn-last-sound-check-expression={expression}
      data-vn-last-sound-check-frame-asset={frameAssetId}
      data-vn-last-sound-check-media-fallback="true"
      style={{
        margin: 0,
        width: "100%",
        height: "100%",
        borderRadius: "46% 46% 22% 22%",
        background: character === "lin"
          ? "linear-gradient(160deg, #d7e5ec, #718b9d)"
          : "linear-gradient(160deg, #eadfcd, #9a806a)",
        display: "grid",
        placeItems: "center",
        border: "4px solid rgba(244, 246, 243, 0.75)",
        boxShadow: "0 22px 40px rgba(0, 0, 0, 0.28)",
      }}
    >
      <figcaption style={{ color: "#17212a", fontWeight: 700 }}>
        {props.entry.accessibleName} · {expression}
      </figcaption>
    </figure>
  );
}

function VnPropV1(props: {
  readonly registry: AssetUrlRegistryV1 | null;
  readonly entry: StageRendererInputV1["entry"];
}): ReactElement {
  const assetId = String(props.entry.props.assetId);
  const state = String(props.entry.props.state);
  const url = useAssetUrlV1(props.registry, assetId, "story_prop");
  const kind = String(props.entry.props.kind);
  const dimmed = state === "off";
  return (
    <figure
      data-vn-last-sound-check-prop={kind}
      data-vn-last-sound-check-prop-state={state}
      data-vn-last-sound-check-prop-asset={assetId}
      {...(url === null ? { "data-vn-last-sound-check-media-fallback": "true" } : {})}
      style={{
        margin: 0,
        width: "100%",
        height: "100%",
        filter: dimmed
          ? "grayscale(.55) brightness(.48) drop-shadow(0 10px 14px rgba(8, 15, 22, .24))"
          : "drop-shadow(0 12px 16px rgba(8, 15, 22, .3))",
      }}
    >
      {url === null
        ? (
          <div
            aria-hidden="true"
            style={{
              width: "100%",
              height: "100%",
              border: "2px dashed rgba(217, 228, 229, .66)",
              borderRadius: "12px",
            }}
          />
        )
        : (
          <img
            src={url}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center bottom",
              display: "block",
            }}
          />
        )}
    </figure>
  );
}

export function createVnLastSoundCheckStageRenderersV1(
  registry: AssetUrlRegistryV1 | null,
): Readonly<Record<string, SemanticStageEntryRendererV1>> {
  return ({
    "renderer.vn-last-sound-check.background": ({ entry }) => (
      <VnBackgroundV1 registry={registry} entry={entry} />
    ),
    "renderer.vn-last-sound-check.light": () => (
      <div
        data-vn-last-sound-check-light="first-light"
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(252, 210, 132, .58), rgba(148, 196, 222, .08) 42%, transparent 72%)",
          mixBlendMode: "screen",
        }}
      />
    ),
    "renderer.vn-last-sound-check.prop": ({ entry }) => (
      <VnPropV1
        registry={registry}
        entry={entry}
      />
    ),
    "renderer.vn-last-sound-check.character": ({ entry, frameIndex }) => (
      <VnCharacterV1 registry={registry} entry={entry} frameIndex={frameIndex} />
    ),
  });
}

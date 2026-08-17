// SPDX-License-Identifier: MIT
import { useMemo, useState } from "react";
import type { ReactElement } from "react";

import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import { SemanticStageTargetHostV1 } from "@sillymaker/ui";

import type { CatcafeAssetRegistryV1 } from "./ui-kit.ts";
import { useCatcafeTextV1 } from "./ui-kit.ts";
import { createCatcafeStageRenderersV1 } from "../game/features/stage/renderers.tsx";
import {
  catcafeNarrativePreviewCasesV1,
  type CatcafeNarrativePreviewRouteV1,
} from "../tooling/narrative-preview.ts";

function routeLabelV1(route: CatcafeNarrativePreviewRouteV1 | null): string {
  switch (route) {
    case null:
      return "共享前缀";
    case "named":
      return "命名为小雨";
    case "later":
      return "稍后命名";
    default: {
      const exhaustive: never = route;
      throw new TypeError(`catcafe.narrative_preview_route_unknown:${String(exhaustive)}`);
    }
  }
}

/** Story-local, detached authoring preview. It receives no Session or semantic write port. */
export function CatcafeNarrativePreviewV1(props: {
  readonly playerProfile: PlayerProfileStoreV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
}): ReactElement {
  const [previewId, setPreviewId] = useState(catcafeNarrativePreviewCasesV1[0]?.previewId ?? "");
  const preview =
    catcafeNarrativePreviewCasesV1.find((candidate) => candidate.previewId === previewId) ??
      catcafeNarrativePreviewCasesV1[0];
  if (preview === undefined) throw new TypeError("catcafe.narrative_preview_empty");
  const uiText = useCatcafeTextV1(props.playerProfile);
  const renderers = useMemo(
    () => createCatcafeStageRenderersV1(props.registry),
    [props.registry],
  );

  return (
    <section
      data-cc-narrative-preview={preview.previewId}
      style={{ display: "grid", gap: "10px", minWidth: 0 }}
    >
      <label style={{ display: "grid", gap: "4px" }}>
        剧情节点
        <select
          data-cc-narrative-preview-select="true"
          value={preview.previewId}
          onChange={(event) => setPreviewId(event.target.value)}
        >
          {catcafeNarrativePreviewCasesV1.map((candidate) => (
            <option key={candidate.previewId} value={candidate.previewId}>
              {candidate.nodeId} · {routeLabelV1(candidate.route)}
            </option>
          ))}
        </select>
      </label>
      <p style={{ margin: 0, fontSize: "12px" }}>
        {preview.nodeKind} · {routeLabelV1(preview.route)}
      </p>
      {preview.textIds.length === 0
        ? <p style={{ margin: 0, opacity: 0.75 }}>（无对话文本）</p>
        : (
          <ul
            data-cc-narrative-preview-text="true"
            style={{ margin: 0, paddingInlineStart: "20px" }}
          >
            {preview.textIds.map((textId) => <li key={textId}>{uiText(textId)}</li>)}
          </ul>
        )}
      <div
        data-cc-narrative-preview-stage="true"
        style={{ width: "320px", height: "180px", overflow: "hidden", maxWidth: "100%" }}
      >
        <div
          style={{
            width: "1280px",
            height: "720px",
            transform: "scale(0.25)",
            transformOrigin: "0 0",
          }}
        >
          <SemanticStageTargetHostV1
            target={preview.target}
            renderers={renderers}
            accessibleName="剧情舞台预览"
          />
        </div>
      </div>
    </section>
  );
}

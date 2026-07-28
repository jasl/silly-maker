// SPDX-License-Identifier: MIT
// 舞台切片·渲染器：背景与猫立绘（真图优先，code-native 形状降级）。
// 猫的待机/反馈动画是纯装饰 CSS（语义演出走 Timeline）；尊重 reduced-motion。
import type { SemanticStageEntryRendererV1 } from "@sillymaker/ui";
import { resolveAssetUrlV1 } from "@sillymaker/ui";

import type { CatcafeAssetRegistryV1 } from "../../application/ui-kit.ts";

/**
 * 渲染器：真图优先（registry 解析 URL），code-native 形状保留为降级。
 * 猫立绘按成长阶段放大；表情三挡由内容目录映射到三张立绘。
 */
export const catcafeCatFrameSizeV1 = (stage: string): { width: number; height: number } => {
  const height = stage === "adolescent" ? 440 : stage === "junior" ? 380 : 320;
  return { width: Math.round(height * 0.75), height };
};

export function createCatcafeStageRenderersV1(
  registry: CatcafeAssetRegistryV1 | null,
): Readonly<Record<string, SemanticStageEntryRendererV1>> {
  return Object.freeze({
    "renderer.catcafe.background": ({ entry }) => {
      const url = resolveAssetUrlV1(registry, entry.props.assetId, "scene_background");
      if (url !== null) {
        return (
          <img
            src={url}
            alt=""
            data-cc-surface={String(entry.props.surface)}
            style={{ width: "1280px", height: "720px", objectFit: "cover", display: "block" }}
          />
        );
      }
      return (
        <div
          data-cc-surface={String(entry.props.surface)}
          style={{
            width: "1280px",
            height: "720px",
            background:
              entry.props.surface === "backyard"
                ? "linear-gradient(180deg, #56705a, #22301f)"
                : "linear-gradient(180deg, #6b5b4a, #2c241c)",
          }}
        />
      );
    },
    "renderer.catcafe.cat": ({ entry }) => {
      const stage = String(entry.props.stage);
      const expression = String(entry.props.expression);
      const frame = catcafeCatFrameSizeV1(stage);
      const url = resolveAssetUrlV1(registry, entry.props.assetId, "character_pose");
      if (url !== null) {
        // 透明立绘直接坐进场景：呼吸待机常驻，表情切换触发一次
        // 反馈动作（开心=弹跳、炸毛=抖动）。reduced-motion 下全部静止。
        const reaction =
          expression === "hissing" ? "cc-cat-shake" : expression === "calm" ? "" : "cc-cat-pop";
        return (
          <figure
            data-cc-cat={stage}
            data-cc-expression={expression}
            style={{
              margin: 0,
              width: `${String(frame.width)}px`,
              height: `${String(frame.height)}px`,
              transform: "translate(-50%, -100%)",
              filter: "drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45))",
            }}
          >
            <img
              key={expression}
              src={url}
              alt={`${entry.accessibleName} · ${expression}`}
              className={`cc-cat-idle ${reaction}`.trim()}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "bottom",
                display: "block",
                transformOrigin: "50% 100%",
              }}
            />
          </figure>
        );
      }
      const size = frame.width;
      const tone =
        expression === "hissing"
          ? "#c96a5a"
          : expression === "grumpy"
            ? "#a08a6a"
            : expression === "purring"
              ? "#e8c8a8"
              : expression === "happy"
                ? "#dcb890"
                : "#c8b09a";
      return (
        <figure
          data-cc-cat={stage}
          data-cc-expression={expression}
          style={{
            margin: 0,
            width: `${String(size)}px`,
            height: `${String(Math.round(size * 0.85))}px`,
            borderRadius: "50% 50% 45% 45%",
            background: tone,
            transform: "translate(-50%, -100%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <figcaption style={{ paddingBlockEnd: "0.5rem", color: "#33302a", fontSize: "14px" }}>
            {entry.accessibleName} · {expression}
          </figcaption>
        </figure>
      );
    },
  });
}

export const catcafeCatMotionCssV1 = `
@keyframes cc-cat-breathe {
  0%, 100% { transform: scale(1, 1); }
  50% { transform: scale(1.006, 0.988) translateY(1px); }
}
@keyframes cc-cat-pop {
  0% { transform: scale(1.04, 0.92); }
  45% { transform: scale(0.97, 1.05) translateY(-6px); }
  100% { transform: scale(1, 1); }
}
@keyframes cc-cat-shake {
  0%, 100% { translate: 0 0; }
  20% { translate: -7px 0; }
  40% { translate: 6px 0; }
  60% { translate: -4px 0; }
  80% { translate: 3px 0; }
}
.cc-cat-idle { animation: cc-cat-breathe 3.6s ease-in-out infinite; }
.cc-cat-pop { animation: cc-cat-pop 0.5s ease-out, cc-cat-breathe 3.6s ease-in-out 0.5s infinite; }
.cc-cat-shake { animation: cc-cat-shake 0.45s ease-in-out, cc-cat-breathe 3.6s ease-in-out 0.45s infinite; }
@media (prefers-reduced-motion: reduce) {
  .cc-cat-idle, .cc-cat-pop, .cc-cat-shake { animation: none; }
}
`;

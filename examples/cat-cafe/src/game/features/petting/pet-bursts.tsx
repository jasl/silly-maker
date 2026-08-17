// SPDX-License-Identifier: MIT
// Petting slice · in-place feedback: reaction particles (emoji burst floating up) +
// a reaction bubble above the cat's head. The trigger is the commit-only transient-
// effect stream (a projection of authoritative facts); particle positions compute in place from the touched part's hit-region element (percent coordinates relative to the stage container).
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

import type { CatcafeApplicationInstanceV1 } from "../../../application/core-definition.ts";
import { catcafePettingV1 } from "../../content.ts";

export interface CatcafePetBurstV1 {
  readonly burstId: number;
  /** Percent coordinates relative to the stage container (0-100). */
  readonly xPercent: number;
  readonly yPercent: number;
  readonly emojis: readonly string[];
  readonly reactionTextId: string;
  readonly trustDelta: number;
}

const emojisForExpressionV1: Readonly<Record<string, readonly string[]>> = Object.freeze({
  happy: Object.freeze(["❤", "✨"]),
  purring: Object.freeze(["💕", "🎵", "✨"]),
  calm: Object.freeze(["🐾"]),
  grumpy: Object.freeze(["💢"]),
  hissing: Object.freeze(["💢", "⚡"]),
});

/** Find the touched part's hit-region button and convert it to a percent anchor inside the stage container. */
function locateZoneV1(zone: string): { readonly x: number; readonly y: number } {
  const fallback = Object.freeze({ x: 52, y: 42 });
  if (typeof document === "undefined") return fallback;
  const stage = document.querySelector("[data-cc-stage]");
  const region = document.querySelector(`[data-stage-hit-region='zone.${zone}']`);
  if (stage === null || region === null) return fallback;
  const stageRect = stage.getBoundingClientRect();
  const regionRect = region.getBoundingClientRect();
  if (stageRect.width <= 0 || stageRect.height <= 0) return fallback;
  return Object.freeze({
    x: ((regionRect.left + regionRect.width / 2 - stageRect.left) / stageRect.width) * 100,
    y: ((regionRect.top + regionRect.height * 0.2 - stageRect.top) / stageRect.height) * 100,
  });
}

export function useCatcafePetBurstsV1(
  instance: CatcafeApplicationInstanceV1,
): readonly CatcafePetBurstV1[] {
  const [bursts, setBursts] = useState<readonly CatcafePetBurstV1[]>(Object.freeze([]));
  const nextIdRef = useRef(1);
  useEffect(
    () =>
      instance.subscribeTransientEffects((effect) => {
        if (effect.effectId !== "effect.catcafe.reaction") return;
        const payload = effect.payload as {
          readonly reactionId?: string;
          readonly zone?: string;
          readonly trustDelta?: number;
        };
        const reaction = payload.reactionId === undefined
          ? null
          : catcafePettingV1.byId(payload.reactionId);
        if (reaction === null) return;
        const anchor = locateZoneV1(payload.zone ?? "back");
        const burstId = nextIdRef.current++;
        const burst: CatcafePetBurstV1 = Object.freeze({
          burstId,
          xPercent: anchor.x,
          yPercent: anchor.y,
          emojis: emojisForExpressionV1[reaction.expression] ?? Object.freeze(["🐾"]),
          reactionTextId: reaction.reactionTextId,
          trustDelta: payload.trustDelta ?? 0,
        });
        setBursts((current) => Object.freeze([...current.slice(-3), burst]));
        setTimeout(() => {
          setBursts((current) => Object.freeze(current.filter((b) => b.burstId !== burstId)));
        }, 1700);
      }),
    [instance],
  );
  return bursts;
}

const burstCssV1 = `
@keyframes cc-pet-emoji {
  0% { translate: 0 0; scale: 0.4; opacity: 0; }
  18% { scale: 1.15; opacity: 1; }
  100% { translate: var(--cc-drift) -72px; scale: 1; opacity: 0; }
}
@keyframes cc-pet-bubble {
  0% { translate: 0 6px; scale: 0.85; opacity: 0; }
  14% { translate: 0 0; scale: 1; opacity: 1; }
  78% { opacity: 1; }
  100% { translate: 0 -10px; opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  [data-cc-pet-burst] * { animation-duration: 0.01s !important; }
}
`;

/** Render layer: absolutely positioned inside the stage container (pointer-events: none). */
export function CatcafePetBurstsV1(props: {
  readonly bursts: readonly CatcafePetBurstV1[];
  readonly uiText: (textId: string) => string;
}): ReactElement | null {
  if (props.bursts.length === 0) return null;
  return (
    <>
      <style>{burstCssV1}</style>
      {props.bursts.map((burst) => (
        <div
          key={burst.burstId}
          data-cc-pet-burst={burst.reactionTextId}
          style={{
            position: "absolute",
            insetInlineStart: `${String(burst.xPercent)}%`,
            insetBlockStart: `${String(burst.yPercent)}%`,
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          {burst.emojis.map((emoji, index) => (
            <span
              key={`${String(burst.burstId)}.${String(index)}`}
              aria-hidden="true"
              style={{
                position: "absolute",
                insetBlockStart: "-8px",
                insetInlineStart: `${String(index * 18 - (burst.emojis.length - 1) * 9)}px`,
                fontSize: index === 0 ? "30px" : "22px",
                "--cc-drift": `${String((index - (burst.emojis.length - 1) / 2) * 34)}px`,
                animation: `cc-pet-emoji 1.5s ease-out ${String(index * 90)}ms forwards`,
                opacity: 0,
                textShadow: "0 2px 6px rgba(0, 0, 0, 0.35)",
              } as never}
            >
              {emoji}
            </span>
          ))}
          <p
            style={{
              position: "absolute",
              insetBlockStart: "-58px",
              insetInlineStart: "12px",
              margin: 0,
              maxInlineSize: "16em",
              whiteSpace: "nowrap",
              padding: "6px 12px",
              borderRadius: "14px",
              border: "1px solid rgba(214, 168, 96, 0.5)",
              background: "rgba(24, 18, 12, 0.88)",
              color: "#f2e8d8",
              fontSize: "14px",
              animation: "cc-pet-bubble 1.7s ease-out forwards",
            }}
          >
            {props.uiText(burst.reactionTextId)}
            {burst.trustDelta === 0
              ? ""
              : ` (${burst.trustDelta > 0 ? "+" : ""}${String(burst.trustDelta)})`}
          </p>
        </div>
      ))}
    </>
  );
}

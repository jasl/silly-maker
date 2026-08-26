// SPDX-License-Identifier: MIT
import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import {
  appendPetWandPointV1,
  beginPetWandRoundV1,
  finishPetWandRoundV1,
} from "./pet-wand-round.ts";
import type { PetWandRoundOutcomeV1, PetWandRoundV1 } from "./pet-wand-round.ts";
import "./pet-wand-play.css";

export interface PetWandPlayPropsV1 {
  readonly disabled?: boolean;
  readonly onDismiss: () => void;
  readonly onComplete: (outcome: PetWandRoundOutcomeV1) => void;
}

interface ActivePetWandRoundV1 {
  readonly pointerId: number;
  readonly round: PetWandRoundV1;
}

const pointForV1 = (event: ReactPointerEvent<HTMLElement>) => ({
  x: event.clientX,
  y: event.clientY,
});

function placeWandV1(surface: HTMLElement, clientX: number, clientY: number): void {
  const bounds = surface.getBoundingClientRect();
  const x = Math.max(18, Math.min(Math.max(18, bounds.width - 18), clientX - bounds.left));
  const y = Math.max(72, Math.min(Math.max(72, bounds.height - 18), clientY - bounds.top));
  surface.style.setProperty("--pet-wand-x", `${String(x)}px`);
  surface.style.setProperty("--pet-wand-y", `${String(y)}px`);
}

export function PetWandPlayV1(props: PetWandPlayPropsV1): ReactElement {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const roundRef = useRef<ActivePetWandRoundV1 | null>(null);
  const [active, setActive] = useState(false);

  const completeV1 = (
    pointerId: number,
    finish: "release" | "cancel",
    finalPoint?: { readonly x: number; readonly y: number },
  ): void => {
    const activeRound = roundRef.current;
    if (activeRound === null || activeRound.pointerId !== pointerId) return;
    const round = finalPoint === undefined
      ? activeRound.round
      : appendPetWandPointV1(activeRound.round, finalPoint);
    roundRef.current = null;
    setActive(false);
    const surface = surfaceRef.current;
    if (surface?.hasPointerCapture(pointerId)) surface.releasePointerCapture(pointerId);
    props.onComplete(finishPetWandRoundV1(round, finish));
  };

  const startV1 = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (
      props.disabled === true || roundRef.current !== null || event.button !== 0 ||
      !event.isPrimary || (event.pointerType !== "mouse" && event.pointerType !== "touch")
    ) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    placeWandV1(event.currentTarget, event.clientX, event.clientY);
    roundRef.current = {
      pointerId: event.pointerId,
      round: beginPetWandRoundV1(pointForV1(event)),
    };
    setActive(true);
  };

  const moveV1 = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const activeRound = roundRef.current;
    if (activeRound === null || activeRound.pointerId !== event.pointerId) return;
    event.preventDefault();
    placeWandV1(event.currentTarget, event.clientX, event.clientY);
    roundRef.current = {
      ...activeRound,
      round: appendPetWandPointV1(activeRound.round, pointForV1(event)),
    };
  };

  return (
    <section className="pet-wand" aria-label="逗猫棒小游戏">
      <header className="pet-wand__header">
        <div>
          <span>一起玩</span>
          <strong>让 Mochi 追上逗猫棒</strong>
        </div>
        <button
          type="button"
          disabled={props.disabled === true}
          onClick={() => {
            const current = roundRef.current;
            if (current === null) props.onDismiss();
            else completeV1(current.pointerId, "cancel");
          }}
        >
          放下逗猫棒
        </button>
      </header>
      <p id="pet-wand-instructions">
        用鼠标或手指按住逗猫棒，做一次清晰的往返。轻点、短拖动或单向滑动都不会算抓住。
      </p>
      <div
        ref={surfaceRef}
        className="pet-wand__surface"
        data-pet-wand-active={active ? "true" : "false"}
        role="region"
        aria-label="鼠标或触控逗猫棒区域"
        aria-describedby="pet-wand-instructions"
        aria-disabled={props.disabled === true ? "true" : undefined}
        onPointerDown={startV1}
        onPointerMove={moveV1}
        onPointerUp={(event) => completeV1(event.pointerId, "release", pointForV1(event))}
        onPointerCancel={(event) => completeV1(event.pointerId, "cancel")}
        onLostPointerCapture={(event) => completeV1(event.pointerId, "cancel")}
      >
        <span className="pet-wand__cat" aria-hidden="true">●</span>
        <span className="pet-wand__toy" aria-hidden="true">
          <i />
        </span>
      </div>
      <output className="pet-wand__status" aria-live="polite">
        {active ? "Mochi 正盯着逗猫棒" : "按住互动区域开始一轮"}
      </output>
    </section>
  );
}

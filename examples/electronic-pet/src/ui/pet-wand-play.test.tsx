// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PetWandPlayV1 } from "./pet-wand-play.tsx";

afterEach(cleanup);

const currentnessV1 = {
  expectedActivityOccurrence: 7,
  expectedInvitationOccurrence: 3,
} as const;

function surfaceV1(): HTMLElement {
  const surface = screen.getByRole("region", { name: "鼠标或触控逗猫棒区域" });
  const captured = new Set<number>();
  Object.defineProperties(surface, {
    setPointerCapture: {
      configurable: true,
      value: (pointerId: number) => captured.add(pointerId),
    },
    hasPointerCapture: {
      configurable: true,
      value: (pointerId: number) => captured.has(pointerId),
    },
    releasePointerCapture: {
      configurable: true,
      value: (pointerId: number) => captured.delete(pointerId),
    },
  });
  return surface;
}

function pointerV1(
  target: HTMLElement,
  type: "down" | "move" | "up" | "cancel",
  input: {
    readonly pointerId: number;
    readonly pointerType: "mouse" | "touch";
    readonly x: number;
  },
): void {
  const init = {
    pointerId: input.pointerId,
    pointerType: input.pointerType,
    button: 0,
    buttons: type === "up" || type === "cancel" ? 0 : 1,
    isPrimary: true,
    clientX: input.x,
    clientY: 40,
  };
  if (type === "down") fireEvent.pointerDown(target, init);
  else if (type === "move") fireEvent.pointerMove(target, init);
  else if (type === "up") fireEvent.pointerUp(target, init);
  else fireEvent.pointerCancel(target, init);
}

describe("PetWandPlayV1", () => {
  it("uses mouse and touch Pointer Events without a keyboard gameplay surrogate", () => {
    const onComplete = vi.fn();
    const onDismiss = vi.fn();
    render(
      <PetWandPlayV1
        currentness={currentnessV1}
        onComplete={onComplete}
        onDismiss={onDismiss}
      />,
    );
    const surface = surfaceV1();
    expect(surface).not.toHaveAttribute("tabindex");
    expect(screen.getByRole("button", { name: "放下逗猫棒" })).toBeEnabled();

    pointerV1(surface, "down", { pointerId: 1, pointerType: "mouse", x: 10 });
    pointerV1(surface, "move", { pointerId: 1, pointerType: "mouse", x: 58 });
    pointerV1(surface, "move", { pointerId: 1, pointerType: "mouse", x: 16 });
    pointerV1(surface, "up", { pointerId: 1, pointerType: "mouse", x: 16 });
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("caught", currentnessV1);

    pointerV1(surface, "down", { pointerId: 2, pointerType: "touch", x: 10 });
    pointerV1(surface, "up", { pointerId: 2, pointerType: "touch", x: 10 });
    expect(onComplete).toHaveBeenLastCalledWith("missed", currentnessV1);
    expect(onComplete).toHaveBeenCalledTimes(2);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("settles pointer cancellation once as ended early", () => {
    const onComplete = vi.fn();
    const onDismiss = vi.fn();
    render(
      <PetWandPlayV1
        currentness={currentnessV1}
        onComplete={onComplete}
        onDismiss={onDismiss}
      />,
    );
    const surface = surfaceV1();

    pointerV1(surface, "down", { pointerId: 7, pointerType: "touch", x: 10 });
    pointerV1(surface, "move", { pointerId: 7, pointerType: "touch", x: 60 });
    pointerV1(surface, "cancel", { pointerId: 7, pointerType: "touch", x: 60 });
    pointerV1(surface, "up", { pointerId: 7, pointerType: "touch", x: 20 });
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("ended_early", currentnessV1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("settles against the activity and invitation captured at pointer-down", () => {
    const onComplete = vi.fn();
    const onDismiss = vi.fn();
    const rendered = render(
      <PetWandPlayV1
        currentness={currentnessV1}
        onComplete={onComplete}
        onDismiss={onDismiss}
      />,
    );
    const surface = surfaceV1();
    pointerV1(surface, "down", { pointerId: 8, pointerType: "mouse", x: 10 });
    rendered.rerender(
      <PetWandPlayV1
        currentness={{ expectedActivityOccurrence: 9, expectedInvitationOccurrence: 5 }}
        onComplete={onComplete}
        onDismiss={onDismiss}
      />,
    );
    pointerV1(surface, "move", { pointerId: 8, pointerType: "mouse", x: 58 });
    pointerV1(surface, "move", { pointerId: 8, pointerType: "mouse", x: 16 });
    pointerV1(surface, "up", { pointerId: 8, pointerType: "mouse", x: 16 });

    expect(onComplete).toHaveBeenCalledExactlyOnceWith("caught", currentnessV1);
  });

  it("dismisses an idle game without recording a round", () => {
    const onComplete = vi.fn();
    const onDismiss = vi.fn();
    render(
      <PetWandPlayV1
        currentness={currentnessV1}
        onComplete={onComplete}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "放下逗猫棒" }));

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("keeps the native stop control accessible without making it a catch action", () => {
    const onComplete = vi.fn();
    const onDismiss = vi.fn();
    render(
      <PetWandPlayV1
        currentness={currentnessV1}
        onComplete={onComplete}
        onDismiss={onDismiss}
      />,
    );
    const surface = surfaceV1();
    const stop = screen.getByRole("button", { name: "放下逗猫棒" });

    pointerV1(surface, "down", { pointerId: 9, pointerType: "mouse", x: 10 });
    expect(stop).toBeEnabled();
    stop.focus();
    expect(stop).toHaveFocus();
    fireEvent.click(stop);
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("ended_early", currentnessV1);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

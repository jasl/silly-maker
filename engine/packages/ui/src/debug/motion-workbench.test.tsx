// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { AssetId, MotionDocumentV1, StageContentCatalogV1 } from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  parseMotionDocumentV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";

import type { MotionIoWriteResultV1, MotionSourceIoV1 } from "./motion-io.ts";
import { createMotionSourceIndexV1 } from "./motion-sources.ts";
import { MotionWorkbenchV1 } from "./motion-workbench.tsx";
import type { SemanticStageEntryRendererV1 } from "../stage/semantic-stage-host.tsx";

const motionJsonV1 = {
  format: "sillymaker.motion",
  version: 1,
  motionId: "motion.test.enter",
  label: "登场",
  durationMs: 300,
  delayMs: 100,
  tracks: [
    {
      channel: "offsetX",
      keyframes: [
        { atPermille: 0, value: 120 },
        { atPermille: 1000, value: 0 },
      ],
    },
    {
      channel: "opacityPermille",
      keyframes: [
        { atPermille: 0, value: 0 },
        { atPermille: 1000, value: 1000 },
      ],
    },
  ],
} as const;

const contentCatalogV1: StageContentCatalogV1 = {
  resolveContent: () =>
    Object.freeze({
      rendererId: "renderer.test.box",
      assetIds: Object.freeze([] as readonly AssetId[]),
      accessibleName: "角色",
      props: Object.freeze({}),
    }),
};

function previewTargetV1() {
  const empty = createSemanticStageStateV1({
    stageId: "stage.test.workbench",
    layerIds: ["layer.test.chars"],
  });
  const outcome = reduceStageMutationsV1(empty, [
    {
      kind: "show",
      layerId: "layer.test.chars",
      tag: "tag.test.actor",
      contentId: "content.test.actor",
      placement: { x: 200, y: 40, scalePermille: 1000, opacityPermille: 1000, mirrored: false },
    },
  ]);
  if (outcome.kind !== "applied") throw new Error("workbench fixture stage must apply");
  return projectStageRenderTargetV1(outcome.state, contentCatalogV1).target;
}

const rendererV1: SemanticStageEntryRendererV1 = ({ entry }) => (
  <span data-test-content={entry.contentId} />
);

function fixtureV1(io?: MotionSourceIoV1, phase?: "enter" | "exit") {
  const index = createMotionSourceIndexV1(
    { "./motions/enter.motion.json": motionJsonV1 },
    { sourceRoot: "src" },
  );
  const source = index.get("motion.test.enter");
  if (source === null) throw new Error("fixture source missing");
  return render(
    <MotionWorkbenchV1
      source={source}
      preview={{
        target: previewTargetV1(),
        renderers: { "renderer.test.box": rendererV1 },
        entryKey: "layer.test.chars:tag.test.actor",
        canvas: { width: 960, height: 540 },
        ...(phase === undefined ? {} : { phase }),
      }}
      {...(io === undefined ? {} : { io })}
    />,
  );
}

function mainEntryV1(container: HTMLElement): HTMLElement {
  const entries = [
    ...container.querySelectorAll('[data-stage-key="layer.test.chars:tag.test.actor"]'),
  ]
    .filter((entry) => entry.closest("[data-workbench-ghost]") === null);
  const [entry] = entries;
  if (!(entry instanceof HTMLElement)) throw new Error("workbench main entry missing");
  return entry;
}

function fakeIoV1(): {
  readonly io: MotionSourceIoV1;
  writes(): readonly { path: string; expectedDigest: string; motionDocument: MotionDocumentV1 }[];
  setWriteResult(result: MotionIoWriteResultV1): void;
} {
  let bytesDigest = "sha256:aaaa";
  let writeResult: MotionIoWriteResultV1 | null = null;
  const writes: { path: string; expectedDigest: string; motionDocument: MotionDocumentV1 }[] = [];
  return {
    io: {
      list: () =>
        Promise.resolve({
          kind: "ok",
          motions: [
            {
              path: "src/motions/enter.motion.json",
              motionId: "motion.test.enter",
              label: "登场",
            },
          ],
          skipped: [],
        }),
      read: (path) =>
        Promise.resolve({
          kind: "ok",
          digest: bytesDigest,
          motionDocument: parseMotionDocumentV1(motionJsonV1, `/${path}`),
        }),
      write: (input) => {
        writes.push(input);
        if (writeResult !== null) return Promise.resolve(writeResult);
        bytesDigest = "sha256:bbbb";
        return Promise.resolve({ kind: "ok", digest: bytesDigest });
      },
      create: () => Promise.resolve({ kind: "error", code: "unavailable" }),
    },
    writes: () => writes,
    setWriteResult: (result) => {
      writeResult = result;
    },
  };
}

afterEach(cleanup);

describe("MotionWorkbenchV1", () => {
  it("scrubs the detached canvas deterministically over the settled placement", () => {
    const { container } = fixtureV1();

    // t=0 sits inside the delay hold: first keyframes over placement (200+120, opacity 0).
    expect(mainEntryV1(container).style.transform).toContain("translate3d(320px");
    expect(mainEntryV1(container).style.opacity).toBe("0");

    // The ghost shows the start pose regardless of the playhead.
    const ghost = container.querySelector("[data-workbench-ghost] [data-stage-key]");
    if (!(ghost instanceof HTMLElement)) throw new Error("ghost entry missing");
    expect(ghost.style.transform).toContain("translate3d(320px");

    // Scrub to the midpoint of the animated span (delay 100 + 150 = 250 of 400).
    const scrub = container.querySelector("[data-workbench-scrub]");
    if (!(scrub instanceof HTMLElement)) throw new Error("scrubber missing");
    fireEvent.change(scrub, { target: { value: "250" } });
    expect(mainEntryV1(container).style.transform).toContain("translate3d(260px");
    expect(mainEntryV1(container).style.opacity).toBe("0.5");

    // Scrub to the end: the motion settles back to the placement identity.
    fireEvent.change(scrub, { target: { value: "400" } });
    expect(mainEntryV1(container).style.transform).toContain("translate3d(200px");
    expect(mainEntryV1(container).style.opacity).toBe("");
  });

  it("selects a keyframe, drags the ghost to write offsets, and drags a dot to move a stop", () => {
    const { container } = fixtureV1();
    const dot = (id: string): HTMLElement => {
      const element = container.querySelector(`[data-workbench-dot="${id}"]`);
      if (!(element instanceof HTMLElement)) throw new Error(`dot ${id} missing`);
      return element;
    };
    const ghost = container.querySelector("[data-workbench-ghost]");
    if (!(ghost instanceof HTMLElement)) throw new Error("ghost missing");

    // Without a selection the ghost is display-only.
    expect(ghost.dataset.workbenchGhostDraggable).toBeUndefined();

    // Selecting the first offsetX keyframe arms the ghost at that stop.
    fireEvent.click(dot("offsetX:0"));
    expect(dot("offsetX:0").dataset.workbenchDotSelected).toBe("true");
    expect(ghost.dataset.workbenchGhostDraggable).toBe("true");

    // Canvas scale is 360/960 = 0.375: dragging +37.5 screen px moves the
    // pose +100 logical px, so the stop's offsetX becomes 120 + 100 = 220.
    fireEvent.pointerDown(ghost, { button: 0, pointerId: 3, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(ghost, { pointerId: 3, clientX: 137.5, clientY: 100 });
    fireEvent.pointerUp(ghost, { pointerId: 3 });
    const offsetXRow = container.querySelector('[data-workbench-keyframe="offsetX:0"]');
    if (offsetXRow === null) throw new Error("offsetX keyframe row missing");
    expect(
      (offsetXRow.querySelector("[data-workbench-kf-value]") as HTMLInputElement).value,
    ).toBe("220");
    const ghostEntry = ghost.querySelector("[data-stage-key]");
    expect((ghostEntry as HTMLElement).style.transform).toContain("translate3d(420px");
    // The vertical axis rides along: a zero-delta offsetY track appears.
    expect(container.querySelector('[data-workbench-track="offsetY"]')).not.toBeNull();

    // Insert a middle keyframe, then drag its dot along the stubbed bar.
    const addButton = offsetXRow.querySelector("[data-workbench-add-kf]");
    fireEvent.click(addButton as HTMLElement);
    const middleDot = dot("offsetX:1");
    const bar = middleDot.parentElement;
    if (bar === null) throw new Error("track bar missing");
    bar.getBoundingClientRect = () =>
      ({
        left: 0,
        width: 1000,
        top: 0,
        height: 14,
        right: 1000,
        bottom: 14,
        x: 0,
        y: 0,
      }) as DOMRect;
    fireEvent.pointerDown(middleDot, { button: 0, pointerId: 4, clientX: 500, clientY: 5 });
    fireEvent.pointerMove(middleDot, { pointerId: 4, clientX: 700, clientY: 5 });
    fireEvent.pointerUp(middleDot, { pointerId: 4 });
    const movedRow = container.querySelector('[data-workbench-keyframe="offsetX:1"]');
    if (movedRow === null) throw new Error("moved keyframe row missing");
    expect(
      (movedRow.querySelector("[data-workbench-kf-at]") as HTMLInputElement).value,
    ).toBe("700");
  });

  it("edits the draft, compares against saved, and reverts", () => {
    const { container } = fixtureV1();
    const duration = container.querySelector("[data-workbench-duration]");
    if (!(duration instanceof HTMLInputElement)) throw new Error("duration input missing");
    fireEvent.change(duration, { target: { value: "470" } });

    // The scrubber's range now reflects the draft (delay 100 + 470).
    const scrub = container.querySelector("[data-workbench-scrub]");
    expect(scrub?.getAttribute("max")).toBe("570");

    // A/B to saved: the canvas time axis returns to the saved document.
    const savedRadio = container.querySelector('[data-workbench-ab="saved"]');
    if (!(savedRadio instanceof HTMLElement)) throw new Error("saved radio missing");
    fireEvent.click(savedRadio);
    expect(container.querySelector("[data-workbench-scrub]")?.getAttribute("max")).toBe("400");

    // Revert clears the draft back to saved.
    const revert = container.querySelector("[data-workbench-revert]");
    if (!(revert instanceof HTMLElement)) throw new Error("revert missing");
    fireEvent.click(revert);
    expect(
      (container.querySelector("[data-workbench-duration]") as HTMLInputElement).value,
    ).toBe("300");
  });

  it("flips the canvas back to draft when an edit lands while viewing saved", () => {
    const { container } = fixtureV1();
    const savedRadio = container.querySelector('[data-workbench-ab="saved"]');
    if (!(savedRadio instanceof HTMLInputElement)) throw new Error("saved radio missing");
    fireEvent.click(savedRadio);
    expect(savedRadio.checked).toBe(true);

    // Editing the duration while previewing "saved" must not silently edit
    // an invisible draft: the canvas flips back to the draft it edits.
    const duration = container.querySelector("[data-workbench-duration]");
    if (!(duration instanceof HTMLInputElement)) throw new Error("duration input missing");
    fireEvent.change(duration, { target: { value: "470" } });
    const draftRadio = container.querySelector('[data-workbench-ab="draft"]');
    expect((draftRadio as HTMLInputElement).checked).toBe(true);
    expect(container.querySelector("[data-workbench-scrub]")?.getAttribute("max")).toBe("570");
  });

  it("renders an exit-phase preview as the exiting edge of the entry", () => {
    const { container } = fixtureV1(undefined, "exit");
    // The animated entry carries the exiting phase (not a hardcoded enter).
    const exiting = container.querySelector(
      '[data-stage-exiting-key="layer.test.chars:tag.test.actor"]',
    );
    expect(exiting).not.toBeNull();
    expect((exiting as HTMLElement).dataset.stagePhase).toBe("exiting");
  });

  it("undoes and redoes draft edits, one coalesced step per field run", () => {
    const { container } = fixtureV1();
    const duration = container.querySelector("[data-workbench-duration]");
    if (!(duration instanceof HTMLInputElement)) throw new Error("duration input missing");
    const undoButton = container.querySelector("[data-workbench-undo]");
    const redoButton = container.querySelector("[data-workbench-redo]");
    if (!(undoButton instanceof HTMLButtonElement) || !(redoButton instanceof HTMLButtonElement)) {
      throw new Error("undo/redo buttons missing");
    }
    expect(undoButton.disabled).toBe(true);

    // Two keystrokes on one field coalesce into a single undo step.
    fireEvent.change(duration, { target: { value: "470" } });
    fireEvent.change(duration, { target: { value: "520" } });
    expect(undoButton.disabled).toBe(false);

    // Undoing while previewing "saved" flips the canvas back to the draft.
    const savedRadio = container.querySelector('[data-workbench-ab="saved"]');
    fireEvent.click(savedRadio as HTMLElement);
    fireEvent.click(undoButton);
    expect(
      (container.querySelector('[data-workbench-ab="draft"]') as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (container.querySelector("[data-workbench-duration]") as HTMLInputElement).value,
    ).toBe("300");
    expect(undoButton.disabled).toBe(true);

    fireEvent.click(redoButton);
    expect(
      (container.querySelector("[data-workbench-duration]") as HTMLInputElement).value,
    ).toBe("520");
  });

  it("saves through the CAS port and surfaces digest conflicts", async () => {
    const fake = fakeIoV1();
    const { container } = fixtureV1(fake.io);
    await act(async () => {
      await Promise.resolve();
    });

    // Clean draft: save disabled.
    const save = container.querySelector("[data-workbench-save]");
    if (!(save instanceof HTMLButtonElement)) throw new Error("save missing");
    expect(save.disabled).toBe(true);

    const duration = container.querySelector("[data-workbench-duration]");
    if (!(duration instanceof HTMLInputElement)) throw new Error("duration missing");
    fireEvent.change(duration, { target: { value: "470" } });
    expect(save.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(save);
      await Promise.resolve();
    });
    expect(fake.writes()).toHaveLength(1);
    expect(fake.writes()[0]).toMatchObject({
      path: "src/motions/enter.motion.json",
      expectedDigest: "sha256:aaaa",
    });
    expect(fake.writes()[0]?.motionDocument.durationMs).toBe(470);
    // A human save graduates the asset to human_tuned for the AI guardrails.
    expect(fake.writes()[0]?.motionDocument.authoring?.status).toBe("human_tuned");
    expect(
      container.querySelector("[data-workbench-status]")?.getAttribute("data-workbench-status"),
    ).toBe("saved");

    // A second edit hitting a digest conflict shows the reload path.
    fake.setWriteResult({ kind: "error", code: "digest_conflict" });
    fireEvent.change(duration, { target: { value: "520" } });
    await act(async () => {
      fireEvent.click(save);
      await Promise.resolve();
    });
    expect(container.querySelector("[data-workbench-reload]")).not.toBeNull();
  });

  it("blocks saving while the draft is invalid", async () => {
    const fake = fakeIoV1();
    const { container } = fixtureV1(fake.io);
    await act(async () => {
      await Promise.resolve();
    });

    const duration = container.querySelector("[data-workbench-duration]");
    if (!(duration instanceof HTMLInputElement)) throw new Error("duration missing");
    fireEvent.change(duration, { target: { value: "-5" } });
    expect(container.querySelector("[data-workbench-invalid]")).not.toBeNull();
    expect(
      (container.querySelector("[data-workbench-save]") as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

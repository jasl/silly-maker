// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import type { SceneDocumentV1, StageContentCatalogV1 } from "@sillymaker/base";
import { parseSceneDocumentV1 } from "@sillymaker/base";
import type { SemanticStageEntryRendererV1 } from "@sillymaker/ui";

import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type { SceneSourceIoV1 } from "./core/scene-io.ts";
import type { StudioBindingV1 } from "./studio-app.tsx";
import { StudioAppV1 } from "./studio-app.tsx";

afterEach(cleanup);

const scenePathV1 = "src/scenes/opening/opening.scene.json";

function sceneDocumentV1(): SceneDocumentV1 {
  return parseSceneDocumentV1({
    format: "sillymaker.scene",
    version: 1,
    sceneId: "scene.test.opening",
    label: "开场",
    canvas: { width: 1280, height: 720 },
    entries: [
      {
        layerId: "layer.test.background",
        tag: "tag.backdrop",
        contentId: "content.test.background",
        zOrder: 0,
      },
      {
        layerId: "layer.test.characters",
        tag: "tag.hero",
        contentId: "content.test.hero",
        zOrder: 10,
        placement: { x: 920, y: 600, scalePermille: 1000, opacityPermille: 1000, mirrored: false },
        appearance: { expression: "calm" },
      },
    ],
    cues: [
      { cueId: "cue.test.opening.backdrop", kind: "show", tag: "tag.backdrop" },
      { cueId: "cue.test.opening.hero-enters", kind: "show", tag: "tag.hero" },
    ],
  });
}

interface FakeSceneIoV1 extends SceneSourceIoV1 {
  readonly writes: {
    path: string;
    expectedDigest: string;
    sceneDocument: SceneDocumentV1;
  }[];
  readonly creates: { path: string; sceneDocument: SceneDocumentV1 }[];
  failNextWriteWith(code: "digest_conflict"): void;
  deferNextWrite(): () => void;
}

function fakeIoV1(initial: SceneDocumentV1): FakeSceneIoV1 {
  const documents = new Map<string, { digest: string; doc: SceneDocumentV1 }>([
    [scenePathV1, { digest: "sha256:1", doc: initial }],
  ]);
  let failNext: "digest_conflict" | null = null;
  let deferWrite = false;
  let releaseWrite: (() => void) | null = null;
  const writes: FakeSceneIoV1["writes"] = [];
  const creates: FakeSceneIoV1["creates"] = [];
  return {
    writes,
    creates,
    failNextWriteWith(code) {
      failNext = code;
    },
    deferNextWrite() {
      deferWrite = true;
      return () => {
        releaseWrite?.();
        releaseWrite = null;
      };
    },
    list: () =>
      Promise.resolve({
        kind: "ok" as const,
        scenes: [...documents.entries()].map(([path, entry]) => ({
          path,
          sceneId: entry.doc.sceneId,
          label: entry.doc.label,
        })),
        skipped: [],
      }),
    read: (path) => {
      const found = documents.get(path);
      return found === undefined
        ? Promise.resolve({ kind: "error" as const, code: "not_found" as const })
        : Promise.resolve({
          kind: "ok" as const,
          digest: found.digest,
          sceneDocument: found.doc,
        });
    },
    async write(input) {
      if (deferWrite) {
        deferWrite = false;
        await new Promise<void>((resolve) => {
          releaseWrite = resolve;
        });
      }
      if (failNext !== null) {
        const code = failNext;
        failNext = null;
        return { kind: "error" as const, code };
      }
      writes.push({ ...input });
      const digest = `sha256:${String(writes.length + 1)}`;
      documents.set(input.path, { digest, doc: input.sceneDocument });
      return { kind: "ok" as const, digest };
    },
    create(input) {
      creates.push({ ...input });
      const digest = `sha256:c${String(creates.length)}`;
      documents.set(input.path, { digest, doc: input.sceneDocument });
      return Promise.resolve({ kind: "ok" as const, digest });
    },
  };
}

const boxRendererV1: SemanticStageEntryRendererV1 = ({ entry }) => (
  <span
    data-test-content={entry.contentId}
    data-test-expression={(entry.appearance as Record<string, string>)["expression"] ?? ""}
  />
);

const catalogV1: StageContentCatalogV1 = {
  resolveContent: (contentId, appearance) =>
    Object.freeze({
      rendererId: "renderer.test.box",
      // The hero's assets follow its appearance, so the resolution panel and
      // the fitting preview can observe the compositor being asked again.
      assetIds: (contentId as string) === "content.test.hero"
        ? Object.freeze([
          `asset.test.hero-${
            (appearance as Record<string, string>)["expression"] ?? "none"
          }` as never,
        ])
        : Object.freeze([]),
      accessibleName: `内容 ${contentId}`,
      props: Object.freeze({}),
      ...(contentId === "content.test.hero"
        ? {
          geometry: Object.freeze({
            width: 200,
            height: 300,
            anchorXPermille: 500,
            anchorYPermille: 1000,
          }),
          hitRegions: Object.freeze([
            Object.freeze({
              regionId: "zone.test.head",
              accessibleNameText: "摸头",
              x: -50,
              y: -300,
              width: 100,
              height: 80,
            }),
          ]),
        }
        : {}),
    }),
};

const bindingV1: StudioBindingV1 = Object.freeze({
  catalog: catalogV1,
  renderers: Object.freeze({ "renderer.test.box": boxRendererV1 }),
});

interface FakeMotionIoV1 extends MotionSourceIoV1 {
  readonly creates: { path: string; motionDocument: unknown }[];
  deferNextCreate(): () => void;
}

/** An index-backed motion port fake: list + read from in-memory documents. */
function fakeMotionIoV1(
  motions: readonly { readonly path: string; readonly motionDocument: unknown }[] = [],
  skipped: readonly { readonly path: string; readonly reason: string }[] = [],
): FakeMotionIoV1 {
  const store = [...motions];
  const creates: FakeMotionIoV1["creates"] = [];
  let deferCreate = false;
  let deferredCreateResolve: (() => void) | null = null;
  return {
    creates,
    deferNextCreate() {
      deferCreate = true;
      return () => {
        deferredCreateResolve?.();
        deferredCreateResolve = null;
      };
    },
    list: () =>
      Promise.resolve({
        kind: "ok" as const,
        motions: store.map((motion) => {
          const record = motion.motionDocument as { motionId: string; label: string };
          return { path: motion.path, motionId: record.motionId, label: record.label };
        }),
        skipped,
      }),
    read: (path) => {
      const found = store.find((motion) => motion.path === path);
      if (found === undefined) {
        return Promise.resolve({ kind: "error" as const, code: "not_found" });
      }
      return Promise.resolve({
        kind: "ok" as const,
        digest: `sha256:${path}`,
        motionDocument: found.motionDocument as never,
      });
    },
    write: () => Promise.resolve({ kind: "error" as const, code: "unavailable" }),
    async create(input) {
      creates.push({ ...input });
      if (deferCreate) {
        deferCreate = false;
        await new Promise<void>((resolve) => {
          deferredCreateResolve = resolve;
        });
      }
      store.push({ path: input.path, motionDocument: input.motionDocument });
      return { kind: "ok" as const, digest: `sha256:c${String(creates.length)}` };
    },
  };
}

describe("StudioAppV1", () => {
  it("lists scenes, opens the first, and renders the real-renderer canvas", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "开场" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
    );
    const canvas = container.querySelector("[data-studio-canvas]");
    expect(canvas).not.toBeNull();
    expect(canvas?.querySelector('[data-test-content="content.test.hero"]')).not.toBeNull();
    expect(
      canvas?.querySelector('[data-stage-key="layer.test.characters:tag.hero"]'),
    ).not.toBeNull();
  });

  it("edits the selected entry's x and saves the draft through CAS", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    render(<StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");

    const xInput = screen.getByLabelText("x");
    expect(xInput).toHaveValue(920);
    const save = screen.getByRole("button", { name: "保存" });
    expect(save).toBeDisabled();

    await user.clear(xInput);
    await user.type(xInput, "640");
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() => expect(io.writes).toHaveLength(1));
    const written = io.writes[0];
    expect(written?.expectedDigest).toBe("sha256:1");
    const hero = written?.sceneDocument.entries.find((entry) =>
      (entry.tag as string) ===
        "tag.hero"
    );
    expect(hero?.placement?.x).toBe(640);
    // The backdrop entry (no placement declared) stays untouched.
    const backdrop = written?.sceneDocument.entries.find(
      (entry) => (entry.tag as string) === "tag.backdrop",
    );
    expect(backdrop?.placement).toBeUndefined();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("已保存"));
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  });

  it("keeps edits made while an older save is pending", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    render(<StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    const xInput = screen.getByLabelText("x");
    await user.clear(xInput);
    await user.type(xInput, "640");

    const release = io.deferNextWrite();
    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "保存中…" })).toBeDisabled());

    const savingYInput = screen.getByLabelText("y");
    await user.clear(savingYInput);
    await user.type(savingYInput, "500");
    expect(savingYInput).toHaveValue(500);
    release();

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("当前仍有未保存修改"));
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
    expect(screen.getByLabelText("y")).toHaveValue(500);
    const writtenHero = io.writes[0]?.sceneDocument.entries.find(
      (entry) => entry.tag === "tag.hero",
    );
    expect(writtenHero?.placement).toMatchObject({ x: 640, y: 600 });
  });

  it("resets a rejected half-input when its pending save completes", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    render(<StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    await user.clear(screen.getByLabelText("x"));
    await user.type(screen.getByLabelText("x"), "640");

    const release = io.deferNextWrite();
    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "保存中…" })).toBeDisabled());
    await user.clear(screen.getByLabelText("缩放‰"));
    await user.type(screen.getByLabelText("缩放‰"), "0");
    expect(screen.getByRole("status")).toHaveTextContent(
      "scene_authoring.operation_payload_invalid",
    );

    release();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("已保存"));
    expect(screen.getByLabelText("缩放‰")).toHaveValue(1000);
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  });

  it("surfaces a digest conflict without clearing the draft", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    render(<StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    const xInput = screen.getByLabelText("x");
    await user.clear(xInput);
    await user.type(xInput, "500");

    io.failNextWriteWith("digest_conflict");
    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("已被其他编辑更改"));
    expect(io.writes).toHaveLength(0);
    expect(screen.getByLabelText("x")).toHaveValue(500);
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
  });

  it("drags an actor on the canvas into snapped, clamped logical coordinates", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const { fireEvent } = await import("@testing-library/react");

    await waitFor(() =>
      expect(container.querySelector('[data-studio-select="tag.hero"]')).not.toBeNull()
    );
    const heroBox = container.querySelector('[data-studio-select="tag.hero"]') as HTMLElement;
    // The selection box mirrors the engine anchor math (bottom center).
    expect(heroBox.style.left).toBe("820px");
    expect(heroBox.style.top).toBe("300px");
    expect(heroBox.style.width).toBe("200px");

    // previewScale = 720/1280 = 0.5625: +56.25 screen px = +100 logical px.
    fireEvent.pointerDown(heroBox, { button: 0, pointerId: 5, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(heroBox, { pointerId: 5, clientX: 456.25, clientY: 300 });
    fireEvent.pointerUp(heroBox, { pointerId: 5 });
    expect(screen.getByLabelText("x")).toHaveValue(1020);
    expect(screen.getByLabelText("y")).toHaveValue(600);

    // Dragging near the canvas center snaps to it and shows the guide.
    fireEvent.pointerDown(heroBox, { button: 0, pointerId: 6, clientX: 400, clientY: 300 });
    // 1020 → candidate 645 (Δ -375 logical = -210.9375 screen); 645 is
    // within the 8px/scale≈14.2 logical threshold of 640.
    fireEvent.pointerMove(heroBox, { pointerId: 6, clientX: 400 - 210.9375, clientY: 300 });
    expect(screen.getByLabelText("x")).toHaveValue(640);
    expect(container.querySelector('[data-studio-guide-x="640"]')).not.toBeNull();
    fireEvent.pointerUp(heroBox, { pointerId: 6 });
    expect(container.querySelector("[data-studio-guide-x]")).toBeNull();

    // Dragging far past the edge clamps to the canvas bounds.
    fireEvent.pointerDown(heroBox, { button: 0, pointerId: 7, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(heroBox, { pointerId: 7, clientX: 4000, clientY: 4000 });
    fireEvent.pointerUp(heroBox, { pointerId: 7 });
    expect(screen.getByLabelText("x")).toHaveValue(1280);
    expect(screen.getByLabelText("y")).toHaveValue(720);
  });

  it("stops an active placement gesture when another edit advances its receipt", async () => {
    const { container } = render(
      <StudioAppV1
        binding={bindingV1}
        io={fakeIoV1(sceneDocumentV1())}
        motionIo={fakeMotionIoV1()}
      />,
    );
    const { fireEvent } = await import("@testing-library/react");

    await waitFor(() =>
      expect(container.querySelector('[data-studio-select="tag.hero"]')).not.toBeNull()
    );
    fireEvent.change(screen.getByLabelText("条目"), { target: { value: "tag.hero" } });
    const heroBox = container.querySelector('[data-studio-select="tag.hero"]') as HTMLElement;
    fireEvent.pointerDown(heroBox, { button: 0, pointerId: 8, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(heroBox, { pointerId: 8, clientX: 456.25, clientY: 300 });
    expect(screen.getByLabelText("x")).toHaveValue(1020);

    // A sibling operation owns the next revision. The gesture must keep its
    // captured receipt instead of pairing its old startPlacement with a new
    // receipt and overwriting the sibling edit.
    fireEvent.click(screen.getByLabelText("镜像"));
    expect(screen.getByLabelText("镜像")).toBeChecked();
    fireEvent.pointerMove(heroBox, { pointerId: 8, clientX: 512.5, clientY: 300 });
    fireEvent.pointerUp(heroBox, { pointerId: 8 });

    expect(screen.getByLabelText("x")).toHaveValue(1020);
    expect(screen.getByLabelText("镜像")).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("scene_authoring.revision_stale");
  });

  it("scales the selected actor through the corner handle", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const { fireEvent } = await import("@testing-library/react");
    const user = userEvent.setup();

    await waitFor(() =>
      expect(container.querySelector('[data-studio-select="tag.hero"]')).not.toBeNull()
    );
    // Selecting via the canvas box reveals the handle and anchor dot.
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    const handle = container.querySelector(
      '[data-studio-scale-handle="tag.hero"]',
    ) as HTMLElement;
    expect(handle).not.toBeNull();
    expect(container.querySelector('[data-studio-anchor="tag.hero"]')).not.toBeNull();

    // Dragging up by 28.125 screen px = 50 logical px: the 300px-tall box
    // grows to 350 → scalePermille 1167.
    fireEvent.pointerDown(handle, { button: 0, pointerId: 9, clientX: 500, clientY: 200 });
    fireEvent.pointerMove(handle, { pointerId: 9, clientX: 500, clientY: 200 - 28.125 });
    fireEvent.pointerUp(handle, { pointerId: 9 });
    expect(screen.getByLabelText("缩放‰")).toHaveValue(1167);
  });

  it("replays through a selected cue and atomically rejects invalid numeric operations", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const { fireEvent } = await import("@testing-library/react");
    const user = userEvent.setup();

    await waitFor(() =>
      expect(
        container.querySelector('[data-stage-key="layer.test.characters:tag.hero"]'),
      ).not.toBeNull()
    );

    // Replay only through the backdrop cue: the hero has not entered yet.
    const backdropRow = container.querySelector('[data-studio-cue="cue.test.opening.backdrop"]');
    const stopButton = backdropRow?.querySelector("button[aria-pressed]");
    expect(stopButton).not.toBeNull();
    await user.click(stopButton as HTMLElement);
    await waitFor(() =>
      expect(
        container.querySelector('[data-stage-key="layer.test.characters:tag.hero"]'),
      ).toBeNull()
    );
    expect(
      container.querySelector('[data-stage-key="layer.test.background:tag.backdrop"]'),
    ).not.toBeNull();

    // A zero scale is inadmissible. It remains local pending input and the
    // operation boundary preserves the valid draft, dirty flag, and history.
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    const scaleInput = screen.getByLabelText("缩放‰");
    await user.clear(scaleInput);
    await user.type(scaleInput, "0");
    expect(screen.getByRole("status")).toHaveTextContent(
      "scene_authoring.operation_payload_invalid",
    );
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "撤销" })).toBeDisabled();
    expect(container.querySelector('[data-studio-diagnostic="blocking"]')).toBeNull();

    // A rejected half-input belongs to this entry only. Selection can also
    // change from a canvas/session update without a browser blur event.
    fireEvent.change(screen.getByLabelText("条目"), { target: { value: "tag.backdrop" } });
    expect(screen.getByLabelText("缩放‰")).toHaveValue(1000);
    fireEvent.change(screen.getByLabelText("条目"), { target: { value: "tag.hero" } });
    const resetScaleInput = screen.getByLabelText("缩放‰");
    await user.clear(resetScaleInput);
    await user.type(resetScaleInput, "0");
    await user.tab();
    expect(screen.getByLabelText("缩放‰")).toHaveValue(1000);

    await user.click(screen.getByLabelText("镜像"));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "撤销" })).toBeEnabled();
  });

  it("outlines declared hit regions on the canvas until the toggle hides them", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const user = userEvent.setup();

    // Default on: authors see the interactive areas while placing art.
    await waitFor(() =>
      expect(
        container.querySelector('[data-stage-hit-region-outline="zone.test.head"]'),
      ).not.toBeNull()
    );
    expect(
      container.querySelector('[data-stage-hit-region-outline="zone.test.head"]'),
    ).toHaveTextContent("zone.test.head");

    await user.click(screen.getByRole("checkbox", { name: "交互区域" }));
    expect(container.querySelector("[data-stage-hit-region-outline]")).toBeNull();
  });

  it("keeps an actor whose cue arc ends with a hide editable in the declared composition", async () => {
    const withExit = parseSceneDocumentV1({
      ...JSON.parse(JSON.stringify(sceneDocumentV1())) as Record<string, unknown>,
      cues: [
        { cueId: "cue.test.opening.backdrop", kind: "show", tag: "tag.backdrop" },
        { cueId: "cue.test.opening.hero-enters", kind: "show", tag: "tag.hero" },
        { cueId: "cue.test.opening.hero-leaves", kind: "hide", tag: "tag.hero" },
      ],
    });
    const io = fakeIoV1(withExit);
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const user = userEvent.setup();

    // Default canvas = declared composition: the hero stays visible and
    // selectable although the scene's cue arc ends with an exit.
    await waitFor(() =>
      expect(
        container.querySelector('[data-stage-key="layer.test.characters:tag.hero"]'),
      ).not.toBeNull()
    );
    expect(container.querySelector('[data-studio-canvas-mode="declared"]')).not.toBeNull();

    // Replay through the exit cue: the story preview hides the hero.
    const exitRow = container.querySelector('[data-studio-cue="cue.test.opening.hero-leaves"]');
    const stopButton = exitRow?.querySelector("button[aria-pressed]");
    expect(stopButton).not.toBeNull();
    await user.click(stopButton as HTMLElement);
    await waitFor(() =>
      expect(
        container.querySelector('[data-stage-key="layer.test.characters:tag.hero"]'),
      ).toBeNull()
    );
    expect(
      container.querySelector(
        '[data-studio-canvas-mode="cue.test.opening.hero-leaves"]',
      ),
    ).not.toBeNull();

    // Toggling the same cue off returns to the declared composition.
    await user.click(stopButton as HTMLElement);
    await waitFor(() =>
      expect(
        container.querySelector('[data-stage-key="layer.test.characters:tag.hero"]'),
      ).not.toBeNull()
    );
    expect(container.querySelector('[data-studio-canvas-mode="declared"]')).not.toBeNull();
  });

  it("gates scene switching behind a dirty-draft confirm (save, discard, cancel)", async () => {
    const other = parseSceneDocumentV1({
      ...JSON.parse(JSON.stringify(sceneDocumentV1())) as Record<string, unknown>,
      sceneId: "scene.test.backyard",
      label: "后院",
    });
    const documents = new Map<string, SceneDocumentV1>([
      [scenePathV1, sceneDocumentV1()],
      ["src/scenes/backyard/backyard.scene.json", other],
    ]);
    const writes: { path: string }[] = [];
    const io: SceneSourceIoV1 = {
      list: () =>
        Promise.resolve({
          kind: "ok" as const,
          scenes: [...documents.entries()].map(([path, doc]) => ({
            path,
            sceneId: doc.sceneId,
            label: doc.label,
          })),
          skipped: [],
        }),
      read: (path) =>
        Promise.resolve({
          kind: "ok" as const,
          digest: `sha256:${path}`,
          sceneDocument: documents.get(path) as SceneDocumentV1,
        }),
      write: (input) => {
        writes.push({ path: input.path });
        documents.set(input.path, input.sceneDocument);
        return Promise.resolve({ kind: "ok" as const, digest: "sha256:next" });
      },
      create: () => Promise.resolve({ kind: "error" as const, code: "unavailable" as const }),
    };
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    const xInput = screen.getByLabelText("x");
    await user.clear(xInput);
    await user.type(xInput, "640");

    // Switching with a dirty draft asks first; nothing loads yet.
    await user.click(screen.getByRole("button", { name: "后院" }));
    expect(container.querySelector("[data-studio-dirty-confirm]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "开场" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("x")).toHaveValue(640);

    // Cancel keeps the dirty draft in place.
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(container.querySelector("[data-studio-dirty-confirm]")).toBeNull();
    expect(screen.getByLabelText("x")).toHaveValue(640);

    // Save-and-continue commits the draft, then opens the other scene.
    await user.click(screen.getByRole("button", { name: "后院" }));
    await user.click(screen.getByRole("button", { name: "保存并继续" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "后院" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
    );
    expect(writes).toHaveLength(1);

    // Discard-and-continue never writes.
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    const backyardX = screen.getByLabelText("x");
    await user.clear(backyardX);
    await user.type(backyardX, "111");
    await user.click(screen.getByRole("button", { name: "开场" }));
    await user.click(screen.getByRole("button", { name: "放弃修改" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "开场" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
    );
    expect(writes).toHaveLength(1);
  });

  it("drops a stale scene read that resolves after a newer open", async () => {
    const opening = sceneDocumentV1();
    const backyard = parseSceneDocumentV1({
      ...JSON.parse(JSON.stringify(sceneDocumentV1())) as Record<string, unknown>,
      sceneId: "scene.test.backyard",
      label: "后院",
    });
    const backyardPath = "src/scenes/backyard/backyard.scene.json";
    let releaseBackyard: (() => void) | null = null;
    const io: SceneSourceIoV1 = {
      list: () =>
        Promise.resolve({
          kind: "ok" as const,
          scenes: [
            { path: scenePathV1, sceneId: opening.sceneId, label: opening.label },
            { path: backyardPath, sceneId: backyard.sceneId, label: backyard.label },
          ],
          skipped: [],
        }),
      read: (path) => {
        if (path === backyardPath) {
          // A slow read: it resolves only when the test releases it.
          return new Promise((resolve) => {
            releaseBackyard = () =>
              resolve({ kind: "ok" as const, digest: "sha256:b", sceneDocument: backyard });
          });
        }
        return Promise.resolve({
          kind: "ok" as const,
          digest: "sha256:a",
          sceneDocument: opening,
        });
      },
      write: () => Promise.resolve({ kind: "ok" as const, digest: "sha256:x" }),
      create: () => Promise.resolve({ kind: "error" as const, code: "unavailable" as const }),
    };
    render(<StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />);
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "开场" })).toHaveAttribute("aria-pressed", "true")
    );
    // Click the slow scene, then return to the fast one before it resolves.
    await user.click(screen.getByRole("button", { name: "后院" }));
    await user.click(screen.getByRole("button", { name: "开场" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "开场" })).toHaveAttribute("aria-pressed", "true")
    );

    // The stale read lands last and must not overwrite the current scene.
    const { act } = await import("@testing-library/react");
    await act(async () => {
      releaseBackyard?.();
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "开场" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "后院" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reports a failed first-scene open once and does not retry", async () => {
    let reads = 0;
    const io: SceneSourceIoV1 = {
      list: () =>
        Promise.resolve({
          kind: "ok" as const,
          scenes: [{ path: scenePathV1, sceneId: "scene.test.opening", label: "开场" }],
          skipped: [],
        }),
      read: () => {
        reads += 1;
        return Promise.resolve({ kind: "error" as const, code: "not_found" });
      },
      write: () => Promise.resolve({ kind: "ok" as const, digest: "sha256:x" }),
      create: () => Promise.resolve({ kind: "error" as const, code: "unavailable" as const }),
    };
    render(<StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("读取场景失败"));
    expect(reads).toBe(1);
    // A later render/flush must not start another automatic open.
    await waitFor(() => expect(screen.getByRole("button", { name: "开场" })).toBeVisible());
    expect(reads).toBe(1);

    // Clicking the scene is the explicit retry.
    await user.click(screen.getByRole("button", { name: "开场" }));
    await waitFor(() => expect(reads).toBe(2));
    expect(screen.getByRole("status")).toHaveTextContent("读取场景失败");
  });

  it("undoes and redoes draft edits: one step per field run or drag gesture", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const { fireEvent } = await import("@testing-library/react");
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    const undoButton = screen.getByRole("button", { name: "撤销" });
    const redoButton = screen.getByRole("button", { name: "重做" });
    expect(undoButton).toBeDisabled();

    // A typed run on one field coalesces into a single undo step.
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    const xInput = screen.getByLabelText("x");
    await user.clear(xInput);
    await user.type(xInput, "640");
    expect(xInput).toHaveValue(640);
    await user.click(undoButton);
    expect(screen.getByLabelText("x")).toHaveValue(920);
    expect(undoButton).toBeDisabled();
    await user.click(redoButton);
    expect(screen.getByLabelText("x")).toHaveValue(640);

    // Returning to the same field starts a fresh coalescing run rather than
    // merging edits across a blur/focus boundary.
    await user.click(screen.getByLabelText("x"));
    await user.clear(screen.getByLabelText("x"));
    await user.type(screen.getByLabelText("x"), "700");
    await user.tab();
    await user.click(screen.getByLabelText("x"));
    await user.clear(screen.getByLabelText("x"));
    await user.type(screen.getByLabelText("x"), "800");
    await user.click(undoButton);
    expect(screen.getByLabelText("x")).toHaveValue(700);
    await user.click(undoButton);
    expect(screen.getByLabelText("x")).toHaveValue(640);

    // A whole drag gesture is one undo step back to the pre-drag position.
    const heroBox = container.querySelector('[data-studio-select="tag.hero"]') as HTMLElement;
    fireEvent.pointerDown(heroBox, { button: 0, pointerId: 11, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(heroBox, { pointerId: 11, clientX: 428.125, clientY: 300 });
    fireEvent.pointerMove(heroBox, { pointerId: 11, clientX: 456.25, clientY: 300 });
    fireEvent.pointerUp(heroBox, { pointerId: 11 });
    expect(screen.getByLabelText("x")).toHaveValue(740);
    await user.click(screen.getByRole("button", { name: "撤销" }));
    expect(screen.getByLabelText("x")).toHaveValue(640);
  });

  it("binds and clears motions on hide cues and lists the exit preview case", async () => {
    const leaveMotion = {
      format: "sillymaker.motion",
      version: 1,
      motionId: "motion.test.leave",
      label: "退场",
      durationMs: 300,
      delayMs: 0,
      tracks: [
        {
          channel: "offsetX",
          keyframes: [{ atPermille: 0, value: 0 }, { atPermille: 1000, value: 120 }],
        },
      ],
    };
    const withExit = parseSceneDocumentV1({
      ...JSON.parse(JSON.stringify(sceneDocumentV1())) as Record<string, unknown>,
      cues: [
        { cueId: "cue.test.opening.backdrop", kind: "show", tag: "tag.backdrop" },
        { cueId: "cue.test.opening.hero-enters", kind: "show", tag: "tag.hero" },
        {
          cueId: "cue.test.opening.hero-leaves",
          kind: "hide",
          tag: "tag.hero",
          motionId: "motion.test.leave",
        },
      ],
    });
    // The motion reaches Studio through the index-backed port, not a
    // binding registration.
    const motionIo = fakeMotionIoV1([
      { path: "src/scenes/opening/motions/leave.motion.json", motionDocument: leaveMotion },
    ]);
    const io = fakeIoV1(withExit);
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={io} motionIo={motionIo} />,
    );
    const user = userEvent.setup();

    // The hide cue gets the same motion selector as show cues.
    await waitFor(() =>
      expect(
        container.querySelector('[data-studio-cue="cue.test.opening.hero-leaves"]'),
      ).not.toBeNull()
    );
    await waitFor(() =>
      expect(screen.getByLabelText("cue.test.opening.hero-leaves 的 motion")).toHaveValue(
        "motion.test.leave",
      )
    );

    // The workbench lists the exit case built from the scene *before* the
    // hide (where the hero is still present).
    await waitFor(() =>
      expect(
        container.querySelector(
          '[data-motion-workbench-case="cue.test.opening.hero-leaves"]',
        ),
      ).not.toBeNull()
    );
    expect(
      container.querySelector('[data-motion-workbench-case="cue.test.opening.hero-leaves"]'),
    ).toHaveTextContent("退场");

    const selector = screen.getByLabelText("cue.test.opening.hero-leaves 的 motion");
    await user.selectOptions(selector, "");
    expect(selector).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "撤销" }));
    expect(selector).toHaveValue("motion.test.leave");
    await user.click(screen.getByRole("button", { name: "重做" }));
    expect(selector).toHaveValue("");
  });

  it("enumerates motions from the project index and names skipped files (S2)", async () => {
    const enterMotion = {
      format: "sillymaker.motion",
      version: 1,
      motionId: "motion.test.enter",
      label: "登场",
      durationMs: 300,
      delayMs: 0,
      tracks: [
        {
          channel: "offsetX",
          keyframes: [{ atPermille: 0, value: -80 }, { atPermille: 1000, value: 0 }],
        },
      ],
    };
    // Two indexed files: one readable, one that fails its read — plus one
    // the index itself skipped. Nothing here was registered in the binding.
    const motionIo: MotionSourceIoV1 = {
      list: () =>
        Promise.resolve({
          kind: "ok",
          motions: [
            {
              path: "src/scenes/opening/motions/enter.motion.json",
              motionId: "motion.test.enter",
              label: "登场",
            },
            {
              path: "src/scenes/opening/motions/gone.motion.json",
              motionId: "motion.test.gone",
              label: "失踪",
            },
          ],
          skipped: [
            { path: "src/scenes/opening/motions/broken.motion.json", reason: "not valid JSON" },
          ],
        }),
      read: (path) =>
        path === "src/scenes/opening/motions/enter.motion.json"
          ? Promise.resolve({
            kind: "ok",
            digest: "sha256:enter",
            motionDocument: enterMotion as never,
          })
          : Promise.resolve({ kind: "error", code: "not_found" }),
      write: () => Promise.resolve({ kind: "error", code: "unavailable" }),
      create: () => Promise.resolve({ kind: "error", code: "unavailable" }),
    };
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={io} motionIo={motionIo} />,
    );

    // The cue table's motion dropdown offers the indexed motion.
    await waitFor(() =>
      expect(
        screen.getByLabelText("cue.test.opening.hero-enters 的 motion"),
      ).toContainHTML("motion.test.enter")
    );

    // The skip and the failed read are named, not silent.
    await waitFor(() =>
      expect(container.querySelector("[data-studio-diagnostics]")).not.toBeNull()
    );
    const diagnostics = container.querySelector("[data-studio-diagnostics]");
    expect(diagnostics).toHaveTextContent("motion 文档未索引");
    expect(diagnostics).toHaveTextContent("broken.motion.json");
    expect(diagnostics).toHaveTextContent("motion 文档读取失败");
    expect(diagnostics).toHaveTextContent("gone.motion.json");
    // Warnings never block saving (the draft is clean here, so only the
    // dirty gate keeps save disabled — no blocking diagnostic exists).
    expect(container.querySelector('[data-studio-diagnostic="blocking"]')).toBeNull();
  });

  it("surfaces authoring warnings without blocking save", async () => {
    // The hero content has no catalog resolution: the canvas degrades to a
    // fallback and the author sees why, but saving stays possible.
    const gappedCatalog: StageContentCatalogV1 = {
      resolveContent: (contentId) =>
        (contentId as string) === "content.test.hero" ? null : Object.freeze({
          rendererId: "renderer.test.box",
          assetIds: Object.freeze([]),
          accessibleName: `内容 ${contentId}`,
          props: Object.freeze({}),
        }),
    };
    const binding: StudioBindingV1 = Object.freeze({
      catalog: gappedCatalog,
      renderers: Object.freeze({ "renderer.test.box": boxRendererV1 }),
    });
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={binding} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const user = userEvent.setup();

    await waitFor(() =>
      expect(container.querySelector("[data-studio-diagnostics]")).not.toBeNull()
    );
    expect(container.querySelector("[data-studio-diagnostics]")).toHaveTextContent(
      "stage.content_unresolved",
    );
    expect(container.querySelector('[data-studio-diagnostic="blocking"]')).toBeNull();

    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    const xInput = screen.getByLabelText("x");
    await user.clear(xInput);
    await user.type(xInput, "640");
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
  });

  it("preloads the compiled target's assets and re-renders as bytes arrive", async () => {
    const preloaded: string[][] = [];
    let loaded = false;
    const listeners = new Set<() => void>();
    let revision = 0;
    const registry = {
      preload(assetIds: readonly string[], _signal: AbortSignal): Promise<unknown> {
        preloaded.push([...assetIds]);
        return Promise.resolve([]);
      },
      observe: () => ({ revision }),
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      publishLoaded(): void {
        loaded = true;
        revision += 1;
        for (const listener of [...listeners]) listener();
      },
    };
    const artRenderer: SemanticStageEntryRendererV1 = ({ entry }) =>
      loaded
        ? <img data-test-art={entry.contentId} alt="" src="blob:hero" />
        : <span data-test-fallback={entry.contentId} />;
    const assetCatalog: StageContentCatalogV1 = {
      resolveContent: (contentId) =>
        Object.freeze({
          rendererId: "renderer.test.art",
          assetIds: Object.freeze([`asset.for.${contentId as string}` as never]),
          accessibleName: `内容 ${contentId}`,
          props: Object.freeze({}),
        }),
    };
    const binding: StudioBindingV1 = Object.freeze({
      catalog: assetCatalog,
      renderers: Object.freeze({ "renderer.test.art": artRenderer }),
      assets: registry,
    });
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={binding} io={io} motionIo={fakeMotionIoV1()} />,
    );

    await waitFor(() =>
      expect(
        container.querySelector('[data-test-fallback="content.test.hero"]'),
      ).not.toBeNull()
    );
    // The preload runs in a passive effect; under load it can flush a beat
    // after the fallback DOM appears, so the assertion waits too.
    await waitFor(() =>
      expect(preloaded.at(-1)).toEqual([
        "asset.for.content.test.background",
        "asset.for.content.test.hero",
      ])
    );

    // Bytes arrive: the registry publishes and the canvas swaps to real art
    // without any user interaction.
    const { act } = await import("@testing-library/react");
    act(() => registry.publishLoaded());
    await waitFor(() =>
      expect(container.querySelector('[data-test-art="content.test.hero"]')).not.toBeNull()
    );
  });

  // ---- Scene Construction (S4) ------------------------------------------

  const contentsBindingV1: StudioBindingV1 = Object.freeze({
    catalog: catalogV1,
    renderers: Object.freeze({ "renderer.test.box": boxRendererV1 }),
    contents: Object.freeze([
      {
        contentId: "content.test.background",
        label: "庭院背景",
        category: "background" as const,
        defaultLayerId: "layer.test.background",
        defaultZOrder: 0,
      },
      {
        contentId: "content.test.hero",
        label: "主角",
        category: "character" as const,
        defaultLayerId: "layer.test.characters",
        defaultZOrder: 10,
        defaultAppearance: Object.freeze({ expression: "calm" }),
        appearanceFields: Object.freeze([
          Object.freeze({
            key: "expression",
            label: "表情",
            values: Object.freeze(["calm", "happy"]),
          }),
        ]),
      },
      {
        contentId: "content.test.lamp",
        label: "路灯",
        category: "prop" as const,
        defaultLayerId: "layer.test.props",
        defaultZOrder: 5,
      },
    ]),
  });

  it("adds manifest content as a new entry with a derived stable tag (S4)", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={contentsBindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    // The character content flags nothing; the geometry-less prop does.
    const heroRow = container.querySelector('[data-studio-add-content="content.test.hero"]');
    expect(heroRow).not.toBeNull();
    await user.click(heroRow as HTMLElement);

    // Derived tag: content.test.hero → tag.test.hero; auto-selected, placed
    // at the canvas center, immediately draggable (geometry declared).
    expect(screen.getByLabelText("条目")).toHaveValue("tag.test.hero");
    expect(screen.getByLabelText("x")).toHaveValue(640);
    expect(screen.getByLabelText("y")).toHaveValue(360);
    await waitFor(() =>
      expect(
        container.querySelector('[data-studio-select="tag.test.hero"]'),
      ).not.toBeNull()
    );
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();

    // Saving persists the constructed entry through the ordinary CAS write.
    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(io.writes).toHaveLength(1));
    const added = io.writes[0]?.sceneDocument.entries.find(
      (entry) => (entry.tag as string) === "tag.test.hero",
    );
    expect(added?.contentId as string).toBe("content.test.hero");
    expect(added?.zOrder).toBe(10);
    expect(added?.appearance).toEqual({ expression: "calm" });
  });

  it("warns when placeable manifest content declares no geometry (S4)", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={contentsBindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    // The browser already flags the prop as not draggable.
    const lampRow = container.querySelector('[data-studio-content-category="prop"]');
    expect(lampRow).toHaveTextContent("不可拖拽");

    await user.click(
      container.querySelector('[data-studio-add-content="content.test.lamp"]') as HTMLElement,
    );
    expect(screen.getByLabelText("条目")).toHaveValue("tag.test.lamp");
    // No selection box (no geometry), and the diagnostics panel says why.
    expect(container.querySelector('[data-studio-select="tag.test.lamp"]')).toBeNull();
    await waitFor(() =>
      expect(container.querySelector("[data-studio-diagnostics]")).toHaveTextContent(
        "未声明 geometry",
      )
    );
    expect(container.querySelector('[data-studio-diagnostic="blocking"]')).toBeNull();
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
  });

  it("adds and removes cues; removing an entry takes its cues along (S4)", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={contentsBindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    // Append a hide cue for the hero: derived id from scene + tag + kind.
    await user.selectOptions(screen.getByLabelText("新 cue 目标"), "tag.hero");
    await user.selectOptions(screen.getByLabelText("新 cue 的类型"), "hide");
    await user.click(screen.getByRole("button", { name: "新增 cue" }));
    expect(
      container.querySelector('[data-studio-cue="cue.test.opening.hero-hide"]'),
    ).not.toBeNull();

    // Remove one cue directly.
    await user.click(
      container.querySelector(
        '[data-studio-remove-cue="cue.test.opening.hero-hide"]',
      ) as HTMLElement,
    );
    expect(container.querySelector('[data-studio-cue="cue.test.opening.hero-hide"]')).toBeNull();

    // Removing the hero entry cascades into its remaining cue (admission
    // requires cue tags to resolve to declared entries).
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    await user.click(screen.getByRole("button", { name: "移除条目（连同其 cue）" }));
    expect(
      container.querySelector('[data-studio-cue="cue.test.opening.hero-enters"]'),
    ).toBeNull();
    const entrySelect = screen.getByLabelText("条目");
    expect(entrySelect).toHaveValue("tag.backdrop");
    expect([...entrySelect.querySelectorAll("option")].map((option) => option.value)).toEqual([
      "tag.backdrop",
    ]);
    // One undo step per structured command: undo restores entry + cue.
    await user.click(screen.getByRole("button", { name: "撤销" }));
    expect(
      container.querySelector('[data-studio-cue="cue.test.opening.hero-enters"]'),
    ).not.toBeNull();
  });

  it("derives valid cue and entry selections when undo removes their targets", async () => {
    const { container } = render(
      <StudioAppV1
        binding={contentsBindingV1}
        io={fakeIoV1(sceneDocumentV1())}
        motionIo={fakeMotionIoV1()}
      />,
    );
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await user.selectOptions(screen.getByLabelText("新 cue 目标"), "tag.hero");
    await user.selectOptions(screen.getByLabelText("新 cue 的类型"), "hide");
    await user.click(screen.getByRole("button", { name: "新增 cue" }));
    const addedCue = container.querySelector(
      '[data-studio-cue="cue.test.opening.hero-hide"]',
    );
    await user.click(addedCue?.querySelector("button[aria-pressed]") as HTMLElement);
    await user.click(screen.getByRole("button", { name: "撤销" }));

    expect(container.querySelector('[data-studio-cue="cue.test.opening.hero-hide"]')).toBeNull();
    expect(container.querySelector("[data-studio-compile-error]")).toBeNull();
    expect(container.querySelector('[data-studio-canvas-mode="declared"]')).not.toBeNull();

    await user.click(
      container.querySelector('[data-studio-add-content="content.test.hero"]') as HTMLElement,
    );
    expect(screen.getByLabelText("条目")).toHaveValue("tag.test.hero");
    await user.click(screen.getByRole("button", { name: "撤销" }));
    expect(screen.getByLabelText("条目")).toHaveValue("tag.backdrop");
    expect(container.querySelector("[data-studio-compile-error]")).toBeNull();
  });

  it("edits appearance through the manifest's structured fields (S4)", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    render(<StudioAppV1 binding={contentsBindingV1} io={io} motionIo={fakeMotionIoV1()} />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    const expressionSelect = screen.getByLabelText("表情");
    expect(expressionSelect).toHaveValue("calm");
    await user.selectOptions(expressionSelect, "happy");

    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(io.writes).toHaveLength(1));
    const hero = io.writes[0]?.sceneDocument.entries.find(
      (entry) => (entry.tag as string) === "tag.hero",
    );
    expect(hero?.appearance).toEqual({ expression: "happy" });
  });

  it("edits appearance keys without a manifest descriptor (free-text rows)", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const { fireEvent } = await import("@testing-library/react");
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");

    // The declared key renders editable although no descriptor exists;
    // committed values recompile the canvas through the real compositor.
    const row = screen.getByLabelText("外观 expression");
    expect(row).toHaveValue("calm");
    fireEvent.focus(row);
    fireEvent.change(row, { target: { value: "happy" } });
    fireEvent.blur(row);
    await waitFor(() =>
      expect(container.querySelector('[data-test-expression="happy"]')).not.toBeNull()
    );

    // A later focus run on the same field owns a distinct undo step.
    fireEvent.focus(screen.getByLabelText("外观 expression"));
    fireEvent.change(screen.getByLabelText("外观 expression"), { target: { value: "sad" } });
    fireEvent.blur(screen.getByLabelText("外观 expression"));
    await user.click(screen.getByRole("button", { name: "撤销" }));
    expect(screen.getByLabelText("外观 expression")).toHaveValue("happy");

    // A brand-new key joins through the admission-gated add row.
    await user.type(screen.getByLabelText("新外观键"), "mood");
    await user.type(screen.getByLabelText("新外观值"), "sad");
    await user.click(screen.getByRole("button", { name: "添加外观键" }));
    expect(screen.getByLabelText("外观 mood")).toHaveValue("sad");

    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(io.writes).toHaveLength(1));
    const hero = io.writes[0]?.sceneDocument.entries.find(
      (entry) => (entry.tag as string) === "tag.hero",
    );
    expect(hero?.appearance).toEqual({ expression: "happy", mood: "sad" });

    // Removing a key deletes it from the document draft.
    await user.click(
      container.querySelector('[data-studio-appearance-remove="mood"]') as HTMLElement,
    );
    expect(screen.queryByLabelText("外观 mood")).toBeNull();
  });

  it("shows the catalog's resolved renderer and assets for the selected entry", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const { fireEvent } = await import("@testing-library/react");
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    const panel = container.querySelector('[data-studio-resolution="tag.hero"]');
    expect(panel).toHaveTextContent("renderer.test.box");
    expect(
      panel?.querySelector('[data-studio-resolution-asset="asset.test.hero-calm"]'),
    ).not.toBeNull();

    // The panel follows appearance edits — the compositor is asked again.
    fireEvent.change(screen.getByLabelText("外观 expression"), { target: { value: "happy" } });
    await waitFor(() =>
      expect(
        container.querySelector('[data-studio-resolution-asset="asset.test.hero-happy"]'),
      ).not.toBeNull()
    );
  });

  it("previews appearance through 试穿 without dirtying the draft", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const { fireEvent } = await import("@testing-library/react");
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    await user.click(screen.getByRole("checkbox", { name: "试穿预览" }));

    fireEvent.change(screen.getByLabelText("外观 expression"), { target: { value: "happy" } });
    // The canvas recompiles with the override and the resolution follows…
    await waitFor(() =>
      expect(container.querySelector('[data-test-expression="happy"]')).not.toBeNull()
    );
    expect(
      container.querySelector('[data-studio-resolution-asset="asset.test.hero-happy"]'),
    ).not.toBeNull();
    // …but the draft stays clean: nothing to save, nothing to undo.
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "撤销" })).toBeDisabled();

    // Toggling off drops the overrides; the canvas returns to the document.
    await user.click(screen.getByRole("checkbox", { name: "试穿预览" }));
    await waitFor(() =>
      expect(container.querySelector('[data-test-expression="calm"]')).not.toBeNull()
    );
  });

  it("creates a blank scene through the dev port and opens it (S4)", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(
      <StudioAppV1 binding={contentsBindingV1} io={io} motionIo={fakeMotionIoV1()} />,
    );
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await user.click(screen.getByRole("button", { name: "新建场景" }));
    await user.type(screen.getByLabelText(/^场景名/u), "garden");
    await user.type(screen.getByLabelText("标题"), "花园");
    await user.click(screen.getByRole("button", { name: "创建" }));

    // The create goes to the port with the inferred scene-id prefix and the
    // conventional path; the new scene opens through the navigation gate.
    await waitFor(() => expect(io.creates).toHaveLength(1));
    expect(io.creates[0]?.path).toBe("src/scenes/garden/garden.scene.json");
    expect(io.creates[0]?.sceneDocument.sceneId).toBe("scene.test.garden");
    expect(io.creates[0]?.sceneDocument.entries).toHaveLength(0);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "花园" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
    );
    expect(screen.getByText("这个场景还没有条目。")).toBeVisible();

    // Constructing from blank: add a background, then the character.
    await user.click(
      container.querySelector(
        '[data-studio-add-content="content.test.background"]',
      ) as HTMLElement,
    );
    await user.click(
      container.querySelector('[data-studio-add-content="content.test.hero"]') as HTMLElement,
    );
    await user.selectOptions(screen.getByLabelText("新 cue 目标"), "tag.test.hero");
    await user.click(screen.getByRole("button", { name: "新增 cue" }));
    expect(container.querySelector('[data-studio-cue="cue.test.garden.hero"]')).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(io.writes).toHaveLength(1));
    expect(io.writes[0]?.path).toBe("src/scenes/garden/garden.scene.json");
    expect(io.writes[0]?.sceneDocument.entries).toHaveLength(2);
    expect(io.writes[0]?.sceneDocument.cues).toHaveLength(1);
  });

  it("creates a fade motion for an unbound cue and clones a bound one (S4)", async () => {
    const enterMotion = {
      format: "sillymaker.motion",
      version: 1,
      motionId: "motion.test.enter",
      label: "登场",
      durationMs: 470,
      delayMs: 0,
      tracks: [
        {
          channel: "offsetX",
          keyframes: [{ atPermille: 0, value: -80 }, { atPermille: 1000, value: 0 }],
        },
      ],
    };
    const withBound = parseSceneDocumentV1({
      ...JSON.parse(JSON.stringify(sceneDocumentV1())) as Record<string, unknown>,
      cues: [
        { cueId: "cue.test.opening.backdrop", kind: "show", tag: "tag.backdrop" },
        {
          cueId: "cue.test.opening.hero-enters",
          kind: "show",
          tag: "tag.hero",
          motionId: "motion.test.enter",
        },
      ],
    });
    const motionIo = fakeMotionIoV1([
      { path: "src/scenes/opening/motions/enter.motion.json", motionDocument: enterMotion },
    ]);
    const io = fakeIoV1(withBound);
    const { container } = render(
      <StudioAppV1 binding={contentsBindingV1} io={io} motionIo={motionIo} />,
    );
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());

    // An unbound cue creates the default fade next to the scene and binds it.
    await user.click(
      container.querySelector(
        '[data-studio-create-motion="cue.test.opening.backdrop"]',
      ) as HTMLElement,
    );
    await waitFor(() => expect(motionIo.creates).toHaveLength(1));
    expect(motionIo.creates[0]?.path).toBe("src/scenes/opening/motions/backdrop.motion.json");
    const createdFade = motionIo.creates[0]?.motionDocument as {
      motionId: string;
      tracks: readonly { channel: string; keyframes: readonly { value: number }[] }[];
      authoring: { status: string };
    };
    expect(createdFade.motionId).toBe("motion.test.backdrop");
    expect(createdFade.tracks[0]?.channel).toBe("opacityPermille");
    expect(createdFade.authoring.status).toBe("generated");
    await waitFor(() =>
      expect(screen.getByLabelText("cue.test.opening.backdrop 的 motion")).toHaveValue(
        "motion.test.backdrop",
      )
    );

    // A bound cue clones the bound document under a new id and rebinds.
    await user.click(
      container.querySelector(
        '[data-studio-create-motion="cue.test.opening.hero-enters"]',
      ) as HTMLElement,
    );
    await waitFor(() => expect(motionIo.creates).toHaveLength(2));
    expect(motionIo.creates[1]?.path).toBe(
      "src/scenes/opening/motions/hero-enters.motion.json",
    );
    const cloned = motionIo.creates[1]?.motionDocument as {
      motionId: string;
      durationMs: number;
      tracks: readonly { channel: string }[];
    };
    expect(cloned.motionId).toBe("motion.test.hero-enters");
    expect(cloned.durationMs).toBe(470);
    expect(cloned.tracks[0]?.channel).toBe("offsetX");
    await waitFor(() =>
      expect(screen.getByLabelText("cue.test.opening.hero-enters 的 motion")).toHaveValue(
        "motion.test.hero-enters",
      )
    );
    // The scene draft is dirty (rebind) — the motion files are already on
    // disk, the binding write persists with the scene save.
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
  });

  it("does not bind an asynchronously created motion across a newer draft revision", async () => {
    const indexedMotion = {
      format: "sillymaker.motion",
      version: 1,
      motionId: "motion.test.indexed",
      label: "已有动效",
      durationMs: 300,
      delayMs: 0,
      tracks: [{
        channel: "opacityPermille",
        keyframes: [{ atPermille: 0, value: 0 }, { atPermille: 1000, value: 1000 }],
      }],
    };
    const motionIo = fakeMotionIoV1([{
      path: "src/scenes/opening/motions/indexed.motion.json",
      motionDocument: indexedMotion,
    }]);
    const releaseCreate = motionIo.deferNextCreate();
    const { container } = render(
      <StudioAppV1
        binding={contentsBindingV1}
        io={fakeIoV1(sceneDocumentV1())}
        motionIo={motionIo}
      />,
    );
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
    await user.click(
      container.querySelector(
        '[data-studio-create-motion="cue.test.opening.backdrop"]',
      ) as HTMLElement,
    );
    await waitFor(() => expect(motionIo.creates).toHaveLength(1));

    // The file create is still pending, but an unrelated valid Scene edit
    // advances the captured revision. Its completion must not overwrite the
    // newer draft by binding against a freshly sampled receipt.
    await user.click(screen.getByLabelText("镜像"));
    releaseCreate();

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("场景草稿已变化，未自动绑定")
    );
    expect(screen.getByLabelText("cue.test.opening.backdrop 的 motion")).toHaveValue("");
    expect(screen.getByLabelText("镜像")).toBeChecked();
  });

  it("binds and clears an entry's ambient loop through the inspector (ambient M2)", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const breatheMotion = {
      format: "sillymaker.motion",
      version: 1,
      motionId: "motion.test.breathe",
      label: "呼吸",
      durationMs: 400,
      delayMs: 0,
      tracks: [
        {
          channel: "offsetY",
          keyframes: [
            { atPermille: 0, value: 0 },
            { atPermille: 500, value: -6 },
            { atPermille: 1000, value: 0 },
          ],
        },
      ],
    };
    const motionIo = fakeMotionIoV1([
      { path: "src/scenes/opening/motions/breathe.motion.json", motionDocument: breatheMotion },
    ]);
    render(<StudioAppV1 binding={bindingV1} io={io} motionIo={motionIo} />);
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");

    // Binding the loop is one draft edit; saving writes the ambient field.
    const ambientSelect = screen.getByLabelText("循环动效");
    await user.selectOptions(ambientSelect, "motion.test.breathe");
    const save = screen.getByRole("button", { name: "保存" });
    expect(save).toBeEnabled();
    await user.click(save);
    await waitFor(() => expect(io.writes).toHaveLength(1));
    const hero = io.writes[0]?.sceneDocument.entries.find(
      (entry) => (entry.tag as string) === "tag.hero",
    );
    expect(hero?.ambient).toEqual({ motionId: "motion.test.breathe" });

    // Clearing removes the field again.
    await user.selectOptions(ambientSelect, "");
    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(io.writes).toHaveLength(2));
    const cleared = io.writes[1]?.sceneDocument.entries.find(
      (entry) => (entry.tag as string) === "tag.hero",
    );
    expect(cleared?.ambient).toBeUndefined();
  });

  it("warns when an entry's ambient references an unindexed motion (ambient M2)", async () => {
    const withAmbient = parseSceneDocumentV1({
      ...JSON.parse(JSON.stringify(sceneDocumentV1())),
      entries: [
        {
          layerId: "layer.test.background",
          tag: "tag.backdrop",
          contentId: "content.test.background",
          zOrder: 0,
          ambient: { motionId: "motion.test.ghost" },
        },
        {
          layerId: "layer.test.characters",
          tag: "tag.hero",
          contentId: "content.test.hero",
          zOrder: 10,
          placement: {
            x: 920,
            y: 600,
            scalePermille: 1000,
            opacityPermille: 1000,
            mirrored: false,
          },
          appearance: { expression: "calm" },
        },
      ],
    });
    const { container } = render(
      <StudioAppV1 binding={bindingV1} io={fakeIoV1(withAmbient)} motionIo={fakeMotionIoV1()} />,
    );
    await waitFor(() => expect(screen.getByLabelText("条目")).toBeVisible());
    await waitFor(() => {
      const warnings = [
        ...container.querySelectorAll('[data-studio-diagnostic="warning"]'),
      ].map((node) => node.textContent ?? "");
      expect(
        warnings.some((warning) =>
          warning.includes("motion.test.ghost") && warning.includes("未被索引")
        ),
      ).toBe(true);
    });
  });

  it("renders the Flow workspace only when the binding declares a flow projection (S5)", async () => {
    const flowBindingV1: StudioBindingV1 = Object.freeze({
      ...bindingV1,
      flow: Object.freeze({
        nodes: Object.freeze([
          Object.freeze({
            nodeId: "node.test.hello",
            kind: "say" as const,
            docId: "doc.test.opening",
            blockName: "hello",
            summary: "text.test.hello",
            source: "interaction-doc:doc.test.opening#hello",
          }),
        ]),
        edges: Object.freeze([]),
      }),
      // The binding's text port reaches the Flow workspace unchanged.
      resolveText: (textId: string) => (textId === "text.test.hello" ? "你好。" : null),
    });
    const withFlow = render(
      <StudioAppV1
        binding={flowBindingV1}
        io={fakeIoV1(sceneDocumentV1())}
        motionIo={fakeMotionIoV1()}
      />,
    );
    const user = userEvent.setup();
    expect(withFlow.container.querySelector("[data-studio-flow]")).toBeNull();
    await user.click(screen.getByRole("button", { name: "打开 Narrative 流程" }));
    await waitFor(() =>
      expect(withFlow.container.querySelector("[data-studio-flow]")).not.toBeNull()
    );
    expect(
      withFlow.container.querySelector('[data-studio-flow-node="node.test.hello"]'),
    ).not.toBeNull();
    expect(
      withFlow.container.querySelector('[data-studio-flow-node="node.test.hello"]'),
    ).toHaveTextContent("你好。");
    withFlow.unmount();

    // Without a flow projection the workspace stays hidden.
    const withoutFlow = render(
      <StudioAppV1
        binding={bindingV1}
        io={fakeIoV1(sceneDocumentV1())}
        motionIo={fakeMotionIoV1()}
      />,
    );
    await waitFor(() =>
      expect(withoutFlow.container.querySelector("[data-studio-scenes]")).not.toBeNull()
    );
    expect(withoutFlow.container.querySelector("[data-studio-flow]")).toBeNull();
  });
});

// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SceneDocumentV1, StageContentCatalogV1 } from "@sillymaker/base";
import { parseSceneDocumentV1 } from "@sillymaker/base";
import type { SemanticStageEntryRendererV1 } from "@sillymaker/ui";

import type { SceneSourceIoV1 } from "./scene-io.ts";
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
  failNextWriteWith(code: "digest_conflict"): void;
}

function fakeIoV1(initial: SceneDocumentV1): FakeSceneIoV1 {
  let digest = "sha256:1";
  let saved = initial;
  let failNext: "digest_conflict" | null = null;
  const writes: FakeSceneIoV1["writes"] = [];
  return {
    writes,
    failNextWriteWith(code) {
      failNext = code;
    },
    list: () =>
      Promise.resolve({
        kind: "ok" as const,
        scenes: [{ path: scenePathV1, sceneId: saved.sceneId, label: saved.label }],
      }),
    read: () => Promise.resolve({ kind: "ok" as const, digest, sceneDocument: saved }),
    write(input) {
      if (failNext !== null) {
        const code = failNext;
        failNext = null;
        return Promise.resolve({ kind: "error" as const, code });
      }
      writes.push({ ...input });
      saved = input.sceneDocument;
      digest = `sha256:${String(writes.length + 1)}`;
      return Promise.resolve({ kind: "ok" as const, digest });
    },
  };
}

const boxRendererV1: SemanticStageEntryRendererV1 = ({ entry }) => (
  <span data-test-content={entry.contentId} />
);

const catalogV1: StageContentCatalogV1 = {
  resolveContent: (contentId) =>
    Object.freeze({
      rendererId: "renderer.test.box",
      assetIds: Object.freeze([]),
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

describe("StudioAppV1", () => {
  it("lists scenes, opens the first, and renders the real-renderer canvas", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(<StudioAppV1 binding={bindingV1} io={io} />);

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
    render(<StudioAppV1 binding={bindingV1} io={io} />);
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

  it("surfaces a digest conflict without clearing the draft", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    render(<StudioAppV1 binding={bindingV1} io={io} />);
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
    const { container } = render(<StudioAppV1 binding={bindingV1} io={io} />);
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

  it("scales the selected actor through the corner handle", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(<StudioAppV1 binding={bindingV1} io={io} />);
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

  it("replays through a selected cue and blocks saving on compile errors", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(<StudioAppV1 binding={bindingV1} io={io} />);
    const user = userEvent.setup();

    await waitFor(() =>
      expect(
        container.querySelector('[data-stage-key="layer.test.characters:tag.hero"]'),
      ).not.toBeNull()
    );

    // Replay only through the backdrop cue: the hero has not entered yet.
    const backdropRow = container.querySelector('[data-studio-cue="cue.test.opening.backdrop"]');
    const stopButton = backdropRow?.querySelector("button");
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

    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      // A zero scale is inadmissible; the compile error blocks saving.
      await user.selectOptions(screen.getByLabelText("条目"), "tag.hero");
      const scaleInput = screen.getByLabelText("缩放‰");
      await user.clear(scaleInput);
      await user.type(scaleInput, "0");
      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("场景无法编译"));
      expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
    } finally {
      spy.mockRestore();
    }
  });

  it("outlines declared hit regions on the canvas until the toggle hides them", async () => {
    const io = fakeIoV1(sceneDocumentV1());
    const { container } = render(<StudioAppV1 binding={bindingV1} io={io} />);
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
    const { container } = render(<StudioAppV1 binding={bindingV1} io={io} />);
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
    const stopButton = exitRow?.querySelector("button");
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
    const { container } = render(<StudioAppV1 binding={binding} io={io} />);

    await waitFor(() =>
      expect(
        container.querySelector('[data-test-fallback="content.test.hero"]'),
      ).not.toBeNull()
    );
    expect(preloaded.at(-1)).toEqual([
      "asset.for.content.test.background",
      "asset.for.content.test.hero",
    ]);

    // Bytes arrive: the registry publishes and the canvas swaps to real art
    // without any user interaction.
    const { act } = await import("@testing-library/react");
    act(() => registry.publishLoaded());
    await waitFor(() =>
      expect(container.querySelector('[data-test-art="content.test.hero"]')).not.toBeNull()
    );
  });
});

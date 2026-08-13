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
});

// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ChromeLayoutDocumentV1, StageContentCatalogV1 } from "@sillymaker/base";
import { parseChromeLayoutDocumentV1 } from "@sillymaker/base";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type { SceneSourceIoV1 } from "../../core/scene-io.ts";
import type { ChromeLayoutSourceIoV1 } from "../../core/chrome-layout-io.ts";
import type { StudioBindingV1, StudioChromeFixtureV1 } from "../../studio-app.tsx";
import { StudioAppV1 } from "../../studio-app.tsx";

afterEach(cleanup);

/**
 * Chrome workspace tests run through the full shell. The layout's own
 * canvas is 640×360, well under the 720px preview cap, so the preview
 * scale is 1 and pointer deltas equal canvas px.
 */

const hudLayoutPathV1 = "src/chrome/hud.chrome-layout.json";
const menuLayoutPathV1 = "src/chrome/menu.chrome-layout.json";

function hudLayoutDocumentV1(): ChromeLayoutDocumentV1 {
  return parseChromeLayoutDocumentV1({
    format: "sillymaker.chrome-layout",
    version: 1,
    layoutId: "layout.test.hud",
    label: "HUD 布局",
    canvas: { width: 640, height: 360 },
    boxes: { chip: { x: 40, y: 30, width: 120, height: 48 } },
    anchors: { "tab-tip": { x: 320, y: 12 } },
    offsets: { "menu-gap": 16 },
    authoring: { status: "generated" },
  });
}

function menuLayoutDocumentV1(): ChromeLayoutDocumentV1 {
  return parseChromeLayoutDocumentV1({
    format: "sillymaker.chrome-layout",
    version: 1,
    layoutId: "layout.test.menu",
    label: "菜单布局",
    canvas: { width: 640, height: 360 },
    boxes: {},
    anchors: {},
    offsets: {},
  });
}

function fakeSceneIoV1(): SceneSourceIoV1 {
  return {
    list: () => Promise.resolve({ kind: "ok" as const, scenes: [], skipped: [] }),
    read: () => Promise.resolve({ kind: "error" as const, code: "not_found" as const }),
    write: () => Promise.resolve({ kind: "error" as const, code: "unavailable" as const }),
    create: () => Promise.resolve({ kind: "error" as const, code: "unavailable" as const }),
  };
}

function fakeMotionIoV1(): MotionSourceIoV1 {
  return {
    list: () => Promise.resolve({ kind: "ok" as const, motions: [], skipped: [] }),
    read: () => Promise.resolve({ kind: "error" as const, code: "not_found" }),
    write: () => Promise.resolve({ kind: "error" as const, code: "unavailable" }),
    create: () => Promise.resolve({ kind: "error" as const, code: "unavailable" }),
  };
}

interface FakeChromeIoV1 extends ChromeLayoutSourceIoV1 {
  readonly writes: {
    path: string;
    expectedDigest: string;
    chromeLayoutDocument: ChromeLayoutDocumentV1;
  }[];
  readonly creates: { path: string; chromeLayoutDocument: ChromeLayoutDocumentV1 }[];
  failNextWriteWith(code: "digest_conflict"): void;
}

function fakeChromeIoV1(
  initial: readonly { readonly path: string; readonly doc: ChromeLayoutDocumentV1 }[],
): FakeChromeIoV1 {
  const documents = new Map(
    initial.map((entry) => [entry.path, { digest: "sha256:1", doc: entry.doc }]),
  );
  let failNext: "digest_conflict" | null = null;
  const writes: FakeChromeIoV1["writes"] = [];
  const creates: FakeChromeIoV1["creates"] = [];
  return {
    writes,
    creates,
    failNextWriteWith(code) {
      failNext = code;
    },
    list: () =>
      Promise.resolve({
        kind: "ok" as const,
        chromeLayouts: [...documents.entries()].map(([path, entry]) => ({
          path,
          layoutId: entry.doc.layoutId,
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
          chromeLayoutDocument: found.doc,
        });
    },
    write(input) {
      if (failNext !== null) {
        const code = failNext;
        failNext = null;
        return Promise.resolve({ kind: "error" as const, code });
      }
      writes.push({ ...input });
      const digest = `sha256:${String(writes.length + 1)}`;
      documents.set(input.path, { digest, doc: input.chromeLayoutDocument });
      return Promise.resolve({ kind: "ok" as const, digest });
    },
    create(input) {
      creates.push({ ...input });
      const digest = `sha256:c${String(creates.length)}`;
      documents.set(input.path, { digest, doc: input.chromeLayoutDocument });
      return Promise.resolve({ kind: "ok" as const, digest });
    },
  };
}

const catalogV1: StageContentCatalogV1 = {
  resolveContent: () => null,
};

function bindingV1(chrome?: readonly StudioChromeFixtureV1[]): StudioBindingV1 {
  return Object.freeze({
    catalog: catalogV1,
    renderers: Object.freeze({}),
    ...(chrome === undefined ? {} : { chrome }),
  });
}

function renderStudioV1(
  chromeIo: ChromeLayoutSourceIoV1,
  chrome?: readonly StudioChromeFixtureV1[],
) {
  return render(
    <StudioAppV1
      binding={bindingV1(chrome)}
      io={fakeSceneIoV1()}
      motionIo={fakeMotionIoV1()}
      chromeIo={chromeIo}
    />,
  );
}

async function waitForChromeCanvasV1(container: HTMLElement): Promise<HTMLElement> {
  await waitFor(() =>
    expect(
      container.querySelector('[data-studio-chrome-canvas] [data-studio-chrome-box="chip"]'),
    ).not.toBeNull()
  );
  return container.querySelector("[data-studio-chrome-canvas]") as HTMLElement;
}

describe("ChromeWorkspaceSectionV1", () => {
  it("lists documents, opens the first, and renders the wireframe with the story fixture", async () => {
    const io = fakeChromeIoV1([
      { path: hudLayoutPathV1, doc: hudLayoutDocumentV1() },
      { path: menuLayoutPathV1, doc: menuLayoutDocumentV1() },
    ]);
    const fixture: StudioChromeFixtureV1 = {
      layoutId: "layout.test.hud",
      label: "HUD 夹具",
      render: (layout) => (
        <output data-test-fixture-x={String(layout.boxes["chip"]?.x ?? -1)}>HUD</output>
      ),
    };
    const { container } = renderStudioV1(io, [fixture]);

    const canvas = await waitForChromeCanvasV1(container);
    expect(
      screen.getByRole("button", { name: "HUD 布局" }),
    ).toHaveAttribute("aria-pressed", "true");
    // Wireframe: every box and anchor gets a handle; the fixture renders
    // beneath them and reads geometry from the live draft.
    expect(canvas.querySelector('[data-studio-chrome-anchor="tab-tip"]')).not.toBeNull();
    expect(canvas.querySelector("[data-test-fixture-x]")).toHaveAttribute(
      "data-test-fixture-x",
      "40",
    );
    // The fixture layer never intercepts pointer input.
    const fixtureLayer = canvas.querySelector("[data-studio-chrome-fixture]") as HTMLElement;
    expect(fixtureLayer.className).toContain("chrome-fixture");
  });

  it("drags a box, re-renders the fixture, and saves the graduated document via CAS", async () => {
    const io = fakeChromeIoV1([{ path: hudLayoutPathV1, doc: hudLayoutDocumentV1() }]);
    const fixture: StudioChromeFixtureV1 = {
      layoutId: "layout.test.hud",
      label: "HUD 夹具",
      render: (layout) => (
        <output data-test-fixture-x={String(layout.boxes["chip"]?.x ?? -1)}>HUD</output>
      ),
    };
    const { container } = renderStudioV1(io, [fixture]);
    const canvas = await waitForChromeCanvasV1(container);

    const box = canvas.querySelector('[data-studio-chrome-box="chip"]') as HTMLElement;
    expect(box.style.left).toBe("40px");
    // Scale is 1 (canvas 640 ≤ 720 cap): +100 screen px = +100 canvas px.
    fireEvent.pointerDown(box, { button: 0, pointerId: 3, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(box, { pointerId: 3, clientX: 300, clientY: 120 });
    fireEvent.pointerUp(box, { pointerId: 3 });
    expect(screen.getByLabelText("X")).toHaveValue(140);
    expect(screen.getByLabelText("Y")).toHaveValue(50);
    expect(canvas.querySelector("[data-test-fixture-x]")).toHaveAttribute(
      "data-test-fixture-x",
      "140",
    );

    // The resize handle sits at the dragged box's bottom-right corner.
    const resize = container.querySelector('[data-studio-chrome-resize="chip"]') as HTMLElement;
    fireEvent.pointerDown(resize, { button: 0, pointerId: 4, clientX: 500, clientY: 300 });
    fireEvent.pointerMove(resize, { pointerId: 4, clientX: 530, clientY: 312 });
    fireEvent.pointerUp(resize, { pointerId: 4 });
    expect(screen.getByLabelText("宽")).toHaveValue(150);
    expect(screen.getByLabelText("高")).toHaveValue(60);

    const save = container.querySelector("[data-studio-chrome-save]") as HTMLElement;
    expect(save).toBeEnabled();
    await userEvent.setup().click(save);
    await waitFor(() => expect(io.writes).toHaveLength(1));
    const written = io.writes[0];
    expect(written?.expectedDigest).toBe("sha256:1");
    expect(written?.chromeLayoutDocument.boxes["chip"]).toEqual({
      x: 140,
      y: 50,
      width: 150,
      height: 60,
    });
    expect(written?.chromeLayoutDocument.authoring?.status).toBe("human_tuned");
    await waitFor(() =>
      expect(container.querySelector("[data-studio-chrome-note]")).toHaveTextContent("已保存")
    );
  });

  it("drags anchors and keeps the dirty draft on a digest conflict", async () => {
    const io = fakeChromeIoV1([{ path: hudLayoutPathV1, doc: hudLayoutDocumentV1() }]);
    const { container } = renderStudioV1(io);
    const canvas = await waitForChromeCanvasV1(container);

    const anchor = canvas.querySelector('[data-studio-chrome-anchor="tab-tip"]') as HTMLElement;
    fireEvent.pointerDown(anchor, { button: 0, pointerId: 6, clientX: 320, clientY: 12 });
    fireEvent.pointerMove(anchor, { pointerId: 6, clientX: 280, clientY: 30 });
    fireEvent.pointerUp(anchor, { pointerId: 6 });
    expect(screen.getByLabelText("X")).toHaveValue(280);
    expect(screen.getByLabelText("Y")).toHaveValue(30);

    io.failNextWriteWith("digest_conflict");
    await userEvent.setup().click(
      container.querySelector("[data-studio-chrome-save]") as HTMLElement,
    );
    await waitFor(() =>
      expect(container.querySelector("[data-studio-chrome-note]")).toHaveTextContent(
        "文件已被其他编辑更改",
      )
    );
    // The draft survives the conflict; a retry save succeeds.
    expect(screen.getByLabelText("X")).toHaveValue(280);
    await userEvent.setup().click(
      container.querySelector("[data-studio-chrome-save]") as HTMLElement,
    );
    await waitFor(() => expect(io.writes).toHaveLength(1));
    expect(io.writes[0]?.chromeLayoutDocument.anchors["tab-tip"]).toEqual({ x: 280, y: 30 });
  });

  it("edits offsets, renames entries on commit, and refuses colliding names", async () => {
    const io = fakeChromeIoV1([{ path: hudLayoutPathV1, doc: hudLayoutDocumentV1() }]);
    const { container } = renderStudioV1(io);
    await waitForChromeCanvasV1(container);
    const user = userEvent.setup();

    await user.click(
      container.querySelector('[data-studio-chrome-row="offsets:menu-gap"]') as HTMLElement,
    );
    const valueInput = screen.getByLabelText("值");
    await user.clear(valueInput);
    await user.type(valueInput, "24");
    expect(screen.getByLabelText("值")).toHaveValue(24);

    // Rename commits on Enter and follows the selection.
    const nameInput = screen.getByLabelText("名称");
    await user.clear(nameInput);
    await user.type(nameInput, "night-gap{Enter}");
    expect(
      container.querySelector('[data-studio-chrome-row="offsets:night-gap"]'),
    ).toHaveAttribute("aria-pressed", "true");

    // A collision with an existing entry (any section) is refused.
    const renamedInput = screen.getByLabelText("名称");
    await user.clear(renamedInput);
    await user.type(renamedInput, "chip{Enter}");
    expect(container.querySelector('[data-studio-chrome-row="offsets:night-gap"]')).not.toBeNull();
    expect(container.querySelector('[data-studio-chrome-row="offsets:chip"]')).toBeNull();
  });

  it("adds and deletes entries and blocks saving while admission fails", async () => {
    const io = fakeChromeIoV1([{ path: menuLayoutPathV1, doc: menuLayoutDocumentV1() }]);
    const { container } = renderStudioV1(io);
    await waitFor(() =>
      expect(container.querySelector("[data-studio-chrome-add-box]")).not.toBeNull()
    );
    const user = userEvent.setup();

    await user.click(container.querySelector("[data-studio-chrome-add-box]") as HTMLElement);
    expect(
      container.querySelector('[data-studio-chrome-row="boxes:box-1"]'),
    ).toHaveAttribute("aria-pressed", "true");
    // The seed box centers on the document's own canvas (640×360 / 8 = 80×45).
    expect(screen.getByLabelText("X")).toHaveValue(280);

    // An over-long entry name fails admission: blocking note + disabled save.
    const nameInput = screen.getByLabelText("名称");
    await user.clear(nameInput);
    fireEvent.change(nameInput, { target: { value: "x".repeat(97) } });
    fireEvent.blur(nameInput);
    await waitFor(() =>
      expect(
        container.querySelector(
          "[data-studio-chrome-diagnostics] [data-studio-diagnostic='blocking']",
        ),
      ).toHaveTextContent("chrome_layout_entry_name_invalid")
    );
    expect(container.querySelector("[data-studio-chrome-save]")).toBeDisabled();

    // Deleting the broken entry clears the block.
    await user.click(container.querySelector("[data-studio-chrome-delete]") as HTMLElement);
    await waitFor(() =>
      expect(
        container.querySelector("[data-studio-chrome-diagnostics]"),
      ).toBeNull()
    );
  });

  it("gates switching documents on a dirty draft", async () => {
    const io = fakeChromeIoV1([
      { path: hudLayoutPathV1, doc: hudLayoutDocumentV1() },
      { path: menuLayoutPathV1, doc: menuLayoutDocumentV1() },
    ]);
    const { container } = renderStudioV1(io);
    await waitForChromeCanvasV1(container);
    const user = userEvent.setup();

    await user.click(
      container.querySelector('[data-studio-chrome-row="boxes:chip"]') as HTMLElement,
    );
    const xInput = screen.getByLabelText("X");
    await user.clear(xInput);
    await user.type(xInput, "10");

    await user.click(screen.getByRole("button", { name: "菜单布局" }));
    expect(container.querySelector("[data-studio-chrome-confirm]")).not.toBeNull();
    await user.click(
      container.querySelector("[data-studio-chrome-confirm-discard]") as HTMLElement,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "菜单布局" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
    );
  });

  it("creates a new document under the inferred id prefix and opens it", async () => {
    const io = fakeChromeIoV1([{ path: hudLayoutPathV1, doc: hudLayoutDocumentV1() }]);
    const { container } = renderStudioV1(io);
    await waitForChromeCanvasV1(container);
    const user = userEvent.setup();

    await user.click(container.querySelector("[data-studio-chrome-new]") as HTMLElement);
    await user.type(
      container.querySelector("[data-studio-chrome-new-stem]") as HTMLElement,
      "menu",
    );
    await user.click(
      container.querySelector("[data-studio-chrome-new-create]") as HTMLElement,
    );

    await waitFor(() => expect(io.creates).toHaveLength(1));
    const created = io.creates[0];
    expect(created?.path).toBe("src/chrome/menu.chrome-layout.json");
    expect(created?.chromeLayoutDocument.layoutId).toBe("layout.test.menu");
    expect(created?.chromeLayoutDocument.canvas).toEqual({ width: 1024, height: 576 });
    expect(created?.chromeLayoutDocument.authoring?.status).toBe("generated");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "menu" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
    );
  });

  it("isolates a crashing fixture and keeps the wireframe editable", async () => {
    const io = fakeChromeIoV1([{ path: hudLayoutPathV1, doc: hudLayoutDocumentV1() }]);
    const crashing: StudioChromeFixtureV1 = {
      layoutId: "layout.test.hud",
      label: "崩溃夹具",
      render: () => {
        throw new Error("fixture exploded");
      },
    };
    // React logs the caught render error; keep the test output clean.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { container } = renderStudioV1(io, [crashing]);
      const canvas = await waitForChromeCanvasV1(container);
      await waitFor(() =>
        expect(container.querySelector("[data-studio-chrome-fixture-error]")).not.toBeNull()
      );
      // The wireframe still edits: drag the box and see the field update.
      const box = canvas.querySelector('[data-studio-chrome-box="chip"]') as HTMLElement;
      fireEvent.pointerDown(box, { button: 0, pointerId: 9, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(box, { pointerId: 9, clientX: 150, clientY: 100 });
      fireEvent.pointerUp(box, { pointerId: 9 });
      expect(screen.getByLabelText("X")).toHaveValue(90);
      expect(container.querySelector("[data-studio-chrome-save]")).toBeEnabled();
    } finally {
      consoleError.mockRestore();
    }
  });
});

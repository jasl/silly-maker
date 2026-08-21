// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import type { RegionsDocumentV1, SceneDocumentV1, StageContentCatalogV1 } from "@sillymaker/base";
import { parseRegionsDocumentV1, parseSceneDocumentV1 } from "@sillymaker/base";
import type { SemanticStageEntryRendererV1 } from "@sillymaker/ui";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type { SceneSourceIoV1 } from "../../core/scene-io.ts";
import type { RegionsSourceIoV1 } from "../../core/regions-io.ts";
import type { StudioAssetRegistryPortV1, StudioBindingV1 } from "../../studio-app.tsx";
import { StudioAppV1 } from "../../studio-app.tsx";

afterEach(cleanup);

/**
 * Regions workspace tests run through the full shell: the scene workspace
 * compiles the backdrop (canvas 1280×720, preview scale 0.5625) and the
 * regions section injects its draft into the chosen entry. The hero stands
 * at (920, 600), scale 1, unmirrored, with a 200×300 bottom-center-anchored
 * geometry — anchor-space math stays in whole numbers.
 */

const scenePathV1 = "src/scenes/opening/opening.scene.json";
const heroRegionsPathV1 = "src/regions/hero.regions.json";
const propsRegionsPathV1 = "src/regions/props.regions.json";

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
      },
    ],
    cues: [
      { cueId: "cue.test.opening.backdrop", kind: "show", tag: "tag.backdrop" },
      { cueId: "cue.test.opening.hero-enters", kind: "show", tag: "tag.hero" },
    ],
  });
}

function heroRegionsDocumentV1(): RegionsDocumentV1 {
  return parseRegionsDocumentV1({
    format: "sillymaker.regions",
    version: 1,
    regionsId: "regions.test.hero",
    label: "主角区域",
    regions: [
      {
        regionId: "zone.head",
        accessibleNameText: "摸头",
        x: -50,
        y: -300,
        width: 100,
        height: 80,
        hoverAssetId: "asset.test.reveal",
      },
    ],
    authoring: { status: "generated" },
  });
}

function propsRegionsDocumentV1(): RegionsDocumentV1 {
  return parseRegionsDocumentV1({
    format: "sillymaker.regions",
    version: 1,
    regionsId: "regions.test.props",
    label: "道具区域",
    regions: [],
  });
}

function fakeSceneIoV1(): SceneSourceIoV1 {
  const document = sceneDocumentV1();
  return {
    list: () =>
      Promise.resolve({
        kind: "ok" as const,
        scenes: [{ path: scenePathV1, sceneId: document.sceneId, label: document.label }],
        skipped: [],
      }),
    read: () =>
      Promise.resolve({ kind: "ok" as const, digest: "sha256:s1", sceneDocument: document }),
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

interface FakeRegionsIoV1 extends RegionsSourceIoV1 {
  readonly writes: {
    path: string;
    expectedDigest: string;
    regionsDocument: RegionsDocumentV1;
  }[];
  readonly creates: { path: string; regionsDocument: RegionsDocumentV1 }[];
  failNextWriteWith(code: "digest_conflict"): void;
}

function fakeRegionsIoV1(
  initial: readonly { readonly path: string; readonly doc: RegionsDocumentV1 }[],
): FakeRegionsIoV1 {
  const documents = new Map(
    initial.map((entry) => [entry.path, { digest: "sha256:1", doc: entry.doc }]),
  );
  let failNext: "digest_conflict" | null = null;
  const writes: FakeRegionsIoV1["writes"] = [];
  const creates: FakeRegionsIoV1["creates"] = [];
  return {
    writes,
    creates,
    failNextWriteWith(code) {
      failNext = code;
    },
    list: () =>
      Promise.resolve({
        kind: "ok" as const,
        regionsDocuments: [...documents.entries()].map(([path, entry]) => ({
          path,
          regionsId: entry.doc.regionsId,
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
          regionsDocument: found.doc,
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
      documents.set(input.path, { digest, doc: input.regionsDocument });
      return Promise.resolve({ kind: "ok" as const, digest });
    },
    create(input) {
      creates.push({ ...input });
      const digest = `sha256:c${String(creates.length)}`;
      documents.set(input.path, { digest, doc: input.regionsDocument });
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
              regionId: "zone.catalog",
              accessibleNameText: "目录区域",
              x: -50,
              y: -100,
              width: 100,
              height: 100,
            }),
          ]),
        }
        : {}),
    }),
};

const assetsPortV1: StudioAssetRegistryPortV1 = {
  preload: () => Promise.resolve(undefined),
  observe: () => ({ revision: 1 }),
  subscribe: () => () => {},
  resolve: (assetId: never) => ({
    delivery: "runtime_image",
    url: `blob:${assetId as string}`,
  }),
};

const bindingV1: StudioBindingV1 = Object.freeze({
  catalog: catalogV1,
  renderers: Object.freeze({ "renderer.test.box": boxRendererV1 }),
  assets: assetsPortV1,
});

function renderStudioV1(regionsIo: RegionsSourceIoV1) {
  return render(
    <StudioAppV1
      binding={bindingV1}
      io={fakeSceneIoV1()}
      motionIo={fakeMotionIoV1()}
      regionsIo={regionsIo}
    />,
  );
}

async function waitForRegionsCanvasV1(container: HTMLElement): Promise<HTMLElement> {
  await waitFor(() =>
    expect(
      container.querySelector(
        '[data-studio-regions-canvas] [data-stage-hit-region="zone.head"]',
      ),
    ).not.toBeNull()
  );
  return container.querySelector("[data-studio-regions-canvas]") as HTMLElement;
}

describe("RegionsWorkspaceSectionV1", () => {
  it("lists documents, opens the first, and previews the draft's regions on the backdrop", async () => {
    const io = fakeRegionsIoV1([
      { path: heroRegionsPathV1, doc: heroRegionsDocumentV1() },
      { path: propsRegionsPathV1, doc: propsRegionsDocumentV1() },
    ]);
    const { container } = renderStudioV1(io);

    const canvas = await waitForRegionsCanvasV1(container);
    expect(
      screen.getByRole("button", { name: "主角区域" }),
    ).toHaveAttribute("aria-pressed", "true");
    // The chosen entry defaults to the geometry-declaring hero, and the
    // draft's regions replace its catalog regions in the preview.
    expect(screen.getByLabelText("预览条目")).toHaveValue("tag.hero");
    expect(canvas.querySelector('[data-stage-hit-region="zone.catalog"]')).toBeNull();
    // Hovering the host's region button previews the hover reveal through
    // the binding port's resolve.
    const regionButton = canvas.querySelector(
      '[data-stage-hit-region="zone.head"]',
    ) as HTMLElement;
    fireEvent.pointerEnter(regionButton);
    await waitFor(() =>
      expect(
        canvas.querySelector('[data-stage-hover-reveal="zone.head"]'),
      ).toHaveAttribute("src", "blob:asset.test.reveal")
    );
  });

  it("selects through the host shape, drags the box, and saves the graduated document via CAS", async () => {
    const io = fakeRegionsIoV1([{ path: heroRegionsPathV1, doc: heroRegionsDocumentV1() }]);
    const { container } = renderStudioV1(io);
    const canvas = await waitForRegionsCanvasV1(container);

    fireEvent.click(canvas.querySelector('[data-stage-hit-region="zone.head"]') as HTMLElement);
    await waitFor(() =>
      expect(container.querySelector('[data-studio-region-row="0"]')).toHaveAttribute(
        "aria-pressed",
        "true",
      )
    );

    // Hero anchor (920, 600); region box corner1 = (870, 300).
    const box = container.querySelector('[data-studio-region-box="0"]') as HTMLElement;
    expect(box.style.left).toBe("870px");
    expect(box.style.top).toBe("300px");
    expect(box.style.width).toBe("100px");

    // +56.25 screen px ÷ preview scale 0.5625 ÷ entry scale 1 = +100 anchor px.
    fireEvent.pointerDown(box, { button: 0, pointerId: 3, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(box, { pointerId: 3, clientX: 456.25, clientY: 300 });
    fireEvent.pointerUp(box, { pointerId: 3 });
    expect(screen.getByLabelText("X")).toHaveValue(50);
    expect(screen.getByLabelText("Y")).toHaveValue(-300);

    const save = container.querySelector("[data-studio-regions-save]") as HTMLElement;
    expect(save).toBeEnabled();
    await userEvent.setup().click(save);
    await waitFor(() => expect(io.writes).toHaveLength(1));
    const written = io.writes[0];
    expect(written?.expectedDigest).toBe("sha256:1");
    expect(written?.regionsDocument.regions[0]?.x).toBe(50);
    expect(written?.regionsDocument.authoring?.status).toBe("human_tuned");
    await waitFor(() =>
      expect(container.querySelector("[data-studio-regions-note]")).toHaveTextContent("已保存")
    );
  });

  it("edits polygon vertices: seed, insert at a midpoint, drag, and delete", async () => {
    const io = fakeRegionsIoV1([{ path: heroRegionsPathV1, doc: heroRegionsDocumentV1() }]);
    const { container } = renderStudioV1(io);
    await waitForRegionsCanvasV1(container);
    const user = userEvent.setup();

    await user.click(container.querySelector('[data-studio-region-row="0"]') as HTMLElement);
    await user.click(screen.getByRole("button", { name: "转为多边形" }));
    expect(container.querySelectorAll("[data-studio-region-vertex]")).toHaveLength(4);
    // Seeded diamond: vertex 0 at the top edge midpoint (0, -300) →
    // canvas (920, 300).
    const vertex = container.querySelector('[data-studio-region-vertex="0"]') as HTMLElement;
    expect(vertex.style.left).toBe("920px");
    expect(vertex.style.top).toBe("300px");

    // Insert a vertex on edge 0 (between vertex 0 and vertex 1).
    await user.click(
      container.querySelector('[data-studio-region-add-vertex="0"]') as HTMLElement,
    );
    expect(container.querySelectorAll("[data-studio-region-vertex]")).toHaveLength(5);

    // Drag vertex 0 right by +100 anchor px; the box clamps it at x = 50.
    fireEvent.pointerDown(vertex, { button: 0, pointerId: 5, clientX: 500, clientY: 200 });
    fireEvent.pointerMove(vertex, { pointerId: 5, clientX: 556.25, clientY: 200 });
    fireEvent.pointerUp(vertex, { pointerId: 5 });
    const movedVertex = container.querySelector(
      '[data-studio-region-vertex="0"]',
    ) as HTMLElement;
    expect(movedVertex.style.left).toBe("970px");
    expect(movedVertex).toHaveAttribute("aria-pressed", "true");

    // The selected vertex deletes back down to four.
    await user.click(screen.getByRole("button", { name: "删除顶点 1" }));
    expect(container.querySelectorAll("[data-studio-region-vertex]")).toHaveLength(4);

    // Undo steps back through the coalesced edits.
    await user.click(container.querySelector("[data-studio-regions-undo]") as HTMLElement);
    expect(container.querySelectorAll("[data-studio-region-vertex]")).toHaveLength(5);
  });

  it("blocks saving while the draft fails admission and reports the issue", async () => {
    const io = fakeRegionsIoV1([{ path: heroRegionsPathV1, doc: heroRegionsDocumentV1() }]);
    const { container } = renderStudioV1(io);
    await waitForRegionsCanvasV1(container);
    const user = userEvent.setup();

    await user.click(container.querySelector('[data-studio-region-row="0"]') as HTMLElement);
    await user.clear(screen.getByLabelText("区域 id"));
    await waitFor(() =>
      expect(
        container.querySelector(
          "[data-studio-regions-diagnostics] [data-studio-diagnostic='blocking']",
        ),
      ).toHaveTextContent("regions_region_id_invalid")
    );
    const save = container.querySelector("[data-studio-regions-save]") as HTMLElement;
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText("区域 id"), "zone.fixed");
    await waitFor(() => expect(save).toBeEnabled());
  });

  it("gates switching documents on a dirty draft", async () => {
    const io = fakeRegionsIoV1([
      { path: heroRegionsPathV1, doc: heroRegionsDocumentV1() },
      { path: propsRegionsPathV1, doc: propsRegionsDocumentV1() },
    ]);
    const { container } = renderStudioV1(io);
    await waitForRegionsCanvasV1(container);
    const user = userEvent.setup();

    await user.click(container.querySelector('[data-studio-region-row="0"]') as HTMLElement);
    const xInput = screen.getByLabelText("X");
    await user.clear(xInput);
    await user.type(xInput, "10");

    await user.click(screen.getByRole("button", { name: "道具区域" }));
    const confirm = container.querySelector("[data-studio-regions-confirm]");
    expect(confirm).not.toBeNull();
    await user.click(
      container.querySelector("[data-studio-regions-confirm-discard]") as HTMLElement,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "道具区域" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
    );
  });

  it("creates a new document under the inferred id prefix and opens it", async () => {
    const io = fakeRegionsIoV1([{ path: heroRegionsPathV1, doc: heroRegionsDocumentV1() }]);
    const { container } = renderStudioV1(io);
    await waitForRegionsCanvasV1(container);
    const user = userEvent.setup();

    await user.click(container.querySelector("[data-studio-regions-new]") as HTMLElement);
    await user.type(
      container.querySelector("[data-studio-regions-new-stem]") as HTMLElement,
      "props",
    );
    await user.click(
      container.querySelector("[data-studio-regions-new-create]") as HTMLElement,
    );

    await waitFor(() => expect(io.creates).toHaveLength(1));
    const created = io.creates[0];
    expect(created?.path).toBe("src/regions/props.regions.json");
    expect(created?.regionsDocument.regionsId).toBe("regions.test.props");
    expect(created?.regionsDocument.authoring?.status).toBe("generated");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "props" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
    );
    // The blank document edits immediately: adding a region selects it and
    // seeds a box centered on the hero's content box.
    await user.click(container.querySelector("[data-studio-region-add]") as HTMLElement);
    expect(container.querySelector('[data-studio-region-row="0"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("X")).toHaveValue(-25);
    expect(screen.getByLabelText("Y")).toHaveValue(-188);
    expect(screen.getByLabelText("宽")).toHaveValue(50);
    expect(screen.getByLabelText("高")).toHaveValue(75);
  });
});

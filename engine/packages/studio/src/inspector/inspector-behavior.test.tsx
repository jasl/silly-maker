// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StageContentCatalogV1 } from "@sillymaker/base";
import {
  admitAuthoringSceneDocumentV1,
  compileAuthoringSceneV1,
  projectAuthoringSceneFacetsV1,
} from "@sillymaker/base/authoring/scene";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type {
  AuthoringSceneIoListEntryV1,
  AuthoringSceneSourceIoV1,
} from "../core/authoring-scene-io.ts";
import type { InspectorBindingV1 } from "../core/binding.ts";
import { createAuthoringHostInternalV1 } from "../core/authoring-host.ts";
import type { RuntimeInspectorSourceV1 } from "../core/runtime-inspection.ts";
import { InspectorAppV1, InspectorHostSurfaceInternalV1 } from "./inspector-app.tsx";
import { InspectorObjectPanelV1 } from "./object-inspector.tsx";
import { InspectorSceneListV1 } from "./scene-list.tsx";
import { InspectorSceneTreeV1 } from "./scene-tree.tsx";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const emptyCatalogV1: StageContentCatalogV1 = { resolveContent: () => null };
const emptyMotionIoV1: MotionSourceIoV1 = {
  list: () => Promise.resolve({ kind: "ok", motions: [], skipped: [] }),
  read: () => Promise.resolve({ kind: "error", code: "not_found" }),
  write: () => Promise.resolve({ kind: "error", code: "unavailable" }),
  create: () => Promise.resolve({ kind: "error", code: "unavailable" }),
};
const bindingV1: InspectorBindingV1 = { catalog: emptyCatalogV1, renderers: {} };

function sceneV1(objectCount: number) {
  return admitAuthoringSceneDocumentV1({
    format: "sillymaker.authoring-scene",
    version: 1,
    sceneId: "scene.test.inspector-behavior",
    label: "Inspector behavior",
    canvas: { width: 1_280, height: 720 },
    layers: [{
      layerId: "layer.test.main",
      label: "Main",
      roots: Array.from({ length: objectCount }, (_, index) => ({
        objectId: `tag.test.object-${String(index).padStart(4, "0")}`,
        label: `Object ${String(index).padStart(4, "0")}`,
        localTransform: {
          x: index,
          y: 0,
          scalePermille: 1_000,
          opacityPermille: 1_000,
          mirrored: false,
        },
        ...(index < 64
          ? {
            visual: {
              contentId: `content.test.object-${String(index).padStart(4, "0")}`,
              ...(index === 0 ? { ambient: { motionId: "motion.test.object-idle" } } : {}),
            },
          }
          : {}),
      })),
    }],
    cues: [],
  });
}

describe("Inspector large-list behavior", () => {
  it("keeps coarse-pointer virtual rows aligned to the touch target floor", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const tree = render(
      <InspectorSceneTreeV1
        document={sceneV1(1).document}
        selectedObjectId={null}
        onSelectObject={vi.fn()}
      />,
    );
    const list = tree.container.querySelector<HTMLElement>("[data-inspector-object-list]");
    expect(list).toHaveAttribute("data-inspector-object-row-height", "44");
    expect(list?.style.height).toBe("88px");
    expect(tree.container.querySelector<HTMLElement>("[data-inspector-layer]")?.style.height)
      .toBe("44px");
    expect(tree.container.querySelector<HTMLElement>("[data-inspector-object]")?.style.height)
      .toBe("44px");
  });

  it("uses only the height required by short Scene and object lists", () => {
    const tree = render(
      <InspectorSceneTreeV1
        document={sceneV1(1).document}
        selectedObjectId={null}
        onSelectObject={vi.fn()}
      />,
    );
    expect(tree.container.querySelector<HTMLElement>("[data-inspector-object-list]")?.style.height)
      .toBe("76px");
    tree.unmount();

    const scenes: AuthoringSceneIoListEntryV1[] = [0, 1].map((index) => ({
      path: `src/scenes/scene-${String(index)}.authoring-scene.json`,
      sceneId: `scene.test.scene-${String(index)}`,
      label: `Scene ${String(index)}`,
    }));
    const sceneList = render(
      <InspectorSceneListV1
        scenes={scenes}
        currentPath={scenes[0]!.path}
        disabled={false}
        onOpen={vi.fn()}
      />,
    );
    expect(
      sceneList.container.querySelector<HTMLElement>("[data-inspector-scene-list]")?.style.height,
    ).toBe("100px");
  });

  it("bounds mounted object rows, reveals selection, and keeps navigation read-only", async () => {
    const scene = sceneV1(1_000);
    const documentReference = scene.document;
    const documentBefore = structuredClone(scene.document);
    const selected = scene.document.layers[0]!.roots[999]!.objectId;
    const onSelectObject = vi.fn();
    const { container } = render(
      <InspectorSceneTreeV1
        document={scene.document}
        selectedObjectId={selected}
        onSelectObject={onSelectObject}
      />,
    );

    const list = container.querySelector<HTMLElement>("[data-inspector-object-list]")!;
    await waitFor(() => {
      expect(list.scrollTop).toBeGreaterThan(0);
      expect(container.querySelector(`[data-inspector-object="${selected}"]`))
        .toHaveAttribute("aria-current", "true");
    });
    expect(Number(list.dataset.inspectorMountedRows)).toBeLessThanOrEqual(20);

    fireEvent.change(screen.getByRole("searchbox", { name: "搜索当前场景对象" }), {
      target: { value: "Object 0001" },
    });
    const match = await screen.findByRole("button", { name: /Object 0001/ });
    fireEvent.click(match);
    expect(onSelectObject).toHaveBeenCalledWith(scene.document.layers[0]!.roots[1]!.objectId);
    expect(scene.document).toBe(documentReference);
    expect(scene.document).toEqual(documentBefore);
  });

  it("bounds mounted Scene rows and reveals the active document", async () => {
    const scenes: AuthoringSceneIoListEntryV1[] = Array.from(
      { length: 1_000 },
      (_, index) => ({
        path: `src/scenes/scene-${String(index).padStart(4, "0")}.authoring-scene.json`,
        sceneId: `scene.test.scene-${String(index).padStart(4, "0")}`,
        label: `Scene ${String(index).padStart(4, "0")}`,
      }),
    );
    const current = scenes[999]!;
    const onOpen = vi.fn();
    const { container } = render(
      <InspectorSceneListV1
        scenes={scenes}
        currentPath={current.path}
        disabled={false}
        onOpen={onOpen}
      />,
    );

    const list = container.querySelector<HTMLElement>("[data-inspector-scene-list]")!;
    await waitFor(() => {
      expect(list.scrollTop).toBeGreaterThan(0);
      expect(container.querySelector(`[data-inspector-scene="${current.sceneId}"]`))
        .toHaveAttribute("aria-current", "true");
    });
    expect(Number(list.dataset.inspectorMountedScenes)).toBeLessThanOrEqual(11);

    fireEvent.change(screen.getByRole("searchbox", { name: "搜索当前应用的 Scene" }), {
      target: { value: "Scene 0001" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Scene 0001/ }));
    expect(onOpen).toHaveBeenCalledWith(scenes[1]!.path);
  });
});

describe("Inspector editing behavior", () => {
  it("does not attach the runtime observer to an inert publication probe", async () => {
    const subscribe = vi.fn<RuntimeInspectorSourceV1["subscribe"]>(() => () => undefined);
    const runtimeSnapshot = {
      revision: 0,
      activeOwnerId: null,
      units: [],
      codeSurfaceNodes: [],
      workingSet: {
        references: 0,
        unloaded: 0,
        acquiring: 0,
        loaded: 0,
        failed: 0,
        released: 0,
      },
    } as const;
    const runtime: RuntimeInspectorSourceV1 = {
      getSnapshot: () => runtimeSnapshot,
      subscribe,
      retry: () => Promise.resolve(false),
    };
    const host = createAuthoringHostInternalV1({
      sceneIo: {
        list: () => Promise.resolve({ kind: "ok", scenes: [], skipped: [] }),
        read: () => Promise.resolve({ kind: "error", code: "not_found" }),
        write: () => Promise.resolve({ kind: "error", code: "unavailable" }),
      },
      motionIo: emptyMotionIoV1,
    });
    const binding: InspectorBindingV1 = { ...bindingV1, runtime };
    const { rerender } = render(
      <InspectorHostSurfaceInternalV1
        host={host}
        binding={binding}
        mode="embedded"
        publicationRole="probe"
        viewId={9_001}
      />,
    );

    expect(screen.queryByRole("region", { name: "Runtime Inspector" })).toBeNull();
    expect(subscribe).not.toHaveBeenCalled();

    rerender(
      <InspectorHostSurfaceInternalV1
        host={host}
        binding={binding}
        mode="embedded"
        publicationRole="visible"
        viewId={9_001}
      />,
    );
    await waitFor(() => expect(subscribe).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("region", { name: "Runtime Inspector" })).toBeVisible();
    await host.dispose();
  });

  it("restores an invalid user contentId without throwing or issuing an operation", () => {
    const scene = sceneV1(1);
    const facets = projectAuthoringSceneFacetsV1(
      compileAuthoringSceneV1(scene),
      emptyCatalogV1,
    );
    const execute = vi.fn();
    render(
      <InspectorObjectPanelV1
        scene={scene}
        facets={facets}
        motionOptions={[]}
        selectedObjectId={scene.document.layers[0]!.roots[0]!.objectId}
        draftRevision={0}
        disabled={false}
        execute={execute}
      />,
    );

    const contentId = screen.getByRole("textbox", { name: "contentId" });
    const original = scene.document.layers[0]!.roots[0]!.visual!.contentId;
    fireEvent.change(contentId, { target: { value: "not a content id" } });
    fireEvent.blur(contentId);
    expect(contentId).toHaveValue(original);
    expect(execute).not.toHaveBeenCalled();
  });

  it("edits one Visual ambient binding through the structured operation port", () => {
    const scene = sceneV1(1);
    const facets = projectAuthoringSceneFacetsV1(
      compileAuthoringSceneV1(scene),
      emptyCatalogV1,
    );
    const execute = vi.fn();
    render(
      <InspectorObjectPanelV1
        scene={scene}
        facets={facets}
        motionOptions={[{
          motionId: "motion.test.object-breathe",
          label: "Breathe",
        }]}
        selectedObjectId={scene.document.layers[0]!.roots[0]!.objectId}
        draftRevision={0}
        disabled={false}
        execute={execute}
      />,
    );

    const motionId = screen.getByRole("combobox", { name: "ambient motionId" });
    expect(screen.getByRole("option", { name: /motion.test.object-idle（未索引）/ })).toBeVisible();
    fireEvent.change(motionId, { target: { value: "motion.test.object-breathe" } });
    expect(execute).toHaveBeenLastCalledWith({
      schemaRevision: 2,
      kind: "scene.object.set_ambient",
      objectId: "tag.test.object-0000",
      ambient: { motionId: "motion.test.object-breathe" },
    });

    const phase = screen.getByRole("spinbutton", { name: "ambient phase (ms)" });
    fireEvent.change(phase, { target: { value: "1050" } });
    fireEvent.blur(phase);
    expect(execute).toHaveBeenLastCalledWith({
      schemaRevision: 2,
      kind: "scene.object.set_ambient",
      objectId: "tag.test.object-0000",
      ambient: { motionId: "motion.test.object-idle", phaseMs: 1050 },
    });
  });

  it("keeps the direct Host current through StrictMode effect replay", async () => {
    const scene = sceneV1(2);
    const path = "src/scenes/strict.authoring-scene.json";
    const io: AuthoringSceneSourceIoV1 = {
      list: () =>
        Promise.resolve({
          kind: "ok",
          scenes: [{ path, sceneId: scene.document.sceneId, label: scene.document.label }],
          skipped: [],
        }),
      read: () => Promise.resolve({ kind: "ok", digest: "sha256:strict", admittedScene: scene }),
      write: () => Promise.resolve({ kind: "error", code: "unavailable" }),
    };
    const { container } = render(
      <StrictMode>
        <InspectorAppV1 binding={bindingV1} io={io} motionIo={emptyMotionIoV1} />
      </StrictMode>,
    );

    await Promise.resolve();
    await waitFor(() =>
      expect(container.querySelector("[data-inspector-ready=true]")).not.toBeNull()
    );
    const second = scene.document.layers[0]!.roots[1]!.objectId;
    fireEvent.click(container.querySelector(`[data-inspector-object="${second}"]`)!);
    await waitFor(() =>
      expect(container.querySelector(`[data-inspector-object-panel="${second}"]`)).not.toBeNull()
    );
  });
});

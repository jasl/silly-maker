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
import {
  createAuthoringHostInternalV1,
  resolveAuthoringHostOwnerInternalV1,
} from "../core/authoring-host.ts";
import type { RuntimeInspectorSourceV1 } from "../core/runtime-inspection.ts";
import {
  admitSceneInspectorContributionSetInternalV1,
  emptySceneInspectorContributionSetInternalV1,
} from "../core/scene-inspector-contributions.ts";
import type { SceneInspectorRenderInputV1 } from "../core/scene-inspector-contributions.ts";
import { sceneAuthoringOperationSchemaRevisionV1 } from "../core/scene-operations/contract.ts";
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
  it("renders a game-selected property tool and routes its operation through the current Scene", async () => {
    const scene = sceneV1(1);
    const path = "src/scenes/contributed.authoring-scene.json";
    const io: AuthoringSceneSourceIoV1 = {
      list: () =>
        Promise.resolve({
          kind: "ok",
          scenes: [{ path, sceneId: scene.document.sceneId, label: scene.document.label }],
          skipped: [],
        }),
      read: () =>
        Promise.resolve({ kind: "ok", digest: "sha256:contributed", admittedScene: scene }),
      write: () => Promise.resolve({ kind: "error", code: "unavailable" }),
    };
    let retainedExecute: SceneInspectorRenderInputV1["execute"] | null = null;
    const binding: InspectorBindingV1 = {
      ...bindingV1,
      sceneInspector: {
        properties: [{
          id: "tool.test.nudge",
          title: "游戏专属构图工具",
          render(input) {
            retainedExecute ??= input.execute;
            const object = input.scene.document.layers[0]!.roots[0]!;
            return (
              <div>
                <output aria-label="专属工具 X 坐标">{object.localTransform.x}</output>
                <button
                  type="button"
                  disabled={input.busy}
                  onClick={() =>
                    input.execute({
                      schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
                      kind: "scene.object.set_local_transform",
                      objectId: object.objectId,
                      localTransform: { ...object.localTransform, x: object.localTransform.x + 8 },
                    })}
                >
                  右移 8
                </button>
              </div>
            );
          },
        }],
      },
    };

    const { container } = render(
      <InspectorAppV1 binding={binding} io={io} motionIo={emptyMotionIoV1} />,
    );
    await waitFor(() =>
      expect(container.querySelector("[data-inspector-ready=true]")).not.toBeNull()
    );
    expect(screen.getByRole("region", { name: "游戏专属构图工具" })).toBeVisible();
    expect(screen.getByRole("status", { name: "专属工具 X 坐标" })).toHaveTextContent("0");

    fireEvent.click(screen.getByRole("button", { name: "右移 8" }));
    await waitFor(() =>
      expect(screen.getByRole("status", { name: "专属工具 X 坐标" })).toHaveTextContent("8")
    );

    expect(retainedExecute).not.toBeNull();
    expect(retainedExecute!({
      schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
      kind: "scene.object.set_local_transform",
      objectId: scene.document.layers[0]!.roots[0]!.objectId,
      localTransform: {
        ...scene.document.layers[0]!.roots[0]!.localTransform,
        x: 99,
      },
    })).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.revision_stale" },
    });
    expect(screen.getByRole("status", { name: "专属工具 X 坐标" })).toHaveTextContent("8");
  });

  it("keeps contribution callbacks inert in a probe view", async () => {
    const scene = sceneV1(1);
    const path = "src/scenes/probe.authoring-scene.json";
    const sceneIo: AuthoringSceneSourceIoV1 = {
      list: () => Promise.resolve({ kind: "ok", scenes: [], skipped: [] }),
      read: () => Promise.resolve({ kind: "ok", digest: "sha256:probe", admittedScene: scene }),
      write: () => Promise.resolve({ kind: "error", code: "unavailable" }),
    };
    const host = createAuthoringHostInternalV1({ sceneIo, motionIo: emptyMotionIoV1 });
    const owner = resolveAuthoringHostOwnerInternalV1(host);
    expect(await owner.sceneSession.open(path)).toMatchObject({ kind: "ok" });
    const openedRevision = owner.sceneSession.getSnapshot().draftRevision;
    let probeInput: SceneInspectorRenderInputV1 | null = null;
    const binding: InspectorBindingV1 = {
      ...bindingV1,
      sceneInspector: {
        properties: [{
          id: "tool.test.probe",
          title: "Probe tool",
          render(input) {
            probeInput = input;
            return null;
          },
        }],
      },
    };

    render(
      <InspectorHostSurfaceInternalV1
        host={host}
        binding={binding}
        sceneInspectorContributions={admitSceneInspectorContributionSetInternalV1(
          binding.sceneInspector,
        )}
        mode="embedded"
        publicationRole="probe"
        viewId={9_000}
      />,
    );
    await waitFor(() => expect(probeInput).not.toBeNull());
    const object = scene.document.layers[0]!.roots[0]!;
    expect(probeInput!.execute({
      schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
      kind: "scene.object.set_local_transform",
      objectId: object.objectId,
      localTransform: { ...object.localTransform, x: 8 },
    })).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.view_inactive" },
    });
    expect(probeInput!.selectObject(object.objectId)).toBe(false);
    expect(owner.sceneSession.getSnapshot().draftRevision).toBe(openedRevision);
    await host.dispose();
  });

  it("retires retained callbacks when a game tool binding successor commits", async () => {
    const scene = sceneV1(1);
    const path = "src/scenes/successor.authoring-scene.json";
    const sceneIo: AuthoringSceneSourceIoV1 = {
      list: () => Promise.resolve({ kind: "ok", scenes: [], skipped: [] }),
      read: () => Promise.resolve({ kind: "ok", digest: "sha256:successor", admittedScene: scene }),
      write: () => Promise.resolve({ kind: "error", code: "unavailable" }),
    };
    const host = createAuthoringHostInternalV1({ sceneIo, motionIo: emptyMotionIoV1 });
    const owner = resolveAuthoringHostOwnerInternalV1(host);
    expect(await owner.sceneSession.open(path)).toMatchObject({ kind: "ok" });
    let predecessorInput: SceneInspectorRenderInputV1 | null = null;
    let successorInput: SceneInspectorRenderInputV1 | null = null;
    const bindingFor = (
      id: string,
      capture: (input: SceneInspectorRenderInputV1) => void,
    ): InspectorBindingV1 => ({
      ...bindingV1,
      sceneInspector: {
        properties: [{
          id,
          title: id,
          render(input) {
            capture(input);
            return null;
          },
        }],
      },
    });
    const predecessor = bindingFor("tool.test.predecessor", (input) => {
      predecessorInput = input;
    });
    const successor = bindingFor("tool.test.successor", (input) => {
      successorInput = input;
    });
    const rendered = render(
      <InspectorHostSurfaceInternalV1
        host={host}
        binding={predecessor}
        sceneInspectorContributions={admitSceneInspectorContributionSetInternalV1(
          predecessor.sceneInspector,
        )}
        mode="embedded"
        publicationRole="visible"
        viewId={9_002}
      />,
    );
    await waitFor(() => expect(predecessorInput).not.toBeNull());
    const before = owner.sceneSession.getSnapshot();

    rendered.rerender(
      <InspectorHostSurfaceInternalV1
        host={host}
        binding={successor}
        sceneInspectorContributions={admitSceneInspectorContributionSetInternalV1(
          successor.sceneInspector,
        )}
        mode="embedded"
        publicationRole="visible"
        viewId={9_002}
      />,
    );
    await waitFor(() => expect(successorInput).not.toBeNull());
    expect(owner.sceneSession.getSnapshot()).toMatchObject({
      documentIdentity: before.documentIdentity,
      draftRevision: before.draftRevision,
    });

    const object = scene.document.layers[0]!.roots[0]!;
    expect(predecessorInput!.execute({
      schemaRevision: sceneAuthoringOperationSchemaRevisionV1,
      kind: "scene.object.set_local_transform",
      objectId: object.objectId,
      localTransform: { ...object.localTransform, x: 8 },
    })).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "scene_authoring.view_inactive" },
    });
    expect(predecessorInput!.selectObject(object.objectId)).toBe(false);
    expect(owner.sceneSession.getSnapshot().draftRevision).toBe(before.draftRevision);
    expect(successorInput!.publicationRole).toBe("visible");
    await host.dispose();
  });

  it("rejects a retained selection callback after a document successor", async () => {
    const firstScene = sceneV1(2);
    const secondScene = sceneV1(2);
    const firstPath = "src/scenes/selection-first.authoring-scene.json";
    const secondPath = "src/scenes/selection-second.authoring-scene.json";
    const sceneIo: AuthoringSceneSourceIoV1 = {
      list: () => Promise.resolve({ kind: "ok", scenes: [], skipped: [] }),
      read: (path) =>
        Promise.resolve({
          kind: "ok",
          digest: path === firstPath ? "sha256:selection-first" : "sha256:selection-second",
          admittedScene: path === firstPath ? firstScene : secondScene,
        }),
      write: () => Promise.resolve({ kind: "error", code: "unavailable" }),
    };
    const host = createAuthoringHostInternalV1({ sceneIo, motionIo: emptyMotionIoV1 });
    const owner = resolveAuthoringHostOwnerInternalV1(host);
    expect(await owner.sceneSession.open(firstPath)).toMatchObject({ kind: "ok" });
    let retainedInput: SceneInspectorRenderInputV1 | null = null;
    let currentInput: SceneInspectorRenderInputV1 | null = null;
    const binding: InspectorBindingV1 = {
      ...bindingV1,
      sceneInspector: {
        properties: [{
          id: "tool.test.selection-currentness",
          title: "Selection currentness",
          render(input) {
            retainedInput ??= input;
            currentInput = input;
            return null;
          },
        }],
      },
    };
    render(
      <InspectorHostSurfaceInternalV1
        host={host}
        binding={binding}
        sceneInspectorContributions={admitSceneInspectorContributionSetInternalV1(
          binding.sceneInspector,
        )}
        mode="embedded"
        publicationRole="visible"
        viewId={9_003}
      />,
    );
    await waitFor(() => expect(retainedInput).not.toBeNull());
    const firstDocumentIdentity = retainedInput!.documentIdentity;

    expect(await owner.sceneSession.open(secondPath)).toMatchObject({ kind: "ok" });
    await waitFor(() => {
      expect(currentInput?.documentIdentity).not.toBe(firstDocumentIdentity);
    });
    const secondObjectId = secondScene.document.layers[0]!.roots[1]!.objectId;
    expect(currentInput!.selectObject(secondObjectId)).toBe(true);
    expect(host.getSnapshot().selectedObjectId).toBe(secondObjectId);

    const firstObjectId = firstScene.document.layers[0]!.roots[0]!.objectId;
    expect(retainedInput!.selectObject(firstObjectId)).toBe(false);
    expect(host.getSnapshot().selectedObjectId).toBe(secondObjectId);
    await host.dispose();
  });

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
        sceneInspectorContributions={emptySceneInspectorContributionSetInternalV1}
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
        sceneInspectorContributions={emptySceneInspectorContributionSetInternalV1}
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

    execute.mockClear();
    fireEvent.change(phase, { target: { value: "" } });
    fireEvent.blur(phase);
    expect(phase).toHaveValue(0);
    expect(execute).not.toHaveBeenCalled();
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

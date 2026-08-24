// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { admitAuthoringSceneDocumentV1 } from "@sillymaker/base/authoring/scene";
import type { AdmittedAuthoringSceneV1 } from "@sillymaker/base/authoring/scene";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type { AuthoringSceneSourceIoV1 } from "./authoring-scene-io.ts";
import {
  createAuthoringHostInternalV1,
  resolveAuthoringHostOwnerInternalV1,
} from "./authoring-host.ts";
import type { SceneAuthoringOperationV1 } from "./scene-operations/contract.ts";

const scenePathV1 = "src/scenes/opening.authoring-scene.json";

const unavailableMotionIoV1: MotionSourceIoV1 = {
  list: () => Promise.resolve({ kind: "error", code: "unavailable" }),
  read: () => Promise.resolve({ kind: "error", code: "unavailable" }),
  write: () => Promise.resolve({ kind: "error", code: "unavailable" }),
  create: () => Promise.resolve({ kind: "error", code: "unavailable" }),
};

function placementV1(x: number) {
  return {
    x,
    y: 200,
    scalePermille: 1_000,
    opacityPermille: 1_000,
    mirrored: false,
  };
}

function sceneV1(label = "Opening", alphaX = 100): AdmittedAuthoringSceneV1 {
  return admitAuthoringSceneDocumentV1({
    format: "sillymaker.authoring-scene",
    version: 1,
    sceneId: "scene.test.opening",
    label,
    canvas: { width: 1_280, height: 720 },
    layers: [{
      layerId: "layer.test.actors",
      label: "Actors",
      roots: [{
        objectId: "tag.test.alpha",
        label: "Alpha",
        localTransform: placementV1(alphaX),
        visual: { contentId: "content.test.alpha" },
      }],
    }],
    cues: [],
  });
}

function sceneIoHarnessV1() {
  let stored = sceneV1();
  let digest = "sha256:1";
  let writeCount = 0;
  const io: AuthoringSceneSourceIoV1 = {
    list: () =>
      Promise.resolve({
        kind: "ok",
        scenes: [{
          path: scenePathV1,
          sceneId: stored.document.sceneId,
          label: stored.document.label,
        }],
        skipped: [],
      }),
    read: (path) =>
      Promise.resolve(
        path === scenePathV1
          ? { kind: "ok", digest, admittedScene: stored }
          : { kind: "error", code: "not_found" },
      ),
    write: (input) => {
      writeCount += 1;
      if (input.path !== scenePathV1) {
        return Promise.resolve({ kind: "error", code: "not_found" });
      }
      if (input.expectedDigest !== digest) {
        return Promise.resolve({ kind: "error", code: "digest_conflict" });
      }
      stored = input.admittedScene;
      digest = `sha256:${String(writeCount + 1)}`;
      return Promise.resolve({ kind: "ok", digest });
    },
  };
  return {
    io,
    externalReplace(next: AdmittedAuthoringSceneV1, nextDigest: string): void {
      stored = next;
      digest = nextDigest;
    },
    stored: () => stored,
    writeCount: () => writeCount,
  };
}

function executeCurrentV1(
  host: ReturnType<typeof createAuthoringHostInternalV1>,
  operation: SceneAuthoringOperationV1,
) {
  const operations = resolveAuthoringHostOwnerInternalV1(host).sceneOperations;
  const current = operations.current();
  if (current === null) throw new TypeError("missing current scene");
  return operations.execute({
    documentIdentity: current.documentIdentity,
    expectedDraftRevision: current.draftRevision,
    operation,
  });
}

function moveAlphaV1(x: number): SceneAuthoringOperationV1 {
  return {
    schemaRevision: 2,
    kind: "scene.object.set_local_transform",
    objectId: "tag.test.alpha" as never,
    localTransform: placementV1(x),
  };
}

function alphaXv1(host: ReturnType<typeof createAuthoringHostInternalV1>): number {
  return resolveAuthoringHostOwnerInternalV1(host).sceneSession.getSnapshot()
    .draft?.document.layers[0]?.roots[0]?.localTransform.x ?? -1;
}

describe("Authoring Host", () => {
  it("owns one Authoring Scene session, operation port, connection set, and selection", async () => {
    const sceneIo = sceneIoHarnessV1();
    const host = createAuthoringHostInternalV1({
      sceneIo: sceneIo.io,
      motionIo: unavailableMotionIoV1,
    });
    const owner = resolveAuthoringHostOwnerInternalV1(host);
    const listener = vi.fn();
    host.subscribe(listener);

    expect(owner.sceneIo).toBe(sceneIo.io);
    expect(owner.motionIo).toBe(unavailableMotionIoV1);
    expect(host.getSnapshot()).toMatchObject({
      connected: false,
      dirty: false,
      selectedObjectId: null,
      scene: { documentIdentity: null, path: null },
    });

    await expect(owner.sceneSession.open(scenePathV1)).resolves.toEqual({ kind: "ok" });
    expect(owner.selectObject("tag.test.missing" as never)).toBe(false);
    const beforeSelection = host.getSnapshot();
    expect(owner.selectObject("tag.test.alpha" as never)).toBe(true);
    expect(host.getSnapshot().selectedObjectId).toBe("tag.test.alpha");
    expect(host.getSnapshot().revision).toBe(beforeSelection.revision + 1);

    owner.markViewConnected(1, true);
    owner.markViewConnected(2, true);
    owner.markViewConnected(1, false);
    expect(host.getSnapshot().connected).toBe(true);
    owner.markViewConnected(2, false);
    expect(host.getSnapshot().connected).toBe(false);

    expect(executeCurrentV1(host, moveAlphaV1(240))).toMatchObject({ kind: "applied" });
    expect(host.getSnapshot().selectedObjectId).toBe("tag.test.alpha");

    owner.sceneSession.installSaved({
      path: scenePathV1,
      document: sceneV1("Successor", 320),
      digest: "sha256:successor",
    });
    expect(host.getSnapshot().selectedObjectId).toBeNull();

    const captured = host.getSnapshot();
    await host.dispose();
    await host.dispose();
    owner.markViewConnected(3, true);
    expect(owner.selectObject("tag.test.alpha" as never)).toBe(false);
    owner.sceneSession.replaceDraft(sceneV1("After dispose", 400));
    expect(host.getSnapshot()).toBe(captured);
    expect(listener).toHaveBeenCalled();
  });

  it("preserves session history and saves or discards only the current scene", async () => {
    const sceneIo = sceneIoHarnessV1();
    const host = createAuthoringHostInternalV1({
      sceneIo: sceneIo.io,
      motionIo: unavailableMotionIoV1,
    });
    const owner = resolveAuthoringHostOwnerInternalV1(host);
    await owner.sceneSession.open(scenePathV1);

    expect(executeCurrentV1(host, moveAlphaV1(240))).toMatchObject({ kind: "applied" });
    expect(host.getSnapshot()).toMatchObject({ dirty: true, scene: { canUndo: true } });
    expect(owner.getCloseState()).toEqual({ dirty: true, busy: false, canSave: true });

    owner.sceneSession.undo();
    expect(alphaXv1(host)).toBe(100);
    expect(host.getSnapshot()).toMatchObject({ dirty: false, scene: { canRedo: true } });
    owner.sceneSession.redo();
    expect(alphaXv1(host)).toBe(240);

    await expect(owner.saveAndClose()).resolves.toBe(true);
    expect(sceneIo.writeCount()).toBe(1);
    expect(sceneIo.stored().document.layers[0]?.roots[0]?.localTransform.x).toBe(240);
    expect(host.getSnapshot().dirty).toBe(false);

    expect(executeCurrentV1(host, moveAlphaV1(360))).toMatchObject({ kind: "applied" });
    owner.discardAndClose();
    expect(alphaXv1(host)).toBe(240);
    expect(host.getSnapshot().dirty).toBe(false);
    await expect(owner.saveAndClose()).resolves.toBe(true);
    expect(sceneIo.writeCount()).toBe(1);
    await host.dispose();
  });

  it("refreshes the CAS base after a conflict and does not report a dirty close", async () => {
    const sceneIo = sceneIoHarnessV1();
    const host = createAuthoringHostInternalV1({
      sceneIo: sceneIo.io,
      motionIo: unavailableMotionIoV1,
    });
    const owner = resolveAuthoringHostOwnerInternalV1(host);
    await owner.sceneSession.open(scenePathV1);
    expect(executeCurrentV1(host, moveAlphaV1(240))).toMatchObject({ kind: "applied" });

    sceneIo.externalReplace(sceneV1("External", 700), "sha256:external");
    await expect(owner.saveAndClose()).resolves.toBe(false);
    expect(owner.sceneSession.getSnapshot()).toMatchObject({
      digest: "sha256:external",
      dirty: true,
    });
    expect(alphaXv1(host)).toBe(240);

    await expect(owner.saveAndClose()).resolves.toBe(true);
    expect(sceneIo.stored().document.layers[0]?.roots[0]?.localTransform.x).toBe(240);
    expect(host.getSnapshot().dirty).toBe(false);
    await host.dispose();
  });
});

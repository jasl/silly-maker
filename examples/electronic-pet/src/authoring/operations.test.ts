// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createAuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";

import type {
  PetSceneDocumentV1,
  PetSceneExecutionEnvelopeV1,
  PetSceneOperationV1,
} from "./contract.ts";
import { electronicPetM1SceneDocumentV1 } from "./default-document.ts";
import { createPetSceneOperationExecutorV1 } from "./operations.ts";

function fixtureV1() {
  const session = createAuthoringDocumentSessionV1<PetSceneDocumentV1>();
  session.installSaved({
    path: "src/authoring/home.pet-scene.json",
    document: electronicPetM1SceneDocumentV1,
    digest: "sha256:m1",
  });
  return { session, executor: createPetSceneOperationExecutorV1(session) };
}

function currentEnvelopeV1(
  fixture: ReturnType<typeof fixtureV1>,
  operation: PetSceneOperationV1,
  coalesceKey?: string,
): PetSceneExecutionEnvelopeV1 {
  const snapshot = fixture.session.getSnapshot();
  if (snapshot.documentIdentity === null) throw new TypeError("document unavailable");
  return {
    documentIdentity: snapshot.documentIdentity,
    expectedDraftRevision: snapshot.draftRevision,
    operation,
    ...(coalesceKey === undefined ? {} : { coalesceKey }),
  };
}

function objectV1(document: PetSceneDocumentV1, objectId: string) {
  const pending = [...document.objects].toReversed();
  while (pending.length > 0) {
    const object = pending.pop()!;
    if (object.objectId === objectId) return object;
    if (object.kind === "group") pending.push(...object.children.toReversed());
  }
  throw new TypeError(`missing ${objectId}`);
}

describe("PetSceneOperationV1", () => {
  it("applies position, rotation, and scale through one current session step with undo", () => {
    const fixture = fixtureV1();
    const transform = {
      position: { x: 1.25, y: 0.5, z: -0.75 },
      rotation: { x: 0.1, y: 0.7, z: -0.2 },
      scale: { x: 1.2, y: 0.9, z: 1.1 },
    };
    expect(fixture.executor.execute(currentEnvelopeV1(fixture, {
      schemaRevision: 1,
      kind: "pet_scene.object.set_transform",
      objectId: "pet.home",
      transform,
    }))).toMatchObject({ kind: "applied" });

    let snapshot = fixture.session.getSnapshot();
    expect(objectV1(snapshot.draft!, "pet.home").transform).toEqual(transform);
    expect(snapshot).toMatchObject({ dirty: true, canUndo: true });

    fixture.session.undo();
    snapshot = fixture.session.getSnapshot();
    expect(objectV1(snapshot.draft!, "pet.home").transform.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(snapshot).toMatchObject({ dirty: false, canRedo: true });
  });

  it("edits each typed payload without adding another state authority", () => {
    const fixture = fixtureV1();
    const cat = objectV1(electronicPetM1SceneDocumentV1, "pet.cat");
    if (cat.kind !== "model") throw new TypeError("missing cat model");
    const edits: readonly PetSceneOperationV1[] = [
      {
        schemaRevision: 1,
        kind: "pet_scene.model.set_binding",
        objectId: "pet.cat",
        model: {
          ...cat.model,
          appearance: { ...cat.model.appearance, primaryColor: "#c89168" },
          clips: [{ clipId: "cat.rest", sourceName: "Rest" }],
          animation: {
            idleClipId: "cat.rest",
            speed: 0.85,
            blendDurationMs: 240,
          },
        },
      },
      {
        schemaRevision: 1,
        kind: "pet_scene.camera.set",
        objectId: "pet.camera.main",
        camera: { projection: "perspective", fovDegrees: 38, near: 0.1, far: 80 },
      },
      {
        schemaRevision: 1,
        kind: "pet_scene.light.set",
        objectId: "pet.light.key",
        light: { lightKind: "directional", color: "#ffe4c4", intensity: 1.8 },
      },
      {
        schemaRevision: 1,
        kind: "pet_scene.interaction_volume.set",
        objectId: "pet.interaction.neck",
        interaction: {
          interactionId: "interaction.pet.neck",
          shape: { kind: "sphere", radius: 0.5 },
          preferredStrokeDirection: { x: 0, y: 0, z: -1 },
          attachment: { modelObjectId: "pet.cat", socketId: "cat.neck" },
        },
      },
    ];

    for (const edit of edits) {
      expect(fixture.executor.execute(currentEnvelopeV1(fixture, edit))).toMatchObject({
        kind: "applied",
      });
    }
    const draft = fixture.session.getSnapshot().draft!;
    expect(objectV1(draft, "pet.cat")).toMatchObject({
      kind: "model",
      model: {
        appearance: {
          primaryMaterialSourceName: "CatFurPrimary",
          primaryColor: "#c89168",
        },
        clips: [{ clipId: "cat.rest", sourceName: "Rest" }],
        animation: {
          idleClipId: "cat.rest",
          speed: 0.85,
          blendDurationMs: 240,
        },
      },
    });
    expect(objectV1(draft, "pet.camera.main")).toMatchObject({ camera: { fovDegrees: 38 } });
    expect(objectV1(draft, "pet.light.key")).toMatchObject({ light: { intensity: 1.8 } });
    expect(objectV1(draft, "pet.interaction.neck")).toMatchObject({
      interaction: { shape: { radius: 0.5 } },
    });
  });

  it("uses the once-admitted normalized replacement inside the reducer", () => {
    const fixture = fixtureV1();
    const cat = objectV1(electronicPetM1SceneDocumentV1, "pet.cat");
    if (cat.kind !== "model") throw new TypeError("missing cat model");
    expect(fixture.executor.execute(currentEnvelopeV1(fixture, {
      schemaRevision: 1,
      kind: "pet_scene.model.set_binding",
      objectId: "pet.cat",
      model: {
        ...cat.model,
        appearance: {
          ...cat.model.appearance,
          primaryMaterialSourceName: ` ${cat.model.appearance.primaryMaterialSourceName} `,
          primaryColor: "#c89068",
        },
      },
    }))).toMatchObject({ kind: "applied" });

    expect(objectV1(fixture.session.getSnapshot().draft!, "pet.cat")).toMatchObject({
      model: { appearance: { primaryMaterialSourceName: "CatFurPrimary" } },
    });
  });

  it("rejects stale and no-change envelopes without publishing history", () => {
    const fixture = fixtureV1();
    const first = currentEnvelopeV1(fixture, {
      schemaRevision: 1,
      kind: "pet_scene.object.set_transform",
      objectId: "pet.toy",
      transform: {
        position: { x: -0.5, y: 0.2, z: 1 },
        rotation: { x: 0, y: 0.2, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      },
    });
    expect(fixture.executor.execute(first)).toMatchObject({ kind: "applied" });

    const beforeStale = fixture.session.getSnapshot();
    expect(fixture.executor.execute(first)).toEqual({
      kind: "rejected",
      diagnostic: { code: "pet_scene.revision_stale", path: "/envelope/expectedDraftRevision" },
    });
    expect(fixture.session.getSnapshot()).toBe(beforeStale);

    const noChangeObject = objectV1(beforeStale.draft!, "pet.toy");
    const noChange = currentEnvelopeV1(fixture, {
      schemaRevision: 1,
      kind: "pet_scene.object.set_transform",
      objectId: "pet.toy",
      transform: noChangeObject.transform,
    });
    expect(fixture.executor.execute(noChange)).toEqual({
      kind: "rejected",
      diagnostic: { code: "pet_scene.no_change", path: "/operation" },
    });
    expect(fixture.session.getSnapshot()).toBe(beforeStale);

    fixture.session.installSaved({
      path: "src/authoring/home.pet-scene.json",
      document: electronicPetM1SceneDocumentV1,
      digest: "sha256:successor",
    });
    const successor = fixture.session.getSnapshot();
    expect(fixture.executor.execute({
      ...first,
      expectedDraftRevision: successor.draftRevision,
    })).toEqual({
      kind: "rejected",
      diagnostic: { code: "pet_scene.document_stale", path: "/envelope/documentIdentity" },
    });
    expect(fixture.session.getSnapshot()).toBe(successor);
  });

  it("rejects a cross-reference-breaking edit atomically", () => {
    const fixture = fixtureV1();
    const cat = objectV1(electronicPetM1SceneDocumentV1, "pet.cat");
    if (cat.kind !== "model") throw new TypeError("missing cat model");
    const before = fixture.session.getSnapshot();
    expect(fixture.executor.execute(currentEnvelopeV1(fixture, {
      schemaRevision: 1,
      kind: "pet_scene.model.set_binding",
      objectId: "pet.cat",
      model: { ...cat.model, sockets: [] },
    }))).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "pet_scene.interaction_socket_missing" },
    });
    expect(fixture.session.getSnapshot()).toBe(before);
  });

  it("rejects invalid replacement values before they enter the authoring draft", () => {
    const fixture = fixtureV1();
    const cat = objectV1(electronicPetM1SceneDocumentV1, "pet.cat");
    if (cat.kind !== "model" || cat.model.animation === undefined) {
      throw new TypeError("missing animated cat model");
    }
    const invalidOperations: readonly {
      readonly operation: PetSceneOperationV1;
      readonly path: string;
    }[] = [
      {
        path: "/operation/transform/scale/x",
        operation: {
          schemaRevision: 1,
          kind: "pet_scene.object.set_transform",
          objectId: "pet.cat",
          transform: { ...cat.transform, scale: { ...cat.transform.scale, x: 0 } },
        },
      },
      {
        path: "/operation/camera/fovDegrees",
        operation: {
          schemaRevision: 1,
          kind: "pet_scene.camera.set",
          objectId: "pet.camera.main",
          camera: { projection: "perspective", fovDegrees: 999, near: 0.1, far: 100 },
        },
      },
      {
        path: "/operation/light/intensity",
        operation: {
          schemaRevision: 1,
          kind: "pet_scene.light.set",
          objectId: "pet.light.key",
          light: { lightKind: "directional", color: "#ffffff", intensity: -1 },
        },
      },
      {
        path: "/operation/interaction/shape/radius",
        operation: {
          schemaRevision: 1,
          kind: "pet_scene.interaction_volume.set",
          objectId: "pet.interaction.neck",
          interaction: {
            interactionId: "interaction.pet.neck",
            shape: { kind: "sphere", radius: -1 },
            preferredStrokeDirection: { x: 0, y: 0, z: -1 },
            attachment: { modelObjectId: "pet.cat", socketId: "cat.neck" },
          },
        },
      },
      {
        path: "/operation/interaction/preferredStrokeDirection",
        operation: {
          schemaRevision: 1,
          kind: "pet_scene.interaction_volume.set",
          objectId: "pet.interaction.neck",
          interaction: {
            interactionId: "interaction.pet.neck",
            shape: { kind: "sphere", radius: 0.34 },
            preferredStrokeDirection: { x: 0, y: 0, z: 0 },
            attachment: { modelObjectId: "pet.cat", socketId: "cat.neck" },
          },
        },
      },
      {
        path: "/operation/model/animation/speed",
        operation: {
          schemaRevision: 1,
          kind: "pet_scene.model.set_binding",
          objectId: "pet.cat",
          model: {
            ...cat.model,
            animation: { ...cat.model.animation, speed: 0, blendDurationMs: -1 },
          },
        },
      },
    ];
    const before = fixture.session.getSnapshot();
    for (const { operation, path } of invalidOperations) {
      expect(fixture.executor.execute(currentEnvelopeV1(fixture, operation))).toEqual({
        kind: "rejected",
        diagnostic: { code: "pet_scene.operation_invalid", path },
      });
      expect(fixture.session.getSnapshot()).toBe(before);
    }
  });

  it("coalesces a continuous transform gesture into one undo step", () => {
    const fixture = fixtureV1();
    const initial = objectV1(electronicPetM1SceneDocumentV1, "pet.cat").transform;
    for (const x of [0.1, 0.2, 0.3]) {
      expect(fixture.executor.execute(currentEnvelopeV1(fixture, {
        schemaRevision: 1,
        kind: "pet_scene.object.set_transform",
        objectId: "pet.cat",
        transform: { ...initial, position: { ...initial.position, x } },
      }, "drag:pet.cat"))).toMatchObject({ kind: "applied" });
    }
    fixture.session.undo();
    expect(objectV1(fixture.session.getSnapshot().draft!, "pet.cat").transform).toEqual(initial);
  });
});

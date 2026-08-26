// SPDX-License-Identifier: MIT
import type {
  PetSceneAuthoringSessionV1,
  PetSceneDiagnosticCodeV1,
  PetSceneDiagnosticV1,
  PetSceneDocumentV1,
  PetSceneExecutionEnvelopeV1,
  PetSceneExecutionResultV1,
  PetSceneObjectV1,
  PetSceneOperationExecutorV1,
  PetSceneOperationV1,
  PetSceneReductionResultV1,
} from "./contract.ts";
import { admitPetSceneOperationReplacementV1, compilePetSceneDocumentV1 } from "./document.ts";

class PetSceneOperationFailureV1 extends Error {
  readonly diagnostic: PetSceneDiagnosticV1;

  constructor(code: PetSceneDiagnosticCodeV1, path: string) {
    super(code);
    this.diagnostic = { code, path };
  }
}

function failV1(code: PetSceneDiagnosticCodeV1, path: string): never {
  throw new PetSceneOperationFailureV1(code, path);
}

function jsonEqualsV1(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function unreachableV1(value: never): never {
  throw new TypeError(`unreachable pet-scene variant: ${String(value)}`);
}

function applyToTargetV1(
  objects: readonly PetSceneObjectV1[],
  objectId: string,
  update: (object: PetSceneObjectV1) => PetSceneObjectV1,
): { readonly found: boolean; readonly objects: readonly PetSceneObjectV1[] } {
  let found = false;
  let changed = false;
  const next = objects.map((object) => {
    if (object.objectId === objectId) {
      found = true;
      const updated = update(object);
      if (updated !== object) changed = true;
      return updated;
    }
    if (object.kind !== "group") return object;
    const children = applyToTargetV1(object.children, objectId, update);
    if (!children.found) return object;
    found = true;
    if (children.objects === object.children) return object;
    changed = true;
    return { ...object, children: children.objects };
  });
  return { found, objects: changed ? next : objects };
}

function updatedObjectV1(
  object: PetSceneObjectV1,
  operation: PetSceneOperationV1,
): PetSceneObjectV1 {
  switch (operation.kind) {
    case "pet_scene.object.set_transform":
      if (jsonEqualsV1(object.transform, operation.transform)) {
        failV1("pet_scene.no_change", "/operation");
      }
      return { ...object, transform: operation.transform };
    case "pet_scene.model.set_binding":
      if (object.kind !== "model") {
        failV1("pet_scene.operation_target_conflict", "/operation/objectId");
      }
      if (jsonEqualsV1(object.model, operation.model)) {
        failV1("pet_scene.no_change", "/operation");
      }
      return { ...object, model: operation.model };
    case "pet_scene.camera.set":
      if (object.kind !== "camera") {
        failV1("pet_scene.operation_target_conflict", "/operation/objectId");
      }
      if (jsonEqualsV1(object.camera, operation.camera)) {
        failV1("pet_scene.no_change", "/operation");
      }
      return { ...object, camera: operation.camera };
    case "pet_scene.light.set":
      if (object.kind !== "light") {
        failV1("pet_scene.operation_target_conflict", "/operation/objectId");
      }
      if (jsonEqualsV1(object.light, operation.light)) {
        failV1("pet_scene.no_change", "/operation");
      }
      return { ...object, light: operation.light };
    case "pet_scene.interaction_volume.set":
      if (object.kind !== "interaction-volume") {
        failV1("pet_scene.operation_target_conflict", "/operation/objectId");
      }
      if (jsonEqualsV1(object.interaction, operation.interaction)) {
        failV1("pet_scene.no_change", "/operation");
      }
      return { ...object, interaction: operation.interaction };
    default:
      return unreachableV1(operation);
  }
}

/** Pure product-local authoring reducer; it owns no Session, IO, React, or Three state. */
export function reducePetSceneOperationV1(
  document: PetSceneDocumentV1,
  operation: PetSceneOperationV1,
): PetSceneReductionResultV1 {
  try {
    const admission = admitPetSceneOperationReplacementV1(operation);
    if (admission.kind === "rejected") return admission;
    const admittedOperation = admission.operation;
    const replacement = applyToTargetV1(
      document.objects,
      admittedOperation.objectId,
      (object) => updatedObjectV1(object, admittedOperation),
    );
    if (!replacement.found) {
      return {
        kind: "rejected",
        diagnostic: { code: "pet_scene.operation_target_missing", path: "/operation/objectId" },
      };
    }
    const next: PetSceneDocumentV1 = { ...document, objects: replacement.objects };
    const compiled = compilePetSceneDocumentV1(next);
    if (compiled.kind === "rejected") return compiled;
    return { kind: "reduced", document: next };
  } catch (error) {
    if (error instanceof PetSceneOperationFailureV1) {
      return { kind: "rejected", diagnostic: error.diagnostic };
    }
    throw error;
  }
}

function rejectedV1(
  code: PetSceneDiagnosticCodeV1,
  path: string,
): PetSceneExecutionResultV1 {
  return { kind: "rejected", diagnostic: { code, path } };
}

/**
 * Binds the product reducer to the shared authoring Session. Currentness is
 * checked before reduction and again at the atomic draft replacement cut.
 */
export function createPetSceneOperationExecutorV1(
  session: PetSceneAuthoringSessionV1,
): PetSceneOperationExecutorV1 {
  return {
    execute(envelope: PetSceneExecutionEnvelopeV1): PetSceneExecutionResultV1 {
      const snapshot = session.getSnapshot();
      if (snapshot.documentIdentity === null || snapshot.draft === null) {
        return rejectedV1("pet_scene.document_unavailable", "/envelope");
      }
      if (envelope.documentIdentity !== snapshot.documentIdentity) {
        return rejectedV1("pet_scene.document_stale", "/envelope/documentIdentity");
      }
      if (envelope.expectedDraftRevision !== snapshot.draftRevision) {
        return rejectedV1("pet_scene.revision_stale", "/envelope/expectedDraftRevision");
      }

      const reduced = reducePetSceneOperationV1(snapshot.draft, envelope.operation);
      if (reduced.kind === "rejected") return reduced;
      const replaced = session.replaceDraftIfCurrent({
        documentIdentity: envelope.documentIdentity,
        expectedDraftRevision: envelope.expectedDraftRevision,
        document: reduced.document,
        ...(envelope.coalesceKey === undefined ? {} : { coalesceKey: envelope.coalesceKey }),
      });
      switch (replaced.kind) {
        case "ok":
          return {
            kind: "applied",
            documentIdentity: envelope.documentIdentity,
            draftRevision: replaced.draftRevision,
          };
        case "not_ready":
          return rejectedV1("pet_scene.document_unavailable", "/envelope");
        case "stale_document":
          return rejectedV1("pet_scene.document_stale", "/envelope/documentIdentity");
        case "stale_revision":
          return rejectedV1("pet_scene.revision_stale", "/envelope/expectedDraftRevision");
        case "unchanged":
          return rejectedV1("pet_scene.no_change", "/operation");
        default:
          return unreachableV1(replaced);
      }
    },
  };
}

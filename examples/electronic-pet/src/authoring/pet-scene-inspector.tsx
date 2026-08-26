// SPDX-License-Identifier: MIT
import {
  createAuthoringDocumentSessionV1,
  useAuthoringDocumentSessionV1,
} from "@sillymaker/ui/debug";
import type { AuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";
import type { EmbeddedAuthoringCompanionOwnerInternalV1 } from "@sillymaker/studio/internal/authoring-companion";
import { saveWithConflictRefreshInternalV1 } from "@sillymaker/studio/internal/authoring-companion";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type {
  PetModelBindingV1,
  PetPerspectiveCameraV1,
  PetSceneDocumentV1,
  PetSceneObjectV1,
  PetSceneOperationExecutorV1,
  PetSceneOperationV1,
  PetSceneRuntimeObjectPlanV1,
  PetTransformV1,
  PetVec3V1,
} from "./contract.ts";
import { compilePetSceneDocumentV1 } from "./document.ts";
import { createPetSceneOperationExecutorV1 } from "./operations.ts";
import { createPetThreeRuntimeV1 } from "../presentation/pet-three-runtime.ts";
import type { PetThreeRuntimeV1 } from "../presentation/pet-three-runtime.ts";
import { petSceneSourcePathV1 } from "../tooling/pet-scene-source-contract.ts";
import { createPetSceneSourceIoV1 } from "../tooling/pet-scene-source-io.ts";
import "./pet-scene-inspector.css";
import {
  electronicPetNeckInteractionBindingV1,
  findElectronicPetInteractionBindingV1,
  findElectronicPetModelBindingV1,
  resolveElectronicPetModelAssetUrlV1,
} from "../content/runtime-bindings.ts";
import { electronicPetInspectorSourceV1 } from "../application/inspector-source.ts";

export interface ElectronicPetAuthoringCompanionOwnerV1
  extends EmbeddedAuthoringCompanionOwnerInternalV1 {
  readonly session: AuthoringDocumentSessionV1<PetSceneDocumentV1>;
  readonly operations: PetSceneOperationExecutorV1;
  readonly ready: Promise<void>;
}

export function createElectronicPetAuthoringCompanionOwnerV1(): ElectronicPetAuthoringCompanionOwnerV1 {
  const session = createAuthoringDocumentSessionV1<PetSceneDocumentV1>({
    io: createPetSceneSourceIoV1(),
  });
  const open = session.open(petSceneSourcePathV1).then((result) => {
    if (result.kind !== "ok") {
      throw new TypeError(
        `pet.authoring_open_failed:${result.kind === "error" ? result.code : result.kind}`,
      );
    }
  });
  return {
    session,
    operations: createPetSceneOperationExecutorV1(session),
    ready: open,
    async dispose(): Promise<void> {
      await open.catch(() => undefined);
    },
  };
}

function findObjectV1(
  objects: readonly PetSceneObjectV1[],
  objectId: string,
): PetSceneObjectV1 | null {
  for (const object of objects) {
    if (object.objectId === objectId) return object;
    if (object.kind === "group") {
      const nested = findObjectV1(object.children, objectId);
      if (nested !== null) return nested;
    }
  }
  return null;
}

function modelUrlV1(modelId: string): string | null {
  return resolveElectronicPetModelAssetUrlV1(
    modelId,
    "embedded-authoring",
    document.baseURI,
  );
}

function NumberFieldV1(props: {
  readonly label: string;
  readonly value: number;
  readonly step?: number;
  readonly onCommit: (value: number) => void;
}): ReactElement {
  return (
    <label className="pet-authoring__number-field">
      <span>{props.label}</span>
      <input
        key={props.value}
        type="number"
        defaultValue={props.value}
        step={props.step ?? 0.05}
        onBlur={(event) => {
          const value = event.currentTarget.valueAsNumber;
          if (Number.isFinite(value) && value !== props.value) props.onCommit(value);
        }}
      />
    </label>
  );
}

function ColorFieldV1(props: {
  readonly label: string;
  readonly value: string;
  readonly onCommit: (value: string) => void;
}): ReactElement {
  return (
    <label className="pet-authoring__color-field">
      <span>{props.label}</span>
      <input
        key={props.value}
        type="color"
        defaultValue={props.value}
        onBlur={(event) => {
          const value = event.currentTarget.value;
          if (value !== props.value) props.onCommit(value);
        }}
      />
      <code>{props.value}</code>
    </label>
  );
}

function TransformFieldsV1(props: {
  readonly value: PetTransformV1;
  readonly onCommit: (value: PetTransformV1) => void;
}): ReactElement {
  return (
    <div className="pet-authoring__transform">
      {(["position", "rotation", "scale"] as const).map((key) => (
        <VectorFieldsV1
          key={key}
          label={key === "position"
            ? "Position"
            : key === "rotation"
            ? "Rotation · radians"
            : "Scale"}
          value={props.value[key]}
          step={0.05}
          onCommit={(value) => props.onCommit({ ...props.value, [key]: value })}
        />
      ))}
    </div>
  );
}

function VectorFieldsV1(props: {
  readonly label: string;
  readonly value: PetVec3V1;
  readonly step: number;
  readonly onCommit: (value: PetVec3V1) => void;
}): ReactElement {
  return (
    <fieldset className="pet-authoring__vector">
      <legend>{props.label}</legend>
      {(["x", "y", "z"] as const).map((axis) => (
        <NumberFieldV1
          key={axis}
          label={axis.toUpperCase()}
          value={props.value[axis]}
          step={props.step}
          onCommit={(next) => props.onCommit({ ...props.value, [axis]: next })}
        />
      ))}
    </fieldset>
  );
}

function objectKindLabelV1(object: PetSceneRuntimeObjectPlanV1): string {
  switch (object.kind) {
    case "group":
      return "Group";
    case "model":
      return "Model";
    case "camera":
      return "Camera";
    case "light":
      return "Light";
    case "interaction-volume":
      return "Volume";
  }
  throw new TypeError("Unsupported PetScene object kind");
}

export function ElectronicPetSceneInspectorV1(
  props: {
    readonly owner: ElectronicPetAuthoringCompanionOwnerV1;
    readonly publicationRole: "visible" | "probe";
  },
): ReactElement {
  const snapshot = useAuthoringDocumentSessionV1(props.owner.session);
  const runtimeInspection = useSyncExternalStore(
    electronicPetInspectorSourceV1.subscribe,
    electronicPetInspectorSourceV1.getSnapshot,
    electronicPetInspectorSourceV1.getSnapshot,
  );
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>("pet.cat");
  const [message, setMessage] = useState("Opening product scene…");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<PetThreeRuntimeV1 | null>(null);
  const compiled = useMemo(
    () => snapshot.draft === null ? null : compilePetSceneDocumentV1(snapshot.draft),
    [snapshot.draft],
  );
  const plan = compiled?.kind === "compiled" ? compiled.plan : null;
  const selectedPlan = selectedObjectId === null
    ? null
    : plan?.objectById.get(selectedObjectId) ?? null;
  const selectedSource = selectedObjectId === null || snapshot.draft === null
    ? null
    : findObjectV1(snapshot.draft.objects, selectedObjectId);
  const compilerMessage = compiled?.kind === "rejected"
    ? `${compiled.diagnostic.code} · ${compiled.diagnostic.path}`
    : null;
  const selectedModelBinding = selectedSource?.kind === "model"
    ? findElectronicPetModelBindingV1(selectedSource.objectId)
    : null;
  const selectedInteractionBinding = selectedSource?.kind === "interaction-volume"
    ? findElectronicPetInteractionBindingV1(selectedSource.objectId)
    : null;

  useEffect(() => {
    void props.owner.ready.then(
      () => setMessage("Product scene ready"),
      (error: unknown) => setMessage(error instanceof Error ? error.message : "Scene open failed"),
    );
  }, [props.owner]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || plan === null || props.publicationRole !== "visible") return undefined;
    const runtime = createPetThreeRuntimeV1({
      canvas,
      plan,
      modelUrl: modelUrlV1,
      quality: "balanced",
      authoring: true,
      onPick: setSelectedObjectId,
      onFailure: (error) => setMessage(error instanceof Error ? error.message : "Preview failed"),
    });
    runtimeRef.current = runtime;
    void runtime.ready.then(() => setMessage("3D preview ready"), () => undefined);
    return () => {
      runtimeRef.current = null;
      runtime.dispose();
    };
  }, [plan, props.publicationRole]);

  useEffect(() => {
    runtimeRef.current?.setSelectedObject(selectedObjectId);
  }, [selectedObjectId]);

  const executeV1 = (operation: PetSceneOperationV1, coalesceKey?: string): void => {
    const current = props.owner.session.getSnapshot();
    if (current.documentIdentity === null) return;
    const result = props.owner.operations.execute({
      documentIdentity: current.documentIdentity,
      expectedDraftRevision: current.draftRevision,
      operation,
      ...(coalesceKey === undefined ? {} : { coalesceKey }),
    });
    setMessage(
      result.kind === "applied" ? `Draft revision ${result.draftRevision}` : result.diagnostic.code,
    );
  };

  const setTransformV1 = (transform: PetTransformV1): void => {
    if (selectedObjectId === null) return;
    executeV1({
      schemaRevision: 1,
      kind: "pet_scene.object.set_transform",
      objectId: selectedObjectId,
      transform,
    }, `transform:${selectedObjectId}`);
  };

  const setModelBindingV1 = (model: PetModelBindingV1): void => {
    if (selectedSource?.kind !== "model") return;
    executeV1({
      schemaRevision: 1,
      kind: "pet_scene.model.set_binding",
      objectId: selectedSource.objectId,
      model,
    });
  };

  const setCameraV1 = (camera: PetPerspectiveCameraV1): void => {
    if (selectedSource?.kind !== "camera") return;
    executeV1({
      schemaRevision: 1,
      kind: "pet_scene.camera.set",
      objectId: selectedSource.objectId,
      camera,
    });
  };

  const saveV1 = async (): Promise<void> => {
    const result = await saveWithConflictRefreshInternalV1(props.owner.session);
    setMessage(
      result.save.kind === "ok"
        ? "Saved with source CAS"
        : result.save.kind === "error" && result.save.code === "digest_conflict"
        ? result.refresh?.kind === "ok"
          ? "CAS conflict · disk baseline refreshed; draft and undo preserved"
          : "CAS conflict · disk baseline refresh failed"
        : `Save: ${result.save.kind}`,
    );
  };

  const runAgentAdjustmentV1 = (): void => {
    const volume = snapshot.draft === null ? null : findObjectV1(
      snapshot.draft.objects,
      electronicPetNeckInteractionBindingV1.objectId,
    );
    if (volume?.kind !== "interaction-volume" || volume.interaction.shape.kind !== "sphere") return;
    executeV1({
      schemaRevision: 1,
      kind: "pet_scene.interaction_volume.set",
      objectId: volume.objectId,
      interaction: {
        ...volume.interaction,
        shape: {
          kind: "sphere",
          radius: Number((volume.interaction.shape.radius + 0.04).toFixed(2)),
        },
      },
    });
    setSelectedObjectId(volume.objectId);
  };

  return (
    <section className="pet-authoring" data-pet-authoring-companion={props.publicationRole}>
      <header className="pet-authoring__toolbar">
        <div>
          <span>Electronic Pet · product-owned 3D authoring</span>
          <strong>{snapshot.draft?.label ?? "Opening scene"}</strong>
        </div>
        <output data-pet-authoring-message="true">{compilerMessage ?? message}</output>
        <div className="pet-authoring__actions">
          <button
            type="button"
            disabled={!snapshot.canUndo}
            onClick={() => props.owner.session.undo()}
          >
            Undo
          </button>
          <button
            type="button"
            disabled={!snapshot.canRedo}
            onClick={() => props.owner.session.redo()}
          >
            Redo
          </button>
          <button type="button" data-pet-agent-operation="true" onClick={runAgentAdjustmentV1}>
            Agent adjusts volume
          </button>
          <button
            type="button"
            data-pet-scene-save="true"
            disabled={!snapshot.dirty || snapshot.saving}
            onClick={() => void saveV1()}
          >
            Save source
          </button>
        </div>
      </header>
      <div className="pet-authoring__workspace">
        <nav className="pet-authoring__hierarchy" aria-label="3D object hierarchy">
          <strong>Objects</strong>
          {plan?.objects.map((object) => (
            <button
              key={object.objectId}
              type="button"
              className={object.objectId === selectedObjectId ? "is-selected" : undefined}
              data-pet-object-id={object.objectId}
              style={{ paddingInlineStart: `${12 + (object.parentObjectId === null ? 0 : 14)}px` }}
              onClick={() => setSelectedObjectId(object.objectId)}
            >
              <span>{objectKindLabelV1(object)}</span>
              {object.label}
            </button>
          ))}
        </nav>
        <div className="pet-authoring__preview">
          {props.publicationRole === "visible"
            ? (
              <canvas
                ref={canvasRef}
                aria-label="3D authoring preview"
                data-pet-authoring-canvas="true"
              />
            )
            : <div aria-hidden="true" />}
        </div>
        <aside className="pet-authoring__properties" aria-label="Selected object properties">
          {runtimeInspection.kind === "detached"
            ? (
              <section className="pet-authoring__runtime" data-pet-runtime-inspector="detached">
                <strong>Live behavior</strong>
                <p>当前没有同页 Player 会话。独立 Inspector 仍可编辑产品场景。</p>
              </section>
            )
            : (
              <section
                className="pet-authoring__runtime"
                data-pet-runtime-inspector="current"
                data-activity-reason={runtimeInspection.value.activity.reason}
              >
                <strong>Live behavior · read only</strong>
                <dl>
                  <div>
                    <dt>Activity</dt>
                    <dd>{runtimeInspection.value.activity.activityId}</dd>
                  </div>
                  <div>
                    <dt>Reason</dt>
                    <dd>{runtimeInspection.value.activity.reason}</dd>
                  </div>
                  <div>
                    <dt>Pose</dt>
                    <dd>{runtimeInspection.value.activity.poseId}</dd>
                  </div>
                  <div>
                    <dt>Mood</dt>
                    <dd>
                      {runtimeInspection.value.mood.kind} · {runtimeInspection.value.mood.cause}
                    </dd>
                  </div>
                </dl>
                <div className="pet-authoring__runtime-needs" aria-label="Authoritative needs">
                  {Object.entries(runtimeInspection.value.needs).map(([need, value]) => (
                    <span key={need}>{need} · {value}</span>
                  ))}
                </div>
                <small>
                  {runtimeInspection.value.progression} · {runtimeInspection.value.trustStage} ·
                  {" "}
                  {runtimeInspection.value.recentMemory.length} recent memories
                </small>
              </section>
            )}
          {selectedPlan === null || selectedSource === null ? <p>Select an object.</p> : (
            <>
              <header>
                <span>{objectKindLabelV1(selectedPlan)}</span>
                <strong>{selectedPlan.label}</strong>
                <code>{selectedPlan.objectId}</code>
              </header>
              <TransformFieldsV1 value={selectedSource.transform} onCommit={setTransformV1} />
              {selectedSource.kind === "camera"
                ? (
                  <div className="pet-authoring__facet">
                    <strong>Camera framing</strong>
                    <NumberFieldV1
                      label="Field of view"
                      value={selectedSource.camera.fovDegrees}
                      step={1}
                      onCommit={(fovDegrees) =>
                        setCameraV1({ ...selectedSource.camera, fovDegrees })}
                    />
                    <small>
                      Narrow framing follows{" "}
                      <code>{selectedSource.camera.responsiveFraming.subjectObjectId}</code>
                    </small>
                    <NumberFieldV1
                      label="Blend below aspect"
                      value={selectedSource.camera.responsiveFraming.startAspect}
                      step={0.05}
                      onCommit={(startAspect) =>
                        setCameraV1({
                          ...selectedSource.camera,
                          responsiveFraming: {
                            ...selectedSource.camera.responsiveFraming,
                            startAspect,
                          },
                        })}
                    />
                    <NumberFieldV1
                      label="Full at aspect"
                      value={selectedSource.camera.responsiveFraming.fullAspect}
                      step={0.05}
                      onCommit={(fullAspect) =>
                        setCameraV1({
                          ...selectedSource.camera,
                          responsiveFraming: {
                            ...selectedSource.camera.responsiveFraming,
                            fullAspect,
                          },
                        })}
                    />
                    <VectorFieldsV1
                      label="Narrow position offset"
                      value={selectedSource.camera.responsiveFraming.positionOffset}
                      step={0.05}
                      onCommit={(positionOffset) =>
                        setCameraV1({
                          ...selectedSource.camera,
                          responsiveFraming: {
                            ...selectedSource.camera.responsiveFraming,
                            positionOffset,
                          },
                        })}
                    />
                    <NumberFieldV1
                      label="Narrow FOV offset"
                      value={selectedSource.camera.responsiveFraming.fovOffsetDegrees}
                      step={1}
                      onCommit={(fovOffsetDegrees) =>
                        setCameraV1({
                          ...selectedSource.camera,
                          responsiveFraming: {
                            ...selectedSource.camera.responsiveFraming,
                            fovOffsetDegrees,
                          },
                        })}
                    />
                    <NumberFieldV1
                      label="Subject X weight"
                      value={selectedSource.camera.responsiveFraming.subjectXWeight}
                      step={0.1}
                      onCommit={(subjectXWeight) =>
                        setCameraV1({
                          ...selectedSource.camera,
                          responsiveFraming: {
                            ...selectedSource.camera.responsiveFraming,
                            subjectXWeight,
                          },
                        })}
                    />
                  </div>
                )
                : null}
              {selectedSource.kind === "light"
                ? (
                  <div className="pet-authoring__facet">
                    <ColorFieldV1
                      label="Color"
                      value={selectedSource.light.color}
                      onCommit={(color) =>
                        executeV1({
                          schemaRevision: 1,
                          kind: "pet_scene.light.set",
                          objectId: selectedSource.objectId,
                          light: { ...selectedSource.light, color },
                        })}
                    />
                    <NumberFieldV1
                      label="Intensity"
                      value={selectedSource.light.intensity}
                      step={0.1}
                      onCommit={(intensity) =>
                        executeV1({
                          schemaRevision: 1,
                          kind: "pet_scene.light.set",
                          objectId: selectedSource.objectId,
                          light: { ...selectedSource.light, intensity },
                        })}
                    />
                  </div>
                )
                : null}
              {selectedSource.kind === "interaction-volume"
                ? (
                  <div className="pet-authoring__facet">
                    <strong>Socket attachment</strong>
                    <code>{selectedSource.interaction.interactionId}</code>
                    <code>
                      {selectedSource.interaction.attachment.modelObjectId} /{" "}
                      {selectedSource.interaction.attachment.socketId}
                    </code>
                    {selectedSource.interaction.shape.kind === "sphere"
                      ? (
                        <NumberFieldV1
                          label="Radius"
                          value={selectedSource.interaction.shape.radius}
                          onCommit={(radius) =>
                            executeV1({
                              schemaRevision: 1,
                              kind: "pet_scene.interaction_volume.set",
                              objectId: selectedSource.objectId,
                              interaction: {
                                ...selectedSource.interaction,
                                shape: { kind: "sphere", radius },
                              },
                            })}
                        />
                      )
                      : null}
                    <VectorFieldsV1
                      label="Preferred fur direction"
                      value={selectedSource.interaction.preferredStrokeDirection}
                      step={0.1}
                      onCommit={(preferredStrokeDirection) =>
                        executeV1({
                          schemaRevision: 1,
                          kind: "pet_scene.interaction_volume.set",
                          objectId: selectedSource.objectId,
                          interaction: {
                            ...selectedSource.interaction,
                            preferredStrokeDirection,
                          },
                        })}
                    />
                    {selectedInteractionBinding === null
                      ? <small>Missing behavior binding</small>
                      : (
                        <small>
                          Behavior · {selectedInteractionBinding.behaviorOwner}
                        </small>
                      )}
                  </div>
                )
                : null}
              {selectedSource.kind === "model"
                ? (
                  <div className="pet-authoring__facet">
                    <strong>Model mapping</strong>
                    <code>{selectedSource.model.modelId}</code>
                    <small>
                      {selectedModelBinding?.runtimeKind ?? "Missing runtime binding"} ·{" "}
                      {selectedModelBinding?.rendererOwner ?? "unowned"}
                    </small>
                    <ColorFieldV1
                      label="Primary color"
                      value={selectedSource.model.appearance.primaryColor}
                      onCommit={(primaryColor) =>
                        setModelBindingV1({
                          ...selectedSource.model,
                          appearance: {
                            ...selectedSource.model.appearance,
                            primaryColor,
                          },
                        })}
                    />
                    {selectedSource.model.animation === undefined
                      ? null
                      : (
                        <div className="pet-authoring__animation-fields">
                          <code>Idle · {selectedSource.model.animation.idleClipId}</code>
                          <NumberFieldV1
                            label="Speed"
                            value={selectedSource.model.animation.speed}
                            step={0.05}
                            onCommit={(speed) =>
                              setModelBindingV1({
                                ...selectedSource.model,
                                animation: { ...selectedSource.model.animation!, speed },
                              })}
                          />
                          <NumberFieldV1
                            label="Blend · ms"
                            value={selectedSource.model.animation.blendDurationMs}
                            step={10}
                            onCommit={(blendDurationMs) =>
                              setModelBindingV1({
                                ...selectedSource.model,
                                animation: {
                                  ...selectedSource.model.animation!,
                                  blendDurationMs,
                                },
                              })}
                          />
                        </div>
                      )}
                    {selectedSource.model.sockets.map((socket) => (
                      <div key={socket.socketId} className="pet-authoring__socket-fields">
                        <strong>Socket · {socket.socketId}</strong>
                        <code>{socket.boneId} → {socket.sourceName}</code>
                        <TransformFieldsV1
                          value={socket.transform}
                          onCommit={(transform) =>
                            setModelBindingV1({
                              ...selectedSource.model,
                              sockets: selectedSource.model.sockets.map((candidate) =>
                                candidate.socketId === socket.socketId
                                  ? { ...candidate, transform }
                                  : candidate
                              ),
                            })}
                        />
                      </div>
                    ))}
                    <small>
                      Material · {selectedSource.model.appearance.primaryMaterialSourceName}
                    </small>
                    <small>
                      {selectedSource.model.bones.length} bones ·{" "}
                      {selectedSource.model.sockets.length} sockets ·{" "}
                      {selectedSource.model.clips.length} clips
                    </small>
                  </div>
                )
                : null}
              <div className="pet-authoring__facet">
                <strong>Source</strong>
                <code>{selectedPlan.sourcePath}</code>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

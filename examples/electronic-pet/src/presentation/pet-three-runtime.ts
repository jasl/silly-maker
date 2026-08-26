// SPDX-License-Identifier: MIT
import {
  ACESFilmicToneMapping,
  AmbientLight,
  AnimationMixer,
  ArrowHelper,
  BoxGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  LoopOnce,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Timer,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import type { AnimationAction, BufferGeometry, Material, SkinnedMesh, Texture } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import type {
  PetSceneRuntimeInteractionVolumePlanV1,
  PetSceneRuntimeModelPlanV1,
  PetSceneRuntimeObjectPlanV1,
  PetSceneRuntimePlanV1,
  PetTransformV1,
} from "../authoring/index.ts";
import type { ElectronicPetContactResultV1, ElectronicPetGameViewV1 } from "../game/kernel.ts";
import type { ElectronicPetInteractionOutcomeV1 } from "../game/state.ts";
import {
  findElectronicPetInteractionBindingV1,
  findElectronicPetModelBindingV1,
} from "../content/runtime-bindings.ts";
import { isElectronicPetInteractionReachableV1 } from "../content/interactions.ts";
import {
  appendPetStrokePointV1,
  beginPetStrokeGestureV1,
  classifyPetStrokeGestureV1,
  petStrokeCompletionV1,
} from "./pet-stroke-gesture.ts";
import type { PetStrokeGestureAccumulatorV1 } from "./pet-stroke-gesture.ts";
import {
  petActivityPresentationV1,
  petReactionPresentationV1,
} from "./pet-companion-presentation.ts";
import type {
  PetActivityPresentationV1,
  PetReactionPresentationV1,
} from "./pet-companion-presentation.ts";
import { createPetBallV1, createPetRoomV1 } from "./pet-procedural-assets.ts";

export interface PetThreeRuntimeMetricsV1 {
  readonly renderedFrames: number;
  readonly activeAnimationFrames: number;
  readonly lastFrameMs: number;
}

export type PetPointerFeedbackV1 =
  | { readonly phase: "idle" }
  | {
    readonly phase:
      | "hover"
      | "blocked"
      | "tracking"
      | "ready"
      | "incomplete"
      | "complete";
    readonly x: number;
    readonly y: number;
    readonly completion: number;
  };

export interface CreatePetThreeRuntimeInputV1 {
  readonly canvas: HTMLCanvasElement;
  readonly plan: PetSceneRuntimePlanV1;
  readonly modelUrl: (modelId: string) => string | null;
  readonly quality?: "balanced" | "quality";
  readonly authoring?: boolean;
  readonly selectedObjectId?: string | null;
  readonly onPick?: (objectId: string | null) => void;
  readonly onGesture?: (result: ElectronicPetContactResultV1) => void | Promise<void>;
  readonly onPointerFeedback?: (feedback: PetPointerFeedbackV1) => void;
  readonly onReady?: () => void;
  readonly onFailure?: (error: unknown) => void;
}

export interface PetThreeRuntimeV1 {
  readonly ready: Promise<void>;
  setSelectedObject(objectId: string | null): void;
  setCompanionPresentation(view: ElectronicPetGameViewV1): void;
  presentReaction(reaction: ElectronicPetInteractionOutcomeV1): void;
  requestRender(): void;
  metrics(): PetThreeRuntimeMetricsV1;
  dispose(): void;
}

interface PointerGestureV1 {
  readonly pointerId: number;
  readonly startedAt: number;
  readonly objectId: string;
  readonly interactionId: string;
  readonly plan: PetSceneRuntimeInteractionVolumePlanV1;
  accumulator: PetStrokeGestureAccumulatorV1;
}

interface InteractionHitV1 {
  readonly objectId: string;
  readonly point: { readonly x: number; readonly y: number; readonly z: number };
}

interface PetAnimationActionV1 {
  readonly action: AnimationAction;
  readonly speed: number;
  readonly blendDurationMs: number;
}

interface ActivePetReactionV1 {
  readonly startedAtMs: number;
  readonly presentation: PetReactionPresentationV1;
}

function applyTransformV1(object: Object3D, transform: PetTransformV1): void {
  object.position.set(
    transform.position.x,
    transform.position.y,
    transform.position.z,
  );
  object.rotation.set(
    transform.rotation.x,
    transform.rotation.y,
    transform.rotation.z,
  );
  object.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
}

function applyPrimaryColorV1(
  root: Object3D,
  primaryMaterialSourceName: string,
  primaryColor: string,
): void {
  let matched = false;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const candidates = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of candidates) {
      if (
        material instanceof MeshStandardMaterial &&
        material.name === primaryMaterialSourceName
      ) {
        material.color.set(primaryColor);
        matched = true;
      }
    }
  });
  if (!matched) {
    throw new TypeError(`pet.material_mapping_missing:${primaryMaterialSourceName}`);
  }
}

function collectDisposableResourcesV1(
  root: Object3D,
  geometries: Set<BufferGeometry>,
  materials: Set<Material>,
  textures: Set<Texture>,
  skinnedMeshes: Set<SkinnedMesh>,
): void {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (mesh.geometry !== undefined) geometries.add(mesh.geometry);
    const meshMaterial = mesh.material;
    if (meshMaterial !== undefined) {
      const candidates = Array.isArray(meshMaterial) ? meshMaterial : [meshMaterial];
      for (const material of candidates) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value !== null && typeof value === "object" && "isTexture" in value) {
            textures.add(value as Texture);
          }
        }
      }
    }
    if ("isSkinnedMesh" in object && object.isSkinnedMesh === true) {
      skinnedMeshes.add(object as SkinnedMesh);
    }
  });
}

function disposeLoadedRootV1(root: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const skinnedMeshes = new Set<SkinnedMesh>();
  collectDisposableResourcesV1(root, geometries, materials, textures, skinnedMeshes);
  for (const mesh of skinnedMeshes) mesh.skeleton.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}

function createVolumeMeshV1(
  plan: PetSceneRuntimeInteractionVolumePlanV1,
  authoring: boolean,
): Mesh {
  const geometry = plan.interaction.shape.kind === "sphere"
    ? new SphereGeometry(plan.interaction.shape.radius, 24, 16)
    : new BoxGeometry(
      plan.interaction.shape.size.x,
      plan.interaction.shape.size.y,
      plan.interaction.shape.size.z,
    );
  const material = new MeshStandardMaterial({
    color: authoring ? 0x45d7ad : 0xffffff,
    emissive: authoring ? 0x0e654f : 0x000000,
    transparent: true,
    opacity: authoring ? 0.27 : 0.002,
    depthWrite: false,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = plan.label;
  mesh.userData.objectId = plan.objectId;
  applyTransformV1(mesh, plan.transform);
  return mesh;
}

function findRequiredObjectV1(root: Object3D, sourceName: string, label: string): Object3D {
  const object = root.getObjectByName(sourceName);
  if (object === undefined) throw new TypeError(`pet.model_mapping_missing:${label}:${sourceName}`);
  return object;
}

export function createPetThreeRuntimeV1(
  input: CreatePetThreeRuntimeInputV1,
): PetThreeRuntimeV1 {
  const renderer = new WebGLRenderer({
    canvas: input.canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  const quality = input.quality ?? "balanced";
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.setClearColor(new Color(0xe8eee9), 1);
  renderer.shadowMap.enabled = true;

  const scene = new Scene();
  const rootsById = new Map<string, Object3D>();
  const modelRootsById = new Map<string, Object3D>();
  const socketsByKey = new Map<string, Object3D>();
  const interactiveObjects: Object3D[] = [];
  const interactionObjects: Object3D[] = [];
  const interactionPlansById = new Map<string, PetSceneRuntimeInteractionVolumePlanV1>();
  const selectableObjects = new Map<string, Object3D>();
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const skinnedMeshes = new Set<SkinnedMesh>();
  const mixers: Array<{ readonly mixer: AnimationMixer; readonly root: Object3D }> = [];
  const clipActions: PetAnimationActionV1[] = [];
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const timer = new Timer();
  timer.connect(document);
  let activeGesture: PointerGestureV1 | null = null;
  let hoverFrame = 0;
  let pendingHoverPoint: { readonly clientX: number; readonly clientY: number } | null = null;
  let feedbackResetTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  let pointerFeedbackPhase: PetPointerFeedbackV1["phase"] = "idle";
  const initialCanvasCursor = input.canvas.style.cursor;
  let selectedObjectId = input.selectedObjectId ?? null;
  let selectedHelper: Object3D | null = null;
  let renderFrame = 0;
  let animationRemainingSeconds = 0;
  let activeReaction: ActivePetReactionV1 | null = null;
  let activityPresentation: PetActivityPresentationV1 | null = null;
  let currentActivityId: ElectronicPetGameViewV1["activityId"] | null = null;
  let currentPoseId: ElectronicPetGameViewV1["poseId"] | null = null;
  let currentTrustStage: ElectronicPetGameViewV1["trustStage"] | null = null;
  let interactionEnabled = true;
  let reachableInteractionObjects: Object3D[] = [];
  let renderedFrames = 0;
  let activeAnimationFrames = 0;
  let lastFrameMs = 0;
  let disposed = false;
  let viewportAspect = 1;

  const cameraPlan = input.plan.objectById.get(input.plan.activeCameraId);
  if (cameraPlan?.kind !== "camera") {
    throw new TypeError("pet.active_camera_unavailable");
  }
  const camera = new PerspectiveCamera(
    cameraPlan.camera.fovDegrees,
    1,
    cameraPlan.camera.near,
    cameraPlan.camera.far,
  );
  applyTransformV1(camera, cameraPlan.transform);

  const parentForV1 = (object: PetSceneRuntimeObjectPlanV1): Object3D => {
    if (object.parentObjectId === null) return scene;
    const parent = rootsById.get(object.parentObjectId);
    if (parent === undefined) {
      throw new TypeError(`pet.runtime_parent_missing:${object.parentObjectId}`);
    }
    return parent;
  };

  for (const object of input.plan.objects) {
    if (object.kind === "interaction-volume") continue;
    if (object.kind === "camera") {
      rootsById.set(object.objectId, camera);
      parentForV1(object).add(camera);
      continue;
    }
    let runtimeObject: Object3D;
    if (object.kind === "light") {
      const { color, intensity, lightKind } = object.light;
      runtimeObject = lightKind === "ambient"
        ? new AmbientLight(color, intensity)
        : lightKind === "point"
        ? new PointLight(color, intensity)
        : new DirectionalLight(color, intensity);
      if (runtimeObject instanceof DirectionalLight) {
        runtimeObject.castShadow = true;
        runtimeObject.shadow.mapSize.set(1_024, 1_024);
        runtimeObject.shadow.camera.near = 0.1;
        runtimeObject.shadow.camera.far = 16;
        runtimeObject.shadow.camera.left = -4.5;
        runtimeObject.shadow.camera.right = 4.5;
        runtimeObject.shadow.camera.top = 4.5;
        runtimeObject.shadow.camera.bottom = -2;
      }
    } else {
      runtimeObject = new Group();
    }
    runtimeObject.name = object.label;
    runtimeObject.userData.objectId = object.objectId;
    applyTransformV1(runtimeObject, object.transform);
    rootsById.set(object.objectId, runtimeObject);
    selectableObjects.set(object.objectId, runtimeObject);
    parentForV1(object).add(runtimeObject);
    if (object.kind === "model") modelRootsById.set(object.objectId, runtimeObject);
  }

  const catPlan = input.plan.objectById.get("pet.cat");
  const catRoot = modelRootsById.get("pet.cat");
  if (catPlan?.kind !== "model" || catRoot === undefined) {
    throw new TypeError("pet.companion_model_unavailable");
  }
  const cameraFraming = cameraPlan.camera.responsiveFraming;
  const cameraSubjectPlan = input.plan.objectById.get(cameraFraming.subjectObjectId)!;
  let cameraSubjectX = cameraSubjectPlan.transform.position.x;

  const applyCameraCompositionV1 = (): void => {
    const aspectSpan = cameraFraming.startAspect - cameraFraming.fullAspect;
    const narrowness = Math.max(
      0,
      Math.min(1, (cameraFraming.startAspect - viewportAspect) / aspectSpan),
    );
    camera.position.set(
      cameraPlan.transform.position.x +
        narrowness *
          (cameraFraming.positionOffset.x +
            (cameraSubjectX - cameraPlan.transform.position.x) * cameraFraming.subjectXWeight),
      cameraPlan.transform.position.y + narrowness * cameraFraming.positionOffset.y,
      cameraPlan.transform.position.z + narrowness * cameraFraming.positionOffset.z,
    );
    camera.rotation.set(
      cameraPlan.transform.rotation.x,
      cameraPlan.transform.rotation.y,
      cameraPlan.transform.rotation.z,
    );
    camera.fov = cameraPlan.camera.fovDegrees + narrowness * cameraFraming.fovOffsetDegrees;
    camera.updateProjectionMatrix();
  };

  const applyCompanionTransformV1 = (reactionStrength = 0): void => {
    const activity = activityPresentation;
    const reaction = activeReaction?.presentation ?? null;
    const activityPosition = activity?.positionOffset ?? { x: 0, y: 0, z: 0 };
    const activityRotation = activity?.rotationOffset ?? { x: 0, y: 0, z: 0 };
    const activityScale = activity?.scaleMultiplier ?? { x: 1, y: 1, z: 1 };
    const reactionPosition = reaction?.positionOffset ?? { x: 0, y: 0, z: 0 };
    const reactionRotation = reaction?.rotationOffset ?? { x: 0, y: 0, z: 0 };
    const reactionScale = reaction?.scaleMultiplier ?? { x: 1, y: 1, z: 1 };

    catRoot.position.set(
      catPlan.transform.position.x + activityPosition.x + reactionPosition.x * reactionStrength,
      catPlan.transform.position.y + activityPosition.y + reactionPosition.y * reactionStrength,
      catPlan.transform.position.z + activityPosition.z + reactionPosition.z * reactionStrength,
    );
    catRoot.rotation.set(
      catPlan.transform.rotation.x + activityRotation.x + reactionRotation.x * reactionStrength,
      catPlan.transform.rotation.y + activityRotation.y + reactionRotation.y * reactionStrength,
      catPlan.transform.rotation.z + activityRotation.z + reactionRotation.z * reactionStrength,
    );
    catRoot.scale.set(
      catPlan.transform.scale.x * activityScale.x *
        (1 + (reactionScale.x - 1) * reactionStrength),
      catPlan.transform.scale.y * activityScale.y *
        (1 + (reactionScale.y - 1) * reactionStrength),
      catPlan.transform.scale.z * activityScale.z *
        (1 + (reactionScale.z - 1) * reactionStrength),
    );
    catRoot.updateMatrixWorld(true);
  };

  const renderNowV1 = (): void => {
    if (disposed) return;
    const started = performance.now();
    renderer.render(scene, camera);
    lastFrameMs = performance.now() - started;
    renderedFrames += 1;
  };

  const frameV1 = (timestamp: number): void => {
    renderFrame = 0;
    if (disposed) return;
    timer.update(timestamp);
    const deltaSeconds = Math.min(timer.getDelta(), 0.1);
    let continueAnimation = false;
    let animated = false;
    if (animationRemainingSeconds > 0) {
      for (const { mixer } of mixers) mixer.update(deltaSeconds);
      animationRemainingSeconds = Math.max(0, animationRemainingSeconds - deltaSeconds);
      continueAnimation = animationRemainingSeconds > 0;
      animated = true;
    }
    if (activeReaction !== null) {
      const progress = Math.min(
        1,
        Math.max(
          0,
          (timestamp - activeReaction.startedAtMs) / activeReaction.presentation.durationMs,
        ),
      );
      if (progress >= 1) {
        activeReaction = null;
        animationRemainingSeconds = 0;
        for (const { action } of clipActions) action.stop();
        applyCompanionTransformV1();
      } else {
        applyCompanionTransformV1(Math.sin(Math.PI * progress));
        continueAnimation = true;
      }
      animated = true;
    }
    if (animated) activeAnimationFrames += 1;
    renderNowV1();
    if (continueAnimation) renderFrame = requestAnimationFrame(frameV1);
  };

  const requestRenderV1 = (): void => {
    if (disposed || renderFrame !== 0) return;
    renderFrame = requestAnimationFrame(frameV1);
  };

  const playResponseV1 = (): void => {
    let animationDurationMs = 0;
    for (const configured of clipActions) {
      const { action, blendDurationMs, speed } = configured;
      action.reset();
      action.setLoop(LoopOnce, 1);
      action.setEffectiveTimeScale(speed);
      action.setEffectiveWeight(1);
      action.clampWhenFinished = true;
      if (blendDurationMs > 0) action.fadeIn(blendDurationMs / 1_000);
      action.play();
      animationDurationMs = Math.max(
        animationDurationMs,
        action.getClip().duration / speed * 1_000,
      );
    }
    animationRemainingSeconds = Math.max(0.016, animationDurationMs / 1_000);
    timer.reset();
    requestRenderV1();
  };

  const presentReactionV1 = (reaction: ElectronicPetInteractionOutcomeV1): void => {
    if (disposed) return;
    for (const { action } of clipActions) action.stop();
    animationRemainingSeconds = 0;
    const presentation = petReactionPresentationV1(reaction);
    activeReaction = { startedAtMs: performance.now(), presentation };
    applyCompanionTransformV1();
    if (presentation.playAuthoredClip) playResponseV1();
    else {
      timer.reset();
      requestRenderV1();
    }
  };

  const reportGestureV1 = (result: ElectronicPetContactResultV1): void => {
    try {
      const reported = input.onGesture?.(result);
      void Promise.resolve(reported).catch((error: unknown) => input.onFailure?.(error));
    } catch (error) {
      input.onFailure?.(error);
    }
  };

  const raycastV1 = (
    clientX: number,
    clientY: number,
    objects: Object3D[],
  ) => {
    const bounds = input.canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    pointer.set(
      (clientX - bounds.left) / bounds.width * 2 - 1,
      -(clientY - bounds.top) / bounds.height * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(objects, false)[0] ?? null;
  };

  const pickV1 = (clientX: number, clientY: number): string | null => {
    const hit = raycastV1(clientX, clientY, interactiveObjects);
    return typeof hit?.object.userData.objectId === "string" ? hit.object.userData.objectId : null;
  };

  const pickInteractionV1 = (clientX: number, clientY: number): InteractionHitV1 | null => {
    if (!interactionEnabled) return null;
    const hit = raycastV1(clientX, clientY, reachableInteractionObjects);
    const objectId = typeof hit?.object.userData.objectId === "string"
      ? hit.object.userData.objectId
      : null;
    if (hit === null || objectId === null || !interactionPlansById.has(objectId)) return null;
    const localPoint = hit.object.worldToLocal(hit.point.clone());
    return {
      objectId,
      point: { x: localPoint.x, y: localPoint.y, z: localPoint.z },
    };
  };

  const hitsInteractionV1 = (clientX: number, clientY: number): boolean => {
    return raycastV1(clientX, clientY, interactionObjects) !== null;
  };

  const pointerPositionV1 = (
    clientX: number,
    clientY: number,
  ): { readonly x: number; readonly y: number } => {
    const bounds = input.canvas.getBoundingClientRect();
    return { x: clientX - bounds.left, y: clientY - bounds.top };
  };

  const publishPointerFeedbackV1 = (
    feedback: PetPointerFeedbackV1,
    cursor: "default" | "grab" | "grabbing" | "not-allowed",
  ): void => {
    if (feedbackResetTimer !== null) {
      clearTimeout(feedbackResetTimer);
      feedbackResetTimer = null;
    }
    pointerFeedbackPhase = feedback.phase;
    input.canvas.style.cursor = cursor === "default" ? initialCanvasCursor : cursor;
    input.onPointerFeedback?.(feedback);
  };

  const resetPointerFeedbackV1 = (): void => {
    publishPointerFeedbackV1({ phase: "idle" }, "default");
  };

  const publishLocatedPointerFeedbackV1 = (
    phase: Exclude<PetPointerFeedbackV1["phase"], "idle">,
    clientX: number,
    clientY: number,
    completion: number,
  ): void => {
    const position = pointerPositionV1(clientX, clientY);
    publishPointerFeedbackV1(
      { phase, ...position, completion },
      phase === "blocked"
        ? "not-allowed"
        : phase === "tracking" || phase === "ready"
        ? "grabbing"
        : "grab",
    );
  };

  const scheduleTerminalFeedbackResetV1 = (
    event: PointerEvent,
    delayMs: number,
  ): void => {
    const pointerType = event.pointerType;
    const clientX = event.clientX;
    const clientY = event.clientY;
    feedbackResetTimer = globalThis.setTimeout(() => {
      feedbackResetTimer = null;
      if (disposed || activeGesture !== null) return;
      const hit = pointerType === "mouse" ? pickInteractionV1(clientX, clientY) : null;
      if (hit !== null) publishLocatedPointerFeedbackV1("hover", clientX, clientY, 0);
      else if (pointerType === "mouse" && hitsInteractionV1(clientX, clientY)) {
        publishLocatedPointerFeedbackV1("blocked", clientX, clientY, 0);
      } else resetPointerFeedbackV1();
    }, delayMs);
  };

  const cancelHoverFrameV1 = (): void => {
    pendingHoverPoint = null;
    if (hoverFrame === 0) return;
    cancelAnimationFrame(hoverFrame);
    hoverFrame = 0;
  };

  const scheduleMouseHoverV1 = (event: PointerEvent): void => {
    if (event.pointerType !== "mouse" || input.onGesture === undefined) return;
    pendingHoverPoint = { clientX: event.clientX, clientY: event.clientY };
    if (hoverFrame !== 0) return;
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = 0;
      const point = pendingHoverPoint;
      pendingHoverPoint = null;
      if (disposed || activeGesture !== null || point === null) return;
      const hit = pickInteractionV1(point.clientX, point.clientY);
      if (hit !== null) {
        publishLocatedPointerFeedbackV1("hover", point.clientX, point.clientY, 0);
      } else if (hitsInteractionV1(point.clientX, point.clientY)) {
        publishLocatedPointerFeedbackV1("blocked", point.clientX, point.clientY, 0);
      } else resetPointerFeedbackV1();
    });
  };

  const releaseGestureV1 = (
    pointerId: number,
    releaseCapture: boolean,
  ): PointerGestureV1 | null => {
    if (activeGesture?.pointerId !== pointerId) return null;
    const gesture = activeGesture;
    activeGesture = null;
    if (releaseCapture && input.canvas.hasPointerCapture(pointerId)) {
      input.canvas.releasePointerCapture(pointerId);
    }
    return gesture;
  };

  const setCompanionPresentationV1 = (view: ElectronicPetGameViewV1): void => {
    if (disposed) return;
    const activityChanged = currentActivityId !== view.activityId;
    const trustChanged = currentTrustStage !== null && currentTrustStage !== view.trustStage;
    currentActivityId = view.activityId;
    currentPoseId = view.poseId;
    currentTrustStage = view.trustStage;
    activityPresentation = petActivityPresentationV1(view.activityId);
    if (cameraFraming.subjectObjectId === catPlan.objectId) {
      cameraSubjectX = catPlan.transform.position.x + activityPresentation.positionOffset.x;
    }
    interactionEnabled = (input.authoring ?? false) || activityPresentation.interactionEnabled;
    reachableInteractionObjects = !interactionEnabled
      ? []
      : (input.authoring ?? false)
      ? interactionObjects
      : interactionObjects.filter((object) => {
        const objectId = typeof object.userData.objectId === "string"
          ? object.userData.objectId
          : null;
        const binding = objectId === null ? null : findElectronicPetInteractionBindingV1(objectId);
        return binding !== null &&
          isElectronicPetInteractionReachableV1(view.poseId, binding.interactionId);
      });
    if (
      activeGesture !== null &&
      (!interactionEnabled ||
        (!(input.authoring ?? false) &&
          !isElectronicPetInteractionReachableV1(view.poseId, activeGesture.interactionId)))
    ) {
      if (releaseGestureV1(activeGesture.pointerId, true) !== null) {
        resetPointerFeedbackV1();
      }
    } else if (pointerFeedbackPhase === "hover" || pointerFeedbackPhase === "blocked") {
      resetPointerFeedbackV1();
    }
    if (activityChanged || trustChanged) {
      activeReaction = null;
      animationRemainingSeconds = 0;
      for (const { action } of clipActions) action.stop();
      applyCompanionTransformV1();
    }
    if (activityChanged) applyCameraCompositionV1();
    requestRenderV1();
  };

  const onPointerDownV1 = (event: PointerEvent): void => {
    cancelHoverFrameV1();
    if (input.onPick !== undefined) {
      input.onPick(pickV1(event.clientX, event.clientY));
    }
    if (
      input.onGesture === undefined ||
      activeGesture !== null ||
      !event.isPrimary ||
      event.button !== 0 ||
      (event.pointerType !== "mouse" && event.pointerType !== "touch")
    ) return;
    const hit = pickInteractionV1(event.clientX, event.clientY);
    const plan = hit === null ? null : interactionPlansById.get(hit.objectId) ?? null;
    const interaction = hit === null ? null : findElectronicPetInteractionBindingV1(hit.objectId);
    if (hit === null || plan === null || interaction === null) {
      if (hitsInteractionV1(event.clientX, event.clientY)) {
        publishLocatedPointerFeedbackV1("blocked", event.clientX, event.clientY, 0);
        scheduleTerminalFeedbackResetV1(event, 700);
      } else resetPointerFeedbackV1();
      return;
    }
    input.canvas.setPointerCapture(event.pointerId);
    activeGesture = {
      pointerId: event.pointerId,
      startedAt: performance.now(),
      objectId: hit.objectId,
      interactionId: interaction.interactionId,
      plan,
      accumulator: beginPetStrokeGestureV1(hit.point),
    };
    publishLocatedPointerFeedbackV1("tracking", event.clientX, event.clientY, 0);
  };

  const onPointerMoveV1 = (event: PointerEvent): void => {
    const gesture = activeGesture;
    if (gesture === null || gesture.pointerId !== event.pointerId) {
      scheduleMouseHoverV1(event);
      return;
    }
    if (event.pointerType === "mouse" && (event.buttons & 1) === 0) {
      if (releaseGestureV1(event.pointerId, true) !== null) resetPointerFeedbackV1();
      return;
    }
    const hit = pickInteractionV1(event.clientX, event.clientY);
    if (hit === null) {
      const completion = petStrokeCompletionV1(
        gesture.accumulator,
        gesture.plan.interaction.shape,
      );
      publishLocatedPointerFeedbackV1(
        completion >= 1 ? "ready" : "tracking",
        event.clientX,
        event.clientY,
        completion,
      );
      return;
    }
    if (hit.objectId !== gesture.objectId) {
      if (releaseGestureV1(event.pointerId, true) !== null) resetPointerFeedbackV1();
      return;
    }
    gesture.accumulator = appendPetStrokePointV1(
      gesture.accumulator,
      hit.point,
      gesture.plan.interaction.preferredStrokeDirection,
    );
    const completion = petStrokeCompletionV1(
      gesture.accumulator,
      gesture.plan.interaction.shape,
    );
    publishLocatedPointerFeedbackV1(
      completion >= 1 ? "ready" : "tracking",
      event.clientX,
      event.clientY,
      completion,
    );
  };

  const finishPointerV1 = (event: PointerEvent): void => {
    const current = activeGesture;
    if (current === null || current.pointerId !== event.pointerId) return;
    const hit = pickInteractionV1(event.clientX, event.clientY);
    if (hit !== null && hit.objectId !== current.objectId) {
      if (releaseGestureV1(event.pointerId, true) !== null) resetPointerFeedbackV1();
      return;
    }
    if (hit !== null) {
      current.accumulator = appendPetStrokePointV1(
        current.accumulator,
        hit.point,
        current.plan.interaction.preferredStrokeDirection,
      );
    }
    const gesture = releaseGestureV1(event.pointerId, true)!;
    const durationMs = Math.min(
      10_000,
      Math.max(0, Math.round(performance.now() - gesture.startedAt)),
    );
    const classification = classifyPetStrokeGestureV1(
      gesture.accumulator,
      gesture.plan.interaction.preferredStrokeDirection,
      gesture.plan.interaction.shape,
      durationMs,
    );
    if (classification === null) {
      publishLocatedPointerFeedbackV1(
        "incomplete",
        event.clientX,
        event.clientY,
        petStrokeCompletionV1(
          gesture.accumulator,
          gesture.plan.interaction.shape,
        ),
      );
      scheduleTerminalFeedbackResetV1(event, 700);
      return;
    }
    publishLocatedPointerFeedbackV1("complete", event.clientX, event.clientY, 1);
    scheduleTerminalFeedbackResetV1(event, 420);
    reportGestureV1({
      targetInteractionId: gesture.interactionId,
      gesture: "stroke",
      ...classification,
    });
  };

  const cancelPointerV1 = (event: PointerEvent): void => {
    if (releaseGestureV1(event.pointerId, event.type !== "lostpointercapture") !== null) {
      resetPointerFeedbackV1();
    }
  };

  const onPointerLeaveV1 = (event: PointerEvent): void => {
    if (event.pointerType !== "mouse" || activeGesture !== null) return;
    cancelHoverFrameV1();
    resetPointerFeedbackV1();
  };

  input.canvas.addEventListener("pointerdown", onPointerDownV1);
  input.canvas.addEventListener("pointermove", onPointerMoveV1);
  input.canvas.addEventListener("pointerup", finishPointerV1);
  input.canvas.addEventListener("pointercancel", cancelPointerV1);
  input.canvas.addEventListener("lostpointercapture", cancelPointerV1);
  input.canvas.addEventListener("pointerleave", onPointerLeaveV1);

  const resizeV1 = (): void => {
    if (disposed) return;
    const width = Math.max(1, input.canvas.clientWidth);
    const height = Math.max(1, input.canvas.clientHeight);
    const dpr = Math.min(globalThis.devicePixelRatio || 1, quality === "quality" ? 2 : 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    viewportAspect = width / height;
    camera.aspect = viewportAspect;
    applyCameraCompositionV1();
    requestRenderV1();
  };
  const observer = new ResizeObserver(resizeV1);
  observer.observe(input.canvas);
  resizeV1();

  const loadModelV1 = async (object: PetSceneRuntimeModelPlanV1): Promise<void> => {
    if (disposed) return;
    const modelRoot = modelRootsById.get(object.objectId);
    if (modelRoot === undefined) throw new TypeError(`pet.model_root_missing:${object.objectId}`);
    const runtimeBinding = findElectronicPetModelBindingV1(object.objectId);
    if (runtimeBinding === null || runtimeBinding.modelId !== object.model.modelId) {
      throw new TypeError(`pet.model_runtime_binding_missing:${object.objectId}`);
    }
    if (runtimeBinding.runtimeKind !== "gltf") {
      const appearance = object.model.appearance;
      const model = runtimeBinding.runtimeKind === "procedural-room"
        ? createPetRoomV1(appearance.primaryMaterialSourceName, appearance.primaryColor)
        : createPetBallV1(appearance.primaryMaterialSourceName, appearance.primaryColor);
      modelRoot.add(model);
      collectDisposableResourcesV1(model, geometries, materials, textures, skinnedMeshes);
      if (input.authoring ?? false) {
        model.traverse((candidate) => {
          if (!(candidate instanceof Mesh)) return;
          candidate.userData.objectId = object.objectId;
          interactiveObjects.push(candidate);
        });
      }
      for (const sourceName of object.model.nodeSourceById.values()) {
        findRequiredObjectV1(model, sourceName, object.objectId);
      }
      return;
    }
    const url = input.modelUrl(object.model.modelId);
    if (url === null) throw new TypeError(`pet.model_asset_missing:${object.model.modelId}`);
    const gltf = await new GLTFLoader().loadAsync(url);
    if (disposed) {
      disposeLoadedRootV1(gltf.scene);
      return;
    }
    gltf.scene.name = object.label;
    gltf.scene.traverse((candidate) => {
      if (!(candidate instanceof Mesh)) return;
      candidate.castShadow = true;
      candidate.receiveShadow = true;
    });
    collectDisposableResourcesV1(gltf.scene, geometries, materials, textures, skinnedMeshes);
    applyPrimaryColorV1(
      gltf.scene,
      object.model.appearance.primaryMaterialSourceName,
      object.model.appearance.primaryColor,
    );
    modelRoot.add(gltf.scene);
    if (input.authoring ?? false) {
      gltf.scene.traverse((candidate) => {
        if (!(candidate instanceof Mesh)) return;
        candidate.userData.objectId = object.objectId;
        interactiveObjects.push(candidate);
      });
    }
    for (const sourceName of object.model.nodeSourceById.values()) {
      findRequiredObjectV1(gltf.scene, sourceName, object.objectId);
    }
    for (const sourceName of object.model.boneSourceById.values()) {
      findRequiredObjectV1(gltf.scene, sourceName, object.objectId);
    }
    for (const socket of object.model.socketById.values()) {
      const boneSource = object.model.boneSourceById.get(socket.boneId);
      if (boneSource === undefined) {
        throw new TypeError(`pet.socket_bone_missing:${socket.socketId}`);
      }
      const bone = findRequiredObjectV1(gltf.scene, boneSource, object.objectId);
      const runtimeSocket = new Object3D();
      runtimeSocket.name = socket.sourceName;
      applyTransformV1(runtimeSocket, socket.transform);
      bone.add(runtimeSocket);
      socketsByKey.set(`${object.objectId}\0${socket.socketId}`, runtimeSocket);
    }
    const animation = object.model.animation;
    if (animation !== null) {
      const mixer = new AnimationMixer(gltf.scene);
      mixers.push({ mixer, root: gltf.scene });
      const sourceName = object.model.clipSourceById.get(animation.idleClipId);
      if (sourceName === undefined) {
        throw new TypeError(`pet.clip_mapping_missing:${animation.idleClipId}`);
      }
      const clip = gltf.animations.find((candidate) => candidate.name === sourceName);
      if (clip === undefined) throw new TypeError(`pet.clip_mapping_missing:${sourceName}`);
      clipActions.push({
        action: mixer.clipAction(clip),
        speed: animation.speed,
        blendDurationMs: animation.blendDurationMs,
      });
    }
  };

  const attachVolumeV1 = (object: PetSceneRuntimeInteractionVolumePlanV1): void => {
    const attachment = object.interaction.attachment;
    const socket = socketsByKey.get(`${attachment.modelObjectId}\0${attachment.socketId}`);
    if (socket === undefined) {
      throw new TypeError(`pet.interaction_socket_unavailable:${attachment.socketId}`);
    }
    const volume = createVolumeMeshV1(object, input.authoring ?? false);
    socket.add(volume);
    interactiveObjects.push(volume);
    interactionObjects.push(volume);
    if (interactionEnabled) {
      const binding = findElectronicPetInteractionBindingV1(object.objectId);
      if (
        (input.authoring ?? false) ||
        (currentPoseId !== null && binding !== null &&
          isElectronicPetInteractionReachableV1(currentPoseId, binding.interactionId))
      ) {
        reachableInteractionObjects = [...reachableInteractionObjects, volume];
      }
    }
    interactionPlansById.set(object.objectId, object);
    selectableObjects.set(object.objectId, volume);
    collectDisposableResourcesV1(volume, geometries, materials, textures, skinnedMeshes);
  };

  const disposeV1 = (): void => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    input.canvas.removeEventListener("pointerdown", onPointerDownV1);
    input.canvas.removeEventListener("pointermove", onPointerMoveV1);
    input.canvas.removeEventListener("pointerup", finishPointerV1);
    input.canvas.removeEventListener("pointercancel", cancelPointerV1);
    input.canvas.removeEventListener("lostpointercapture", cancelPointerV1);
    input.canvas.removeEventListener("pointerleave", onPointerLeaveV1);
    cancelHoverFrameV1();
    if (feedbackResetTimer !== null) {
      clearTimeout(feedbackResetTimer);
      feedbackResetTimer = null;
    }
    input.canvas.style.cursor = initialCanvasCursor;
    input.onPointerFeedback?.({ phase: "idle" });
    if (renderFrame !== 0) cancelAnimationFrame(renderFrame);
    for (const { action } of clipActions) action.stop();
    for (const { mixer, root } of mixers) {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    }
    for (const mesh of skinnedMeshes) mesh.skeleton.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    timer.dispose();
    if (selectedHelper !== null) {
      selectedHelper.removeFromParent();
      disposeLoadedRootV1(selectedHelper);
      selectedHelper = null;
    }
    renderer.renderLists.dispose();
    renderer.dispose();
    scene.clear();
  };

  const ready = (async () => {
    const models = input.plan.objects.filter(
      (object): object is PetSceneRuntimeModelPlanV1 => object.kind === "model",
    );
    await Promise.all(models.map(loadModelV1));
    if (disposed) return;
    for (const object of input.plan.objects) {
      if (disposed) return;
      if (object.kind === "interaction-volume") attachVolumeV1(object);
    }
    requestRenderV1();
    input.onReady?.();
  })().catch((error: unknown) => {
    if (!disposed) input.onFailure?.(error);
    disposeV1();
    throw error;
  });

  const updateSelectionV1 = (objectId: string | null): void => {
    if (disposed) return;
    selectedObjectId = objectId;
    if (selectedHelper !== null) {
      selectedHelper.removeFromParent();
      disposeLoadedRootV1(selectedHelper);
      selectedHelper = null;
    }
    if (!(input.authoring ?? false) || objectId === null) {
      requestRenderV1();
      return;
    }
    const selected = selectableObjects.get(objectId);
    if (selected === undefined) {
      requestRenderV1();
      return;
    }
    const interactionPlan = interactionPlansById.get(objectId);
    if (interactionPlan !== undefined) {
      const direction = interactionPlan.interaction.preferredStrokeDirection;
      const length = interactionPlan.interaction.shape.kind === "sphere"
        ? interactionPlan.interaction.shape.radius * 1.4
        : Math.max(
          interactionPlan.interaction.shape.size.x,
          interactionPlan.interaction.shape.size.y,
          interactionPlan.interaction.shape.size.z,
        ) * 0.7;
      const marker = new ArrowHelper(
        new Vector3(direction.x, direction.y, direction.z),
        new Vector3(0, 0, 0),
        length,
        0x2868df,
        Math.min(length * 0.34, 0.16),
        Math.min(length * 0.22, 0.1),
      );
      marker.userData.selectionFor = selectedObjectId;
      selected.add(marker);
      selectedHelper = marker;
      requestRenderV1();
      return;
    }
    const marker = new Mesh(
      new SphereGeometry(0.11, 16, 12),
      new MeshStandardMaterial({ color: 0x4b7cf2, emissive: 0x163a92 }),
    );
    marker.userData.selectionFor = selectedObjectId;
    selected.add(marker);
    selectedHelper = marker;
    requestRenderV1();
  };

  updateSelectionV1(selectedObjectId);

  return {
    ready,
    setSelectedObject: updateSelectionV1,
    setCompanionPresentation: setCompanionPresentationV1,
    presentReaction: presentReactionV1,
    requestRender: requestRenderV1,
    metrics: () => ({ renderedFrames, activeAnimationFrames, lastFrameMs }),
    dispose: disposeV1,
  };
}

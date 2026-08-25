// SPDX-License-Identifier: MIT
import { digestCanonical } from "../../contracts/digest.ts";
import {
  sceneFromAuthoringRuntimePlanV1,
  type AuthoringSceneRuntimePlanV1,
  type AuthoringSceneRuntimeV1,
} from "../../contracts/scene.ts";
import type { Digest, PositiveSafeInteger } from "../../contracts/values.ts";
import { parsePositiveSafeInteger } from "../../contracts/values.ts";
import {
  createRuntimeUnitResidencyInternalV1,
  RuntimeUnitResidencyStaleErrorInternalV1,
} from "./runtime-unit-residency-internal.ts";

/** The build-known module shape emitted by the existing Authoring Scene compiler. */
export interface LoadedSceneUnitV1 {
  readonly sceneRuntimePlanV1: AuthoringSceneRuntimePlanV1;
}

export interface SceneUnitDescriptorV1 {
  readonly sceneId: string;
  /** Human-readable diagnostic/Inspector location; not application identity. */
  readonly source: string;
  /** Literal, build-known loader for an existing `#sillymaker/scene/*` binding. */
  readonly load: () => Promise<LoadedSceneUnitV1>;
}

export interface SceneUnitManifestV1 {
  readonly revision: PositiveSafeInteger;
  readonly scenes: readonly SceneUnitDescriptorV1[];
  /** Canonical generation identity over revision and sorted Scene topology. */
  readonly digest: Digest;
}

export interface DefineSceneUnitDescriptorV1 {
  /** Already admitted by the owning `sillymaker.config.sceneSources` boundary. */
  readonly sceneId: string;
  readonly source: string;
  readonly load: () => Promise<LoadedSceneUnitV1>;
}

export interface SceneUnitTimingV1 {
  readonly loadMs: number;
  readonly admitMs: number;
  readonly activateMs: number;
  readonly totalMs: number;
}

export interface ResidentSceneUnitV1 {
  readonly sceneId: string;
  readonly generation: Digest;
  /** Direct, activated Scene plan; command/render paths retain this reference. */
  readonly plan: AuthoringSceneRuntimeV1;
  readonly timing: SceneUnitTimingV1;
}

export interface SceneUnitLeaseV1 extends ResidentSceneUnitV1 {
  /** Releases only this acquisition. Repeated calls are no-ops. */
  release(): void;
}

export interface SceneUnitSessionV1 {
  readonly manifest: SceneUnitManifestV1;
  readonly generation: Digest;
  acquire(sceneId: string): Promise<SceneUnitLeaseV1>;
  /**
   * Non-owning cold-path lookup for readiness and instance binding.
   * Hot command/render paths retain the direct plan from their lease.
   */
  getResident(sceneId: string): ResidentSceneUnitV1 | null;
  dispose(): void;
}

export type SceneUnitErrorCodeV1 =
  | "scene_unit.manifest_invalid"
  | "scene_unit.scene_duplicate"
  | "scene_unit.scene_unknown"
  | "scene_unit.scene_identity_mismatch"
  | "scene_unit.session_stale";

export class SceneUnitErrorV1 extends TypeError {
  readonly code: SceneUnitErrorCodeV1;
  readonly reference: string | null;

  constructor(code: SceneUnitErrorCodeV1, reference: string | null = null) {
    super(reference === null ? code : `${code}:${reference}`);
    this.name = "SceneUnitErrorV1";
    this.code = code;
    this.reference = reference;
  }
}

function fail(code: SceneUnitErrorCodeV1, reference: string | null = null): never {
  throw new SceneUnitErrorV1(code, reference);
}

function normalizeDescriptorV1(
  input: DefineSceneUnitDescriptorV1,
  index: number,
): SceneUnitDescriptorV1 {
  // Scene ID syntax belongs to the existing project-config/source compiler.
  // This trusted composition boundary only needs an addressable non-empty key.
  if (typeof input?.sceneId !== "string" || input.sceneId.length === 0) {
    return fail("scene_unit.manifest_invalid", `scenes/${String(index)}/sceneId`);
  }
  if (typeof input.source !== "string" || input.source.trim().length === 0) {
    return fail("scene_unit.manifest_invalid", `${input.sceneId}/source`);
  }
  if (typeof input.load !== "function") {
    return fail("scene_unit.manifest_invalid", `${input.sceneId}/load`);
  }
  return {
    sceneId: input.sceneId,
    source: input.source,
    load: input.load,
  };
}

function compareSceneIdV1(left: SceneUnitDescriptorV1, right: SceneUnitDescriptorV1): number {
  return left.sceneId < right.sceneId ? -1 : left.sceneId > right.sceneId ? 1 : 0;
}

/**
 * Defines one build-known application-generation topology. Source labels and
 * loader functions are deliberately excluded: BuildIdentity owns code identity.
 */
export function defineSceneUnitManifestV1(input: {
  readonly revision: number;
  readonly scenes: readonly DefineSceneUnitDescriptorV1[];
}): SceneUnitManifestV1 {
  if (!Array.isArray(input.scenes)) return fail("scene_unit.manifest_invalid", "scenes");
  let revision: PositiveSafeInteger;
  try {
    revision = parsePositiveSafeInteger(input.revision);
  } catch {
    return fail("scene_unit.manifest_invalid", "revision");
  }

  const scenes = input.scenes.map(normalizeDescriptorV1).sort(compareSceneIdV1);
  for (let index = 1; index < scenes.length; index += 1) {
    if (scenes[index - 1]?.sceneId === scenes[index]?.sceneId) {
      return fail("scene_unit.scene_duplicate", scenes[index]?.sceneId ?? null);
    }
  }
  const digest = digestCanonical("sillymaker:scene-unit-manifest:v1", {
    revision,
    sceneIds: scenes.map((scene) => scene.sceneId),
  });
  return { revision, scenes, digest };
}

function leaseViewV1(
  sceneId: string,
  generation: Digest,
  lease: {
    readonly plan: AuthoringSceneRuntimeV1;
    readonly timing: SceneUnitTimingV1;
    release(): void;
  },
): SceneUnitLeaseV1 {
  return {
    sceneId,
    generation,
    plan: lease.plan,
    timing: lease.timing,
    release: lease.release,
  };
}

/**
 * Creates the Scene-specific residency owner for one application generation.
 * It reuses the existing compiled Scene modules; it does not introduce a
 * runtime path, bytes parser, or second Scene source declaration.
 */
export function createSceneUnitSessionV1(input: {
  readonly manifest: SceneUnitManifestV1;
  readonly now?: () => number;
}): SceneUnitSessionV1 {
  const generation = input.manifest.digest;
  const descriptors = new Map(
    input.manifest.scenes.map((descriptor) => [descriptor.sceneId, descriptor] as const),
  );
  const residency = createRuntimeUnitResidencyInternalV1<string, AuthoringSceneRuntimeV1>({
    generation,
    ...(input.now === undefined ? {} : { now: input.now }),
  });

  const acquire = async (sceneId: string): Promise<SceneUnitLeaseV1> => {
    // Resolve addressability before invoking application loader code.
    const descriptor = descriptors.get(sceneId);
    if (descriptor === undefined) return fail("scene_unit.scene_unknown", sceneId);

    try {
      const lease = await residency.acquire(sceneId, {
        load: descriptor.load,
        admit(loaded): AuthoringSceneRuntimePlanV1 {
          const plan = loaded.sceneRuntimePlanV1;
          if (plan.sceneDocument.sceneId !== sceneId) {
            return fail("scene_unit.scene_identity_mismatch", sceneId);
          }
          return plan;
        },
        activate: sceneFromAuthoringRuntimePlanV1,
      });
      return leaseViewV1(sceneId, generation, lease);
    } catch (error) {
      if (error instanceof RuntimeUnitResidencyStaleErrorInternalV1) {
        return fail("scene_unit.session_stale", sceneId);
      }
      throw error;
    }
  };

  return {
    manifest: input.manifest,
    generation,
    acquire,
    getResident(sceneId: string): ResidentSceneUnitV1 | null {
      const resident = residency.getResident(sceneId);
      if (resident === null) return null;
      return {
        sceneId,
        generation,
        plan: resident.plan,
        timing: resident.timing,
      };
    },
    dispose: residency.dispose,
  };
}

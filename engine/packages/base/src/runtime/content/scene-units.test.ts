// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import type { AuthoringSceneRuntimePlanV1 } from "../../contracts/scene.ts";
import {
  createSceneUnitSessionV1,
  defineSceneUnitManifestV1,
  type DefineSceneUnitDescriptorV1,
  SceneUnitErrorV1,
} from "./scene-units.ts";

function runtimePlanV1(sceneId: string): AuthoringSceneRuntimePlanV1 {
  return {
    sourceKind: "authoring_scene",
    sceneDocument: {
      format: "sillymaker.scene",
      version: 1,
      sceneId,
      label: sceneId,
      canvas: { width: 1280, height: 720 },
      entries: [],
      cues: [],
    },
    orderedLayerIds: [],
  };
}

function descriptorV1(input: {
  readonly sceneId: string;
  readonly source?: string;
  readonly load?: DefineSceneUnitDescriptorV1["load"];
}): DefineSceneUnitDescriptorV1 {
  return {
    sceneId: input.sceneId,
    source: input.source ?? `src/scenes/${input.sceneId}.scene.json`,
    load: input.load ??
      (() => Promise.resolve({ sceneRuntimePlanV1: runtimePlanV1(input.sceneId) })),
  };
}

function deferredV1<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("Scene runtime units", () => {
  it("normalizes revision and sorted Scene topology without loading or hashing source/code", () => {
    const openingLoad = vi.fn(() =>
      Promise.resolve({ sceneRuntimePlanV1: runtimePlanV1("scene.app.opening") })
    );
    const endingLoad = vi.fn(() =>
      Promise.resolve({ sceneRuntimePlanV1: runtimePlanV1("scene.app.ending") })
    );
    const manifest = defineSceneUnitManifestV1({
      revision: 1,
      scenes: [
        descriptorV1({ sceneId: "scene.app.opening", load: openingLoad }),
        descriptorV1({ sceneId: "scene.app.ending", load: endingLoad }),
      ],
    });
    const sameTopology = defineSceneUnitManifestV1({
      revision: 1,
      scenes: [
        descriptorV1({
          sceneId: "scene.app.ending",
          source: "moved/ending.json",
          load: async () => ({ sceneRuntimePlanV1: runtimePlanV1("scene.app.ending") }),
        }),
        descriptorV1({
          sceneId: "scene.app.opening",
          source: "moved/opening.json",
          load: async () => ({ sceneRuntimePlanV1: runtimePlanV1("scene.app.opening") }),
        }),
      ],
    });

    expect(openingLoad).not.toHaveBeenCalled();
    expect(endingLoad).not.toHaveBeenCalled();
    expect(manifest.scenes.map((scene) => scene.sceneId)).toEqual([
      "scene.app.ending",
      "scene.app.opening",
    ]);
    expect(manifest.digest).toBe(sameTopology.digest);
    expect(
      defineSceneUnitManifestV1({
        revision: 2,
        scenes: manifest.scenes,
      }).digest,
    ).not.toBe(manifest.digest);
  });

  it("rejects malformed declarations and duplicate Scene addresses", () => {
    const opening = descriptorV1({ sceneId: "scene.app.opening" });
    expect(() => defineSceneUnitManifestV1({ revision: 1, scenes: [opening, { ...opening }] }))
      .toThrow("scene_unit.scene_duplicate:scene.app.opening");
    expect(() => defineSceneUnitManifestV1({ revision: 0, scenes: [opening] })).toThrow(
      "scene_unit.manifest_invalid:revision",
    );
    expect(() =>
      defineSceneUnitManifestV1({
        revision: 1,
        scenes: [{ ...opening, sceneId: "" }],
      })
    ).toThrow("scene_unit.manifest_invalid:scenes/0/sceneId");
    expect(() =>
      defineSceneUnitManifestV1({
        revision: 1,
        scenes: [{ ...opening, source: "   " }],
      })
    ).toThrow("scene_unit.manifest_invalid:scene.app.opening/source");
    expect(() =>
      defineSceneUnitManifestV1({
        revision: 1,
        scenes: [{ ...opening, load: null as never }],
      })
    ).toThrow("scene_unit.manifest_invalid:scene.app.opening/load");
  });

  it("rejects an unknown Scene before IO and single-flights independent direct-plan leases", async () => {
    const loaded = deferredV1<{ readonly sceneRuntimePlanV1: AuthoringSceneRuntimePlanV1 }>();
    const load = vi.fn(() => loaded.promise);
    const manifest = defineSceneUnitManifestV1({
      revision: 1,
      scenes: [descriptorV1({ sceneId: "scene.app.opening", load })],
    });
    const timestamps = [0, 5, 7, 9];
    const session = createSceneUnitSessionV1({
      manifest,
      now: () => timestamps.shift() ?? 9,
    });

    await expect(session.acquire("scene.app.unknown")).rejects.toEqual(
      new SceneUnitErrorV1("scene_unit.scene_unknown", "scene.app.unknown"),
    );
    expect(load).not.toHaveBeenCalled();

    const first = session.acquire("scene.app.opening");
    const second = session.acquire("scene.app.opening");
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    loaded.resolve({ sceneRuntimePlanV1: runtimePlanV1("scene.app.opening") });
    const [firstLease, secondLease] = await Promise.all([first, second]);

    expect(load).toHaveBeenCalledOnce();
    expect(firstLease).not.toBe(secondLease);
    expect(firstLease.plan).toBe(secondLease.plan);
    expect(firstLease.plan.sceneId).toBe("scene.app.opening");
    expect(firstLease.generation).toBe(manifest.digest);
    expect(firstLease.timing).toEqual({
      loadMs: 5,
      admitMs: 2,
      activateMs: 2,
      totalMs: 9,
    });
    expect(session.getResident("scene.app.opening")?.plan).toBe(firstLease.plan);

    firstLease.release();
    firstLease.release();
    expect(session.getResident("scene.app.opening")?.plan).toBe(secondLease.plan);
    secondLease.release();
    secondLease.release();
    expect(session.getResident("scene.app.opening")).toBeNull();
  });

  it("retries an exact identity mismatch without replacing an unrelated predecessor", async () => {
    const candidateLoad = vi.fn()
      .mockResolvedValueOnce({ sceneRuntimePlanV1: runtimePlanV1("scene.app.wrong") })
      .mockResolvedValueOnce({ sceneRuntimePlanV1: runtimePlanV1("scene.app.candidate") });
    const manifest = defineSceneUnitManifestV1({
      revision: 1,
      scenes: [
        descriptorV1({ sceneId: "scene.app.predecessor" }),
        descriptorV1({ sceneId: "scene.app.candidate", load: candidateLoad }),
      ],
    });
    const session = createSceneUnitSessionV1({ manifest });
    const predecessor = await session.acquire("scene.app.predecessor");

    await expect(session.acquire("scene.app.candidate")).rejects.toEqual(
      new SceneUnitErrorV1("scene_unit.scene_identity_mismatch", "scene.app.candidate"),
    );
    expect(session.getResident("scene.app.candidate")).toBeNull();
    expect(session.getResident("scene.app.predecessor")?.plan).toBe(predecessor.plan);

    const candidate = await session.acquire("scene.app.candidate");
    expect(candidateLoad).toHaveBeenCalledTimes(2);
    expect(candidate.plan.sceneId).toBe("scene.app.candidate");
    expect(session.getResident("scene.app.predecessor")?.plan).toBe(predecessor.plan);

    predecessor.release();
    candidate.release();
  });

  it("fences a loader that settles after the application generation is disposed", async () => {
    const loaded = deferredV1<{ readonly sceneRuntimePlanV1: AuthoringSceneRuntimePlanV1 }>();
    const load = vi.fn(() => loaded.promise);
    const manifest = defineSceneUnitManifestV1({
      revision: 1,
      scenes: [descriptorV1({ sceneId: "scene.app.opening", load })],
    });
    const session = createSceneUnitSessionV1({ manifest });
    const acquiring = session.acquire("scene.app.opening");
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());

    session.dispose();
    loaded.resolve({ sceneRuntimePlanV1: runtimePlanV1("scene.app.opening") });
    await expect(acquiring).rejects.toEqual(
      new SceneUnitErrorV1("scene_unit.session_stale", "scene.app.opening"),
    );
    expect(session.getResident("scene.app.opening")).toBeNull();
    await expect(session.acquire("scene.app.opening")).rejects.toEqual(
      new SceneUnitErrorV1("scene_unit.session_stale", "scene.app.opening"),
    );
    expect(load).toHaveBeenCalledOnce();
  });
});

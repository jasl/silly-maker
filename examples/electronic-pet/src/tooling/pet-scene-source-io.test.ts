// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PetSceneDocumentV1 } from "../authoring/contract.ts";
import { electronicPetM1SceneDocumentV1 } from "../authoring/default-document.ts";
import { petSceneSourcePathV1, petSceneSourceRouteV1 } from "./pet-scene-source-contract.ts";
import { createPetSceneSourceIoV1 } from "./pet-scene-source-io.ts";

function jsonResponseV1(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Electronic Pet scene browser source IO", () => {
  it("admits one GET response and writes the trusted draft with its CAS digest", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponseV1({
        path: petSceneSourcePathV1,
        digest: "sha256:opened",
        document: electronicPetM1SceneDocumentV1,
      }))
      .mockResolvedValueOnce(jsonResponseV1({ digest: "sha256:written" }));
    vi.stubGlobal("fetch", fetchMock);
    const io = createPetSceneSourceIoV1();

    await expect(io.read(petSceneSourcePathV1)).resolves.toMatchObject({
      kind: "ok",
      digest: "sha256:opened",
      document: { sceneId: "scene.electronic-pet.home" },
    });
    const edited = {
      ...electronicPetM1SceneDocumentV1,
      label: "Edited home",
    } satisfies PetSceneDocumentV1;
    await expect(io.write({
      path: petSceneSourcePathV1,
      expectedDigest: "sha256:opened",
      document: edited,
    })).resolves.toEqual({ kind: "ok", digest: "sha256:written" });

    expect(fetchMock).toHaveBeenNthCalledWith(1, petSceneSourceRouteV1);
    const [writeUrl, writeInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(writeUrl).toBe(petSceneSourceRouteV1);
    expect(writeInit.method).toBe("PUT");
    expect(JSON.parse(String(writeInit.body))).toEqual({
      expectedDigest: "sha256:opened",
      document: edited,
    });
  });

  it("preserves digest conflicts and rejects invalid successful data", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponseV1({ error: "digest_conflict" }, 409))
      .mockResolvedValueOnce(jsonResponseV1({
        digest: "sha256:invalid",
        document: { ...electronicPetM1SceneDocumentV1, label: "" },
      }));
    vi.stubGlobal("fetch", fetchMock);
    const io = createPetSceneSourceIoV1();

    await expect(io.write({
      path: petSceneSourcePathV1,
      expectedDigest: "sha256:stale",
      document: electronicPetM1SceneDocumentV1,
    })).resolves.toEqual({ kind: "error", code: "digest_conflict" });
    await expect(io.read(petSceneSourcePathV1)).resolves.toEqual({
      kind: "error",
      code: "pet_scene_invalid",
    });
  });
});

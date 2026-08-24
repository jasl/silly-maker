// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from "vitest";

import { admitAuthoringSceneDocumentV1 } from "@sillymaker/base/authoring/scene";

import { createDevServerAuthoringSceneIoV1 } from "./authoring-scene-io.ts";

function sceneDocumentV1(label = "Opening") {
  return {
    format: "sillymaker.authoring-scene",
    version: 1,
    sceneId: "scene.test.opening",
    label,
    canvas: { width: 1280, height: 720 },
    layers: [
      {
        layerId: "layer.test.characters",
        label: "Characters",
        roots: [
          {
            objectId: "tag.test.hero",
            label: "Hero",
            visual: {
              contentId: "content.test.hero",
              appearance: { expression: "calm" },
            },
          },
        ],
      },
    ],
    cues: [],
  } as const;
}

function jsonResponseV1(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createDevServerAuthoringSceneIoV1", () => {
  it("admits the list response as ordinary boundary data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponseV1({
      scenes: [{
        path: "src/scenes/opening.authoring-scene.json",
        sceneId: "scene.test.opening",
        label: "Opening",
      }],
      skipped: [{
        path: "src/scenes/broken.authoring-scene.json",
        reason: "invalid JSON",
      }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createDevServerAuthoringSceneIoV1().list()).resolves.toEqual({
      kind: "ok",
      scenes: [{
        path: "src/scenes/opening.authoring-scene.json",
        sceneId: "scene.test.opening",
        label: "Opening",
      }],
      skipped: [{
        path: "src/scenes/broken.authoring-scene.json",
        reason: "invalid JSON",
      }],
    });
    expect(fetchMock).toHaveBeenCalledWith("/__sillymaker/dev-sources/authoring-scenes");
  });

  it("rejects malformed list fields instead of preserving an older response shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponseV1({ scenes: [] })));

    await expect(createDevServerAuthoringSceneIoV1().list()).resolves.toEqual({
      kind: "error",
      code: "unavailable",
    });
  });

  it("admits a read document once and retains its source map with the digest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponseV1({
        digest: "sha256:read",
        sceneDocument: sceneDocumentV1(),
      })),
    );

    const result = await createDevServerAuthoringSceneIoV1().read(
      "src/scenes/opening.authoring-scene.json",
    );
    if (result.kind !== "ok") throw new Error(`read failed: ${result.code}`);
    expect(result.digest).toBe("sha256:read");
    expect(result.admittedScene.document.sceneId).toBe("scene.test.opening");
    expect(result.admittedScene.sourceMap.objects[0]?.jsonPointer).toBe("/layers/0/roots/0");
  });

  it("maps an invalid successful read payload to unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponseV1({
        digest: "sha256:read",
        sceneDocument: { ...sceneDocumentV1(), label: "" },
      })),
    );

    await expect(
      createDevServerAuthoringSceneIoV1().read("src/scenes/opening.authoring-scene.json"),
    ).resolves.toEqual({ kind: "error", code: "unavailable" });
  });

  it("writes the admitted document under its exact CAS digest", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponseV1({ digest: "sha256:written" }));
    vi.stubGlobal("fetch", fetchMock);
    const io = createDevServerAuthoringSceneIoV1();
    const admittedScene = admitAuthoringSceneDocumentV1(sceneDocumentV1("Edited"));

    await expect(io.write({
      path: "src/scenes/opening.authoring-scene.json",
      expectedDigest: "sha256:read",
      admittedScene,
    })).resolves.toEqual({ kind: "ok", digest: "sha256:written" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      path: "src/scenes/opening.authoring-scene.json",
      expectedDigest: "sha256:read",
      sceneDocument: admittedScene.document,
    });
  });

  it("preserves the server's real digest conflict and collapses unknown failures", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponseV1({ error: "digest_conflict" }, 409))
      .mockResolvedValueOnce(jsonResponseV1({ error: "invented" }, 409));
    vi.stubGlobal("fetch", fetchMock);
    const io = createDevServerAuthoringSceneIoV1();
    const admittedScene = admitAuthoringSceneDocumentV1(sceneDocumentV1());
    const input = {
      path: "src/scenes/opening.authoring-scene.json",
      expectedDigest: "sha256:read",
      admittedScene,
    };

    await expect(io.write(input)).resolves.toEqual({
      kind: "error",
      code: "digest_conflict",
    });
    await expect(io.write(input)).resolves.toEqual({ kind: "error", code: "unavailable" });
  });
});

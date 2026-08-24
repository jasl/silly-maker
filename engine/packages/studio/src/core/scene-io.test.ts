// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDevServerSceneIoV1 } from "./scene-io.ts";

function responseV1(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const sceneV1 = {
  format: "sillymaker.scene",
  version: 1,
  sceneId: "scene.test.low-level",
  label: "Low-level Scene",
  canvas: { width: 1280, height: 720 },
  entries: [],
  cues: [],
} as const;

afterEach(() => vi.unstubAllGlobals());

describe("createDevServerSceneIoV1", () => {
  it("admits list and read responses from the low-level Scene port", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(responseV1({
        scenes: [{
          path: "src/scenes/advanced.scene.json",
          sceneId: sceneV1.sceneId,
          label: sceneV1.label,
        }],
        skipped: [],
      }))
      .mockResolvedValueOnce(responseV1({ digest: "sha256:read", sceneDocument: sceneV1 }));
    vi.stubGlobal("fetch", fetchMock);
    const io = createDevServerSceneIoV1();

    await expect(io.list()).resolves.toMatchObject({
      kind: "ok",
      scenes: [{ sceneId: sceneV1.sceneId }],
      skipped: [],
    });
    await expect(io.read("src/scenes/advanced.scene.json")).resolves.toMatchObject({
      kind: "ok",
      digest: "sha256:read",
      sceneDocument: { sceneId: sceneV1.sceneId },
    });
  });

  it("preserves CAS conflicts when writing a trusted typed document", async () => {
    const fetchMock = vi.fn().mockResolvedValue(responseV1({ error: "digest_conflict" }, 409));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createDevServerSceneIoV1().write({
        path: "src/scenes/advanced.scene.json",
        expectedDigest: "sha256:read",
        sceneDocument: sceneV1,
      }),
    ).resolves.toEqual({ kind: "error", code: "digest_conflict" });
  });
});

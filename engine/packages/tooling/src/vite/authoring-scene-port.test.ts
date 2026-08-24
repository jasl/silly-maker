// SPDX-License-Identifier: MIT
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAuthoringProjectIndexOwnerV1,
  type AuthoringProjectIndexOwnerV1,
} from "../project/authoring-index.ts";
import {
  createAuthoringScenePortMiddlewareV1,
  formatAuthoringSceneDocumentV1,
  listAuthoringSceneSourceFilesV1,
  readAuthoringSceneSourceFileV1,
  writeAuthoringSceneSourceFileV1,
} from "./authoring-scene-port.ts";

const scenePathV1 = "src/scenes/opening/opening.authoring-scene.json";

function transformV1(overrides: Partial<{
  x: number;
  y: number;
  scalePermille: number;
  opacityPermille: number;
  mirrored: boolean;
}> = {}) {
  return {
    x: 0,
    y: 0,
    scalePermille: 1000,
    opacityPermille: 1000,
    mirrored: false,
    ...overrides,
  };
}

function sceneDocumentV1(label = "开场") {
  return {
    format: "sillymaker.authoring-scene",
    version: 1,
    sceneId: "scene.test.opening",
    label,
    canvas: { width: 1280, height: 720 },
    layers: [
      {
        layerId: "layer.test.characters",
        label: "角色",
        roots: [
          {
            objectId: "tag.test.hero",
            label: "主角",
            localTransform: transformV1({ x: 920, y: 600 }),
            visual: {
              contentId: "content.test.character.hero",
              appearance: { expression: "calm" },
            },
            children: [],
          },
        ],
      },
    ],
    cues: [
      { cueId: "cue.test.opening.hero-enters", kind: "show", objectId: "tag.test.hero" },
    ],
  } as const;
}

function lowLevelSceneV1() {
  return {
    format: "sillymaker.scene",
    version: 1,
    sceneId: "scene.test.low-level",
    label: "Low level",
    canvas: { width: 1280, height: 720 },
    entries: [],
    cues: [],
  } as const;
}

let appRoot = "";
let projectIndexOwner: AuthoringProjectIndexOwnerV1;

beforeEach(() => {
  appRoot = mkdtempSync(join(tmpdir(), "sillymaker-scene-port-"));
  mkdirSync(join(appRoot, "src", "scenes", "opening"), { recursive: true });
  writeFileSync(join(appRoot, scenePathV1), `${JSON.stringify(sceneDocumentV1())}\n`);
  projectIndexOwner = createAuthoringProjectIndexOwnerV1(appRoot);
});

afterEach(() => {
  rmSync(appRoot, { recursive: true, force: true });
});

describe("listAuthoringSceneSourceFilesV1", () => {
  it("lists only admitted Authoring Scenes and names only their rejected sources", () => {
    writeFileSync(
      join(appRoot, "src", "scenes", "legacy.scene.json"),
      `${JSON.stringify(lowLevelSceneV1())}\n`,
    );
    writeFileSync(join(appRoot, "src", "scenes", "broken.authoring-scene.json"), "{ nope\n");
    writeFileSync(join(appRoot, "src", "scenes", "broken.scene.json"), "{ nope\n");

    const index = projectIndexOwner.snapshot();
    const countersBeforeList = projectIndexOwner.counters();
    expect(listAuthoringSceneSourceFilesV1(index)).toEqual({
      scenes: [{ path: scenePathV1, sceneId: "scene.test.opening", label: "开场" }],
      skipped: [{
        path: "src/scenes/broken.authoring-scene.json",
        reason: expect.any(String),
      }],
    });
    expect(projectIndexOwner.counters()).toEqual(countersBeforeList);
  });
});

describe("readAuthoringSceneSourceFileV1", () => {
  it("strictly admits source bytes and returns the document/source-map pair with its digest", () => {
    const read = readAuthoringSceneSourceFileV1(appRoot, scenePathV1);
    if (read.kind !== "ok") throw new Error(`read failed: ${read.code}`);
    expect(read.admittedScene.document.sceneId).toBe("scene.test.opening");
    expect(read.admittedScene.sourceMap.objects).toEqual([
      {
        objectId: "tag.test.hero",
        layerId: "layer.test.characters",
        jsonPointer: "/layers/0/roots/0",
      },
    ]);
    expect(read.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });

  it("rejects the old suffix, missing files, and non-strict Authoring Scene bytes", () => {
    writeFileSync(
      join(appRoot, "src", "scenes", "duplicate.authoring-scene.json"),
      '{"format":"sillymaker.authoring-scene","format":"sillymaker.authoring-scene"}\n',
    );
    expect(readAuthoringSceneSourceFileV1(appRoot, "src/scenes/legacy.scene.json")).toMatchObject({
      code: "bad_request",
    });
    expect(
      readAuthoringSceneSourceFileV1(appRoot, "src/scenes/missing.authoring-scene.json"),
    ).toMatchObject({ code: "not_found" });
    expect(
      readAuthoringSceneSourceFileV1(appRoot, "src/scenes/duplicate.authoring-scene.json"),
    ).toMatchObject({ code: "authoring_scene_invalid" });
  });
});

describe("writeAuthoringSceneSourceFileV1", () => {
  it("commits one admitted and compiled CAS candidate with deterministic formatting", () => {
    const read = readAuthoringSceneSourceFileV1(appRoot, scenePathV1);
    if (read.kind !== "ok") throw new Error("read failed");

    const write = writeAuthoringSceneSourceFileV1(appRoot, {
      path: scenePathV1,
      expectedDigest: read.digest,
      sceneDocument: sceneDocumentV1("新的开场"),
    });
    if (write.kind !== "ok") throw new Error(`write failed: ${write.code}`);

    const reread = readAuthoringSceneSourceFileV1(appRoot, scenePathV1);
    if (reread.kind !== "ok") throw new Error("reread failed");
    const bytes = readFileSync(join(appRoot, scenePathV1), "utf8");
    expect(reread.admittedScene.document.label).toBe("新的开场");
    expect(reread.digest).toBe(write.digest);
    expect(bytes).toBe(formatAuthoringSceneDocumentV1(reread.admittedScene.document));
  });

  it("atomically rejects stale, inadmissible, un-compilable, and renamed candidates", () => {
    const read = readAuthoringSceneSourceFileV1(appRoot, scenePathV1);
    if (read.kind !== "ok") throw new Error("read failed");

    expect(
      writeAuthoringSceneSourceFileV1(appRoot, {
        path: scenePathV1,
        expectedDigest: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        sceneDocument: sceneDocumentV1(),
      }),
    ).toMatchObject({ code: "digest_conflict" });
    expect(
      writeAuthoringSceneSourceFileV1(appRoot, {
        path: scenePathV1,
        expectedDigest: read.digest,
        sceneDocument: { ...sceneDocumentV1(), label: "" },
      }),
    ).toMatchObject({ code: "authoring_scene_invalid" });

    const unCompilable = sceneDocumentV1();
    const root = unCompilable.layers[0].roots[0];
    expect(
      writeAuthoringSceneSourceFileV1(appRoot, {
        path: scenePathV1,
        expectedDigest: read.digest,
        sceneDocument: {
          ...unCompilable,
          layers: [{
            ...unCompilable.layers[0],
            roots: [{
              ...root,
              localTransform: transformV1({ scalePermille: 100_000 }),
              children: [{
                objectId: "tag.test.child",
                label: "Child",
                localTransform: transformV1({ scalePermille: 100_000 }),
                visual: { contentId: "content.test.child", appearance: {} },
                children: [],
              }],
            }],
          }],
        },
      }),
    ).toMatchObject({ code: "authoring_scene_invalid" });
    expect(
      writeAuthoringSceneSourceFileV1(appRoot, {
        path: scenePathV1,
        expectedDigest: read.digest,
        sceneDocument: { ...sceneDocumentV1(), sceneId: "scene.test.renamed" },
      }),
    ).toMatchObject({ code: "scene_id_mismatch" });

    const reread = readAuthoringSceneSourceFileV1(appRoot, scenePathV1);
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(reread.digest).toBe(read.digest);
  });
});

describe("createAuthoringScenePortMiddlewareV1", () => {
  it("rejects the removed null-digest create form", async () => {
    const middleware = createAuthoringScenePortMiddlewareV1({ appRoot, projectIndexOwner });
    const request = Readable.from([
      JSON.stringify({
        path: "src/scenes/new.authoring-scene.json",
        expectedDigest: null,
        sceneDocument: sceneDocumentV1(),
      }),
    ]) as IncomingMessage;
    request.method = "POST";
    request.url = "/__sillymaker/dev-sources/authoring-scene";

    const result = await new Promise<{ readonly status: number; readonly body: unknown }>(
      (resolve) => {
        let status = 0;
        const response = {
          set statusCode(value: number) {
            status = value;
          },
          get statusCode(): number {
            return status;
          },
          setHeader: () => {},
          end: (body?: unknown) => resolve({ status, body }),
        } as unknown as ServerResponse;
        middleware(request, response, () => {
          throw new Error("scene middleware must not fall through");
        });
      },
    );

    expect(result.status).toBe(400);
    expect(JSON.parse(String(result.body))).toEqual({ error: "bad_request" });
  });
});

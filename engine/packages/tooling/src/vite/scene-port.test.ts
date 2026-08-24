// SPDX-License-Identifier: MIT
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAuthoringProjectIndexOwnerV1,
  type AuthoringProjectIndexOwnerV1,
} from "../project/authoring-index.ts";
import {
  createSceneSourceFileV1,
  formatSceneDocumentV1,
  listSceneSourceFilesV1,
  readSceneSourceFileV1,
  writeSceneSourceFileV1,
} from "./scene-port.ts";

const scenePathV1 = "src/scenes/opening/opening.scene.json";

const sceneJsonV1 = {
  format: "sillymaker.scene",
  version: 1,
  sceneId: "scene.test.opening",
  label: "开场",
  canvas: { width: 1280, height: 720 },
  entries: [
    {
      layerId: "layer.test.characters",
      tag: "tag.hero",
      contentId: "content.test.character.hero",
      zOrder: 10,
      placement: { x: 920, y: 600, scalePermille: 1000, opacityPermille: 1000, mirrored: false },
    },
  ],
  cues: [
    { cueId: "cue.test.opening.hero-enters", kind: "show", tag: "tag.hero" },
  ],
} as const;

let appRoot = "";
let projectIndexOwner: AuthoringProjectIndexOwnerV1;

beforeEach(() => {
  appRoot = mkdtempSync(join(tmpdir(), "sillymaker-scene-port-"));
  mkdirSync(join(appRoot, "src", "scenes", "opening"), { recursive: true });
  writeFileSync(join(appRoot, scenePathV1), `${JSON.stringify(sceneJsonV1, null, 2)}\n`);
  projectIndexOwner = createAuthoringProjectIndexOwnerV1(appRoot);
});

afterEach(() => {
  rmSync(appRoot, { recursive: true, force: true });
});

describe("listSceneSourceFilesV1", () => {
  it("lists admissible scenes and names inadmissible files with a reason", () => {
    writeFileSync(join(appRoot, "src", "scenes", "broken.scene.json"), "{ nope\n");
    const index = projectIndexOwner.snapshot();
    const countersBeforeList = projectIndexOwner.counters();
    const listed = listSceneSourceFilesV1(index);
    expect(listed.scenes).toEqual([
      { path: scenePathV1, sceneId: "scene.test.opening", label: "开场" },
    ]);
    expect(listed.skipped).toHaveLength(1);
    expect(listed.skipped[0]?.path).toBe("src/scenes/broken.scene.json");
    expect(listed.skipped[0]?.reason.length).toBeGreaterThan(0);
    expect(projectIndexOwner.counters()).toEqual(countersBeforeList);
  });
});

describe("readSceneSourceFileV1", () => {
  it("returns the parsed document with a content digest", () => {
    const read = readSceneSourceFileV1(appRoot, scenePathV1);
    if (read.kind !== "ok") throw new Error(`read failed: ${read.code}`);
    expect(read.sceneDocument.sceneId).toBe("scene.test.opening");
    expect(read.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
  });

  it("rejects non-scene paths, missing files, and invalid contents", () => {
    writeFileSync(join(appRoot, "src", "scenes", "bad.scene.json"), "{ nope\n");
    expect(readSceneSourceFileV1(appRoot, "src/scenes/opening/opening.json")).toMatchObject({
      code: "bad_request",
    });
    expect(readSceneSourceFileV1(appRoot, "src/scenes/missing.scene.json")).toMatchObject({
      code: "not_found",
    });
    expect(readSceneSourceFileV1(appRoot, "src/scenes/bad.scene.json")).toMatchObject({
      code: "scene_invalid",
    });
  });
});

describe("writeSceneSourceFileV1", () => {
  it("commits a valid CAS write with deterministic formatting", () => {
    const read = readSceneSourceFileV1(appRoot, scenePathV1);
    if (read.kind !== "ok") throw new Error("read failed");

    const edited = {
      ...sceneJsonV1,
      entries: [
        {
          ...sceneJsonV1.entries[0],
          placement: { ...sceneJsonV1.entries[0].placement, x: 640 },
        },
      ],
    };
    const write = writeSceneSourceFileV1(appRoot, {
      path: scenePathV1,
      expectedDigest: read.digest,
      sceneDocument: edited,
    });
    if (write.kind !== "ok") throw new Error(`write failed: ${write.code}`);

    const bytes = readFileSync(join(appRoot, scenePathV1), "utf8");
    expect(bytes).toContain('"x": 640');
    expect(bytes.endsWith("\n")).toBe(true);
    const reread = readSceneSourceFileV1(appRoot, scenePathV1);
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(reread.digest).toBe(write.digest);
    expect(bytes).toBe(formatSceneDocumentV1(reread.sceneDocument));
  });

  it("rejects stale digests, invalid documents, and scene-id changes", () => {
    const read = readSceneSourceFileV1(appRoot, scenePathV1);
    if (read.kind !== "ok") throw new Error("read failed");

    expect(
      writeSceneSourceFileV1(appRoot, {
        path: scenePathV1,
        expectedDigest: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        sceneDocument: sceneJsonV1,
      }),
    ).toMatchObject({ code: "digest_conflict" });

    expect(
      writeSceneSourceFileV1(appRoot, {
        path: scenePathV1,
        expectedDigest: read.digest,
        sceneDocument: { ...sceneJsonV1, label: "" },
      }),
    ).toMatchObject({ code: "scene_invalid" });

    expect(
      writeSceneSourceFileV1(appRoot, {
        path: scenePathV1,
        expectedDigest: read.digest,
        sceneDocument: { ...sceneJsonV1, sceneId: "scene.test.renamed" },
      }),
    ).toMatchObject({ code: "scene_id_mismatch" });

    // The rejected writes never touched the file.
    const reread = readSceneSourceFileV1(appRoot, scenePathV1);
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(reread.digest).toBe(read.digest);
  });
});

describe("createSceneSourceFileV1", () => {
  const newSceneJsonV1 = {
    format: "sillymaker.scene",
    version: 1,
    sceneId: "scene.test.garden",
    label: "后院",
    canvas: { width: 1280, height: 720 },
    entries: [],
    cues: [],
  } as const;

  it("creates a new scene (missing directories included) and indexes it", () => {
    const created = createSceneSourceFileV1(appRoot, projectIndexOwner.snapshot(), {
      path: "src/scenes/garden/garden.scene.json",
      sceneDocument: newSceneJsonV1,
    });
    if (created.kind !== "ok") throw new Error(`create failed: ${created.code}`);
    projectIndexOwner.invalidate("src/scenes/garden/garden.scene.json");
    const reread = readSceneSourceFileV1(appRoot, "src/scenes/garden/garden.scene.json");
    if (reread.kind !== "ok") throw new Error("reread failed");
    expect(reread.digest).toBe(created.digest);
    expect(
      listSceneSourceFilesV1(projectIndexOwner.snapshot()).scenes.map((scene) => scene.sceneId),
    )
      .toEqual(["scene.test.garden", "scene.test.opening"]);
  });

  it("rejects existing files, duplicate scene ids, and id-stem mismatches", () => {
    expect(
      createSceneSourceFileV1(appRoot, projectIndexOwner.snapshot(), {
        path: scenePathV1,
        sceneDocument: sceneJsonV1,
      }),
    ).toMatchObject({ code: "already_exists" });

    expect(
      createSceneSourceFileV1(appRoot, projectIndexOwner.snapshot(), {
        path: "src/scenes/copy/copy.scene.json",
        sceneDocument: { ...newSceneJsonV1, sceneId: "scene.test.opening" },
      }),
    ).toMatchObject({ code: "scene_id_mismatch" });

    expect(
      createSceneSourceFileV1(appRoot, projectIndexOwner.snapshot(), {
        path: "src/scenes/opening2/opening.scene.json",
        sceneDocument: { ...newSceneJsonV1, sceneId: "scene.test.opening" },
      }),
    ).toMatchObject({ code: "already_exists" });

    expect(
      createSceneSourceFileV1(appRoot, projectIndexOwner.snapshot(), {
        path: "src/scenes/other/other.scene.json",
        sceneDocument: { ...newSceneJsonV1, sceneId: "scene.test.garden" },
      }),
    ).toMatchObject({ code: "scene_id_mismatch" });

    expect(
      createSceneSourceFileV1(appRoot, projectIndexOwner.snapshot(), {
        path: "src/scenes/broken/broken.scene.json",
        sceneDocument: { nope: true },
      }),
    ).toMatchObject({ code: "scene_invalid" });

    expect(
      createSceneSourceFileV1(appRoot, projectIndexOwner.snapshot(), {
        path: "../outside/outside.scene.json",
        sceneDocument: newSceneJsonV1,
      }),
    ).toMatchObject({ code: "bad_request" });
  });
});

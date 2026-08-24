// SPDX-License-Identifier: MIT
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  copyRuntimeAssetsV1,
  resolveRuntimeAssetPathV1,
  runtimeAssetContentTypeV1,
} from "./runtime-assets.ts";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixtureV1(): Promise<{
  readonly root: string;
  readonly assets: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "sillymaker-assets-"));
  temporaryRoots.push(root);
  const assets = join(root, "assets");
  await mkdir(join(assets, "images"), { recursive: true });
  await writeFile(join(assets, "images", "cover.webp"), "asset", "utf8");
  return { root, assets };
}

describe("runtime asset path resolution", () => {
  it("serves only regular files below the asset root", async () => {
    const fixture = await fixtureV1();
    expect(resolveRuntimeAssetPathV1(fixture.assets, "images/cover.webp")).toEqual({
      kind: "file",
      filePath: join(fixture.assets, "images", "cover.webp"),
    });
    expect(resolveRuntimeAssetPathV1(fixture.assets, "images")).toEqual({ kind: "not_found" });
  });

  it("rejects traversal, malformed encoding, absolute paths, and backslashes", async () => {
    const fixture = await fixtureV1();
    expect(resolveRuntimeAssetPathV1(fixture.assets, "../outside/secret.txt")).toEqual({
      kind: "not_found",
    });
    expect(resolveRuntimeAssetPathV1(fixture.assets, "%2e%2e/outside/secret.txt")).toEqual({
      kind: "not_found",
    });
    expect(resolveRuntimeAssetPathV1(fixture.assets, "%E0%A4%A")).toEqual({
      kind: "bad_request",
    });
    expect(resolveRuntimeAssetPathV1(fixture.assets, "%2Fetc/passwd")).toEqual({
      kind: "bad_request",
    });
    expect(resolveRuntimeAssetPathV1(fixture.assets, "images%5Ccover.webp")).toEqual({
      kind: "bad_request",
    });
  });

  it("maps common runtime media types without trusting the request header", () => {
    expect(runtimeAssetContentTypeV1("cover.WEBP")).toBe("image/webp");
    expect(runtimeAssetContentTypeV1("voice.ogg")).toBe("audio/ogg");
    expect(runtimeAssetContentTypeV1("unknown.bin")).toBe("application/octet-stream");
  });

  it("covers the browser-supported audio formats", () => {
    expect(runtimeAssetContentTypeV1("bgm.m4a")).toBe("audio/mp4");
    expect(runtimeAssetContentTypeV1("bgm.FLAC")).toBe("audio/flac");
    expect(runtimeAssetContentTypeV1("jingle.aac")).toBe("audio/aac");
    expect(runtimeAssetContentTypeV1("voice.oga")).toBe("audio/ogg");
    expect(runtimeAssetContentTypeV1("voice.weba")).toBe("audio/webm");
  });

  it("copies the application asset tree into the build output", async () => {
    const fixture = await fixtureV1();
    const output = join(fixture.root, "dist-assets");

    await copyRuntimeAssetsV1(fixture.assets, output);

    expect(await readFile(join(output, "images", "cover.webp"), "utf8")).toBe("asset");
  });
});

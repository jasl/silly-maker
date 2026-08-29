// SPDX-License-Identifier: MIT
import { access, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  copyRuntimeAssetsV1,
  parseRuntimeAssetContentTypesV1,
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
  readonly outside: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "sillymaker-assets-"));
  temporaryRoots.push(root);
  const assets = join(root, "assets");
  const outside = join(root, "outside");
  await mkdir(join(assets, "images"), { recursive: true });
  await mkdir(outside, { recursive: true });
  await writeFile(join(assets, "images", "cover.webp"), "asset", "utf8");
  await writeFile(join(outside, "secret.txt"), "secret", "utf8");
  return { root, assets, outside };
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

  it("rejects symbolic links in both dev resolution and production copying", async () => {
    const fixture = await fixtureV1();
    const link = join(fixture.assets, "linked-secret.txt");
    try {
      await symlink(join(fixture.outside, "secret.txt"), link);
    } catch (error) {
      // Some Windows test hosts disallow symlink creation for unprivileged
      // processes. The platform-independent traversal cases remain covered.
      if ((error as NodeJS.ErrnoException).code === "EPERM") return;
      throw error;
    }

    expect(resolveRuntimeAssetPathV1(fixture.assets, "linked-secret.txt")).toEqual({
      kind: "not_found",
    });
    await expect(
      copyRuntimeAssetsV1(fixture.assets, join(fixture.root, "dist-assets")),
    ).rejects.toThrow("runtime asset tree contains a symbolic link");
  });

  it("rejects a symlinked asset root and symlinked intermediate directories", async () => {
    const fixture = await fixtureV1();
    const linkedRoot = join(fixture.root, "linked-assets");
    const linkedDirectory = join(fixture.assets, "linked-directory");
    try {
      await symlink(fixture.assets, linkedRoot, "dir");
      await symlink(fixture.outside, linkedDirectory, "dir");
    } catch (error) {
      // Some Windows test hosts disallow symlink creation for unprivileged
      // processes. The platform-independent traversal cases remain covered.
      if ((error as NodeJS.ErrnoException).code === "EPERM") return;
      throw error;
    }

    expect(resolveRuntimeAssetPathV1(linkedRoot, "images/cover.webp")).toEqual({
      kind: "not_found",
    });
    expect(resolveRuntimeAssetPathV1(fixture.assets, "linked-directory/secret.txt")).toEqual({
      kind: "not_found",
    });
    await expect(
      copyRuntimeAssetsV1(linkedRoot, join(fixture.root, "dist-linked")),
    ).rejects.toThrow("runtime asset root must be a real directory");
  });

  it("drops Finder/Explorer metadata from the production copy", async () => {
    const fixture = await fixtureV1();
    await writeFile(join(fixture.assets, ".DS_Store"), "finder", "utf8");
    await writeFile(join(fixture.assets, "images", "Thumbs.db"), "explorer", "utf8");
    await writeFile(join(fixture.assets, "images", "._cover.webp"), "appledouble", "utf8");
    const output = join(fixture.root, "dist-assets");
    await copyRuntimeAssetsV1(fixture.assets, output);
    await expect(access(join(output, "images", "cover.webp"))).resolves.toBeUndefined();
    await expect(access(join(output, ".DS_Store"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(access(join(output, "images", "Thumbs.db"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(access(join(output, "images", "._cover.webp"))).rejects.toMatchObject({
      code: "ENOENT",
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

  it("lets application overrides extend and win over the defaults", () => {
    const overrides = parseRuntimeAssetContentTypesV1({
      ".PCM": "audio/pcm",
      ".ogg": "application/x-custom",
    });
    expect(runtimeAssetContentTypeV1("track.pcm", overrides)).toBe("audio/pcm");
    expect(runtimeAssetContentTypeV1("voice.ogg", overrides)).toBe("application/x-custom");
    expect(runtimeAssetContentTypeV1("cover.png", overrides)).toBe("image/png");
  });

  it("rejects malformed override tables", () => {
    expect(() => parseRuntimeAssetContentTypesV1({ m4a: "audio/mp4" })).toThrow(TypeError);
    expect(() => parseRuntimeAssetContentTypesV1({ ".m4a": "  " })).toThrow(TypeError);
    expect(() => parseRuntimeAssetContentTypesV1({ ".m4a": "audio/mp4\r\nx-injected: 1" })).toThrow(
      TypeError,
    );
  });
});

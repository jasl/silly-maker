// SPDX-License-Identifier: MIT
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveStaticFilePathV1 } from "./static-file-path.mts";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixtureV1() {
  const root = await mkdtemp(join(tmpdir(), "sillymaker-static-"));
  temporaryRoots.push(root);
  const dist = join(root, "dist");
  const outside = join(root, "outside");
  await mkdir(join(dist, "chapter"), { recursive: true });
  await mkdir(outside, { recursive: true });
  await writeFile(join(dist, "index.html"), "root", "utf8");
  await writeFile(join(dist, "chapter", "index.html"), "chapter", "utf8");
  await writeFile(join(outside, "secret.txt"), "secret", "utf8");
  return { root, dist, outside };
}

describe("desktop static file path resolution", () => {
  it("resolves root, encoded filenames, and directory indexes", async () => {
    const fixture = await fixtureV1();
    await writeFile(join(fixture.dist, "space name.txt"), "space", "utf8");

    await expect(resolveStaticFilePathV1(fixture.dist, "/")).resolves.toEqual({
      kind: "file",
      filePath: join(fixture.dist, "index.html"),
    });
    await expect(resolveStaticFilePathV1(fixture.dist, "/chapter/")).resolves.toEqual({
      kind: "file",
      filePath: join(fixture.dist, "chapter", "index.html"),
    });
    await expect(resolveStaticFilePathV1(fixture.dist, "/space%20name.txt")).resolves.toEqual({
      kind: "file",
      filePath: join(fixture.dist, "space name.txt"),
    });
  });

  it("rejects traversal, malformed encoding, and path separators", async () => {
    const fixture = await fixtureV1();
    await expect(resolveStaticFilePathV1(fixture.dist, "/../outside/secret.txt")).resolves.toEqual({
      kind: "not_found",
    });
    await expect(
      resolveStaticFilePathV1(fixture.dist, "/%2e%2e/outside/secret.txt"),
    ).resolves.toEqual({ kind: "not_found" });
    await expect(resolveStaticFilePathV1(fixture.dist, "/%E0%A4%A")).resolves.toEqual({
      kind: "bad_request",
    });
    await expect(resolveStaticFilePathV1(fixture.dist, "/chapter%5Cindex.html")).resolves.toEqual({
      kind: "bad_request",
    });
  });

  it("rejects symlinked files, directories, and roots", async () => {
    const fixture = await fixtureV1();
    const linkedFile = join(fixture.dist, "linked.txt");
    const linkedDirectory = join(fixture.dist, "linked-directory");
    const linkedRoot = join(fixture.root, "linked-root");
    try {
      await symlink(join(fixture.outside, "secret.txt"), linkedFile);
      await symlink(fixture.outside, linkedDirectory, "dir");
      await symlink(fixture.dist, linkedRoot, "dir");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") return;
      throw error;
    }

    await expect(resolveStaticFilePathV1(fixture.dist, "/linked.txt")).resolves.toEqual({
      kind: "not_found",
    });
    await expect(
      resolveStaticFilePathV1(fixture.dist, "/linked-directory/secret.txt"),
    ).resolves.toEqual({ kind: "not_found" });
    await expect(resolveStaticFilePathV1(linkedRoot, "/index.html")).resolves.toEqual({
      kind: "not_found",
    });
  });
});

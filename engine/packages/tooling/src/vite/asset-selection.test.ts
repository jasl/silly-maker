// SPDX-License-Identifier: MIT
import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { materializeAssetSelectionV1 } from "./asset-selection.ts";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fixtureV1(): Promise<{
  readonly root: string;
  readonly payload: string;
  readonly output: string;
  readonly outside: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "sillymaker-asset-selection-"));
  temporaryRoots.push(root);
  const payload = join(root, "payload");
  const output = join(root, "output");
  const outside = join(root, "outside");
  await mkdir(join(payload, "img", "pictures"), { recursive: true });
  await mkdir(join(payload, "data"), { recursive: true });
  await mkdir(outside, { recursive: true });
  await writeFile(join(payload, "data", "events.json"), "{}", "utf8");
  await writeFile(join(payload, "img", "pictures", "menu.png"), "png-bytes", "utf8");
  await writeFile(join(payload, "img", "pictures", "unused.png"), "junk", "utf8");
  await writeFile(join(outside, "secret.txt"), "secret", "utf8");
  return { root, payload, output, outside };
}

describe("asset selection materialization", () => {
  it("copies exactly the planned files, preserving structure, with byte totals", async () => {
    const fixture = await fixtureV1();
    const result = await materializeAssetSelectionV1({
      sourceRoot: fixture.payload,
      outputDirectory: fixture.output,
      plan: {
        files: ["data/events.json", "img/pictures/menu.png", "data/events.json"],
        warnings: [],
      },
    });
    expect(result.fileCount).toBe(2);
    expect(result.totalBytes).toBe(2 + "png-bytes".length);
    expect(await readFile(join(fixture.output, "data", "events.json"), "utf8")).toBe("{}");
    expect(await readFile(join(fixture.output, "img", "pictures", "menu.png"), "utf8")).toBe(
      "png-bytes",
    );
    await expect(lstat(join(fixture.output, "img", "pictures", "unused.png"))).rejects.toThrow();
  });

  it("materializes through a symlinked source root as regular files", async () => {
    const fixture = await fixtureV1();
    const linkedRoot = join(fixture.root, "linked-payload");
    try {
      await symlink(fixture.payload, linkedRoot, "dir");
    } catch (error) {
      // Some Windows test hosts disallow symlink creation for unprivileged
      // processes. The platform-independent cases remain covered.
      if ((error as NodeJS.ErrnoException).code === "EPERM") return;
      throw error;
    }
    const result = await materializeAssetSelectionV1({
      sourceRoot: linkedRoot,
      outputDirectory: fixture.output,
      plan: { files: ["data/events.json"], warnings: [] },
    });
    expect(result.fileCount).toBe(1);
    const copied = await lstat(join(fixture.output, "data", "events.json"));
    expect(copied.isFile()).toBe(true);
    expect(copied.isSymbolicLink()).toBe(false);
  });

  it("rejects traversal, absolute paths, backslashes, and NUL bytes", async () => {
    const fixture = await fixtureV1();
    for (const path of [
      "../outside/secret.txt",
      "/etc/passwd",
      "img\\pictures\\menu.png",
      "a\0b",
    ]) {
      await expect(
        materializeAssetSelectionV1({
          sourceRoot: fixture.payload,
          outputDirectory: fixture.output,
          plan: { files: [path], warnings: [] },
        }),
      ).rejects.toThrow(TypeError);
    }
  });

  it("rejects file symlinks that resolve outside the source root", async () => {
    const fixture = await fixtureV1();
    const link = join(fixture.payload, "data", "linked-secret.txt");
    try {
      await symlink(join(fixture.outside, "secret.txt"), link);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") return;
      throw error;
    }
    await expect(
      materializeAssetSelectionV1({
        sourceRoot: fixture.payload,
        outputDirectory: fixture.output,
        plan: { files: ["data/linked-secret.txt"], warnings: [] },
      }),
    ).rejects.toThrow("escapes the source root");
  });

  it("fails loudly when a planned file vanished from the payload", async () => {
    const fixture = await fixtureV1();
    await expect(
      materializeAssetSelectionV1({
        sourceRoot: fixture.payload,
        outputDirectory: fixture.output,
        plan: { files: ["img/pictures/gone.png"], warnings: [] },
      }),
    ).rejects.toThrow("missing from the payload");
    await expect(
      materializeAssetSelectionV1({
        sourceRoot: fixture.payload,
        outputDirectory: fixture.output,
        plan: { files: ["img/pictures"], warnings: [] },
      }),
    ).rejects.toThrow("not a regular file");
  });

  it("keeps unrelated pre-existing output content (caller owns the lifecycle)", async () => {
    const fixture = await fixtureV1();
    await mkdir(fixture.output, { recursive: true });
    await writeFile(join(fixture.output, "keep.txt"), "keep", "utf8");
    await materializeAssetSelectionV1({
      sourceRoot: fixture.payload,
      outputDirectory: fixture.output,
      plan: { files: ["data/events.json"], warnings: [] },
    });
    expect(await readFile(join(fixture.output, "keep.txt"), "utf8")).toBe("keep");
  });
});

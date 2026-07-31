// SPDX-License-Identifier: MIT
import {
  link as hardLink,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
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
  await mkdir(join(payload, "media", "cards"), { recursive: true });
  await mkdir(join(payload, "records"), { recursive: true });
  await mkdir(outside, { recursive: true });
  await writeFile(join(payload, "records", "catalog.json"), "{}", "utf8");
  await writeFile(join(payload, "media", "cards", "cover.png"), "png-bytes", "utf8");
  await writeFile(join(payload, "media", "cards", "unused.png"), "junk", "utf8");
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
        files: ["records/catalog.json", "media/cards/cover.png", "records/catalog.json"],
        warnings: [],
      },
    });
    expect(result.fileCount).toBe(2);
    expect(result.totalBytes).toBe(2 + "png-bytes".length);
    expect(await readFile(join(fixture.output, "records", "catalog.json"), "utf8")).toBe("{}");
    expect(await readFile(join(fixture.output, "media", "cards", "cover.png"), "utf8")).toBe(
      "png-bytes",
    );
    await expect(lstat(join(fixture.output, "media", "cards", "unused.png"))).rejects.toThrow();
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
      plan: { files: ["records/catalog.json"], warnings: [] },
    });
    expect(result.fileCount).toBe(1);
    const copied = await lstat(join(fixture.output, "records", "catalog.json"));
    expect(copied.isFile()).toBe(true);
    expect(copied.isSymbolicLink()).toBe(false);
  });

  it("rejects traversal, absolute paths, backslashes, and NUL bytes", async () => {
    const fixture = await fixtureV1();
    for (const path of [
      "../outside/secret.txt",
      "/etc/passwd",
      "media\\cards\\cover.png",
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

  it("rejects non-canonical POSIX relative path aliases", async () => {
    const fixture = await fixtureV1();
    for (const path of [
      "./records/catalog.json",
      "records//catalog.json",
      "records/./catalog.json",
      "records/../records/catalog.json",
      "records/catalog.json/",
    ]) {
      await expect(
        materializeAssetSelectionV1({
          sourceRoot: fixture.payload,
          outputDirectory: fixture.output,
          plan: { files: [path], warnings: [] },
        }),
      ).rejects.toThrow("invalid asset selection path");
    }
  });

  it("rejects path segments outside the repository portable-path grammar", async () => {
    const fixture = await fixtureV1();
    for (const path of [
      "records/alternate:stream.json",
      "records/draft?.json",
      "records/CON",
      "records/LPT\u00b3.log",
      "records/trailing.",
      "records/trailing ",
      `records/control-${String.fromCharCode(31)}`,
    ]) {
      await expect(
        materializeAssetSelectionV1({
          sourceRoot: fixture.payload,
          outputDirectory: fixture.output,
          plan: { files: [path], warnings: [] },
        }),
      ).rejects.toThrow("invalid asset selection path");
    }
  });

  it.each([
    ["host filename case", "records/catalog.json", "RECORDS/CATALOG.JSON"],
    ["Unicode normalization", "records/caf\u00e9.json", "records/cafe\u0301.json"],
    ["Unicode case folding", "records/stra\u00dfe.json", "records/STRASSE.json"],
  ])("rejects portable plan collisions: %s", async (_label, first, alias) => {
    const fixture = await fixtureV1();
    await expect(
      materializeAssetSelectionV1({
        sourceRoot: fixture.payload,
        outputDirectory: fixture.output,
        plan: { files: [first, alias], warnings: [] },
      }),
    ).rejects.toThrow("portable path collision");
  });

  it("rejects file symlinks that resolve outside the source root", async () => {
    const fixture = await fixtureV1();
    const link = join(fixture.payload, "records", "linked-secret.txt");
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
        plan: { files: ["records/linked-secret.txt"], warnings: [] },
      }),
    ).rejects.toThrow("escapes the source root");
  });

  it("fails loudly when a planned file vanished from the payload", async () => {
    const fixture = await fixtureV1();
    await expect(
      materializeAssetSelectionV1({
        sourceRoot: fixture.payload,
        outputDirectory: fixture.output,
        plan: { files: ["media/cards/gone.png"], warnings: [] },
      }),
    ).rejects.toThrow("missing from the payload");
    await expect(
      materializeAssetSelectionV1({
        sourceRoot: fixture.payload,
        outputDirectory: fixture.output,
        plan: { files: ["media/cards"], warnings: [] },
      }),
    ).rejects.toThrow("not a regular file");
  });

  it("rejects a non-directory source root", async () => {
    const fixture = await fixtureV1();
    const sourceFile = join(fixture.root, "source-file");
    await writeFile(sourceFile, "not a directory", "utf8");
    await expect(
      materializeAssetSelectionV1({
        sourceRoot: sourceFile,
        outputDirectory: fixture.output,
        plan: { files: ["records/catalog.json"], warnings: [] },
      }),
    ).rejects.toThrow("source root is not a directory");
  });

  it("rejects an output root symbolic link without writing through it", async () => {
    const fixture = await fixtureV1();
    try {
      await symlink(fixture.outside, fixture.output, "dir");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") return;
      throw error;
    }
    await expect(
      materializeAssetSelectionV1({
        sourceRoot: fixture.payload,
        outputDirectory: fixture.output,
        plan: { files: ["records/catalog.json"], warnings: [] },
      }),
    ).rejects.toThrow("output root must not be a symbolic link");
    await expect(lstat(join(fixture.outside, "records", "catalog.json"))).rejects.toThrow();
  });

  it("rejects symbolic links and non-directories in the output path", async () => {
    const fixture = await fixtureV1();
    await mkdir(fixture.output, { recursive: true });

    const linkedDirectory = join(fixture.outside, "linked-directory");
    await mkdir(linkedDirectory);
    let createdSymlink = false;
    try {
      await symlink(linkedDirectory, join(fixture.output, "records"), "dir");
      createdSymlink = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
    }
    if (createdSymlink) {
      await expect(
        materializeAssetSelectionV1({
          sourceRoot: fixture.payload,
          outputDirectory: fixture.output,
          plan: { files: ["records/catalog.json"], warnings: [] },
        }),
      ).rejects.toThrow("output path component must not be a symbolic link");
      await expect(lstat(join(linkedDirectory, "catalog.json"))).rejects.toThrow();
      await rm(join(fixture.output, "records"));
    }

    await writeFile(join(fixture.output, "records"), "not a directory", "utf8");
    await expect(
      materializeAssetSelectionV1({
        sourceRoot: fixture.payload,
        outputDirectory: fixture.output,
        plan: { files: ["records/catalog.json"], warnings: [] },
      }),
    ).rejects.toThrow("output path component is not a directory");
  });

  it("rejects symbolic links and non-files at the output leaf", async () => {
    const fixture = await fixtureV1();
    const outputData = join(fixture.output, "records");
    await mkdir(outputData, { recursive: true });

    let createdSymlink = false;
    try {
      await symlink(join(fixture.outside, "secret.txt"), join(outputData, "catalog.json"), "file");
      createdSymlink = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
    }
    if (createdSymlink) {
      await expect(
        materializeAssetSelectionV1({
          sourceRoot: fixture.payload,
          outputDirectory: fixture.output,
          plan: { files: ["records/catalog.json"], warnings: [] },
        }),
      ).rejects.toThrow("output file must not be a symbolic link");
      expect(await readFile(join(fixture.outside, "secret.txt"), "utf8")).toBe("secret");
      await rm(join(outputData, "catalog.json"));
    }

    await mkdir(join(outputData, "catalog.json"));
    await expect(
      materializeAssetSelectionV1({
        sourceRoot: fixture.payload,
        outputDirectory: fixture.output,
        plan: { files: ["records/catalog.json"], warnings: [] },
      }),
    ).rejects.toThrow("output path is not a regular file");
  });

  it("replaces an output hard link without mutating its other directory entry", async () => {
    const fixture = await fixtureV1();
    const outputData = join(fixture.output, "records");
    const target = join(outputData, "catalog.json");
    const outsideFile = join(fixture.outside, "secret.txt");
    await mkdir(outputData, { recursive: true });
    try {
      await hardLink(outsideFile, target);
    } catch (error) {
      if (["EACCES", "ENOTSUP", "EPERM"].includes((error as NodeJS.ErrnoException).code ?? "")) {
        return;
      }
      throw error;
    }

    await materializeAssetSelectionV1({
      sourceRoot: fixture.payload,
      outputDirectory: fixture.output,
      plan: { files: ["records/catalog.json"], warnings: [] },
    });

    expect(await readFile(target, "utf8")).toBe("{}");
    expect(await readFile(outsideFile, "utf8")).toBe("secret");
  });

  it("rejects a non-directory output root", async () => {
    const fixture = await fixtureV1();
    await writeFile(fixture.output, "not a directory", "utf8");
    await expect(
      materializeAssetSelectionV1({
        sourceRoot: fixture.payload,
        outputDirectory: fixture.output,
        plan: { files: ["records/catalog.json"], warnings: [] },
      }),
    ).rejects.toThrow("output root is not a directory");
  });

  it("keeps unrelated pre-existing output content (caller owns the lifecycle)", async () => {
    const fixture = await fixtureV1();
    await mkdir(fixture.output, { recursive: true });
    await writeFile(join(fixture.output, "keep.txt"), "keep", "utf8");
    await materializeAssetSelectionV1({
      sourceRoot: fixture.payload,
      outputDirectory: fixture.output,
      plan: { files: ["records/catalog.json"], warnings: [] },
    });
    expect(await readFile(join(fixture.output, "keep.txt"), "utf8")).toBe("keep");
  });
});

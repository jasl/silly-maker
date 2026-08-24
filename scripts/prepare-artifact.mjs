// SPDX-License-Identifier: MIT
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectLegalFilesV1 = [
  "LICENSE.md",
  "LICENSES/CC0-1.0.txt",
  "LICENSES/MIT.txt",
  "NOTICE",
  "TRADEMARKS.md",
];

export async function copyProjectLegalFilesV1(repositoryRoot, outputRoot) {
  await mkdir(outputRoot, { recursive: true });
  for (const path of projectLegalFilesV1) {
    const target = resolve(outputRoot, path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(resolve(repositoryRoot, path), target);
  }
}

const isMainV1 = process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainV1) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
      throw new TypeError("expected one explicit output directory");
    }
    const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
    const outputRoot = resolve(args[0]);
    await copyProjectLegalFilesV1(repositoryRoot, outputRoot);
    console.log(
      `copied ${String(projectLegalFilesV1.length)} project legal files to ${outputRoot}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

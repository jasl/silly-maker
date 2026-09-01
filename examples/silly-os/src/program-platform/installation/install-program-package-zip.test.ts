// SPDX-License-Identifier: MIT

import { zipSync } from "fflate";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import type {
  ProgramPackageAdmissionLimitsV1,
  ProgramPackageManifestV1,
} from "../package/program-package-archive.ts";
import type { ProgramPackageZipBudgetsV1 } from "../package/program-package-zip.ts";
import {
  createIndexedDbProgramPackageInstallationRepositoryV1,
} from "./indexeddb-program-package-installation-repository.ts";
import { installProgramPackageZipV1 } from "./install-program-package-zip.ts";

const textEncoderV1 = new TextEncoder();
const archiveLimitsV1: ProgramPackageAdmissionLimitsV1 = {
  maximumManifestBytes: 4_096,
  maximumFiles: 16,
  maximumPathBytes: 256,
  maximumFileBytes: 16_384,
  maximumPackageBytes: 65_536,
};
const budgetsV1: ProgramPackageZipBudgetsV1 = {
  maximumCompressedBytes: 65_536,
  maximumUncompressedBytes: 65_536,
  maximumEntries: 32,
};
const manifestV1: ProgramPackageManifestV1 = {
  schemaVersion: 1,
  programId: "community.example.translation",
  packageVersion: "1.0.0",
  harnessCompatibility: "sillyos.program-harness.v1",
  runtimeProfile: "agent.workspace.v1",
  name: "Translation",
  summary: "A focused translation workflow.",
  instructionsPath: "instructions/SKILL.md",
  settingsSchemaPath: null,
  settingsDefaultsPath: null,
  initialUiPath: null,
  scripts: [],
  capabilityIds: ["workspace.read"],
};

const repositoriesV1: { dispose(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(repositoriesV1.splice(0).map(async (repository) => await repository.dispose()));
});

describe("external Program package installation V1", () => {
  it("installs external ZIP content through the ordinary package repository", async () => {
    const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB: new IDBFactory(),
      databaseName: "program-package.external-zip",
      limits: archiveLimitsV1,
    });
    repositoriesV1.push(repository);
    const zipBytes = zipSync({
      "downloaded/program.json": textEncoderV1.encode(JSON.stringify(manifestV1)),
      "downloaded/instructions/SKILL.md": textEncoderV1.encode("Translate faithfully."),
    });

    const installed = await installProgramPackageZipV1(zipBytes, {
      repository,
      selectCurrent: true,
      budgets: budgetsV1,
      archiveLimits: archiveLimitsV1,
    });

    await expect(repository.current(manifestV1.programId)).resolves.toEqual(installed.reference);
    const loaded = await repository.load(installed.reference);
    expect(loaded?.manifest).toEqual(manifestV1);
    expect(new TextDecoder().decode(loaded?.files[0]?.bytes)).toBe("Translate faithfully.");
  });
});

// SPDX-License-Identifier: MIT

import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import type {
  ProgramPackageAdmissionLimitsV1,
  ProgramPackageArchiveV1,
} from "../package/program-package-archive.ts";
import {
  createIndexedDbProgramPackageInstallationRepositoryV1,
  programPackageInstallationDatabaseVersionV1,
  programPackageInstallationMetadataObjectStoreNameV1,
  programPackageInstallationObjectStoreNameV1,
} from "./indexeddb-program-package-installation-repository.ts";

const limitsV1: ProgramPackageAdmissionLimitsV1 = {
  maximumManifestBytes: 4_096,
  maximumFiles: 16,
  maximumPathBytes: 256,
  maximumFileBytes: 16_384,
  maximumPackageBytes: 65_536,
};

const repositoriesV1: { dispose(): Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(repositoriesV1.splice(0).map((repository) => repository.dispose()));
});

function archiveV1(
  packageVersion = "1.0.0",
  instructions = "Translate the admitted document.",
): ProgramPackageArchiveV1 {
  return {
    manifest: {
      schemaVersion: 1,
      programId: "community.example.translation",
      packageVersion,
      harnessCompatibility: "sillyos.program-harness.v1",
      runtimeProfile: "agent.workspace.v1",
      name: "Translation",
      summary: "A focused translation workflow.",
      instructionsPath: "instructions/SKILL.md",
      settingsSchemaPath: null,
      settingsDefaultsPath: null,
      initialUiPath: null,
      scripts: [{ path: "scripts/translate.js", runtime: "quickjs" }],
      capabilityIds: ["workspace.read", "workspace.write"],
    },
    files: [
      {
        path: "instructions/SKILL.md",
        mediaType: "text/markdown",
        bytes: new TextEncoder().encode(instructions).buffer,
      },
      {
        path: "scripts/translate.js",
        mediaType: "application/javascript",
        bytes: new TextEncoder().encode("export function translate() {}").buffer,
      },
    ],
  };
}

function requestResultV1<TValue>(request: IDBRequest<TValue>): Promise<TValue> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

describe("IndexedDB Program package installation repository V1", () => {
  it("row-blind resets pre-stable storage into the current two-store schema", async () => {
    const indexedDB = new IDBFactory();
    const databaseName = "program-packages.pre-stable-reset";
    const legacyOpen = indexedDB.open(databaseName, 2);
    legacyOpen.addEventListener("upgradeneeded", () => {
      legacyOpen.result.createObjectStore("packages", { keyPath: "storageKey" });
      legacyOpen.result.createObjectStore("package_heads", { keyPath: "programId" });
      legacyOpen.result.createObjectStore("package_metadata", { keyPath: "storageKey" });
    });
    (await requestResultV1(legacyOpen)).close();

    const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB,
      databaseName,
      limits: limitsV1,
    });
    repositoriesV1.push(repository);

    await expect(repository.initialize()).resolves.toBe("created");
    await expect(repository.listMetadata()).resolves.toEqual([]);
    const database = await requestResultV1(indexedDB.open(databaseName));
    expect([...database.objectStoreNames]).toEqual([
      programPackageInstallationMetadataObjectStoreNameV1,
      programPackageInstallationObjectStoreNameV1,
    ]);
    database.close();
  });

  it("persists one current implementation and its internal installation id", async () => {
    const indexedDB = new IDBFactory();
    const databaseName = "program-packages.lifecycle";
    const first = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB,
      databaseName,
      limits: limitsV1,
    });
    repositoriesV1.push(first);
    const installed = await first.install(archiveV1(), { acquisition: "external" });

    expect(installed.disposition).toBe("installed");
    const firstLoad = await first.load(installed.reference.programId);
    expect(firstLoad).toMatchObject({
      acquisition: "external",
      package: { reference: installed.reference },
    });
    expect(firstLoad?.installationId).toEqual(expect.any(String));
    await first.dispose();
    repositoriesV1.splice(repositoriesV1.indexOf(first), 1);

    const reopened = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB,
      databaseName,
      limits: limitsV1,
    });
    repositoriesV1.push(reopened);
    await expect(reopened.initialize()).resolves.toBe("opened");
    await expect(reopened.load(installed.reference.programId)).resolves.toMatchObject({
      installationId: firstLoad?.installationId,
      package: { reference: installed.reference },
    });
    await expect(reopened.remove(installed.reference.programId)).resolves.toBe(true);
    await expect(reopened.remove(installed.reference.programId)).resolves.toBe(false);
  });

  it("replaces compatible and incompatible implementations instead of retaining history", async () => {
    const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB: new IDBFactory(),
      databaseName: "program-packages.replacement",
      limits: limitsV1,
    });
    repositoriesV1.push(repository);

    await repository.install(archiveV1("1.0.0", "First instructions."), {
      acquisition: "bundled",
    });
    const first = await repository.load("community.example.translation");
    const compatible = await repository.install(
      archiveV1("1.0.0", "Fixed instructions."),
      { acquisition: "bundled" },
    );
    expect(compatible.disposition).toBe("replaced");
    const second = await repository.load("community.example.translation");
    expect(second?.installationId).not.toBe(first?.installationId);
    expect(new TextDecoder().decode(second?.package.files[0]?.bytes)).toBe("Fixed instructions.");

    await repository.install(archiveV1("2.0.0", "Incompatible successor."), {
      acquisition: "external",
    });
    const successor = await repository.load("community.example.translation");
    expect(successor).toMatchObject({
      acquisition: "external",
      package: { reference: { packageVersion: "2.0.0" } },
    });
    const bundledRefresh = await repository.install(
      archiveV1("1.0.0", "Bundled refresh must not replace the external install."),
      { acquisition: "bundled" },
    );
    expect(bundledRefresh).toEqual({
      disposition: "retained_external",
      reference: successor?.package.reference,
    });
    await expect(repository.load("community.example.translation")).resolves.toMatchObject({
      acquisition: "external",
      installationId: successor?.installationId,
      package: { reference: { packageVersion: "2.0.0" } },
    });
    await expect(repository.listMetadata()).resolves.toHaveLength(1);

    await expect(
      repository.install({ ...archiveV1("3.0.0"), files: [] }, { acquisition: "external" }),
    ).rejects.toMatchObject({ code: "referenced_file_missing" });
    await expect(repository.load("community.example.translation")).resolves.toMatchObject({
      installationId: successor?.installationId,
    });
  });

  it("retains the installation id when the same acquisition materializes identical admitted bytes", async () => {
    for (const acquisition of ["bundled", "external"] as const) {
      const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
        indexedDB: new IDBFactory(),
        databaseName: `program-packages.idempotent-install.${acquisition}`,
        limits: limitsV1,
      });
      repositoriesV1.push(repository);

      const archive = archiveV1();
      await repository.install(archive, { acquisition });
      const first = await repository.load("community.example.translation");
      const repeated = await repository.install(archiveV1(), { acquisition });
      const second = await repository.load("community.example.translation");

      expect(repeated).toEqual({
        disposition: "retained_current",
        reference: {
          programId: archive.manifest.programId,
          packageVersion: archive.manifest.packageVersion,
        },
      });
      expect(second?.installationId).toBe(first?.installationId);
    }
  });

  it("keeps identical bundled materialization idempotent across repository instances", async () => {
    const indexedDB = new IDBFactory();
    const databaseName = "program-packages.cross-instance-idempotency";
    const firstRepository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB,
      databaseName,
      limits: limitsV1,
    });
    const secondRepository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB,
      databaseName,
      limits: limitsV1,
    });
    repositoriesV1.push(firstRepository, secondRepository);

    await firstRepository.install(archiveV1(), { acquisition: "bundled" });
    const first = await firstRepository.load("community.example.translation");
    const repeated = await secondRepository.install(archiveV1(), { acquisition: "bundled" });
    const second = await secondRepository.load("community.example.translation");

    expect(repeated.disposition).toBe("retained_current");
    expect(second?.installationId).toBe(first?.installationId);
  });

  it("replaces identical bytes when the acquisition changes", async () => {
    const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB: new IDBFactory(),
      databaseName: "program-packages.acquisition-change",
      limits: limitsV1,
    });
    repositoriesV1.push(repository);

    await repository.install(archiveV1(), { acquisition: "bundled" });
    const bundled = await repository.load("community.example.translation");
    if (bundled === null) throw new Error("expected bundled installation");
    const replaced = await repository.install(archiveV1(), { acquisition: "external" });
    const external = await repository.load("community.example.translation");

    expect(replaced.disposition).toBe("replaced");
    expect(external?.acquisition).toBe("external");
    expect(external?.installationId).not.toBe(bundled?.installationId);
  });

  it("conditionally removes only the current external implementation", async () => {
    const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB: new IDBFactory(),
      databaseName: "program-packages.conditional-remove",
      limits: limitsV1,
    });
    repositoriesV1.push(repository);

    await repository.install(archiveV1(), { acquisition: "bundled" });
    const bundled = await repository.load("community.example.translation");
    if (bundled === null) throw new Error("expected bundled installation");
    await expect(repository.remove("community.example.translation", {
      ifAcquisition: "external",
      ifInstallationId: bundled.installationId,
    })).resolves.toBe(false);
    await expect(repository.load("community.example.translation")).resolves.toMatchObject({
      acquisition: "bundled",
    });

    await repository.install(archiveV1(), { acquisition: "external" });
    const firstExternal = await repository.load("community.example.translation");
    if (firstExternal === null) throw new Error("expected first external installation");
    await repository.install(archiveV1("1.0.0", "Replacement external instructions."), {
      acquisition: "external",
    });
    const currentExternal = await repository.load("community.example.translation");
    if (currentExternal === null) throw new Error("expected current external installation");
    expect(currentExternal.installationId).not.toBe(firstExternal.installationId);
    await expect(repository.remove("community.example.translation", {
      ifAcquisition: "external",
      ifInstallationId: firstExternal.installationId,
    })).resolves.toBe(false);
    await expect(repository.load("community.example.translation")).resolves.toMatchObject({
      acquisition: "external",
      installationId: currentExternal.installationId,
    });
    await expect(repository.remove("community.example.translation", {
      ifAcquisition: "external",
      ifInstallationId: currentExternal.installationId,
    })).resolves.toBe(true);
    await expect(repository.remove("community.example.translation", {
      ifAcquisition: "external",
    })).resolves.toBe(false);
    await expect(repository.listMetadata()).resolves.toEqual([]);
  });

  it("returns owned bytes so callers cannot mutate the stored implementation", async () => {
    const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB: new IDBFactory(),
      databaseName: "program-packages.owned",
      limits: limitsV1,
    });
    repositoriesV1.push(repository);
    await repository.install(archiveV1(), { acquisition: "external" });
    const first = await repository.load("community.example.translation");
    new Uint8Array(first!.package.files[0]!.bytes).fill(0);

    const second = await repository.load("community.example.translation");
    expect(new TextDecoder().decode(second!.package.files[0]!.bytes)).toBe(
      "Translate the admitted document.",
    );
  });

  it("uses a dedicated database so removal cannot cascade into Process storage", async () => {
    const indexedDB = new IDBFactory();
    const processOpen = indexedDB.open("program-packages.process-control", 1);
    processOpen.addEventListener("upgradeneeded", () => {
      processOpen.result.createObjectStore("processes", { keyPath: "processId" });
    });
    const processDatabase = await requestResultV1(processOpen);
    await requestResultV1(
      processDatabase.transaction("processes", "readwrite").objectStore("processes").put({
        processId: "process-1",
        conversation: "durable",
      }),
    );
    processDatabase.close();

    const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB,
      databaseName: "program-packages.isolated",
      limits: limitsV1,
    });
    repositoriesV1.push(repository);
    await repository.install(archiveV1(), { acquisition: "external" });
    await repository.remove("community.example.translation", { ifAcquisition: "external" });

    const reopened = await requestResultV1(indexedDB.open("program-packages.process-control"));
    await expect(requestResultV1(
      reopened.transaction("processes", "readonly").objectStore("processes").get("process-1"),
    )).resolves.toEqual({ processId: "process-1", conversation: "durable" });
    reopened.close();
    const packages = await requestResultV1(indexedDB.open("program-packages.isolated"));
    expect(packages.version).toBe(programPackageInstallationDatabaseVersionV1);
    packages.close();
  });

  it("resets every installed implementation", async () => {
    const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB: new IDBFactory(),
      databaseName: "program-packages.reset",
      limits: limitsV1,
    });
    repositoriesV1.push(repository);
    await repository.install(archiveV1(), { acquisition: "external" });

    await repository.reset();

    await expect(repository.listMetadata()).resolves.toEqual([]);
    await expect(repository.load("community.example.translation")).resolves.toBeNull();
  });
});

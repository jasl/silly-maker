// SPDX-License-Identifier: MIT

import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import type {
  ProgramPackageAdmissionLimitsV1,
  ProgramPackageArchiveV1,
} from "../package/program-package-archive.ts";
import {
  createIndexedDbProgramPackageInstallationRepositoryV1,
  programPackageInstallationCurrentObjectStoreNameV1,
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
  await Promise.all(repositoriesV1.splice(0).map(async (repository) => await repository.dispose()));
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
  it("clears pre-stable package storage instead of carrying compatibility readers forward", async () => {
    const indexedDB = new IDBFactory();
    const databaseName = "program-packages.pre-stable-reset";
    const legacyOpen = indexedDB.open(databaseName, 1);
    legacyOpen.addEventListener("upgradeneeded", () => {
      legacyOpen.result.createObjectStore("packages", { keyPath: "storageKey" });
      legacyOpen.result.createObjectStore("package_heads", { keyPath: "programId" });
      legacyOpen.result.createObjectStore("translation_project_legacy", { keyPath: "id" });
    });
    const legacyDatabase = await requestResultV1(legacyOpen);
    const legacyTransaction = legacyDatabase.transaction(
      ["packages", "translation_project_legacy"],
      "readwrite",
    );
    await requestResultV1(
      legacyTransaction.objectStore("packages").put({ storageKey: "legacy", value: "obsolete" }),
    );
    await requestResultV1(
      legacyTransaction.objectStore("translation_project_legacy").put({ id: "legacy" }),
    );
    legacyDatabase.close();

    const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB,
      databaseName,
      limits: limitsV1,
    });
    repositoriesV1.push(repository);

    await expect(repository.initialize()).resolves.toBe("created");
    await expect(repository.listMetadata()).resolves.toEqual([]);
    const currentDatabase = await requestResultV1(indexedDB.open(databaseName));
    expect([...currentDatabase.objectStoreNames]).toEqual([
      programPackageInstallationCurrentObjectStoreNameV1,
      programPackageInstallationMetadataObjectStoreNameV1,
      programPackageInstallationObjectStoreNameV1,
    ]);
    currentDatabase.close();
  });

  it("installs, reopens, lists, and removes one exact immutable package", async () => {
    const indexedDB = new IDBFactory();
    const databaseName = "program-packages.lifecycle";
    const first = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB,
      databaseName,
      limits: limitsV1,
    });
    repositoriesV1.push(first);
    await expect(first.initialize()).resolves.toBe("created");

    const installed = await first.install(archiveV1(), { currentSelection: "always" });
    expect(installed.disposition).toBe("installed");
    await expect(first.install(archiveV1(), { currentSelection: "always" })).resolves.toMatchObject(
      {
        disposition: "already_installed",
        reference: installed.reference,
      },
    );
    await expect(first.listMetadata()).resolves.toEqual([
      expect.objectContaining({ reference: installed.reference }),
    ]);
    await expect(first.current(installed.reference.programId)).resolves.toEqual(
      installed.reference,
    );

    const loaded = await first.load(installed.reference);
    expect(loaded?.reference).toEqual(installed.reference);
    expect(new TextDecoder().decode(loaded?.files[0]?.bytes)).toBe(
      "Translate the admitted document.",
    );
    await first.dispose();
    repositoriesV1.splice(repositoriesV1.indexOf(first), 1);

    const reopened = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB,
      databaseName,
      limits: limitsV1,
    });
    repositoriesV1.push(reopened);
    await expect(reopened.initialize()).resolves.toBe("opened");
    await expect(reopened.load(installed.reference)).resolves.toMatchObject({
      reference: installed.reference,
    });
    await expect(reopened.remove(installed.reference)).resolves.toBe(true);
    await expect(reopened.current(installed.reference.programId)).resolves.toBeNull();
    await expect(reopened.remove(installed.reference)).resolves.toBe(false);
    await expect(reopened.load(installed.reference)).resolves.toBeNull();
  });

  it("retains exact package revisions side by side and never resolves through a moving head", async () => {
    const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB: new IDBFactory(),
      databaseName: "program-packages.revisions",
      limits: limitsV1,
    });
    repositoriesV1.push(repository);
    const first = await repository.install(archiveV1("1.0.0", "First instructions."), {
      currentSelection: "always",
    });
    const changedWithoutVersionBump = await repository.install(
      archiveV1("1.0.0", "Changed instructions."),
      { currentSelection: "never" },
    );
    const successor = await repository.install(
      archiveV1("2.0.0", "Successor instructions."),
      { currentSelection: "always" },
    );

    expect(changedWithoutVersionBump.reference.contentDigest).not.toBe(
      first.reference.contentDigest,
    );
    await expect(repository.current(first.reference.programId)).resolves.toEqual(
      successor.reference,
    );
    await expect(
      repository.install(
        {
          ...archiveV1("3.0.0", "Invalid successor."),
          files: [],
        },
        { currentSelection: "always" },
      ),
    ).rejects.toMatchObject({ code: "referenced_file_missing" });
    await expect(repository.current(first.reference.programId)).resolves.toEqual(
      successor.reference,
    );
    await expect(repository.listMetadata()).resolves.toHaveLength(3);
    await expect(repository.remove(first.reference)).resolves.toBe(true);
    await expect(repository.load(changedWithoutVersionBump.reference)).resolves.not.toBeNull();
    await expect(repository.load(successor.reference)).resolves.not.toBeNull();
  });

  it("initializes a missing current package without replacing an existing selection", async () => {
    const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB: new IDBFactory(),
      databaseName: "program-packages.initial-selection",
      limits: limitsV1,
    });
    repositoriesV1.push(repository);
    const selected = await repository.install(
      archiveV1("2.0.0", "User-selected successor."),
      { currentSelection: "always" },
    );
    await repository.install(
      archiveV1("1.0.0", "Bundled baseline."),
      { currentSelection: "if_missing" },
    );

    await expect(repository.current(selected.reference.programId)).resolves.toEqual(
      selected.reference,
    );

    const fresh = await repository.install(
      {
        ...archiveV1("1.0.0", "Another Program."),
        manifest: {
          ...archiveV1("1.0.0", "Another Program.").manifest,
          programId: "example.another-program",
        },
      },
      { currentSelection: "if_missing" },
    );
    await expect(repository.current(fresh.reference.programId)).resolves.toEqual(fresh.reference);
  });

  it("uses a dedicated schema and package removal cannot cascade into Process storage", async () => {
    const indexedDB = new IDBFactory();
    const processDatabaseName = "program-packages.process-control";
    const processOpen = indexedDB.open(processDatabaseName, 1);
    processOpen.addEventListener("upgradeneeded", () => {
      processOpen.result.createObjectStore("processes", { keyPath: "processId" });
    });
    const processDatabase = await requestResultV1(processOpen);
    const processTransaction = processDatabase.transaction("processes", "readwrite");
    await requestResultV1(
      processTransaction.objectStore("processes").put({
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
    const installed = await repository.install(archiveV1(), { currentSelection: "always" });
    await repository.remove(installed.reference);

    const processReopen = await requestResultV1(indexedDB.open(processDatabaseName));
    const storedProcess = await requestResultV1(
      processReopen.transaction("processes", "readonly").objectStore("processes").get("process-1"),
    );
    expect(storedProcess).toEqual({ processId: "process-1", conversation: "durable" });
    processReopen.close();

    const packageDatabase = await requestResultV1(indexedDB.open("program-packages.isolated"));
    expect(packageDatabase.version).toBe(programPackageInstallationDatabaseVersionV1);
    expect([...packageDatabase.objectStoreNames]).toEqual([
      programPackageInstallationCurrentObjectStoreNameV1,
      programPackageInstallationMetadataObjectStoreNameV1,
      programPackageInstallationObjectStoreNameV1,
    ]);
    packageDatabase.close();
  });

  it("returns owned bytes so callers cannot mutate an installed package", async () => {
    const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB: new IDBFactory(),
      databaseName: "program-packages.owned",
      limits: limitsV1,
    });
    repositoriesV1.push(repository);
    const installed = await repository.install(archiveV1(), { currentSelection: "always" });
    const firstLoad = await repository.load(installed.reference);
    new Uint8Array(firstLoad!.files[0]!.bytes).fill(0);

    const secondLoad = await repository.load(installed.reference);
    expect(new TextDecoder().decode(secondLoad!.files[0]!.bytes)).toBe(
      "Translate the admitted document.",
    );
  });

  it("resets every installed package and current selection without touching Process storage", async () => {
    const indexedDB = new IDBFactory();
    const repository = createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB,
      databaseName: "program-packages.reset",
      limits: limitsV1,
    });
    repositoriesV1.push(repository);
    const installed = await repository.install(archiveV1(), { currentSelection: "always" });

    await repository.reset();

    await expect(repository.listMetadata()).resolves.toEqual([]);
    await expect(repository.current(installed.reference.programId)).resolves.toBeNull();
    await expect(repository.load(installed.reference)).resolves.toBeNull();
  });
});

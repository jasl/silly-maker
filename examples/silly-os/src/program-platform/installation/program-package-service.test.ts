// SPDX-License-Identifier: MIT

import { zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";

import type {
  AdmittedProgramPackageArchiveV1,
  ProgramPackageArchiveV1,
} from "../package/program-package-archive.ts";
import { admitProgramPackageArchiveV1 } from "../package/program-package-archive.ts";
import {
  createProgramPackageServiceV1,
  type BundledProgramPackageSourceV1,
} from "./program-package-service.ts";
import type {
  ProgramPackageInstallationRepositoryV1,
} from "./program-package-installation-repository.ts";
import { projectProgramPackageRuntimeProfileV1 } from "../package/program-runtime-profile-descriptor.ts";
import { createMemoryProgramProcessRepositoryV1 } from "../process/memory-program-process-repository.ts";

const translationRuntimeProfileDescriptorV1 = {
  runtimeProfile: "agent.translation.v1",
  capabilityIds: [] as readonly string[],
  scriptRuntimes: [] as const,
  initialUiSurfaceIds: [] as readonly string[],
};

const bytesV1 = (text: string): ArrayBuffer => new TextEncoder().encode(text).buffer;
const limitsV1 = {
  maximumManifestBytes: 16_384,
  maximumFiles: 32,
  maximumPathBytes: 512,
  maximumFileBytes: 256_000,
  maximumPackageBytes: 1_000_000,
};

function archiveV1(version: string, instructions: string): ProgramPackageArchiveV1 {
  return {
    manifest: {
      schemaVersion: 1,
      programId: "example.translation",
      packageVersion: version,
      harnessCompatibility: "sillyos.program-harness.v1",
      runtimeProfile: "agent.translation.v1",
      name: "Translation",
      summary: "Translate one Process workset.",
      instructionsPath: "PROGRAM.md",
      settingsSchemaPath: null,
      settingsDefaultsPath: null,
      initialUiPath: null,
      scripts: [],
      capabilityIds: [],
    },
    files: [{ path: "PROGRAM.md", mediaType: "text/markdown", bytes: bytesV1(instructions) }],
  };
}

async function bundledSourceV1(
  archive: ProgramPackageArchiveV1,
  onLoad: () => void = () => undefined,
): Promise<BundledProgramPackageSourceV1> {
  const admitted = await admitProgramPackageArchiveV1(archive, { limits: limitsV1 });
  return {
    programId: admitted.reference.programId,
    metadata: {
      ...projectProgramPackageRuntimeProfileV1(admitted),
      reference: admitted.reference,
      byteLength: admitted.byteLength,
    },
    async loadArchive() {
      onLoad();
      return archive;
    },
  };
}

function memoryRepositoryV1(): ProgramPackageInstallationRepositoryV1 {
  const packages = new Map<string, AdmittedProgramPackageArchiveV1>();
  const heads = new Map<string, AdmittedProgramPackageArchiveV1["reference"]>();
  const keyV1 = (reference: AdmittedProgramPackageArchiveV1["reference"]): string =>
    `${reference.programId}\0${reference.packageVersion}\0${reference.contentDigest}`;
  return {
    async initialize() {
      return "created";
    },
    async install(archive, options) {
      const admitted = await admitProgramPackageArchiveV1(archive, { limits: limitsV1 });
      const key = keyV1(admitted.reference);
      const disposition = packages.has(key) ? "already_installed" : "installed";
      packages.set(key, admitted);
      if (
        options.currentSelection === "always" ||
        (options.currentSelection === "if_missing" &&
          !heads.has(admitted.reference.programId))
      ) heads.set(admitted.reference.programId, admitted.reference);
      return { disposition, reference: admitted.reference };
    },
    async load(reference) {
      return packages.get(keyV1(reference)) ?? null;
    },
    async listMetadata() {
      return [...packages.values()].map((entry) => ({
        ...projectProgramPackageRuntimeProfileV1(entry),
        reference: entry.reference,
        byteLength: entry.byteLength,
      }));
    },
    async current(programId) {
      return heads.get(programId) ?? null;
    },
    async remove(reference) {
      return packages.delete(keyV1(reference));
    },
    async reset() {
      packages.clear();
      heads.clear();
    },
    async dispose() {},
  };
}

describe("Program package service V1", () => {
  it("rejects contradictory fixed runtime-profile descriptors at composition", () => {
    expect(() =>
      createProgramPackageServiceV1({
        repository: memoryRepositoryV1(),
        bundledSources: [],
        supportedHarnesses: new Set(["sillyos.program-harness.v1"]),
        runtimeProfileDescriptors: [{
          runtimeProfile: "agent.translation.v1",
          capabilityIds: ["agent.text"],
          requiredCapabilityIds: ["creator.catalog"],
          scriptRuntimes: [],
          initialUiSurfaceIds: [],
        }],
      })
    ).toThrow("invalid or duplicate Program runtime profile descriptor");
  });

  it("lists bundled metadata without loading its body and materializes through ordinary installation", async () => {
    let loads = 0;
    const source = await bundledSourceV1(
      archiveV1("1.0.0", "Translate faithfully."),
      () => loads += 1,
    );
    const service = createProgramPackageServiceV1({
      repository: memoryRepositoryV1(),
      bundledSources: [source],
      supportedHarnesses: new Set(["sillyos.program-harness.v1"]),
      runtimeProfileDescriptors: [translationRuntimeProfileDescriptorV1],
    });

    expect(loads).toBe(0);
    const [available] = await service.listLibrary();
    expect(available).toMatchObject({ materialized: false });
    expect(loads).toBe(0);
    const first = await service.resolveCurrent("example.translation");
    const second = await service.resolveCurrent("example.translation");
    expect(first?.kind).toBe("ready");
    expect(second).toEqual(first);
    expect(loads).toBe(1);
    const [installed] = await service.listLibrary();
    expect(installed).toMatchObject({ materialized: true });
    expect(installed).not.toHaveProperty("origin");
  });

  it("does not let a bundled source replace the package selected for new Processes", async () => {
    const service = createProgramPackageServiceV1({
      repository: memoryRepositoryV1(),
      bundledSources: [await bundledSourceV1(archiveV1("1.0.0", "Bundled baseline."))],
      supportedHarnesses: new Set(["sillyos.program-harness.v1"]),
      runtimeProfileDescriptors: [translationRuntimeProfileDescriptorV1],
    });
    const external = await service.installArchive(
      archiveV1("2.0.0", "User-selected successor."),
    );
    await expect(service.resolveCurrent("example.translation")).resolves.toMatchObject({
      kind: "ready",
      package: { reference: external.reference },
    });
    const installed = await service.listLibrary();
    expect(installed).toHaveLength(2);
    expect(installed.filter((entry) => entry.selectedForNewProcesses)).toEqual([
      expect.objectContaining({ reference: external.reference }),
    ]);
  });

  it("converges bundled archive and external ZIP acquisition on one exact installed package", async () => {
    const baseline = archiveV1("1.0.0", "Translate faithfully.");
    const archive: ProgramPackageArchiveV1 = {
      ...baseline,
      manifest: {
        ...baseline.manifest,
        modelPromptOverlays: [{
          modelPattern: "*glm-5.3-flash*",
          path: "prompts/models/glm.md",
        }],
        recommendedModelPatterns: [
          "*glm-5.3-flash*",
          "deepseek/deepseek-v4-flash*",
        ],
      },
      files: [...baseline.files, {
        path: "prompts/models/glm.md",
        mediaType: "text/markdown",
        bytes: bytesV1("Complete the typed candidate without narration."),
      }],
    };
    const service = createProgramPackageServiceV1({
      repository: memoryRepositoryV1(),
      bundledSources: [await bundledSourceV1(archive)],
      supportedHarnesses: new Set(["sillyos.program-harness.v1"]),
      runtimeProfileDescriptors: [translationRuntimeProfileDescriptorV1],
    });

    const bundled = await service.resolveCurrent(archive.manifest.programId);
    if (bundled === null || bundled.kind !== "ready") {
      throw new Error("expected bundled package to be ready");
    }
    const external = await service.installZip(
      zipSync(Object.fromEntries([
        ["program.json", new TextEncoder().encode(JSON.stringify(archive.manifest))],
        ...archive.files.map((file) => [file.path, new Uint8Array(file.bytes)] as const),
      ])),
      {
        budgets: {
          maximumCompressedBytes: 65_536,
          maximumUncompressedBytes: 65_536,
          maximumEntries: 8,
        },
        archiveLimits: limitsV1,
      },
    );

    expect(external).toEqual({
      disposition: "already_installed",
      reference: bundled.package.reference,
    });
    await expect(service.loadExact(external.reference)).resolves.toMatchObject({
      kind: "ready",
      package: {
        reference: bundled.package.reference,
        manifest: {
          recommendedModelPatterns: [
            "*glm-5.3-flash*",
            "deepseek/deepseek-v4-flash*",
          ],
        },
      },
    });
    const installed = await service.listLibrary();
    expect(installed).toHaveLength(1);
    expect(Object.keys(installed[0]!).toSorted()).toEqual([
      "byteLength",
      "compatibility",
      "manifest",
      "materialized",
      "reference",
      "selectedForNewProcesses",
    ]);
    expect(installed[0]).toMatchObject({
      reference: bundled.package.reference,
      compatibility: "ready",
      materialized: true,
      selectedForNewProcesses: true,
    });
    await service.dispose();
  });

  it("keeps an exact predecessor loadable after selecting a successor", async () => {
    const service = createProgramPackageServiceV1({
      repository: memoryRepositoryV1(),
      bundledSources: [],
      supportedHarnesses: new Set(["sillyos.program-harness.v1"]),
      runtimeProfileDescriptors: [translationRuntimeProfileDescriptorV1],
    });
    const first = await service.installArchive(archiveV1("1.0.0", "First."));
    const second = await service.installArchive(archiveV1("2.0.0", "Second."));

    expect((await service.resolveCurrent("example.translation"))?.kind).toBe("ready");
    expect(await service.loadExact(first.reference)).toMatchObject({
      kind: "ready",
      package: { reference: first.reference },
    });
    expect(await service.loadExact(second.reference)).toMatchObject({
      kind: "ready",
      package: { reference: second.reference },
    });

    expect(await service.listLibrary()).toEqual([
      expect.objectContaining({
        reference: first.reference,
        manifest: expect.objectContaining({ name: "Translation" }),
        compatibility: "ready",
        selectedForNewProcesses: false,
      }),
      expect.objectContaining({
        reference: second.reference,
        manifest: expect.objectContaining({ name: "Translation" }),
        compatibility: "ready",
        selectedForNewProcesses: true,
      }),
    ]);
  });

  it("selects a successor only for Processes created from the new current reference", async () => {
    const service = createProgramPackageServiceV1({
      repository: memoryRepositoryV1(),
      bundledSources: [],
      supportedHarnesses: new Set(["sillyos.program-harness.v1"]),
      runtimeProfileDescriptors: [translationRuntimeProfileDescriptorV1],
    });
    const processes = createMemoryProgramProcessRepositoryV1();
    const predecessor = await service.installArchive(archiveV1("1.0.0", "First."));
    const selectedPredecessor = await service.resolveCurrent("example.translation");
    if (selectedPredecessor === null || selectedPredecessor.kind !== "ready") {
      throw new Error("expected predecessor to be selected");
    }
    await processes.createProcess({
      processId: "process.predecessor",
      programPackage: selectedPredecessor.package.reference,
      subjectProgramId: null,
      createdAt: 1,
    });

    const successor = await service.installArchive(archiveV1("2.0.0", "Second."));
    const selectedSuccessor = await service.resolveCurrent("example.translation");
    if (selectedSuccessor === null || selectedSuccessor.kind !== "ready") {
      throw new Error("expected successor to be selected");
    }
    await processes.createProcess({
      processId: "process.successor",
      programPackage: selectedSuccessor.package.reference,
      subjectProgramId: null,
      createdAt: 2,
    });

    expect((await processes.loadProcess("process.predecessor"))?.programPackage).toEqual(
      predecessor.reference,
    );
    expect((await processes.loadProcess("process.successor"))?.programPackage).toEqual(
      successor.reference,
    );
    await expect(service.loadExact(predecessor.reference)).resolves.toMatchObject({
      kind: "ready",
      package: { reference: predecessor.reference },
    });
    await service.dispose();
  });

  it("opens exact packages in explicit degraded states without substituting current", async () => {
    const repository = memoryRepositoryV1();
    const service = createProgramPackageServiceV1({
      repository,
      bundledSources: [],
      supportedHarnesses: new Set(["sillyos.program-harness.v1"]),
      runtimeProfileDescriptors: [],
    });
    const installed = await service.installArchive(archiveV1("1.0.0", "Pinned."));
    expect(await service.loadExact(installed.reference)).toMatchObject({
      kind: "runtime_profile_unavailable",
      package: { reference: installed.reference },
    });
    expect(await service.listLibrary()).toEqual([
      expect.objectContaining({
        reference: installed.reference,
        compatibility: "runtime_profile_unavailable",
        selectedForNewProcesses: true,
      }),
    ]);

    await repository.remove(installed.reference);
    expect(await service.loadExact(installed.reference)).toEqual({
      kind: "package_missing",
      reference: installed.reference,
    });
  });

  it("does not install a bundled source merely to populate the library", async () => {
    let loads = 0;
    const service = createProgramPackageServiceV1({
      repository: memoryRepositoryV1(),
      bundledSources: [
        await bundledSourceV1(
          archiveV1("1.0.0", "Translate faithfully."),
          () => loads += 1,
        ),
      ],
      supportedHarnesses: new Set(["sillyos.program-harness.v1"]),
      runtimeProfileDescriptors: [translationRuntimeProfileDescriptorV1],
    });

    expect(await service.listLibrary()).toEqual([
      expect.objectContaining({ materialized: false }),
    ]);
    expect(loads).toBe(0);
  });

  it("lists installed package metadata without loading or rehashing package bodies", async () => {
    const repository = memoryRepositoryV1();
    await repository.install(archiveV1("1.0.0", "Installed body."), {
      currentSelection: "always",
    });
    const load = vi.spyOn(repository, "load");
    const service = createProgramPackageServiceV1({
      repository,
      bundledSources: [],
      supportedHarnesses: new Set(["sillyos.program-harness.v1"]),
      runtimeProfileDescriptors: [translationRuntimeProfileDescriptorV1],
    });

    await expect(service.listLibrary()).resolves.toEqual([
      expect.objectContaining({ materialized: true }),
    ]);
    expect(load).not.toHaveBeenCalled();
  });

  it("clears imported packages and can reinstall bundled packages through the ordinary path", async () => {
    let loads = 0;
    const service = createProgramPackageServiceV1({
      repository: memoryRepositoryV1(),
      bundledSources: [
        await bundledSourceV1(
          archiveV1("1.0.0", "Bundled baseline."),
          () => loads += 1,
        ),
      ],
      supportedHarnesses: new Set(["sillyos.program-harness.v1"]),
      runtimeProfileDescriptors: [translationRuntimeProfileDescriptorV1],
    });
    await service.resolveCurrent("example.translation");
    await service.installArchive({
      ...archiveV1("1.0.0", "Community Program."),
      manifest: {
        ...archiveV1("1.0.0", "Community Program.").manifest,
        programId: "community.translation",
      },
    });

    await service.reset();

    await expect(service.listLibrary()).resolves.toEqual([
      expect.objectContaining({ materialized: false }),
    ]);
    await service.resolveCurrent("example.translation");
    await expect(service.listLibrary()).resolves.toEqual([
      expect.objectContaining({
        reference: expect.objectContaining({ programId: "example.translation" }),
      }),
    ]);
    expect(loads).toBe(2);
  });

  it("classifies bundled and external ZIP packages by the same fixed profile facets", async () => {
    const unsupportedArchive: ProgramPackageArchiveV1 = {
      ...archiveV1("1.0.0", "Do not grant capabilities from this manifest."),
      manifest: {
        ...archiveV1("1.0.0", "Do not grant capabilities from this manifest.").manifest,
        capabilityIds: ["python.execute"],
      },
    };
    const createServiceV1 = (bundledSources: readonly BundledProgramPackageSourceV1[]) =>
      createProgramPackageServiceV1({
        repository: memoryRepositoryV1(),
        bundledSources,
        supportedHarnesses: new Set(["sillyos.program-harness.v1"]),
        runtimeProfileDescriptors: [translationRuntimeProfileDescriptorV1],
      });

    const bundled = createServiceV1([await bundledSourceV1(unsupportedArchive)]);
    await expect(bundled.resolveCurrent(unsupportedArchive.manifest.programId)).resolves
      .toMatchObject({ kind: "runtime_profile_incompatible" });

    const external = createServiceV1([]);
    const externalZip = zipSync({
      "program.json": new TextEncoder().encode(JSON.stringify(unsupportedArchive.manifest)),
      "PROGRAM.md": new TextEncoder().encode("Do not grant capabilities from this manifest."),
    });
    const installation = await external.installZip(externalZip, {
      budgets: {
        maximumCompressedBytes: 65_536,
        maximumUncompressedBytes: 65_536,
        maximumEntries: 8,
      },
      archiveLimits: limitsV1,
    });
    await expect(external.loadExact(installation.reference)).resolves.toMatchObject({
      kind: "runtime_profile_incompatible",
    });

    await Promise.all([bundled.dispose(), external.dispose()]);
  });
});

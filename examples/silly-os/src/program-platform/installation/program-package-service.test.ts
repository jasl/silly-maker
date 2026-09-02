// SPDX-License-Identifier: MIT

import { zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";

import type { ProgramPackageArchiveV1 } from "../package/program-package-archive.ts";
import {
  admitProgramPackageArchiveV1,
  readProgramPackageTextFileV1,
} from "../package/program-package-archive.ts";
import { projectProgramPackageRuntimeProfileV1 } from "../package/program-runtime-profile-descriptor.ts";
import type {
  InstalledProgramPackageV1,
  ProgramPackageInstallationRepositoryV1,
} from "./program-package-installation-repository.ts";
import {
  createProgramPackageServiceV1,
  type BundledProgramPackageSourceV1,
} from "./program-package-service.ts";

const runtimeProfileDescriptorV1 = {
  runtimeProfile: "agent.translation.v1",
  capabilityIds: [] as readonly string[],
  scriptRuntimes: [] as const,
  initialUiSurfaceIds: [] as readonly string[],
};
const limitsV1 = {
  maximumManifestBytes: 16_384,
  maximumFiles: 32,
  maximumPathBytes: 512,
  maximumFileBytes: 256_000,
  maximumPackageBytes: 1_000_000,
};
const bytesV1 = (text: string): ArrayBuffer => new TextEncoder().encode(text).buffer;

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
    },
    async loadArchive() {
      onLoad();
      return archive;
    },
  };
}

function memoryRepositoryV1(): ProgramPackageInstallationRepositoryV1 {
  const packages = new Map<string, InstalledProgramPackageV1>();
  let nextInstallationId = 1;
  return {
    async initialize() {
      return "created";
    },
    async install(archive, options) {
      const admitted = await admitProgramPackageArchiveV1(archive, { limits: limitsV1 });
      const disposition = packages.has(admitted.reference.programId) ? "replaced" : "installed";
      packages.set(admitted.reference.programId, {
        acquisition: options.acquisition,
        installationId: `installation.${String(nextInstallationId++)}`,
        package: admitted,
      });
      return { disposition, reference: admitted.reference };
    },
    async load(programId) {
      return packages.get(programId) ?? null;
    },
    async listMetadata() {
      return [...packages.values()].map((entry) => ({
        acquisition: entry.acquisition,
        installationId: entry.installationId,
        metadata: {
          ...projectProgramPackageRuntimeProfileV1(entry.package),
          reference: entry.package.reference,
        },
      }));
    },
    async remove(programId, options = {}) {
      const current = packages.get(programId);
      if (
        current !== undefined && options.ifAcquisition !== undefined &&
        current.acquisition !== options.ifAcquisition
      ) return false;
      if (
        current !== undefined && options.ifInstallationId !== undefined &&
        current.installationId !== options.ifInstallationId
      ) return false;
      return packages.delete(programId);
    },
    async reset() {
      packages.clear();
    },
    async dispose() {},
  };
}

function createServiceV1(input: {
  readonly repository?: ProgramPackageInstallationRepositoryV1;
  readonly bundledSources?: readonly BundledProgramPackageSourceV1[];
  readonly runtimeProfileDescriptors?: readonly typeof runtimeProfileDescriptorV1[];
}) {
  return createProgramPackageServiceV1({
    repository: input.repository ?? memoryRepositoryV1(),
    bundledSources: input.bundledSources ?? [],
    supportedHarnesses: new Set(["sillyos.program-harness.v1"]),
    runtimeProfileDescriptors: input.runtimeProfileDescriptors ?? [runtimeProfileDescriptorV1],
  });
}

describe("Program package service V1", () => {
  it("rejects contradictory fixed runtime-profile descriptors", () => {
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

  it("lists bundled metadata lazily and loads through ordinary admission once per service", async () => {
    let loads = 0;
    const source = await bundledSourceV1(
      archiveV1("1.0.0", "Translate faithfully."),
      () => loads += 1,
    );
    const service = createServiceV1({ bundledSources: [source] });

    await expect(service.listLibrary()).resolves.toEqual([
      expect.objectContaining({ reference: source.metadata.reference }),
    ]);
    expect(loads).toBe(0);
    const first = await service.resolveCurrent("example.translation");
    const second = await service.resolveCurrent("example.translation");
    expect(first?.kind).toBe("ready");
    expect(second).toEqual(first);
    expect(loads).toBe(1);
  });

  it("refreshes a bundled compatible implementation after a SillyOS update", async () => {
    const repository = memoryRepositoryV1();
    const oldService = createServiceV1({
      repository,
      bundledSources: [await bundledSourceV1(archiveV1("1.0.0", "Old instructions."))],
    });
    const old = await oldService.resolveCurrent("example.translation");
    if (old === null || old.kind !== "ready") throw new Error("expected old Program");

    const newService = createServiceV1({
      repository,
      bundledSources: [await bundledSourceV1(archiveV1("1.0.0", "Fixed instructions."))],
    });
    const current = await newService.resolveForProcess(old.package.reference);
    expect(current.kind).toBe("ready");
    if (current.kind !== "ready") throw new Error("expected compatible Program");
    expect(readProgramPackageTextFileV1(current.package, "PROGRAM.md")).toBe(
      "Fixed instructions.",
    );
  });

  it("observes a compatible bundled implementation replaced by another service", async () => {
    const repository = memoryRepositoryV1();
    const firstService = createServiceV1({
      repository,
      bundledSources: [await bundledSourceV1(archiveV1("1.0.0", "First instructions."))],
    });
    const first = await firstService.resolveCurrent("example.translation");
    if (first === null || first.kind !== "ready") throw new Error("expected first Program");

    const secondService = createServiceV1({
      repository,
      bundledSources: [await bundledSourceV1(archiveV1("1.0.0", "Current instructions."))],
    });
    const current = await secondService.resolveCurrent("example.translation");
    if (current === null || current.kind !== "ready") throw new Error("expected current Program");

    const observed = await firstService.resolveCurrent("example.translation");
    expect(observed).toMatchObject({
      kind: "ready",
      implementationId: current.implementationId,
    });
    if (observed === null || observed.kind !== "ready") {
      throw new Error("expected observed Program");
    }
    expect(readProgramPackageTextFileV1(observed.package, "PROGRAM.md")).toBe(
      "Current instructions.",
    );
  });

  it("restores a bundled implementation after another service clears the repository", async () => {
    let loads = 0;
    const repository = memoryRepositoryV1();
    const source = await bundledSourceV1(
      archiveV1("1.0.0", "Bundled."),
      () => loads += 1,
    );
    const service = createServiceV1({ repository, bundledSources: [source] });

    const first = await service.resolveCurrent("example.translation");
    if (first === null || first.kind !== "ready") throw new Error("expected first Program");
    await expect(repository.load("example.translation")).resolves.not.toBeNull();

    await repository.reset();
    await expect(repository.load("example.translation")).resolves.toBeNull();
    const current = await service.resolveCurrent("example.translation");
    if (current === null || current.kind !== "ready") throw new Error("expected current Program");
    const stored = await repository.load("example.translation");
    expect(loads).toBe(2);
    expect(current.implementationId).not.toBe(first.implementationId);
    expect(current.implementationId).toBe(stored?.installationId);
  });

  it("keeps one external current implementation instead of restoring the bundled body", async () => {
    let bundledLoads = 0;
    const service = createServiceV1({
      bundledSources: [
        await bundledSourceV1(archiveV1("1.0.0", "Bundled."), () => bundledLoads += 1),
      ],
    });
    const external = await service.installArchive(archiveV1("2.0.0", "External."));

    await expect(service.resolveCurrent("example.translation")).resolves.toMatchObject({
      kind: "ready",
      package: { reference: external.reference },
    });
    expect(bundledLoads).toBe(0);
    await expect(service.listLibrary()).resolves.toEqual([
      expect.objectContaining({
        reference: external.reference,
        externalRemoval: {
          action: "restore_bundled",
          installationId: expect.any(String),
        },
      }),
    ]);
  });

  it("removes an external override and restores the current bundled implementation", async () => {
    const bundled = archiveV1("1.0.0", "Bundled current implementation.");
    let bundledLoads = 0;
    const service = createServiceV1({
      bundledSources: [await bundledSourceV1(bundled, () => bundledLoads += 1)],
    });
    const external = await service.installArchive(
      archiveV1("1.0.0", "External override."),
    );

    const [externalEntry] = await service.listLibrary();
    if (externalEntry?.externalRemoval === null || externalEntry === undefined) {
      throw new Error("expected external removal action");
    }
    await expect(service.removeExternal(
      external.reference.programId,
      externalEntry.externalRemoval.installationId,
    )).resolves.toBe(true);
    expect(bundledLoads).toBe(0);
    await expect(service.listLibrary()).resolves.toEqual([
      expect.objectContaining({
        reference: external.reference,
        externalRemoval: null,
      }),
    ]);
    expect(bundledLoads).toBe(0);
    const current = await service.resolveForProcess(external.reference);
    if (current.kind !== "ready") throw new Error("expected restored bundled Program");
    expect(readProgramPackageTextFileV1(current.package, "PROGRAM.md")).toBe(
      "Bundled current implementation.",
    );
    expect(bundledLoads).toBe(1);
    await expect(service.removeExternal(
      external.reference.programId,
      externalEntry.externalRemoval.installationId,
    )).resolves.toBe(false);
  });

  it("removes an external-only implementation without retaining a runnable package", async () => {
    const service = createServiceV1({});
    const external = await service.installArchive(archiveV1("1.0.0", "External only."));

    await expect(service.listLibrary()).resolves.toEqual([
      expect.objectContaining({
        reference: external.reference,
        externalRemoval: {
          action: "remove",
          installationId: expect.any(String),
        },
      }),
    ]);
    const [externalEntry] = await service.listLibrary();
    if (externalEntry?.externalRemoval === null || externalEntry === undefined) {
      throw new Error("expected external removal action");
    }
    await expect(service.removeExternal(
      external.reference.programId,
      externalEntry.externalRemoval.installationId,
    )).resolves.toBe(true);
    await expect(service.resolveForProcess(external.reference)).resolves.toEqual({
      kind: "package_missing",
      reference: external.reference,
    });
    await expect(service.listLibrary()).resolves.toEqual([]);
  });

  it("does not remove an external successor installed after the Library projection", async () => {
    const repository = memoryRepositoryV1();
    const service = createServiceV1({ repository });
    await service.installArchive(archiveV1("1.0.0", "First external implementation."));
    const [staleEntry] = await service.listLibrary();
    if (staleEntry?.externalRemoval === null || staleEntry === undefined) {
      throw new Error("expected stale external removal action");
    }
    await service.installArchive(archiveV1("1.0.0", "Current external implementation."));
    const current = await repository.load("example.translation");

    await expect(service.removeExternal(
      staleEntry.reference.programId,
      staleEntry.externalRemoval.installationId,
    )).resolves.toBe(false);
    await expect(repository.load("example.translation")).resolves.toMatchObject({
      acquisition: "external",
      installationId: current?.installationId,
    });
  });

  it("does not remove an external implementation that wins while retired bundled data clears", async () => {
    const baseRepository = memoryRepositoryV1();
    await baseRepository.install(archiveV1("1.0.0", "Retired bundled implementation."), {
      acquisition: "bundled",
    });
    let racePending = true;
    const external = archiveV1("1.0.0", "Concurrent external implementation.");
    const repository: ProgramPackageInstallationRepositoryV1 = {
      ...baseRepository,
      async remove(programId, options) {
        if (racePending) {
          racePending = false;
          await baseRepository.install(external, { acquisition: "external" });
        }
        return await baseRepository.remove(programId, options);
      },
    };
    const service = createServiceV1({ repository });

    const current = await service.resolveCurrent("example.translation");

    expect(current).toMatchObject({
      kind: "ready",
      package: { reference: { programId: "example.translation" } },
    });
    await expect(repository.load("example.translation")).resolves.toMatchObject({
      acquisition: "external",
    });
  });

  it("keeps an in-flight bundled refresh owned until reset has cleared its result", async () => {
    let markBundledLoadStarted: (() => void) | undefined;
    const bundledLoadStarted = new Promise<void>((resolve) => {
      markBundledLoadStarted = resolve;
    });
    let continueBundledLoad: (() => void) | undefined;
    const bundledLoadGate = new Promise<void>((resolve) => {
      continueBundledLoad = resolve;
    });
    const bundled = archiveV1("1.0.0", "Deferred bundled implementation.");
    const source = await bundledSourceV1(bundled);
    const repository = memoryRepositoryV1();
    const service = createServiceV1({
      repository,
      bundledSources: [{
        ...source,
        async loadArchive() {
          markBundledLoadStarted?.();
          await bundledLoadGate;
          return bundled;
        },
      }],
    });
    const pendingResolution = service.resolveCurrent("example.translation");
    await bundledLoadStarted;
    await service.installArchive(archiveV1("1.0.0", "Temporary external implementation."));
    const [externalEntry] = await service.listLibrary();
    if (externalEntry?.externalRemoval === null || externalEntry === undefined) {
      throw new Error("expected external removal action");
    }
    await service.removeExternal(
      externalEntry.reference.programId,
      externalEntry.externalRemoval.installationId,
    );
    let resetSettled = false;
    const reset = service.reset().then(() => {
      resetSettled = true;
    });
    await Promise.resolve();
    expect(resetSettled).toBe(false);

    continueBundledLoad?.();
    await Promise.all([pendingResolution, reset]);

    await expect(repository.load("example.translation")).resolves.toBeNull();
  });

  it("accepts an external implementation that wins after a bundled refresh commits", async () => {
    const baseRepository = memoryRepositoryV1();
    const externalArchive = archiveV1("1.0.0", "External winner.");
    let racePending = true;
    const repository: ProgramPackageInstallationRepositoryV1 = {
      ...baseRepository,
      async install(archive, options) {
        const result = await baseRepository.install(archive, options);
        if (options.acquisition === "bundled" && racePending) {
          racePending = false;
          await baseRepository.install(externalArchive, { acquisition: "external" });
        }
        return result;
      },
    };
    const service = createServiceV1({
      repository,
      bundledSources: [await bundledSourceV1(archiveV1("1.0.0", "Bundled candidate."))],
    });

    const current = await service.resolveCurrent("example.translation");
    expect(current?.kind).toBe("ready");
    if (current === null || current.kind !== "ready") throw new Error("expected current Program");
    expect(readProgramPackageTextFileV1(current.package, "PROGRAM.md")).toBe("External winner.");
    await expect(repository.load("example.translation")).resolves.toMatchObject({
      acquisition: "external",
    });
  });

  it("uses current compatible bytes but degrades an incompatible or missing Process", async () => {
    const repository = memoryRepositoryV1();
    const service = createServiceV1({ repository });
    const first = await service.installArchive(archiveV1("1.0.0", "First."));
    await service.installArchive(archiveV1("1.0.0", "Compatible fix."));
    const compatible = await service.resolveForProcess(first.reference);
    if (compatible.kind !== "ready") throw new Error("expected compatible Program");
    expect(readProgramPackageTextFileV1(compatible.package, "PROGRAM.md")).toBe("Compatible fix.");

    const successor = await service.installArchive(archiveV1("2.0.0", "Incompatible."));
    await expect(service.resolveForProcess(first.reference)).resolves.toEqual({
      kind: "process_incompatible",
      reference: first.reference,
      currentReference: successor.reference,
    });
    await repository.remove("example.translation");
    await expect(service.resolveForProcess(successor.reference)).resolves.toEqual({
      kind: "package_missing",
      reference: successor.reference,
    });
  });

  it("does not keep a removed bundled implementation runnable", async () => {
    const repository = memoryRepositoryV1();
    const withProgram = createServiceV1({
      repository,
      bundledSources: [await bundledSourceV1(archiveV1("1.0.0", "Bundled."))],
    });
    const ready = await withProgram.resolveCurrent("example.translation");
    if (ready === null || ready.kind !== "ready") throw new Error("expected bundled Program");

    const withoutProgram = createServiceV1({ repository, bundledSources: [] });
    await expect(withoutProgram.resolveForProcess(ready.package.reference)).resolves.toEqual({
      kind: "package_missing",
      reference: ready.package.reference,
    });
    await expect(repository.load("example.translation")).resolves.toBeNull();
  });

  it("converges ZIP acquisition on the same current implementation and compatibility checks", async () => {
    const unsupported = {
      ...archiveV1("1.0.0", "Do not grant undeclared capabilities."),
      manifest: {
        ...archiveV1("1.0.0", "Do not grant undeclared capabilities.").manifest,
        capabilityIds: ["python.execute"],
      },
    } satisfies ProgramPackageArchiveV1;
    const service = createServiceV1({});
    const installed = await service.installZip(
      zipSync({
        "program.json": new TextEncoder().encode(JSON.stringify(unsupported.manifest)),
        "PROGRAM.md": new TextEncoder().encode("Do not grant undeclared capabilities."),
      }),
      {
        budgets: {
          maximumCompressedBytes: 65_536,
          maximumUncompressedBytes: 65_536,
          maximumEntries: 8,
        },
        archiveLimits: limitsV1,
      },
    );
    await expect(service.resolveForProcess(installed.reference)).resolves.toMatchObject({
      kind: "runtime_profile_incompatible",
    });
  });

  it("lists installation metadata without loading package bodies", async () => {
    const repository = memoryRepositoryV1();
    await repository.install(archiveV1("1.0.0", "Installed body."), {
      acquisition: "external",
    });
    const load = vi.spyOn(repository, "load");
    const service = createServiceV1({ repository });

    await expect(service.listLibrary()).resolves.toEqual([
      expect.objectContaining({
        reference: expect.objectContaining({ programId: "example.translation" }),
      }),
    ]);
    expect(load).not.toHaveBeenCalled();
  });

  it("reset drops external implementations and reloads bundled sources on demand", async () => {
    let loads = 0;
    const service = createServiceV1({
      bundledSources: [
        await bundledSourceV1(archiveV1("1.0.0", "Bundled."), () => loads += 1),
      ],
    });
    await service.resolveCurrent("example.translation");
    await service.reset();

    await expect(service.listLibrary()).resolves.toEqual([
      expect.objectContaining({
        reference: expect.objectContaining({ programId: "example.translation" }),
      }),
    ]);
    await service.resolveCurrent("example.translation");
    expect(loads).toBe(2);
  });
});

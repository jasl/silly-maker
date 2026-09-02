// SPDX-License-Identifier: MIT

import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BrowserProgramWorkspaceAuthorityHostV1 } from "../application/workspace/browser-program-workspace-authority.ts";
import type { ProgramDataRepositoryV1 } from "../application/persistence/program-data-repository.ts";
import type {
  ActiveProgramRuntimeHandleV1,
  LoadProgramRuntimeControllerAdapterV1,
  ProgramRuntimeControllerAdapterV1,
} from "./program-runtime-controller.ts";
import { createProgramRuntimeSurfaceDrainOwnerV1 } from "./program-runtime-controller.ts";
import {
  createIndexedDbProgramPackageInstallationRepositoryV1,
} from "../program-platform/installation/indexeddb-program-package-installation-repository.ts";
import {
  createProgramPackageServiceV1,
  type ProgramPackageServiceV1,
} from "../program-platform/installation/program-package-service.ts";
import {
  admitProgramPackageArchiveV1,
  sillyOsProgramHarnessCompatibilityV1,
  type ProgramPackageArchiveV1,
} from "../program-platform/package/program-package-archive.ts";
import { projectProgramPackageRuntimeProfileV1 } from "../program-platform/package/program-runtime-profile-descriptor.ts";
import { creatorProgramIdV1 } from "../../programs/creator/distribution/bundled-package-source.ts";
import {
  creatorProgramRuntimeProfileDescriptorV1,
  creatorProgramRuntimeProfileV1,
} from "../../programs/creator/runtime-profile/creator-runtime-profile-descriptor.ts";
import { translationProgramIdV1 } from "../../programs/translation/distribution/bundled-package-source.ts";
import {
  translationProgramRuntimeProfileDescriptorV1,
  translationProgramRuntimeProfileV1,
} from "../../programs/translation/runtime-profile/translation-runtime-profile-descriptor.ts";
import {
  createSillyOsProgramControllerOwnerV1,
  type SillyOsProgramControllerOwnerV1,
} from "./program-controller-owner.ts";

interface RuntimeControllerRecordV1 {
  readonly runtimeProfile: string;
  readonly input: Parameters<ProgramRuntimeControllerAdapterV1["create"]>[0];
  readonly handle: ActiveProgramRuntimeHandleV1;
  readonly close: ReturnType<typeof vi.fn>;
  readonly dispose: ReturnType<typeof vi.fn>;
}

const runtimeRecordsV1: RuntimeControllerRecordV1[] = [];
const cleanupV1: (() => Promise<void>)[] = [];

function createRuntimeHandleV1(
  runtimeProfile: string,
  input: Parameters<ProgramRuntimeControllerAdapterV1["create"]>[0],
): ActiveProgramRuntimeHandleV1 {
  const close = vi.fn(async () => true);
  const dispose = vi.fn(async () => undefined);
  const handle: ActiveProgramRuntimeHandleV1 = {
    programPackage: input.programPackage,
    programImplementationId: input.programImplementationId,
    controller: { runtimeProfile },
    surfaceDrainOwner: createProgramRuntimeSurfaceDrainOwnerV1(),
    getSnapshot: () => ({ runtimeProfile }),
    subscribe: () => () => {},
    loadSurface: async () => ({
      Surface: () => null,
    }),
    close,
    dispose,
  };
  runtimeRecordsV1.push({
    runtimeProfile,
    input,
    handle,
    close,
    dispose,
  });
  return handle;
}

const loadRuntimeControllerAdapterV1: LoadProgramRuntimeControllerAdapterV1 = async (
  runtimeProfile,
) =>
  runtimeProfile === creatorProgramRuntimeProfileV1 ||
    runtimeProfile === translationProgramRuntimeProfileV1
    ? {
      runtimeProfile,
      async create(input) {
        return createRuntimeHandleV1(runtimeProfile, input);
      },
    }
    : null;

beforeEach(() => {
  runtimeRecordsV1.length = 0;
});

afterEach(async () => {
  await Promise.all(cleanupV1.splice(0).map(async (cleanup) => await cleanup()));
});

function programArchiveV1(input: {
  readonly programId: string;
  readonly packageVersion: string;
  readonly runtimeProfile: string;
  readonly instructions: string;
  readonly harnessCompatibility?: string;
}): ProgramPackageArchiveV1 {
  return {
    manifest: {
      schemaVersion: 1,
      programId: input.programId,
      packageVersion: input.packageVersion,
      harnessCompatibility: input.harnessCompatibility ?? sillyOsProgramHarnessCompatibilityV1,
      runtimeProfile: input.runtimeProfile,
      name: input.programId,
      summary: `Test package ${input.packageVersion}`,
      instructionsPath: "PROGRAM.md",
      settingsSchemaPath: null,
      settingsDefaultsPath: null,
      initialUiPath: null,
      scripts: [],
      capabilityIds: input.runtimeProfile === creatorProgramRuntimeProfileV1
        ? ["creator.catalog"]
        : input.runtimeProfile === translationProgramRuntimeProfileV1
        ? [
          "program.resource.read",
          "workspace.read",
          "workspace.search",
          "workspace.write",
        ]
        : [],
    },
    files: [{
      path: "PROGRAM.md",
      mediaType: "text/markdown",
      bytes: new TextEncoder().encode(input.instructions).buffer,
    }],
  };
}

function bundledArchivesV1(): {
  readonly creator: ProgramPackageArchiveV1;
  readonly translation: ProgramPackageArchiveV1;
} {
  return {
    creator: programArchiveV1({
      programId: creatorProgramIdV1,
      packageVersion: "1.0.0",
      runtimeProfile: creatorProgramRuntimeProfileV1,
      instructions: "Create one Program.",
    }),
    translation: programArchiveV1({
      programId: translationProgramIdV1,
      packageVersion: "1.0.0",
      runtimeProfile: translationProgramRuntimeProfileV1,
      instructions: "Translate one workset.",
    }),
  };
}

interface OwnerFixtureV1 {
  readonly owner: SillyOsProgramControllerOwnerV1;
  readonly packages: ProgramPackageServiceV1;
  readonly sourceLoads: { creator: number; translation: number };
  readonly repository: ProgramDataRepositoryV1;
  readonly workspace: BrowserProgramWorkspaceAuthorityHostV1;
  readonly reportFailure: ReturnType<typeof vi.fn>;
}

async function ownerFixtureV1(
  loadRuntimeControllerAdapter: LoadProgramRuntimeControllerAdapterV1 =
    loadRuntimeControllerAdapterV1,
): Promise<OwnerFixtureV1> {
  const archives = bundledArchivesV1();
  const [creatorMetadata, translationMetadata] = await Promise.all(
    [archives.creator, archives.translation].map(async (archive) => {
      const admitted = await admitProgramPackageArchiveV1(archive, {
        limits: {
          maximumManifestBytes: 65_536,
          maximumFiles: 128,
          maximumPathBytes: 1_024,
          maximumFileBytes: 1_000_000,
          maximumPackageBytes: 4_000_000,
        },
      });
      return {
        ...projectProgramPackageRuntimeProfileV1(admitted),
        reference: admitted.reference,
      };
    }),
  );
  const sourceLoads = { creator: 0, translation: 0 };
  const packages = createProgramPackageServiceV1({
    repository: createIndexedDbProgramPackageInstallationRepositoryV1({
      indexedDB: new IDBFactory(),
      databaseName: `program-controller-owner.${crypto.randomUUID()}`,
      limits: {
        maximumManifestBytes: 65_536,
        maximumFiles: 128,
        maximumPathBytes: 1_024,
        maximumFileBytes: 1_000_000,
        maximumPackageBytes: 4_000_000,
      },
    }),
    bundledSources: [
      {
        programId: creatorProgramIdV1,
        metadata: creatorMetadata!,
        async loadArchive() {
          sourceLoads.creator += 1;
          return archives.creator;
        },
      },
      {
        programId: translationProgramIdV1,
        metadata: translationMetadata!,
        async loadArchive() {
          sourceLoads.translation += 1;
          return archives.translation;
        },
      },
    ],
    supportedHarnesses: new Set([sillyOsProgramHarnessCompatibilityV1]),
    runtimeProfileDescriptors: [
      creatorProgramRuntimeProfileDescriptorV1,
      translationProgramRuntimeProfileDescriptorV1,
    ],
  });
  const repository = {
    initialize: vi.fn(async () => undefined),
    loadProcess: vi.fn(async () => null),
    loadTranscriptPage: vi.fn(async () => null),
    listRecentProcessSummaries: vi.fn(async (input) => ({
      before: input.before,
      summaries: [],
      byteLength: 0,
      nextCursor: null,
    })),
  } as unknown as ProgramDataRepositoryV1;
  const workspace = {
    probeProcessWorkspace: vi.fn(async () => true),
  } as unknown as BrowserProgramWorkspaceAuthorityHostV1;
  const reportFailure = vi.fn();
  const owner = createSillyOsProgramControllerOwnerV1({
    repository,
    workspace,
    packages,
    loadRuntimeControllerAdapter,
    reportFailure,
  });
  cleanupV1.push(async () => {
    await owner.dispose();
    await packages.dispose();
  });
  return { owner, packages, sourceLoads, repository, workspace, reportFailure };
}

describe("SillyOS Program controller owner", () => {
  it("joins each Surface retirement once across owner retirement and React unregister", async () => {
    const surfaceDrainOwner = createProgramRuntimeSurfaceDrainOwnerV1();
    const quiesce = vi.fn(async () => undefined);
    const retire = vi.fn(async () => undefined);
    const unregister = surfaceDrainOwner.register({ quiesce, retire });

    await surfaceDrainOwner.quiesce();
    await surfaceDrainOwner.retire();
    unregister();
    await Promise.resolve();

    expect(quiesce).toHaveBeenCalledTimes(1);
    expect(retire).toHaveBeenCalledTimes(1);
  });

  it("shares an in-flight Surface quiesce with unregister and still retires after failure", async () => {
    const surfaceDrainOwner = createProgramRuntimeSurfaceDrainOwnerV1();
    let releaseFirstDrain!: () => void;
    const firstDrainReleased = new Promise<void>((resolve) => {
      releaseFirstDrain = resolve;
    });
    let attempt = 0;
    const quiesce = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) {
        await firstDrainReleased;
        throw new Error("temporary Surface cleanup failure");
      }
    });
    const retire = vi.fn(async () => undefined);
    const unregister = surfaceDrainOwner.register({ quiesce, retire });
    const first = surfaceDrainOwner.quiesce();
    await Promise.resolve();
    unregister();
    releaseFirstDrain();

    await expect(first).rejects.toThrow("temporary Surface cleanup failure");
    await expect(surfaceDrainOwner.retire()).resolves.toBeUndefined();
    expect(quiesce).toHaveBeenCalledTimes(1);
    expect(retire).toHaveBeenCalledTimes(1);
  });

  it("starts at the Library and initializes storage without loading a privileged Program", async () => {
    const fixture = await ownerFixtureV1();

    expect(fixture.owner.getSnapshot().activeRoute).toBe("library");
    expect(fixture.owner.getSnapshot().activeProgram).toBeNull();
    await fixture.owner.initialize();

    expect(fixture.repository.initialize).toHaveBeenCalledTimes(1);
    expect(fixture.sourceLoads).toEqual({ creator: 0, translation: 0 });
    expect((await fixture.packages.listLibrary()).map((entry) => entry.reference.programId))
      .toEqual([creatorProgramIdV1, translationProgramIdV1]);
    expect(fixture.sourceLoads).toEqual({ creator: 0, translation: 0 });
    expect(runtimeRecordsV1).toHaveLength(0);
    expect(fixture.owner.getSnapshot().activeRoute).toBe("library");
  });

  it("launches current compatible Creator and Translation implementations and releases each on return", async () => {
    const fixture = await ownerFixtureV1();
    await fixture.owner.initialize();
    const installed = await fixture.packages.listLibrary();
    const creator = installed.find(({ reference }) => reference.programId === creatorProgramIdV1);
    const translation = installed.find(({ reference }) =>
      reference.programId === translationProgramIdV1
    );
    if (creator === undefined || translation === undefined) {
      throw new Error("expected both bundled Programs");
    }
    const creatorReady = await fixture.packages.resolveCurrent(creator.reference.programId);
    const translationReady = await fixture.packages.resolveCurrent(translation.reference.programId);
    if (creatorReady?.kind !== "ready" || translationReady?.kind !== "ready") {
      throw new Error("expected both bundled Programs to be ready");
    }

    await expect(fixture.owner.launch(creator.reference.programId)).resolves.toBe("program");
    expect(fixture.owner.getSnapshot().activeRoute).toBe("program");
    expect(runtimeRecordsV1).toHaveLength(1);
    expect(
      (runtimeRecordsV1[0]!.input.programPackage as { reference: unknown }).reference,
    ).toEqual(creator.reference);
    expect(runtimeRecordsV1[0]!.input.programImplementationId).toBe(
      creatorReady.implementationId,
    );
    expect(runtimeRecordsV1[0]!.handle.programImplementationId).toBe(
      creatorReady.implementationId,
    );
    expect(await fixture.owner.openLibrary()).toBe(true);
    expect(runtimeRecordsV1[0]!.close).toHaveBeenCalledTimes(1);
    expect(runtimeRecordsV1[0]!.dispose).toHaveBeenCalledTimes(1);
    expect(fixture.owner.getSnapshot().activeRoute).toBe("library");

    await expect(fixture.owner.launch(translation.reference.programId)).resolves.toBe("program");
    expect(fixture.owner.getSnapshot().activeRoute).toBe("program");
    expect(runtimeRecordsV1).toHaveLength(2);
    expect(
      (runtimeRecordsV1[1]!.input.programPackage as { reference: unknown }).reference,
    ).toEqual(translation.reference);
    expect(runtimeRecordsV1[1]!.input.programImplementationId).toBe(
      translationReady.implementationId,
    );
    expect(runtimeRecordsV1[1]!.handle.programImplementationId).toBe(
      translationReady.implementationId,
    );
    expect(await fixture.owner.openLibrary()).toBe(true);
    expect(runtimeRecordsV1[1]!.close).toHaveBeenCalledTimes(1);
    expect(runtimeRecordsV1[1]!.dispose).toHaveBeenCalledTimes(1);
    expect(fixture.owner.getSnapshot().activeRoute).toBe("library");
  });

  it("keeps the active Program mounted until its lazy Surface cleanup settles", async () => {
    const fixture = await ownerFixtureV1();
    await fixture.owner.initialize();
    const creator = (await fixture.packages.listLibrary()).find(({ reference }) =>
      reference.programId === creatorProgramIdV1
    );
    if (creator === undefined) throw new Error("Creator unavailable");
    await fixture.owner.launch(creator.reference.programId);
    const active = runtimeRecordsV1[0]!;
    let releaseSurfaceDrain!: () => void;
    const surfaceDrainReleased = new Promise<void>((resolve) => {
      releaseSurfaceDrain = resolve;
    });
    let observeSurfaceDrain!: () => void;
    const surfaceDrainObserved = new Promise<void>((resolve) => {
      observeSurfaceDrain = resolve;
    });
    active.handle.surfaceDrainOwner.register({
      quiesce: async () => {
        observeSurfaceDrain();
        await surfaceDrainReleased;
      },
      retire: async () => undefined,
    });

    const openingLibrary = fixture.owner.openLibrary();
    await surfaceDrainObserved;
    expect(fixture.owner.getSnapshot().activeProgram).toBe(active.handle);
    expect(active.dispose).not.toHaveBeenCalled();

    releaseSurfaceDrain();
    await expect(openingLibrary).resolves.toBe(true);
    expect(fixture.owner.getSnapshot().activeProgram).toBeNull();
    expect(active.dispose).toHaveBeenCalledTimes(1);
  });

  it("drains the active Surface before closing and disposing its runtime", async () => {
    const fixture = await ownerFixtureV1();
    await fixture.owner.initialize();
    const creator = (await fixture.packages.listLibrary()).find(({ reference }) =>
      reference.programId === creatorProgramIdV1
    );
    if (creator === undefined) throw new Error("Creator unavailable");
    await fixture.owner.launch(creator.reference.programId);
    const active = runtimeRecordsV1[0]!;
    const order: string[] = [];
    active.handle.surfaceDrainOwner.register({
      quiesce: async () => {
        order.push("quiesce");
      },
      retire: async () => {
        order.push("retire");
      },
    });
    active.close.mockImplementation(async () => {
      order.push("close");
      return true;
    });
    active.dispose.mockImplementation(async () => {
      order.push("dispose");
    });

    await expect(fixture.owner.openLibrary()).resolves.toBe(true);

    expect(order).toEqual(["quiesce", "close", "retire", "dispose"]);
    expect(fixture.owner.getSnapshot()).toMatchObject({
      activeRoute: "library",
      activeProgram: null,
    });
  });

  it("retains the active Program without closing it when Surface drain fails", async () => {
    const fixture = await ownerFixtureV1();
    await fixture.owner.initialize();
    const creator = (await fixture.packages.listLibrary()).find(({ reference }) =>
      reference.programId === creatorProgramIdV1
    );
    if (creator === undefined) throw new Error("Creator unavailable");
    await fixture.owner.launch(creator.reference.programId);
    const active = runtimeRecordsV1[0]!;
    const before = fixture.owner.getSnapshot();
    const quiesce = vi.fn()
      .mockRejectedValueOnce(new Error("temporary Surface cleanup failure"))
      .mockResolvedValueOnce(undefined);
    active.handle.surfaceDrainOwner.register({
      quiesce,
      retire: async () => undefined,
    });

    await expect(fixture.owner.openLibrary()).resolves.toBe(false);

    expect(fixture.owner.getSnapshot()).toBe(before);
    expect(active.close).not.toHaveBeenCalled();
    expect(active.dispose).not.toHaveBeenCalled();
    expect(fixture.reportFailure).toHaveBeenCalledWith(
      "silly_os.program_library_open_failed",
      expect.objectContaining({ message: "temporary Surface cleanup failure" }),
    );

    await expect(fixture.owner.openLibrary()).resolves.toBe(true);
    expect(quiesce).toHaveBeenCalledTimes(2);
    expect(active.close).toHaveBeenCalledTimes(1);
    expect(active.dispose).toHaveBeenCalledTimes(1);
  });

  it("keeps a quiesced predecessor usable when controller close declines", async () => {
    const fixture = await ownerFixtureV1();
    const creator = (await fixture.packages.listLibrary()).find(({ reference }) =>
      reference.programId === creatorProgramIdV1
    );
    if (creator === undefined) throw new Error("Creator unavailable");
    await fixture.owner.launch(creator.reference.programId);
    const active = runtimeRecordsV1[0]!;
    const quiesce = vi.fn(async () => undefined);
    const retire = vi.fn(async () => undefined);
    active.handle.surfaceDrainOwner.register({ quiesce, retire });
    active.close.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await expect(fixture.owner.openLibrary()).resolves.toBe(false);

    expect(fixture.owner.getSnapshot().activeProgram).toBe(active.handle);
    expect(quiesce).toHaveBeenCalledTimes(1);
    expect(retire).not.toHaveBeenCalled();
    expect(active.dispose).not.toHaveBeenCalled();

    await expect(fixture.owner.openLibrary()).resolves.toBe(true);
    expect(quiesce).toHaveBeenCalledTimes(2);
    expect(retire).toHaveBeenCalledTimes(1);
    expect(active.dispose).toHaveBeenCalledTimes(1);
  });

  it("keeps committed navigation when predecessor disposal reports a cleanup failure", async () => {
    const fixture = await ownerFixtureV1();
    const [creator, translation] = await fixture.packages.listLibrary();
    if (creator === undefined || translation === undefined) throw new Error("packages unavailable");

    await fixture.owner.launch(creator.reference.programId);
    runtimeRecordsV1[0]!.dispose.mockRejectedValueOnce(new Error("predecessor cleanup failed"));

    await expect(fixture.owner.launch(translation.reference.programId)).resolves.toBe("program");
    expect(fixture.owner.getSnapshot().activeProgram).toBe(runtimeRecordsV1[1]!.handle);
    expect(fixture.reportFailure).toHaveBeenCalledWith(
      "silly_os.program_predecessor_dispose_failed",
      expect.any(Error),
    );

    runtimeRecordsV1[1]!.dispose.mockRejectedValueOnce(new Error("library cleanup failed"));
    await expect(fixture.owner.openLibrary()).resolves.toBe(true);
    expect(fixture.owner.getSnapshot()).toMatchObject({
      activeRoute: "library",
      activeProgram: null,
    });
    expect(fixture.reportFailure).toHaveBeenCalledWith(
      "silly_os.program_library_predecessor_dispose_failed",
      expect.any(Error),
    );
  });

  it("still disposes the controller when committed Surface retirement fails", async () => {
    const fixture = await ownerFixtureV1();
    const creator = (await fixture.packages.listLibrary()).find(({ reference }) =>
      reference.programId === creatorProgramIdV1
    );
    if (creator === undefined) throw new Error("Creator unavailable");
    await fixture.owner.launch(creator.reference.programId);
    const active = runtimeRecordsV1[0]!;
    active.handle.surfaceDrainOwner.register({
      quiesce: async () => undefined,
      retire: async () => {
        throw new Error("Surface retirement failed");
      },
    });

    await expect(fixture.owner.openLibrary()).resolves.toBe(true);

    expect(active.dispose).toHaveBeenCalledTimes(1);
    expect(fixture.reportFailure).toHaveBeenCalledWith(
      "silly_os.program_library_predecessor_dispose_failed",
      expect.objectContaining({ message: "Surface retirement failed" }),
    );
  });

  it("reports terminal cleanup failures while continuing exact resource retirement", async () => {
    const fixture = await ownerFixtureV1();
    const creator = (await fixture.packages.listLibrary()).find(({ reference }) =>
      reference.programId === creatorProgramIdV1
    );
    if (creator === undefined) throw new Error("Creator unavailable");
    await fixture.owner.launch(creator.reference.programId);
    const active = runtimeRecordsV1[0]!;
    const quiesceFailure = new Error("terminal quiesce failed");
    const retireFailure = new Error("terminal retirement failed");
    const runtimeFailure = new Error("terminal runtime disposal failed");
    const quiesce = vi.fn(async () => {
      throw quiesceFailure;
    });
    const retire = vi.fn(async () => {
      throw retireFailure;
    });
    active.handle.surfaceDrainOwner.register({ quiesce, retire });
    active.dispose.mockRejectedValueOnce(runtimeFailure);

    await expect(fixture.owner.dispose()).resolves.toBeUndefined();

    expect(quiesce).toHaveBeenCalledTimes(1);
    expect(retire).toHaveBeenCalledTimes(1);
    expect(active.dispose).toHaveBeenCalledTimes(1);
    for (const failure of [quiesceFailure, retireFailure, runtimeFailure]) {
      expect(fixture.reportFailure).toHaveBeenCalledWith(
        "silly_os.program_terminal_dispose_failed",
        failure,
      );
    }
  });

  it("lets an admitted launch publish before terminal disposal retires its candidate", async () => {
    let observeCreate!: () => void;
    const createObserved = new Promise<void>((resolve) => {
      observeCreate = resolve;
    });
    let releaseCreate!: () => void;
    const createReleased = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });
    const loadAdapter: LoadProgramRuntimeControllerAdapterV1 = async (runtimeProfile) => ({
      runtimeProfile,
      async create(input) {
        observeCreate();
        await createReleased;
        return createRuntimeHandleV1(runtimeProfile, input);
      },
    });
    const fixture = await ownerFixtureV1(loadAdapter);
    const creator = (await fixture.packages.listLibrary()).find(({ reference }) =>
      reference.programId === creatorProgramIdV1
    );
    if (creator === undefined) throw new Error("Creator unavailable");

    const launch = fixture.owner.launch(creator.reference.programId);
    await createObserved;
    const disposal = fixture.owner.dispose();
    await expect(fixture.owner.launch(creator.reference.programId)).rejects.toThrow(
      "sillyos.program_controller.disposed",
    );
    releaseCreate();

    await expect(launch).resolves.toBe("program");
    await expect(disposal).resolves.toBeUndefined();
    expect(runtimeRecordsV1).toHaveLength(1);
    expect(runtimeRecordsV1[0]!.dispose).toHaveBeenCalledOnce();
  });

  it("does not release a stale active handle twice when Library navigation races disposal", async () => {
    const fixture = await ownerFixtureV1();
    const creator = (await fixture.packages.listLibrary()).find(({ reference }) =>
      reference.programId === creatorProgramIdV1
    );
    if (creator === undefined) throw new Error("Creator unavailable");
    await fixture.owner.launch(creator.reference.programId);
    const active = runtimeRecordsV1[0]!;
    let observeClose!: () => void;
    const closeObserved = new Promise<void>((resolve) => {
      observeClose = resolve;
    });
    let releaseClose!: () => void;
    const closeReleased = new Promise<void>((resolve) => {
      releaseClose = resolve;
    });
    active.close.mockImplementation(async () => {
      observeClose();
      await closeReleased;
      return true;
    });

    const openingLibrary = fixture.owner.openLibrary();
    await closeObserved;
    const disposal = fixture.owner.dispose();
    await expect(fixture.owner.openLibrary()).resolves.toBe(false);
    releaseClose();

    await expect(openingLibrary).resolves.toBe(true);
    await expect(disposal).resolves.toBeUndefined();
    expect(active.close).toHaveBeenCalledOnce();
    expect(active.dispose).toHaveBeenCalledOnce();
    expect(fixture.owner.getSnapshot().activeProgram).toBeNull();
  });

  it("constructs bundled and external Programs through the same runtime-profile path", async () => {
    const fixture = await ownerFixtureV1();
    await fixture.owner.initialize();
    const bundled = await fixture.packages.resolveCurrent(creatorProgramIdV1);
    if (bundled === null || bundled.kind !== "ready") {
      throw new Error("Creator package unavailable");
    }
    await fixture.owner.launch(bundled.package.reference.programId);
    const bundledRecord = runtimeRecordsV1[0]!;
    const external = await fixture.packages.installArchive(programArchiveV1({
      programId: "community.creator",
      packageVersion: "7.2.0",
      runtimeProfile: creatorProgramRuntimeProfileV1,
      instructions: "Create a community Program.",
    }));

    await expect(fixture.owner.launch(external.reference.programId)).resolves.toBe("program");

    expect(runtimeRecordsV1).toHaveLength(2);
    const externalRecord = runtimeRecordsV1[1]!;
    expect(Object.keys(externalRecord.input).toSorted()).toEqual(
      Object.keys(bundledRecord.input).toSorted(),
    );
    expect(externalRecord.input.repository).toBe(fixture.repository);
    expect(externalRecord.input.workspace).toBe(fixture.workspace);
    expect(
      (externalRecord.input.programPackage as { reference: unknown }).reference,
    ).toEqual(external.reference);
    expect(bundledRecord.input).not.toHaveProperty("origin");
    expect(externalRecord.input).not.toHaveProperty("origin");
    expect(bundledRecord.close).toHaveBeenCalledTimes(1);
    expect(bundledRecord.dispose).toHaveBeenCalledTimes(1);
    expect(externalRecord.dispose).not.toHaveBeenCalled();
  });

  it("keeps a running compatible implementation stable and replaces it only with the current successor", async () => {
    const fixture = await ownerFixtureV1();
    await fixture.owner.initialize();
    const predecessor = await fixture.packages.resolveCurrent(translationProgramIdV1);
    if (predecessor === null || predecessor.kind !== "ready") {
      throw new Error("translation predecessor unavailable");
    }
    await expect(fixture.owner.launch(predecessor.package.reference.programId)).resolves.toBe(
      "program",
    );
    const predecessorRecord = runtimeRecordsV1[0]!;
    const successor = await fixture.packages.installArchive(programArchiveV1({
      programId: translationProgramIdV1,
      packageVersion: "2.0.0",
      runtimeProfile: translationProgramRuntimeProfileV1,
      instructions: "Translate a successor workset.",
    }));

    expect(predecessorRecord.close).not.toHaveBeenCalled();
    expect(predecessorRecord.dispose).not.toHaveBeenCalled();
    // A Library row selected before the install still launches by Program identity,
    // so the owner resolves the successor instead of treating the stale row as a Process marker.
    await expect(fixture.owner.launch(predecessor.package.reference.programId)).resolves.toBe(
      "program",
    );

    expect(runtimeRecordsV1).toHaveLength(2);
    const successorRecord = runtimeRecordsV1[1]!;
    expect(
      (predecessorRecord.input.programPackage as { reference: unknown }).reference,
    ).toEqual(predecessor.package.reference);
    expect(
      (successorRecord.input.programPackage as { reference: unknown }).reference,
    ).toEqual(successor.reference);
    expect(predecessorRecord.input.exactProcessId).toBeNull();
    expect(successorRecord.input.exactProcessId).toBeNull();
    expect(predecessorRecord.close).toHaveBeenCalledTimes(1);
    expect(predecessorRecord.dispose).toHaveBeenCalledTimes(1);
    expect(successorRecord.dispose).not.toHaveBeenCalled();

    const creator = await fixture.packages.resolveCurrent(creatorProgramIdV1);
    if (creator === null || creator.kind !== "ready") {
      throw new Error("creator package unavailable");
    }
    await expect(fixture.owner.launch(creator.package.reference.programId)).resolves.toBe(
      "program",
    );
    expect(successorRecord.close).toHaveBeenCalledTimes(1);
    expect(runtimeRecordsV1).toHaveLength(3);
    expect(runtimeRecordsV1[2]!.dispose).not.toHaveBeenCalled();
  });

  it("keeps the current runtime when a Program is incompatible or missing", async () => {
    const fixture = await ownerFixtureV1();
    await fixture.owner.initialize();
    const current = fixture.owner.getSnapshot();
    const incompatible = await fixture.packages.installArchive(programArchiveV1({
      programId: "community.future",
      packageVersion: "1.0.0",
      runtimeProfile: creatorProgramRuntimeProfileV1,
      harnessCompatibility: "sillyos.program-harness.v999",
      instructions: "Future harness package.",
    }));

    await expect(fixture.owner.launch(incompatible.reference.programId)).rejects.toThrow(
      "sillyos.program_package.harness_incompatible",
    );
    expect(fixture.owner.getSnapshot()).toBe(current);
    expect(runtimeRecordsV1).toHaveLength(0);

    const unavailableProfile = await fixture.packages.installArchive(programArchiveV1({
      programId: "community.unavailable-profile",
      packageVersion: "1.0.0",
      runtimeProfile: "agent.unavailable.v1",
      instructions: "Unavailable runtime profile.",
    }));
    await expect(fixture.owner.launch(unavailableProfile.reference.programId)).rejects.toThrow(
      "sillyos.program_package.runtime_profile_unavailable",
    );
    expect(fixture.owner.getSnapshot()).toBe(current);
    expect(runtimeRecordsV1).toHaveLength(0);

    await expect(fixture.owner.launch("community.missing")).rejects.toThrow(
      "sillyos.program_package.package_missing",
    );
    expect(fixture.owner.getSnapshot()).toBe(current);
    expect(runtimeRecordsV1).toHaveLength(0);
  });

  it("opens and pages a durable Conversation without loading its package or Workspace", async () => {
    const fixture = await ownerFixtureV1();
    await fixture.owner.initialize();
    const packageLoad = vi.spyOn(fixture.packages, "resolveForProcess");
    const processId = "process.read-only";
    vi.mocked(fixture.repository.loadProcess).mockResolvedValue({
      schemaVersion: 1,
      processId,
      revision: 2,
      programPackage: {
        programId: "community.removed",
        packageVersion: "1.0.0",
      },
      subjectProgramId: null,
      status: "active",
      transcriptFrontier: 1,
      activeAttempt: null,
      lastTerminalAttempt: null,
      checkpoint: null,
      createdAt: 1,
      updatedAt: 2,
    });
    vi.mocked(fixture.repository.loadTranscriptPage).mockResolvedValue({
      processId,
      beforeSequence: null,
      entries: [{
        schemaVersion: 1,
        processId,
        sequence: 1,
        entryId: "entry.one",
        role: "user",
        state: "committed",
        parts: [{ partId: "part.one", kind: "text_markdown", markdown: "Saved words" }],
      }],
      byteLength: 128,
      nextBeforeSequence: null,
    });
    packageLoad.mockClear();

    await expect(fixture.owner.openReadOnlyProcess(processId)).resolves.toEqual({
      kind: "completed",
      value: true,
    });

    expect(packageLoad).not.toHaveBeenCalled();
    expect(fixture.owner.getSnapshot().activeRoute).toBe("conversation");
    expect(fixture.owner.getSnapshot().readOnlyConversation.getSnapshot().conversation?.process)
      .toMatchObject({ processId, programPackage: { programId: "community.removed" } });
    expect(fixture.owner.closeReadOnlyProcess()).toBe("library");
    expect(fixture.owner.getSnapshot().activeRoute).toBe("library");
  });

  it("opens a recent Process with its exact runnable profile before using read-only fallback", async () => {
    const fixture = await ownerFixtureV1();
    await fixture.owner.initialize();
    const selected = await fixture.packages.resolveCurrent(creatorProgramIdV1);
    if (selected === null || selected.kind !== "ready") throw new Error("Creator unavailable");
    const processId = "process.recent.full";
    vi.mocked(fixture.repository.loadProcess).mockResolvedValue({
      schemaVersion: 1,
      processId,
      revision: 1,
      programPackage: selected.package.reference,
      subjectProgramId: "program.subject",
      status: "active",
      transcriptFrontier: 1,
      activeAttempt: null,
      lastTerminalAttempt: null,
      checkpoint: {
        checkpointId: "checkpoint.process.recent.full",
        throughSequence: 1,
        workspaceId: "workspace.recent.full",
        workspaceCheckpointId: "checkpoint.workspace.recent.full",
        workspaceGeneration: 1,
      },
      createdAt: 1,
      updatedAt: 2,
    });

    await expect(fixture.owner.openRecentProcess(processId)).resolves.toBe("program");

    expect(runtimeRecordsV1).toHaveLength(1);
    expect(runtimeRecordsV1[0]!.input.exactProcessId).toBe(processId);
    expect(fixture.workspace.probeProcessWorkspace).toHaveBeenCalledWith(processId);
    expect(fixture.owner.getSnapshot().activeRoute).toBe("program");
    expect(fixture.owner.getSnapshot().readOnlyConversation.getSnapshot().phase).toBe("idle");
  });

  it.each(
    [
      ["Creator", creatorProgramIdV1],
      ["Translation", translationProgramIdV1],
    ] as const,
  )(
    "opens a recent %s Process read-only when its exact Workspace volume is unavailable",
    async (_name, programId) => {
      const fixture = await ownerFixtureV1();
      await fixture.owner.initialize();
      const selected = await fixture.packages.resolveCurrent(programId);
      if (selected === null || selected.kind !== "ready") {
        throw new Error(`${programId} unavailable`);
      }
      const processId = `process.recent.workspace-missing.${programId}`;
      vi.mocked(fixture.repository.loadProcess).mockResolvedValue({
        schemaVersion: 1,
        processId,
        revision: 2,
        programPackage: selected.package.reference,
        subjectProgramId: programId === creatorProgramIdV1 ? "program.subject" : null,
        status: "active",
        transcriptFrontier: 1,
        activeAttempt: null,
        lastTerminalAttempt: null,
        checkpoint: {
          checkpointId: "checkpoint.process",
          throughSequence: 1,
          workspaceId: "workspace.missing",
          workspaceCheckpointId: "checkpoint.workspace",
          workspaceGeneration: 1,
        },
        createdAt: 1,
        updatedAt: 2,
      });
      vi.mocked(fixture.repository.loadTranscriptPage).mockResolvedValue({
        processId,
        beforeSequence: null,
        entries: [{
          schemaVersion: 1,
          processId,
          sequence: 1,
          entryId: "entry.saved",
          role: "assistant",
          state: "committed",
          parts: [{
            partId: "part.saved",
            kind: "text_markdown",
            markdown: "Durable Conversation",
          }],
        }],
        byteLength: 128,
        nextBeforeSequence: null,
      });
      vi.mocked(fixture.workspace.probeProcessWorkspace).mockRejectedValueOnce(
        Object.assign(new Error("Workspace volume is missing"), { code: "volume_missing" }),
      );

      await expect(fixture.owner.openRecentProcess(processId)).resolves.toBe("conversation");

      expect(fixture.workspace.probeProcessWorkspace).toHaveBeenCalledWith(processId);
      expect(runtimeRecordsV1).toHaveLength(0);
      expect(
        fixture.owner.getSnapshot().readOnlyConversation.getSnapshot().conversation?.degradation,
      ).toEqual({ capability: "workspace", code: "volume_missing" });
      expect(fixture.reportFailure).toHaveBeenCalledWith(
        "silly_os.recent_process_workspace_probe_failed",
        expect.objectContaining({ code: "volume_missing" }),
      );
    },
  );

  it("falls back to the durable Conversation when the Process package is gone", async () => {
    const fixture = await ownerFixtureV1();
    await fixture.owner.initialize();
    const processId = "process.recent.missing-package";
    vi.mocked(fixture.repository.loadProcess).mockResolvedValue({
      schemaVersion: 1,
      processId,
      revision: 2,
      programPackage: {
        programId: "community.gone",
        packageVersion: "9.0.0",
      },
      subjectProgramId: null,
      status: "interrupted_unrecoverable",
      transcriptFrontier: 1,
      activeAttempt: null,
      lastTerminalAttempt: null,
      checkpoint: null,
      createdAt: 1,
      updatedAt: 2,
    });
    vi.mocked(fixture.repository.loadTranscriptPage).mockResolvedValue({
      processId,
      beforeSequence: null,
      entries: [{
        schemaVersion: 1,
        processId,
        sequence: 1,
        entryId: "entry.saved",
        role: "assistant",
        state: "interrupted_partial",
        parts: [{ partId: "part.saved", kind: "text_markdown", markdown: "Partial answer" }],
      }],
      byteLength: 128,
      nextBeforeSequence: null,
    });

    await expect(fixture.owner.openRecentProcess(processId)).resolves.toBe("conversation");

    expect(fixture.owner.getSnapshot().activeRoute).toBe("conversation");
    expect(
      fixture.owner.getSnapshot().readOnlyConversation.getSnapshot().conversation?.transcript
        .entries[0]?.state,
    ).toBe("interrupted_partial");
    expect(runtimeRecordsV1).toHaveLength(0);
  });
});

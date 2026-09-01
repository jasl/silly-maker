// SPDX-License-Identifier: MIT

import type {
  AdmittedProgramPackageArchiveV1,
  InstalledProgramPackageReferenceV1,
  ProgramPackageArchiveV1,
  ProgramPackageManifestV1,
} from "../package/program-package-archive.ts";
import { cloneProgramPackageManifestV1 } from "../package/program-package-archive.ts";
import type { DecodeProgramPackageZipOptionsV1 } from "../package/program-package-zip.ts";
import {
  checkProgramPackageRuntimeProfileProjectionCompatibilityV1,
  projectProgramPackageRuntimeProfileV1,
  type ProgramPackageMetadataV1,
  type ProgramPackageRuntimeProfileProjectionV1,
  type ProgramRuntimeProfileDescriptorV1,
} from "../package/program-runtime-profile-descriptor.ts";
import { installProgramPackageZipV1 } from "./install-program-package-zip.ts";
import type {
  ProgramPackageInstallationRepositoryV1,
  ProgramPackageInstallationResultV1,
} from "./program-package-installation-repository.ts";

/**
 * A bundled source is only a distribution source. Its archive enters the same
 * admission and installation repository as an imported archive.
 */
export interface BundledProgramPackageSourceV1 {
  readonly programId: string;
  /** Build-produced exact index data; it must not fetch or embed package body files. */
  readonly metadata: ProgramPackageMetadataV1;
  loadArchive(): Promise<ProgramPackageArchiveV1>;
}

export type ProgramPackageLoadResultV1 =
  | {
    readonly kind: "ready";
    readonly package: AdmittedProgramPackageArchiveV1;
  }
  | {
    readonly kind: "package_missing";
    readonly reference: InstalledProgramPackageReferenceV1;
  }
  | {
    readonly kind: "harness_incompatible";
    readonly package: AdmittedProgramPackageArchiveV1;
  }
  | {
    readonly kind: "runtime_profile_unavailable";
    readonly package: AdmittedProgramPackageArchiveV1;
  }
  | {
    readonly kind: "runtime_profile_incompatible";
    readonly package: AdmittedProgramPackageArchiveV1;
  };

export type ProgramPackageCompatibilityV1 =
  | "ready"
  | "harness_incompatible"
  | "runtime_profile_incompatible"
  | "runtime_profile_unavailable";

/** Read-only library projection; package acquisition origin is deliberately absent. */
export interface ProgramPackageLibraryEntryV1 {
  readonly reference: InstalledProgramPackageReferenceV1;
  readonly manifest: ProgramPackageManifestV1;
  readonly byteLength: number;
  readonly compatibility: ProgramPackageCompatibilityV1;
  /** False means an exact bundled package body will be installed only when opened. */
  readonly materialized: boolean;
  /** This exact immutable package is selected only for newly created Processes. */
  readonly selectedForNewProcesses: boolean;
}

export interface ProgramPackageServiceV1 {
  /** List exact installed packages plus lightweight bundled index entries, without loading bodies. */
  listLibrary(): Promise<readonly ProgramPackageLibraryEntryV1[]>;
  /** Resolve the package selected for a newly created Process. */
  resolveCurrent(programId: string): Promise<ProgramPackageLoadResultV1 | null>;
  /** Resolve exactly the package pinned by an existing Process, without fallback. */
  loadExact(reference: InstalledProgramPackageReferenceV1): Promise<ProgramPackageLoadResultV1>;
  installArchive(
    archive: ProgramPackageArchiveV1,
    options?: { readonly selectCurrent?: boolean },
  ): Promise<ProgramPackageInstallationResultV1>;
  installZip(
    bytes: Uint8Array | ArrayBuffer,
    decodeOptions: DecodeProgramPackageZipOptionsV1,
    options?: { readonly selectCurrent?: boolean },
  ): Promise<ProgramPackageInstallationResultV1>;
  /** Clears installed packages. Bundled sources remain ordinary sources and are reinstalled on demand. */
  reset(): Promise<void>;
  dispose(): Promise<void>;
}

export interface CreateProgramPackageServiceOptionsV1 {
  readonly repository: ProgramPackageInstallationRepositoryV1;
  readonly bundledSources: readonly BundledProgramPackageSourceV1[];
  readonly supportedHarnesses: ReadonlySet<string>;
  readonly runtimeProfileDescriptors: readonly ProgramRuntimeProfileDescriptorV1[];
}

export function createProgramPackageServiceV1(
  options: CreateProgramPackageServiceOptionsV1,
): ProgramPackageServiceV1 {
  const referenceKeyV1 = (reference: InstalledProgramPackageReferenceV1): string =>
    JSON.stringify([
      reference.programId,
      reference.packageVersion,
      reference.contentDigest,
    ]);
  const bundledSources = new Map<string, BundledProgramPackageSourceV1>();
  for (const source of options.bundledSources) {
    if (bundledSources.has(source.programId)) {
      throw new TypeError(`duplicate bundled Program source: ${source.programId}`);
    }
    if (
      source.metadata.reference.programId !== source.programId ||
      source.metadata.manifest.programId !== source.programId ||
      source.metadata.reference.packageVersion !== source.metadata.manifest.packageVersion
    ) {
      throw new TypeError(`invalid bundled Program metadata: ${source.programId}`);
    }
    bundledSources.set(source.programId, source);
  }
  const runtimeProfileDescriptors = new Map<string, ProgramRuntimeProfileDescriptorV1>();
  for (const descriptor of options.runtimeProfileDescriptors) {
    const capabilities = new Set(descriptor.capabilityIds);
    const requiredCapabilities = new Set(descriptor.requiredCapabilityIds ?? []);
    if (
      descriptor.runtimeProfile.length === 0 ||
      runtimeProfileDescriptors.has(descriptor.runtimeProfile) ||
      capabilities.size !== descriptor.capabilityIds.length ||
      requiredCapabilities.size !== (descriptor.requiredCapabilityIds?.length ?? 0) ||
      [...requiredCapabilities].some((capabilityId) => !capabilities.has(capabilityId))
    ) {
      throw new TypeError("invalid or duplicate Program runtime profile descriptor");
    }
    runtimeProfileDescriptors.set(descriptor.runtimeProfile, descriptor);
  }

  let initialization: Promise<void> | null = null;
  let disposed = false;
  const bundledInstallations = new Map<string, Promise<InstalledProgramPackageReferenceV1>>();

  const initializeV1 = (): Promise<void> => {
    if (disposed) return Promise.reject(new Error("sillyos.program_package_service.disposed"));
    initialization ??= options.repository.initialize().then(() => undefined);
    return initialization;
  };

  const classifyCompatibilityV1 = (
    projection: ProgramPackageRuntimeProfileProjectionV1,
  ): ProgramPackageCompatibilityV1 => {
    if (!options.supportedHarnesses.has(projection.manifest.harnessCompatibility)) {
      return "harness_incompatible";
    }
    const descriptor = runtimeProfileDescriptors.get(projection.manifest.runtimeProfile);
    if (descriptor === undefined) {
      return "runtime_profile_unavailable";
    }
    if (
      checkProgramPackageRuntimeProfileProjectionCompatibilityV1(projection, descriptor).kind ===
        "incompatible"
    ) return "runtime_profile_incompatible";
    return "ready";
  };

  const classifyV1 = (
    installedPackage: AdmittedProgramPackageArchiveV1,
  ): ProgramPackageLoadResultV1 => {
    const compatibility = classifyCompatibilityV1(
      projectProgramPackageRuntimeProfileV1(installedPackage),
    );
    return { kind: compatibility, package: installedPackage };
  };

  const referencesEqualV1 = (
    left: InstalledProgramPackageReferenceV1,
    right: InstalledProgramPackageReferenceV1,
  ): boolean =>
    left.programId === right.programId &&
    left.packageVersion === right.packageVersion &&
    left.contentDigest === right.contentDigest;

  const loadExactV1 = async (
    reference: InstalledProgramPackageReferenceV1,
  ): Promise<ProgramPackageLoadResultV1> => {
    await initializeV1();
    let installedPackage = await options.repository.load(reference);
    const source = bundledSources.get(reference.programId);
    if (
      installedPackage === null && source !== undefined &&
      referencesEqualV1(source.metadata.reference, reference)
    ) {
      await ensureBundledV1(reference.programId);
      installedPackage = await options.repository.load(reference);
    }
    return installedPackage === null
      ? { kind: "package_missing", reference: { ...reference } }
      : classifyV1(installedPackage);
  };

  const ensureBundledV1 = async (
    programId: string,
  ): Promise<InstalledProgramPackageReferenceV1 | null> => {
    const source = bundledSources.get(programId);
    if (source === undefined) return null;
    let pending = bundledInstallations.get(programId);
    if (pending === undefined) {
      pending = (async () => {
        const archive = await source.loadArchive();
        if (archive.manifest.programId !== programId) {
          throw new TypeError("bundled Program source returned another Program");
        }
        const result = await options.repository.install(archive, {
          currentSelection: "if_missing",
        });
        if (!referencesEqualV1(result.reference, source.metadata.reference)) {
          throw new TypeError("bundled Program package metadata does not match its body");
        }
        return result.reference;
      })();
      bundledInstallations.set(programId, pending);
      void pending.catch(() => bundledInstallations.delete(programId));
    }
    return await pending;
  };

  return {
    async listLibrary() {
      await initializeV1();
      const installedMetadata = await options.repository.listMetadata();
      const installedByReference = new Set(
        installedMetadata.map((entry) => referenceKeyV1(entry.reference)),
      );
      const bundledReferenceByProgramId = new Map(
        [...bundledSources.values()].map((source) =>
          [
            source.programId,
            source.metadata.reference,
          ] as const
        ),
      );
      const unmaterializedBundledMetadata: {
        readonly entry: ProgramPackageMetadataV1;
        readonly materialized: false;
      }[] = [];
      for (const source of bundledSources.values()) {
        if (installedByReference.has(referenceKeyV1(source.metadata.reference))) continue;
        unmaterializedBundledMetadata.push({ entry: source.metadata, materialized: false });
      }
      const metadata = [
        ...installedMetadata.map((entry) => ({ entry, materialized: true })),
        ...unmaterializedBundledMetadata,
      ].toSorted((left, right) =>
        left.entry.reference.programId.localeCompare(right.entry.reference.programId) ||
        left.entry.reference.packageVersion.localeCompare(right.entry.reference.packageVersion) ||
        left.entry.reference.contentDigest.localeCompare(right.entry.reference.contentDigest)
      );
      const programIds = [...new Set(metadata.map(({ entry }) => entry.reference.programId))];
      const currentByProgramId = new Map(
        await Promise.all(
          programIds.map(async (programId) =>
            [programId, await options.repository.current(programId)] as const
          ),
        ),
      );

      return metadata.map(({ entry, materialized }): ProgramPackageLibraryEntryV1 => {
        const current = currentByProgramId.get(entry.reference.programId) ?? null;
        const bundledReference = bundledReferenceByProgramId.get(entry.reference.programId);
        return {
          reference: { ...entry.reference },
          manifest: cloneProgramPackageManifestV1(entry.manifest),
          byteLength: entry.byteLength,
          compatibility: classifyCompatibilityV1(entry),
          materialized,
          selectedForNewProcesses: current === null
            ? bundledReference !== undefined && referencesEqualV1(bundledReference, entry.reference)
            : referencesEqualV1(current, entry.reference),
        };
      });
    },
    async resolveCurrent(programId) {
      await initializeV1();
      let reference = await options.repository.current(programId);
      if (reference === null) reference = await ensureBundledV1(programId);
      if (reference === null) return null;
      return await loadExactV1(reference);
    },
    async loadExact(reference) {
      return await loadExactV1(reference);
    },
    async installArchive(archive, installOptions = {}) {
      await initializeV1();
      return await options.repository.install(archive, {
        currentSelection: installOptions.selectCurrent === false ? "never" : "always",
      });
    },
    async installZip(bytes, decodeOptions, installOptions = {}) {
      await initializeV1();
      return await installProgramPackageZipV1(bytes, {
        ...decodeOptions,
        repository: options.repository,
        selectCurrent: installOptions.selectCurrent ?? true,
      });
    },
    async reset() {
      await initializeV1();
      await Promise.allSettled(bundledInstallations.values());
      await options.repository.reset();
      bundledInstallations.clear();
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      await initialization?.catch(() => undefined);
      await options.repository.dispose();
    },
  };
}

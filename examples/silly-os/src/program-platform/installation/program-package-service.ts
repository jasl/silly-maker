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
  InstalledProgramPackageV1,
  ProgramPackageInstallationRepositoryV1,
  ProgramPackageInstallationResultV1,
} from "./program-package-installation-repository.ts";

/** Bundling is only an acquisition path; the body uses ordinary package admission and runtime. */
export interface BundledProgramPackageSourceV1 {
  readonly programId: string;
  /** Build-produced index data; it must not fetch or embed package body files. */
  readonly metadata: ProgramPackageMetadataV1;
  loadArchive(): Promise<ProgramPackageArchiveV1>;
}

export type ProgramPackageLoadResultV1 =
  | {
    readonly kind: "ready";
    readonly package: AdmittedProgramPackageArchiveV1;
    /** Current-installation fence for one mounted runtime; never persisted as Process identity. */
    readonly implementationId: string;
  }
  | {
    readonly kind: "package_missing";
    readonly reference: InstalledProgramPackageReferenceV1;
  }
  | {
    readonly kind: "process_incompatible";
    readonly reference: InstalledProgramPackageReferenceV1;
    readonly currentReference: InstalledProgramPackageReferenceV1;
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

/** Read-only library projection; acquisition origin is deliberately absent. */
export interface ProgramPackageLibraryEntryV1 {
  readonly reference: InstalledProgramPackageReferenceV1;
  readonly manifest: ProgramPackageManifestV1;
  readonly compatibility: ProgramPackageCompatibilityV1;
}

export interface ProgramPackageServiceV1 {
  /** Lists one current implementation per Program id without loading bundled bodies. */
  listLibrary(): Promise<readonly ProgramPackageLibraryEntryV1[]>;
  /** Resolves the current implementation for a newly created Process. */
  resolveCurrent(programId: string): Promise<ProgramPackageLoadResultV1 | null>;
  /** Resolves current code when it matches an existing Process compatibility marker. */
  resolveForProcess(
    reference: InstalledProgramPackageReferenceV1,
  ): Promise<ProgramPackageLoadResultV1>;
  installArchive(archive: ProgramPackageArchiveV1): Promise<ProgramPackageInstallationResultV1>;
  installZip(
    bytes: Uint8Array | ArrayBuffer,
    decodeOptions: DecodeProgramPackageZipOptionsV1,
  ): Promise<ProgramPackageInstallationResultV1>;
  /** Clears installed packages. Bundled sources remain sources and are installed on demand. */
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
  const bundledRefreshes = new Map<string, Promise<InstalledProgramPackageV1 | null>>();
  const refreshedBundled = new Set<string>();

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
    if (descriptor === undefined) return "runtime_profile_unavailable";
    if (
      checkProgramPackageRuntimeProfileProjectionCompatibilityV1(projection, descriptor).kind ===
        "incompatible"
    ) return "runtime_profile_incompatible";
    return "ready";
  };

  const classifyV1 = (
    installed: InstalledProgramPackageV1,
  ): ProgramPackageLoadResultV1 => {
    const installedPackage = installed.package;
    const compatibility = classifyCompatibilityV1(
      projectProgramPackageRuntimeProfileV1(installedPackage),
    );
    return compatibility === "ready"
      ? {
        kind: compatibility,
        package: installedPackage,
        implementationId: installed.installationId,
      }
      : { kind: compatibility, package: installedPackage };
  };

  const refreshBundledV1 = async (programId: string): Promise<InstalledProgramPackageV1 | null> => {
    const source = bundledSources.get(programId);
    const installed = await options.repository.load(programId);
    if (installed?.acquisition === "external") return installed;
    if (source === undefined) {
      if (installed?.acquisition === "bundled") await options.repository.remove(programId);
      return null;
    }

    let pending = bundledRefreshes.get(programId);
    if (pending === undefined) {
      pending = (async () => {
        const archive = await source.loadArchive();
        if (
          archive.manifest.programId !== programId ||
          archive.manifest.packageVersion !== source.metadata.reference.packageVersion
        ) {
          throw new TypeError("bundled Program source does not match its current index");
        }
        const result = await options.repository.install(archive, { acquisition: "bundled" });
        if (result.disposition === "retained_external") {
          const current = await options.repository.load(programId);
          if (current === null || current.acquisition !== "external") {
            throw new TypeError("external Program installation was not retained");
          }
          return current;
        }
        if (
          result.reference.programId !== source.metadata.reference.programId ||
          result.reference.packageVersion !== source.metadata.reference.packageVersion
        ) {
          throw new TypeError("bundled Program source does not match its current index");
        }
        const current = await options.repository.load(programId);
        if (current?.acquisition === "external") {
          // An external installation may win after the bundled transaction
          // commits but before this confirmation read. It is the valid current
          // implementation, not a failed bundled refresh.
          return current;
        }
        if (current === null) {
          throw new TypeError("bundled Program installation was not retained");
        }
        refreshedBundled.add(programId);
        return current;
      })();
      bundledRefreshes.set(programId, pending);
      const clearPendingV1 = (): void => {
        if (bundledRefreshes.get(programId) === pending) bundledRefreshes.delete(programId);
      };
      void pending.then(clearPendingV1, clearPendingV1);
    }
    return await pending;
  };

  const currentInstallationV1 = async (
    programId: string,
  ): Promise<InstalledProgramPackageV1 | null> => {
    await initializeV1();
    const installed = await options.repository.load(programId);
    if (installed?.acquisition === "external") return installed;
    if (installed?.acquisition === "bundled" && refreshedBundled.has(programId)) {
      return installed;
    }
    return await refreshBundledV1(programId);
  };

  return {
    async listLibrary() {
      await initializeV1();
      const installed = await options.repository.listMetadata();
      const externalByProgramId = new Map<string, ProgramPackageMetadataV1>();
      for (const entry of installed) {
        if (entry.acquisition === "external") {
          externalByProgramId.set(entry.metadata.reference.programId, entry.metadata);
        }
      }
      const entries: ProgramPackageLibraryEntryV1[] = [];
      for (const metadata of externalByProgramId.values()) {
        entries.push({
          reference: { ...metadata.reference },
          manifest: cloneProgramPackageManifestV1(metadata.manifest),
          compatibility: classifyCompatibilityV1(metadata),
        });
      }
      for (const source of bundledSources.values()) {
        if (externalByProgramId.has(source.programId)) continue;
        entries.push({
          reference: { ...source.metadata.reference },
          manifest: cloneProgramPackageManifestV1(source.metadata.manifest),
          compatibility: classifyCompatibilityV1(source.metadata),
        });
      }
      return entries.toSorted((left, right) =>
        left.reference.programId.localeCompare(right.reference.programId)
      );
    },
    async resolveCurrent(programId) {
      const installed = await currentInstallationV1(programId);
      return installed === null ? null : classifyV1(installed);
    },
    async resolveForProcess(reference) {
      const installed = await currentInstallationV1(reference.programId);
      if (installed === null) return { kind: "package_missing", reference: { ...reference } };
      if (installed.package.reference.packageVersion !== reference.packageVersion) {
        return {
          kind: "process_incompatible",
          reference: { ...reference },
          currentReference: { ...installed.package.reference },
        };
      }
      return classifyV1(installed);
    },
    async installArchive(archive) {
      await initializeV1();
      const result = await options.repository.install(archive, { acquisition: "external" });
      refreshedBundled.delete(result.reference.programId);
      return result;
    },
    async installZip(bytes, decodeOptions) {
      await initializeV1();
      const result = await installProgramPackageZipV1(bytes, {
        ...decodeOptions,
        repository: options.repository,
        acquisition: "external",
      });
      refreshedBundled.delete(result.reference.programId);
      return result;
    },
    async reset() {
      await initializeV1();
      await Promise.allSettled(bundledRefreshes.values());
      await options.repository.reset();
      bundledRefreshes.clear();
      refreshedBundled.clear();
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      await initialization?.catch(() => undefined);
      await options.repository.dispose();
    },
  };
}

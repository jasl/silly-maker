// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import type { BrowserPiAgentDispatchV1 } from "./browser-pi-agent-dispatch.ts";
import {
  createIndexedDbProgramPackageInstallationRepositoryV1,
  type CreateIndexedDbProgramPackageInstallationRepositoryOptionsV1,
} from "../program-platform/installation/indexeddb-program-package-installation-repository.ts";
import type { ProgramPackageInstallationRepositoryV1 } from "../program-platform/installation/program-package-installation-repository.ts";
import {
  sillyOsProgramHarnessCompatibilityV1,
  type AdmittedProgramPackageArchiveV1,
  type InstalledProgramPackageReferenceV1,
  type ProgramPackageAdmissionLimitsV1,
  readProgramPackageTextFileV1,
} from "../program-platform/package/program-package-archive.ts";
import type { BrowserProgramExecutionV1 } from "./browser-program-runtime-profile.ts";
import type { BrowserProgramRuntimeProfileV1 } from "./browser-program-runtime-profile.ts";
import { checkProgramPackageRuntimeProfileCompatibilityV1 } from "../program-platform/package/program-runtime-profile-descriptor.ts";

export interface BrowserProgramExecutionLoaderV1 {
  load(dispatch: BrowserPiAgentDispatchV1): Promise<BrowserProgramExecutionV1 | null>;
  dispose(): Promise<void>;
}

export interface CreateBrowserProgramExecutionLoaderOptionsV1 {
  readonly repository?: ProgramPackageInstallationRepositoryV1;
  readonly indexedDB?: IDBFactory;
  readonly subtle?: SubtleCrypto | undefined;
  readonly loadRuntimeProfile: (
    runtimeProfile: string,
  ) => Promise<BrowserProgramRuntimeProfileV1 | null>;
}

const storageRestoreLimitsV1: ProgramPackageAdmissionLimitsV1 = {
  maximumManifestBytes: Number.MAX_SAFE_INTEGER,
  maximumFiles: Number.MAX_SAFE_INTEGER,
  maximumPathBytes: Number.MAX_SAFE_INTEGER,
  maximumFileBytes: Number.MAX_SAFE_INTEGER,
  maximumPackageBytes: Number.MAX_SAFE_INTEGER,
};

function findInstructionsV1(
  installedPackage: AdmittedProgramPackageArchiveV1,
): string | null {
  const instructions = readProgramPackageTextFileV1(
    installedPackage,
    installedPackage.manifest.instructionsPath,
  );
  return instructions === null || instructions.trim().length === 0 ? null : instructions;
}

function findWorkspaceScriptsV1(
  installedPackage: AdmittedProgramPackageArchiveV1,
): BrowserProgramExecutionV1["workspaceScripts"] | null {
  const scripts: BrowserProgramExecutionV1["workspaceScripts"][number][] = [];
  const filesByPath = new Map(installedPackage.files.map((file) => [file.path, file] as const));
  for (const declaration of installedPackage.manifest.scripts) {
    const file = filesByPath.get(declaration.path);
    if (file === undefined) return null;
    const bytes = new Uint8Array(file.bytes.slice(0));
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return null;
    }
    scripts.push({
      packagePath: declaration.path,
      workspacePath: `/workspace/.sillyos/program/${declaration.path}`,
      runtime: declaration.runtime,
      bytes,
    });
  }
  return scripts;
}

function findPackageResourcesV1(
  installedPackage: AdmittedProgramPackageArchiveV1,
): BrowserProgramExecutionV1["packageResources"] {
  return installedPackage.files.map((file) => ({
    path: file.path,
    mediaType: file.mediaType,
    bytes: new Uint8Array(file.bytes.slice(0)),
  }));
}

interface CachedProgramExecutionPackageV1 {
  readonly instructions: string;
  readonly packageResources: BrowserProgramExecutionV1["packageResources"];
  readonly workspaceScripts: BrowserProgramExecutionV1["workspaceScripts"];
  readonly runtimeProfile: BrowserProgramRuntimeProfileV1;
}

function exactPackageReferencesEqualV1(
  left: InstalledProgramPackageReferenceV1,
  right: InstalledProgramPackageReferenceV1,
): boolean {
  return left.programId === right.programId &&
    left.packageVersion === right.packageVersion &&
    left.contentDigest === right.contentDigest;
}

/**
 * Pair one Process-pinned immutable Program package with fixed Host code.
 * The package origin is intentionally absent: bundled and imported packages
 * use this exact loader and cannot inject same-realm code.
 */
export function createBrowserProgramExecutionLoaderV1(
  options: CreateBrowserProgramExecutionLoaderOptionsV1,
): BrowserProgramExecutionLoaderV1 {
  const repository = options.repository ??
    createIndexedDbProgramPackageInstallationRepositoryV1(
      {
        indexedDB: options.indexedDB ?? globalThis.indexedDB,
        limits: storageRestoreLimitsV1,
        ...(options.subtle === undefined ? {} : { subtle: options.subtle }),
      } satisfies CreateIndexedDbProgramPackageInstallationRepositoryOptionsV1,
    );
  const loadRuntimeProfile = options.loadRuntimeProfile;
  let initialization: Promise<void> | null = null;
  let cachedPackage: {
    readonly reference: InstalledProgramPackageReferenceV1;
    readonly value: Promise<CachedProgramExecutionPackageV1 | null>;
  } | null = null;
  let disposed = false;

  const initializeV1 = (): Promise<void> => {
    if (disposed) return Promise.reject(new Error("sillyos.program_execution_loader.disposed"));
    initialization ??= repository.initialize().then(() => undefined);
    return initialization;
  };

  const loadPackageV1 = (
    reference: InstalledProgramPackageReferenceV1,
  ): Promise<CachedProgramExecutionPackageV1 | null> => {
    if (
      cachedPackage !== null && exactPackageReferencesEqualV1(cachedPackage.reference, reference)
    ) return cachedPackage.value;

    // One Worker runs one active Process at a time. Retain only its exact
    // immutable package projection; selecting another package replaces it.
    const candidate = {
      reference: { ...reference },
      value: (async (): Promise<CachedProgramExecutionPackageV1 | null> => {
        const installedPackage = await repository.load(reference);
        if (
          installedPackage === null ||
          installedPackage.manifest.programId !== reference.programId ||
          installedPackage.manifest.harnessCompatibility !== sillyOsProgramHarnessCompatibilityV1
        ) return null;
        const instructions = findInstructionsV1(installedPackage);
        const packageResources = findPackageResourcesV1(installedPackage);
        const workspaceScripts = findWorkspaceScriptsV1(installedPackage);
        const runtimeProfile = await loadRuntimeProfile(installedPackage.manifest.runtimeProfile);
        if (
          runtimeProfile === null || instructions === null || workspaceScripts === null ||
          runtimeProfile.runtimeProfile !== installedPackage.manifest.runtimeProfile ||
          runtimeProfile.packageDescriptor.runtimeProfile !==
            installedPackage.manifest.runtimeProfile ||
          checkProgramPackageRuntimeProfileCompatibilityV1(
              installedPackage,
              runtimeProfile.packageDescriptor,
            ).kind === "incompatible"
        ) return null;
        return { instructions, packageResources, workspaceScripts, runtimeProfile };
      })(),
    };
    cachedPackage = candidate;
    void candidate.value.then((value) => {
      if (value === null && cachedPackage === candidate) cachedPackage = null;
    }, () => {
      if (cachedPackage === candidate) cachedPackage = null;
    });
    return candidate.value;
  };

  return {
    async load(dispatch) {
      await initializeV1();
      if (dispatch.runtimeProfile.length === 0) return null;
      const executionPackage = await loadPackageV1(dispatch.programPackage);
      if (
        executionPackage === null ||
        executionPackage.runtimeProfile.runtimeProfile !== dispatch.runtimeProfile
      ) return null;
      const admission = executionPackage.runtimeProfile.admitDispatch(dispatch);
      if (admission.kind === "rejected") return null;
      return { ...executionPackage, invocation: admission.invocation };
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      cachedPackage = null;
      await initialization?.catch(() => undefined);
      await repository.dispose();
    },
  };
}

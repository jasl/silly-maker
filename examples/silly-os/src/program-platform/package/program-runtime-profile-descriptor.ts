// SPDX-License-Identifier: MIT

import {
  type AdmittedProgramPackageArchiveV1,
  type InstalledProgramPackageReferenceV1,
  type ProgramPackageScriptV1,
  readProgramPackageTextFileV1,
} from "./program-package-archive.ts";

/**
 * Build-known package facets supplied by one fixed SillyOS runtime profile.
 * A Program manifest may request only this closed set; declarations never add
 * Host capabilities or execute package code in the page realm.
 */
export interface ProgramRuntimeProfileDescriptorV1 {
  readonly runtimeProfile: string;
  readonly capabilityIds: readonly string[];
  /** Capabilities a package must explicitly request before this profile may expose them. */
  readonly requiredCapabilityIds?: readonly string[];
  readonly scriptRuntimes: readonly ProgramPackageScriptV1["runtime"][];
  readonly initialUiSurfaceIds: readonly string[];
}

export type ProgramPackageRuntimeProfileCompatibilityV1 =
  | { readonly kind: "compatible" }
  | {
    readonly kind: "incompatible";
    readonly requirement:
      | "capability"
      | "initial_ui_surface"
      | "runtime_profile"
      | "script_runtime";
  };

export interface ProgramPackageRuntimeProfileProjectionV1 {
  readonly manifest: AdmittedProgramPackageArchiveV1["manifest"];
  /** `""` means the declared initial UI file is present but not an admitted surface descriptor. */
  readonly initialUiSurfaceId: string | null;
}

/** Lightweight package index record. It contains no package body bytes. */
export interface ProgramPackageMetadataV1 extends ProgramPackageRuntimeProfileProjectionV1 {
  readonly reference: InstalledProgramPackageReferenceV1;
}

export function projectProgramPackageRuntimeProfileV1(
  archive: AdmittedProgramPackageArchiveV1,
): ProgramPackageRuntimeProfileProjectionV1 {
  const path = archive.manifest.initialUiPath;
  if (path === null) return { manifest: archive.manifest, initialUiSurfaceId: null };
  const text = readProgramPackageTextFileV1(archive, path);
  if (text === null) return { manifest: archive.manifest, initialUiSurfaceId: "" };
  try {
    const value: unknown = JSON.parse(text);
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return { manifest: archive.manifest, initialUiSurfaceId: "" };
    }
    const surface = (value as Readonly<Record<string, unknown>>).surface;
    return {
      manifest: archive.manifest,
      initialUiSurfaceId: typeof surface === "string" && surface.length > 0 &&
          surface.trim() === surface
        ? surface
        : "",
    };
  } catch {
    return { manifest: archive.manifest, initialUiSurfaceId: "" };
  }
}

/** Shared metadata-only admission used by the Program library and Worker load. */
export function checkProgramPackageRuntimeProfileProjectionCompatibilityV1(
  projection: ProgramPackageRuntimeProfileProjectionV1,
  descriptor: ProgramRuntimeProfileDescriptorV1,
): ProgramPackageRuntimeProfileCompatibilityV1 {
  if (projection.manifest.runtimeProfile !== descriptor.runtimeProfile) {
    return { kind: "incompatible", requirement: "runtime_profile" };
  }

  const supportedCapabilities = new Set(descriptor.capabilityIds);
  const requestedCapabilities = new Set(projection.manifest.capabilityIds);
  if (
    projection.manifest.capabilityIds.some((id) => !supportedCapabilities.has(id)) ||
    descriptor.requiredCapabilityIds?.some((id) => !requestedCapabilities.has(id)) === true
  ) {
    return { kind: "incompatible", requirement: "capability" };
  }

  const supportedScriptRuntimes = new Set(descriptor.scriptRuntimes);
  if (projection.manifest.scripts.some((script) => !supportedScriptRuntimes.has(script.runtime))) {
    return { kind: "incompatible", requirement: "script_runtime" };
  }

  if (
    projection.initialUiSurfaceId !== null &&
    !descriptor.initialUiSurfaceIds.includes(projection.initialUiSurfaceId)
  ) {
    return { kind: "incompatible", requirement: "initial_ui_surface" };
  }

  return { kind: "compatible" };
}

export function checkProgramPackageRuntimeProfileCompatibilityV1(
  archive: AdmittedProgramPackageArchiveV1,
  descriptor: ProgramRuntimeProfileDescriptorV1,
): ProgramPackageRuntimeProfileCompatibilityV1 {
  return checkProgramPackageRuntimeProfileProjectionCompatibilityV1(
    projectProgramPackageRuntimeProfileV1(archive),
    descriptor,
  );
}

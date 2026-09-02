// SPDX-License-Identifier: MIT

import type {
  AdmittedProgramPackageArchiveV1,
  InstalledProgramPackageReferenceV1,
  UnadmittedProgramPackageArchiveV1,
} from "../package/program-package-archive.ts";
import type { ProgramPackageMetadataV1 } from "../package/program-runtime-profile-descriptor.ts";

export type ProgramPackageAcquisitionV1 = "bundled" | "external";
export type ProgramPackageInstallationDispositionV1 =
  | "installed"
  | "replaced"
  | "retained_current"
  | "retained_external";

export interface ProgramPackageInstallationResultV1 {
  readonly disposition: ProgramPackageInstallationDispositionV1;
  readonly reference: InstalledProgramPackageReferenceV1;
}

export interface InstallProgramPackageOptionsV1 {
  /** Distribution origin only; it grants no runtime capability or Program privilege. */
  readonly acquisition: ProgramPackageAcquisitionV1;
}

export interface RemoveProgramPackageOptionsV1 {
  /** Deletes only when the current implementation still has this acquisition origin. */
  readonly ifAcquisition?: ProgramPackageAcquisitionV1;
  /** Deletes only the exact implementation observed by the caller. */
  readonly ifInstallationId?: string;
}

/**
 * Repository-private current installation. `installationId` invalidates
 * same-version runtime caches; it is not Program or Process identity.
 */
export interface InstalledProgramPackageV1 {
  readonly acquisition: ProgramPackageAcquisitionV1;
  readonly installationId: string;
  readonly package: AdmittedProgramPackageArchiveV1;
}

export interface InstalledProgramPackageMetadataV1 {
  readonly acquisition: ProgramPackageAcquisitionV1;
  /** Opaque current-implementation fence; it is not Program or Process identity. */
  readonly installationId: string;
  readonly metadata: ProgramPackageMetadataV1;
}

export interface ProgramPackageInstallationRepositoryV1 {
  initialize(): Promise<"created" | "opened">;
  /** Replaces the current implementation; a bundled refresh atomically preserves an external one. */
  install(
    archive: UnadmittedProgramPackageArchiveV1,
    options: InstallProgramPackageOptionsV1,
  ): Promise<ProgramPackageInstallationResultV1>;
  load(programId: string): Promise<InstalledProgramPackageV1 | null>;
  listMetadata(): Promise<readonly InstalledProgramPackageMetadataV1[]>;
  remove(programId: string, options?: RemoveProgramPackageOptionsV1): Promise<boolean>;
  reset(): Promise<void>;
  dispose(): Promise<void>;
}

export type ProgramPackageInstallationRepositoryFailureCodeV1 =
  | "database_newer"
  | "quota_exceeded"
  | "request_failed"
  | "schema_invalid"
  | "storage_unavailable"
  | "transaction_aborted";

export type ProgramPackageInstallationRepositoryOperationV1 =
  | "initialize"
  | "install"
  | "load"
  | "list_metadata"
  | "remove"
  | "reset"
  | "dispose";

export class ProgramPackageInstallationRepositoryErrorV1 extends Error {
  constructor(
    readonly code: ProgramPackageInstallationRepositoryFailureCodeV1,
    readonly operation: ProgramPackageInstallationRepositoryOperationV1,
  ) {
    super(`sillyos.program_package.repository.${operation}.${code}`);
    this.name = "ProgramPackageInstallationRepositoryErrorV1";
  }
}

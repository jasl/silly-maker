// SPDX-License-Identifier: MIT

import type {
  AdmittedProgramPackageArchiveV1,
  InstalledProgramPackageReferenceV1,
  UnadmittedProgramPackageArchiveV1,
} from "../package/program-package-archive.ts";
import type { ProgramPackageMetadataV1 } from "../package/program-runtime-profile-descriptor.ts";

export type ProgramPackageInstallationDispositionV1 = "installed" | "already_installed";

export interface ProgramPackageInstallationResultV1 {
  readonly disposition: ProgramPackageInstallationDispositionV1;
  readonly reference: InstalledProgramPackageReferenceV1;
}

export type ProgramPackageCurrentSelectionV1 = "always" | "if_missing" | "never";

export interface InstallProgramPackageOptionsV1 {
  /** Updates the current package pointer in the same installation transaction. */
  readonly currentSelection: ProgramPackageCurrentSelectionV1;
}

export interface ProgramPackageInstallationRepositoryV1 {
  initialize(): Promise<"created" | "opened">;
  install(
    archive: UnadmittedProgramPackageArchiveV1,
    options: InstallProgramPackageOptionsV1,
  ): Promise<ProgramPackageInstallationResultV1>;
  load(
    reference: InstalledProgramPackageReferenceV1,
  ): Promise<AdmittedProgramPackageArchiveV1 | null>;
  listMetadata(): Promise<readonly ProgramPackageMetadataV1[]>;
  current(programId: string): Promise<InstalledProgramPackageReferenceV1 | null>;
  remove(reference: InstalledProgramPackageReferenceV1): Promise<boolean>;
  /** Removes every installed package and current-selection pointer owned by this repository. */
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
  | "current"
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

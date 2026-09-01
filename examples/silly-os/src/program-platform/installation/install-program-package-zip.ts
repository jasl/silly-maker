// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  decodeProgramPackageZipV1,
  type DecodeProgramPackageZipOptionsV1,
} from "../package/program-package-zip.ts";
import type {
  ProgramPackageInstallationRepositoryV1,
  ProgramPackageInstallationResultV1,
} from "./program-package-installation-repository.ts";

export interface InstallProgramPackageZipInputV1 extends DecodeProgramPackageZipOptionsV1 {
  readonly repository: ProgramPackageInstallationRepositoryV1;
  readonly selectCurrent: boolean;
}

/** External and bundled Programs converge at the repository's ordinary archive install boundary. */
export async function installProgramPackageZipV1(
  zipBytes: ArrayBuffer | Uint8Array,
  input: InstallProgramPackageZipInputV1,
): Promise<ProgramPackageInstallationResultV1> {
  const archive = await decodeProgramPackageZipV1(zipBytes, input);
  return await input.repository.install(archive, {
    currentSelection: input.selectCurrent ? "always" : "never",
  });
}

// SPDX-License-Identifier: MIT

import type { BrowserProgramWorkspaceAuthorityHostV1 } from "./workspace/browser-program-workspace-authority.ts";
import type { ProgramDataRepositoryV1 } from "./persistence/program-data-repository.ts";
import type { AdmittedProgramPackageArchiveV1 } from "../program-platform/package/program-package-archive.ts";
import type { ProgramRuntimeSurfaceModuleV1 } from "../program-platform/ui/program-runtime-surface.ts";

/**
 * Opaque application-owned runtime for one exact Process-pinned Program package.
 *
 * The Host owns replacement and disposal, but it neither interprets the
 * Program controller nor knows which bundled or imported package selected the
 * runtime profile. Program-local UI adapters are the only consumers of
 * `controller` and `snapshot`.
 */
export interface ActiveProgramRuntimeHandleV1 {
  readonly programPackage: AdmittedProgramPackageArchiveV1;
  readonly controller: unknown;
  getSnapshot(): unknown;
  subscribe(listener: () => void): () => void;
  /** Program-owned UI entry. Loading it is part of activating this exact package. */
  loadSurface(): Promise<ProgramRuntimeSurfaceModuleV1>;
  close(): boolean | Promise<boolean>;
  dispose(): void | Promise<void>;
}

export interface ProgramRuntimeControllerAdapterV1 {
  readonly runtimeProfile: string;
  create(input: {
    readonly repository: ProgramDataRepositoryV1;
    /** Program-neutral Host capability; a lazy Program adapter may derive its own facet. */
    readonly workspace: BrowserProgramWorkspaceAuthorityHostV1;
    readonly programPackage: AdmittedProgramPackageArchiveV1;
    readonly exactProcessId: string | null;
    readonly reportFailure: (code: string, error: unknown) => void;
  }): Promise<ActiveProgramRuntimeHandleV1>;
}

export type LoadProgramRuntimeControllerAdapterV1 = (
  runtimeProfile: string,
) => Promise<ProgramRuntimeControllerAdapterV1 | null>;

// SPDX-License-Identifier: MIT

import type { BrowserProgramWorkspaceAuthorityHostV1 } from "./workspace/browser-program-workspace-authority.ts";
import type { ProgramDataRepositoryV1 } from "./persistence/program-data-repository.ts";
import type { AdmittedProgramPackageArchiveV1 } from "../program-platform/package/program-package-archive.ts";
import type { ProgramRuntimeSurfaceModuleV1 } from "../program-platform/ui/program-runtime-surface.ts";

export interface ProgramRuntimeSurfaceDrainOwnerV1 {
  register(resource: {
    /** Reversible pre-close fence. The mounted Surface must remain usable afterward. */
    readonly quiesce: () => Promise<void>;
    /** Final cleanup after the Program close has committed, or on Surface unmount. */
    readonly retire: () => Promise<void>;
  }): () => void;
  quiesce(): Promise<void>;
  retire(): Promise<void>;
}

/**
 * Small Program-lifetime join point for resources created only after its lazy
 * Surface mounts. Failed cleanup remains retryable by the next close attempt.
 */
export function createProgramRuntimeSurfaceDrainOwnerV1(): ProgramRuntimeSurfaceDrainOwnerV1 {
  interface RegistrationV1 {
    readonly quiesce: () => Promise<void>;
    readonly retire: () => Promise<void>;
    quiesceSettlement: Promise<void> | null;
    retireSettlement: Promise<void> | null;
  }
  const registrations = new Set<RegistrationV1>();

  const quiesceV1 = (registration: RegistrationV1): Promise<void> => {
    if (registration.quiesceSettlement !== null) return registration.quiesceSettlement;
    const settlement = Promise.resolve().then(registration.quiesce);
    registration.quiesceSettlement = settlement;
    void settlement.finally(() => {
      if (registration.quiesceSettlement === settlement) {
        registration.quiesceSettlement = null;
      }
    }).catch(() => undefined);
    return settlement;
  };

  const retireV1 = (registration: RegistrationV1): Promise<void> => {
    if (registration.retireSettlement !== null) return registration.retireSettlement;
    const quiesceSettlement = registration.quiesceSettlement;
    const settlement = (
      quiesceSettlement === null ? Promise.resolve() : quiesceSettlement.catch(() => undefined)
    ).then(registration.retire);
    registration.retireSettlement = settlement;
    void settlement.then(() => {
      registrations.delete(registration);
      registration.retireSettlement = null;
    }, () => {
      registration.retireSettlement = null;
    });
    return settlement;
  };

  return {
    register(resource) {
      const registration: RegistrationV1 = {
        ...resource,
        quiesceSettlement: null,
        retireSettlement: null,
      };
      registrations.add(registration);
      let registered = true;
      return () => {
        if (!registered) return;
        registered = false;
        if (!registrations.has(registration) && registration.retireSettlement === null) return;
        void retireV1(registration).catch(() => undefined);
      };
    },
    async quiesce() {
      await Promise.all([...registrations].map(quiesceV1));
    },
    async retire() {
      while (registrations.size > 0) {
        await Promise.all([...registrations].map(retireV1));
      }
    },
  };
}

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
  readonly surfaceDrainOwner: ProgramRuntimeSurfaceDrainOwnerV1;
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

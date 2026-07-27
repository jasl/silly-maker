// SPDX-License-Identifier: MIT
import type { BuildProvenanceV1, DeepReadonly } from "@sillymaker/base";
import type { PersistenceRebootstrapDisposalV1 } from "@sillymaker/base/runtime";

import type {
  InstalledResolvedGameHmrV1,
  ResolvedGameHmrHotAdapterV1,
} from "./resolved-game-hmr.ts";
import { installResolvedGameHmrV1 } from "./resolved-game-hmr.ts";
import type { StartedWebGameApplicationV1 } from "./start-web-game-application.tsx";

/**
 * Composer-owned dev HMR for `startWebGameApplicationV1` applications. A
 * Story entry passes its `import.meta.hot` adapter plus two module
 * accessors; the composer owns invalidation, persistence handoff,
 * successor start, and the next accept boundary. Entries never create an
 * HMR owner, never unmount by hand, and never touch the persistence lease.
 */
export interface InstallWebGameApplicationHmrInputV1<TModule> {
  readonly started: StartedWebGameApplicationV1;
  readonly hot: ResolvedGameHmrHotAdapterV1<TModule> | undefined;
  /** Resolves the accepted module's provenance for identity comparison. */
  resolveAcceptedProvenance(module: TModule): DeepReadonly<BuildProvenanceV1>;
  /**
   * Starts the successor from the accepted module. The successor must reuse
   * the predecessor's Host and adopt the handoff disposition.
   */
  startSuccessor(input: {
    readonly module: TModule;
    readonly started: StartedWebGameApplicationV1;
    readonly disposition: DeepReadonly<PersistenceRebootstrapDisposalV1>;
  }): Promise<StartedWebGameApplicationV1>;
  /** Installs the next accept boundary on the successor's module. */
  installNextBoundary(input: {
    readonly module: TModule;
    readonly started: StartedWebGameApplicationV1;
  }): InstalledResolvedGameHmrV1;
  onSuccessorStarted?(started: StartedWebGameApplicationV1): void;
  reportFailure?(error: unknown): void;
}

function requireAcceptedModuleV1<TModule>(module: TModule | undefined): TModule {
  if (module === undefined) throw new TypeError("accepted HMR module is unavailable");
  return module;
}

export function installWebGameApplicationHmrV1<TModule>(
  input: InstallWebGameApplicationHmrInputV1<TModule>,
): InstalledResolvedGameHmrV1 {
  let retryDisposition: DeepReadonly<PersistenceRebootstrapDisposalV1> | undefined;

  return installResolvedGameHmrV1<TModule, DeepReadonly<PersistenceRebootstrapDisposalV1>>({
    hot: input.hot,
    currentProvenance: input.started.provenance,
    lifecycle: Object.freeze({
      invalidationController: Object.freeze({
        invalidateForHmr: () => input.started.invalidateForHmr(),
      }),
      disposeForRebootstrap: () => input.started.disposeForRebootstrap(),
    }),
    resolveAcceptedProvenance(module) {
      return input.resolveAcceptedProvenance(requireAcceptedModuleV1(module));
    },
    onAcceptedEqual(module) {
      input.installNextBoundary(
        Object.freeze({ module: requireAcceptedModuleV1(module), started: input.started }),
      );
    },
    async rebootstrap({ module, disposition }) {
      const acceptedModule = requireAcceptedModuleV1(module);
      let successor: StartedWebGameApplicationV1 | undefined;
      try {
        successor = await input.startSuccessor(
          Object.freeze({
            module: acceptedModule,
            started: input.started,
            disposition: retryDisposition ?? disposition,
          }),
        );
        input.installNextBoundary(Object.freeze({ module: acceptedModule, started: successor }));
        input.onSuccessorStarted?.(successor);
      } catch (error) {
        if (successor !== undefined) {
          try {
            retryDisposition = await successor.disposeForRebootstrap();
          } catch {
            // The transition failure stays authoritative over cleanup noise.
          }
        }
        throw error;
      }
    },
    ...(input.reportFailure === undefined ? {} : { reportFailure: input.reportFailure }),
  });
}

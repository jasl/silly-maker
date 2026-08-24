// SPDX-License-Identifier: MIT
import type { BuildProvenanceV1, DeepReadonly } from "@sillymaker/base";
import type {
  CoreRebootstrapHandoffInternalV1,
  CoreRebootstrapStartFailureInternalV1,
} from "@sillymaker/base/runtime/internal";

import type {
  InstalledResolvedGameHmrV1,
  ResolvedGameHmrEligibilityInputV1,
  ResolvedGameHmrHotAdapterV1,
} from "./resolved-game-hmr.ts";
import { installResolvedGameHmrV1 } from "./resolved-game-hmr.ts";
import type { StartedWebGameApplicationV1 } from "./start-web-game-application.tsx";
import {
  disposeStartedWebGameApplicationForRebootstrapInternalV1,
  invalidateStartedWebGameApplicationForHmrInternalV1,
} from "./start-web-game-application.tsx";

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
   * the predecessor's Host and adopt the exact handoff.
   */
  startSuccessor(input: {
    readonly module: TModule;
    readonly started: StartedWebGameApplicationV1;
    readonly handoff: DeepReadonly<CoreRebootstrapHandoffInternalV1>;
    readonly onRebootstrapStartFailureInternal: (
      outcome: DeepReadonly<CoreRebootstrapStartFailureInternalV1>,
    ) => void;
  }): Promise<StartedWebGameApplicationV1>;
  /**
   * Explicitly admits a non-direct candidate only when its registered
   * migration/adoption declarations establish an authoritative path.
   */
  isAuthoritativeRebootstrapEligible?(
    input: ResolvedGameHmrEligibilityInputV1<TModule>,
  ): boolean;
  /** Installs the next accept boundary on the successor's module. */
  installNextBoundary(input: {
    readonly module: TModule;
    readonly started: StartedWebGameApplicationV1;
  }): InstalledResolvedGameHmrV1;
  onSuccessorStarted?(started: StartedWebGameApplicationV1): void;
  reportFailure?(error: unknown): void;
}

function isDirectAuthoritativeRebootstrapV1<TModule>(
  input: ResolvedGameHmrEligibilityInputV1<TModule>,
): boolean {
  const { previous, next } = input.reason;
  return previous.storyId === next.storyId &&
    previous.storyRevision === next.storyRevision &&
    previous.engineDigest === next.engineDigest &&
    previous.stateContractRevision === next.stateContractRevision &&
    previous.stateContractDigest === next.stateContractDigest &&
    previous.simulationDigest === next.simulationDigest;
}

function requireAcceptedModuleV1<TModule>(module: TModule | undefined): TModule {
  if (module === undefined) throw new TypeError("accepted HMR module is unavailable");
  return module;
}

export function installWebGameApplicationHmrV1<TModule>(
  input: InstallWebGameApplicationHmrInputV1<TModule>,
): InstalledResolvedGameHmrV1 {
  let retryHandoff: DeepReadonly<CoreRebootstrapHandoffInternalV1> | undefined;
  let retryAvailable = true;

  return installResolvedGameHmrV1<TModule, DeepReadonly<CoreRebootstrapHandoffInternalV1>>({
    hot: input.hot,
    currentProvenance: input.started.provenance,
    lifecycle: {
      invalidationController: {
        invalidateForHmr: () => invalidateStartedWebGameApplicationForHmrInternalV1(input.started),
      },
      disposeForRebootstrap: () =>
        disposeStartedWebGameApplicationForRebootstrapInternalV1(input.started),
    },
    resolveAcceptedProvenance(module) {
      return input.resolveAcceptedProvenance(requireAcceptedModuleV1(module));
    },
    isRebootstrapEligible(candidate) {
      return isDirectAuthoritativeRebootstrapV1(candidate) ||
        (input.isAuthoritativeRebootstrapEligible?.(candidate) ?? false);
    },
    onAcceptedEqual(module) {
      input.installNextBoundary(
        { module: requireAcceptedModuleV1(module), started: input.started },
      );
    },
    async rebootstrap({ module, handoff }) {
      const acceptedModule = requireAcceptedModuleV1(module);
      const suppliedHandoff = retryHandoff ?? handoff;
      let successor: StartedWebGameApplicationV1 | undefined;
      let failureOutcome: DeepReadonly<CoreRebootstrapStartFailureInternalV1> = {
        kind: "ready" as const,
        handoff: suppliedHandoff,
      };
      try {
        successor = await input.startSuccessor(
          {
            module: acceptedModule,
            started: input.started,
            handoff: suppliedHandoff,
            onRebootstrapStartFailureInternal(outcome) {
              failureOutcome = outcome;
            },
          },
        );
        input.installNextBoundary({ module: acceptedModule, started: successor });
        input.onSuccessorStarted?.(successor);
      } catch (error) {
        if (successor !== undefined) {
          try {
            failureOutcome = {
              kind: "ready" as const,
              handoff: await disposeStartedWebGameApplicationForRebootstrapInternalV1(successor),
            };
          } catch {
            failureOutcome = { kind: "terminal" as const };
          }
        }
        // A pre-Core failure leaves the supplied handoff untouched. Every Core
        // path that can consume it reports a definitive ready/terminal outcome
        // before rejecting, so callback absence here means untouched input.
        retryHandoff = failureOutcome.kind === "ready" ? failureOutcome.handoff : undefined;
        retryAvailable = failureOutcome.kind === "ready";
        throw error;
      }
    },
    canRetryRebootstrap: () => retryAvailable,
    ...(input.reportFailure === undefined ? {} : { reportFailure: input.reportFailure }),
  });
}

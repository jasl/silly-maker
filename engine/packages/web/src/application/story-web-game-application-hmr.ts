// SPDX-License-Identifier: MIT
import type { BuildProvenanceV1, DeepReadonly, GameSimulationTypeMapV1 } from "@sillymaker/base";
import type {
  CoreGameApplicationDefinitionV1,
  ResolveCoreGameApplicationOptionsV1,
} from "@sillymaker/base/runtime";
import { resolveCoreGameApplicationV1 } from "@sillymaker/base/runtime";
import type {
  CoreRebootstrapHandoffInternalV1,
  CoreRebootstrapStartFailureInternalV1,
} from "@sillymaker/base/runtime/internal";

import type {
  ResolvedGameHmrHotAdapterV1,
  ResolvedGameHmrIdentityV1,
} from "./resolved-game-hmr.ts";
import { createResolvedGameHmrIdentityV1 } from "./resolved-game-hmr.ts";
import type {
  StartedWebGameApplicationV1,
  StartWebGameApplicationForRebootstrapOptionsInternalV1,
} from "./start-web-game-application.tsx";

type ApplicationBuildIdentityInputInternalV1 = NonNullable<
  ResolveCoreGameApplicationOptionsV1["buildIdentityInput"]
>;

interface WebGameApplicationIdentitySourceInternalV1 {
  readonly buildIdentityInput?: ApplicationBuildIdentityInputInternalV1;
}

/** Registration owned by a Story module so Vite can see its literal accept call. @internal */
export interface WebGameApplicationViteHotRegistrationInternalV1<TModule> {
  accept(handler: (module: TModule | undefined) => void): void;
  invalidate(message?: string): void;
}

function sameResolvedGameHmrIdentityInternalV1(
  left: ResolvedGameHmrIdentityV1,
  right: ResolvedGameHmrIdentityV1,
): boolean {
  return left.storyId === right.storyId &&
    left.storyRevision === right.storyRevision &&
    left.storyDigest === right.storyDigest &&
    left.engineDigest === right.engineDigest &&
    left.stateContractRevision === right.stateContractRevision &&
    left.stateContractDigest === right.stateContractDigest &&
    left.simulationDigest === right.simulationDigest &&
    left.presentationDigest === right.presentationDigest;
}

function changedApplicationFacetInternalV1(
  current: WebGameApplicationIdentitySourceInternalV1,
  accepted: WebGameApplicationIdentitySourceInternalV1,
): boolean {
  if (
    current.buildIdentityInput === undefined ||
    accepted.buildIdentityInput === undefined
  ) {
    return false;
  }
  return JSON.stringify(current.buildIdentityInput.application) !==
    JSON.stringify(accepted.buildIdentityInput.application);
}

/** Resolves the live provenance carried by one admitted Story application. @internal */
export function resolveWebGameApplicationHmrProvenanceInternalV1<
  TSimulationFacet,
  TPresentationFacet,
  TTypes extends GameSimulationTypeMapV1,
  TQueries,
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
>(application: {
  readonly core: CoreGameApplicationDefinitionV1<
    TSimulationFacet,
    TPresentationFacet,
    TTypes,
    TQueries,
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult
  >;
  readonly buildIdentityInput?: ApplicationBuildIdentityInputInternalV1;
}): DeepReadonly<BuildProvenanceV1> {
  if (application.buildIdentityInput === undefined) {
    throw new TypeError("web.hmr_build_identity_unavailable");
  }
  const resolved = resolveCoreGameApplicationV1(application.core, {
    buildIdentityInput: application.buildIdentityInput,
  });
  if (resolved.kind === "failed") {
    throw new TypeError(`web.hmr_application_resolution_failed:${resolved.failure.code}`);
  }
  return resolved.application.provenance as DeepReadonly<BuildProvenanceV1>;
}

/**
 * Owns equal-R2 application-facet fallback while leaving the literal
 * `import.meta.hot.accept(` registration in the Story module where Vite's
 * static analysis can observe it.
 *
 * @internal
 */
export function createWebGameApplicationViteHotAdapterInternalV1<
  TModule,
  TApplication extends WebGameApplicationIdentitySourceInternalV1,
>(input: {
  readonly currentApplication: TApplication;
  readonly currentProvenance: DeepReadonly<BuildProvenanceV1>;
  readonly registration: WebGameApplicationViteHotRegistrationInternalV1<TModule>;
  readonly r3InvalidationMessage: string;
  applicationFromModule(module: TModule): TApplication;
  resolveApplicationProvenance(
    application: TApplication,
  ): DeepReadonly<BuildProvenanceV1>;
}): ResolvedGameHmrHotAdapterV1<TModule> {
  return Object.freeze({
    accept(handler: (module: TModule | undefined) => void): void {
      input.registration.accept((module) => {
        if (module !== undefined) {
          const acceptedApplication = input.applicationFromModule(module);
          if (changedApplicationFacetInternalV1(input.currentApplication, acceptedApplication)) {
            let acceptedProvenance: DeepReadonly<BuildProvenanceV1>;
            try {
              acceptedProvenance = input.resolveApplicationProvenance(acceptedApplication);
            } catch {
              // The coordinator owns resolution failure and preserves the
              // predecessor until a later candidate can be admitted.
              handler(module);
              return;
            }
            if (
              sameResolvedGameHmrIdentityInternalV1(
                createResolvedGameHmrIdentityV1(input.currentProvenance),
                createResolvedGameHmrIdentityV1(acceptedProvenance),
              )
            ) {
              input.registration.invalidate(input.r3InvalidationMessage);
              return;
            }
          }
        }
        handler(module);
      });
    },
  });
}

/** Builds the only allowed same-root/Host successor options. @internal */
export function createWebGameApplicationRebootstrapStartOptionsInternalV1(input: {
  readonly predecessor: StartedWebGameApplicationV1;
  readonly rootElement: HTMLElement;
  readonly handoff: DeepReadonly<CoreRebootstrapHandoffInternalV1>;
  readonly onRebootstrapStartFailureInternal: (
    outcome: DeepReadonly<CoreRebootstrapStartFailureInternalV1>,
  ) => void;
}): StartWebGameApplicationForRebootstrapOptionsInternalV1 {
  return Object.freeze({
    rootElement: input.rootElement,
    host: input.predecessor.host,
    capabilitySearch: input.predecessor.capabilitySearch,
    handoff: input.handoff,
    onRebootstrapStartFailureInternal: input.onRebootstrapStartFailureInternal,
  });
}

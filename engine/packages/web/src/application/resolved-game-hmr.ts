// SPDX-License-Identifier: MIT
import type {
  BuildProvenanceV1,
  DeepReadonly,
  Digest,
  PositiveSafeInteger,
  RuntimeInvalidationControllerV1,
} from "@sillymaker/base";

export interface ResolvedGameHmrIdentityV1 {
  readonly storyId: string;
  readonly storyRevision: PositiveSafeInteger;
  readonly storyDigest: Digest;
  readonly engineDigest: Digest;
  readonly stateContractRevision: PositiveSafeInteger;
  readonly stateContractDigest: Digest;
  readonly simulationDigest: Digest;
  readonly presentationDigest: Digest;
}

export interface ResolvedGameHmrHotAdapterV1<TModule> {
  accept(handler: (module: TModule | undefined) => void): void;
}

export interface WebRuntimeRebootstrapLifecycleV1<THandoff> {
  readonly invalidationController: RuntimeInvalidationControllerV1;
  disposeForRebootstrap(): Promise<THandoff>;
}

export interface ResolvedGameHmrReasonV1 {
  readonly kind: "identity_changed";
  readonly previous: ResolvedGameHmrIdentityV1;
  readonly next: ResolvedGameHmrIdentityV1;
}

export interface ResolvedGameHmrRebootstrapInputV1<TModule, THandoff> {
  readonly module: TModule | undefined;
  readonly reason: ResolvedGameHmrReasonV1;
  readonly handoff: THandoff;
}

export interface ResolvedGameHmrEligibilityInputV1<TModule> {
  readonly module: TModule | undefined;
  readonly reason: ResolvedGameHmrReasonV1;
}

export interface InstalledResolvedGameHmrV1 {
  waitForTransition(): Promise<void>;
}

/** Extracts the exact identity fields whose change requires a full runtime rebootstrap. */
export function createResolvedGameHmrIdentityV1(
  provenance: DeepReadonly<BuildProvenanceV1>,
): ResolvedGameHmrIdentityV1 {
  return Object.freeze({
    storyId: provenance.story.id,
    storyRevision: provenance.story.revision,
    storyDigest: provenance.story.digest,
    engineDigest: provenance.engine.digest,
    stateContractRevision: provenance.resolved.stateContractRevision,
    stateContractDigest: provenance.resolved.stateContractDigest,
    simulationDigest: provenance.resolved.simulationDigest,
    presentationDigest: provenance.resolved.presentationDigest,
  });
}

function sameResolvedGameHmrIdentityV1(
  left: ResolvedGameHmrIdentityV1,
  right: ResolvedGameHmrIdentityV1,
): boolean {
  return (
    left.storyId === right.storyId &&
    left.storyRevision === right.storyRevision &&
    left.storyDigest === right.storyDigest &&
    left.engineDigest === right.engineDigest &&
    left.stateContractRevision === right.stateContractRevision &&
    left.stateContractDigest === right.stateContractDigest &&
    left.simulationDigest === right.simulationDigest &&
    left.presentationDigest === right.presentationDigest
  );
}

/**
 * Installs one self-accepting HMR boundary that invalidates synchronously, fences persistence,
 * and then calls the caller's single same-root composition factory with the accepted module.
 */
export function installResolvedGameHmrV1<TModule, THandoff>(input: {
  readonly hot: ResolvedGameHmrHotAdapterV1<TModule> | undefined;
  readonly currentProvenance: DeepReadonly<BuildProvenanceV1>;
  readonly lifecycle: WebRuntimeRebootstrapLifecycleV1<THandoff>;
  resolveAcceptedProvenance(module: TModule | undefined): DeepReadonly<BuildProvenanceV1>;
  /**
   * Synchronous candidate preflight before the current runtime is fenced.
   * Returning false preserves the predecessor and keeps this boundary open
   * for a later candidate.
   */
  isRebootstrapEligible?(input: ResolvedGameHmrEligibilityInputV1<TModule>): boolean;
  onAcceptedEqual?(module: TModule | undefined): void;
  rebootstrap(input: ResolvedGameHmrRebootstrapInputV1<TModule, THandoff>): Promise<void>;
  /** False closes a failed transition when no current handoff remains retryable. */
  canRetryRebootstrap?(): boolean;
  reportFailure?(error: unknown): void;
}): InstalledResolvedGameHmrV1 {
  const currentIdentity = createResolvedGameHmrIdentityV1(input.currentProvenance);
  let boundaryClosed = false;
  let invalidationStarted = false;
  let invalidationReason: ResolvedGameHmrReasonV1 | undefined;
  let handoff: Promise<THandoff> | undefined;
  let transition: Promise<void> = Promise.resolve();

  const reportFailure = (error: unknown): void => {
    try {
      input.reportFailure?.(error);
    } catch {
      // HMR failure reporting is diagnostic-only and cannot interrupt invalidation or fencing.
    }
  };

  const getHandoff = (): Promise<THandoff> => {
    handoff ??= Promise.resolve().then(async () => {
      return await input.lifecycle.disposeForRebootstrap();
    });
    return handoff;
  };

  const runTransition = async (
    module: TModule | undefined,
    reason: ResolvedGameHmrReasonV1,
  ): Promise<void> => {
    let settledHandoff: THandoff;
    try {
      settledHandoff = await getHandoff();
    } catch (error) {
      // This boundary owns one predecessor disposal promise. A rejection
      // means no ready handoff exists, and replaying the same rejected
      // promise can never make a later candidate safe.
      boundaryClosed = true;
      reportFailure(error);
      return;
    }
    try {
      await input.rebootstrap(Object.freeze({ module, reason, handoff: settledHandoff }));
      boundaryClosed = true;
    } catch (error) {
      let retryable = true;
      try {
        retryable = input.canRetryRebootstrap?.() ?? true;
      } catch {
        retryable = false;
      }
      if (!retryable) boundaryClosed = true;
      reportFailure(error);
    }
  };

  const scheduleTransition = (
    module: TModule | undefined,
    reason: ResolvedGameHmrReasonV1,
  ): void => {
    void getHandoff();
    transition = transition.then(async () => {
      if (boundaryClosed) return;
      await runTransition(module, reason);
    });
  };

  input.hot?.accept((module) => {
    if (boundaryClosed) return;

    let reason: ResolvedGameHmrReasonV1;
    try {
      const nextIdentity = createResolvedGameHmrIdentityV1(input.resolveAcceptedProvenance(module));
      if (sameResolvedGameHmrIdentityV1(currentIdentity, nextIdentity)) {
        if (!invalidationStarted) {
          if (input.onAcceptedEqual !== undefined) {
            try {
              input.onAcceptedEqual(module);
              boundaryClosed = true;
            } catch (error) {
              reportFailure(error);
            }
          }
          return;
        }
        if (invalidationReason === undefined) return;
        reason = invalidationReason;
      } else {
        reason = Object.freeze({
          kind: "identity_changed",
          previous: currentIdentity,
          next: nextIdentity,
        });
      }
    } catch (error) {
      // An unresolved candidate cannot prove a compatible/migratable
      // authoritative path. Keep the predecessor live (or, after an earlier
      // retirement, wait for a later resolved retry) rather than guessing.
      reportFailure(error);
      return;
    }

    if (input.isRebootstrapEligible !== undefined) {
      let eligible: boolean;
      try {
        eligible = input.isRebootstrapEligible(Object.freeze({ module, reason }));
      } catch (error) {
        reportFailure(error);
        return;
      }
      if (!eligible) {
        reportFailure(new TypeError("web.hmr_rebootstrap_ineligible"));
        return;
      }
    }

    if (!invalidationStarted) {
      try {
        input.lifecycle.invalidationController.invalidateForHmr();
      } catch (error) {
        reportFailure(error);
        return;
      }
      invalidationStarted = true;
      invalidationReason = reason;
    }
    scheduleTransition(module, reason);
  });

  return Object.freeze({
    waitForTransition: () => transition,
  });
}

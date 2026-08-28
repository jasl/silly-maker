// SPDX-License-Identifier: MIT
import type {
  ExtensionActivationStateInternalV1,
  ExtensionCleanupDiagnosticInternalV1,
  ExtensionFactoryInternalV1,
} from "../extension-runtime/contracts.ts";

export type ApplicationModRuntimeErrorCodeInternalV1 =
  | "mod_runtime.invalid_definition"
  | "mod_runtime.duplicate"
  | "mod_runtime.mod_unknown"
  | "mod_runtime.load_failed"
  | "mod_runtime.identity_mismatch"
  | "mod_runtime.dependency_missing"
  | "mod_runtime.dependency_cycle"
  | "mod_runtime.target_unknown"
  | "mod_runtime.kind_mismatch"
  | "mod_runtime.collision"
  | "mod_runtime.compile_failed"
  | "mod_runtime.selection_generation_invalid"
  | "mod_runtime.selection_generation_stale";

export class ApplicationModRuntimeErrorInternalV1 extends Error {
  override readonly name = "ApplicationModRuntimeErrorInternalV1";

  constructor(
    readonly code: ApplicationModRuntimeErrorCodeInternalV1,
    readonly reference: string,
    cause?: unknown,
  ) {
    super(
      `${code}:${reference}`,
      cause === undefined ? undefined : { cause },
    );
  }
}

export interface ApplicationModContributionInternalV1<TPayload = unknown> {
  readonly contributionId: string;
  readonly pointId: string;
  readonly contributionKind: string;
  readonly payload: TPayload;
}

export interface ApplicationDataModDefinitionInternalV1<TPayload = unknown> {
  readonly modId: string;
  readonly generation: string;
  readonly dependencies: readonly string[];
  readonly contributions: readonly ApplicationModContributionInternalV1<TPayload>[];
}

export interface ApplicationCodeModDefinitionInternalV1<TPayload = unknown>
  extends ApplicationDataModDefinitionInternalV1<TPayload> {
  /** Existing Direct lifecycle; its id/generation must equal the Mod identity. */
  readonly lifecycle?: ExtensionFactoryInternalV1<unknown>;
}

export interface ApplicationDataModSourceInternalV1<TPayload = unknown> {
  readonly kind: "data";
  readonly definition: ApplicationDataModDefinitionInternalV1<TPayload>;
}

/**
 * A literal/generated loader known to the application build. Loading is a
 * cold, resource-free staging step; reversible resources belong in lifecycle
 * setup/effects so the existing Direct owner can roll them back.
 */
export interface ApplicationCodeModSourceInternalV1<TPayload = unknown> {
  readonly kind: "code";
  readonly modId: string;
  readonly generation: string;
  load():
    | ApplicationCodeModDefinitionInternalV1<TPayload>
    | PromiseLike<ApplicationCodeModDefinitionInternalV1<TPayload>>;
}

export type ApplicationModSourceInternalV1<TPayload = unknown> =
  | ApplicationDataModSourceInternalV1<TPayload>
  | ApplicationCodeModSourceInternalV1<TPayload>;

export type ApplicationModCollisionPolicyInternalV1 = "allow" | "reject";

export interface ActiveApplicationModContributionInternalV1<TPayload = unknown>
  extends ApplicationModContributionInternalV1<TPayload> {
  readonly modId: string;
  readonly modGeneration: string;
}

export interface ApplicationModCompileInputInternalV1<TPayload = unknown> {
  readonly pointId: string;
  readonly contributions: readonly ActiveApplicationModContributionInternalV1<TPayload>[];
}

export interface ApplicationModExtensionPointInternalV1<
  TPayload = unknown,
  TCompiled = unknown,
> {
  readonly pointId: string;
  readonly contributionKind: string;
  /** `reject` treats a repeated contributionId across active Mods as a collision. */
  readonly collisionPolicy: ApplicationModCollisionPolicyInternalV1;
  /** Cold, staging-pure compilation; acquire reversible resources in lifecycle setup. */
  compile(
    input: ApplicationModCompileInputInternalV1<TPayload>,
  ): TCompiled | PromiseLike<TCompiled>;
}

export interface CompiledApplicationModPointInternalV1<TCompiled = unknown> {
  readonly pointId: string;
  readonly value: TCompiled;
}

export interface ActiveApplicationModIdentityInternalV1 {
  readonly modId: string;
  readonly generation: string;
}

export interface CreateApplicationModRuntimeInputInternalV1<
  TPayload = unknown,
  TCompiled = unknown,
> {
  /** Application generation used only by the existing lifecycle owner. */
  readonly applicationGeneration: string;
  readonly catalog: readonly ApplicationModSourceInternalV1<TPayload>[];
  /** Fixed for this runtime; dependencies are ordered before dependents. */
  readonly activeModIds: readonly string[];
  readonly extensionPoints: readonly ApplicationModExtensionPointInternalV1<
    TPayload,
    TCompiled
  >[];
  readonly onLifecycleDiagnostic?: (
    diagnostic: ExtensionCleanupDiagnosticInternalV1,
  ) => void;
}

export interface ApplicationModRuntimeInternalV1<TCompiled = unknown> {
  /** Ordered data for the application's existing build/simulation identity. */
  readonly activeIdentity: readonly ActiveApplicationModIdentityInternalV1[];
  /** Cold-compiled direct values; consumers bind them before hot execution. */
  readonly compiledPoints: readonly CompiledApplicationModPointInternalV1<TCompiled>[];
  dispose(): Promise<void>;
}

export interface ApplicationModSelectionCandidateInternalV1<TPayload = unknown> {
  /** Monotonic within one application-generation-local controller. */
  readonly selectionGeneration: number;
  readonly catalog: readonly ApplicationModSourceInternalV1<TPayload>[];
  /** Immutable for this candidate generation. */
  readonly activeModIds: readonly string[];
}

export interface ApplicationModSelectionInternalV1<TCompiled = unknown> {
  readonly applicationGeneration: string;
  readonly selectionGeneration: number;
  readonly activeIdentity: readonly ActiveApplicationModIdentityInternalV1[];
  readonly compiledPoints: readonly CompiledApplicationModPointInternalV1<TCompiled>[];
}

export type ApplicationModSelectionStateInternalV1<TCompiled = unknown> =
  ExtensionActivationStateInternalV1<ApplicationModSelectionInternalV1<TCompiled>>;

export type ApplicationModSelectionPublisherInternalV1<TCompiled = unknown> = (
  candidate: ApplicationModSelectionInternalV1<TCompiled>,
  previous: ApplicationModSelectionInternalV1<TCompiled>,
) => void | PromiseLike<void>;

export interface CreateApplicationModSelectionControllerInputInternalV1<
  TPayload = unknown,
  TCompiled = unknown,
> {
  /** The controller cannot outlive or cross this application generation. */
  readonly applicationGeneration: string;
  readonly extensionPoints: readonly ApplicationModExtensionPointInternalV1<
    TPayload,
    TCompiled
  >[];
  readonly onLifecycleDiagnostic?: (
    diagnostic: ExtensionCleanupDiagnosticInternalV1,
  ) => void;
}

export interface ApplicationModSelectionControllerInternalV1<
  TPayload = unknown,
  TCompiled = unknown,
> {
  activate(
    candidate: ApplicationModSelectionCandidateInternalV1<TPayload>,
  ): Promise<ApplicationModSelectionInternalV1<TCompiled>>;
  /** Retries only a failed initial candidate. */
  retry(): Promise<ApplicationModSelectionInternalV1<TCompiled>>;
  /** Stages and publishes a complete successor selection before retiring its predecessor. */
  restart(
    candidate: ApplicationModSelectionCandidateInternalV1<TPayload>,
    publish: ApplicationModSelectionPublisherInternalV1<TCompiled>,
  ): Promise<ApplicationModSelectionInternalV1<TCompiled>>;
  getState(): ApplicationModSelectionStateInternalV1<TCompiled>;
  getCurrent(): ApplicationModSelectionInternalV1<TCompiled> | null;
  subscribe(listener: () => void): () => void;
  dispose(): Promise<void>;
}

// SPDX-License-Identifier: MIT

export type ExtensionRuntimeErrorCodeInternalV1 =
  | "extension_runtime.invalid_definition"
  | "extension_runtime.factory_mismatch"
  | "extension_runtime.load_failed"
  | "extension_runtime.setup_failed"
  | "extension_runtime.publication_failed"
  | "extension_runtime.required_domain_missing"
  | "extension_runtime.required_domain_ambiguous"
  | "extension_runtime.required_local_binding_missing"
  | "extension_runtime.required_local_binding_ambiguous"
  | "extension_runtime.scope_closed"
  | "extension_runtime.invalid_effect"
  | "extension_runtime.reentrant_transition"
  | "extension_runtime.transition_busy"
  | "extension_runtime.retry_required"
  | "extension_runtime.retry_unavailable"
  | "extension_runtime.not_ready"
  | "extension_runtime.disposed"
  | "extension_runtime.stale_generation";

export class ExtensionRuntimeErrorInternalV1 extends Error {
  override readonly name = "ExtensionRuntimeErrorInternalV1";

  constructor(
    readonly code: ExtensionRuntimeErrorCodeInternalV1,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
  }
}

export type ExtensionCleanupInternalV1 = () => void | PromiseLike<void>;

export type ExtensionEffectInstallerInternalV1 = () =>
  | void
  | ExtensionCleanupInternalV1
  | PromiseLike<void | ExtensionCleanupInternalV1>;

export interface ExtensionSetupScopeInternalV1 {
  /** Installs one staging-safe reversible resource owned by this factory. */
  effect(install: ExtensionEffectInstallerInternalV1): Promise<void>;
  /** Mounts a distinct child whose lifetime cannot outlive this owner. */
  mountChild<TConsumer>(
    factory: ExtensionFactoryInternalV1<TConsumer>,
  ): Promise<ExtensionMountedHandleInternalV1<TConsumer>>;
}

/**
 * A build-known, orchestration-neutral domain or contribution factory. The
 * same factory can be mounted directly or wrapped by an Extension Runtime.
 */
export interface ExtensionFactoryInternalV1<TConsumer> {
  readonly id: string;
  readonly generation: string;
  setup(
    scope: ExtensionSetupScopeInternalV1,
  ): TConsumer | PromiseLike<TConsumer>;
}

/**
 * A literal/generated loader entry. Loading is resource-free: module
 * evaluation must not install effects, publish consumers, or require cleanup.
 */
export interface ExtensionCandidateSourceInternalV1<TConsumer> {
  readonly id: string;
  readonly generation: string;
  load():
    | ExtensionFactoryInternalV1<TConsumer>
    | PromiseLike<ExtensionFactoryInternalV1<TConsumer>>;
}

export interface ExtensionMountedHandleInternalV1<TConsumer> {
  readonly id: string;
  readonly generation: string;
  readonly consumer: TConsumer;
  /** Fences new work, then releases children and effects exactly once. */
  dispose(): Promise<void>;
}

export type ExtensionCleanupPhaseInternalV1 = "rollback" | "dispose";

export interface ExtensionCleanupDiagnosticInternalV1 {
  readonly code: "extension_runtime.cleanup_failed";
  readonly id: string;
  readonly generation: string;
  readonly phase: ExtensionCleanupPhaseInternalV1;
  readonly error: unknown;
}

export type ExtensionLifecycleCallbackPhaseInternalV1 =
  | "setup"
  | "cleanup";

/**
 * @internal Shared by the selected backend and activation controller so every
 * lifecycle entry obeys the same reentry fence.
 *
 * Starting a different lifecycle transition from a trusted setup/cleanup
 * callback is rejected. Joining an already-started same-generation operation
 * or disposal takes precedence: portable browser JavaScript cannot distinguish
 * an external joiner from an async callback after an `await`. A lifecycle
 * callback must therefore never await its owner's own in-flight operation.
 */
export interface ExtensionLifecycleCallbackGuardInternalV1 {
  isActive(ownerId: string): boolean;
  run<T>(
    ownerId: string,
    phase: ExtensionLifecycleCallbackPhaseInternalV1,
    callback: () => T,
  ): T;
}

export interface ExtensionBackendMountOptionsInternalV1 {
  readonly callbackGuard?: ExtensionLifecycleCallbackGuardInternalV1;
  readonly onDiagnostic?: (diagnostic: ExtensionCleanupDiagnosticInternalV1) => void;
}

/** The neutral mount seam implemented by the product-selected private backend. */
export interface ExtensionLifecycleBackendInternalV1 {
  mount<TConsumer>(
    factory: ExtensionFactoryInternalV1<TConsumer>,
    options?: ExtensionBackendMountOptionsInternalV1,
  ): Promise<ExtensionMountedHandleInternalV1<TConsumer>>;
}

export interface ExtensionActivationControllerOptionsInternalV1 {
  readonly id: string;
  readonly backend: ExtensionLifecycleBackendInternalV1;
  readonly onDiagnostic?: (diagnostic: ExtensionCleanupDiagnosticInternalV1) => void;
}

export interface ExtensionCurrentConsumerInternalV1<TConsumer> {
  readonly id: string;
  readonly generation: string;
  readonly consumer: TConsumer;
}

export type ExtensionActivationStateInternalV1<TConsumer> =
  | { readonly kind: "idle" }
  | {
    readonly kind: "loading";
    readonly id: string;
    readonly generation: string;
    readonly previous: ExtensionCurrentConsumerInternalV1<TConsumer> | null;
  }
  | {
    readonly kind: "ready";
    readonly current: ExtensionCurrentConsumerInternalV1<TConsumer>;
  }
  | {
    readonly kind: "error";
    readonly id: string;
    readonly generation: string;
    readonly error: unknown;
  }
  | { readonly kind: "disposed" };

export type ExtensionCandidatePublisherInternalV1<TConsumer> = (
  candidate: ExtensionCurrentConsumerInternalV1<TConsumer>,
  previous: ExtensionCurrentConsumerInternalV1<TConsumer>,
) => void | PromiseLike<void>;

export interface ExtensionActivationControllerInternalV1<TConsumer> {
  activate(source: ExtensionCandidateSourceInternalV1<TConsumer>): Promise<TConsumer>;
  /** Retries only the last failed initial activation; activate() never retries implicitly. */
  retry(): Promise<TConsumer>;
  /** Stages a successor, publishes it, then retires the predecessor. */
  restart(
    source: ExtensionCandidateSourceInternalV1<TConsumer>,
    publish: ExtensionCandidatePublisherInternalV1<TConsumer>,
  ): Promise<TConsumer>;
  getState(): ExtensionActivationStateInternalV1<TConsumer>;
  getCurrent(): ExtensionCurrentConsumerInternalV1<TConsumer> | null;
  subscribe(listener: () => void): () => void;
  dispose(): Promise<void>;
}

/** One product-selected value; it is not a discoverable registry entry. */
export interface ExtensionSelectedCandidateInternalV1<TValue> {
  readonly id: string;
  readonly value: TValue;
}

export interface RequiredExtensionAdmissionInputInternalV1<TDomain, TLocalBinding> {
  readonly selectedDomains: readonly ExtensionSelectedCandidateInternalV1<TDomain>[];
  readonly requiredDomainIds: readonly string[];
  readonly selectedLocalBindings: readonly ExtensionSelectedCandidateInternalV1<TLocalBinding>[];
  readonly requiredLocalBindingIds: readonly string[];
}

/** Ordered exactly like the required-id lists; it exposes no lookup API. */
export interface AdmittedRequiredExtensionsInternalV1<TDomain, TLocalBinding> {
  readonly domains: readonly ExtensionSelectedCandidateInternalV1<TDomain>[];
  readonly localBindings: readonly ExtensionSelectedCandidateInternalV1<TLocalBinding>[];
}

export interface BoundExtensionConsumerInternalV1<TProvider, TDependent> {
  readonly provider: TProvider;
  readonly dependent: TDependent;
}

export interface BoundExtensionFactoryInputInternalV1<TProvider, TDependent> {
  readonly id: string;
  readonly generation: string;
  readonly provider: ExtensionFactoryInternalV1<TProvider>;
  createDependent(provider: TProvider): ExtensionFactoryInternalV1<TDependent>;
}

export function assertExtensionIdentifierInternalV1(value: string, subject: string): void {
  if (typeof value !== "string") {
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.invalid_definition",
      `${subject} must be a string`,
    );
  }
  let hasControlCharacter = false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      hasControlCharacter = true;
      break;
    }
  }
  if (
    value.length === 0 || value.length > 128 || value.trim() !== value || hasControlCharacter
  ) {
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.invalid_definition",
      `${subject} must be 1-128 trimmed characters without control characters`,
    );
  }
}

export function defineExtensionFactoryInternalV1<TConsumer>(
  factory: ExtensionFactoryInternalV1<TConsumer>,
): ExtensionFactoryInternalV1<TConsumer> {
  if (factory === null || typeof factory !== "object") {
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.invalid_definition",
      "extension factory must be an object",
    );
  }
  assertExtensionIdentifierInternalV1(factory.id, "extension factory id");
  assertExtensionIdentifierInternalV1(
    factory.generation,
    `extension factory ${factory.id} generation`,
  );
  if (typeof factory.setup !== "function") {
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.invalid_definition",
      `extension factory ${factory.id} setup must be a function`,
    );
  }
  return Object.freeze({
    id: factory.id,
    generation: factory.generation,
    setup: factory.setup,
  });
}

export function defineExtensionCandidateSourceInternalV1<TConsumer>(
  source: ExtensionCandidateSourceInternalV1<TConsumer>,
): ExtensionCandidateSourceInternalV1<TConsumer> {
  if (source === null || typeof source !== "object") {
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.invalid_definition",
      "extension candidate source must be an object",
    );
  }
  assertExtensionIdentifierInternalV1(source.id, "extension candidate id");
  assertExtensionIdentifierInternalV1(
    source.generation,
    `extension candidate ${source.id} generation`,
  );
  if (typeof source.load !== "function") {
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.invalid_definition",
      `extension candidate ${source.id} loader must be a function`,
    );
  }
  return Object.freeze({
    id: source.id,
    generation: source.generation,
    load: source.load,
  });
}

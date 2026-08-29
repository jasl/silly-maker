// SPDX-License-Identifier: MIT

export type SillyModErrorCodeV1 =
  | "silly_mod.invalid_definition"
  | "silly_mod.duplicate"
  | "silly_mod.mod_unknown"
  | "silly_mod.load_failed"
  | "silly_mod.engine_api_missing"
  | "silly_mod.engine_api_incompatible"
  | "silly_mod.dependency_missing"
  | "silly_mod.dependency_incompatible"
  | "silly_mod.dependency_cycle"
  | "silly_mod.conflict"
  | "silly_mod.target_unknown"
  | "silly_mod.kind_mismatch"
  | "silly_mod.collision"
  | "silly_mod.compile_failed"
  | "silly_mod.setup_failed"
  | "silly_mod.publication_failed"
  | "silly_mod.selection_generation_invalid"
  | "silly_mod.selection_generation_stale"
  | "silly_mod.transition_busy"
  | "silly_mod.retry_required"
  | "silly_mod.retry_unavailable"
  | "silly_mod.not_ready"
  | "silly_mod.disposed";

export class SillyModErrorV1 extends Error {
  override readonly name = "SillyModErrorV1";

  constructor(
    readonly code: SillyModErrorCodeV1,
    readonly reference: string,
    cause?: unknown,
  ) {
    super(`${code}:${reference}`, cause === undefined ? undefined : { cause });
  }
}

export interface SillyModDependencyV1 {
  readonly modId: string;
  /** V1 accepts `*`, exact `x.y.z`, or a full caret range such as `^1.2.3`. */
  readonly version: string;
}

declare const sillyModMetadataBrandV1: unique symbol;

export interface SillyModMetadataInputV1 {
  readonly contractRevision: 1;
  readonly modId: string;
  readonly version: string;
  /** Public SillyMaker API axes consumed by this Mod and their compatible ranges. */
  readonly engineApi: Readonly<Record<string, string>>;
  readonly dependencies: {
    readonly requires: readonly SillyModDependencyV1[];
    readonly optional: readonly SillyModDependencyV1[];
    readonly conflicts: readonly SillyModDependencyV1[];
  };
  readonly facets: readonly string[];
}

/** Admitted, canonical metadata returned only by defineSillyModMetadataV1. */
export interface SillyModMetadataV1 extends SillyModMetadataInputV1 {
  readonly [sillyModMetadataBrandV1]: true;
}

export interface SillyModContributionV1<TPayload = unknown> {
  readonly contributionId: string;
  readonly pointId: string;
  readonly contributionKind: string;
  readonly payload: TPayload;
}

/** A resource acquired by a trusted code Mod after its candidate compiled. */
export interface SillyModResourceHandleV1 {
  dispose(): void | PromiseLike<void>;
}

export interface SillyCodeModDefinitionV1<TPayload = unknown> {
  readonly contributions: readonly SillyModContributionV1<TPayload>[];
  /**
   * Acquires resources without a service locator or ambient Host context.
   * The returned handle is awaited during rollback, replacement, and close.
   */
  readonly setup?: () =>
    | void
    | SillyModResourceHandleV1
    | PromiseLike<void | SillyModResourceHandleV1>;
}

export interface SillyDataModSourceV1<TPayload = unknown> {
  readonly kind: "data";
  readonly metadata: SillyModMetadataV1;
  readonly contributions: readonly SillyModContributionV1<TPayload>[];
}

/**
 * A loader explicitly selected by the application build. Module evaluation
 * and `load()` are resource-free; live work belongs in definition.setup.
 */
export interface SillyCodeModSourceV1<TPayload = unknown> {
  readonly kind: "code";
  readonly metadata: SillyModMetadataV1;
  load():
    | SillyCodeModDefinitionV1<TPayload>
    | PromiseLike<SillyCodeModDefinitionV1<TPayload>>;
}

export type SillyModSourceV1<TPayload = unknown> =
  | SillyDataModSourceV1<TPayload>
  | SillyCodeModSourceV1<TPayload>;

export type SillyModCollisionPolicyV1 = "allow" | "reject";

export interface ActiveSillyModContributionV1<TPayload = unknown>
  extends SillyModContributionV1<TPayload> {
  readonly modId: string;
  readonly modVersion: string;
}

export interface SillyModCompileInputV1<TPayload = unknown> {
  readonly pointId: string;
  readonly contributions: readonly ActiveSillyModContributionV1<TPayload>[];
}

export interface SillyModExtensionPointV1<TPayload = unknown, TCompiled = unknown> {
  readonly pointId: string;
  readonly contributionKind: string;
  /** `reject` rejects a repeated contributionId across active Mods. */
  readonly collisionPolicy: SillyModCollisionPolicyV1;
  /** Cold and staging-pure. Acquire live resources through code Mod setup. */
  compile(input: SillyModCompileInputV1<TPayload>): TCompiled | PromiseLike<TCompiled>;
}

export interface CompiledSillyModPointV1<TCompiled = unknown> {
  readonly pointId: string;
  readonly value: TCompiled;
}

export interface ActiveSillyModIdentityV1 {
  readonly modId: string;
  readonly version: string;
}

export interface ResolvedSillyModContributionV1 {
  readonly pointId: string;
  readonly contributionId: string;
}

export interface ResolvedSillyModEntryV1 {
  readonly modId: string;
  readonly version: string;
  readonly engineApi: Readonly<Record<string, string>>;
  readonly dependencies: SillyModMetadataV1["dependencies"];
  readonly facets: readonly string[];
  readonly contributions: readonly ResolvedSillyModContributionV1[];
}

/** JSON-safe exact resolution result for diagnostics and later identity projection. */
export interface ResolvedSillyModManifestV1 {
  readonly contractRevision: 1;
  readonly engineApi: Readonly<Record<string, string>>;
  readonly orderedMods: readonly ResolvedSillyModEntryV1[];
}

export type SillyModCleanupPhaseV1 = "rollback" | "dispose";

export interface SillyModLifecycleDiagnosticV1 {
  readonly code: "silly_mod.cleanup_failed";
  readonly modId: string;
  readonly version: string;
  readonly phase: SillyModCleanupPhaseV1;
  readonly error: unknown;
}

export interface CreateSillyModRuntimeInputV1<TPayload = unknown, TCompiled = unknown> {
  readonly applicationGeneration: string;
  /** Exact public API versions made available by this application. */
  readonly engineApi: Readonly<Record<string, string>>;
  readonly catalog: readonly SillyModSourceV1<TPayload>[];
  readonly activeModIds: readonly string[];
  readonly extensionPoints: readonly SillyModExtensionPointV1<TPayload, TCompiled>[];
  readonly onLifecycleDiagnostic?: (diagnostic: SillyModLifecycleDiagnosticV1) => void;
}

export interface SillyModRuntimeV1<TCompiled = unknown> {
  readonly activeIdentity: readonly ActiveSillyModIdentityV1[];
  readonly resolvedManifest: ResolvedSillyModManifestV1;
  readonly compiledPoints: readonly CompiledSillyModPointV1<TCompiled>[];
  dispose(): Promise<void>;
}

export interface SillyModSelectionCandidateV1<TPayload = unknown> {
  /** Monotonic within one application-generation-local controller. */
  readonly selectionGeneration: number;
  readonly catalog: readonly SillyModSourceV1<TPayload>[];
  readonly activeModIds: readonly string[];
}

export interface SillyModSelectionV1<TCompiled = unknown> {
  readonly applicationGeneration: string;
  readonly selectionGeneration: number;
  readonly activeIdentity: readonly ActiveSillyModIdentityV1[];
  readonly resolvedManifest: ResolvedSillyModManifestV1;
  readonly compiledPoints: readonly CompiledSillyModPointV1<TCompiled>[];
}

export type SillyModSelectionStateV1<TCompiled = unknown> =
  | { readonly kind: "idle" }
  | {
    readonly kind: "loading";
    readonly selectionGeneration: number;
    readonly previous: SillyModSelectionV1<TCompiled> | null;
  }
  | { readonly kind: "ready"; readonly current: SillyModSelectionV1<TCompiled> }
  | {
    readonly kind: "error";
    readonly selectionGeneration: number;
    readonly error: SillyModErrorV1;
  }
  | { readonly kind: "disposed" };

export type SillyModSelectionPublisherV1<TCompiled = unknown> = (
  candidate: SillyModSelectionV1<TCompiled>,
  previous: SillyModSelectionV1<TCompiled>,
) => void | PromiseLike<void>;

export interface CreateSillyModSelectionControllerInputV1<
  TPayload = unknown,
  TCompiled = unknown,
> {
  readonly applicationGeneration: string;
  readonly engineApi: Readonly<Record<string, string>>;
  readonly extensionPoints: readonly SillyModExtensionPointV1<TPayload, TCompiled>[];
  readonly onLifecycleDiagnostic?: (diagnostic: SillyModLifecycleDiagnosticV1) => void;
}

export interface SillyModSelectionControllerV1<TPayload = unknown, TCompiled = unknown> {
  activate(
    candidate: SillyModSelectionCandidateV1<TPayload>,
  ): Promise<SillyModSelectionV1<TCompiled>>;
  /** Retries only the last failed initial candidate. */
  retry(): Promise<SillyModSelectionV1<TCompiled>>;
  /** Publishes a complete successor before retiring its predecessor. */
  restart(
    candidate: SillyModSelectionCandidateV1<TPayload>,
    publish: SillyModSelectionPublisherV1<TCompiled>,
  ): Promise<SillyModSelectionV1<TCompiled>>;
  getState(): SillyModSelectionStateV1<TCompiled>;
  getCurrent(): SillyModSelectionV1<TCompiled> | null;
  subscribe(listener: () => void): () => void;
  dispose(): Promise<void>;
}

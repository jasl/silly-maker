// SPDX-License-Identifier: MIT

declare const compositionServiceTypeV1: unique symbol;
declare const compositionRegistryTypeV1: unique symbol;

export type CompositionProfileKindV1 = "authoritative" | "live";

export interface CompositionTokenV1 {
  readonly id: string;
  readonly kind: "exclusive_service" | "registry";
}

/** Erased declaration shape used only while building the composition graph. */
export interface CompositionServiceTokenDeclarationV1 extends CompositionTokenV1 {
  readonly kind: "exclusive_service";
}

export interface CompositionServiceTokenV1<T> extends CompositionServiceTokenDeclarationV1 {
  /** Required invariant phantom; callers cannot structurally forge a typed token. */
  readonly [compositionServiceTypeV1]: (value: T) => T;
}

/** Erased declaration shape used only while building the composition graph. */
export interface CompositionRegistryTokenDeclarationV1 extends CompositionTokenV1 {
  readonly kind: "registry";
}

export interface CompositionRegistryTokenV1<T> extends CompositionRegistryTokenDeclarationV1 {
  /** Required invariant phantom; callers cannot structurally forge a typed token. */
  readonly [compositionRegistryTypeV1]: (value: T) => T;
}

export interface CompositionRegistryEntryDeclarationV1 {
  readonly token: CompositionRegistryTokenDeclarationV1;
  readonly id: string;
  /** Higher priorities compile first. The default is zero. */
  readonly priority?: number;
}

export interface CompositionRegistryEntryInputV1<T> {
  readonly id: string;
  readonly value: T;
  readonly priority?: number;
}

export interface CompositionRegistryEntryV1<T> {
  readonly id: string;
  readonly value: T;
  readonly priority: number;
  readonly pluginId: string;
}

export type CompositionCleanupV1 = () => void | PromiseLike<void>;
/**
 * Installs one reversible in-process resource during profile setup. A live
 * candidate installs effects before consumer publication while predecessor
 * effects remain installed. Live effects must therefore be staging-safe: they
 * may coexist with the predecessor, must not perform authoritative or
 * irreversible writes, and must be completely reversible on rollback.
 * Resources that require exclusive cutover are not supported by this contract.
 */
export type CompositionEffectInstallerV1 = () =>
  | void
  | CompositionCleanupV1
  | PromiseLike<void | CompositionCleanupV1>;

export interface CompositionPluginScopeV1 {
  provide<T>(token: CompositionServiceTokenV1<T>, value: T): void;
  use<T>(token: CompositionServiceTokenV1<T>): T;
  contribute<T>(
    token: CompositionRegistryTokenV1<T>,
    entry: CompositionRegistryEntryInputV1<T>,
  ): void;
  /** Installs an effect under the profile lifecycle contract above. */
  effect(install: CompositionEffectInstallerV1): Promise<void>;
}

export interface CompositionPluginV1 {
  readonly id: string;
  /** Positive safe integer changed whenever this plugin's composition behavior changes. */
  readonly revision: number;
  readonly requires?: readonly CompositionServiceTokenDeclarationV1[];
  readonly provides?: readonly CompositionServiceTokenDeclarationV1[];
  readonly contributes?: readonly CompositionRegistryEntryDeclarationV1[];
  setup(scope: CompositionPluginScopeV1): void | PromiseLike<void>;
}

export interface CompositionProfileV1 {
  readonly id: string;
  readonly kind: CompositionProfileKindV1;
  readonly plugins: readonly CompositionPluginV1[];
}

export interface CompositionDirectResolverV1 {
  use<T>(token: CompositionServiceTokenV1<T>): T;
  contributions<T>(
    token: CompositionRegistryTokenV1<T>,
  ): readonly CompositionRegistryEntryV1<T>[];
}

export interface CompositionBootDiagnosticV1 {
  /** Stable graph identity for boot diagnostics only; it is not a Save field. */
  readonly identity: string;
  readonly profileId: string;
  readonly kind: CompositionProfileKindV1;
  readonly pluginOrder: readonly string[];
}

export interface CompositionSnapshotV1 {
  readonly bootDiagnostic: CompositionBootDiagnosticV1;
  compileDirectPlan<TPlan>(
    compile: (resolver: CompositionDirectResolverV1) => TPlan,
  ): TPlan;
}

export type CompositionErrorCodeV1 =
  | "composition.invalid_definition"
  | "composition.duplicate_plugin"
  | "composition.duplicate_provider"
  | "composition.missing_provider"
  | "composition.dependency_cycle"
  | "composition.scope_closed"
  | "composition.undeclared_service"
  | "composition.service_already_provided"
  | "composition.service_unavailable"
  | "composition.undeclared_registry"
  | "composition.duplicate_registry_entry"
  | "composition.registry_entry_missing"
  | "composition.invalid_effect"
  | "composition.setup_failed"
  | "composition.not_mounted"
  | "composition.already_mounted"
  | "composition.profile_mismatch"
  | "composition.authoritative_sealed"
  | "composition.lifecycle_busy"
  | "composition.disposed"
  | "composition.snapshot_retired"
  | "composition.factory_inactive"
  | "composition.application_active"
  | "composition.async_compile"
  | "composition.resolver_inactive";

export class CompositionErrorV1 extends Error {
  override readonly name = "CompositionErrorV1";

  constructor(
    readonly code: CompositionErrorCodeV1,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
  }
}

export interface CompositionCleanupDiagnosticV1 {
  readonly code: "composition.cleanup_failed";
  readonly profileId: string;
  readonly pluginId: string;
  readonly phase: "rollback" | "reload" | "dispose";
  readonly error: unknown;
}

export interface CompositionKernelOptionsV1 {
  readonly onDiagnostic?: (diagnostic: CompositionCleanupDiagnosticV1) => void;
}

/**
 * Publishes a fully mounted live candidate while the previous snapshot,
 * providers, and effects are still current. Candidate effects are already
 * installed at this point. A rejection must leave (or restore) the previous
 * consumer publication; the kernel then rolls the candidate back. Restoring a
 * publisher's partial external mutation is the trusted caller's obligation;
 * the kernel cannot reverse it mechanically.
 */
export type CompositionCandidatePublisherV1 = (
  candidate: CompositionSnapshotV1,
  previous: CompositionSnapshotV1,
) => void | PromiseLike<void>;

export interface CompositionKernelV1 {
  mount(profile: CompositionProfileV1): Promise<CompositionSnapshotV1>;
  reload(
    profile: CompositionProfileV1,
    publish: CompositionCandidatePublisherV1,
  ): Promise<CompositionSnapshotV1>;
  getSnapshot(): CompositionSnapshotV1 | null;
  getDiagnostics(): readonly CompositionCleanupDiagnosticV1[];
  dispose(): Promise<void>;
}

function assertIdentifierV1(id: string, subject: string): void {
  let hasControlCharacter = false;
  for (let index = 0; index < id.length; index += 1) {
    const code = id.charCodeAt(index);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      hasControlCharacter = true;
      break;
    }
  }
  if (
    id.length === 0 || id.trim() !== id ||
    hasControlCharacter
  ) {
    throw new CompositionErrorV1(
      "composition.invalid_definition",
      `${subject} id must be non-empty trimmed text without control characters`,
    );
  }
}

function assertPriorityV1(priority: number, subject: string): void {
  if (!Number.isSafeInteger(priority)) {
    throw new CompositionErrorV1(
      "composition.invalid_definition",
      `${subject} priority must be a safe integer`,
    );
  }
}

export function createCompositionServiceTokenV1<T>(
  id: string,
): CompositionServiceTokenV1<T> {
  assertIdentifierV1(id, "service token");
  return {
    id,
    kind: "exclusive_service",
  } as CompositionServiceTokenV1<T>;
}

export function createCompositionRegistryTokenV1<T>(
  id: string,
): CompositionRegistryTokenV1<T> {
  assertIdentifierV1(id, "registry token");
  return { id, kind: "registry" } as CompositionRegistryTokenV1<
    T
  >;
}

function normalizeTokenArrayV1<TToken extends CompositionTokenV1>(
  tokens: readonly TToken[] | undefined,
  kind: TToken["kind"],
  subject: string,
): readonly TToken[] {
  const normalized = [...(tokens ?? [])];
  const ids = new Set<string>();
  for (const token of normalized) {
    if (token === null || typeof token !== "object" || token.kind !== kind) {
      throw new CompositionErrorV1(
        "composition.invalid_definition",
        `${subject} contains an invalid ${kind} token`,
      );
    }
    assertIdentifierV1(token.id, `${subject} token`);
    if (ids.has(token.id)) {
      throw new CompositionErrorV1(
        "composition.invalid_definition",
        `${subject} repeats token ${token.id}`,
      );
    }
    ids.add(token.id);
  }
  return normalized;
}

function normalizeRegistryDeclarationsV1(
  declarations:
    | readonly CompositionRegistryEntryDeclarationV1[]
    | undefined,
  subject: string,
): readonly CompositionRegistryEntryDeclarationV1[] {
  const normalized = [...(declarations ?? [])].map((declaration) => {
    if (
      declaration === null || typeof declaration !== "object" ||
      declaration.token?.kind !== "registry"
    ) {
      throw new CompositionErrorV1(
        "composition.invalid_definition",
        `${subject} contains an invalid registry entry declaration`,
      );
    }
    assertIdentifierV1(declaration.token.id, `${subject} token`);
    assertIdentifierV1(declaration.id, `${subject} entry`);
    const priority = declaration.priority ?? 0;
    assertPriorityV1(priority, `${subject}.${declaration.id}`);
    return {
      token: declaration.token,
      id: declaration.id,
      priority,
    };
  });
  const keys = new Set<string>();
  for (const declaration of normalized) {
    const key = `${declaration.token.id}\0${declaration.id}`;
    if (keys.has(key)) {
      throw new CompositionErrorV1(
        "composition.invalid_definition",
        `${subject} repeats registry entry ${declaration.token.id}:${declaration.id}`,
      );
    }
    keys.add(key);
  }
  return normalized;
}

export function defineCompositionPluginV1(
  plugin: CompositionPluginV1,
): CompositionPluginV1 {
  if (
    plugin === null || typeof plugin !== "object" ||
    typeof plugin.setup !== "function"
  ) {
    throw new CompositionErrorV1(
      "composition.invalid_definition",
      "composition plugin must be an object with setup()",
    );
  }
  assertIdentifierV1(plugin.id, "plugin");
  if (!Number.isSafeInteger(plugin.revision) || plugin.revision < 1) {
    throw new CompositionErrorV1(
      "composition.invalid_definition",
      `plugin ${plugin.id} revision must be a positive safe integer`,
    );
  }
  return {
    id: plugin.id,
    revision: plugin.revision,
    requires: normalizeTokenArrayV1(
      plugin.requires,
      "exclusive_service",
      `${plugin.id}.requires`,
    ),
    provides: normalizeTokenArrayV1(
      plugin.provides,
      "exclusive_service",
      `${plugin.id}.provides`,
    ),
    contributes: normalizeRegistryDeclarationsV1(
      plugin.contributes,
      `${plugin.id}.contributes`,
    ),
    setup: plugin.setup,
  };
}

export function defineCompositionProfileV1(
  profile: CompositionProfileV1,
): CompositionProfileV1 {
  if (profile === null || typeof profile !== "object") {
    throw new CompositionErrorV1(
      "composition.invalid_definition",
      "composition profile must be an object",
    );
  }
  assertIdentifierV1(profile.id, "profile");
  if (profile.kind !== "authoritative" && profile.kind !== "live") {
    throw new CompositionErrorV1(
      "composition.invalid_definition",
      `profile ${profile.id} has invalid kind`,
    );
  }
  if (!Array.isArray(profile.plugins)) {
    throw new CompositionErrorV1(
      "composition.invalid_definition",
      `profile ${profile.id} plugins must be an array`,
    );
  }
  return {
    id: profile.id,
    kind: profile.kind,
    plugins: profile.plugins.map(defineCompositionPluginV1),
  };
}

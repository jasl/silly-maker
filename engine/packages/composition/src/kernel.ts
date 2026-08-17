// SPDX-License-Identifier: MIT
import { Context } from "@sillymaker/vendor-cordis";

import { CompositionErrorV1, defineCompositionProfileV1 } from "./contracts.ts";
import type {
  CompositionBootDiagnosticV1,
  CompositionCleanupDiagnosticV1,
  CompositionCleanupV1,
  CompositionDirectResolverV1,
  CompositionKernelOptionsV1,
  CompositionKernelV1,
  CompositionPluginScopeV1,
  CompositionPluginV1,
  CompositionProfileV1,
  CompositionRegistryEntryInputV1,
  CompositionRegistryEntryV1,
  CompositionRegistryTokenDeclarationV1,
  CompositionRegistryTokenV1,
  CompositionServiceTokenDeclarationV1,
  CompositionServiceTokenV1,
  CompositionSnapshotV1,
  CompositionTokenV1,
} from "./contracts.ts";
import { compositionLifecycleActivityV1 } from "./internal.ts";
import type { CompositionLifecycleActivityV1 } from "./internal.ts";

interface CompositionPlanV1 {
  readonly profile: CompositionProfileV1;
  readonly plugins: readonly CompositionPluginV1[];
  readonly providers: ReadonlyMap<CompositionServiceTokenDeclarationV1, string>;
}

interface EffectRecordV1 {
  readonly pluginId: string;
  cleanup: CompositionCleanupV1 | null;
}

interface StagingProfileV1 {
  readonly services: Map<CompositionServiceTokenDeclarationV1, unknown>;
  readonly registries: Map<
    CompositionRegistryTokenDeclarationV1,
    CompositionRegistryEntryV1<unknown>[]
  >;
  readonly effects: EffectRecordV1[];
}

interface MountedProfileV1 {
  readonly profile: CompositionProfileV1;
  readonly snapshot: CompositionSnapshotV1;
  retire(): void;
  dispose(phase: CompositionCleanupDiagnosticV1["phase"]): Promise<void>;
}

interface SnapshotRecordV1 {
  readonly snapshot: CompositionSnapshotV1;
  retire(): void;
}

interface DiagnosticSinkV1 {
  emit(diagnostic: CompositionCleanupDiagnosticV1): void;
}

const emptyContributionsV1: readonly CompositionRegistryEntryV1<never>[] = Object.freeze([]);
const lexicalCompareV1 = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function isPromiseLikeV1(value: unknown): value is PromiseLike<unknown> {
  return (typeof value === "object" && value !== null) ||
      typeof value === "function"
    ? typeof (value as { readonly then?: unknown }).then === "function"
    : false;
}

function validateTokenIdentitiesV1(plugins: readonly CompositionPluginV1[]): void {
  const tokens = new Map<string, CompositionTokenV1>();
  for (const plugin of plugins) {
    for (
      const token of [
        ...(plugin.requires ?? []),
        ...(plugin.provides ?? []),
        ...(plugin.contributes ?? []).map(({ token: registryToken }) => registryToken),
      ]
    ) {
      const existing = tokens.get(token.id);
      if (existing !== undefined && existing !== token) {
        throw new CompositionErrorV1(
          "composition.invalid_definition",
          `token id ${token.id} refers to more than one token object`,
        );
      }
      tokens.set(token.id, token);
    }
  }
}

function stableTopologicalOrderV1(
  plugins: readonly CompositionPluginV1[],
  providers: ReadonlyMap<CompositionServiceTokenDeclarationV1, string>,
): readonly CompositionPluginV1[] {
  const pluginsById = new Map(plugins.map((plugin) => [plugin.id, plugin]));
  const outgoing = new Map(
    plugins.map((plugin) => [plugin.id, new Set<string>()]),
  );
  const indegree = new Map(plugins.map((plugin) => [plugin.id, 0]));
  for (const consumer of plugins) {
    for (const token of consumer.requires ?? []) {
      const provider = providers.get(token)!;
      const targets = outgoing.get(provider)!;
      if (targets.has(consumer.id)) continue;
      targets.add(consumer.id);
      indegree.set(consumer.id, indegree.get(consumer.id)! + 1);
    }
  }

  const ready = [...indegree].filter(([, count]) => count === 0).map(([id]) => id).sort(
    lexicalCompareV1,
  );
  const ordered: CompositionPluginV1[] = [];
  while (ready.length > 0) {
    const id = ready.shift()!;
    ordered.push(pluginsById.get(id)!);
    for (const dependent of [...outgoing.get(id)!].sort(lexicalCompareV1)) {
      const next = indegree.get(dependent)! - 1;
      indegree.set(dependent, next);
      if (next === 0) {
        ready.push(dependent);
        ready.sort(lexicalCompareV1);
      }
    }
  }
  if (ordered.length !== plugins.length) {
    const cycle = [...indegree].filter(([, count]) => count > 0).map(([id]) => id).sort(
      lexicalCompareV1,
    );
    throw new CompositionErrorV1(
      "composition.dependency_cycle",
      `composition dependency cycle includes: ${cycle.join(", ")}`,
    );
  }
  return Object.freeze(ordered);
}

function preflightProfileV1(input: CompositionProfileV1): CompositionPlanV1 {
  const profile = defineCompositionProfileV1(input);
  const plugins = [...profile.plugins].sort((left, right) => lexicalCompareV1(left.id, right.id));
  for (let index = 1; index < plugins.length; index += 1) {
    if (plugins[index - 1]!.id === plugins[index]!.id) {
      throw new CompositionErrorV1(
        "composition.duplicate_plugin",
        `composition profile ${profile.id} repeats plugin ${plugins[index]!.id}`,
      );
    }
  }
  validateTokenIdentitiesV1(plugins);

  const providers = new Map<CompositionServiceTokenDeclarationV1, string>();
  const registryEntries = new Map<
    CompositionRegistryTokenDeclarationV1,
    Map<string, string>
  >();
  for (const plugin of plugins) {
    for (const token of plugin.provides ?? []) {
      const existing = providers.get(token);
      if (existing !== undefined) {
        throw new CompositionErrorV1(
          "composition.duplicate_provider",
          `service ${token.id} has duplicate providers ${existing} and ${plugin.id}`,
        );
      }
      providers.set(token, plugin.id);
    }
    for (const declaration of plugin.contributes ?? []) {
      const tokenEntries = registryEntries.get(declaration.token) ?? new Map<string, string>();
      const existing = tokenEntries.get(declaration.id);
      if (existing !== undefined) {
        throw new CompositionErrorV1(
          "composition.duplicate_registry_entry",
          `registry ${declaration.token.id} entry ${declaration.id} is declared by ${existing} and ${plugin.id}`,
        );
      }
      tokenEntries.set(declaration.id, plugin.id);
      registryEntries.set(declaration.token, tokenEntries);
    }
  }

  const missing = plugins.flatMap((plugin) =>
    (plugin.requires ?? []).filter((token) => !providers.has(token)).map((
      token,
    ) => ({
      pluginId: plugin.id,
      tokenId: token.id,
    }))
  ).sort((left, right) =>
    lexicalCompareV1(left.pluginId, right.pluginId) ||
    lexicalCompareV1(left.tokenId, right.tokenId)
  );
  if (missing.length > 0) {
    throw new CompositionErrorV1(
      "composition.missing_provider",
      `plugin ${missing[0]!.pluginId} requires missing service ${missing[0]!.tokenId}`,
    );
  }

  return Object.freeze({
    profile,
    plugins: stableTopologicalOrderV1(plugins, providers),
    providers,
  });
}

class PluginScopeV1 implements CompositionPluginScopeV1 {
  readonly [compositionLifecycleActivityV1]: CompositionLifecycleActivityV1;
  readonly #required: ReadonlySet<CompositionServiceTokenDeclarationV1>;
  readonly #provided: ReadonlySet<CompositionServiceTokenDeclarationV1>;
  readonly #contributed: ReadonlyMap<
    CompositionRegistryTokenDeclarationV1,
    ReadonlyMap<string, number>
  >;
  readonly #pendingEffects: Promise<void>[] = [];
  readonly #providedDuringSetup = new Set<CompositionServiceTokenDeclarationV1>();
  readonly #contributedDuringSetup = new Map<
    CompositionRegistryTokenDeclarationV1,
    Set<string>
  >();
  #open = true;

  constructor(
    readonly pluginId: string,
    private readonly stage: StagingProfileV1,
    plugin: CompositionPluginV1,
    lifecycleActivity: CompositionLifecycleActivityV1,
  ) {
    this[compositionLifecycleActivityV1] = lifecycleActivity;
    this.#required = new Set(plugin.requires ?? []);
    this.#provided = new Set(plugin.provides ?? []);
    const contributed = new Map<
      CompositionRegistryTokenDeclarationV1,
      Map<string, number>
    >();
    for (const declaration of plugin.contributes ?? []) {
      const entries = contributed.get(declaration.token) ?? new Map<string, number>();
      entries.set(declaration.id, declaration.priority ?? 0);
      contributed.set(declaration.token, entries);
    }
    this.#contributed = contributed;
  }

  #assertOpen(): void {
    if (!this.#open) {
      throw new CompositionErrorV1(
        "composition.scope_closed",
        `plugin scope ${this.pluginId} is closed`,
      );
    }
  }

  provide<T>(token: CompositionServiceTokenV1<T>, value: T): void {
    this.#assertOpen();
    if (token.kind !== "exclusive_service" || !this.#provided.has(token)) {
      throw new CompositionErrorV1(
        "composition.undeclared_service",
        `plugin ${this.pluginId} did not declare service ${token.id} as provided`,
      );
    }
    if (
      this.#providedDuringSetup.has(token) ||
      this.stage.services.has(token)
    ) {
      throw new CompositionErrorV1(
        "composition.service_already_provided",
        `service ${token.id} was already provided`,
      );
    }
    this.#providedDuringSetup.add(token);
    this.stage.services.set(token, value);
  }

  use<T>(token: CompositionServiceTokenV1<T>): T {
    this.#assertOpen();
    if (token.kind !== "exclusive_service" || !this.#required.has(token)) {
      throw new CompositionErrorV1(
        "composition.undeclared_service",
        `plugin ${this.pluginId} did not declare service ${token.id} as required`,
      );
    }
    if (!this.stage.services.has(token)) {
      throw new CompositionErrorV1(
        "composition.service_unavailable",
        `required service ${token.id} is unavailable during ${this.pluginId} setup`,
      );
    }
    return this.stage.services.get(token) as T;
  }

  contribute<T>(
    token: CompositionRegistryTokenV1<T>,
    entry: CompositionRegistryEntryInputV1<T>,
  ): void {
    this.#assertOpen();
    const entryId = entry !== null && typeof entry === "object" &&
        typeof (entry as { readonly id?: unknown }).id === "string"
      ? entry.id
      : "";
    let hasControlCharacter = false;
    for (let index = 0; index < entryId.length; index += 1) {
      const code = entryId.charCodeAt(index);
      if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
        hasControlCharacter = true;
        break;
      }
    }
    if (
      entry === null || typeof entry !== "object" || entryId.length === 0 ||
      entryId.length > 128 || entryId.trim() !== entryId ||
      hasControlCharacter
    ) {
      throw new CompositionErrorV1(
        "composition.invalid_definition",
        `plugin ${this.pluginId} registry entry id is invalid`,
      );
    }
    const priority = entry.priority ?? 0;
    if (!Number.isSafeInteger(priority)) {
      throw new CompositionErrorV1(
        "composition.invalid_definition",
        `plugin ${this.pluginId} registry entry priority must be a safe integer`,
      );
    }
    const declaredEntries = this.#contributed.get(token);
    if (token.kind !== "registry" || declaredEntries?.get(entryId) !== priority) {
      throw new CompositionErrorV1(
        "composition.undeclared_registry",
        `plugin ${this.pluginId} did not declare registry entry ${token.id}:${entryId} at priority ${priority}`,
      );
    }
    const contributedEntries = this.#contributedDuringSetup.get(token) ?? new Set<string>();
    if (contributedEntries.has(entryId)) {
      throw new CompositionErrorV1(
        "composition.duplicate_registry_entry",
        `plugin ${this.pluginId} contributed registry entry ${token.id}:${entryId} twice`,
      );
    }
    contributedEntries.add(entryId);
    this.#contributedDuringSetup.set(token, contributedEntries);
    const values = this.stage.registries.get(token) ?? [];
    if (!this.stage.registries.has(token)) {
      this.stage.registries.set(token, values);
    }
    values.push(Object.freeze({
      id: entryId,
      value: entry.value,
      priority,
      pluginId: this.pluginId,
    }));
  }

  effect(
    install: () =>
      | void
      | CompositionCleanupV1
      | PromiseLike<void | CompositionCleanupV1>,
  ): Promise<void> {
    this.#assertOpen();
    if (typeof install !== "function") {
      throw new CompositionErrorV1(
        "composition.invalid_effect",
        `plugin ${this.pluginId} effect installer must be a function`,
      );
    }
    const record: EffectRecordV1 = { pluginId: this.pluginId, cleanup: null };
    this.stage.effects.push(record);
    const installed = install();
    const pending = Promise.resolve(installed).then((cleanup) => {
      if (cleanup !== undefined && typeof cleanup !== "function") {
        throw new CompositionErrorV1(
          "composition.invalid_effect",
          `plugin ${this.pluginId} effect returned a non-function cleanup`,
        );
      }
      record.cleanup = cleanup ?? null;
    });
    this.#pendingEffects.push(pending);
    void pending.catch(() => undefined);
    return pending;
  }

  close(): void {
    this.#open = false;
  }

  async settleEffects(): Promise<{ readonly error: unknown } | null> {
    const results = await Promise.allSettled(this.#pendingEffects);
    const failure = results.find((result): result is PromiseRejectedResult =>
      result.status === "rejected"
    );
    return failure === undefined ? null : { error: failure.reason };
  }

  missingProvides(): readonly string[] {
    return [...this.#provided].filter((token) => !this.#providedDuringSetup.has(token)).map((
      token,
    ) => token.id).sort(
      lexicalCompareV1,
    );
  }

  missingContributions(): readonly string[] {
    return [...this.#contributed].flatMap(([token, declarations]) =>
      [...declarations.keys()].filter((entryId) =>
        !this.#contributedDuringSetup.get(token)?.has(entryId)
      ).map((entryId) => `${token.id}\0${entryId}`)
    ).sort(lexicalCompareV1);
  }
}

async function cleanupStageV1(
  profileId: string,
  stage: StagingProfileV1,
  phase: CompositionCleanupDiagnosticV1["phase"],
  diagnostics: DiagnosticSinkV1,
): Promise<void> {
  const effects = stage.effects.splice(0);
  for (const effect of effects.toReversed()) {
    if (effect.cleanup === null) continue;
    try {
      await effect.cleanup();
    } catch (error) {
      diagnostics.emit(Object.freeze({
        code: "composition.cleanup_failed",
        profileId,
        pluginId: effect.pluginId,
        phase,
        error,
      }));
    }
  }
  stage.services.clear();
  stage.registries.clear();
}

async function setupStageV1(
  plan: CompositionPlanV1,
  diagnostics: DiagnosticSinkV1,
  lifecycleActivity: CompositionLifecycleActivityV1,
): Promise<StagingProfileV1> {
  const stage: StagingProfileV1 = {
    services: new Map(),
    registries: new Map(),
    effects: [],
  };
  for (const plugin of plan.plugins) {
    const scope = new PluginScopeV1(
      plugin.id,
      stage,
      plugin,
      lifecycleActivity,
    );
    let setupFailure: { readonly error: unknown } | null = null;
    try {
      const outcome = plugin.setup(scope);
      if (isPromiseLikeV1(outcome)) await outcome;
    } catch (error) {
      setupFailure = { error };
    }
    scope.close();
    const effectFailure = await scope.settleEffects();
    setupFailure ??= effectFailure;
    const missingProvides = scope.missingProvides();
    if (setupFailure === null && missingProvides.length > 0) {
      setupFailure = {
        error: new CompositionErrorV1(
          "composition.service_unavailable",
          `plugin ${plugin.id} did not provide declared service ${missingProvides[0]}`,
        ),
      };
    }
    const missingContributions = scope.missingContributions();
    if (setupFailure === null && missingContributions.length > 0) {
      setupFailure = {
        error: new CompositionErrorV1(
          "composition.registry_entry_missing",
          `plugin ${plugin.id} did not contribute declared registry entry ${
            missingContributions[0]!.replace("\0", ":")
          }`,
        ),
      };
    }
    if (setupFailure !== null) {
      await cleanupStageV1(plan.profile.id, stage, "rollback", diagnostics);
      throw new CompositionErrorV1(
        "composition.setup_failed",
        `plugin ${plugin.id} setup failed`,
        setupFailure.error,
      );
    }
  }
  return stage;
}

function bootDiagnosticV1(
  plan: CompositionPlanV1,
): CompositionBootDiagnosticV1 {
  const pluginOrder = Object.freeze(plan.plugins.map(({ id }) => id));
  const plugins = plan.plugins.map(({ id, revision }) => ({ id, revision }));
  const services = [...plan.providers].map(([token, pluginId]) => ({
    tokenId: token.id,
    pluginId,
  })).sort((left, right) =>
    lexicalCompareV1(left.tokenId, right.tokenId) ||
    lexicalCompareV1(left.pluginId, right.pluginId)
  );
  const registries = plan.plugins.flatMap((plugin) =>
    (plugin.contributes ?? []).map((declaration) => ({
      tokenId: declaration.token.id,
      entryId: declaration.id,
      priority: declaration.priority ?? 0,
      pluginId: plugin.id,
    }))
  ).sort((left, right) =>
    lexicalCompareV1(left.tokenId, right.tokenId) ||
    right.priority - left.priority ||
    lexicalCompareV1(left.entryId, right.entryId) ||
    lexicalCompareV1(left.pluginId, right.pluginId)
  );
  const identity = JSON.stringify({
    schemaVersion: 1,
    profileId: plan.profile.id,
    kind: plan.profile.kind,
    plugins,
    services,
    registries,
  });
  return Object.freeze({
    identity,
    profileId: plan.profile.id,
    kind: plan.profile.kind,
    pluginOrder,
  });
}

function createSnapshotV1(
  plan: CompositionPlanV1,
  stage: StagingProfileV1,
): SnapshotRecordV1 {
  const services = new Map(stage.services);
  const registries = new Map(
    [...stage.registries].map((
      [id, values],
    ) => [
      id,
      Object.freeze(
        [...values].sort((left, right) =>
          right.priority - left.priority ||
          lexicalCompareV1(left.id, right.id) ||
          lexicalCompareV1(left.pluginId, right.pluginId)
        ),
      ),
    ]),
  );
  const bootDiagnostic = bootDiagnosticV1(plan);
  let mounted = true;
  const snapshot: CompositionSnapshotV1 = Object.freeze({
    bootDiagnostic,
    compileDirectPlan<TPlan>(
      compile: (resolver: CompositionDirectResolverV1) => TPlan,
    ): TPlan {
      if (!mounted) {
        throw new CompositionErrorV1(
          "composition.snapshot_retired",
          `composition snapshot ${bootDiagnostic.profileId} is no longer mounted`,
        );
      }
      if (typeof compile !== "function") {
        throw new CompositionErrorV1(
          "composition.invalid_definition",
          "direct plan compiler must be a function",
        );
      }
      let active = true;
      const assertActive = (): void => {
        if (!active) {
          throw new CompositionErrorV1(
            "composition.resolver_inactive",
            "composition resolver is valid only inside its synchronous compile callback",
          );
        }
      };
      const resolver: CompositionDirectResolverV1 = Object.freeze({
        use<T>(token: CompositionServiceTokenV1<T>): T {
          assertActive();
          if (token.kind !== "exclusive_service" || !services.has(token)) {
            throw new CompositionErrorV1(
              "composition.service_unavailable",
              `compiled service ${token.id} is unavailable`,
            );
          }
          return services.get(token) as T;
        },
        contributions<T>(
          token: CompositionRegistryTokenV1<T>,
        ): readonly CompositionRegistryEntryV1<T>[] {
          assertActive();
          if (token.kind !== "registry") {
            throw new CompositionErrorV1(
              "composition.invalid_definition",
              `compiled token ${token.id} is not a registry`,
            );
          }
          return (registries.get(token) ??
            emptyContributionsV1) as readonly CompositionRegistryEntryV1<T>[];
        },
      });
      try {
        const directPlan = compile(resolver);
        if (isPromiseLikeV1(directPlan)) {
          void Promise.resolve(directPlan).catch(() => undefined);
          throw new CompositionErrorV1(
            "composition.async_compile",
            "direct plan compilation must finish synchronously",
          );
        }
        return directPlan;
      } finally {
        active = false;
      }
    },
  });
  return {
    snapshot,
    retire(): void {
      mounted = false;
    },
  };
}

async function mountProfileV1(
  input: CompositionProfileV1,
  diagnostics: DiagnosticSinkV1,
  lifecycleActivity: CompositionLifecycleActivityV1,
): Promise<MountedProfileV1> {
  const plan = preflightProfileV1(input);
  const context = new Context();
  let stage: StagingProfileV1 | null = null;
  let cleanupPhase: CompositionCleanupDiagnosticV1["phase"] = "dispose";
  const compositePluginV1 = async () => {
    stage = await setupStageV1(plan, diagnostics, lifecycleActivity);
    return async () => {
      if (stage !== null) {
        await cleanupStageV1(plan.profile.id, stage, cleanupPhase, diagnostics);
      }
    };
  };
  const fiber = context.plugin(compositePluginV1);
  try {
    await fiber;
  } catch (error) {
    await fiber.dispose().catch(() => undefined);
    throw error;
  }
  if (stage === null) {
    await fiber.dispose();
    throw new CompositionErrorV1(
      "composition.setup_failed",
      `profile ${plan.profile.id} mounted without a staged composition`,
    );
  }
  const snapshotRecord = createSnapshotV1(plan, stage);
  let disposed = false;
  return {
    profile: plan.profile,
    snapshot: snapshotRecord.snapshot,
    retire: snapshotRecord.retire,
    async dispose(phase): Promise<void> {
      if (disposed) return;
      disposed = true;
      snapshotRecord.retire();
      cleanupPhase = phase;
      await fiber.dispose();
    },
  };
}

class CompositionKernelV1Impl implements CompositionKernelV1, DiagnosticSinkV1 {
  readonly #diagnostics: CompositionCleanupDiagnosticV1[] = [];
  #current: MountedProfileV1 | null = null;
  #disposed = false;
  #busy = false;
  #activities = 0;
  readonly #lifecycleActivity: CompositionLifecycleActivityV1 = Object.freeze({
    claim: (): () => void => this.#claimActivity(),
  });

  constructor(private readonly options: CompositionKernelOptionsV1) {}

  emit(diagnostic: CompositionCleanupDiagnosticV1): void {
    this.#diagnostics.push(diagnostic);
    try {
      this.options.onDiagnostic?.(diagnostic);
    } catch {
      // Diagnostics are observational; cleanup of sibling effects must continue.
    }
  }

  #run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.#busy || this.#activities > 0) {
      return Promise.reject(
        new CompositionErrorV1(
          "composition.lifecycle_busy",
          "composition lifecycle mutation is already in progress",
        ),
      );
    }
    this.#busy = true;
    let result: Promise<T>;
    try {
      result = operation();
    } catch (error) {
      this.#busy = false;
      return Promise.reject(error);
    }
    return result.finally(() => {
      this.#busy = false;
    });
  }

  #claimActivity(): () => void {
    if (this.#busy) {
      throw new CompositionErrorV1(
        "composition.lifecycle_busy",
        "composition lifecycle mutation is already in progress",
      );
    }
    this.#assertActive();
    this.#activities += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.#activities -= 1;
    };
  }

  #assertActive(): void {
    if (this.#disposed) {
      throw new CompositionErrorV1(
        "composition.disposed",
        "composition kernel is disposed",
      );
    }
  }

  mount(profile: CompositionProfileV1): Promise<CompositionSnapshotV1> {
    return this.#run(async () => {
      this.#assertActive();
      if (this.#current !== null) {
        throw new CompositionErrorV1(
          "composition.already_mounted",
          `composition profile ${this.#current.profile.id} is already mounted`,
        );
      }
      const mounted = await mountProfileV1(
        profile,
        this,
        this.#lifecycleActivity,
      );
      this.#current = mounted;
      return mounted.snapshot;
    });
  }

  reload(profile: CompositionProfileV1): Promise<CompositionSnapshotV1> {
    return this.#run(async () => {
      this.#assertActive();
      const current = this.#current;
      if (current === null) {
        throw new CompositionErrorV1(
          "composition.not_mounted",
          "composition kernel has no mounted profile",
        );
      }
      if (
        profile.id !== current.profile.id ||
        profile.kind !== current.profile.kind
      ) {
        throw new CompositionErrorV1(
          "composition.profile_mismatch",
          `reload profile must remain ${current.profile.kind}:${current.profile.id}`,
        );
      }
      if (current.profile.kind === "authoritative") {
        throw new CompositionErrorV1(
          "composition.authoritative_sealed",
          `authoritative profile ${current.profile.id} was permanently sealed by mount`,
        );
      }
      const candidate = await mountProfileV1(
        profile,
        this,
        this.#lifecycleActivity,
      );
      this.#current = candidate;
      await current.dispose("reload");
      return candidate.snapshot;
    });
  }

  getSnapshot(): CompositionSnapshotV1 | null {
    return this.#current?.snapshot ?? null;
  }

  getDiagnostics(): readonly CompositionCleanupDiagnosticV1[] {
    return Object.freeze([...this.#diagnostics]);
  }

  dispose(): Promise<void> {
    return this.#run(async () => {
      if (this.#disposed) return;
      this.#disposed = true;
      const current = this.#current;
      this.#current = null;
      if (current !== null) await current.dispose("dispose");
    });
  }
}

export function createCompositionKernelV1(
  options: CompositionKernelOptionsV1 = {},
): CompositionKernelV1 {
  return new CompositionKernelV1Impl(options);
}

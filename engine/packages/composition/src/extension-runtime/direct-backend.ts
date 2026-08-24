// SPDX-License-Identifier: MIT
import { createExtensionLifecycleCallbackGuardInternalV1 } from "./callback-guard.ts";
import { defineExtensionFactoryInternalV1, ExtensionRuntimeErrorInternalV1 } from "./contracts.ts";
import type {
  ExtensionBackendMountOptionsInternalV1,
  ExtensionCleanupDiagnosticInternalV1,
  ExtensionCleanupInternalV1,
  ExtensionCleanupPhaseInternalV1,
  ExtensionEffectInstallerInternalV1,
  ExtensionFactoryInternalV1,
  ExtensionLifecycleBackendInternalV1,
  ExtensionLifecycleCallbackGuardInternalV1,
  ExtensionMountedHandleInternalV1,
  ExtensionSetupScopeInternalV1,
} from "./contracts.ts";

interface EffectRecordInternalV1 {
  cleanup: ExtensionCleanupInternalV1 | null;
}

function emitDiagnosticInternalV1(
  diagnostic: ExtensionCleanupDiagnosticInternalV1,
  onDiagnostic: ExtensionBackendMountOptionsInternalV1["onDiagnostic"],
): void {
  try {
    onDiagnostic?.(diagnostic);
  } catch {
    // Diagnostics are observational; one observer cannot interrupt cleanup.
  }
}

class DirectSetupScopeInternalV1 implements ExtensionSetupScopeInternalV1 {
  readonly #effects: EffectRecordInternalV1[] = [];
  readonly #pendingEffects: Promise<void>[] = [];
  readonly #children: ExtensionMountedHandleInternalV1<unknown>[] = [];
  readonly #pendingChildren: Promise<ExtensionMountedHandleInternalV1<unknown>>[] = [];
  readonly #childIds = new Set<string>();
  #open = true;

  constructor(
    readonly ownerId: string,
    readonly generation: string,
    private readonly callbackGuard: ExtensionLifecycleCallbackGuardInternalV1,
    private readonly onDiagnostic: ExtensionBackendMountOptionsInternalV1["onDiagnostic"],
  ) {}

  #assertOpen(): void {
    if (!this.#open) {
      throw new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.scope_closed",
        `extension scope ${this.ownerId}@${this.generation} is closed`,
      );
    }
  }

  effect(install: ExtensionEffectInstallerInternalV1): Promise<void> {
    this.#assertOpen();
    if (typeof install !== "function") {
      throw new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.invalid_effect",
        `extension ${this.ownerId} effect installer must be a function`,
      );
    }
    const record: EffectRecordInternalV1 = { cleanup: null };
    this.#effects.push(record);
    const installed = this.callbackGuard.run(this.ownerId, "setup", install);
    const pending = Promise.resolve(installed).then((cleanup) => {
      if (cleanup !== undefined && typeof cleanup !== "function") {
        throw new ExtensionRuntimeErrorInternalV1(
          "extension_runtime.invalid_effect",
          `extension ${this.ownerId} effect returned a non-function cleanup`,
        );
      }
      record.cleanup = cleanup ?? null;
    });
    this.#pendingEffects.push(pending);
    void pending.catch(() => undefined);
    return pending;
  }

  mountChild<TConsumer>(
    input: ExtensionFactoryInternalV1<TConsumer>,
  ): Promise<ExtensionMountedHandleInternalV1<TConsumer>> {
    this.#assertOpen();
    const factory = defineExtensionFactoryInternalV1(input);
    if (factory.id === this.ownerId || this.#childIds.has(factory.id)) {
      throw new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.invalid_definition",
        `extension ${this.ownerId} child id ${factory.id} must be distinct within its owner`,
      );
    }
    this.#childIds.add(factory.id);
    const pending = mountDirectInternalV1(factory, {
      callbackGuard: this.callbackGuard,
      ...(this.onDiagnostic === undefined ? {} : { onDiagnostic: this.onDiagnostic }),
    }).then((handle) => {
      this.#children.push(handle as ExtensionMountedHandleInternalV1<unknown>);
      return handle;
    });
    this.#pendingChildren.push(
      pending as Promise<ExtensionMountedHandleInternalV1<unknown>>,
    );
    void pending.catch(() => undefined);
    return pending;
  }

  close(): void {
    this.#open = false;
  }

  async settle(): Promise<{ readonly error: unknown } | null> {
    let effectIndex = 0;
    let childIndex = 0;
    let firstError: unknown;
    let failed = false;
    // An awaited installer may register another effect/child before it
    // settles. Drain newly appended batches before closing the scope.
    while (
      effectIndex < this.#pendingEffects.length ||
      childIndex < this.#pendingChildren.length
    ) {
      const effects = this.#pendingEffects.slice(effectIndex);
      const children = this.#pendingChildren.slice(childIndex);
      effectIndex = this.#pendingEffects.length;
      childIndex = this.#pendingChildren.length;
      const results = await Promise.allSettled([...effects, ...children]);
      const failure = results.find((result): result is PromiseRejectedResult =>
        result.status === "rejected"
      );
      if (!failed && failure !== undefined) {
        failed = true;
        firstError = failure.reason;
      }
    }
    return failed ? { error: firstError } : null;
  }

  async cleanup(phase: ExtensionCleanupPhaseInternalV1): Promise<void> {
    this.close();
    for (const child of this.#children.splice(0).toReversed()) {
      try {
        await child.dispose();
      } catch (error) {
        emitDiagnosticInternalV1(
          {
            code: "extension_runtime.cleanup_failed",
            id: this.ownerId,
            generation: this.generation,
            phase,
            error,
          },
          this.onDiagnostic,
        );
      }
    }
    for (const effect of this.#effects.splice(0).toReversed()) {
      if (effect.cleanup === null) continue;
      try {
        await this.callbackGuard.run(this.ownerId, "cleanup", effect.cleanup);
      } catch (error) {
        emitDiagnosticInternalV1(
          {
            code: "extension_runtime.cleanup_failed",
            id: this.ownerId,
            generation: this.generation,
            phase,
            error,
          },
          this.onDiagnostic,
        );
      }
    }
  }
}

async function mountDirectInternalV1<TConsumer>(
  factory: ExtensionFactoryInternalV1<TConsumer>,
  options: ExtensionBackendMountOptionsInternalV1 = {},
): Promise<ExtensionMountedHandleInternalV1<TConsumer>> {
  const callbackGuard = options.callbackGuard ??
    createExtensionLifecycleCallbackGuardInternalV1();
  const scope = new DirectSetupScopeInternalV1(
    factory.id,
    factory.generation,
    callbackGuard,
    options.onDiagnostic,
  );
  let consumer: TConsumer;
  try {
    consumer = await callbackGuard.run(
      factory.id,
      "setup",
      () => factory.setup(scope),
    );
    const settlement = await scope.settle();
    if (settlement !== null) throw settlement.error;
    scope.close();
  } catch (error) {
    scope.close();
    await scope.settle();
    await scope.cleanup("rollback");
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.setup_failed",
      `extension ${factory.id}@${factory.generation} setup failed`,
      error,
    );
  }

  let disposePromise: Promise<void> | null = null;
  const handle: ExtensionMountedHandleInternalV1<TConsumer> = {
    id: factory.id,
    generation: factory.generation,
    consumer,
    dispose(): Promise<void> {
      // An already-started disposal is always joinable, including while one of
      // its asynchronous cleanup callbacks is active.
      if (disposePromise !== null) return disposePromise;
      if (callbackGuard.isActive(factory.id)) {
        return Promise.reject(
          new ExtensionRuntimeErrorInternalV1(
            "extension_runtime.reentrant_transition",
            `extension ${factory.id} cannot dispose from its own lifecycle callback`,
          ),
        );
      }
      // Reserve the idempotent operation before user cleanup can reenter it.
      disposePromise = Promise.resolve().then(() => scope.cleanup("dispose"));
      return disposePromise;
    },
  };
  return handle;
}

export function mountExtensionFactoryDirectInternalV1<TConsumer>(
  input: ExtensionFactoryInternalV1<TConsumer>,
  options: ExtensionBackendMountOptionsInternalV1 = {},
): Promise<ExtensionMountedHandleInternalV1<TConsumer>> {
  return mountDirectInternalV1(defineExtensionFactoryInternalV1(input), options);
}

export function createDirectExtensionLifecycleBackendInternalV1(): ExtensionLifecycleBackendInternalV1 {
  return {
    mount: mountDirectInternalV1,
  };
}

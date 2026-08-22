// SPDX-License-Identifier: MIT
import { createExtensionLifecycleCallbackGuardInternalV1 } from "./callback-guard.ts";
import {
  assertExtensionIdentifierInternalV1,
  defineExtensionCandidateSourceInternalV1,
  defineExtensionFactoryInternalV1,
  ExtensionRuntimeErrorInternalV1,
} from "./contracts.ts";
import type {
  ExtensionActivationControllerInternalV1,
  ExtensionActivationControllerOptionsInternalV1,
  ExtensionActivationStateInternalV1,
  ExtensionCandidatePublisherInternalV1,
  ExtensionCandidateSourceInternalV1,
  ExtensionCurrentConsumerInternalV1,
  ExtensionFactoryInternalV1,
  ExtensionLifecycleCallbackGuardInternalV1,
  ExtensionMountedHandleInternalV1,
} from "./contracts.ts";

interface InFlightInternalV1<TConsumer> {
  readonly key: string;
  readonly kind: "activate" | "restart";
  readonly epoch: number;
  readonly promise: Promise<TConsumer>;
  phase: "load" | "mount" | "publication";
}

const idleStateInternalV1 = Object.freeze({ kind: "idle" as const });
const disposedStateInternalV1 = Object.freeze({ kind: "disposed" as const });

function sourceKeyInternalV1(source: {
  readonly id: string;
  readonly generation: string;
}): string {
  return `${source.id}\0${source.generation}`;
}

function currentValueInternalV1<TConsumer>(
  handle: ExtensionMountedHandleInternalV1<TConsumer>,
): ExtensionCurrentConsumerInternalV1<TConsumer> {
  return Object.freeze({
    id: handle.id,
    generation: handle.generation,
    consumer: handle.consumer,
  });
}

class ExtensionActivationControllerImplInternalV1<TConsumer>
  implements ExtensionActivationControllerInternalV1<TConsumer> {
  readonly #id: string;
  readonly #backend: ExtensionActivationControllerOptionsInternalV1["backend"];
  readonly #onDiagnostic: ExtensionActivationControllerOptionsInternalV1["onDiagnostic"];
  readonly #callbackGuard: ExtensionLifecycleCallbackGuardInternalV1;
  readonly #listeners = new Set<() => void>();
  #state: ExtensionActivationStateInternalV1<TConsumer> = idleStateInternalV1;
  #current: ExtensionMountedHandleInternalV1<TConsumer> | null = null;
  #failedSource: ExtensionCandidateSourceInternalV1<TConsumer> | null = null;
  #inFlight: InFlightInternalV1<TConsumer> | null = null;
  #epoch = 0;
  #disposed = false;
  #disposePromise: Promise<void> | null = null;

  constructor(options: ExtensionActivationControllerOptionsInternalV1) {
    if (options === null || typeof options !== "object") {
      throw new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.invalid_definition",
        "extension activation controller options must be an object",
      );
    }
    assertExtensionIdentifierInternalV1(options.id, "extension controller id");
    if (
      options.backend === null || typeof options.backend !== "object" ||
      typeof options.backend.mount !== "function"
    ) {
      throw new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.invalid_definition",
        `extension controller ${options.id} backend must implement mount`,
      );
    }
    this.#id = options.id;
    this.#backend = options.backend;
    this.#onDiagnostic = options.onDiagnostic;
    this.#callbackGuard = createExtensionLifecycleCallbackGuardInternalV1();
  }

  #transitionError(): ExtensionRuntimeErrorInternalV1 | null {
    if (this.#callbackGuard.isActive(this.#id)) {
      return new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.reentrant_transition",
        `extension ${this.#id} cannot mutate its lifecycle from its own callback`,
      );
    }
    if (this.#disposed) {
      return new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.disposed",
        `extension controller ${this.#id} is disposed`,
      );
    }
    return null;
  }

  #validateSource(
    input: ExtensionCandidateSourceInternalV1<TConsumer>,
  ): ExtensionCandidateSourceInternalV1<TConsumer> {
    const source = defineExtensionCandidateSourceInternalV1(input);
    if (source.id !== this.#id) {
      throw new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.factory_mismatch",
        `extension controller ${this.#id} cannot activate source ${source.id}`,
      );
    }
    return source;
  }

  #setState(state: ExtensionActivationStateInternalV1<TConsumer>): void {
    this.#state = state;
    for (const listener of [...this.#listeners]) {
      try {
        listener();
      } catch {
        // State observers are observational and cannot change lifecycle results.
      }
    }
  }

  #setLoading(
    source: ExtensionCandidateSourceInternalV1<TConsumer>,
    previous: ExtensionCurrentConsumerInternalV1<TConsumer> | null,
  ): void {
    this.#setState(Object.freeze({
      kind: "loading",
      id: source.id,
      generation: source.generation,
      previous,
    }));
  }

  #setReady(handle: ExtensionMountedHandleInternalV1<TConsumer>): void {
    this.#setState(Object.freeze({
      kind: "ready",
      current: currentValueInternalV1(handle),
    }));
  }

  #setError(source: ExtensionCandidateSourceInternalV1<TConsumer>, error: unknown): void {
    this.#setState(Object.freeze({
      kind: "error",
      id: source.id,
      generation: source.generation,
      error,
    }));
  }

  #isCurrentEpoch(epoch: number): boolean {
    return !this.#disposed && this.#epoch === epoch;
  }

  #staleError(
    source: ExtensionCandidateSourceInternalV1<TConsumer>,
  ): ExtensionRuntimeErrorInternalV1 {
    return new ExtensionRuntimeErrorInternalV1(
      this.#disposed ? "extension_runtime.disposed" : "extension_runtime.stale_generation",
      this.#disposed
        ? `extension controller ${this.#id} was disposed while ${source.generation} loaded`
        : `extension candidate ${source.id}@${source.generation} is stale`,
    );
  }

  async #loadFactory(
    source: ExtensionCandidateSourceInternalV1<TConsumer>,
  ): Promise<ExtensionFactoryInternalV1<TConsumer>> {
    let input: ExtensionFactoryInternalV1<TConsumer>;
    try {
      input = await source.load();
    } catch (error) {
      throw new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.load_failed",
        `extension candidate ${source.id}@${source.generation} loader failed`,
        error,
      );
    }
    let factory: ExtensionFactoryInternalV1<TConsumer>;
    try {
      factory = defineExtensionFactoryInternalV1(input);
    } catch (error) {
      throw new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.factory_mismatch",
        `extension candidate ${source.id}@${source.generation} returned an invalid factory`,
        error,
      );
    }
    if (factory.id !== source.id || factory.generation !== source.generation) {
      throw new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.factory_mismatch",
        `extension candidate ${source.id}@${source.generation} returned ${factory.id}@${factory.generation}`,
      );
    }
    return factory;
  }

  async #loadAndMount(
    source: ExtensionCandidateSourceInternalV1<TConsumer>,
    epoch: number,
  ): Promise<ExtensionMountedHandleInternalV1<TConsumer>> {
    if (!this.#isCurrentEpoch(epoch)) throw this.#staleError(source);
    const factory = await this.#loadFactory(source);
    if (!this.#isCurrentEpoch(epoch)) throw this.#staleError(source);
    if (this.#inFlight?.epoch === epoch) this.#inFlight.phase = "mount";
    const handle = await this.#backend.mount(factory, {
      callbackGuard: this.#callbackGuard,
      ...(this.#onDiagnostic === undefined ? {} : { onDiagnostic: this.#onDiagnostic }),
    });
    if (handle.id !== source.id || handle.generation !== source.generation) {
      await handle.dispose();
      throw new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.factory_mismatch",
        `extension backend mounted ${handle.id}@${handle.generation} for ${source.id}@${source.generation}`,
      );
    }
    if (!this.#isCurrentEpoch(epoch)) {
      await handle.dispose();
      throw this.#staleError(source);
    }
    return handle;
  }

  #finishInFlight(operation: Promise<TConsumer>): void {
    if (this.#inFlight?.promise === operation) this.#inFlight = null;
  }

  #startInitial(source: ExtensionCandidateSourceInternalV1<TConsumer>): Promise<TConsumer> {
    const epoch = ++this.#epoch;
    let resolveOperation!: (value: TConsumer | PromiseLike<TConsumer>) => void;
    let rejectOperation!: (error: unknown) => void;
    const operation = new Promise<TConsumer>((resolve, reject) => {
      resolveOperation = resolve;
      rejectOperation = reject;
    });
    this.#inFlight = {
      key: sourceKeyInternalV1(source),
      kind: "activate",
      epoch,
      phase: "load",
      promise: operation,
    };
    this.#setLoading(source, null);
    const runner = this.#loadAndMount(source, epoch).then((handle) => {
      if (!this.#isCurrentEpoch(epoch)) {
        return handle.dispose().then(() => {
          throw this.#staleError(source);
        });
      }
      this.#current = handle;
      this.#failedSource = null;
      this.#setReady(handle);
      return handle.consumer;
    }).catch((error: unknown) => {
      if (this.#isCurrentEpoch(epoch)) {
        this.#failedSource = source;
        this.#setError(source, error);
      }
      throw error;
    });
    void runner.then(
      (value) => {
        this.#finishInFlight(operation);
        resolveOperation(value);
      },
      (error: unknown) => {
        this.#finishInFlight(operation);
        rejectOperation(error);
      },
    );
    void operation.catch(() => undefined);
    return operation;
  }

  #startRestart(
    source: ExtensionCandidateSourceInternalV1<TConsumer>,
    publish: ExtensionCandidatePublisherInternalV1<TConsumer>,
    previous: ExtensionMountedHandleInternalV1<TConsumer>,
  ): Promise<TConsumer> {
    const epoch = ++this.#epoch;
    const previousValue = currentValueInternalV1(previous);
    let resolveOperation!: (value: TConsumer | PromiseLike<TConsumer>) => void;
    let rejectOperation!: (error: unknown) => void;
    const operation = new Promise<TConsumer>((resolve, reject) => {
      resolveOperation = resolve;
      rejectOperation = reject;
    });
    this.#inFlight = {
      key: sourceKeyInternalV1(source),
      kind: "restart",
      epoch,
      phase: "load",
      promise: operation,
    };
    this.#setLoading(source, previousValue);
    const runner = (async () => {
      let candidate: ExtensionMountedHandleInternalV1<TConsumer>;
      try {
        candidate = await this.#loadAndMount(source, epoch);
      } catch (error) {
        if (this.#isCurrentEpoch(epoch) && this.#current === previous) this.#setReady(previous);
        throw error;
      }
      const candidateValue = currentValueInternalV1(candidate);
      if (this.#inFlight?.epoch === epoch) this.#inFlight.phase = "publication";
      try {
        await publish(candidateValue, previousValue);
      } catch (error) {
        await candidate.dispose();
        if (this.#isCurrentEpoch(epoch) && this.#current === previous) this.#setReady(previous);
        throw new ExtensionRuntimeErrorInternalV1(
          "extension_runtime.publication_failed",
          `extension candidate ${source.id}@${source.generation} publication failed`,
          error,
        );
      }
      if (!this.#isCurrentEpoch(epoch) || this.#current !== previous) {
        await candidate.dispose();
        throw this.#staleError(source);
      }
      this.#current = candidate;
      this.#setReady(candidate);
      await previous.dispose();
      return candidate.consumer;
    })();
    void runner.then(
      (value) => {
        this.#finishInFlight(operation);
        resolveOperation(value);
      },
      (error: unknown) => {
        this.#finishInFlight(operation);
        rejectOperation(error);
      },
    );
    void operation.catch(() => undefined);
    return operation;
  }

  activate(input: ExtensionCandidateSourceInternalV1<TConsumer>): Promise<TConsumer> {
    if (this.#disposed) {
      const transitionError = this.#transitionError();
      return Promise.reject(transitionError);
    }
    let source: ExtensionCandidateSourceInternalV1<TConsumer>;
    try {
      source = this.#validateSource(input);
    } catch (error) {
      return Promise.reject(error);
    }
    const key = sourceKeyInternalV1(source);
    if (
      this.#inFlight !== null && this.#inFlight.kind === "activate" &&
      this.#inFlight.key === key
    ) {
      return this.#inFlight.promise;
    }
    const transitionError = this.#transitionError();
    if (transitionError !== null) return Promise.reject(transitionError);
    if (this.#inFlight !== null) {
      return Promise.reject(
        new ExtensionRuntimeErrorInternalV1(
          "extension_runtime.transition_busy",
          `extension controller ${this.#id} is activating another generation`,
        ),
      );
    }
    if (this.#current !== null) {
      if (sourceKeyInternalV1(this.#current) === key) {
        return Promise.resolve(this.#current.consumer);
      }
      return Promise.reject(
        new ExtensionRuntimeErrorInternalV1(
          "extension_runtime.transition_busy",
          `extension ${this.#id} is ready; use restart for a successor`,
        ),
      );
    }
    if (this.#state.kind === "error" && sourceKeyInternalV1(this.#state) === key) {
      return Promise.reject(
        new ExtensionRuntimeErrorInternalV1(
          "extension_runtime.retry_required",
          `extension candidate ${source.id}@${source.generation} requires explicit retry`,
          this.#state.error,
        ),
      );
    }
    this.#failedSource = null;
    return this.#startInitial(source);
  }

  retry(): Promise<TConsumer> {
    if (this.#disposed) {
      const transitionError = this.#transitionError();
      return Promise.reject(transitionError);
    }
    const source = this.#failedSource;
    if (source !== null) {
      const key = sourceKeyInternalV1(source);
      if (
        this.#inFlight !== null && this.#inFlight.kind === "activate" &&
        this.#inFlight.key === key
      ) {
        return this.#inFlight.promise;
      }
    }
    const transitionError = this.#transitionError();
    if (transitionError !== null) return Promise.reject(transitionError);
    if (source === null) {
      return Promise.reject(
        new ExtensionRuntimeErrorInternalV1(
          "extension_runtime.retry_unavailable",
          `extension controller ${this.#id} has no failed activation to retry`,
        ),
      );
    }
    if (this.#inFlight !== null) {
      return Promise.reject(
        new ExtensionRuntimeErrorInternalV1(
          "extension_runtime.transition_busy",
          `extension controller ${this.#id} is activating another generation`,
        ),
      );
    }
    return this.#startInitial(source);
  }

  restart(
    input: ExtensionCandidateSourceInternalV1<TConsumer>,
    publish: ExtensionCandidatePublisherInternalV1<TConsumer>,
  ): Promise<TConsumer> {
    if (this.#disposed) {
      const transitionError = this.#transitionError();
      return Promise.reject(transitionError);
    }
    let source: ExtensionCandidateSourceInternalV1<TConsumer>;
    try {
      source = this.#validateSource(input);
    } catch (error) {
      return Promise.reject(error);
    }
    if (typeof publish !== "function") {
      return Promise.reject(
        new ExtensionRuntimeErrorInternalV1(
          "extension_runtime.invalid_definition",
          `extension controller ${this.#id} restart requires a publisher`,
        ),
      );
    }
    const key = sourceKeyInternalV1(source);
    if (
      this.#inFlight !== null && this.#inFlight.kind === "restart" &&
      this.#inFlight.key === key
    ) {
      return this.#inFlight.promise;
    }
    const transitionError = this.#transitionError();
    if (transitionError !== null) return Promise.reject(transitionError);
    if (this.#inFlight !== null) {
      return Promise.reject(
        new ExtensionRuntimeErrorInternalV1(
          "extension_runtime.transition_busy",
          `extension controller ${this.#id} is activating another generation`,
        ),
      );
    }
    const previous = this.#current;
    if (previous === null) {
      return Promise.reject(
        new ExtensionRuntimeErrorInternalV1(
          "extension_runtime.not_ready",
          `extension controller ${this.#id} has no predecessor to restart`,
        ),
      );
    }
    if (sourceKeyInternalV1(previous) === key) return Promise.resolve(previous.consumer);
    return this.#startRestart(source, publish, previous);
  }

  getState(): ExtensionActivationStateInternalV1<TConsumer> {
    return this.#state;
  }

  getCurrent(): ExtensionCurrentConsumerInternalV1<TConsumer> | null {
    return this.#current === null ? null : currentValueInternalV1(this.#current);
  }

  subscribe(listener: () => void): () => void {
    if (typeof listener !== "function") {
      throw new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.invalid_definition",
        `extension controller ${this.#id} listener must be a function`,
      );
    }
    if (this.#disposed) return () => undefined;
    this.#listeners.add(listener);
    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      this.#listeners.delete(listener);
    };
  }

  dispose(): Promise<void> {
    // External revocation must be able to fence a resourceful mount that is
    // currently inside async setup. A trusted callback must not await this
    // owner's operation: portable JavaScript has no async-caller identity.
    if (this.#disposePromise !== null) return this.#disposePromise;
    if (this.#callbackGuard.isActive(this.#id) && this.#inFlight === null) {
      return Promise.reject(
        new ExtensionRuntimeErrorInternalV1(
          "extension_runtime.reentrant_transition",
          `extension ${this.#id} cannot dispose from its own lifecycle callback`,
        ),
      );
    }
    if (this.#disposed) {
      return Promise.reject(
        new ExtensionRuntimeErrorInternalV1(
          "extension_runtime.disposed",
          `extension controller ${this.#id} is disposed`,
        ),
      );
    }
    let resolveDisposal!: () => void;
    let rejectDisposal!: (error: unknown) => void;
    const disposal = new Promise<void>((resolve, reject) => {
      resolveDisposal = resolve;
      rejectDisposal = reject;
    });
    this.#disposePromise = disposal;
    this.#disposed = true;
    this.#epoch += 1;
    const current = this.#current;
    const inFlight = this.#inFlight;
    // A candidate loader owns no lifecycle resource. Detach a loader that
    // never settles; the generation fence prevents it from reaching mount.
    const pendingSettlement = inFlight === null || inFlight.phase === "load"
      ? Promise.resolve()
      : inFlight.promise.catch(() => undefined);
    this.#current = null;
    this.#failedSource = null;
    this.#setState(disposedStateInternalV1);
    this.#listeners.clear();
    const runner = Promise.resolve().then(async () => {
      await Promise.all([
        current?.dispose() ?? Promise.resolve(),
        pendingSettlement,
      ]);
    });
    void runner.then(resolveDisposal, rejectDisposal);
    return disposal;
  }
}

export function createExtensionActivationControllerInternalV1<TConsumer>(
  options: ExtensionActivationControllerOptionsInternalV1,
): ExtensionActivationControllerInternalV1<TConsumer> {
  return new ExtensionActivationControllerImplInternalV1<TConsumer>(options);
}

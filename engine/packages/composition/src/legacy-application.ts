// SPDX-License-Identifier: MIT
import {
  CompositionErrorV1,
  defineCompositionPluginV1,
  defineCompositionProfileV1,
} from "./contracts.ts";
import type {
  CompositionPluginScopeV1,
  CompositionPluginV1,
  CompositionProfileV1,
  CompositionServiceTokenDeclarationV1,
  CompositionServiceTokenV1,
  CompositionSnapshotV1,
} from "./contracts.ts";
import { compositionLifecycleActivityV1 } from "./internal.ts";
import type {
  CompositionInternalPluginScopeV1,
  CompositionLifecycleActivityV1,
} from "./internal.ts";

export interface LegacyApplicationLeaseV1<TApplication> {
  readonly application: TApplication;
  dispose(): Promise<void>;
}

export interface LegacyApplicationFactoryV1<TApplication> {
  create(): Promise<LegacyApplicationLeaseV1<TApplication>>;
}

export interface LegacyApplicationPluginOptionsV1<TApplication, TPrepared = void> {
  readonly id: string;
  readonly revision: number;
  readonly factory: CompositionServiceTokenV1<
    LegacyApplicationFactoryV1<TApplication>
  >;
  readonly requires?: readonly CompositionServiceTokenDeclarationV1[];
  /** Captures dependencies while the profile is staging, but creates no application. */
  prepare(
    scope: CompositionPluginScopeV1,
  ): TPrepared | PromiseLike<TPrepared>;
  /** Called only through an activated factory after authoritative mount completes. */
  create(prepared: TPrepared): TApplication | PromiseLike<TApplication>;
  /** Legacy applications are resource owners and must always be reversible. */
  dispose(application: TApplication): void | PromiseLike<void>;
}

type ApplicationStateV1 =
  | "active"
  | "disposing"
  | "disposed"
  | "dispose_failed";

interface ApplicationRecordV1<TApplication> {
  readonly application: TApplication;
  state: ApplicationStateV1;
  disposal: Promise<void> | null;
  failure: unknown;
}

interface LegacyFactoryControlV1 {
  activate(): void;
}

const legacyFactoryControlsV1 = new WeakMap<object, LegacyFactoryControlV1>();

class LegacyApplicationControllerV1<TApplication, TPrepared> implements LegacyFactoryControlV1 {
  readonly #lateCleanupFailures: unknown[] = [];
  #active = false;
  #closing = false;
  #callbackBusy = false;
  #creating = false;
  #creation: Promise<LegacyApplicationLeaseV1<TApplication>> | null = null;
  #record: ApplicationRecordV1<TApplication> | null = null;
  #shutdown: Promise<void> | null = null;

  constructor(
    private readonly prepared: TPrepared,
    private readonly createApplication: (
      prepared: TPrepared,
    ) => TApplication | PromiseLike<TApplication>,
    private readonly disposeApplication: (
      application: TApplication,
    ) => void | PromiseLike<void>,
    private readonly lifecycleActivity: CompositionLifecycleActivityV1,
  ) {}

  activate(): void {
    if (this.#closing) {
      throw new CompositionErrorV1(
        "composition.disposed",
        "legacy application factory is disposed",
      );
    }
    this.#active = true;
  }

  #busyError(): CompositionErrorV1 {
    return new CompositionErrorV1(
      "composition.lifecycle_busy",
      "legacy application lifecycle callback is already in progress",
    );
  }

  #runUserCallback<T>(callback: () => T | PromiseLike<T>): Promise<T> {
    if (this.#callbackBusy) return Promise.reject(this.#busyError());
    this.#callbackBusy = true;
    let outcome: T | PromiseLike<T>;
    try {
      outcome = callback();
    } catch (error) {
      this.#callbackBusy = false;
      return Promise.reject(error);
    }
    return Promise.resolve(outcome).finally(() => {
      this.#callbackBusy = false;
    });
  }

  create(): Promise<LegacyApplicationLeaseV1<TApplication>> {
    if (this.#callbackBusy) return Promise.reject(this.#busyError());
    if (this.#closing) {
      return Promise.reject(
        new CompositionErrorV1(
          "composition.disposed",
          "legacy application factory is disposed",
        ),
      );
    }
    if (!this.#active) {
      return Promise.reject(
        new CompositionErrorV1(
          "composition.factory_inactive",
          "legacy application factory must be compiled after authoritative mount",
        ),
      );
    }
    if (this.#creating || this.#record !== null) {
      return Promise.reject(
        new CompositionErrorV1(
          "composition.application_active",
          "legacy application factory already owns an active or creating application",
        ),
      );
    }

    let releaseActivity: () => void;
    try {
      releaseActivity = this.lifecycleActivity.claim();
    } catch (error) {
      return Promise.reject(error);
    }
    this.#creating = true;
    const creation = (async () => {
      try {
        if (this.#closing) {
          throw new CompositionErrorV1(
            "composition.disposed",
            "legacy application factory is disposed",
          );
        }
        const application = await this.#runUserCallback(() =>
          this.createApplication(this.prepared)
        );
        if (this.#closing) {
          try {
            await this.#runUserCallback(() => this.disposeApplication(application));
          } catch (error) {
            this.#lateCleanupFailures.push(error);
          }
          throw new CompositionErrorV1(
            "composition.disposed",
            "legacy application factory was disposed while creating an application",
          );
        }
        const record: ApplicationRecordV1<TApplication> = {
          application,
          state: "active",
          disposal: null,
          failure: undefined,
        };
        this.#record = record;
        return Object.freeze({
          application,
          dispose: () => this.#disposeLease(record),
        });
      } finally {
        releaseActivity();
      }
    })();
    this.#creation = creation;
    void creation.finally(() => {
      this.#creating = false;
      if (this.#creation === creation) this.#creation = null;
    }).catch(() => undefined);
    return creation;
  }

  #disposeLease(record: ApplicationRecordV1<TApplication>): Promise<void> {
    if (this.#callbackBusy) return Promise.reject(this.#busyError());
    if (record.disposal !== null) return record.disposal;
    if (record.state === "disposed") return Promise.resolve();
    return this.#beginDisposal(record, true);
  }

  #beginDisposal(
    record: ApplicationRecordV1<TApplication>,
    claimActivity: boolean,
  ): Promise<void> {
    if (record.disposal !== null) return record.disposal;
    let releaseActivity = (): void => {};
    if (claimActivity) {
      try {
        releaseActivity = this.lifecycleActivity.claim();
      } catch (error) {
        return Promise.reject(error);
      }
    }
    record.state = "disposing";
    const disposal = (async () => {
      try {
        await this.#runUserCallback(() => this.disposeApplication(record.application));
        record.state = "disposed";
        if (this.#record === record) this.#record = null;
      } catch (error) {
        record.state = "dispose_failed";
        record.failure = error;
        throw error;
      } finally {
        releaseActivity();
      }
    })();
    record.disposal = disposal;
    return disposal;
  }

  disposeAll(): Promise<void> {
    if (this.#shutdown !== null) return this.#shutdown;
    this.#active = false;
    this.#closing = true;
    const shutdown = Promise.resolve().then(async () => {
      const creation = this.#creation;
      if (creation !== null) await creation.catch(() => undefined);

      const failures = this.#lateCleanupFailures.splice(0);
      const record = this.#record;
      if (record !== null) {
        if (record.state === "active") {
          try {
            await this.#beginDisposal(record, false);
          } catch (error) {
            failures.push(error);
          }
        } else if (record.state === "disposing") {
          try {
            await record.disposal;
          } catch (error) {
            failures.push(error);
          }
        } else if (record.state === "dispose_failed") {
          failures.push(record.failure);
        }
      }
      failures.push(...this.#lateCleanupFailures.splice(0));
      if (failures.length > 0) {
        throw new AggregateError(
          failures,
          "one or more legacy application leases failed to dispose",
        );
      }
    });
    this.#shutdown = shutdown;
    return shutdown;
  }
}

/**
 * Stages a cold application factory as one ordinary façade service. It knows
 * nothing about GameSession, React, or any Base contract.
 */
export function defineLegacyApplicationPluginV1<TApplication, TPrepared = void>(
  options: LegacyApplicationPluginOptionsV1<TApplication, TPrepared>,
): CompositionPluginV1 {
  return defineCompositionPluginV1({
    id: options.id,
    revision: options.revision,
    ...(options.requires === undefined ? {} : { requires: options.requires }),
    provides: [options.factory],
    async setup(scope) {
      const prepared = await options.prepare(scope);
      const controller = new LegacyApplicationControllerV1(
        prepared,
        options.create,
        options.dispose,
        (scope as CompositionInternalPluginScopeV1)[
          compositionLifecycleActivityV1
        ],
      );
      const factory: LegacyApplicationFactoryV1<TApplication> = Object.freeze({
        create: () => controller.create(),
      });
      legacyFactoryControlsV1.set(factory, controller);
      await scope.effect(() => () => controller.disposeAll());
      scope.provide(options.factory, factory);
    },
  });
}

export interface LegacyApplicationProfileOptionsV1 {
  readonly id: string;
  readonly application: CompositionPluginV1;
  readonly plugins?: readonly CompositionPluginV1[];
}

/** Legacy application profiles are always authoritative and auto-seal on mount. */
export function defineLegacyApplicationProfileV1(
  options: LegacyApplicationProfileOptionsV1,
): CompositionProfileV1 {
  return defineCompositionProfileV1({
    id: options.id,
    kind: "authoritative",
    plugins: [options.application, ...(options.plugins ?? [])],
  });
}

/**
 * Compiles and activates the cold factory. Compilation must happen after the
 * authoritative profile's mount promise has resolved.
 */
export function compileLegacyApplicationFactoryV1<TApplication>(
  snapshot: CompositionSnapshotV1,
  token: CompositionServiceTokenV1<LegacyApplicationFactoryV1<TApplication>>,
): LegacyApplicationFactoryV1<TApplication> {
  if (snapshot.bootDiagnostic.kind !== "authoritative") {
    throw new CompositionErrorV1(
      "composition.invalid_definition",
      "legacy application factories require an authoritative profile",
    );
  }
  const factory = snapshot.compileDirectPlan((resolver) => resolver.use(token));
  const control = legacyFactoryControlsV1.get(factory);
  if (control === undefined) {
    throw new CompositionErrorV1(
      "composition.invalid_definition",
      `service ${token.id} is not a legacy application factory`,
    );
  }
  control.activate();
  return factory;
}

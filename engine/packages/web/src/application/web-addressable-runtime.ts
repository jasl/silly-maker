// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  TextContentPackDescriptorV1,
  TextContentPackIdV1,
  TextContentPackLeaseV1,
  TextContentPackTimingV1,
} from "@sillymaker/base";

export type WebTextContentPackObservationStatusV1 =
  | "unloaded"
  | "acquiring"
  | "loaded"
  | "failed";

export interface WebTextContentPackObservationV1 {
  readonly packId: TextContentPackIdV1;
  readonly status: WebTextContentPackObservationStatusV1;
  readonly attempt: number;
  readonly failureCount: number;
  readonly timing: TextContentPackTimingV1 | null;
  readonly diagnosticCode: string | null;
}

/** Read-only view over the Web-owned Text session plus explicit failed-load retry. */
export interface WebTextContentObservationV1 {
  /** Stable build-known catalog; reading it never acquires a pack. */
  readonly packs: readonly TextContentPackDescriptorV1[];
  /** O(1) projection of one pack's current Web-owned state. */
  get(packId: TextContentPackIdV1): WebTextContentPackObservationV1;
  /** Reports only the pack whose observable state changed. */
  subscribe(listener: (packId: TextContentPackIdV1) => void): () => void;
  retry(packId: TextContentPackIdV1): Promise<boolean>;
}

interface WebTextContentPackProjectionInputInternalV1 {
  readonly descriptor: TextContentPackDescriptorV1;
  readonly lease: TextContentPackLeaseV1 | undefined;
  readonly acquiring: boolean;
  readonly attempt: number;
  readonly failureCount: number;
  readonly diagnosticCode: string | null;
}

/** Projects existing Web Text ownership without becoming another authority. @internal */
export function projectWebTextContentPackObservationInternalV1(
  input: WebTextContentPackProjectionInputInternalV1,
): WebTextContentPackObservationV1 {
  const status = input.lease !== undefined
    ? "loaded" as const
    : input.acquiring
    ? "acquiring" as const
    : input.diagnosticCode !== null
    ? "failed" as const
    : "unloaded" as const;
  return {
    packId: input.descriptor.packId,
    status,
    attempt: input.attempt,
    failureCount: input.failureCount,
    timing: input.lease?.timing ?? null,
    diagnosticCode: input.diagnosticCode,
  };
}

export interface CreatedWebTextContentObservationInternalV1 {
  readonly observation: WebTextContentObservationV1;
  notify(packId: TextContentPackIdV1): void;
  dispose(): void;
}

/** Small per-pack event port over the Web Text session's existing state. @internal */
export function createWebTextContentObservationInternalV1(input: {
  readonly packs: readonly TextContentPackDescriptorV1[];
  get(packId: TextContentPackIdV1): WebTextContentPackObservationV1;
  retry(packId: TextContentPackIdV1): Promise<boolean>;
}): CreatedWebTextContentObservationInternalV1 {
  const listeners = new Set<(packId: TextContentPackIdV1) => void>();
  let disposed = false;
  return {
    observation: {
      packs: input.packs,
      get: input.get,
      retry: input.retry,
      subscribe(listener) {
        if (disposed) return () => undefined;
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    notify(packId) {
      if (disposed) return;
      for (const listener of listeners) listener(packId);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
    },
  };
}

export interface WebAddressableRuntimeHostV1 {
  /** Same-origin byte transport for a build-known runtime path. */
  loadRuntimeBytes(runtimePath: string): Promise<Uint8Array>;
  reportFailure(code: string, error: unknown): void;
  readonly textContent?: WebTextContentObservationV1;
}

export interface WebAddressableRuntimeInstanceV1<
  TExecutionContext,
  TInvocation,
  TSnapshot,
> {
  readonly executionContext: TExecutionContext;
  prepareInitial?(): void | Promise<void>;
  prepareSemanticInvocation?(invocation: DeepReadonly<TInvocation>): void | Promise<void>;
  prepareReplacement?(snapshot: DeepReadonly<TSnapshot>): void | Promise<void>;
  dispose(): void;
}

/** Build-known, application-owned factory instantiated once for each Web start. */
export interface WebAddressableRuntimeDefinitionV1<
  TExecutionContext,
  TInvocation,
  TSnapshot,
> {
  create(
    host: WebAddressableRuntimeHostV1,
  ): WebAddressableRuntimeInstanceV1<TExecutionContext, TInvocation, TSnapshot>;
}

export interface StartedWebAddressableRuntimeInternalV1<
  TExecutionContext,
  TInvocation,
  TSnapshot,
> {
  readonly executionContext: TExecutionContext;
  readonly prepareSemanticInvocation?: (
    invocation: DeepReadonly<TInvocation>,
  ) => Promise<void>;
  readonly prepareReplacement?: (snapshot: DeepReadonly<TSnapshot>) => Promise<void>;
  dispose(): void;
}

/** Creates and initially prepares one application-lifetime runtime. @internal */
export async function startWebAddressableRuntimeInternalV1<
  TExecutionContext,
  TInvocation,
  TSnapshot,
>(
  definition: WebAddressableRuntimeDefinitionV1<
    TExecutionContext,
    TInvocation,
    TSnapshot
  >,
  host: WebAddressableRuntimeHostV1,
): Promise<StartedWebAddressableRuntimeInternalV1<TExecutionContext, TInvocation, TSnapshot>> {
  const instance = definition.create(host);
  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    instance.dispose();
  };
  try {
    await instance.prepareInitial?.();
  } catch (error) {
    try {
      dispose();
    } catch (disposeError) {
      host.reportFailure("web.addressable_runtime_dispose_failed", disposeError);
    }
    throw error;
  }

  return ({
    executionContext: instance.executionContext,
    ...(instance.prepareSemanticInvocation === undefined ? {} : {
      prepareSemanticInvocation: async (invocation: DeepReadonly<TInvocation>): Promise<void> => {
        await instance.prepareSemanticInvocation!(invocation);
      },
    }),
    ...(instance.prepareReplacement === undefined ? {} : {
      prepareReplacement: async (snapshot: DeepReadonly<TSnapshot>): Promise<void> => {
        await instance.prepareReplacement!(snapshot);
      },
    }),
    dispose,
  });
}

export interface WebApplicationReadinessHooksInternalV1<TInvocation, TSnapshot> {
  readonly prepareSemanticInvocation?: (
    invocation: DeepReadonly<TInvocation>,
  ) => Promise<void>;
  readonly prepareReplacement?: (snapshot: DeepReadonly<TSnapshot>) => Promise<void>;
}

/** Composes the two application-owned readiness sources behind Core's one hook. @internal */
export function composeWebApplicationReadinessHooksInternalV1<TInvocation, TSnapshot>(
  first: WebApplicationReadinessHooksInternalV1<TInvocation, TSnapshot> | null,
  second: WebApplicationReadinessHooksInternalV1<TInvocation, TSnapshot> | null,
): WebApplicationReadinessHooksInternalV1<TInvocation, TSnapshot> | null {
  const firstInvocation = first?.prepareSemanticInvocation;
  const secondInvocation = second?.prepareSemanticInvocation;
  const firstReplacement = first?.prepareReplacement;
  const secondReplacement = second?.prepareReplacement;
  if (
    firstInvocation === undefined &&
    secondInvocation === undefined &&
    firstReplacement === undefined &&
    secondReplacement === undefined
  ) {
    return null;
  }
  return ({
    ...(firstInvocation === undefined && secondInvocation === undefined ? {} : {
      prepareSemanticInvocation: async (
        invocation: DeepReadonly<TInvocation>,
      ): Promise<void> => {
        if (firstInvocation !== undefined && secondInvocation !== undefined) {
          await Promise.all([firstInvocation(invocation), secondInvocation(invocation)]);
          return;
        }
        await (firstInvocation ?? secondInvocation)!(invocation);
      },
    }),
    ...(firstReplacement === undefined && secondReplacement === undefined ? {} : {
      prepareReplacement: async (snapshot: DeepReadonly<TSnapshot>): Promise<void> => {
        if (firstReplacement !== undefined && secondReplacement !== undefined) {
          await Promise.all([firstReplacement(snapshot), secondReplacement(snapshot)]);
          return;
        }
        await (firstReplacement ?? secondReplacement)!(snapshot);
      },
    }),
  });
}

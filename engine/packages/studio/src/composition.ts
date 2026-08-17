// SPDX-License-Identifier: MIT
import {
  createCompositionKernelV1,
  createCompositionServiceTokenV1,
  defineCompositionPluginV1,
  defineCompositionProfileV1,
} from "@sillymaker/composition";
import type {
  CompositionCleanupDiagnosticV1,
  CompositionEffectInstallerV1,
  CompositionKernelOptionsV1,
  CompositionKernelV1,
  CompositionSnapshotV1,
} from "@sillymaker/composition";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type { StudioBindingV1 } from "./core/binding.ts";
import type { SceneSourceIoV1 } from "./core/scene-io.ts";

/**
 * The direct, Context-free inputs consumed by one mounted Studio shell.
 * They are tooling and presentation ports only; no State Runtime or Session
 * authority is admitted into this live profile.
 */
export interface StudioToolingPlanV1 {
  readonly binding: StudioBindingV1;
  readonly sceneIo: SceneSourceIoV1;
  readonly motionIo: MotionSourceIoV1;
}

export interface StudioToolingLiveRootInputV1 extends StudioToolingPlanV1 {
  /** Positive safe integer advanced by the HMR owner for each candidate. */
  readonly revision: number;
  /** Reversible Studio/tooling resources installed only for this live epoch. */
  readonly effects?: readonly CompositionEffectInstallerV1[];
}

export interface StudioToolingLiveCompositionV1 {
  mount(input: StudioToolingLiveRootInputV1): Promise<StudioToolingPlanV1>;
  reload(input: StudioToolingLiveRootInputV1): Promise<StudioToolingPlanV1>;
  getSnapshot(): CompositionSnapshotV1 | null;
  getDiagnostics(): readonly CompositionCleanupDiagnosticV1[];
  dispose(): Promise<void>;
}

export interface CreateStudioToolingLiveCompositionOptionsV1 {
  readonly profileId: string;
  readonly onDiagnostic?: CompositionKernelOptionsV1["onDiagnostic"];
}

const studioToolingRootPluginIdV1 = "sillymaker.studio.tooling-root";
const studioToolingRootTokenV1 = createCompositionServiceTokenV1<StudioToolingPlanV1>(
  "sillymaker.studio.tooling-root",
);

function profileV1(
  profileId: string,
  input: StudioToolingLiveRootInputV1,
) {
  const effects = Object.freeze([...(input.effects ?? [])]);
  const plan = Object.freeze({
    binding: input.binding,
    sceneIo: input.sceneIo,
    motionIo: input.motionIo,
  });
  const plugin = defineCompositionPluginV1({
    id: studioToolingRootPluginIdV1,
    revision: input.revision,
    provides: [studioToolingRootTokenV1],
    async setup(scope) {
      scope.provide(studioToolingRootTokenV1, plan);
      for (const effect of effects) {
        await scope.effect(effect);
      }
    },
  });
  return defineCompositionProfileV1({
    id: profileId,
    kind: "live",
    plugins: [plugin],
  });
}

function compilePlanV1(snapshot: CompositionSnapshotV1): StudioToolingPlanV1 {
  return snapshot.compileDirectPlan((resolve) => resolve.use(studioToolingRootTokenV1));
}

/**
 * Creates the Studio page's independent live composition root. Candidate
 * setup and all reversible effects settle before a plan is returned, so the
 * caller can commit a React render only after mount/reload succeeds.
 */
export function createStudioToolingLiveCompositionV1(
  options: CreateStudioToolingLiveCompositionOptionsV1,
): StudioToolingLiveCompositionV1 {
  const kernel: CompositionKernelV1 = createCompositionKernelV1(
    options.onDiagnostic === undefined ? {} : { onDiagnostic: options.onDiagnostic },
  );
  return Object.freeze({
    async mount(input: StudioToolingLiveRootInputV1): Promise<StudioToolingPlanV1> {
      return compilePlanV1(await kernel.mount(profileV1(options.profileId, input)));
    },
    async reload(input: StudioToolingLiveRootInputV1): Promise<StudioToolingPlanV1> {
      return compilePlanV1(await kernel.reload(profileV1(options.profileId, input)));
    },
    getSnapshot: () => kernel.getSnapshot(),
    getDiagnostics: () => kernel.getDiagnostics(),
    dispose: () => kernel.dispose(),
  });
}

export interface StudioToolingHmrCoordinatorV1<TModule> {
  /** Queues one module accepted by the generated Vite boundary. */
  accept(module: TModule | undefined): void;
  /** Resolves after every transition queued before this call has settled. */
  waitForIdle(): Promise<void>;
  /** Idempotently closes HMR, removes the UI consumer, and then disposes composition. */
  dispose(): Promise<void>;
}

export interface CreateStudioToolingHmrCoordinatorInputV1<TModule> {
  readonly composition: StudioToolingLiveCompositionV1;
  resolveRoot(module: TModule | undefined): StudioToolingLiveRootInputV1;
  /** Synchronous React render commit, called only after a candidate reload succeeds. */
  commit(plan: StudioToolingPlanV1): void;
  disposeRoot(): void;
  reportFailure?(error: unknown): void;
}

/**
 * Serializes dependency-accepted candidates and gives the generated Vite
 * boundary a non-rejecting dispose operation. The boundary itself keeps the
 * literal `import.meta.hot.accept("/module", ...)` call that Vite must analyze.
 * Every asynchronous failure is reported observationally and absorbed.
 */
export function createStudioToolingHmrCoordinatorV1<TModule>(
  input: CreateStudioToolingHmrCoordinatorInputV1<TModule>,
): StudioToolingHmrCoordinatorV1<TModule> {
  let transition: Promise<void> = Promise.resolve();
  let closing = false;

  const reportFailure = (error: unknown): void => {
    try {
      input.reportFailure?.(error);
    } catch {
      // HMR diagnostics are observational and cannot interrupt cleanup.
    }
  };
  const enqueue = (operation: () => Promise<void>): void => {
    transition = transition.then(async () => {
      try {
        await operation();
      } catch (error) {
        reportFailure(error);
      }
    });
    // The operation above absorbs failures; this guard also protects against
    // a future implementation regression in Vite's fire-and-forget callback.
    void transition.catch(reportFailure);
  };

  const accept = (module: TModule | undefined): void => {
    if (closing) return;
    enqueue(async () => {
      if (closing) return;
      const plan = await input.composition.reload(input.resolveRoot(module));
      if (!closing) input.commit(plan);
    });
  };

  const requestDispose = (): void => {
    if (closing) return;
    closing = true;
    enqueue(async () => {
      try {
        input.disposeRoot();
      } catch (error) {
        reportFailure(error);
      }
      try {
        await input.composition.dispose();
      } catch (error) {
        reportFailure(error);
      }
    });
  };
  return Object.freeze({
    accept,
    waitForIdle: () => transition,
    async dispose(): Promise<void> {
      requestDispose();
      await transition;
    },
  });
}

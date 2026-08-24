// SPDX-License-Identifier: MIT
import {
  createCompositionKernelV1,
  createCompositionServiceTokenV1,
  defineCompositionPluginV1,
  defineCompositionProfileV1,
} from "@sillymaker/composition";
import type {
  CompositionCleanupDiagnosticV1,
  CompositionKernelOptionsV1,
  CompositionKernelV1,
  CompositionSnapshotV1,
} from "@sillymaker/composition";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type { AuthoringSceneSourceIoV1 } from "./core/authoring-scene-io.ts";
import type { InspectorBindingV1 } from "./core/binding.ts";

export { createInspectorToolingReactPublicationV1 } from "./react-publication.tsx";
export type {
  CreateInspectorToolingReactPublicationInputV1,
  InspectorToolingReactPublicationV1,
} from "./react-publication.tsx";

/**
 * The direct, Context-free inputs consumed by one mounted Inspector shell.
 * They are tooling and presentation ports only; no State Runtime or Session
 * authority is admitted into this live profile.
 */
export interface InspectorToolingPlanV1 {
  readonly binding: InspectorBindingV1;
  readonly sceneIo: AuthoringSceneSourceIoV1;
  readonly motionIo: MotionSourceIoV1;
}

export interface InspectorToolingLiveRootInputV1 extends InspectorToolingPlanV1 {
  /** Positive safe integer advanced by the HMR owner for each candidate. */
  readonly revision: number;
}

export interface InspectorToolingLiveCompositionV1 {
  mount(input: InspectorToolingLiveRootInputV1): Promise<InspectorToolingPlanV1>;
  reload(
    input: InspectorToolingLiveRootInputV1,
    publish: InspectorToolingPlanPublisherV1,
  ): Promise<InspectorToolingPlanV1>;
  getSnapshot(): CompositionSnapshotV1 | null;
  getDiagnostics(): readonly CompositionCleanupDiagnosticV1[];
  dispose(): Promise<void>;
}

/**
 * Publishes a candidate plan and resolves only after its consumer commit is
 * observable. React callers must acknowledge an actual layout commit; the
 * synchronous return from `root.render()` is not an acknowledgement.
 */
export type InspectorToolingPlanPublisherV1 = (
  plan: InspectorToolingPlanV1,
) => PromiseLike<void>;

export interface CreateInspectorToolingLiveCompositionOptionsV1 {
  readonly profileId: string;
  readonly onDiagnostic?: CompositionKernelOptionsV1["onDiagnostic"];
}

const inspectorToolingRootPluginIdV1 = "sillymaker.inspector.tooling-root";
const inspectorToolingRootTokenV1 = createCompositionServiceTokenV1<InspectorToolingPlanV1>(
  "sillymaker.inspector.tooling-root",
);

function profileV1(
  profileId: string,
  input: InspectorToolingLiveRootInputV1,
) {
  const plan = {
    binding: input.binding,
    sceneIo: input.sceneIo,
    motionIo: input.motionIo,
  };
  const plugin = defineCompositionPluginV1({
    id: inspectorToolingRootPluginIdV1,
    revision: input.revision,
    provides: [inspectorToolingRootTokenV1],
    setup(scope) {
      scope.provide(inspectorToolingRootTokenV1, plan);
    },
  });
  return defineCompositionProfileV1({
    id: profileId,
    kind: "live",
    plugins: [plugin],
  });
}

function compilePlanV1(snapshot: CompositionSnapshotV1): InspectorToolingPlanV1 {
  return snapshot.compileDirectPlan((resolve) => resolve.use(inspectorToolingRootTokenV1));
}

/**
 * Creates the Inspector page's independent live composition root. Candidate
 * setup settles before publication. Reload keeps the previous snapshot live
 * until the consumer acknowledges the candidate plan, then retires the
 * previous providers and returns the published plan. Arbitrary lifecycle
 * effects are intentionally not accepted by this Inspector root.
 */
export function createInspectorToolingLiveCompositionV1(
  options: CreateInspectorToolingLiveCompositionOptionsV1,
): InspectorToolingLiveCompositionV1 {
  const kernel: CompositionKernelV1 = createCompositionKernelV1(
    options.onDiagnostic === undefined ? {} : { onDiagnostic: options.onDiagnostic },
  );
  return {
    async mount(input: InspectorToolingLiveRootInputV1): Promise<InspectorToolingPlanV1> {
      return compilePlanV1(await kernel.mount(profileV1(options.profileId, input)));
    },
    async reload(
      input: InspectorToolingLiveRootInputV1,
      publish: InspectorToolingPlanPublisherV1,
    ): Promise<InspectorToolingPlanV1> {
      let publishedPlan: InspectorToolingPlanV1 | null = null;
      await kernel.reload(profileV1(options.profileId, input), async (candidate) => {
        const plan = compilePlanV1(candidate);
        const acknowledgement = publish(plan);
        if (
          (typeof acknowledgement !== "object" || acknowledgement === null) &&
          typeof acknowledgement !== "function"
        ) {
          throw new TypeError(
            "Inspector publication must return a layout-commit acknowledgement Promise",
          );
        }
        if (typeof (acknowledgement as { readonly then?: unknown }).then !== "function") {
          throw new TypeError(
            "Inspector publication must return a layout-commit acknowledgement Promise",
          );
        }
        await acknowledgement;
        publishedPlan = plan;
      });
      if (publishedPlan === null) {
        throw new TypeError("Inspector candidate completed without consumer publication");
      }
      return publishedPlan;
    },
    getSnapshot: () => kernel.getSnapshot(),
    getDiagnostics: () => kernel.getDiagnostics(),
    dispose: () => kernel.dispose(),
  };
}

export interface InspectorToolingHmrCoordinatorV1<TModule> {
  /** Queues one module accepted by the generated Vite boundary. */
  accept(module: TModule | undefined): void;
  /** Resolves after every transition queued before this call has settled. */
  waitForIdle(): Promise<void>;
  /** Idempotently closes HMR, removes the UI consumer, and then disposes composition. */
  dispose(): Promise<void>;
}

export interface CreateInspectorToolingHmrCoordinatorInputV1<TModule> {
  readonly composition: InspectorToolingLiveCompositionV1;
  resolveRoot(module: TModule | undefined): InspectorToolingLiveRootInputV1;
  /**
   * Resolves only after the candidate consumer has committed. It must observe
   * `signal` and reject promptly with `signal.reason` when closing aborts it.
   */
  publish(plan: InspectorToolingPlanV1, signal: AbortSignal): PromiseLike<void>;
  disposeRoot(): void;
  reportFailure?(error: unknown): void;
}

/**
 * Serializes dependency-accepted candidates and gives the generated Vite
 * boundary a non-rejecting dispose operation. The boundary itself keeps the
 * literal `import.meta.hot.accept("/module", ...)` call that Vite must analyze.
 * Every asynchronous failure is reported observationally and absorbed.
 */
export function createInspectorToolingHmrCoordinatorV1<TModule>(
  input: CreateInspectorToolingHmrCoordinatorInputV1<TModule>,
): InspectorToolingHmrCoordinatorV1<TModule> {
  let transition: Promise<void> = Promise.resolve();
  let closing = false;
  let activePublication: AbortController | null = null;

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
      const publication = new AbortController();
      activePublication = publication;
      try {
        try {
          await input.composition.reload(input.resolveRoot(module), async (plan) => {
            if (publication.signal.aborted) throw publication.signal.reason;
            await input.publish(plan, publication.signal);
          });
        } catch (error) {
          if (
            closing && publication.signal.aborted &&
            error === publication.signal.reason
          ) return;
          throw error;
        }
      } finally {
        if (activePublication === publication) activePublication = null;
      }
    });
  };

  const requestDispose = (): void => {
    if (closing) return;
    closing = true;
    activePublication?.abort(new DOMException("Inspector HMR is closing", "AbortError"));
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
  return {
    accept,
    waitForIdle: () => transition,
    async dispose(): Promise<void> {
      requestDispose();
      await transition;
    },
  };
}

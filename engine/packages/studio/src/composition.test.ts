// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCompositionKernelV1,
  createCompositionServiceTokenV1,
  defineCompositionPluginV1,
  defineCompositionProfileV1,
} from "@sillymaker/composition";
import type { CompositionSnapshotV1 } from "@sillymaker/composition";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type { StudioBindingV1 } from "./core/binding.ts";
import type { SceneSourceIoV1 } from "./core/scene-io.ts";
import {
  createStudioToolingHmrCoordinatorV1,
  createStudioToolingLiveCompositionV1,
} from "./composition.ts";
import type { StudioToolingLiveRootInputV1 } from "./composition.ts";

const sceneIoV1 = Object.freeze({}) as SceneSourceIoV1;
const motionIoV1 = Object.freeze({}) as MotionSourceIoV1;

afterEach(() => {
  vi.useRealTimers();
});

function bindingV1(label: string): StudioBindingV1 {
  return Object.freeze({ label }) as unknown as StudioBindingV1;
}

function rootInputV1(
  revision: number,
  binding: StudioBindingV1,
  effects: StudioToolingLiveRootInputV1["effects"] = Object.freeze([]),
): StudioToolingLiveRootInputV1 {
  return Object.freeze({ revision, binding, sceneIo: sceneIoV1, motionIo: motionIoV1, effects });
}

describe("Studio tooling live composition", () => {
  it("reloads an isolated live root without changing an authoritative plan, Session, or digest", async () => {
    const authorityToken = createCompositionServiceTokenV1<{
      readonly session: object;
      readonly digest: string;
    }>("studio.test.authority");
    const session = Object.freeze({ id: "authoritative-session" });
    const authority = Object.freeze({ session, digest: "digest.before" });
    const authoritativeKernel = createCompositionKernelV1();
    const authoritativeSnapshot = await authoritativeKernel.mount(
      defineCompositionProfileV1({
        id: "studio.test.authoritative",
        kind: "authoritative",
        plugins: [
          defineCompositionPluginV1({
            id: "studio.test.authority-provider",
            revision: 1,
            provides: [authorityToken],
            setup(scope) {
              scope.provide(authorityToken, authority);
            },
          }),
        ],
      }),
    );
    const authoritativePlan = authoritativeSnapshot.compileDirectPlan((resolve) =>
      resolve.use(authorityToken)
    );

    const oldBinding = bindingV1("old");
    const newBinding = bindingV1("new");
    const live = createStudioToolingLiveCompositionV1({
      profileId: "studio.test.live",
    });
    const oldPlan = await live.mount(rootInputV1(1, oldBinding));
    const oldLiveSnapshot = live.getSnapshot();
    const newPlan = await live.reload(rootInputV1(2, newBinding));

    expect(oldPlan.binding).toBe(oldBinding);
    expect(newPlan.binding).toBe(newBinding);
    expect(newPlan.sceneIo).toBe(sceneIoV1);
    expect(newPlan.motionIo).toBe(motionIoV1);
    expect(live.getSnapshot()).not.toBe(oldLiveSnapshot);
    expect(authoritativeKernel.getSnapshot()).toBe(authoritativeSnapshot);
    expect(authoritativePlan).toBe(authority);
    expect(authoritativePlan.session).toBe(session);
    expect(authoritativePlan.digest).toBe("digest.before");

    await live.dispose();
    await authoritativeKernel.dispose();
  });

  it("disposes timer, subscription, and listener resources in reverse order and diagnoses cleanup failures", async () => {
    vi.useFakeTimers();
    const cleanupFailure = new Error("listener-adjacent cleanup failed");
    const cleanupOrder: string[] = [];
    const listeners = new EventTarget();
    let listenerCalls = 0;
    const listener = (): void => {
      listenerCalls += 1;
    };
    const subscribers = new Set<() => void>();
    let subscriptionCalls = 0;
    let timerCalls = 0;
    const live = createStudioToolingLiveCompositionV1({
      profileId: "studio.test.resources",
    });

    await live.mount(rootInputV1(
      1,
      bindingV1("resources"),
      Object.freeze([
        () => {
          const timer = setInterval(() => {
            timerCalls += 1;
          }, 10);
          return () => {
            clearInterval(timer);
            cleanupOrder.push("timer");
          };
        },
        () => {
          const subscriber = (): void => {
            subscriptionCalls += 1;
          };
          subscribers.add(subscriber);
          return () => {
            subscribers.delete(subscriber);
            cleanupOrder.push("subscription");
          };
        },
        () => () => {
          cleanupOrder.push("failing");
          throw cleanupFailure;
        },
        () => {
          listeners.addEventListener("studio", listener);
          return () => {
            listeners.removeEventListener("studio", listener);
            cleanupOrder.push("listener");
          };
        },
      ]),
    ));
    listeners.dispatchEvent(new Event("studio"));
    for (const subscriber of subscribers) subscriber();
    await vi.advanceTimersByTimeAsync(10);
    expect(listenerCalls).toBe(1);
    expect(subscriptionCalls).toBe(1);
    expect(timerCalls).toBe(1);

    await live.reload(rootInputV1(2, bindingV1("replacement")));
    listeners.dispatchEvent(new Event("studio"));
    for (const subscriber of subscribers) subscriber();
    await vi.advanceTimersByTimeAsync(30);

    expect(listenerCalls).toBe(1);
    expect(subscriptionCalls).toBe(1);
    expect(timerCalls).toBe(1);
    expect(cleanupOrder).toEqual(["listener", "failing", "subscription", "timer"]);
    expect(live.getDiagnostics()).toEqual([
      expect.objectContaining({
        code: "composition.cleanup_failed",
        profileId: "studio.test.resources",
        pluginId: "sillymaker.studio.tooling-root",
        phase: "reload",
        error: cleanupFailure,
      }),
    ]);

    await live.dispose();
  });

  it("keeps the old snapshot and UI commit when an HMR candidate fails, then commits a valid successor", async () => {
    type BindingModule = { readonly binding: StudioBindingV1; readonly fail?: boolean };
    const oldBinding = bindingV1("old");
    const newBinding = bindingV1("new");
    const commits: StudioBindingV1[] = [];
    const failures: unknown[] = [];
    let revision = 1;
    const live = createStudioToolingLiveCompositionV1({
      profileId: "studio.test.hmr",
    });
    const initial = await live.mount(rootInputV1(revision, oldBinding));
    commits.push(initial.binding);
    const oldSnapshot = live.getSnapshot() as CompositionSnapshotV1;
    const coordinator = createStudioToolingHmrCoordinatorV1<BindingModule>({
      composition: live,
      resolveRoot(module) {
        if (module === undefined) throw new TypeError("accepted Studio module missing");
        revision += 1;
        return rootInputV1(
          revision,
          module.binding,
          module.fail
            ? Object.freeze([() => {
              throw new Error("candidate rejected");
            }])
            : Object.freeze([]),
        );
      },
      commit(plan) {
        commits.push(plan.binding);
      },
      disposeRoot() {},
      reportFailure(error) {
        failures.push(error);
      },
    });

    coordinator.accept(Object.freeze({ binding: newBinding, fail: true }));
    await coordinator.waitForIdle();
    expect(commits).toEqual([oldBinding]);
    expect(live.getSnapshot()).toBe(oldSnapshot);
    expect(failures).toHaveLength(1);

    coordinator.accept(Object.freeze({ binding: newBinding }));
    await coordinator.waitForIdle();
    expect(commits).toEqual([oldBinding, newBinding]);
    expect(live.getSnapshot()).not.toBe(oldSnapshot);
    expect(() => oldSnapshot.compileDirectPlan(() => undefined)).toThrow(
      "is no longer mounted",
    );

    await coordinator.dispose();
  });

  it("fire-and-reports both HMR disposal failures after removing the UI consumer first", async () => {
    type BindingModule = { readonly binding: StudioBindingV1 };
    const disposeFailure = new Error("async kernel disposal failed");
    const rootFailure = new Error("UI root disposal failed");
    const order: string[] = [];
    const reportFailure = vi.fn();
    const disposeRoot = vi.fn(() => {
      order.push("root");
      throw rootFailure;
    });
    const composition = Object.freeze({
      mount: vi.fn(),
      reload: vi.fn(),
      getSnapshot: vi.fn(() => null),
      getDiagnostics: vi.fn(() => Object.freeze([])),
      dispose: vi.fn(async () => {
        order.push("composition");
        throw disposeFailure;
      }),
    });
    const coordinator = createStudioToolingHmrCoordinatorV1<BindingModule>({
      composition,
      resolveRoot: (module) => rootInputV1(2, module!.binding),
      commit() {},
      disposeRoot,
      reportFailure,
    });

    void coordinator.dispose();
    await expect(coordinator.waitForIdle()).resolves.toBeUndefined();
    expect(order).toEqual(["root", "composition"]);
    expect(reportFailure.mock.calls).toEqual([[rootFailure], [disposeFailure]]);
    expect(disposeRoot).toHaveBeenCalledOnce();
    expect(composition.dispose).toHaveBeenCalledOnce();
  });
});

// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  createCompositionKernelV1,
  createCompositionServiceTokenV1,
  defineCompositionPluginV1,
  defineCompositionProfileV1,
} from "@sillymaker/composition";
import type { CompositionSnapshotV1 } from "@sillymaker/composition";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type { AuthoringSceneSourceIoV1 } from "./core/authoring-scene-io.ts";
import type { InspectorBindingV1 } from "./core/binding.ts";
import {
  createInspectorToolingHmrCoordinatorV1,
  createInspectorToolingLiveCompositionV1,
} from "./composition.ts";
import type {
  InspectorToolingLiveCompositionV1,
  InspectorToolingLiveRootInputV1,
} from "./composition.ts";

const sceneIoV1 = {} as AuthoringSceneSourceIoV1;
const motionIoV1 = Object.freeze({}) as MotionSourceIoV1;

function bindingV1(label: string): InspectorBindingV1 {
  return { label } as unknown as InspectorBindingV1;
}

function disposableBindingV1(
  label: string,
  dispose: () => void,
): InspectorBindingV1 {
  return { label, dispose } as unknown as InspectorBindingV1;
}

function rootInputV1(
  revision: number,
  binding: InspectorBindingV1,
): InspectorToolingLiveRootInputV1 {
  return {
    revision,
    binding,
    sceneIo: sceneIoV1,
    motionIo: motionIoV1,
  };
}

const unsupportedEffectsInputV1 = {
  ...rootInputV1(1, bindingV1("unsupported-effects")),
  // @ts-expect-error Inspector live roots do not accept arbitrary pre-publication effects.
  effects: Object.freeze([]),
} satisfies InspectorToolingLiveRootInputV1;
void unsupportedEffectsInputV1;

describe("Inspector tooling live composition", () => {
  it("disposes a rolled-back candidate, retired predecessor, and final binding exactly once", async () => {
    const oldDispose = vi.fn();
    const rejectedDispose = vi.fn();
    const currentDispose = vi.fn();
    const oldBinding = disposableBindingV1("old", oldDispose);
    const rejectedBinding = disposableBindingV1("rejected", rejectedDispose);
    const currentBinding = disposableBindingV1("current", currentDispose);
    const live = createInspectorToolingLiveCompositionV1({
      profileId: "inspector.test.binding-lifecycle",
    });

    await live.mount(rootInputV1(1, oldBinding));
    await expect(live.reload(rootInputV1(2, rejectedBinding), async () => {
      throw new Error("reject candidate");
    })).rejects.toThrow("reject candidate");

    expect(rejectedDispose).toHaveBeenCalledOnce();
    expect(oldDispose).not.toHaveBeenCalled();
    expect(currentDispose).not.toHaveBeenCalled();

    await live.reload(rootInputV1(3, currentBinding), async () => undefined);
    expect(rejectedDispose).toHaveBeenCalledOnce();
    expect(oldDispose).toHaveBeenCalledOnce();
    expect(currentDispose).not.toHaveBeenCalled();

    await live.dispose();
    await live.dispose();
    expect(rejectedDispose).toHaveBeenCalledOnce();
    expect(oldDispose).toHaveBeenCalledOnce();
    expect(currentDispose).toHaveBeenCalledOnce();
  });

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
    const live = createInspectorToolingLiveCompositionV1({
      profileId: "inspector.test.live",
    });
    const oldPlan = await live.mount(rootInputV1(1, oldBinding));
    const oldLiveSnapshot = live.getSnapshot();
    const newPlan = await live.reload(rootInputV1(2, newBinding), async () => undefined);

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

  it("keeps the old snapshot and UI commit when an HMR publisher rejects, then commits a valid successor", async () => {
    type BindingModule = { readonly binding: InspectorBindingV1 };
    const oldBinding = bindingV1("old");
    const rejectedBinding = bindingV1("rejected");
    const newBinding = bindingV1("new");
    const commits: InspectorBindingV1[] = [];
    const failures: unknown[] = [];
    let revision = 1;
    const live = createInspectorToolingLiveCompositionV1({
      profileId: "inspector.test.hmr",
    });
    const initial = await live.mount(rootInputV1(revision, oldBinding));
    commits.push(initial.binding);
    const oldSnapshot = live.getSnapshot() as CompositionSnapshotV1;
    const coordinator = createInspectorToolingHmrCoordinatorV1<BindingModule>({
      composition: live,
      resolveRoot(module) {
        if (module === undefined) throw new TypeError("accepted Inspector module missing");
        revision += 1;
        return rootInputV1(revision, module.binding);
      },
      async publish(plan) {
        if (plan.binding === rejectedBinding) throw new Error("candidate rejected");
        commits.push(plan.binding);
      },
      disposeRoot() {},
      reportFailure(error) {
        failures.push(error);
      },
    });

    coordinator.accept(Object.freeze({ binding: rejectedBinding }));
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

  it.each(["synchronous", "asynchronous"] as const)(
    "rolls back a mounted candidate after %s consumer publication failure",
    async (failureKind) => {
      const publicationFailure = new Error(`${failureKind} Inspector publication failed`);
      const live = createInspectorToolingLiveCompositionV1({
        profileId: `inspector.test.publication-${failureKind}`,
      });
      await live.mount(rootInputV1(1, bindingV1("old")));
      const oldSnapshot = live.getSnapshot() as CompositionSnapshotV1;

      await expect(live.reload(
        rootInputV1(2, bindingV1("candidate")),
        failureKind === "synchronous"
          ? () => {
            throw publicationFailure;
          }
          : async () => {
            await Promise.resolve();
            throw publicationFailure;
          },
      )).rejects.toBe(publicationFailure);

      expect(live.getSnapshot()).toBe(oldSnapshot);
      expect(oldSnapshot.compileDirectPlan(() => "old still current")).toBe(
        "old still current",
      );
      await live.dispose();
    },
  );

  it("rejects a bare synchronous render return instead of treating it as a commit acknowledgement", async () => {
    const live = createInspectorToolingLiveCompositionV1({
      profileId: "inspector.test.publication-acknowledgement",
    });
    await live.mount(rootInputV1(1, bindingV1("old")));
    const oldSnapshot = live.getSnapshot();

    await expect(live.reload(
      rootInputV1(2, bindingV1("candidate")),
      (() => undefined) as unknown as Parameters<InspectorToolingLiveCompositionV1["reload"]>[1],
    )).rejects.toThrow("layout-commit acknowledgement Promise");

    expect(live.getSnapshot()).toBe(oldSnapshot);
    await live.dispose();
  });

  it("aborts an in-flight publication before consumer-first HMR disposal without leaking a rejection", async () => {
    const events: string[] = [];
    const failures: unknown[] = [];
    let enterPublication!: () => void;
    const publicationEntered = new Promise<void>((resolve) => enterPublication = resolve);
    const live = createInspectorToolingLiveCompositionV1({
      profileId: "inspector.test.concurrent-dispose",
    });
    await live.mount(rootInputV1(1, bindingV1("old")));
    const coordinator = createInspectorToolingHmrCoordinatorV1<{
      readonly binding: InspectorBindingV1;
    }>({
      composition: live,
      resolveRoot: (module) => rootInputV1(2, module!.binding),
      publish(_plan, signal) {
        enterPublication();
        return new Promise<void>((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            events.push("abort:publication");
            reject(signal.reason);
          }, { once: true });
        });
      },
      disposeRoot() {
        events.push("dispose:root");
      },
      reportFailure(error) {
        failures.push(error);
      },
    });

    coordinator.accept(Object.freeze({ binding: bindingV1("candidate") }));
    await publicationEntered;
    await expect(coordinator.dispose()).resolves.toBeUndefined();

    expect(events).toEqual([
      "abort:publication",
      "dispose:root",
    ]);
    expect(failures).toEqual([]);
  });

  it("fire-and-reports both HMR disposal failures after removing the UI consumer first", async () => {
    type BindingModule = { readonly binding: InspectorBindingV1 };
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
    const coordinator = createInspectorToolingHmrCoordinatorV1<BindingModule>({
      composition,
      resolveRoot: (module) => rootInputV1(2, module!.binding),
      async publish() {},
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

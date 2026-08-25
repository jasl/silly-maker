// SPDX-License-Identifier: MIT
import { defineTextContentManifestV1 } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import {
  composeWebApplicationReadinessHooksInternalV1,
  createWebTextContentObservationInternalV1,
  projectWebTextContentPackObservationInternalV1,
  startWebAddressableRuntimeInternalV1,
  type WebAddressableRuntimeDefinitionV1,
  type WebTextContentPackObservationV1,
} from "./web-addressable-runtime.ts";

interface InvocationV1 {
  readonly kind: "open";
  readonly unitId: string;
}

interface SnapshotV1 {
  readonly currentUnitId: string;
}

const textManifestV1 = defineTextContentManifestV1({
  revision: 1,
  defaultLocale: "en",
  locales: [
    { locale: "en", fallbackLocale: null },
    { locale: "zh-CN", fallbackLocale: "en" },
  ],
  packs: [
    {
      packId: "text-pack.web.observation-opening",
      variants: [
        { locale: "en", runtimePath: "assets/content/opening.en.text-pack.json" },
        {
          locale: "zh-CN",
          runtimePath: "assets/content/opening.zh-CN.text-pack.json",
        },
      ],
    },
    {
      packId: "text-pack.web.observation-chapter-2",
      variants: [
        { locale: "en", runtimePath: "assets/content/chapter-2.en.text-pack.json" },
      ],
    },
  ],
});

describe("Web addressable runtime composition", () => {
  it("creates and initially prepares a distinct value for every application start", async () => {
    const events: string[] = [];
    let sequence = 0;
    const definition: WebAddressableRuntimeDefinitionV1<
      { readonly startId: number },
      InvocationV1,
      SnapshotV1
    > = {
      create(runtimeHost) {
        const startId = ++sequence;
        events.push(`create:${startId}`);
        return {
          executionContext: { startId },
          async prepareInitial() {
            await runtimeHost.loadRuntimeBytes(`runtime/${startId}.json`);
            events.push(`initial:${startId}`);
          },
          dispose() {
            events.push(`dispose:${startId}`);
          },
        };
      },
    };
    const host = {
      loadRuntimeBytes: vi.fn(async () => Uint8Array.of()),
      reportFailure: vi.fn(),
    };

    const first = await startWebAddressableRuntimeInternalV1(definition, host);
    const second = await startWebAddressableRuntimeInternalV1(definition, host);

    expect(first.executionContext).toEqual({ startId: 1 });
    expect(second.executionContext).toEqual({ startId: 2 });
    expect(host.loadRuntimeBytes).toHaveBeenNthCalledWith(1, "runtime/1.json");
    expect(host.loadRuntimeBytes).toHaveBeenNthCalledWith(2, "runtime/2.json");
    expect(events).toEqual(["create:1", "initial:1", "create:2", "initial:2"]);
  });

  it("forwards already-admitted invocation and replacement preparation", async () => {
    const invocation: InvocationV1 = { kind: "open", unitId: "scene.chapter-2" };
    const snapshot: SnapshotV1 = { currentUnitId: "scene.chapter-3" };
    const prepareSemanticInvocation = vi.fn(async () => undefined);
    const prepareReplacement = vi.fn(async () => undefined);
    const runtime = await startWebAddressableRuntimeInternalV1({
      create: () => ({
        executionContext: { kind: "runtime" as const },
        prepareSemanticInvocation,
        prepareReplacement,
        dispose: vi.fn(),
      }),
    }, {
      loadRuntimeBytes: vi.fn(async () => Uint8Array.of()),
      reportFailure: vi.fn(),
    });

    await runtime.prepareSemanticInvocation?.(invocation);
    await runtime.prepareReplacement?.(snapshot);

    expect(prepareSemanticInvocation).toHaveBeenCalledExactlyOnceWith(invocation);
    expect(prepareReplacement).toHaveBeenCalledExactlyOnceWith(snapshot);
  });

  it("disposes an instance whose initial preparation fails and keeps that failure primary", async () => {
    const initialFailure = new Error("initial failed");
    const dispose = vi.fn();
    const reportFailure = vi.fn();

    await expect(startWebAddressableRuntimeInternalV1({
      create: () => ({
        executionContext: undefined,
        prepareInitial: () => Promise.reject(initialFailure),
        dispose,
      }),
    }, {
      loadRuntimeBytes: vi.fn(async () => Uint8Array.of()),
      reportFailure,
    })).rejects.toBe(initialFailure);

    expect(dispose).toHaveBeenCalledOnce();
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it("composes text and addressable preparation behind one Core readiness callback", async () => {
    const events: string[] = [];
    const invocation: InvocationV1 = { kind: "open", unitId: "scene.chapter-4" };
    const snapshot: SnapshotV1 = { currentUnitId: "scene.chapter-5" };
    const hooks = composeWebApplicationReadinessHooksInternalV1<InvocationV1, SnapshotV1>(
      {
        prepareSemanticInvocation: async () => {
          events.push("text:invocation");
        },
        prepareReplacement: async () => {
          events.push("text:replacement");
        },
      },
      {
        prepareSemanticInvocation: async () => {
          events.push("runtime:invocation");
        },
        prepareReplacement: async () => {
          events.push("runtime:replacement");
        },
      },
    );

    await hooks?.prepareSemanticInvocation?.(invocation);
    await hooks?.prepareReplacement?.(snapshot);

    expect(events).toEqual([
      "text:invocation",
      "runtime:invocation",
      "text:replacement",
      "runtime:replacement",
    ]);
  });

  it("releases the application-lifetime instance once after Story UI cleanup", async () => {
    const events: string[] = [];
    const runtime = await startWebAddressableRuntimeInternalV1({
      create: () => ({
        executionContext: undefined,
        dispose: () => events.push("addressable_runtime"),
      }),
    }, {
      loadRuntimeBytes: vi.fn(async () => Uint8Array.of()),
      reportFailure: vi.fn(),
    });

    events.push("story_ui");
    runtime.dispose();
    runtime.dispose();

    expect(events).toEqual(["story_ui", "addressable_runtime"]);
  });

  it("projects only the selected Text pack's Web-owned lifecycle state", () => {
    const descriptor = textManifestV1.packs[0]!;
    const timing = { loadMs: 3, admitMs: 2, activateMs: 1, totalMs: 6 };
    const unloaded = projectWebTextContentPackObservationInternalV1({
      descriptor,
      lease: undefined,
      acquiring: false,
      attempt: 0,
      failureCount: 0,
      diagnosticCode: null,
    });
    const acquiring = projectWebTextContentPackObservationInternalV1({
      descriptor,
      lease: undefined,
      acquiring: true,
      attempt: 1,
      failureCount: 0,
      diagnosticCode: null,
    });
    const loaded = projectWebTextContentPackObservationInternalV1({
      descriptor,
      lease: {
        packId: descriptor.packId,
        generation: textManifestV1.digest,
        timing,
        release: vi.fn(),
      },
      acquiring: false,
      attempt: 1,
      failureCount: 0,
      diagnosticCode: null,
    });
    const failed = projectWebTextContentPackObservationInternalV1({
      descriptor,
      lease: undefined,
      acquiring: false,
      attempt: 2,
      failureCount: 2,
      diagnosticCode: "web.text_content_required",
    });
    expect(unloaded).toMatchObject({ status: "unloaded", attempt: 0, timing: null });
    expect(acquiring).toMatchObject({ status: "acquiring", attempt: 1, timing: null });
    expect(loaded).toMatchObject({ status: "loaded", attempt: 1, timing });
    expect(failed).toMatchObject({
      status: "failed",
      attempt: 2,
      failureCount: 2,
      diagnosticCode: "web.text_content_required",
    });
  });

  it("keeps the Text catalog stable and reports only the changed pack", async () => {
    const observations = new Map(
      textManifestV1.packs.map((descriptor) =>
        [
          descriptor.packId,
          projectWebTextContentPackObservationInternalV1({
            descriptor,
            lease: undefined,
            acquiring: false,
            attempt: 0,
            failureCount: 0,
            diagnosticCode: null,
          }),
        ] as const
      ),
    );
    const retry = vi.fn(async () => false);
    const controller = createWebTextContentObservationInternalV1({
      packs: textManifestV1.packs,
      get(packId): WebTextContentPackObservationV1 {
        return observations.get(packId)!;
      },
      retry,
    });
    const changed = vi.fn();
    const unsubscribe = controller.observation.subscribe(changed);
    const chapterPackId = textManifestV1.packs[1]!.packId;

    expect(controller.observation.packs).toBe(textManifestV1.packs);
    expect(controller.observation.get(chapterPackId)).toMatchObject({
      packId: chapterPackId,
      status: "unloaded",
      attempt: 0,
    });
    controller.notify(chapterPackId);
    expect(changed).toHaveBeenCalledExactlyOnceWith(chapterPackId);
    await expect(controller.observation.retry(chapterPackId)).resolves.toBe(false);
    expect(retry).toHaveBeenCalledExactlyOnceWith(chapterPackId);

    unsubscribe();
    controller.notify(textManifestV1.packs[0]!.packId);
    controller.dispose();
    controller.notify(chapterPackId);
    expect(changed).toHaveBeenCalledOnce();
  });
});

// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { AssetId, MotionDocumentV1, StageContentCatalogV1 } from "@sillymaker/base";
import {
  createSemanticStageStateV1,
  parseMotionDocumentV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
} from "@sillymaker/base";

import type { MotionIoErrorCodeV1, MotionSourceIoV1 } from "./motion-io.ts";
import { createMotionSourceIndexV1 } from "./motion-sources.ts";
import {
  MotionWorkbenchLauncherV1,
  createMotionWorkbenchStoreV1,
} from "./motion-workbench-launcher.tsx";
import type {
  MotionWorkbenchCloseParticipantV1,
  MotionWorkbenchPreviewV1,
} from "./motion-workbench.tsx";
import type { SemanticStageEntryRendererV1 } from "../stage/semantic-stage-host.tsx";

const motionJsonV1 = {
  format: "sillymaker.motion",
  version: 1,
  motionId: "motion.test.enter",
  label: "登场",
  durationMs: 200,
  delayMs: 0,
  tracks: [
    {
      channel: "offsetX",
      keyframes: [
        { atPermille: 0, value: 80 },
        { atPermille: 1000, value: 0 },
      ],
    },
  ],
} as const;

const contentCatalogV1: StageContentCatalogV1 = {
  resolveContent: () =>
    Object.freeze({
      rendererId: "renderer.test.box",
      assetIds: Object.freeze([] as readonly AssetId[]),
      accessibleName: "角色",
      props: Object.freeze({}),
    }),
};

function targetV1(x: number) {
  const empty = createSemanticStageStateV1({
    stageId: "stage.test.launcher",
    layerIds: ["layer.test.chars"],
  });
  const outcome = reduceStageMutationsV1(empty, [
    {
      kind: "show",
      layerId: "layer.test.chars",
      tag: "tag.test.actor",
      contentId: "content.test.actor",
      placement: { x, y: 0, scalePermille: 1000, opacityPermille: 1000, mirrored: false },
    },
  ]);
  if (outcome.kind !== "applied") throw new Error("launcher fixture stage must apply");
  return projectStageRenderTargetV1(outcome.state, contentCatalogV1).target;
}

const rendererV1: SemanticStageEntryRendererV1 = ({ entry }) => (
  <span data-test-content={entry.contentId} />
);

const sourcesV1 = createMotionSourceIndexV1(
  { "./motions/enter.motion.json": motionJsonV1 },
  { sourceRoot: "src" },
);

const alternateMotionJsonV1 = {
  ...motionJsonV1,
  motionId: "motion.test.alternate",
  label: "备选登场",
} as const;

const twoSourcesV1 = createMotionSourceIndexV1(
  {
    "./motions/enter.motion.json": motionJsonV1,
    "./motions/alternate.motion.json": alternateMotionJsonV1,
  },
  { sourceRoot: "src" },
);

function writableIoV1(writeError: MotionIoErrorCodeV1 | null = null): {
  readonly io: MotionSourceIoV1;
  reads(): number;
  writes(): readonly {
    readonly path: string;
    readonly expectedDigest: string;
    readonly motionDocument: MotionDocumentV1;
  }[];
} {
  let reads = 0;
  let digest = "sha256:aaaa";
  const writes: {
    readonly path: string;
    readonly expectedDigest: string;
    readonly motionDocument: MotionDocumentV1;
  }[] = [];
  return Object.freeze({
    io: Object.freeze({
      list: () => Promise.resolve({ kind: "ok" as const, motions: [], skipped: [] }),
      read(path: string) {
        reads += 1;
        const document = path.endsWith("alternate.motion.json")
          ? alternateMotionJsonV1
          : motionJsonV1;
        return Promise.resolve({
          kind: "ok" as const,
          digest,
          motionDocument: parseMotionDocumentV1(document, `/${path}`),
        });
      },
      write(input: Parameters<MotionSourceIoV1["write"]>[0]) {
        writes.push(input);
        if (writeError !== null) {
          return Promise.resolve({ kind: "error" as const, code: writeError });
        }
        digest = "sha256:bbbb";
        return Promise.resolve({ kind: "ok" as const, digest });
      },
      create: () => Promise.resolve({ kind: "error" as const, code: "unavailable" as const }),
    }),
    reads: () => reads,
    writes: () => writes,
  });
}

function previewV1(x: number): MotionWorkbenchPreviewV1 {
  return Object.freeze({
    target: targetV1(x),
    renderers: { "renderer.test.box": rendererV1 },
    entryKey: "layer.test.chars:tag.test.actor",
    canvas: { width: 960, height: 540 },
  });
}

function mainEntryTransformV1(container: HTMLElement): string {
  const entries = [
    ...container.querySelectorAll('[data-stage-key="layer.test.chars:tag.test.actor"]'),
  ].filter((entry) => entry.closest("[data-workbench-ghost]") === null);
  const [entry] = entries;
  if (!(entry instanceof HTMLElement)) throw new Error("launcher main entry missing");
  return entry.style.transform;
}

afterEach(cleanup);

describe("MotionWorkbenchLauncherV1", () => {
  it("opens preview cases and plain sources from the empty state", () => {
    const store = createMotionWorkbenchStoreV1();
    const { container } = render(
      <MotionWorkbenchLauncherV1
        store={store}
        sources={sourcesV1}
        fallbackPreview={previewV1(100)}
        cases={[
          {
            caseId: "case.test.enter",
            label: "入场案例",
            motionId: "motion.test.enter",
            preview: previewV1(500),
          },
        ]}
      />,
    );

    const caseButton = container.querySelector('[data-motion-workbench-case="case.test.enter"]');
    if (!(caseButton instanceof HTMLElement)) throw new Error("case button missing");
    fireEvent.click(caseButton);

    // The case preview places the actor at x=500; t=0 holds offset 80 → 580.
    expect(
      container
        .querySelector("[data-motion-workbench-context]")
        ?.getAttribute("data-motion-workbench-context"),
    ).toBe("case.test.enter");
    expect(mainEntryTransformV1(container)).toContain("translate3d(580px");

    const close = container.querySelector("[data-motion-workbench-close]");
    if (!(close instanceof HTMLElement)) throw new Error("close missing");
    fireEvent.click(close);
    expect(container.querySelector('[data-motion-workbench-launcher="empty"]')).not.toBeNull();
  });

  it("prefers a live capture over the fallback preview", () => {
    const store = createMotionWorkbenchStoreV1();
    const source = sourcesV1.get("motion.test.enter");
    if (source === null) throw new Error("source missing");
    const { container } = render(
      <MotionWorkbenchLauncherV1
        store={store}
        sources={sourcesV1}
        fallbackPreview={previewV1(100)}
      />,
    );

    act(() =>
      store.open(source, {
        target: targetV1(300),
        entryKey: "layer.test.chars:tag.test.actor",
      })
    );
    expect(
      container
        .querySelector("[data-motion-workbench-context]")
        ?.getAttribute("data-motion-workbench-context"),
    ).toBe("capture");
    // Captured placement x=300 + start offset 80.
    expect(mainEntryTransformV1(container)).toContain("translate3d(380px");

    // Without a capture the fallback context renders (x=100 + 80).
    act(() => store.open(source));
    expect(mainEntryTransformV1(container)).toContain("translate3d(180px");
  });

  it("gates an internal dirty close with cancel and discard", async () => {
    const fake = writableIoV1();
    const store = createMotionWorkbenchStoreV1();
    const source = sourcesV1.get("motion.test.enter");
    if (source === null) throw new Error("source missing");
    store.open(source);
    const { container } = render(
      <MotionWorkbenchLauncherV1
        store={store}
        sources={sourcesV1}
        fallbackPreview={previewV1(100)}
        io={fake.io}
      />,
    );
    await waitFor(() => expect(fake.reads()).toBe(1));

    const duration = container.querySelector("[data-workbench-duration]");
    if (!(duration instanceof HTMLInputElement)) throw new Error("duration missing");
    fireEvent.change(duration, { target: { value: "470" } });
    fireEvent.click(container.querySelector("[data-motion-workbench-close]") as HTMLElement);
    expect(container.querySelector("[data-motion-workbench-close-confirm]")).not.toBeNull();
    expect(duration.value).toBe("470");

    fireEvent.click(
      container.querySelector("[data-motion-workbench-close-cancel]") as HTMLElement,
    );
    expect(container.querySelector("[data-motion-workbench-close-confirm]")).toBeNull();
    expect(duration.value).toBe("470");

    fireEvent.click(container.querySelector("[data-motion-workbench-close]") as HTMLElement);
    fireEvent.click(
      container.querySelector("[data-motion-workbench-close-discard]") as HTMLElement,
    );
    expect(container.querySelector('[data-motion-workbench-launcher="empty"]')).not.toBeNull();
    expect(fake.writes()).toHaveLength(0);
  });

  it("saves a dirty draft through its exact participant before closing", async () => {
    const fake = writableIoV1();
    const store = createMotionWorkbenchStoreV1();
    const source = sourcesV1.get("motion.test.enter");
    if (source === null) throw new Error("source missing");
    const registered: { current: MotionWorkbenchCloseParticipantV1 | null } = { current: null };
    store.open(source);
    const { container } = render(
      <MotionWorkbenchLauncherV1
        store={store}
        sources={sourcesV1}
        fallbackPreview={previewV1(100)}
        io={fake.io}
        registerCloseParticipant={(participant) => {
          registered.current = participant;
          return () => {
            if (registered.current === participant) registered.current = null;
          };
        }}
      />,
    );
    await waitFor(() => expect(fake.reads()).toBe(1));
    fireEvent.change(container.querySelector("[data-workbench-duration]") as HTMLElement, {
      target: { value: "470" },
    });
    expect(registered.current?.getState().dirty).toBe(true);
    fireEvent.click(container.querySelector("[data-motion-workbench-close]") as HTMLElement);
    fireEvent.click(container.querySelector("[data-motion-workbench-close-save]") as HTMLElement);

    await waitFor(() =>
      expect(container.querySelector('[data-motion-workbench-launcher="empty"]')).not.toBeNull()
    );
    expect(fake.writes()).toHaveLength(1);
    expect(fake.writes()[0]).toMatchObject({
      path: "src/motions/enter.motion.json",
      expectedDigest: "sha256:aaaa",
      motionDocument: { durationMs: 470 },
    });
    expect(registered.current).toBeNull();
  });

  it.each(["unavailable", "digest_conflict"] as const)(
    "retains the dirty draft when close-save returns %s",
    async (writeError) => {
      const fake = writableIoV1(writeError);
      const store = createMotionWorkbenchStoreV1();
      const source = sourcesV1.get("motion.test.enter");
      if (source === null) throw new Error("source missing");
      store.open(source);
      const { container } = render(
        <MotionWorkbenchLauncherV1
          store={store}
          sources={sourcesV1}
          fallbackPreview={previewV1(100)}
          io={fake.io}
        />,
      );
      await waitFor(() => expect(fake.reads()).toBe(1));
      const duration = container.querySelector("[data-workbench-duration]");
      if (!(duration instanceof HTMLInputElement)) throw new Error("duration missing");
      fireEvent.change(duration, { target: { value: "470" } });
      fireEvent.click(container.querySelector("[data-motion-workbench-close]") as HTMLElement);
      fireEvent.click(
        container.querySelector("[data-motion-workbench-close-save]") as HTMLElement,
      );

      await waitFor(() => expect(fake.writes()).toHaveLength(1));
      expect(container.querySelector("[data-motion-workbench-close-confirm]")).not.toBeNull();
      expect(container.querySelector('[data-motion-workbench-launcher="empty"]')).toBeNull();
      expect(duration.value).toBe("470");
      if (writeError === "digest_conflict") {
        await waitFor(() => expect(fake.reads()).toBe(2));
      }
    },
  );

  it("gates external open and openCase replacement through the same dirty participant", async () => {
    const fake = writableIoV1();
    const store = createMotionWorkbenchStoreV1();
    const source = twoSourcesV1.get("motion.test.enter");
    const alternate = twoSourcesV1.get("motion.test.alternate");
    if (source === null || alternate === null) throw new Error("sources missing");
    store.open(source);
    const alternateCase = {
      caseId: "case.test.alternate",
      label: "备选案例",
      motionId: alternate.motionId,
      preview: previewV1(500),
    } as const;
    const { container } = render(
      <MotionWorkbenchLauncherV1
        store={store}
        sources={twoSourcesV1}
        fallbackPreview={previewV1(100)}
        cases={[alternateCase]}
        io={fake.io}
      />,
    );
    await waitFor(() => expect(fake.reads()).toBe(1));
    const duration = container.querySelector("[data-workbench-duration]");
    if (!(duration instanceof HTMLInputElement)) throw new Error("duration missing");
    fireEvent.change(duration, { target: { value: "470" } });

    act(() => store.open(alternate));
    expect(container.querySelector("[data-motion-workbench-close-confirm]")).not.toBeNull();
    expect(
      container.querySelector("[data-motion-workbench-launcher]")?.getAttribute(
        "data-motion-workbench-launcher",
      ),
    ).toBe("motion.test.enter");
    expect(duration.value).toBe("470");
    fireEvent.click(
      container.querySelector("[data-motion-workbench-close-cancel]") as HTMLElement,
    );

    act(() => store.openCase(alternateCase, alternate));
    fireEvent.click(
      container.querySelector("[data-motion-workbench-close-discard]") as HTMLElement,
    );
    await waitFor(() =>
      expect(
        container.querySelector("[data-motion-workbench-launcher]")?.getAttribute(
          "data-motion-workbench-launcher",
        ),
      ).toBe("motion.test.alternate")
    );
    expect(
      container.querySelector("[data-motion-workbench-context]")?.getAttribute(
        "data-motion-workbench-context",
      ),
    ).toBe("case.test.alternate");
  });
});

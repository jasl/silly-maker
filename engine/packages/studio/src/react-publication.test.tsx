// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { useLayoutEffect, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { act, fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseSceneDocumentV1 } from "@sillymaker/base";
import type { SceneDocumentV1, StageContentCatalogV1 } from "@sillymaker/base";
import type { SemanticStageEntryRendererV1 } from "@sillymaker/ui";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type { StudioToolingPlanV1 } from "./composition.ts";
import type { StudioBindingV1 } from "./core/binding.ts";
import type { SceneSourceIoV1 } from "./core/scene-io.ts";
import {
  createReactLayoutPublicationV1,
  createStudioToolingReactPublicationV1,
} from "./react-publication.tsx";

interface TestPlanV1 {
  readonly label: string;
  readonly failRender?: boolean;
  readonly failLayout?: boolean;
  readonly abortInLayout?: AbortController;
  readonly abortInMicrotask?: AbortController;
  readonly cleanupFailure?: Error;
}

const mountedPublications: Array<{ dispose(): void }> = [];

afterEach(() => {
  for (const publication of mountedPublications.splice(0).toReversed()) publication.dispose();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function containerV1(): HTMLDivElement {
  const container = document.createElement("div");
  document.body.append(container);
  return container;
}

describe("Studio React layout publication", () => {
  it("does not expose an initial host until its real layout commit acknowledges", async () => {
    const container = containerV1();
    const events: string[] = [];
    const publication = createReactLayoutPublicationV1<TestPlanV1>({
      container,
      render(plan) {
        return <LayoutProbeV1 plan={plan} events={events} />;
      },
    });
    mountedPublications.push(publication);

    let settled = false;
    const mount = publication.mount({ label: "initial" }).then(() => settled = true);
    expect(settled).toBe(false);
    expect(container.childElementCount).toBe(0);

    await mount;
    expect(events).toEqual(["layout:initial"]);
    expect(container.textContent).toBe("initial");
    expect(container.querySelector("[data-sillymaker-studio-epoch=current]")).not.toBeNull();
  });

  it("leaves the container empty and cleans the detached root after initial layout failure", async () => {
    const container = containerV1();
    const events: string[] = [];
    const layoutFailure = new Error("initial layout failed");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const publication = createReactLayoutPublicationV1<TestPlanV1>({
      container,
      render() {
        return <InitialLayoutFailureV1 events={events} failure={layoutFailure} />;
      },
    });
    mountedPublications.push(publication);

    await expect(publication.mount({ label: "initial" })).rejects.toBe(layoutFailure);

    expect(container.childElementCount).toBe(0);
    expect(events).toEqual(["layout:ready", "cleanup:ready"]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("keeps the exact old host and rendered node when detached candidate rendering fails", async () => {
    const container = containerV1();
    const publication = createReactLayoutPublicationV1<TestPlanV1>({
      container,
      render(plan) {
        if (plan.failRender === true) throw new Error(`bad binding:${plan.label}`);
        return <div data-plan={plan.label}>{plan.label}</div>;
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });
    const oldHost = container.firstElementChild;
    const oldNode = container.querySelector("[data-plan=old]");
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => mutations.push(...records));
    observer.observe(container, { childList: true, subtree: true, characterData: true });

    await expect(publication.publish(
      { label: "bad", failRender: true },
      new AbortController().signal,
    )).rejects.toThrow("bad binding:bad");
    await Promise.resolve();
    observer.disconnect();

    expect(container.firstElementChild).toBe(oldHost);
    expect(container.querySelector("[data-plan=old]")).toBe(oldNode);
    expect(container.textContent).toBe("old");
    expect(mutations).toEqual([]);
  });

  it("rejects even when candidate rendering throws undefined", async () => {
    const container = containerV1();
    const undefinedFailure: unknown = undefined;
    const publication = createReactLayoutPublicationV1<TestPlanV1>({
      container,
      render(plan) {
        if (plan.failRender === true) throw undefinedFailure;
        return <div>{plan.label}</div>;
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });
    const oldHost = container.firstElementChild;

    await expect(publication.publish(
      { label: "candidate", failRender: true },
      new AbortController().signal,
    )).rejects.toBeUndefined();

    expect(container.firstElementChild).toBe(oldHost);
    expect(container.textContent).toBe("old");
  });

  it("defers failed-candidate unmount until React leaves the layout work loop", async () => {
    const container = containerV1();
    const events: string[] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const publication = createReactLayoutPublicationV1<TestPlanV1>({
      container,
      render(plan) {
        return <LayoutProbeV1 plan={plan} events={events} />;
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });
    const oldHost = container.firstElementChild;
    const abort = new AbortController();

    let rejection: unknown;
    try {
      await publication.publish(
        { label: "candidate", abortInLayout: abort },
        abort.signal,
      );
    } catch (error) {
      rejection = error;
    }

    expect(rejection).toBe(abort.signal.reason);
    expect(container.firstElementChild).toBe(oldHost);
    expect(events).toEqual([
      "layout:old",
      "layout:candidate",
      "cleanup:candidate",
    ]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("rechecks a microtask abort after layout acknowledgement and before host cutover", async () => {
    const container = containerV1();
    const events: string[] = [];
    const publication = createReactLayoutPublicationV1<TestPlanV1>({
      container,
      render(plan) {
        return <LayoutProbeV1 plan={plan} events={events} />;
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });
    const oldHost = container.firstElementChild;
    const abort = new AbortController();

    let rejection: unknown;
    try {
      await publication.publish(
        { label: "candidate", abortInMicrotask: abort },
        abort.signal,
      );
    } catch (error) {
      rejection = error;
    }

    expect(rejection).toBe(abort.signal.reason);
    expect(container.firstElementChild).toBe(oldHost);
    expect(container.textContent).toBe("old");
    expect(events).toEqual([
      "layout:old",
      "layout:candidate",
      "cleanup:candidate",
    ]);
  });

  it("replaces the host only after candidate layout acknowledgement and retires each root once", async () => {
    const container = containerV1();
    const events: string[] = [];
    const publication = createReactLayoutPublicationV1<TestPlanV1>({
      container,
      render(plan) {
        return <LayoutProbeV1 plan={plan} events={events} />;
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });
    const oldHost = container.firstElementChild;
    const oldNode = container.querySelector("[data-plan=old]");

    let settled = false;
    const published = publication.publish(
      { label: "candidate" },
      new AbortController().signal,
    ).then(() => settled = true);
    expect(settled).toBe(false);
    expect(container.firstElementChild).toBe(oldHost);

    await published;
    const candidateHost = container.firstElementChild;
    expect(candidateHost).not.toBe(oldHost);
    expect(container.querySelector("[data-plan=old]")).not.toBe(oldNode);
    expect(container.textContent).toBe("candidate");
    expect(events).toEqual([
      "layout:old",
      "layout:candidate",
      "cleanup:old",
    ]);

    publication.dispose();
    expect(container.childElementCount).toBe(0);
    expect(events).toEqual([
      "layout:old",
      "layout:candidate",
      "cleanup:old",
      "cleanup:candidate",
    ]);
  });

  it("treats old-root cleanup failure after host cutover as observational", async () => {
    const container = containerV1();
    const events: string[] = [];
    const failures: unknown[] = [];
    const cleanupFailure = new Error("old cleanup failed");
    const publication = createReactLayoutPublicationV1<TestPlanV1>({
      container,
      render(plan) {
        return <LayoutProbeV1 plan={plan} events={events} />;
      },
      reportFailure: (error) => {
        failures.push(error);
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old", cleanupFailure });

    await expect(publication.publish(
      { label: "candidate" },
      new AbortController().signal,
    )).resolves.toBeUndefined();

    expect(container.textContent).toBe("candidate");
    expect(events).toEqual([
      "layout:old",
      "layout:candidate",
      "cleanup:old",
    ]);
    expect(failures).toContain(cleanupFailure);
  });

  it("stages against the exact shared dirty session before replacing the old Studio", async () => {
    const container = containerV1();
    const draft = createDraftStoreV1();
    const publication = createReactLayoutPublicationV1<TestPlanV1>({
      container,
      render(plan) {
        return <DraftStudioV1 plan={plan} draft={draft} />;
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });
    await act(async () => {
      draft.edit("dirty-unsaved");
    });
    const oldHost = container.firstElementChild;
    const oldNode = container.querySelector("[data-draft]");
    expect(container.textContent).toBe("old:dirty-unsaved");

    await expect(publication.publish(
      { label: "candidate", failRender: true },
      new AbortController().signal,
    )).rejects.toThrow("candidate rejected the dirty draft");

    expect(container.firstElementChild).toBe(oldHost);
    expect(container.querySelector("[data-draft]")).toBe(oldNode);
    expect(container.textContent).toBe("old:dirty-unsaved");
    expect(draft.getSnapshot()).toBe("dirty-unsaved");
  });

  it("keeps the real Studio scene session dirty when a bad binding fails in staging", async () => {
    const container = containerV1();
    const sceneIo = fakeStudioSceneIoV1();
    const motionIo = fakeStudioMotionIoV1();
    const candidateFailure = new Error("candidate renderer rejected dirty draft");
    const publication = createStudioToolingReactPublicationV1({
      container,
      reportFailure() {},
    });
    mountedPublications.push(publication);
    await publication.mount(studioPlanV1(sceneIo, motionIo, studioBindingV1()));

    await waitFor(() => {
      expect(within(container).getByLabelText("x")).toHaveValue(920);
    });
    const oldHost = container.firstElementChild;
    const oldInput = within(container).getByLabelText("x");
    fireEvent.change(oldInput, { target: { value: "640" } });
    await waitFor(() => {
      expect(within(container).getByLabelText("x")).toHaveValue(640);
      expect(within(container).getByRole("button", { name: "保存" })).toBeEnabled();
    });

    await expect(publication.publish(
      studioPlanV1(
        sceneIo,
        motionIo,
        studioBindingV1(({ entry }) => {
          if (entry.placement.x === 640) throw candidateFailure;
          return <span>{entry.contentId}</span>;
        }),
      ),
      new AbortController().signal,
    )).rejects.toBe(candidateFailure);

    expect(container.firstElementChild).toBe(oldHost);
    expect(within(container).getByLabelText("x")).toBe(oldInput);
    expect(within(container).getByLabelText("x")).toHaveValue(640);
    const save = within(container).getByRole("button", { name: "保存" });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(sceneIo.writes).toHaveLength(1));
    expect(sceneIo.writes[0]?.sceneDocument.entries[0]?.placement?.x).toBe(640);
  });
});

function LayoutProbeV1(props: {
  readonly plan: TestPlanV1;
  readonly events: string[];
}): ReactElement {
  useLayoutEffect(() => {
    props.events.push(`layout:${props.plan.label}`);
    props.plan.abortInLayout?.abort(new DOMException("candidate aborted", "AbortError"));
    if (props.plan.abortInMicrotask !== undefined) {
      queueMicrotask(() => {
        props.plan.abortInMicrotask?.abort(
          new DOMException("candidate aborted after acknowledgement", "AbortError"),
        );
      });
    }
    if (props.plan.failLayout === true) throw new Error(`layout failed:${props.plan.label}`);
    return () => {
      props.events.push(`cleanup:${props.plan.label}`);
      if (props.plan.cleanupFailure !== undefined) throw props.plan.cleanupFailure;
    };
  }, [props.events, props.plan]);
  return <div data-plan={props.plan.label}>{props.plan.label}</div>;
}

function InitialLayoutFailureV1(props: {
  readonly events: string[];
  readonly failure: Error;
}): ReactElement {
  return (
    <>
      <LayoutReadyV1 events={props.events} />
      <LayoutFailureV1 failure={props.failure} />
    </>
  );
}

function LayoutReadyV1(props: { readonly events: string[] }): ReactElement {
  useLayoutEffect(() => {
    props.events.push("layout:ready");
    return () => {
      props.events.push("cleanup:ready");
    };
  }, [props.events]);
  return <span>ready</span>;
}

function LayoutFailureV1(props: { readonly failure: Error }): ReactElement {
  useLayoutEffect(() => {
    throw props.failure;
  }, [props.failure]);
  return <span>failure</span>;
}

interface DraftStoreV1 {
  edit(value: string): void;
  getSnapshot(): string;
  subscribe(listener: () => void): () => void;
}

function createDraftStoreV1(): DraftStoreV1 {
  let value = "saved";
  const listeners = new Set<() => void>();
  return Object.freeze({
    edit(next: string) {
      value = next;
      for (const listener of listeners) listener();
    },
    getSnapshot: () => value,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
}

function DraftStudioV1(props: {
  readonly plan: TestPlanV1;
  readonly draft: DraftStoreV1;
}): ReactElement {
  const draft = useSyncExternalStore(
    props.draft.subscribe,
    props.draft.getSnapshot,
    props.draft.getSnapshot,
  );
  if (props.plan.failRender === true && draft === "dirty-unsaved") {
    throw new Error("candidate rejected the dirty draft");
  }
  return <div data-draft={draft}>{props.plan.label}:{draft}</div>;
}

const studioScenePathV1 = "src/scenes/publication/publication.scene.json";

interface FakeStudioSceneIoV1 extends SceneSourceIoV1 {
  readonly writes: Array<{
    readonly path: string;
    readonly expectedDigest: string;
    readonly sceneDocument: SceneDocumentV1;
  }>;
}

function studioSceneDocumentV1(): SceneDocumentV1 {
  return parseSceneDocumentV1({
    format: "sillymaker.scene",
    version: 1,
    sceneId: "scene.test.publication",
    label: "Publication",
    canvas: { width: 1280, height: 720 },
    entries: [{
      layerId: "layer.test.characters",
      tag: "tag.hero",
      contentId: "content.test.hero",
      zOrder: 10,
      placement: {
        x: 920,
        y: 600,
        scalePermille: 1000,
        opacityPermille: 1000,
        mirrored: false,
      },
    }],
    cues: [{ cueId: "cue.test.hero", kind: "show", tag: "tag.hero" }],
  });
}

function fakeStudioSceneIoV1(): FakeStudioSceneIoV1 {
  let saved = studioSceneDocumentV1();
  let digestRevision = 1;
  const writes: FakeStudioSceneIoV1["writes"] = [];
  return {
    writes,
    list: () =>
      Promise.resolve({
        kind: "ok" as const,
        scenes: [{
          path: studioScenePathV1,
          sceneId: saved.sceneId,
          label: saved.label,
        }],
        skipped: [],
      }),
    read: (path) =>
      path === studioScenePathV1
        ? Promise.resolve({
          kind: "ok" as const,
          digest: `sha256:${String(digestRevision)}`,
          sceneDocument: saved,
        })
        : Promise.resolve({ kind: "error" as const, code: "not_found" as const }),
    write(input) {
      writes.push(input);
      saved = input.sceneDocument;
      digestRevision += 1;
      return Promise.resolve({
        kind: "ok" as const,
        digest: `sha256:${String(digestRevision)}`,
      });
    },
    create: () => Promise.resolve({ kind: "error" as const, code: "unavailable" as const }),
  };
}

function fakeStudioMotionIoV1(): MotionSourceIoV1 {
  return {
    list: () => Promise.resolve({ kind: "ok", motions: [], skipped: [] }),
    read: () => Promise.resolve({ kind: "error", code: "not_found" }),
    write: () => Promise.resolve({ kind: "error", code: "unavailable" }),
    create: () => Promise.resolve({ kind: "error", code: "unavailable" }),
  };
}

function studioBindingV1(
  renderer: SemanticStageEntryRendererV1 = ({ entry }) => <span>{entry.contentId}</span>,
): StudioBindingV1 {
  const catalog: StageContentCatalogV1 = {
    resolveContent: () =>
      Object.freeze({
        rendererId: "renderer.test.box",
        assetIds: Object.freeze([]),
        accessibleName: "Hero",
        props: Object.freeze({}),
        geometry: Object.freeze({
          width: 200,
          height: 300,
          anchorXPermille: 500,
          anchorYPermille: 1000,
        }),
      }),
  };
  return Object.freeze({
    catalog,
    renderers: Object.freeze({ "renderer.test.box": renderer }),
  });
}

function studioPlanV1(
  sceneIo: SceneSourceIoV1,
  motionIo: MotionSourceIoV1,
  binding: StudioBindingV1,
): StudioToolingPlanV1 {
  return Object.freeze({ binding, sceneIo, motionIo });
}

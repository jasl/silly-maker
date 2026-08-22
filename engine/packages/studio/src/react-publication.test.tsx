// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { act, fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  parseMotionDocumentV1,
  parseRegionsDocumentV1,
  parseSceneDocumentV1,
} from "@sillymaker/base";
import type {
  MotionDocumentV1,
  RegionsDocumentV1,
  SceneDocumentV1,
  StageContentCatalogV1,
} from "@sillymaker/base";
import type { SemanticStageEntryRendererV1 } from "@sillymaker/ui";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";

import type { StudioToolingPlanV1 } from "./composition.ts";
import type { StudioBindingV1 } from "./core/binding.ts";
import { defineEmbeddedAuthoringCompanionInternalV1 } from "./core/embedded-authoring-companion.ts";
import type {
  EmbeddedAuthoringCompanionOwnerInternalV1,
  EmbeddedAuthoringCompanionRenderInputInternalV1,
} from "./core/embedded-authoring-companion.ts";
import type { RegionsSourceIoV1 } from "./core/regions-io.ts";
import type { SceneSourceIoV1 } from "./core/scene-io.ts";
import {
  createPersistentReactLayoutPublicationInternalV1,
  createReactLayoutPublicationV1,
  createStudioToolingReactPublicationInternalV1,
  createStudioToolingReactPublicationV1,
} from "./react-publication.tsx";
import type { PersistentReactLayoutRenderTargetInternalV1 } from "./react-publication.tsx";

interface TestPlanV1 {
  readonly label: string;
  readonly failRender?: boolean;
  readonly failLayout?: boolean;
  readonly abortInLayout?: AbortController;
  readonly abortInMicrotask?: AbortController;
  readonly cleanupFailure?: Error;
}

interface PersistentTestPlanV1 {
  readonly label: string;
  readonly failProbeLayout?: boolean;
  readonly failConnectedLayout?: boolean;
  readonly abortProbeInLayout?: {
    readonly controller: AbortController;
    readonly reason: unknown;
  };
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

  it("keeps the static boot shell until the initial layout commits, then retires it", async () => {
    const container = containerV1();
    const bootShell = document.createElement("div");
    bootShell.dataset.sillymakerBootShell = "pending";
    bootShell.setAttribute("role", "status");
    bootShell.setAttribute("aria-busy", "true");
    bootShell.textContent = "Studio is starting";
    container.append(bootShell);
    const publication = createReactLayoutPublicationV1<TestPlanV1>({
      container,
      render(plan) {
        return <LayoutProbeV1 plan={plan} events={[]} />;
      },
    });
    mountedPublications.push(publication);

    const mount = publication.mount({ label: "initial" });
    expect(container.firstElementChild).toBe(bootShell);
    expect(bootShell).toHaveAttribute("aria-busy", "true");

    await mount;
    expect(container.contains(bootShell)).toBe(false);
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

  it("preserves the static boot shell when the initial publication fails", async () => {
    const container = containerV1();
    const bootShell = document.createElement("div");
    bootShell.dataset.sillymakerBootShell = "pending";
    bootShell.textContent = "Studio is starting";
    container.append(bootShell);
    const publication = createReactLayoutPublicationV1<TestPlanV1>({
      container,
      render() {
        throw new Error("initial render failed");
      },
    });
    mountedPublications.push(publication);

    await expect(publication.mount({ label: "initial" })).rejects.toThrow(
      "initial render failed",
    );

    expect(container.childElementCount).toBe(1);
    expect(container.firstElementChild).toBe(bootShell);
    expect(container.textContent).toBe("Studio is starting");
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
      await Promise.resolve();
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

  it("reuses loaded Flow and the dirty Scene session across rejected and accepted successors", async () => {
    const container = containerV1();
    const sceneIo = fakeStudioSceneIoV1();
    const motionIo = fakeStudioMotionIoV1();
    const replacementMotionIo = fakeStudioMotionIoV1();
    const candidateFailure = new Error("candidate renderer rejected dirty draft");
    const flowDispose = vi.fn(() => Promise.resolve());
    const loadFlowWorkspace = vi.fn(() =>
      Promise.resolve(Object.freeze({
        consumer: Object.freeze({
          render() {
            return <section data-test-flow-implementation="ready">Flow implementation</section>;
          },
        }),
        dispose: flowDispose,
      }))
    );
    const publication = createStudioToolingReactPublicationInternalV1({
      container,
      reportFailure() {},
      loadFlowWorkspace,
    });
    mountedPublications.push(publication);
    await publication.mount(studioPlanV1(sceneIo, motionIo, studioFlowBindingV1()));

    await waitFor(() => {
      expect(within(container).getByLabelText("x")).toHaveValue(920);
    });
    fireEvent.click(within(container).getByRole("button", { name: "打开 Narrative 流程" }));
    await waitFor(() => {
      expect(container.querySelector("[data-test-flow-implementation=ready]")).not.toBeNull();
    });
    expect(loadFlowWorkspace).toHaveBeenCalledTimes(1);
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
        studioFlowBindingV1(({ entry }) => {
          if (entry.placement.x === 640) throw candidateFailure;
          return <span>{entry.contentId}</span>;
        }),
      ),
      new AbortController().signal,
    )).rejects.toBe(candidateFailure);

    expect(container.firstElementChild).toBe(oldHost);
    expect(within(container).getByLabelText("x")).toBe(oldInput);
    expect(within(container).getByLabelText("x")).toHaveValue(640);
    expect(loadFlowWorkspace).toHaveBeenCalledTimes(1);

    await expect(publication.publish(
      studioPlanV1(sceneIo, replacementMotionIo, studioFlowBindingV1()),
      new AbortController().signal,
    )).rejects.toThrow("cannot replace its motion IO owner");
    expect(container.firstElementChild).toBe(oldHost);
    expect(within(container).getByLabelText("x")).toBe(oldInput);
    expect(within(container).getByLabelText("x")).toHaveValue(640);

    await expect(publication.publish(
      studioPlanV1(sceneIo, motionIo, studioFlowBindingV1()),
      new AbortController().signal,
    )).resolves.toBeUndefined();

    expect(container.firstElementChild).toBe(oldHost);
    expect(container.querySelector("[data-test-flow-implementation=ready]")).not.toBeNull();
    expect(loadFlowWorkspace).toHaveBeenCalledTimes(1);
    expect(within(container).getByLabelText("x")).toBe(oldInput);
    expect(within(container).getByLabelText("x")).toHaveValue(640);
    const save = within(container).getByRole("button", { name: "保存" });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(sceneIo.writes).toHaveLength(1));
    expect(sceneIo.writes[0]?.sceneDocument.entries[0]?.placement?.x).toBe(640);

    publication.dispose();
    await waitFor(() => expect(flowDispose).toHaveBeenCalledTimes(1));
  });

  it("keeps the Regions IO owner and dirty session across rejected and accepted successors", async () => {
    const container = containerV1();
    const sceneIo = fakeStudioSceneIoV1();
    const motionIo = fakeStudioMotionIoV1();
    const regionsIo = fakeStudioRegionsIoV1();
    const replacementRegionsIo = fakeStudioRegionsIoV1();
    const publication = createStudioToolingReactPublicationV1({ container });
    mountedPublications.push(publication);
    await publication.mount(
      studioPlanV1(sceneIo, motionIo, studioBindingV1(), regionsIo),
    );

    const regionRow = await waitFor(() => {
      const row = container.querySelector('[data-studio-region-row="0"]');
      expect(row).not.toBeNull();
      return row as HTMLElement;
    });
    fireEvent.click(regionRow);
    const xInput = container.querySelector(
      '[data-studio-region-field="x"]',
    ) as HTMLInputElement;
    fireEvent.change(xInput, { target: { value: "25" } });
    await waitFor(() => {
      expect(xInput).toHaveValue(25);
      expect(container.querySelector("[data-studio-regions-save]")).toBeEnabled();
    });
    const oldHost = container.firstElementChild;

    await expect(publication.publish(
      studioPlanV1(sceneIo, motionIo, studioBindingV1(), replacementRegionsIo),
      new AbortController().signal,
    )).rejects.toThrow("cannot replace its regions IO owner");

    expect(container.firstElementChild).toBe(oldHost);
    expect(container.querySelector('[data-studio-region-field="x"]')).toBe(xInput);
    expect(xInput).toHaveValue(25);

    await expect(publication.publish(
      studioPlanV1(sceneIo, motionIo, studioBindingV1(), regionsIo),
      new AbortController().signal,
    )).resolves.toBeUndefined();

    expect(container.firstElementChild).toBe(oldHost);
    const successorRow = await waitFor(() => {
      const row = container.querySelector('[data-studio-region-row="0"]');
      expect(row).not.toBeNull();
      return row as HTMLElement;
    });
    expect(successorRow).toBe(regionRow);
    const successorXInput = container.querySelector(
      '[data-studio-region-field="x"]',
    ) as HTMLInputElement;
    expect(successorXInput).toBe(xInput);
    expect(successorXInput).toHaveValue(25);
    const save = container.querySelector("[data-studio-regions-save]") as HTMLButtonElement;
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(regionsIo.writes).toHaveLength(1));
    expect(regionsIo.writes[0]?.regionsDocument.regions[0]?.x).toBe(25);
    expect(replacementRegionsIo.writes).toHaveLength(0);
  });

  it("mounts the same Host in an input-isolated embedded shell with a dirty close gate", async () => {
    const container = containerV1();
    const sceneIo = fakeStudioSceneIoV1();
    const motionIo = fakeStudioMotionIoV1();
    const publication = createStudioToolingReactPublicationV1({
      container,
      mode: "embedded",
    });
    mountedPublications.push(publication);
    await publication.mount(studioPlanV1(sceneIo, motionIo, studioBindingV1()));

    const host = await waitFor(() => {
      const current = container.querySelector<HTMLElement>("[data-authoring-host]");
      expect(current).toHaveAttribute("data-authoring-host-ready", "connected");
      return current!;
    });
    expect(host).toHaveAttribute("data-native-text", "true");
    expect(container.querySelector("[data-embedded-authoring-shell]")).toHaveAttribute(
      "data-native-text",
      "true",
    );
    const xInput = await within(container).findByLabelText("x");
    fireEvent.change(xInput, { target: { value: "640" } });
    await waitFor(() => expect(xInput).toHaveValue(640));

    fireEvent.click(container.querySelector("[data-embedded-authoring-close]") as HTMLElement);
    await waitFor(() =>
      expect(container.querySelector("[data-embedded-authoring-close-confirm]")).not.toBeNull()
    );
    fireEvent.click(
      container.querySelector("[data-embedded-authoring-close-cancel]") as HTMLElement,
    );
    expect(container.querySelector("[data-embedded-authoring-panel]")).not.toHaveAttribute(
      "hidden",
    );
    expect(within(container).getByLabelText("x")).toBe(xInput);
    expect(xInput).toHaveValue(640);

    fireEvent.click(container.querySelector("[data-embedded-authoring-close]") as HTMLElement);
    fireEvent.click(await within(container).findByRole("button", { name: "放弃并关闭" }));
    await waitFor(() =>
      expect(container.querySelector("[data-embedded-authoring-panel]")).toHaveAttribute("hidden")
    );
    expect(xInput).toHaveValue(920);

    fireEvent.click(container.querySelector("[data-embedded-authoring-open]") as HTMLElement);
    expect(container.querySelector("[data-embedded-authoring-panel]")).not.toHaveAttribute(
      "hidden",
    );
    expect(within(container).getByLabelText("x")).toBe(xInput);
    expect(xInput).toHaveValue(920);

    fireEvent.change(xInput, { target: { value: "700" } });
    fireEvent.click(container.querySelector("[data-embedded-authoring-close]") as HTMLElement);
    fireEvent.click(await within(container).findByRole("button", { name: "保存并关闭" }));
    await waitFor(() => expect(sceneIo.writes).toHaveLength(1));
    await waitFor(() =>
      expect(container.querySelector("[data-embedded-authoring-panel]")).toHaveAttribute("hidden")
    );
    expect(sceneIo.writes[0]?.sceneDocument.entries[0]?.placement?.x).toBe(700);
  });

  it("retains one selected companion owner across compatible successors", async () => {
    const container = containerV1();
    const sceneIo = fakeStudioSceneIoV1();
    const motionIo = fakeStudioMotionIoV1();
    const initialBinding = studioBindingV1();
    const successorBinding = studioBindingV1();
    const incompatibleBinding = studioBindingV1();
    const disposeOwner = vi.fn(() => Promise.resolve());
    const owner = Object.freeze({
      identity: "companion.owner.1",
      dispose: disposeOwner,
    });
    const createInitialOwner = vi.fn(() => owner);
    const createSuccessorOwner = vi.fn(() => {
      throw new Error("compatible successor must not create a second owner");
    });
    const companion = (
      label: string,
      contentSignature: string,
      createOwner: () => EmbeddedAuthoringCompanionOwnerInternalV1,
    ) =>
      Object.freeze({
        compatibilityId: "test.authoring.companion",
        contentSignature,
        createOwner,
        render(selectedOwner: EmbeddedAuthoringCompanionOwnerInternalV1) {
          expect(selectedOwner).toBe(owner);
          return <aside data-test-companion={label}>{label}</aside>;
        },
      });
    defineEmbeddedAuthoringCompanionInternalV1(
      initialBinding,
      companion("initial", "actions.v1", createInitialOwner),
    );
    defineEmbeddedAuthoringCompanionInternalV1(
      successorBinding,
      companion("successor", "actions.v1", createSuccessorOwner),
    );
    defineEmbeddedAuthoringCompanionInternalV1(
      incompatibleBinding,
      companion("incompatible", "actions.v2", createSuccessorOwner),
    );
    const publication = createStudioToolingReactPublicationV1({
      container,
      mode: "embedded",
    });
    mountedPublications.push(publication);
    await publication.mount(studioPlanV1(sceneIo, motionIo, initialBinding));

    expect(container.querySelector("[data-test-companion=initial]")).not.toBeNull();
    expect(createInitialOwner).toHaveBeenCalledTimes(1);

    await publication.publish(
      studioPlanV1(sceneIo, motionIo, successorBinding),
      new AbortController().signal,
    );
    expect(container.querySelector("[data-test-companion=successor]")).not.toBeNull();
    expect(createInitialOwner).toHaveBeenCalledTimes(1);
    expect(createSuccessorOwner).not.toHaveBeenCalled();

    await expect(publication.publish(
      studioPlanV1(sceneIo, motionIo, incompatibleBinding),
      new AbortController().signal,
    )).rejects.toThrow("cannot replace its embedded companion owner or contract");
    expect(container.querySelector("[data-test-companion=successor]")).not.toBeNull();
    expect(disposeOwner).not.toHaveBeenCalled();

    publication.dispose();
    await waitFor(() => expect(disposeOwner).toHaveBeenCalledTimes(1));
  });

  it("retires the selected companion when a visible candidate and rollback both fail", async () => {
    const container = containerV1();
    const sceneIo = fakeStudioSceneIoV1();
    const motionIo = fakeStudioMotionIoV1();
    const initialBinding = studioBindingV1();
    const candidateBinding = studioBindingV1();
    const candidateFailure = new Error("companion candidate render failed");
    const rollbackFailure = new Error("companion rollback render failed");
    const disposeOwner = vi.fn(() => Promise.resolve());
    const owner = Object.freeze({ dispose: disposeOwner });
    let initialVisibleRenders = 0;
    defineEmbeddedAuthoringCompanionInternalV1(
      initialBinding,
      Object.freeze({
        compatibilityId: "test.authoring.terminal-companion",
        contentSignature: "actions.v1",
        createOwner: () => owner,
        render(
          _owner: EmbeddedAuthoringCompanionOwnerInternalV1,
          input: EmbeddedAuthoringCompanionRenderInputInternalV1,
        ) {
          if (input.publicationRole === "visible") {
            initialVisibleRenders += 1;
            if (initialVisibleRenders > 1) throw rollbackFailure;
          }
          return <aside>initial companion</aside>;
        },
      }),
    );
    defineEmbeddedAuthoringCompanionInternalV1(
      candidateBinding,
      Object.freeze({
        compatibilityId: "test.authoring.terminal-companion",
        contentSignature: "actions.v1",
        createOwner() {
          throw new Error("candidate must reuse the predecessor owner");
        },
        render(
          _owner: EmbeddedAuthoringCompanionOwnerInternalV1,
          input: EmbeddedAuthoringCompanionRenderInputInternalV1,
        ) {
          if (input.publicationRole === "visible") throw candidateFailure;
          return <aside>candidate companion probe</aside>;
        },
      }),
    );
    const publication = createStudioToolingReactPublicationV1({
      container,
      mode: "embedded",
    });
    mountedPublications.push(publication);
    await publication.mount(studioPlanV1(sceneIo, motionIo, initialBinding));

    let rejection: unknown;
    try {
      await publication.publish(
        studioPlanV1(sceneIo, motionIo, candidateBinding),
        new AbortController().signal,
      );
    } catch (error) {
      rejection = error;
    }

    expect(rejection).toBeInstanceOf(AggregateError);
    expect((rejection as AggregateError).errors).toEqual([candidateFailure, rollbackFailure]);
    await waitFor(() => expect(disposeOwner).toHaveBeenCalledTimes(1));
    expect(container.childElementCount).toBe(0);
    await expect(publication.publish(
      studioPlanV1(sceneIo, motionIo, initialBinding),
      new AbortController().signal,
    )).rejects.toMatchObject({ name: "AbortError" });
    publication.dispose();
    expect(disposeOwner).toHaveBeenCalledTimes(1);
  });

  it("aggregates a Motion-only draft into the Host close and beforeunload gates", async () => {
    const container = containerV1();
    const motionDocument = studioMotionDocumentV1();
    const sceneIo = fakeStudioSceneIoV1(studioSceneDocumentV1(motionDocument.motionId));
    const motionIo = fakeStudioMotionIoV1(motionDocument);
    const publication = createStudioToolingReactPublicationV1({
      container,
      mode: "embedded",
    });
    mountedPublications.push(publication);
    await publication.mount(studioPlanV1(sceneIo, motionIo, studioBindingV1()));

    const openMotion = await waitFor(() => {
      const current = container.querySelector<HTMLElement>(
        '[data-motion-workbench-case="cue.test.hero"]',
      );
      expect(current).not.toBeNull();
      return current!;
    });
    fireEvent.click(openMotion);
    const duration = await waitFor(() => {
      const current = container.querySelector<HTMLInputElement>("[data-workbench-duration]");
      expect(current).not.toBeNull();
      return current!;
    });
    fireEvent.change(duration, { target: { value: "470" } });
    await waitFor(() =>
      expect(container.querySelector("[data-workbench-save]")).not.toBeDisabled()
    );

    // Removing the only motion-bearing cue makes the freshly derived preview
    // model empty. The visible Host must retain the committed Workbench until
    // its exact dirty selection is explicitly resolved.
    fireEvent.click(
      container.querySelector('[data-studio-remove-cue="cue.test.hero"]') as HTMLElement,
    );
    await waitFor(() =>
      expect(container.querySelector('[data-studio-cue="cue.test.hero"]')).toBeNull()
    );
    expect(container.querySelector("[data-workbench-duration]")).toBe(duration);
    expect(duration).toHaveValue(470);

    fireEvent.click(container.querySelector("[data-embedded-authoring-close]") as HTMLElement);
    await waitFor(() =>
      expect(container.querySelector("[data-embedded-authoring-close-confirm]")).not.toBeNull()
    );
    fireEvent.click(
      container.querySelector("[data-embedded-authoring-close-cancel]") as HTMLElement,
    );
    expect(duration).toHaveValue(470);

    fireEvent.click(container.querySelector("[data-studio-undo]") as HTMLElement);
    await waitFor(() =>
      expect(container.querySelector('[data-studio-cue="cue.test.hero"]')).not.toBeNull()
    );
    expect(container.querySelector("[data-workbench-duration]")).toBe(duration);
    expect(duration).toHaveValue(470);
    expect(container.querySelector("[data-studio-save]")).toBeDisabled();

    const beforeUnload = new Event("beforeunload", { cancelable: true });
    globalThis.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);

    fireEvent.click(container.querySelector("[data-embedded-authoring-close]") as HTMLElement);
    fireEvent.click(await within(container).findByRole("button", { name: "放弃并关闭" }));
    await waitFor(() =>
      expect(container.querySelector("[data-embedded-authoring-panel]")).toHaveAttribute("hidden")
    );
    expect(duration).toHaveValue(300);
  });
});

describe("persistent Studio React layout publication", () => {
  it("mounts the initial root visibly and identifies visible rendering", async () => {
    const container = containerV1();
    const events: string[] = [];
    const renderTargets: string[] = [];
    const publication = createPersistentReactLayoutPublicationInternalV1<PersistentTestPlanV1>({
      container,
      render(plan, target) {
        renderTargets.push(`${plan.label}:${target}`);
        return <PersistentStateProbeV1 plan={plan} target={target} events={events} />;
      },
    });
    mountedPublications.push(publication);

    const mounting = publication.mount({ label: "initial" });
    expect(container.querySelector("[data-sillymaker-studio-epoch=current]")).not.toBeNull();

    await mounting;
    expect(renderTargets).toEqual(["initial:visible"]);
    expect(events).toEqual(["layout:initial:visible:connected"]);
    expect(container.textContent).toBe("initial:0");
  });

  it("probes detached, then reuses the visible root and component state", async () => {
    const container = containerV1();
    const events: string[] = [];
    const renderTargets: string[] = [];
    const publication = createPersistentReactLayoutPublicationInternalV1<PersistentTestPlanV1>({
      container,
      render(plan, target) {
        renderTargets.push(`${plan.label}:${target}`);
        return <PersistentStateProbeV1 plan={plan} target={target} events={events} />;
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });
    const oldHost = container.firstElementChild;
    const oldButton = container.querySelector("[data-persistent-state]") as HTMLButtonElement;
    fireEvent.click(oldButton);
    fireEvent.click(oldButton);
    expect(oldButton).toHaveTextContent("old:2");

    await publication.publish({ label: "candidate" }, new AbortController().signal);

    expect(container.firstElementChild).toBe(oldHost);
    expect(container.querySelector("[data-persistent-state]")).toBe(oldButton);
    expect(oldButton).toHaveTextContent("candidate:2");
    expect(renderTargets).toEqual([
      "old:visible",
      "candidate:probe",
      "candidate:visible",
    ]);
    expect(events).toEqual([
      "layout:old:visible:connected",
      "layout:candidate:probe:connected",
      "cleanup:candidate:probe",
      "cleanup:old:visible",
      "layout:candidate:visible:connected",
    ]);
  });

  it("leaves the exact current root and state untouched on failed or aborted probes", async () => {
    const container = containerV1();
    const events: string[] = [];
    const renderTargets: string[] = [];
    const publication = createPersistentReactLayoutPublicationInternalV1<PersistentTestPlanV1>({
      container,
      render(plan, target) {
        renderTargets.push(`${plan.label}:${target}`);
        return <PersistentStateProbeV1 plan={plan} target={target} events={events} />;
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });
    const oldHost = container.firstElementChild;
    const oldButton = container.querySelector("[data-persistent-state]") as HTMLButtonElement;
    fireEvent.click(oldButton);

    await expect(publication.publish(
      { label: "failed", failProbeLayout: true },
      new AbortController().signal,
    )).rejects.toThrow("probe layout failed:failed");
    expect(container.firstElementChild).toBe(oldHost);
    expect(container.querySelector("[data-persistent-state]")).toBe(oldButton);
    expect(oldButton).toHaveTextContent("old:1");

    const abort = new AbortController();
    const abortReason = new DOMException("probe cancelled", "AbortError");
    await expect(publication.publish(
      { label: "aborted", abortProbeInLayout: { controller: abort, reason: abortReason } },
      abort.signal,
    )).rejects.toBe(abortReason);
    expect(container.firstElementChild).toBe(oldHost);
    expect(container.querySelector("[data-persistent-state]")).toBe(oldButton);
    expect(oldButton).toHaveTextContent("old:1");
    expect(renderTargets).toEqual([
      "old:visible",
      "failed:probe",
      "aborted:probe",
    ]);
  });

  it("rejects a connected-layout candidate before touching the visible root", async () => {
    const container = containerV1();
    const events: string[] = [];
    const publication = createPersistentReactLayoutPublicationInternalV1<PersistentTestPlanV1>({
      container,
      render(plan, target) {
        return <PersistentStateProbeV1 plan={plan} target={target} events={events} />;
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });
    const oldHost = container.firstElementChild;
    const oldButton = container.querySelector("[data-persistent-state]") as HTMLButtonElement;
    fireEvent.click(oldButton);
    expect(oldButton).toHaveTextContent("old:1");

    await expect(publication.publish(
      { label: "bad-connected", failConnectedLayout: true },
      new AbortController().signal,
    )).rejects.toThrow("connected layout failed:bad-connected");

    expect(container.firstElementChild).toBe(oldHost);
    expect(container.querySelector("[data-persistent-state]")).toBe(oldButton);
    expect(container.textContent).toBe("old:1");
  });

  it("rolls a visible render-factory failure back without replacing local state", async () => {
    const container = containerV1();
    const events: string[] = [];
    const visibleFailure = new Error("visible render factory failed");
    const publication = createPersistentReactLayoutPublicationInternalV1<PersistentTestPlanV1>({
      container,
      render(plan, target) {
        if (target === "visible" && plan.label === "bad-visible") throw visibleFailure;
        return <PersistentStateProbeV1 plan={plan} target={target} events={events} />;
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });
    const oldHost = container.firstElementChild;
    const oldButton = container.querySelector("[data-persistent-state]") as HTMLButtonElement;
    fireEvent.click(oldButton);
    expect(oldButton).toHaveTextContent("old:1");

    await expect(publication.publish(
      { label: "bad-visible" },
      new AbortController().signal,
    )).rejects.toBe(visibleFailure);

    expect(container.firstElementChild).toBe(oldHost);
    expect(container.querySelector("[data-persistent-state]")).toBe(oldButton);
    expect(container.textContent).toBe("old:1");
    await expect(publication.publish(
      { label: "recovered" },
      new AbortController().signal,
    )).resolves.toBeUndefined();
    expect(container.firstElementChild).toBe(oldHost);
    expect(container.querySelector("[data-persistent-state]")).toBe(oldButton);
    expect(container.textContent).toBe("recovered:1");
  });

  it("disposes itself when both a visible candidate and its rollback fail", async () => {
    const container = containerV1();
    const candidateFailure = new Error("candidate render failed");
    const rollbackFailure = new Error("rollback render failed");
    const onTerminalFailure = vi.fn();
    let oldVisibleRenders = 0;
    const publication = createPersistentReactLayoutPublicationInternalV1<PersistentTestPlanV1>({
      container,
      onTerminalFailure,
      render(plan, target) {
        if (target === "visible" && plan.label === "old") {
          oldVisibleRenders += 1;
          if (oldVisibleRenders > 1) throw rollbackFailure;
        }
        if (target === "visible" && plan.label === "bad") throw candidateFailure;
        return <div>{plan.label}</div>;
      },
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });

    let rejection: unknown;
    try {
      await publication.publish({ label: "bad" }, new AbortController().signal);
    } catch (error) {
      rejection = error;
    }

    expect(rejection).toBeInstanceOf(AggregateError);
    expect((rejection as AggregateError).errors).toEqual([candidateFailure, rollbackFailure]);
    expect(onTerminalFailure).toHaveBeenCalledTimes(1);
    expect(container.childElementCount).toBe(0);
    await expect(publication.publish(
      { label: "later" },
      new AbortController().signal,
    )).rejects.toMatchObject({ name: "AbortError" });
    await expect(publication.mount({ label: "later" })).rejects.toMatchObject({
      name: "AbortError",
    });
    publication.dispose();
    expect(onTerminalFailure).toHaveBeenCalledTimes(1);
  });

  it("rejects concurrent publication and aborts in-flight work on dispose", async () => {
    const container = containerV1();
    const publication = createPersistentReactLayoutPublicationInternalV1<PersistentTestPlanV1>({
      container,
      render: (plan, target) => <PersistentStateProbeV1 plan={plan} target={target} events={[]} />,
    });
    mountedPublications.push(publication);
    await publication.mount({ label: "old" });

    const first = publication.publish({ label: "first" }, new AbortController().signal);
    await expect(publication.publish(
      { label: "concurrent" },
      new AbortController().signal,
    )).rejects.toThrow("already in progress");
    await first;

    const inFlight = publication.publish({ label: "disposed" }, new AbortController().signal);
    publication.dispose();
    await expect(inFlight).rejects.toMatchObject({ name: "AbortError" });
    expect(container.childElementCount).toBe(0);
  });
});

function PersistentStateProbeV1(props: {
  readonly plan: PersistentTestPlanV1;
  readonly target: PersistentReactLayoutRenderTargetInternalV1;
  readonly events: string[];
}): ReactElement {
  const [count, setCount] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const connected = buttonRef.current?.isConnected === true ? "connected" : "detached";
    props.events.push(`layout:${props.plan.label}:${props.target}:${connected}`);
    if (props.target === "probe") {
      const abort = props.plan.abortProbeInLayout;
      abort?.controller.abort(abort.reason);
      if (props.plan.failProbeLayout === true) {
        throw new Error(`probe layout failed:${props.plan.label}`);
      }
    }
    if (connected === "connected" && props.plan.failConnectedLayout === true) {
      throw new Error(`connected layout failed:${props.plan.label}`);
    }
    return () => {
      props.events.push(`cleanup:${props.plan.label}:${props.target}`);
    };
  }, [props.events, props.plan, props.target]);
  return (
    <button
      ref={buttonRef}
      data-persistent-state
      type="button"
      onClick={() => setCount((value) => value + 1)}
    >
      {props.plan.label}:{count}
    </button>
  );
}

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
const studioRegionsPathV1 = "src/regions/publication.regions.json";

interface FakeStudioSceneIoV1 extends SceneSourceIoV1 {
  readonly writes: Array<{
    readonly path: string;
    readonly expectedDigest: string;
    readonly sceneDocument: SceneDocumentV1;
  }>;
}

function studioSceneDocumentV1(motionId?: string): SceneDocumentV1 {
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
    cues: [{
      cueId: "cue.test.hero",
      kind: "show",
      tag: "tag.hero",
      ...(motionId === undefined ? {} : { motionId }),
    }],
  });
}

function fakeStudioSceneIoV1(
  initial: SceneDocumentV1 = studioSceneDocumentV1(),
): FakeStudioSceneIoV1 {
  let saved = initial;
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

interface FakeStudioRegionsIoV1 extends RegionsSourceIoV1 {
  readonly writes: Array<{
    readonly path: string;
    readonly expectedDigest: string;
    readonly regionsDocument: RegionsDocumentV1;
  }>;
}

function studioRegionsDocumentV1(): RegionsDocumentV1 {
  return parseRegionsDocumentV1({
    format: "sillymaker.regions",
    version: 1,
    regionsId: "regions.test.publication",
    label: "Publication regions",
    regions: [{
      regionId: "zone.hero",
      accessibleNameText: "Hero",
      x: 0,
      y: -300,
      width: 100,
      height: 80,
    }],
  });
}

function fakeStudioRegionsIoV1(): FakeStudioRegionsIoV1 {
  let saved = studioRegionsDocumentV1();
  let digestRevision = 1;
  const writes: FakeStudioRegionsIoV1["writes"] = [];
  return {
    writes,
    list: () =>
      Promise.resolve({
        kind: "ok" as const,
        regionsDocuments: [{
          path: studioRegionsPathV1,
          regionsId: saved.regionsId,
          label: saved.label,
        }],
        skipped: [],
      }),
    read: (path) =>
      path === studioRegionsPathV1
        ? Promise.resolve({
          kind: "ok" as const,
          digest: `sha256:${String(digestRevision)}`,
          regionsDocument: saved,
        })
        : Promise.resolve({ kind: "error" as const, code: "not_found" as const }),
    write(input) {
      writes.push(input);
      saved = input.regionsDocument;
      digestRevision += 1;
      return Promise.resolve({
        kind: "ok" as const,
        digest: `sha256:${String(digestRevision)}`,
      });
    },
    create: () => Promise.resolve({ kind: "error" as const, code: "unavailable" as const }),
  };
}

function studioMotionDocumentV1(): MotionDocumentV1 {
  return parseMotionDocumentV1({
    format: "sillymaker.motion",
    version: 1,
    motionId: "motion.test.publication",
    label: "Publication motion",
    durationMs: 300,
    delayMs: 0,
    tracks: [{
      channel: "offsetY",
      keyframes: [
        { atPermille: 0, value: 120 },
        { atPermille: 1000, value: 0 },
      ],
    }],
  });
}

function fakeStudioMotionIoV1(
  motionDocument?: MotionDocumentV1,
): MotionSourceIoV1 {
  const path = "src/scenes/publication/publication.motion.json";
  return {
    list: () =>
      Promise.resolve({
        kind: "ok",
        motions: motionDocument === undefined
          ? []
          : [{ path, motionId: motionDocument.motionId, label: motionDocument.label }],
        skipped: [],
      }),
    read: (requestedPath) =>
      requestedPath === path && motionDocument !== undefined
        ? Promise.resolve({ kind: "ok", digest: "sha256:1", motionDocument })
        : Promise.resolve({ kind: "error", code: "not_found" }),
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

function studioFlowBindingV1(
  renderer: SemanticStageEntryRendererV1 = ({ entry }) => <span>{entry.contentId}</span>,
): StudioBindingV1 {
  return Object.freeze({
    ...studioBindingV1(renderer),
    flow: Object.freeze({
      nodes: Object.freeze([]),
      edges: Object.freeze([]),
    }),
  });
}

function studioPlanV1(
  sceneIo: SceneSourceIoV1,
  motionIo: MotionSourceIoV1,
  binding: StudioBindingV1,
  regionsIo?: RegionsSourceIoV1,
): StudioToolingPlanV1 {
  return Object.freeze({
    binding,
    sceneIo,
    motionIo,
    ...(regionsIo === undefined ? {} : { regionsIo }),
  });
}

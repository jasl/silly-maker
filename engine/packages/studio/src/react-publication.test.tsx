// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  parseChromeLayoutDocumentV1,
  parseMotionDocumentV1,
  parseRegionsDocumentV1,
  parseSceneDocumentV1,
} from "@sillymaker/base";
import type {
  ChromeLayoutDocumentV1,
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
import type { ChromeLayoutSourceIoV1 } from "./core/chrome-layout-io.ts";
import type { RegionsSourceIoV1 } from "./core/regions-io.ts";
import type { SceneSourceIoV1 } from "./core/scene-io.ts";
import {
  createPersistentReactLayoutPublicationInternalV1,
  createStudioToolingReactPublicationInternalV1,
  createStudioToolingReactPublicationV1,
} from "./react-publication.tsx";
import type { PersistentReactLayoutRenderTargetInternalV1 } from "./react-publication.tsx";

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

describe("Studio tooling React publication", () => {
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

  it("keeps the Chrome IO owner and dirty session across rejected and accepted successors", async () => {
    const container = containerV1();
    const sceneIo = fakeStudioSceneIoV1();
    const motionIo = fakeStudioMotionIoV1();
    const chromeIo = fakeStudioChromeIoV1();
    const replacementChromeIo = fakeStudioChromeIoV1();
    const publication = createStudioToolingReactPublicationV1({ container });
    mountedPublications.push(publication);
    await publication.mount(
      studioPlanV1(sceneIo, motionIo, studioBindingV1(), undefined, chromeIo),
    );

    const chromeRow = await waitFor(() => {
      const row = container.querySelector('[data-studio-chrome-row="boxes:chip"]');
      expect(row).not.toBeNull();
      return row as HTMLElement;
    });
    fireEvent.click(chromeRow);
    const xInput = container.querySelector(
      '[data-studio-chrome-field="x"]',
    ) as HTMLInputElement;
    fireEvent.change(xInput, { target: { value: "75" } });
    await waitFor(() => {
      expect(xInput).toHaveValue(75);
      expect(container.querySelector("[data-studio-chrome-save]")).toBeEnabled();
    });
    const oldHost = container.firstElementChild;

    await expect(publication.publish(
      studioPlanV1(
        sceneIo,
        motionIo,
        studioBindingV1(),
        undefined,
        replacementChromeIo,
      ),
      new AbortController().signal,
    )).rejects.toThrow("cannot replace its chrome IO owner");

    expect(container.firstElementChild).toBe(oldHost);
    expect(container.querySelector('[data-studio-chrome-field="x"]')).toBe(xInput);
    expect(xInput).toHaveValue(75);

    await expect(publication.publish(
      studioPlanV1(sceneIo, motionIo, studioBindingV1(), undefined, chromeIo),
      new AbortController().signal,
    )).resolves.toBeUndefined();

    expect(container.firstElementChild).toBe(oldHost);
    expect(container.querySelector('[data-studio-chrome-row="boxes:chip"]')).toBe(chromeRow);
    expect(container.querySelector('[data-studio-chrome-field="x"]')).toBe(xInput);
    expect(xInput).toHaveValue(75);
    fireEvent.click(container.querySelector("[data-studio-chrome-save]") as HTMLElement);
    await waitFor(() => expect(chromeIo.writes).toHaveLength(1));
    expect(chromeIo.writes[0]?.chromeLayoutDocument.boxes["chip"]?.x).toBe(75);
    expect(replacementChromeIo.writes).toHaveLength(0);
  });

  it("includes a Chrome-only dirty draft in the embedded close gate", async () => {
    const container = containerV1();
    const sceneIo = fakeStudioSceneIoV1();
    const motionIo = fakeStudioMotionIoV1();
    const chromeIo = fakeStudioChromeIoV1();
    const publication = createStudioToolingReactPublicationV1({
      container,
      mode: "embedded",
    });
    mountedPublications.push(publication);
    await publication.mount(
      studioPlanV1(sceneIo, motionIo, studioBindingV1(), undefined, chromeIo),
    );

    const chromeRow = await waitFor(() => {
      const row = container.querySelector('[data-studio-chrome-row="boxes:chip"]');
      expect(row).not.toBeNull();
      return row as HTMLElement;
    });
    fireEvent.click(chromeRow);
    const xInput = container.querySelector(
      '[data-studio-chrome-field="x"]',
    ) as HTMLInputElement;
    fireEvent.change(xInput, { target: { value: "90" } });
    const close = container.querySelector("[data-embedded-authoring-close]") as HTMLElement;
    await waitFor(() =>
      expect(close).toHaveAttribute("aria-label", "关闭内嵌创作（有未保存修改）")
    );

    fireEvent.click(close);
    await waitFor(() =>
      expect(container.querySelector("[data-embedded-authoring-close-confirm]")).not.toBeNull()
    );
    fireEvent.click(
      container.querySelector("[data-embedded-authoring-close-cancel]") as HTMLElement,
    );
    expect(container.querySelector("[data-embedded-authoring-panel]")).not.toHaveAttribute(
      "hidden",
    );
    expect(container.querySelector('[data-studio-chrome-field="x"]')).toBe(xInput);
    expect(xInput).toHaveValue(90);

    fireEvent.click(close);
    fireEvent.click(await within(container).findByRole("button", { name: "保存并关闭" }));
    await waitFor(() => expect(chromeIo.writes).toHaveLength(1));
    await waitFor(() =>
      expect(container.querySelector("[data-embedded-authoring-panel]")).toHaveAttribute("hidden")
    );
    expect(chromeIo.writes[0]?.chromeLayoutDocument.boxes["chip"]?.x).toBe(90);
    expect(sceneIo.writes).toHaveLength(0);
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

const studioScenePathV1 = "src/scenes/publication/publication.scene.json";
const studioRegionsPathV1 = "src/regions/publication.regions.json";
const studioChromePathV1 = "src/chrome/publication.chrome-layout.json";

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

interface FakeStudioChromeIoV1 extends ChromeLayoutSourceIoV1 {
  readonly writes: Array<{
    readonly path: string;
    readonly expectedDigest: string;
    readonly chromeLayoutDocument: ChromeLayoutDocumentV1;
  }>;
}

function studioChromeDocumentV1(): ChromeLayoutDocumentV1 {
  return parseChromeLayoutDocumentV1({
    format: "sillymaker.chrome-layout",
    version: 1,
    layoutId: "layout.test.publication",
    label: "Publication chrome",
    canvas: { width: 1280, height: 720 },
    boxes: { chip: { x: 40, y: 30, width: 120, height: 48 } },
    anchors: {},
    offsets: {},
  });
}

function fakeStudioChromeIoV1(): FakeStudioChromeIoV1 {
  let saved = studioChromeDocumentV1();
  let digestRevision = 1;
  const writes: FakeStudioChromeIoV1["writes"] = [];
  return {
    writes,
    list: () =>
      Promise.resolve({
        kind: "ok" as const,
        chromeLayouts: [{
          path: studioChromePathV1,
          layoutId: saved.layoutId,
          label: saved.label,
        }],
        skipped: [],
      }),
    read: (path) =>
      path === studioChromePathV1
        ? Promise.resolve({
          kind: "ok" as const,
          digest: `sha256:${String(digestRevision)}`,
          chromeLayoutDocument: saved,
        })
        : Promise.resolve({ kind: "error" as const, code: "not_found" as const }),
    write(input) {
      writes.push(input);
      saved = input.chromeLayoutDocument;
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
  chromeIo?: ChromeLayoutSourceIoV1,
): StudioToolingPlanV1 {
  return Object.freeze({
    binding,
    sceneIo,
    motionIo,
    ...(regionsIo === undefined ? {} : { regionsIo }),
    ...(chromeIo === undefined ? {} : { chromeIo }),
  });
}

// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { parseSceneDocumentV1 } from "@sillymaker/base";
import type { SceneDocumentV1 } from "@sillymaker/base";
import {
  createFixedBootstrapEntropyV1,
  createMemoryHostRecordStoreV1,
} from "@sillymaker/base/testkit";
import { createStudioToolingReactPublicationV1 } from "@sillymaker/studio/composition";
import type {
  StudioToolingPlanV1,
  StudioToolingReactPublicationV1,
} from "@sillymaker/studio/composition";
import type { SceneSourceIoV1 } from "@sillymaker/studio";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";
import type {
  StartedWebGameApplicationV1,
  StartWebGameApplicationOptionsV1,
} from "@sillymaker/web";

import { labGameApplicationV1 } from "../application/composition.tsx";
import procedureSceneSourceV1 from "../scenes/procedure/procedure.scene.json" with {
  type: "json",
};
import { labStudioBindingV1 } from "../tooling/studio-binding.tsx";

const procedureScenePathV1 = "src/scenes/procedure/procedure.scene.json";
const alphaTagV1 = "tag.e2e.alpha";

interface AuthoringSceneIoFixtureV1 extends SceneSourceIoV1 {
  readonly writes: Array<{
    readonly path: string;
    readonly expectedDigest: string;
    readonly sceneDocument: SceneDocumentV1;
  }>;
}

interface MountedAuthoringSiblingV1 {
  readonly container: HTMLElement;
  readonly publication: StudioToolingReactPublicationV1;
  readonly sceneIo: AuthoringSceneIoFixtureV1;
}

interface DirtyAuthoringViewV1 {
  readonly host: HTMLElement;
  readonly entrySelect: HTMLSelectElement;
  readonly xInput: HTMLInputElement;
  readonly undo: HTMLButtonElement;
  readonly redo: HTMLButtonElement;
  readonly save: HTMLButtonElement;
}

const mountedAuthoringSiblingsV1: MountedAuthoringSiblingV1[] = [];
const startedApplicationsV1: StartedWebGameApplicationV1[] = [];

afterEach(async () => {
  for (const started of startedApplicationsV1.splice(0).toReversed()) {
    await started.dispose();
  }
  for (const sibling of mountedAuthoringSiblingsV1.splice(0).toReversed()) {
    sibling.publication.dispose();
  }
  document.body.replaceChildren();
});

function createAuthoringSceneIoV1(): AuthoringSceneIoFixtureV1 {
  let saved = parseSceneDocumentV1(procedureSceneSourceV1, `/${procedureScenePathV1}`);
  let digestRevision = 1;
  const writes: AuthoringSceneIoFixtureV1["writes"] = [];
  return Object.freeze({
    writes,
    list: () =>
      Promise.resolve({
        kind: "ok" as const,
        scenes: Object.freeze([{
          path: procedureScenePathV1,
          sceneId: saved.sceneId,
          label: saved.label,
        }]),
        skipped: Object.freeze([]),
      }),
    read: (path: string) =>
      path === procedureScenePathV1
        ? Promise.resolve({
          kind: "ok" as const,
          digest: `sha256:${String(digestRevision)}`,
          sceneDocument: saved,
        })
        : Promise.resolve({ kind: "error" as const, code: "not_found" as const }),
    write(input: Parameters<SceneSourceIoV1["write"]>[0]) {
      writes.push(input);
      saved = input.sceneDocument;
      digestRevision += 1;
      return Promise.resolve({
        kind: "ok" as const,
        digest: `sha256:${String(digestRevision)}`,
      });
    },
    create: () => Promise.resolve({ kind: "error" as const, code: "unavailable" as const }),
  });
}

function createAuthoringMotionIoV1(): MotionSourceIoV1 {
  return Object.freeze({
    list: () => Promise.resolve({ kind: "ok" as const, motions: [], skipped: [] }),
    read: () => Promise.resolve({ kind: "error" as const, code: "not_found" as const }),
    write: () => Promise.resolve({ kind: "error" as const, code: "unavailable" as const }),
    create: () => Promise.resolve({ kind: "error" as const, code: "unavailable" as const }),
  });
}

async function mountAuthoringSiblingV1(): Promise<MountedAuthoringSiblingV1> {
  const container = document.createElement("aside");
  container.dataset.labAuthoringSibling = "true";
  document.body.append(container);
  const sceneIo = createAuthoringSceneIoV1();
  const publication = createStudioToolingReactPublicationV1({
    container,
    mode: "embedded",
  });
  const plan: StudioToolingPlanV1 = Object.freeze({
    binding: labStudioBindingV1,
    sceneIo,
    motionIo: createAuthoringMotionIoV1(),
  });
  const mounted = Object.freeze({ container, publication, sceneIo });
  mountedAuthoringSiblingsV1.push(mounted);
  await publication.mount(plan);
  await waitFor(() => {
    expect(container.querySelector("[data-authoring-host]"))
      .toHaveAttribute("data-authoring-host-ready", "connected");
    expect(within(container).getByLabelText("条目")).toBeInTheDocument();
  });
  return mounted;
}

async function dirtyAuthoringSceneV1(
  sibling: MountedAuthoringSiblingV1,
): Promise<DirtyAuthoringViewV1> {
  const host = sibling.container.querySelector<HTMLElement>("[data-authoring-host]");
  expect(host).not.toBeNull();
  const entrySelect = within(sibling.container).getByLabelText("条目") as HTMLSelectElement;
  fireEvent.change(entrySelect, { target: { value: alphaTagV1 } });
  const xInput = within(sibling.container).getByLabelText("x") as HTMLInputElement;
  const undo = sibling.container.querySelector<HTMLButtonElement>("[data-studio-undo]");
  const redo = sibling.container.querySelector<HTMLButtonElement>("[data-studio-redo]");
  const save = sibling.container.querySelector<HTMLButtonElement>("[data-studio-save]");
  expect(undo).not.toBeNull();
  expect(redo).not.toBeNull();
  expect(save).not.toBeNull();

  fireEvent.change(xInput, { target: { value: "560" } });
  await waitFor(() => {
    expect(entrySelect).toHaveValue(alphaTagV1);
    expect(xInput).toHaveValue(560);
    expect(undo!).toBeEnabled();
    expect(save!).toBeEnabled();
  });
  return Object.freeze({
    host: host!,
    entrySelect,
    xInput,
    undo: undo!,
    redo: redo!,
    save: save!,
  });
}

async function expectSameDirtyAuthoringViewV1(
  sibling: MountedAuthoringSiblingV1,
  view: DirtyAuthoringViewV1,
): Promise<void> {
  expect(sibling.container.querySelector("[data-authoring-host]")).toBe(view.host);
  expect(within(sibling.container).getByLabelText("条目")).toBe(view.entrySelect);
  expect(within(sibling.container).getByLabelText("x")).toBe(view.xInput);
  expect(view.entrySelect).toHaveValue(alphaTagV1);
  expect(view.xInput).toHaveValue(560);
  expect(view.undo).toBeEnabled();
  expect(view.save).toBeEnabled();

  fireEvent.click(view.undo);
  await waitFor(() => expect(view.xInput).toHaveValue(480));
  expect(view.entrySelect).toHaveValue(alphaTagV1);
  expect(view.redo).toBeEnabled();
  fireEvent.click(view.redo);
  await waitFor(() => expect(view.xInput).toHaveValue(560));
  expect(view.entrySelect).toHaveValue(alphaTagV1);
  expect(sibling.sceneIo.writes).toHaveLength(0);
}

function createGameRootV1(): HTMLElement {
  const root = document.createElement("div");
  root.id = "root";
  root.dataset.labGameSibling = "true";
  document.body.append(root);
  return root;
}

function startLabOnRootV1(
  rootElement: HTMLElement,
  options: Omit<StartWebGameApplicationOptionsV1, "rootElement">,
): Promise<StartedWebGameApplicationV1> {
  return startWebGameApplicationV1(labGameApplicationV1, {
    rootElement,
    registerPageLifecycle: false,
    ...options,
  });
}

describe("Engine Lab Authoring Host sibling lifetime", () => {
  it("keeps the exact dirty Authoring Host and history through a committed Game/Session restart", async () => {
    const sibling = await mountAuthoringSiblingV1();
    const authoringView = await dirtyAuthoringSceneV1(sibling);
    const root = createGameRootV1();
    let gameInstance: Parameters<typeof labGameApplicationV1.ui>[0]["instance"] | null = null;
    const application = Object.freeze({
      ...labGameApplicationV1,
      ui(input: Parameters<typeof labGameApplicationV1.ui>[0]) {
        gameInstance = input.instance;
        return labGameApplicationV1.ui(input);
      },
    });
    const started = await startWebGameApplicationV1(application, {
      rootElement: root,
      host: createWebHostV1({ records: createMemoryHostRecordStoreV1() }),
      gameBootstrapEntropy: createFixedBootstrapEntropyV1({
        seeds: [20260823, 20260824],
        uuids: [],
      }),
      registerPageLifecycle: false,
    });
    startedApplicationsV1.push(started);
    expect(gameInstance).not.toBeNull();
    const predecessorAnchor = gameInstance!.presentationAnchor();

    await expect(gameInstance!.lifecycle.restart()).resolves.toEqual({
      kind: "anchored",
      commandSequence: 0,
    });
    expect(gameInstance!.presentationAnchor()).toEqual({
      epoch: predecessorAnchor.epoch + 1,
      origin: "restart",
    });
    expect(await within(root).findByRole("application", { name: "引擎实验室" }))
      .toBeInTheDocument();
    await expectSameDirtyAuthoringViewV1(sibling, authoringView);
  });

  it("keeps the exact dirty Authoring Host when a Game/Session restart faults before replacement", async () => {
    const sibling = await mountAuthoringSiblingV1();
    const authoringView = await dirtyAuthoringSceneV1(sibling);
    const root = createGameRootV1();
    let gameInstance: Parameters<typeof labGameApplicationV1.ui>[0]["instance"] | null = null;
    const application = Object.freeze({
      ...labGameApplicationV1,
      ui(input: Parameters<typeof labGameApplicationV1.ui>[0]) {
        gameInstance = input.instance;
        return labGameApplicationV1.ui(input);
      },
    });
    const started = await startWebGameApplicationV1(application, {
      rootElement: root,
      host: createWebHostV1({ records: createMemoryHostRecordStoreV1() }),
      gameBootstrapEntropy: createFixedBootstrapEntropyV1({
        // Bootstrap consumes the only admitted seed. The attempted restart
        // therefore faults before it can publish a replacement anchor.
        seeds: [20260825],
        uuids: [],
      }),
      registerPageLifecycle: false,
    });
    startedApplicationsV1.push(started);
    expect(gameInstance).not.toBeNull();
    const predecessorAnchor = gameInstance!.presentationAnchor();

    await expect(gameInstance!.lifecycle.restart()).resolves.toEqual({
      kind: "faulted",
      code: "runtime.anchor_failed",
    });
    expect(gameInstance!.presentationAnchor()).toEqual(predecessorAnchor);
    expect(await within(root).findByRole("application", { name: "引擎实验室" }))
      .toBeInTheDocument();
    await expectSameDirtyAuthoringViewV1(sibling, authoringView);
  });

  it("keeps the exact dirty Authoring Host across an HMR-like Web start successor", async () => {
    const sibling = await mountAuthoringSiblingV1();
    const authoringView = await dirtyAuthoringSceneV1(sibling);
    const root = createGameRootV1();
    const host = createWebHostV1({ records: createMemoryHostRecordStoreV1() });
    const gameBootstrapEntropy = createFixedBootstrapEntropyV1({
      seeds: [20260826, 20260827],
      uuids: [],
    });
    const predecessor = await startLabOnRootV1(root, { host, gameBootstrapEntropy });
    startedApplicationsV1.push(predecessor);
    const predecessorGameRoot = await within(root).findByRole("application", {
      name: "引擎实验室",
    });

    const disposition = await predecessor.disposeForRebootstrap();
    const successor = await startLabOnRootV1(root, {
      host,
      gameBootstrapEntropy,
      rebootstrapDisposition: disposition,
    });
    startedApplicationsV1.push(successor);
    const successorGameRoot = await within(root).findByRole("application", {
      name: "引擎实验室",
    });

    expect(successor.host).toBe(predecessor.host);
    expect(successorGameRoot).not.toBe(predecessorGameRoot);
    await expectSameDirtyAuthoringViewV1(sibling, authoringView);
  });
});

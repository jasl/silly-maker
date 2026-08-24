// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { admitAuthoringSceneDocumentV1 } from "@sillymaker/base/authoring/scene";
import type { AdmittedAuthoringSceneV1 } from "@sillymaker/base/authoring/scene";
import {
  createFixedBootstrapEntropyV1,
  createMemoryHostRecordStoreV1,
} from "@sillymaker/base/testkit";
import { createInspectorToolingReactPublicationV1 } from "@sillymaker/studio/composition";
import type {
  InspectorToolingPlanV1,
  InspectorToolingReactPublicationV1,
} from "@sillymaker/studio/composition";
import type { AuthoringSceneSourceIoV1 } from "@sillymaker/studio";
import type { MotionSourceIoV1 } from "@sillymaker/ui/debug";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";
import type {
  StartedWebGameApplicationV1,
  StartWebGameApplicationOptionsV1,
} from "@sillymaker/web";
import {
  createWebGameApplicationRebootstrapStartOptionsInternalV1,
  disposeStartedWebGameApplicationForRebootstrapInternalV1,
  startWebGameApplicationForRebootstrapInternalV1,
} from "@sillymaker/web/internal/application-hmr";

import { labGameApplicationV1 } from "../application/composition.tsx";
import procedureSceneSourceV1 from "../scenes/procedure/procedure.authoring-scene.json" with {
  type: "json",
};
import { labInspectorBindingV1 } from "../tooling/inspector-binding.ts";

const procedureScenePathV1 = "src/scenes/procedure/procedure.authoring-scene.json";

interface AuthoringSceneIoFixtureV1 extends AuthoringSceneSourceIoV1 {
  readonly writes: Array<{
    readonly path: string;
    readonly expectedDigest: string;
    readonly admittedScene: AdmittedAuthoringSceneV1;
  }>;
}

interface MountedAuthoringSiblingV1 {
  readonly container: HTMLElement;
  readonly publication: InspectorToolingReactPublicationV1;
  readonly sceneIo: AuthoringSceneIoFixtureV1;
}

interface DirtyAuthoringViewV1 {
  readonly host: HTMLElement;
  readonly objectButton: HTMLButtonElement;
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
  let saved = admitAuthoringSceneDocumentV1(procedureSceneSourceV1);
  let digestRevision = 1;
  const writes: AuthoringSceneIoFixtureV1["writes"] = [];
  return Object.freeze({
    writes,
    list: () =>
      Promise.resolve({
        kind: "ok" as const,
        scenes: Object.freeze([{
          path: procedureScenePathV1,
          sceneId: saved.document.sceneId,
          label: saved.document.label,
        }]),
        skipped: Object.freeze([]),
      }),
    read: (path: string) =>
      path === procedureScenePathV1
        ? Promise.resolve({
          kind: "ok" as const,
          digest: `sha256:${String(digestRevision)}`,
          admittedScene: saved,
        })
        : Promise.resolve({ kind: "error" as const, code: "not_found" as const }),
    write(input: Parameters<AuthoringSceneSourceIoV1["write"]>[0]) {
      writes.push(input);
      saved = input.admittedScene;
      digestRevision += 1;
      return Promise.resolve({
        kind: "ok" as const,
        digest: `sha256:${String(digestRevision)}`,
      });
    },
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

function alphaObjectButtonV1(container: HTMLElement): HTMLButtonElement {
  const sceneTree = within(container).getByRole("region", { name: "场景层级" });
  return within(sceneTree).getByRole("button", { name: /研究员甲/ }) as HTMLButtonElement;
}

function xInputV1(container: HTMLElement): HTMLInputElement {
  return within(container).getByLabelText("X") as HTMLInputElement;
}

async function mountAuthoringSiblingV1(): Promise<MountedAuthoringSiblingV1> {
  const container = document.createElement("aside");
  container.dataset.labAuthoringSibling = "true";
  document.body.append(container);
  const sceneIo = createAuthoringSceneIoV1();
  const publication = createInspectorToolingReactPublicationV1({
    container,
    mode: "embedded",
  });
  const plan: InspectorToolingPlanV1 = Object.freeze({
    binding: labInspectorBindingV1,
    sceneIo,
    motionIo: createAuthoringMotionIoV1(),
  });
  const mounted = Object.freeze({ container, publication, sceneIo });
  mountedAuthoringSiblingsV1.push(mounted);
  await publication.mount(plan);
  await waitFor(() => {
    expect(container.querySelector("[data-authoring-host]"))
      .toHaveAttribute("data-authoring-host-ready", "connected");
    expect(container.querySelector("[data-inspector-ready='true']")).toBeInTheDocument();
    expect(alphaObjectButtonV1(container)).toBeInTheDocument();
  });
  return mounted;
}

async function dirtyAuthoringSceneV1(
  sibling: MountedAuthoringSiblingV1,
): Promise<DirtyAuthoringViewV1> {
  const host = sibling.container.querySelector<HTMLElement>("[data-authoring-host]");
  expect(host).not.toBeNull();
  const objectButton = alphaObjectButtonV1(sibling.container);
  fireEvent.click(objectButton);
  const xInput = xInputV1(sibling.container);
  const undo = within(sibling.container).getByRole("button", {
    name: "撤销",
  }) as HTMLButtonElement;
  const redo = within(sibling.container).getByRole("button", {
    name: "重做",
  }) as HTMLButtonElement;
  const save = within(sibling.container).getByRole("button", {
    name: "保存",
  }) as HTMLButtonElement;

  fireEvent.change(xInput, { target: { value: "560" } });
  fireEvent.blur(xInput);
  await waitFor(() => {
    expect(objectButton).toHaveAttribute("aria-current", "true");
    expect(xInputV1(sibling.container)).toHaveValue(560);
    expect(undo).toBeEnabled();
    expect(save).toBeEnabled();
  });
  return Object.freeze({
    host: host!,
    objectButton,
    xInput: xInputV1(sibling.container),
    undo,
    redo,
    save,
  });
}

async function expectSameDirtyAuthoringViewV1(
  sibling: MountedAuthoringSiblingV1,
  view: DirtyAuthoringViewV1,
): Promise<void> {
  expect(sibling.container.querySelector("[data-authoring-host]")).toBe(view.host);
  expect(alphaObjectButtonV1(sibling.container)).toBe(view.objectButton);
  expect(xInputV1(sibling.container)).toBe(view.xInput);
  expect(view.objectButton).toHaveAttribute("aria-current", "true");
  expect(view.xInput).toHaveValue(560);
  expect(view.undo).toBeEnabled();
  expect(view.save).toBeEnabled();

  fireEvent.click(view.undo);
  await waitFor(() => expect(xInputV1(sibling.container)).toHaveValue(480));
  expect(view.objectButton).toHaveAttribute("aria-current", "true");
  expect(view.redo).toBeEnabled();
  fireEvent.click(view.redo);
  await waitFor(() => expect(xInputV1(sibling.container)).toHaveValue(560));
  expect(view.objectButton).toHaveAttribute("aria-current", "true");
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

    const handoff = await disposeStartedWebGameApplicationForRebootstrapInternalV1(predecessor);
    const successor = await startWebGameApplicationForRebootstrapInternalV1(
      labGameApplicationV1,
      Object.freeze({
        ...createWebGameApplicationRebootstrapStartOptionsInternalV1({
          predecessor,
          rootElement: root,
          handoff,
          onRebootstrapStartFailureInternal: () => undefined,
        }),
        gameBootstrapEntropy,
        registerPageLifecycle: false,
      }),
    );
    startedApplicationsV1.push(successor);
    const successorGameRoot = await within(root).findByRole("application", {
      name: "引擎实验室",
    });

    expect(successor.host).toBe(predecessor.host);
    expect(successorGameRoot).not.toBe(predecessorGameRoot);
    await expectSameDirtyAuthoringViewV1(sibling, authoringView);
  });

  it("routes the experimental fake RPC Artifact through a captured AR2 Scene operation", async () => {
    const sibling = await mountAuthoringSiblingV1();
    const authoringHost = sibling.container.querySelector<HTMLElement>("[data-authoring-host]");
    const agentHost = sibling.container.querySelector<HTMLElement>(
      "[data-experimental-agent-host]",
    );
    expect(authoringHost).toHaveAttribute("data-authoring-host-ready", "connected");
    expect(agentHost).not.toBeNull();

    await waitFor(() => {
      expect(agentHost).toHaveAttribute("data-agent-readiness", "unavailable");
      expect(agentHost?.querySelector("[data-agent-domain-ready]"))
        .toHaveAttribute("data-agent-domain-ready", "false");
    });
    const objectButton = alphaObjectButtonV1(sibling.container);
    expect(objectButton).toBeEnabled();
    fireEvent.click(within(agentHost!).getByRole("button", { name: "重试 Agent 服务" }));
    await waitFor(() => expect(agentHost).toHaveAttribute("data-agent-readiness", "ready"));
    fireEvent.click(within(agentHost!).getByRole("button", { name: "启动 Agent 会话" }));

    const prompt = await within(agentHost!).findByLabelText("请求");
    const submit = within(agentHost!).getByRole("button", { name: "生成 Artifact" });
    fireEvent.click(objectButton);
    expect(xInputV1(sibling.container)).toHaveValue(480);

    fireEvent.click(submit);
    await waitFor(() => {
      expect(agentHost?.querySelector("[data-agent-draft-status=streaming]"))
        .toHaveTextContent("正在生成安全的 UiArtifact");
    });
    const firstArtifact = await waitFor(() => {
      const artifact = agentHost?.querySelector<HTMLElement>("[data-ui-artifact-revision='1']");
      expect(artifact).not.toBeNull();
      return artifact!;
    });
    fireEvent.click(within(firstArtifact).getByRole("button", { name: "应用场景草稿修改" }));
    await waitFor(() => {
      expect(xInputV1(sibling.container)).toHaveValue(640);
      expect(agentHost?.querySelector("[data-agent-action-note]"))
        .toHaveTextContent("场景草稿已更新（尚未保存）");
    });
    expect(sibling.sceneIo.writes).toHaveLength(0);
    fireEvent.click(within(sibling.container).getByRole("button", { name: "撤销" }));
    await waitFor(() => expect(xInputV1(sibling.container)).toHaveValue(480));

    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.change(prompt, { target: { value: "生成第二个有效 Artifact" } });
    fireEvent.click(submit);
    const secondArtifact = await waitFor(() => {
      const artifact = agentHost?.querySelector<HTMLElement>("[data-ui-artifact-revision='2']");
      expect(artifact).not.toBeNull();
      return artifact!;
    });
    const editableXInput = xInputV1(sibling.container);
    fireEvent.change(editableXInput, { target: { value: "555" } });
    fireEvent.blur(editableXInput);
    await waitFor(() => expect(xInputV1(sibling.container)).toHaveValue(555));
    fireEvent.click(
      within(secondArtifact).getByRole("button", {
        name: "应用场景草稿修改",
      }),
    );
    await waitFor(() => {
      expect(agentHost?.querySelector("[data-agent-action-note]"))
        .toHaveTextContent("scene_authoring.revision_stale");
      expect(xInputV1(sibling.container)).toHaveValue(555);
    });
    expect(sibling.sceneIo.writes).toHaveLength(0);
    fireEvent.click(within(sibling.container).getByRole("button", { name: "撤销" }));
    await waitFor(() => expect(xInputV1(sibling.container)).toHaveValue(480));

    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.change(prompt, { target: { value: "未知节点" } });
    fireEvent.click(submit);
    await waitFor(() => {
      expect(agentHost?.querySelector("[data-agent-diagnostic='artifact.node_unknown']"))
        .toBeInTheDocument();
      expect(agentHost?.querySelector("[data-agent-draft-status=invalid]"))
        .toHaveTextContent("正在生成安全的 UiArtifact");
    });
    expect(agentHost?.querySelector("[data-ui-artifact-revision='2']")).toBe(secondArtifact);
    expect(xInputV1(sibling.container)).toHaveValue(480);

    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.change(prompt, { target: { value: "未知动作" } });
    fireEvent.click(submit);
    await waitFor(() => {
      expect(agentHost?.querySelector("[data-agent-diagnostic='artifact.action_unknown']"))
        .toBeInTheDocument();
    });
    expect(agentHost?.querySelector("[data-ui-artifact-revision='2']")).toBe(secondArtifact);
    expect(xInputV1(sibling.container)).toHaveValue(480);

    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.change(prompt, { target: { value: "取消晚到" } });
    fireEvent.click(submit);
    await waitFor(() => {
      expect(agentHost?.querySelector("[data-agent-draft-status=streaming]"))
        .toHaveTextContent("正在等待取消后的迟到结果");
    });
    fireEvent.click(within(agentHost!).getByRole("button", { name: "取消本地接收" }));
    const cancelledDraft = agentHost?.querySelector("[data-agent-draft-status=cancelled]");
    expect(cancelledDraft).toHaveTextContent("正在等待取消后的迟到结果");
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(agentHost?.querySelector("[data-agent-draft-status=cancelled]")).toBe(cancelledDraft);
    expect(agentHost?.querySelector("[data-ui-artifact-revision='2']")).toBe(secondArtifact);
    expect(xInputV1(sibling.container)).toHaveValue(480);
    expect(sibling.sceneIo.writes).toHaveLength(0);

    const agentIdentity = agentHost?.getAttribute("data-experimental-agent-host");
    fireEvent.click(
      sibling.container.querySelector("[data-embedded-authoring-close]") as HTMLElement,
    );
    expect(sibling.container.querySelector("[data-embedded-authoring-panel]"))
      .toHaveAttribute("hidden");
    fireEvent.click(
      sibling.container.querySelector("[data-embedded-authoring-open]") as HTMLElement,
    );
    expect(sibling.container.querySelector("[data-embedded-authoring-panel]"))
      .not.toHaveAttribute("hidden");
    expect(sibling.container.querySelector("[data-experimental-agent-host]"))
      .toHaveAttribute("data-experimental-agent-host", agentIdentity);
    expect(agentHost?.querySelector("[data-ui-artifact-revision='2']")).toBe(secondArtifact);
  });
});

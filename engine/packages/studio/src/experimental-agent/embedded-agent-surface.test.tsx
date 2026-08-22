// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAgentHostInternalV1,
  createAgentRpcClientInternalV1,
  createDeterministicFakeAgentRpcTransportInternalV1,
} from "@sillymaker/agent/internal";

import type {
  SceneAuthoringCurrentV1,
  SceneAuthoringLocalAdapterV1,
} from "../core/scene-operations/contract.ts";
import type { ExperimentalEmbeddedAgentBindingInternalV1 } from "./binding.ts";
import { EmbeddedAgentSurfaceInternalV1 } from "./embedded-agent-surface.tsx";

const actionIdInternalV1 = "engine-lab.scene.move-alpha";
const operationInternalV1 = Object.freeze({
  schemaRevision: 1 as const,
  kind: "scene.entry.set_placement" as const,
  tag: "tag.e2e.alpha",
  placement: Object.freeze({
    x: 640,
    y: 620,
    scalePermille: 1_000,
    opacityPermille: 1_000,
    mirrored: false,
  }),
});

afterEach(() => cleanup());

function artifactInternalV1() {
  return Object.freeze({
    schemaRevision: 1,
    root: Object.freeze({
      kind: "action",
      nodeId: "artifact.apply",
      label: "应用",
      actionId: actionIdInternalV1,
    }),
  });
}

async function setupHostInternalV1() {
  const fake = createDeterministicFakeAgentRpcTransportInternalV1();
  const client = createAgentRpcClientInternalV1({ transport: fake.transport });
  const host = createAgentHostInternalV1({ client, allowedActionIds: [actionIdInternalV1] });
  await host.connect();
  await host.start();
  await host.submit("build artifact");
  const binding: ExperimentalEmbeddedAgentBindingInternalV1 = Object.freeze({
    configurationId: "engine-lab.agent.fake",
    actionSignature: actionIdInternalV1,
    allowedActionIds: Object.freeze([actionIdInternalV1]),
    sceneActions: Object.freeze({ [actionIdInternalV1]: operationInternalV1 }),
    createClient: () => client,
  });
  return Object.freeze({ fake, host, binding });
}

describe("EmbeddedAgentSurfaceInternalV1", () => {
  it("keeps a new Artifact inert until it captures one exact AR2 receipt", async () => {
    const { fake, host, binding } = await setupHostInternalV1();
    let current: SceneAuthoringCurrentV1 | null = null;
    const execute = vi.fn<SceneAuthoringLocalAdapterV1["execute"]>(() =>
      Object.freeze({
        kind: "rejected",
        diagnostic: Object.freeze({ code: "scene_authoring.revision_stale", path: "/" }),
      })
    );
    const sceneOperations: SceneAuthoringLocalAdapterV1 = Object.freeze({
      current: () => current,
      execute,
    });
    const view = render(
      <EmbeddedAgentSurfaceInternalV1
        host={host}
        binding={binding}
        sceneOperations={sceneOperations}
        authoringRevision={1}
        publicationRole="visible"
      />,
    );
    const surface = view.container.querySelector("[data-experimental-agent-host]");
    expect(surface).toHaveAttribute("data-agent-session-id", "session.1");
    expect(surface).toHaveAttribute("data-agent-run-id", "run.1");
    expect(surface).toHaveAttribute("data-agent-run-generation", "2");
    expect(surface).toHaveAttribute("data-agent-rpc-connection-generation", "1");

    act(() => {
      fake.emit(Object.freeze({
        kind: "artifact_complete",
        sessionId: "session.1",
        runId: "run.1",
        sequence: 1,
        candidate: artifactInternalV1(),
      }));
    });
    const action = view.getByRole("button", { name: "应用" });
    expect(action).toBeDisabled();

    current = Object.freeze({ documentIdentity: "scene.document.1", draftRevision: 7 });
    view.rerender(
      <EmbeddedAgentSurfaceInternalV1
        host={host}
        binding={binding}
        sceneOperations={sceneOperations}
        authoringRevision={2}
        publicationRole="visible"
      />,
    );
    await waitFor(() => expect(action).toBeEnabled());
    fireEvent.click(action);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[0]).toMatchObject({
      documentIdentity: "scene.document.1",
      expectedDraftRevision: 7,
      operation: operationInternalV1,
    });
    await host.dispose();
  });

  it("keeps a publication probe unable to submit or invoke shared Host effects", async () => {
    const { fake, host, binding } = await setupHostInternalV1();
    act(() => {
      fake.emit(Object.freeze({
        kind: "artifact_complete",
        sessionId: "session.1",
        runId: "run.1",
        sequence: 1,
        candidate: artifactInternalV1(),
      }));
      fake.emit(Object.freeze({
        kind: "run_completed",
        sessionId: "session.1",
        runId: "run.1",
        sequence: 2,
      }));
    });
    const execute = vi.fn<SceneAuthoringLocalAdapterV1["execute"]>();
    const view = render(
      <EmbeddedAgentSurfaceInternalV1
        host={host}
        binding={binding}
        sceneOperations={Object.freeze({
          current: () => Object.freeze({ documentIdentity: "scene.1", draftRevision: 1 }),
          execute,
        })}
        authoringRevision={1}
        publicationRole="probe"
      />,
    );
    const requestCount = fake.getRequests().length;
    const surface = view.container.querySelector("[data-experimental-agent-host]");
    expect(surface).toHaveAttribute("data-agent-session-id", "session.1");
    expect(surface).toHaveAttribute("data-agent-run-id", "run.1");
    expect(surface).toHaveAttribute("data-agent-run-generation", "2");
    expect(surface).toHaveAttribute("data-agent-rpc-connection-generation", "1");
    expect(view.getByRole("button", { name: "生成 Artifact" })).toBeDisabled();
    expect(view.getByRole("button", { name: "应用" })).toBeDisabled();
    fireEvent.submit(view.container.querySelector("form")!);
    expect(fake.getRequests()).toHaveLength(requestCount);
    expect(execute).not.toHaveBeenCalled();
    await host.dispose();
  });
});

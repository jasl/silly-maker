// SPDX-License-Identifier: MIT
// Engine Lab's dev-only Studio binding. The Project Authoring Index discovers
// the scene document over source IO; this file supplies only the catalog,
// renderers, and content-construction metadata that a file scan cannot infer.
import {
  createAgentRpcClientInternalV1,
  createDeterministicFakeAgentRpcTransportInternalV1,
} from "@sillymaker/agent/internal";
import type { AgentRpcClientPortInternalV1 } from "@sillymaker/agent/internal";
import type { StudioBindingV1 } from "@sillymaker/studio";
import { defineExperimentalEmbeddedAgentBindingInternalV1 } from "@sillymaker/studio/internal/agent";

import { labStageRenderersV1 } from "../application/shell-ui.tsx";
import { labStageContentCatalogV1 } from "../presentation.ts";

const labResearcherAppearanceFieldsV1 = Object.freeze([
  Object.freeze({
    key: "pose",
    label: "姿态",
    values: Object.freeze(["standing"]),
  }),
  Object.freeze({
    key: "expression",
    label: "表情",
    values: Object.freeze(["neutral", "focused", "pleased"]),
  }),
]);

const labAgentActionIdV1 = "engine-lab.scene.move-alpha";

function labAgentArtifactV1(actionId = labAgentActionIdV1): unknown {
  return Object.freeze({
    schemaRevision: 1,
    root: Object.freeze({
      kind: "column",
      nodeId: "engine-lab.artifact.root",
      children: Object.freeze([
        Object.freeze({
          kind: "text",
          nodeId: "engine-lab.artifact.summary",
          text: "将研究员甲移动到实验区中央。",
        }),
        Object.freeze({
          kind: "action",
          nodeId: "engine-lab.artifact.apply",
          label: "应用场景草稿修改",
          actionId,
        }),
      ]),
    }),
  });
}

/** Deterministic dev-only service: no network, model, tool, storage, or source access. */
function createLabAgentClientV1(): AgentRpcClientPortInternalV1 {
  const fake = createDeterministicFakeAgentRpcTransportInternalV1("offline");
  const client = createAgentRpcClientInternalV1({ transport: fake.transport });
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const schedule = (delayMs: number, callback: () => void): void => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delayMs);
    timers.add(timer);
  };

  return Object.freeze({
    getSnapshot: client.getSnapshot,
    subscribe: client.subscribe,
    subscribeStream: client.subscribeStream,
    connect: client.connect,
    start: client.start,
    async submit(input: Parameters<AgentRpcClientPortInternalV1["submit"]>[0]) {
      const result = await client.submit(input);
      if (result.kind !== "submitted") return result;
      const runId = result.runId;
      const complete = input.text.includes("未知节点")
        ? Object.freeze({
          schemaRevision: 1,
          root: Object.freeze({
            kind: "html",
            nodeId: "engine-lab.artifact.unknown",
            html: "<button>not admitted</button>",
          }),
        })
        : input.text.includes("未知动作")
        ? labAgentArtifactV1("engine-lab.scene.unknown")
        : labAgentArtifactV1();
      const late = input.text.includes("取消晚到");
      const heldForSuccessor = input.text === "换代期间保持流";
      schedule(0, () => {
        fake.emit(Object.freeze({
          kind: "artifact_chunk",
          sessionId: input.sessionId,
          runId,
          sequence: 1,
          text: heldForSuccessor
            ? "正在保持换代期间的流式请求…"
            : late
            ? "正在等待取消后的迟到结果…"
            : "正在生成安全的 UiArtifact…",
        }));
      });
      if (heldForSuccessor) return result;
      schedule(late ? 250 : 80, () => {
        fake.emit(Object.freeze({
          kind: "artifact_complete",
          sessionId: input.sessionId,
          runId,
          sequence: 2,
          candidate: complete,
        }));
      });
      schedule(late ? 275 : 100, () => {
        fake.emit(Object.freeze({
          kind: "run_completed",
          sessionId: input.sessionId,
          runId,
          sequence: 3,
        }));
      });
      return result;
    },
    cancel: client.cancel,
    reconnect(): ReturnType<AgentRpcClientPortInternalV1["reconnect"]> {
      fake.setMode("ready");
      return client.reconnect();
    },
    async dispose(): Promise<void> {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      await client.dispose();
    },
  });
}

const labStudioCoreBindingV1: StudioBindingV1 = Object.freeze({
  catalog: labStageContentCatalogV1,
  renderers: labStageRenderersV1,
  contents: Object.freeze([
    {
      contentId: "content.e2e.bg.storeroom",
      label: "储藏室",
      category: "background" as const,
      defaultLayerId: "layer.e2e.background",
      defaultZOrder: 0,
    },
    {
      contentId: "content.e2e.char.alpha",
      label: "研究员甲",
      category: "character" as const,
      defaultLayerId: "layer.e2e.characters",
      defaultZOrder: 10,
      defaultPlacement: Object.freeze({
        x: 480,
        y: 620,
        scalePermille: 1000,
        opacityPermille: 1000,
        mirrored: false,
      }),
      defaultAppearance: Object.freeze({ pose: "standing", expression: "neutral" }),
      appearanceFields: labResearcherAppearanceFieldsV1,
    },
    {
      contentId: "content.e2e.char.beta",
      label: "研究员乙",
      category: "character" as const,
      defaultLayerId: "layer.e2e.characters",
      defaultZOrder: 10,
      defaultPlacement: Object.freeze({
        x: 1120,
        y: 620,
        scalePermille: 1000,
        opacityPermille: 1000,
        mirrored: true,
      }),
      defaultAppearance: Object.freeze({ pose: "standing", expression: "neutral" }),
      appearanceFields: labResearcherAppearanceFieldsV1,
    },
  ]),
});

export const labStudioBindingV1: StudioBindingV1 = defineExperimentalEmbeddedAgentBindingInternalV1(
  labStudioCoreBindingV1,
  {
    configurationId: "engine-lab.agent.fake",
    createClient: createLabAgentClientV1,
    sceneActions: Object.freeze({
      [labAgentActionIdV1]: Object.freeze({
        schemaRevision: 1,
        kind: "scene.entry.set_placement",
        tag: "tag.e2e.alpha",
        placement: Object.freeze({
          x: 640,
          y: 620,
          scalePermille: 1000,
          opacityPermille: 1000,
          mirrored: false,
        }),
      }),
    }),
  },
);

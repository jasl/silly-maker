// SPDX-License-Identifier: MIT
// Engine Lab's dev-only Inspector binding. The Project Authoring Index owns
// source discovery; the Story contributes only its real presentation seams
// and the explicitly selected experimental Agent companion.
import { createDeterministicFakeAgentSessionConnectorInternalV1 } from "@sillymaker/agent/internal";
import { createAgentSessionClientV1, type AgentSessionClientV1 } from "@sillymaker/agent/session";
import type { InspectorBindingV1 } from "@sillymaker/studio";
import { defineExperimentalEmbeddedAgentBindingInternalV1 } from "@sillymaker/studio/internal/agent";

import { labStageRenderersV1 } from "../application/stage-rendering.tsx";
import { labAddressableRuntimeUnitDeclarationsV1 } from "../application/addressable-runtime.ts";
import {
  declareLabRuntimeInspectorDetachedUnitsV1,
  labRuntimeInspectorSourceV1,
} from "../application/runtime-inspection.ts";
import { labStageContentCatalogV1, labTimelineCatalogV1 } from "../presentation.ts";

const labAgentActionIdV1 = "engine-lab.scene.move-alpha";

declareLabRuntimeInspectorDetachedUnitsV1(labAddressableRuntimeUnitDeclarationsV1);

function labAgentArtifactV1(actionId = labAgentActionIdV1): unknown {
  return {
    schemaRevision: 1,
    root: {
      kind: "column",
      nodeId: "engine-lab.artifact.root",
      children: [
        {
          kind: "text",
          nodeId: "engine-lab.artifact.summary",
          text: "将研究员甲移动到实验区中央。",
        },
        {
          kind: "action",
          nodeId: "engine-lab.artifact.apply",
          label: "应用场景草稿修改",
          actionId,
        },
      ],
    },
  };
}

/** Deterministic dev-only service: no network, model, tool, storage, or source access. */
function createLabAgentClientV1(): AgentSessionClientV1 {
  const fake = createDeterministicFakeAgentSessionConnectorInternalV1("offline");
  const client = createAgentSessionClientV1({ connector: fake.connector });
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const schedule = (delayMs: number, callback: () => void): void => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delayMs);
    timers.add(timer);
  };

  return {
    getSnapshot: client.getSnapshot,
    subscribe: client.subscribe,
    subscribeStream: client.subscribeStream,
    connect: client.connect,
    start: client.start,
    async submit(input: Parameters<AgentSessionClientV1["submit"]>[0]) {
      const result = await client.submit(input);
      if (result.kind !== "submitted") return result;
      const runId = result.runId;
      const complete = input.text.includes("未知节点")
        ? {
          schemaRevision: 1,
          root: {
            kind: "html",
            nodeId: "engine-lab.artifact.unknown",
            html: "<button>not admitted</button>",
          },
        }
        : input.text.includes("未知动作")
        ? labAgentArtifactV1("engine-lab.scene.unknown")
        : labAgentArtifactV1();
      const late = input.text.includes("取消晚到");
      const heldForSuccessor = input.text === "换代期间保持流";
      schedule(0, () => {
        fake.emit({
          kind: "output_text_delta",
          sessionId: input.sessionId,
          runId,
          sequence: 1,
          text: heldForSuccessor
            ? "正在保持换代期间的流式请求…"
            : late
            ? "正在等待取消后的迟到结果…"
            : "正在生成安全的 UiArtifact…",
        });
      });
      if (heldForSuccessor) return result;
      schedule(late ? 250 : 80, () => {
        fake.emit({
          kind: "output_data",
          sessionId: input.sessionId,
          runId,
          sequence: 2,
          value: complete,
        });
      });
      schedule(late ? 275 : 100, () => {
        fake.emit({
          kind: "run_completed",
          sessionId: input.sessionId,
          runId,
          sequence: 3,
        });
      });
      return result;
    },
    cancel: client.cancel,
    reconnect(): ReturnType<AgentSessionClientV1["reconnect"]> {
      fake.setMode("ready");
      return client.reconnect();
    },
    async dispose(): Promise<void> {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      await client.dispose();
    },
  };
}

const labInspectorCoreBindingV1: InspectorBindingV1 = {
  catalog: labStageContentCatalogV1,
  renderers: labStageRenderersV1,
  timelines: labTimelineCatalogV1,
  runtime: labRuntimeInspectorSourceV1,
};

export const labInspectorBindingV1: InspectorBindingV1 =
  defineExperimentalEmbeddedAgentBindingInternalV1(
    labInspectorCoreBindingV1,
    {
      configurationId: "engine-lab.agent.fake",
      createClient: createLabAgentClientV1,
      sceneActions: {
        [labAgentActionIdV1]: {
          schemaRevision: 2,
          kind: "scene.object.set_local_transform",
          objectId: "tag.e2e.alpha",
          localTransform: {
            x: 640,
            y: 620,
            scalePermille: 1_000,
            opacityPermille: 1_000,
            mirrored: false,
          },
        },
      },
    },
  );

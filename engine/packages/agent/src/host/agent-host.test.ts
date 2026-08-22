// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createAgentRpcClientInternalV1 } from "../rpc/client.ts";
import { createDeterministicFakeAgentRpcTransportInternalV1 } from "../rpc/deterministic-fake-transport.ts";
import { createAgentHostInternalV1 } from "./agent-host.ts";

const actionIdInternalV1 = "sillymaker.authoring.scene.nudge_selected_x";

function artifactCandidateInternalV1(label: string, actionId = actionIdInternalV1) {
  return Object.freeze({
    schemaRevision: 1,
    root: Object.freeze({
      kind: "column",
      nodeId: "root",
      children: Object.freeze([
        Object.freeze({ kind: "text", nodeId: "summary", text: label }),
        Object.freeze({ kind: "action", nodeId: "nudge", label: "应用", actionId }),
      ]),
    }),
  });
}

function streamInternalV1(
  kind: "artifact_chunk" | "artifact_complete",
  runId: string,
  sequence: number,
  extra: Readonly<Record<string, unknown>>,
) {
  return Object.freeze({
    kind,
    sessionId: "session.1",
    runId,
    sequence,
    ...extra,
  });
}

describe("createAgentHostInternalV1", () => {
  it("keeps required RPC readiness explicit while retry remains available", async () => {
    const fake = createDeterministicFakeAgentRpcTransportInternalV1("unconfigured");
    const client = createAgentRpcClientInternalV1({ transport: fake.transport });
    const host = createAgentHostInternalV1({ client, allowedActionIds: [actionIdInternalV1] });

    expect(host.getSnapshot().readiness).toBe("unconfigured");
    await host.connect();
    expect(host.getSnapshot()).toMatchObject({
      readiness: "unconfigured",
      diagnostic: { source: "rpc", diagnostic: { code: "rpc.unconfigured" } },
    });
    fake.setMode("slow");
    const slowRetry = host.retry();
    expect(host.getSnapshot().readiness).toBe("connecting");
    fake.resolveSlowConnectAs("offline");
    await slowRetry;
    expect(host.getSnapshot().readiness).toBe("unavailable");
    fake.setMode("ready");
    await host.retry();
    expect(host.getSnapshot()).toMatchObject({ readiness: "ready", diagnostic: null });
  });

  it("preserves predecessor Artifact/draft across invalid completion, cancellation, and late events", async () => {
    const fake = createDeterministicFakeAgentRpcTransportInternalV1();
    const client = createAgentRpcClientInternalV1({ transport: fake.transport });
    const host = createAgentHostInternalV1({ client, allowedActionIds: [actionIdInternalV1] });
    await host.connect();
    await host.start();
    await host.submit("first");
    fake.emit(streamInternalV1("artifact_complete", "run.1", 1, {
      candidate: artifactCandidateInternalV1("first"),
    }));
    const predecessor = host.getSnapshot().artifact;
    expect(predecessor).toMatchObject({ revision: 1, document: { root: { kind: "column" } } });

    await host.submit("invalid successor");
    fake.emit(streamInternalV1("artifact_chunk", "run.2", 1, { text: "partial draft" }));
    fake.emit(streamInternalV1("artifact_complete", "run.2", 2, {
      candidate: artifactCandidateInternalV1("invalid", "remote.unknown"),
    }));
    expect(host.getSnapshot()).toMatchObject({
      run: { runId: "run.2", status: "failed" },
      draft: { runId: "run.2", text: "partial draft", status: "invalid" },
      artifact: { revision: 1 },
      diagnostic: { source: "artifact", diagnostic: { code: "artifact.action_unknown" } },
    });
    fake.emit(streamInternalV1("artifact_complete", "run.2", 3, {
      candidate: artifactCandidateInternalV1("must stay rejected"),
    }));
    expect(host.getSnapshot().artifact).toBe(predecessor);

    await host.submit("second valid");
    fake.emit(streamInternalV1("artifact_complete", "run.3", 1, {
      candidate: artifactCandidateInternalV1("second"),
    }));
    expect(host.getSnapshot().artifact?.revision).toBe(2);
    const requestCountBeforeReopen = fake.getRequests().length;
    expect(host.reopenArtifact(1)).toBe(true);
    expect(host.getSnapshot().artifact).toBe(predecessor);
    expect(fake.getRequests()).toHaveLength(requestCountBeforeReopen);

    const admittedIntent = host.admitIntent({
      schemaRevision: 1,
      kind: "ui.action.invoke",
      hostIdentity: host.getSnapshot().identity,
      artifactRevision: 1,
      nodeId: "nudge",
      actionId: actionIdInternalV1,
    });
    expect(admittedIntent.kind).toBe("admitted");

    await host.submit("cancel me");
    fake.emit(streamInternalV1("artifact_chunk", "run.4", 1, { text: "keep me" }));
    await host.cancel();
    fake.emit(streamInternalV1("artifact_complete", "run.4", 2, {
      candidate: artifactCandidateInternalV1("late cancel"),
    }));
    expect(host.getSnapshot()).toMatchObject({
      run: { runId: "run.4", status: "cancel_requested" },
      draft: { runId: "run.4", text: "keep me", status: "cancelled" },
      artifact: { revision: 1 },
    });

    await host.submit("old run");
    await host.submit("successor run");
    fake.emit(streamInternalV1("artifact_complete", "run.5", 1, {
      candidate: artifactCandidateInternalV1("late predecessor"),
    }));
    expect(host.getSnapshot().artifact?.revision).toBe(1);
    fake.emit(streamInternalV1("artifact_complete", "run.6", 1, {
      candidate: artifactCandidateInternalV1("successor"),
    }));
    expect(host.getSnapshot().artifact?.revision).toBe(3);

    await host.submit("remote failure");
    fake.emit(streamInternalV1("artifact_chunk", "run.7", 1, { text: "unfinished" }));
    fake.emit(Object.freeze({
      kind: "run_failed",
      sessionId: "session.1",
      runId: "run.7",
      sequence: 2,
      code: "backend.failed",
    }));
    expect(host.getSnapshot()).toMatchObject({
      run: { runId: "run.7", status: "failed" },
      draft: { runId: "run.7", text: "unfinished", status: "failed" },
      artifact: { revision: 3 },
    });

    await host.dispose();
    fake.emit(streamInternalV1("artifact_complete", "run.7", 3, {
      candidate: artifactCandidateInternalV1("late dispose"),
    }));
    expect(host.getSnapshot()).toMatchObject({ readiness: "disposed", artifact: { revision: 3 } });
  });
});

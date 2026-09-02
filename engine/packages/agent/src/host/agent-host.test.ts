// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { createAgentSessionClientV1 } from "@sillymaker/agent/session";
import { createDeterministicFakeAgentSessionConnectorInternalV1 } from "../rpc/deterministic-fake-transport.ts";
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
  kind: "output_text_delta" | "output_data",
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
  it("keeps required Session readiness explicit while retry remains available", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1("unconfigured");
    const client = createAgentSessionClientV1({ connector: fake.connector });
    const host = createAgentHostInternalV1({ client, allowedActionIds: [actionIdInternalV1] });

    expect(host.getSnapshot().readiness).toBe("unconfigured");
    await host.connect();
    expect(host.getSnapshot()).toMatchObject({
      readiness: "unconfigured",
      diagnostic: {
        source: "session",
        diagnostic: { code: "agent_session.unconfigured" },
      },
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

  it("delegates non-empty submit size policy to the Session and selected model", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
    const client = createAgentSessionClientV1({ connector: fake.connector });
    const host = createAgentHostInternalV1({ client, allowedActionIds: [actionIdInternalV1] });
    await host.connect();
    await host.start();
    const text = "译".repeat(10_000);

    await host.submit(text);

    expect(fake.getOperations().at(-1)).toEqual({
      connection: 1,
      operation: "submit",
      input: { sessionId: "session.1", text },
    });
    expect(host.getSnapshot()).toMatchObject({ run: { runId: "run.1", status: "streaming" } });
  });

  it("preserves predecessor Artifact/draft across invalid completion, cancellation, and late events", async () => {
    const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
    const client = createAgentSessionClientV1({ connector: fake.connector });
    const host = createAgentHostInternalV1({ client, allowedActionIds: [actionIdInternalV1] });
    await host.connect();
    await host.start();
    await host.submit("first");
    fake.emit(streamInternalV1("output_data", "run.1", 1, {
      value: artifactCandidateInternalV1("first"),
    }));
    const predecessor = host.getSnapshot().artifact;
    expect(predecessor).toMatchObject({ revision: 1, document: { root: { kind: "column" } } });

    await host.submit("invalid successor");
    fake.emit(streamInternalV1("output_text_delta", "run.2", 1, { text: "partial draft" }));
    fake.emit(streamInternalV1("output_data", "run.2", 2, {
      value: artifactCandidateInternalV1("invalid", "remote.unknown"),
    }));
    expect(host.getSnapshot()).toMatchObject({
      run: { runId: "run.2", status: "failed" },
      draft: { runId: "run.2", text: "partial draft", status: "invalid" },
      artifact: { revision: 1 },
      diagnostic: { source: "artifact", diagnostic: { code: "artifact.action_unknown" } },
    });
    fake.emit(streamInternalV1("output_data", "run.2", 3, {
      value: artifactCandidateInternalV1("must stay rejected"),
    }));
    expect(host.getSnapshot().artifact).toBe(predecessor);

    await host.submit("second valid");
    fake.emit(streamInternalV1("output_data", "run.3", 1, {
      value: artifactCandidateInternalV1("second"),
    }));
    expect(host.getSnapshot().artifact?.revision).toBe(2);
    const operationCountBeforeReopen = fake.getOperations().length;
    expect(host.reopenArtifact(1)).toBe(true);
    expect(host.getSnapshot().artifact).toBe(predecessor);
    expect(fake.getOperations()).toHaveLength(operationCountBeforeReopen);

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
    fake.emit(streamInternalV1("output_text_delta", "run.4", 1, { text: "keep me" }));
    await host.cancel();
    fake.emit(streamInternalV1("output_data", "run.4", 2, {
      value: artifactCandidateInternalV1("late cancel"),
    }));
    expect(host.getSnapshot()).toMatchObject({
      run: { runId: "run.4", status: "cancel_requested" },
      draft: { runId: "run.4", text: "keep me", status: "cancelled" },
      artifact: { revision: 1 },
    });

    await host.submit("old run");
    await host.submit("successor run");
    fake.emit(streamInternalV1("output_data", "run.5", 1, {
      value: artifactCandidateInternalV1("late predecessor"),
    }));
    expect(host.getSnapshot().artifact?.revision).toBe(1);
    fake.emit(streamInternalV1("output_data", "run.6", 1, {
      value: artifactCandidateInternalV1("successor"),
    }));
    expect(host.getSnapshot().artifact?.revision).toBe(3);

    await host.submit("remote failure");
    fake.emit(streamInternalV1("output_text_delta", "run.7", 1, { text: "unfinished" }));
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
    fake.emit(streamInternalV1("output_data", "run.7", 3, {
      value: artifactCandidateInternalV1("late dispose"),
    }));
    expect(host.getSnapshot()).toMatchObject({ readiness: "disposed", artifact: { revision: 3 } });
  });

  it("returns Session connections and subscriptions to zero over repeated activation", async () => {
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
      const client = createAgentSessionClientV1({ connector: fake.connector });
      const host = createAgentHostInternalV1({
        client,
        allowedActionIds: [actionIdInternalV1],
      });
      let publications = 0;
      const unsubscribe = host.subscribe(() => publications += 1);
      await host.connect();
      await host.start();
      await host.submit(`iteration ${String(iteration)}`);
      expect(fake.getConnectionCount()).toBe(1);
      expect(fake.getCloseCount()).toBe(0);

      await host.dispose();
      const disposedSnapshot = host.getSnapshot();
      const publicationsAtDispose = publications;
      expect(disposedSnapshot.readiness).toBe("disposed");
      expect(fake.getCloseCount()).toBe(1);

      fake.emitToConnection(
        1,
        streamInternalV1("output_data", "run.1", 1, {
          value: artifactCandidateInternalV1("late after dispose"),
        }),
      );
      expect(host.getSnapshot()).toBe(disposedSnapshot);
      expect(publications).toBe(publicationsAtDispose);
      unsubscribe();
      await host.dispose();
      expect(fake.getCloseCount()).toBe(1);
    }
  });
});

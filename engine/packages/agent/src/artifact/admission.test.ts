// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  admitUiArtifactCandidateInternalV1,
  admitUiIntentInternalV1,
  createUiArtifactRevisionInternalV1,
} from "./admission.ts";
import { uiIntentSchemaRevisionInternalV1 } from "./contract.ts";

const actionIdInternalV1 = "sillymaker.authoring.scene.nudge_selected_x";

function candidateInternalV1(label = "向右移动") {
  return {
    schemaRevision: 1,
    root: {
      kind: "column",
      nodeId: "root",
      children: [
        { kind: "text", nodeId: "summary", text: "调整当前 Scene" },
        { kind: "action", nodeId: "nudge", label, actionId: actionIdInternalV1 },
      ],
    },
  };
}

function admittedDocumentInternalV1() {
  const result = admitUiArtifactCandidateInternalV1(candidateInternalV1(), [
    actionIdInternalV1,
  ]);
  expect(result.kind).toBe("admitted");
  if (result.kind !== "admitted") throw new TypeError("expected admitted artifact");
  return result.document;
}

describe("UiArtifact admission", () => {
  it("builds one admitted document from the closed vocabulary", () => {
    const document = admittedDocumentInternalV1();
    expect(document).toEqual(candidateInternalV1());
  });

  it("admits syntactically valid node and action IDs longer than the former arbitrary limit", () => {
    const nodeId = `node.${"segment".repeat(24)}`;
    const actionId = `action.${"segment".repeat(24)}`;
    const result = admitUiArtifactCandidateInternalV1({
      schemaRevision: 1,
      root: {
        kind: "action",
        nodeId,
        label: "Continue",
        actionId,
      },
    }, [actionId]);
    expect(result).toMatchObject({
      kind: "admitted",
      document: { root: { nodeId, actionId } },
    });
    if (result.kind !== "admitted") throw new TypeError("expected admitted artifact");

    const revision = createUiArtifactRevisionInternalV1({
      hostIdentity: 7,
      revision: 3,
      sessionId: `session.${"segment".repeat(24)}`,
      runId: `run.${"segment".repeat(24)}`,
      completedSequence: 2,
      document: result.document,
    });
    expect(admitUiIntentInternalV1({
      schemaRevision: uiIntentSchemaRevisionInternalV1,
      kind: "ui.action.invoke",
      hostIdentity: 7,
      artifactRevision: 3,
      nodeId,
      actionId,
    }, revision)).toMatchObject({ kind: "admitted", intent: { nodeId, actionId } });
  });

  it("atomically rejects accessors, limits, unknown nodes, actions, and duplicate IDs", () => {
    let getterCalls = 0;
    const accessor = { schemaRevision: 1 } as Record<string, unknown>;
    Object.defineProperty(accessor, "root", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return candidateInternalV1().root;
      },
    });
    expect(admitUiArtifactCandidateInternalV1(accessor, [actionIdInternalV1])).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "artifact.canonical_invalid" },
    });
    expect(getterCalls).toBe(0);

    expect(admitUiArtifactCandidateInternalV1({
      schemaRevision: 1,
      root: { kind: "html", nodeId: "root", html: "<script />" },
    }, [actionIdInternalV1])).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "artifact.node_unknown" },
    });
    expect(admitUiArtifactCandidateInternalV1(candidateInternalV1(), ["another.action"]))
      .toMatchObject({
        kind: "rejected",
        diagnostic: { code: "artifact.action_unknown" },
      });

    const duplicate = candidateInternalV1();
    duplicate.root.children[1]!.nodeId = "summary";
    expect(admitUiArtifactCandidateInternalV1(duplicate, [actionIdInternalV1])).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "artifact.node_duplicate" },
    });
    expect(admitUiArtifactCandidateInternalV1(candidateInternalV1("x".repeat(70_000)), [
      actionIdInternalV1,
    ])).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "artifact.limit_exceeded" },
    });
  });

  it("admits only the exact current Host/revision/node/action intent", () => {
    const revision = createUiArtifactRevisionInternalV1({
      hostIdentity: 7,
      revision: 3,
      sessionId: "session.1",
      runId: "run.1",
      completedSequence: 2,
      document: admittedDocumentInternalV1(),
    });
    const intent = {
      schemaRevision: uiIntentSchemaRevisionInternalV1,
      kind: "ui.action.invoke",
      hostIdentity: 7,
      artifactRevision: 3,
      nodeId: "nudge",
      actionId: actionIdInternalV1,
    };
    expect(admitUiIntentInternalV1(intent, revision)).toEqual({
      kind: "admitted",
      intent,
    });
    expect(admitUiIntentInternalV1({ ...intent, hostIdentity: 8 }, revision)).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "ui_intent.host_stale" },
    });
    expect(admitUiIntentInternalV1({ ...intent, artifactRevision: 2 }, revision)).toMatchObject({
      kind: "rejected",
      diagnostic: { code: "ui_intent.artifact_stale" },
    });
    expect(admitUiIntentInternalV1({ ...intent, actionId: "another.action" }, revision))
      .toMatchObject({
        kind: "rejected",
        diagnostic: { code: "ui_intent.action_mismatch" },
      });
  });
});

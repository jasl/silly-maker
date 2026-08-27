// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserPiEngineRequestV1,
  admitBrowserPiWorkerInboundMessageV1,
  admitBrowserPiWorkerWorkspaceOutboundMessageV1,
} from "../agent/browser-pi-worker-protocol.ts";
import { serializeCreatorAgentSubmitV1 } from "../product/creator-agent-admission.ts";

const programIdV1 = "program.workspace.preview.1";
const workspaceIdV1 = "workspace.preview.1";
const workspaceSessionIdV1 = "workspace.session.1";

const submitTextV1 = serializeCreatorAgentSubmitV1({
  revision: 1,
  proposalId: "workspace.preview.1.proposal.1",
  programId: programIdV1,
  baseProgramRevision: 1,
  text: "Create one reviewable artifact.",
});

const submitRecordV1 = {
  revision: 1,
  requestId: 7,
  method: "submit",
  params: { sessionId: "pi.session.1", text: submitTextV1 },
} as const;

const executionBindingV1 = {
  revision: 1,
  programId: programIdV1,
  workspaceId: workspaceIdV1,
  workspaceSessionId: workspaceSessionIdV1,
  expectedGeneration: 1,
} as const;

function rpcEnvelopeV1(record: unknown, execution?: unknown): Record<string, unknown> {
  return execution === undefined
    ? { revision: 1, kind: "rpc_request", requestId: 11, record }
    : { revision: 1, kind: "rpc_request", requestId: 11, record, execution };
}

function workspaceEnvelopeV1(record: unknown): Record<string, unknown> {
  return { revision: 1, kind: "workspace_request", requestId: 12, record };
}

function receiptV1(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    revision: 1,
    sequence: 1,
    programId: programIdV1,
    workspaceId: workspaceIdV1,
    workspaceSessionId: workspaceSessionIdV1,
    sessionId: "pi.session.1",
    runId: "pi.run.1",
    toolCallId: "pi.tool.write.1",
    tool: "write",
    expectedGeneration: 1,
    baseGeneration: 1,
    resultingGeneration: 2,
    outcome: "succeeded",
    effect: "changed",
    changedPaths: ["artifacts/program.md"],
    diagnosticCode: null,
    ...overrides,
  };
}

function snapshotV1(
  phase: "open" | "closed",
  receipts: readonly Record<string, unknown>[],
  generation = 2,
): Record<string, unknown> {
  return {
    revision: 1,
    phase,
    programId: programIdV1,
    workspaceId: workspaceIdV1,
    workspaceSessionId: workspaceSessionIdV1,
    generation,
    receipts,
  };
}

describe("Browser Pi Worker P3a-B0 protocol", () => {
  it("keeps start/cancel inner admission and adds execution only beside valid submit", () => {
    const start = { revision: 1, requestId: 1, method: "start" };
    const cancel = {
      revision: 1,
      requestId: 2,
      method: "cancel",
      params: { sessionId: "pi.session.1", runId: "pi.run.1" },
    };
    expect(admitBrowserPiEngineRequestV1(start)?.method).toBe("start");
    expect(admitBrowserPiEngineRequestV1(cancel)?.method).toBe("cancel");
    expect(admitBrowserPiWorkerInboundMessageV1(rpcEnvelopeV1(start))).not.toBeNull();
    expect(admitBrowserPiWorkerInboundMessageV1(rpcEnvelopeV1(cancel))).not.toBeNull();

    const admitted = admitBrowserPiWorkerInboundMessageV1(
      rpcEnvelopeV1(submitRecordV1, executionBindingV1),
    );
    expect(admitted).toMatchObject({
      kind: "rpc_request",
      record: submitRecordV1,
      execution: executionBindingV1,
    });
    if (admitted?.kind === "rpc_request") expect(admitted.record).toBe(submitRecordV1);

    expect(admitBrowserPiWorkerInboundMessageV1(rpcEnvelopeV1(submitRecordV1))).toBeNull();
    expect(
      admitBrowserPiWorkerInboundMessageV1(
        rpcEnvelopeV1(submitRecordV1, { ...executionBindingV1, programId: "program.other" }),
      ),
    ).toBeNull();
    expect(
      admitBrowserPiWorkerInboundMessageV1(
        rpcEnvelopeV1(submitRecordV1, { ...executionBindingV1, provider: "forbidden" }),
      ),
    ).toBeNull();
    expect(admitBrowserPiWorkerInboundMessageV1(rpcEnvelopeV1(start, executionBindingV1)))
      .toBeNull();

    const invalidInner = { ...submitRecordV1, unexpected: true };
    expect(admitBrowserPiEngineRequestV1(invalidInner)).toBeNull();
    expect(admitBrowserPiWorkerInboundMessageV1(rpcEnvelopeV1(invalidInner))).not.toBeNull();
  });

  it("admits exact attach, close, query, and contiguous-prefix acknowledgement requests", () => {
    expect(
      admitBrowserPiWorkerInboundMessageV1(
        workspaceEnvelopeV1({
          method: "attach_workspace",
          descriptor: executionBindingV1,
        }),
      ),
    ).toMatchObject({ kind: "workspace_request", record: { method: "attach_workspace" } });
    for (const method of ["close_workspace", "query_workspace"] as const) {
      expect(
        admitBrowserPiWorkerInboundMessageV1(
          workspaceEnvelopeV1({ method, workspaceSessionId: workspaceSessionIdV1 }),
        ),
      ).toMatchObject({ kind: "workspace_request", record: { method } });
    }
    expect(
      admitBrowserPiWorkerInboundMessageV1(
        workspaceEnvelopeV1({
          method: "acknowledge_workspace_receipts",
          workspaceSessionId: workspaceSessionIdV1,
          throughSequence: 3,
        }),
      ),
    ).toMatchObject({
      kind: "workspace_request",
      record: { method: "acknowledge_workspace_receipts", throughSequence: 3 },
    });

    expect(
      admitBrowserPiWorkerInboundMessageV1(
        workspaceEnvelopeV1({
          method: "acknowledge_workspace_receipts",
          workspaceSessionId: workspaceSessionIdV1,
          throughSequence: 0,
        }),
      ),
    ).toBeNull();
    expect(
      admitBrowserPiWorkerInboundMessageV1(
        workspaceEnvelopeV1({
          method: "query_workspace",
          workspaceSessionId: workspaceSessionIdV1,
          provider: "forbidden",
        }),
      ),
    ).toBeNull();
  });

  it("admits close-retained snapshots and only acknowledgements that removed a prefix", () => {
    const first = receiptV1();
    const second = receiptV1({
      sequence: 2,
      toolCallId: "pi.tool.write.2",
      baseGeneration: 2,
      resultingGeneration: 3,
    });
    const closed = snapshotV1("closed", [first, second], 3);
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        revision: 1,
        kind: "workspace_response",
        requestId: 20,
        ok: true,
        response: { method: "close_workspace", snapshot: closed },
      }),
    ).toMatchObject({
      response: { snapshot: { phase: "closed", receipts: [{ sequence: 1 }, { sequence: 2 }] } },
    });
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        revision: 1,
        kind: "workspace_response",
        requestId: 21,
        ok: true,
        response: { method: "query_workspace", snapshot: closed },
      }),
    ).not.toBeNull();
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        revision: 1,
        kind: "workspace_response",
        requestId: 22,
        ok: true,
        response: {
          method: "acknowledge_workspace_receipts",
          throughSequence: 1,
          snapshot: snapshotV1("closed", [second], 3),
        },
      }),
    ).not.toBeNull();
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        revision: 1,
        kind: "workspace_response",
        requestId: 23,
        ok: true,
        response: {
          method: "acknowledge_workspace_receipts",
          throughSequence: 1,
          snapshot: closed,
        },
      }),
    ).toBeNull();

    const nonContiguous = snapshotV1("closed", [first, { ...second, sequence: 3 }], 3);
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        revision: 1,
        kind: "workspace_response",
        requestId: 24,
        ok: true,
        response: { method: "query_workspace", snapshot: nonContiguous },
      }),
    ).toBeNull();
  });

  it("admits raw receipts with transient Pi correlation and rejects product or payload data", () => {
    const event = {
      revision: 1,
      kind: "workspace_receipt",
      receipt: receiptV1(),
    };
    const admitted = admitBrowserPiWorkerWorkspaceOutboundMessageV1(event);
    expect(admitted).toMatchObject({
      kind: "workspace_receipt",
      receipt: {
        programId: programIdV1,
        workspaceId: workspaceIdV1,
        workspaceSessionId: workspaceSessionIdV1,
        sessionId: "pi.session.1",
        runId: "pi.run.1",
        toolCallId: "pi.tool.write.1",
      },
    });
    expect(JSON.stringify(admitted)).not.toContain("agentRunId");

    for (const forbidden of ["agentRunId", "content", "args", "provider"] as const) {
      expect(
        admitBrowserPiWorkerWorkspaceOutboundMessageV1({
          ...event,
          receipt: receiptV1({ [forbidden]: "forbidden" }),
        }),
      ).toBeNull();
    }
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        ...event,
        receipt: receiptV1({ outcome: "failed", diagnosticCode: "scope_busy" }),
      }),
    ).toBeNull();
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        ...event,
        receipt: receiptV1({ outcome: "stale", diagnosticCode: "generation_stale" }),
      }),
    ).toBeNull();
  });

  it("enforces generation effects and the bounded normalized changed path", () => {
    const event = { revision: 1, kind: "workspace_receipt" };
    expect(
      admitBrowserPiWorkerWorkspaceOutboundMessageV1({
        ...event,
        receipt: receiptV1({ effect: "none", changedPaths: [], resultingGeneration: 1 }),
      }),
    ).not.toBeNull();
    for (
      const invalidReceipt of [
        receiptV1({ resultingGeneration: 1 }),
        receiptV1({ effect: "none", changedPaths: ["artifact.md"], resultingGeneration: 1 }),
        receiptV1({ changedPaths: ["../artifact.md"] }),
        receiptV1({ changedPaths: ["a".repeat(513)] }),
        receiptV1({ changedPaths: [Array.from({ length: 33 }, () => "a").join("/")] }),
        receiptV1({ expectedGeneration: 2, baseGeneration: 1 }),
      ]
    ) {
      expect(
        admitBrowserPiWorkerWorkspaceOutboundMessageV1({ ...event, receipt: invalidReceipt }),
      ).toBeNull();
    }
  });
});

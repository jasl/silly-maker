// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserWorkspaceHostControlOutboundMessageV1,
  admitBrowserWorkspaceHostControlRequestV1,
  admitBrowserWorkspaceHostEnvironmentOutboundMessageV1,
  admitBrowserWorkspaceHostEnvironmentRequestV1,
  browserWorkspaceNativePiToolPayloadMaximumBytesV1,
  isBrowserWorkspaceHostNormalizedPathV1,
} from "../workspace/browser-workspace-host-protocol.ts";

const anchorV1 = {
  revision: 1,
  programId: "program.preview.1",
  workspaceId: "workspace.preview.1",
  volumeId: "volume.preview.1",
  workspaceFormat: 1,
} as const;

const descriptorV1 = {
  revision: 1,
  programId: anchorV1.programId,
  workspaceId: anchorV1.workspaceId,
  workspaceSessionId: "workspace-session.preview.1",
  generation: 7,
} as const;

function controlRequestV1(record: unknown): Record<string, unknown> {
  return { revision: 1, kind: "control_request", requestId: 1, record };
}

function environmentRequestV1(record: unknown): Record<string, unknown> {
  return { revision: 1, kind: "environment_request", requestId: 2, record };
}

function receiptV1(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    revision: 1,
    sequence: 1,
    programId: anchorV1.programId,
    workspaceId: anchorV1.workspaceId,
    workspaceSessionId: descriptorV1.workspaceSessionId,
    sessionId: "pi-session.preview.1",
    runId: "pi-run.preview.1",
    toolCallId: "pi-tool.write.1",
    tool: "write",
    expectedGeneration: 7,
    baseGeneration: 7,
    resultingGeneration: 8,
    outcome: "succeeded",
    effect: "changed",
    changedPaths: ["artifacts/program.md"],
    diagnosticCode: null,
    ...overrides,
  };
}

describe("SillyOS Browser Workspace Host protocol", () => {
  it("admits exact candidate, generation-free anchor open, discard, and attach requests", () => {
    expect(
      admitBrowserWorkspaceHostControlRequestV1(
        controlRequestV1({
          method: "create_candidate",
          programId: anchorV1.programId,
          workspaceId: anchorV1.workspaceId,
        }),
      ),
    ).toMatchObject({ record: { method: "create_candidate" } });
    expect(
      admitBrowserWorkspaceHostControlRequestV1(
        controlRequestV1({ method: "open_workspace", anchor: anchorV1 }),
      ),
    ).toMatchObject({ record: { method: "open_workspace", anchor: anchorV1 } });
    expect(
      admitBrowserWorkspaceHostControlRequestV1(
        controlRequestV1({ method: "discard_candidate", volumeId: anchorV1.volumeId }),
      ),
    ).toMatchObject({ record: { method: "discard_candidate", volumeId: anchorV1.volumeId } });
    expect(
      admitBrowserWorkspaceHostControlRequestV1(
        controlRequestV1({
          method: "attach_environment",
          workspaceSessionId: descriptorV1.workspaceSessionId,
        }),
      ),
    ).toMatchObject({ record: { method: "attach_environment" } });
  });

  it("rejects null, generation-bearing, extra, and accessor control input without invoking it", () => {
    expect(
      admitBrowserWorkspaceHostControlRequestV1(
        controlRequestV1({ method: "open_workspace", anchor: null }),
      ),
    ).toBeNull();
    expect(
      admitBrowserWorkspaceHostControlRequestV1(
        controlRequestV1({
          method: "open_workspace",
          anchor: { ...anchorV1, generation: 7 },
        }),
      ),
    ).toBeNull();
    expect(
      admitBrowserWorkspaceHostControlRequestV1(
        controlRequestV1({
          method: "discard_candidate",
          volumeId: anchorV1.volumeId,
          provider: "forbidden",
        }),
      ),
    ).toBeNull();
    expect(
      admitBrowserWorkspaceHostControlRequestV1({
        ...controlRequestV1({ method: "open_workspace", anchor: anchorV1 }),
        extra: true,
      }),
    ).toBeNull();

    let getterCalls = 0;
    const accessor = controlRequestV1({ method: "open_workspace", anchor: anchorV1 });
    Object.defineProperty(accessor, "record", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return { method: "open_workspace", anchor: anchorV1 };
      },
    });
    expect(admitBrowserWorkspaceHostControlRequestV1(accessor)).toBeNull();
    expect(getterCalls).toBe(0);
  });

  it("enforces the explicit 256 KiB native Pi write payload guard", () => {
    expect(browserWorkspaceNativePiToolPayloadMaximumBytesV1).toBe(256 * 1024);
    expect(
      admitBrowserWorkspaceHostEnvironmentRequestV1(
        environmentRequestV1({
          method: "write_file",
          path: "artifacts/program.md",
          bytes: new Uint8Array(browserWorkspaceNativePiToolPayloadMaximumBytesV1),
        }),
      ),
    ).toMatchObject({ record: { method: "write_file" } });
    expect(
      admitBrowserWorkspaceHostEnvironmentRequestV1(
        environmentRequestV1({
          method: "write_file",
          path: "artifacts/program.md",
          bytes: new Uint8Array(browserWorkspaceNativePiToolPayloadMaximumBytesV1 + 1),
        }),
      ),
    ).toBeNull();
    for (
      const record of [
        { method: "read_binary_file", path: "artifacts\\program.md" },
        {
          method: "write_file",
          path: "artifacts\\program.md",
          bytes: new Uint8Array(),
        },
      ]
    ) {
      expect(
        admitBrowserWorkspaceHostEnvironmentRequestV1(environmentRequestV1(record)),
      ).toMatchObject({ record: { method: record.method, path: record.path } });
    }
    expect(isBrowserWorkspaceHostNormalizedPathV1("artifacts\\program.md")).toBe(false);
  });

  it("keeps checkpoint identity distinct from execution descriptor generation in snapshots", () => {
    const admitted = admitBrowserWorkspaceHostControlOutboundMessageV1({
      revision: 1,
      kind: "control_response",
      requestId: 3,
      ok: true,
      response: {
        method: "attach_environment",
        snapshot: {
          revision: 1,
          phase: "open",
          volumeId: anchorV1.volumeId,
          checkpointId: "checkpoint.preview.3",
          descriptor: descriptorV1,
          anchor: anchorV1,
        },
      },
    });

    expect(admitted).toMatchObject({
      response: {
        method: "attach_environment",
        snapshot: {
          checkpointId: "checkpoint.preview.3",
          descriptor: { generation: 7 },
          anchor: { volumeId: anchorV1.volumeId },
        },
      },
    });
  });

  it("admits capacity_exceeded as a stable control failure", () => {
    expect(
      admitBrowserWorkspaceHostControlOutboundMessageV1({
        revision: 1,
        kind: "control_response",
        requestId: 4,
        ok: false,
        code: "capacity_exceeded",
      }),
    ).toMatchObject({ ok: false, code: "capacity_exceeded" });
  });

  it("keeps raw receipts payload-free and enforces effect generation transitions", () => {
    const event = { revision: 1, kind: "workspace_receipt" } as const;
    const admitted = admitBrowserWorkspaceHostEnvironmentOutboundMessageV1({
      ...event,
      receipt: receiptV1(),
    });
    expect(admitted).toMatchObject({ kind: "workspace_receipt", receipt: { sequence: 1 } });
    expect(JSON.stringify(admitted)).not.toContain("content");
    expect(JSON.stringify(admitted)).not.toContain("provider");

    for (const forbidden of ["content", "provider"] as const) {
      expect(
        admitBrowserWorkspaceHostEnvironmentOutboundMessageV1({
          ...event,
          receipt: receiptV1({ [forbidden]: "forbidden" }),
        }),
      ).toBeNull();
    }
    expect(
      admitBrowserWorkspaceHostEnvironmentOutboundMessageV1({
        ...event,
        receipt: receiptV1({ effect: "none", changedPaths: [], resultingGeneration: 7 }),
      }),
    ).not.toBeNull();
    for (
      const invalidReceipt of [
        receiptV1({ effect: "none", changedPaths: [], resultingGeneration: 8 }),
        receiptV1({ resultingGeneration: 7 }),
        receiptV1({ effect: "none", changedPaths: ["artifacts/program.md"] }),
      ]
    ) {
      expect(
        admitBrowserWorkspaceHostEnvironmentOutboundMessageV1({
          ...event,
          receipt: invalidReceipt,
        }),
      ).toBeNull();
    }
  });
});

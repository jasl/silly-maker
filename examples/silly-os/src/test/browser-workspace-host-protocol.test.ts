// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserWorkspaceHostControlOutboundMessageV1,
  admitBrowserWorkspaceHostControlRequestV1,
  admitBrowserWorkspaceHostEnvironmentOutboundMessageV1,
  admitBrowserWorkspaceHostEnvironmentRequestV1,
  admitBrowserWorkspaceHostExportInboundMessageV1,
  admitBrowserWorkspaceHostExportOutboundMessageV1,
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

  it("admits native Pi edit scopes and exact addressed file metadata", () => {
    expect(
      admitBrowserWorkspaceHostEnvironmentRequestV1(
        environmentRequestV1({
          method: "begin_tool",
          toolCallId: "pi-tool.edit.1",
          tool: "edit",
        }),
      ),
    ).toMatchObject({ record: { method: "begin_tool", tool: "edit" } });
    expect(
      admitBrowserWorkspaceHostEnvironmentRequestV1(
        environmentRequestV1({ method: "file_info", path: "artifacts/program.md" }),
      ),
    ).toMatchObject({ record: { method: "file_info", path: "artifacts/program.md" } });

    const response = {
      revision: 1,
      kind: "environment_response",
      requestId: 2,
      ok: true,
      response: {
        method: "file_info",
        value: {
          name: "program.md",
          path: "/workspace/artifacts/program.md",
          kind: "file",
          size: 71,
          mtimeMs: 1_700_000_000_000,
        },
      },
    } as const;
    expect(admitBrowserWorkspaceHostEnvironmentOutboundMessageV1(response)).toEqual(response);
    expect(
      admitBrowserWorkspaceHostEnvironmentOutboundMessageV1({
        ...response,
        response: {
          ...response.response,
          value: { ...response.response.value, mtimeMs: -1 },
        },
      }),
    ).toBeNull();
    expect(
      admitBrowserWorkspaceHostEnvironmentOutboundMessageV1({
        ...response,
        response: {
          ...response.response,
          value: { ...response.response.value, provider: "forbidden" },
        },
      }),
    ).toBeNull();

    expect(
      admitBrowserWorkspaceHostEnvironmentOutboundMessageV1({
        revision: 1,
        kind: "workspace_receipt",
        receipt: receiptV1({ tool: "edit", toolCallId: "pi-tool.edit.1" }),
      }),
    ).toMatchObject({ receipt: { tool: "edit" } });
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

  it("admits only the exact export start and ordered job-port records", () => {
    expect(
      admitBrowserWorkspaceHostControlRequestV1(
        controlRequestV1({
          method: "start_export",
          exportId: "sillyos.export.1",
          workspaceSessionId: descriptorV1.workspaceSessionId,
          expectedCheckpointId: "checkpoint.preview.3",
          expectedGeneration: 7,
          programRevision: 2,
          repositoryRevision: 4,
        }),
      ),
    ).toMatchObject({ record: { method: "start_export", expectedGeneration: 7 } });
    expect(
      admitBrowserWorkspaceHostControlRequestV1(
        controlRequestV1({
          method: "start_export",
          exportId: "sillyos.export.1",
          workspaceSessionId: descriptorV1.workspaceSessionId,
          expectedCheckpointId: "checkpoint.preview.3",
          expectedGeneration: 7,
          programRevision: 2,
          repositoryRevision: 4,
          provider: "forbidden",
        }),
      ),
    ).toBeNull();

    expect(
      admitBrowserWorkspaceHostExportInboundMessageV1({
        revision: 1,
        kind: "workspace_export_cancel",
        exportId: "sillyos.export.1",
      }),
    ).not.toBeNull();
    expect(
      admitBrowserWorkspaceHostExportInboundMessageV1({
        revision: 1,
        kind: "workspace_export_release",
        exportId: "sillyos.export.1",
        reason: "forbidden",
      }),
    ).toBeNull();

    const progress = {
      filesCompleted: 3,
      filesTotal: 3,
      bytesWritten: 512,
      bytesTotal: 512,
    };
    expect(
      admitBrowserWorkspaceHostExportOutboundMessageV1({
        revision: 1,
        kind: "workspace_export_ready",
        exportId: "sillyos.export.1",
        sequence: 2,
        downloadUrl: "blob:sillyos-export-test",
        checkpointId: "checkpoint.preview.3",
        generation: 7,
        ...progress,
      }),
    ).toMatchObject({ kind: "workspace_export_ready", sequence: 2, ...progress });
    expect(
      admitBrowserWorkspaceHostExportOutboundMessageV1({
        revision: 1,
        kind: "workspace_export_failed",
        exportId: "sillyos.export.1",
        sequence: 3,
        code: "capacity_exceeded",
        ...progress,
        bytesWritten: 513,
      }),
    ).toBeNull();
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

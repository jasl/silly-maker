// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserWorkspaceHostControlOutboundMessageV1,
  admitBrowserWorkspaceHostControlRequestV1,
  admitBrowserWorkspaceHostEnvironmentOutboundMessageV1,
  admitBrowserWorkspaceHostEnvironmentRequestV1,
  admitBrowserWorkspaceHostExportInboundMessageV1,
  admitBrowserWorkspaceHostExportOutboundMessageV1,
  browserWorkspaceBashChangedPathMaximumV1,
  browserWorkspaceBashMutationAttemptMaximumV1,
  browserWorkspaceNativePiToolPayloadMaximumBytesV1,
  browserWorkspaceShellCommandMaximumUtf8BytesV1,
  browserWorkspaceShellEnvironmentMaximumEntriesV1,
  browserWorkspaceShellOutputMaximumUtf8BytesV1,
  isBrowserWorkspaceHostNormalizedPathV1,
} from "../workspace/browser-workspace-host-protocol.ts";
import {
  admitProgramWorkspaceSnapshotReceiptV1,
  programWorkspaceSnapshotReceiptsEqualV1,
} from "../workspace/contracts.ts";

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

const candidateV1 = {
  revision: 1,
  anchor: anchorV1,
  checkpointId: "checkpoint.preview.1",
  generation: 1,
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

function snapshotReceiptV1(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    revision: 1,
    snapshotId: "snapshot.preview.1",
    programId: anchorV1.programId,
    workspaceId: anchorV1.workspaceId,
    volumeId: anchorV1.volumeId,
    workspaceFormat: 1,
    proposalId: "proposal.preview.1",
    programRevision: 2,
    baseRepositoryRevision: 4,
    checkpointId: "checkpoint.preview.3",
    generation: 7,
    fileCount: 3,
    archiveBytes: 512,
    ...overrides,
  };
}

describe("SillyOS Browser Workspace Host protocol", () => {
  it("rejects extra credential-bearing fields on the begin-run Workspace request", () => {
    const binding = {
      revision: 1,
      programId: descriptorV1.programId,
      workspaceId: descriptorV1.workspaceId,
      workspaceSessionId: descriptorV1.workspaceSessionId,
      expectedGeneration: descriptorV1.generation,
    } as const;
    const beginRunRecord = {
      method: "begin_run",
      binding,
      sessionId: "pi-session.1",
      runId: "pi-run.1",
    } as const;
    const beginRun = environmentRequestV1(beginRunRecord);

    expect(admitBrowserWorkspaceHostEnvironmentRequestV1({
      ...beginRun,
      credential: { kind: "api_key", value: "must-not-cross" },
    })).toBeNull();
    expect(admitBrowserWorkspaceHostEnvironmentRequestV1({
      ...beginRun,
      record: { ...beginRunRecord, apiKey: "must-not-cross" },
    })).toBeNull();
    expect(admitBrowserWorkspaceHostEnvironmentRequestV1({
      ...beginRun,
      record: {
        ...beginRunRecord,
        binding: { ...binding, authorization: "must-not-cross" },
      },
    })).toBeNull();
  });

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

  it("admits the bounded native Pi bash scope and exact shell records", () => {
    expect(browserWorkspaceBashMutationAttemptMaximumV1).toBe(128);
    expect(browserWorkspaceBashChangedPathMaximumV1).toBe(64);
    expect(
      admitBrowserWorkspaceHostEnvironmentRequestV1(
        environmentRequestV1({
          method: "begin_tool",
          toolCallId: "pi-tool.bash.1",
          tool: "bash",
        }),
      ),
    ).toMatchObject({ record: { method: "begin_tool", tool: "bash" } });

    const shell = {
      method: "execute_shell",
      command: "printf hello > output.txt",
      cwd: "/workspace",
      env: { FEATURE: "creator" },
      inheritEnv: true,
      timeoutMilliseconds: 2_500,
    } as const;
    expect(
      admitBrowserWorkspaceHostEnvironmentRequestV1(environmentRequestV1(shell)),
    ).toMatchObject({ record: shell });
    expect(
      admitBrowserWorkspaceHostEnvironmentRequestV1(
        environmentRequestV1({ ...shell, command: "x".repeat(16_385) }),
      ),
    ).toBeNull();
    expect(browserWorkspaceShellCommandMaximumUtf8BytesV1).toBe(16 * 1024);
    expect(
      admitBrowserWorkspaceHostEnvironmentRequestV1(
        environmentRequestV1({
          ...shell,
          env: Object.fromEntries(
            Array.from(
              { length: browserWorkspaceShellEnvironmentMaximumEntriesV1 + 1 },
              (_, index) => [`KEY_${String(index)}`, "value"],
            ),
          ),
        }),
      ),
    ).toBeNull();
    expect(
      admitBrowserWorkspaceHostEnvironmentRequestV1(
        environmentRequestV1({ ...shell, env: { "NOT-A-VARIABLE": "value" } }),
      ),
    ).toBeNull();
    expect(
      admitBrowserWorkspaceHostEnvironmentRequestV1(
        environmentRequestV1({ ...shell, timeoutMilliseconds: 30_001 }),
      ),
    ).toBeNull();
    expect(
      admitBrowserWorkspaceHostEnvironmentRequestV1(
        environmentRequestV1({ ...shell, cwd: "/tmp" }),
      ),
    ).toBeNull();

    for (
      const record of [
        {
          method: "append_file",
          path: ".sillyos/tmp/bash-log.log",
          bytes: new Uint8Array([1]),
        },
        { method: "create_temp_file", prefix: "bash-", suffix: ".log" },
        { method: "cancel_tool", toolCallId: "pi-tool.bash.1" },
      ]
    ) {
      expect(
        admitBrowserWorkspaceHostEnvironmentRequestV1(environmentRequestV1(record)),
      ).toMatchObject({ record: { method: record.method } });
    }
    expect(
      admitBrowserWorkspaceHostEnvironmentRequestV1(
        environmentRequestV1({ method: "create_temp_file", prefix: "shell-", suffix: ".log" }),
      ),
    ).toBeNull();

    const terminal = {
      revision: 1,
      kind: "environment_response",
      requestId: 2,
      ok: true,
      response: {
        method: "execute_shell",
        termination: "completed",
        stdout: "hello",
        stderr: "",
        exitCode: 0,
      },
    } as const;
    expect(admitBrowserWorkspaceHostEnvironmentOutboundMessageV1(terminal)).toEqual(terminal);
    expect(
      admitBrowserWorkspaceHostEnvironmentOutboundMessageV1({
        ...terminal,
        response: {
          ...terminal.response,
          stdout: "x".repeat(browserWorkspaceShellOutputMaximumUtf8BytesV1 + 1),
        },
      }),
    ).toBeNull();
  });

  it("admits multi-generation bash receipts without weakening native write receipts", () => {
    const bashReceipt = receiptV1({
      tool: "bash",
      toolCallId: "pi-tool.bash.1",
      resultingGeneration: 9,
      changedPaths: ["output.txt", ".sillyos/tmp/bash-output.log"],
    });
    expect(
      admitBrowserWorkspaceHostEnvironmentOutboundMessageV1({
        revision: 1,
        kind: "workspace_receipt",
        receipt: bashReceipt,
      }),
    ).toMatchObject({ receipt: { tool: "bash", resultingGeneration: 9 } });
    for (
      const receipt of [
        { ...bashReceipt, changedPaths: ["output.txt", "output.txt"] },
        { ...bashReceipt, resultingGeneration: 136 },
        receiptV1({ changedPaths: ["a.txt", "b.txt"], resultingGeneration: 9 }),
      ]
    ) {
      expect(
        admitBrowserWorkspaceHostEnvironmentOutboundMessageV1({
          revision: 1,
          kind: "workspace_receipt",
          receipt,
        }),
      ).toBeNull();
    }
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

  it("admits the exact target-neutral Program workspace snapshot receipt", () => {
    const receipt = admitProgramWorkspaceSnapshotReceiptV1(snapshotReceiptV1());
    const same = admitProgramWorkspaceSnapshotReceiptV1(snapshotReceiptV1());
    const newer = admitProgramWorkspaceSnapshotReceiptV1(snapshotReceiptV1({ generation: 8 }));
    if (receipt === null || same === null || newer === null) {
      throw new Error("valid snapshot receipt fixture was rejected");
    }

    expect(receipt).toMatchObject({ snapshotId: "snapshot.preview.1", archiveBytes: 512 });
    expect(programWorkspaceSnapshotReceiptsEqualV1(receipt, same)).toBe(true);
    expect(programWorkspaceSnapshotReceiptsEqualV1(receipt, newer)).toBe(false);
    expect(
      admitProgramWorkspaceSnapshotReceiptV1(snapshotReceiptV1({ provider: "forbidden" })),
    ).toBeNull();
  });

  it("admits exact review capture, snapshot discovery, and receipt-bound publication requests", () => {
    const prepare = {
      method: "prepare_snapshot",
      workspaceSessionId: descriptorV1.workspaceSessionId,
      snapshotId: "snapshot.preview.1",
      proposalId: "proposal.preview.1",
      expectedCheckpointId: "checkpoint.preview.3",
      expectedGeneration: 7,
      programRevision: 2,
      baseRepositoryRevision: 4,
    } as const;
    expect(
      admitBrowserWorkspaceHostControlRequestV1(controlRequestV1(prepare)),
    ).toMatchObject({ record: prepare });
    expect(
      admitBrowserWorkspaceHostControlRequestV1(
        controlRequestV1({
          method: "capture_review_head",
          workspaceSessionId: descriptorV1.workspaceSessionId,
        }),
      ),
    ).toMatchObject({ record: { method: "capture_review_head" } });
    expect(
      admitBrowserWorkspaceHostControlRequestV1(
        controlRequestV1({
          method: "query_snapshot_candidate",
          workspaceSessionId: descriptorV1.workspaceSessionId,
        }),
      ),
    ).toMatchObject({ record: { method: "query_snapshot_candidate" } });
    for (
      const method of [
        "query_retained_snapshot",
        "resume_snapshot_publication",
        "adopt_snapshot",
        "discard_snapshot",
      ] as const
    ) {
      expect(
        admitBrowserWorkspaceHostControlRequestV1(
          controlRequestV1({
            method,
            workspaceSessionId: descriptorV1.workspaceSessionId,
            expected: snapshotReceiptV1(),
          }),
        ),
      ).toMatchObject({
        record: {
          method,
          expected: { snapshotId: "snapshot.preview.1", archiveBytes: 512 },
        },
      });
    }
  });

  it("admits exact review, candidate, publication, adoption, and discard responses", () => {
    const response = (method: string, value: Record<string, unknown>) => ({
      revision: 1,
      kind: "control_response",
      requestId: 3,
      ok: true,
      response: { method, ...value },
    });
    expect(
      admitBrowserWorkspaceHostControlOutboundMessageV1(
        response("create_candidate", { candidate: candidateV1 }),
      ),
    ).toMatchObject({
      response: {
        method: "create_candidate",
        candidate: { checkpointId: "checkpoint.preview.1", generation: 1, anchor: anchorV1 },
      },
    });
    expect(
      admitBrowserWorkspaceHostControlOutboundMessageV1(
        response("capture_review_head", {
          snapshot: {
            revision: 1,
            phase: "open",
            volumeId: anchorV1.volumeId,
            checkpointId: "checkpoint.preview.3",
            descriptor: descriptorV1,
            anchor: anchorV1,
          },
        }),
      ),
    ).toMatchObject({
      response: {
        method: "capture_review_head",
        snapshot: { checkpointId: "checkpoint.preview.3" },
      },
    });
    for (const method of ["prepare_snapshot", "resume_snapshot_publication"] as const) {
      expect(
        admitBrowserWorkspaceHostControlOutboundMessageV1(
          response(method, { receipt: snapshotReceiptV1() }),
        ),
      ).toMatchObject({ response: { method, receipt: { archiveBytes: 512 } } });
    }
    for (const method of ["query_snapshot_candidate", "query_retained_snapshot"] as const) {
      expect(
        admitBrowserWorkspaceHostControlOutboundMessageV1(
          response(method, { receipt: snapshotReceiptV1() }),
        ),
      ).toMatchObject({
        response: { method, receipt: { snapshotId: "snapshot.preview.1" } },
      });
      expect(
        admitBrowserWorkspaceHostControlOutboundMessageV1(
          response(method, { receipt: null }),
        ),
      ).toMatchObject({ response: { method, receipt: null } });
    }
    for (const result of ["adopted", "already_retained"] as const) {
      expect(
        admitBrowserWorkspaceHostControlOutboundMessageV1(
          response("adopt_snapshot", { result, snapshotId: "snapshot.preview.1" }),
        ),
      ).toMatchObject({ response: { method: "adopt_snapshot", result } });
    }
    for (const result of ["discarded", "absent", "retained"] as const) {
      expect(
        admitBrowserWorkspaceHostControlOutboundMessageV1(
          response("discard_snapshot", { result, snapshotId: "snapshot.preview.1" }),
        ),
      ).toMatchObject({ response: { method: "discard_snapshot", result } });
    }
  });

  it("rejects malformed or widened immutable snapshot records", () => {
    const prepare = {
      method: "prepare_snapshot",
      workspaceSessionId: descriptorV1.workspaceSessionId,
      snapshotId: "snapshot.preview.1",
      proposalId: "proposal.preview.1",
      expectedCheckpointId: "checkpoint.preview.3",
      expectedGeneration: 7,
      programRevision: 2,
      baseRepositoryRevision: 4,
    } as const;
    for (
      const record of [
        { ...prepare, baseRepositoryRevision: 0 },
        { ...prepare, repositoryRevision: 4 },
        {
          method: "query_snapshot_candidate",
          workspaceSessionId: descriptorV1.workspaceSessionId,
          snapshotId: "snapshot.preview.1",
        },
        {
          method: "adopt_snapshot",
          workspaceSessionId: descriptorV1.workspaceSessionId,
          expected: snapshotReceiptV1({ archiveBytes: 0 }),
        },
        {
          method: "discard_snapshot",
          workspaceSessionId: descriptorV1.workspaceSessionId,
          expected: snapshotReceiptV1({ provider: "forbidden" }),
        },
      ]
    ) {
      expect(
        admitBrowserWorkspaceHostControlRequestV1(controlRequestV1(record)),
      ).toBeNull();
    }

    const exactResponse = {
      revision: 1,
      kind: "control_response",
      requestId: 3,
      ok: true,
      response: {
        method: "prepare_snapshot",
        receipt: snapshotReceiptV1(),
      },
    } as const;
    for (
      const response of [
        { ...exactResponse, response: { ...exactResponse.response, provider: "forbidden" } },
        {
          ...exactResponse,
          response: {
            ...exactResponse.response,
            receipt: snapshotReceiptV1({ fileCount: -1 }),
          },
        },
        {
          ...exactResponse,
          response: { method: "query_snapshot_candidate", receipt: false },
        },
        {
          ...exactResponse,
          response: {
            method: "adopt_snapshot",
            result: "discarded",
            snapshotId: "snapshot.preview.1",
          },
        },
        {
          ...exactResponse,
          response: { method: "discard_snapshot", snapshotId: "snapshot.preview.1" },
        },
        {
          ...exactResponse,
          response: { method: "create_candidate", anchor: anchorV1 },
        },
      ]
    ) {
      expect(admitBrowserWorkspaceHostControlOutboundMessageV1(response)).toBeNull();
    }
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
          fileName: "sillyos-workspace.zip",
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
          fileName: "sillyos-workspace.zip",
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
        kind: "workspace_export_start_download",
        exportId: "sillyos.export.1",
      }),
    ).not.toBeNull();
    expect(
      admitBrowserWorkspaceHostExportInboundMessageV1({
        revision: 1,
        kind: "workspace_export_start_download",
        exportId: "sillyos.export.1",
        downloadUrl: "blob:forbidden-control-plane-url",
      }),
    ).toBeNull();
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
        checkpointId: "checkpoint.preview.3",
        generation: 7,
        ...progress,
      }),
    ).toMatchObject({ kind: "workspace_export_ready", sequence: 2, ...progress });
    expect(
      admitBrowserWorkspaceHostExportOutboundMessageV1({
        revision: 1,
        kind: "workspace_export_download_started",
        exportId: "sillyos.export.1",
        sequence: 3,
        checkpointId: "checkpoint.preview.3",
        generation: 7,
        ...progress,
      }),
    ).toMatchObject({ kind: "workspace_export_download_started", sequence: 3, ...progress });
    for (
      const forbidden of [
        { downloadUrl: "blob:forbidden-control-plane-url" },
        { archiveBytes: new Uint8Array([1, 2, 3]) },
      ]
    ) {
      expect(
        admitBrowserWorkspaceHostExportOutboundMessageV1({
          revision: 1,
          kind: "workspace_export_download_started",
          exportId: "sillyos.export.1",
          sequence: 3,
          checkpointId: "checkpoint.preview.3",
          generation: 7,
          ...progress,
          ...forbidden,
        }),
      ).toBeNull();
    }
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

  it("admits only the closed outcome and diagnostic combinations", () => {
    const event = { revision: 1, kind: "workspace_receipt" } as const;
    for (
      const receipt of [
        receiptV1({ outcome: "succeeded", diagnosticCode: null }),
        receiptV1({ outcome: "failed", diagnosticCode: "path_rejected" }),
        receiptV1({ outcome: "failed", diagnosticCode: "capacity_exceeded" }),
        receiptV1({ outcome: "failed", diagnosticCode: "execution_failed" }),
        receiptV1({ outcome: "cancelled", diagnosticCode: "cancelled" }),
      ]
    ) {
      expect(
        admitBrowserWorkspaceHostEnvironmentOutboundMessageV1({ ...event, receipt }),
      ).not.toBeNull();
    }

    for (
      const receipt of [
        receiptV1({ outcome: "succeeded", diagnosticCode: "execution_failed" }),
        receiptV1({ outcome: "failed", diagnosticCode: null }),
        receiptV1({ outcome: "failed", diagnosticCode: "cancelled" }),
        receiptV1({ outcome: "cancelled", diagnosticCode: null }),
        receiptV1({ outcome: "cancelled", diagnosticCode: "capacity_exceeded" }),
      ]
    ) {
      expect(
        admitBrowserWorkspaceHostEnvironmentOutboundMessageV1({ ...event, receipt }),
      ).toBeNull();
    }
  });
});

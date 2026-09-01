// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserWorkspaceHostControlRequestV1,
  browserWorkspaceDownloadFileNameMaximumUtf8BytesV1,
} from "../../../src/workspace/browser-workspace-host-protocol.ts";
import { creatorWorkspaceArchiveFileNameV1 } from "../ui/workspace-archive-file-name.ts";

const encoderV1 = new TextEncoder();

function admittedFileNameV1(fileName: string): boolean {
  return admitBrowserWorkspaceHostControlRequestV1({
    revision: 1,
    kind: "control_request",
    requestId: 1,
    record: {
      method: "start_export",
      exportId: "export.file-name.1",
      workspaceSessionId: "workspace-session.file-name.1",
      expectedCheckpointId: "checkpoint.file-name.1",
      expectedGeneration: 1,
      sourceRevision: 1,
      baseRevision: 1,
      fileName,
    },
  }) !== null;
}

describe("Creator workspace archive filename", () => {
  it("truncates long ASCII names at the exact admitted UTF-8 boundary", () => {
    const fileName = creatorWorkspaceArchiveFileNameV1("A".repeat(256));

    expect(fileName).toBe(`${"a".repeat(243)}.sillyos.zip`);
    expect(encoderV1.encode(fileName)).toHaveLength(
      browserWorkspaceDownloadFileNameMaximumUtf8BytesV1,
    );
    expect(admittedFileNameV1(fileName)).toBe(true);
  });

  it("truncates multibyte names without splitting a Unicode code point", () => {
    const fileName = creatorWorkspaceArchiveFileNameV1("界".repeat(100));

    expect(fileName).toBe(`${"界".repeat(81)}.sillyos.zip`);
    expect(encoderV1.encode(fileName)).toHaveLength(
      browserWorkspaceDownloadFileNameMaximumUtf8BytesV1,
    );
    expect(admittedFileNameV1(fileName)).toBe(true);
  });

  it("preserves the exact legal maximum and removes dangerous filename characters", () => {
    const exact = creatorWorkspaceArchiveFileNameV1("a".repeat(243));
    const sanitized = creatorWorkspaceArchiveFileNameV1("../Foo\\Bar/\0<script>..");
    const fallback = creatorWorkspaceArchiveFileNameV1("../\\\0");

    expect(exact).toBe(`${"a".repeat(243)}.sillyos.zip`);
    expect(encoderV1.encode(exact)).toHaveLength(
      browserWorkspaceDownloadFileNameMaximumUtf8BytesV1,
    );
    expect(sanitized).toBe("foo-bar-script.sillyos.zip");
    expect(sanitized).not.toMatch(/[\\/\0<>]/u);
    expect(fallback).toBe("sillyos-program.sillyos.zip");
    expect([exact, sanitized, fallback].every(admittedFileNameV1)).toBe(true);
  });
});

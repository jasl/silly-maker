// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserWorkspaceSandboxDownloadRequestV1,
  admitBrowserWorkspaceSandboxDownloadResponseV1,
} from "../workspace/browser-workspace-sandbox-download-protocol.ts";

const requestV1 = {
  revision: 1,
  kind: "workspace_sandbox_download_request",
  requestId: "sandbox.download.1",
  exportId: "sillyos.export.1",
  downloadUrl: "blob:http://127.0.0.1:41740/archive",
  fileName: "translation-workshop.sillyos.zip",
} as const;

describe("Browser Workspace Sandbox download protocol", () => {
  it("admits only the exact bounded Worker-to-frame download request", () => {
    expect(admitBrowserWorkspaceSandboxDownloadRequestV1(requestV1)).toEqual(requestV1);
    for (
      const invalid of [
        { ...requestV1, revision: 2 },
        { ...requestV1, requestId: "contains whitespace" },
        { ...requestV1, downloadUrl: "https://example.com/archive.zip" },
        { ...requestV1, fileName: "../archive.zip" },
        { ...requestV1, credential: "forbidden" },
      ]
    ) expect(admitBrowserWorkspaceSandboxDownloadRequestV1(invalid)).toBeNull();
  });

  it("admits only the exact started or closed failure receipt", () => {
    const started = {
      revision: 1,
      kind: "workspace_sandbox_download_started",
      requestId: requestV1.requestId,
      exportId: requestV1.exportId,
    } as const;
    const failed = {
      revision: 1,
      kind: "workspace_sandbox_download_failed",
      requestId: requestV1.requestId,
      exportId: requestV1.exportId,
      code: "download_unavailable",
    } as const;
    expect(admitBrowserWorkspaceSandboxDownloadResponseV1(started)).toEqual(started);
    expect(admitBrowserWorkspaceSandboxDownloadResponseV1(failed)).toEqual(failed);
    expect(admitBrowserWorkspaceSandboxDownloadResponseV1({
      ...failed,
      code: "network_failed",
    })).toBeNull();
    expect(admitBrowserWorkspaceSandboxDownloadResponseV1({
      ...started,
      downloadUrl: requestV1.downloadUrl,
    })).toBeNull();
  });
});

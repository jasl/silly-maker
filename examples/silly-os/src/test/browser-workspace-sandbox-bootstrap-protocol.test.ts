// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  admitBrowserWorkspaceSandboxFrameBindV1,
  admitBrowserWorkspaceSandboxFrameFailedV1,
  admitBrowserWorkspaceSandboxFrameReadyV1,
  admitBrowserWorkspaceSandboxWorkerBindV1,
  admitBrowserWorkspaceSandboxWorkerBoundV1,
  createBrowserWorkspaceSandboxFrameBindV1,
  createBrowserWorkspaceSandboxFrameFailedV1,
  createBrowserWorkspaceSandboxFrameReadyV1,
  createBrowserWorkspaceSandboxWorkerBindV1,
  createBrowserWorkspaceSandboxWorkerBoundV1,
} from "../workspace/browser-workspace-sandbox-bootstrap-protocol.ts";

const nonceV1 = "sandbox.bootstrap.nonce-1";
const buildIdentityV1 = "a4cc8754b4c5f3050ff270a7c5a426b6c0d18176";

describe("Browser Workspace Sandbox bootstrap protocol", () => {
  it("admits only the five exact bootstrap records", () => {
    const records = [
      [
        createBrowserWorkspaceSandboxFrameReadyV1(nonceV1, buildIdentityV1),
        admitBrowserWorkspaceSandboxFrameReadyV1,
      ],
      [
        createBrowserWorkspaceSandboxFrameBindV1(nonceV1, buildIdentityV1),
        admitBrowserWorkspaceSandboxFrameBindV1,
      ],
      [
        createBrowserWorkspaceSandboxWorkerBindV1(nonceV1, buildIdentityV1),
        admitBrowserWorkspaceSandboxWorkerBindV1,
      ],
      [
        createBrowserWorkspaceSandboxWorkerBoundV1(nonceV1, buildIdentityV1),
        admitBrowserWorkspaceSandboxWorkerBoundV1,
      ],
      [
        createBrowserWorkspaceSandboxFrameFailedV1(
          nonceV1,
          buildIdentityV1,
          "worker_unavailable",
        ),
        admitBrowserWorkspaceSandboxFrameFailedV1,
      ],
    ] as const;

    for (const [record, admit] of records) {
      expect(Object.isFrozen(record)).toBe(true);
      expect(admit(record)).toEqual(record);
      expect(admit({ ...record, extra: true })).toBeNull();
      expect(admit({ ...record, revision: 2 })).toBeNull();
    }
  });

  it("rejects malformed identities, symbols, accessors, and failure codes", () => {
    expect(
      admitBrowserWorkspaceSandboxFrameReadyV1({
        revision: 1,
        kind: "workspace_sandbox_frame_ready",
        nonce: "contains a space",
        buildIdentity: buildIdentityV1,
      }),
    ).toBeNull();
    expect(
      admitBrowserWorkspaceSandboxFrameReadyV1({
        revision: 1,
        kind: "workspace_sandbox_frame_ready",
        nonce: nonceV1,
        buildIdentity: "x".repeat(129),
      }),
    ).toBeNull();
    expect(
      admitBrowserWorkspaceSandboxFrameFailedV1({
        revision: 1,
        kind: "workspace_sandbox_frame_failed",
        nonce: nonceV1,
        buildIdentity: buildIdentityV1,
        code: "network_failed",
      }),
    ).toBeNull();

    const symbolRecord = {
      ...createBrowserWorkspaceSandboxFrameReadyV1(nonceV1, buildIdentityV1),
    } as BrowserWorkspaceSandboxMutableRecordV1 & { [key: symbol]: boolean };
    const symbol = Symbol("extra");
    symbolRecord[symbol] = true;
    expect(admitBrowserWorkspaceSandboxFrameReadyV1(symbolRecord)).toBeNull();

    let reads = 0;
    const accessorRecord = {
      revision: 1,
      kind: "workspace_sandbox_frame_ready",
      nonce: nonceV1,
      get buildIdentity(): string {
        reads += 1;
        return buildIdentityV1;
      },
    };
    expect(admitBrowserWorkspaceSandboxFrameReadyV1(accessorRecord)).toBeNull();
    expect(reads).toBe(0);
  });
});

interface BrowserWorkspaceSandboxMutableRecordV1 {
  revision: number;
  kind: string;
  nonce: string;
  buildIdentity: string;
}

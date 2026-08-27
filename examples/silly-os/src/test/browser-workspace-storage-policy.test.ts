// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  createBrowserWorkspaceWindowStoragePortV1,
  inspectBrowserWorkspaceStorageV1,
  requestBrowserWorkspaceStoragePersistenceV1,
  type BrowserWorkspaceWindowStoragePortV1,
} from "../workspace/browser-workspace-storage-policy.ts";

function portV1(
  input: Omit<BrowserWorkspaceWindowStoragePortV1, "kind"> = {},
): BrowserWorkspaceWindowStoragePortV1 {
  return { kind: "window", ...input };
}

describe("SillyOS Browser Workspace storage policy", () => {
  it("inspects advisory bytes and persisted false without requesting persistence", async () => {
    let persistCalls = 0;
    const storage = {
      estimate: async () => ({ usage: 256, quota: 1_024 }),
      persisted: async () => false,
      persist: async () => {
        persistCalls += 1;
        return false;
      },
    };
    const port = createBrowserWorkspaceWindowStoragePortV1({
      navigator: { storage } as unknown as Navigator,
    });

    await expect(inspectBrowserWorkspaceStorageV1(port)).resolves.toEqual({
      kind: "available",
      persisted: false,
      usageBytes: 256,
      quotaBytes: 1_024,
      remainingBytes: 768,
    });
    expect(persistCalls).toBe(0);

    await expect(requestBrowserWorkspaceStoragePersistenceV1(port)).resolves.toEqual({
      kind: "available",
      persisted: false,
    });
    expect(persistCalls).toBe(1);
  });

  it("keeps partial estimates advisory and maps missing or rejected APIs to unavailable", async () => {
    await expect(
      inspectBrowserWorkspaceStorageV1(
        portV1({ estimate: async () => ({ usage: 7 }), persisted: async () => true }),
      ),
    ).resolves.toEqual({ kind: "available", persisted: true, usageBytes: 7 });
    await expect(inspectBrowserWorkspaceStorageV1(portV1())).resolves.toEqual({
      kind: "unavailable",
    });
    await expect(
      inspectBrowserWorkspaceStorageV1(
        portV1({
          estimate: () => Promise.reject(new Error("estimate unavailable")),
          persisted: async () => true,
        }),
      ),
    ).resolves.toEqual({ kind: "unavailable" });
  });

  it("reports persistence denial separately from missing or rejected Window APIs", async () => {
    await expect(
      requestBrowserWorkspaceStoragePersistenceV1(portV1({ persist: async () => true })),
    ).resolves.toEqual({ kind: "available", persisted: true });
    await expect(
      requestBrowserWorkspaceStoragePersistenceV1(portV1({ persist: async () => false })),
    ).resolves.toEqual({ kind: "available", persisted: false });
    await expect(requestBrowserWorkspaceStoragePersistenceV1(portV1())).resolves.toEqual({
      kind: "unavailable",
    });
    await expect(
      requestBrowserWorkspaceStoragePersistenceV1(
        portV1({ persist: () => Promise.reject(new Error("persist unavailable")) }),
      ),
    ).resolves.toEqual({ kind: "unavailable" });
  });
});

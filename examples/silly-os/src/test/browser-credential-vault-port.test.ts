// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BrowserCredentialVaultPortErrorV1,
  createBrowserCredentialVaultPortV1,
} from "../credential/browser-credential-vault-port.ts";

interface WorkerConstructionV1 {
  readonly url: URL;
  readonly options: WorkerOptions;
}

class CapturingWorkerV1 extends EventTarget {
  static readonly constructions: WorkerConstructionV1[] = [];
  static readonly instances: CapturingWorkerV1[] = [];

  terminated = false;

  constructor(url: string | URL, options?: WorkerOptions) {
    super();
    CapturingWorkerV1.constructions.push({
      url: new URL(url, import.meta.url),
      options: structuredClone(options ?? {}),
    });
    CapturingWorkerV1.instances.push(this);
  }

  postMessage(): void {}

  terminate(): void {
    this.terminated = true;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  CapturingWorkerV1.constructions.splice(0);
  CapturingWorkerV1.instances.splice(0);
});

describe("Browser Credential Vault fixed Worker port", () => {
  it("opens exactly one product-bundled module Worker without endpoint authority", () => {
    vi.stubGlobal("Worker", CapturingWorkerV1);

    const port = createBrowserCredentialVaultPortV1();
    expect(CapturingWorkerV1.constructions).toHaveLength(1);
    const construction = CapturingWorkerV1.constructions[0];
    expect(construction?.url.pathname).toContain("browser-credential-vault.worker");
    expect(construction?.url.searchParams.has("endpoint-origin")).toBe(false);
    expect(construction?.url.searchParams.has("provider")).toBe(false);
    expect(construction?.options).toEqual({
      type: "module",
      name: "sillyos-browser-credential-vault",
    });

    port.close();
    port.close();
    expect(CapturingWorkerV1.instances[0]?.terminated).toBe(true);
  });

  it("terminates and closes the client when the fixed Worker fails", async () => {
    vi.stubGlobal("Worker", CapturingWorkerV1);
    const port = createBrowserCredentialVaultPortV1();
    const worker = CapturingWorkerV1.instances[0];
    worker?.dispatchEvent(new Event("error"));

    expect(worker?.terminated).toBe(true);
    await expect(port.client.list()).rejects.toMatchObject({
      code: "storage_unavailable",
      method: "list",
    });
  });

  it("fails explicitly when the bundled Worker cannot be constructed", () => {
    function UnavailableWorkerV1(): never {
      throw new Error("worker unavailable");
    }
    vi.stubGlobal("Worker", UnavailableWorkerV1);

    expect(() => createBrowserCredentialVaultPortV1()).toThrowError(
      new BrowserCredentialVaultPortErrorV1("worker_unavailable"),
    );
  });

  it("terminates the Worker when strict client construction rejects its options", () => {
    vi.stubGlobal("Worker", CapturingWorkerV1);
    expect(() => createBrowserCredentialVaultPortV1({ deadlineMilliseconds: 0 })).toThrowError(
      new BrowserCredentialVaultPortErrorV1("worker_unavailable"),
    );
    expect(CapturingWorkerV1.instances[0]?.terminated).toBe(true);
  });
});

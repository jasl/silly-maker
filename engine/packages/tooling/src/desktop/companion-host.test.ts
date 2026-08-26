// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import { createDesktopCompanionHostInternalV1 } from "./companion-host.mts";

function deferredV1<T>(): {
  readonly promise: Promise<T>;
  resolve(value: T): void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function launchReceiptStreamV1(port: number): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller): void {
      controller.enqueue(
        new TextEncoder().encode(`${JSON.stringify({ revision: 1, port })}\nignored stdout`),
      );
      controller.close();
    },
  });
}

describe("Desktop companion Host", () => {
  it("launches one direct child, proxies product HTTP, and closes only after exit 0", async () => {
    const operations: string[] = [];
    const status = deferredV1<{ readonly success: boolean; readonly code: number }>();
    const stdin = new WritableStream<Uint8Array>({
      close(): void {
        operations.push("stdin-close");
      },
    });
    const launch = vi.fn(() =>
      Promise.resolve({
        stdin,
        stdout: launchReceiptStreamV1(43123),
        status: status.promise,
      })
    );
    const proxyFetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      operations.push(`fetch:${String(input)}`);
      expect(new Headers(init?.headers).has("x-sillymaker-shell-capability")).toBe(false);
      expect(new Headers(init?.headers).has("origin")).toBe(false);
      expect(init?.redirect).toBe("error");
      return Promise.resolve(
        new Response("rpc response", {
          status: 201,
          headers: { "content-length": "12", "x-product-rpc": "v1" },
        }),
      );
    });
    const host = createDesktopCompanionHostInternalV1({
      launch,
      proxyFetch: proxyFetch as unknown as typeof fetch,
    });
    const request = new Request("http://127.0.0.1:41800/sillymaker/companion/rpc?stream=1", {
      method: "POST",
      headers: {
        "content-type": "application/x-product-rpc",
        origin: "http://127.0.0.1:41800",
        "x-sillymaker-shell-capability": "a".repeat(43),
      },
      body: "product frame",
    });

    const first = await host.handle(request, "/rpc", "?stream=1");
    const second = await host.handle(
      new Request("http://127.0.0.1:41800/sillymaker/companion/status"),
      "/status",
      "",
    );
    expect(first.status).toBe(201);
    expect(first.headers.get("x-product-rpc")).toBe("v1");
    expect(first.headers.has("content-length")).toBe(false);
    expect(await first.text()).toBe("rpc response");
    expect(second.status).toBe(201);
    expect(launch).toHaveBeenCalledOnce();
    expect(proxyFetch).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:43123/rpc?stream=1",
      expect.objectContaining({ method: "POST", signal: request.signal }),
    );

    let closeSettled = false;
    const closing = host.close().then(() => {
      closeSettled = true;
      operations.push("close-complete");
    });
    await Promise.resolve();
    expect(operations).toContain("stdin-close");
    expect(closeSettled).toBe(false);

    status.resolve({ success: true, code: 0 });
    await closing;
    await host.close();
    expect(operations.at(-1)).toBe("close-complete");
  });

  it("does not launch when the selected companion is never requested", async () => {
    const launch = vi.fn();
    const host = createDesktopCompanionHostInternalV1({ launch });
    await host.close();
    expect(launch).not.toHaveBeenCalled();
  });

  it("releases an aborted receipt wait without cancelling the shared child launch", async () => {
    let stdoutController!: ReadableStreamDefaultController<Uint8Array>;
    const status = deferredV1<{ readonly success: boolean; readonly code: number }>();
    const launch = vi.fn(() =>
      Promise.resolve({
        stdin: new WritableStream<Uint8Array>(),
        stdout: new ReadableStream<Uint8Array>({
          start(controller): void {
            stdoutController = controller;
          },
        }),
        status: status.promise,
      })
    );
    const host = createDesktopCompanionHostInternalV1({
      launch,
      proxyFetch: (() => Promise.resolve(new Response("ready"))) as typeof fetch,
    });
    const controller = new AbortController();
    const first = host.handle(
      new Request("http://127.0.0.1:41800/sillymaker/companion/rpc", {
        signal: controller.signal,
      }),
      "/rpc",
      "",
    );
    controller.abort();
    await expect(first).rejects.toMatchObject({ name: "AbortError" });

    const second = host.handle(
      new Request("http://127.0.0.1:41800/sillymaker/companion/rpc"),
      "/rpc",
      "",
    );
    stdoutController.enqueue(
      new TextEncoder().encode(`${JSON.stringify({ revision: 1, port: 43125 })}\n`),
    );
    stdoutController.close();
    expect(await (await second).text()).toBe("ready");
    expect(launch).toHaveBeenCalledOnce();

    status.resolve({ success: true, code: 0 });
    await host.close();
  });

  it.each([
    ["invalid JSON", new TextEncoder().encode("not-json\n")],
    ["an oversized line", new Uint8Array(1_026).fill(0x61)],
  ])("rejects %s as a bounded launch receipt", async (_label, receipt) => {
    const proxyFetch = vi.fn();
    const host = createDesktopCompanionHostInternalV1({
      launch: () =>
        Promise.resolve({
          stdin: new WritableStream<Uint8Array>(),
          stdout: new ReadableStream<Uint8Array>({
            start(controller): void {
              controller.enqueue(receipt);
              controller.close();
            },
          }),
          status: Promise.resolve({ success: true, code: 0 }),
        }),
      proxyFetch: proxyFetch as unknown as typeof fetch,
    });

    expect(
      await host.handle(
        new Request("http://127.0.0.1:41800/sillymaker/companion/rpc"),
        "/rpc",
        "",
      ),
    ).toMatchObject({ status: 502 });
    expect(proxyFetch).not.toHaveBeenCalled();
    await host.close();
  });

  it("keeps the shell alive when the direct child exits unsuccessfully", async () => {
    const host = createDesktopCompanionHostInternalV1({
      launch: () =>
        Promise.resolve({
          stdin: new WritableStream<Uint8Array>(),
          stdout: launchReceiptStreamV1(43124),
          status: Promise.resolve({ success: false, code: 9 }),
        }),
      proxyFetch: (() => Promise.resolve(new Response(null, { status: 204 }))) as typeof fetch,
    });
    await host.handle(
      new Request("http://127.0.0.1:41800/sillymaker/companion/health"),
      "/health",
      "",
    );
    await expect(host.close()).rejects.toThrow("exited with code 9");
  });
});

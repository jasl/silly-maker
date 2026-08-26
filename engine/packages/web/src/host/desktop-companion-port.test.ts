// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from "vitest";

import { desktopShellCapabilityHeaderInternalV1 } from "./desktop-shell-capability.ts";
import { createDesktopCompanionHttpPortInternalV1 } from "./desktop-companion-port.ts";

const capabilityV1 = "a".repeat(43);

afterEach(() => {
  Reflect.deleteProperty(globalThis, "__SILLYMAKER_DESKTOP_CAPABILITY__");
});

describe("Desktop companion renderer port", () => {
  it("uses only the fixed same-origin namespace and drains response streams for close", async () => {
    let responseController!: ReadableStreamDefaultController<Uint8Array>;
    const fetchImpl = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller): void {
              responseController = controller;
            },
          }),
          { headers: { "content-type": "application/x-product-rpc" } },
        ),
      )
    );
    const port = createDesktopCompanionHttpPortInternalV1({
      capabilityMarker: capabilityV1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(port).not.toBeNull();

    const response = await port!.request("/rpc?stream=1", {
      method: "POST",
      body: "product frame",
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("/sillymaker/companion/rpc?stream=1");
    expect(new Headers(init?.headers).get(desktopShellCapabilityHeaderInternalV1)).toBe(
      capabilityV1,
    );
    expect(init).toMatchObject({ mode: "same-origin", redirect: "error" });

    port!.closePreparation.fence();
    let prepared = false;
    const preparation = port!.closePreparation.prepare().then(() => {
      prepared = true;
    });
    await Promise.resolve();
    expect(prepared).toBe(false);
    await expect(port!.request("/late")).rejects.toThrow("fenced");

    const body = response.text();
    responseController.enqueue(new TextEncoder().encode("stream complete"));
    responseController.close();
    expect(await body).toBe("stream complete");
    await preparation;
    expect(prepared).toBe(true);
  });

  it.each(["/../records", "/rpc#fragment", "//attacker.example/rpc", "relative"])(
    "rejects a route outside the companion namespace: %s",
    async (path) => {
      const port = createDesktopCompanionHttpPortInternalV1({
        capabilityMarker: capabilityV1,
        fetchImpl: vi.fn() as unknown as typeof fetch,
      });
      await expect(port!.request(path)).rejects.toThrow("Desktop companion request path");
    },
  );

  it("returns null outside Desktop and respects an explicit null marker", () => {
    expect(createDesktopCompanionHttpPortInternalV1()).toBeNull();
    Reflect.set(globalThis, "__SILLYMAKER_DESKTOP_CAPABILITY__", capabilityV1);
    expect(createDesktopCompanionHttpPortInternalV1()).not.toBeNull();
    expect(createDesktopCompanionHttpPortInternalV1({ capabilityMarker: null })).toBeNull();
  });
});

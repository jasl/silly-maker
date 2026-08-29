// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  createBrowserPiProviderFetchGuardV1,
  installBrowserPiProviderFetchGuardV1,
  readBrowserPiWorkerEndpointOriginV1,
} from "../agent/browser-pi-provider-fetch-guard.ts";

describe("Browser Pi Provider endpoint boundary", () => {
  it("forces credential-free fetch policy and rejects cross-origin or redirecting requests", async () => {
    const requests: Request[] = [];
    const nativeFetch = vi.fn(async (request: RequestInfo | URL) => {
      requests.push(request as Request);
      return new Response("ok", { status: 200 });
    });
    const guarded = createBrowserPiProviderFetchGuardV1({
      endpointOrigin: "https://api.example.test",
      fetch: nativeFetch as typeof fetch,
    });
    await expect(guarded("https://api.example.test/v1/messages", {
      method: "POST",
      body: "{}",
      credentials: "include",
      redirect: "follow",
      cache: "force-cache",
      referrer: "https://control.example.test/secret",
      referrerPolicy: "unsafe-url",
    })).resolves.toBeInstanceOf(Response);
    expect(nativeFetch).toHaveBeenCalledTimes(1);
    expect(requests[0]).toMatchObject({
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      referrer: "",
      referrerPolicy: "no-referrer",
    });

    await expect(guarded("https://other.example.test/v1/messages"))
      .rejects.toThrow("request_origin_denied");
    expect(nativeFetch).toHaveBeenCalledTimes(1);

    const redirecting = createBrowserPiProviderFetchGuardV1({
      endpointOrigin: "https://api.example.test",
      fetch: (async () =>
        new Response(null, {
          status: 307,
          headers: { location: "https://other.example.test" },
        })) as typeof fetch,
    });
    await expect(redirecting("https://api.example.test/v1/messages"))
      .rejects.toThrow("redirect_denied");
  });

  it("reads one exact endpoint capability and fails closed when fetch cannot be wrapped", () => {
    expect(readBrowserPiWorkerEndpointOriginV1(
      "https://app.example.test/assets/pi.js?type=module&endpoint-origin=https%3A%2F%2Fapi.example.test",
    )).toBe("https://api.example.test");
    expect(readBrowserPiWorkerEndpointOriginV1("https://app.example.test/assets/pi.js?type=module"))
      .toBeNull();
    expect(() =>
      readBrowserPiWorkerEndpointOriginV1(
        "https://app.example.test/pi.js?endpoint-origin=https%3A%2F%2Fa.test&endpoint-origin=https%3A%2F%2Fb.test",
      )
    ).toThrow("endpoint_origin_ambiguous");

    const lockedScope = {} as { fetch: typeof fetch };
    Object.defineProperty(lockedScope, "fetch", {
      configurable: false,
      writable: false,
      value: fetch,
    });
    expect(() =>
      installBrowserPiProviderFetchGuardV1({
        scope: lockedScope,
        endpointOrigin: "https://api.example.test",
      })
    ).toThrow("fetch_guard_unavailable");
  });
});

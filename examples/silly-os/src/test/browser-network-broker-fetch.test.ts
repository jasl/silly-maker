// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from "vitest";

import { executeBrowserNetworkBrokerFetchUrlV1 } from "../network/browser-network-broker-fetch.ts";
import { createBrowserNetworkBrokerFetchUrlRequestV1 } from "../network/browser-network-broker-protocol.ts";

const requestV1 = createBrowserNetworkBrokerFetchUrlRequestV1(
  "network.request.test",
  "https://remote.example/data",
);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Browser Network Broker bounded fetch", () => {
  it("uses the one fixed credential-free GET and returns bounded streamed text", async () => {
    const fetchV1 = vi.fn(async (
      _input: Parameters<typeof fetch>[0],
      _init?: Parameters<typeof fetch>[1],
    ) =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("hello "));
            controller.enqueue(new TextEncoder().encode("world"));
            controller.close();
          },
        }),
        { status: 200, headers: { "Content-Type": "text/plain; charset=UTF-8" } },
      )
    );
    const result = await executeBrowserNetworkBrokerFetchUrlV1(
      requestV1,
      new AbortController().signal,
      { fetch: fetchV1 },
    );

    expect(fetchV1).toHaveBeenCalledTimes(1);
    expect(fetchV1.mock.calls[0]?.[0]).toBe(requestV1.url);
    expect(fetchV1.mock.calls[0]?.[1]).toEqual({
      method: "GET",
      mode: "cors",
      redirect: "error",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
    expect(result).toMatchObject({
      kind: "network_broker_fetch_url_result",
      status: 200,
      contentType: "text/plain; charset=UTF-8",
      bytes: 11,
      text: "hello world",
    });
  });

  it("returns a readable bounded 4xx body", async () => {
    const result = await executeBrowserNetworkBrokerFetchUrlV1(
      requestV1,
      new AbortController().signal,
      {
        fetch: async () =>
          new Response('{"error":"missing"}', {
            status: 404,
            headers: { "Content-Type": "application/problem+json" },
          }),
      },
    );
    expect(result).toMatchObject({
      kind: "network_broker_fetch_url_result",
      status: 404,
      text: '{"error":"missing"}',
    });
  });

  it("rejects unsupported MIME, non-UTF-8 bytes, and declared or streamed overflow", async () => {
    const unsupported = await executeBrowserNetworkBrokerFetchUrlV1(
      requestV1,
      new AbortController().signal,
      {
        fetch: async () =>
          new Response(new Uint8Array([1]), {
            headers: { "Content-Type": "application/octet-stream" },
          }),
      },
    );
    expect(unsupported).toMatchObject({ code: "unsupported_content_type" });

    const invalidUtf8 = await executeBrowserNetworkBrokerFetchUrlV1(
      requestV1,
      new AbortController().signal,
      {
        fetch: async () =>
          new Response(new Uint8Array([0xc3, 0x28]), {
            headers: { "Content-Type": "text/plain" },
          }),
      },
    );
    expect(invalidUtf8).toMatchObject({ code: "unsupported_content_type" });

    const declared = await executeBrowserNetworkBrokerFetchUrlV1(
      requestV1,
      new AbortController().signal,
      {
        fetch: async () =>
          new Response("ignored", {
            headers: {
              "Content-Type": "text/plain",
              "Content-Length": String(256 * 1_024 + 1),
            },
          }),
      },
    );
    expect(declared).toMatchObject({ code: "response_too_large" });

    const streamed = await executeBrowserNetworkBrokerFetchUrlV1(
      requestV1,
      new AbortController().signal,
      {
        fetch: async () =>
          new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(new Uint8Array(256 * 1_024));
                controller.enqueue(new Uint8Array([1]));
              },
            }),
            { headers: { "Content-Type": "text/plain" } },
          ),
      },
    );
    expect(streamed).toMatchObject({ code: "response_too_large" });
  });

  it("bounds total and body-idle time and maps both to one network failure", async () => {
    vi.useFakeTimers();
    const never = new Promise<Response>(() => {});
    const totalPromise = executeBrowserNetworkBrokerFetchUrlV1(
      requestV1,
      new AbortController().signal,
      { fetch: () => never, totalDeadlineMilliseconds: 20, idleDeadlineMilliseconds: 10 },
    );
    await vi.advanceTimersByTimeAsync(20);
    await expect(totalPromise).resolves.toMatchObject({ code: "network_failed" });

    const idlePromise = executeBrowserNetworkBrokerFetchUrlV1(
      requestV1,
      new AbortController().signal,
      {
        fetch: async () =>
          new Response(new ReadableStream<Uint8Array>(), {
            headers: { "Content-Type": "text/plain" },
          }),
        totalDeadlineMilliseconds: 100,
        idleDeadlineMilliseconds: 10,
      },
    );
    await vi.advanceTimersByTimeAsync(10);
    await expect(idlePromise).resolves.toMatchObject({ code: "network_failed" });
  });

  it("cancels without waiting for a fetch implementation that settles late", async () => {
    const controller = new AbortController();
    const pending = executeBrowserNetworkBrokerFetchUrlV1(requestV1, controller.signal, {
      fetch: () => new Promise<Response>(() => {}),
    });
    controller.abort();
    await expect(pending).resolves.toMatchObject({ code: "cancelled" });
  });
});

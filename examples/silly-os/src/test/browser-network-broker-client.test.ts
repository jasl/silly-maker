// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it } from "vitest";

import {
  BrowserNetworkBrokerClientErrorV1,
  createBrowserNetworkBrokerClientV1,
} from "../network/browser-network-broker-client.ts";
import {
  createBrowserNetworkBrokerFetchUrlResultV1,
} from "../network/browser-network-broker-protocol.ts";

const channelsV1: MessageChannel[] = [];

afterEach(() => {
  for (const channel of channelsV1.splice(0)) {
    channel.port1.close();
    channel.port2.close();
  }
});

describe("Browser Network Broker client", () => {
  it("settles the exact response and never places extra authority on the wire", async () => {
    const channel = new MessageChannel();
    channelsV1.push(channel);
    const client = createBrowserNetworkBrokerClientV1(channel.port1, {
      createRequestId: () => "network.request.1",
    });
    const request = new Promise<unknown>((resolve) => {
      channel.port2.addEventListener("message", (event) => resolve(event.data), { once: true });
      channel.port2.start();
    });
    const resultPromise = client.fetchUrl("https://example.com/");
    expect(await request).toEqual({
      revision: 1,
      kind: "network_broker_fetch_url",
      requestId: "network.request.1",
      url: "https://example.com/",
    });
    channel.port2.postMessage(
      createBrowserNetworkBrokerFetchUrlResultV1({
        requestId: "network.request.1",
        status: 200,
        contentType: "text/plain",
        bytes: 2,
        text: "ok",
      }),
    );
    await expect(resultPromise).resolves.toMatchObject({ status: 200, text: "ok" });
    client.close();
  });

  it("sends cancellation and ignores a late settlement", async () => {
    const channel = new MessageChannel();
    channelsV1.push(channel);
    const ids = ["network.request.1", "network.request.2"];
    const client = createBrowserNetworkBrokerClientV1(channel.port1, {
      createRequestId: () => ids.shift() ?? "network.request.fallback",
    });
    const messages: unknown[] = [];
    channel.port2.addEventListener("message", (event) => messages.push(event.data));
    channel.port2.start();
    const controller = new AbortController();
    const first = client.fetchUrl("https://example.com/first", controller.signal);
    controller.abort();
    await expect(first).rejects.toMatchObject({ code: "cancelled" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(messages).toEqual([
      expect.objectContaining({ kind: "network_broker_fetch_url", requestId: "network.request.1" }),
      { revision: 1, kind: "network_broker_cancel", requestId: "network.request.1" },
    ]);

    channel.port2.postMessage(
      createBrowserNetworkBrokerFetchUrlResultV1({
        requestId: "network.request.1",
        status: 200,
        contentType: "text/plain",
        bytes: 4,
        text: "late",
      }),
    );
    const second = client.fetchUrl("https://example.com/second");
    await new Promise((resolve) => setTimeout(resolve, 0));
    channel.port2.postMessage(
      createBrowserNetworkBrokerFetchUrlResultV1({
        requestId: "network.request.2",
        status: 200,
        contentType: "text/plain",
        bytes: 7,
        text: "current",
      }),
    );
    await expect(second).resolves.toMatchObject({ text: "current" });
    client.close();
  });

  it("rejects invalid URLs before sending", async () => {
    const channel = new MessageChannel();
    channelsV1.push(channel);
    const client = createBrowserNetworkBrokerClientV1(channel.port1);
    await expect(client.fetchUrl("http://example.com/")).rejects.toBeInstanceOf(
      BrowserNetworkBrokerClientErrorV1,
    );
    client.close();
  });

  it("transfers one direct download sink and tracks cancellation without receiving body bytes", async () => {
    const brokerChannel = new MessageChannel();
    const directChannel = new MessageChannel();
    channelsV1.push(brokerChannel, directChannel);
    const client = createBrowserNetworkBrokerClientV1(brokerChannel.port1, {
      createRequestId: () => "network.request.download.1",
    });
    const brokerMessages: { readonly data: unknown; readonly ports: readonly MessagePort[] }[] = [];
    brokerChannel.port2.addEventListener("message", (event: MessageEvent<unknown>) => {
      brokerMessages.push({ data: event.data, ports: [...event.ports] });
    });
    brokerChannel.port2.start();
    const controller = new AbortController();
    const lease = client.download(
      "https://example.com/archive.zip",
      directChannel.port1,
      controller.signal,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(lease.requestId).toBe("network.request.download.1");
    expect(brokerMessages).toHaveLength(1);
    expect(brokerMessages[0]?.data).toEqual({
      revision: 1,
      kind: "network_broker_download",
      requestId: "network.request.download.1",
      url: "https://example.com/archive.zip",
    });
    expect(brokerMessages[0]?.ports).toHaveLength(1);
    expect(JSON.stringify(brokerMessages[0]?.data)).not.toContain("destination");

    controller.abort();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(brokerMessages[1]?.data).toEqual({
      revision: 1,
      kind: "network_broker_cancel",
      requestId: "network.request.download.1",
    });
    lease.cancel();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(brokerMessages).toHaveLength(2);
    client.close();
  });

  it("fails within the outer deadline when the Broker peer closes silently", async () => {
    const channel = new MessageChannel();
    channelsV1.push(channel);
    const client = createBrowserNetworkBrokerClientV1(channel.port1, {
      createRequestId: () => "network.request.silent-peer",
      responseDeadlineMilliseconds: 20,
    });
    const received = new Promise<void>((resolve) => {
      channel.port2.addEventListener("message", () => resolve(), { once: true });
      channel.port2.start();
    });
    const result = client.fetchUrl("https://example.com/silent-peer");
    await received;
    channel.port2.close();

    await expect(result).rejects.toMatchObject({ code: "network_failed" });
    client.close();
  });
});

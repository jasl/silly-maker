// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserNetworkBrokerCancelV1,
  admitBrowserNetworkBrokerFetchUrlFailedV1,
  admitBrowserNetworkBrokerFetchUrlRequestV1,
  admitBrowserNetworkBrokerFetchUrlResultV1,
  createBrowserNetworkBrokerCancelV1,
  createBrowserNetworkBrokerFetchUrlFailedV1,
  createBrowserNetworkBrokerFetchUrlRequestV1,
  createBrowserNetworkBrokerFetchUrlResultV1,
} from "../network/browser-network-broker-protocol.ts";
import { normalizeBrowserNetworkUrlV1 } from "../network/browser-network-url.ts";

describe("Browser Network Broker protocol", () => {
  it("admits only canonical absolute HTTPS URLs without userinfo", () => {
    expect(normalizeBrowserNetworkUrlV1("https://example.com/path?q=1")).toBe(
      "https://example.com/path?q=1",
    );
    expect(normalizeBrowserNetworkUrlV1("https://example.com")).toBe("https://example.com/");
    expect(normalizeBrowserNetworkUrlV1("https://127.0.0.1/private")).toBe(
      "https://127.0.0.1/private",
    );
    expect(normalizeBrowserNetworkUrlV1("https://localhost/model")).toBe(
      "https://localhost/model",
    );
    expect(normalizeBrowserNetworkUrlV1("http://example.com/")).toBeNull();
    expect(normalizeBrowserNetworkUrlV1("https://user:secret@example.com/")).toBeNull();
    expect(normalizeBrowserNetworkUrlV1("not a url")).toBeNull();
    expect(normalizeBrowserNetworkUrlV1(`https://example.com/${"x".repeat(8_192)}`)).toBeNull();
  });

  it("admits exact request, cancel, result, and bounded failure records", () => {
    const request = createBrowserNetworkBrokerFetchUrlRequestV1(
      "network.request.1",
      "https://example.com/",
    );
    const cancel = createBrowserNetworkBrokerCancelV1("network.request.1");
    const result = createBrowserNetworkBrokerFetchUrlResultV1({
      requestId: "network.request.1",
      status: 404,
      contentType: "text/plain; charset=utf-8",
      bytes: 7,
      text: "missing",
    });
    const failed = createBrowserNetworkBrokerFetchUrlFailedV1(
      "network.request.1",
      "network_failed",
    );

    expect(admitBrowserNetworkBrokerFetchUrlRequestV1(request)).toEqual(request);
    expect(admitBrowserNetworkBrokerCancelV1(cancel)).toEqual(cancel);
    expect(admitBrowserNetworkBrokerFetchUrlResultV1(result)).toEqual(result);
    expect(admitBrowserNetworkBrokerFetchUrlFailedV1(failed)).toEqual(failed);
    for (
      const [record, admit] of [
        [request, admitBrowserNetworkBrokerFetchUrlRequestV1],
        [cancel, admitBrowserNetworkBrokerCancelV1],
        [result, admitBrowserNetworkBrokerFetchUrlResultV1],
        [failed, admitBrowserNetworkBrokerFetchUrlFailedV1],
      ] as const
    ) {
      expect(admit({ ...record, extra: true })).toBeNull();
      expect(admit({ ...record, revision: 2 })).toBeNull();
    }
  });

  it("rejects non-canonical URLs, excess text, symbols, and accessors", () => {
    expect(
      admitBrowserNetworkBrokerFetchUrlRequestV1({
        revision: 1,
        kind: "network_broker_fetch_url",
        requestId: "network.request.1",
        url: "https://example.com",
      }),
    ).toBeNull();
    expect(
      admitBrowserNetworkBrokerFetchUrlResultV1({
        revision: 1,
        kind: "network_broker_fetch_url_result",
        requestId: "network.request.1",
        status: 200,
        contentType: "text/plain",
        bytes: 1,
        text: "x".repeat(256 * 1_024 + 1),
      }),
    ).toBeNull();

    const symbol = Symbol("extra");
    const withSymbol = {
      ...createBrowserNetworkBrokerCancelV1("network.request.1"),
      [symbol]: true,
    };
    expect(admitBrowserNetworkBrokerCancelV1(withSymbol)).toBeNull();
    let reads = 0;
    expect(
      admitBrowserNetworkBrokerFetchUrlRequestV1({
        revision: 1,
        kind: "network_broker_fetch_url",
        requestId: "network.request.1",
        get url(): string {
          reads += 1;
          return "https://example.com/";
        },
      }),
    ).toBeNull();
    expect(reads).toBe(0);
  });
});

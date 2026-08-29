// SPDX-License-Identifier: MIT

import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  applyBrowserNetworkBrokerSecurityHeadersV1,
  browserNetworkBrokerContentSecurityPolicyV1,
  browserNetworkBrokerPermissionsPolicyV1,
  sillyOsNetworkBrokerProductionControlOriginV1,
} from "../deployment/browser-network-broker-security.ts";
import {
  type SillyOsNetworkBrokerStaticAssetsBindingV1,
  default as cloudflareNetworkBrokerWorkerV1,
} from "../deployment/cloudflare-network-broker-worker.ts";

function directivesV1(policy: string): Readonly<Record<string, string>> {
  return Object.fromEntries(
    policy.split("; ").map((directive) => {
      const separator = directive.indexOf(" ");
      return separator < 0
        ? [directive, ""]
        : [directive.slice(0, separator), directive.slice(separator + 1)];
    }),
  );
}

class NetworkBrokerAssetsV1 implements SillyOsNetworkBrokerStaticAssetsBindingV1 {
  constructor(
    private readonly response: () => Promise<Response> = async () =>
      new Response("broker asset", {
        headers: { "Content-Security-Policy": "default-src *", "X-Frame-Options": "DENY" },
      }),
  ) {}

  async fetch(_request: Request): Promise<Response> {
    return await this.response();
  }
}

describe("SillyOS independent Network Broker response boundary", () => {
  it("admits only fixed self code, HTTPS egress, and the exact control parent", () => {
    expect(directivesV1(browserNetworkBrokerContentSecurityPolicyV1)).toEqual({
      "default-src": "'none'",
      "script-src": "'self'",
      "worker-src": "'self'",
      "connect-src": "https:",
      "object-src": "'none'",
      "base-uri": "'none'",
      "frame-ancestors": sillyOsNetworkBrokerProductionControlOriginV1,
      "form-action": "'none'",
    });
    expect(browserNetworkBrokerContentSecurityPolicyV1).not.toContain("*");
    expect(browserNetworkBrokerContentSecurityPolicyV1).not.toContain("'unsafe-inline'");
    expect(browserNetworkBrokerContentSecurityPolicyV1).not.toContain("'unsafe-eval'");
  });

  it("replaces asset policy and remains frameable only through CSP", async () => {
    const response = await cloudflareNetworkBrokerWorkerV1.fetch(
      new Request("https://silly-os-network.jasl9187.workers.dev/network-broker.html"),
      { ASSETS: new NetworkBrokerAssetsV1() },
    );
    expect(await response.text()).toBe("broker asset");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      browserNetworkBrokerContentSecurityPolicyV1,
    );
    expect(response.headers.get("Permissions-Policy")).toBe(
      browserNetworkBrokerPermissionsPolicyV1,
    );
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBeNull();
  });

  it("keeps static headers and Wrangler bound to the separate artifact", async () => {
    const [headers, config] = await Promise.all([
      readFile(new URL("../../public-network-broker/_headers", import.meta.url), "utf8"),
      readFile(new URL("../../wrangler.network-broker.jsonc", import.meta.url), "utf8"),
    ]);
    expect(headers).toContain(
      `Content-Security-Policy: ${browserNetworkBrokerContentSecurityPolicyV1}`,
    );
    expect(headers).not.toContain("X-Frame-Options");
    expect(config).toContain('"name": "silly-os-network"');
    expect(config).toContain('"directory": "./dist-network-broker"');
  });

  it("returns the closed policy when the static binding fails", async () => {
    const response = await cloudflareNetworkBrokerWorkerV1.fetch(
      new Request("https://silly-os-network.jasl9187.workers.dev/network-broker.html"),
      {
        ASSETS: new NetworkBrokerAssetsV1(async () => {
          throw new Error("unavailable");
        }),
      },
    );
    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Frame-Options")).toBeNull();
    expect(await response.text()).toBe("Network Broker asset unavailable.");
  });

  it("deletes ambient X-Frame-Options", () => {
    const headers = new Headers({ "X-Frame-Options": "SAMEORIGIN" });
    applyBrowserNetworkBrokerSecurityHeadersV1(headers);
    expect(headers.get("X-Frame-Options")).toBeNull();
  });
});

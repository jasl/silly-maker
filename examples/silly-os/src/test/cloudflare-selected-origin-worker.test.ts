// SPDX-License-Identifier: MIT

import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  browserControlPlaneContentSecurityPolicyV1,
  browserPermissionsPolicyV1,
  browserTrustedTypesReportOnlyPolicyV1,
  createBrowserControlPlaneContentSecurityPolicyV1,
} from "../deployment/browser-control-plane-security.ts";
import {
  type SillyOsStaticAssetsBindingV1,
  default as cloudflareSelectedOriginWorkerV1,
} from "../deployment/cloudflare-selected-origin-worker.ts";
import { browserWorkspaceSandboxProductionOriginV1 } from "../workspace/browser-workspace-sandbox-origins.ts";

const deploymentOriginV1 = "https://silly-os.example";
const agentWorkerPathV1 = "/assets/browser-pi.worker-Ab12_cdE.js";
const endpointOriginQueryParameterV1 = "endpoint-origin";

function directivesV1(policy: string): Map<string, string> {
  return new Map(
    policy.split("; ").map((directive) => {
      const separator = directive.indexOf(" ");
      return separator < 0
        ? [directive, ""]
        : [directive.slice(0, separator), directive.slice(separator + 1)];
    }),
  );
}

function selectedAgentWorkerRequestV1(endpointOrigin: string): Request {
  const url = new URL(agentWorkerPathV1, deploymentOriginV1);
  url.searchParams.set(endpointOriginQueryParameterV1, endpointOrigin);
  return new Request(url, { headers: { "X-SillyOS-Test": "preserved" } });
}

class RecordingAssetsV1 implements SillyOsStaticAssetsBindingV1 {
  readonly requests: Request[] = [];

  constructor(
    private readonly respond: (request: Request) => Promise<Response> = async () =>
      new Response("agent worker", {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Security-Policy": "connect-src 'self' https://old.example",
          "Content-Type": "text/javascript; charset=utf-8",
          "X-Static-Asset": "preserved",
        },
      }),
  ) {}

  async fetch(request: Request): Promise<Response> {
    this.requests.push(request);
    return await this.respond(request);
  }
}

describe("SillyOS Cloudflare selected-origin Agent Worker", () => {
  it("keeps every required control-plane directive explicit and closed", () => {
    const ordinary = directivesV1(browserControlPlaneContentSecurityPolicyV1);
    expect(Object.fromEntries(ordinary)).toEqual({
      "default-src": "'none'",
      "script-src": "'self'",
      "style-src": "'self'",
      "style-src-elem": "'self'",
      "style-src-attr": "'none'",
      "img-src": "'self' data: blob:",
      "font-src": "'self'",
      "connect-src": "'self'",
      "worker-src": "'self'",
      "frame-src": `${browserWorkspaceSandboxProductionOriginV1} blob:`,
      "media-src": "'self' blob:",
      "manifest-src": "'self'",
      "object-src": "'none'",
      "base-uri": "'none'",
      "frame-ancestors": "'none'",
      "form-action": "'self'",
    });

    const selected = directivesV1(
      createBrowserControlPlaneContentSecurityPolicyV1("https://api.example.com"),
    );
    expect(selected.get("connect-src")).toBe("'self' https://api.example.com");
    expect(selected.get("frame-src")).toBe(
      `${browserWorkspaceSandboxProductionOriginV1} blob:`,
    );
    expect(selected.size).toBe(ordinary.size);
  });

  it.each([
    ["an arbitrary HTTPS origin", "https://sandbox.example.com"],
    ["the production origin with a path", `${browserWorkspaceSandboxProductionOriginV1}/frame`],
    ["a wildcard", "*"],
    ["a same-origin frame", deploymentOriginV1],
  ])("rejects %s as Workspace Sandbox frame authority", (_label, sandboxOrigin) => {
    expect(() => createBrowserControlPlaneContentSecurityPolicyV1(null, sandboxOrigin))
      .toThrowError("sillyos.control_plane.workspace_sandbox_origin_invalid");
  });

  it("strips the selection query and returns the static Worker with one exact origin policy", async () => {
    const assets = new RecordingAssetsV1();
    const response = await cloudflareSelectedOriginWorkerV1.fetch(
      selectedAgentWorkerRequestV1("https://api.example.com:8443"),
      { ASSETS: assets },
    );

    expect(assets.requests).toHaveLength(1);
    expect(assets.requests[0]?.url).toBe(`${deploymentOriginV1}${agentWorkerPathV1}`);
    expect(assets.requests[0]?.headers.get("X-SillyOS-Test")).toBe("preserved");
    expect(await response.text()).toBe("agent worker");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      createBrowserControlPlaneContentSecurityPolicyV1("https://api.example.com:8443"),
    );
    expect(response.headers.get("Content-Security-Policy")?.split(/\s+/u)).not.toContain("https:");
    expect(response.headers.get("Content-Security-Policy")).not.toContain("*");
    expect(response.headers.get("Content-Security-Policy")).not.toContain("'unsafe-inline'");
    expect(response.headers.get("Content-Security-Policy")).not.toContain("'unsafe-eval'");
    expect(response.headers.get("Content-Security-Policy-Report-Only")).toBe(
      browserTrustedTypesReportOnlyPolicyV1,
    );
    expect(response.headers.get("Permissions-Policy")).toBe(browserPermissionsPolicyV1);
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toBe("text/javascript; charset=utf-8");
    expect(response.headers.get("X-Static-Asset")).toBe("preserved");
  });

  it.each([
    ["empty selection", `${deploymentOriginV1}${agentWorkerPathV1}?endpoint-origin=`],
    [
      "duplicate selection",
      `${deploymentOriginV1}${agentWorkerPathV1}?endpoint-origin=https%3A%2F%2Fapi.example.com&endpoint-origin=https%3A%2F%2Fapi.example.com`,
    ],
    [
      "additional query",
      `${deploymentOriginV1}${agentWorkerPathV1}?endpoint-origin=https%3A%2F%2Fapi.example.com&other=value`,
    ],
    [
      "HTTP origin",
      `${deploymentOriginV1}${agentWorkerPathV1}?endpoint-origin=http%3A%2F%2Fapi.example.com`,
    ],
    [
      "URL credentials",
      `${deploymentOriginV1}${agentWorkerPathV1}?endpoint-origin=https%3A%2F%2Fuser%3Asecret%40api.example.com`,
    ],
    [
      "CRLF",
      `${deploymentOriginV1}${agentWorkerPathV1}?endpoint-origin=https%3A%2F%2Fapi.example.com%0D%0AX-Injected%3Ayes`,
    ],
    [
      "noncanonical trailing slash",
      `${deploymentOriginV1}${agentWorkerPathV1}?endpoint-origin=https%3A%2F%2Fapi.example.com%2F`,
    ],
    [
      "noncanonical path",
      `${deploymentOriginV1}${agentWorkerPathV1}?endpoint-origin=https%3A%2F%2Fapi.example.com%2Fv1`,
    ],
    [
      "noncanonical default port",
      `${deploymentOriginV1}${agentWorkerPathV1}?endpoint-origin=https%3A%2F%2Fapi.example.com%3A443`,
    ],
    [
      "noncanonical query encoding",
      `${deploymentOriginV1}${agentWorkerPathV1}?endpoint-origin=https://api.example.com`,
    ],
  ])("rejects %s before fetching the static asset", async (_label, url) => {
    const assets = new RecordingAssetsV1();
    const response = await cloudflareSelectedOriginWorkerV1.fetch(new Request(url), {
      ASSETS: assets,
    });

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      browserControlPlaneContentSecurityPolicyV1,
    );
    expect(await response.text()).not.toContain("api.example.com");
    expect(assets.requests).toEqual([]);
  });

  it("leaves built-in, ordinary, and unhashed static asset requests on the static binding", async () => {
    const responses = [
      new Response("built-in worker"),
      new Response("index"),
      new Response("unhashed worker"),
      new Response("source map"),
    ];
    const assets = new RecordingAssetsV1(async () => {
      const response = responses.shift();
      if (response === undefined) throw new Error("unexpected static request");
      return response;
    });
    const requests = [
      new Request(`${deploymentOriginV1}${agentWorkerPathV1}`),
      new Request(`${deploymentOriginV1}/index.html?kept=yes`),
      new Request(
        `${deploymentOriginV1}/assets/browser-pi.worker.js?endpoint-origin=https%3A%2F%2Fapi.example.com`,
      ),
      new Request(
        `${deploymentOriginV1}${agentWorkerPathV1}.map?endpoint-origin=https%3A%2F%2Fapi.example.com`,
      ),
    ];

    const received = [];
    for (const request of requests) {
      received.push(await cloudflareSelectedOriginWorkerV1.fetch(request, { ASSETS: assets }));
    }

    expect(await Promise.all(received.map((response) => response.text()))).toEqual([
      "built-in worker",
      "index",
      "unhashed worker",
      "source map",
    ]);
    expect(received[0]?.headers.get("Content-Security-Policy")).toBe(
      browserControlPlaneContentSecurityPolicyV1,
    );
    expect(received[0]?.headers.get("Content-Security-Policy-Report-Only")).toBe(
      browserTrustedTypesReportOnlyPolicyV1,
    );
    expect(received[0]?.headers.get("Cache-Control")).toBeNull();
    expect(
      received.slice(1).every((response) =>
        response.headers.get("Content-Security-Policy") === null
      ),
    ).toBe(true);
    expect(assets.requests.map(({ url }) => url)).toEqual(requests.map(({ url }) => url));
  });

  it("returns a bounded no-store failure when the selected static Worker fetch fails", async () => {
    const assets = new RecordingAssetsV1(async () => {
      throw new Error("asset binding failed");
    });
    const response = await cloudflareSelectedOriginWorkerV1.fetch(
      selectedAgentWorkerRequestV1("https://api.example.com"),
      { ASSETS: assets },
    );

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      createBrowserControlPlaneContentSecurityPolicyV1("https://api.example.com"),
    );
    expect(await response.text()).toBe("Agent Worker asset unavailable.");
  });

  it("keeps Wrangler routing selective to the hashed Agent Worker asset", async () => {
    const config = await readFile(new URL("../../wrangler.jsonc", import.meta.url), "utf8");

    expect(config).toContain('"main": "./src/deployment/cloudflare-selected-origin-worker.ts"');
    expect(config).toContain('"binding": "ASSETS"');
    expect(config).toContain('"run_worker_first": ["/assets/browser-pi.worker-*.js"]');
    expect(config).not.toContain('"run_worker_first": true');
  });

  it("keeps the static control plane on the same complete security policy", async () => {
    const headers = await readFile(new URL("../../public/_headers", import.meta.url), "utf8");

    expect(headers).toContain(
      `Content-Security-Policy: ${browserControlPlaneContentSecurityPolicyV1}`,
    );
    expect(headers).toContain(
      `Content-Security-Policy-Report-Only: ${browserTrustedTypesReportOnlyPolicyV1}`,
    );
    expect(headers).toContain(`Permissions-Policy: ${browserPermissionsPolicyV1}`);
    expect(headers).toContain("Referrer-Policy: no-referrer");
    expect(headers).toContain("X-Content-Type-Options: nosniff");
    expect(headers).toContain("X-Frame-Options: DENY");
    expect(headers).not.toContain("'unsafe-inline'");
    expect(headers).not.toContain("'unsafe-eval'");
    expect(headers).not.toContain("connect-src https:");
  });
});

// SPDX-License-Identifier: MIT

import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  applyBrowserWorkspaceSandboxSecurityHeadersV1,
  browserWorkspaceSandboxContentSecurityPolicyV1,
  browserWorkspaceSandboxPermissionsPolicyV1,
  sillyOsProductionControlOriginV1,
} from "../deployment/browser-workspace-sandbox-security.ts";
import {
  type SillyOsWorkspaceSandboxStaticAssetsBindingV1,
  default as cloudflareWorkspaceSandboxWorkerV1,
} from "../deployment/cloudflare-workspace-sandbox-worker.ts";

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

class SandboxAssetsV1 implements SillyOsWorkspaceSandboxStaticAssetsBindingV1 {
  readonly requests: Request[] = [];

  constructor(
    private readonly response: () => Promise<Response> = async () =>
      new Response("sandbox asset", {
        headers: {
          "Content-Security-Policy": "default-src *",
          "Content-Type": "text/javascript; charset=utf-8",
          "X-Frame-Options": "DENY",
          "X-Static-Asset": "preserved",
        },
      }),
  ) {}

  async fetch(request: Request): Promise<Response> {
    this.requests.push(request);
    return await this.response();
  }
}

describe("SillyOS independent Workspace Sandbox response boundary", () => {
  it("closes every ambient browser capability and admits one exact parent origin", () => {
    expect(directivesV1(browserWorkspaceSandboxContentSecurityPolicyV1)).toEqual({
      "default-src": "'none'",
      "script-src": "'self'",
      "worker-src": "'self'",
      "frame-src": "blob:",
      "connect-src": "'none'",
      "object-src": "'none'",
      "base-uri": "'none'",
      "frame-ancestors": sillyOsProductionControlOriginV1,
      "form-action": "'none'",
    });
    expect(browserWorkspaceSandboxContentSecurityPolicyV1).not.toContain("*");
    expect(browserWorkspaceSandboxContentSecurityPolicyV1).not.toContain("'unsafe-inline'");
    expect(browserWorkspaceSandboxContentSecurityPolicyV1).not.toContain("'unsafe-eval'");
    expect(directivesV1(browserWorkspaceSandboxContentSecurityPolicyV1)["frame-ancestors"])
      .toBe(sillyOsProductionControlOriginV1);
    expect(browserWorkspaceSandboxContentSecurityPolicyV1).not.toContain(
      "https://silly-os.example",
    );
  });

  it("replaces stale asset policy and stays frameable only through CSP", async () => {
    const assets = new SandboxAssetsV1();
    const request = new Request(
      "https://silly-os-sandbox.jasl9187.workers.dev/assets/host.js",
    );
    const response = await cloudflareWorkspaceSandboxWorkerV1.fetch(request, { ASSETS: assets });

    expect(assets.requests).toEqual([request]);
    expect(await response.text()).toBe("sandbox asset");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      browserWorkspaceSandboxContentSecurityPolicyV1,
    );
    expect(response.headers.get("Permissions-Policy")).toBe(
      browserWorkspaceSandboxPermissionsPolicyV1,
    );
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBeNull();
    expect(response.headers.get("X-Static-Asset")).toBe("preserved");
  });

  it("returns the same closed policy when the static binding fails", async () => {
    const assets = new SandboxAssetsV1(async () => {
      throw new Error("asset unavailable");
    });
    const response = await cloudflareWorkspaceSandboxWorkerV1.fetch(
      new Request("https://silly-os-sandbox.jasl9187.workers.dev/workspace-sandbox.html"),
      { ASSETS: assets },
    );

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      browserWorkspaceSandboxContentSecurityPolicyV1,
    );
    expect(response.headers.get("X-Frame-Options")).toBeNull();
    expect(await response.text()).toBe("Workspace Sandbox asset unavailable.");
  });

  it("keeps static headers and Wrangler routing bound to the separate artifact", async () => {
    const [headers, config] = await Promise.all([
      readFile(new URL("../../public-workspace-sandbox/_headers", import.meta.url), "utf8"),
      readFile(new URL("../../wrangler.workspace-sandbox.jsonc", import.meta.url), "utf8"),
    ]);

    expect(headers).toContain(
      `Content-Security-Policy: ${browserWorkspaceSandboxContentSecurityPolicyV1}`,
    );
    expect(headers).toContain(
      `Permissions-Policy: ${browserWorkspaceSandboxPermissionsPolicyV1}`,
    );
    expect(headers).not.toContain("X-Frame-Options");
    expect(config).toContain('"name": "silly-os-sandbox"');
    expect(config).toContain('"main": "./src/deployment/cloudflare-workspace-sandbox-worker.ts"');
    expect(config).toContain('"directory": "./dist-workspace-sandbox"');
    expect(config).toContain('"run_worker_first": ["/*"]');
  });

  it("deletes X-Frame-Options from an arbitrary response header set", () => {
    const headers = new Headers({ "X-Frame-Options": "SAMEORIGIN" });
    applyBrowserWorkspaceSandboxSecurityHeadersV1(headers);

    expect(headers.get("X-Frame-Options")).toBeNull();
    expect(headers.get("Content-Security-Policy")).toBe(
      browserWorkspaceSandboxContentSecurityPolicyV1,
    );
  });
});

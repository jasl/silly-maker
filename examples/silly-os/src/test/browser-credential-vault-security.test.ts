// SPDX-License-Identifier: MIT

import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { browserPermissionsPolicyV1 } from "../deployment/browser-control-plane-security.ts";
import {
  applyBrowserCredentialVaultWorkerSecurityHeadersV1,
  browserCredentialVaultWorkerContentSecurityPolicyV1,
  browserCredentialVaultWorkerDevelopmentPathV1,
  isBrowserCredentialVaultWorkerAssetPathV1,
  isExactBrowserCredentialVaultDevelopmentRequestV1,
} from "../deployment/browser-credential-vault-security.ts";
import {
  type SillyOsStaticAssetsBindingV1,
  default as cloudflareSelectedOriginWorkerV1,
} from "../deployment/cloudflare-selected-origin-worker.ts";

const deploymentOriginV1 = "https://silly-os.example";
const credentialVaultWorkerPathV1 = "/assets/browser-credential-vault.worker-Ab12_cdE.js";

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

class RecordingAssetsV1 implements SillyOsStaticAssetsBindingV1 {
  readonly requests: Request[] = [];

  constructor(
    private readonly respond: (request: Request) => Promise<Response> = async () =>
      new Response("vault worker", {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Security-Policy": "connect-src 'self' https://provider.example",
          "Content-Security-Policy-Report-Only": "connect-src https:",
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

describe("Browser Credential Vault Worker security boundary", () => {
  it("defines an exact network-off Worker policy", () => {
    expect(directivesV1(browserCredentialVaultWorkerContentSecurityPolicyV1)).toEqual({
      "default-src": "'none'",
      "script-src": "'self'",
      "connect-src": "'none'",
      "worker-src": "'none'",
      "frame-src": "'none'",
      "object-src": "'none'",
      "base-uri": "'none'",
      "frame-ancestors": "'none'",
      "form-action": "'none'",
    });
    expect(browserCredentialVaultWorkerContentSecurityPolicyV1).not.toContain("https:");
    expect(browserCredentialVaultWorkerContentSecurityPolicyV1).not.toContain("*");
    expect(browserCredentialVaultWorkerContentSecurityPolicyV1).not.toContain("unsafe-");

    const headers = new Headers({
      "Content-Security-Policy-Report-Only": "connect-src https:",
    });
    applyBrowserCredentialVaultWorkerSecurityHeadersV1(headers);
    expect(headers.get("Content-Security-Policy")).toBe(
      browserCredentialVaultWorkerContentSecurityPolicyV1,
    );
    expect(headers.get("Content-Security-Policy-Report-Only")).toBeNull();
    expect(headers.get("Permissions-Policy")).toBe(browserPermissionsPolicyV1);
    expect(headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("admits only Vite's exact fixed development module Worker request", () => {
    expect(isExactBrowserCredentialVaultDevelopmentRequestV1(
      new URL(
        `${deploymentOriginV1}${browserCredentialVaultWorkerDevelopmentPathV1}?worker_file&type=module`,
      ),
    )).toBe(true);

    for (
      const url of [
        `${deploymentOriginV1}${browserCredentialVaultWorkerDevelopmentPathV1}`,
        `${deploymentOriginV1}${browserCredentialVaultWorkerDevelopmentPathV1}?worker_file&type=classic`,
        `${deploymentOriginV1}${browserCredentialVaultWorkerDevelopmentPathV1}?worker_file&type=module&endpoint-origin=https%3A%2F%2Fprovider.example`,
        `${deploymentOriginV1}${browserCredentialVaultWorkerDevelopmentPathV1}?worker_file&worker_file&type=module`,
        `${deploymentOriginV1}/src/credential/other.worker.ts?worker_file&type=module`,
      ]
    ) {
      expect(isExactBrowserCredentialVaultDevelopmentRequestV1(new URL(url))).toBe(false);
    }
  });

  it("recognizes only one hashed production Vault Worker asset shape", () => {
    expect(isBrowserCredentialVaultWorkerAssetPathV1(credentialVaultWorkerPathV1)).toBe(true);
    for (
      const path of [
        "/assets/browser-credential-vault.worker.js",
        "/assets/browser-credential-vault.worker-short.js",
        "/assets/browser-credential-vault.worker-Ab12_cdE.js.map",
        "/assets/browser-pi.worker-Ab12_cdE.js",
        "/nested/browser-credential-vault.worker-Ab12_cdE.js",
      ]
    ) {
      expect(isBrowserCredentialVaultWorkerAssetPathV1(path)).toBe(false);
    }
  });

  it("serves the hashed Vault Worker through Cloudflare with no Provider egress", async () => {
    const assets = new RecordingAssetsV1();
    const request = new Request(`${deploymentOriginV1}${credentialVaultWorkerPathV1}`);
    const response = await cloudflareSelectedOriginWorkerV1.fetch(request, { ASSETS: assets });

    expect(assets.requests.map(({ url }) => url)).toEqual([request.url]);
    expect(await response.text()).toBe("vault worker");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      browserCredentialVaultWorkerContentSecurityPolicyV1,
    );
    expect(response.headers.get("Content-Security-Policy-Report-Only")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(response.headers.get("Content-Type")).toBe("text/javascript; charset=utf-8");
    expect(response.headers.get("X-Static-Asset")).toBe("preserved");
  });

  it("rejects a Vault Worker query before static fetch and bounds asset failures", async () => {
    const queriedAssets = new RecordingAssetsV1();
    const queried = await cloudflareSelectedOriginWorkerV1.fetch(
      new Request(
        `${deploymentOriginV1}${credentialVaultWorkerPathV1}?endpoint-origin=https%3A%2F%2Fprovider.example`,
      ),
      { ASSETS: queriedAssets },
    );
    expect(queried.status).toBe(400);
    expect(queried.headers.get("Cache-Control")).toBe("no-store");
    expect(queried.headers.get("Content-Security-Policy")).toBe(
      browserCredentialVaultWorkerContentSecurityPolicyV1,
    );
    expect(queriedAssets.requests).toEqual([]);

    const failingAssets = new RecordingAssetsV1(async () => {
      throw new Error("asset binding unavailable");
    });
    const unavailable = await cloudflareSelectedOriginWorkerV1.fetch(
      new Request(`${deploymentOriginV1}${credentialVaultWorkerPathV1}`),
      { ASSETS: failingAssets },
    );
    expect(unavailable.status).toBe(502);
    expect(unavailable.headers.get("Cache-Control")).toBe("no-store");
    expect(unavailable.headers.get("Content-Security-Policy")).toBe(
      browserCredentialVaultWorkerContentSecurityPolicyV1,
    );
    expect(await unavailable.text()).toBe("Credential Vault Worker asset unavailable.");
  });

  it("routes exactly the two hashed privileged Worker families through Cloudflare", async () => {
    const config = await readFile(new URL("../../wrangler.jsonc", import.meta.url), "utf8");
    expect(config).toContain('"/assets/browser-pi.worker-*.js"');
    expect(config).toContain('"/assets/browser-credential-vault.worker-*.js"');
    expect(config).not.toContain('"run_worker_first": true');
  });
});

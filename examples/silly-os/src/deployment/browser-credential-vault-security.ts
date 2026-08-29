// SPDX-License-Identifier: MIT

import { browserPermissionsPolicyV1 } from "./browser-control-plane-security.ts";

export const browserCredentialVaultWorkerDevelopmentPathV1 =
  "/src/credential/browser-credential-vault.worker.ts";

export type BrowserCredentialVaultDevelopmentRequestDispositionV1 =
  | "module_resolution"
  | "worker_asset"
  | "rejected"
  | "unrelated";

const browserCredentialVaultWorkerAssetPathPatternV1 =
  /^\/assets\/browser-credential-vault\.worker-[A-Za-z0-9_-]{8,64}\.js$/u;

function targetsBrowserCredentialVaultWorkerDevelopmentPathV1(requestTarget: string): boolean {
  try {
    const parsed = new URL(requestTarget, "http://127.0.0.1");
    const normalizedPath = decodeURIComponent(parsed.pathname).replace(/\/{2,}/gu, "/");
    return normalizedPath === browserCredentialVaultWorkerDevelopmentPathV1;
  } catch {
    return false;
  }
}

function createBrowserCredentialVaultWorkerContentSecurityPolicyV1(
  workerSource: "'none'" | "'self'",
): string {
  return [
    "default-src 'none'",
    "script-src 'self'",
    "connect-src 'none'",
    `worker-src ${workerSource}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'none'",
  ].join("; ");
}

export const browserCredentialVaultWorkerContentSecurityPolicyV1 =
  createBrowserCredentialVaultWorkerContentSecurityPolicyV1("'none'");

export const browserCredentialVaultWorkerDevelopmentContentSecurityPolicyV1 =
  createBrowserCredentialVaultWorkerContentSecurityPolicyV1("'self'");

export function isBrowserCredentialVaultWorkerAssetPathV1(pathname: string): boolean {
  return browserCredentialVaultWorkerAssetPathPatternV1.test(pathname);
}

export function isExactBrowserCredentialVaultDevelopmentRequestV1(
  requestTarget: string,
): boolean {
  return requestTarget ===
    `${browserCredentialVaultWorkerDevelopmentPathV1}?worker_file&type=module`;
}

export function isExactBrowserCredentialVaultDevelopmentModuleRequestV1(
  requestTarget: string,
): boolean {
  return requestTarget === `${browserCredentialVaultWorkerDevelopmentPathV1}?worker&url`;
}

export function classifyBrowserCredentialVaultDevelopmentRequestV1(
  requestTarget: string,
): BrowserCredentialVaultDevelopmentRequestDispositionV1 {
  if (!targetsBrowserCredentialVaultWorkerDevelopmentPathV1(requestTarget)) return "unrelated";
  if (isExactBrowserCredentialVaultDevelopmentModuleRequestV1(requestTarget)) {
    return "module_resolution";
  }
  if (isExactBrowserCredentialVaultDevelopmentRequestV1(requestTarget)) return "worker_asset";
  return "rejected";
}

export function applyBrowserCredentialVaultWorkerSecurityHeadersV1(headers: Headers): void {
  headers.set("Content-Security-Policy", browserCredentialVaultWorkerContentSecurityPolicyV1);
  headers.delete("Content-Security-Policy-Report-Only");
  headers.set("Permissions-Policy", browserPermissionsPolicyV1);
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
}

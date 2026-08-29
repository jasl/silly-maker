// SPDX-License-Identifier: MIT

import { browserPermissionsPolicyV1 } from "./browser-control-plane-security.ts";

export const browserCredentialVaultWorkerDevelopmentPathV1 =
  "/src/credential/browser-credential-vault.worker.ts";

const browserCredentialVaultWorkerAssetPathPatternV1 =
  /^\/assets\/browser-credential-vault\.worker-[A-Za-z0-9_-]{8,64}\.js$/u;

export const browserCredentialVaultWorkerContentSecurityPolicyV1 = [
  "default-src 'none'",
  "script-src 'self'",
  "connect-src 'none'",
  "worker-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
].join("; ");

export function isBrowserCredentialVaultWorkerAssetPathV1(pathname: string): boolean {
  return browserCredentialVaultWorkerAssetPathPatternV1.test(pathname);
}

export function isExactBrowserCredentialVaultDevelopmentRequestV1(url: URL): boolean {
  if (url.pathname !== browserCredentialVaultWorkerDevelopmentPathV1) return false;
  const workerFileValues = url.searchParams.getAll("worker_file");
  const typeValues = url.searchParams.getAll("type");
  return url.searchParams.size === 2 && workerFileValues.length === 1 &&
    workerFileValues[0] === "" && typeValues.length === 1 && typeValues[0] === "module";
}

export function applyBrowserCredentialVaultWorkerSecurityHeadersV1(headers: Headers): void {
  headers.set("Content-Security-Policy", browserCredentialVaultWorkerContentSecurityPolicyV1);
  headers.delete("Content-Security-Policy-Report-Only");
  headers.set("Permissions-Policy", browserPermissionsPolicyV1);
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
}

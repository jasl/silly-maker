// SPDX-License-Identifier: MIT

const contentSecurityPolicyDirectivesBeforeConnectV1 = Object.freeze([
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-elem 'self'",
  "style-src-attr 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
]);

const contentSecurityPolicyDirectivesAfterConnectV1 = Object.freeze([
  "worker-src 'self'",
  "frame-src 'none'",
  "media-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
]);

export const browserTrustedTypesReportOnlyPolicyV1 =
  "require-trusted-types-for 'script'; trusted-types 'none'";
export const browserPermissionsPolicyV1 =
  "camera=(), geolocation=(), microphone=(), payment=(), usb=()";

export function createBrowserControlPlaneContentSecurityPolicyV1(
  endpointOrigin: string | null = null,
): string {
  const connect = endpointOrigin === null
    ? "connect-src 'self'"
    : `connect-src 'self' ${endpointOrigin}`;
  return [
    ...contentSecurityPolicyDirectivesBeforeConnectV1,
    connect,
    ...contentSecurityPolicyDirectivesAfterConnectV1,
  ].join("; ");
}

export const browserControlPlaneContentSecurityPolicyV1 =
  createBrowserControlPlaneContentSecurityPolicyV1();

export function applyBrowserControlPlaneSecurityHeadersV1(
  headers: Headers,
  endpointOrigin: string | null,
): void {
  headers.set(
    "Content-Security-Policy",
    createBrowserControlPlaneContentSecurityPolicyV1(endpointOrigin),
  );
  headers.set("Content-Security-Policy-Report-Only", browserTrustedTypesReportOnlyPolicyV1);
  headers.set("Permissions-Policy", browserPermissionsPolicyV1);
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
}

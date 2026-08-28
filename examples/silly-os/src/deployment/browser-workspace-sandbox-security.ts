// SPDX-License-Identifier: MIT

export const sillyOsProductionControlOriginV1 = "https://silly-os.jasl9187.workers.dev";

export const browserWorkspaceSandboxContentSecurityPolicyV1 = [
  "default-src 'none'",
  "script-src 'self'",
  "worker-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  `frame-ancestors ${sillyOsProductionControlOriginV1}`,
  "form-action 'none'",
].join("; ");

export const browserWorkspaceSandboxPermissionsPolicyV1 =
  "camera=(), geolocation=(), microphone=(), payment=(), usb=()";

export function applyBrowserWorkspaceSandboxSecurityHeadersV1(headers: Headers): void {
  headers.set("Content-Security-Policy", browserWorkspaceSandboxContentSecurityPolicyV1);
  headers.set("Permissions-Policy", browserWorkspaceSandboxPermissionsPolicyV1);
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");

  // The Sandbox must be frameable by the one admitted control-plane origin.
  // CSP frame-ancestors is the sole embedding authority.
  headers.delete("X-Frame-Options");
}

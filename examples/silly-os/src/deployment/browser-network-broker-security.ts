// SPDX-License-Identifier: MIT

export const sillyOsNetworkBrokerProductionControlOriginV1 =
  "https://silly-os.jasl9187.workers.dev";

export const browserNetworkBrokerContentSecurityPolicyV1 = [
  "default-src 'none'",
  "script-src 'self'",
  "worker-src 'self'",
  "connect-src https:",
  "object-src 'none'",
  "base-uri 'none'",
  `frame-ancestors ${sillyOsNetworkBrokerProductionControlOriginV1}`,
  "form-action 'none'",
].join("; ");

export const browserNetworkBrokerPermissionsPolicyV1 =
  "camera=(), geolocation=(), microphone=(), payment=(), usb=()";

export function applyBrowserNetworkBrokerSecurityHeadersV1(headers: Headers): void {
  headers.set("Content-Security-Policy", browserNetworkBrokerContentSecurityPolicyV1);
  headers.set("Permissions-Policy", browserNetworkBrokerPermissionsPolicyV1);
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  // The Broker is frameable only by the exact control origin through CSP.
  headers.delete("X-Frame-Options");
}

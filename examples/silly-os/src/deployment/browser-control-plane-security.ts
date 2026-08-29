// SPDX-License-Identifier: MIT

import {
  browserWorkspaceSandboxDevelopmentOriginV1,
  browserWorkspaceSandboxProductionOriginV1,
} from "../workspace/browser-workspace-sandbox-origins.ts";
import {
  browserNetworkBrokerDevelopmentOriginV1,
  browserNetworkBrokerProductionOriginV1,
} from "../network/browser-network-broker-origins.ts";

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
  workspaceSandboxOrigin: string = browserWorkspaceSandboxProductionOriginV1,
  networkBrokerOrigin: string =
    workspaceSandboxOrigin === browserWorkspaceSandboxDevelopmentOriginV1
      ? browserNetworkBrokerDevelopmentOriginV1
      : browserNetworkBrokerProductionOriginV1,
): string {
  if (
    workspaceSandboxOrigin !== browserWorkspaceSandboxProductionOriginV1 &&
    workspaceSandboxOrigin !== browserWorkspaceSandboxDevelopmentOriginV1
  ) throw new TypeError("sillyos.control_plane.workspace_sandbox_origin_invalid");
  const expectedNetworkBrokerOrigin = workspaceSandboxOrigin ===
      browserWorkspaceSandboxDevelopmentOriginV1
    ? browserNetworkBrokerDevelopmentOriginV1
    : browserNetworkBrokerProductionOriginV1;
  if (networkBrokerOrigin !== expectedNetworkBrokerOrigin) {
    throw new TypeError("sillyos.control_plane.network_broker_origin_invalid");
  }
  const connect = endpointOrigin === null
    ? "connect-src 'self'"
    : `connect-src 'self' ${endpointOrigin}`;
  return [
    ...contentSecurityPolicyDirectivesBeforeConnectV1,
    connect,
    "worker-src 'self'",
    // WebKit applies the embedding page's frame-src policy when the admitted
    // Sandbox iframe hands its same-origin Blob archive to the download UI.
    // The Blob URL itself never crosses into the control-plane process.
    `frame-src ${workspaceSandboxOrigin} ${networkBrokerOrigin} blob:`,
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

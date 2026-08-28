// SPDX-License-Identifier: MIT

import {
  applyBrowserWorkspaceSandboxSecurityHeadersV1,
} from "./browser-workspace-sandbox-security.ts";

export interface SillyOsWorkspaceSandboxStaticAssetsBindingV1 {
  fetch(request: Request): Promise<Response>;
}

export interface SillyOsWorkspaceSandboxCloudflareEnvironmentV1 {
  readonly ASSETS: SillyOsWorkspaceSandboxStaticAssetsBindingV1;
}

function responseWithWorkspaceSandboxPolicyV1(response: Response): Response {
  const headers = new Headers(response.headers);
  applyBrowserWorkspaceSandboxSecurityHeadersV1(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function unavailableWorkspaceSandboxAssetV1(): Response {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
  });
  applyBrowserWorkspaceSandboxSecurityHeadersV1(headers);
  return new Response("Workspace Sandbox asset unavailable.", {
    status: 502,
    headers,
  });
}

async function handleSillyOsWorkspaceSandboxCloudflareRequestV1(
  request: Request,
  environment: SillyOsWorkspaceSandboxCloudflareEnvironmentV1,
): Promise<Response> {
  try {
    return responseWithWorkspaceSandboxPolicyV1(await environment.ASSETS.fetch(request));
  } catch {
    return unavailableWorkspaceSandboxAssetV1();
  }
}

export default {
  fetch: handleSillyOsWorkspaceSandboxCloudflareRequestV1,
};

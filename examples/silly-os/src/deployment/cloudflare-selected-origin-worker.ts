// SPDX-License-Identifier: MIT

import { applyBrowserControlPlaneSecurityHeadersV1 } from "./browser-control-plane-security.ts";
import {
  applyBrowserCredentialVaultWorkerSecurityHeadersV1,
  isBrowserCredentialVaultWorkerAssetPathV1,
} from "./browser-credential-vault-security.ts";

const browserPiEndpointOriginQueryParameterV1 = "endpoint-origin";

const browserPiWorkerAssetPathV1 = /^\/assets\/browser-pi\.worker-[A-Za-z0-9_-]{8,64}\.js$/u;
const noStoreV1 = "no-store";

export interface SillyOsStaticAssetsBindingV1 {
  fetch(request: Request): Promise<Response>;
}

export interface SillyOsCloudflareEnvironmentV1 {
  readonly ASSETS: SillyOsStaticAssetsBindingV1;
}

function rejectedAgentWorkerRequestV1(): Response {
  const headers = new Headers({
    "Cache-Control": noStoreV1,
    "Content-Type": "text/plain; charset=utf-8",
  });
  applyBrowserControlPlaneSecurityHeadersV1(headers, null);
  return new Response("Invalid Agent Worker endpoint origin.", {
    status: 400,
    headers,
  });
}

function unavailableAgentWorkerAssetV1(endpointOrigin: string | null): Response {
  const headers = new Headers({
    "Cache-Control": noStoreV1,
    "Content-Type": "text/plain; charset=utf-8",
  });
  applyBrowserControlPlaneSecurityHeadersV1(headers, endpointOrigin);
  return new Response("Agent Worker asset unavailable.", {
    status: 502,
    headers,
  });
}

function rejectedCredentialVaultWorkerRequestV1(): Response {
  const headers = new Headers({
    "Cache-Control": noStoreV1,
    "Content-Type": "text/plain; charset=utf-8",
  });
  applyBrowserCredentialVaultWorkerSecurityHeadersV1(headers);
  return new Response("Invalid Credential Vault Worker request.", {
    status: 400,
    headers,
  });
}

function unavailableCredentialVaultWorkerAssetV1(): Response {
  const headers = new Headers({
    "Cache-Control": noStoreV1,
    "Content-Type": "text/plain; charset=utf-8",
  });
  applyBrowserCredentialVaultWorkerSecurityHeadersV1(headers);
  return new Response("Credential Vault Worker asset unavailable.", {
    status: 502,
    headers,
  });
}

export function parseCanonicalEndpointOriginV1(value: string | null): string | null {
  if (value === null || value.length === 0 || /[\r\n]/u.test(value)) return null;
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    return null;
  }

  if (
    endpoint.protocol !== "https:" || endpoint.username !== "" || endpoint.password !== "" ||
    value !== endpoint.origin
  ) {
    return null;
  }
  return endpoint.origin;
}

function readCanonicalEndpointOriginV1(requestUrl: URL): string | null {
  const values = requestUrl.searchParams.getAll(browserPiEndpointOriginQueryParameterV1);
  if (requestUrl.searchParams.size !== 1 || values.length !== 1) return null;

  const endpointOrigin = parseCanonicalEndpointOriginV1(values[0] ?? null);
  if (endpointOrigin === null) return null;

  const canonicalQuery = new URLSearchParams([
    [browserPiEndpointOriginQueryParameterV1, endpointOrigin],
  ]).toString();
  return requestUrl.search === `?${canonicalQuery}` ? endpointOrigin : null;
}

function responseWithAgentWorkerPolicyV1(
  response: Response,
  endpointOrigin: string | null,
): Response {
  const headers = new Headers(response.headers);
  if (endpointOrigin !== null) headers.set("Cache-Control", noStoreV1);
  applyBrowserControlPlaneSecurityHeadersV1(headers, endpointOrigin);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function responseWithCredentialVaultWorkerPolicyV1(response: Response): Response {
  const headers = new Headers(response.headers);
  applyBrowserCredentialVaultWorkerSecurityHeadersV1(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleSillyOsCloudflareRequestV1(
  request: Request,
  environment: SillyOsCloudflareEnvironmentV1,
): Promise<Response> {
  const requestUrl = new URL(request.url);
  if (isBrowserCredentialVaultWorkerAssetPathV1(requestUrl.pathname)) {
    if (requestUrl.search.length !== 0 || requestUrl.hash.length !== 0) {
      return rejectedCredentialVaultWorkerRequestV1();
    }
    try {
      return responseWithCredentialVaultWorkerPolicyV1(
        await environment.ASSETS.fetch(request),
      );
    } catch {
      return unavailableCredentialVaultWorkerAssetV1();
    }
  }
  if (!browserPiWorkerAssetPathV1.test(requestUrl.pathname)) {
    return await environment.ASSETS.fetch(request);
  }
  if (!requestUrl.searchParams.has(browserPiEndpointOriginQueryParameterV1)) {
    try {
      return responseWithAgentWorkerPolicyV1(await environment.ASSETS.fetch(request), null);
    } catch {
      return unavailableAgentWorkerAssetV1(null);
    }
  }

  const endpointOrigin = readCanonicalEndpointOriginV1(requestUrl);
  if (endpointOrigin === null) return rejectedAgentWorkerRequestV1();

  requestUrl.search = "";
  requestUrl.hash = "";
  const assetRequest = new Request(requestUrl, request);

  try {
    const response = await environment.ASSETS.fetch(assetRequest);
    return responseWithAgentWorkerPolicyV1(response, endpointOrigin);
  } catch {
    return unavailableAgentWorkerAssetV1(endpointOrigin);
  }
}

export default {
  fetch: handleSillyOsCloudflareRequestV1,
};

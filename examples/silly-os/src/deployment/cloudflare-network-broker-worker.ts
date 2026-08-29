// SPDX-License-Identifier: MIT

import { applyBrowserNetworkBrokerSecurityHeadersV1 } from "./browser-network-broker-security.ts";

export interface SillyOsNetworkBrokerStaticAssetsBindingV1 {
  fetch(request: Request): Promise<Response>;
}

export interface SillyOsNetworkBrokerCloudflareEnvironmentV1 {
  readonly ASSETS: SillyOsNetworkBrokerStaticAssetsBindingV1;
}

function responseWithNetworkBrokerPolicyV1(response: Response): Response {
  const headers = new Headers(response.headers);
  applyBrowserNetworkBrokerSecurityHeadersV1(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function unavailableNetworkBrokerAssetV1(): Response {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
  });
  applyBrowserNetworkBrokerSecurityHeadersV1(headers);
  return new Response("Network Broker asset unavailable.", { status: 502, headers });
}

async function handleSillyOsNetworkBrokerCloudflareRequestV1(
  request: Request,
  environment: SillyOsNetworkBrokerCloudflareEnvironmentV1,
): Promise<Response> {
  try {
    return responseWithNetworkBrokerPolicyV1(await environment.ASSETS.fetch(request));
  } catch {
    return unavailableNetworkBrokerAssetV1();
  }
}

export default { fetch: handleSillyOsNetworkBrokerCloudflareRequestV1 };

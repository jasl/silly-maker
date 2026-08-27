// SPDX-License-Identifier: MIT

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
  return new Response("Invalid Agent Worker endpoint origin.", {
    status: 400,
    headers: {
      "Cache-Control": noStoreV1,
      "Content-Security-Policy": "connect-src 'self'",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function unavailableAgentWorkerAssetV1(endpointOrigin: string): Response {
  return new Response("Agent Worker asset unavailable.", {
    status: 502,
    headers: {
      "Cache-Control": noStoreV1,
      "Content-Security-Policy": `connect-src 'self' ${endpointOrigin}`,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function readCanonicalEndpointOriginV1(requestUrl: URL): string | null {
  const values = requestUrl.searchParams.getAll(browserPiEndpointOriginQueryParameterV1);
  if (requestUrl.searchParams.size !== 1 || values.length !== 1) return null;

  const value = values[0];
  if (value === undefined || value.length === 0 || /[\r\n]/u.test(value)) return null;

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

  const canonicalQuery = new URLSearchParams([
    [browserPiEndpointOriginQueryParameterV1, endpoint.origin],
  ]).toString();
  return requestUrl.search === `?${canonicalQuery}` ? endpoint.origin : null;
}

function responseWithSelectedOriginV1(response: Response, endpointOrigin: string): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", noStoreV1);
  headers.set("Content-Security-Policy", `connect-src 'self' ${endpointOrigin}`);
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
  if (!browserPiWorkerAssetPathV1.test(requestUrl.pathname)) {
    return await environment.ASSETS.fetch(request);
  }
  if (!requestUrl.searchParams.has(browserPiEndpointOriginQueryParameterV1)) {
    return await environment.ASSETS.fetch(request);
  }

  const endpointOrigin = readCanonicalEndpointOriginV1(requestUrl);
  if (endpointOrigin === null) return rejectedAgentWorkerRequestV1();

  requestUrl.search = "";
  requestUrl.hash = "";
  const assetRequest = new Request(requestUrl, request);

  try {
    const response = await environment.ASSETS.fetch(assetRequest);
    return responseWithSelectedOriginV1(response, endpointOrigin);
  } catch {
    return unavailableAgentWorkerAssetV1(endpointOrigin);
  }
}

export default {
  fetch: handleSillyOsCloudflareRequestV1,
};

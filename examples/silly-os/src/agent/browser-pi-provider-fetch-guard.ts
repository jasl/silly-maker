// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

export type BrowserPiProviderFetchV1 = typeof globalThis.fetch;

export interface BrowserPiProviderFetchScopeV1 {
  fetch: BrowserPiProviderFetchV1;
}

function canonicalProviderOriginV1(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" || url.origin !== value || url.pathname !== "/" ||
      url.search.length !== 0 || url.hash.length !== 0 || url.username.length !== 0 ||
      url.password.length !== 0
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function readBrowserPiWorkerEndpointOriginV1(href: string): string | null {
  let workerUrl: URL;
  try {
    workerUrl = new URL(href);
  } catch {
    throw new TypeError("sillyos.browser_pi_provider.worker_url_invalid");
  }
  const candidates = workerUrl.searchParams.getAll("endpoint-origin");
  if (candidates.length === 0) return null;
  if (candidates.length !== 1) {
    throw new TypeError("sillyos.browser_pi_provider.endpoint_origin_ambiguous");
  }
  const endpointOrigin = canonicalProviderOriginV1(candidates[0]);
  if (endpointOrigin === null) {
    throw new TypeError("sillyos.browser_pi_provider.endpoint_origin_invalid");
  }
  return endpointOrigin;
}

export function createBrowserPiProviderFetchGuardV1(input: {
  readonly endpointOrigin: string | null;
  readonly fetch: BrowserPiProviderFetchV1;
}): BrowserPiProviderFetchV1 {
  const endpointOrigin = input.endpointOrigin === null
    ? null
    : canonicalProviderOriginV1(input.endpointOrigin);
  if (input.endpointOrigin !== null && endpointOrigin === null) {
    throw new TypeError("sillyos.browser_pi_provider.endpoint_origin_invalid");
  }

  return async (requestInput, requestInit) => {
    let request: Request;
    try {
      request = new Request(requestInput, {
        ...requestInit,
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        referrer: "",
        referrerPolicy: "no-referrer",
      });
    } catch (error) {
      throw new TypeError("sillyos.browser_pi_provider.request_invalid", { cause: error });
    }
    const url = new URL(request.url);
    if (
      endpointOrigin === null || url.protocol !== "https:" || url.origin !== endpointOrigin ||
      url.username.length !== 0 || url.password.length !== 0
    ) throw new TypeError("sillyos.browser_pi_provider.request_origin_denied");

    const response = await input.fetch(request);
    if (response.redirected || response.status >= 300 && response.status < 400) {
      throw new TypeError("sillyos.browser_pi_provider.redirect_denied");
    }
    if (response.url.length !== 0) {
      let responseUrl: URL;
      try {
        responseUrl = new URL(response.url);
      } catch (error) {
        throw new TypeError("sillyos.browser_pi_provider.response_url_invalid", { cause: error });
      }
      if (responseUrl.origin !== endpointOrigin) {
        throw new TypeError("sillyos.browser_pi_provider.response_origin_denied");
      }
    }
    return response;
  };
}

/** Installs one guard before any pinned Provider module can make a request. */
export function installBrowserPiProviderFetchGuardV1(input: {
  readonly scope: BrowserPiProviderFetchScopeV1;
  readonly endpointOrigin: string | null;
}): BrowserPiProviderFetchV1 {
  if (typeof input.scope.fetch !== "function") {
    throw new TypeError("sillyos.browser_pi_provider.fetch_unavailable");
  }
  const nativeFetch = input.scope.fetch.bind(input.scope) as BrowserPiProviderFetchV1;
  const guardedFetch = createBrowserPiProviderFetchGuardV1({
    endpointOrigin: input.endpointOrigin,
    fetch: nativeFetch,
  });
  try {
    input.scope.fetch = guardedFetch;
  } catch (error) {
    throw new TypeError("sillyos.browser_pi_provider.fetch_guard_unavailable", { cause: error });
  }
  if (input.scope.fetch !== guardedFetch) {
    throw new TypeError("sillyos.browser_pi_provider.fetch_guard_unavailable");
  }
  return guardedFetch;
}

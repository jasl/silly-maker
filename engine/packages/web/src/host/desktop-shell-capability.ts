// SPDX-License-Identifier: MIT

export const desktopShellCapabilityHeaderInternalV1 = "x-sillymaker-shell-capability";

const desktopShellCapabilityPatternInternalV1 = /^[A-Za-z0-9_-]{43}$/u;

export function parseDesktopShellCapabilityInternalV1(value: unknown): string | null {
  return typeof value === "string" && desktopShellCapabilityPatternInternalV1.test(value)
    ? value
    : null;
}

/**
 * Package-internal fetch boundary for Desktop private routes. The capability
 * is captured once during application composition, overrides caller-provided
 * values, and cannot follow a redirect to another origin.
 */
export function createDesktopShellFetchInternalV1(
  capability: string,
  baseFetch: typeof fetch = fetch.bind(globalThis),
): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    headers.set(desktopShellCapabilityHeaderInternalV1, capability);
    return baseFetch(input, {
      ...init,
      headers,
      mode: "same-origin",
      redirect: "error",
    });
  };
}

// SPDX-License-Identifier: MIT

export const browserNetworkUrlMaximumBytesV1 = 8_192;

/**
 * Admits the one model-controlled field accepted by the Browser Network Broker.
 * The returned value is canonical so approval and execution bind the same URL.
 */
export function normalizeBrowserNetworkUrlV1(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (new TextEncoder().encode(value).byteLength > browserNetworkUrlMaximumBytesV1) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
  const normalized = url.href;
  return new TextEncoder().encode(normalized).byteLength <= browserNetworkUrlMaximumBytesV1
    ? normalized
    : null;
}

// SPDX-License-Identifier: MIT

/** Loads one build-known runtime resource from the current GUI origin. @internal */
export async function loadWebRuntimeBytesInternalV1(
  runtimePath: string,
  fetchImpl: typeof fetch = globalThis.fetch,
  failureNamespace = "web.runtime_bytes",
): Promise<Uint8Array> {
  if (
    typeof document === "undefined" ||
    typeof location === "undefined" ||
    typeof fetchImpl !== "function"
  ) {
    throw new TypeError(`${failureNamespace}_loader_unavailable`);
  }
  const runtimeUrl = new URL(runtimePath, document.baseURI);
  if (runtimeUrl.origin !== location.origin) {
    throw new TypeError(`${failureNamespace}_origin_mismatch`);
  }
  const response = await fetchImpl(runtimeUrl);
  if (!response.ok) {
    throw new TypeError(`${failureNamespace}_fetch_failed:${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

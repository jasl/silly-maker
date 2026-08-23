// SPDX-License-Identifier: MIT
import type { TextContentPackDescriptorV1 } from "@sillymaker/base";

/** Loads one build-known content pack from the current GUI origin. @internal */
export async function loadWebTextContentPackBytesInternalV1(
  descriptor: TextContentPackDescriptorV1,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<Uint8Array> {
  if (
    typeof document === "undefined" ||
    typeof location === "undefined" ||
    typeof fetchImpl !== "function"
  ) {
    throw new TypeError("web.text_content_pack_loader_unavailable");
  }
  const runtimeUrl = new URL(descriptor.runtimePath, document.baseURI);
  if (runtimeUrl.origin !== location.origin) {
    throw new TypeError("web.text_content_pack_origin_mismatch");
  }
  const response = await fetchImpl(runtimeUrl);
  if (!response.ok) {
    throw new TypeError(`web.text_content_pack_fetch_failed:${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

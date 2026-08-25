// SPDX-License-Identifier: MIT
import type {
  TextContentPackDescriptorV1,
  TextContentPackVariantDescriptorV1,
} from "@sillymaker/base";

import { loadWebRuntimeBytesInternalV1 } from "./load-web-runtime-bytes.ts";

/** Loads one build-known content pack from the current GUI origin. @internal */
export async function loadWebTextContentPackBytesInternalV1(
  _descriptor: TextContentPackDescriptorV1,
  variant: TextContentPackVariantDescriptorV1,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<Uint8Array> {
  return await loadWebRuntimeBytesInternalV1(
    variant.runtimePath,
    fetchImpl,
    "web.text_content_pack",
  );
}

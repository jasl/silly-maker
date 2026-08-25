// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { defineTextContentManifestV1 } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import { loadWebTextContentPackBytesInternalV1 } from "./load-web-text-content-pack.ts";

const packBytesV1 = Uint8Array.of(0x70, 0x61, 0x63, 0x6b);
const descriptorV1 = defineTextContentManifestV1({
  revision: 1,
  defaultLocale: "en",
  locales: [
    { locale: "en", fallbackLocale: null },
    { locale: "zh-CN", fallbackLocale: "en" },
  ],
  packs: [{
    packId: "text-pack.web.test",
    variants: [
      { locale: "en", runtimePath: "assets/content/test.en.text-pack.json" },
      { locale: "zh-CN", runtimePath: "assets/content/test.zh-CN.text-pack.json" },
    ],
  }],
}).packs[0]!;
const variantV1 = descriptorV1.variants[1]!;

describe("Web text-content pack loader", () => {
  it("loads the descriptor runtime path from the document origin", async () => {
    const fetchImpl = vi.fn(async () => new Response(packBytesV1, { status: 200 }));

    await expect(
      loadWebTextContentPackBytesInternalV1(descriptorV1, variantV1, fetchImpl),
    ).resolves.toEqual(packBytesV1);
    expect(fetchImpl).toHaveBeenCalledExactlyOnceWith(
      new URL(variantV1.runtimePath, document.baseURI),
    );
  });

  it("rejects an unsuccessful response without admitting its body", async () => {
    const fetchImpl = vi.fn(async () => new Response("missing", { status: 404 }));

    await expect(
      loadWebTextContentPackBytesInternalV1(descriptorV1, variantV1, fetchImpl),
    ).rejects.toThrow("web.text_content_pack_fetch_failed:404");
  });

  it("does not follow a cross-origin document base", async () => {
    const base = document.createElement("base");
    base.href = "https://content.example.test/";
    document.head.append(base);
    const fetchImpl = vi.fn(async () => new Response(packBytesV1, { status: 200 }));

    try {
      await expect(
        loadWebTextContentPackBytesInternalV1(descriptorV1, variantV1, fetchImpl),
      ).rejects.toThrow("web.text_content_pack_origin_mismatch");
      expect(fetchImpl).not.toHaveBeenCalled();
    } finally {
      base.remove();
    }
  });
});

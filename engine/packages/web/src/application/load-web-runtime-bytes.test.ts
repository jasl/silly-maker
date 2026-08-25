// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { loadWebRuntimeBytesInternalV1 } from "./load-web-runtime-bytes.ts";

const runtimeBytesV1 = Uint8Array.of(0x72, 0x75, 0x6e, 0x74, 0x69, 0x6d, 0x65);

describe("Web runtime-byte loader", () => {
  it("loads a build-known path from the document origin", async () => {
    const fetchImpl = vi.fn(async () => new Response(runtimeBytesV1, { status: 200 }));

    await expect(
      loadWebRuntimeBytesInternalV1("assets/runtime/unit.json", fetchImpl),
    ).resolves.toEqual(runtimeBytesV1);
    expect(fetchImpl).toHaveBeenCalledExactlyOnceWith(
      new URL("assets/runtime/unit.json", document.baseURI),
    );
  });

  it("rejects a cross-origin runtime path before transport", async () => {
    const fetchImpl = vi.fn(async () => new Response(runtimeBytesV1, { status: 200 }));

    await expect(
      loadWebRuntimeBytesInternalV1("https://content.example.test/unit.json", fetchImpl),
    ).rejects.toThrow("web.runtime_bytes_origin_mismatch");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects an unsuccessful response without reading its body", async () => {
    const fetchImpl = vi.fn(async () => new Response("missing", { status: 404 }));

    await expect(
      loadWebRuntimeBytesInternalV1("assets/runtime/missing.json", fetchImpl),
    ).rejects.toThrow("web.runtime_bytes_fetch_failed:404");
  });
});

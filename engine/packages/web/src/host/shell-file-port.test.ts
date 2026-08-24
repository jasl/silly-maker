// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { parsePositiveSafeInteger, type HostFilePortV1 } from "@sillymaker/base";
import {
  createDesktopShellFetchInternalV1,
  desktopShellCapabilityHeaderInternalV1,
} from "./desktop-shell-capability.ts";
import { createShellFilePortV1 } from "./shell-file-port.ts";

const pickerV1: HostFilePortV1 = {
  selectOne: vi.fn(async () => ({ kind: "cancelled" }) as never),
  download: vi.fn(async () => {
    throw new Error("picker download must not be used");
  }),
};

describe("createShellFilePortV1", () => {
  it("POSTs downloads to the shell endpoint with the encoded filename", async () => {
    const capability = "a".repeat(43);
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ path: "/x" })));
    const port = createShellFilePortV1({
      baseUrl: "/sillymaker/files",
      picker: pickerV1,
      fetchImpl: createDesktopShellFetchInternalV1(
        capability,
        fetchImpl as unknown as typeof fetch,
      ),
    });
    await port.download({
      filename: "存档 备份.json",
      mediaType: "application/json",
      bytes: new TextEncoder().encode("{}"),
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/sillymaker/files/download");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("x-sillymaker-filename")).toBe(encodeURIComponent("存档 备份.json"));
    expect(headers.get(desktopShellCapabilityHeaderInternalV1)).toBe(capability);
    expect(headers.get("content-type")).toBe("application/json");
    expect(new TextDecoder().decode(init.body as Uint8Array)).toBe("{}");
  });

  it("throws on a non-ok shell response", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    const port = createShellFilePortV1({
      baseUrl: "/sillymaker/files",
      picker: pickerV1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(
      port.download({
        filename: "a.json",
        mediaType: "application/json",
        bytes: new Uint8Array(),
      }),
    ).rejects.toThrow("shell download failed (500)");
  });

  it("delegates selectOne to the browser picker", async () => {
    const port = createShellFilePortV1({ baseUrl: "/f", picker: pickerV1 });
    const result = await port.selectOne({
      acceptedMediaTypes: ["application/json"],
      maximumBytes: parsePositiveSafeInteger(1024),
    });
    expect(result).toEqual({ kind: "cancelled" });
    expect(pickerV1.selectOne).toHaveBeenCalledTimes(1);
  });
});

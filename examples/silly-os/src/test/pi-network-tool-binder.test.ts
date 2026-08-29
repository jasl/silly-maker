// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  createPiDownloadToolV1,
  piDownloadToolNameV1,
  type PiDownloadResultV1,
} from "../agent/pi-network-tool-binder.ts";

describe("SillyOS fixed Pi network tools", () => {
  it("defaults download overwrite to false and returns only the final Workspace receipt", async () => {
    const result: PiDownloadResultV1 = {
      status: 200,
      contentType: "application/zip",
      bytes: 1_024,
      destination: "/workspace/assets/archive.zip",
      generation: 7,
    };
    const execute = vi.fn(() => Promise.resolve(result));
    const tool = createPiDownloadToolV1({ execute });

    await expect(tool.execute("tool.download.1", {
      url: "https://assets.example.test/archive.zip",
      destination: "/workspace/assets/archive.zip",
    })).resolves.toEqual({
      content: [{
        type: "text",
        text: "Downloaded 1024 bytes to /workspace/assets/archive.zip.",
      }],
      details: result,
    });
    expect(tool.name).toBe(piDownloadToolNameV1);
    expect(tool.executionMode).toBe("sequential");
    expect(execute).toHaveBeenCalledWith("tool.download.1", {
      url: "https://assets.example.test/archive.zip",
      destination: "/workspace/assets/archive.zip",
      overwrite: false,
    }, undefined);
  });

  it("forwards explicit overwrite and cancellation without adding request authority", async () => {
    const abort = new AbortController();
    const execute = vi.fn(() =>
      Promise.resolve({
        status: 200,
        contentType: null,
        bytes: 0,
        destination: "/workspace/empty.bin",
        generation: 2,
      })
    );
    const tool = createPiDownloadToolV1({ execute });

    await tool.execute("tool.download.2", {
      url: "https://assets.example.test/empty.bin",
      destination: "/workspace/empty.bin",
      overwrite: true,
    }, abort.signal);
    expect(execute).toHaveBeenCalledWith("tool.download.2", {
      url: "https://assets.example.test/empty.bin",
      destination: "/workspace/empty.bin",
      overwrite: true,
    }, abort.signal);
    expect(tool.parameters).toMatchObject({
      additionalProperties: false,
      required: ["url", "destination"],
      properties: {
        url: { type: "string" },
        destination: { type: "string" },
        overwrite: { type: "boolean" },
      },
    });
  });
});

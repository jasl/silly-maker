// SPDX-License-Identifier: MIT
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  handleFileDownloadRequestV1,
  sanitizeDownloadFilenameV1,
} from "./file-download-handler.mts";

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "sillymaker-downloads-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function downloadRequestV1(filename: string, body: string): Request {
  return new Request("http://shell/sillymaker/files/download", {
    method: "POST",
    headers: { "x-sillymaker-filename": encodeURIComponent(filename) },
    body,
  });
}

describe("sanitizeDownloadFilenameV1", () => {
  it("keeps plain and CJK names, strips traversal and reserved characters", () => {
    expect(sanitizeDownloadFilenameV1("session-export.json")).toBe("session-export.json");
    expect(sanitizeDownloadFilenameV1("存档 备份.json")).toBe("存档 备份.json");
    expect(sanitizeDownloadFilenameV1("../../etc/passwd")).toBe("passwd");
    expect(sanitizeDownloadFilenameV1("..\\..\\etc\\passwd")).toBe("passwd");
    expect(sanitizeDownloadFilenameV1('a<b>:"c"|d?*.json')).toBe("abcd.json");
    expect(sanitizeDownloadFilenameV1("  ")).toBeNull();
    expect(sanitizeDownloadFilenameV1("..")).toBeNull();
  });

  it("rejects Windows device names and ignored trailing dots and spaces", () => {
    expect(sanitizeDownloadFilenameV1("CON")).toBeNull();
    expect(sanitizeDownloadFilenameV1("con.json")).toBeNull();
    expect(sanitizeDownloadFilenameV1("LPT9.backup")).toBeNull();
    expect(sanitizeDownloadFilenameV1("COM¹.txt")).toBeNull();
    expect(sanitizeDownloadFilenameV1("lpt³")).toBeNull();
    expect(sanitizeDownloadFilenameV1("save.json.  ")).toBeNull();
    expect(sanitizeDownloadFilenameV1("save.json ")).toBeNull();
    expect(sanitizeDownloadFilenameV1("...  ")).toBeNull();
  });

  it("bounds filenames by UTF-8 bytes without splitting code points and preserves extensions", () => {
    const sanitized = sanitizeDownloadFilenameV1(`${"a".repeat(179)}😀`);
    expect(sanitized).toBe("a".repeat(179));
    expect(sanitized?.includes("\uFFFD")).toBe(false);

    const cjk = sanitizeDownloadFilenameV1(`${"存".repeat(100)}.json`);
    expect(cjk?.endsWith(".json")).toBe(true);
    expect(cjk?.includes("\uFFFD")).toBe(false);
    if (cjk === null) throw new Error("expected a bounded filename");
    expect(new TextEncoder().encode(cjk).byteLength).toBeLessThanOrEqual(240);
  });
});

describe("handleFileDownloadRequestV1", () => {
  it("writes the payload into the downloads directory", async () => {
    const response = await handleFileDownloadRequestV1(
      downloadRequestV1("save.json", '{"a":1}'),
      "/download",
      dir,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { filename: string; path?: string };
    expect(body).toEqual({ filename: "save.json" });
    expect(body.path).toBeUndefined();
    expect(await readFile(join(dir, body.filename), "utf8")).toBe('{"a":1}');
  });

  it("suffixes colliding filenames instead of overwriting", async () => {
    const first = await handleFileDownloadRequestV1(
      downloadRequestV1("save.json", "one"),
      "/download",
      dir,
    );
    const second = await handleFileDownloadRequestV1(
      downloadRequestV1("save.json", "two"),
      "/download",
      dir,
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const secondFilename = ((await second.json()) as { filename: string }).filename;
    expect(secondFilename).toBe("save (1).json");
    expect(await readFile(join(dir, "save.json"), "utf8")).toBe("one");
    expect(await readFile(join(dir, secondFilename), "utf8")).toBe("two");
  });

  it("rejects traversal-only and empty filenames", async () => {
    const response = await handleFileDownloadRequestV1(
      downloadRequestV1("..", "x"),
      "/download",
      dir,
    );
    expect(response.status).toBe(400);
  });

  it("rejects non-POST methods and unknown sub-paths", async () => {
    const get = await handleFileDownloadRequestV1(
      new Request("http://shell/sillymaker/files/download"),
      "/download",
      dir,
    );
    expect(get.status).toBe(405);
    const wrong = await handleFileDownloadRequestV1(
      downloadRequestV1("save.json", "x"),
      "/other",
      dir,
    );
    expect(wrong.status).toBe(404);
  });

  it("rejects an oversized Content-Length without consuming the body", async () => {
    let pulls = 0;
    const request = new Request("http://shell/sillymaker/files/download", {
      method: "POST",
      headers: {
        "content-length": "6",
        "x-sillymaker-filename": encodeURIComponent("save.json"),
      },
      body: new ReadableStream<Uint8Array>(
        {
          pull(controller) {
            pulls += 1;
            controller.enqueue(new Uint8Array([1, 2, 3, 4, 5, 6]));
            controller.close();
          },
        },
        { highWaterMark: 0 },
      ),
    });
    const pullsBeforeHandling = pulls;

    const response = await handleFileDownloadRequestV1(request, "/download", dir, {
      maxDownloadBytes: 5,
    });

    expect(response.status).toBe(413);
    expect(pulls).toBe(pullsBeforeHandling);
    expect(await readdir(dir)).toEqual([]);
  });

  it("streams unknown-length bodies and enforces the byte limit", async () => {
    const request = new Request("http://shell/sillymaker/files/download", {
      method: "POST",
      headers: { "x-sillymaker-filename": encodeURIComponent("save.json") },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.enqueue(new Uint8Array([4, 5, 6]));
          controller.close();
        },
      }),
    });
    Object.defineProperty(request, "arrayBuffer", {
      value: () => {
        throw new Error("arrayBuffer must not be used");
      },
    });

    const response = await handleFileDownloadRequestV1(request, "/download", dir, {
      maxDownloadBytes: 5,
    });

    expect(response.status).toBe(413);
    expect(await readdir(dir)).toEqual([]);
  });

  it("never publishes a partial final file when the request stream fails", async () => {
    let pulls = 0;
    const request = new Request("http://shell/sillymaker/files/download", {
      method: "POST",
      headers: { "x-sillymaker-filename": encodeURIComponent("save.json") },
      body: new ReadableStream<Uint8Array>(
        {
          pull(controller) {
            pulls += 1;
            if (pulls === 1) {
              controller.enqueue(new TextEncoder().encode("partial"));
            } else {
              controller.error(new Error("injected read failure after one chunk"));
            }
          },
        },
        { highWaterMark: 0 },
      ),
    });

    const response = await handleFileDownloadRequestV1(request, "/download", dir);

    expect(response.status).toBe(500);
    expect(pulls).toBe(2);
    expect(await readdir(dir)).toEqual([]);
  });
});

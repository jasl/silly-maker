// SPDX-License-Identifier: MIT
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
    expect(sanitizeDownloadFilenameV1("external-mv-save.json")).toBe("external-mv-save.json");
    expect(sanitizeDownloadFilenameV1("存档 备份.json")).toBe("存档 备份.json");
    expect(sanitizeDownloadFilenameV1("../../etc/passwd")).toBe("passwd");
    expect(sanitizeDownloadFilenameV1('a<b>:"c"|d?*.json')).toBe("abcd.json");
    expect(sanitizeDownloadFilenameV1("  ")).toBeNull();
    expect(sanitizeDownloadFilenameV1("..")).toBeNull();
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
    const body = (await response.json()) as { path: string };
    expect(body.path).toBe(join(dir, "save.json"));
    expect(await readFile(body.path, "utf8")).toBe('{"a":1}');
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
    const secondPath = ((await second.json()) as { path: string }).path;
    expect(secondPath).toBe(join(dir, "save (1).json"));
    expect(await readFile(join(dir, "save.json"), "utf8")).toBe("one");
    expect(await readFile(secondPath, "utf8")).toBe("two");
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
});

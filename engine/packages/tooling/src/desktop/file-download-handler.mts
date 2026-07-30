// SPDX-License-Identifier: MIT
import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

/**
 * Desktop shell download endpoint: the embedded webview does not honor
 * `<a download>` clicks, so the page POSTs the file bytes here and the shell
 * writes them into the platform Downloads folder. Filenames are sanitized to
 * a single path segment and collisions get a ` (n)` suffix; each candidate is
 * written with the exclusive `wx` flag so a race never overwrites a file.
 */
export const desktopFilesPathPrefixV1 = "/sillymaker/files";

/** Local single-user shell; the cap only guards against runaway payloads. */
const maxDownloadBytesV1 = 256 * 1024 * 1024;

const maxFilenameLengthV1 = 180;
const collisionLimitV1 = 1_000;

/** One safe path segment (keeps CJK; strips control/path/reserved chars). */
export function sanitizeDownloadFilenameV1(raw: string): string | null {
  const reserved = '/\\:*?"<>|';
  let kept = "";
  for (const character of basename(raw.trim())) {
    const code = character.codePointAt(0) ?? 0;
    if (code >= 0x20 && code !== 0x7f && !reserved.includes(character)) kept += character;
  }
  const cleaned = kept.trim();
  if (cleaned === "" || cleaned === "." || cleaned === "..") return null;
  return cleaned.slice(0, maxFilenameLengthV1);
}

function isErrnoV1(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

function jsonResponseV1(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function handleFileDownloadRequestV1(
  request: Request,
  subPath: string,
  downloadsDir: string,
): Promise<Response> {
  if (subPath !== "/download") return new Response("not found", { status: 404 });
  if (request.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: { allow: "POST" } });
  }
  let rawFilename: string;
  try {
    rawFilename = decodeURIComponent(request.headers.get("x-sillymaker-filename") ?? "");
  } catch {
    return jsonResponseV1(400, { error: "invalid filename encoding" });
  }
  const filename = sanitizeDownloadFilenameV1(rawFilename);
  if (filename === null) return jsonResponseV1(400, { error: "invalid filename" });

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > maxDownloadBytesV1) {
    return jsonResponseV1(413, { error: "payload too large" });
  }

  await mkdir(downloadsDir, { recursive: true });
  const extension = extname(filename);
  const stem = filename.slice(0, filename.length - extension.length);
  for (let attempt = 0; attempt < collisionLimitV1; attempt += 1) {
    const candidate = attempt === 0 ? filename : `${stem} (${String(attempt)})${extension}`;
    const path = join(downloadsDir, candidate);
    try {
      await writeFile(path, bytes, { flag: "wx" });
      return jsonResponseV1(200, { path });
    } catch (error) {
      if (isErrnoV1(error, "EEXIST")) continue;
      return jsonResponseV1(500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return jsonResponseV1(500, { error: "no available filename" });
}

// SPDX-License-Identifier: MIT
import { randomUUID } from "node:crypto";
import { link, mkdir, open, unlink } from "node:fs/promises";
import { extname, join } from "node:path";

type FileHandleV1 = Awaited<ReturnType<typeof open>>;

/**
 * Desktop shell download endpoint: the embedded webview does not honor
 * `<a download>` clicks, so the page POSTs the file bytes here and the shell
 * writes them into the platform Downloads folder. Filenames are sanitized to
 * a portable path segment and collisions get a ` (n)` suffix. The request is
 * streamed into an exclusive same-directory temporary file, synced, and only
 * then atomically linked to an unused final name.
 */
export const desktopFilesPathPrefixV1 = "/sillymaker/files";

/** Local single-user shell; the cap only guards against runaway payloads. */
const maxDownloadBytesV1 = 256 * 1024 * 1024;

const maxFilenameUtf16UnitsV1 = 180;
const maxFilenameUtf8BytesV1 = 240;
const collisionLimitV1 = 1_000;
const temporaryFileAttemptLimitV1 = 10;
const windowsDeviceNameV1 = /^(?:con|prn|aux|nul|com(?:[1-9]|[¹²³])|lpt(?:[1-9]|[¹²³]))(?:\.|$)/iu;
const utf8EncoderV1 = new TextEncoder();

export interface FileDownloadHandlerOptionsV1 {
  /** Package-internal test injection; production uses the fixed 256 MiB cap. */
  readonly maxDownloadBytes?: number;
}

function measureFilenameV1(value: string): {
  readonly utf16Units: number;
  readonly utf8Bytes: number;
} {
  return {
    utf16Units: value.length,
    utf8Bytes: utf8EncoderV1.encode(value).byteLength,
  };
}

function truncateFilenameV1(value: string, maxUtf16Units: number, maxUtf8Bytes: number): string {
  let bounded = "";
  let utf16Units = 0;
  let utf8Bytes = 0;
  for (const character of value) {
    const nextUtf16Units = utf16Units + character.length;
    const nextUtf8Bytes = utf8Bytes + utf8EncoderV1.encode(character).byteLength;
    if (nextUtf16Units > maxUtf16Units || nextUtf8Bytes > maxUtf8Bytes) break;
    bounded += character;
    utf16Units = nextUtf16Units;
    utf8Bytes = nextUtf8Bytes;
  }
  return bounded;
}

function boundFilenameV1(value: string): string | null {
  const measured = measureFilenameV1(value);
  if (
    measured.utf16Units <= maxFilenameUtf16UnitsV1 &&
    measured.utf8Bytes <= maxFilenameUtf8BytesV1
  ) {
    return value;
  }

  const extension = extname(value);
  if (extension !== "") {
    const extensionSize = measureFilenameV1(extension);
    const stem = value.slice(0, value.length - extension.length);
    const boundedStem = truncateFilenameV1(
      stem,
      maxFilenameUtf16UnitsV1 - extensionSize.utf16Units,
      maxFilenameUtf8BytesV1 - extensionSize.utf8Bytes,
    );
    if (boundedStem !== "") return `${boundedStem}${extension}`;
  }

  const bounded = truncateFilenameV1(
    value,
    maxFilenameUtf16UnitsV1,
    maxFilenameUtf8BytesV1,
  ).replace(/[. ]+$/u, "");
  return bounded === "" ? null : bounded;
}

/** One portable path segment (keeps CJK; strips control/path/reserved chars). */
export function sanitizeDownloadFilenameV1(raw: string): string | null {
  const reserved = '/\\:*?"<>|';
  const rawSegments = raw.split(/[\\/]/u);
  const rawSegment = rawSegments.at(-1) ?? "";
  let kept = "";
  for (const character of rawSegment) {
    const code = character.codePointAt(0) ?? 0;
    if (code >= 0x20 && code !== 0x7f && !reserved.includes(character)) kept += character;
  }
  const cleaned = kept.trimStart();
  if (cleaned === "" || cleaned === "." || cleaned === "..") return null;
  if (/[. ]$/u.test(cleaned)) return null;
  if (windowsDeviceNameV1.test(cleaned)) return null;

  const bounded = boundFilenameV1(cleaned);
  if (bounded === null || windowsDeviceNameV1.test(bounded)) return null;
  return bounded;
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

function resolveMaxDownloadBytesV1(options: FileDownloadHandlerOptionsV1 | undefined): number {
  const configured = options?.maxDownloadBytes ?? maxDownloadBytesV1;
  if (!Number.isSafeInteger(configured) || configured < 0) {
    throw new TypeError("maxDownloadBytes must be a non-negative safe integer");
  }
  return configured;
}

function contentLengthV1(request: Request): number | null | "invalid" {
  const header = request.headers.get("content-length");
  if (header === null) return null;
  if (!/^(?:0|[1-9][0-9]*)$/u.test(header)) return "invalid";
  const length = Number(header);
  return Number.isSafeInteger(length) ? length : "invalid";
}

async function writeEntireChunkV1(handle: FileHandleV1, chunk: Uint8Array): Promise<void> {
  let offset = 0;
  while (offset < chunk.byteLength) {
    const { bytesWritten } = await handle.write(chunk, offset, chunk.byteLength - offset, null);
    if (bytesWritten === 0) throw new Error("temporary download write made no progress");
    offset += bytesWritten;
  }
}

async function streamRequestBodyV1(
  request: Request,
  handle: FileHandleV1,
  maxBytes: number,
): Promise<"complete" | "too-large"> {
  if (request.body === null) return "complete";
  const reader = request.body.getReader();
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return "complete";
      if (value.byteLength > maxBytes - received) {
        try {
          await reader.cancel("payload too large");
        } catch {
          // The size rejection remains authoritative even if cancellation fails.
        }
        return "too-large";
      }
      await writeEntireChunkV1(handle, value);
      received += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
}

async function openTemporaryDownloadV1(
  downloadsDir: string,
): Promise<{ readonly handle: FileHandleV1; readonly path: string }> {
  for (let attempt = 0; attempt < temporaryFileAttemptLimitV1; attempt += 1) {
    const path = join(downloadsDir, `.sillymaker-download-${randomUUID()}.tmp`);
    try {
      return { handle: await open(path, "wx", 0o600), path };
    } catch (error) {
      if (isErrnoV1(error, "EEXIST")) continue;
      throw error;
    }
  }
  throw new Error("could not allocate temporary download file");
}

async function publishTemporaryDownloadV1(
  temporaryPath: string,
  downloadsDir: string,
  filename: string,
): Promise<string> {
  const extension = extname(filename);
  const stem = filename.slice(0, filename.length - extension.length);
  for (let attempt = 0; attempt < collisionLimitV1; attempt += 1) {
    const candidate = attempt === 0 ? filename : `${stem} (${String(attempt)})${extension}`;
    try {
      await link(temporaryPath, join(downloadsDir, candidate));
      return candidate;
    } catch (error) {
      if (isErrnoV1(error, "EEXIST")) continue;
      throw error;
    }
  }
  throw new Error("no available filename");
}

async function syncDirectoryIfSupportedV1(directory: string): Promise<void> {
  try {
    const handle = await open(directory, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch {
    // Some supported hosts do not permit opening or syncing a directory.
  }
}

async function removeTemporaryFileV1(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if (!isErrnoV1(error, "ENOENT")) throw error;
  }
}

async function storeDownloadV1(
  request: Request,
  downloadsDir: string,
  filename: string,
  maxDownloadBytes: number,
): Promise<
  { readonly kind: "stored"; readonly filename: string } | { readonly kind: "too-large" }
> {
  const temporary = await openTemporaryDownloadV1(downloadsDir);
  let handleOpen = true;
  let temporaryExists = true;
  try {
    const streamResult = await streamRequestBodyV1(request, temporary.handle, maxDownloadBytes);
    if (streamResult === "too-large") return { kind: "too-large" };

    await temporary.handle.sync();
    await temporary.handle.close();
    handleOpen = false;

    const publishedFilename = await publishTemporaryDownloadV1(
      temporary.path,
      downloadsDir,
      filename,
    );
    try {
      await removeTemporaryFileV1(temporary.path);
      temporaryExists = false;
    } catch {
      // The final hard link is complete; the finally block retries temp cleanup.
    }
    await syncDirectoryIfSupportedV1(downloadsDir);
    return { kind: "stored", filename: publishedFilename };
  } finally {
    if (handleOpen) {
      try {
        await temporary.handle.close();
      } catch {
        // Cleanup continues with unlink even if close reports an error.
      }
    }
    if (temporaryExists) {
      try {
        await removeTemporaryFileV1(temporary.path);
      } catch {
        // Best effort after the primary operation has already failed.
      }
    }
  }
}

export async function handleFileDownloadRequestV1(
  request: Request,
  subPath: string,
  downloadsDir: string,
  options?: FileDownloadHandlerOptionsV1,
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

  const maxDownloadBytes = resolveMaxDownloadBytesV1(options);
  const declaredLength = contentLengthV1(request);
  if (declaredLength === "invalid") {
    return jsonResponseV1(400, { error: "invalid content length" });
  }
  if (declaredLength !== null && declaredLength > maxDownloadBytes) {
    return jsonResponseV1(413, { error: "payload too large" });
  }

  try {
    await mkdir(downloadsDir, { recursive: true });
    const storeResult = await storeDownloadV1(request, downloadsDir, filename, maxDownloadBytes);
    if (storeResult.kind === "too-large") {
      return jsonResponseV1(413, { error: "payload too large" });
    }
    return jsonResponseV1(200, { filename: storeResult.filename });
  } catch {
    return jsonResponseV1(500, { error: "download failed" });
  }
}

// SPDX-License-Identifier: MIT
import type {
  StoredWireRecordV1,
  WireCommitResultV1,
  WireMutationV1,
} from "./record-file-store.mts";
import { parseWireMutationsV1 } from "./record-file-store.mts";

export interface RecordHttpStoreV1 {
  read(namespace: string, key: string): Promise<StoredWireRecordV1 | null>;
  list(namespace: string): Promise<readonly StoredWireRecordV1[]>;
  commit(mutations: readonly WireMutationV1[]): Promise<WireCommitResultV1>;
}

const namespacesV1 = new Set(["save", "lease", "settings"]);
const maximumCommitBodyBytesV1 = 32 * 1024 * 1024;

function jsonResponseV1(
  payload: unknown,
  status = 200,
  extraHeaders?: Readonly<Record<string, string>>,
): Response {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(payload), { status, headers });
}

function requestOriginIsAllowedV1(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}

function decodePathSegmentsV1(path: string): readonly string[] | null {
  if (path === "") return [];
  if (!path.startsWith("/") || path.includes("\0") || path.includes("\\")) return null;
  const encoded = path.slice(1);
  if (encoded === "" || encoded.includes("//")) return null;
  try {
    return encoded.split("/").map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
}

function isRecordNamespaceV1(value: string): boolean {
  return namespacesV1.has(value);
}

async function readRequestBodyV1(request: Request): Promise<string | null> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsed = Number(declaredLength);
    if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
    if (parsed > maximumCommitBodyBytesV1) throw new RangeError("request body too large");
  }
  if (request.body === null) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      byteLength += chunk.value.byteLength;
      if (byteLength > maximumCommitBodyBytesV1) {
        await reader.cancel("request body too large").catch(() => undefined);
        throw new RangeError("request body too large");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function parseCommitBodyV1(value: unknown): readonly WireMutationV1[] {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("invalid commit body");
  }
  return parseWireMutationsV1((value as { readonly mutations?: unknown }).mutations);
}

/**
 * Handles the private records endpoint shared by the development save server
 * and the packaged desktop shell. It rejects cross-site browser requests,
 * non-JSON writes, oversized bodies, malformed URL encoding, and malformed
 * wire values before the file store is touched.
 */
export async function handleRecordHttpRequestV1(
  request: Request,
  path: string,
  store: RecordHttpStoreV1,
): Promise<Response> {
  const segments = decodePathSegmentsV1(path);
  if (segments === null) return jsonResponseV1({ error: "bad request" }, 400);

  if (request.method === "GET" && segments.length === 0) {
    return jsonResponseV1({ ok: true });
  }

  if (request.method === "POST" && segments.length === 1 && segments[0] === "commit") {
    if (!requestOriginIsAllowedV1(request)) {
      return jsonResponseV1({ error: "forbidden" }, 403);
    }
    const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (mediaType !== "application/json") {
      return jsonResponseV1({ error: "application/json required" }, 415);
    }

    let text: string | null;
    try {
      text = await readRequestBodyV1(request);
    } catch (error) {
      if (error instanceof RangeError) {
        return jsonResponseV1({ error: "request body too large" }, 413);
      }
      throw error;
    }
    if (text === null) return jsonResponseV1({ error: "invalid request body" }, 400);

    let mutations: readonly WireMutationV1[];
    try {
      const body = JSON.parse(text) as unknown;
      mutations = parseCommitBodyV1(body);
    } catch {
      return jsonResponseV1({ error: "invalid mutations" }, 400);
    }
    return jsonResponseV1(await store.commit(mutations));
  }

  if (request.method === "GET" && segments.length === 1) {
    const namespace = segments[0] ?? "";
    if (!isRecordNamespaceV1(namespace)) {
      return jsonResponseV1({ error: "bad request" }, 400);
    }
    return jsonResponseV1({ records: await store.list(namespace) });
  }

  if (request.method === "GET" && segments.length === 2) {
    const namespace = segments[0] ?? "";
    const key = segments[1] ?? "";
    if (!isRecordNamespaceV1(namespace) || key.includes("\0")) {
      return jsonResponseV1({ error: "bad request" }, 400);
    }
    const record = await store.read(namespace, key);
    return record === null ? jsonResponseV1({ error: "not found" }, 404) : jsonResponseV1(record);
  }

  return jsonResponseV1({ error: "unsupported" }, 405, { allow: "GET, POST" });
}

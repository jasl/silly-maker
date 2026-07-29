// SPDX-License-Identifier: MIT
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import process from "node:process";

import { createRecordFileStoreV1 } from "../../engine/packages/tooling/src/desktop/record-file-store.mts";
import type { WireMutationV1 } from "../../engine/packages/tooling/src/desktop/record-file-store.mts";

// The script runs under Deno; tsc checks it without Deno lib types.
declare const Deno: {
  serve(
    options: { readonly hostname: string; readonly port: number },
    handler: (request: Request) => Response | Promise<Response>,
  ): unknown;
};

/**
 * The desktop save server: serves a built Player bundle from a fixed local
 * port and owns a save directory behind the /sillymaker/records API (the
 * page connects through createHttpHostRecordStoreV1 when started with
 * `?records=local`). A fixed port keeps one stable origin, so browser-side
 * storage assumptions and the local save directory agree run after run.
 *
 * Usage:
 *   deno run -A scripts/desktop/save-server.mts \
 *     --dist examples/cat-cafe/dist-web --saves ./saves --port 41800
 */

function argValueV1(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value === undefined ? fallback : value;
}

const distDir = normalize(argValueV1("dist", "examples/cat-cafe/dist-web"));
const savesDir = normalize(argValueV1("saves", "./saves"));
const port = Number(argValueV1("port", "41800"));
const store = createRecordFileStoreV1(savesDir);

const mediaTypesV1: Readonly<Record<string, string>> = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
});

function jsonResponseV1(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function handleRecordsV1(request: Request, path: string): Promise<Response> {
  const segments = path.split("/").filter((segment) => segment !== "");
  if (request.method === "GET" && segments.length === 0) {
    return jsonResponseV1({ ok: true });
  }
  if (request.method === "POST" && segments.length === 1 && segments[0] === "commit") {
    const body = (await request.json()) as { readonly mutations?: readonly WireMutationV1[] };
    if (!Array.isArray(body.mutations) || body.mutations.length === 0) {
      return jsonResponseV1({ error: "invalid mutations" }, 400);
    }
    return jsonResponseV1(await store.commit(body.mutations));
  }
  if (request.method === "GET" && segments.length === 1) {
    const namespace = decodeURIComponent(segments[0] ?? "");
    return jsonResponseV1({ records: await store.list(namespace) });
  }
  if (request.method === "GET" && segments.length === 2) {
    const namespace = decodeURIComponent(segments[0] ?? "");
    const key = decodeURIComponent(segments[1] ?? "");
    const record = await store.read(namespace, key);
    return record === null ? jsonResponseV1({ error: "not found" }, 404) : jsonResponseV1(record);
  }
  return jsonResponseV1({ error: "unsupported" }, 405);
}

async function handleStaticV1(pathname: string): Promise<Response> {
  const relative = pathname === "/" ? "/index.html" : pathname;
  const path = normalize(join(distDir, `.${relative}`));
  if (!path.startsWith(normalize(distDir))) return new Response("forbidden", { status: 403 });
  try {
    const info = await stat(path);
    const filePath = info.isDirectory() ? join(path, "index.html") : path;
    const bytes = await readFile(filePath);
    const mediaType = mediaTypesV1[extname(filePath)] ?? "application/octet-stream";
    return new Response(new Uint8Array(bytes), { headers: { "content-type": mediaType } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}

Deno.serve({ hostname: "127.0.0.1", port }, async (request) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/sillymaker/records")) {
    return handleRecordsV1(request, url.pathname.slice("/sillymaker/records".length));
  }
  return handleStaticV1(url.pathname);
});

console.log(
  JSON.stringify({
    ok: true,
    url: `http://127.0.0.1:${String(port)}/?records=local`,
    dist: distDir,
    saves: savesDir,
  }),
);

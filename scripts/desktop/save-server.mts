// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";
import { extname, normalize } from "node:path";
import process from "node:process";

import { createRecordFileStoreV1 } from "../../engine/packages/tooling/src/desktop/record-file-store.mts";
import { handleRecordHttpRequestV1 } from "../../engine/packages/tooling/src/desktop/record-http-handler.mts";
import { resolveStaticFilePathV1 } from "../../engine/packages/tooling/src/desktop/static-file-path.mts";

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

const mediaTypesV1: Readonly<Record<string, string>> = {
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
};

async function handleStaticV1(request: Request, pathname: string): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("method not allowed", {
      status: 405,
      headers: { allow: "GET, HEAD" },
    });
  }
  const resolution = await resolveStaticFilePathV1(distDir, pathname);
  if (resolution.kind !== "file") {
    return new Response("not found", {
      status: resolution.kind === "bad_request" ? 400 : 404,
    });
  }
  try {
    const filePath = resolution.filePath;
    const bytes = await readFile(filePath);
    const mediaType = mediaTypesV1[extname(filePath).toLowerCase()] ?? "application/octet-stream";
    return new Response(request.method === "HEAD" ? null : new Uint8Array(bytes), {
      headers: {
        "content-type": mediaType,
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}

Deno.serve({ hostname: "127.0.0.1", port }, async (request) => {
  const url = new URL(request.url);
  if (url.pathname === "/sillymaker/records" || url.pathname.startsWith("/sillymaker/records/")) {
    return handleRecordHttpRequestV1(
      request,
      url.pathname.slice("/sillymaker/records".length),
      store,
    );
  }
  return handleStaticV1(request, url.pathname);
});

console.log(
  JSON.stringify({
    ok: true,
    url: `http://127.0.0.1:${String(port)}/?records=local`,
    dist: distDir,
    saves: savesDir,
  }),
);

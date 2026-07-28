// SPDX-License-Identifier: MIT
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

import { createRecordFileStoreV1 } from "./record-file-store.mts";
import type { WireMutationV1 } from "./record-file-store.mts";

/**
 * The desktop webview shell. `deno desktop` compiles this entry: the
 * runtime opens a window pointed at whatever `Deno.serve` binds, so the
 * shell serves the prebuilt Player bundle itself and owns the records API
 * over a real save directory in the platform's user-data location.
 * Ports may vary per launch — persistence lives in files, not in
 * per-origin browser storage, so origin drift is harmless by design.
 *
 * Staged copies replace the two placeholders below; running the file
 * directly from scripts/ also works for local verification:
 *   deno run -A scripts/desktop/shell-main.ts --dist dist/<app> --id dev.local.app
 */

declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
  env: { get(name: string): string | undefined };
  build: { os: string };
  args: string[];
};

const appIdentifierV1 = "__SILLYMAKER_APP_IDENTIFIER__";
const distDirNameV1 = "__SILLYMAKER_DIST_DIR__";

function argValueV1(name: string, fallback: string): string {
  const index = Deno.args.indexOf(`--${name}`);
  const value = index >= 0 ? Deno.args[index + 1] : undefined;
  return value === undefined ? fallback : value;
}

const identifier = appIdentifierV1.startsWith("__SILLYMAKER_")
  ? argValueV1("id", "dev.sillymaker.shell")
  : appIdentifierV1;
const distDir = normalize(
  distDirNameV1.startsWith("__SILLYMAKER_")
    ? argValueV1("dist", "dist")
    : join(import.meta.dirname ?? ".", distDirNameV1),
);

function userDataDirV1(): string {
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".";
  if (Deno.build.os === "darwin") {
    return join(home, "Library", "Application Support", identifier);
  }
  if (Deno.build.os === "windows") {
    return join(Deno.env.get("APPDATA") ?? home, identifier);
  }
  return join(Deno.env.get("XDG_DATA_HOME") ?? join(home, ".local", "share"), identifier);
}

const savesDir = join(userDataDirV1(), "saves");
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

const recordsMarkerV1 = '<script>globalThis.__SILLYMAKER_RECORDS__ = "local";</script>';

function jsonResponseV1(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function handleRecordsV1(request: Request, path: string): Promise<Response> {
  const segments = path.split("/").filter((segment) => segment !== "");
  if (request.method === "GET" && segments.length === 0) return jsonResponseV1({ ok: true });
  if (request.method === "POST" && segments.length === 1 && segments[0] === "commit") {
    const body = (await request.json()) as { readonly mutations?: readonly WireMutationV1[] };
    if (!Array.isArray(body.mutations) || body.mutations.length === 0) {
      return jsonResponseV1({ error: "invalid mutations" }, 400);
    }
    return jsonResponseV1(await store.commit(body.mutations));
  }
  if (request.method === "GET" && segments.length === 1) {
    return jsonResponseV1({ records: await store.list(decodeURIComponent(segments[0] ?? "")) });
  }
  if (request.method === "GET" && segments.length === 2) {
    const record = await store.read(
      decodeURIComponent(segments[0] ?? ""),
      decodeURIComponent(segments[1] ?? ""),
    );
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
    if (mediaType.startsWith("text/html")) {
      // The desktop shell marks its pages so the engine selects the HTTP
      // record store without needing a query parameter on the window URL.
      const html = new TextDecoder().decode(bytes).replace("<head>", `<head>${recordsMarkerV1}`);
      return new Response(html, { headers: { "content-type": mediaType } });
    }
    return new Response(new Uint8Array(bytes), { headers: { "content-type": mediaType } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}

Deno.serve((request: Request) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/sillymaker/records")) {
    return handleRecordsV1(request, url.pathname.slice("/sillymaker/records".length));
  }
  return handleStaticV1(url.pathname);
});

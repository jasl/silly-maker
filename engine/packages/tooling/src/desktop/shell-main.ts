// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

import { injectDesktopRecordsMarkerV1 } from "./desktop-html.mts";
import { desktopFilesPathPrefixV1, handleFileDownloadRequestV1 } from "./file-download-handler.mts";
import { createRecordFileStoreV1 } from "./record-file-store.mts";
import { handleRecordHttpRequestV1 } from "./record-http-handler.mts";
import {
  adoptShellWindowV1,
  createShellShutdownV1,
  requestShellRendererFlushV1,
  type ShellServerLikeV1,
  type ShellWindowLikeV1,
} from "./shell-lifetime.mts";
import { resolveStaticFilePathV1 } from "./static-file-path.mts";

/**
 * The desktop webview shell. `deno desktop` compiles this entry: the
 * runtime opens a window pointed at whatever `Deno.serve` binds, so the
 * shell serves the prebuilt Player bundle itself and owns the records API
 * over a real save directory in the platform's user-data location.
 * Ports may vary per launch — persistence lives in files, not in
 * per-origin browser storage, so origin drift is harmless by design.
 *
 * Staged copies replace the two placeholders below; running the file
 * directly from the source tree also works for local verification:
 *   deno run -A engine/packages/tooling/src/desktop/shell-main.ts --dist <app>/dist-web --id dev.local.app
 */

declare const Deno: {
  serve(
    options: { readonly hostname: string },
    handler: (request: Request) => Response | Promise<Response>,
  ): ShellServerLikeV1;
  env: { get(name: string): string | undefined };
  build: { os: string };
  args: string[];
  exit(code?: number): never;
  /** Desktop runtime only (`deno desktop`); absent under plain `deno run`. */
  BrowserWindow?: new (options?: Record<never, never>) => ShellWindowLikeV1;
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

/** Exports (state/save JSON) land where a browser download would. */
function downloadsDirV1(): string {
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".";
  return join(home, "Downloads");
}

// Web shell types plus the engine's runtime-asset media set (see
// `vite/runtime-assets.ts`): the Artifact ships runtime assets verbatim, so
// the desktop preview must recognize the same browser-supported formats.
const mediaTypesV1: Readonly<Record<string, string>> = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".oga": "audio/ogg",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
  ".weba": "audio/webm",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
});

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
    const headers = {
      "content-type": mediaType,
      "x-content-type-options": "nosniff",
    };
    if (mediaType.startsWith("text/html")) {
      // The desktop shell marks its pages so the engine selects the HTTP
      // record store without needing a query parameter on the window URL.
      const html = injectDesktopRecordsMarkerV1(new TextDecoder().decode(bytes));
      return new Response(request.method === "HEAD" ? null : html, { headers });
    }
    return new Response(request.method === "HEAD" ? null : new Uint8Array(bytes), { headers });
  } catch {
    return new Response("not found", { status: 404 });
  }
}

// The handler closes over this binding so the adopting BrowserWindow remains
// strongly reachable for the lifetime of the HTTP server.
let adoptedWindowV1: ShellWindowLikeV1 | null = null;
const serverV1 = Deno.serve({ hostname: "127.0.0.1" }, (request: Request) => {
  void adoptedWindowV1;
  const url = new URL(request.url);
  if (url.pathname.startsWith(`${desktopFilesPathPrefixV1}/`)) {
    return handleFileDownloadRequestV1(
      request,
      url.pathname.slice(desktopFilesPathPrefixV1.length),
      downloadsDirV1(),
    );
  }
  if (url.pathname === "/sillymaker/records" || url.pathname.startsWith("/sillymaker/records/")) {
    return handleRecordHttpRequestV1(
      request,
      url.pathname.slice("/sillymaker/records".length),
      store,
    );
  }
  return handleStaticV1(request, url.pathname);
});

// The first BrowserWindow construction adopts the implicit startup window.
// Its close request first fences gameplay and waits for the renderer's
// verified autosave receipt, then stops ingress and drains active record
// writes before exit. No page heartbeat or timeout can interrupt persistence.
adoptedWindowV1 = adoptShellWindowV1({
  browserWindow: Deno.BrowserWindow,
  requestShutdown: createShellShutdownV1({
    prepare: () => requestShellRendererFlushV1(adoptedWindowV1),
    shutdown: () => serverV1.shutdown(),
    exit: () => Deno.exit(0),
  }),
});

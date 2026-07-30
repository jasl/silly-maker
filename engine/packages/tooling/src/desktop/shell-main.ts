// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

import { injectDesktopLifetimeScriptV1, injectDesktopRecordsMarkerV1 } from "./desktop-html.mts";
import { createRecordFileStoreV1 } from "./record-file-store.mts";
import { handleRecordHttpRequestV1 } from "./record-http-handler.mts";
import {
  adoptShellWindowV1,
  createShellLifetimeWatchdogV1,
  desktopLifetimePathPrefixV1,
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
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
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
      // record store without needing a query parameter on the window URL,
      // and installs the lifetime client so a closed window ends the shell.
      const html = injectDesktopLifetimeScriptV1(
        injectDesktopRecordsMarkerV1(new TextDecoder().decode(bytes)),
      );
      return new Response(request.method === "HEAD" ? null : html, { headers });
    }
    return new Response(request.method === "HEAD" ? null : new Uint8Array(bytes), { headers });
  } catch {
    return new Response("not found", { status: 404 });
  }
}

// The `ln` runtime owns the window; without this watchdog the serve loop
// would keep the process (and dock icon) alive after the window closes.
const watchdog = createShellLifetimeWatchdogV1({ exit: () => Deno.exit(0) });
setInterval(() => watchdog.tick(), 5_000);

// Adopt the startup window so the OS close button actually works — the
// runtime forwards the click as a `close` event on the adopting
// BrowserWindow; without adoption the request has no target and is dropped.
adoptShellWindowV1({ browserWindow: Deno.BrowserWindow, exit: () => Deno.exit(0) });

Deno.serve((request: Request) => {
  watchdog.markRequest();
  const url = new URL(request.url);
  if (url.pathname === `${desktopLifetimePathPrefixV1}/heartbeat`) {
    return new Response(null, { status: 204 });
  }
  if (url.pathname === `${desktopLifetimePathPrefixV1}/goodbye`) {
    watchdog.markGoodbye();
    return new Response(null, { status: 204 });
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

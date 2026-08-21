// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { createDesktopHtmlResponseInternalV1 } from "./desktop-html.mts";
import { parseDesktopShellArgumentsV1 } from "./desktop-shell-arguments.mts";
import { createFileDownloadRequestCoordinatorInternalV1 } from "./file-download-handler.mts";
import { createRecordFileStoreV1 } from "./record-file-store.mts";
import { handleRecordHttpRequestV1 } from "./record-http-handler.mts";
import {
  allocateShellCapabilityInternalV1,
  createShellHttpHandlerInternalV1,
} from "./shell-http-admission.mts";
import {
  adoptShellWindowV1,
  createShellServerDrainInternalV1,
  createShellShutdownV1,
  requestShellRendererFlushV1,
  type ShellServerLikeV1,
  type ShellWindowLikeV1,
} from "./shell-lifetime.mts";
import { resolveStaticFilePathV1 } from "./static-file-path.mts";

interface ShellHttpServerV1 extends ShellServerLikeV1 {
  readonly addr: {
    readonly hostname: string;
    readonly port: number;
  };
}

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
 *   deno run -A engine/packages/tooling/src/desktop/shell-main.ts --entry runtime --dist <app>/dist-web --id dev.local.app
 */

declare const Deno: {
  serve(
    options: { readonly hostname: string; readonly port: number },
    handler: (request: Request) => Response | Promise<Response>,
  ): ShellHttpServerV1;
  env: { get(name: string): string | undefined };
  build: { os: string };
  args: string[];
  exit(code?: number): never;
  /** Desktop runtime only (`deno desktop`); absent under plain `deno run`. */
  BrowserWindow?: new (options?: Record<never, never>) => ShellWindowLikeV1;
};

const appIdentifierV1 = "__SILLYMAKER_APP_IDENTIFIER__";
const distDirNameV1 = "__SILLYMAKER_DIST_DIR__";
const moduleUrlV1 = Reflect.get(import.meta, "url");
if (typeof moduleUrlV1 !== "string") {
  throw new TypeError("Desktop shell module URL is unavailable");
}
const moduleDirV1 = fileURLToPath(new URL(".", moduleUrlV1));

const identifierIsPlaceholderV1 = appIdentifierV1.startsWith("__SILLYMAKER_");
const distIsPlaceholderV1 = distDirNameV1.startsWith("__SILLYMAKER_");
if (identifierIsPlaceholderV1 !== distIsPlaceholderV1) {
  throw new TypeError("Desktop shell staging placeholders are inconsistent");
}
const sourceTreeRunV1 = identifierIsPlaceholderV1;
const shellArgumentsV1 = parseDesktopShellArgumentsV1(Deno.args, {
  allowSourceOverrides: sourceTreeRunV1,
});
const identifier = sourceTreeRunV1
  ? shellArgumentsV1.identifierOverride ?? "dev.sillymaker.shell"
  : appIdentifierV1;
const distDir = normalize(
  sourceTreeRunV1 ? shellArgumentsV1.distOverride ?? "dist" : join(moduleDirV1, distDirNameV1),
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
      // record store and captures this launch's private-route capability
      // without placing that capability in the window URL.
      return createDesktopHtmlResponseInternalV1(
        new TextDecoder().decode(bytes),
        shellCapabilityV1,
        shellArgumentsV1.bootstrap,
        request.method === "HEAD",
      );
    }
    return new Response(request.method === "HEAD" ? null : new Uint8Array(bytes), { headers });
  } catch {
    return new Response("not found", { status: 404 });
  }
}

// The handler closes over this binding so the adopting BrowserWindow remains
// strongly reachable for the lifetime of the HTTP server.
let adoptedWindowV1: ShellWindowLikeV1 | null = null;
const shellCapabilityV1 = allocateShellCapabilityInternalV1();
const downloadRequestsV1 = createFileDownloadRequestCoordinatorInternalV1(downloadsDirV1());
let shellOriginV1 = "";
const shellHandlerV1 = createShellHttpHandlerInternalV1({
  expectedOrigin: () => shellOriginV1,
  capability: shellCapabilityV1,
  handleStatic: (request, pathname) => {
    void adoptedWindowV1;
    return handleStaticV1(request, pathname);
  },
  handleFiles: (request, subPath) => downloadRequestsV1.handle(request, subPath),
  handleRecords: (request, subPath) => handleRecordHttpRequestV1(request, subPath, store),
});
const serverV1 = Deno.serve({ hostname: "127.0.0.1", port: 0 }, shellHandlerV1);
if (serverV1.addr.hostname !== "127.0.0.1") {
  throw new TypeError("Desktop shell did not bind the required loopback host");
}
shellOriginV1 = `http://127.0.0.1:${String(serverV1.addr.port)}`;

// The first BrowserWindow construction adopts the implicit startup window.
// Its close request first fences gameplay and waits for the renderer's
// verified autosave receipt, then stops ingress and drains active record
// writes before exit. No page heartbeat or timeout can interrupt persistence.
adoptedWindowV1 = adoptShellWindowV1({
  browserWindow: Deno.BrowserWindow,
  requestShutdown: createShellShutdownV1({
    prepare: () => requestShellRendererFlushV1(adoptedWindowV1),
    shutdown: createShellServerDrainInternalV1({
      cancelNonAuthoritativeRequests: () => downloadRequestsV1.close(),
      shutdown: () => serverV1.shutdown(),
    }),
    exit: () => Deno.exit(0),
  }),
});

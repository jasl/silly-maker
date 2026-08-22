// SPDX-License-Identifier: MIT
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";
import { isAbsolute, relative, resolve } from "node:path";
import { Readable } from "node:stream";

import type { Plugin, ViteDevServer } from "vite";

import {
  applicationBootstrapJsonTextInternalV1,
  type ApplicationBootstrapHtmlConfigV1,
} from "../desktop/application-bootstrap-html.mts";
import { createDesktopHtmlResponseInternalV1 } from "../desktop/desktop-html.mts";
import { desktopRuntimeBootstrapConfigV1 } from "../desktop/desktop-shell-arguments.mts";
import {
  createFileDownloadRequestCoordinatorInternalV1,
  type FileDownloadRequestCoordinatorInternalV1,
} from "../desktop/file-download-handler.mts";
import { createRecordFileStoreV1 } from "../desktop/record-file-store.mts";
import {
  handleRecordHttpRequestV1,
  type RecordHttpStoreV1,
} from "../desktop/record-http-handler.mts";
import {
  adoptShellWindowV1,
  createShellServerDrainInternalV1,
  createShellShutdownV1,
  requestShellRendererFlushV1,
  type ShellWindowLikeV1,
} from "../desktop/shell-lifetime.mts";
import {
  allocateShellCapabilityInternalV1,
  createShellHttpHandlerInternalV1,
  shellFilesPathPrefixInternalV1,
  shellRecordsPathPrefixInternalV1,
} from "../desktop/shell-http-admission.mts";
import { studioPageMetaNameV1, studioPageUrlV1 } from "./studio.ts";

const desktopDevCoordinatorKeyInternalV1 = Symbol.for(
  "@sillymaker/tooling/vite/desktop-dev-coordinator/v1",
);
export const desktopDevIntentEnvironmentKeyInternalV1 = "SILLYMAKER_DESKTOP_DEV_INTENT_V1";
const desktopDevRunIdPatternInternalV1 = /^[a-z0-9-]{1,64}$/u;
const maximumPathBytesInternalV1 = 4_096;
const browserRuntimeBootstrapTextInternalV1 = applicationBootstrapJsonTextInternalV1({
  revision: 1,
  entry: "runtime",
  target: "browser",
});

type DesktopDevBrowserWindowConstructorInternalV1 = new (
  options?: Record<never, never>,
) => ShellWindowLikeV1;

export interface DesktopDevIntentInternalV1 {
  readonly revision: 1;
  readonly runId: string;
  readonly recordsDir: string;
  readonly downloadsDir: string;
  readonly bootstrap: ApplicationBootstrapHtmlConfigV1;
}

export interface DesktopDevRuntimeInternalV1 {
  readonly coordinatorTarget: object;
  readonly browserWindow: DesktopDevBrowserWindowConstructorInternalV1 | undefined;
  readonly exit: (code: number) => void;
  readonly allocateCapability: () => string;
  readonly createRecordStore: (recordsDir: string) => RecordHttpStoreV1;
  readonly createDownloadCoordinator: (
    downloadsDir: string,
  ) => FileDownloadRequestCoordinatorInternalV1;
}

export interface CreateDesktopDevVitePluginInputInternalV1 {
  readonly applicationId: string;
  readonly applicationLabel: string;
  /** Already admitted at the environment boundary. */
  readonly intent: DesktopDevIntentInternalV1;
  /** Package-private deterministic seam; production reads the actual Deno runtime. */
  readonly runtime?: DesktopDevRuntimeInternalV1;
}

interface DesktopDevIdentityInternalV1 {
  readonly intent: DesktopDevIntentInternalV1;
  readonly applicationId: string;
  readonly applicationLabel: string;
}

interface DesktopDevServerGenerationInternalV1 {
  readonly server: ViteDevServer;
  readonly downloads: FileDownloadRequestCoordinatorInternalV1;
  readonly activePrivateExchanges: Set<Promise<void>>;
  downloadsClosed: boolean;
  origin: string | null;
  accepting: boolean;
}

interface ConnectionCloseWaiterInternalV1 {
  readonly promise: Promise<void>;
  dispose(): void;
}

function closeGenerationDownloadsV1(generation: DesktopDevServerGenerationInternalV1): void {
  if (generation.downloadsClosed) return;
  generation.downloadsClosed = true;
  generation.downloads.close();
}

interface DesktopDevCoordinatorInternalV1 {
  readonly protocolRevision: 1;
  readonly identity: DesktopDevIdentityInternalV1;
  readonly capability: string;
  matches(identity: DesktopDevIdentityInternalV1): boolean;
  installServer(server: ViteDevServer): Promise<void>;
  transformRuntimeHtml(html: string): Promise<string>;
}

function desktopDevFailureV1(code: string, cause?: unknown): never {
  throw new TypeError(`desktop_dev.${code}`, cause === undefined ? undefined : { cause });
}

function requireJsonObjectV1(value: unknown, code: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return desktopDevFailureV1(code);
  }
  return value as Record<string, unknown>;
}

function requireAbsoluteDirectoryV1(value: unknown, code: string): string {
  if (
    typeof value !== "string" ||
    value.includes("\0") ||
    new TextEncoder().encode(value).byteLength > maximumPathBytesInternalV1 ||
    !isAbsolute(value)
  ) {
    return desktopDevFailureV1(code);
  }
  const canonical = resolve(value);
  if (canonical !== value) return desktopDevFailureV1(code);
  const parent = resolve(canonical, "..");
  if (parent === canonical) return desktopDevFailureV1(code);
  return canonical;
}

function pathsOverlapV1(left: string, right: string): boolean {
  const leftToRight = relative(left, right);
  const rightToLeft = relative(right, left);
  return (
    leftToRight === "" ||
    (!leftToRight.startsWith("..") && !isAbsolute(leftToRight)) ||
    (!rightToLeft.startsWith("..") && !isAbsolute(rightToLeft))
  );
}

/** Side-effect-free JSON admission for an explicit Desktop-dev launch. */
function admitDesktopDevIntentJsonV1(value: unknown): DesktopDevIntentInternalV1 {
  const record = requireJsonObjectV1(value, "intent.invalid_shape");
  if (record.revision !== 1) return desktopDevFailureV1("intent.invalid_revision");
  if (
    typeof record.runId !== "string" ||
    !desktopDevRunIdPatternInternalV1.test(record.runId)
  ) {
    return desktopDevFailureV1("intent.invalid_run_id");
  }
  const recordsDir = requireAbsoluteDirectoryV1(record.recordsDir, "intent.invalid_records_dir");
  const downloadsDir = requireAbsoluteDirectoryV1(
    record.downloadsDir,
    "intent.invalid_downloads_dir",
  );
  if (pathsOverlapV1(recordsDir, downloadsDir)) {
    return desktopDevFailureV1("intent.overlapping_paths");
  }
  const bootstrap = requireJsonObjectV1(record.bootstrap, "intent.invalid_bootstrap");
  if (
    bootstrap.revision !== 1 ||
    bootstrap.entry !== "runtime" ||
    bootstrap.target !== "deno_desktop"
  ) {
    return desktopDevFailureV1("intent.invalid_bootstrap");
  }
  return Object.freeze({
    revision: 1,
    runId: record.runId,
    recordsDir,
    downloadsDir,
    bootstrap: desktopRuntimeBootstrapConfigV1,
  });
}

/** One environment boundary shared by the private launcher and Vite assembly. */
export function parseDesktopDevIntentEnvironmentInternalV1(
  raw: string | undefined,
): DesktopDevIntentInternalV1 | null {
  if (raw === undefined) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    return desktopDevFailureV1("intent.invalid_json", error);
  }
  return admitDesktopDevIntentJsonV1(parsed);
}

function requireApplicationTextV1(value: string, field: string): string {
  if (typeof value !== "string" || value === "" || value !== value.trim() || value.includes("\0")) {
    return desktopDevFailureV1(`identity.invalid_${field}`);
  }
  return value;
}

function actualDesktopDevRuntimeV1(): DesktopDevRuntimeInternalV1 {
  const deno = Reflect.get(globalThis, "Deno");
  if (typeof deno !== "object" || deno === null) {
    return desktopDevFailureV1("runtime.browser_window_unavailable");
  }
  const browserWindow = Reflect.get(deno, "BrowserWindow");
  const exit = Reflect.get(deno, "exit");
  if (typeof browserWindow !== "function" || typeof exit !== "function") {
    return desktopDevFailureV1("runtime.browser_window_unavailable");
  }
  return Object.freeze({
    coordinatorTarget: globalThis,
    browserWindow: browserWindow as DesktopDevBrowserWindowConstructorInternalV1,
    exit: (code: number) => {
      Reflect.apply(exit, deno, [code]);
    },
    allocateCapability: () => allocateShellCapabilityInternalV1(),
    createRecordStore: (recordsDir: string) => createRecordFileStoreV1(recordsDir),
    createDownloadCoordinator: (downloadsDir: string) =>
      createFileDownloadRequestCoordinatorInternalV1(downloadsDir),
  });
}

function sameIdentityV1(
  left: DesktopDevIdentityInternalV1,
  right: DesktopDevIdentityInternalV1,
): boolean {
  return (
    left.applicationId === right.applicationId &&
    left.applicationLabel === right.applicationLabel &&
    left.intent.runId === right.intent.runId &&
    left.intent.recordsDir === right.intent.recordsDir &&
    left.intent.downloadsDir === right.intent.downloadsDir &&
    left.intent.bootstrap.revision === right.intent.bootstrap.revision &&
    left.intent.bootstrap.entry === right.intent.bootstrap.entry &&
    left.intent.bootstrap.target === right.intent.bootstrap.target
  );
}

function privatePathV1(rawUrl: string | undefined): boolean {
  if (rawUrl === undefined || !rawUrl.startsWith("/") || rawUrl.startsWith("//")) return false;
  const pathname = rawUrl.split("?", 1)[0] ?? "";
  return (
    pathname === shellRecordsPathPrefixInternalV1 ||
    pathname.startsWith(`${shellRecordsPathPrefixInternalV1}/`) ||
    pathname === shellFilesPathPrefixInternalV1 ||
    pathname.startsWith(`${shellFilesPathPrefixInternalV1}/`)
  );
}

function standaloneStudioPathV1(rawUrl: string | undefined): boolean {
  if (rawUrl === undefined || !rawUrl.startsWith("/") || rawUrl.startsWith("//")) return false;
  const pathname = rawUrl.split("?", 1)[0] ?? "";
  return pathname === studioPageUrlV1 || pathname === studioPageUrlV1.slice(0, -1);
}

function htmlAttributeValueV1(source: string, name: string): string | null {
  const match = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(["'])([^"']*)\\1(?:\\s|$)`,
    "iu",
  ).exec(source);
  return match?.[2] ?? null;
}

function removeStandaloneStudioAdvertisementV1(html: string): string {
  return html.replaceAll(/<meta(?:\s[^<>]*)?>/giu, (element) => {
    const attributes = element.slice("<meta".length, -1);
    return htmlAttributeValueV1(attributes, "name") === studioPageMetaNameV1 &&
        htmlAttributeValueV1(attributes, "content") === studioPageUrlV1
      ? ""
      : element;
  });
}

function nodeHeadersV1(headers: IncomingHttpHeaders): Headers {
  const admitted = new Headers();
  const connectionTokens = new Set(
    (Array.isArray(headers.connection) ? headers.connection : [headers.connection])
      .filter((value): value is string => typeof value === "string")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value !== ""),
  );
  const hopByHop = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
  ]);
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    const normalizedName = name.toLowerCase();
    if (hopByHop.has(normalizedName) || connectionTokens.has(normalizedName)) continue;
    if (Array.isArray(value)) {
      for (const entry of value) admitted.append(name, entry);
    } else {
      admitted.append(name, value);
    }
  }
  return admitted;
}

function nodeRequestBodyV1(request: IncomingMessage): ReadableStream<Uint8Array> | undefined {
  const method = request.method ?? "GET";
  if (method === "GET" || method === "HEAD") return undefined;
  return Readable.toWeb(request) as ReadableStream<Uint8Array>;
}

function requestHasExactHostV1(request: IncomingMessage, origin: string): boolean {
  const expectedHost = new URL(origin).host;
  const rawHosts: string[] = [];
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (request.rawHeaders[index]?.toLowerCase() === "host") {
      rawHosts.push(request.rawHeaders[index + 1] ?? "");
    }
  }
  if (rawHosts.length > 0) return rawHosts.length === 1 && rawHosts[0] === expectedHost;
  return typeof request.headers.host === "string" && request.headers.host === expectedHost;
}

function createFetchRequestV1(
  request: IncomingMessage,
  origin: string,
  signal: AbortSignal,
): Request {
  const rawUrl = request.url ?? "";
  let url: URL;
  try {
    url = new URL(rawUrl, `${origin}/`);
  } catch (error) {
    return desktopDevFailureV1("request.invalid_url", error);
  }
  if (url.origin !== origin) return desktopDevFailureV1("request.invalid_url");
  const body = nodeRequestBodyV1(request);
  const init: RequestInit & { readonly duplex?: "half" } = {
    method: request.method ?? "GET",
    headers: nodeHeadersV1(request.headers),
    signal,
    ...(body === undefined ? {} : { body, duplex: "half" as const }),
  };
  return new Request(url, init);
}

function waitForDrainV1(response: ServerResponse, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolvePromise, rejectPromise) => {
    const cleanup = (): void => {
      response.off("drain", onDrain);
      response.off("close", onClose);
      response.off("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const finish = (error?: unknown): void => {
      cleanup();
      if (error === undefined) resolvePromise();
      else rejectPromise(error);
    };
    const onDrain = (): void => finish();
    const onClose = (): void => finish(new Error("desktop_dev.response_closed"));
    const onError = (error: Error): void => finish(error);
    const onAbort = (): void => finish(new Error("desktop_dev.request_aborted"));
    response.once("drain", onDrain);
    response.once("close", onClose);
    response.once("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

function endResponseV1(response: ServerResponse, signal: AbortSignal): Promise<void> {
  if (response.writableFinished) return Promise.resolve();
  return new Promise<void>((resolvePromise, rejectPromise) => {
    const cleanup = (): void => {
      response.off("finish", onFinish);
      response.off("close", onClose);
      response.off("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const finish = (error?: unknown): void => {
      cleanup();
      if (error === undefined) resolvePromise();
      else rejectPromise(error);
    };
    const onFinish = (): void => finish();
    const onClose = (): void => {
      if (response.writableFinished) finish();
      else finish(new Error("desktop_dev.response_closed"));
    };
    const onError = (error: Error): void => finish(error);
    const onAbort = (): void => finish(new Error("desktop_dev.request_aborted"));
    response.once("finish", onFinish);
    response.once("close", onClose);
    response.once("error", onError);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    try {
      response.end();
    } catch (error) {
      finish(error);
    }
  });
}

function createConnectionCloseWaiterV1(
  response: ServerResponse,
): ConnectionCloseWaiterInternalV1 {
  const socket = response.socket;
  if (socket === null) return desktopDevFailureV1("response.socket_unavailable");
  let dispose = (): void => {};
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    let settled = false;
    const onClose = (hadError: boolean): void => {
      if (settled) return;
      settled = true;
      dispose();
      if (hadError) rejectPromise(new Error("desktop_dev.response_connection_failed"));
      else resolvePromise();
    };
    dispose = (): void => {
      socket.off("close", onClose);
    };
    socket.once("close", onClose);
    if (socket.destroyed) onClose(true);
  });
  return Object.freeze({ promise, dispose: () => dispose() });
}

async function writeFetchResponseV1(
  result: Response,
  response: ServerResponse,
  signal: AbortSignal,
): Promise<void> {
  const connectionClose = createConnectionCloseWaiterV1(response);
  try {
    response.statusCode = result.status;
    for (const [name, value] of result.headers) response.setHeader(name, value);
    response.shouldKeepAlive = false;
    response.setHeader("connection", "close");
    if (result.body === null) {
      await endResponseV1(response, signal);
    } else {
      const reader = result.body.getReader();
      try {
        while (true) {
          if (signal.aborted || response.destroyed) {
            await reader.cancel("desktop dev response closed").catch(() => undefined);
            throw new Error("desktop_dev.exchange_aborted");
          }
          const chunk = await reader.read();
          if (chunk.done) break;
          if (!response.write(chunk.value)) await waitForDrainV1(response, signal);
        }
        await endResponseV1(response, signal);
      } finally {
        reader.releaseLock();
      }
    }
    await connectionClose.promise;
  } catch (error) {
    if (!response.destroyed) {
      response.destroy(error instanceof Error ? error : undefined);
    }
    await connectionClose.promise.catch(() => undefined);
    throw error;
  } finally {
    connectionClose.dispose();
  }
}

function sendUnavailableV1(response: ServerResponse): void {
  response.statusCode = 503;
  response.setHeader("cache-control", "no-store");
  response.end("desktop host unavailable");
}

function sendMisdirectedV1(response: ServerResponse): void {
  response.statusCode = 421;
  response.setHeader("cache-control", "no-store");
  response.end("misdirected request");
}

function sendStandaloneStudioUnavailableV1(response: ServerResponse): void {
  response.statusCode = 404;
  response.setHeader("cache-control", "no-store");
  response.setHeader("content-type", "text/plain; charset=utf-8");
  response.end("standalone Studio unavailable in Desktop");
}

function createPrivateMiddlewareV1(
  generation: DesktopDevServerGenerationInternalV1,
  coordinatorCurrent: () => DesktopDevServerGenerationInternalV1 | null,
  handler: (request: Request) => Promise<Response>,
) {
  return (request: IncomingMessage, response: ServerResponse, next: (error?: unknown) => void) => {
    const privatePath = privatePathV1(request.url);
    const standaloneStudioPath = standaloneStudioPathV1(request.url);
    if (!privatePath && !standaloneStudioPath) {
      next();
      return;
    }
    if (coordinatorCurrent() !== generation) {
      sendUnavailableV1(response);
      return;
    }
    if (!generation.accepting || generation.origin === null) {
      sendUnavailableV1(response);
      return;
    }
    if (!requestHasExactHostV1(request, generation.origin)) {
      sendMisdirectedV1(response);
      return;
    }
    if (standaloneStudioPath) {
      sendStandaloneStudioUnavailableV1(response);
      return;
    }

    const abort = new AbortController();
    const onRequestAbort = (): void => abort.abort();
    const onResponseClose = (): void => {
      if (!response.writableEnded) abort.abort();
    };
    request.once("aborted", onRequestAbort);
    request.once("error", onRequestAbort);
    response.once("close", onResponseClose);

    let exchange!: Promise<void>;
    exchange = Promise.resolve().then(async (): Promise<void> => {
      try {
        const fetchRequest = createFetchRequestV1(
          request,
          generation.origin as string,
          abort.signal,
        );
        await writeFetchResponseV1(await handler(fetchRequest), response, abort.signal);
      } catch (error) {
        if (!abort.signal.aborted && !response.headersSent) {
          response.statusCode = 500;
          response.end("desktop host request failed");
        } else if (!response.destroyed) {
          response.destroy(error instanceof Error ? error : undefined);
        }
      } finally {
        request.off("aborted", onRequestAbort);
        request.off("error", onRequestAbort);
        response.off("close", onResponseClose);
        generation.activePrivateExchanges.delete(exchange);
      }
    });
    generation.activePrivateExchanges.add(exchange);
  };
}

function publishServerOriginV1(generation: DesktopDevServerGenerationInternalV1): void {
  const httpServer = generation.server.httpServer;
  if (httpServer === null) {
    generation.accepting = false;
    generation.origin = null;
    return;
  }
  const address = httpServer.address();
  if (address === null) return;
  if (
    typeof address === "string" ||
    address.address !== "127.0.0.1" ||
    !Number.isSafeInteger(address.port) ||
    address.port < 1 ||
    address.port > 65_535
  ) {
    generation.accepting = false;
    generation.origin = null;
    return;
  }
  generation.origin = `http://127.0.0.1:${String(address.port)}`;
}

function requireViteTransportsClosedV1(server: ViteDevServer): void {
  const httpServer = server.httpServer;
  if (
    (httpServer !== null && (httpServer.listening || httpServer.address() !== null)) ||
    server.ws.clients.size !== 0
  ) {
    throw new Error("desktop_dev.server.transport_close_incomplete");
  }
}

function readCoordinatorV1(target: object): DesktopDevCoordinatorInternalV1 | null {
  const descriptor = Object.getOwnPropertyDescriptor(target, desktopDevCoordinatorKeyInternalV1);
  if (descriptor === undefined) return null;
  if (!("value" in descriptor)) return desktopDevFailureV1("coordinator.conflict");
  const value: unknown = descriptor.value;
  if (
    typeof value !== "object" ||
    value === null ||
    Reflect.get(value, "protocolRevision") !== 1 ||
    typeof Reflect.get(value, "matches") !== "function" ||
    typeof Reflect.get(value, "installServer") !== "function" ||
    typeof Reflect.get(value, "transformRuntimeHtml") !== "function"
  ) {
    return desktopDevFailureV1("coordinator.conflict");
  }
  return value as DesktopDevCoordinatorInternalV1;
}

function createCoordinatorV1(
  identity: DesktopDevIdentityInternalV1,
  runtime: DesktopDevRuntimeInternalV1,
): DesktopDevCoordinatorInternalV1 {
  if (typeof runtime.browserWindow !== "function") {
    return desktopDevFailureV1("runtime.browser_window_unavailable");
  }
  let current: DesktopDevServerGenerationInternalV1 | null = null;
  let closing = false;
  let closingGeneration: DesktopDevServerGenerationInternalV1 | null = null;
  let requestShellShutdown = (): void => {};
  let installTail = Promise.resolve();
  const capability = runtime.allocateCapability();
  const adopted = adoptShellWindowV1({
    browserWindow: runtime.browserWindow,
    requestShutdown: () => {
      closingGeneration ??= current;
      requestShellShutdown();
    },
  });
  if (adopted === null) return desktopDevFailureV1("runtime.window_adoption_failed");

  const closeCurrentServerV1 = async (): Promise<void> => {
    await installTail;
    const generation = closingGeneration;
    if (generation === null || current !== generation) {
      throw new Error("desktop_dev.server.close_generation_changed");
    }
    generation.accepting = false;
    await createShellServerDrainInternalV1({
      cancelNonAuthoritativeRequests: () => closeGenerationDownloadsV1(generation),
      shutdown: async () => {
        await Promise.allSettled([...generation.activePrivateExchanges]);
        await generation.server.close();
        // Vite 8.2.1 settles its transport close operations with
        // Promise.allSettled, so a resolved close alone cannot authorize the
        // native process to exit while an HTTP listener or WS client remains.
        requireViteTransportsClosedV1(generation.server);
      },
    })();
  };
  requestShellShutdown = createShellShutdownV1({
    prepare: async () => {
      const generation = closingGeneration;
      const acknowledged = generation !== null && await requestShellRendererFlushV1(adopted);
      if (!acknowledged || current !== generation) {
        closingGeneration = null;
        return false;
      }
      closing = true;
      return true;
    },
    shutdown: closeCurrentServerV1,
    exit: () => runtime.exit(0),
  });

  const installServerGenerationV1 = async (server: ViteDevServer): Promise<void> => {
    if (server.httpServer === null) return desktopDevFailureV1("server.http_unavailable");
    if (closing) return desktopDevFailureV1("server.close_in_progress");
    const predecessor = current;
    if (predecessor !== null) {
      predecessor.accepting = false;
      closeGenerationDownloadsV1(predecessor);
      await Promise.allSettled([...predecessor.activePrivateExchanges]);
      if (closing) return desktopDevFailureV1("server.close_in_progress");
    }

    const downloads = runtime.createDownloadCoordinator(identity.intent.downloadsDir);
    const store = runtime.createRecordStore(identity.intent.recordsDir);
    const generation: DesktopDevServerGenerationInternalV1 = {
      server,
      downloads,
      activePrivateExchanges: new Set(),
      downloadsClosed: false,
      origin: null,
      accepting: true,
    };
    const shellHandler = createShellHttpHandlerInternalV1({
      expectedOrigin: () => generation.origin ?? "",
      capability,
      handleStatic: () => Promise.resolve(new Response("not found", { status: 404 })),
      handleFiles: (request, subPath) => downloads.handle(request, subPath),
      handleRecords: (request, subPath) => handleRecordHttpRequestV1(request, subPath, store),
    });
    server.middlewares.use(createPrivateMiddlewareV1(generation, () => current, shellHandler));

    const httpServer = server.httpServer;
    const onListening = (): void => publishServerOriginV1(generation);
    if (httpServer.listening) onListening();
    else httpServer.once("listening", onListening);
    httpServer.once("close", () => {
      generation.accepting = false;
      closeGenerationDownloadsV1(generation);
    });

    current = generation;
  };

  const coordinator: DesktopDevCoordinatorInternalV1 = Object.freeze({
    protocolRevision: 1,
    identity,
    capability,
    matches: (candidate: DesktopDevIdentityInternalV1) => sameIdentityV1(identity, candidate),
    installServer(server: ViteDevServer): Promise<void> {
      const install = installTail.then(() => installServerGenerationV1(server));
      installTail = install.catch(() => undefined);
      return install;
    },
    async transformRuntimeHtml(html: string): Promise<string> {
      if (!html.includes(browserRuntimeBootstrapTextInternalV1)) return html;
      const desktopHtml = await createDesktopHtmlResponseInternalV1(
        html,
        capability,
        identity.intent.bootstrap,
        false,
      ).text();
      return removeStandaloneStudioAdvertisementV1(desktopHtml);
    },
  });
  return coordinator;
}

function requireCoordinatorV1(
  identity: DesktopDevIdentityInternalV1,
  runtime: DesktopDevRuntimeInternalV1,
): DesktopDevCoordinatorInternalV1 {
  const existing = readCoordinatorV1(runtime.coordinatorTarget);
  if (existing !== null) {
    if (!existing.matches(identity)) return desktopDevFailureV1("coordinator.identity_mismatch");
    return existing;
  }
  const coordinator = createCoordinatorV1(identity, runtime);
  try {
    Object.defineProperty(runtime.coordinatorTarget, desktopDevCoordinatorKeyInternalV1, {
      configurable: false,
      enumerable: false,
      value: coordinator,
      writable: false,
    });
  } catch (error) {
    return desktopDevFailureV1("coordinator.install_failed", error);
  }
  return coordinator;
}

/**
 * Creates the private Desktop-dev adapter from intent admitted by Vite assembly.
 * The caller owns the default-off absence branch.
 */
export function createDesktopDevVitePluginInternalV1(
  input: CreateDesktopDevVitePluginInputInternalV1,
): Plugin {
  const intent = input.intent;
  const identity: DesktopDevIdentityInternalV1 = Object.freeze({
    intent,
    applicationId: requireApplicationTextV1(input.applicationId, "application_id"),
    applicationLabel: requireApplicationTextV1(input.applicationLabel, "application_label"),
  });
  const runtime = input.runtime ?? actualDesktopDevRuntimeV1();
  if (typeof runtime.browserWindow !== "function") {
    return desktopDevFailureV1("runtime.browser_window_unavailable");
  }
  const coordinator = requireCoordinatorV1(identity, runtime);
  return {
    name: "sillymaker:desktop-dev",
    apply: "serve",
    enforce: "pre",
    transformIndexHtml: {
      order: "post",
      handler: (html) => coordinator.transformRuntimeHtml(html),
    },
    async configureServer(server) {
      await coordinator.installServer(server);
    },
  };
}

// SPDX-License-Identifier: MIT
import {
  createServer,
  type IncomingMessage,
  request as nodeRequest,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { resolve as resolvePath } from "node:path";
import { cwd } from "node:process";
import { Readable } from "node:stream";

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Plugin, ViteDevServer } from "vite";

import { applicationBootstrapJsonHtmlV1 } from "../desktop/application-bootstrap-html.mts";
import type { FileDownloadRequestCoordinatorInternalV1 } from "../desktop/file-download-handler.mts";
import type { RecordHttpStoreV1 } from "../desktop/record-http-handler.mts";
import {
  createDesktopDevVitePluginInternalV1,
  desktopDevIntentEnvironmentKeyInternalV1,
  parseDesktopDevIntentEnvironmentInternalV1,
  type DesktopDevIntentInternalV1,
  type DesktopDevRuntimeInternalV1,
} from "./desktop-dev.ts";
import {
  embeddedAuthorEntryIdInternalV1,
  studioPageMetaNameV1,
  studioPageUrlV1,
} from "./studio.ts";

type ConnectMiddlewareV1 = (
  request: IncomingMessage,
  response: ServerResponse,
  next: (error?: unknown) => void,
) => void;

interface DeferredV1<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (error: unknown) => void;
}

interface FakeWindowHarnessV1 {
  readonly BrowserWindow: DesktopDevRuntimeInternalV1["browserWindow"];
  readonly operations: string[];
  readonly constructions: () => number;
  readonly instance: () => {
    emitClose(): ReturnType<typeof vi.fn>;
    pauseFlush(): () => void;
    failFlush: boolean;
  };
}

interface RuntimeHarnessV1 {
  readonly runtime: DesktopDevRuntimeInternalV1;
  readonly window: FakeWindowHarnessV1;
  readonly operations: string[];
  readonly allocations: ReturnType<typeof vi.fn>;
  readonly recordPaths: string[];
  readonly downloadPaths: string[];
  readonly downloads: FileDownloadRequestCoordinatorInternalV1[];
  readonly exits: number[];
}

interface ViteServerHarnessV1 {
  readonly server: ViteDevServer;
  readonly middlewares: ConnectMiddlewareV1[];
  readonly closeCalls: ReturnType<typeof vi.fn>;
  listen(): Promise<string>;
  closeIfNeeded(): Promise<void>;
}

const openServersV1 = new Set<ViteServerHarnessV1>();

afterEach(async () => {
  await Promise.all([...openServersV1].map((server) => server.closeIfNeeded()));
  openServersV1.clear();
});

function deferredV1<T>(): DeferredV1<T> {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (error: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return Object.freeze({ promise, resolve: resolvePromise, reject: rejectPromise });
}

function intentV1(overrides: Partial<DesktopDevIntentInternalV1> = {}): DesktopDevIntentInternalV1 {
  const root = resolvePath(cwd(), ".desktop-dev-unit-paths");
  return {
    revision: 1,
    runId: "desktop-dev-run-1",
    recordsDir: resolvePath(root, "records"),
    downloadsDir: resolvePath(root, "downloads"),
    bootstrap: { revision: 1, entry: "runtime", target: "deno_desktop" },
    ...overrides,
  };
}

function createFakeWindowHarnessV1(operations: string[]): FakeWindowHarnessV1 {
  let constructions = 0;
  let instance:
    | {
      emitClose(): ReturnType<typeof vi.fn>;
      pauseFlush(): () => void;
      failFlush: boolean;
    }
    | undefined;
  const captureInstanceV1 = (value: NonNullable<typeof instance>): void => {
    instance = value;
  };

  class FakeBrowserWindowV1 {
    readonly closeListeners = new Set<(event: { preventDefault(): void }) => void>();
    failFlush = false;
    flushGate: DeferredV1<void> | null = null;

    constructor() {
      constructions += 1;
      captureInstanceV1(this);
    }

    addEventListener(type: "close", listener: (event: { preventDefault(): void }) => void): void {
      if (type === "close") this.closeListeners.add(listener);
    }

    async executeJs(source: string): Promise<unknown> {
      operations.push("executeJs");
      const gate = this.flushGate;
      if (gate !== null) {
        await gate.promise;
        this.flushGate = null;
        operations.push("pausedFlush.done");
      }
      const match = /"requestId":(\d+)/u.exec(source);
      const requestId = Number(match?.[1] ?? "1");
      return {
        kind: this.failFlush ? "failed" : "flushed",
        protocolRevision: 1,
        requestId,
      };
    }

    emitClose(): ReturnType<typeof vi.fn> {
      const preventDefault = vi.fn(() => operations.push("preventDefault"));
      for (const listener of this.closeListeners) listener({ preventDefault });
      return preventDefault;
    }

    pauseFlush(): () => void {
      const gate = deferredV1<void>();
      this.flushGate = gate;
      return () => gate.resolve();
    }
  }

  return Object.freeze({
    BrowserWindow: FakeBrowserWindowV1 as DesktopDevRuntimeInternalV1["browserWindow"],
    operations,
    constructions: () => constructions,
    instance: () => {
      if (instance === undefined) throw new Error("window was not constructed");
      return instance;
    },
  });
}

function defaultStoreV1(): RecordHttpStoreV1 {
  return {
    read: vi.fn(async () => null),
    list: vi.fn(async () => Object.freeze([])),
    commit: vi.fn(async () => Object.freeze({ kind: "committed", records: Object.freeze([]) })),
  };
}

function createRuntimeHarnessV1(
  storeFactory: (generation: number) => RecordHttpStoreV1 = () => defaultStoreV1(),
): RuntimeHarnessV1 {
  const operations: string[] = [];
  const window = createFakeWindowHarnessV1(operations);
  const allocations = vi.fn(() => "A".repeat(43));
  const recordPaths: string[] = [];
  const downloadPaths: string[] = [];
  const downloads: FileDownloadRequestCoordinatorInternalV1[] = [];
  const exits: number[] = [];
  let generation = 0;
  const runtime: DesktopDevRuntimeInternalV1 = Object.freeze({
    coordinatorTarget: {},
    browserWindow: window.BrowserWindow,
    exit: (code: number) => {
      operations.push("exit");
      exits.push(code);
    },
    allocateCapability: allocations,
    createRecordStore: (path: string) => {
      recordPaths.push(path);
      generation += 1;
      return storeFactory(generation);
    },
    createDownloadCoordinator: (path: string) => {
      downloadPaths.push(path);
      const coordinator = Object.freeze({
        handle: vi.fn(async () => new Response(JSON.stringify({ filename: "saved.txt" }))),
        close: vi.fn(() => operations.push("downloads.close")),
      });
      downloads.push(coordinator);
      return coordinator;
    },
  });
  return Object.freeze({
    runtime,
    window,
    operations,
    allocations,
    recordPaths,
    downloadPaths,
    downloads,
    exits,
  });
}

async function configurePluginV1(plugin: Plugin, server: ViteDevServer): Promise<void> {
  const hook = plugin.configureServer;
  if (typeof hook !== "function") throw new Error("configureServer hook missing");
  await hook.call({} as never, server);
}

async function transformHtmlV1(plugin: Plugin, html: string): Promise<string> {
  const hook = plugin.transformIndexHtml;
  if (typeof hook !== "object" || hook === null || !("handler" in hook)) {
    throw new Error("transformIndexHtml hook missing");
  }
  const handler = hook.handler;
  if (typeof handler !== "function") throw new Error("transformIndexHtml handler missing");
  const result = await handler.call({} as never, html, { path: "/", filename: "index.html" });
  if (typeof result !== "string") throw new Error("unexpected transform result");
  return result;
}

function createViteServerHarnessV1(): ViteServerHarnessV1 {
  const middlewares: ConnectMiddlewareV1[] = [];
  const httpServer = createServer((request, response) => {
    let index = 0;
    const next = (error?: unknown): void => {
      if (error !== undefined) {
        response.statusCode = 500;
        response.end(String(error));
        return;
      }
      const middleware = middlewares[index];
      index += 1;
      if (middleware === undefined) {
        response.statusCode = 418;
        response.end("vite fallback");
        return;
      }
      middleware(request, response, next);
    };
    next();
  });
  const closeCalls = vi.fn(async () => {
    if (!httpServer.listening) return;
    await new Promise<void>((resolvePromise, rejectPromise) => {
      httpServer.close((error) => {
        if (error === undefined) resolvePromise();
        else rejectPromise(error);
      });
    });
  });
  const server = {
    httpServer,
    middlewares: {
      use: (middleware: ConnectMiddlewareV1) => {
        middlewares.push(middleware);
      },
    },
    close: closeCalls,
  } as unknown as ViteDevServer;
  const harness: ViteServerHarnessV1 = {
    server,
    middlewares,
    closeCalls,
    async listen(): Promise<string> {
      await new Promise<void>((resolvePromise, rejectPromise) => {
        httpServer.once("error", rejectPromise);
        httpServer.listen(0, "127.0.0.1", () => {
          httpServer.off("error", rejectPromise);
          resolvePromise();
        });
      });
      const address = httpServer.address() as AddressInfo;
      return `http://127.0.0.1:${String(address.port)}`;
    },
    async closeIfNeeded(): Promise<void> {
      if (httpServer.listening) await closeCalls();
    },
  };
  openServersV1.add(harness);
  return harness;
}

function rawRequestV1(input: {
  readonly origin: string;
  readonly path: string;
  readonly method?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly chunks?: readonly string[];
}): Promise<{ readonly status: number; readonly body: string; readonly location?: string }> {
  const url = new URL(input.path, input.origin);
  return new Promise((resolvePromise, rejectPromise) => {
    const request = nodeRequest(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: input.method ?? "GET",
        headers: input.headers,
      },
      (response) => {
        const chunks: Uint8Array[] = [];
        response.on("data", (chunk: Uint8Array) => chunks.push(chunk));
        response.once("error", rejectPromise);
        response.once("end", () => {
          const location = response.headers.location;
          resolvePromise({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
            ...(location === undefined ? {} : { location }),
          });
        });
      },
    );
    request.once("error", rejectPromise);
    for (const chunk of input.chunks ?? []) request.write(chunk);
    request.end();
  });
}

function browserRuntimeHtmlV1(): string {
  return [
    "<!doctype html><html><head></head><body>",
    applicationBootstrapJsonHtmlV1({ revision: 1, entry: "runtime", target: "browser" }),
    "</body></html>",
  ].join("");
}

function capabilityFromHtmlV1(html: string): string {
  const match = /__SILLYMAKER_DESKTOP_CAPABILITY__"?:\{value:"([A-Za-z0-9_-]{43})"/u.exec(html);
  if (match?.[1] === undefined) throw new Error("capability marker missing");
  return match[1];
}

describe("Desktop-dev intent admission", () => {
  it("admits intent once at the JSON environment boundary", () => {
    const intent = intentV1();
    expect(desktopDevIntentEnvironmentKeyInternalV1).toBe("SILLYMAKER_DESKTOP_DEV_INTENT_V1");
    expect(parseDesktopDevIntentEnvironmentInternalV1(undefined)).toBeNull();
    expect(parseDesktopDevIntentEnvironmentInternalV1(JSON.stringify(intent))).toEqual(intent);
    expect(() => parseDesktopDevIntentEnvironmentInternalV1("{"))
      .toThrow("desktop_dev.intent.invalid_json");
  });

  it.each(
    [
      [[], "invalid_shape"],
      [{ ...intentV1(), runId: "Desktop" }, "invalid_run_id"],
      [{ ...intentV1(), recordsDir: "relative" }, "invalid_records_dir"],
      [
        { ...intentV1(), recordsDir: resolvePath(cwd(), ".desktop-dev-unit-paths") },
        "overlapping_paths",
      ],
      [
        { ...intentV1(), bootstrap: { revision: 1, entry: "author", target: "deno_desktop" } },
        "invalid_bootstrap",
      ],
    ] as const,
  )("rejects malformed intent %#", (candidate, code) => {
    expect(() => parseDesktopDevIntentEnvironmentInternalV1(JSON.stringify(candidate))).toThrow(
      `desktop_dev.intent.${code}`,
    );
  });

  it("fails closed when the admitted launch has no actual BrowserWindow", () => {
    const runtime = { ...createRuntimeHarnessV1().runtime, browserWindow: undefined };
    expect(() =>
      createDesktopDevVitePluginInternalV1({
        applicationId: "e2e",
        applicationLabel: "Engine Lab",
        intent: intentV1(),
        runtime,
      })
    ).toThrow("desktop_dev.runtime.browser_window_unavailable");
  });
});

describe("Desktop-dev process coordinator", () => {
  it("reuses one startup window and capability across Vite plugin recreation", () => {
    const harness = createRuntimeHarnessV1();
    const input = {
      applicationId: "e2e",
      applicationLabel: "Engine Lab",
      intent: intentV1(),
      runtime: harness.runtime,
    };
    const first = createDesktopDevVitePluginInternalV1(input);
    const second = createDesktopDevVitePluginInternalV1(input);

    expect(first).not.toBe(second);
    expect(harness.window.constructions()).toBe(1);
    expect(harness.allocations).toHaveBeenCalledOnce();

    expect(() =>
      createDesktopDevVitePluginInternalV1({
        ...input,
        intent: intentV1({ runId: "desktop-dev-run-2" }),
      })
    ).toThrow("desktop_dev.coordinator.identity_mismatch");
    expect(() => createDesktopDevVitePluginInternalV1({ ...input, applicationLabel: "Changed" }))
      .toThrow("desktop_dev.coordinator.identity_mismatch");
  });

  it("marks only runtime HTML and preserves standalone Author HTML", async () => {
    const harness = createRuntimeHarnessV1();
    const plugin = createDesktopDevVitePluginInternalV1({
      applicationId: "e2e",
      applicationLabel: "Engine Lab",
      intent: intentV1(),
      runtime: harness.runtime,
    });

    const advertisedRuntime = browserRuntimeHtmlV1()
      .replace(
        "<head>",
        `<head><meta name="preserved" content="yes"><meta content="${studioPageUrlV1}" name="${studioPageMetaNameV1}">`,
      )
      .replace(
        "</body>",
        `<script type="module" src="${embeddedAuthorEntryIdInternalV1}"></script></body>`,
      );
    const runtime = await transformHtmlV1(plugin, advertisedRuntime);
    expect(runtime).toContain('{"revision":1,"entry":"runtime","target":"deno_desktop"}');
    expect(capabilityFromHtmlV1(runtime)).toBe("A".repeat(43));
    expect(runtime).not.toContain("content-security-policy");
    expect(runtime).not.toContain(studioPageMetaNameV1);
    expect(runtime).toContain('<meta name="preserved" content="yes">');
    expect(runtime).toContain(`src="${embeddedAuthorEntryIdInternalV1}"`);

    const author = [
      "<!doctype html><body>",
      applicationBootstrapJsonHtmlV1({ revision: 1, entry: "author", target: "browser" }),
      "</body>",
    ].join("");
    await expect(transformHtmlV1(plugin, author)).resolves.toBe(author);
  });

  it("publishes an exact loopback origin and streams private chunked POST bodies", async () => {
    let committed: unknown = null;
    const store = defaultStoreV1();
    store.commit = vi.fn(async (mutations) => {
      committed = mutations;
      return Object.freeze({ kind: "committed", records: Object.freeze([]) });
    });
    const runtime = createRuntimeHarnessV1(() => store);
    const plugin = createDesktopDevVitePluginInternalV1({
      applicationId: "e2e",
      applicationLabel: "Engine Lab",
      intent: intentV1(),
      runtime: runtime.runtime,
    });
    const vite = createViteServerHarnessV1();
    await configurePluginV1(plugin, vite.server);
    const earlyRequest = Object.assign(Readable.from([]), {
      method: "GET",
      url: "/sillymaker/records",
      headers: {},
      rawHeaders: [],
    }) as unknown as IncomingMessage;
    const earlyResponse = {
      statusCode: 0,
      setHeader: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const earlyNext = vi.fn();
    vite.middlewares[0]?.(earlyRequest, earlyResponse, earlyNext);
    expect(earlyResponse.statusCode).toBe(503);
    expect(earlyNext).not.toHaveBeenCalled();

    const origin = await vite.listen();
    expect(runtime.recordPaths).toEqual([intentV1().recordsDir]);
    expect(runtime.downloadPaths).toEqual([intentV1().downloadsDir]);

    await expect(rawRequestV1({
      origin,
      path: `${studioPageUrlV1}?source=desktop`,
    })).resolves.toEqual({
      status: 404,
      body: "standalone Studio unavailable in Desktop",
    });
    await expect(rawRequestV1({
      origin,
      path: embeddedAuthorEntryIdInternalV1,
    })).resolves.toEqual({
      status: 418,
      body: "vite fallback",
    });

    const html = await transformHtmlV1(plugin, browserRuntimeHtmlV1());
    const capability = capabilityFromHtmlV1(html);
    const body = JSON.stringify({
      mutations: [{
        kind: "put",
        namespace: "save",
        key: "auto.current",
        expectedRevision: null,
        bytesBase64: "e30=",
      }],
    });
    const midpoint = Math.floor(body.length / 2);
    const response = await rawRequestV1({
      origin,
      path: "/sillymaker/records/commit",
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sillymaker-shell-capability": capability,
      },
      chunks: [body.slice(0, midpoint), body.slice(midpoint)],
    });
    expect(response.status).toBe(200);
    expect(committed).toEqual([{
      kind: "put",
      namespace: "save",
      key: "auto.current",
      expectedRevision: null,
      bytesBase64: "e30=",
    }]);

    await expect(rawRequestV1({ origin, path: "/@vite/client" })).resolves.toEqual({
      status: 418,
      body: "vite fallback",
    });
    const upgradeRequest = Object.assign(Readable.from([]), {
      method: "GET",
      url: "/@vite/client",
      headers: { connection: "Upgrade", upgrade: "websocket" },
      rawHeaders: ["Connection", "Upgrade", "Upgrade", "websocket"],
    }) as IncomingMessage;
    const upgradeNext = vi.fn();
    vite.middlewares[0]?.(upgradeRequest, {} as ServerResponse, upgradeNext);
    expect(upgradeNext).toHaveBeenCalledOnce();
    await expect(rawRequestV1({
      origin,
      path: "/sillymaker/records",
    })).resolves.toMatchObject({ status: 403 });
    await expect(rawRequestV1({
      origin,
      path: "/sillymaker/records",
      headers: {
        host: "127.0.0.1:1",
        "x-sillymaker-shell-capability": capability,
      },
    })).resolves.toMatchObject({ status: 421 });
    const duplicateHostRequest = Object.assign(Readable.from([]), {
      method: "GET",
      url: "/sillymaker/records",
      headers: { host: new URL(origin).host },
      rawHeaders: ["Host", new URL(origin).host, "Host", new URL(origin).host],
    }) as unknown as IncomingMessage;
    const duplicateHostResponse = {
      statusCode: 0,
      setHeader: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const duplicateHostNext = vi.fn();
    vite.middlewares[0]?.(duplicateHostRequest, duplicateHostResponse, duplicateHostNext);
    expect(duplicateHostResponse.statusCode).toBe(421);
    expect(duplicateHostNext).not.toHaveBeenCalled();
  });

  it("awaits the old private connection before Vite closes it during restart", async () => {
    const pendingRead = deferredV1<
      Readonly<{
        namespace: "save";
        key: "auto.current";
        revision: 1;
        bytesBase64: "e30=";
      }>
    >();
    const record = Object.freeze(
      {
        namespace: "save",
        key: "auto.current",
        revision: 1,
        bytesBase64: "e30=",
      } as const,
    );
    const oldStore = defaultStoreV1();
    oldStore.read = vi.fn(() => pendingRead.promise);
    const runtime = createRuntimeHarnessV1((generation) =>
      generation === 1 ? oldStore : defaultStoreV1()
    );
    const input = {
      applicationId: "e2e",
      applicationLabel: "Engine Lab",
      intent: intentV1(),
      runtime: runtime.runtime,
    };
    const firstPlugin = createDesktopDevVitePluginInternalV1(input);
    const secondPlugin = createDesktopDevVitePluginInternalV1(input);
    const firstServer = createViteServerHarnessV1();
    await configurePluginV1(firstPlugin, firstServer.server);
    const firstOrigin = await firstServer.listen();
    const capability = capabilityFromHtmlV1(
      await transformHtmlV1(firstPlugin, browserRuntimeHtmlV1()),
    );
    const activeResponse = rawRequestV1({
      origin: firstOrigin,
      path: "/sillymaker/records/save/auto.current",
      headers: { "x-sillymaker-shell-capability": capability },
    });
    await vi.waitFor(() => expect(oldStore.read).toHaveBeenCalledOnce());
    const secondServer = createViteServerHarnessV1();
    const configureReplacement = configurePluginV1(secondPlugin, secondServer.server);
    const viteRestartClose = configureReplacement.then(async () => {
      await firstServer.server.close();
    });
    await vi.waitFor(() => expect(runtime.downloads[0]?.close).toHaveBeenCalledOnce());
    expect(firstServer.closeCalls).not.toHaveBeenCalled();
    expect(runtime.downloads).toHaveLength(1);
    expect(runtime.downloads[0]?.close).toHaveBeenCalledOnce();
    await expect(rawRequestV1({
      origin: firstOrigin,
      path: "/sillymaker/records",
    })).resolves.toEqual({
      status: 503,
      body: "desktop host unavailable",
    });

    pendingRead.resolve(record);
    const oldResponse = await activeResponse;
    expect(oldResponse.status).toBe(200);
    expect(oldResponse.body).toBe(JSON.stringify(record));
    await viteRestartClose;
    expect(firstServer.closeCalls).toHaveBeenCalledOnce();

    const secondOrigin = await secondServer.listen();
    expect(runtime.window.constructions()).toBe(1);
    expect(runtime.downloads).toHaveLength(2);
    expect(secondOrigin).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);
    const retiredRequest = Object.assign(Readable.from([]), {
      method: "GET",
      url: "/sillymaker/records",
      headers: {},
      rawHeaders: [],
    }) as unknown as IncomingMessage;
    const retiredResponse = {
      statusCode: 0,
      setHeader: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;
    const retiredNext = vi.fn();
    firstServer.middlewares[0]?.(retiredRequest, retiredResponse, retiredNext);
    expect(retiredResponse.statusCode).toBe(503);
    expect(retiredNext).not.toHaveBeenCalled();
  });

  it("does not let an old native close request shut down a replacement generation", async () => {
    const runtime = createRuntimeHarnessV1();
    const input = {
      applicationId: "e2e",
      applicationLabel: "Engine Lab",
      intent: intentV1(),
      runtime: runtime.runtime,
    };
    const firstPlugin = createDesktopDevVitePluginInternalV1(input);
    const secondPlugin = createDesktopDevVitePluginInternalV1(input);
    const firstServer = createViteServerHarnessV1();
    await configurePluginV1(firstPlugin, firstServer.server);
    await firstServer.listen();

    const releaseFlush = runtime.window.instance().pauseFlush();
    runtime.window.instance().emitClose();
    await vi.waitFor(() => expect(runtime.operations).toContain("executeJs"));

    const secondServer = createViteServerHarnessV1();
    await configurePluginV1(secondPlugin, secondServer.server);
    await secondServer.listen();
    await firstServer.server.close();
    releaseFlush();
    await vi.waitFor(() => expect(runtime.operations).toContain("pausedFlush.done"));
    await Promise.resolve();
    expect(secondServer.closeCalls).not.toHaveBeenCalled();
    expect(runtime.downloads[1]?.close).not.toHaveBeenCalled();
    expect(runtime.exits).toEqual([]);

    runtime.window.instance().emitClose();
    await vi.waitFor(() => expect(runtime.exits).toEqual([0]));
    expect(secondServer.closeCalls).toHaveBeenCalledOnce();
  });

  it("flushes before fencing, drains an active private exchange, then closes and exits", async () => {
    const pendingRead = deferredV1<null>();
    const store = defaultStoreV1();
    store.read = vi.fn(() => pendingRead.promise);
    const runtime = createRuntimeHarnessV1(() => store);
    const plugin = createDesktopDevVitePluginInternalV1({
      applicationId: "e2e",
      applicationLabel: "Engine Lab",
      intent: intentV1(),
      runtime: runtime.runtime,
    });
    const vite = createViteServerHarnessV1();
    await configurePluginV1(plugin, vite.server);
    const origin = await vite.listen();
    const capability = capabilityFromHtmlV1(
      await transformHtmlV1(plugin, browserRuntimeHtmlV1()),
    );
    const active = rawRequestV1({
      origin,
      path: "/sillymaker/records/save/auto.current",
      headers: { "x-sillymaker-shell-capability": capability },
    });
    await vi.waitFor(() => expect(store.read).toHaveBeenCalledOnce());

    const prevented = runtime.window.instance().emitClose();
    await vi.waitFor(() => {
      expect(runtime.downloads[0]?.close).toHaveBeenCalledOnce();
    });
    expect(prevented).toHaveBeenCalledOnce();
    expect(runtime.operations.slice(0, 3)).toEqual([
      "preventDefault",
      "executeJs",
      "downloads.close",
    ]);
    expect(vite.closeCalls).not.toHaveBeenCalled();
    expect(runtime.exits).toEqual([]);
    await expect(rawRequestV1({ origin, path: "/sillymaker/records" })).resolves.toEqual({
      status: 503,
      body: "desktop host unavailable",
    });

    pendingRead.resolve(null);
    await expect(active).resolves.toMatchObject({ status: 404 });
    await vi.waitFor(() => expect(runtime.exits).toEqual([0]));
    expect(vite.closeCalls).toHaveBeenCalledOnce();
    expect(runtime.operations.at(-1)).toBe("exit");
  });

  it("keeps ingress and the process alive when renderer flush fails", async () => {
    const runtime = createRuntimeHarnessV1();
    const plugin = createDesktopDevVitePluginInternalV1({
      applicationId: "e2e",
      applicationLabel: "Engine Lab",
      intent: intentV1(),
      runtime: runtime.runtime,
    });
    const vite = createViteServerHarnessV1();
    await configurePluginV1(plugin, vite.server);
    const origin = await vite.listen();
    const capability = capabilityFromHtmlV1(await transformHtmlV1(plugin, browserRuntimeHtmlV1()));
    runtime.window.instance().failFlush = true;

    runtime.window.instance().emitClose();
    await vi.waitFor(() => expect(runtime.operations).toContain("executeJs"));
    expect(runtime.downloads[0]?.close).not.toHaveBeenCalled();
    expect(vite.closeCalls).not.toHaveBeenCalled();
    expect(runtime.exits).toEqual([]);
    await expect(rawRequestV1({
      origin,
      path: "/sillymaker/records",
      headers: { "x-sillymaker-shell-capability": capability },
    })).resolves.toMatchObject({ status: 200 });
  });

  it("does not exit when the Vite server close fails", async () => {
    const runtime = createRuntimeHarnessV1();
    const plugin = createDesktopDevVitePluginInternalV1({
      applicationId: "e2e",
      applicationLabel: "Engine Lab",
      intent: intentV1(),
      runtime: runtime.runtime,
    });
    const vite = createViteServerHarnessV1();
    await configurePluginV1(plugin, vite.server);
    const origin = await vite.listen();
    vite.closeCalls.mockRejectedValueOnce(new Error("close failed"));

    runtime.window.instance().emitClose();
    await vi.waitFor(() => expect(vite.closeCalls).toHaveBeenCalledOnce());
    expect(runtime.downloads[0]?.close).toHaveBeenCalledOnce();
    expect(runtime.exits).toEqual([]);
    await expect(rawRequestV1({ origin, path: "/sillymaker/records" })).resolves.toEqual({
      status: 503,
      body: "desktop host unavailable",
    });
  });
});

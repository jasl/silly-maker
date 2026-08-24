// SPDX-License-Identifier: MIT
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createDevSourcesMiddlewareV1,
  createDevSourcesOriginGuardV1,
  devSourcesPluginV1,
  resolveDevSourcePathV1,
} from "./dev-sources.ts";

let appRoot = "";

beforeAll(() => {
  appRoot = mkdtempSync(join(tmpdir(), "sillymaker-dev-sources-"));
  mkdirSync(join(appRoot, "src", "motions"), { recursive: true });
  writeFileSync(join(appRoot, "src", "motions", "enter.motion.json"), "{}\n");
  writeFileSync(join(appRoot, "outside.txt"), "outside\n");
  mkdirSync(join(appRoot, "node_modules", "pkg"), { recursive: true });
  writeFileSync(join(appRoot, "node_modules", "pkg", "index.js"), "//\n");
  symlinkSync(join(appRoot, "outside.txt"), join(appRoot, "src", "linked.txt"));
});

afterAll(() => {
  rmSync(appRoot, { recursive: true, force: true });
});

describe("resolveDevSourcePathV1", () => {
  it("resolves a regular file below the app root", () => {
    const resolution = resolveDevSourcePathV1(appRoot, "src/motions/enter.motion.json");
    expect(resolution.kind).toBe("file");
  });

  it("rejects traversal, absolute paths, node_modules, and symlinks", () => {
    expect(resolveDevSourcePathV1(appRoot, "../outside.txt").kind).toBe("not_found");
    expect(resolveDevSourcePathV1(appRoot, "/etc/hosts").kind).toBe("bad_request");
    expect(resolveDevSourcePathV1(appRoot, "node_modules/pkg/index.js").kind).toBe(
      "bad_request",
    );
    expect(resolveDevSourcePathV1(appRoot, "src/linked.txt").kind).toBe("not_found");
    expect(resolveDevSourcePathV1(appRoot, "src/motions").kind).toBe("not_found");
    expect(resolveDevSourcePathV1(appRoot, "").kind).toBe("bad_request");
  });
});

interface FakeResponseV1 {
  readonly response: ServerResponse;
  status(): number;
}

function fakeResponseV1(): FakeResponseV1 {
  const state = { statusCode: 0 };
  const response = {
    set statusCode(value: number) {
      state.statusCode = value;
    },
    get statusCode(): number {
      return state.statusCode;
    },
    end: () => {},
  } as unknown as ServerResponse;
  return { response, status: () => state.statusCode };
}

function requestV1(method: string, url: string): IncomingMessage {
  return { method, url } as IncomingMessage;
}

describe("createDevSourcesMiddlewareV1", () => {
  it("launches the editor for a valid POST and reports 204", () => {
    const launched: string[] = [];
    const middleware = createDevSourcesMiddlewareV1({
      appRoot,
      launch: (filePath) => launched.push(filePath),
    });
    const { response, status } = fakeResponseV1();
    middleware(
      requestV1("POST", "/__sillymaker/dev-sources/open?path=src%2Fmotions%2Fenter.motion.json"),
      response,
      () => {
        throw new Error("must not fall through");
      },
    );
    expect(status()).toBe(204);
    expect(launched).toEqual([join(appRoot, "src", "motions", "enter.motion.json")]);
  });

  it("rejects wrong methods, bad paths, and forwards unrelated urls", () => {
    const middleware = createDevSourcesMiddlewareV1({ appRoot, launch: () => {} });

    const wrongMethod = fakeResponseV1();
    middleware(
      requestV1("GET", "/__sillymaker/dev-sources/open?path=src%2Fmotions%2Fenter.motion.json"),
      wrongMethod.response,
      () => {},
    );
    expect(wrongMethod.status()).toBe(405);

    const missing = fakeResponseV1();
    middleware(
      requestV1("POST", "/__sillymaker/dev-sources/open?path=src%2Fnope.json"),
      missing.response,
      () => {},
    );
    expect(missing.status()).toBe(404);

    const noPath = fakeResponseV1();
    middleware(requestV1("POST", "/__sillymaker/dev-sources/open"), noPath.response, () => {});
    expect(noPath.status()).toBe(400);

    let forwarded = false;
    const unrelated = fakeResponseV1();
    middleware(requestV1("GET", "/assets/x.webp"), unrelated.response, () => {
      forwarded = true;
    });
    expect(forwarded).toBe(true);
  });
});

function guardedRequestV1(
  method: string,
  url: string,
  secFetchSite?: string,
): IncomingMessage {
  return {
    method,
    url,
    headers: secFetchSite === undefined ? {} : { "sec-fetch-site": secFetchSite },
  } as IncomingMessage;
}

describe("createDevSourcesOriginGuardV1", () => {
  const guard = createDevSourcesOriginGuardV1();
  const openUrl = "/__sillymaker/dev-sources/open?path=src%2Fmotions%2Fenter.motion.json";

  it("rejects cross-site and same-site browser requests to dev-sources endpoints", () => {
    for (const site of ["cross-site", "same-site"]) {
      for (
        const url of [
          openUrl,
          "/__sillymaker/dev-sources/regions-document",
          "/__sillymaker/dev-sources/chrome-layout",
          "/__sillymaker/dev-sources/motion",
          "/__sillymaker/dev-sources/scene",
          "/__sillymaker/dev-sources/scenes",
        ]
      ) {
        const { response, status } = fakeResponseV1();
        guard(guardedRequestV1("POST", url, site), response, () => {
          throw new Error("a cross-origin dev-sources request must not fall through");
        });
        expect(status()).toBe(403);
      }
    }
  });

  it("passes same-origin requests, direct navigations, and headerless callers", () => {
    for (const site of ["same-origin", "none", undefined]) {
      let forwarded = false;
      const { response } = fakeResponseV1();
      guard(guardedRequestV1("POST", openUrl, site), response, () => {
        forwarded = true;
      });
      expect(forwarded).toBe(true);
    }
  });

  it("stays out of the way for every non-dev-sources url", () => {
    for (
      const url of ["/assets/x.webp", "/__sillymaker/inspector/", "/src/main.tsx", undefined]
    ) {
      let forwarded = false;
      const { response } = fakeResponseV1();
      guard(
        { method: "GET", url, headers: { "sec-fetch-site": "cross-site" } } as IncomingMessage,
        response,
        () => {
          forwarded = true;
        },
      );
      expect(forwarded).toBe(true);
    }
  });
});

type DevMiddlewareV1 = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void;

async function createPluginHarnessV1() {
  const middlewares: DevMiddlewareV1[] = [];
  const watchers = new Map<string, (filePath: string) => void>();
  const watcher = {
    on(event: string, handler: (filePath: string) => void) {
      watchers.set(event, handler);
      return watcher;
    },
  };
  const plugin = devSourcesPluginV1(appRoot);
  const configureServer = plugin.configureServer;
  if (typeof configureServer !== "function") throw new Error("configureServer hook missing");
  await configureServer.call({} as never, {
    middlewares: { use: (middleware: DevMiddlewareV1) => middlewares.push(middleware) },
    watcher,
  } as never);

  return {
    emit(event: "add" | "change" | "unlink", filePath: string): void {
      const handler = watchers.get(event);
      if (handler === undefined) throw new Error(`${event} watcher missing`);
      handler(filePath);
    },
    getJson(url: string): unknown {
      let body = "";
      let statusCode = 0;
      const response = {
        set statusCode(value: number) {
          statusCode = value;
        },
        get statusCode(): number {
          return statusCode;
        },
        setHeader: () => {},
        end: (value?: unknown) => {
          body = value === undefined ? "" : String(value);
        },
      } as unknown as ServerResponse;
      let index = 0;
      const next = (): void => {
        const middleware = middlewares[index];
        index += 1;
        if (middleware === undefined) throw new Error(`no middleware handled ${url}`);
        middleware({ method: "GET", url, headers: {} } as IncomingMessage, response, next);
      };
      next();
      expect(statusCode).toBe(200);
      return JSON.parse(body) as unknown;
    },
  };
}

function sceneJsonV1(label: string): string {
  return `${
    JSON.stringify({
      format: "sillymaker.scene",
      version: 1,
      sceneId: "scene.test.live",
      label,
      canvas: { width: 1280, height: 720 },
      entries: [],
      cues: [],
    })
  }\n`;
}

describe("devSourcesPluginV1", () => {
  it("keeps list responses current through project watcher invalidation", async () => {
    const sceneDirectory = join(appRoot, "src", "scenes");
    const scenePath = join(sceneDirectory, "live.scene.json");
    mkdirSync(sceneDirectory, { recursive: true });
    rmSync(scenePath, { force: true });
    const harness = await createPluginHarnessV1();

    expect(harness.getJson("/__sillymaker/dev-sources/scenes")).toEqual({
      scenes: [],
      skipped: [],
    });

    writeFileSync(scenePath, sceneJsonV1("Added"));
    harness.emit("add", scenePath);
    expect(harness.getJson("/__sillymaker/dev-sources/scenes")).toMatchObject({
      scenes: [{ path: "src/scenes/live.scene.json", label: "Added" }],
    });

    writeFileSync(scenePath, sceneJsonV1("Changed"));
    harness.emit("change", scenePath);
    expect(harness.getJson("/__sillymaker/dev-sources/scenes")).toMatchObject({
      scenes: [{ path: "src/scenes/live.scene.json", label: "Changed" }],
    });

    rmSync(scenePath);
    harness.emit("unlink", scenePath);
    expect(harness.getJson("/__sillymaker/dev-sources/scenes")).toEqual({
      scenes: [],
      skipped: [],
    });
  });
});

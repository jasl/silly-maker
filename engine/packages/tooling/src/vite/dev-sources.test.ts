// SPDX-License-Identifier: MIT
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDevSourcesMiddlewareV1, resolveDevSourcePathV1 } from "./dev-sources.ts";

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

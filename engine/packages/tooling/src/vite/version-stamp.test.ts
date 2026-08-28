// SPDX-License-Identifier: MIT
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

import type { Plugin } from "vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  collectVersionStampV1,
  parseVersionStampReceiptInternalV1,
  serializeVersionStampReceiptInternalV1,
  versionStampPluginV1,
  versionStampReceiptEnvironmentKeyInternalV1,
} from "./version-stamp.ts";
import { createSillymakerAppViteConfigV1 } from "./app-vite-config.ts";

let appRoot = "";
let engineRoot = "";
beforeEach(async () => {
  appRoot = await mkdtemp(join(tmpdir(), "sillymaker-app-"));
  engineRoot = await mkdtemp(join(tmpdir(), "sillymaker-engine-"));
});
afterEach(async () => {
  await rm(appRoot, { recursive: true, force: true });
  await rm(engineRoot, { recursive: true, force: true });
});

async function writeEngineLinkV1(): Promise<void> {
  await writeFile(join(engineRoot, "package.json"), JSON.stringify({ version: "0.4.2" }));
  await mkdir(join(appRoot, "node_modules", "@sillymaker"), { recursive: true });
  await symlink(engineRoot, join(appRoot, "node_modules", "@sillymaker", "base"), "dir");
}

describe("collectVersionStampV1", () => {
  it("collects versions and commits from both sides", async () => {
    await writeFile(join(appRoot, "package.json"), JSON.stringify({ version: "1.2.0" }));
    await writeEngineLinkV1();
    const applicationCommit = "a".repeat(40);
    const engineCommit = "b".repeat(40);
    const calls: { readonly args: readonly string[]; readonly cwd: string }[] = [];
    const stamp = collectVersionStampV1({
      appRoot,
      runGit: (args, cwd) => {
        calls.push({ args, cwd });
        if (args[0] === "status") return "";
        return cwd.includes("sillymaker-app-") ? `${applicationCommit}\n` : `${engineCommit}\n`;
      },
    });
    expect(stamp).toEqual({
      applicationVersion: "1.2.0",
      applicationCommit,
      engineVersion: "0.4.2",
      engineCommit,
    });
    expect(calls.map((call) => call.args)).toEqual([
      ["rev-parse", "--verify", "HEAD"],
      ["status", "--porcelain=v1", "--untracked-files=normal"],
      ["rev-parse", "--verify", "HEAD"],
      ["status", "--porcelain=v1", "--untracked-files=normal"],
    ]);
  });

  it("suffixes full commits on dirty trees and fails closed when status is unavailable", async () => {
    await writeFile(join(appRoot, "package.json"), JSON.stringify({ version: "1.2.0" }));
    await writeEngineLinkV1();
    const applicationCommit = "a".repeat(40);
    const engineCommit = "b".repeat(40);
    const stamp = collectVersionStampV1({
      appRoot,
      runGit: (args, cwd) => {
        const isApp = cwd.includes("sillymaker-app-");
        if (args[0] === "status") {
          if (isApp) return " M src/application/ui.tsx\n?? notes.txt\n";
          throw new Error("status unavailable");
        }
        return isApp ? `${applicationCommit}\n` : `${engineCommit}\n`;
      },
    });
    expect(stamp.applicationCommit).toBe(`${applicationCommit}-dirty`);
    expect(stamp.engineCommit).toBeNull();
  });

  it.each([
    ["staged", "M  src/application.ts\n"],
    ["unstaged", " M src/application.ts\n"],
    ["untracked", "?? notes.txt\n"],
  ])("marks %s changes as dirty", async (_kind, status) => {
    await writeFile(join(appRoot, "package.json"), JSON.stringify({ version: "1.2.0" }));
    const commit = "c".repeat(64);
    const stamp = collectVersionStampV1({
      appRoot,
      runGit: (args) => (args[0] === "status" ? status : `${commit}\n`),
    });
    expect(stamp.applicationCommit).toBe(`${commit}-dirty`);
  });

  it("degrades every field to null without ever throwing", () => {
    const stamp = collectVersionStampV1({
      appRoot,
      runGit: () => {
        throw new Error("git not installed");
      },
    });
    expect(stamp).toEqual({
      applicationVersion: null,
      applicationCommit: null,
      engineVersion: null,
      engineCommit: null,
    });
  });

  it("rejects malformed versions and non-hash git output", async () => {
    await writeFile(join(appRoot, "package.json"), JSON.stringify({ version: "  " }));
    await writeEngineLinkV1();
    const stamp = collectVersionStampV1({
      appRoot,
      runGit: () => "fatal: not a git repository\n",
    });
    expect(stamp.applicationVersion).toBeNull();
    expect(stamp.applicationCommit).toBeNull();
    expect(stamp.engineVersion).toBe("0.4.2");
    expect(stamp.engineCommit).toBeNull();
  });

  it("does not borrow the application git commit for a registry-style engine install", async () => {
    await writeFile(join(appRoot, "package.json"), JSON.stringify({ version: "1.2.0" }));
    const installedEngine = join(appRoot, "node_modules", "@sillymaker", "base");
    await mkdir(installedEngine, { recursive: true });
    await writeFile(join(installedEngine, "package.json"), JSON.stringify({ version: "0.4.2" }));
    const applicationCommit = "a".repeat(40);
    const calls: string[] = [];

    const stamp = collectVersionStampV1({
      appRoot,
      runGit: (args, cwd) => {
        calls.push(cwd);
        if (args[0] === "status") return "";
        return `${applicationCommit}\n`;
      },
    });

    expect(stamp).toEqual({
      applicationVersion: "1.2.0",
      applicationCommit,
      engineVersion: "0.4.2",
      engineCommit: null,
    });
    expect(calls).toEqual([appRoot, appRoot]);
  });

  it("bounds package versions before embedding them", async () => {
    await writeFile(
      join(appRoot, "package.json"),
      JSON.stringify({ version: `ok\u0007${"x".repeat(129)}` }),
    );
    await writeEngineLinkV1();
    expect(
      collectVersionStampV1({
        appRoot,
        runGit: (args) => (args[0] === "status" ? "" : "a".repeat(40)),
      }).applicationVersion,
    ).toBeNull();
  });
});

describe("version stamp build receipt", () => {
  it("round-trips only bounded versions and full commit identities", () => {
    const applicationCommit = `${"a".repeat(40)}-dirty`;
    const serialized = serializeVersionStampReceiptInternalV1({
      applicationVersion: "1.2.0",
      applicationCommit,
      engineVersion: null,
      engineCommit: "b".repeat(64),
    });
    expect(parseVersionStampReceiptInternalV1(serialized)).toEqual({
      applicationVersion: "1.2.0",
      applicationCommit,
      engineVersion: null,
      engineCommit: "b".repeat(64),
    });
  });

  it("ignores malformed process-boundary receipts and commit paths", () => {
    expect(parseVersionStampReceiptInternalV1("{")).toBeNull();
    expect(
      parseVersionStampReceiptInternalV1(
        JSON.stringify({
          applicationVersion: "1.2.0",
          applicationCommit: "../../escape",
          engineVersion: null,
          engineCommit: null,
        }),
      ),
    ).toEqual({
      applicationVersion: "1.2.0",
      applicationCommit: null,
      engineVersion: null,
      engineCommit: null,
    });
  });

  it("makes the Vite page consume the supplied immutable Desktop receipt", async () => {
    const stamp = {
      applicationVersion: "1.2.0",
      applicationCommit: `${"a".repeat(40)}-dirty`,
      engineVersion: null,
      engineCommit: null,
    };
    const previous = process.env[versionStampReceiptEnvironmentKeyInternalV1];
    process.env[versionStampReceiptEnvironmentKeyInternalV1] =
      serializeVersionStampReceiptInternalV1(stamp);
    try {
      const config = await createSillymakerAppViteConfigV1({
        appRoot,
        config: {
          applicationId: "synthetic",
          label: "Synthetic",
          storyEntry: { module: "src/story.ts", exportName: "entryV1" },
          assetVerification: false,
          simulate: null,
          web: {
            applicationHtml: "index.html",
            applicationEntry: "src/entry.tsx",
            base: "./",
            sourcemap: false,
            identity: null,
            desktop: null,
          },
        },
      });
      const plugin = (config.plugins ?? []).find(
        (candidate) =>
          typeof candidate === "object" &&
          candidate !== null &&
          "name" in candidate &&
          candidate.name === "sillymaker:version-stamp",
      );
      if (plugin === undefined || plugin === null || typeof plugin !== "object") {
        throw new TypeError("missing version-stamp plugin");
      }
      const vitePlugin = plugin as Plugin;
      const transform = vitePlugin.transformIndexHtml;
      if (
        typeof transform !== "object" ||
        transform === null ||
        typeof transform.handler !== "function"
      ) {
        throw new TypeError("missing version-stamp post transform");
      }
      const transformed = await transform.handler.call(
        {} as never,
        "<html><head></head><body></body></html>",
        {} as never,
      ) as {
        readonly tags: readonly {
          readonly attrs?: Readonly<Record<string, string>>;
        }[];
      };
      const moduleUrl = transformed.tags[0]?.attrs?.src;
      if (moduleUrl === undefined) throw new TypeError("missing version-stamp module URL");
      const resolveId = vitePlugin.resolveId;
      const load = vitePlugin.load;
      if (typeof resolveId !== "function" || typeof load !== "function") {
        throw new TypeError("missing version-stamp virtual module hooks");
      }
      const resolvedId = await resolveId.call({} as never, moduleUrl, undefined, {} as never);
      if (typeof resolvedId !== "string") {
        throw new TypeError("version-stamp virtual module did not resolve");
      }
      const moduleSource = await load.call({} as never, resolvedId, {} as never);
      expect(moduleSource).toContain(`${"a".repeat(40)}-dirty`);
    } finally {
      if (previous === undefined) {
        delete process.env[versionStampReceiptEnvironmentKeyInternalV1];
      } else {
        process.env[versionStampReceiptEnvironmentKeyInternalV1] = previous;
      }
    }
  });
});

describe("versionStampPluginV1", () => {
  it("injects one parser-blocking external script before the application module", async () => {
    const plugin = versionStampPluginV1({
      applicationVersion: "1.0.0",
      applicationCommit: null,
      engineVersion: null,
      engineCommit: "def5678",
    });
    const transform = plugin.transformIndexHtml;
    if (
      typeof transform !== "object" ||
      transform === null ||
      typeof transform.handler !== "function"
    ) {
      throw new TypeError("expected a post HTML transform");
    }
    const transformed = await transform.handler.call(
      {} as never,
      "<html><head></head><body></body></html>",
      {} as never,
    ) as {
      readonly tags: readonly {
        readonly tag: string;
        readonly attrs?: Readonly<Record<string, string>>;
        readonly children?: string;
        readonly injectTo?: string;
      }[];
    };

    expect(transform.order).toBe("post");
    expect(transformed.tags).toEqual([
      {
        tag: "script",
        attrs: { src: expect.any(String) },
        injectTo: "head-prepend",
      },
    ]);
  });

  it("loads the supplied receipt only through its exact virtual module", async () => {
    const stamp = {
      applicationVersion: "</script>&\u2028\u2029",
      applicationCommit: null,
      engineVersion: null,
      engineCommit: null,
    };
    const plugin = versionStampPluginV1(stamp);
    const transform = plugin.transformIndexHtml;
    if (
      typeof transform !== "object" ||
      transform === null ||
      typeof transform.handler !== "function"
    ) {
      throw new TypeError("expected a post HTML transform");
    }
    const transformed = await transform.handler.call(
      {} as never,
      "<html><head></head><body></body></html>",
      {} as never,
    ) as {
      readonly tags: readonly { readonly attrs?: Readonly<Record<string, string>> }[];
    };
    const moduleUrl = transformed.tags[0]?.attrs?.src;
    if (moduleUrl === undefined) throw new TypeError("missing version-stamp module URL");
    const resolveId = plugin.resolveId;
    const load = plugin.load;
    if (typeof resolveId !== "function" || typeof load !== "function") {
      throw new TypeError("missing virtual module hooks");
    }

    expect(await resolveId.call({} as never, "/other.js", undefined, {} as never)).toBeNull();
    expect(await load.call({} as never, "\0other", {} as never)).toBeNull();
    const resolvedId = await resolveId.call({} as never, moduleUrl, undefined, {} as never);
    if (typeof resolvedId !== "string") throw new TypeError("virtual module did not resolve");
    const moduleSource = await load.call({} as never, resolvedId, {} as never);
    expect(moduleSource).toContain("globalThis.__SILLYMAKER_VERSIONS__ = ");
    expect(moduleSource).toContain("\\u003c/script>");
    expect(moduleSource).toContain("\\u0026");
    expect(moduleSource).toContain("\\u2028");
    expect(moduleSource).toContain("\\u2029");
  });
});

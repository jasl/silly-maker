// SPDX-License-Identifier: MIT
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  collectVersionStampV1,
  versionStampPluginV1,
  versionStampScriptV1,
} from "./version-stamp.ts";

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
      ["rev-parse", "--verify", "HEAD"],
    ]);
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
      runGit: (_args, cwd) => {
        calls.push(cwd);
        return `${applicationCommit}\n`;
      },
    });

    expect(stamp).toEqual({
      applicationVersion: "1.2.0",
      applicationCommit,
      engineVersion: "0.4.2",
      engineCommit: null,
    });
    expect(calls).toEqual([appRoot]);
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
        runGit: () => "a".repeat(40),
      }).applicationVersion,
    ).toBeNull();
  });
});

describe("versionStampScriptV1", () => {
  it("serializes the stamp for the page global", () => {
    const script = versionStampScriptV1({
      applicationVersion: "1.0.0",
      applicationCommit: null,
      engineVersion: null,
      engineCommit: "def5678",
    });
    expect(script).toContain("globalThis.__SILLYMAKER_VERSIONS__ = ");
    expect(script).toContain('"applicationVersion":"1.0.0"');
    expect(script).toContain('"applicationCommit":null');
  });

  it("escapes HTML/script delimiters and JavaScript line separators", () => {
    const stamp = {
      applicationVersion: "</script>&\u2028\u2029",
      applicationCommit: null,
      engineVersion: null,
      engineCommit: null,
    };
    const script = versionStampScriptV1(stamp);
    expect(script.match(/<\/script>/gu)).toHaveLength(1);
    expect(script).not.toContain('"</script>&');
    expect(script).not.toContain("&");
    expect(script).not.toContain("\u2028");
    expect(script).not.toContain("\u2029");
    expect(script).toContain("\\u003c/script>");
    expect(script).toContain("\\u0026");
    expect(script).toContain("\\u2028");
    expect(script).toContain("\\u2029");

    const transform = versionStampPluginV1(stamp).transformIndexHtml;
    if (typeof transform !== "function") throw new TypeError("expected an HTML transform");
    const transformed = (
      transform as unknown as (html: string) => {
        readonly tags: readonly { readonly children: string }[];
      }
    )("<html></html>") as {
      readonly tags: readonly { readonly children: string }[];
    };
    expect(transformed.tags[0]?.children).toContain("\\u003c/script>");
    expect(transformed.tags[0]?.children).not.toContain('"</script>&');
  });
});

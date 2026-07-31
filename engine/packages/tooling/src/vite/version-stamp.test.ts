// SPDX-License-Identifier: MIT
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectVersionStampV1, versionStampScriptV1 } from "./version-stamp.ts";

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
    const stamp = collectVersionStampV1({
      appRoot,
      runGit: (args, cwd) =>
        args[0] === "status" ? "" : cwd.includes("sillymaker-app-") ? "abc1234\n" : "def5678\n",
    });
    expect(stamp).toEqual({
      applicationVersion: "1.2.0",
      applicationCommit: "abc1234",
      engineVersion: "0.4.2",
      engineCommit: "def5678",
    });
  });

  it("suffixes -dirty on uncommitted changes; a failing probe keeps the plain commit", async () => {
    await writeFile(join(appRoot, "package.json"), JSON.stringify({ version: "1.2.0" }));
    await writeEngineLinkV1();
    const stamp = collectVersionStampV1({
      appRoot,
      runGit: (args, cwd) => {
        const isApp = cwd.includes("sillymaker-app-");
        if (args[0] === "status") {
          if (isApp) return " M src/application/ui.tsx\n?? notes.txt\n";
          throw new Error("status unavailable");
        }
        return isApp ? "abc1234\n" : "def5678\n";
      },
    });
    expect(stamp.applicationCommit).toBe("abc1234-dirty");
    expect(stamp.engineCommit).toBe("def5678");
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
});

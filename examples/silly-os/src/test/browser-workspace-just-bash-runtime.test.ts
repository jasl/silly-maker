// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  browserWorkspaceJustBashCommandAllowlistV1,
  browserWorkspaceJustBashExecutionProfileV1,
  browserWorkspaceJustBashLimitsV1,
  executeBrowserWorkspaceJustBashV1,
  type BrowserWorkspaceJustBashDirectoryEntryV1,
  type BrowserWorkspaceJustBashEntryMutationInputV1,
  type BrowserWorkspaceJustBashExecuteInputV1,
  type BrowserWorkspaceJustBashFileMetadataV1,
  type BrowserWorkspaceJustBashMutationInputV1,
  type BrowserWorkspaceJustBashMutationResultV1,
  type BrowserWorkspaceJustBashPathViewV1,
  type BrowserWorkspaceJustBashVolumePortV1,
} from "../workspace/browser-workspace-just-bash-runtime.ts";

const textEncoderV1 = new TextEncoder();
const textDecoderV1 = new TextDecoder();
const fakeMtimeMsV1 = 1_700_000_000_000;

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function parentPathV1(path: string): string {
  const separator = path.lastIndexOf("/");
  return separator < 0 ? "" : path.slice(0, separator);
}

interface FakeMutationV1 {
  readonly operation: "replace" | "append";
  readonly path: string;
  readonly bytes: Uint8Array;
}

class FakePersistentVolumeV1 implements BrowserWorkspaceJustBashVolumePortV1 {
  readonly files = new Map<string, Uint8Array>();
  readonly directories = new Set<string>([""]);
  readonly mutations: FakeMutationV1[] = [];
  readonly entryMutations: BrowserWorkspaceJustBashEntryMutationInputV1["operation"][] = [];
  failNextEntryMutation = false;
  failNextStat = false;
  readonly statKindOverrides = new Map<
    string,
    BrowserWorkspaceJustBashFileMetadataV1
  >();
  generation = 1;

  constructor(input: {
    readonly files?: Readonly<Record<string, string | Uint8Array>>;
    readonly directories?: readonly string[];
  } = {}) {
    for (const directory of input.directories ?? []) this.addDirectory(directory);
    for (const [path, content] of Object.entries(input.files ?? {})) {
      this.addDirectory(parentPathV1(path));
      this.files.set(
        path,
        typeof content === "string" ? textEncoderV1.encode(content) : content.slice(),
      );
    }
  }

  private addDirectory(path: string): void {
    if (path.length === 0) {
      this.directories.add("");
      return;
    }
    this.addDirectory(parentPathV1(path));
    this.directories.add(path);
  }

  private throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) throw new DOMException("Fake volume operation was aborted", "AbortError");
  }

  pathView(): BrowserWorkspaceJustBashPathViewV1 {
    return {
      generation: this.generation,
      entries: [
        ...[...this.directories]
          .filter((path) => path.length > 0)
          .map((path) => ({ path, kind: "directory" as const })),
        ...[...this.files.keys()].map((path) => ({ path, kind: "file" as const })),
      ].sort((left, right) => left.path.localeCompare(right.path)),
    };
  }

  text(path: string): string | null {
    const bytes = this.files.get(path);
    return bytes === undefined ? null : textDecoderV1.decode(bytes);
  }

  async stat(
    path: string,
    signal: AbortSignal,
  ): Promise<BrowserWorkspaceJustBashFileMetadataV1 | null> {
    this.throwIfAborted(signal);
    if (this.failNextStat) {
      this.failNextStat = false;
      throw new Error("injected persistent stat failure");
    }
    const override = this.statKindOverrides.get(path);
    if (override !== undefined) return override;
    if (this.directories.has(path)) return { kind: "directory", size: 0, mtimeMs: 0 };
    const bytes = this.files.get(path);
    return bytes === undefined
      ? null
      : { kind: "file", size: bytes.byteLength, mtimeMs: fakeMtimeMsV1 };
  }

  async list(
    path: string,
    signal: AbortSignal,
  ): Promise<readonly BrowserWorkspaceJustBashDirectoryEntryV1[]> {
    this.throwIfAborted(signal);
    if (!this.directories.has(path)) throw new Error(`ENOTDIR: ${path}`);
    const prefix = path.length === 0 ? "" : `${path}/`;
    const entries = new Map<string, "file" | "directory">();
    for (const directory of this.directories) {
      if (directory.length === 0 || !directory.startsWith(prefix)) continue;
      const remainder = directory.slice(prefix.length);
      if (remainder.length > 0 && !remainder.includes("/")) entries.set(remainder, "directory");
    }
    for (const file of this.files.keys()) {
      if (!file.startsWith(prefix)) continue;
      const remainder = file.slice(prefix.length);
      if (remainder.length > 0 && !remainder.includes("/")) entries.set(remainder, "file");
    }
    return [...entries]
      .map(([name, kind]) => ({ name, kind }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async read(path: string, signal: AbortSignal): Promise<Uint8Array> {
    this.throwIfAborted(signal);
    const bytes = this.files.get(path);
    if (bytes === undefined) throw new Error(`ENOENT: ${path}`);
    return bytes.slice();
  }

  async replace(
    input: BrowserWorkspaceJustBashMutationInputV1,
  ): Promise<BrowserWorkspaceJustBashMutationResultV1> {
    return await this.mutate("replace", input);
  }

  async append(
    input: BrowserWorkspaceJustBashMutationInputV1,
  ): Promise<BrowserWorkspaceJustBashMutationResultV1> {
    return await this.mutate("append", input);
  }

  async mutateEntry(
    input: BrowserWorkspaceJustBashEntryMutationInputV1,
  ): Promise<BrowserWorkspaceJustBashMutationResultV1> {
    this.throwIfAborted(input.signal);
    if (input.expectedGeneration !== this.generation) throw new Error("ESTALE: generation");
    if (this.failNextEntryMutation) {
      this.failNextEntryMutation = false;
      throw new Error("injected persistent namespace failure");
    }
    const parent = parentPathV1(input.path);
    if (!this.directories.has(parent)) throw new Error(`ENOENT: ${input.path}`);
    if (input.operation === "create_directory") {
      if (this.directories.has(input.path) || this.files.has(input.path)) {
        throw new Error(`EEXIST: ${input.path}`);
      }
      this.directories.add(input.path);
    } else if (input.operation === "remove_file") {
      if (!this.files.delete(input.path)) throw new Error(`ENOENT: ${input.path}`);
    } else {
      if (!this.directories.has(input.path)) throw new Error(`ENOENT: ${input.path}`);
      if (
        [...this.files.keys(), ...this.directories]
          .some((candidate) => candidate.startsWith(`${input.path}/`))
      ) throw new Error(`ENOTEMPTY: ${input.path}`);
      this.directories.delete(input.path);
    }
    this.entryMutations.push(input.operation);
    this.generation += 1;
    return { changed: true, generation: this.generation };
  }

  private async mutate(
    operation: "replace" | "append",
    input: BrowserWorkspaceJustBashMutationInputV1,
  ): Promise<BrowserWorkspaceJustBashMutationResultV1> {
    this.throwIfAborted(input.signal);
    if (input.expectedGeneration !== this.generation) throw new Error("ESTALE: generation");
    if (this.directories.has(input.path)) throw new Error(`EISDIR: ${input.path}`);
    if (!this.directories.has(parentPathV1(input.path))) throw new Error(`ENOENT: ${input.path}`);
    const existing = this.files.get(input.path);
    const next = operation === "replace" ? input.bytes.slice() : (() => {
      const prefix = existing ?? new Uint8Array();
      const combined = new Uint8Array(prefix.byteLength + input.bytes.byteLength);
      combined.set(prefix);
      combined.set(input.bytes, prefix.byteLength);
      return combined;
    })();
    const changed = existing === undefined || !bytesEqualV1(existing, next);
    this.mutations.push({ operation, path: input.path, bytes: input.bytes.slice() });
    if (changed) {
      this.files.set(input.path, next);
      this.generation += 1;
    }
    return { changed, generation: this.generation };
  }
}

function executeV1(
  volume: FakePersistentVolumeV1,
  command: string,
  overrides: Partial<
    Omit<BrowserWorkspaceJustBashExecuteInputV1, "command" | "volume" | "pathView">
  > = {},
) {
  return executeBrowserWorkspaceJustBashV1({
    command,
    cwd: "/workspace",
    environment: {},
    inheritEnv: true,
    pathView: volume.pathView(),
    volume,
    ...overrides,
  });
}

describe("SillyOS Browser workspace just-bash runtime", () => {
  it("publishes one exact terminal-aggregate Browser Local execution profile", () => {
    expect(Object.keys(browserWorkspaceJustBashExecutionProfileV1).sort()).toEqual([
      "commandAllowlist",
      "customCommandAllowlist",
      "limits",
      "outputMode",
      "provider",
      "revision",
    ]);
    expect(browserWorkspaceJustBashExecutionProfileV1).toEqual({
      revision: 1,
      provider: "browser_local_just_bash",
      outputMode: "terminal_aggregate",
      commandAllowlist: browserWorkspaceJustBashCommandAllowlistV1,
      customCommandAllowlist: ["qjs", "touch"],
      limits: browserWorkspaceJustBashLimitsV1,
    });
    expect(browserWorkspaceJustBashCommandAllowlistV1).toEqual([
      "basename",
      "cat",
      "cp",
      "cut",
      "dirname",
      "echo",
      "env",
      "false",
      "find",
      "grep",
      "head",
      "ls",
      "mkdir",
      "mv",
      "printenv",
      "printf",
      "pwd",
      "rg",
      "rm",
      "sed",
      "sleep",
      "sort",
      "stat",
      "tail",
      "tee",
      "tr",
      "true",
      "uniq",
      "wc",
    ]);
  });

  it("keeps network and optional script runtimes outside the shell command surface", async () => {
    const volume = new FakePersistentVolumeV1();

    for (const command of ["curl", "python", "python3", "js-exec", "gzip"]) {
      const result = await executeV1(volume, command);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(`${command} returned a Host failure instead of shell exit`);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain(command);
    }
    expect(volume.mutations).toEqual([]);
  });

  it("composes a pipeline and publishes persistent redirection effects", async () => {
    const volume = new FakePersistentVolumeV1({ directories: ["artifacts"] });

    const result = await executeV1(
      volume,
      "printf 'alpha\\nbeta\\n' | grep beta > artifacts/result.txt",
    );

    expect(result).toMatchObject({ ok: true, exitCode: 0, stdout: "", stderr: "" });
    expect(volume.text("artifacts/result.txt")).toBe("beta\n");
    expect(result.generation).toBe(volume.generation);
    expect(result.mutationAttempts).toBeGreaterThanOrEqual(1);
    expect(result.changedPaths).toEqual(["artifacts/result.txt"]);
  });

  it("reads the shared persistent bytes through find and rg without mutation", async () => {
    const volume = new FakePersistentVolumeV1({
      files: {
        "src/a.txt": "alpha\n",
        "src/b.txt": "beta\n",
      },
    });
    const generation = volume.generation;

    const findResult = await executeV1(volume, "find src -type f | sort");
    const rgResult = await executeV1(volume, "rg -n alpha src");

    expect(findResult).toMatchObject({ ok: true, exitCode: 0 });
    expect(findResult.stdout.trim().split("\n")).toEqual(["src/a.txt", "src/b.txt"]);
    expect(rgResult).toMatchObject({ ok: true, exitCode: 0 });
    expect(rgResult.stdout).toContain("src/a.txt");
    expect(rgResult.stdout).toContain("alpha");
    expect(volume.generation).toBe(generation);
    expect(volume.mutations).toEqual([]);
  });

  it("preserves binary bytes across the shared persistent mount", async () => {
    const bytes = new Uint8Array([0, 1, 10, 127, 128, 254, 255]);
    const volume = new FakePersistentVolumeV1({
      directories: ["artifacts"],
      files: { "inputs/raw.bin": bytes },
    });

    const result = await executeV1(volume, "cat inputs/raw.bin > artifacts/copied.bin");

    expect(result).toMatchObject({ ok: true, exitCode: 0 });
    expect(volume.files.get("artifacts/copied.bin")).toEqual(bytes);
  });

  it("uses the admitted cwd and per-call environment without ambient inheritance", async () => {
    const volume = new FakePersistentVolumeV1({ directories: ["src"] });

    const result = await executeV1(
      volume,
      'printf \'%s|%s|%s\' "$PWD" "$SILLY_VALUE" "${HOME:-unset}"',
      {
        cwd: "/workspace/src",
        environment: { SILLY_VALUE: "admitted" },
        inheritEnv: false,
      },
    );

    expect(result).toMatchObject({
      ok: true,
      exitCode: 0,
      stdout: "/workspace/src|admitted|unset",
      stderr: "",
    });
  });

  it("keeps shell support and /tmp ephemeral while retaining /workspace output", async () => {
    const volume = new FakePersistentVolumeV1({ directories: ["artifacts"] });

    const result = await executeV1(
      volume,
      "printf scratch > /tmp/scratch.txt; cat /tmp/scratch.txt; printf kept > artifacts/kept.txt",
    );

    expect(result).toMatchObject({ ok: true, exitCode: 0, stdout: "scratch" });
    expect(volume.text("artifacts/kept.txt")).toBe("kept");
    expect([...volume.files.keys()]).not.toContain("tmp/scratch.txt");
    expect(volume.mutations.every((mutation) => mutation.path.startsWith("artifacts/"))).toBe(true);
  });

  it("does not fabricate a Linux kernel identity", async () => {
    const volume = new FakePersistentVolumeV1();

    const result = await executeV1(volume, "cat /proc/version");

    expect(result.ok && result.exitCode).not.toBe(0);
    expect(result.stdout).not.toContain("Linux version");
    expect(result.stderr).toContain("/proc/version");
    expect(volume.mutations).toEqual([]);
  });

  it("supports find deletion while rejecting a missing parent without an extra effect", async () => {
    const volume = new FakePersistentVolumeV1({
      files: { "artifacts/keep.txt": "keep\n" },
    });
    const generation = volume.generation;

    const removeResult = await executeV1(volume, "find artifacts -type f -delete");
    const missingParentResult = await executeV1(volume, "printf no > missing/file.txt");

    expect(removeResult).toMatchObject({ ok: true, exitCode: 0 });
    expect(missingParentResult.ok && missingParentResult.exitCode).not.toBe(0);
    expect(volume.text("artifacts/keep.txt")).toBeNull();
    expect(volume.text("missing/file.txt")).toBeNull();
    expect(volume.generation).toBe(generation + 1);
    expect(removeResult.changedPaths).toEqual(["artifacts/keep.txt"]);
  });

  it("composes the admitted directory and file operations in one current path view", async () => {
    const volume = new FakePersistentVolumeV1();

    const result = await executeV1(
      volume,
      [
        "mkdir -p project/src project/out",
        "touch project/src/input.txt",
        "printf 'alpha\\n' > project/src/input.txt",
        "cp project/src/input.txt project/out/copy.txt",
        "mv project/out/copy.txt project/out/final.txt",
        "rm project/src/input.txt",
        "rm -r project/src",
        "find project | sort",
      ].join("; "),
    );

    expect(result).toMatchObject({
      ok: true,
      exitCode: 0,
      generation: 11,
      mutationAttempts: 11,
      changedPaths: [
        "project",
        "project/src",
        "project/out",
        "project/src/input.txt",
        "project/out/copy.txt",
        "project/out/final.txt",
      ],
    });
    expect(result.stdout.trim().split("\n")).toEqual([
      "project",
      "project/out",
      "project/out/final.txt",
    ]);
    expect(volume.text("project/out/final.txt")).toBe("alpha\n");
    expect(volume.text("project/out/copy.txt")).toBeNull();
    expect(volume.directories).toEqual(new Set(["", "project", "project/out"]));
  });

  it("keeps touch narrow and does not fabricate timestamp mutation", async () => {
    const volume = new FakePersistentVolumeV1({ files: { "existing.txt": "kept" } });
    const generation = volume.generation;

    const result = await executeV1(
      volume,
      "touch existing.txt; touch -c missing.txt; touch created.txt",
    );
    const unsupported = await executeV1(volume, "touch -d yesterday existing.txt");

    expect(result).toMatchObject({
      ok: true,
      exitCode: 0,
      generation: generation + 1,
      changedPaths: ["created.txt"],
    });
    expect(volume.text("existing.txt")).toBe("kept");
    expect(volume.text("missing.txt")).toBeNull();
    expect(volume.text("created.txt")).toBe("");
    expect(unsupported.ok && unsupported.exitCode).not.toBe(0);
    expect(unsupported.stderr).toContain("unsupported option");
    expect(volume.generation).toBe(generation + 1);
  });

  it("applies recursive copy, move, and removal as a durable best-effort sequence", async () => {
    const volume = new FakePersistentVolumeV1({
      files: {
        "tree/source/a.txt": "a",
        "tree/source/nested/b.txt": "b",
      },
    });

    const result = await executeV1(
      volume,
      [
        "cp -R tree/source tree/copied",
        "mv tree/copied tree/moved",
        "rm -rf tree/source",
        "find tree -type f | sort",
      ].join("; "),
    );

    expect(result).toMatchObject({ ok: true, exitCode: 0, generation: 17 });
    expect(result.stdout.trim().split("\n")).toEqual([
      "tree/moved/a.txt",
      "tree/moved/nested/b.txt",
    ]);
    expect(volume.text("tree/moved/a.txt")).toBe("a");
    expect(volume.text("tree/moved/nested/b.txt")).toBe("b");
    expect([...volume.files.keys()].some((path) => path.startsWith("tree/source/"))).toBe(false);
    expect([...volume.files.keys()].some((path) => path.startsWith("tree/copied/"))).toBe(false);
  });

  it("does not let rm force hide a persistent namespace failure", async () => {
    const volume = new FakePersistentVolumeV1({ files: { "keep.txt": "kept" } });
    volume.failNextEntryMutation = true;

    const result = await executeV1(volume, "rm -f keep.txt");

    expect(result).toMatchObject({
      ok: false,
      code: "unknown",
      generation: 1,
      mutationAttempts: 1,
      changedPaths: [],
    });
    expect(volume.text("keep.txt")).toBe("kept");
  });

  it("does not let rm force hide persistent stat failures or stale metadata", async () => {
    const unavailable = new FakePersistentVolumeV1({ files: { "keep.txt": "kept" } });
    unavailable.failNextStat = true;
    const failedStat = await executeV1(unavailable, "rm -f keep.txt");

    const stale = new FakePersistentVolumeV1({ files: { "keep.txt": "kept" } });
    stale.statKindOverrides.set("keep.txt", { kind: "directory", size: 0, mtimeMs: 0 });
    const staleStat = await executeV1(stale, "rm -f keep.txt");

    for (const result of [failedStat, staleStat]) {
      expect(result).toMatchObject({
        ok: false,
        code: "unknown",
        generation: 1,
        mutationAttempts: 0,
        changedPaths: [],
      });
    }
    expect(unavailable.text("keep.txt")).toBe("kept");
    expect(stale.text("keep.txt")).toBe("kept");
  });

  it("keeps a self move inert and rejects recursive copies into their own descendants", async () => {
    const volume = new FakePersistentVolumeV1({ files: { "tree/a.txt": "a" } });
    const generation = volume.generation;

    const move = await executeV1(volume, "mv tree/a.txt tree/a.txt");
    const copy = await executeV1(volume, "cp -R tree tree/descendant");

    expect(move).toMatchObject({ ok: true, exitCode: 0 });
    expect(copy.ok && copy.exitCode).not.toBe(0);
    expect(volume.generation).toBe(generation);
    expect(volume.text("tree/a.txt")).toBe("a");
    expect(volume.entryMutations).toEqual([]);
    expect(volume.mutations).toEqual([]);
  });

  it("distinguishes external abort, requested timeout, and an ordinary exit 124", async () => {
    const abortVolume = new FakePersistentVolumeV1();
    const controller = new AbortController();
    const aborted = executeV1(abortVolume, "sleep 5", { signal: controller.signal });
    setTimeout(() => controller.abort(), 5);

    await expect(aborted).resolves.toMatchObject({ ok: false, code: "aborted", exitCode: null });
    await expect(
      executeV1(new FakePersistentVolumeV1(), "sleep 5", { requestedTimeoutSeconds: 0.005 }),
    ).resolves.toMatchObject({ ok: false, code: "timeout", exitCode: null });
    await expect(executeV1(new FakePersistentVolumeV1(), "exit 124")).resolves.toMatchObject({
      ok: true,
      exitCode: 124,
    });
  });

  it("stops the 129th persistent mutation before its effect", async () => {
    const volume = new FakePersistentVolumeV1({ directories: ["artifacts"] });
    const command = Array.from(
      { length: 129 },
      () => "printf x >> artifacts/bounded.log",
    ).join("; ");

    const result = await executeV1(volume, command);

    expect(result).toMatchObject({ ok: false, code: "capacity_exceeded" });
    expect(result.mutationAttempts).toBe(128);
    expect(result.changedPaths).toEqual(["artifacts/bounded.log"]);
    // just-bash's append redirection performs one empty append and one content
    // append, so 64 complete shell redirections consume the 128 primitives.
    expect(volume.text("artifacts/bounded.log")).toBe("x".repeat(64));
    expect(volume.mutations).toHaveLength(128);
  });

  it("stops the 65th changed path with a capacity result", async () => {
    const volume = new FakePersistentVolumeV1({ directories: ["artifacts"] });
    const command = Array.from(
      { length: 65 },
      (_value, index) =>
        `printf x | tee artifacts/file-${String(index).padStart(2, "0")}.txt > /dev/null`,
    ).join("; ");

    const result = await executeV1(volume, command);

    expect(result).toMatchObject({ ok: false, code: "capacity_exceeded" });
    expect(result.mutationAttempts).toBe(65);
    expect(result.changedPaths).toHaveLength(64);
    expect(volume.mutations).toHaveLength(64);
    expect(volume.text("artifacts/file-64.txt")).toBeNull();
  });
});

// SPDX-License-Identifier: MIT
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createSyntheticCounterGamePackageV1 } from "@sillymaker/base/testkit";

import {
  parseVersionStampReceiptInternalV1,
  versionStampReceiptEnvironmentKeyInternalV1,
} from "../vite/version-stamp.ts";
import { runProjectCliV1 } from "./cli.ts";
import type {
  ProjectCommandRunnerV1,
  ProjectModuleLoaderV1,
  StoryDesktopOptionsV1,
} from "./commands.ts";
import {
  desktopArtifactStemInternalV1,
  desktopStoryApplicationV1,
  desktopStoryApplicationWithDependenciesInternalV1,
} from "./commands.ts";
import { defineSillymakerProjectV1 } from "./config.ts";

const projectV1 = defineSillymakerProjectV1({
  projectId: "project-test",
  applications: [
    {
      applicationId: "synthetic",
      label: "Synthetic counter",
      storyEntry: { module: "test/synthetic-story.ts", exportName: "entryV1" },
      assetVerification: false,
      simulate: { module: "test/synthetic-simulate.ts", exportName: "targetV1" },
      inspector: null,
      web: {
        storyRoot: "test",
        applicationHtml: "test/index.html",
        applicationEntry: "test/entry.tsx",
        outDir: "dist/synthetic",
        base: "./",
        sourcemap: false,
        identity: {
          module: "test/identity.mjs",
          collectExport: "collectV1",
          createPluginExport: "createPluginV1",
        },
        desktop: {
          name: "SyntheticApp",
          identifier: "dev.sillymaker.synthetic",
        },
      },
    },
  ],
});

const guiOnlyApplicationV1 = Object.freeze({
  ...projectV1.applications[0]!,
  applicationId: "gui-only",
  label: "GUI only",
  storyEntry: null,
  simulate: null,
  web: Object.freeze({
    ...projectV1.applications[0]!.web!,
    desktop: Object.freeze({
      name: "GuiOnlyApp",
      identifier: "dev.sillymaker.gui-only",
    }),
  }),
});

const mixedProjectV1 = defineSillymakerProjectV1({
  projectId: "project-test",
  applications: [...projectV1.applications, guiOnlyApplicationV1],
});

interface FakeRunnerLogV1 {
  readonly runs: {
    command: string;
    args: readonly string[];
    cwd: string;
    environment?: Readonly<Record<string, string>>;
  }[];
  readonly starts: { command: string; args: readonly string[]; killed: boolean }[];
  readonly writes: { path: string; contents: string }[];
  readonly copies: { source: string; destination: string }[];
  readonly removals: string[];
  readonly fileSizeChecks: string[];
}

function createFakeRunnerV1(input: {
  readonly exitCode?: number;
  readonly hostPlatform?: "darwin" | "windows" | "linux";
  readonly pages?: Readonly<Record<string, string>>;
  readonly files?: Readonly<Record<string, string>>;
  readonly binaryFiles?: Readonly<Record<string, Uint8Array>>;
  readonly nonRegularFiles?: readonly string[];
}): { readonly runner: ProjectCommandRunnerV1; readonly log: FakeRunnerLogV1 } {
  const log: FakeRunnerLogV1 = {
    runs: [],
    starts: [],
    writes: [],
    copies: [],
    removals: [],
    fileSizeChecks: [],
  };
  const runner: ProjectCommandRunnerV1 = {
    hostPlatform: input.hostPlatform ?? "darwin",
    run: (command, args, options) => {
      log.runs.push({
        command,
        args,
        cwd: options.cwd,
        ...(options.environment === undefined ? {} : { environment: options.environment }),
      });
      return Promise.resolve(input.exitCode ?? 0);
    },
    start(command, args) {
      const entry = { command, args, killed: false };
      log.starts.push(entry);
      return Object.freeze({
        kill: () => {
          entry.killed = true;
        },
      });
    },
    fetchText: (url) => {
      const body = input.pages?.[url];
      if (body === undefined) return Promise.reject(new Error("connection refused"));
      return Promise.resolve(Object.freeze({ status: 200, body }));
    },
    sleep: () => Promise.resolve(),
    readFile: (path) => {
      const body = input.files?.[path];
      if (body === undefined) return Promise.reject(new Error("missing file"));
      return Promise.resolve(body);
    },
    readFileBytes: (path) => {
      const body = input.binaryFiles?.[path];
      if (body === undefined) return Promise.reject(new Error("missing file"));
      return Promise.resolve(body);
    },
    fileSize: (path) => {
      log.fileSizeChecks.push(path);
      return Promise.resolve(
        input.nonRegularFiles?.includes(path) === true
          ? null
          : input.files?.[path] === undefined
          ? null
          : new TextEncoder().encode(input.files[path]).byteLength,
      );
    },
    writeFile: (path, contents) => {
      log.writes.push({ path, contents });
      return Promise.resolve();
    },
    copyDirectory: (source, destination) => {
      log.copies.push({ source, destination });
      return Promise.resolve();
    },
    copyFile: (source, destination) => {
      if (input.files?.[source] === undefined) {
        return Promise.reject(new Error(`missing copy source: ${source}`));
      }
      log.copies.push({ source, destination });
      return Promise.resolve();
    },
    removeDirectory: (path) => {
      log.removals.push(path);
      return Promise.resolve();
    },
  };
  return { runner: Object.freeze(runner), log };
}

/** Minimal RGBA-PNG encoder (filter 0) for the regions trace verb tests. */
async function encodeRgbaPngV1(
  width: number,
  height: number,
  alpha: readonly number[],
): Promise<Uint8Array> {
  const u32 = (value: number): number[] => [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
  const chunk = (type: string, data: readonly number[]): number[] => [
    ...u32(data.length),
    ...type.split("").map((char) => char.charCodeAt(0)),
    ...data,
    0,
    0,
    0,
    0,
  ];
  const raw: number[] = [];
  for (let y = 0; y < height; y += 1) {
    raw.push(0);
    for (let x = 0; x < width; x += 1) raw.push(0, 0, 0, alpha[y * width + x]!);
  }
  const stream = new Blob([new Uint8Array(raw) as BlobPart]).stream()
    .pipeThrough(new CompressionStream("deflate"));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...chunk("IHDR", [...u32(width), ...u32(height), 8, 6, 0, 0, 0]),
    ...chunk("IDAT", [...compressed]),
    ...chunk("IEND", []),
  ]);
}

const syntheticInvocationV1 = Object.freeze({ kind: "count" });

function createSyntheticSimulationTargetV1(options: { readonly seed?: number } = {}) {
  let count = 0;
  return Promise.resolve(
    Object.freeze({
      agent: Object.freeze({
        identity: () => Object.freeze({ storyId: "story.synthetic", seed: options.seed ?? null }),
        observe: () => Object.freeze({ count }),
        describeActions: () => Object.freeze([]),
        preview: () => Promise.resolve(Object.freeze({ kind: "allowed" })),
        dispatch: () => {
          count += 1;
          return Promise.resolve(Object.freeze({ kind: "committed" }));
        },
        waitForIdle: () => Promise.resolve(Object.freeze({ kind: "idle" })),
      }),
      stateDigest: () => `digest:${String(count)}`,
      dispose: () => Promise.resolve(Object.freeze({ kind: "disposed" })),
      defaultScript: Object.freeze([syntheticInvocationV1]),
      scenarios: Object.freeze({
        opening: Object.freeze([syntheticInvocationV1, syntheticInvocationV1]),
      }),
    }),
  );
}

const loaderV1: ProjectModuleLoaderV1 = Object.freeze({
  loadModule: async (path: string) => {
    if (path === "test/synthetic-story.ts") {
      return { entryV1: createSyntheticCounterGamePackageV1() };
    }
    if (path === "test/synthetic-simulate.ts") {
      return { targetV1: createSyntheticSimulationTargetV1 };
    }
    throw new Error(`no module at ${path}`);
  },
});

async function runV1(
  argv: readonly string[],
  runner?: ProjectCommandRunnerV1,
  project = projectV1,
) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runProjectCliV1({
    project,
    argv,
    loader: loaderV1,
    repositoryRoot: "/repo",
    ...(runner === undefined ? {} : { runner }),
    writeOut: (line) => out.push(line),
    writeErr: (line) => err.push(line),
  });
  return { code, out, err };
}

/** Shell templates the desktop verb stages from @sillymaker/tooling itself. */
function desktopShellFilesV1(): Record<string, string> {
  return {
    [fileURLToPath(new URL("../desktop/shell-main.ts", import.meta.url))]:
      'const appIdentifierV1 = "__SILLYMAKER_APP_IDENTIFIER__";\nconst distDirNameV1 = "__SILLYMAKER_DIST_DIR__";\n',
    [fileURLToPath(new URL("../desktop/application-bootstrap-html.mts", import.meta.url))]:
      "export const applicationBootstrapHtmlV1 = 1;\n",
    [fileURLToPath(new URL("../desktop/desktop-html.mts", import.meta.url))]:
      "export const desktopHtmlV1 = 1;\n",
    [fileURLToPath(new URL("../desktop/desktop-shell-arguments.mts", import.meta.url))]:
      "export const desktopShellArgumentsV1 = 1;\n",
    [fileURLToPath(new URL("../desktop/file-download-handler.mts", import.meta.url))]:
      "export const fileDownloadHandlerV1 = 1;\n",
    [fileURLToPath(new URL("../desktop/shell-http-admission.mts", import.meta.url))]:
      "export const shellHttpAdmissionV1 = 1;\n",
    [fileURLToPath(new URL("../desktop/record-file-store.mts", import.meta.url))]:
      "export const storeV1 = 1;\n",
    [fileURLToPath(new URL("../desktop/record-http-handler.mts", import.meta.url))]:
      "export const recordHttpHandlerV1 = 1;\n",
    [fileURLToPath(new URL("../desktop/shell-lifetime.mts", import.meta.url))]:
      "export const shellLifetimeV1 = 1;\n",
    [fileURLToPath(new URL("../desktop/static-file-path.mts", import.meta.url))]:
      "export const staticFilePathV1 = 1;\n",
  };
}

describe("runProjectCliV1", () => {
  it("prints inspect and check reports as JSON with exit code 0", async () => {
    const inspect = await runV1(["inspect", "synthetic"]);
    expect(inspect.code).toBe(0);
    expect(JSON.parse(inspect.out.join("\n"))).toMatchObject({ kind: "inspected" });

    const check = await runV1(["check", "--all"]);
    expect(check.code).toBe(0);
    expect(JSON.parse(check.out.join("\n"))).toEqual([
      { applicationId: "synthetic", ok: true, diagnostics: [] },
    ]);
  });

  it("skips GUI-only applications in check --all and rejects their Story commands", async () => {
    const all = await runV1(["check", "--all"], undefined, mixedProjectV1);
    expect(all.code).toBe(0);
    expect(JSON.parse(all.out.join("\n"))).toEqual([
      { applicationId: "synthetic", ok: true, diagnostics: [] },
    ]);

    for (const command of ["inspect", "check", "simulate"] as const) {
      const result = await runV1([command, "gui-only"], undefined, mixedProjectV1);
      expect(result.code).toBe(1);
      expect(JSON.parse(result.out.join("\n"))).toMatchObject({
        kind: "error",
        diagnostics: [{ code: "project.story_unconfigured" }],
      });
    }
  });

  it("keeps web and Desktop process verbs available to GUI-only applications", async () => {
    const build = createFakeRunnerV1({ exitCode: 0 });
    expect((await runV1(["build", "gui-only"], build.runner, mixedProjectV1)).code).toBe(0);

    const dev = createFakeRunnerV1({
      pages: Object.freeze({
        "http://127.0.0.1:41739/": '<div id="root"></div><script src="/test/entry.tsx"></script>',
      }),
    });
    expect((await runV1(["dev", "gui-only", "--smoke"], dev.runner, mixedProjectV1)).code)
      .toBe(0);

    const desktop = createFakeRunnerV1({
      files: Object.freeze({
        "/repo/test/dist-desktop/GuiOnlyApp.app/Contents/Info.plist": "<plist/>",
        ...desktopShellFilesV1(),
      }),
    });
    expect((await runV1(["desktop", "gui-only"], desktop.runner, mixedProjectV1)).code)
      .toBe(0);
  });

  it("prints structured diagnostics with exit code 1 for unknown applications", async () => {
    const result = await runV1(["check", "missing"]);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.out.join("\n"))).toMatchObject({
      kind: "error",
      diagnostics: [{ code: "project.application_unknown" }],
    });
    expect(result.err).toEqual([]);
  });

  it("simulate honors --scenario and --seed through the target factory", async () => {
    const result = await runV1(["simulate", "synthetic", "--scenario", "opening", "--seed", "7"]);
    expect(result.code).toBe(0);
    const report = JSON.parse(result.out.join("\n")) as {
      storyIdentity: { seed: number | null };
      steps: readonly unknown[];
      scenario: string | null;
      seed: number | null;
      finalStateDigest: string | null;
    };
    expect(report.storyIdentity.seed).toBe(7);
    expect(report.steps).toHaveLength(2);
    expect(report.scenario).toBe("opening");
    expect(report.seed).toBe(7);
    expect(report.finalStateDigest).toBe("digest:2");
  });

  it("diff prints a structured comparison of two JSON files", async () => {
    const runner = createFakeRunnerV1({
      files: {
        "/a.json": JSON.stringify({ cat: { trust: 10 }, flags: ["a"] }),
        "/b.json": JSON.stringify({ cat: { trust: 13 }, flags: ["a", "b"] }),
      },
    });
    const result = await runV1(["diff", "/a.json", "/b.json"], runner.runner);
    expect(result.code).toBe(0);
    const report = JSON.parse(result.out.join("\n")) as {
      identical: boolean;
      differences: readonly { kind: string; path: string }[];
    };
    expect(report.identical).toBe(false);
    expect(report.differences).toEqual([
      { kind: "changed", path: "/cat/trust", before: 10, after: 13 },
      { kind: "added", path: "/flags/1", after: "b" },
    ]);

    const missing = await runV1(["diff", "/a.json", "/missing.json"], runner.runner);
    expect(missing.code).toBe(1);
    const malformed = await runV1(["diff", "/a.json"], runner.runner);
    expect(malformed.code).toBe(2);
  });

  it("simulate rejects unknown scenarios with a structured diagnostic", async () => {
    const result = await runV1(["simulate", "synthetic", "--scenario", "ghost"]);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.out.join("\n"))).toMatchObject({
      kind: "error",
      diagnostics: [{ code: "project.simulation_scenario_unknown" }],
    });
  });

  it("build delegates to the web target through the injected runner", async () => {
    const fake = createFakeRunnerV1({ exitCode: 0 });
    const result = await runV1(["build", "synthetic"], fake.runner);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out.join("\n"))).toMatchObject({
      applicationId: "synthetic",
      ok: true,
      outDir: "dist/synthetic",
    });
    // The build runs the application's own Vite config from its directory.
    expect(fake.log.runs).toEqual([
      {
        command: "deno",
        args: ["run", "-A", "npm:vite", "build"],
        cwd: "/repo/test",
      },
    ]);
  });

  it("build --profile debug expands to sourcemap + no minify", async () => {
    const fake = createFakeRunnerV1({ exitCode: 0 });
    const result = await runV1(["build", "synthetic", "--profile", "debug"], fake.runner);
    expect(result.code).toBe(0);
    expect(fake.log.runs[0]?.args).toEqual([
      "run",
      "-A",
      "npm:vite",
      "build",
      "--sourcemap",
      "--minify",
      "false",
    ]);

    const invalid = await runV1(["build", "synthetic", "--profile", "fast"], fake.runner);
    expect(invalid.code).toBe(2);
  });

  it("build release forces sourcemaps off while an explicit flag overrides the profile", async () => {
    const release = createFakeRunnerV1({ exitCode: 0 });
    const releaseResult = await runV1(
      ["build", "synthetic", "--profile", "release"],
      release.runner,
    );
    expect(releaseResult.code).toBe(0);
    expect(release.log.runs[0]?.args).toEqual([
      "run",
      "-A",
      "npm:vite",
      "build",
      "--sourcemap",
      "false",
    ]);

    const overridden = createFakeRunnerV1({ exitCode: 0 });
    const overriddenResult = await runV1(
      ["build", "synthetic", "--profile", "release", "--sourcemap"],
      overridden.runner,
    );
    expect(overriddenResult.code).toBe(0);
    expect(overridden.log.runs[0]?.args).toEqual(["run", "-A", "npm:vite", "build", "--sourcemap"]);
  });

  it("dev --smoke boots the dev server, proves the page, and kills it", async () => {
    const fake = createFakeRunnerV1({
      pages: Object.freeze({
        "http://127.0.0.1:41739/": '<div id="root"></div><script src="/test/entry.tsx"></script>',
      }),
    });
    const result = await runV1(["dev", "synthetic", "--smoke"], fake.runner);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out.join("\n"))).toMatchObject({ ok: true });
    expect(fake.log.starts[0]?.args).toContain("npm:vite");
    expect(fake.log.starts[0]?.args).not.toContain("--mode");
    expect(fake.log.starts[0]?.killed).toBe(true);

    const plainDev = await runV1(["dev", "synthetic"], fake.runner);
    expect(plainDev.code).toBe(0);
    expect(fake.log.runs.at(-1)).toMatchObject({
      command: "deno",
      args: ["run", "-A", "npm:vite"],
      cwd: "/repo/test",
    });
  });

  it("prebuilt-smoke verifies the built artifact's referenced files", async () => {
    const fake = createFakeRunnerV1({
      files: Object.freeze({
        "/repo/dist/synthetic/index.html":
          '<script src="./assets/app.js"></script><link href="./assets/app.css" />',
        "/repo/dist/synthetic/assets/app.js": "js",
        "/repo/dist/synthetic/assets/app.css": "css",
      }),
    });
    const result = await runV1(["prebuilt-smoke", "synthetic"], fake.runner);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out.join("\n"))).toMatchObject({
      ok: true,
      checkedFiles: ["./assets/app.js", "./assets/app.css"],
      missingFiles: [],
    });

    const broken = createFakeRunnerV1({
      files: Object.freeze({
        "/repo/dist/synthetic/index.html": '<script src="./assets/app.js"></script>',
      }),
    });
    const failure = await runV1(["prebuilt-smoke", "synthetic"], broken.runner);
    expect(failure.code).toBe(1);
    expect(JSON.parse(failure.out.join("\n"))).toMatchObject({
      ok: false,
      missingFiles: ["./assets/app.js"],
    });
  });

  it("desktop stages the webview shell and invokes deno desktop", async () => {
    // The shell sources ship inside @sillymaker/tooling and are read from
    // the package itself, so packaging works from any application root.
    const fake = createFakeRunnerV1({
      files: Object.freeze({
        "/repo/test/dist-desktop/SyntheticApp.app/Contents/Info.plist": "<plist/>",
        ...desktopShellFilesV1(),
      }),
    });
    const result = await runV1(["desktop", "synthetic"], fake.runner);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out.join("\n"))).toMatchObject({
      ok: true,
      outputPath: "/repo/test/dist-desktop/SyntheticApp.app",
    });
    // The web build ran first, then deno desktop from the staging dir with
    // compile-time permissions and the static dist included in the VFS.
    expect(fake.log.runs.map((entry) => entry.command)).toEqual(["deno", "deno"]);
    expect(fake.log.runs[1]).toMatchObject({
      command: "deno",
      args: [
        "desktop",
        "--allow-env",
        "--allow-read",
        "--allow-write",
        "--allow-net",
        "--include",
        "dist",
        "--output",
        "../SyntheticApp.app",
        "main.ts",
      ],
      cwd: "/repo/test/dist-desktop/staging",
    });
    expect(fake.log.copies).toEqual([
      { source: "/repo/dist/synthetic", destination: "/repo/test/dist-desktop/staging/dist" },
    ]);
    const written = fake.log.writes.map((entry) => entry.path);
    expect(written).toContain("/repo/test/dist-desktop/staging/deno.json");
    expect(written).toContain("/repo/test/dist-desktop/staging/main.ts");
    expect(written).toContain(
      "/repo/test/dist-desktop/staging/application-bootstrap-html.mts",
    );
    expect(written).toContain("/repo/test/dist-desktop/staging/desktop-html.mts");
    expect(written).toContain("/repo/test/dist-desktop/staging/desktop-shell-arguments.mts");
    expect(written).toContain("/repo/test/dist-desktop/staging/record-file-store.mts");
    expect(written).toContain("/repo/test/dist-desktop/staging/file-download-handler.mts");
    expect(written).toContain("/repo/test/dist-desktop/staging/shell-http-admission.mts");
    expect(written).toContain("/repo/test/dist-desktop/staging/record-http-handler.mts");
    expect(written).toContain("/repo/test/dist-desktop/staging/shell-lifetime.mts");
    expect(written).toContain("/repo/test/dist-desktop/staging/static-file-path.mts");
    // The staged shell carries the application identity, not placeholders.
    const stagedMain = fake.log.writes.find((entry) => entry.path.endsWith("main.ts"));
    expect(stagedMain?.contents).toContain('"dev.sillymaker.synthetic"');
    expect(stagedMain?.contents).not.toContain("__SILLYMAKER_APP_IDENTIFIER__");
    const denoJson = fake.log.writes.find((entry) => entry.path.endsWith("deno.json"));
    expect(JSON.parse(denoJson?.contents ?? "{}")).toMatchObject({
      desktop: {
        app: { name: "SyntheticApp", identifier: "dev.sillymaker.synthetic" },
        backend: "webview",
      },
    });
  });

  it("desktop --target packages one output per triple with per-OS formats", async () => {
    const fake = createFakeRunnerV1({
      files: Object.freeze({
        "/repo/test/dist-desktop/SyntheticApp-x86_64-pc-windows-msvc.msi": "msi",
        "/repo/test/dist-desktop/SyntheticApp-aarch64-unknown-linux-gnu.AppImage": "appimage",
        ...desktopShellFilesV1(),
      }),
    });
    const result = await runV1(
      [
        "desktop",
        "synthetic",
        "--target",
        "x86_64-pc-windows-msvc",
        "--target",
        "aarch64-unknown-linux-gnu",
        "--compress=zstd",
        "--profile",
        "debug",
      ],
      fake.runner,
    );
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out.join("\n"))).toMatchObject({
      ok: true,
      outputPath: "/repo/test/dist-desktop/SyntheticApp-x86_64-pc-windows-msvc.msi",
      outputs: [
        {
          target: "x86_64-pc-windows-msvc",
          outputPath: "/repo/test/dist-desktop/SyntheticApp-x86_64-pc-windows-msvc.msi",
          ok: true,
        },
        {
          target: "aarch64-unknown-linux-gnu",
          outputPath: "/repo/test/dist-desktop/SyntheticApp-aarch64-unknown-linux-gnu.AppImage",
          ok: true,
        },
      ],
    });
    // Profile debug reaches the inner web build; each triple gets its own
    // deno desktop invocation with the target and compression forwarded.
    expect(fake.log.runs[0]?.args).toEqual([
      "run",
      "-A",
      "npm:vite",
      "build",
      "--sourcemap",
      "--minify",
      "false",
    ]);
    expect(fake.log.runs[1]?.args).toEqual([
      "desktop",
      "--allow-env",
      "--allow-read",
      "--allow-write",
      "--allow-net",
      "--include",
      "dist",
      "--compress=zstd",
      "--target",
      "x86_64-pc-windows-msvc",
      "--output",
      "../SyntheticApp-x86_64-pc-windows-msvc.msi",
      "main.ts",
    ]);
    expect(fake.log.runs[2]?.args).toEqual([
      "desktop",
      "--allow-env",
      "--allow-read",
      "--allow-write",
      "--allow-net",
      "--include",
      "dist",
      "--compress=zstd",
      "--target",
      "aarch64-unknown-linux-gnu",
      "--output",
      "../SyntheticApp-aarch64-unknown-linux-gnu.AppImage",
      "main.ts",
    ]);

    const unknownTriple = await runV1(
      ["desktop", "synthetic", "--target", "riscv64-unknown-linux-gnu"],
      fake.runner,
    );
    expect(unknownTriple.code).toBe(2);

    const unsupportedAtFloor = await runV1(
      ["desktop", "synthetic", "--target", "aarch64-pc-windows-msvc"],
      fake.runner,
    );
    expect(unsupportedAtFloor.code).toBe(2);
  });

  it("desktop rejects a duplicate explicit target before building", async () => {
    const fake = createFakeRunnerV1({ exitCode: 0 });
    const result = await runV1(
      [
        "desktop",
        "synthetic",
        "--target",
        "x86_64-apple-darwin",
        "--target",
        "x86_64-apple-darwin",
      ],
      fake.runner,
    );
    expect(result.code).toBe(1);
    expect(JSON.parse(result.out.join("\n"))).toMatchObject({
      kind: "error",
      diagnostics: [{ code: "project.desktop_target_duplicate" }],
    });
    expect(fake.log.runs).toEqual([]);
  });

  it.each(
    [
      [
        "unsupported target",
        { targets: ["riscv64-unknown-linux-gnu"] },
        "project.desktop_target_unsupported",
      ],
      [
        "unsupported compression",
        { compress: "brotli" },
        "project.desktop_compression_unsupported",
      ],
    ] as const,
  )(
    "desktop rejects programmatic %s options before mutating output",
    async (_caseName, rawOptions, diagnosticCode) => {
      const fake = createFakeRunnerV1({ exitCode: 0 });

      await expect(
        desktopStoryApplicationV1(
          projectV1,
          "synthetic",
          { runner: fake.runner, repositoryRoot: "/repo" },
          rawOptions as unknown as StoryDesktopOptionsV1,
        ),
      ).rejects.toMatchObject({
        diagnostics: [{ code: diagnosticCode }],
      });
      expect(fake.log.runs).toEqual([]);
      expect(fake.log.copies).toEqual([]);
      expect(fake.log.removals).toEqual([]);
    },
  );

  it.each(
    [
      ["darwin", "SyntheticApp.app", "/Contents/Info.plist", true],
      ["windows", "SyntheticApp.msi", "", false],
      ["linux", "SyntheticApp.AppImage", "", false],
    ] as const,
  )(
    "desktop host output follows %s and admits the macOS icon only on darwin",
    async (hostPlatform, outputName, markerSuffix, expectsIcon) => {
      const projectWithIconV1 = defineSillymakerProjectV1({
        projectId: "project-host-icon-test",
        applications: [
          {
            ...projectV1.applications[0]!,
            web: {
              ...projectV1.applications[0]!.web!,
              desktop: {
                name: "SyntheticApp",
                identifier: "dev.sillymaker.synthetic",
                icon: "test/icon.png",
              },
            },
          },
        ],
      });
      const outputPath = `/repo/test/dist-desktop/${outputName}`;
      const fake = createFakeRunnerV1({
        hostPlatform,
        files: Object.freeze({
          [`${outputPath}${markerSuffix}`]: "bundle",
          ...(expectsIcon ? { "/repo/test/icon.png": "icon" } : {}),
          ...desktopShellFilesV1(),
        }),
      });
      const result = await runV1(["desktop", "synthetic"], fake.runner, projectWithIconV1);
      expect(result.code).toBe(0);
      expect(JSON.parse(result.out.join("\n"))).toMatchObject({ outputPath });
      const desktopRun = fake.log.runs[1];
      expect(desktopRun?.args).toContain(`../${outputName}`);
      expect(desktopRun?.args.includes("--icon")).toBe(expectsIcon);
      expect(fake.log.copies.some((copy) => copy.destination.endsWith("/icon.png"))).toBe(
        expectsIcon,
      );
    },
  );

  it("desktop does not read a Darwin-only icon for only Linux and Windows targets", async () => {
    const projectWithIconV1 = defineSillymakerProjectV1({
      projectId: "project-non-darwin-icon-test",
      applications: [
        {
          ...projectV1.applications[0]!,
          web: {
            ...projectV1.applications[0]!.web!,
            desktop: {
              name: "SyntheticApp",
              identifier: "dev.sillymaker.synthetic",
              icon: "test/missing-icon.png",
            },
          },
        },
      ],
    });
    const fake = createFakeRunnerV1({
      files: Object.freeze({
        "/repo/test/dist-desktop/SyntheticApp-x86_64-pc-windows-msvc.msi": "msi",
        "/repo/test/dist-desktop/SyntheticApp-aarch64-unknown-linux-gnu.AppImage": "appimage",
        ...desktopShellFilesV1(),
      }),
    });

    const result = await runV1(
      [
        "desktop",
        "synthetic",
        "--target",
        "x86_64-pc-windows-msvc",
        "--target",
        "aarch64-unknown-linux-gnu",
      ],
      fake.runner,
      projectWithIconV1,
    );

    expect(result.code).toBe(0);
    expect(fake.log.copies.some((copy) => copy.destination.endsWith("/icon.png"))).toBe(false);
    expect(fake.log.fileSizeChecks).not.toContain("/repo/test/missing-icon.png");
  });

  it.each(
    [
      ["missing", undefined, undefined],
      ["empty", "", undefined],
      ["non-regular", "directory marker", ["/repo/test/icon.png"]],
    ] as const,
  )(
    "desktop rejects a %s Darwin icon before building or mutating output",
    async (_caseName, iconContents, nonRegularFiles) => {
      const projectWithIconV1 = defineSillymakerProjectV1({
        projectId: "project-invalid-icon-test",
        applications: [
          {
            ...projectV1.applications[0]!,
            web: {
              ...projectV1.applications[0]!.web!,
              desktop: {
                name: "SyntheticApp",
                identifier: "dev.sillymaker.synthetic",
                icon: "test/icon.png",
              },
            },
          },
        ],
      });
      const fake = createFakeRunnerV1({
        files: Object.freeze({
          ...(iconContents === undefined ? {} : { "/repo/test/icon.png": iconContents }),
          ...desktopShellFilesV1(),
        }),
        ...(nonRegularFiles === undefined ? {} : { nonRegularFiles }),
      });

      const result = await runV1(["desktop", "synthetic"], fake.runner, projectWithIconV1);

      expect(result.code).toBe(1);
      expect(JSON.parse(result.out.join("\n"))).toMatchObject({
        kind: "error",
        diagnostics: [{ code: "project.desktop_icon_invalid" }],
      });
      expect(fake.log.runs).toEqual([]);
      expect(fake.log.copies).toEqual([]);
      expect(fake.log.removals).toEqual([]);
      expect(fake.log.fileSizeChecks).toEqual(["/repo/test/icon.png"]);
    },
  );

  it("desktop forwards the .png/.icns icon only to darwin targets", async () => {
    const projectWithIconV1 = defineSillymakerProjectV1({
      projectId: "project-icon-test",
      applications: [
        {
          ...projectV1.applications[0]!,
          web: {
            ...projectV1.applications[0]!.web!,
            desktop: {
              name: "SyntheticApp",
              identifier: "dev.sillymaker.synthetic",
              icon: "test/icon.png",
            },
          },
        },
      ],
    });
    const fake = createFakeRunnerV1({
      files: Object.freeze({
        "/repo/test/dist-desktop/SyntheticApp-aarch64-apple-darwin.app/Contents/Info.plist":
          "<plist/>",
        "/repo/test/dist-desktop/SyntheticApp-x86_64-pc-windows-msvc.msi": "msi",
        "/repo/test/icon.png": "icon",
        ...desktopShellFilesV1(),
      }),
    });
    const result = await runV1(
      [
        "desktop",
        "synthetic",
        "--target",
        "aarch64-apple-darwin",
        "--target",
        "x86_64-pc-windows-msvc",
      ],
      fake.runner,
      projectWithIconV1,
    );
    expect(result.code).toBe(0);
    const darwinRun = fake.log.runs[1];
    const windowsRun = fake.log.runs[2];
    expect(darwinRun?.args).toContain("--icon");
    expect(windowsRun?.args).not.toContain("--icon");
  });

  it("desktop artifact names carry the app version and commit when known", async () => {
    const fullCommit = "a".repeat(40);
    const stampV1 = Object.freeze({
      applicationVersion: "0.1.0",
      applicationCommit: `${fullCommit}-dirty`,
      engineVersion: null,
      engineCommit: null,
    });
    const fake = createFakeRunnerV1({
      files: Object.freeze({
        "/repo/test/dist-desktop/SyntheticApp-0_1_0-aaaaaaa-dirty-x86_64-pc-windows-msvc.msi":
          "msi",
        ...desktopShellFilesV1(),
      }),
    });
    const seenAppRoots: string[] = [];
    const report = await desktopStoryApplicationWithDependenciesInternalV1(
      projectV1,
      "synthetic",
      {
        runner: fake.runner,
        repositoryRoot: "/repo",
        collectVersionStamp: ({ appRoot }: { readonly appRoot: string }) => {
          seenAppRoots.push(appRoot);
          return stampV1;
        },
      },
      { targets: ["x86_64-pc-windows-msvc"] },
    );
    expect(seenAppRoots).toEqual(["/repo/test"]);
    expect(report).toMatchObject({
      ok: true,
      outputPath:
        "/repo/test/dist-desktop/SyntheticApp-0_1_0-aaaaaaa-dirty-x86_64-pc-windows-msvc.msi",
    });
    expect(fake.log.runs[1]?.args).toContain(
      "../SyntheticApp-0_1_0-aaaaaaa-dirty-x86_64-pc-windows-msvc.msi",
    );
    expect(
      parseVersionStampReceiptInternalV1(
        fake.log.runs[0]?.environment?.[versionStampReceiptEnvironmentKeyInternalV1],
      ),
    ).toEqual(stampV1);

    // The host preview carries the same stem; a commit without a version
    // (or vice versa) keeps only the known part.
    const hostFake = createFakeRunnerV1({
      files: Object.freeze({
        "/repo/test/dist-desktop/SyntheticApp-aaaaaaa-dirty.app/Contents/Info.plist": "<plist/>",
        ...desktopShellFilesV1(),
      }),
    });
    const hostReport = await desktopStoryApplicationWithDependenciesInternalV1(
      projectV1,
      "synthetic",
      {
        runner: hostFake.runner,
        repositoryRoot: "/repo",
        collectVersionStamp: () => ({ ...stampV1, applicationVersion: null }),
      },
    );
    expect(hostReport).toMatchObject({
      ok: true,
      outputPath: "/repo/test/dist-desktop/SyntheticApp-aaaaaaa-dirty.app",
    });
  });

  it("bounds and sanitizes package-internal desktop artifact diagnostics", () => {
    const stampV1 = (applicationVersion: string | null, applicationCommit: string | null) =>
      Object.freeze({
        applicationVersion,
        applicationCommit,
        engineVersion: null,
        engineCommit: null,
      });
    expect(
      desktopArtifactStemInternalV1("App", stampV1("1.0.0-rc.1", `${"b".repeat(64)}-dirty`)),
    ).toBe("App-1_0_0-rc_1-bbbbbbb-dirty");
    expect(desktopArtifactStemInternalV1("App", stampV1("0.0.0", null))).toBe("App-0_0_0");
    expect(desktopArtifactStemInternalV1("App", stampV1(null, "../../escape"))).toBe("App");
    expect(desktopArtifactStemInternalV1("App", stampV1("///", null))).toBe("App");
    expect(desktopArtifactStemInternalV1("App", stampV1("x".repeat(65), null))).toBe("App");
    expect(desktopArtifactStemInternalV1("App", stampV1(null, null))).toBe("App");
  });

  it("regions trace writes a traced regions document and reports it", async () => {
    // 4x4 RGBA PNG with an opaque 2x2 square at (1,1); default bottom-center
    // anchor subtracts (2, 4) from every traced coordinate.
    const alpha = [0, 0, 0, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 0, 0, 0];
    const fake = createFakeRunnerV1({
      binaryFiles: { "/art/zone-a.png": await encodeRgbaPngV1(4, 4, alpha) },
    });
    const result = await runV1(
      ["regions", "trace", "/art/zone-a.png", "--out", "/story/zone-a.regions.json"],
      fake.runner,
    );
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out.join("\n"))).toMatchObject({
      kind: "traced",
      image: "/art/zone-a.png",
      out: "/story/zone-a.regions.json",
      regionsId: "regions.zone-a",
      regionId: "region-1",
      imageWidth: 4,
      imageHeight: 4,
      contourVertexCount: 4,
      vertexCount: 4,
      box: { x: -1, y: -3, width: 2, height: 2 },
    });
    const write = fake.log.writes[0]!;
    expect(write.path).toBe("/story/zone-a.regions.json");
    const written = JSON.parse(write.contents) as {
      regions: readonly { polygonPoints: readonly unknown[] }[];
    };
    expect(written).toMatchObject({
      format: "sillymaker.regions",
      version: 1,
      regionsId: "regions.zone-a",
      label: "zone-a",
      authoring: { status: "generated" },
    });
    expect(written.regions[0]!.polygonPoints).toEqual([
      { x: -1, y: -3 },
      { x: 1, y: -3 },
      { x: 1, y: -1 },
      { x: -1, y: -1 },
    ]);
  });

  it("regions trace honors explicit ids, names, and anchors", async () => {
    const fake = createFakeRunnerV1({
      binaryFiles: { "/art/pose.png": await encodeRgbaPngV1(2, 2, [255, 255, 255, 255]) },
    });
    const result = await runV1(
      [
        "regions",
        "trace",
        "/art/pose.png",
        "--out",
        "/story/pose.regions.json",
        "--regions-id",
        "regions.app.pose",
        "--label",
        "Pose zones",
        "--region-id",
        "zone.body",
        "--region-name",
        "Body",
        "--anchor-x",
        "0",
        "--anchor-y",
        "0",
        "--alpha-threshold",
        "200",
        "--max-vertices",
        "16",
      ],
      fake.runner,
    );
    expect(result.code).toBe(0);
    expect(JSON.parse(fake.log.writes[0]!.contents)).toMatchObject({
      regionsId: "regions.app.pose",
      label: "Pose zones",
      regions: [
        {
          regionId: "zone.body",
          accessibleNameText: "Body",
          x: 0,
          y: 0,
          width: 2,
          height: 2,
        },
      ],
    });
  });

  it("regions trace refuses to overwrite unless --force is passed", async () => {
    const png = await encodeRgbaPngV1(1, 1, [255]);
    const argv = ["regions", "trace", "/art/dot.png", "--out", "/story/dot.regions.json"];
    const fake = createFakeRunnerV1({
      binaryFiles: { "/art/dot.png": png },
      files: { "/story/dot.regions.json": "{}" },
    });
    const refused = await runV1(argv, fake.runner);
    expect(refused.code).toBe(1);
    expect(JSON.parse(refused.out.join("\n"))).toMatchObject({
      kind: "error",
      diagnostics: [{ code: "regions.trace_output_exists" }],
    });
    expect(fake.log.writes).toEqual([]);

    const forced = await runV1([...argv, "--force"], fake.runner);
    expect(forced.code).toBe(0);
    expect(fake.log.writes).toHaveLength(1);
  });

  it("regions trace surfaces image and flag problems distinctly", async () => {
    const fake = createFakeRunnerV1({
      binaryFiles: { "/art/not-png.bin": new Uint8Array([1, 2, 3]) },
    });
    const notPng = await runV1(
      ["regions", "trace", "/art/not-png.bin", "--out", "/story/x.regions.json"],
      fake.runner,
    );
    expect(notPng.code).toBe(1);
    expect(JSON.parse(notPng.out.join("\n"))).toMatchObject({
      diagnostics: [{
        code: "regions.trace_image_invalid",
        details: { reason: "signature_invalid" },
      }],
    });

    const missing = await runV1(
      ["regions", "trace", "/art/absent.png", "--out", "/story/x.regions.json"],
      fake.runner,
    );
    expect(missing.code).toBe(1);
    expect(missing.err[0]).toContain('could not read "/art/absent.png"');

    const noOut = await runV1(["regions", "trace", "/art/not-png.bin"], fake.runner);
    expect(noOut.code).toBe(2);
    expect(noOut.err[0]).toContain("usage: app regions trace");

    const badThreshold = await runV1(
      [
        "regions",
        "trace",
        "/art/not-png.bin",
        "--out",
        "/story/x.regions.json",
        "--alpha-threshold",
        "0",
      ],
      fake.runner,
    );
    expect(badThreshold.code).toBe(2);

    const badSuffix = await runV1(
      ["regions", "trace", "/art/not-png.bin", "--out", "/story/x.json"],
      fake.runner,
    );
    expect(badSuffix.code).toBe(2);
    expect(badSuffix.err[0]).toContain(".regions.json");

    const badStem = await runV1(
      ["regions", "trace", "/art/not-png.bin", "--out", "/story/Zone A.regions.json"],
      fake.runner,
    );
    expect(badStem.code).toBe(2);
    expect(badStem.err[0]).toContain("lowercase");
  });

  it("answers usage errors on stderr with exit code 2", async () => {
    const missing = await runV1(["inspect"]);
    expect(missing.code).toBe(2);
    expect(missing.err[0]).toContain("usage:");

    const unknown = await runV1(["frobnicate", "synthetic"]);
    expect(unknown.code).toBe(2);
  });
});

// SPDX-License-Identifier: MIT
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createSyntheticCounterGamePackageV1 } from "@sillymaker/base/testkit";

import { runProjectCliV1 } from "./cli.ts";
import type {
  ProjectCommandRunnerV1,
  ProjectModuleLoaderV1,
  StoryDesktopOptionsV1,
} from "./commands.ts";
import { desktopStoryApplicationV1 } from "./commands.ts";
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

interface FakeRunnerLogV1 {
  readonly runs: { command: string; args: readonly string[]; cwd: string }[];
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
      log.runs.push({ command, args, cwd: options.cwd });
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
    [fileURLToPath(new URL("../desktop/desktop-html.mts", import.meta.url))]:
      "export const desktopHtmlV1 = 1;\n",
    [fileURLToPath(new URL("../desktop/file-download-handler.mts", import.meta.url))]:
      "export const fileDownloadHandlerV1 = 1;\n",
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
    expect(plainDev.code).toBe(2);
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
    expect(written).toContain("/repo/test/dist-desktop/staging/desktop-html.mts");
    expect(written).toContain("/repo/test/dist-desktop/staging/record-file-store.mts");
    expect(written).toContain("/repo/test/dist-desktop/staging/file-download-handler.mts");
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

  it.each([
    [
      "unsupported target",
      { targets: ["riscv64-unknown-linux-gnu"] },
      "project.desktop_target_unsupported",
    ],
    ["unsupported compression", { compress: "brotli" }, "project.desktop_compression_unsupported"],
  ] as const)(
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

  it.each([
    ["darwin", "SyntheticApp.app", "/Contents/Info.plist", true],
    ["windows", "SyntheticApp.msi", "", false],
    ["linux", "SyntheticApp.AppImage", "", false],
  ] as const)(
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

  it.each([
    ["missing", undefined, undefined],
    ["empty", "", undefined],
    ["non-regular", "directory marker", ["/repo/test/icon.png"]],
  ] as const)(
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

  it("answers usage errors on stderr with exit code 2", async () => {
    const missing = await runV1(["inspect"]);
    expect(missing.code).toBe(2);
    expect(missing.err[0]).toContain("usage:");

    const unknown = await runV1(["frobnicate", "synthetic"]);
    expect(unknown.code).toBe(2);
  });
});

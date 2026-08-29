// SPDX-License-Identifier: MIT
import { execFile as execFileCallback } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { chromium } from "@playwright/test";
import { build, preview } from "vite";

declare const Deno: {
  readonly build: { readonly os: string };
  exitCode: number;
  execPath(): string;
  makeTempDir(options?: { readonly prefix?: string }): Promise<string>;
};

type JsonObjectV1 = Record<string, unknown>;

interface PackageArtifactV1 {
  readonly name: string;
  readonly tarballPath: string;
}

interface AssetCopyV1 {
  readonly source: string;
  readonly target: string;
}

const execFile = promisify(execFileCallback);
const repositoryRootV1 = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const publishVersionV1 = "0.0.0";
const packageDirectoriesV1 = ["base", "state", "composition"] as const;
const publicModPackageV1 = "@sillymaker/composition";
const expectedRuntimeValueV1 = "example.public-mod:outside";
const timeoutMsV1 = 30_000;

function stageV1(label: string): void {
  console.log(`[public-mod-package] ${label}`);
}

function asObjectV1(value: unknown, reference: string): JsonObjectV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${reference} must be an object`);
  }
  return value as JsonObjectV1;
}

function asStringV1(value: unknown, reference: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${reference} must be a non-empty string`);
  }
  return value;
}

function commandOutputV1(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  return "";
}

async function runCommandV1(
  label: string,
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<{ readonly stdout: string; readonly stderr: string }> {
  try {
    const result = await execFile(command, args, {
      cwd,
      env: process.env,
      maxBuffer: 16 * 1024 * 1024,
    });
    return { stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const details = asObjectV1(error, `${label} error`);
    const stdout = commandOutputV1(details.stdout);
    const stderr = commandOutputV1(details.stderr);
    throw new Error(
      `${label} failed${stdout.length === 0 ? "" : `\nstdout:\n${stdout}`}` +
        (stderr.length === 0 ? "" : `\nstderr:\n${stderr}`),
      { cause: error },
    );
  }
}

function isPrivateExportV1(subpath: string): boolean {
  return subpath.split("/").includes("internal");
}

function outputStemV1(sourceTarget: string): string {
  const relativeSource = sourceTarget.slice("./src/".length);
  const extension = extname(relativeSource);
  return `./dist/${relativeSource.slice(0, -extension.length)}`;
}

function runtimeTargetV1(
  sourceTarget: string,
  packageRoot: string,
  stageRoot: string,
  assetCopies: AssetCopyV1[],
): string {
  if (!sourceTarget.startsWith("./src/")) return sourceTarget;
  const extension = extname(sourceTarget);
  const stem = outputStemV1(sourceTarget);
  if (extension === ".ts" || extension === ".tsx") return `${stem}.js`;

  const target = `${stem}${extension}`;
  assetCopies.push({
    source: resolve(packageRoot, sourceTarget),
    target: resolve(stageRoot, target),
  });
  return target;
}

function typeTargetV1(sourceTarget: string): string | null {
  if (!sourceTarget.startsWith("./src/")) return null;
  const extension = extname(sourceTarget);
  return extension === ".ts" || extension === ".tsx" ? `${outputStemV1(sourceTarget)}.d.ts` : null;
}

function defaultStringTargetV1(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as JsonObjectV1;
  return defaultStringTargetV1(record.default) ??
    defaultStringTargetV1(record.browser) ??
    defaultStringTargetV1(record.deno) ??
    Object.values(record).map(defaultStringTargetV1).find((entry) => entry !== null) ??
    null;
}

function rewriteRuntimeExportV1(
  value: unknown,
  packageRoot: string,
  stageRoot: string,
  assetCopies: AssetCopyV1[],
): unknown {
  if (typeof value === "string") {
    return runtimeTargetV1(value, packageRoot, stageRoot, assetCopies);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => rewriteRuntimeExportV1(entry, packageRoot, stageRoot, assetCopies));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([condition, target]) => [
        condition,
        rewriteRuntimeExportV1(target, packageRoot, stageRoot, assetCopies),
      ]),
    );
  }
  if (value === null) return null;
  throw new TypeError("package export target must be a string, object, array, or null");
}

function rewriteExportEntryV1(
  value: unknown,
  packageRoot: string,
  stageRoot: string,
  assetCopies: AssetCopyV1[],
): unknown {
  const defaultTarget = defaultStringTargetV1(value);
  const types = defaultTarget === null ? null : typeTargetV1(defaultTarget);
  const runtime = rewriteRuntimeExportV1(value, packageRoot, stageRoot, assetCopies);
  if (typeof value === "string") {
    return types === null ? runtime : { types, import: runtime, default: runtime };
  }
  if (types === null || typeof runtime !== "object" || runtime === null || Array.isArray(runtime)) {
    return runtime;
  }
  return { types, ...(runtime as JsonObjectV1) };
}

function rewriteDependenciesV1(
  value: unknown,
  publishedPackageNames: ReadonlySet<string>,
  reference: string,
): JsonObjectV1 | undefined {
  if (value === undefined) return undefined;
  const dependencies = asObjectV1(value, reference);
  return Object.fromEntries(
    Object.entries(dependencies).map(([name, rawVersion]) => {
      const version = asStringV1(rawVersion, `${reference}.${name}`);
      if (!version.startsWith("workspace:")) return [name, version];
      if (!publishedPackageNames.has(name)) {
        throw new TypeError(
          `${reference}.${name} is a workspace dependency outside the package set`,
        );
      }
      return [name, publishVersionV1];
    }),
  );
}

function optionalFieldV1(source: JsonObjectV1, name: string): JsonObjectV1 {
  return source[name] === undefined ? {} : { [name]: source[name] };
}

async function assertFileV1(path: string, reference: string): Promise<void> {
  const info = await stat(path);
  if (!info.isFile()) throw new TypeError(`${reference} is not a file: ${path}`);
}

function collectExportTargetsV1(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectExportTargetsV1);
  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(collectExportTargetsV1);
  }
  return [];
}

async function stagePackageV1(input: {
  readonly packageDirectory: string;
  readonly outputRoot: string;
  readonly publishedPackageNames: ReadonlySet<string>;
}): Promise<{ readonly name: string; readonly stageRoot: string }> {
  const packageRoot = resolve(repositoryRootV1, "engine/packages", input.packageDirectory);
  const sourceManifest = asObjectV1(
    JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8")),
    `${input.packageDirectory} package manifest`,
  );
  const name = asStringV1(sourceManifest.name, `${input.packageDirectory} package name`);
  const stageRoot = resolve(input.outputRoot, input.packageDirectory);
  const sourceExports = asObjectV1(sourceManifest.exports, `${name} exports`);
  const assetCopies: AssetCopyV1[] = [];
  const exports = Object.fromEntries(
    Object.entries(sourceExports)
      .filter(([subpath]) => !isPrivateExportV1(subpath))
      .map(([subpath, value]) => [
        subpath,
        rewriteExportEntryV1(value, packageRoot, stageRoot, assetCopies),
      ]),
  );
  const dependencies = rewriteDependenciesV1(
    sourceManifest.dependencies,
    input.publishedPackageNames,
    `${name} dependencies`,
  );
  const optionalDependencies = rewriteDependenciesV1(
    sourceManifest.optionalDependencies,
    input.publishedPackageNames,
    `${name} optionalDependencies`,
  );
  const peerDependencies = rewriteDependenciesV1(
    sourceManifest.peerDependencies,
    input.publishedPackageNames,
    `${name} peerDependencies`,
  );
  const stagedManifest = {
    name,
    version: publishVersionV1,
    type: sourceManifest.type ?? "module",
    license: sourceManifest.license ?? "MIT",
    ...optionalFieldV1(sourceManifest, "description"),
    ...optionalFieldV1(sourceManifest, "sideEffects"),
    ...optionalFieldV1(sourceManifest, "browser"),
    ...optionalFieldV1(sourceManifest, "engines"),
    exports,
    files: ["dist"],
    ...(dependencies === undefined ? {} : { dependencies }),
    ...(optionalDependencies === undefined ? {} : { optionalDependencies }),
    ...(peerDependencies === undefined ? {} : { peerDependencies }),
    ...optionalFieldV1(sourceManifest, "peerDependenciesMeta"),
  };

  await rm(stageRoot, { recursive: true, force: true });
  await mkdir(stageRoot, { recursive: true });
  await cp(resolve(packageRoot, "dist"), resolve(stageRoot, "dist"), { recursive: true });
  for (const asset of assetCopies) {
    await mkdir(dirname(asset.target), { recursive: true });
    await cp(asset.source, asset.target);
  }
  await cp(resolve(repositoryRootV1, "LICENSE.md"), resolve(stageRoot, "LICENSE.md"));
  await writeFile(
    resolve(stageRoot, "package.json"),
    `${JSON.stringify(stagedManifest, null, 2)}\n`,
    "utf8",
  );

  const exportTargets = collectExportTargetsV1(exports);
  const sourceExport = exportTargets.find((target) =>
    target.includes("/src/") ||
    ((target.endsWith(".ts") || target.endsWith(".tsx")) && !target.endsWith(".d.ts"))
  );
  if (sourceExport !== undefined) {
    throw new TypeError(`${name} staged exports still reference TypeScript sources`);
  }
  if (JSON.stringify(stagedManifest).includes("workspace:")) {
    throw new TypeError(`${name} staged manifest still contains a workspace dependency`);
  }
  for (const target of new Set(exportTargets)) {
    if (!target.startsWith("./")) continue;
    await assertFileV1(resolve(stageRoot, target), `${name} export ${target}`);
    if (target.endsWith(".js")) {
      await assertFileV1(resolve(stageRoot, `${target}.map`), `${name} JavaScript source map`);
    } else if (target.endsWith(".d.ts")) {
      await assertFileV1(resolve(stageRoot, `${target}.map`), `${name} declaration source map`);
    }
  }
  return { name, stageRoot };
}

async function packPackageV1(
  staged: { readonly name: string; readonly stageRoot: string },
  tarballRoot: string,
): Promise<PackageArtifactV1> {
  const npmCommand = Deno.build.os === "windows" ? "npm.cmd" : "npm";
  const result = await runCommandV1(
    `pack ${staged.name}`,
    npmCommand,
    ["pack", "--json", "--ignore-scripts", "--pack-destination", tarballRoot],
    staged.stageRoot,
  );
  const report = JSON.parse(result.stdout) as unknown;
  if (!Array.isArray(report) || report.length !== 1) {
    throw new TypeError(`pack ${staged.name} returned an invalid report`);
  }
  const filename = asStringV1(
    asObjectV1(report[0], `pack ${staged.name} report`).filename,
    `pack ${staged.name} filename`,
  );
  const tarballPath = resolve(tarballRoot, filename);
  await assertFileV1(tarballPath, `${staged.name} tarball`);
  return { name: staged.name, tarballPath };
}

const exerciseSourceV1 = `
import {
  createSillyModRuntimeV1,
  defineSillyModMetadataV1,
} from "@sillymaker/composition/mod";

export async function exercisePublicModV1(): Promise<string> {
  const metadata = defineSillyModMetadataV1({
    contractRevision: 1,
    modId: "example.public-mod",
    version: "1.0.0",
    engineApi: { composition: "^1.0.0" },
    dependencies: { requires: [], optional: [], conflicts: [] },
    facets: ["presentation"],
  });
  const runtime = await createSillyModRuntimeV1<string, readonly string[]>({
    applicationGeneration: "external.1",
    engineApi: { composition: "1.0.0" },
    catalog: [{
      kind: "data",
      metadata,
      contributions: [{
        contributionId: "example.label",
        pointId: "example.labels",
        contributionKind: "label",
        payload: "outside",
      }],
    }],
    activeModIds: [metadata.modId],
    extensionPoints: [{
      pointId: "example.labels",
      contributionKind: "label",
      collisionPolicy: "reject",
      compile: ({ contributions }) => contributions.map((entry) => entry.payload),
    }],
  });
  try {
    const mod = runtime.resolvedManifest.orderedMods[0];
    const point = runtime.compiledPoints[0];
    if (mod?.modId !== metadata.modId || point?.pointId !== "example.labels") {
      throw new Error("public Mod manifest or compiled point is incorrect");
    }
    return \`\${mod.modId}:\${point.value[0] ?? "missing"}\`;
  } finally {
    await runtime.dispose();
  }
}
`.trimStart();

async function createExternalConsumerV1(
  consumerRoot: string,
  artifacts: readonly PackageArtifactV1[],
): Promise<void> {
  const dependencies = Object.fromEntries(
    artifacts.map((artifact) => [
      artifact.name,
      `file:${artifact.tarballPath.replaceAll("\\", "/")}`,
    ]),
  );
  await mkdir(resolve(consumerRoot, "src"), { recursive: true });
  await Promise.all([
    writeFile(
      resolve(consumerRoot, "package.json"),
      `${
        JSON.stringify(
          {
            name: "sillymaker-public-mod-external-smoke",
            version: "0.0.0",
            private: true,
            type: "module",
            dependencies,
          },
          null,
          2,
        )
      }\n`,
      "utf8",
    ),
    writeFile(
      resolve(consumerRoot, "deno.json"),
      `${JSON.stringify({ nodeModulesDir: "manual" }, null, 2)}\n`,
      "utf8",
    ),
    writeFile(resolve(consumerRoot, "src/exercise.ts"), exerciseSourceV1, "utf8"),
    writeFile(
      resolve(consumerRoot, "src/deno-smoke.ts"),
      `import { exercisePublicModV1 } from "./exercise.ts";\n` +
        `const value = await exercisePublicModV1();\n` +
        `if (value !== ${JSON.stringify(expectedRuntimeValueV1)}) throw new Error(value);\n` +
        `console.log(value);\n`,
      "utf8",
    ),
    writeFile(
      resolve(consumerRoot, "src/main.ts"),
      `import { exercisePublicModV1 } from "./exercise.ts";\n` +
        `const output = document.querySelector<HTMLElement>("#result");\n` +
        `if (output === null) throw new Error("missing output");\n` +
        `const value = await exercisePublicModV1();\n` +
        `output.textContent = value;\n` +
        `output.dataset.smokeStatus = "ready";\n`,
      "utf8",
    ),
    writeFile(
      resolve(consumerRoot, "index.html"),
      `<!doctype html><html><body><output id="result">loading</output>` +
        `<script type="module" src="/src/main.ts"></script></body></html>\n`,
      "utf8",
    ),
  ]);
}

async function mainV1(): Promise<void> {
  const temporaryRoot = await Deno.makeTempDir({ prefix: "sillymaker-public-mod-package-" });
  let server: Awaited<ReturnType<typeof preview>> | null = null;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    stageV1("compile base/state/composition artifacts");
    await runCommandV1(
      "TypeScript package build",
      Deno.execPath(),
      [
        "run",
        "-A",
        "npm:typescript/tsc",
        "-b",
        "engine/packages/base",
        "engine/packages/state",
        "engine/packages/composition",
        "--force",
        "--pretty",
        "false",
      ],
      repositoryRootV1,
    );

    const stagedRoot = resolve(temporaryRoot, "stage");
    const tarballRoot = resolve(temporaryRoot, "tarballs");
    await mkdir(tarballRoot, { recursive: true });
    const packageNames = new Set<string>();
    for (const packageDirectory of packageDirectoriesV1) {
      const manifest = asObjectV1(
        JSON.parse(
          await readFile(
            resolve(repositoryRootV1, "engine/packages", packageDirectory, "package.json"),
            "utf8",
          ),
        ),
        `${packageDirectory} package manifest`,
      );
      packageNames.add(asStringV1(manifest.name, `${packageDirectory} package name`));
    }

    stageV1("stage publish manifests and dist outputs");
    const stagedPackages = [];
    for (const packageDirectory of packageDirectoriesV1) {
      stagedPackages.push(
        await stagePackageV1({
          packageDirectory,
          outputRoot: stagedRoot,
          publishedPackageNames: packageNames,
        }),
      );
    }
    const compositionStage = stagedPackages.find((entry) => entry.name === publicModPackageV1);
    if (compositionStage === undefined) throw new Error("composition package was not staged");
    const compositionManifest = JSON.parse(
      await readFile(resolve(compositionStage.stageRoot, "package.json"), "utf8"),
    ) as JsonObjectV1;
    const compositionExports = asObjectV1(compositionManifest.exports, "composition exports");
    if (compositionExports["./mod"] === undefined) {
      throw new Error("staged composition package does not expose ./mod");
    }

    stageV1("pack local tarballs");
    const artifacts: PackageArtifactV1[] = [];
    for (const staged of stagedPackages) {
      artifacts.push(await packPackageV1(staged, tarballRoot));
    }

    const consumerRoot = resolve(temporaryRoot, "consumer");
    await createExternalConsumerV1(consumerRoot, artifacts);
    stageV1("install tarballs in external consumer");
    await runCommandV1(
      "external npm install",
      Deno.build.os === "windows" ? "npm.cmd" : "npm",
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false"],
      consumerRoot,
    );

    stageV1("check and run Deno consumer");
    await runCommandV1(
      "external Deno check",
      Deno.execPath(),
      ["check", "--config", "deno.json", "src/deno-smoke.ts"],
      consumerRoot,
    );
    const denoRun = await runCommandV1(
      "external Deno run",
      Deno.execPath(),
      ["run", "--config", "deno.json", "src/deno-smoke.ts"],
      consumerRoot,
    );
    if (!denoRun.stdout.includes(expectedRuntimeValueV1)) {
      throw new Error(`external Deno runtime returned unexpected output: ${denoRun.stdout}`);
    }

    stageV1("build external Vite consumer");
    await build({
      root: consumerRoot,
      configFile: false,
      logLevel: "silent",
      build: { outDir: "dist", emptyOutDir: true },
    });

    stageV1("run external consumer in Chromium");
    server = await preview({
      root: consumerRoot,
      configFile: false,
      logLevel: "silent",
      preview: { host: "127.0.0.1", port: 0, strictPort: true },
    });
    const url = server.resolvedUrls?.local[0];
    if (url === undefined) throw new Error("Vite preview did not publish a local URL");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMsV1 });
    const output = page.locator('#result[data-smoke-status="ready"]');
    await output.waitFor({ state: "visible", timeout: timeoutMsV1 });
    const browserValue = await output.textContent();
    if (browserValue !== expectedRuntimeValueV1) {
      throw new Error(`external Browser runtime returned unexpected output: ${browserValue}`);
    }
    if (pageErrors.length > 0 || consoleErrors.length > 0) {
      throw new Error(
        `external Browser diagnostics were not clean: ${
          JSON.stringify({ pageErrors, consoleErrors })
        }`,
      );
    }
    stageV1("ok: tarball install, Deno import/runtime, Vite build, Chromium runtime");
  } finally {
    try {
      await browser?.close();
    } finally {
      try {
        await server?.close();
      } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
      }
    }
  }
}

if (import.meta.main) {
  await mainV1().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exitCode = 1;
  });
}

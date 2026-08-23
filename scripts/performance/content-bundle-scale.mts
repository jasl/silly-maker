// SPDX-License-Identifier: MIT
import { execFile as execFileCallback } from "node:child_process";
import { gzipSync } from "node:zlib";
import { mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { createSillymakerAppViteConfigV1 } from "@sillymaker/tooling/vite";
import { build } from "vite";
import { digestBytes } from "@sillymaker/base";

import {
  contentBundleScaleFixtureV1,
  contentBundleScaleManifestSourceV1,
  contentBundleScalePackJsonV1,
  initialJavaScriptPathsFromViteManifestV1,
  type ContentBundleScaleProfileV1,
} from "./content-bundle-scale-helpers.ts";

declare const Deno: {
  readonly args: readonly string[];
  readonly build: { readonly os: string; readonly arch: string };
  readonly version: {
    readonly deno: string;
    readonly v8: string;
    readonly typescript: string;
  };
  exitCode: number;
  makeTempDir(options?: {
    readonly prefix?: string;
  }): Promise<string>;
};

interface OptionsV1 {
  readonly profile: ContentBundleScaleProfileV1;
  readonly output?: string;
}

interface ViteManifestEntryV1 {
  readonly file: string;
  readonly imports?: readonly string[];
  readonly isEntry?: boolean;
}

interface AssetMeasurementV1 {
  readonly path: string;
  readonly rawBytes: number;
  readonly gzipBytes: number;
}

const execFile = promisify(execFileCallback);
const repositoryRootV1 = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const usageV1 = "usage: deno task bench:content:bundle --profile <bundle-reference|bundle-scale> " +
  "[--output <path>]";

function parseOptionsV1(argv: readonly string[]): OptionsV1 {
  let profile: ContentBundleScaleProfileV1 | undefined;
  let output: string | undefined;
  const seen = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new TypeError(`${flag ?? "argument"} requires a value\n${usageV1}`);
    }
    index += 1;
    if (flag === undefined || seen.has(flag)) {
      throw new TypeError(`${flag ?? "argument"} may only be provided once\n${usageV1}`);
    }
    seen.add(flag);
    if (flag === "--profile") {
      if (value !== "bundle-reference" && value !== "bundle-scale") {
        throw new TypeError(`--profile must be bundle-reference or bundle-scale\n${usageV1}`);
      }
      profile = value;
    } else if (flag === "--output") {
      output = value;
    } else {
      throw new TypeError(`unknown argument: ${flag}\n${usageV1}`);
    }
  }
  if (profile === undefined) throw new TypeError(`--profile is required\n${usageV1}`);
  return output === undefined ? { profile } : { profile, output };
}

async function repositoryStateV1(): Promise<
  Readonly<{ head: string; workingTreeModified: boolean }>
> {
  const [head, status] = await Promise.all([
    execFile("git", ["rev-parse", "HEAD"], { cwd: repositoryRootV1 }),
    execFile("git", ["status", "--porcelain=v1", "--untracked-files=normal"], {
      cwd: repositoryRootV1,
    }),
  ]);
  return Object.freeze({
    head: head.stdout.trim(),
    workingTreeModified: status.stdout.trim().length > 0,
  });
}

async function outputPathV1(requestedPath: string | undefined): Promise<string> {
  if (requestedPath !== undefined) return resolve(requestedPath);
  const directory = await Deno.makeTempDir({ prefix: "sillymaker-content-bundle-report-" });
  return join(directory, "measurement.json");
}

async function createFixtureV1(root: string, profile: ContentBundleScaleProfileV1): Promise<void> {
  const fixture = contentBundleScaleFixtureV1(profile);
  const sourceDirectory = join(root, "src");
  const contentDirectory = join(root, "assets", "content");
  const templateEntryPath = relative(
    sourceDirectory,
    join(repositoryRootV1, "template", "src", "application", "entry.tsx"),
  ).split(sep).join("/");
  const templateEntryImport = templateEntryPath.startsWith(".")
    ? templateEntryPath
    : `./${templateEntryPath}`;
  const templateStoryPath = relative(
    sourceDirectory,
    join(repositoryRootV1, "template", "src", "story.ts"),
  ).split(sep).join("/");
  const templateStoryImport = templateStoryPath.startsWith(".")
    ? templateStoryPath
    : `./${templateStoryPath}`;
  await Promise.all([
    mkdir(sourceDirectory, { recursive: true }),
    mkdir(contentDirectory, { recursive: true }),
  ]);
  await writeFile(
    join(root, "package.json"),
    `${
      JSON.stringify({
        name: "sillymaker-content-bundle-scale",
        version: "0.0.0",
        private: true,
        type: "module",
      })
    }\n`,
    "utf8",
  );
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><html><head><meta charset="UTF-8"></head><body><script type="module" src="/src/entry.ts"></script></body></html>\n',
    "utf8",
  );
  await writeFile(
    join(sourceDirectory, "entry.ts"),
    `import { contentManifestV1 } from "./content-manifest.ts";
import ${JSON.stringify(templateEntryImport)};

const requested = Number(new URLSearchParams(location.search).get("pack") ?? "0");
const packIndex = Number.isSafeInteger(requested) && requested >= 0 && requested < contentManifestV1.packs.length
  ? requested
  : 0;
const selectedPack = contentManifestV1.packs[packIndex] ?? contentManifestV1.packs[0];
if (selectedPack === undefined) throw new Error("content fixture has no selected pack");

document.documentElement.dataset.scaleSelectedPack = String(packIndex);
document.documentElement.dataset.scaleSelectedPackId = selectedPack.packId;
document.documentElement.dataset.scaleLogicalPackCount = String(contentManifestV1.packs.length);

void fetch(selectedPack.runtimePath).then(async (response) => {
  if (!response.ok) throw new Error("scale content fetch failed: " + String(response.status));
  const pack = await response.json();
  document.documentElement.dataset.scaleLoadedPackId = String(pack.packId ?? "missing");
  document.documentElement.dataset.scaleLoadedEntryCount = String(
    pack.textCatalogs?.catalogs?.[0]?.entries?.length ?? -1,
  );
});
`,
    "utf8",
  );
  await writeFile(
    join(sourceDirectory, "story.ts"),
    `export { templateStoryEntryV1 as contentBundleScaleStoryEntryV1 } from ${
      JSON.stringify(templateStoryImport)
    };\n`,
    "utf8",
  );
  const descriptors = [];
  for (let packIndex = 0; packIndex < fixture.packCount; packIndex += 1) {
    const suffix = String(packIndex).padStart(3, "0");
    const source = contentBundleScalePackJsonV1({
      packIndex,
      entriesPerPack: fixture.entriesPerPack,
    });
    const bytes = new TextEncoder().encode(source);
    await writeFile(
      join(contentDirectory, `pack-${suffix}.json`),
      bytes,
    );
    descriptors.push(Object.freeze({
      packId: `text-pack.scale.${suffix}`,
      runtimePath: `assets/content/pack-${suffix}.json`,
      byteLength: bytes.byteLength,
      sha256: digestBytes(bytes),
      entryCount: fixture.entriesPerPack,
    }));
  }
  await writeFile(
    join(sourceDirectory, "content-manifest.ts"),
    contentBundleScaleManifestSourceV1(descriptors),
    "utf8",
  );
}

async function listFilesV1(root: string, directory = root): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFilesV1(root, path));
    else if (entry.isFile()) files.push(relative(root, path).split(sep).join("/"));
  }
  return files;
}

async function measureAssetV1(outDir: string, path: string): Promise<AssetMeasurementV1> {
  const bytes = await readFile(join(outDir, path));
  return Object.freeze({ path, rawBytes: bytes.byteLength, gzipBytes: gzipSync(bytes).byteLength });
}

function sumV1(rows: readonly AssetMeasurementV1[]): Readonly<{
  readonly files: number;
  readonly rawBytes: number;
  readonly gzipBytes: number;
}> {
  return Object.freeze({
    files: rows.length,
    rawBytes: rows.reduce((total, row) => total + row.rawBytes, 0),
    gzipBytes: rows.reduce((total, row) => total + row.gzipBytes, 0),
  });
}

async function buildFixtureV1(root: string, outDir: string): Promise<void> {
  const config = await createSillymakerAppViteConfigV1({
    appRoot: root,
    config: {
      applicationId: "content-bundle-scale",
      label: "SillyMaker content bundle scale fixture",
      storyEntry: { module: "src/story.ts", exportName: "contentBundleScaleStoryEntryV1" },
      assetVerification: false,
      web: {
        applicationHtml: "index.html",
        applicationEntry: "src/entry.ts",
        outDir: "dist-web",
        base: "./",
        sourcemap: false,
        identity: null,
      },
    },
  });
  await build({
    ...config,
    root,
    configFile: false,
    logLevel: "silent",
    resolve: {
      ...config.resolve,
      // Every real Player module lives under the repository and therefore
      // resolves the one installed React copy from that package graph. The
      // generated OS-temp root has no dependency directory of its own.
      dedupe: [],
    },
    build: {
      ...config.build,
      outDir,
      emptyOutDir: true,
      manifest: true,
    },
  });
}

async function mainV1(): Promise<void> {
  const options = parseOptionsV1(Deno.args);
  const fixture = contentBundleScaleFixtureV1(options.profile);
  const root = await realpath(
    await Deno.makeTempDir({ prefix: "sillymaker-content-bundle-scale-" }),
  );
  const outDir = join(root, "dist-web");
  try {
    await createFixtureV1(root, options.profile);
    await buildFixtureV1(root, outDir);
    const manifest = JSON.parse(
      await readFile(join(outDir, ".vite", "manifest.json"), "utf8"),
    ) as Readonly<Record<string, ViteManifestEntryV1>>;
    const initialJavaScriptPaths = initialJavaScriptPathsFromViteManifestV1(manifest);
    const initialJavaScript = await Promise.all(
      initialJavaScriptPaths.map((path) => measureAssetV1(outDir, path)),
    );
    const allJavaScript = await Promise.all(
      (await listFilesV1(outDir))
        .filter((path) => path.endsWith(".js") || path.endsWith(".mjs"))
        .map((path) => measureAssetV1(outDir, path)),
    );
    const contentPacks = await Promise.all(
      (await listFilesV1(outDir))
        .filter((path) => path.startsWith("assets/content/") && path.endsWith(".json"))
        .map((path) => measureAssetV1(outDir, path)),
    );
    const report = Object.freeze({
      schemaVersion: 2,
      workloadId: `content-bundle-scale-v1/${options.profile}`,
      generatedAt: new Date().toISOString(),
      repository: await repositoryStateV1(),
      environment: Object.freeze({
        deno: Deno.version.deno,
        v8: Deno.version.v8,
        typescript: Deno.version.typescript,
        os: Deno.build.os,
        arch: Deno.build.arch,
      }),
      fixture,
      guiComposition: "template-player",
      groups: Object.freeze({
        initialJavaScript: sumV1(initialJavaScript),
        allJavaScript: sumV1(allJavaScript),
        contentPacks: sumV1(contentPacks),
      }),
      initialJavaScript,
      contentPacks,
      interpretation: Object.freeze({
        status: "external_content_pack_measurement",
        selectedPackOnly: true,
        note:
          "Initial JavaScript carries compact descriptors; fetch selects one external pack payload.",
      }),
    });
    const path = await outputPathV1(options.output);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(path);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

try {
  await mainV1();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  Deno.exitCode = 1;
}

// SPDX-License-Identifier: MIT
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  DiagnosticEnvelopeV1,
  GamePackageV1,
  ResolvedAssetManifestV1,
} from "@sillymaker/base";
import {
  AuthoringDiagnosticErrorV1,
  collectGamePackageDiagnosticsV1,
  createDiagnosticV1,
  resolveGamePackageV1,
} from "@sillymaker/base";

import type { CollectedVersionStampV1 } from "../vite/version-stamp.ts";
import {
  collectVersionStampV1,
  normalizeCollectedVersionStampInternalV1,
  serializeVersionStampReceiptInternalV1,
  versionStampReceiptEnvironmentKeyInternalV1,
} from "../vite/version-stamp.ts";
import type { SillymakerProjectConfigV1 } from "./config.ts";
import { joinAppPathV1, resolveStoryApplicationV1 } from "./config.ts";
import { collectChromeLayoutSourceDiagnosticsV1 } from "./chrome-layout-diagnostics.ts";
import { collectMotionSourceDiagnosticsV1 } from "./motion-diagnostics.ts";
import { collectRegionsSourceDiagnosticsV1 } from "./regions-diagnostics.ts";
import { collectSceneSourceDiagnosticsV1 } from "./scene-diagnostics.ts";

/** Loads a repository module for command execution; injectable for tests. */
export interface ProjectModuleLoaderV1 {
  loadModule(repositoryRelativePath: string): Promise<Record<string, unknown>>;
}

type LoadedGamePackageV1 = GamePackageV1<unknown, unknown>;

/** The provenance/content slice of a resolved package that inspect reports. */
interface InspectableResolvedV1 {
  readonly provenance: {
    readonly story: { readonly id: string; readonly revision: number; readonly digest: string };
    readonly engine: { readonly version: string; readonly digest: string };
    readonly resolved: {
      readonly stateContractRevision: number;
      readonly stateContractDigest: string;
      readonly simulationDigest: string;
      readonly presentationDigest: string;
    };
  };
  readonly assets: ResolvedAssetManifestV1;
}

const inspectionBuildIdentityV1 = {
  engineVersion: "SillyMaker tooling inspection",
  engine: [],
  storySimulation: [],
  storyPresentation: [],
  application: [],
} satisfies Parameters<typeof resolveGamePackageV1>[2];

function commandErrorV1(code: string, message: string, pointer: string): never {
  throw new AuthoringDiagnosticErrorV1([
    createDiagnosticV1({
      code,
      phase: "build",
      message,
      location: { jsonPointer: pointer },
      details: {},
    }),
  ]);
}

async function loadExportV1(
  loader: ProjectModuleLoaderV1,
  ref: { readonly module: string; readonly exportName: string },
  pointer: string,
): Promise<unknown> {
  let record: Record<string, unknown>;
  try {
    record = await loader.loadModule(ref.module);
  } catch (error) {
    commandErrorV1(
      "project.module_unloadable",
      `could not load "${ref.module}": ${error instanceof Error ? error.message : String(error)}`,
      pointer,
    );
  }
  const value = record[ref.exportName];
  if (value === undefined) {
    commandErrorV1(
      "project.export_missing",
      `module "${ref.module}" does not export "${ref.exportName}"`,
      pointer,
    );
  }
  return value;
}

function requireGamePackageV1(value: unknown, pointer: string): LoadedGamePackageV1 {
  const candidate = value as Partial<LoadedGamePackageV1> | null;
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    candidate.contractRevision !== 1 ||
    typeof candidate.define !== "function" ||
    typeof candidate.identity?.id !== "string"
  ) {
    commandErrorV1("project.story_entry_invalid", "export is not a GamePackage entry", pointer);
  }
  return candidate as LoadedGamePackageV1;
}

async function loadStoryEntryV1(
  project: SillymakerProjectConfigV1,
  applicationId: string,
  loader: ProjectModuleLoaderV1,
): Promise<{
  readonly application: ReturnType<typeof resolveStoryApplicationV1>;
  readonly entry: LoadedGamePackageV1;
}> {
  const application = resolveStoryApplicationV1(project, applicationId);
  const pointer = `/applications/${application.applicationId}/storyEntry`;
  const value = await loadExportV1(loader, application.storyEntry, pointer);
  return { application, entry: requireGamePackageV1(value, pointer) };
}

export interface StoryInspectReportV1 {
  readonly applicationId: string;
  readonly label: string;
  readonly story: { readonly id: string; readonly revision: number; readonly digest: string };
  readonly engine: { readonly version: string; readonly digest: string };
  readonly stateContract: { readonly revision: number; readonly digest: string };
  readonly simulationDigest: string;
  readonly presentationDigest: string;
  readonly assets: {
    readonly packs: number;
    readonly slots: number;
    readonly assets: number;
    readonly assetIds: readonly string[];
  };
}

export type StoryInspectResultV1 =
  | { readonly kind: "inspected"; readonly report: StoryInspectReportV1 }
  | { readonly kind: "invalid"; readonly diagnostics: readonly DiagnosticEnvelopeV1[] };

/** Resolves the application's Story and reports its identity and content summary as JSON-safe data. */
export async function inspectStoryApplicationV1(
  project: SillymakerProjectConfigV1,
  applicationId: string,
  loader: ProjectModuleLoaderV1,
): Promise<StoryInspectResultV1> {
  const { application, entry } = await loadStoryEntryV1(project, applicationId, loader);
  const result = resolveGamePackageV1(entry, [], inspectionBuildIdentityV1);
  if (result.kind === "failed") {
    const diagnostics = collectGamePackageDiagnosticsV1(entry);
    return {
      kind: "invalid" as const,
      diagnostics: diagnostics.kind === "invalid" ? diagnostics.diagnostics : [
        createDiagnosticV1({
          code: result.failure.code,
          phase: "resolution",
          message: "Story resolution failed",
          details: {},
        }),
      ],
    };
  }
  const resolved = result.resolved as unknown as InspectableResolvedV1;
  return {
    kind: "inspected" as const,
    report: {
      applicationId: application.applicationId,
      label: application.label,
      story: resolved.provenance.story,
      engine: resolved.provenance.engine,
      stateContract: {
        revision: resolved.provenance.resolved.stateContractRevision,
        digest: resolved.provenance.resolved.stateContractDigest,
      },
      simulationDigest: resolved.provenance.resolved.simulationDigest,
      presentationDigest: resolved.provenance.resolved.presentationDigest,
      assets: {
        packs: resolved.assets.packs.length,
        slots: resolved.assets.slots.length,
        assets: resolved.assets.assets.length,
        assetIds: resolved.assets.assets.map((asset) => asset.assetId as string),
      },
    },
  };
}

export interface StoryCheckReportV1 {
  readonly applicationId: string;
  readonly ok: boolean;
  readonly diagnostics: readonly DiagnosticEnvelopeV1[];
}

/** Validates the application's Story and returns structured JSON diagnostics. */
export async function checkStoryApplicationV1(
  project: SillymakerProjectConfigV1,
  applicationId: string,
  loader: ProjectModuleLoaderV1,
  options: {
    /** Repo root for the motion-source lint; omitted skips the file scan. */
    readonly repositoryRoot?: string;
  } = {},
): Promise<StoryCheckReportV1> {
  const { application, entry } = await loadStoryEntryV1(project, applicationId, loader);
  const result = collectGamePackageDiagnosticsV1(entry);
  const packageDiagnostics = result.kind === "valid" ? [] : [...result.diagnostics];

  // Motion and scene sources are authored data files next to the story
  // entry; lint them whenever the caller can tell us where the tree lives.
  const sourceRoot = options.repositoryRoot === undefined
    ? null
    : resolve(options.repositoryRoot, dirname(application.storyEntry.module));
  const sourceDiagnostics = sourceRoot === null ? [] : [
    ...collectChromeLayoutSourceDiagnosticsV1(sourceRoot),
    ...collectMotionSourceDiagnosticsV1(sourceRoot),
    ...collectRegionsSourceDiagnosticsV1(sourceRoot),
    ...collectSceneSourceDiagnosticsV1(sourceRoot),
  ];

  const diagnostics = [...packageDiagnostics, ...sourceDiagnostics];
  return {
    applicationId: application.applicationId,
    ok: diagnostics.length === 0,
    diagnostics,
  };
}

/**
 * The player-safe surface a simulation target must expose. This is the Agent
 * port shape; simulate never consumes a Story-private runner.
 */
export interface StorySimulationTargetV1 {
  readonly agent: {
    identity(): unknown;
    observe(): unknown;
    describeActions(): unknown;
    preview(invocation: unknown): Promise<unknown>;
    dispatch(invocation: unknown): Promise<unknown>;
    waitForIdle(options?: unknown): Promise<unknown>;
  };
  stateDigest?(): string;
  dispose(): Promise<unknown>;
  readonly defaultScript?: readonly unknown[];
  /** Named invocation scripts selectable with `simulate --scenario`. */
  readonly scenarios?: Readonly<Record<string, readonly unknown[]>>;
}

export interface StorySimulationTargetFactoryOptionsV1 {
  readonly seed?: number;
}

export type StorySimulationTargetFactoryV1 = (
  options?: StorySimulationTargetFactoryOptionsV1,
) => Promise<StorySimulationTargetV1>;

function requireSimulationTargetV1(value: unknown, pointer: string): StorySimulationTargetV1 {
  const target = value as Partial<StorySimulationTargetV1> | null;
  const agent = target?.agent as Partial<StorySimulationTargetV1["agent"]> | undefined;
  if (
    target === null ||
    typeof target !== "object" ||
    typeof target.dispose !== "function" ||
    agent === undefined ||
    typeof agent.observe !== "function" ||
    typeof agent.dispatch !== "function" ||
    typeof agent.identity !== "function"
  ) {
    commandErrorV1(
      "project.simulation_target_invalid",
      "simulation target must expose an Agent port and dispose()",
      pointer,
    );
  }
  return target as StorySimulationTargetV1;
}

export interface StorySimulateStepV1 {
  readonly ordinal: number;
  readonly invocation: unknown;
  readonly result: unknown;
}

export interface StorySimulateReportV1 {
  readonly applicationId: string;
  readonly storyIdentity: unknown;
  readonly initialPublication: unknown;
  readonly steps: readonly StorySimulateStepV1[];
  readonly finalPublication: unknown;
  readonly finalStateDigest: string | null;
  readonly scenario: string | null;
  readonly seed: number | null;
  /** Per-step numeric trajectories, present when `trace` paths were given. */
  readonly trace: readonly Readonly<Record<string, unknown>>[] | null;
}

export interface StorySimulateOptionsV1 {
  readonly script?: readonly unknown[];
  /** A named scenario from the target's `scenarios` registry. */
  readonly scenario?: string;
  /** Deterministic bootstrap seed forwarded to the target factory. */
  readonly seed?: number;
  /**
   * Dot paths sampled from the Agent publication after every step (for
   * example `game.cat.trust`) — the balance-tuning feedback loop: edit a
   * content table, re-simulate, compare trajectories.
   */
  readonly trace?: readonly string[];
}

/** Reads one dot path from plain data; missing segments resolve to null. */
function readDotPathV1(value: unknown, path: string): unknown {
  let cursor: unknown = value;
  for (const segment of path.split(".")) {
    if (cursor === null || typeof cursor !== "object" || Array.isArray(cursor)) return null;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor === undefined ? null : cursor;
}

/** Plays a scripted invocation sequence through the application's Agent port. */
export async function simulateStoryApplicationV1(
  project: SillymakerProjectConfigV1,
  applicationId: string,
  loader: ProjectModuleLoaderV1,
  options: StorySimulateOptionsV1 = {},
): Promise<StorySimulateReportV1> {
  const application = resolveStoryApplicationV1(project, applicationId);
  if (application.simulate === null) {
    commandErrorV1(
      "project.simulation_unconfigured",
      `application "${applicationId}" does not declare a simulation target`,
      `/applications/${applicationId}/simulate`,
    );
  }
  const pointer = `/applications/${applicationId}/simulate`;
  const factory = await loadExportV1(loader, application.simulate, pointer);
  if (typeof factory !== "function") {
    commandErrorV1(
      "project.simulation_target_invalid",
      "simulation export must be a factory function",
      pointer,
    );
  }
  const target = requireSimulationTargetV1(
    await (factory as StorySimulationTargetFactoryV1)(
      options.seed === undefined ? {} : { seed: options.seed },
    ),
    pointer,
  );
  try {
    let script = options.script ?? null;
    if (script === null && options.scenario !== undefined) {
      const scenario = target.scenarios?.[options.scenario];
      if (scenario === undefined) {
        commandErrorV1(
          "project.simulation_scenario_unknown",
          `simulation target does not declare scenario "${options.scenario}"`,
          pointer,
        );
      }
      script = scenario;
    }
    script ??= target.defaultScript ?? [];
    const tracePaths = options.trace ?? null;
    const sampleTrace = (step: number): Readonly<Record<string, unknown>> | null => {
      if (tracePaths === null || tracePaths.length === 0) return null;
      const publication = target.agent.observe() as Record<string, unknown>;
      const row: Record<string, unknown> = { step };
      for (const path of tracePaths) {
        row[path] = readDotPathV1(publication, path);
      }
      return row;
    };
    const initialPublication = target.agent.observe();
    const steps: StorySimulateStepV1[] = [];
    const trace: Readonly<Record<string, unknown>>[] = [];
    const initialRow = sampleTrace(0);
    if (initialRow !== null) trace.push(initialRow);
    for (const [index, invocation] of script.entries()) {
      const result = await target.agent.dispatch(invocation);
      steps.push({ ordinal: index + 1, invocation, result });
      const row = sampleTrace(index + 1);
      if (row !== null) trace.push(row);
    }
    return {
      applicationId: application.applicationId,
      storyIdentity: target.agent.identity(),
      initialPublication,
      steps,
      finalPublication: target.agent.observe(),
      finalStateDigest: target.stateDigest === undefined ? null : target.stateDigest(),
      scenario: options.scenario ?? null,
      seed: options.seed ?? null,
      trace: tracePaths === null || tracePaths.length === 0 ? null : trace,
    };
  } finally {
    await target.dispose();
  }
}

/**
 * Process/filesystem seams for the application lifecycle commands. The CLI
 * injects real implementations; contract tests inject fakes, so the verb
 * surface stays covered without spawning Vite in unit runs.
 */
export interface ProjectCommandRunnerV1 {
  /** Host OS used when desktop packaging omits an explicit target. */
  readonly hostPlatform: "darwin" | "windows" | "linux" | null;
  /** Runs a command to completion and resolves with its exit code. */
  run(
    command: string,
    args: readonly string[],
    options: {
      readonly cwd: string;
      /** Additional child-process environment entries for one command. */
      readonly environment?: Readonly<Record<string, string>>;
    },
  ): Promise<number>;
  /** Starts a long-running server process; kill() must terminate it. */
  start(
    command: string,
    args: readonly string[],
    options: { readonly cwd: string },
  ): { kill(): void };
  fetchText(url: string): Promise<{ readonly status: number; readonly body: string }>;
  sleep(milliseconds: number): Promise<void>;
  readFile(path: string): Promise<string>;
  /** Reads one file as raw bytes (used for image inputs like trace bitmaps). */
  readFileBytes(path: string): Promise<Uint8Array>;
  /** Returns a regular file's byte length, or null when absent/non-regular. */
  fileSize(path: string): Promise<number | null>;
  writeFile(path: string, contents: string): Promise<void>;
  /** Recursively copies a directory, replacing any existing destination. */
  copyDirectory(source: string, destination: string): Promise<void>;
  /** Copies one file byte-for-byte (used for binary assets like icons). */
  copyFile(source: string, destination: string): Promise<void>;
  removeDirectory(path: string): Promise<void>;
}

function requireWebTargetV1(
  application: ReturnType<typeof resolveStoryApplicationV1>,
  applicationId: string,
): NonNullable<ReturnType<typeof resolveStoryApplicationV1>["web"]> {
  if (application.web === null) {
    commandErrorV1(
      "project.web_target_unconfigured",
      `application "${applicationId}" does not declare a web target`,
      `/applications/${applicationId}/web`,
    );
  }
  return application.web;
}

export interface StoryBuildReportV1 {
  readonly applicationId: string;
  readonly ok: boolean;
  readonly outDir: string;
  readonly exitCode: number;
}

export interface StoryBuildOptionsV1 {
  /** Emit sourcemaps (debugging; config web.sourcemap is the baseline, this overrides). */
  readonly sourcemap?: boolean;
  /** Minify + mangle (the modern replacement for what was once called uglify; on by default). */
  readonly minify?: boolean;
}

/** The application directory, absolute: every process verb runs inside it. */
function applicationRootV1(repositoryRoot: string, storyRoot: string): string {
  return storyRoot === "." ? repositoryRoot : `${repositoryRoot}/${storyRoot}`;
}

/**
 * Builds the application's web target through the application's own Vite
 * config (`<appRoot>/vite.config.ts`); the CLI never selects a build switch.
 */
export async function buildStoryApplicationV1(
  project: SillymakerProjectConfigV1,
  applicationId: string,
  deps: { readonly runner: ProjectCommandRunnerV1; readonly repositoryRoot: string },
  options: StoryBuildOptionsV1 = {},
): Promise<StoryBuildReportV1> {
  return await buildStoryApplicationWithReceiptInternalV1(
    project,
    applicationId,
    deps,
    options,
    null,
  );
}

async function buildStoryApplicationWithReceiptInternalV1(
  project: SillymakerProjectConfigV1,
  applicationId: string,
  deps: { readonly runner: ProjectCommandRunnerV1; readonly repositoryRoot: string },
  options: StoryBuildOptionsV1,
  versionStamp: CollectedVersionStampV1 | null,
): Promise<StoryBuildReportV1> {
  const application = resolveStoryApplicationV1(project, applicationId);
  const web = requireWebTargetV1(application, applicationId);
  const args = ["run", "-A", "npm:vite", "build"];
  if (options.sourcemap === true) args.push("--sourcemap");
  else if (options.sourcemap === false) args.push("--sourcemap", "false");
  if (options.minify === false) args.push("--minify", "false");
  const exitCode = await deps.runner.run("deno", args, {
    cwd: applicationRootV1(deps.repositoryRoot, web.storyRoot),
    ...(versionStamp === null ? {} : {
      environment: {
        [versionStampReceiptEnvironmentKeyInternalV1]: serializeVersionStampReceiptInternalV1(
          versionStamp,
        ),
      },
    }),
  });
  return {
    applicationId: application.applicationId,
    ok: exitCode === 0,
    outDir: web.outDir,
    exitCode,
  };
}

/** SillyMaker's explicitly admitted `deno desktop --target` triples. */
export const DESKTOP_TARGET_TRIPLES_V1 = [
  "x86_64-apple-darwin",
  "aarch64-apple-darwin",
  "x86_64-pc-windows-msvc",
  "x86_64-unknown-linux-gnu",
  "aarch64-unknown-linux-gnu",
] as const;

export type DesktopTargetTripleV1 = (typeof DESKTOP_TARGET_TRIPLES_V1)[number];

export type DesktopCompressionV1 = "xz" | "lzma" | "zstd";

export interface StoryDesktopOptionsV1 extends StoryBuildOptionsV1 {
  /**
   * Explicit `deno desktop --target` triples; one package per entry, named
   * `<Stem>-<triple>.<ext>`. Empty/absent keeps the host-platform preview
   * (`<Stem>` plus its platform extension, without a target suffix). The
   * package-internal stem adds bounded version/commit diagnostics when known.
   */
  readonly targets?: readonly DesktopTargetTripleV1[];
  /** Self-extracting payload compression (`--compress[=algo]`); off by default. */
  readonly compress?: DesktopCompressionV1 | true;
}

export interface StoryDesktopOutputV1 {
  readonly target: DesktopTargetTripleV1 | "host";
  readonly outputPath: string;
  readonly ok: boolean;
  readonly exitCode: number;
}

export interface StoryDesktopReportV1 {
  readonly applicationId: string;
  readonly ok: boolean;
  readonly stagingDir: string;
  /** First packaged output (kept for single-target consumers). */
  readonly outputPath: string;
  readonly exitCode: number;
  readonly outputs: readonly StoryDesktopOutputV1[];
}

function artifactVersionSegmentV1(version: string | null): string | null {
  if (version === null) return null;
  const portable = version.replaceAll(/[^0-9A-Za-z_-]+/gu, "_").replace(/^_+|_+$/gu, "");
  return portable === "" || portable.length > 64 ? null : portable;
}

function artifactCommitSegmentV1(commit: string | null): string | null {
  if (commit === null) return null;
  const match = /^(?<identity>[0-9a-f]{40}|[0-9a-f]{64})(?<dirty>-dirty)?$/u.exec(commit);
  const identity = match?.groups?.identity;
  if (identity === undefined) return null;
  return `${identity.slice(0, 7)}${match?.groups?.dirty ?? ""}`;
}

/** @internal Bounded single-segment diagnostic artifact stem. */
export function desktopArtifactStemInternalV1(
  name: string,
  stamp: CollectedVersionStampV1,
): string {
  const normalized = normalizeCollectedVersionStampInternalV1(stamp);
  const parts = [
    artifactVersionSegmentV1(normalized?.applicationVersion ?? null),
    artifactCommitSegmentV1(normalized?.applicationCommit ?? null),
  ].filter((part): part is string => part !== null);
  return parts.reduce((stem, part) => `${stem}-${part}`, name);
}

/**
 * Per-OS package format. `deno desktop` infers the format from the output
 * extension; these are the preview package choices per platform (macOS
 * bundle, Windows installer, Linux AppImage).
 */
function desktopOutputNameV1(
  stem: string,
  target: DesktopTargetTripleV1 | "host",
  hostPlatform: NonNullable<ProjectCommandRunnerV1["hostPlatform"]>,
): string {
  const targetPlatform = target === "host"
    ? hostPlatform
    : target.endsWith("apple-darwin")
    ? "darwin"
    : target.includes("windows")
    ? "windows"
    : "linux";
  const targetSuffix = target === "host" ? "" : `-${target}`;
  const outputName = targetPlatform === "darwin"
    ? `${stem}${targetSuffix}.app`
    : targetPlatform === "windows"
    ? `${stem}${targetSuffix}.msi`
    : `${stem}${targetSuffix}.AppImage`;
  if (
    outputName.length > 240 ||
    new TextEncoder().encode(outputName).byteLength > 240 ||
    outputName.includes("/") ||
    outputName.includes("\\")
  ) {
    commandErrorV1(
      "project.desktop_artifact_name_invalid",
      "desktop artifact filename exceeds the portable single-segment budget",
      "/web/desktop/name",
    );
  }
  return outputName;
}

/** `.app` is a directory bundle; single-file formats verify the file itself. */
function desktopOutputMarkerV1(outputPath: string): string {
  return outputPath.endsWith(".app") ? `${outputPath}/Contents/Info.plist` : outputPath;
}

/** Config icons are `.png`/`.icns` — macOS formats; skip them on other targets. */
function desktopIconAppliesV1(target: DesktopTargetTripleV1 | "host"): boolean {
  return target.endsWith("apple-darwin");
}

function isDesktopTargetTripleV1(value: unknown): value is DesktopTargetTripleV1 {
  return (
    typeof value === "string" && (DESKTOP_TARGET_TRIPLES_V1 as readonly string[]).includes(value)
  );
}

/**
 * Packages the built web Player through the experimental `deno desktop`
 * command: a host-platform package by default, or explicit
 * cross-compiled packages via `targets`. The staging directory is a thin
 * explicit host — a Vite SPA layout with the Player copied to `dist/` —
 * so engine and Story code never depend on Deno Desktop APIs, and the web
 * Player stays the canonical delivery.
 */
export async function desktopStoryApplicationV1(
  project: SillymakerProjectConfigV1,
  applicationId: string,
  deps: { readonly runner: ProjectCommandRunnerV1; readonly repositoryRoot: string },
  options: StoryDesktopOptionsV1 = {},
): Promise<StoryDesktopReportV1> {
  return await desktopStoryApplicationWithDependenciesInternalV1(
    project,
    applicationId,
    {
      ...deps,
      collectVersionStamp: collectVersionStampV1,
    },
    options,
  );
}

/** @internal Test seam; the public Desktop command always uses the real collector. */
export async function desktopStoryApplicationWithDependenciesInternalV1(
  project: SillymakerProjectConfigV1,
  applicationId: string,
  deps: {
    readonly runner: ProjectCommandRunnerV1;
    readonly repositoryRoot: string;
    readonly collectVersionStamp: (input: { readonly appRoot: string }) => CollectedVersionStampV1;
  },
  options: StoryDesktopOptionsV1 = {},
): Promise<StoryDesktopReportV1> {
  const application = resolveStoryApplicationV1(project, applicationId);
  const web = requireWebTargetV1(application, applicationId);
  const desktop = web.desktop ?? null;
  if (desktop === null) {
    commandErrorV1(
      "project.desktop_unconfigured",
      `application "${applicationId}" declares no web.desktop target`,
      `/applications/${applicationId}/web/desktop`,
    );
  }
  const rawTargets: unknown = options.targets;
  if (rawTargets !== undefined && !Array.isArray(rawTargets)) {
    commandErrorV1(
      "project.desktop_target_unsupported",
      "desktop targets must be an array of SillyMaker-supported target triples",
      "/options/targets",
    );
  }
  const targetValues = rawTargets ?? [];
  for (const target of targetValues) {
    if (!isDesktopTargetTripleV1(target)) {
      commandErrorV1(
        "project.desktop_target_unsupported",
        `desktop target "${String(target)}" is not in SillyMaker's supported target allowlist`,
        "/options/targets",
      );
    }
  }
  const explicitTargets = targetValues as readonly DesktopTargetTripleV1[];
  if (new Set(explicitTargets).size !== explicitTargets.length) {
    commandErrorV1(
      "project.desktop_target_duplicate",
      "desktop targets must not contain duplicates",
      "/options/targets",
    );
  }
  const rawCompression: unknown = options.compress;
  if (
    rawCompression !== undefined &&
    rawCompression !== true &&
    rawCompression !== "xz" &&
    rawCompression !== "lzma" &&
    rawCompression !== "zstd"
  ) {
    commandErrorV1(
      "project.desktop_compression_unsupported",
      `desktop compression "${String(rawCompression)}" is not supported`,
      "/options/compress",
    );
  }
  const compression = rawCompression as DesktopCompressionV1 | true | undefined;
  const requestedTargets: readonly (DesktopTargetTripleV1 | "host")[] = explicitTargets.length === 0
    ? ["host"]
    : explicitTargets;
  if (requestedTargets[0] === "host" && deps.runner.hostPlatform === null) {
    commandErrorV1(
      "project.desktop_host_unsupported",
      "desktop host packaging requires macOS, Windows, or Linux",
      `/applications/${applicationId}/web/desktop`,
    );
  }
  const hostPlatform = deps.runner.hostPlatform ?? "darwin";
  const needsDarwinIcon = requestedTargets.some((target) =>
    target === "host" ? hostPlatform === "darwin" : desktopIconAppliesV1(target)
  );
  const iconSourcePath = desktop.icon !== undefined && needsDarwinIcon
    ? `${deps.repositoryRoot}/${desktop.icon}`
    : null;
  if (iconSourcePath !== null) {
    const iconSize = await deps.runner.fileSize(iconSourcePath);
    if (iconSize === null || iconSize <= 0) {
      commandErrorV1(
        "project.desktop_icon_invalid",
        `desktop icon "${desktop.icon}" must be a non-empty regular file`,
        `/applications/${applicationId}/web/desktop/icon`,
      );
    }
  }

  const appRoot = applicationRootV1(deps.repositoryRoot, web.storyRoot);
  let collectedVersionStamp: CollectedVersionStampV1 | null = null;
  try {
    collectedVersionStamp = normalizeCollectedVersionStampInternalV1(
      deps.collectVersionStamp({ appRoot }),
    );
  } catch {
    // Human-facing diagnostics must never make a package build unavailable.
  }
  const versionStamp = collectedVersionStamp ??
    {
      applicationVersion: null,
      applicationCommit: null,
      engineVersion: null,
      engineCommit: null,
    };
  const artifactStem = desktopArtifactStemInternalV1(desktop.name, versionStamp);
  // Resolve and validate every final filename before starting the web build or
  // deleting any previous output.
  const outputPlans = requestedTargets.map((target) => ({
    target,
    outputName: desktopOutputNameV1(artifactStem, target, hostPlatform),
  }));

  // The desktop bundle wraps the exact bytes a web build produces around
  // the webview shell: the shell serves dist/ itself through Deno.serve
  // (the runtime points the window at whatever it binds) and owns a
  // records API over the platform user-data directory. Ports may vary per
  // launch; persistence lives in files, so origin drift is harmless.
  const build = await buildStoryApplicationWithReceiptInternalV1(
    project,
    applicationId,
    deps,
    {
      ...(options.sourcemap === undefined ? {} : { sourcemap: options.sourcemap }),
      ...(options.minify === undefined ? {} : { minify: options.minify }),
    },
    versionStamp,
  );
  if (!build.ok) {
    commandErrorV1(
      "project.desktop_build_failed",
      `web build for "${applicationId}" failed with exit code ${String(build.exitCode)}`,
      `/applications/${applicationId}/web/outDir`,
    );
  }

  // Desktop output lives beside (not inside) the web outDir so a later
  // `vite build` with emptyOutDir cannot delete a packaged bundle.
  const desktopRoot = `${deps.repositoryRoot}/${joinAppPathV1(web.storyRoot, "dist-desktop")}`;
  const stagingDir = `${desktopRoot}/staging`;
  await deps.runner.removeDirectory(desktopRoot);
  await deps.runner.copyDirectory(`${deps.repositoryRoot}/${web.outDir}`, `${stagingDir}/dist`);

  // Stage the shell: the template's placeholders become the application's
  // identity, and the record/static-path helpers ride along as sibling
  // modules. All sources ship inside @sillymaker/tooling, so packaging works
  // from any application root without a repository-level scripts directory.
  const shellTemplate = await deps.runner.readFile(
    fileURLToPath(new URL("../desktop/shell-main.ts", import.meta.url)),
  );
  await deps.runner.writeFile(
    `${stagingDir}/main.ts`,
    shellTemplate
      .replace('"__SILLYMAKER_APP_IDENTIFIER__"', JSON.stringify(desktop.identifier))
      .replace('"__SILLYMAKER_DIST_DIR__"', JSON.stringify("dist")),
  );
  // Every module shell-main.ts imports must ship into the staging directory,
  // or the `deno desktop` type-check fails on a missing local specifier.
  const shellModuleNames = [
    "application-bootstrap-html.mts",
    "desktop-html.mts",
    "desktop-shell-arguments.mts",
    "file-download-handler.mts",
    "shell-http-admission.mts",
    "record-file-store.mts",
    "record-http-handler.mts",
    "shell-lifetime.mts",
    "static-file-path.mts",
  ] as const;
  for (const moduleName of shellModuleNames) {
    await deps.runner.writeFile(
      `${stagingDir}/${moduleName}`,
      await deps.runner.readFile(
        fileURLToPath(new URL(`../desktop/${moduleName}`, import.meta.url)),
      ),
    );
  }
  const iconArgs: string[] = [];
  if (desktop.icon !== undefined && iconSourcePath !== null) {
    const iconName = `icon.${desktop.icon.split(".").pop() ?? "png"}`;
    await deps.runner.copyFile(iconSourcePath, `${stagingDir}/${iconName}`);
    iconArgs.push("--icon", iconName);
  }
  await deps.runner.writeFile(
    `${stagingDir}/deno.json`,
    `${
      JSON.stringify(
        {
          desktop: {
            app: { name: desktop.name, identifier: desktop.identifier },
            backend: "webview",
          },
        },
        null,
        2,
      )
    }\n`,
  );

  const compressArgs = compression === undefined
    ? []
    : compression === true
    ? ["--compress"]
    : [`--compress=${compression}`];

  const outputs: StoryDesktopOutputV1[] = [];
  for (const { target, outputName } of outputPlans) {
    const outputPath = `${desktopRoot}/${outputName}`;
    let exitCode: number;
    try {
      exitCode = await deps.runner.run(
        "deno",
        [
          "desktop",
          "--allow-env",
          "--allow-read",
          "--allow-write",
          "--allow-net",
          "--include",
          "dist",
          ...compressArgs,
          ...(target === "host" ? [] : ["--target", target]),
          ...(target === "host"
            ? hostPlatform === "darwin" ? iconArgs : []
            : desktopIconAppliesV1(target)
            ? iconArgs
            : []),
          "--output",
          `../${outputName}`,
          "main.ts",
        ],
        { cwd: stagingDir },
      );
    } catch {
      commandErrorV1(
        "project.desktop_deno_missing",
        "`deno` was not found on PATH; install or upgrade to the latest stable Deno for Desktop previews",
        `/applications/${applicationId}/web/desktop`,
      );
    }
    const bundleMarker = await deps.runner.fileSize(desktopOutputMarkerV1(outputPath));
    outputs.push(
      {
        target,
        outputPath,
        ok: exitCode === 0 && bundleMarker !== null && bundleMarker > 0,
        exitCode,
      },
    );
  }

  const firstOutput = outputs[0];
  if (firstOutput === undefined) {
    commandErrorV1(
      "project.desktop_unconfigured",
      `desktop packaging for "${applicationId}" produced no outputs`,
      `/applications/${applicationId}/web/desktop`,
    );
  }
  return {
    applicationId: application.applicationId,
    ok: outputs.every((output) => output.ok),
    stagingDir,
    outputPath: firstOutput.outputPath,
    exitCode: outputs.find((output) => output.exitCode !== 0)?.exitCode ?? 0,
    outputs,
  };
}

export interface StoryDevSmokeReportV1 {
  readonly applicationId: string;
  readonly ok: boolean;
  readonly url: string;
  readonly markersFound: readonly string[];
}

const devSmokePortV1 = 41739;
const devSmokeAttemptsV1 = 60;
const devSmokeIntervalMsV1 = 500;

/**
 * Boots the dev server for the application and proves the page it serves
 * carries the application root and entry module before shutting down.
 */
export async function devSmokeStoryApplicationV1(
  project: SillymakerProjectConfigV1,
  applicationId: string,
  deps: { readonly runner: ProjectCommandRunnerV1; readonly repositoryRoot: string },
): Promise<StoryDevSmokeReportV1> {
  const application = resolveStoryApplicationV1(project, applicationId);
  const web = requireWebTargetV1(application, applicationId);
  const url = `http://127.0.0.1:${String(devSmokePortV1)}/`;
  const server = deps.runner.start(
    "deno",
    [
      "run",
      "-A",
      "npm:vite",
      "--host",
      "127.0.0.1",
      "--port",
      String(devSmokePortV1),
      "--strictPort",
    ],
    { cwd: applicationRootV1(deps.repositoryRoot, web.storyRoot) },
  );
  try {
    let body: string | null = null;
    for (let attempt = 0; attempt < devSmokeAttemptsV1; attempt += 1) {
      try {
        const response = await deps.runner.fetchText(url);
        if (response.status === 200) {
          body = response.body;
          break;
        }
      } catch {
        // The server is still starting; keep polling within the budget.
      }
      await deps.runner.sleep(devSmokeIntervalMsV1);
    }
    if (body === null) {
      commandErrorV1(
        "project.dev_smoke_unreachable",
        `dev server for "${applicationId}" did not answer at ${url}`,
        `/applications/${applicationId}/web`,
      );
    }
    const markers = ['id="root"', web.applicationEntry.split("/").at(-1) ?? ""];
    const markersFound = markers.filter((marker) => marker !== "" && body.includes(marker));
    return {
      applicationId: application.applicationId,
      ok: markersFound.length === markers.filter((marker) => marker !== "").length,
      url,
      markersFound,
    };
  } finally {
    server.kill();
  }
}

export interface StoryPrebuiltSmokeReportV1 {
  readonly applicationId: string;
  readonly ok: boolean;
  readonly outDir: string;
  readonly checkedFiles: readonly string[];
  readonly missingFiles: readonly string[];
}

const prebuiltReferencePatternV1 = /(?:src|href)="(\.\/[^"]+)"/gu;

/**
 * Verifies the built Artifact without a browser: the entry HTML exists and
 * every relative script/stylesheet it references is present and non-empty.
 * Browser-level prebuilt behavior stays with the Playwright suites.
 */
export async function prebuiltSmokeStoryApplicationV1(
  project: SillymakerProjectConfigV1,
  applicationId: string,
  deps: { readonly runner: ProjectCommandRunnerV1; readonly repositoryRoot: string },
): Promise<StoryPrebuiltSmokeReportV1> {
  const application = resolveStoryApplicationV1(project, applicationId);
  const web = requireWebTargetV1(application, applicationId);
  const indexPath = `${deps.repositoryRoot}/${web.outDir}/index.html`;
  let html: string;
  try {
    html = await deps.runner.readFile(indexPath);
  } catch {
    commandErrorV1(
      "project.prebuilt_missing",
      `built Artifact for "${applicationId}" has no ${web.outDir}/index.html — run build first`,
      `/applications/${applicationId}/web/outDir`,
    );
  }
  const checkedFiles: string[] = [];
  const missingFiles: string[] = [];
  for (const match of html.matchAll(prebuiltReferencePatternV1)) {
    const reference = match[1];
    if (reference === undefined) continue;
    const filePath = `${deps.repositoryRoot}/${web.outDir}/${reference.slice(2)}`;
    checkedFiles.push(reference);
    const size = await deps.runner.fileSize(filePath);
    if (size === null || size === 0) missingFiles.push(reference);
  }
  return {
    applicationId: application.applicationId,
    ok: missingFiles.length === 0 && checkedFiles.length > 0,
    outDir: web.outDir,
    checkedFiles,
    missingFiles,
  };
}

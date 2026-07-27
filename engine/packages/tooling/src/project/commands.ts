// SPDX-License-Identifier: MIT
import type {
  DiagnosticEnvelopeV1,
  GamePackageV1,
  ResolvedAssetManifestV1,
  StageSceneGraphV1,
} from "@sillymaker/base";
import {
  AuthoringDiagnosticErrorV1,
  collectGamePackageDiagnosticsV1,
  createDiagnosticV1,
  resolveGamePackageV1,
} from "@sillymaker/base";

import type { SillymakerProjectConfigV1 } from "./config.js";
import { resolveStoryApplicationV1 } from "./config.js";

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
  readonly sceneGraph: StageSceneGraphV1;
  readonly assets: ResolvedAssetManifestV1;
}

const inspectionBuildIdentityV1 = Object.freeze({
  engineVersion: "SillyMaker tooling inspection",
  engine: Object.freeze([]),
  storySimulation: Object.freeze([]),
  storyPresentation: Object.freeze([]),
  application: Object.freeze([]),
}) satisfies Parameters<typeof resolveGamePackageV1>[2];

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
  readonly stageSceneIds: readonly string[];
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
    return Object.freeze({
      kind: "invalid" as const,
      diagnostics:
        diagnostics.kind === "invalid"
          ? diagnostics.diagnostics
          : Object.freeze([
              createDiagnosticV1({
                code: result.failure.code,
                phase: "resolution",
                message: "Story resolution failed",
                details: {},
              }),
            ]),
    });
  }
  const resolved = result.resolved as unknown as InspectableResolvedV1;
  return Object.freeze({
    kind: "inspected" as const,
    report: Object.freeze({
      applicationId: application.applicationId,
      label: application.label,
      story: resolved.provenance.story,
      engine: resolved.provenance.engine,
      stateContract: Object.freeze({
        revision: resolved.provenance.resolved.stateContractRevision,
        digest: resolved.provenance.resolved.stateContractDigest,
      }),
      simulationDigest: resolved.provenance.resolved.simulationDigest,
      presentationDigest: resolved.provenance.resolved.presentationDigest,
      stageSceneIds: Object.freeze(
        resolved.sceneGraph.stageScenes.map((scene) => scene.stageSceneId as string),
      ),
      assets: Object.freeze({
        packs: resolved.assets.packs.length,
        slots: resolved.assets.slots.length,
        assets: resolved.assets.assets.length,
        assetIds: Object.freeze(resolved.assets.assets.map((asset) => asset.assetId as string)),
      }),
    }),
  });
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
): Promise<StoryCheckReportV1> {
  const { application, entry } = await loadStoryEntryV1(project, applicationId, loader);
  const result = collectGamePackageDiagnosticsV1(entry);
  return Object.freeze({
    applicationId: application.applicationId,
    ok: result.kind === "valid",
    diagnostics: result.kind === "valid" ? Object.freeze([]) : result.diagnostics,
  });
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
}

export interface StorySimulateOptionsV1 {
  readonly script?: readonly unknown[];
  /** A named scenario from the target's `scenarios` registry. */
  readonly scenario?: string;
  /** Deterministic bootstrap seed forwarded to the target factory. */
  readonly seed?: number;
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
    const initialPublication = target.agent.observe();
    const steps: StorySimulateStepV1[] = [];
    for (const [index, invocation] of script.entries()) {
      const result = await target.agent.dispatch(invocation);
      steps.push(Object.freeze({ ordinal: index + 1, invocation, result }));
    }
    return Object.freeze({
      applicationId: application.applicationId,
      storyIdentity: target.agent.identity(),
      initialPublication,
      steps: Object.freeze(steps),
      finalPublication: target.agent.observe(),
      finalStateDigest: target.stateDigest === undefined ? null : target.stateDigest(),
      scenario: options.scenario ?? null,
      seed: options.seed ?? null,
    });
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
  /** Runs a command to completion and resolves with its exit code. */
  run(command: string, args: readonly string[], options: { readonly cwd: string }): Promise<number>;
  /** Starts a long-running server process; kill() must terminate it. */
  start(
    command: string,
    args: readonly string[],
    options: { readonly cwd: string },
  ): { kill(): void };
  fetchText(url: string): Promise<{ readonly status: number; readonly body: string }>;
  sleep(milliseconds: number): Promise<void>;
  readFile(path: string): Promise<string>;
  fileSize(path: string): Promise<number | null>;
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

/** Builds the application's web target through the repository Vite config. */
export async function buildStoryApplicationV1(
  project: SillymakerProjectConfigV1,
  applicationId: string,
  deps: { readonly runner: ProjectCommandRunnerV1; readonly repositoryRoot: string },
): Promise<StoryBuildReportV1> {
  const application = resolveStoryApplicationV1(project, applicationId);
  const web = requireWebTargetV1(application, applicationId);
  const exitCode = await deps.runner.run(
    "pnpm",
    ["exec", "vite", "build", "--mode", applicationId],
    { cwd: deps.repositoryRoot },
  );
  return Object.freeze({
    applicationId: application.applicationId,
    ok: exitCode === 0,
    outDir: web.outDir,
    exitCode,
  });
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
    "pnpm",
    [
      "exec",
      "vite",
      "--mode",
      applicationId,
      "--host",
      "127.0.0.1",
      "--port",
      String(devSmokePortV1),
      "--strictPort",
    ],
    { cwd: deps.repositoryRoot },
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
    return Object.freeze({
      applicationId: application.applicationId,
      ok: markersFound.length === markers.filter((marker) => marker !== "").length,
      url,
      markersFound: Object.freeze(markersFound),
    });
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
  return Object.freeze({
    applicationId: application.applicationId,
    ok: missingFiles.length === 0 && checkedFiles.length > 0,
    outDir: web.outDir,
    checkedFiles: Object.freeze(checkedFiles),
    missingFiles: Object.freeze(missingFiles),
  });
}

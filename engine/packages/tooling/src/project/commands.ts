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
}

export type StorySimulationTargetFactoryV1 = () => Promise<StorySimulationTargetV1>;

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
}

export interface StorySimulateOptionsV1 {
  readonly script?: readonly unknown[];
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
    await (factory as StorySimulationTargetFactoryV1)(),
    pointer,
  );
  try {
    const script = options.script ?? target.defaultScript ?? [];
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
    });
  } finally {
    await target.dispose();
  }
}

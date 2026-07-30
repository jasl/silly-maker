// SPDX-License-Identifier: MIT
import type {
  BootstrapEntropyV1,
  GameApplicationPortV1,
  GameBootstrapInputV1,
  GameBootstrapResolutionResultV1,
  GamePackageResolutionFailureCodeV1,
  GamePackageResolutionFailureV1,
  GamePackageResolutionResultV1,
  GameCommandExecutorV1,
  GameDebugCommandExecutorV1,
  GameDebugCommandValidationResultV1,
  GameSimulationTypeMapV1,
  GameSimulationV1,
  GameplayModuleBindingV1,
  GameplayModuleTupleForSimulationV1,
  LocaleId,
  LocalizedTextCatalogV1,
  ModuleId,
  NonZeroUint32,
  PatchSetAdoptionDeclarationV1,
  PersistenceStatusV1,
  ResolvedAssetPresentationV1,
  ResolvedPatchValuesV1,
  ResolvedTextPresentationV1,
  RunId,
  RunIntegrityReasonV1,
  RunIntegrityV1,
  RuntimeFaultBaseV1,
  RuntimeOperationFaultV1,
  SaveSlotHealthV1,
  SaveSlotSummaryV1,
  AssetDemandPlanV1,
  AudioIntentV1,
  InteractionRejectionCodeV1,
  InteractionResolutionOutcomeV1,
  InteractionResolutionV1,
  NarrativeGraphV1,
  NarrativePredictionV1,
  PendingInteractionV1,
  ResolvedAudioManifestV1,
  TransientEffectV1,
  SemanticStageStateV1,
  StageContentCatalogV1,
  StageMutationBatchOutcomeV1,
  StageMutationV1,
  StageRenderTargetV1,
  StageTargetChangeV1,
  StageTransitionCatalogV1,
  StageTransitionDefinitionV1,
  StateSlotId,
  StoryToolingEntryV1,
  TextCatalogSetV1,
} from "@sillymaker/base";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  createSaveRecordEnvelopeSchemaV1,
  createTransactionalRngV1,
  defineGameplayModule,
  defineGamePackage,
  defineGameSimulation,
  defineStoryToolingEntry,
  parseModuleId,
  parseNonZeroUint32,
  parseLocaleId,
  parseRunId,
  parseStateSlotId,
  parseTextCatalogSetV1,
  evaluateInteractionResolutionV1,
  parseNarrativeGraphV1,
  parsePendingInteractionV1,
  predictNarrativeDependenciesV1,
  lintNarrativeGraphV1,
  parseSemanticStageStateV1,
  projectStageRenderTargetV1,
  reduceStageMutationsV1,
  resolveGamePackageV1,
  rngStateV1Schema,
  runIntegrityV1Schema,
} from "@sillymaker/base";
import type {
  DiagnosticEnvelopeV1,
  DiagnosticPhaseV1,
  DiagnosticSeverityV1,
  GamePackageDiagnosticsResultV1,
  StandardSchemaLikeV1,
} from "@sillymaker/base";
import {
  AuthoringDiagnosticErrorV1,
  collectGamePackageDiagnosticsV1,
  createDiagnosticV1,
  createRuntimeSchemaV1,
  extractDiagnosticsV1,
  formatDiagnosticsHumanV1,
  fromStandardSchemaV1,
} from "@sillymaker/base";
import {
  collectGamePackageDiagnosticsV1 as authoringCollectGamePackageDiagnosticsV1,
  createRuntimeSchemaV1 as authoringCreateRuntimeSchemaV1,
  fromStandardSchemaV1 as authoringFromStandardSchemaV1,
} from "@sillymaker/base/authoring";
import {
  createCoreGameApplicationInstanceV1,
  createGameSessionV1,
  defineCoreGameApplicationV1,
  resolveCoreGameApplicationV1,
} from "@sillymaker/base/runtime";
import type {
  CoreGameApplicationInstanceV1,
  CorePresentationAnchorV1,
  CoreSemanticAdapterV1,
  GameSessionCompositionV1,
  GameSessionInputV1,
  GameSessionRuntimeControlV1,
  GameSessionV1,
} from "@sillymaker/base/runtime";
import {
  createFixedBootstrapEntropyV1,
  createGameHarnessV1,
  createMemoryHostRecordStoreV1,
  createSyntheticCounterGamePackageV1,
  prepareSnapshotCommitSequenceWorkloadV1,
  prepareSnapshotCommitWorkloadV1,
  prepareSnapshotPersistenceWorkloadV1,
  prepareSnapshotReplayWorkloadV1,
  prepareSnapshotTransactionWorkloadV1,
  resolveStoryForTestV1,
  snapshotCommitSequenceClassesV1,
  snapshotCommitCommandClassesV1,
  snapshotCommitEntityCountsV1,
  snapshotTransactionCommandClassesV1,
  strictJsonRoundTripV1,
  validateToolingFixturesV1,
  validateStoryV1,
} from "@sillymaker/base/testkit";
import type {
  PreparedSnapshotCommitWorkloadV1,
  PreparedSnapshotCommitSequenceWorkloadV1,
  PreparedSnapshotPersistenceWorkloadV1,
  PreparedSnapshotReplayWorkloadV1,
  PreparedSnapshotTransactionWorkloadV1,
  SnapshotCommitCommandClassV1,
  SnapshotCommitEntityCountV1,
  SnapshotCommitSequenceClassV1,
  SnapshotCommitSequenceWorkloadDescriptorV1,
  SnapshotCommitSequenceWorkloadRunV1,
  SnapshotCommitWorkloadDescriptorV1,
  SnapshotCommitWorkloadRunV1,
  SnapshotPersistenceWorkCountsV1,
  SnapshotPersistenceWorkloadDescriptorV1,
  SnapshotPersistenceWorkloadRunV1,
  SnapshotPersistenceWorkloadStepV1,
  SnapshotReplayWorkloadDescriptorV1,
  SnapshotReplayWorkloadRunV1,
  SnapshotSessionWorkCountsV1,
  SnapshotTransactionCommandClassV1,
  SnapshotTransactionWorkloadDescriptorV1,
} from "@sillymaker/base/testkit";

export type BaseConsumerTypesV1 = {
  application: GameApplicationPortV1<unknown, unknown, unknown, unknown, unknown, unknown>;
  entropy: BootstrapEntropyV1;
  bootstrap: GameBootstrapInputV1;
  bootstrapResolution: GameBootstrapResolutionResultV1<unknown, unknown>;
  packageResolution: GamePackageResolutionResultV1<unknown>;
  packageResolutionFailure: GamePackageResolutionFailureV1;
  packageResolutionFailureCode: GamePackageResolutionFailureCodeV1;
  commandExecutor: GameCommandExecutorV1<unknown, unknown, unknown, unknown>;
  debugCommandExecutor: GameDebugCommandExecutorV1<unknown, unknown, unknown, unknown, unknown>;
  debugValidation: GameDebugCommandValidationResultV1<unknown>;
  simulation: GameSimulationTypeMapV1<GameBootstrapInputV1, unknown, unknown>;
  gameSession: GameSessionV1<GameSimulationTypeMapV1>;
  gameSessionComposition: GameSessionCompositionV1<GameSimulationTypeMapV1>;
  gameSessionInput: GameSessionInputV1<GameSimulationTypeMapV1>;
  gameSessionRuntimeControl: GameSessionRuntimeControlV1<unknown>;
  coreApplicationInstance: CoreGameApplicationInstanceV1<
    GameSimulationTypeMapV1,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown
  >;
  corePresentationAnchor: CorePresentationAnchorV1;
  coreSemanticAdapter: CoreSemanticAdapterV1<
    GameSimulationTypeMapV1,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown
  >;
  simulationContract: GameSimulationV1<
    GameSimulationTypeMapV1,
    readonly GameplayModuleBindingV1[],
    GameCommandExecutorV1<unknown, unknown, unknown, unknown>,
    GameDebugCommandExecutorV1<unknown, unknown, unknown, unknown, unknown>
  >;
  moduleId: ModuleId;
  localeId: LocaleId;
  localizedTextCatalog: LocalizedTextCatalogV1;
  seed: NonZeroUint32;
  adoption: PatchSetAdoptionDeclarationV1;
  persistenceStatus: PersistenceStatusV1;
  assetPresentation: ResolvedAssetPresentationV1<unknown, unknown, unknown>;
  patchValues: ResolvedPatchValuesV1<unknown>;
  textPresentation: ResolvedTextPresentationV1<unknown, unknown>;
  textCatalogSet: TextCatalogSetV1;
  runId: RunId;
  runIntegrity: RunIntegrityV1;
  runIntegrityReason: RunIntegrityReasonV1;
  runtimeFaultBase: RuntimeFaultBaseV1;
  runtimeOperationFault: RuntimeOperationFaultV1;
  saveSlotHealth: SaveSlotHealthV1;
  saveSlotSummary: SaveSlotSummaryV1;
  stateSlotId: StateSlotId;
  tooling: StoryToolingEntryV1<unknown>;
  semanticStageState: SemanticStageStateV1;
  stageMutation: StageMutationV1;
  stageMutationBatchOutcome: StageMutationBatchOutcomeV1;
  stageContentCatalog: StageContentCatalogV1;
  stageRenderTarget: StageRenderTargetV1;
  stageTransitionDefinition: StageTransitionDefinitionV1;
  stageTransitionCatalog: StageTransitionCatalogV1;
  stageTargetChange: StageTargetChangeV1;
  pendingInteraction: PendingInteractionV1;
  narrativeGraph: NarrativeGraphV1;
  narrativePrediction: NarrativePredictionV1;
  interactionResolution: InteractionResolutionV1;
  interactionResolutionOutcome: InteractionResolutionOutcomeV1;
  interactionRejectionCode: InteractionRejectionCodeV1;
  audioIntent: AudioIntentV1;
  audioManifest: ResolvedAudioManifestV1;
  assetDemandPlan: AssetDemandPlanV1;
  transientEffect: TransientEffectV1;
  preparedSnapshotCommitWorkload: PreparedSnapshotCommitWorkloadV1;
  preparedSnapshotCommitSequenceWorkload: PreparedSnapshotCommitSequenceWorkloadV1;
  preparedSnapshotPersistenceWorkload: PreparedSnapshotPersistenceWorkloadV1;
  preparedSnapshotReplayWorkload: PreparedSnapshotReplayWorkloadV1;
  preparedSnapshotTransactionWorkload: PreparedSnapshotTransactionWorkloadV1;
  snapshotCommitCommandClass: SnapshotCommitCommandClassV1;
  snapshotCommitEntityCount: SnapshotCommitEntityCountV1;
  snapshotCommitSequenceClass: SnapshotCommitSequenceClassV1;
  snapshotCommitSequenceWorkloadDescriptor: SnapshotCommitSequenceWorkloadDescriptorV1;
  snapshotCommitSequenceWorkloadRun: SnapshotCommitSequenceWorkloadRunV1;
  snapshotCommitWorkloadDescriptor: SnapshotCommitWorkloadDescriptorV1;
  snapshotCommitWorkloadRun: SnapshotCommitWorkloadRunV1;
  snapshotPersistenceWorkCounts: SnapshotPersistenceWorkCountsV1;
  snapshotPersistenceWorkloadDescriptor: SnapshotPersistenceWorkloadDescriptorV1;
  snapshotPersistenceWorkloadRun: SnapshotPersistenceWorkloadRunV1;
  snapshotPersistenceWorkloadStep: SnapshotPersistenceWorkloadStepV1;
  snapshotReplayWorkloadDescriptor: SnapshotReplayWorkloadDescriptorV1;
  snapshotReplayWorkloadRun: SnapshotReplayWorkloadRunV1;
  snapshotSessionWorkCounts: SnapshotSessionWorkCountsV1;
  snapshotTransactionCommandClass: SnapshotTransactionCommandClassV1;
  snapshotTransactionWorkloadDescriptor: SnapshotTransactionWorkloadDescriptorV1;
};

declare const publicSessionCompositionV1: GameSessionCompositionV1<GameSimulationTypeMapV1>;
// @ts-expect-error the private current digest is not exposed on the composition
publicSessionCompositionV1.currentStateDigest;
// @ts-expect-error Story consumers cannot read or write the private current digest
publicSessionCompositionV1.session.currentStateDigest;
// @ts-expect-error runtime control cannot inject a replacement digest
publicSessionCompositionV1.runtimeControl.setCurrentStateDigest;
// @ts-expect-error runtime control cannot expose the installed-Snapshot digest lookup
publicSessionCompositionV1.runtimeControl.lookupInstalledSnapshotDigest;

export type BaseConsumerValuesV1 = {
  createCoreGameApplicationInstance: typeof createCoreGameApplicationInstanceV1;
  createGameSession: typeof createGameSessionV1;
  createGameHarness: typeof createGameHarnessV1;
  defineCoreGameApplication: typeof defineCoreGameApplicationV1;
  resolveCoreGameApplication: typeof resolveCoreGameApplicationV1;
  createFixedBootstrapEntropy: typeof createFixedBootstrapEntropyV1;
  createMemoryHostRecordStore: typeof createMemoryHostRecordStoreV1;
  prepareSnapshotCommitWorkload: typeof prepareSnapshotCommitWorkloadV1;
  prepareSnapshotCommitSequenceWorkload: typeof prepareSnapshotCommitSequenceWorkloadV1;
  prepareSnapshotPersistenceWorkload: typeof prepareSnapshotPersistenceWorkloadV1;
  prepareSnapshotReplayWorkload: typeof prepareSnapshotReplayWorkloadV1;
  prepareSnapshotTransactionWorkload: typeof prepareSnapshotTransactionWorkloadV1;
  createGameSnapshotEnvelopeSchema: typeof createGameSnapshotEnvelopeSchemaV1;
  createPristineRunIntegrity: typeof createPristineRunIntegrityV1;
  createSaveRecordEnvelopeSchema: typeof createSaveRecordEnvelopeSchemaV1;
  createSyntheticCounterGamePackage: typeof createSyntheticCounterGamePackageV1;
  createTransactionalRng: typeof createTransactionalRngV1;
  defineGameplayModule: typeof defineGameplayModule;
  defineGamePackage: typeof defineGamePackage;
  defineGameSimulation: typeof defineGameSimulation;
  defineStoryToolingEntry: typeof defineStoryToolingEntry;
  parseModuleId: typeof parseModuleId;
  parseNonZeroUint32: typeof parseNonZeroUint32;
  parseLocaleId: typeof parseLocaleId;
  parseRunId: typeof parseRunId;
  parseStateSlotId: typeof parseStateSlotId;
  parseTextCatalogSet: typeof parseTextCatalogSetV1;
  parseSemanticStageState: typeof parseSemanticStageStateV1;
  projectStageRenderTarget: typeof projectStageRenderTargetV1;
  reduceStageMutations: typeof reduceStageMutationsV1;
  evaluateInteractionResolution: typeof evaluateInteractionResolutionV1;
  parsePendingInteraction: typeof parsePendingInteractionV1;
  parseNarrativeGraph: typeof parseNarrativeGraphV1;
  lintNarrativeGraph: typeof lintNarrativeGraphV1;
  predictNarrativeDependencies: typeof predictNarrativeDependenciesV1;
  resolveGamePackage: typeof resolveGamePackageV1;
  resolveStoryForTest: typeof resolveStoryForTestV1;
  rngStateSchema: typeof rngStateV1Schema;
  runIntegritySchema: typeof runIntegrityV1Schema;
  snapshotCommitCommandClasses: typeof snapshotCommitCommandClassesV1;
  snapshotCommitEntityCounts: typeof snapshotCommitEntityCountsV1;
  snapshotCommitSequenceClasses: typeof snapshotCommitSequenceClassesV1;
  snapshotTransactionCommandClasses: typeof snapshotTransactionCommandClassesV1;
  strictJsonRoundTrip: typeof strictJsonRoundTripV1;
  validateToolingFixtures: typeof validateToolingFixturesV1;
  validateStory: typeof validateStoryV1;
};

export type AuthoringConsumerValuesV1 = {
  authoringDiagnosticError: typeof AuthoringDiagnosticErrorV1;
  collectGamePackageDiagnostics: typeof collectGamePackageDiagnosticsV1;
  createDiagnostic: typeof createDiagnosticV1;
  createRuntimeSchema: typeof createRuntimeSchemaV1;
  extractDiagnostics: typeof extractDiagnosticsV1;
  formatDiagnosticsHuman: typeof formatDiagnosticsHumanV1;
  fromStandardSchema: typeof fromStandardSchemaV1;
  authoringEntryCollect: typeof authoringCollectGamePackageDiagnosticsV1;
  authoringEntryCreateRuntimeSchema: typeof authoringCreateRuntimeSchemaV1;
  authoringEntryFromStandardSchema: typeof authoringFromStandardSchemaV1;
};

export type AuthoringConsumerTypesV1 = {
  envelope: DiagnosticEnvelopeV1;
  phase: DiagnosticPhaseV1;
  severity: DiagnosticSeverityV1;
  packageDiagnostics: GamePackageDiagnosticsResultV1;
  standardSchemaLike: StandardSchemaLikeV1<unknown>;
};

declare const inferenceWitnessSchemaV1: StandardSchemaLikeV1<{ readonly count: number }> & {
  readonly "~standard": { readonly types: { readonly output: { readonly count: number } } };
};
export const inferredStandardSchemaOutputV1: { readonly count: number } = fromStandardSchemaV1(
  inferenceWitnessSchemaV1,
).parse({});

export type GameplayModuleDefinitionV1 = ReturnType<
  typeof defineGameplayModule<GameSimulationTypeMapV1>
>;
export type GameSimulationDefinitionV1 = ReturnType<
  typeof defineGameSimulation<GameSimulationTypeMapV1>
>;

interface WitnessTypesAV1 extends GameSimulationTypeMapV1<
  GameBootstrapInputV1,
  { readonly simulation: { readonly a: number } },
  { readonly cursor: number }
> {
  readonly command: { readonly kind: "witness.a" };
}

interface WitnessTypesBV1 extends GameSimulationTypeMapV1<
  GameBootstrapInputV1,
  { readonly simulation: { readonly b: number } },
  { readonly cursor: number }
> {
  readonly command: { readonly kind: "witness.b" };
}

type AssertNever<TValue extends never> = TValue;
export type CrossWitnessModuleIsRejectedV1 = AssertNever<
  GameplayModuleTupleForSimulationV1<
    WitnessTypesAV1,
    readonly [GameplayModuleBindingV1<WitnessTypesBV1>]
  >[0]
>;

export const inferredResolvedGameV1 = resolveStoryForTestV1(createSyntheticCounterGamePackageV1());
export const inferredSyntheticProgramKindV1: "synthetic-counter" =
  inferredResolvedGameV1.simulationProgram.kind;
export const inferredSyntheticPresentationKindV1: "synthetic-presentation" =
  inferredResolvedGameV1.presentation.kind;
export const inferredSyntheticGameProjectionV1 =
  inferredResolvedGameV1.gameSimulation.projectGameView;

// @ts-expect-error the public helper requires defineGameplayModule<TTypes>()(binding)
export type ForbiddenOneStageGameplayModuleInputV1 = Parameters<typeof defineGameplayModule>[0];
// @ts-expect-error the public helper requires defineGameSimulation<TTypes>()(simulation)
export type ForbiddenOneStageGameSimulationInputV1 = Parameters<typeof defineGameSimulation>[0];

// @ts-expect-error parsers do not carry a V1 suffix
export { parseModuleIdV1 } from "@sillymaker/base";
// @ts-expect-error parsers do not carry a V1 suffix
export { parseNonZeroUint32V1 } from "@sillymaker/base";
// @ts-expect-error parsers do not carry a V1 suffix
export { parseStateSlotIdV1 } from "@sillymaker/base";
// @ts-expect-error internal compatibility decoder is not public
export type OldProfile = import("@sillymaker/base").GameProfileV1;
// @ts-expect-error internal compatibility decoder is not public
export { defineGameProfile } from "@sillymaker/base";
// @ts-expect-error internal compatibility decoder is not public
export type OldModule = import("@sillymaker/base").GameModuleBindingV1;
// @ts-expect-error internal compatibility decoder is not public
export { defineGameModule } from "@sillymaker/base";
// @ts-expect-error internal compatibility decoder is not public
export type OldCoordinator = import("@sillymaker/base").CommandCoordinatorV1;
// @ts-expect-error removed after the Story tooling rename
export type OldDevelopmentEntry = import("@sillymaker/base").StoryDevelopmentEntryV1<unknown>;
// @ts-expect-error removed after the Story tooling rename
export { defineStoryDevelopmentEntry } from "@sillymaker/base";
// @ts-expect-error removed after the Story tooling rename
export { validateDevelopmentFixturesV1 } from "@sillymaker/base/testkit";
// @ts-expect-error replaced by ResolvedGameV1
export type OldResolvedStory = import("@sillymaker/base").ResolvedStoryV1;
// @ts-expect-error removed after the GameSession rename
export type { EngineSessionV1 as OldEngineSessionV1 } from "@sillymaker/base/runtime";
// @ts-expect-error removed after the GameSession rename
export type { EngineSessionRuntimeControlV1 as OldEngineSessionRuntimeControlV1 } from "@sillymaker/base/runtime";
// @ts-expect-error removed after the GameSession rename
export { createEngineSessionV1 } from "@sillymaker/base/runtime";
// @ts-expect-error RunIntegrity mutation authority is Session-internal
export { markRunModifiedV1 } from "@sillymaker/base";
// @ts-expect-error RunIntegrity mutation authority is Session-internal
export type ForbiddenIntegrityDirectiveV1 = import("@sillymaker/base").IntegrityDirectiveV1;
// @ts-expect-error RunIntegrity mutation authority is not exposed by the runtime barrel
export { markRunModifiedV1 as runtimeMarkRunModifiedV1 } from "@sillymaker/base/runtime";
// @ts-expect-error RunIntegrity directives are not exposed by the runtime barrel
export type { IntegrityDirectiveV1 } from "@sillymaker/base/runtime";
// @ts-expect-error import closure belongs to scripts, never Base/testkit
export { buildImportClosureV1 } from "@sillymaker/base/testkit";
// @ts-expect-error memory record stores are testkit-only, never Base root
export { createMemoryHostRecordStoreV1 as ForbiddenRootMemoryRecordStoreV1 } from "@sillymaker/base";
// @ts-expect-error raw Snapshot instrumentation stays package-internal
export { createSnapshotWorkCounterV1 } from "@sillymaker/base/testkit";
// @ts-expect-error raw transaction workload factories stay package-internal
export { createSnapshotTransactionWorkloadV1 } from "@sillymaker/base/testkit";
// @ts-expect-error raw persistence workload factories stay package-internal
export { createSnapshotPersistenceWorkloadV1 } from "@sillymaker/base/testkit";
// @ts-expect-error timed persistence workload helpers stay package-internal
export { prepareTimedSnapshotPersistenceWorkloadV1 } from "@sillymaker/base/testkit";
// @ts-expect-error memory-growth report helpers stay package-internal
export { createSnapshotMemoryGrowthReportV1 } from "@sillymaker/base/testkit";
// @ts-expect-error memory-growth workload helpers stay package-internal
export { prepareSnapshotMemoryGrowthWorkloadV1 } from "@sillymaker/base/testkit";
// @ts-expect-error memory-growth benchmark config stays package-internal
export { snapshotMemoryGrowthBenchmarkConfigV1 } from "@sillymaker/base/testkit";
// @ts-expect-error instrumentation types stay package-internal
export type { SnapshotWorkInstrumentationV1 } from "@sillymaker/base/testkit";
// @ts-expect-error Session digest-cache injection stays package-internal
export { createInstrumentedGameSessionV1 } from "@sillymaker/base/runtime";
// @ts-expect-error installed-Snapshot digest lookup stays package-internal
export { lookupInstalledSnapshotDigestInternalV1 } from "@sillymaker/base/runtime";
// @ts-expect-error CommandLog audit policy stays package-internal
export { createCommandLogInternalV1 } from "@sillymaker/base/runtime";
// @ts-expect-error instrumented replay helpers stay package-internal
export { replayAuthoritativelyFromAttemptsInternalV1 } from "@sillymaker/base/runtime";
// @ts-expect-error instrumented persistence factories stay package-internal
export { createInstrumentedPersistenceServiceV1 } from "@sillymaker/base/runtime";
// @ts-expect-error Save write receipt matcher stays package-internal
export { matchesCommittedSaveWriteReceiptInternalV1 } from "@sillymaker/base/runtime";
// @ts-expect-error instrumented Save codec helpers stay package-internal
export { encodeSaveRecordInternalV1 } from "@sillymaker/base/runtime";

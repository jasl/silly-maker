// SPDX-License-Identifier: MIT
export {
  agentCapabilityRevokedV1,
  compareAgentTranscriptsV1,
  createAgentDiagnosticsCapabilityV1,
  createAgentPersistenceCapabilityV1,
  createAgentTranscriptRecorderV1,
  createInProcessAgentGamePortV1,
} from "./application/agent-game-port.ts";
export type {
  AgentCapabilityHandleV1,
  AgentTranscriptComparisonV1,
  AgentCapabilityRevokedV1,
  AgentDiagnosticsCapabilityV1,
  AgentGamePortV1,
  AgentIdentityV1,
  AgentPersistenceCapabilityV1,
  AgentTranscriptEntryV1,
  AgentTranscriptRecorderV1,
  AgentWaitOptionsV1,
  AgentWaitResultV1,
  CreateAgentPersistenceCapabilityInputV1,
  CreateInProcessAgentGamePortInputV1,
} from "./application/agent-game-port.ts";
export {
  createCoreGameApplicationInstanceV1,
  defineCoreGameApplicationV1,
  resolveCoreGameApplicationV1,
} from "./application/core-game-application.ts";
export type {
  CoreApplicationAdminV1,
  CoreApplicationExtensionContextV1,
  CoreApplicationHostServicesV1,
  CoreAttemptForV1,
  CoreAutosavePolicyV1,
  CoreEpochBoundOutcomeV1,
  CoreGameApplicationDefinitionV1,
  CoreGameApplicationInstanceV1,
  CorePresentationAnchorOriginV1,
  CorePresentationAnchorV1,
  CoreRollbackPolicyV1,
  CoreRollbackPortV1,
  CoreRollbackResultV1,
  CoreSchedulerV1,
  CoreSemanticAdapterV1,
  CreateCoreGameApplicationInstanceOptionsV1,
  ResolveCoreGameApplicationOptionsV1,
  ResolveCoreGameApplicationResultV1,
  ResolvedCoreGameApplicationV1,
} from "./application/core-game-application.ts";
export { createRuntimeCapabilityPortV1 } from "./capabilities/runtime-capabilities.ts";
export { createCommandLogV1 } from "./diagnostics/command-log.ts";
export type {
  CommandLogCommandSourceV1,
  CommandLogV1,
  FinalizedCommandAttemptV1,
} from "./diagnostics/command-log.ts";
export { createDebugToolsPortV1 } from "./diagnostics/debug-tools.ts";
export type { CreateDebugToolsPortInputV1 } from "./diagnostics/debug-tools.ts";
export {
  engineDebugPatchErrorCodeV1,
  engineDebugPatchStateKindV1,
  executeEngineStatePatchV1,
  isEngineDebugPatchStateKindV1,
  parseEngineDebugPatchStateCommandV1,
  validateEngineStatePatchV1,
} from "./diagnostics/state-patch.ts";
export type {
  EngineDebugPatchStateCommandV1,
  EngineDebugPatchValidationErrorV1,
  EngineDebugPatchValidationResultV1,
  EnginePatchableSnapshotV1,
  EngineStatePatchLeafV1,
} from "./diagnostics/state-patch.ts";
export {
  createGameDiagnosticsServiceV1,
  decodeDebugBundleV1,
  encodeDebugBundleV1,
} from "./diagnostics/debug-bundle.ts";
export type {
  CreateGameDiagnosticsServiceInputV1,
  DebugBundleCodecContextV1,
  DebugBundleDecodeRejectionCodeV1,
  DebugBundleDecodeResultV1,
  DebugBundleDigestEnvelopeV1,
  DebugBundleReplayEvidenceV1,
} from "./diagnostics/debug-bundle.ts";
export {
  runtimeDiagnosticTextLimitsV1,
  scrubDiagnosticTextV1,
  scrubRuntimeOperationFaultV1,
} from "./diagnostics/privacy.ts";
export {
  createRuntimeFailureBufferV1,
  createRuntimeFailureReporterV1,
  createRuntimeHmrInvalidationReporterV1,
  normalizeRuntimeFailureV1,
} from "./diagnostics/runtime-failures.ts";
export type {
  RuntimeFailureAppendPortV1,
  RuntimeFailureBufferV1,
} from "./diagnostics/runtime-failures.ts";
export { inspectReplayBestEffortV1, replayAuthoritativelyV1 } from "./diagnostics/replay.ts";
export type {
  ReplayBlockingIdentityFieldV1,
  ReplayCommandLogEntryV1,
  ReplayCommandSourceV1,
  ReplayComparisonV1,
  ReplayDriverV1,
  ReplayEntryMismatchFieldV1,
  ReplayIdentityV1,
  ReplayInputV1,
  ReplayLoggedCommandShapeV1,
  ReplayLoggedCommandV1,
  ReplayMismatchV1,
  ReplayRecordedOutcomeV1,
} from "./diagnostics/replay.ts";
export {
  classifySaveCompatibilityV1,
  validateSaveImportCandidateV1,
} from "./persistence/compatibility.ts";
export { decodeSaveRecordV1, encodeSaveRecordV1 } from "./persistence/save-codec.ts";
export {
  createPlayerProfileStoreV1,
  defaultPlayerProfileV1,
  isSeenV1,
  markMetaV1,
  markSeenV1,
} from "./persistence/player-profile-store.ts";
export type {
  CreatePlayerProfileStoreOptionsV1,
  PlayerPlaybackPreferencesV1,
  PlayerProfileStoreV1,
  PlayerProfileV1,
} from "./persistence/player-profile-store.ts";
export { createAutoSaveQueueV1 } from "./persistence/auto-save-queue.ts";
export { createPersistenceServiceV1 } from "./persistence/persistence-service.ts";
export type {
  PersistenceAutoSaveCaptureV1,
  PersistenceLeaseAcquisitionV1,
  PersistenceRebootstrapDisposalV1,
  PersistenceRebootstrapTakeoverV1,
  PersistenceServiceV1,
} from "./persistence/persistence-service.ts";
export { createSemanticGamePortV1 } from "./application/semantic-game-port.ts";
export { createGameSessionV1 } from "./session/index.ts";
export type {
  AuthoritativeOutcomeV1,
  GameSessionCompositionV1,
  GameSessionInputV1,
  GameSessionRuntimeControlV1,
  GameSessionV1,
  RuntimeInvalidationControllerV1,
} from "./session/index.ts";
export type {
  GameSessionDebugAnchorV1,
  GameSessionDebugCommandResultV1,
  GameSessionDebugControlV1,
  GameSessionDebugInputV1,
} from "./session/game-session.ts";

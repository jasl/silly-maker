// SPDX-License-Identifier: MIT
export { defineGamePackage } from "./define-game-package.ts";
export { defineGameSimulation } from "./define-game-simulation.ts";
export { defineGameplayModule } from "./define-gameplay-module.ts";
export { defineStoryToolingEntry } from "./define-story-tooling-entry.ts";
export {
  definePatchSlot,
  definePresentationPatchSurface,
  defineSimulationPatchSurface,
} from "./patch-surface.ts";
export type { PatchSurfaceV1 } from "./patch-surface.ts";
export { resolveGamePackageV1 } from "./story-resolver.ts";
export { createRuntimeSchemaV1, fromStandardSchemaV1 } from "./runtime-schema.ts";
export type {
  RuntimeSchemaOptionsV1,
  StandardSchemaLikeV1,
  StandardSchemaOutputV1,
} from "./runtime-schema.ts";
export { createGameAuthoringKitV1 } from "./game-authoring-kit.ts";
export type {
  AuthoringKitAnyModuleV1,
  AuthoringKitAnyStatefulModuleV1,
  AuthoringKitAnyStatelessModuleV1,
  AuthoringKitBindingOfV1,
  AuthoringKitCompositionV1,
  AuthoringKitStatefulBindingV1,
  AuthoringKitStatefulModuleConfigV1,
  AuthoringKitStatefulModuleV1,
  AuthoringKitStatefulOwnerV1,
  AuthoringKitStatelessModuleConfigV1,
  AuthoringKitStatelessModuleV1,
  CapabilityProviderContextV1,
  CapabilityProvisionV1,
  CapabilityRequirementsV1,
  CapabilityTokenV1,
  DependencyPortsOfV1,
  GameAuthoringKitV1,
  KitAttemptOfV1,
  KitOwnerOperationOfV1,
  KitProposeResultV1,
  KitTransactionOutcomeV1,
  KitTransactionRunnerConfigV1,
  KitTransactionRunnerV1,
  KitTransactionV1,
  ProvideCapabilityV1,
} from "./game-authoring-kit.ts";
export { collectGamePackageDiagnosticsV1 } from "./package-diagnostics.ts";
export type {
  CollectGamePackageDiagnosticsOptionsV1,
  GamePackageDiagnosticsResultV1,
} from "./package-diagnostics.ts";

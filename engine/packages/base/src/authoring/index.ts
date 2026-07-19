// SPDX-License-Identifier: MIT
export { defineGamePackage } from "./define-game-package.js";
export { defineGameSimulation } from "./define-game-simulation.js";
export { defineGameplayModule } from "./define-gameplay-module.js";
export { defineStoryToolingEntry } from "./define-story-tooling-entry.js";
export {
  definePatchSlot,
  definePresentationPatchSurface,
  defineSimulationPatchSurface,
} from "./patch-surface.js";
export type { PatchSurfaceV1 } from "./patch-surface.js";
export { resolveGamePackageV1 } from "./story-resolver.js";
export { createRuntimeSchemaV1, fromStandardSchemaV1 } from "./runtime-schema.js";
export type {
  RuntimeSchemaOptionsV1,
  StandardSchemaLikeV1,
  StandardSchemaOutputV1,
} from "./runtime-schema.js";
export { createGameAuthoringKitV1 } from "./game-authoring-kit.js";
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
  ProvideCapabilityV1,
} from "./game-authoring-kit.js";
export { collectGamePackageDiagnosticsV1 } from "./package-diagnostics.js";
export type {
  CollectGamePackageDiagnosticsOptionsV1,
  GamePackageDiagnosticsResultV1,
} from "./package-diagnostics.js";

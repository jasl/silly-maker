// SPDX-License-Identifier: MIT
import type {
  DebugFixtureListResultV1,
  DebugToolsOperationResultV1,
  DebugToolsPortV1,
  GameApplicationPortV1,
  PlayerPersistencePortV1,
  PresentationReadPortV1,
  ReadonlyViewSourceV1,
  RuntimeCapabilitiesV1,
  RuntimeCapabilityPortV1,
  SaveBackupInspectionResultV1,
  SaveInspectionResultV1,
} from "@sillymaker/base";
import { createRuntimeCapabilityPortV1 } from "@sillymaker/base/runtime";
import type {
  CoreApplicationHostServicesV1,
  CreateCoreGameApplicationInstanceOptionsV1,
} from "@sillymaker/base/runtime";

declare const persistence: PlayerPersistencePortV1<
  { id: string },
  { available: boolean },
  { ok: boolean },
  { current: true },
  { stored: true },
  { owned: boolean },
  { updated: boolean },
  SaveInspectionResultV1,
  SaveBackupInspectionResultV1,
  { ok: boolean },
  { ok: boolean },
  { stored: true }
>;

export const storedExport: Promise<{ stored: true }> = persistence.exportSave("quick");
export const currentExport: Promise<{ current: true }> = persistence.exportCurrentSave();
export const inspectedSave: Promise<SaveInspectionResultV1> = persistence.inspectSave("quick");
export const inspectedBackup: Promise<SaveBackupInspectionResultV1> = persistence.inspectBackup(
  "quick",
);
export const upgradedSave: Promise<{ ok: boolean }> = persistence.upgradeSave("quick");
export const reanchoredSave: Promise<{ ok: boolean }> = persistence.reanchorSave("quick");
export const restoredBackup: Promise<{ ok: boolean }> = persistence.restoreBackup("quick");
export const exportedBackup: Promise<{ stored: true }> = persistence.exportBackup("quick");
export const discardedBackup: Promise<{ ok: boolean }> = persistence.discardBackup("quick");
// @ts-expect-error persistence exposes only single-slot inspection
persistence.inspectSaves;
// @ts-expect-error persistence exposes only single-slot backup inspection
persistence.inspectBackups;
// @ts-expect-error persistence never exposes raw Host storage
persistence.records;
// @ts-expect-error persistence never exposes package-internal backup keys
persistence.createSaveMigrationBackupRecordKey;
// @ts-expect-error persistence never accepts an inspection result as write authority
void persistence.upgradeSave(inspectedSave);

declare const inspection: SaveInspectionResultV1;
if (inspection.kind !== "faulted" || inspection.slotId !== null) inspection.slotId;
if (inspection.kind === "direct") inspection.warnings;
if (inspection.kind === "migration_required") inspection.migration.steps;
if (inspection.kind === "adoption_required") inspection.adoption.toSimulationDigest;
if (inspection.kind === "migration_and_adoption_required") {
  inspection.migration.steps;
  inspection.adoption.toSimulationDigest;
}
inspection.diagnostics.codes;
inspection.diagnostics.migrationAttempt;
if (inspection.kind === "inspect_only") {
  const code: "migration_unavailable" | "incompatible" | "reanchor_required" = inspection.code;
  code;
}
if (inspection.kind === "rejected") {
  const code: "empty_slot" | "unavailable" | "invalid_record" | "migration_rejected" =
    inspection.code;
  code;
  // @ts-expect-error incompatible outcomes are inspect-only, never rejected
  const incompatible: "incompatible" = inspection.code;
  incompatible;
}
if (inspection.kind === "faulted") {
  const slot: import("@sillymaker/base").SaveSlotIdV1 | null = inspection.slotId;
  slot;
}
// @ts-expect-error inspection never exposes a reusable Save candidate
inspection.candidate;
// @ts-expect-error inspection never exposes stored bytes
inspection.bytes;
// @ts-expect-error inspection never exposes the Host revision
inspection.hostRevision;
// @ts-expect-error inspection never exposes a commit capability
inspection.commit;
// @ts-expect-error inspection never exposes the repository authority
inspection.repository;

declare const backupInspection: SaveBackupInspectionResultV1;
if (backupInspection.kind === "available") backupInspection.slotId;
if (backupInspection.kind === "rejected") {
  const code: "empty_backup" | "unavailable" | "invalid_backup" = backupInspection.code;
  code;
}
if (backupInspection.kind === "faulted") {
  const slot: import("@sillymaker/base").SaveSlotIdV1 | null = backupInspection.slotId;
  slot;
}
// @ts-expect-error backup inspection never exposes stored bytes
backupInspection.bytes;
// @ts-expect-error backup inspection never exposes Host revision
backupInspection.hostRevision;
// @ts-expect-error backup inspection never exposes the storage key
backupInspection.key;

interface SyntheticSemanticPortV1 {
  readonly view: ReadonlyViewSourceV1<{}>;
  dispatch(command: { readonly kind: "synthetic" }): Promise<{ readonly kind: "accepted" }>;
}

type Application = GameApplicationPortV1<
  SyntheticSemanticPortV1,
  { createNewSession(): Promise<unknown>; restartSession(): Promise<unknown> },
  typeof persistence,
  { exportDebugBundle(): Promise<unknown> },
  { readonly kind: "unavailable" },
  { readonly kind: "unavailable"; readonly code: "debug_tools_not_installed" }
>;
declare const application: Application;
declare const presentation: PresentationReadPortV1<string, string, string, string, string>;

application.semantic;
application.lifecycle;
application.persistence;
application.diagnostics;
application.capabilities;
application.debugTools;

declare const capabilityPort: RuntimeCapabilityPortV1;
export const capabilityState: ReadonlyViewSourceV1<RuntimeCapabilitiesV1> = capabilityPort.state;
// @ts-expect-error capability state is read-only
capabilityPort.state.publish;

export type DisabledDebugOperation = DebugToolsOperationResultV1<{
  readonly kind: "allowed";
}>;
export type FixtureList = DebugFixtureListResultV1<"fixture.one">;
declare const fixtureList: FixtureList;
if (fixtureList.kind === "listed") fixtureList.fixtureIds;

declare const typedDebugTools: DebugToolsPortV1<
  string,
  never,
  string,
  never,
  never,
  never,
  never,
  never,
  never
>;
export { typedDebugTools };

const syntheticCapabilityPort = createRuntimeCapabilityPortV1({
  initialState: { debugTools: false, cheats: false, automationBridge: false },
  persist: async () => ({ kind: "committed" as const }),
});
export const composedApplication: Application = Object.freeze({
  semantic: application.semantic,
  lifecycle: application.lifecycle,
  persistence: application.persistence,
  diagnostics: application.diagnostics,
  capabilities: syntheticCapabilityPort as unknown as Application["capabilities"],
  debugTools: typedDebugTools as never,
});

// @ts-expect-error the unified application has no nested Player application
application.player;
// @ts-expect-error the unified application has no nested Developer application
application.developer;
// @ts-expect-error authoritative state is never public
application.snapshot;
// @ts-expect-error Presentation port does not expose raw catalogs
presentation.catalogs;
// @ts-expect-error Presentation results do not expose runtimePath
presentation.asset("a", "u").runtimePath;

// @ts-expect-error removed public ABI
export type OldPlayerPort = import("@sillymaker/base").PlayerApplicationPortV1<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>;
// @ts-expect-error removed public ABI
export type OldPlayerCommandPort = import("@sillymaker/base").PlayerCommandPortV1<unknown, unknown>;
// @ts-expect-error removed public ABI
export type OldDeveloperPort = import("@sillymaker/base").DeveloperApplicationPortV1<
  unknown,
  unknown
>;
// @ts-expect-error removed public ABI
export type OldDeveloperControl = import("@sillymaker/base").DeveloperControlPortV1<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>;

declare const coreHostV1: CoreApplicationHostServicesV1;
interface RequiredExecutionContextV1 {
  readonly scenePlanOwner: "required";
}

export const requiredExecutionContextOptionsV1: CreateCoreGameApplicationInstanceOptionsV1<
  RequiredExecutionContextV1
> = {
  host: coreHostV1,
  executionContext: { scenePlanOwner: "required" },
};

// @ts-expect-error A non-undefined execution-context contract must be supplied at construction.
export const missingRequiredExecutionContextOptionsV1: CreateCoreGameApplicationInstanceOptionsV1<
  RequiredExecutionContextV1
> = { host: coreHostV1 };

export const omittedUndefinedExecutionContextOptionsV1: CreateCoreGameApplicationInstanceOptionsV1<
  undefined
> = { host: coreHostV1 };

export const omittedUnionExecutionContextOptionsV1: CreateCoreGameApplicationInstanceOptionsV1<
  RequiredExecutionContextV1 | undefined
> = { host: coreHostV1 };

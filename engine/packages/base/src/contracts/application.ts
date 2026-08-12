// SPDX-License-Identifier: MIT
import type { RuntimeSessionStatusV1 } from "./session-status.ts";
import type { Brand, DeepReadonly, NonNegativeSafeInteger } from "./values.ts";

export interface ReadonlyViewSourceV1<TViewModel> {
  getCurrent(): DeepReadonly<TViewModel>;
  subscribe(listener: () => void): () => void;
}

export interface MutableViewPublisherV1<TViewModel> extends ReadonlyViewSourceV1<TViewModel> {
  publish(value: DeepReadonly<TViewModel>): void;
}

export function createReadonlyViewSourceV1<TViewModel>(
  initial: DeepReadonly<TViewModel>,
): MutableViewPublisherV1<TViewModel> {
  let current = initial;
  const listeners = new Set<() => void>();
  return Object.freeze({
    getCurrent: () => current,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(value: DeepReadonly<TViewModel>) {
      current = value;
      for (const listener of [...listeners]) listener();
    },
  });
}

export type RuntimeCapabilityIdV1 = "debug_tools" | "cheats" | "automation_bridge";

export interface RuntimeCapabilitiesV1 {
  readonly debugTools: boolean;
  readonly cheats: boolean;
  readonly automationBridge: boolean;
}

export type RuntimeCapabilityOperationResultV1 =
  | {
    readonly kind: "updated" | "unchanged";
    readonly state: DeepReadonly<RuntimeCapabilitiesV1>;
  }
  | {
    readonly kind: "rejected";
    readonly code: "conflict" | "unavailable";
    readonly state: DeepReadonly<RuntimeCapabilitiesV1>;
  };

export interface RuntimeCapabilityPortV1 {
  readonly state: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>;
  setEnabled(
    capability: RuntimeCapabilityIdV1,
    enabled: boolean,
  ): Promise<RuntimeCapabilityOperationResultV1>;
}

export type DebugToolsOperationResultV1<TAllowedResult> = TAllowedResult | {
  readonly kind: "capability_disabled";
};

export type DebugFixtureListResultV1<TFixtureId> = DebugToolsOperationResultV1<{
  readonly kind: "listed";
  readonly fixtureIds: readonly TFixtureId[];
}>;

export interface DebugToolsPortV1<
  TDebugCommand,
  TDebugResult,
  TFixtureId,
  TAnchorResult,
  TDebugInspection,
  TAuthoritativeReplayResult,
  TBestEffortReplayInspection,
  TDiagnosticQuery,
  TDiagnosticQueryResult,
> {
  listFixtures(): Promise<DebugFixtureListResultV1<TFixtureId>>;
  executeDebugCommand(
    command: DeepReadonly<TDebugCommand>,
  ): Promise<DebugToolsOperationResultV1<TDebugResult>>;
  anchorFixture(fixtureId: TFixtureId): Promise<DebugToolsOperationResultV1<TAnchorResult>>;
  inspectDebugBundle(bytes: Uint8Array): Promise<DebugToolsOperationResultV1<TDebugInspection>>;
  anchorDebugBundle(bytes: Uint8Array): Promise<DebugToolsOperationResultV1<TAnchorResult>>;
  replayAuthoritatively(
    bytes: Uint8Array,
  ): Promise<DebugToolsOperationResultV1<TAuthoritativeReplayResult>>;
  inspectReplayBestEffort(
    bytes: Uint8Array,
  ): Promise<DebugToolsOperationResultV1<TBestEffortReplayInspection>>;
  queryDiagnostics(
    query: DeepReadonly<TDiagnosticQuery>,
  ): Promise<DebugToolsOperationResultV1<TDiagnosticQueryResult>>;
}

export interface GameApplicationPortV1<
  TSemantic,
  TLifecycle,
  TPersistence,
  TDiagnostics,
  TCapabilities,
  TDebugTools,
> {
  readonly semantic: TSemantic;
  readonly lifecycle: TLifecycle;
  readonly persistence: TPersistence;
  readonly diagnostics: TDiagnostics;
  readonly capabilities: TCapabilities;
  readonly debugTools: TDebugTools;
}

export interface SessionLifecyclePortV1<TAnchorResult> {
  createNewSession(): Promise<TAnchorResult>;
  restartSession(): Promise<TAnchorResult>;
}

/** Numbered player-writable manual slot; the count is Story-configurable. */
export type ManualSaveSlotIdV1 = `manual.${number}`;
export type SaveSlotIdV1 = "auto.current" | "auto.previous" | "quick" | ManualSaveSlotIdV1;
export type PlayerWritableSaveSlotIdV1 = "quick" | ManualSaveSlotIdV1;

/** Engine default when an application does not declare `manualSaveSlotCount`. */
export const defaultManualSaveSlotCountV1 = 8;
/** Hard cap so slot enumeration and the Save UI stay bounded. */
export const maxManualSaveSlotCountV1 = 99;

const manualSaveSlotIdPatternV1 = /^manual\.(?:[1-9][0-9]?)$/u;

/** 1-based index of a `manual.<n>` slot ID; null when not a manual slot shape. */
export function manualSaveSlotIndexV1(value: string): number | null {
  if (!manualSaveSlotIdPatternV1.test(value)) return null;
  return Number(value.slice("manual.".length));
}

export function manualSaveSlotIdV1(index: number): ManualSaveSlotIdV1 {
  if (!Number.isSafeInteger(index) || index < 1 || index > maxManualSaveSlotCountV1) {
    throw new TypeError("invalid manual Save slot index");
  }
  return `manual.${index}`;
}

/** Structural slot-ID check (count-independent; count is enforced per application). */
export function isSaveSlotIdShapeV1(value: unknown): value is SaveSlotIdV1 {
  return (
    value === "auto.current" ||
    value === "auto.previous" ||
    value === "quick" ||
    (typeof value === "string" && manualSaveSlotIndexV1(value) !== null)
  );
}

export function isPlayerWritableSaveSlotIdV1(value: unknown): value is PlayerWritableSaveSlotIdV1 {
  return value === "quick" || (typeof value === "string" && manualSaveSlotIndexV1(value) !== null);
}

export function parseManualSaveSlotCountV1(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > maxManualSaveSlotCountV1
  ) {
    throw new TypeError("invalid manual Save slot count");
  }
  return value;
}

/**
 * Full slot enumeration for one application: autos, quick, manual.1..count.
 * A count of zero intentionally exposes no numbered manual slots (for
 * autosave/quick-save-only or ironman-style products).
 */
export function createSaveSlotIdsV1(manualSlotCount: number): readonly SaveSlotIdV1[] {
  const count = parseManualSaveSlotCountV1(manualSlotCount);
  const slotIds: SaveSlotIdV1[] = ["auto.current", "auto.previous", "quick"];
  for (let index = 1; index <= count; index += 1) slotIds.push(manualSaveSlotIdV1(index));
  return Object.freeze(slotIds);
}
export type SessionLeaseOwnerId = Brand<string, "SessionLeaseOwnerId">;
export type LeaseHandoffRequestId = Brand<string, "LeaseHandoffRequestId">;

export interface SessionLeasePortV1<TLeaseStatus, TLeaseOperationResult> {
  getStatus(): Promise<TLeaseStatus>;
  requestHandoff(): Promise<TLeaseOperationResult>;
  approveHandoff(requestId: LeaseHandoffRequestId): Promise<TLeaseOperationResult>;
  takeOver(): Promise<TLeaseOperationResult>;
  release(): Promise<TLeaseOperationResult>;
}

export interface PlayerPersistencePortV1<
  TSlotSummary,
  TPersistenceStatus,
  TPersistenceResult,
  TExportedSave,
  TSaveExportResult,
  TLeaseStatus,
  TLeaseOperationResult,
  TSaveInspectionResult,
  TSaveBackupInspectionResult,
  TSaveRewriteResult,
  TSaveBackupResult,
  TSaveBackupExportResult,
> {
  readonly lease: SessionLeasePortV1<TLeaseStatus, TLeaseOperationResult>;
  listSlots(): Promise<readonly TSlotSummary[]>;
  /**
   * Executes the configured pure Save-admission pipeline for one stored slot
   * without writing records or replacing the live Session. The result is an
   * observation, never a token that can later authorize a load.
   */
  inspectSave(slot: SaveSlotIdV1): Promise<TSaveInspectionResult>;
  /** Reports only whether one bounded pending migration backup is actionable. */
  inspectBackup(slot: SaveSlotIdV1): Promise<TSaveBackupInspectionResult>;
  /** Rewrites one migration/adoption-ready stored Save without loading it. */
  upgradeSave(slot: SaveSlotIdV1): Promise<TSaveRewriteResult>;
  /** Resets a full compatible lineage only through the explicit recovery path. */
  reanchorSave(slot: SaveSlotIdV1): Promise<TSaveRewriteResult>;
  /** Restores the one pending pre-upgrade backup without loading it. */
  restoreBackup(slot: SaveSlotIdV1): Promise<TSaveBackupResult>;
  /** Exports the exact pending backup bytes without consuming them. */
  exportBackup(slot: SaveSlotIdV1): Promise<TSaveBackupExportResult>;
  /** Explicitly consumes the one pending backup without changing the live Save. */
  discardBackup(slot: SaveSlotIdV1): Promise<TSaveBackupResult>;
  getStatus(): Promise<TPersistenceStatus>;
  save(slot: PlayerWritableSaveSlotIdV1): Promise<TPersistenceResult>;
  load(slot: SaveSlotIdV1): Promise<TPersistenceResult>;
  clear(slot: SaveSlotIdV1): Promise<TPersistenceResult>;
  /**
   * Rewrites the stored record's player note (empty string clears it); the
   * snapshot, capture time, and application summary stay untouched.
   */
  annotateSave(slot: PlayerWritableSaveSlotIdV1, note: string): Promise<TPersistenceResult>;
  exportSave(slot: SaveSlotIdV1): Promise<TSaveExportResult>;
  exportCurrentSave(): Promise<TExportedSave>;
  importSave(bytes: Uint8Array): Promise<TPersistenceResult>;
}

export interface PlayerDiagnosticsPortV1<TDebugBundle> {
  exportDebugBundle(): Promise<TDebugBundle>;
}

export interface SemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor, TStatus> {
  readonly revision: NonNegativeSafeInteger;
  readonly status: DeepReadonly<TStatus>;
  readonly game: DeepReadonly<TGameView>;
  readonly narrative: DeepReadonly<TNarrativeView>;
  readonly actions: readonly DeepReadonly<TActionDescriptor>[];
}

export interface SemanticGamePortV1<
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TStatus = RuntimeSessionStatusV1,
> {
  observe(): DeepReadonly<
    SemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor, TStatus>
  >;
  subscribe(listener: () => void): () => void;
  availableActions(): readonly DeepReadonly<TActionDescriptor>[];
  preview(invocation: DeepReadonly<TInvocation>): Promise<TPreview>;
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult>;
  waitForIdle(
    afterRevision?: NonNegativeSafeInteger,
  ): Promise<
    DeepReadonly<SemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor, TStatus>>
  >;
}

export interface SemanticGamePortSourceV1<TState, TStatus> {
  getCurrentState(): DeepReadonly<TState>;
  getAuthoritativeRevisionToken(): object;
  getStatus(): DeepReadonly<TStatus>;
  subscribe(listener: () => void): () => void;
  reportSubscriberFailure(error: unknown): void;
  readStateAtQueueFront<TResult>(
    reader: (state: DeepReadonly<TState>) => TResult,
  ): Promise<TResult>;
}

export interface SemanticGamePortInputV1<
  TState,
  TStatus,
  TQueries,
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
> {
  readonly source: SemanticGamePortSourceV1<TState, TStatus>;
  createQueries(state: DeepReadonly<TState>): TQueries;
  projectGameView(queries: TQueries): TGameView;
  projectNarrativeView(queries: TQueries): TNarrativeView;
  actions(queries: TQueries): readonly TActionDescriptor[];
  preview(queries: TQueries, invocation: DeepReadonly<TInvocation>): TPreview;
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult>;
}

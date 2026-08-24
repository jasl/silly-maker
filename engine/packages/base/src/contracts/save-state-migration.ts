// SPDX-License-Identifier: MIT
import type { StrictJsonValueV1 } from "./strict-json.ts";
import type { Brand, DeepReadonly, Digest, PositiveSafeInteger } from "./values.ts";
import { parseDigest, parseModuleId, parsePositiveSafeInteger } from "./values.ts";

export type SaveStateMigrationNamespaceV1 = Brand<
  string,
  "SaveStateMigrationNamespaceV1"
>;
export type SaveStateMigrationIdV1 = Brand<string, "SaveStateMigrationIdV1">;
export type SaveStateMigrationReasonCodeV1 = Brand<
  string,
  "SaveStateMigrationReasonCodeV1"
>;

export interface SaveStateContractIdentityV1 {
  readonly stateContractRevision: PositiveSafeInteger;
  readonly stateContractDigest: Digest;
}

export interface SaveStateMigrationStepIdentityV1 {
  readonly migrationId: SaveStateMigrationIdV1;
  readonly from: SaveStateContractIdentityV1;
  readonly to: SaveStateContractIdentityV1;
}

/**
 * Normalized provenance for one successful migrated replacement.
 *
 * `sourceStateDigest` identifies the admitted source raw Snapshot;
 * `migratedStateDigest` identifies the final normalized migrated Snapshot.
 * Neither field is a digest of the State subtree alone.
 */
export interface SaveStateMigrationReceiptV1 {
  readonly namespace: SaveStateMigrationNamespaceV1;
  readonly source: SaveStateContractIdentityV1;
  readonly target: SaveStateContractIdentityV1;
  readonly steps: readonly [
    SaveStateMigrationStepIdentityV1,
    ...SaveStateMigrationStepIdentityV1[],
  ];
  readonly sourceStateDigest: Digest;
  readonly migratedStateDigest: Digest;
}

export type SaveStateMigrationFailurePhaseV1 =
  | "snapshot_shell"
  | "callback"
  | "callback_rejected"
  | "result_envelope"
  | "output_admission"
  | "current_snapshot_schema"
  | "compatibility"
  | "references"
  | "invariants"
  | "replacement_prepare"
  | "replacement_commit";

/** Normalized diagnostics for one failed migration attempt. */
export interface SaveStateMigrationAttemptV1 {
  readonly namespace: SaveStateMigrationNamespaceV1;
  readonly source: SaveStateContractIdentityV1;
  readonly target: SaveStateContractIdentityV1;
  readonly sourceStateDigest: Digest;
  readonly completedSteps: readonly SaveStateMigrationStepIdentityV1[];
  readonly failingStep: SaveStateMigrationStepIdentityV1 | null;
  readonly failingPhase: SaveStateMigrationFailurePhaseV1;
  /** A complete normalized Snapshot digest, or null before one exists. */
  readonly migratedStateDigest: Digest | null;
}

export interface SaveStateMigrationReferenceRenameV1 {
  readonly referenceSetId: string;
  readonly fromId: string;
  readonly toId: string;
}

export interface SaveStateMigrationReferenceDeletionV1 {
  readonly referenceSetId: string;
  readonly id: string;
  readonly resolution:
    | {
      readonly kind: "fallback";
      readonly toId: string;
    }
    | {
      readonly kind: "reject";
      readonly reasonCode: SaveStateMigrationReasonCodeV1;
    };
}

export interface SaveStateMigrationReferenceChangesV1 {
  readonly renames: readonly SaveStateMigrationReferenceRenameV1[];
  readonly deletions: readonly SaveStateMigrationReferenceDeletionV1[];
}

export type SaveStateMigrationStepResultV1 =
  | {
    readonly kind: "migrated";
    readonly state: StrictJsonValueV1;
  }
  | {
    readonly kind: "rejected";
    readonly reasonCode: SaveStateMigrationReasonCodeV1;
  };

export interface SaveStateMigrationStepV1 {
  readonly migrationId: SaveStateMigrationIdV1;
  readonly namespace: SaveStateMigrationNamespaceV1;
  readonly from: SaveStateContractIdentityV1;
  readonly to: SaveStateContractIdentityV1;
  readonly references: SaveStateMigrationReferenceChangesV1;
  readonly migrate: (
    state: DeepReadonly<StrictJsonValueV1>,
  ) => SaveStateMigrationStepResultV1;
}

const saveStateMigrationRegistryDeclarationV1 = Symbol(
  "SaveStateMigrationRegistryV1.declaration",
);

/**
 * A normalized State-migration declaration. The public type exposes no
 * writable declaration fields; package-internal consumers trust the typed
 * value created after the registry input boundary is admitted.
 */
export interface SaveStateMigrationRegistryV1 {
  readonly [saveStateMigrationRegistryDeclarationV1]:
    SaveStateMigrationRegistryDeclarationInternalV1;
}

export interface DefineSaveStateMigrationRegistryInputV1 {
  readonly namespace: SaveStateMigrationNamespaceV1;
  readonly minimumSupported: SaveStateContractIdentityV1;
  readonly current: SaveStateContractIdentityV1;
  readonly steps: readonly SaveStateMigrationStepV1[];
}

export interface SaveStateMigrationRegistryDeclarationInternalV1 {
  readonly namespace: SaveStateMigrationNamespaceV1;
  readonly minimumSupported: SaveStateContractIdentityV1;
  readonly current: SaveStateContractIdentityV1;
  readonly steps: readonly SaveStateMigrationStepV1[];
}

const maximumSaveStateMigrationStepsV1 = 16;
const maximumSaveStateMigrationIdentifierBytesV1 = 128;
const stableMigrationIdentifierPatternV1 = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u;

function sameExactFieldVectorV1(
  fields: readonly string[],
  expected: readonly string[],
): boolean {
  if (fields.length !== expected.length) return false;
  return fields.every((field) =>
    expected.some((candidate) => candidate.length === field.length && candidate === field)
  );
}

function exactObjectFieldsV1(
  value: unknown,
  expectedFieldVectors: readonly (readonly string[])[],
  label: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`invalid ${label}`);
  }
  const fields = Object.keys(value);
  if (!expectedFieldVectors.some((expected) => sameExactFieldVectorV1(fields, expected))) {
    throw new TypeError(`invalid ${label} fields`);
  }
  return Object.fromEntries(
    fields.map((field) => [field, (value as Record<string, unknown>)[field]]),
  );
}

function exactObjectV1(
  value: unknown,
  expectedFields: readonly string[],
  label: string,
): Record<string, unknown> {
  return exactObjectFieldsV1(value, [expectedFields], label);
}

function exactArrayValuesV1(
  value: unknown,
  label: string,
  maximumLength?: number,
): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`invalid ${label}`);
  }
  const { length } = value;
  if (maximumLength !== undefined && length > maximumLength) {
    throw new TypeError(`invalid ${label} length`);
  }
  const fields = Object.keys(value);
  if (
    fields.length !== length ||
    fields.some((field, index) => field !== String(index))
  ) {
    throw new TypeError(`${label} must be dense and exact`);
  }
  return fields.map((field) => value[Number(field)]);
}

function parseMigrationIdentifierV1(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    value.length > maximumSaveStateMigrationIdentifierBytesV1 ||
    !stableMigrationIdentifierPatternV1.test(value)
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  return value;
}

export function parseSaveStateMigrationNamespaceV1(
  value: unknown,
): SaveStateMigrationNamespaceV1 {
  return parseMigrationIdentifierV1(
    value,
    "SaveStateMigrationNamespaceV1",
  ) as SaveStateMigrationNamespaceV1;
}

export function parseSaveStateMigrationIdV1(value: unknown): SaveStateMigrationIdV1 {
  return parseMigrationIdentifierV1(value, "SaveStateMigrationIdV1") as SaveStateMigrationIdV1;
}

export function parseSaveStateMigrationReasonCodeV1(
  value: unknown,
): SaveStateMigrationReasonCodeV1 {
  return parseMigrationIdentifierV1(
    value,
    "SaveStateMigrationReasonCodeV1",
  ) as SaveStateMigrationReasonCodeV1;
}

function parseStateContractIdentityV1(
  value: unknown,
  label: string,
): SaveStateContractIdentityV1 {
  const fields = exactObjectV1(
    value,
    ["stateContractRevision", "stateContractDigest"],
    label,
  );
  return {
    stateContractRevision: parsePositiveSafeInteger(fields.stateContractRevision),
    stateContractDigest: parseDigest(fields.stateContractDigest),
  };
}

function parseStableReferenceIdV1(value: unknown, label: string): string {
  try {
    return parseModuleId(value) as string;
  } catch {
    throw new TypeError(`invalid ${label}`);
  }
}

function compareReferenceSourceV1(
  left: { readonly referenceSetId: string; readonly sourceId: string },
  right: { readonly referenceSetId: string; readonly sourceId: string },
): number {
  if (left.referenceSetId < right.referenceSetId) return -1;
  if (left.referenceSetId > right.referenceSetId) return 1;
  if (left.sourceId < right.sourceId) return -1;
  if (left.sourceId > right.sourceId) return 1;
  return 0;
}

function referenceSourceKeyV1(referenceSetId: string, sourceId: string): string {
  return `${referenceSetId}\0${sourceId}`;
}

function parseReferenceRenameV1(value: unknown): SaveStateMigrationReferenceRenameV1 {
  const fields = exactObjectV1(
    value,
    ["referenceSetId", "fromId", "toId"],
    "Save State migration reference rename",
  );
  const referenceSetId = parseStableReferenceIdV1(
    fields.referenceSetId,
    "migration reference set ID",
  );
  const fromId = parseStableReferenceIdV1(
    fields.fromId,
    "migration reference source ID",
  );
  const toId = parseStableReferenceIdV1(
    fields.toId,
    "migration reference target ID",
  );
  if (fromId === toId) {
    throw new TypeError("Save State migration reference rename must change identity");
  }
  return { referenceSetId, fromId, toId };
}

function parseReferenceDeletionResolutionV1(
  value: unknown,
  deletedId: string,
): SaveStateMigrationReferenceDeletionV1["resolution"] {
  const kindFields = exactObjectFieldsV1(
    value,
    [
      ["kind", "toId"],
      ["kind", "reasonCode"],
    ],
    "Save State migration reference deletion resolution",
  );
  const kind = kindFields.kind;
  if (kind === "fallback") {
    const toId = parseStableReferenceIdV1(
      kindFields.toId,
      "migration deletion fallback ID",
    );
    if (toId === deletedId) {
      throw new TypeError("Save State migration deletion fallback must change identity");
    }
    return { kind, toId };
  }
  if (kind === "reject") {
    return {
      kind,
      reasonCode: parseSaveStateMigrationReasonCodeV1(kindFields.reasonCode),
    };
  }
  throw new TypeError("invalid Save State migration reference deletion resolution kind");
}

function parseReferenceDeletionV1(value: unknown): SaveStateMigrationReferenceDeletionV1 {
  const fields = exactObjectV1(
    value,
    ["referenceSetId", "id", "resolution"],
    "Save State migration reference deletion",
  );
  const referenceSetId = parseStableReferenceIdV1(
    fields.referenceSetId,
    "migration reference set ID",
  );
  const id = parseStableReferenceIdV1(fields.id, "migration deletion source ID");
  return {
    referenceSetId,
    id,
    resolution: parseReferenceDeletionResolutionV1(fields.resolution, id),
  };
}

function parseReferenceChangesV1(value: unknown): SaveStateMigrationReferenceChangesV1 {
  const fields = exactObjectV1(
    value,
    ["renames", "deletions"],
    "Save State migration reference changes",
  );
  const renames = exactArrayValuesV1(
    fields.renames,
    "Save State migration reference renames",
  ).map(parseReferenceRenameV1);
  const deletions = exactArrayValuesV1(
    fields.deletions,
    "Save State migration reference deletions",
  ).map(parseReferenceDeletionV1);
  renames.sort((left, right) =>
    compareReferenceSourceV1(
      { referenceSetId: left.referenceSetId, sourceId: left.fromId },
      { referenceSetId: right.referenceSetId, sourceId: right.fromId },
    )
  );
  deletions.sort((left, right) =>
    compareReferenceSourceV1(
      { referenceSetId: left.referenceSetId, sourceId: left.id },
      { referenceSetId: right.referenceSetId, sourceId: right.id },
    )
  );
  const sources = new Set<string>();
  for (const rename of renames) {
    const key = referenceSourceKeyV1(rename.referenceSetId, rename.fromId);
    if (sources.has(key)) throw new TypeError("duplicate Save State migration reference source");
    sources.add(key);
  }
  for (const deletion of deletions) {
    const key = referenceSourceKeyV1(deletion.referenceSetId, deletion.id);
    if (sources.has(key)) throw new TypeError("duplicate Save State migration reference source");
    sources.add(key);
  }
  return { renames, deletions };
}

function parseStepV1(
  value: unknown,
  registryNamespace: SaveStateMigrationNamespaceV1,
): SaveStateMigrationStepV1 {
  const fields = exactObjectV1(
    value,
    ["migrationId", "namespace", "from", "to", "references", "migrate"],
    "Save State migration step",
  );
  const namespace = parseSaveStateMigrationNamespaceV1(fields.namespace);
  if (namespace !== registryNamespace) {
    throw new TypeError("Save State migration step namespace mismatch");
  }
  const migrate = fields.migrate;
  if (typeof migrate !== "function") {
    throw new TypeError("Save State migration callback must be a function");
  }
  return {
    migrationId: parseSaveStateMigrationIdV1(fields.migrationId),
    namespace,
    from: parseStateContractIdentityV1(fields.from, "migration source identity"),
    to: parseStateContractIdentityV1(fields.to, "migration target identity"),
    references: parseReferenceChangesV1(fields.references),
    migrate: migrate as SaveStateMigrationStepV1["migrate"],
  };
}

function sameStateContractIdentityV1(
  left: SaveStateContractIdentityV1,
  right: SaveStateContractIdentityV1,
): boolean {
  return left.stateContractRevision === right.stateContractRevision &&
    left.stateContractDigest === right.stateContractDigest;
}

/** @internal Exact State-contract identity comparison for Base runtime/tooling. */
export function sameSaveStateContractIdentityInternalV1(
  left: SaveStateContractIdentityV1,
  right: SaveStateContractIdentityV1,
): boolean {
  return sameStateContractIdentityV1(left, right);
}

function validateCompleteAdjacentChainV1(
  minimumSupported: SaveStateContractIdentityV1,
  current: SaveStateContractIdentityV1,
  steps: readonly SaveStateMigrationStepV1[],
): void {
  if (minimumSupported.stateContractRevision > current.stateContractRevision) {
    throw new TypeError("Save State migration minimum exceeds current identity");
  }
  const revisionDistance = current.stateContractRevision - minimumSupported.stateContractRevision;
  if (revisionDistance > maximumSaveStateMigrationStepsV1) {
    throw new TypeError("Save State migration chain exceeds the step limit");
  }
  if (steps.length !== revisionDistance) {
    throw new TypeError("Save State migration chain is incomplete");
  }

  const migrationIds = new Set<SaveStateMigrationIdV1>();
  const sourceIdentities = new Set<string>();
  let expected = minimumSupported;
  for (const step of steps) {
    if (!sameStateContractIdentityV1(step.from, expected)) {
      throw new TypeError("Save State migration chain source identity is discontinuous");
    }
    if (step.to.stateContractRevision - step.from.stateContractRevision !== 1) {
      throw new TypeError("Save State migration steps must be adjacent");
    }
    if (migrationIds.has(step.migrationId)) {
      throw new TypeError("duplicate Save State migration ID");
    }
    migrationIds.add(step.migrationId);
    const sourceKey = `${step.from.stateContractRevision}\0${step.from.stateContractDigest}`;
    if (sourceIdentities.has(sourceKey)) {
      throw new TypeError("duplicate Save State migration source identity");
    }
    sourceIdentities.add(sourceKey);
    expected = step.to;
  }
  if (!sameStateContractIdentityV1(expected, current)) {
    throw new TypeError("Save State migration chain target identity mismatch");
  }
}

/** Defines one exact, single-namespace adjacent State-migration declaration. */
export function defineSaveStateMigrationRegistryV1(
  input: DefineSaveStateMigrationRegistryInputV1,
): SaveStateMigrationRegistryV1 {
  const fields = exactObjectV1(
    input,
    ["namespace", "minimumSupported", "current", "steps"],
    "Save State migration registry",
  );
  const namespace = parseSaveStateMigrationNamespaceV1(fields.namespace);
  const minimumSupported = parseStateContractIdentityV1(
    fields.minimumSupported,
    "Save State migration minimum identity",
  );
  const current = parseStateContractIdentityV1(
    fields.current,
    "Save State migration current identity",
  );
  const rawSteps = exactArrayValuesV1(
    fields.steps,
    "Save State migration steps",
    maximumSaveStateMigrationStepsV1,
  );
  const steps = rawSteps.map((step) => parseStepV1(step, namespace));
  validateCompleteAdjacentChainV1(minimumSupported, current, steps);

  const declaration = {
    namespace,
    minimumSupported,
    current,
    steps,
  };
  return { [saveStateMigrationRegistryDeclarationV1]: declaration };
}

/** @internal Reads the normalized declaration admitted by the public factory. */
export function readSaveStateMigrationRegistryInternalV1(
  registry: SaveStateMigrationRegistryV1,
): SaveStateMigrationRegistryDeclarationInternalV1 {
  return registry[saveStateMigrationRegistryDeclarationV1];
}

/** @internal Binds one registry to the resolved aggregate State identity. */
export function assertSaveStateMigrationRegistryCurrentIdentityInternalV1(
  registry: SaveStateMigrationRegistryV1,
  current: SaveStateContractIdentityV1,
): void {
  const declaration = readSaveStateMigrationRegistryInternalV1(registry);
  if (!sameStateContractIdentityV1(declaration.current, current)) {
    throw new TypeError("save_state_migration.current_identity_mismatch");
  }
}

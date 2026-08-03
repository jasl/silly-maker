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
 * Immutable provenance for one successful migrated replacement.
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

/** Immutable diagnostics for one failed migration attempt. */
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

declare const saveStateMigrationRegistryBrandV1: unique symbol;

/**
 * An opaque, factory-owned State-migration declaration. Runtime consumers
 * admit the exact object identity through package-internal metadata.
 */
export interface SaveStateMigrationRegistryV1 {
  readonly [saveStateMigrationRegistryBrandV1]: true;
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

/** @internal One captured exact own-data field vector. */
export type ExactDataDescriptorsInternalV1 = Readonly<
  Record<string, PropertyDescriptor>
>;

function sameExactFieldVectorV1(
  fields: readonly string[],
  expected: readonly string[],
): boolean {
  if (fields.length !== expected.length) return false;
  return fields.every((field) =>
    expected.some((candidate) => candidate.length === field.length && candidate === field)
  );
}

function isCanonicalArrayIndexKeyV1(value: string): boolean {
  if (value.length === 0 || value.length > 10) return false;
  if (value.length > 1 && value.charCodeAt(0) === 0x30) return false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x30 || code > 0x39) return false;
  }
  return true;
}

/** @internal Captures one own-key snapshot without rereading accessors or key vectors. */
export function captureExactDataDescriptorsInternalV1(
  value: unknown,
  expectedFieldVectors: readonly (readonly string[])[],
  label: string,
  observedPrototype?: { readonly value: object | null },
): ExactDataDescriptorsInternalV1 {
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      (observedPrototype === undefined ? Object.getPrototypeOf(value) : observedPrototype.value) !==
        Object.prototype
    ) {
      throw new TypeError(`invalid ${label}`);
    }
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key === "symbol")) {
      throw new TypeError(`invalid ${label} fields`);
    }
    const fields = keys as string[];
    if (!expectedFieldVectors.some((expected) => sameExactFieldVectorV1(fields, expected))) {
      throw new TypeError(`invalid ${label} fields`);
    }
    const descriptors = Object.create(null) as Record<string, PropertyDescriptor>;
    for (const field of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(value, field);
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor)
      ) {
        throw new TypeError(`${label} accessors are forbidden`);
      }
      Object.defineProperty(descriptors, field, {
        configurable: false,
        enumerable: true,
        writable: false,
        value: descriptor,
      });
    }
    return Object.freeze(descriptors);
  } catch (error) {
    if (error instanceof TypeError) throw error;
    throw new TypeError(`invalid ${label}`, { cause: error });
  }
}

function exactDataDescriptorsV1(
  value: unknown,
  expectedFields: readonly string[],
  label: string,
): ExactDataDescriptorsInternalV1 {
  return captureExactDataDescriptorsInternalV1(value, [expectedFields], label);
}

function exactArrayValuesV1(
  value: unknown,
  label: string,
  maximumLength?: number,
): readonly unknown[] {
  try {
    if (
      !Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Array.prototype
    ) {
      throw new TypeError(`invalid ${label}`);
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      lengthDescriptor === undefined ||
      lengthDescriptor.get !== undefined ||
      lengthDescriptor.set !== undefined ||
      !("value" in lengthDescriptor) ||
      typeof lengthDescriptor.value !== "number"
    ) {
      throw new TypeError(`invalid ${label} length`);
    }
    const length = lengthDescriptor.value;
    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      (maximumLength !== undefined && length > maximumLength)
    ) {
      throw new TypeError(`invalid ${label} length`);
    }
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key === "symbol")) {
      throw new TypeError(`${label} must be dense and exact`);
    }
    const stringKeys = keys as string[];
    if (stringKeys.length !== length + 1) {
      throw new TypeError(`${label} must be dense and exact`);
    }
    let hasLength = false;
    for (const key of stringKeys) {
      if (key.length === 6 && key === "length") {
        hasLength = true;
        continue;
      }
      if (!isCanonicalArrayIndexKeyV1(key)) {
        throw new TypeError(`${label} must be dense and exact`);
      }
      const index = Number(key);
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= length ||
        String(index) !== key
      ) {
        throw new TypeError(`${label} must be dense and exact`);
      }
    }
    if (!hasLength) throw new TypeError(`${label} must be dense and exact`);
    const normalized: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        descriptor === undefined ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        !("value" in descriptor)
      ) {
        throw new TypeError(`${label} accessors are forbidden`);
      }
      normalized.push(descriptor.value);
    }
    return Object.freeze(normalized);
  } catch (error) {
    if (error instanceof TypeError) throw error;
    throw new TypeError(`invalid ${label}`, { cause: error });
  }
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
  const fields = exactDataDescriptorsV1(
    value,
    ["stateContractRevision", "stateContractDigest"],
    label,
  );
  return Object.freeze({
    stateContractRevision: parsePositiveSafeInteger(fields.stateContractRevision?.value),
    stateContractDigest: parseDigest(fields.stateContractDigest?.value),
  });
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
  const fields = exactDataDescriptorsV1(
    value,
    ["referenceSetId", "fromId", "toId"],
    "Save State migration reference rename",
  );
  const referenceSetId = parseStableReferenceIdV1(
    fields.referenceSetId?.value,
    "migration reference set ID",
  );
  const fromId = parseStableReferenceIdV1(
    fields.fromId?.value,
    "migration reference source ID",
  );
  const toId = parseStableReferenceIdV1(
    fields.toId?.value,
    "migration reference target ID",
  );
  if (fromId === toId) {
    throw new TypeError("Save State migration reference rename must change identity");
  }
  return Object.freeze({ referenceSetId, fromId, toId });
}

function parseReferenceDeletionResolutionV1(
  value: unknown,
  deletedId: string,
): SaveStateMigrationReferenceDeletionV1["resolution"] {
  const kindFields = captureExactDataDescriptorsInternalV1(
    value,
    [
      ["kind", "toId"],
      ["kind", "reasonCode"],
    ],
    "Save State migration reference deletion resolution",
  );
  const kind = kindFields.kind?.value;
  if (kind === "fallback") {
    const toId = parseStableReferenceIdV1(
      kindFields.toId?.value,
      "migration deletion fallback ID",
    );
    if (toId === deletedId) {
      throw new TypeError("Save State migration deletion fallback must change identity");
    }
    return Object.freeze({ kind, toId });
  }
  if (kind === "reject") {
    return Object.freeze({
      kind,
      reasonCode: parseSaveStateMigrationReasonCodeV1(kindFields.reasonCode?.value),
    });
  }
  throw new TypeError("invalid Save State migration reference deletion resolution kind");
}

function parseReferenceDeletionV1(value: unknown): SaveStateMigrationReferenceDeletionV1 {
  const fields = exactDataDescriptorsV1(
    value,
    ["referenceSetId", "id", "resolution"],
    "Save State migration reference deletion",
  );
  const referenceSetId = parseStableReferenceIdV1(
    fields.referenceSetId?.value,
    "migration reference set ID",
  );
  const id = parseStableReferenceIdV1(fields.id?.value, "migration deletion source ID");
  return Object.freeze({
    referenceSetId,
    id,
    resolution: parseReferenceDeletionResolutionV1(fields.resolution?.value, id),
  });
}

function parseReferenceChangesV1(value: unknown): SaveStateMigrationReferenceChangesV1 {
  const fields = exactDataDescriptorsV1(
    value,
    ["renames", "deletions"],
    "Save State migration reference changes",
  );
  const renames = exactArrayValuesV1(
    fields.renames?.value,
    "Save State migration reference renames",
  ).map(parseReferenceRenameV1);
  const deletions = exactArrayValuesV1(
    fields.deletions?.value,
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
  return Object.freeze({
    renames: Object.freeze(renames),
    deletions: Object.freeze(deletions),
  });
}

function parseStepV1(
  value: unknown,
  registryNamespace: SaveStateMigrationNamespaceV1,
): SaveStateMigrationStepV1 {
  const fields = exactDataDescriptorsV1(
    value,
    ["migrationId", "namespace", "from", "to", "references", "migrate"],
    "Save State migration step",
  );
  const namespace = parseSaveStateMigrationNamespaceV1(fields.namespace?.value);
  if (namespace !== registryNamespace) {
    throw new TypeError("Save State migration step namespace mismatch");
  }
  const migrate = fields.migrate?.value;
  if (typeof migrate !== "function") {
    throw new TypeError("Save State migration callback must be a function");
  }
  return Object.freeze({
    migrationId: parseSaveStateMigrationIdV1(fields.migrationId?.value),
    namespace,
    from: parseStateContractIdentityV1(fields.from?.value, "migration source identity"),
    to: parseStateContractIdentityV1(fields.to?.value, "migration target identity"),
    references: parseReferenceChangesV1(fields.references?.value),
    migrate: migrate as SaveStateMigrationStepV1["migrate"],
  });
}

function sameStateContractIdentityV1(
  left: SaveStateContractIdentityV1,
  right: SaveStateContractIdentityV1,
): boolean {
  return left.stateContractRevision === right.stateContractRevision &&
    left.stateContractDigest === right.stateContractDigest;
}

/** @internal Descriptor-safe identity admission for Base runtime/tooling. */
export function parseSaveStateContractIdentityInternalV1(
  value: unknown,
  label = "Save State contract identity",
): SaveStateContractIdentityV1 {
  return parseStateContractIdentityV1(value, label);
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

const saveStateMigrationRegistryDeclarationsV1 = new WeakMap<
  object,
  SaveStateMigrationRegistryDeclarationInternalV1
>();

/** Defines one exact, single-namespace adjacent State-migration declaration. */
export function defineSaveStateMigrationRegistryV1(
  input: DefineSaveStateMigrationRegistryInputV1,
): SaveStateMigrationRegistryV1 {
  const fields = exactDataDescriptorsV1(
    input,
    ["namespace", "minimumSupported", "current", "steps"],
    "Save State migration registry",
  );
  const namespace = parseSaveStateMigrationNamespaceV1(fields.namespace?.value);
  const minimumSupported = parseStateContractIdentityV1(
    fields.minimumSupported?.value,
    "Save State migration minimum identity",
  );
  const current = parseStateContractIdentityV1(
    fields.current?.value,
    "Save State migration current identity",
  );
  const rawSteps = exactArrayValuesV1(
    fields.steps?.value,
    "Save State migration steps",
    maximumSaveStateMigrationStepsV1,
  );
  const steps = Object.freeze(rawSteps.map((step) => parseStepV1(step, namespace)));
  validateCompleteAdjacentChainV1(minimumSupported, current, steps);

  const declaration = Object.freeze({
    namespace,
    minimumSupported,
    current,
    steps,
  });
  const registry = Object.freeze({}) as SaveStateMigrationRegistryV1;
  saveStateMigrationRegistryDeclarationsV1.set(registry, declaration);
  return registry;
}

/** @internal Exact factory-identity admission for Base runtime/tooling. */
export function readSaveStateMigrationRegistryInternalV1(
  registry: SaveStateMigrationRegistryV1,
): SaveStateMigrationRegistryDeclarationInternalV1 {
  const declaration = saveStateMigrationRegistryDeclarationsV1.get(registry);
  if (declaration === undefined) {
    throw new TypeError("Save State migration registry was not created by the official factory");
  }
  return declaration;
}

/** @internal Binds one registry to the resolved aggregate State identity. */
export function assertSaveStateMigrationRegistryCurrentIdentityInternalV1(
  registry: SaveStateMigrationRegistryV1,
  current: SaveStateContractIdentityV1,
): void {
  const declaration = readSaveStateMigrationRegistryInternalV1(registry);
  const normalizedCurrent = parseStateContractIdentityV1(
    current,
    "resolved State contract identity",
  );
  if (!sameStateContractIdentityV1(declaration.current, normalizedCurrent)) {
    throw new TypeError("save_state_migration.current_identity_mismatch");
  }
}

// SPDX-License-Identifier: MIT
import { canonicalJsonBytes } from "../../contracts/canonical-json.ts";
import { digestCanonicalInternalV1 } from "../../contracts/digest.ts";
import type {
  AppliedHotfixV1,
  PatchReplacementTraceV1,
  PatchSetAdoptionDeclarationV1,
  PatchSetIdentityV1,
} from "../../contracts/hotfix.ts";
import type { BuildProvenanceV1 } from "../../contracts/provenance.ts";
import { RngStateSchemaFailureInternalV1 } from "../../contracts/rng.ts";
import { exactEnvelopeFieldsV1, saveJsonLimitsV1 } from "../../contracts/persistence.ts";
import type {
  ImportCompatibilityWarningV1,
  ImportRejectionCodeV1,
  SaveCompatibilityClassificationInputV1,
  SaveCompatibilityClassificationV1,
  SaveCompatibilityMismatchV1,
  SaveImportValidationContextV1,
  SaveImportValidationResultV1,
  SaveMigrationUnavailableInspectionV1,
  SaveRecordEnvelopeV1,
  SaveRecordEnvelopeShellInternalV1,
  SimulationAdoptionV1,
} from "../../contracts/persistence.ts";
import { readSaveStateMigrationRegistryInternalV1 } from "../../contracts/save-state-migration.ts";
import type {
  SaveStateMigrationReceiptV1,
  SaveStateMigrationRegistryV1,
} from "../../contracts/save-state-migration.ts";
import type { StrictJsonValueV1 } from "../../contracts/strict-json.ts";
import type { DeepReadonly, Digest, NonNegativeSafeInteger } from "../../contracts/values.ts";
import {
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "../../contracts/values.ts";
import type { SnapshotWorkInstrumentationV1 } from "../../internal/snapshot-work-instrumentation.ts";
import {
  createSaveStateMigrationAttemptInternalV1,
  createSaveStateMigrationReceiptInternalV1,
  createSaveStateMigrationSnapshotShellAttemptInternalV1,
  executeResolvedSaveStateMigrationInternalV1,
  resolveSaveStateMigrationChainInternalV1,
} from "../../internal/save-state-migration-execution.ts";
import type { CompletedSaveStateMigrationInternalV1 } from "../../internal/save-state-migration-execution.ts";
import {
  decodeCurrentSaveRecordEnvelopeInternalV1,
  decodeSaveRecordEnvelopeShellInternalV1,
  validateCurrentSaveRecordEnvelopeCrossFieldsInternalV1,
} from "./save-codec.ts";

const emptyTupleV1 = (): readonly [] => [] as readonly [];

interface SaveReanchorClassificationEvidenceInternalV1 {
  readonly adoption: SimulationAdoptionV1;
  readonly stored: DeepReadonly<BuildProvenanceV1>;
  readonly current: DeepReadonly<BuildProvenanceV1>;
  readonly simulationLineage: readonly DeepReadonly<SimulationAdoptionV1>[];
  readonly candidateCommandSequence: NonNegativeSafeInteger;
}

const reanchorEvidenceByClassificationV1 = new WeakMap<
  object,
  SaveReanchorClassificationEvidenceInternalV1
>();

function canonicalBytesEqualV1(left: unknown, right: unknown): boolean {
  const leftBytes = canonicalJsonBytes(left);
  const rightBytes = canonicalJsonBytes(right);
  return (
    leftBytes.length === rightBytes.length &&
    leftBytes.every((value, index) => value === rightBytes[index])
  );
}

function collectMismatchesV1(
  input: DeepReadonly<SaveCompatibilityClassificationInputV1>,
): readonly SaveCompatibilityMismatchV1[] {
  const mismatches: SaveCompatibilityMismatchV1[] = [];
  if (input.stored.story.id !== input.current.story.id) {
    mismatches.push(
      {
        field: "story_id",
        code: "identity.story_id_mismatch",
        stored: input.stored.story.id,
        current: input.current.story.id,
      },
    );
  }
  if (input.stored.story.revision !== input.current.story.revision) {
    mismatches.push(
      {
        field: "story_revision",
        code: "identity.story_revision_mismatch",
        stored: input.stored.story.revision,
        current: input.current.story.revision,
      },
    );
  }
  if (
    input.stored.resolved.stateContractRevision !== input.current.resolved.stateContractRevision
  ) {
    mismatches.push(
      {
        field: "state_contract_revision",
        code: "identity.state_contract_revision_mismatch",
        stored: input.stored.resolved.stateContractRevision,
        current: input.current.resolved.stateContractRevision,
      },
    );
  }
  if (input.stored.resolved.stateContractDigest !== input.current.resolved.stateContractDigest) {
    mismatches.push(
      {
        field: "state_contract_digest",
        code: "identity.state_contract_digest_mismatch",
        stored: input.stored.resolved.stateContractDigest,
        current: input.current.resolved.stateContractDigest,
      },
    );
  }
  if (input.stored.engine.digest !== input.current.engine.digest) {
    mismatches.push(
      {
        field: "engine_digest",
        code: "identity.engine_digest_mismatch",
        stored: input.stored.engine.digest,
        current: input.current.engine.digest,
      },
    );
  }
  if (input.stored.resolved.simulationDigest !== input.current.resolved.simulationDigest) {
    mismatches.push(
      {
        field: "simulation_digest",
        code: "identity.simulation_digest_mismatch",
        stored: input.stored.resolved.simulationDigest,
        current: input.current.resolved.simulationDigest,
      },
    );
  }
  return mismatches;
}

function collectWarningsV1(
  input: DeepReadonly<SaveCompatibilityClassificationInputV1>,
): readonly ImportCompatibilityWarningV1[] {
  const warnings: ImportCompatibilityWarningV1[] = [];
  if (input.stored.story.digest !== input.current.story.digest) {
    warnings.push(
      {
        field: "story_digest",
        code: "identity.story_digest_mismatch",
        stored: input.stored.story.digest,
        current: input.current.story.digest,
      },
    );
  }
  if (input.stored.resolved.presentationDigest !== input.current.resolved.presentationDigest) {
    warnings.push(
      {
        field: "presentation_digest",
        code: "identity.presentation_digest_mismatch",
        stored: input.stored.resolved.presentationDigest,
        current: input.current.resolved.presentationDigest,
      },
    );
  }
  if (!canonicalBytesEqualV1(input.stored.resolved.patchSet, input.current.resolved.patchSet)) {
    warnings.push(
      {
        field: "hotfix_set",
        code: "identity.hotfix_set_mismatch",
        stored: input.stored.resolved.patchSet,
        current: input.current.resolved.patchSet,
      },
    );
  }
  return warnings;
}

const maximumAdoptionDeclarationCountV1 = 256;
const adoptionDeclarationFieldsV1 = [
  "storyId",
  "storyRevision",
  "stateContractRevision",
  "stateContractDigest",
  "fromSimulationDigest",
  "toSimulationDigest",
  "simulationPatchSetDigest",
] as const;

type AdmittedAdoptionDeclarationsV1 = readonly DeepReadonly<PatchSetAdoptionDeclarationV1>[];

const adoptionDeclarationLookupBySetV1 = new WeakMap<
  object,
  ReadonlyMap<string, DeepReadonly<PatchSetAdoptionDeclarationV1>>
>();

function adoptionDeclarationTupleV1(
  declaration: DeepReadonly<PatchSetAdoptionDeclarationV1>,
): string {
  return JSON.stringify([
    declaration.storyId,
    declaration.storyRevision,
    declaration.stateContractRevision,
    declaration.stateContractDigest,
    declaration.fromSimulationDigest,
    declaration.toSimulationDigest,
    declaration.simulationPatchSetDigest,
  ]);
}

function parseAdoptionDeclarationV1(value: unknown): PatchSetAdoptionDeclarationV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid adoption declaration");
  }
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).toSorted().join("\0") !==
      [...adoptionDeclarationFieldsV1].toSorted().join("\0")
  ) {
    throw new TypeError("invalid adoption declaration fields");
  }
  const storyId = record.storyId;
  if (typeof storyId !== "string" || storyId.length === 0) {
    throw new TypeError("invalid adoption declaration storyId");
  }
  return ({
    storyId,
    storyRevision: parsePositiveSafeInteger(record.storyRevision),
    stateContractRevision: parsePositiveSafeInteger(record.stateContractRevision),
    stateContractDigest: parseDigest(record.stateContractDigest),
    fromSimulationDigest: parseDigest(record.fromSimulationDigest),
    toSimulationDigest: parseDigest(record.toSimulationDigest),
    simulationPatchSetDigest: parseDigest(record.simulationPatchSetDigest),
  });
}

function parseAdoptionDeclarationsV1(
  value: unknown,
  rejectDuplicates: boolean,
): AdmittedAdoptionDeclarationsV1 {
  try {
    if (!Array.isArray(value) || value.length > maximumAdoptionDeclarationCountV1) {
      throw new TypeError("invalid adoption declarations");
    }
    if (Object.keys(value).length !== value.length) {
      throw new TypeError("invalid adoption declarations fields");
    }
    const declarations: PatchSetAdoptionDeclarationV1[] = [];
    const tuples = new Set<string>();
    for (let index = 0; index < value.length; index += 1) {
      const declaration = parseAdoptionDeclarationV1(value[index]);
      const tuple = adoptionDeclarationTupleV1(declaration);
      if (rejectDuplicates && tuples.has(tuple)) {
        throw new TypeError("duplicate adoption declaration");
      }
      tuples.add(tuple);
      declarations.push(declaration);
    }
    return declarations;
  } catch {
    throw new TypeError("invalid adoption declarations");
  }
}

/**
 * One-time admission for official application and Persistence composition.
 * The returned array and declarations are detached copies; their exact-tuple
 * lookup remains package-internal.
 *
 * @internal
 */
export function admitAdoptionDeclarationsInternalV1(
  value: unknown,
): AdmittedAdoptionDeclarationsV1 {
  if (value !== null && typeof value === "object") {
    const existing = adoptionDeclarationLookupBySetV1.get(value);
    if (existing !== undefined) return value as AdmittedAdoptionDeclarationsV1;
  }
  const declarations = parseAdoptionDeclarationsV1(value, true);
  const lookup = new Map<string, DeepReadonly<PatchSetAdoptionDeclarationV1>>();
  for (const declaration of declarations) {
    lookup.set(adoptionDeclarationTupleV1(declaration), declaration);
  }
  adoptionDeclarationLookupBySetV1.set(declarations, lookup);
  return declarations;
}

function matchesAdoptionDeclarationV1(
  declaration: DeepReadonly<PatchSetAdoptionDeclarationV1>,
  input: DeepReadonly<SaveCompatibilityClassificationInputV1>,
): boolean {
  return (
    declaration.storyId === input.current.story.id &&
    declaration.storyRevision === input.current.story.revision &&
    declaration.stateContractRevision === input.current.resolved.stateContractRevision &&
    declaration.stateContractDigest === input.current.resolved.stateContractDigest &&
    declaration.fromSimulationDigest === input.stored.resolved.simulationDigest &&
    declaration.toSimulationDigest === input.current.resolved.simulationDigest &&
    declaration.simulationPatchSetDigest === input.current.resolved.patchSet.simulationDigest
  );
}

function matchingAdoptionDeclarationCountV1(
  input: DeepReadonly<SaveCompatibilityClassificationInputV1>,
): number {
  const target: PatchSetAdoptionDeclarationV1 = {
    storyId: input.current.story.id,
    storyRevision: input.current.story.revision,
    stateContractRevision: input.current.resolved.stateContractRevision,
    stateContractDigest: input.current.resolved.stateContractDigest,
    fromSimulationDigest: input.stored.resolved.simulationDigest,
    toSimulationDigest: input.current.resolved.simulationDigest,
    simulationPatchSetDigest: input.current.resolved.patchSet.simulationDigest,
  };
  const configured = input.adoptionDeclarations as object;
  const lookup = adoptionDeclarationLookupBySetV1.get(configured);
  if (lookup !== undefined) {
    return lookup.has(adoptionDeclarationTupleV1(target)) ? 1 : 0;
  }
  const declarations = parseAdoptionDeclarationsV1(input.adoptionDeclarations, false);
  let matches = 0;
  for (const declaration of declarations) {
    if (matchesAdoptionDeclarationV1(declaration, input)) matches += 1;
  }
  return matches;
}

export function classifySaveCompatibilityV1(
  input: DeepReadonly<SaveCompatibilityClassificationInputV1>,
): SaveCompatibilityClassificationV1 {
  if (!Array.isArray(input.simulationLineage)) {
    throw new TypeError("invalid simulation lineage");
  }
  if (input.simulationLineage.length > 16) {
    return ({ kind: "rejected", code: "compatibility.lineage_limit" });
  }
  const candidateCommandSequence = parseNonNegativeSafeInteger(input.candidateCommandSequence);
  const mismatches = collectMismatchesV1(input);
  const warnings = collectWarningsV1(input);
  if (mismatches.length === 0) {
    return ({ kind: "exact", mismatches: emptyTupleV1(), warnings });
  }
  const simulationOnly = mismatches.length === 1 && mismatches[0]?.field === "simulation_digest";
  const matchingAdoptionDeclarations = simulationOnly
    ? matchingAdoptionDeclarationCountV1(input)
    : 0;
  if (matchingAdoptionDeclarations > 1) {
    return ({ kind: "rejected", code: "compatibility.adoption_ambiguous" });
  }
  if (matchingAdoptionDeclarations === 1) {
    const adoption: SimulationAdoptionV1 = {
      fromSimulationDigest: input.stored.resolved.simulationDigest,
      toSimulationDigest: input.current.resolved.simulationDigest,
      viaSimulationPatchSetDigest: input.current.resolved.patchSet.simulationDigest,
      adoptedAtCommandSequence: candidateCommandSequence,
    };
    if (input.simulationLineage.length >= 16) {
      const rejected = {
        kind: "rejected" as const,
        code: "compatibility.lineage_limit" as const,
      };
      if (input.simulationLineage.length === 16) {
        reanchorEvidenceByClassificationV1.set(
          rejected,
          {
            adoption,
            stored: input.stored,
            current: input.current,
            simulationLineage: input.simulationLineage,
            candidateCommandSequence,
          },
        );
      }
      return rejected;
    }
    return ({
      kind: "adoption_candidate",
      mismatches: emptyTupleV1(),
      warnings,
      adoption,
    });
  }
  return ({
    kind: "inspect_only",
    mismatches: mismatches as readonly [
      SaveCompatibilityMismatchV1,
      ...SaveCompatibilityMismatchV1[],
    ],
    warnings,
  });
}

function requiredStringV1(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`invalid ${label}`);
  return value;
}

function requireDifferentV1<T>(stored: T, current: T, label: string): readonly [T, T] {
  if (stored === current) throw new TypeError(`equal ${label}`);
  return [stored, current];
}

function fieldValueV1(fields: Record<string, unknown>, field: string): unknown {
  return fields[field];
}

function parseDenseArrayV1<T>(
  value: unknown,
  label: string,
  maximumLength: number,
  parseEntry: (entry: unknown, index: number) => T,
): readonly T[] {
  if (!Array.isArray(value) || value.length > maximumLength) {
    throw new TypeError(`invalid ${label}`);
  }
  if (Object.keys(value).length !== value.length) {
    throw new TypeError(`invalid ${label}`);
  }
  return value.map(parseEntry);
}

function parseReplacementTraceV1(value: unknown): PatchReplacementTraceV1 {
  const fields = exactEnvelopeFieldsV1(
    value,
    ["surface", "symbolId", "kind", "previousProviderDigest", "nextProviderDigest"],
    "PatchReplacementTraceV1",
  );
  const surface = fieldValueV1(fields, "surface");
  const kind = fieldValueV1(fields, "kind");
  if (surface !== "simulation" && surface !== "presentation") {
    throw new TypeError("invalid patch replacement surface");
  }
  if (kind !== "rule" && kind !== "value" && kind !== "text" && kind !== "asset") {
    throw new TypeError("invalid patch replacement kind");
  }
  if (
    (surface === "simulation" && kind !== "rule" && kind !== "value") ||
    (surface === "presentation" && kind === "rule")
  ) {
    throw new TypeError("invalid patch replacement surface/kind pairing");
  }
  return ({
    surface,
    symbolId: requiredStringV1(fieldValueV1(fields, "symbolId"), "patch symbolId"),
    kind,
    previousProviderDigest: parseDigest(fieldValueV1(fields, "previousProviderDigest")),
    nextProviderDigest: parseDigest(fieldValueV1(fields, "nextProviderDigest")),
  });
}

function parseAppliedHotfixV1(value: unknown, index: number): AppliedHotfixV1 {
  const fields = exactEnvelopeFieldsV1(
    value,
    ["identity", "ordinal", "replacements"],
    "AppliedHotfixV1",
  );
  const identityFields = exactEnvelopeFieldsV1(
    fieldValueV1(fields, "identity"),
    ["id", "revision", "digest"],
    "AppliedHotfixV1.identity",
  );
  const ordinal = parsePositiveSafeInteger(fieldValueV1(fields, "ordinal"));
  if (ordinal !== index + 1) throw new TypeError("invalid applied Hotfix ordinal");
  return ({
    identity: {
      id: requiredStringV1(fieldValueV1(identityFields, "id"), "Hotfix id"),
      revision: parsePositiveSafeInteger(fieldValueV1(identityFields, "revision")),
      digest: parseDigest(fieldValueV1(identityFields, "digest")),
    },
    ordinal,
    replacements: parseDenseArrayV1(
      fieldValueV1(fields, "replacements"),
      "Hotfix replacements",
      10_000,
      parseReplacementTraceV1,
    ),
  });
}

function parsePatchSetIdentityV1(value: unknown): PatchSetIdentityV1 {
  const fields = exactEnvelopeFieldsV1(
    value,
    ["digest", "simulationDigest", "presentationDigest", "appliedHotfixes"],
    "PatchSetIdentityV1",
  );
  const appliedHotfixes = parseDenseArrayV1(
    fieldValueV1(fields, "appliedHotfixes"),
    "applied Hotfixes",
    10_000,
    parseAppliedHotfixV1,
  );
  const identities = new Set(appliedHotfixes.map(({ identity }) => identity.id));
  if (identities.size !== appliedHotfixes.length) {
    throw new TypeError("duplicate applied Hotfix identity");
  }
  return ({
    digest: parseDigest(fieldValueV1(fields, "digest")),
    simulationDigest: parseDigest(fieldValueV1(fields, "simulationDigest")),
    presentationDigest: parseDigest(fieldValueV1(fields, "presentationDigest")),
    appliedHotfixes,
  });
}

const mismatchOrderV1 = [
  "story_id",
  "story_revision",
  "state_contract_revision",
  "state_contract_digest",
  "engine_digest",
  "simulation_digest",
] as const;

function parseMismatchV1(value: unknown): SaveCompatibilityMismatchV1 {
  const fields = exactEnvelopeFieldsV1(
    value,
    ["field", "code", "stored", "current"],
    "SaveCompatibilityMismatchV1",
  );
  const field = fieldValueV1(fields, "field");
  const code = fieldValueV1(fields, "code");
  const stored = fieldValueV1(fields, "stored");
  const current = fieldValueV1(fields, "current");
  if (field === "story_id" && code === "identity.story_id_mismatch") {
    const [storedId, currentId] = requireDifferentV1(
      requiredStringV1(stored, "stored Story id"),
      requiredStringV1(current, "current Story id"),
      "Story ids",
    );
    return ({
      field,
      code,
      stored: storedId,
      current: currentId,
    });
  }
  if (field === "story_revision" && code === "identity.story_revision_mismatch") {
    const [storedRevision, currentRevision] = requireDifferentV1(
      parsePositiveSafeInteger(stored),
      parsePositiveSafeInteger(current),
      "Story revisions",
    );
    return ({
      field,
      code,
      stored: storedRevision,
      current: currentRevision,
    });
  }
  if (field === "state_contract_revision" && code === "identity.state_contract_revision_mismatch") {
    const [storedRevision, currentRevision] = requireDifferentV1(
      parsePositiveSafeInteger(stored),
      parsePositiveSafeInteger(current),
      "state contract revisions",
    );
    return ({
      field,
      code,
      stored: storedRevision,
      current: currentRevision,
    });
  }
  if (field === "state_contract_digest" && code === "identity.state_contract_digest_mismatch") {
    const [storedDigest, currentDigest] = requireDifferentV1(
      parseDigest(stored),
      parseDigest(current),
      "state contract digests",
    );
    return ({
      field,
      code,
      stored: storedDigest,
      current: currentDigest,
    });
  }
  if (field === "engine_digest" && code === "identity.engine_digest_mismatch") {
    const [storedDigest, currentDigest] = requireDifferentV1(
      parseDigest(stored),
      parseDigest(current),
      "engine digests",
    );
    return ({
      field,
      code,
      stored: storedDigest,
      current: currentDigest,
    });
  }
  if (field === "simulation_digest" && code === "identity.simulation_digest_mismatch") {
    const [storedDigest, currentDigest] = requireDifferentV1(
      parseDigest(stored),
      parseDigest(current),
      "simulation digests",
    );
    return ({
      field,
      code,
      stored: storedDigest,
      current: currentDigest,
    });
  }
  throw new TypeError("invalid compatibility mismatch");
}

function parseMismatchesV1(
  value: unknown,
  requireNonempty: boolean,
): readonly SaveCompatibilityMismatchV1[] {
  const mismatches = parseDenseArrayV1(
    value,
    "compatibility mismatches",
    mismatchOrderV1.length,
    parseMismatchV1,
  );
  if (mismatches.length === 0 && requireNonempty) {
    throw new TypeError("empty inspect-only mismatches");
  }
  if (mismatches.length > 0 && !requireNonempty) {
    throw new TypeError("nonempty runnable mismatches");
  }
  let previousRank = -1;
  for (const mismatch of mismatches) {
    const rank = mismatchOrderV1.indexOf(mismatch.field);
    if (rank <= previousRank) throw new TypeError("unordered compatibility mismatches");
    previousRank = rank;
  }
  return mismatches;
}

const warningOrderV1 = ["story_digest", "presentation_digest", "hotfix_set"] as const;

function parseWarningV1(value: unknown): ImportCompatibilityWarningV1 {
  const fields = exactEnvelopeFieldsV1(
    value,
    ["field", "code", "stored", "current"],
    "ImportCompatibilityWarningV1",
  );
  const field = fieldValueV1(fields, "field");
  const code = fieldValueV1(fields, "code");
  const stored = fieldValueV1(fields, "stored");
  const current = fieldValueV1(fields, "current");
  if (field === "story_digest" && code === "identity.story_digest_mismatch") {
    const [storedDigest, currentDigest] = requireDifferentV1(
      parseDigest(stored),
      parseDigest(current),
      "Story digests",
    );
    return ({
      field,
      code,
      stored: storedDigest,
      current: currentDigest,
    });
  }
  if (field === "presentation_digest" && code === "identity.presentation_digest_mismatch") {
    const [storedDigest, currentDigest] = requireDifferentV1(
      parseDigest(stored),
      parseDigest(current),
      "presentation digests",
    );
    return ({
      field,
      code,
      stored: storedDigest,
      current: currentDigest,
    });
  }
  if (field === "hotfix_set" && code === "identity.hotfix_set_mismatch") {
    const storedPatchSet = parsePatchSetIdentityV1(stored);
    const currentPatchSet = parsePatchSetIdentityV1(current);
    if (canonicalBytesEqualV1(storedPatchSet, currentPatchSet)) {
      throw new TypeError("equal Hotfix PatchSets");
    }
    return ({
      field,
      code,
      stored: storedPatchSet,
      current: currentPatchSet,
    });
  }
  throw new TypeError("invalid compatibility warning");
}

function parseWarningsV1(value: unknown): readonly ImportCompatibilityWarningV1[] {
  const warnings = parseDenseArrayV1(
    value,
    "compatibility warnings",
    warningOrderV1.length,
    parseWarningV1,
  );
  let previousRank = -1;
  for (const warning of warnings) {
    const rank = warningOrderV1.indexOf(warning.field);
    if (rank <= previousRank) throw new TypeError("unordered compatibility warnings");
    previousRank = rank;
  }
  return warnings;
}

function parseAdoptionV1(value: unknown): SimulationAdoptionV1 {
  const fields = exactEnvelopeFieldsV1(
    value,
    [
      "fromSimulationDigest",
      "toSimulationDigest",
      "viaSimulationPatchSetDigest",
      "adoptedAtCommandSequence",
    ],
    "SimulationAdoptionV1",
  );
  const [fromSimulationDigest, toSimulationDigest] = requireDifferentV1(
    parseDigest(fieldValueV1(fields, "fromSimulationDigest")),
    parseDigest(fieldValueV1(fields, "toSimulationDigest")),
    "adoption simulation digests",
  );
  return ({
    fromSimulationDigest,
    toSimulationDigest,
    viaSimulationPatchSetDigest: parseDigest(fieldValueV1(fields, "viaSimulationPatchSetDigest")),
    adoptedAtCommandSequence: parseNonNegativeSafeInteger(
      fieldValueV1(fields, "adoptedAtCommandSequence"),
    ),
  });
}

function validateStoryErrorsV1(value: unknown, label: string): readonly string[] {
  return parseDenseArrayV1(
    value,
    `${label} result`,
    10_000,
    (entry) => requiredStringV1(entry, `${label} error`),
  );
}

const rejectionCodesV1 = new Set<ImportRejectionCodeV1>([
  "encoding.invalid_utf8",
  "encoding.bom_forbidden",
  "syntax.invalid",
  "syntax.comment_forbidden",
  "syntax.trailing_comma_forbidden",
  "object.duplicate_key",
  "object.dangerous_key",
  "limit.bytes",
  "limit.depth",
  "limit.array_items",
  "limit.object_members",
  "limit.nodes",
  "limit.string_bytes",
  "number.not_integer",
  "number.unsafe_integer",
  "number.negative_zero",
  "string.lone_surrogate",
  "rng.invalid_state",
  "envelope.schema_invalid",
  "envelope.unsupported_revision",
  "digest.invalid_format",
  "digest.state_mismatch",
  "digest.normalized_state_mismatch",
  "compatibility.adoption_ambiguous",
  "compatibility.lineage_limit",
  "reference.unknown_id",
  "invariant.failed",
]);

function normalizeCompatibilityClassificationV1(value: unknown): SaveCompatibilityClassificationV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("invalid compatibility classification");
  }
  const kind = (value as Record<string, unknown>).kind;
  if (kind === "rejected") {
    const fields = exactEnvelopeFieldsV1(
      value,
      ["kind", "code"],
      "rejected compatibility classification",
    );
    const code = fieldValueV1(fields, "code");
    if (typeof code !== "string" || !rejectionCodesV1.has(code as ImportRejectionCodeV1)) {
      throw new TypeError("invalid compatibility rejection");
    }
    const normalized = { kind: "rejected" as const, code: code as ImportRejectionCodeV1 };
    const reanchorEvidence = reanchorEvidenceByClassificationV1.get(value);
    if (reanchorEvidence !== undefined) {
      reanchorEvidenceByClassificationV1.set(normalized, reanchorEvidence);
    }
    return normalized;
  }
  if (kind === "exact") {
    const fields = exactEnvelopeFieldsV1(
      value,
      ["kind", "mismatches", "warnings"],
      "exact compatibility classification",
    );
    parseMismatchesV1(fieldValueV1(fields, "mismatches"), false);
    return ({
      kind,
      mismatches: emptyTupleV1(),
      warnings: parseWarningsV1(fieldValueV1(fields, "warnings")),
    });
  }
  if (kind === "adoption_candidate") {
    const fields = exactEnvelopeFieldsV1(
      value,
      ["kind", "mismatches", "warnings", "adoption"],
      "adoption compatibility classification",
    );
    parseMismatchesV1(fieldValueV1(fields, "mismatches"), false);
    return ({
      kind,
      mismatches: emptyTupleV1(),
      warnings: parseWarningsV1(fieldValueV1(fields, "warnings")),
      adoption: parseAdoptionV1(fieldValueV1(fields, "adoption")),
    });
  }
  if (kind === "inspect_only") {
    const fields = exactEnvelopeFieldsV1(
      value,
      ["kind", "mismatches", "warnings"],
      "inspect-only compatibility classification",
    );
    const mismatches = parseMismatchesV1(fieldValueV1(fields, "mismatches"), true) as readonly [
      SaveCompatibilityMismatchV1,
      ...SaveCompatibilityMismatchV1[],
    ];
    return ({
      kind,
      mismatches,
      warnings: parseWarningsV1(fieldValueV1(fields, "warnings")),
    });
  }
  throw new TypeError("invalid compatibility classification kind");
}

interface SaveImportMigrationEvidenceInternalV1 {
  readonly receipt: SaveStateMigrationReceiptV1;
  readonly completion: CompletedSaveStateMigrationInternalV1;
  readonly migratedStateDigest: Digest;
}

export interface SaveImportPreparedCandidateInternalV1<
  TSaveRecord extends SaveRecordEnvelopeV1<unknown, unknown, unknown, unknown>,
> {
  readonly kind: "prepared";
  readonly envelope: SaveRecordEnvelopeShellInternalV1<TSaveRecord>;
  readonly record: DeepReadonly<TSaveRecord>;
  readonly migration: SaveImportMigrationEvidenceInternalV1 | null;
}

export type SaveImportPreparationInternalV1<
  TSaveRecord extends SaveRecordEnvelopeV1<unknown, unknown, unknown, unknown>,
> =
  | { readonly kind: "rejected"; readonly code: ImportRejectionCodeV1 }
  | {
    readonly kind: "migration_pending";
    readonly envelope: SaveRecordEnvelopeShellInternalV1<TSaveRecord>;
    readonly result: SaveMigrationUnavailableInspectionV1;
  }
  | SaveImportPreparedCandidateInternalV1<TSaveRecord>;

/** @internal Pre-compatibility Save admission; intentionally absent from runtime barrels. */
export function prepareSaveImportCandidateInternalV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, BuildProvenanceV1, unknown, unknown>,
>(
  bytes: Uint8Array,
  context: SaveImportValidationContextV1<TState, TSnapshot, TSaveRecord>,
  instrumentation?: SnapshotWorkInstrumentationV1,
): SaveImportPreparationInternalV1<TSaveRecord> {
  const shell = decodeSaveRecordEnvelopeShellInternalV1(bytes, context.codec, instrumentation);
  if (shell.kind === "rejected") return shell;
  const storedStateContractRevision = shell.record.provenance.resolved.stateContractRevision;
  const currentStateContractRevision = parsePositiveSafeInteger(
    context.currentStateContractRevision,
  );
  if (storedStateContractRevision !== currentStateContractRevision) {
    return ({
      kind: "migration_pending",
      envelope: shell.record,
      result: {
        kind: "inspect_only",
        code: "migration.unavailable",
        storedStateContractRevision,
        currentStateContractRevision,
      },
    });
  }
  const decoded = decodeCurrentSaveRecordEnvelopeInternalV1(
    shell.record,
    context.codec,
    instrumentation,
  );
  if (decoded.kind === "rejected") return decoded;
  return ({
    kind: "prepared",
    envelope: shell.record,
    record: decoded.record,
    migration: null,
  });
}

interface HistoricalSnapshotShellInternalV1 {
  readonly state: StrictJsonValueV1;
  readonly rng: unknown;
  readonly commandSequence: unknown;
  readonly integrity: unknown;
}

function parseHistoricalSnapshotShellInternalV1(
  value: unknown,
): HistoricalSnapshotShellInternalV1 {
  const fields = exactEnvelopeFieldsV1(
    value,
    ["state", "rng", "commandSequence", "integrity"],
    "historical GameSnapshot",
  );
  return ({
    state: fields.state as StrictJsonValueV1,
    rng: fields.rng,
    commandSequence: fields.commandSequence,
    integrity: fields.integrity,
  });
}

function preservesHistoricalSnapshotAxesInternalV1(
  historical: HistoricalSnapshotShellInternalV1,
  current: unknown,
): boolean {
  try {
    const snapshot = current as {
      readonly rng: unknown;
      readonly commandSequence: unknown;
      readonly integrity: unknown;
    };
    return canonicalBytesEqualV1(historical.rng, snapshot.rng) &&
      canonicalBytesEqualV1(historical.commandSequence, snapshot.commandSequence) &&
      canonicalBytesEqualV1(historical.integrity, snapshot.integrity);
  } catch {
    return false;
  }
}

function migratedProvenanceInternalV1(
  stored: DeepReadonly<BuildProvenanceV1>,
  registry: SaveStateMigrationRegistryV1,
): DeepReadonly<BuildProvenanceV1> {
  const target = readSaveStateMigrationRegistryInternalV1(registry).current;
  return ({
    ...stored,
    resolved: {
      ...stored.resolved,
      stateContractRevision: target.stateContractRevision,
      stateContractDigest: target.stateContractDigest,
    },
  });
}

/** @internal Continues a historical branch only after stored physical admission. */
export function resumeSaveImportCandidateInternalV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, BuildProvenanceV1, unknown, unknown>,
>(
  pending: Extract<
    SaveImportPreparationInternalV1<TSaveRecord>,
    { readonly kind: "migration_pending" }
  >,
  context: SaveImportValidationContextV1<TState, TSnapshot, TSaveRecord>,
  instrumentation?: SnapshotWorkInstrumentationV1,
): SaveImportPreparedCandidateInternalV1<TSaveRecord> | SaveImportValidationResultV1<TSaveRecord> {
  const registry = context.saveStateMigrations;
  if (registry === null) return pending.result;
  const target = readSaveStateMigrationRegistryInternalV1(registry).current;
  if (target.stateContractRevision !== pending.result.currentStateContractRevision) {
    throw new TypeError("Save State migration registry target does not match validation context");
  }
  const source = {
    stateContractRevision: pending.envelope.provenance.resolved.stateContractRevision,
    stateContractDigest: pending.envelope.provenance.resolved.stateContractDigest,
  };
  const resolution = resolveSaveStateMigrationChainInternalV1(registry, source);
  if (resolution.kind === "unavailable") return pending.result;

  let snapshot: HistoricalSnapshotShellInternalV1;
  try {
    snapshot = parseHistoricalSnapshotShellInternalV1(pending.envelope.snapshot);
  } catch {
    return ({
      kind: "rejected",
      code: "envelope.schema_invalid",
      migrationAttempt: createSaveStateMigrationSnapshotShellAttemptInternalV1(
        resolution.chain,
        pending.envelope.stateDigest,
      ),
    });
  }

  const execution = executeResolvedSaveStateMigrationInternalV1({
    chain: resolution.chain,
    sourceStateDigest: pending.envelope.stateDigest,
    state: snapshot.state,
    limits: saveJsonLimitsV1,
  });
  if (execution.kind !== "migrated") return execution;

  const migratedShell = ({
    ...pending.envelope,
    provenance: migratedProvenanceInternalV1(pending.envelope.provenance, registry),
    snapshot: {
      state: execution.state,
      rng: snapshot.rng,
      commandSequence: snapshot.commandSequence,
      integrity: snapshot.integrity,
    },
  }) as SaveRecordEnvelopeShellInternalV1<TSaveRecord>;
  let normalizedRecord: DeepReadonly<TSaveRecord>;
  try {
    normalizedRecord = context.codec.recordSchema.parse(migratedShell) as DeepReadonly<TSaveRecord>;
  } catch (error) {
    return ({
      kind: "rejected",
      code: error instanceof RngStateSchemaFailureInternalV1
        ? error.code
        : "envelope.schema_invalid",
      migrationAttempt: createSaveStateMigrationAttemptInternalV1(
        execution.completion,
        "current_snapshot_schema",
        null,
      ),
    });
  }
  if (!preservesHistoricalSnapshotAxesInternalV1(snapshot, normalizedRecord.snapshot)) {
    return ({
      kind: "rejected",
      code: "envelope.schema_invalid",
      migrationAttempt: createSaveStateMigrationAttemptInternalV1(
        execution.completion,
        "current_snapshot_schema",
        null,
      ),
    });
  }
  const migratedStateDigest = digestCanonicalInternalV1(
    "sillymaker:state:v1",
    normalizedRecord.snapshot,
    instrumentation,
  );
  const candidate = ({
    ...normalizedRecord,
    stateDigest: migratedStateDigest,
  }) as DeepReadonly<TSaveRecord>;
  const admitted = validateCurrentSaveRecordEnvelopeCrossFieldsInternalV1(
    candidate,
    context.codec,
  );
  if (admitted.kind === "rejected") {
    return ({
      ...admitted,
      migrationAttempt: createSaveStateMigrationAttemptInternalV1(
        execution.completion,
        "current_snapshot_schema",
        null,
      ),
    });
  }
  const receipt = createSaveStateMigrationReceiptInternalV1(
    execution.completion,
    migratedStateDigest,
  );
  return ({
    kind: "prepared",
    envelope: pending.envelope,
    record: admitted.record,
    migration: {
      receipt,
      completion: execution.completion,
      migratedStateDigest,
    },
  });
}

/** @internal Story-facing validation after physical admission; absent from runtime barrels. */
export function finishSaveImportCandidateInternalV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, BuildProvenanceV1, unknown, unknown>,
>(
  prepared: SaveImportPreparedCandidateInternalV1<TSaveRecord>,
  context: SaveImportValidationContextV1<TState, TSnapshot, TSaveRecord>,
): SaveImportValidationResultV1<TSaveRecord> {
  const classification = normalizeCompatibilityClassificationV1(
    context.classifyCompatibility(prepared.record),
  );
  if (classification.kind === "rejected") {
    return ({
      kind: "rejected",
      code: classification.code,
      ...(prepared.migration === null ? {} : {
        migrationAttempt: createSaveStateMigrationAttemptInternalV1(
          prepared.migration.completion,
          "compatibility",
          prepared.migration.migratedStateDigest,
        ),
      }),
    });
  }
  if (classification.kind === "inspect_only") {
    return ({
      kind: "inspect_only",
      mismatches: classification.mismatches,
      warnings: classification.warnings,
      ...(prepared.migration === null ? {} : {
        migrationAttempt: createSaveStateMigrationAttemptInternalV1(
          prepared.migration.completion,
          "compatibility",
          prepared.migration.migratedStateDigest,
        ),
      }),
    });
  }
  const referenceErrors = validateStoryErrorsV1(
    context.validateReferences(prepared.record.snapshot.state),
    "reference validation",
  );
  if (referenceErrors.length > 0) {
    return ({
      kind: "rejected",
      code: "reference.unknown_id",
      ...(prepared.migration === null ? {} : {
        migrationAttempt: createSaveStateMigrationAttemptInternalV1(
          prepared.migration.completion,
          "references",
          prepared.migration.migratedStateDigest,
        ),
      }),
    });
  }
  const invariantView = {
    state: prepared.record.snapshot.state,
    commandSequence: prepared.record.snapshot.commandSequence,
  };
  const invariantErrors = validateStoryErrorsV1(
    context.validateInvariants(invariantView),
    "invariant validation",
  );
  if (invariantErrors.length > 0) {
    return ({
      kind: "rejected",
      code: "invariant.failed",
      ...(prepared.migration === null ? {} : {
        migrationAttempt: createSaveStateMigrationAttemptInternalV1(
          prepared.migration.completion,
          "invariants",
          prepared.migration.migratedStateDigest,
        ),
      }),
    });
  }
  if (classification.kind === "adoption_candidate") {
    return ({
      kind: "adopted",
      mismatches: emptyTupleV1(),
      warnings: classification.warnings,
      adoption: classification.adoption,
      candidate: prepared.record,
      migration: prepared.migration?.receipt ?? null,
    });
  }
  return ({
    kind: "exact",
    mismatches: emptyTupleV1(),
    warnings: classification.warnings,
    candidate: prepared.record,
    migration: prepared.migration?.receipt ?? null,
  });
}

export type SaveReanchorValidationResultInternalV1<TSaveRecord> =
  | {
    readonly kind: "ready";
    readonly candidate: DeepReadonly<TSaveRecord>;
    readonly adoption: SimulationAdoptionV1;
    readonly migration: SaveStateMigrationReceiptV1 | null;
  }
  | {
    readonly kind: "rejected";
    readonly code: ImportRejectionCodeV1 | "reanchor.not_required" | "reanchor.incompatible";
  };

/** @internal Exact lineage-limit recovery proof; absent from runtime barrels. */
export function finishSaveReanchorCandidateInternalV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, BuildProvenanceV1, unknown, unknown>,
>(
  prepared: SaveImportPreparedCandidateInternalV1<TSaveRecord>,
  context: SaveImportValidationContextV1<TState, TSnapshot, TSaveRecord>,
  expectedCurrent: DeepReadonly<BuildProvenanceV1>,
): SaveReanchorValidationResultInternalV1<TSaveRecord> {
  const classification = normalizeCompatibilityClassificationV1(
    context.classifyCompatibility(prepared.record),
  );
  if (classification.kind !== "rejected") {
    return ({
      kind: "rejected" as const,
      code: classification.kind === "inspect_only"
        ? ("reanchor.incompatible" as const)
        : ("reanchor.not_required" as const),
    });
  }
  if (classification.code !== "compatibility.lineage_limit") {
    return ({ kind: "rejected" as const, code: classification.code });
  }
  const evidence = reanchorEvidenceByClassificationV1.get(classification);
  const lineage = prepared.record.simulationLineage;
  if (
    evidence === undefined ||
    evidence.stored !== prepared.record.provenance ||
    evidence.current !== expectedCurrent ||
    evidence.simulationLineage !== lineage ||
    evidence.candidateCommandSequence !== prepared.record.snapshot.commandSequence ||
    !Array.isArray(lineage) ||
    lineage.length !== 16
  ) {
    return ({
      kind: "rejected" as const,
      code: "compatibility.lineage_limit" as const,
    });
  }
  const referenceErrors = validateStoryErrorsV1(
    context.validateReferences(prepared.record.snapshot.state),
    "reference validation",
  );
  if (referenceErrors.length > 0) {
    return ({
      kind: "rejected" as const,
      code: "reference.unknown_id" as const,
    });
  }
  const invariantErrors = validateStoryErrorsV1(
    context.validateInvariants({
      state: prepared.record.snapshot.state,
      commandSequence: prepared.record.snapshot.commandSequence,
    }),
    "invariant validation",
  );
  if (invariantErrors.length > 0) {
    return ({ kind: "rejected" as const, code: "invariant.failed" as const });
  }
  return ({
    kind: "ready" as const,
    candidate: prepared.record,
    adoption: evidence.adoption,
    migration: prepared.migration?.receipt ?? null,
  });
}

export function validateSaveImportCandidateV1<
  TState,
  TSnapshot extends {
    readonly state: TState;
    readonly commandSequence: NonNegativeSafeInteger;
  },
  TSaveRecord extends SaveRecordEnvelopeV1<TSnapshot, BuildProvenanceV1, unknown, unknown>,
>(
  bytes: Uint8Array,
  context: SaveImportValidationContextV1<TState, TSnapshot, TSaveRecord>,
): SaveImportValidationResultV1<TSaveRecord> {
  const prepared = prepareSaveImportCandidateInternalV1(bytes, context);
  if (prepared.kind === "rejected") return prepared;
  if (prepared.kind === "prepared") {
    return finishSaveImportCandidateInternalV1(prepared, context);
  }
  const resumed = resumeSaveImportCandidateInternalV1(prepared, context);
  if (resumed.kind !== "prepared") return resumed;
  return finishSaveImportCandidateInternalV1(resumed, context);
}

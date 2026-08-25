// SPDX-License-Identifier: MIT
import { digestCanonical } from "../../contracts/digest.ts";
import { lintNarrativeGraphV1, type NarrativeGraphV1 } from "../../contracts/narrative-graph.ts";
import type { Digest, PositiveSafeInteger } from "../../contracts/values.ts";
import { parseModuleId, parsePositiveSafeInteger } from "../../contracts/values.ts";
import {
  createRuntimeUnitResidencyInternalV1,
  type RuntimeUnitLeaseInternalV1,
  RuntimeUnitResidencyStaleErrorInternalV1,
} from "./runtime-unit-residency-internal.ts";

/** Stable control position stored by State/Save; loaded plans remain runtime-only. */
export interface NarrativePositionV1 {
  readonly unitId: string;
  readonly nodeId: string;
}

export type NarrativeExternalReferenceKindV1 = "successor" | "call";

export interface NarrativeExternalReferenceV1 {
  readonly fromNodeId: string;
  readonly kind: NarrativeExternalReferenceKindV1;
  readonly target: NarrativePositionV1;
}

export interface NarrativeUnitDependenciesV1 {
  readonly sceneIds: readonly string[];
  readonly guiCompositionIds: readonly string[];
  readonly textPackIds: readonly string[];
  readonly assetIds: readonly string[];
}

/**
 * One build-known control unit after its Story-owned loader has compiled it.
 * Base keeps the plan opaque and never interprets a Story control DSL.
 */
export interface LoadedNarrativeUnitV1<TPlan> {
  /** Checked against the admitted descriptor before the plan can activate. */
  readonly unitId: string;
  readonly graph: NarrativeGraphV1;
  readonly plan: TPlan;
}

export interface NarrativeUnitDescriptorV1<TPlan> {
  readonly unitId: string;
  /** Public entry points that other units may target. */
  readonly entryNodeIds: readonly string[];
  /** Cross-unit edges only; local graph edges remain in NarrativeGraphV1. */
  readonly externalReferences: readonly NarrativeExternalReferenceV1[];
  /** Typed cross-owner references; each owning manifest closes them separately. */
  readonly dependencies: NarrativeUnitDependenciesV1;
  /** Human-readable diagnostic/Inspector location; not application identity. */
  readonly source: string;
  /** Literal, build-known loader. BuildIdentity owns its code identity. */
  readonly load: () => Promise<LoadedNarrativeUnitV1<TPlan>>;
}

export interface NarrativeUnitManifestV1<TPlan> {
  readonly revision: PositiveSafeInteger;
  readonly units: readonly NarrativeUnitDescriptorV1<TPlan>[];
  /** Canonical generation identity over revision and addressable topology. */
  readonly digest: Digest;
}

export interface DefineNarrativeUnitDescriptorV1<TPlan> {
  readonly unitId: string;
  readonly entryNodeIds: readonly string[];
  readonly externalReferences: readonly {
    readonly fromNodeId: string;
    readonly kind: NarrativeExternalReferenceKindV1;
    readonly target: {
      readonly unitId: string;
      readonly nodeId: string;
    };
  }[];
  readonly dependencies?: {
    readonly sceneIds?: readonly string[];
    readonly guiCompositionIds?: readonly string[];
    readonly textPackIds?: readonly string[];
    readonly assetIds?: readonly string[];
  };
  readonly source: string;
  readonly load: () => Promise<LoadedNarrativeUnitV1<TPlan>>;
}

export type NarrativeUnitErrorCodeV1 =
  | "narrative_unit.manifest_invalid"
  | "narrative_unit.unit_duplicate"
  | "narrative_unit.entry_duplicate"
  | "narrative_unit.reference_duplicate"
  | "narrative_unit.dependency_duplicate"
  | "narrative_unit.reference_unit_unknown"
  | "narrative_unit.reference_entry_unknown"
  | "narrative_unit.dependency_scene_unknown"
  | "narrative_unit.dependency_gui_composition_unknown"
  | "narrative_unit.dependency_text_pack_unknown"
  | "narrative_unit.dependency_asset_unknown"
  | "narrative_unit.unit_unknown"
  | "narrative_unit.loaded_invalid"
  | "narrative_unit.loaded_identity_mismatch"
  | "narrative_unit.graph_lint_failed"
  | "narrative_unit.graph_entry_not_exported"
  | "narrative_unit.entry_missing"
  | "narrative_unit.reference_source_missing"
  | "narrative_unit.position_node_missing"
  | "narrative_unit.session_stale";

export class NarrativeUnitErrorV1 extends TypeError {
  readonly code: NarrativeUnitErrorCodeV1;
  readonly reference: string | null;

  constructor(code: NarrativeUnitErrorCodeV1, reference: string | null = null) {
    super(reference === null ? code : `${code}:${reference}`);
    this.name = "NarrativeUnitErrorV1";
    this.code = code;
    this.reference = reference;
  }
}

function fail(code: NarrativeUnitErrorCodeV1, reference: string | null = null): never {
  throw new NarrativeUnitErrorV1(code, reference);
}

function parseNarrativeUnitIdV1(value: unknown, reference: string): string {
  try {
    return parseModuleId(value) as string;
  } catch {
    return fail("narrative_unit.manifest_invalid", reference);
  }
}

function parseNarrativeNodeIdV1(value: unknown, reference: string): string {
  try {
    return parseModuleId(value) as string;
  } catch {
    return fail("narrative_unit.manifest_invalid", reference);
  }
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function referenceKey(reference: NarrativeExternalReferenceV1): string {
  return [
    reference.fromNodeId,
    reference.kind,
    reference.target.unitId,
    reference.target.nodeId,
  ].join("\0");
}

function normalizeDependencyIdsV1(
  values: readonly string[] | undefined,
  reference: string,
): readonly string[] {
  if (values === undefined) return [];
  if (!Array.isArray(values)) return fail("narrative_unit.manifest_invalid", reference);
  const normalized = values.map((value, index) => {
    try {
      return parseModuleId(value) as string;
    } catch {
      return fail("narrative_unit.manifest_invalid", `${reference}/${String(index)}`);
    }
  }).sort(compareStrings);
  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index - 1] === normalized[index]) {
      return fail("narrative_unit.dependency_duplicate", normalized[index] ?? null);
    }
  }
  return normalized;
}

function normalizeDescriptorV1<TPlan>(
  input: DefineNarrativeUnitDescriptorV1<TPlan>,
  index: number,
): NarrativeUnitDescriptorV1<TPlan> {
  const prefix = `units/${String(index)}`;
  const unitId = parseNarrativeUnitIdV1(input?.unitId, `${prefix}/unitId`);
  if (!Array.isArray(input.entryNodeIds) || input.entryNodeIds.length === 0) {
    return fail("narrative_unit.manifest_invalid", `${unitId}/entryNodeIds`);
  }
  const entryNodeIds = input.entryNodeIds
    .map((nodeId, entryIndex) =>
      parseNarrativeNodeIdV1(nodeId, `${prefix}/entryNodeIds/${String(entryIndex)}`)
    )
    .sort(compareStrings);
  for (let entryIndex = 1; entryIndex < entryNodeIds.length; entryIndex += 1) {
    if (entryNodeIds[entryIndex - 1] === entryNodeIds[entryIndex]) {
      return fail("narrative_unit.entry_duplicate", entryNodeIds[entryIndex] ?? null);
    }
  }

  if (!Array.isArray(input.externalReferences)) {
    return fail("narrative_unit.manifest_invalid", `${unitId}/externalReferences`);
  }
  const externalReferences = input.externalReferences.map((reference, referenceIndex) => {
    const referencePrefix = `${prefix}/externalReferences/${String(referenceIndex)}`;
    if (reference?.kind !== "successor" && reference?.kind !== "call") {
      return fail("narrative_unit.manifest_invalid", `${referencePrefix}/kind`);
    }
    return {
      fromNodeId: parseNarrativeNodeIdV1(
        reference.fromNodeId,
        `${referencePrefix}/fromNodeId`,
      ),
      kind: reference.kind,
      target: {
        unitId: parseNarrativeUnitIdV1(
          reference.target?.unitId,
          `${referencePrefix}/target/unitId`,
        ),
        nodeId: parseNarrativeNodeIdV1(
          reference.target?.nodeId,
          `${referencePrefix}/target/nodeId`,
        ),
      },
    } satisfies NarrativeExternalReferenceV1;
  }).sort((left, right) => compareStrings(referenceKey(left), referenceKey(right)));
  for (let referenceIndex = 1; referenceIndex < externalReferences.length; referenceIndex += 1) {
    if (
      referenceKey(externalReferences[referenceIndex - 1]!) ===
        referenceKey(externalReferences[referenceIndex]!)
    ) {
      return fail(
        "narrative_unit.reference_duplicate",
        referenceKey(externalReferences[referenceIndex]!),
      );
    }
  }

  if (
    input.dependencies !== undefined &&
    (input.dependencies === null ||
      typeof input.dependencies !== "object" ||
      Array.isArray(input.dependencies))
  ) {
    return fail("narrative_unit.manifest_invalid", `${unitId}/dependencies`);
  }
  const dependencies = {
    sceneIds: normalizeDependencyIdsV1(input.dependencies?.sceneIds, `${prefix}/sceneIds`),
    guiCompositionIds: normalizeDependencyIdsV1(
      input.dependencies?.guiCompositionIds,
      `${prefix}/guiCompositionIds`,
    ),
    textPackIds: normalizeDependencyIdsV1(
      input.dependencies?.textPackIds,
      `${prefix}/textPackIds`,
    ),
    assetIds: normalizeDependencyIdsV1(input.dependencies?.assetIds, `${prefix}/assetIds`),
  } satisfies NarrativeUnitDependenciesV1;

  if (typeof input.source !== "string" || input.source.trim().length === 0) {
    return fail("narrative_unit.manifest_invalid", `${unitId}/source`);
  }
  if (typeof input.load !== "function") {
    return fail("narrative_unit.manifest_invalid", `${unitId}/load`);
  }
  return {
    unitId,
    entryNodeIds,
    externalReferences,
    dependencies,
    source: input.source,
    load: input.load,
  };
}

/**
 * Defines one immutable application-generation topology. This is trusted
 * build-time composition, so it performs one ordinary normalization pass and
 * does not add descriptor/prototype authenticity checks.
 */
export function defineNarrativeUnitManifestV1<TPlan>(input: {
  readonly revision: number;
  readonly units: readonly DefineNarrativeUnitDescriptorV1<TPlan>[];
}): NarrativeUnitManifestV1<TPlan> {
  let revision: PositiveSafeInteger;
  try {
    revision = parsePositiveSafeInteger(input.revision);
  } catch {
    return fail("narrative_unit.manifest_invalid", "revision");
  }
  if (!Array.isArray(input.units)) {
    return fail("narrative_unit.manifest_invalid", "units");
  }

  const units = input.units
    .map((unit, index) => normalizeDescriptorV1<TPlan>(unit, index))
    .sort((left, right) => compareStrings(left.unitId, right.unitId));
  const entriesByUnit = new Map<string, ReadonlySet<string>>();
  for (const unit of units) {
    if (entriesByUnit.has(unit.unitId)) {
      return fail("narrative_unit.unit_duplicate", unit.unitId);
    }
    entriesByUnit.set(unit.unitId, new Set(unit.entryNodeIds));
  }
  for (const unit of units) {
    for (const reference of unit.externalReferences) {
      const targetEntries = entriesByUnit.get(reference.target.unitId);
      if (targetEntries === undefined) {
        return fail("narrative_unit.reference_unit_unknown", reference.target.unitId);
      }
      if (!targetEntries.has(reference.target.nodeId)) {
        return fail(
          "narrative_unit.reference_entry_unknown",
          `${reference.target.unitId}/${reference.target.nodeId}`,
        );
      }
    }
  }

  const digest = digestCanonical("sillymaker:narrative-unit-manifest:v1", {
    revision,
    units: units.map((unit) => ({
      unitId: unit.unitId,
      entryNodeIds: unit.entryNodeIds,
      externalReferences: unit.externalReferences,
      dependencies: unit.dependencies,
    })),
  });
  return { revision, units, digest };
}

export interface NarrativeUnitDependencyClosureV1 {
  readonly sceneIds: ReadonlySet<string>;
  readonly guiCompositionIds: ReadonlySet<string>;
  readonly textPackIds: ReadonlySet<string>;
  readonly assetIds: ReadonlySet<string>;
}

/**
 * Checks Narrative's typed cross-owner references against the manifests that
 * own those IDs. Each owning format remains independent; this is only the
 * application composition/build closure.
 */
export function assertNarrativeUnitDependencyClosureV1<TPlan>(
  manifest: NarrativeUnitManifestV1<TPlan>,
  available: NarrativeUnitDependencyClosureV1,
): void {
  for (const unit of manifest.units) {
    for (const sceneId of unit.dependencies.sceneIds) {
      if (!available.sceneIds.has(sceneId)) {
        return fail("narrative_unit.dependency_scene_unknown", `${unit.unitId}/${sceneId}`);
      }
    }
    for (const compositionId of unit.dependencies.guiCompositionIds) {
      if (!available.guiCompositionIds.has(compositionId)) {
        return fail(
          "narrative_unit.dependency_gui_composition_unknown",
          `${unit.unitId}/${compositionId}`,
        );
      }
    }
    for (const packId of unit.dependencies.textPackIds) {
      if (!available.textPackIds.has(packId)) {
        return fail("narrative_unit.dependency_text_pack_unknown", `${unit.unitId}/${packId}`);
      }
    }
    for (const assetId of unit.dependencies.assetIds) {
      if (!available.assetIds.has(assetId)) {
        return fail("narrative_unit.dependency_asset_unknown", `${unit.unitId}/${assetId}`);
      }
    }
  }
}

export interface NarrativeUnitTimingV1 {
  readonly loadMs: number;
  readonly admitMs: number;
  readonly activateMs: number;
  readonly totalMs: number;
}

export interface NarrativeUnitResidentV1<TPlan> {
  readonly unitId: string;
  readonly generation: Digest;
  readonly plan: TPlan;
  readonly timing: NarrativeUnitTimingV1;
}

export interface NarrativeUnitLeaseV1<TPlan> extends NarrativeUnitResidentV1<TPlan> {
  /** Releases only this ownership claim. Repeated calls are inert. */
  release(): void;
}

export interface NarrativeUnitSessionV1<TPlan> {
  readonly manifest: NarrativeUnitManifestV1<TPlan>;
  readonly generation: Digest;
  acquire(unitId: string): Promise<NarrativeUnitLeaseV1<TPlan>>;
  acquirePosition(position: NarrativePositionV1): Promise<NarrativeUnitLeaseV1<TPlan>>;
  /**
   * Non-owning cold-path lookup for the Host binding or Inspector owner.
   * Command and render hot paths retain the direct plan from a lease.
   */
  getResident(unitId: string): NarrativeUnitResidentV1<TPlan> | null;
  dispose(): void;
}

interface ActiveNarrativeUnitV1<TPlan> {
  readonly plan: TPlan;
  readonly nodeIds: ReadonlySet<string>;
}

function admitLoadedNarrativeUnitV1<TPlan>(
  descriptor: NarrativeUnitDescriptorV1<TPlan>,
  loaded: LoadedNarrativeUnitV1<TPlan>,
): ActiveNarrativeUnitV1<TPlan> {
  if (loaded === null || typeof loaded !== "object") {
    return fail("narrative_unit.loaded_invalid", descriptor.unitId);
  }
  if (loaded.unitId !== descriptor.unitId) {
    return fail("narrative_unit.loaded_identity_mismatch", descriptor.unitId);
  }
  // The Story-owned loader already returns a typed NarrativeGraphV1 from its
  // source admission/projection boundary. Trust that representation here; this
  // unit owner checks composition-level lint and declared entry/reference
  // closure without reparsing the same graph.
  const graph: NarrativeGraphV1 = loaded.graph;
  const diagnostics = lintNarrativeGraphV1(graph);
  if (diagnostics.length > 0) {
    return fail(
      "narrative_unit.graph_lint_failed",
      `${descriptor.unitId}/${diagnostics[0]?.code ?? "unknown"}`,
    );
  }

  const nodeIds = new Set(graph.nodes.map((node) => node.nodeId));
  if (!descriptor.entryNodeIds.includes(graph.entryNodeId)) {
    return fail(
      "narrative_unit.graph_entry_not_exported",
      `${descriptor.unitId}/${graph.entryNodeId}`,
    );
  }
  for (const entryNodeId of descriptor.entryNodeIds) {
    if (!nodeIds.has(entryNodeId)) {
      return fail("narrative_unit.entry_missing", `${descriptor.unitId}/${entryNodeId}`);
    }
  }
  for (const reference of descriptor.externalReferences) {
    if (!nodeIds.has(reference.fromNodeId)) {
      return fail(
        "narrative_unit.reference_source_missing",
        `${descriptor.unitId}/${reference.fromNodeId}`,
      );
    }
  }
  return { plan: loaded.plan, nodeIds };
}

function publicLeaseV1<TPlan>(
  lease: RuntimeUnitLeaseInternalV1<string, ActiveNarrativeUnitV1<TPlan>>,
): NarrativeUnitLeaseV1<TPlan> {
  return {
    unitId: lease.unitId,
    generation: lease.generation as Digest,
    plan: lease.plan.plan,
    timing: lease.timing,
    release: lease.release,
  };
}

/** Creates the Narrative-specific owner for one immutable manifest generation. */
export function createNarrativeUnitSessionV1<TPlan>(input: {
  readonly manifest: NarrativeUnitManifestV1<TPlan>;
  readonly now?: () => number;
}): NarrativeUnitSessionV1<TPlan> {
  const descriptors = new Map(input.manifest.units.map((unit) => [unit.unitId, unit] as const));
  const residency = createRuntimeUnitResidencyInternalV1<string, ActiveNarrativeUnitV1<TPlan>>({
    generation: input.manifest.digest,
    ...(input.now === undefined ? {} : { now: input.now }),
  });

  const acquireInternal = async (
    unitId: string,
  ): Promise<RuntimeUnitLeaseInternalV1<string, ActiveNarrativeUnitV1<TPlan>>> => {
    const descriptor = descriptors.get(unitId);
    if (descriptor === undefined) {
      return fail("narrative_unit.unit_unknown", unitId);
    }
    try {
      return await residency.acquire(unitId, {
        load: descriptor.load,
        admit: (loaded) => admitLoadedNarrativeUnitV1(descriptor, loaded),
        activate: (admitted) => admitted,
      });
    } catch (error) {
      if (error instanceof RuntimeUnitResidencyStaleErrorInternalV1) {
        return fail("narrative_unit.session_stale", unitId);
      }
      throw error;
    }
  };

  return {
    manifest: input.manifest,
    generation: input.manifest.digest,
    acquire: async (unitId): Promise<NarrativeUnitLeaseV1<TPlan>> =>
      publicLeaseV1(await acquireInternal(unitId)),
    acquirePosition: async (position): Promise<NarrativeUnitLeaseV1<TPlan>> => {
      const lease = await acquireInternal(position.unitId);
      if (!lease.plan.nodeIds.has(position.nodeId)) {
        lease.release();
        return fail(
          "narrative_unit.position_node_missing",
          `${position.unitId}/${position.nodeId}`,
        );
      }
      return publicLeaseV1(lease);
    },
    getResident(unitId): NarrativeUnitResidentV1<TPlan> | null {
      const resident = residency.getResident(unitId);
      return resident === null ? null : {
        unitId: resident.unitId,
        generation: resident.generation as Digest,
        plan: resident.plan.plan,
        timing: resident.timing,
      };
    },
    dispose: residency.dispose,
  };
}

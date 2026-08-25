// SPDX-License-Identifier: MIT
import {
  admitGuiCompositionSourceBytesV1,
  digestCanonical,
  parsePositiveSafeInteger,
  type Digest,
  type PositiveSafeInteger,
} from "@sillymaker/base";
import {
  createRuntimeUnitResidencyInternalV1,
  RuntimeUnitResidencyStaleErrorInternalV1,
} from "@sillymaker/base/runtime/internal";

import {
  compileCodeSurfaceCompositionV1,
  type CodeSurfaceCatalogV1,
  type CompiledCodeSurfaceCompositionV1,
} from "./code-surface.tsx";

export interface GuiCompositionUnitDescriptorInternalV1<TContext> {
  readonly compositionId: string;
  /** Build-known path loaded by the Host's same-origin byte transport. */
  readonly runtimePath: string;
  /** Human-readable diagnostic/Inspector location; not application identity. */
  readonly source: string;
  /** Literal loader for this composition's build-known Code Surface catalog. */
  readonly loadCatalog: () => Promise<CodeSurfaceCatalogV1<TContext>>;
}

export interface GuiCompositionUnitManifestInternalV1<TContext> {
  readonly revision: PositiveSafeInteger;
  readonly compositions: readonly GuiCompositionUnitDescriptorInternalV1<TContext>[];
  /** Canonical generation identity over revision and sorted address topology. */
  readonly digest: Digest;
}

export interface DefineGuiCompositionUnitDescriptorInternalV1<TContext> {
  readonly compositionId: string;
  readonly runtimePath: string;
  readonly source: string;
  readonly loadCatalog: () => Promise<CodeSurfaceCatalogV1<TContext>>;
}

export interface GuiCompositionUnitTimingInternalV1 {
  readonly loadMs: number;
  readonly admitMs: number;
  readonly activateMs: number;
  readonly totalMs: number;
}

export interface ResidentGuiCompositionUnitInternalV1<TContext> {
  readonly compositionId: string;
  readonly generation: Digest;
  /** Direct compiled composition; render paths retain this reference. */
  readonly plan: CompiledCodeSurfaceCompositionV1<TContext>;
  readonly timing: GuiCompositionUnitTimingInternalV1;
}

export interface GuiCompositionUnitLeaseInternalV1<TContext>
  extends ResidentGuiCompositionUnitInternalV1<TContext> {
  /** Releases only this acquisition. Repeated calls are no-ops. */
  release(): void;
}

export interface GuiCompositionUnitSessionInternalV1<TContext> {
  readonly manifest: GuiCompositionUnitManifestInternalV1<TContext>;
  readonly generation: Digest;
  acquire(compositionId: string): Promise<GuiCompositionUnitLeaseInternalV1<TContext>>;
  /** Non-owning cold-path lookup for readiness and instance binding. */
  getResident(compositionId: string): ResidentGuiCompositionUnitInternalV1<TContext> | null;
  dispose(): void;
}

export type GuiCompositionUnitErrorCodeInternalV1 =
  | "gui_composition_unit.manifest_invalid"
  | "gui_composition_unit.composition_duplicate"
  | "gui_composition_unit.composition_unknown"
  | "gui_composition_unit.composition_identity_mismatch"
  | "gui_composition_unit.session_stale";

export class GuiCompositionUnitErrorInternalV1 extends TypeError {
  readonly code: GuiCompositionUnitErrorCodeInternalV1;
  readonly reference: string | null;

  constructor(code: GuiCompositionUnitErrorCodeInternalV1, reference: string | null = null) {
    super(reference === null ? code : `${code}:${reference}`);
    this.name = "GuiCompositionUnitErrorInternalV1";
    this.code = code;
    this.reference = reference;
  }
}

function fail(
  code: GuiCompositionUnitErrorCodeInternalV1,
  reference: string | null = null,
): never {
  throw new GuiCompositionUnitErrorInternalV1(code, reference);
}

const compositionIdPatternV1 = /^gui\.[a-z0-9_.-]+$/u;

function normalizeRuntimePathV1(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes(":") ||
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("\0") ||
    value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    return fail("gui_composition_unit.manifest_invalid", "runtimePath");
  }
  return value;
}

function normalizeDescriptorV1<TContext>(
  input: DefineGuiCompositionUnitDescriptorInternalV1<TContext>,
  index: number,
): GuiCompositionUnitDescriptorInternalV1<TContext> {
  if (
    typeof input?.compositionId !== "string" ||
    input.compositionId.length > 96 ||
    !compositionIdPatternV1.test(input.compositionId)
  ) {
    return fail(
      "gui_composition_unit.manifest_invalid",
      `compositions/${String(index)}/compositionId`,
    );
  }
  let runtimePath: string;
  try {
    runtimePath = normalizeRuntimePathV1(input.runtimePath);
  } catch {
    return fail(
      "gui_composition_unit.manifest_invalid",
      `${input.compositionId}/runtimePath`,
    );
  }
  if (typeof input.source !== "string" || input.source.trim().length === 0) {
    return fail("gui_composition_unit.manifest_invalid", `${input.compositionId}/source`);
  }
  if (typeof input.loadCatalog !== "function") {
    return fail("gui_composition_unit.manifest_invalid", `${input.compositionId}/loadCatalog`);
  }
  return {
    compositionId: input.compositionId,
    runtimePath,
    source: input.source,
    loadCatalog: input.loadCatalog,
  };
}

function compareCompositionIdV1<TContext>(
  left: GuiCompositionUnitDescriptorInternalV1<TContext>,
  right: GuiCompositionUnitDescriptorInternalV1<TContext>,
): number {
  return left.compositionId < right.compositionId
    ? -1
    : left.compositionId > right.compositionId
    ? 1
    : 0;
}

/** Defines one build-known GUI-unit topology for an application generation. */
export function defineGuiCompositionUnitManifestInternalV1<TContext>(input: {
  readonly revision: number;
  readonly compositions: readonly DefineGuiCompositionUnitDescriptorInternalV1<TContext>[];
}): GuiCompositionUnitManifestInternalV1<TContext> {
  if (!Array.isArray(input.compositions)) {
    return fail("gui_composition_unit.manifest_invalid", "compositions");
  }
  let revision: PositiveSafeInteger;
  try {
    revision = parsePositiveSafeInteger(input.revision);
  } catch {
    return fail("gui_composition_unit.manifest_invalid", "revision");
  }

  const compositions = input.compositions.map(normalizeDescriptorV1).sort(
    compareCompositionIdV1,
  );
  for (let index = 1; index < compositions.length; index += 1) {
    if (compositions[index - 1]?.compositionId === compositions[index]?.compositionId) {
      return fail(
        "gui_composition_unit.composition_duplicate",
        compositions[index]?.compositionId ?? null,
      );
    }
  }
  const digest = digestCanonical("sillymaker:gui-unit-manifest:v1", {
    revision,
    compositions: compositions.map(({ compositionId, runtimePath }) => ({
      compositionId,
      runtimePath,
    })),
  });
  return { revision, compositions, digest };
}

function leaseViewV1<TContext>(
  compositionId: string,
  generation: Digest,
  lease: {
    readonly plan: CompiledCodeSurfaceCompositionV1<TContext>;
    readonly timing: GuiCompositionUnitTimingInternalV1;
    release(): void;
  },
): GuiCompositionUnitLeaseInternalV1<TContext> {
  return {
    compositionId,
    generation,
    plan: lease.plan,
    timing: lease.timing,
    release: lease.release,
  };
}

/**
 * Creates the GUI-specific residency owner. Parsed documents and compiled plans
 * are retained only while at least one consumer lease exists.
 */
export function createGuiCompositionUnitSessionInternalV1<TContext>(input: {
  readonly manifest: GuiCompositionUnitManifestInternalV1<TContext>;
  readonly loadRuntimeBytes: (runtimePath: string) => Promise<Uint8Array>;
  readonly now?: () => number;
}): GuiCompositionUnitSessionInternalV1<TContext> {
  const generation = input.manifest.digest;
  const descriptors = new Map(
    input.manifest.compositions.map((descriptor) =>
      [descriptor.compositionId, descriptor] as const
    ),
  );
  const residency = createRuntimeUnitResidencyInternalV1<
    string,
    CompiledCodeSurfaceCompositionV1<TContext>
  >({
    generation,
    ...(input.now === undefined ? {} : { now: input.now }),
  });

  const acquire = async (
    compositionId: string,
  ): Promise<GuiCompositionUnitLeaseInternalV1<TContext>> => {
    const descriptor = descriptors.get(compositionId);
    if (descriptor === undefined) {
      return fail("gui_composition_unit.composition_unknown", compositionId);
    }

    try {
      const lease = await residency.acquire(compositionId, {
        async load() {
          const [bytes, catalog] = await Promise.all([
            input.loadRuntimeBytes(descriptor.runtimePath),
            descriptor.loadCatalog(),
          ]);
          return { bytes, catalog };
        },
        admit(loaded) {
          const document = admitGuiCompositionSourceBytesV1(loaded.bytes);
          if (document.compositionId !== compositionId) {
            return fail("gui_composition_unit.composition_identity_mismatch", compositionId);
          }
          return { document, catalog: loaded.catalog };
        },
        activate(admitted) {
          return compileCodeSurfaceCompositionV1(admitted.document, admitted.catalog);
        },
      });
      return leaseViewV1(compositionId, generation, lease);
    } catch (error) {
      if (error instanceof RuntimeUnitResidencyStaleErrorInternalV1) {
        return fail("gui_composition_unit.session_stale", compositionId);
      }
      throw error;
    }
  };

  return {
    manifest: input.manifest,
    generation,
    acquire,
    getResident(compositionId: string): ResidentGuiCompositionUnitInternalV1<TContext> | null {
      const resident = residency.getResident(compositionId);
      if (resident === null) return null;
      return {
        compositionId,
        generation,
        plan: resident.plan,
        timing: resident.timing,
      };
    },
    dispose: residency.dispose,
  };
}

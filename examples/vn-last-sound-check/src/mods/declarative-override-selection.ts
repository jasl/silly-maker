// SPDX-License-Identifier: MIT
import {
  createSillyModSelectionControllerV1,
  defineSillyModMetadataV1,
  type ActiveSillyModContributionV1,
  type ResolvedSillyModManifestV1,
  type SillyDataModSourceV1,
  type SillyModExtensionPointV1,
  type SillyModLifecycleDiagnosticV1,
  type SillyModSelectionControllerV1,
  type SillyModSelectionV1,
} from "@sillymaker/composition/mod";

import {
  prepareVnLastSoundCheckDeclarativeModV1,
  vnLastSoundCheckDeclarativeModResourceBudgetBytesV1,
  VnLastSoundCheckDeclarativeModErrorV1,
  type PrepareVnLastSoundCheckDeclarativeModOptionsV1,
  type VnLastSoundCheckDeclarativeModArtifactSourceV1,
  type VnLastSoundCheckPreparedAssetOverrideV1,
  type VnLastSoundCheckPreparedDeclarativeModV1,
  type VnLastSoundCheckPreparedTextOverrideV1,
} from "./declarative-overrides.ts";

export const vnLastSoundCheckDeclarativeOverrideEngineApiV1 = {
  "sillymaker.vn-last-sound-check-declarative-overrides": "1.0.0",
} as const;

const textOverridePointIdV1 = "vn-last-sound-check.text-overrides";
const assetOverridePointIdV1 = "vn-last-sound-check.asset-overrides";
const textOverrideKindV1 = "vn-last-sound-check.text-pack-override";
const assetOverrideKindV1 = "vn-last-sound-check.asset-override";

type VnLastSoundCheckDeclarativeOverridePayloadV1 =
  | {
    readonly kind: "text";
    readonly override: VnLastSoundCheckPreparedTextOverrideV1;
  }
  | {
    readonly kind: "asset";
    readonly override: VnLastSoundCheckPreparedAssetOverrideV1;
  };

type VnLastSoundCheckCompiledOverridePointV1 =
  | {
    readonly kind: "text";
    readonly overrides: ReadonlyMap<string, VnLastSoundCheckPreparedTextOverrideV1>;
  }
  | {
    readonly kind: "asset";
    readonly overrides: ReadonlyMap<string, VnLastSoundCheckPreparedAssetOverrideV1>;
  };

export interface VnLastSoundCheckDeclarativeModSelectionV1 {
  readonly applicationGeneration: string;
  readonly selectionGeneration: number;
  readonly resolvedManifest: ResolvedSillyModManifestV1;
  readonly activeMods: readonly { readonly modId: string; readonly version: string }[];
  readonly textOverridesByRuntimePath: ReadonlyMap<
    string,
    VnLastSoundCheckPreparedTextOverrideV1
  >;
  readonly assetOverridesByRuntimePath: ReadonlyMap<
    string,
    VnLastSoundCheckPreparedAssetOverrideV1
  >;
}

export interface CreateVnLastSoundCheckDeclarativeModManagerOptionsV1
  extends PrepareVnLastSoundCheckDeclarativeModOptionsV1 {
  readonly applicationGeneration: string;
  /**
   * Applies a complete selection successor (normally one exact Web
   * application rebootstrap) before the Mod runtime retires its predecessor.
   */
  readonly publishSelectionSuccessor?: (
    successor: VnLastSoundCheckDeclarativeModSelectionV1,
    predecessor: VnLastSoundCheckDeclarativeModSelectionV1,
  ) => void | PromiseLike<void>;
  readonly onLifecycleDiagnostic?: (diagnostic: SillyModLifecycleDiagnosticV1) => void;
}

export interface VnLastSoundCheckDeclarativeModManagerV1 {
  /** Admits and activates the complete selected artifact set. */
  enable(
    sources: readonly VnLastSoundCheckDeclarativeModArtifactSourceV1[],
  ): Promise<VnLastSoundCheckDeclarativeModSelectionV1>;
  /** Re-reads the complete selected artifact set and publishes one successor. */
  reload(
    sources: readonly VnLastSoundCheckDeclarativeModArtifactSourceV1[],
  ): Promise<VnLastSoundCheckDeclarativeModSelectionV1>;
  /** Publishes an empty successor without changing Game State, Save, or History. */
  disable(): Promise<VnLastSoundCheckDeclarativeModSelectionV1>;
  getCurrent(): VnLastSoundCheckDeclarativeModSelectionV1 | null;
  subscribe(listener: () => void): () => void;
  dispose(): Promise<void>;
}

function compileTextOverridesV1(
  contributions: readonly ActiveSillyModContributionV1<
    VnLastSoundCheckDeclarativeOverridePayloadV1
  >[],
): VnLastSoundCheckCompiledOverridePointV1 {
  const overrides = new Map<string, VnLastSoundCheckPreparedTextOverrideV1>();
  const ownerBySlot = new Map<string, string>();
  for (const contribution of contributions) {
    if (contribution.payload.kind !== "text") {
      throw new VnLastSoundCheckDeclarativeModErrorV1(
        "declarative_mod.slot_unknown",
        contribution.contributionId,
      );
    }
    const override = contribution.payload.override;
    const predecessor = ownerBySlot.get(override.slotId);
    if (predecessor !== undefined) {
      throw new VnLastSoundCheckDeclarativeModErrorV1(
        "declarative_mod.slot_collision",
        `${override.slotId}:${predecessor}:${contribution.modId}`,
      );
    }
    ownerBySlot.set(override.slotId, contribution.modId);
    overrides.set(override.runtimePath, override);
  }
  return { kind: "text", overrides };
}

function compileAssetOverridesV1(
  contributions: readonly ActiveSillyModContributionV1<
    VnLastSoundCheckDeclarativeOverridePayloadV1
  >[],
): VnLastSoundCheckCompiledOverridePointV1 {
  const overrides = new Map<string, VnLastSoundCheckPreparedAssetOverrideV1>();
  const ownerBySlot = new Map<string, string>();
  for (const contribution of contributions) {
    if (contribution.payload.kind !== "asset") {
      throw new VnLastSoundCheckDeclarativeModErrorV1(
        "declarative_mod.slot_unknown",
        contribution.contributionId,
      );
    }
    const override = contribution.payload.override;
    const predecessor = ownerBySlot.get(override.slotId);
    if (predecessor !== undefined) {
      throw new VnLastSoundCheckDeclarativeModErrorV1(
        "declarative_mod.slot_collision",
        `${override.slotId}:${predecessor}:${contribution.modId}`,
      );
    }
    ownerBySlot.set(override.slotId, contribution.modId);
    overrides.set(override.runtimePath, override);
  }
  return { kind: "asset", overrides };
}

const extensionPointsV1: readonly SillyModExtensionPointV1<
  VnLastSoundCheckDeclarativeOverridePayloadV1,
  VnLastSoundCheckCompiledOverridePointV1
>[] = [
  {
    pointId: textOverridePointIdV1,
    contributionKind: textOverrideKindV1,
    collisionPolicy: "allow",
    compile: (input) => compileTextOverridesV1(input.contributions),
  },
  {
    pointId: assetOverridePointIdV1,
    contributionKind: assetOverrideKindV1,
    collisionPolicy: "allow",
    compile: (input) => compileAssetOverridesV1(input.contributions),
  },
];

function sourceFromPreparedModV1(
  prepared: VnLastSoundCheckPreparedDeclarativeModV1,
): SillyDataModSourceV1<VnLastSoundCheckDeclarativeOverridePayloadV1> {
  const metadata = defineSillyModMetadataV1({
    contractRevision: 1,
    modId: prepared.manifest.modId,
    version: prepared.manifest.modVersion,
    engineApi: {
      "sillymaker.vn-last-sound-check-declarative-overrides": "^1.0.0",
    },
    dependencies: { requires: [], optional: [], conflicts: [] },
    facets: [
      ...(prepared.textOverrides.length === 0 ? [] : ["presentation.text"]),
      ...(prepared.assetOverrides.length === 0 ? [] : ["presentation.assets"]),
    ],
  });
  return {
    kind: "data",
    metadata,
    contributions: [
      ...prepared.textOverrides.map((override, index) => ({
        contributionId: `text-override.${index + 1}`,
        pointId: textOverridePointIdV1,
        contributionKind: textOverrideKindV1,
        payload: { kind: "text" as const, override },
      })),
      ...prepared.assetOverrides.map((override, index) => ({
        contributionId: `asset-override.${index + 1}`,
        pointId: assetOverridePointIdV1,
        contributionKind: assetOverrideKindV1,
        payload: { kind: "asset" as const, override },
      })),
    ],
  };
}

function projectSelectionV1(
  selection: SillyModSelectionV1<VnLastSoundCheckCompiledOverridePointV1>,
): VnLastSoundCheckDeclarativeModSelectionV1 {
  const text = selection.compiledPoints.find((point) => point.pointId === textOverridePointIdV1)
    ?.value;
  const assets = selection.compiledPoints.find((point) => point.pointId === assetOverridePointIdV1)
    ?.value;
  if (text?.kind !== "text" || assets?.kind !== "asset") {
    throw new TypeError("vn-last-sound-check.declarative_mod_compilation_incomplete");
  }
  return {
    applicationGeneration: selection.applicationGeneration,
    selectionGeneration: selection.selectionGeneration,
    resolvedManifest: selection.resolvedManifest,
    activeMods: selection.activeIdentity,
    textOverridesByRuntimePath: text.overrides,
    assetOverridesByRuntimePath: assets.overrides,
  };
}

/**
 * Owns the product's cold declarative Mod selection. A committed selection is
 * immutable input for one Web application generation; applying its successor
 * is deliberately left to the application Host's exact rebootstrap path.
 */
export function createVnLastSoundCheckDeclarativeModManagerV1(
  options: CreateVnLastSoundCheckDeclarativeModManagerOptionsV1,
): VnLastSoundCheckDeclarativeModManagerV1 {
  const controller: SillyModSelectionControllerV1<
    VnLastSoundCheckDeclarativeOverridePayloadV1,
    VnLastSoundCheckCompiledOverridePointV1
  > = createSillyModSelectionControllerV1({
    applicationGeneration: options.applicationGeneration,
    engineApi: vnLastSoundCheckDeclarativeOverrideEngineApiV1,
    extensionPoints: extensionPointsV1,
    ...(options.onLifecycleDiagnostic === undefined ? {} : {
      onLifecycleDiagnostic: options.onLifecycleDiagnostic,
    }),
  });
  const listeners = new Set<() => void>();
  let current: VnLastSoundCheckDeclarativeModSelectionV1 | null = null;
  let nextSelectionGeneration = 1;
  let disposed = false;
  let transitionTail: Promise<void> = Promise.resolve();

  const notifyObservers = (): void => {
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // Observers are advisory UI refresh hooks. They never participate in
        // Mod admission or application-successor publication.
      }
    }
  };

  const projectAndPublishInitial = (
    selection: SillyModSelectionV1<VnLastSoundCheckCompiledOverridePointV1>,
  ): VnLastSoundCheckDeclarativeModSelectionV1 => {
    const projected = projectSelectionV1(selection);
    current = projected;
    notifyObservers();
    return projected;
  };

  const schedule = (
    work: () => Promise<VnLastSoundCheckDeclarativeModSelectionV1>,
  ): Promise<VnLastSoundCheckDeclarativeModSelectionV1> => {
    const run = transitionTail.then(async () => {
      if (disposed) throw new TypeError("vn-last-sound-check.declarative_mod_manager_disposed");
      return await work();
    });
    transitionTail = run.then(() => undefined, () => undefined);
    return run;
  };

  const commitPrepared = async (
    prepared: readonly VnLastSoundCheckPreparedDeclarativeModV1[],
  ): Promise<VnLastSoundCheckDeclarativeModSelectionV1> => {
    const selectionGeneration = nextSelectionGeneration;
    nextSelectionGeneration += 1;
    const catalog = prepared.map(sourceFromPreparedModV1);
    const candidate = {
      selectionGeneration,
      catalog,
      activeModIds: prepared.map((entry) => entry.manifest.modId),
    };
    if (controller.getCurrent() === null) {
      return projectAndPublishInitial(await controller.activate(candidate));
    }
    const selected = await controller.restart(candidate, (successor) => {
      const projected = projectSelectionV1(successor);
      const predecessor = current;
      if (predecessor === null) {
        throw new TypeError("vn-last-sound-check.declarative_mod_predecessor_missing");
      }
      return Promise.resolve(
        options.publishSelectionSuccessor?.(projected, predecessor),
      ).then(() => {
        current = projected;
        notifyObservers();
      });
    });
    return current ?? projectSelectionV1(selected);
  };

  const replace = (
    sources: readonly VnLastSoundCheckDeclarativeModArtifactSourceV1[],
  ): Promise<VnLastSoundCheckDeclarativeModSelectionV1> =>
    schedule(async () => {
      const prepared: VnLastSoundCheckPreparedDeclarativeModV1[] = [];
      let remainingResourceBytes = options.resourceBudgetBytes ??
        vnLastSoundCheckDeclarativeModResourceBudgetBytesV1;
      for (const source of sources) {
        const artifact = await prepareVnLastSoundCheckDeclarativeModV1(source, {
          ...options,
          resourceBudgetBytes: remainingResourceBytes,
        });
        const consumedBytes = source.manifestBytes.byteLength +
          artifact.textOverrides.reduce((total, entry) => total + entry.bytes.byteLength, 0) +
          artifact.assetOverrides.reduce((total, entry) => total + entry.bytes.byteLength, 0);
        remainingResourceBytes -= consumedBytes;
        prepared.push(artifact);
      }
      return await commitPrepared(prepared);
    });

  return {
    enable: replace,
    reload: replace,
    disable: () => schedule(() => commitPrepared([])),
    getCurrent: () => current,
    subscribe(listener) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      await transitionTail;
      await controller.dispose();
      current = null;
      notifyObservers();
      listeners.clear();
    },
  };
}

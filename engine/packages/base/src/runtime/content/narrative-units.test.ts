// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { parseNarrativeGraphV1 } from "../../contracts/narrative-graph.ts";
import {
  assertNarrativeUnitDependencyClosureV1,
  createNarrativeUnitSessionV1,
  defineNarrativeUnitManifestV1,
  type DefineNarrativeUnitDescriptorV1,
  type LoadedNarrativeUnitV1,
  type NarrativePositionV1,
} from "./narrative-units.ts";

interface TestPlanV1 {
  readonly label: string;
}

function positionV1(unitId: string, nodeId: string): NarrativePositionV1 {
  return { unitId, nodeId };
}

function deferredV1<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function loadedUnitV1(unitId: string, nodeId: string): LoadedNarrativeUnitV1<TestPlanV1> {
  return {
    unitId,
    graph: parseNarrativeGraphV1({
      entryNodeId: nodeId,
      nodes: [{
        nodeId,
        kind: "end",
        successors: [],
        callTarget: null,
        interaction: null,
        dependencies: { textIds: [], assetIds: [], stageContentIds: [] },
        source: null,
      }],
    }),
    plan: { label: unitId },
  };
}

function descriptorV1(input: {
  readonly unitId: string;
  readonly entryNodeIds: readonly string[];
  readonly source?: string;
  readonly externalReferences?: DefineNarrativeUnitDescriptorV1<TestPlanV1>["externalReferences"];
  readonly dependencies?: DefineNarrativeUnitDescriptorV1<TestPlanV1>["dependencies"];
  readonly load?: DefineNarrativeUnitDescriptorV1<TestPlanV1>["load"];
}): DefineNarrativeUnitDescriptorV1<TestPlanV1> {
  return {
    unitId: input.unitId,
    entryNodeIds: input.entryNodeIds,
    externalReferences: input.externalReferences ?? [],
    ...(input.dependencies === undefined ? {} : { dependencies: input.dependencies }),
    source: input.source ?? `story/${input.unitId}.ts`,
    load: input.load ?? (() => Promise.resolve(loadedUnitV1(input.unitId, input.entryNodeIds[0]!))),
  };
}

describe("narrative unit manifest", () => {
  it("normalizes topology without executing or hashing build-known loader identity", async () => {
    const alphaLoad = vi.fn(() => Promise.resolve(loadedUnitV1("narrative.alpha", "node.alpha.a")));
    const betaLoad = vi.fn(() =>
      Promise.resolve(loadedUnitV1("narrative.beta", "node.beta.entry"))
    );
    const beta = descriptorV1({
      unitId: "narrative.beta",
      entryNodeIds: ["node.beta.other", "node.beta.entry"],
      dependencies: {
        sceneIds: ["scene.beta.room", "scene.beta.entry"],
        guiCompositionIds: ["gui.beta.hud"],
        textPackIds: ["text.beta.chapter"],
        assetIds: ["asset.beta.background"],
      },
      source: "story/beta.ts",
      load: betaLoad,
    });
    const alpha = descriptorV1({
      unitId: "narrative.alpha",
      entryNodeIds: ["node.alpha.a"],
      source: "story/alpha.ts",
      externalReferences: [{
        fromNodeId: "node.alpha.a",
        kind: "successor",
        target: { unitId: "narrative.beta", nodeId: "node.beta.entry" },
      }, {
        fromNodeId: "node.alpha.a",
        kind: "call",
        target: { unitId: "narrative.beta", nodeId: "node.beta.other" },
      }],
      load: alphaLoad,
    });

    const manifest = defineNarrativeUnitManifestV1({ revision: 1, units: [beta, alpha] });
    const sameTopology = defineNarrativeUnitManifestV1({
      revision: 1,
      units: [
        {
          ...alpha,
          externalReferences: alpha.externalReferences.toReversed(),
          source: "moved/alpha.ts",
          load: async () => loadedUnitV1("narrative.alpha", "node.alpha.a"),
        },
        {
          ...beta,
          entryNodeIds: beta.entryNodeIds.toReversed(),
          dependencies: {
            ...beta.dependencies,
            sceneIds: beta.dependencies!.sceneIds!.toReversed(),
          },
          load: async () => loadedUnitV1("narrative.beta", "node.beta.entry"),
        },
      ],
    });

    expect(alphaLoad).not.toHaveBeenCalled();
    expect(betaLoad).not.toHaveBeenCalled();
    expect(manifest.units.map((unit) => unit.unitId)).toEqual([
      "narrative.alpha",
      "narrative.beta",
    ]);
    expect(manifest.units[1]?.entryNodeIds).toEqual(["node.beta.entry", "node.beta.other"]);
    expect(manifest.units[1]?.dependencies).toEqual({
      sceneIds: ["scene.beta.entry", "scene.beta.room"],
      guiCompositionIds: ["gui.beta.hud"],
      textPackIds: ["text.beta.chapter"],
      assetIds: ["asset.beta.background"],
    });
    expect(manifest.units[0]?.externalReferences.map((reference) => reference.kind)).toEqual([
      "call",
      "successor",
    ]);
    expect(manifest.digest).toBe(sameTopology.digest);
    expect(manifest.units[0]?.load).toBe(alphaLoad);
    await expect(manifest.units[0]?.load()).resolves.toMatchObject({
      unitId: "narrative.alpha",
      plan: { label: "narrative.alpha" },
    });
  });

  it("changes identity for revision or addressable topology changes", () => {
    const alpha = descriptorV1({
      unitId: "narrative.alpha",
      entryNodeIds: ["node.alpha.entry"],
    });
    const original = defineNarrativeUnitManifestV1({ revision: 1, units: [alpha] });

    expect(defineNarrativeUnitManifestV1({ revision: 2, units: [alpha] }).digest).not.toBe(
      original.digest,
    );
    expect(
      defineNarrativeUnitManifestV1({
        revision: 1,
        units: [{ ...alpha, entryNodeIds: ["node.alpha.entry", "node.alpha.extra"] }],
      }).digest,
    ).not.toBe(original.digest);
    expect(
      defineNarrativeUnitManifestV1({
        revision: 1,
        units: [{ ...alpha, dependencies: { sceneIds: ["scene.alpha.room"] } }],
      }).digest,
    ).not.toBe(original.digest);
  });

  it("rejects duplicate unit, entry, and external-reference declarations", () => {
    const alpha = descriptorV1({
      unitId: "narrative.alpha",
      entryNodeIds: ["node.alpha.entry"],
    });
    expect(() => defineNarrativeUnitManifestV1({ revision: 1, units: [alpha, { ...alpha }] }))
      .toThrow("narrative_unit.unit_duplicate:narrative.alpha");
    expect(() =>
      defineNarrativeUnitManifestV1({
        revision: 1,
        units: [{ ...alpha, entryNodeIds: ["node.alpha.entry", "node.alpha.entry"] }],
      })
    ).toThrow("narrative_unit.entry_duplicate:node.alpha.entry");

    const reference = {
      fromNodeId: "node.alpha.entry",
      kind: "successor" as const,
      target: { unitId: "narrative.beta", nodeId: "node.beta.entry" },
    };
    expect(() =>
      defineNarrativeUnitManifestV1({
        revision: 1,
        units: [
          { ...alpha, externalReferences: [reference, { ...reference }] },
          descriptorV1({ unitId: "narrative.beta", entryNodeIds: ["node.beta.entry"] }),
        ],
      })
    ).toThrow("narrative_unit.reference_duplicate");
    expect(() =>
      defineNarrativeUnitManifestV1({
        revision: 1,
        units: [{
          ...alpha,
          dependencies: { assetIds: ["asset.alpha.hero", "asset.alpha.hero"] },
        }],
      })
    ).toThrow("narrative_unit.dependency_duplicate:asset.alpha.hero");
  });

  it("closes every cross-unit target against a declared unit entry", () => {
    const alphaWith = (
      target: { readonly unitId: string; readonly nodeId: string },
    ): DefineNarrativeUnitDescriptorV1<TestPlanV1> =>
      descriptorV1({
        unitId: "narrative.alpha",
        entryNodeIds: ["node.alpha.entry"],
        externalReferences: [{
          fromNodeId: "node.alpha.entry",
          kind: "call",
          target,
        }],
      });

    expect(() =>
      defineNarrativeUnitManifestV1({
        revision: 1,
        units: [alphaWith({ unitId: "narrative.missing", nodeId: "node.missing.entry" })],
      })
    ).toThrow("narrative_unit.reference_unit_unknown:narrative.missing");
    expect(() =>
      defineNarrativeUnitManifestV1({
        revision: 1,
        units: [
          alphaWith({ unitId: "narrative.beta", nodeId: "node.beta.private" }),
          descriptorV1({ unitId: "narrative.beta", entryNodeIds: ["node.beta.entry"] }),
        ],
      })
    ).toThrow("narrative_unit.reference_entry_unknown:narrative.beta/node.beta.private");
  });

  it("closes typed dependencies against their owning manifests", () => {
    const manifest = defineNarrativeUnitManifestV1({
      revision: 1,
      units: [descriptorV1({
        unitId: "narrative.alpha",
        entryNodeIds: ["node.alpha.entry"],
        dependencies: {
          sceneIds: ["scene.alpha"],
          guiCompositionIds: ["gui.alpha"],
          textPackIds: ["text.alpha"],
          assetIds: ["asset.alpha"],
        },
      })],
    });
    const available = {
      sceneIds: new Set(["scene.alpha"]),
      guiCompositionIds: new Set(["gui.alpha"]),
      textPackIds: new Set(["text.alpha"]),
      assetIds: new Set(["asset.alpha"]),
    };

    expect(() => assertNarrativeUnitDependencyClosureV1(manifest, available)).not.toThrow();
    expect(() =>
      assertNarrativeUnitDependencyClosureV1(manifest, {
        ...available,
        sceneIds: new Set(),
      })
    ).toThrow("narrative_unit.dependency_scene_unknown:narrative.alpha/scene.alpha");
    expect(() =>
      assertNarrativeUnitDependencyClosureV1(manifest, {
        ...available,
        guiCompositionIds: new Set(),
      })
    ).toThrow(
      "narrative_unit.dependency_gui_composition_unknown:narrative.alpha/gui.alpha",
    );
    expect(() =>
      assertNarrativeUnitDependencyClosureV1(manifest, {
        ...available,
        textPackIds: new Set(),
      })
    ).toThrow("narrative_unit.dependency_text_pack_unknown:narrative.alpha/text.alpha");
    expect(() =>
      assertNarrativeUnitDependencyClosureV1(manifest, {
        ...available,
        assetIds: new Set(),
      })
    ).toThrow("narrative_unit.dependency_asset_unknown:narrative.alpha/asset.alpha");
  });

  it("rejects malformed trusted declarations in one ordinary normalization pass", () => {
    const valid = descriptorV1({
      unitId: "narrative.alpha",
      entryNodeIds: ["node.alpha.entry"],
    });
    expect(() => defineNarrativeUnitManifestV1({ revision: 0, units: [valid] })).toThrow(
      "narrative_unit.manifest_invalid:revision",
    );
    expect(defineNarrativeUnitManifestV1<TestPlanV1>({ revision: 1, units: [] }).units).toEqual([]);
    expect(() =>
      defineNarrativeUnitManifestV1({
        revision: 1,
        units: [{ ...valid, unitId: "not valid" }],
      })
    ).toThrow("narrative_unit.manifest_invalid:units/0/unitId");
    expect(() =>
      defineNarrativeUnitManifestV1({
        revision: 1,
        units: [{ ...valid, entryNodeIds: [] }],
      })
    ).toThrow("narrative_unit.manifest_invalid:narrative.alpha/entryNodeIds");
    expect(() =>
      defineNarrativeUnitManifestV1({
        revision: 1,
        units: [{ ...valid, source: "   " }],
      })
    ).toThrow("narrative_unit.manifest_invalid:narrative.alpha/source");
    expect(() =>
      defineNarrativeUnitManifestV1({
        revision: 1,
        units: [{ ...valid, load: null as never }],
      })
    ).toThrow("narrative_unit.manifest_invalid:narrative.alpha/load");
    expect(() =>
      defineNarrativeUnitManifestV1({
        revision: 1,
        units: [{ ...valid, dependencies: "invalid" as never }],
      })
    ).toThrow("narrative_unit.manifest_invalid:narrative.alpha/dependencies");
  });
});

describe("narrative unit session", () => {
  it("single-flights loading and binds independent leases to last-release residency", async () => {
    const pending = deferredV1<LoadedNarrativeUnitV1<TestPlanV1>>();
    const load = vi.fn(() => pending.promise);
    const manifest = defineNarrativeUnitManifestV1({
      revision: 1,
      units: [descriptorV1({
        unitId: "narrative.alpha",
        entryNodeIds: ["node.alpha.entry"],
        load,
      })],
    });
    const session = createNarrativeUnitSessionV1({ manifest });

    const first = session.acquire("narrative.alpha");
    const second = session.acquire("narrative.alpha");
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    const loaded = loadedUnitV1("narrative.alpha", "node.alpha.entry");
    pending.resolve(loaded);

    const [firstLease, secondLease] = await Promise.all([first, second]);
    expect(firstLease).not.toBe(secondLease);
    expect(firstLease.plan).toBe(loaded.plan);
    expect(secondLease.plan).toBe(loaded.plan);
    expect(firstLease.generation).toBe(manifest.digest);
    expect(firstLease.timing).toEqual({
      loadMs: expect.any(Number),
      admitMs: expect.any(Number),
      activateMs: expect.any(Number),
      totalMs: expect.any(Number),
    });
    expect(session.getResident("narrative.alpha")?.plan).toBe(loaded.plan);

    firstLease.release();
    firstLease.release();
    expect(session.getResident("narrative.alpha")?.plan).toBe(loaded.plan);
    secondLease.release();
    secondLease.release();
    expect(session.getResident("narrative.alpha")).toBeNull();
  });

  it("retries a failed flight and rejects unknown IDs before calling a loader", async () => {
    const failure = new Error("transient load failure");
    const load = vi.fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(loadedUnitV1("narrative.alpha", "node.alpha.entry"));
    const manifest = defineNarrativeUnitManifestV1({
      revision: 1,
      units: [descriptorV1({
        unitId: "narrative.alpha",
        entryNodeIds: ["node.alpha.entry"],
        load,
      })],
    });
    const session = createNarrativeUnitSessionV1({ manifest });

    await expect(session.acquire("narrative.unknown")).rejects.toThrow(
      "narrative_unit.unit_unknown:narrative.unknown",
    );
    expect(load).not.toHaveBeenCalled();
    await expect(session.acquire("narrative.alpha")).rejects.toBe(failure);
    const retry = await session.acquire("narrative.alpha");
    expect(load).toHaveBeenCalledTimes(2);
    expect(retry.plan).toEqual({ label: "narrative.alpha" });
    retry.release();
  });

  it("admits graph identity, exported entries, reference sources, and lint once", async () => {
    const sessionFor = (
      alpha: DefineNarrativeUnitDescriptorV1<TestPlanV1>,
      beta?: DefineNarrativeUnitDescriptorV1<TestPlanV1>,
    ) =>
      createNarrativeUnitSessionV1({
        manifest: defineNarrativeUnitManifestV1({
          revision: 1,
          units: beta === undefined ? [alpha] : [alpha, beta],
        }),
      });

    const wrongIdentity = sessionFor(descriptorV1({
      unitId: "narrative.alpha",
      entryNodeIds: ["node.alpha.entry"],
      load: async () => loadedUnitV1("narrative.other", "node.alpha.entry"),
    }));
    await expect(wrongIdentity.acquire("narrative.alpha")).rejects.toThrow(
      "narrative_unit.loaded_identity_mismatch:narrative.alpha",
    );

    const entryNotExported = sessionFor(descriptorV1({
      unitId: "narrative.alpha",
      entryNodeIds: ["node.alpha.exported"],
      load: async () => ({
        unitId: "narrative.alpha",
        graph: parseNarrativeGraphV1({
          entryNodeId: "node.alpha.actual",
          nodes: [{
            ...loadedUnitV1("narrative.alpha", "node.alpha.actual").graph.nodes[0]!,
            successors: ["node.alpha.exported"],
            kind: "pure",
          }, loadedUnitV1("narrative.alpha", "node.alpha.exported").graph.nodes[0]!],
        }),
        plan: { label: "entry-not-exported" },
      }),
    }));
    await expect(entryNotExported.acquire("narrative.alpha")).rejects.toThrow(
      "narrative_unit.graph_entry_not_exported:narrative.alpha/node.alpha.actual",
    );

    const missingEntry = sessionFor(descriptorV1({
      unitId: "narrative.alpha",
      entryNodeIds: ["node.alpha.entry", "node.alpha.missing"],
      load: async () => loadedUnitV1("narrative.alpha", "node.alpha.entry"),
    }));
    await expect(missingEntry.acquire("narrative.alpha")).rejects.toThrow(
      "narrative_unit.entry_missing:narrative.alpha/node.alpha.missing",
    );

    const missingReferenceSource = sessionFor(
      descriptorV1({
        unitId: "narrative.alpha",
        entryNodeIds: ["node.alpha.entry"],
        externalReferences: [{
          fromNodeId: "node.alpha.missing",
          kind: "successor",
          target: { unitId: "narrative.beta", nodeId: "node.beta.entry" },
        }],
      }),
      descriptorV1({ unitId: "narrative.beta", entryNodeIds: ["node.beta.entry"] }),
    );
    await expect(missingReferenceSource.acquire("narrative.alpha")).rejects.toThrow(
      "narrative_unit.reference_source_missing:narrative.alpha/node.alpha.missing",
    );

    const lintFailure = sessionFor(descriptorV1({
      unitId: "narrative.alpha",
      entryNodeIds: ["node.alpha.entry"],
      load: async () => ({
        unitId: "narrative.alpha",
        graph: parseNarrativeGraphV1({
          entryNodeId: "node.alpha.entry",
          nodes: [{
            ...loadedUnitV1("narrative.alpha", "node.alpha.entry").graph.nodes[0]!,
            kind: "pure",
            successors: ["node.alpha.missing"],
          }],
        }),
        plan: { label: "lint-failure" },
      }),
    }));
    await expect(lintFailure.acquire("narrative.alpha")).rejects.toThrow(
      "narrative_unit.graph_lint_failed:narrative.alpha/narrative.successor_missing",
    );
  });

  it("acquires any existing position node and releases a missing-position attempt", async () => {
    const load = vi.fn(async () => ({
      unitId: "narrative.alpha",
      graph: parseNarrativeGraphV1({
        entryNodeId: "node.alpha.entry",
        nodes: [{
          ...loadedUnitV1("narrative.alpha", "node.alpha.entry").graph.nodes[0]!,
          kind: "pure",
          successors: ["node.alpha.detail"],
        }, loadedUnitV1("narrative.alpha", "node.alpha.detail").graph.nodes[0]!],
      }),
      plan: { label: "addressable-plan" },
    }));
    const manifest = defineNarrativeUnitManifestV1({
      revision: 1,
      units: [descriptorV1({
        unitId: "narrative.alpha",
        entryNodeIds: ["node.alpha.entry"],
        load,
      })],
    });
    const session = createNarrativeUnitSessionV1({ manifest });

    const detail = await session.acquirePosition(
      positionV1("narrative.alpha", "node.alpha.detail"),
    );
    expect(detail.plan).toEqual({ label: "addressable-plan" });
    detail.release();
    expect(session.getResident("narrative.alpha")).toBeNull();

    await expect(
      session.acquirePosition(positionV1("narrative.alpha", "node.alpha.missing")),
    ).rejects.toThrow(
      "narrative_unit.position_node_missing:narrative.alpha/node.alpha.missing",
    );
    expect(load).toHaveBeenCalledTimes(2);
    expect(session.getResident("narrative.alpha")).toBeNull();
  });

  it("fences a late load after generation disposal and drops active plans", async () => {
    const pending = deferredV1<LoadedNarrativeUnitV1<TestPlanV1>>();
    const load = vi.fn(() => pending.promise);
    const manifest = defineNarrativeUnitManifestV1({
      revision: 1,
      units: [descriptorV1({
        unitId: "narrative.alpha",
        entryNodeIds: ["node.alpha.entry"],
        load,
      })],
    });
    const staleSession = createNarrativeUnitSessionV1({ manifest });
    const acquire = staleSession.acquire("narrative.alpha");
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    staleSession.dispose();
    pending.resolve(loadedUnitV1("narrative.alpha", "node.alpha.entry"));
    await expect(acquire).rejects.toThrow(
      "narrative_unit.session_stale:narrative.alpha",
    );
    expect(staleSession.getResident("narrative.alpha")).toBeNull();
    await expect(staleSession.acquire("narrative.alpha")).rejects.toThrow(
      "narrative_unit.session_stale:narrative.alpha",
    );
    expect(load).toHaveBeenCalledOnce();

    const activeSession = createNarrativeUnitSessionV1({
      manifest: defineNarrativeUnitManifestV1({
        revision: 2,
        units: [descriptorV1({
          unitId: "narrative.alpha",
          entryNodeIds: ["node.alpha.entry"],
          load: async () => loadedUnitV1("narrative.alpha", "node.alpha.entry"),
        })],
      }),
    });
    const lease = await activeSession.acquire("narrative.alpha");
    activeSession.dispose();
    activeSession.dispose();
    lease.release();
    lease.release();
    expect(activeSession.getResident("narrative.alpha")).toBeNull();
  });
});

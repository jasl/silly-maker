// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import {
  defineCodeSurfaceCatalogV1,
  defineCodeSurfaceV1,
  type CodeSurfaceCatalogV1,
} from "./code-surface.tsx";
import {
  createGuiCompositionUnitSessionInternalV1,
  defineGuiCompositionUnitManifestInternalV1,
  type DefineGuiCompositionUnitDescriptorInternalV1,
  GuiCompositionUnitErrorInternalV1,
} from "./gui-composition-units.ts";

interface TestContextV1 {
  readonly dispatch: (action: string) => void;
}

const encoder = new TextEncoder();

function compositionBytesV1(compositionId: string): Uint8Array {
  return encoder.encode(JSON.stringify({
    format: "sillymaker.gui-composition",
    version: 1,
    compositionId,
    root: {
      nodeId: "node.test.root",
      viewId: "view.test.root",
      props: {},
      slots: {},
    },
  }));
}

function catalogV1(): CodeSurfaceCatalogV1<TestContextV1> {
  return defineCodeSurfaceCatalogV1([
    defineCodeSurfaceV1({
      viewId: "view.test.root",
      slotIds: [],
      admitProps: () => ({}),
      load: async () => ({ default: () => null }),
      authoring: {
        label: "Test root",
        properties: [],
        preview: "opaque",
        stateOwner: "react_local",
      },
      policy: { input: "application", nativeText: "allowed", portal: "none" },
    }),
  ]);
}

function descriptorV1(input: {
  readonly compositionId: string;
  readonly runtimePath?: string;
  readonly source?: string;
  readonly loadCatalog?: () => Promise<CodeSurfaceCatalogV1<TestContextV1>>;
}): DefineGuiCompositionUnitDescriptorInternalV1<TestContextV1> {
  return {
    compositionId: input.compositionId,
    runtimePath: input.runtimePath ?? `assets/gui/${input.compositionId}.json`,
    source: input.source ?? `src/gui/${input.compositionId}.gui-composition.json`,
    loadCatalog: input.loadCatalog ?? (async () => catalogV1()),
  };
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

describe("GUI composition runtime units", () => {
  it("normalizes sorted address topology without loading or hashing source/code", () => {
    const alphaLoad = vi.fn(async () => catalogV1());
    const betaLoad = vi.fn(async () => catalogV1());
    const alpha = descriptorV1({ compositionId: "gui.test.alpha", loadCatalog: alphaLoad });
    const beta = descriptorV1({ compositionId: "gui.test.beta", loadCatalog: betaLoad });
    const manifest = defineGuiCompositionUnitManifestInternalV1({
      revision: 1,
      compositions: [beta, alpha],
    });
    const sameTopology = defineGuiCompositionUnitManifestInternalV1({
      revision: 1,
      compositions: [
        descriptorV1({
          compositionId: "gui.test.alpha",
          source: "moved/alpha.json",
          loadCatalog: async () => catalogV1(),
        }),
        descriptorV1({
          compositionId: "gui.test.beta",
          source: "moved/beta.json",
          loadCatalog: async () => catalogV1(),
        }),
      ],
    });

    expect(alphaLoad).not.toHaveBeenCalled();
    expect(betaLoad).not.toHaveBeenCalled();
    expect(manifest.compositions.map((entry) => entry.compositionId)).toEqual([
      "gui.test.alpha",
      "gui.test.beta",
    ]);
    expect(manifest.digest).toBe(sameTopology.digest);
    expect(
      defineGuiCompositionUnitManifestInternalV1({
        revision: 1,
        compositions: [
          descriptorV1({
            compositionId: "gui.test.alpha",
            runtimePath: "assets/gui/alternate-alpha.json",
          }),
        ],
      }).digest,
    ).not.toBe(
      defineGuiCompositionUnitManifestInternalV1({
        revision: 1,
        compositions: [alpha],
      }).digest,
    );
    expect(() =>
      defineGuiCompositionUnitManifestInternalV1({
        revision: 1,
        compositions: [alpha, { ...alpha }],
      })
    ).toThrow("gui_composition_unit.composition_duplicate:gui.test.alpha");
  });

  it("single-flights bytes and catalog loading into independent direct-plan leases", async () => {
    const bytes = deferredV1<Uint8Array>();
    const loadRuntimeBytes = vi.fn(() => bytes.promise);
    const loadCatalog = vi.fn(async () => catalogV1());
    const manifest = defineGuiCompositionUnitManifestInternalV1({
      revision: 1,
      compositions: [descriptorV1({
        compositionId: "gui.test.opening",
        loadCatalog,
      })],
    });
    const timestamps = [0, 5, 7, 9];
    const session = createGuiCompositionUnitSessionInternalV1({
      manifest,
      loadRuntimeBytes,
      now: () => timestamps.shift() ?? 9,
    });

    await expect(session.acquire("gui.test.unknown")).rejects.toEqual(
      new GuiCompositionUnitErrorInternalV1(
        "gui_composition_unit.composition_unknown",
        "gui.test.unknown",
      ),
    );
    const first = session.acquire("gui.test.opening");
    const second = session.acquire("gui.test.opening");
    await vi.waitFor(() => {
      expect(loadRuntimeBytes).toHaveBeenCalledOnce();
      expect(loadCatalog).toHaveBeenCalledOnce();
    });
    bytes.resolve(compositionBytesV1("gui.test.opening"));
    const [firstLease, secondLease] = await Promise.all([first, second]);

    expect(firstLease).not.toBe(secondLease);
    expect(firstLease.plan).toBe(secondLease.plan);
    expect(firstLease.plan.compositionId).toBe("gui.test.opening");
    expect(firstLease.generation).toBe(manifest.digest);
    expect(firstLease.timing).toEqual({
      loadMs: 5,
      admitMs: 2,
      activateMs: 2,
      totalMs: 9,
    });
    expect(session.getResident("gui.test.opening")?.plan).toBe(firstLease.plan);

    firstLease.release();
    firstLease.release();
    expect(session.getResident("gui.test.opening")?.plan).toBe(secondLease.plan);
    secondLease.release();
    secondLease.release();
    expect(session.getResident("gui.test.opening")).toBeNull();
  });

  it("rejects identity drift, leaves no resident plan, and retries the same address", async () => {
    const loadRuntimeBytes = vi.fn()
      .mockResolvedValueOnce(compositionBytesV1("gui.test.wrong"))
      .mockResolvedValueOnce(compositionBytesV1("gui.test.candidate"));
    const loadCatalog = vi.fn(async () => catalogV1());
    const manifest = defineGuiCompositionUnitManifestInternalV1({
      revision: 1,
      compositions: [descriptorV1({
        compositionId: "gui.test.candidate",
        loadCatalog,
      })],
    });
    const session = createGuiCompositionUnitSessionInternalV1({ manifest, loadRuntimeBytes });

    await expect(session.acquire("gui.test.candidate")).rejects.toEqual(
      new GuiCompositionUnitErrorInternalV1(
        "gui_composition_unit.composition_identity_mismatch",
        "gui.test.candidate",
      ),
    );
    expect(session.getResident("gui.test.candidate")).toBeNull();

    const lease = await session.acquire("gui.test.candidate");
    expect(loadRuntimeBytes).toHaveBeenCalledTimes(2);
    expect(loadCatalog).toHaveBeenCalledTimes(2);
    expect(lease.plan.compositionId).toBe("gui.test.candidate");
    lease.release();
  });

  it("drops resident plans on session disposal and fences later acquisition", async () => {
    const manifest = defineGuiCompositionUnitManifestInternalV1({
      revision: 1,
      compositions: [descriptorV1({ compositionId: "gui.test.opening" })],
    });
    const session = createGuiCompositionUnitSessionInternalV1({
      manifest,
      loadRuntimeBytes: async () => compositionBytesV1("gui.test.opening"),
    });
    const lease = await session.acquire("gui.test.opening");
    expect(session.getResident("gui.test.opening")?.plan).toBe(lease.plan);

    session.dispose();
    session.dispose();
    expect(session.getResident("gui.test.opening")).toBeNull();
    await expect(session.acquire("gui.test.opening")).rejects.toEqual(
      new GuiCompositionUnitErrorInternalV1(
        "gui_composition_unit.session_stale",
        "gui.test.opening",
      ),
    );
    lease.release();
  });
});

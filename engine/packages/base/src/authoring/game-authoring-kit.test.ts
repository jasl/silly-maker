// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { AuthoringDiagnosticErrorV1 } from "../contracts/diagnostic-envelope.ts";
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
} from "../contracts/gameplay-module.ts";
import type { RuntimeSchemaV1 } from "../contracts/values.ts";
import { parseNonNegativeSafeInteger } from "../contracts/values.ts";
import { createGameAuthoringKitV1 } from "./game-authoring-kit.ts";

interface KitTestStateV1 {
  readonly simulation: {
    readonly storage: { readonly items: number };
    readonly shop: { readonly sales: number };
  };
}

interface KitTestTypesV1 extends
  GameSimulationTypeMapV1<
    GameBootstrapInputV1,
    KitTestStateV1,
    { readonly cursor: number }
  > {
  readonly command: { readonly kind: "kit.test" };
  readonly fact: { readonly kind: "kit.fact" };
  readonly rejection: { readonly code: string };
}

interface StorageReadPortV1 {
  itemCount(): number;
}

function numberStateSchemaV1<TState>(keys: readonly string[]): RuntimeSchemaV1<TState> {
  return Object.freeze({
    parse(value: unknown): TState {
      if (value === null || typeof value !== "object") throw new TypeError("invalid state");
      for (const key of keys) {
        parseNonNegativeSafeInteger((value as Record<string, unknown>)[key]);
      }
      return Object.freeze({ ...(value as object) }) as TState;
    },
  });
}

const noopOwnerV1 = {
  operationSchema: Object.freeze({
    parse: (value: unknown) => Object.freeze({ ...(value as object) }),
  }),
  propose: () =>
    Object.freeze({
      kind: "proposed" as const,
      proposal: Object.freeze({ payload: Object.freeze({}), facts: Object.freeze([]) }),
    }),
  apply: (state: never) => state,
};

function diagnosticsOfV1(run: () => unknown) {
  try {
    run();
  } catch (error) {
    if (error instanceof AuthoringDiagnosticErrorV1) return error.diagnostics;
    throw error;
  }
  throw new Error("expected composition to throw");
}

function installControlledLocaleOrderV1(order: readonly string[]) {
  const ranks = new Map(order.map((value, index) => [value, index]));
  const comparisons: [string, string][] = [];
  const spy = vi.spyOn(String.prototype, "localeCompare").mockImplementation(function (
    this: string,
    right: string,
  ): number {
    comparisons.push([this, right]);
    const leftRank = ranks.get(this);
    const rightRank = ranks.get(right);
    if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank;
    return this < right ? -1 : this > right ? 1 : 0;
  });
  return { comparisons, spy };
}

function createFixtureV1() {
  const kit = createGameAuthoringKitV1<KitTestTypesV1>();
  const storageRead = kit.defineCapability<StorageReadPortV1>("capability.storage.read");
  const storage = kit.defineStatefulModule({
    id: "kit.storage",
    contractRevision: 1,
    state: {
      slot: "simulation.storage",
      schema: numberStateSchemaV1<{ readonly items: number }>(["items"]),
      initial: () => Object.freeze({ items: 2 }),
    },
    provides: (provide) => [
      provide(storageRead, ({ readOwnState }) => ({
        itemCount: () => readOwnState().items,
      })),
    ],
    owner: noopOwnerV1,
  });
  const shop = kit.defineStatefulModule({
    id: "kit.shop",
    contractRevision: 1,
    state: {
      slot: "simulation.shop",
      schema: numberStateSchemaV1<{ readonly sales: number }>(["sales"]),
      initial: () => Object.freeze({ sales: 0 }),
    },
    requires: { storage: storageRead },
    initializesAfter: ["kit.storage"],
    owner: noopOwnerV1,
  });
  return { kit, storageRead, storage, shop };
}

const kitTestStateV1: KitTestStateV1 = Object.freeze({
  simulation: Object.freeze({
    storage: Object.freeze({ items: 5 }),
    shop: Object.freeze({ sales: 1 }),
  }),
});

describe("createGameAuthoringKitV1", () => {
  it("composes modules and serves a real provider-built read port", () => {
    const { kit, storage, shop } = createFixtureV1();
    const composition = kit.composeModules([storage, shop]);

    expect(composition.modules).toHaveLength(2);
    expect(composition.modules[1].descriptor.dependencies).toEqual(["kit.storage"]);

    const ports = composition.createDependencyPortsFor(shop, kitTestStateV1);
    expect(ports.storage.itemCount()).toBe(5);
  });

  it("derives a proposal schema from the operation schema when omitted", () => {
    const { kit, storage, shop } = createFixtureV1();
    const composition = kit.composeModules([storage, shop]);
    const binding = composition.modules[0];
    expect(binding.bindingKind).toBe("stateful");
    if (binding.bindingKind !== "stateful") return;
    const proposal = binding.ownerProposalSchema.parse({ payload: {}, facts: [] });
    expect(proposal).toMatchObject({ facts: [] });
    expect(() => binding.ownerProposalSchema.parse({ payload: {} })).toThrowError(TypeError);
  });

  it("fails composition with a stable code for a missing provider", () => {
    const kit = createGameAuthoringKitV1<KitTestTypesV1>();
    const orphaned = kit.defineCapability<StorageReadPortV1>("capability.orphaned.read");
    const shop = kit.defineStatefulModule({
      id: "kit.shop",
      contractRevision: 1,
      state: {
        slot: "simulation.shop",
        schema: numberStateSchemaV1<{ readonly sales: number }>(["sales"]),
        initial: () => Object.freeze({ sales: 0 }),
      },
      requires: { storage: orphaned },
      owner: noopOwnerV1,
    });
    expect(diagnosticsOfV1(() => kit.composeModules([shop]))).toMatchObject([
      {
        code: "authoring.capability.missing_provider",
        subject: { kind: "capability", id: "capability.orphaned.read" },
        details: { consumer: "kit.shop", binding: "storage" },
      },
    ]);
  });

  it("fails composition with a stable code for duplicate providers", () => {
    const kit = createGameAuthoringKitV1<KitTestTypesV1>();
    const token = kit.defineCapability<StorageReadPortV1>("capability.storage.read");
    const provider = (id: string, slot: string) =>
      kit.defineStatefulModule({
        id,
        contractRevision: 1,
        state: {
          slot,
          schema: numberStateSchemaV1<{ readonly items: number }>(["items"]),
          initial: () => Object.freeze({ items: 0 }),
        },
        provides: (provide) => [
          provide(token, ({ readOwnState }) => ({ itemCount: () => readOwnState().items })),
        ],
        owner: noopOwnerV1,
      });
    expect(
      diagnosticsOfV1(() =>
        kit.composeModules([
          provider("kit.storage", "simulation.storage"),
          provider("kit.shop", "simulation.shop"),
        ])
      ),
    ).toMatchObject([{ code: "authoring.capability.duplicate_provider" }]);
  });

  it("fails composition with a stable code for a capability cycle", () => {
    const kit = createGameAuthoringKitV1<KitTestTypesV1>();
    const storageRead = kit.defineCapability<StorageReadPortV1>("capability.storage.read");
    const shopRead = kit.defineCapability<StorageReadPortV1>("capability.shop.read");
    const storage = kit.defineStatefulModule({
      id: "kit.storage",
      contractRevision: 1,
      state: {
        slot: "simulation.storage",
        schema: numberStateSchemaV1<{ readonly items: number }>(["items"]),
        initial: () => Object.freeze({ items: 0 }),
      },
      requires: { shop: shopRead },
      provides: (provide) => [
        provide(storageRead, ({ readOwnState }) => ({ itemCount: () => readOwnState().items })),
      ],
      owner: noopOwnerV1,
    });
    const shop = kit.defineStatefulModule({
      id: "kit.shop",
      contractRevision: 1,
      state: {
        slot: "simulation.shop",
        schema: numberStateSchemaV1<{ readonly sales: number }>(["sales"]),
        initial: () => Object.freeze({ sales: 0 }),
      },
      requires: { storage: storageRead },
      provides: (provide) => [
        provide(shopRead, ({ readOwnState }) => ({ itemCount: () => readOwnState().sales })),
      ],
      owner: noopOwnerV1,
    });
    const codes = diagnosticsOfV1(() => kit.composeModules([storage, shop])).map(
      (diagnostic) => diagnostic.code,
    );
    expect(codes).toContain("authoring.capability.dependency_cycle");
    expect(codes).not.toContain("authoring.lifecycle.dependency_cycle");
  });

  it("fails composition with a distinct stable code for a lifecycle cycle", () => {
    const kit = createGameAuthoringKitV1<KitTestTypesV1>();
    const moduleWith = (id: string, slot: string, after: string) =>
      kit.defineStatefulModule({
        id,
        contractRevision: 1,
        state: {
          slot,
          schema: numberStateSchemaV1<{ readonly items: number }>(["items"]),
          initial: () => Object.freeze({ items: 0 }),
        },
        initializesAfter: [after],
        owner: noopOwnerV1,
      });
    const codes = diagnosticsOfV1(() =>
      kit.composeModules([
        moduleWith("kit.storage", "simulation.storage", "kit.shop"),
        moduleWith("kit.shop", "simulation.shop", "kit.storage"),
      ])
    ).map((diagnostic) => diagnostic.code);
    expect(codes).toContain("authoring.lifecycle.dependency_cycle");
    expect(codes).not.toContain("authoring.capability.dependency_cycle");
  });

  it("characterizes locale-controlled graph traversal in the first cycle diagnostic", () => {
    const kit = createGameAuthoringKitV1<KitTestTypesV1>();
    const moduleWith = (id: string, slot: string, after: string) =>
      kit.defineStatefulModule({
        id,
        contractRevision: 1,
        state: {
          slot,
          schema: numberStateSchemaV1<{ readonly items: number }>(["items"]),
          initial: () => Object.freeze({ items: 0 }),
        },
        initializesAfter: [after],
        owner: noopOwnerV1,
      });
    const storage = moduleWith("kit.storage", "simulation.storage", "kit.shop");
    const shop = moduleWith("kit.shop", "simulation.shop", "kit.storage");
    const { comparisons, spy } = installControlledLocaleOrderV1([
      "kit.storage",
      "kit.shop",
    ]);

    try {
      const diagnostics = diagnosticsOfV1(() => kit.composeModules([shop, storage]));
      const lifecycle = diagnostics.find(
        (diagnostic) => diagnostic.code === "authoring.lifecycle.dependency_cycle",
      );
      expect(lifecycle).toMatchObject({
        message: "lifecycle dependency cycle at kit.storage",
        subject: { kind: "module", id: "kit.storage" },
      });
      expect(comparisons).toContainEqual(["kit.storage", "kit.shop"]);
    } finally {
      spy.mockRestore();
    }
  });

  it("characterizes locale-controlled dependency vector ordering", () => {
    const kit = createGameAuthoringKitV1<KitTestTypesV1>();
    const dashRead = kit.defineCapability<StorageReadPortV1>("capability.dash.read");
    const underscoreRead = kit.defineCapability<StorageReadPortV1>(
      "capability.underscore.read",
    );
    const provider = (
      id: string,
      slot: string,
      token: typeof dashRead,
    ) =>
      kit.defineStatefulModule({
        id,
        contractRevision: 1,
        state: {
          slot,
          schema: numberStateSchemaV1<{ readonly items: number }>(["items"]),
          initial: () => Object.freeze({ items: 0 }),
        },
        provides: (provide) => [
          provide(token, ({ readOwnState }) => ({ itemCount: () => readOwnState().items })),
        ],
        owner: noopOwnerV1,
      });
    const dash = provider("kit.a-1", "simulation.storage", dashRead);
    const underscore = provider("kit.a_1", "simulation.shop", underscoreRead);
    const consumer = kit.defineStatefulModule({
      id: "kit.consumer",
      contractRevision: 1,
      state: {
        slot: "simulation.consumer",
        schema: numberStateSchemaV1<{ readonly items: number }>(["items"]),
        initial: () => Object.freeze({ items: 0 }),
      },
      requires: { dash: dashRead, underscore: underscoreRead },
      owner: noopOwnerV1,
    });
    const { comparisons, spy } = installControlledLocaleOrderV1([
      "kit.a_1",
      "kit.a-1",
      "kit.consumer",
    ]);

    try {
      const composition = kit.composeModules([dash, underscore, consumer]);
      const binding = composition.modules.find(
        (module) => module.descriptor.id === "kit.consumer",
      );
      expect(binding?.descriptor.dependencies).toEqual(["kit.a_1", "kit.a-1"]);
      expect(comparisons).toContainEqual(["kit.a_1", "kit.a-1"]);
    } finally {
      spy.mockRestore();
    }
  });

  it("rejects undeclared token access with a stable code", () => {
    const { kit, storageRead, storage, shop } = createFixtureV1();
    const composition = kit.composeModules([storage, shop]);

    expect(composition.readCapability(shop, kitTestStateV1, storageRead).itemCount()).toBe(5);
    expect(
      diagnosticsOfV1(() => composition.readCapability(storage, kitTestStateV1, storageRead)),
    ).toMatchObject([
      {
        code: "authoring.capability.undeclared_access",
        subject: { kind: "capability", id: "capability.storage.read" },
        details: { consumer: "kit.storage" },
      },
    ]);
  });

  it("rejects duplicate capability token ids at definition time", () => {
    const kit = createGameAuthoringKitV1<KitTestTypesV1>();
    kit.defineCapability<StorageReadPortV1>("capability.storage.read");
    expect(
      diagnosticsOfV1(() => kit.defineCapability<StorageReadPortV1>("capability.storage.read")),
    ).toMatchObject([{ code: "authoring.capability.duplicate_token" }]);
  });

  it("reports unknown lifecycle references with a stable code", () => {
    const kit = createGameAuthoringKitV1<KitTestTypesV1>();
    const lonely = kit.defineStatefulModule({
      id: "kit.storage",
      contractRevision: 1,
      state: {
        slot: "simulation.storage",
        schema: numberStateSchemaV1<{ readonly items: number }>(["items"]),
        initial: () => Object.freeze({ items: 0 }),
      },
      initializesAfter: ["kit.absent"],
      owner: noopOwnerV1,
    });
    expect(diagnosticsOfV1(() => kit.composeModules([lonely]))).toMatchObject([
      { code: "authoring.lifecycle.unknown_module" },
    ]);
  });

  it("keeps the provider context to readOwnState only", () => {
    const kit = createGameAuthoringKitV1<KitTestTypesV1>();
    const token = kit.defineCapability<readonly string[]>("capability.storage.keys");
    const storage = kit.defineStatefulModule({
      id: "kit.storage",
      contractRevision: 1,
      state: {
        slot: "simulation.storage",
        schema: numberStateSchemaV1<{ readonly items: number }>(["items"]),
        initial: () => Object.freeze({ items: 0 }),
      },
      provides: (provide) => [provide(token, (context) => Object.keys(context))],
      owner: noopOwnerV1,
    });
    const shop = kit.defineStatefulModule({
      id: "kit.shop",
      contractRevision: 1,
      state: {
        slot: "simulation.shop",
        schema: numberStateSchemaV1<{ readonly sales: number }>(["sales"]),
        initial: () => Object.freeze({ sales: 0 }),
      },
      requires: { keys: token },
      owner: noopOwnerV1,
    });
    const composition = kit.composeModules([storage, shop]);
    expect(composition.createDependencyPortsFor(shop, kitTestStateV1).keys).toEqual([
      "readOwnState",
    ]);
  });
});

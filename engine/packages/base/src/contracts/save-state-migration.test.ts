// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { digestBytes } from "./digest.ts";
import {
  defineSaveStateMigrationRegistryV1,
  parseSaveStateMigrationIdV1,
  parseSaveStateMigrationNamespaceV1,
  parseSaveStateMigrationReasonCodeV1,
  readSaveStateMigrationRegistryInternalV1,
} from "./save-state-migration.ts";
import type {
  SaveStateContractIdentityV1,
  SaveStateMigrationReferenceChangesV1,
  SaveStateMigrationStepV1,
} from "./save-state-migration.ts";
import { parsePositiveSafeInteger } from "./values.ts";

const namespaceV1 = parseSaveStateMigrationNamespaceV1("state.synthetic.aggregate");
const emptyReferencesV1: SaveStateMigrationReferenceChangesV1 = Object.freeze({
  renames: Object.freeze([]),
  deletions: Object.freeze([]),
});

function identityV1(revision: number, label = String(revision)): SaveStateContractIdentityV1 {
  return {
    stateContractRevision: parsePositiveSafeInteger(revision),
    stateContractDigest: digestBytes(new TextEncoder().encode(`state-contract:${label}`)),
  };
}

function stepV1(
  from: SaveStateContractIdentityV1,
  to: SaveStateContractIdentityV1,
  label: string,
  migrate: SaveStateMigrationStepV1["migrate"] = (state) => ({
    kind: "migrated",
    state,
  }),
  references: SaveStateMigrationReferenceChangesV1 = emptyReferencesV1,
): SaveStateMigrationStepV1 {
  return {
    migrationId: parseSaveStateMigrationIdV1(`migration.synthetic.${label}`),
    namespace: namespaceV1,
    from,
    to,
    references,
    migrate,
  };
}

describe("Save State migration registry contracts", () => {
  it("normalizes empty, one-step, and two-step adjacent registries without executing callbacks", () => {
    const current = identityV1(3);
    const empty = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: current,
      current,
      steps: [],
    });
    expect(readSaveStateMigrationRegistryInternalV1(empty)).toMatchObject({
      namespace: namespaceV1,
      minimumSupported: current,
      current,
      steps: [],
    });

    const first = identityV1(1);
    const second = identityV1(2);
    const oneStepCallback = vi.fn(stepV1(first, second, "one").migrate);
    const oneStep = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: second,
      steps: [stepV1(first, second, "one", oneStepCallback)],
    });
    expect(readSaveStateMigrationRegistryInternalV1(oneStep).steps).toHaveLength(1);
    expect(oneStepCallback).not.toHaveBeenCalled();

    const firstCallback = vi.fn(stepV1(first, second, "first").migrate);
    const secondCallback = vi.fn(stepV1(second, current, "second").migrate);
    const twoStep = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current,
      steps: [
        stepV1(first, second, "first", firstCallback),
        stepV1(second, current, "second", secondCallback),
      ],
    });
    expect(readSaveStateMigrationRegistryInternalV1(twoStep).steps).toHaveLength(2);
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).not.toHaveBeenCalled();
  });

  it("retains only detached frozen metadata and the exact callback identities", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const migrate = vi.fn(stepV1(first, second, "copy").migrate);
    const renames = [
      {
        referenceSetId: "references.synthetic.scene",
        fromId: "scene.synthetic.old",
        toId: "scene.synthetic.current",
      },
    ];
    const deletions = [
      {
        referenceSetId: "references.synthetic.scene",
        id: "scene.synthetic.deleted",
        resolution: {
          kind: "fallback" as const,
          toId: "scene.synthetic.current",
        },
      },
    ];
    const steps = [stepV1(first, second, "copy", migrate, { renames, deletions })];
    const input = {
      namespace: namespaceV1,
      minimumSupported: first,
      current: second,
      steps,
    };

    const registry = defineSaveStateMigrationRegistryV1(input);
    const normalized = readSaveStateMigrationRegistryInternalV1(registry);
    renames[0]!.toId = "scene.synthetic.mutated";
    deletions[0]!.resolution.toId = "scene.synthetic.mutated";
    steps.length = 0;
    Reflect.set(first, "stateContractRevision", parsePositiveSafeInteger(9));

    expect(normalized.minimumSupported.stateContractRevision).toBe(1);
    expect(normalized.steps[0]?.migrate).toBe(migrate);
    expect(normalized.steps[0]?.references.renames[0]?.toId).toBe("scene.synthetic.current");
    expect(normalized.steps[0]?.references.deletions[0]?.resolution).toEqual({
      kind: "fallback",
      toId: "scene.synthetic.current",
    });
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(Object.isFrozen(normalized.current)).toBe(true);
    expect(Object.isFrozen(normalized.steps)).toBe(true);
    expect(Object.isFrozen(normalized.steps[0])).toBe(true);
    expect(Object.isFrozen(normalized.steps[0]?.from)).toBe(true);
    expect(Object.isFrozen(normalized.steps[0]?.to)).toBe(true);
    expect(Object.isFrozen(normalized.steps[0]?.references)).toBe(true);
    expect(Object.isFrozen(normalized.steps[0]?.references.renames)).toBe(true);
    expect(Object.isFrozen(normalized.steps[0]?.references.renames[0])).toBe(true);
    expect(Object.isFrozen(normalized.steps[0]?.references.deletions)).toBe(true);
    expect(Object.isFrozen(normalized.steps[0]?.references.deletions[0])).toBe(true);
    expect(Object.isFrozen(normalized.steps[0]?.references.deletions[0]?.resolution)).toBe(true);
    expect(migrate).not.toHaveBeenCalled();
  });

  it("requires official exact registry identity", () => {
    const current = identityV1(1);
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: current,
      current,
      steps: [],
    });

    expect(() => readSaveStateMigrationRegistryInternalV1({ ...registry })).toThrow(TypeError);
    expect(() =>
      readSaveStateMigrationRegistryInternalV1(
        Object.freeze(Object.create(registry)) as typeof registry,
      )
    ).toThrow(TypeError);
    expect(() => readSaveStateMigrationRegistryInternalV1({} as typeof registry)).toThrow(
      TypeError,
    );
  });

  it.each([
    ["skip", [stepV1(identityV1(1), identityV1(3), "skip")]],
    ["reverse", [stepV1(identityV1(2), identityV1(1), "reverse")]],
    [
      "gap",
      [
        stepV1(identityV1(1), identityV1(2), "gap-first"),
        stepV1(identityV1(3), identityV1(4), "gap-second"),
      ],
    ],
    [
      "digest discontinuity",
      [
        stepV1(identityV1(1), identityV1(2, "left"), "digest-first"),
        stepV1(identityV1(2, "right"), identityV1(3), "digest-second"),
      ],
    ],
    [
      "minimum identity mismatch",
      [stepV1(identityV1(1, "other-minimum"), identityV1(2), "minimum-mismatch")],
    ],
    [
      "current identity mismatch",
      [stepV1(identityV1(1), identityV1(2, "other-current"), "current-mismatch")],
    ],
    [
      "duplicate migration ID",
      [
        stepV1(identityV1(1), identityV1(2), "duplicate"),
        {
          ...stepV1(identityV1(2), identityV1(3), "other"),
          migrationId: parseSaveStateMigrationIdV1("migration.synthetic.duplicate"),
        },
      ],
    ],
    [
      "duplicate source identity",
      [
        stepV1(identityV1(1), identityV1(2), "source-first"),
        stepV1(identityV1(1), identityV1(3), "source-second"),
      ],
    ],
  ])("rejects a %s chain before any callback", (_label, steps) => {
    const callbacks = steps.map((step) => vi.spyOn(step, "migrate"));
    expect(() =>
      defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: identityV1(1),
        current: identityV1(steps.length + 1),
        steps,
      })
    ).toThrow(TypeError);
    for (const callback of callbacks) expect(callback).not.toHaveBeenCalled();
  });

  it("accepts exactly sixteen steps and rejects incomplete, unexpected, or longer chains", () => {
    expect(() =>
      defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: identityV1(1),
        current: identityV1(2),
        steps: [],
      })
    ).toThrow(TypeError);
    expect(() =>
      defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: identityV1(1),
        current: identityV1(1),
        steps: [stepV1(identityV1(1), identityV1(2), "unexpected")],
      })
    ).toThrow(TypeError);

    const identities = Array.from({ length: 18 }, (_unused, index) => identityV1(index + 1));
    const acceptedCallbacks = Array.from({ length: 16 }, () =>
      vi.fn((state) => ({
        kind: "migrated" as const,
        state,
      })));
    const acceptedSteps = Array.from(
      { length: 16 },
      (_unused, index) =>
        stepV1(
          identities[index]!,
          identities[index + 1]!,
          `accepted-limit-${index + 1}`,
          acceptedCallbacks[index],
        ),
    );
    const accepted = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: identities[0]!,
      current: identities[16]!,
      steps: acceptedSteps,
    });
    expect(readSaveStateMigrationRegistryInternalV1(accepted).steps).toHaveLength(16);
    for (const callback of acceptedCallbacks) expect(callback).not.toHaveBeenCalled();

    const steps = Array.from(
      { length: 17 },
      (_unused, index) => stepV1(identities[index]!, identities[index + 1]!, `limit-${index + 1}`),
    );
    expect(() =>
      defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: identities[0]!,
        current: identities.at(-1)!,
        steps,
      })
    ).toThrow(TypeError);
  });

  it("rejects unsafe revisions, a mismatched step namespace, and sparse step arrays", () => {
    for (const revision of [-0, 0, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        defineSaveStateMigrationRegistryV1({
          namespace: namespaceV1,
          minimumSupported: {
            stateContractRevision: revision,
            stateContractDigest: identityV1(1).stateContractDigest,
          } as never,
          current: identityV1(1),
          steps: [],
        })
      ).toThrow(TypeError);
    }

    const first = identityV1(1);
    const second = identityV1(2);
    expect(() =>
      defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: first,
        current: second,
        steps: [
          {
            ...stepV1(first, second, "namespace"),
            namespace: parseSaveStateMigrationNamespaceV1("state.synthetic.other"),
          },
        ],
      })
    ).toThrow(TypeError);

    const sparseSteps: SaveStateMigrationStepV1[] = [];
    sparseSteps.length = 1;
    expect(() =>
      defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: first,
        current: second,
        steps: sparseSteps,
      })
    ).toThrow(TypeError);
  });

  it("rejects malformed exact declarations without invoking accessors or callbacks", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const migrate = vi.fn(stepV1(first, second, "descriptor").migrate);
    const accessor = vi.fn(() => namespaceV1);
    const hostile = Object.defineProperty(
      {
        minimumSupported: first,
        current: second,
        steps: [stepV1(first, second, "descriptor", migrate)],
      },
      "namespace",
      { enumerable: true, get: accessor },
    );
    expect(() => defineSaveStateMigrationRegistryV1(hostile as never)).toThrow(TypeError);
    expect(accessor).not.toHaveBeenCalled();
    expect(migrate).not.toHaveBeenCalled();

    const proxyTrap = vi.fn(() => {
      throw new Error("hostile proxy trap");
    });
    expect(() =>
      defineSaveStateMigrationRegistryV1(
        new Proxy({}, { getPrototypeOf: proxyTrap }) as never,
      )
    ).toThrow(TypeError);
    expect(proxyTrap).toHaveBeenCalledTimes(1);

    const identityAccessor = vi.fn(() => parsePositiveSafeInteger(1));
    const identityWithAccessor = Object.defineProperty(
      { stateContractDigest: first.stateContractDigest },
      "stateContractRevision",
      { enumerable: true, get: identityAccessor },
    );
    expect(() =>
      defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: identityWithAccessor as never,
        current: second,
        steps: [],
      })
    ).toThrow(TypeError);
    expect(identityAccessor).not.toHaveBeenCalled();

    const stepAccessor = vi.fn(() => stepV1(first, second, "array-accessor"));
    const stepsWithAccessor: SaveStateMigrationStepV1[] = [];
    Object.defineProperty(stepsWithAccessor, "0", {
      enumerable: true,
      configurable: true,
      get: stepAccessor,
    });
    expect(() =>
      defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: first,
        current: second,
        steps: stepsWithAccessor,
      })
    ).toThrow(TypeError);
    expect(stepAccessor).not.toHaveBeenCalled();

    const resolutionKindAccessor = vi.fn(() => "fallback");
    const resolutionWithAccessor = Object.defineProperty(
      { toId: "scene.synthetic.current" },
      "kind",
      { enumerable: true, get: resolutionKindAccessor },
    );
    expect(() =>
      defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: first,
        current: second,
        steps: [
          stepV1(first, second, "resolution-accessor", undefined, {
            renames: [],
            deletions: [
              {
                referenceSetId: "references.synthetic.scene",
                id: "scene.synthetic.deleted",
                resolution: resolutionWithAccessor as never,
              },
            ],
          }),
        ],
      })
    ).toThrow(TypeError);
    expect(resolutionKindAccessor).not.toHaveBeenCalled();

    const nestedProxyTrap = vi.fn(() => {
      throw new Error("hostile nested proxy trap");
    });
    expect(() =>
      defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: first,
        current: second,
        steps: [
          stepV1(first, second, "nested-proxy", undefined, {
            renames: [new Proxy({}, { ownKeys: nestedProxyTrap }) as never],
            deletions: [],
          }),
        ],
      })
    ).toThrow(TypeError);
    expect(nestedProxyTrap).toHaveBeenCalledTimes(1);

    for (
      const declaration of [
        {
          namespace: namespaceV1,
          minimumSupported: first,
          current: second,
          steps: [],
          extra: true,
        },
        Object.assign(Object.create(null), {
          namespace: namespaceV1,
          minimumSupported: first,
          current: second,
          steps: [stepV1(first, second, "null-prototype")],
        }),
        Object.assign(
          {
            namespace: namespaceV1,
            minimumSupported: first,
            current: second,
            steps: [stepV1(first, second, "symbol")],
          },
          { [Symbol("extra")]: true },
        ),
      ]
    ) {
      expect(() => defineSaveStateMigrationRegistryV1(declaration as never)).toThrow(TypeError);
    }
  });

  it("captures each exact declaration key vector once", () => {
    const current = identityV1(1);
    const symbol = Symbol("configurable-extra");
    const target = {
      namespace: namespaceV1,
      minimumSupported: current,
      current,
      steps: [],
      [symbol]: true,
    };
    let ownKeysCalls = 0;
    const declaration = new Proxy(target, {
      ownKeys() {
        ownKeysCalls += 1;
        return ownKeysCalls === 1
          ? ["namespace", "minimumSupported", "current", "steps"]
          : Reflect.ownKeys(target);
      },
    });

    const registry = defineSaveStateMigrationRegistryV1(declaration as never);
    expect(readSaveStateMigrationRegistryInternalV1(registry).current).toEqual(current);
    expect(ownKeysCalls).toBe(1);

    const stepsSymbol = Symbol("configurable-array-extra");
    const stepsTarget = Object.assign([], { [stepsSymbol]: true });
    let stepOwnKeysCalls = 0;
    const steps = new Proxy(stepsTarget, {
      ownKeys() {
        stepOwnKeysCalls += 1;
        return stepOwnKeysCalls === 1 ? ["length"] : Reflect.ownKeys(stepsTarget);
      },
    });
    expect(() =>
      defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: current,
        current,
        steps,
      })
    ).not.toThrow();
    expect(stepOwnKeysCalls).toBe(1);
  });

  it("rejects a hostile oversized array-index spelling before reading an item descriptor", () => {
    const current = identityV1(1);
    const inspectedProperties: PropertyKey[] = [];
    const stepsTarget = [stepV1(current, identityV1(2), "unreachable")];
    const steps = new Proxy(stepsTarget, {
      ownKeys: () => ["length", "9".repeat(1_024)],
      getOwnPropertyDescriptor(target, property) {
        if (property !== "length") inspectedProperties.push(property);
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });

    expect(() =>
      defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: current,
        current: identityV1(2),
        steps,
      })
    ).toThrow(TypeError);
    expect(inspectedProperties).toEqual([]);
  });

  it("normalizes valid rename/deletion declarations and rejects conflicts or missing resolution", () => {
    const first = identityV1(1);
    const second = identityV1(2);
    const validReferences: SaveStateMigrationReferenceChangesV1 = {
      renames: [
        {
          referenceSetId: "references.synthetic.actor",
          fromId: "scene.synthetic.old",
          toId: "scene.synthetic.actor-current",
        },
        {
          referenceSetId: "references.synthetic.scene",
          fromId: "scene.synthetic.z-old",
          toId: "scene.synthetic.z-current",
        },
        {
          referenceSetId: "references.synthetic.scene",
          fromId: "scene.synthetic.old",
          toId: "scene.synthetic.current",
        },
      ],
      deletions: [
        {
          referenceSetId: "references.synthetic.scene",
          id: "scene.synthetic.z-removed",
          resolution: {
            kind: "reject",
            reasonCode: parseSaveStateMigrationReasonCodeV1("migration.deleted.z-scene"),
          },
        },
        {
          referenceSetId: "references.synthetic.actor",
          id: "scene.synthetic.removed-reject",
          resolution: {
            kind: "reject",
            reasonCode: parseSaveStateMigrationReasonCodeV1("migration.deleted.actor"),
          },
        },
        {
          referenceSetId: "references.synthetic.scene",
          id: "scene.synthetic.removed-fallback",
          resolution: { kind: "fallback", toId: "scene.synthetic.current" },
        },
        {
          referenceSetId: "references.synthetic.scene",
          id: "scene.synthetic.removed-reject",
          resolution: {
            kind: "reject",
            reasonCode: parseSaveStateMigrationReasonCodeV1("migration.deleted.scene"),
          },
        },
      ],
    };
    const valid = defineSaveStateMigrationRegistryV1({
      namespace: namespaceV1,
      minimumSupported: first,
      current: second,
      steps: [stepV1(first, second, "references", undefined, validReferences)],
    });
    expect(
      readSaveStateMigrationRegistryInternalV1(valid).steps[0]?.references.renames.map(
        ({ referenceSetId, fromId }) => [referenceSetId, fromId],
      ),
    ).toEqual([
      ["references.synthetic.actor", "scene.synthetic.old"],
      ["references.synthetic.scene", "scene.synthetic.old"],
      ["references.synthetic.scene", "scene.synthetic.z-old"],
    ]);
    expect(
      readSaveStateMigrationRegistryInternalV1(valid).steps[0]?.references.deletions.map(
        ({ referenceSetId, id }) => [referenceSetId, id],
      ),
    ).toEqual([
      ["references.synthetic.actor", "scene.synthetic.removed-reject"],
      ["references.synthetic.scene", "scene.synthetic.removed-fallback"],
      ["references.synthetic.scene", "scene.synthetic.removed-reject"],
      ["references.synthetic.scene", "scene.synthetic.z-removed"],
    ]);

    const invalidReferences = [
      {
        renames: [
          {
            referenceSetId: "references.synthetic.scene",
            fromId: "scene.synthetic.same",
            toId: "scene.synthetic.same",
          },
        ],
        deletions: [],
      },
      {
        renames: [
          {
            referenceSetId: "references.synthetic.scene",
            fromId: "scene.synthetic.old",
            toId: "scene.synthetic.current",
          },
        ],
        deletions: [
          {
            referenceSetId: "references.synthetic.scene",
            id: "scene.synthetic.old",
            resolution: { kind: "fallback", toId: "scene.synthetic.current" },
          },
        ],
      },
      {
        renames: [],
        deletions: [
          {
            referenceSetId: "references.synthetic.scene",
            id: "scene.synthetic.deleted",
            resolution: { kind: "missing" },
          },
        ],
      },
      {
        renames: [
          {
            referenceSetId: "references.synthetic.scene",
            fromId: "scene.synthetic.old",
            toId: "scene.synthetic.current",
          },
          {
            referenceSetId: "references.synthetic.scene",
            fromId: "scene.synthetic.old",
            toId: "scene.synthetic.other",
          },
        ],
        deletions: [],
      },
      {
        renames: [],
        deletions: [
          {
            referenceSetId: "references.synthetic.scene",
            id: "scene.synthetic.deleted",
            resolution: { kind: "fallback", toId: "scene.synthetic.current" },
          },
          {
            referenceSetId: "references.synthetic.scene",
            id: "scene.synthetic.deleted",
            resolution: { kind: "reject", reasonCode: "migration.deleted.scene" },
          },
        ],
      },
      {
        renames: [],
        deletions: [
          {
            referenceSetId: "references.synthetic.scene",
            id: "scene.synthetic.deleted",
            resolution: { kind: "fallback", toId: "scene.synthetic.deleted" },
          },
        ],
      },
      {
        renames: [
          {
            referenceSetId: "invalid reference set",
            fromId: "scene.synthetic.old",
            toId: "scene.synthetic.current",
          },
        ],
        deletions: [],
      },
    ];
    for (const references of invalidReferences) {
      expect(() =>
        defineSaveStateMigrationRegistryV1({
          namespace: namespaceV1,
          minimumSupported: first,
          current: second,
          steps: [stepV1(first, second, "invalid-references", undefined, references as never)],
        })
      ).toThrow(TypeError);
    }

    const sparseRenames: SaveStateMigrationReferenceChangesV1["renames"] = [];
    (sparseRenames as unknown[]).length = 0xffff_ffff;
    expect(() =>
      defineSaveStateMigrationRegistryV1({
        namespace: namespaceV1,
        minimumSupported: first,
        current: second,
        steps: [
          stepV1(first, second, "sparse-references", undefined, {
            renames: sparseRenames,
            deletions: [],
          }),
        ],
      })
    ).toThrow(TypeError);
  });

  it("brands only bounded stable namespace, migration, and reason identifiers", () => {
    expect(parseSaveStateMigrationNamespaceV1("state.synthetic.aggregate")).toBe(
      "state.synthetic.aggregate",
    );
    expect(parseSaveStateMigrationIdV1("migration.synthetic.1-to-2")).toBe(
      "migration.synthetic.1-to-2",
    );
    expect(parseSaveStateMigrationReasonCodeV1("migration.deleted.scene")).toBe(
      "migration.deleted.scene",
    );
    expect(parseSaveStateMigrationIdV1(`m${"a".repeat(127)}`)).toHaveLength(128);
    for (const value of ["", "UPPER.case", "space value", "a".repeat(129), "bad\ud800id"]) {
      expect(() => parseSaveStateMigrationNamespaceV1(value)).toThrow(TypeError);
      expect(() => parseSaveStateMigrationIdV1(value)).toThrow(TypeError);
      expect(() => parseSaveStateMigrationReasonCodeV1(value)).toThrow(TypeError);
    }
  });
});

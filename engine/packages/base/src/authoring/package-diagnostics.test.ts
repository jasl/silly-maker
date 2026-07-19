// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "../contracts/canonical-json.js";
import type { GamePackageV1, StoryDefinitionV1 } from "../contracts/game-package.js";
import { createSyntheticCounterGamePackageV1 } from "../testkit/synthetic-counter.js";
import { collectGamePackageDiagnosticsV1 } from "./package-diagnostics.js";

type SyntheticPackageV1 = ReturnType<typeof createSyntheticCounterGamePackageV1>;
type SyntheticDefinitionV1 = ReturnType<SyntheticPackageV1["define"]>;

function packageWithDefinitionV1(
  mutate: (definition: SyntheticDefinitionV1) => unknown,
): GamePackageV1<unknown, unknown> {
  const base = createSyntheticCounterGamePackageV1();
  const mutated = mutate(base.define()) as StoryDefinitionV1<unknown, unknown>;
  return Object.freeze({
    contractRevision: base.contractRevision,
    identity: base.identity,
    define: () => mutated,
  });
}

describe("collectGamePackageDiagnosticsV1", () => {
  it("returns valid for a resolvable package", () => {
    expect(collectGamePackageDiagnosticsV1(createSyntheticCounterGamePackageV1())).toEqual({
      kind: "valid",
    });
  });

  it("passes duplicate module IDs through as definition diagnostics with a subject", () => {
    const entry = packageWithDefinitionV1((definition) => ({
      ...definition,
      simulation: {
        ...definition.simulation,
        createGameSimulation: (program: never) => {
          const simulation = definition.simulation.createGameSimulation(program);
          return {
            ...simulation,
            modules: Object.freeze([simulation.modules[0], simulation.modules[0]]),
          };
        },
      },
    }));

    const result = collectGamePackageDiagnosticsV1(entry);
    expect(result).toMatchObject({
      kind: "invalid",
      diagnostics: [
        {
          code: "authoring.simulation.duplicate_module_id",
          phase: "definition",
          subject: { kind: "module", id: "synthetic.counter" },
        },
      ],
    });
  });

  it("keeps scene graph missing references on their own stable code and pointer", () => {
    const entry = packageWithDefinitionV1((definition) => ({
      ...definition,
      presentation: {
        ...definition.presentation,
        uiSceneGraph: {
          ...definition.presentation.uiSceneGraph,
          characters: definition.presentation.uiSceneGraph.characters.map((character) => ({
            ...character,
            defaultRigId: "character_rig.synthetic.missing",
          })),
        },
      },
    }));

    const result = collectGamePackageDiagnosticsV1(entry);
    expect(result).toMatchObject({
      kind: "invalid",
      diagnostics: [
        {
          code: "presentation.catalog.missing_reference",
          phase: "resolution",
          location: { jsonPointer: "/characters/0/defaultRigId" },
          subject: { kind: "reference", id: "character_rig.synthetic.missing" },
          details: { resolutionFailureCode: "story.presentation_invalid" },
        },
      ],
    });
  });

  it("reports unstructured failures under the resolution failure code", () => {
    const entry = Object.freeze({
      contractRevision: 1 as const,
      identity: Object.freeze({
        id: "story.synthetic-counter",
        revision: createSyntheticCounterGamePackageV1().identity.revision,
      }),
      define: () => {
        throw new Error("definition exploded");
      },
    });

    const result = collectGamePackageDiagnosticsV1(entry);
    expect(result).toMatchObject({
      kind: "invalid",
      diagnostics: [{ code: "story.define_threw", phase: "resolution" }],
    });
  });

  it("emits diagnostics that are themselves canonical JSON", () => {
    const entry = packageWithDefinitionV1((definition) => ({
      ...definition,
      simulation: { ...definition.simulation, narrativeProgram: undefined },
    }));
    const result = collectGamePackageDiagnosticsV1(entry);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      for (const diagnostic of result.diagnostics) {
        expect(() => canonicalJsonBytes(diagnostic)).not.toThrow();
      }
    }
  });
});

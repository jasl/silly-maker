// SPDX-License-Identifier: MIT
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { sillyMakerConfigV1 } from "../../project.config.ts";
import {
  collectAuthorityClosureV1,
  collectDeterminismAuthorityMapV1,
  determinismAuthorityPolicyV1,
  inspectConfiguredSaveProjectorV1,
  mergeAuthorityPathsV1,
} from "./authority-map.mts";
import type { DeterminismAuthorityPolicyV1 } from "./authority-map.mts";

const repositoryRootV1 = resolve(import.meta.dirname, "../..");
const liveRepositoryScanTimeoutV1 = 30_000;
const temporaryDirectoriesV1: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectoriesV1.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    ),
  );
});

function withApplicationsV1(
  applications: DeterminismAuthorityPolicyV1["applications"],
): DeterminismAuthorityPolicyV1 {
  return Object.freeze({
    ...determinismAuthorityPolicyV1,
    applications: Object.freeze([...applications]),
  });
}

describe("authoritative determinism authority map", () => {
  it("fails closed when live registry coverage is missing or stale", async () => {
    const policies = determinismAuthorityPolicyV1.applications;
    await expect(
      collectDeterminismAuthorityMapV1({
        repositoryRoot: repositoryRootV1,
        policy: withApplicationsV1(policies.slice(1)),
      }),
    ).rejects.toThrow(/missing authority policy/u);

    await expect(
      collectDeterminismAuthorityMapV1({
        repositoryRoot: repositoryRootV1,
        policy: withApplicationsV1([
          ...policies,
          Object.freeze({
            ...policies[0]!,
            applicationId: "stale-unregistered-application",
          }),
        ]),
      }),
    ).rejects.toThrow(/stale authority policy/u);

    await expect(
      collectDeterminismAuthorityMapV1({
        repositoryRoot: repositoryRootV1,
        policy: withApplicationsV1([...policies, policies[0]!]),
      }),
    ).rejects.toThrow(/duplicate authority policy/u);

    await expect(
      collectDeterminismAuthorityMapV1({
        repositoryRoot: repositoryRootV1,
        policy: Object.freeze({
          ...determinismAuthorityPolicyV1,
          negativeControls: Object.freeze([
            Object.freeze({
              ...determinismAuthorityPolicyV1.negativeControls[0]!,
              entry: "scripts/determinism/missing-negative-control.ts",
            }),
          ]),
        }),
      }),
    ).rejects.toThrow(/missing import: scripts\/determinism\/missing-negative-control\.ts/u);

    await expect(
      collectDeterminismAuthorityMapV1({
        repositoryRoot: repositoryRootV1,
        additionalAuthorities: Object.freeze([
          Object.freeze({
            id: "invalid-testkit-extension",
            entry: "engine/packages/base/src/testkit/fixed-bootstrap-entropy.ts",
          }),
        ]),
      }),
    ).rejects.toThrow(/includes test source/u);
  });

  it("fails closed when a bounded Base closure reaches a Base negative control", async () => {
    const baseAuthorities = determinismAuthorityPolicyV1.baseAuthorities.map((authority) =>
      authority.id === "save-projector-invocation"
        ? Object.freeze({ ...authority, projection: "bounded_closure" as const })
        : authority
    );

    await expect(
      collectDeterminismAuthorityMapV1({
        repositoryRoot: repositoryRootV1,
        policy: Object.freeze({
          ...determinismAuthorityPolicyV1,
          baseAuthorities: Object.freeze(baseAuthorities),
        }),
      }),
    ).rejects.toThrow(/bounded Base authority .* includes negative control/u);
  });

  it("fails closed when an authoritative entry is also a negative-control entry", async () => {
    const rngAuthority = determinismAuthorityPolicyV1.baseAuthorities.find(
      ({ id }) => id === "serializable-rng",
    );
    if (rngAuthority === undefined) throw new TypeError("serializable RNG authority missing");
    const negativeControls = determinismAuthorityPolicyV1.negativeControls.map((control, index) =>
      index === 0 ? Object.freeze({ ...control, entry: rngAuthority.entry }) : control
    );

    await expect(
      collectDeterminismAuthorityMapV1({
        repositoryRoot: repositoryRootV1,
        policy: Object.freeze({
          ...determinismAuthorityPolicyV1,
          negativeControls: Object.freeze(negativeControls),
        }),
      }),
    ).rejects.toThrow(/authority entry overlaps negative control .*contracts\/rng\.ts/u);
  });

  it(
    "fails closed when an authoritative closure transitively reaches any negative control",
    async () => {
      const negativeControls = determinismAuthorityPolicyV1.negativeControls.map(
        (control, index) =>
          index === 0
            ? Object.freeze({
              ...control,
              entry: "examples/cat-cafe/src/simulation.ts",
            })
            : control,
      );

      await expect(
        collectDeterminismAuthorityMapV1({
          repositoryRoot: repositoryRootV1,
          policy: Object.freeze({
            ...determinismAuthorityPolicyV1,
            negativeControls: Object.freeze(negativeControls),
          }),
        }),
      ).rejects.toThrow(
        /authoritative closure includes negative control .*cat-cafe\/src\/simulation\.ts/u,
      );
    },
    liveRepositoryScanTimeoutV1,
  );

  it("rejects a noncanonical negative-control entry spelling", async () => {
    const negativeControls = determinismAuthorityPolicyV1.negativeControls.map(
      (control, index) =>
        index === 0
          ? Object.freeze({
            ...control,
            entry: "./examples/cat-cafe/src/simulation.ts",
          })
          : control,
    );

    await expect(
      collectDeterminismAuthorityMapV1({
        repositoryRoot: repositoryRootV1,
        policy: Object.freeze({
          ...determinismAuthorityPolicyV1,
          negativeControls: Object.freeze(negativeControls),
        }),
      }),
    ).rejects.toThrow(/negative control .* entry is absent from its live closure/u);
  });

  it("recollects closure paths from live source instead of caching an inventory", async () => {
    const root = await mkdtemp(join(tmpdir(), "sillymaker-authority-map-"));
    temporaryDirectoriesV1.push(root);
    await writeFile(join(root, "alpha.ts"), "export const alpha = 1;\n");
    await writeFile(join(root, "beta.ts"), "export const beta = 2;\n");
    await writeFile(join(root, "entry.ts"), 'export { alpha } from "./alpha.ts";\n');

    const before = await collectAuthorityClosureV1(root, ["entry.ts"]);
    await writeFile(join(root, "entry.ts"), 'export { beta } from "./beta.ts";\n');
    const after = await collectAuthorityClosureV1(root, ["entry.ts"]);

    expect(before.paths).toEqual(["alpha.ts", "entry.ts"]);
    expect(after.paths).toEqual(["beta.ts", "entry.ts"]);
  });

  it("fails closure collection before source lint for a nonliteral ESM import", async () => {
    const root = await mkdtemp(join(tmpdir(), "sillymaker-authority-map-"));
    temporaryDirectoriesV1.push(root);
    await writeFile(
      join(root, "entry.ts"),
      'const suffix = "dependency.ts"; await import("./" + suffix);\n',
    );

    await expect(collectAuthorityClosureV1(root, ["entry.ts"]))
      .rejects.toThrow("entry.ts: dynamic import path is not static");
  });

  it("keeps managed-only cross-workspace paths in the authoritative union", () => {
    expect(
      mergeAuthorityPathsV1(
        ["example/src/simulation-definition.ts"],
        ["engine/packages/tooling/src/synthetic-managed-only.ts"],
      ),
    ).toEqual([
      "engine/packages/tooling/src/synthetic-managed-only.ts",
      "example/src/simulation-definition.ts",
    ]);
  });

  it("requires a dedicated Save projector owner bound to the configured callback", async () => {
    const definition = Object.freeze({
      module: "scripts/determinism/fixtures/synthetic-save-projector.ts",
      exportName: "syntheticSaveDefinitionV1",
    });
    await expect(
      inspectConfiguredSaveProjectorV1({
        repositoryRoot: repositoryRootV1,
        applicationId: "synthetic",
        applicationDirectory: "scripts/determinism/fixtures",
        definition,
      }),
    ).rejects.toThrow(/requires an explicit Save projector owner/u);

    const projector = await inspectConfiguredSaveProjectorV1({
      repositoryRoot: repositoryRootV1,
      applicationId: "synthetic",
      applicationDirectory: "scripts/determinism/fixtures",
      definition,
      owner: Object.freeze({
        module: "scripts/determinism/fixtures/synthetic-save-projector.ts",
        exportName: "syntheticSummarizeSaveV1",
      }),
    });
    expect(projector).toEqual(expect.objectContaining({
      entry: "scripts/determinism/fixtures/synthetic-save-projector.ts",
      exportName: "syntheticSummarizeSaveV1",
      callbackName: "summarizeSave",
      paths: ["scripts/determinism/fixtures/synthetic-save-projector.ts"],
    }));

    await expect(
      inspectConfiguredSaveProjectorV1({
        repositoryRoot: repositoryRootV1,
        applicationId: "synthetic",
        applicationDirectory: "scripts/determinism/fixtures",
        definition,
        owner: Object.freeze({
          module: "scripts/determinism/fixtures/synthetic-save-projector.ts",
          exportName: "mismatchedSyntheticSummarizeSaveV1",
        }),
      }),
    ).rejects.toThrow(/does not match configured summarizeSave/u);
  });

  it("maps every registered callback owner without absorbing Host or Presentation", async () => {
    const map = await collectDeterminismAuthorityMapV1({
      repositoryRoot: repositoryRootV1,
      additionalAuthorities: Object.freeze([
        Object.freeze({
          id: "synthetic-migration-extension",
          entry: "scripts/determinism/fixtures/synthetic-migration-authority.ts",
        }),
      ]),
    });

    expect(map.applications).toHaveLength(sillyMakerConfigV1.appDirectories.length);
    expect(map.applications.map(({ directory }) => directory)).toEqual(
      sillyMakerConfigV1.appDirectories,
    );
    for (const application of map.applications) {
      expect(application.managedSimulationRecords.length).toBeGreaterThan(0);
      expect(application.callbackOwner.entry).toBe(
        `${application.directory}/src/simulation-definition.ts`,
      );
      expect(application.callbackOwner.paths).toContain(application.callbackOwner.entry);
      expect(application.managedSimulationRecords.some(
        ({ path }) => path === application.callbackOwner.entry,
      )).toBe(true);
      expect(application.callbackOwner.paths.some((path) => path.endsWith("/simulation.ts")))
        .toBe(true);
      expect(application.callbackOwner.paths.some((path) => path.endsWith(".tsx"))).toBe(false);
      expect(application.callbackOwner.paths.some(
        (path) => path.startsWith("engine/packages/base/"),
      )).toBe(false);
      expect(application.callbackOwner.paths.some(
        (path) =>
          path.startsWith("engine/packages/ui/") ||
          /(?:^|\/)src\/presentation(?:\.ts|\/)/u.test(path),
      )).toBe(false);
      expect(application.callbackOwner.externalImports.some(
        ({ specifier }) => specifier === "react" || specifier.startsWith("react/"),
      )).toBe(false);
    }

    expect(map.applications.find(({ directory }) => directory === "template")?.dependencySource)
      .toBe("explicit_dependency_seed");
    expect(
      map.applications.filter(({ directory }) => directory !== "template").every(
        ({ dependencySource }) => dependencySource === "managed_build_identity",
      ),
    ).toBe(true);
    expect(map.saveProjectors).toEqual([]);
    expect(map.authoritativePaths).toEqual(expect.arrayContaining([
      "e2e/src/gameplay/narrative.ts",
      "engine/packages/base/src/authoring/define-game-simulation.ts",
      "engine/packages/base/src/authoring/define-game-package.ts",
      "engine/packages/base/src/authoring/define-gameplay-module.ts",
      "engine/packages/base/src/authoring/game-authoring-kit.ts",
      "engine/packages/base/src/authoring/patch-surface.ts",
      "engine/packages/base/src/authoring/runtime-schema.ts",
      "engine/packages/base/src/authoring/story-resolver.ts",
      "engine/packages/base/src/contracts/canonical-json.ts",
      "engine/packages/base/src/contracts/content-database.ts",
      "engine/packages/base/src/contracts/digest.ts",
      "engine/packages/base/src/contracts/event-pool.ts",
      "engine/packages/base/src/internal/canonical-bootstrap-admission.ts",
      "engine/packages/base/src/contracts/narrative-graph.ts",
      "engine/packages/base/src/contracts/media-audio.ts",
      "engine/packages/base/src/contracts/pending-interaction.ts",
      "engine/packages/base/src/contracts/presentation-data.ts",
      "engine/packages/base/src/contracts/rng.ts",
      "engine/packages/base/src/contracts/semantic-stage.ts",
      "engine/packages/base/src/contracts/semantic-stage-reducer.ts",
      "engine/packages/base/src/contracts/snapshot.ts",
      "engine/packages/base/src/contracts/values.ts",
      "engine/packages/base/src/runtime/diagnostics/command-log.ts",
      "engine/packages/base/src/runtime/diagnostics/debug-tools.ts",
      "engine/packages/base/src/runtime/diagnostics/privacy.ts",
      "engine/packages/base/src/runtime/diagnostics/replay.ts",
      "engine/packages/base/src/runtime/session/game-session.ts",
      "engine/packages/base/src/runtime/session/run-integrity.ts",
      "examples/cat-cafe/src/features/dev/debug-executor.ts",
    ]));
    const excludedBasePaths = [
      "engine/packages/base/src/index.ts",
      "engine/packages/base/src/runtime/index.ts",
      "engine/packages/base/src/contracts/presentation.ts",
      "engine/packages/base/src/contracts/presentation-canonical-json.ts",
      "engine/packages/base/src/contracts/presentation-ids.ts",
      "engine/packages/base/src/contracts/presentation-ports.ts",
      "engine/packages/base/src/contracts/host.ts",
      "engine/packages/base/src/contracts/version-stamp.ts",
      "engine/packages/base/src/runtime/persistence/player-profile-store.ts",
    ] as const;
    for (const path of excludedBasePaths) expect(map.authoritativePaths).not.toContain(path);
    expect(map.negativeControls.map(({ entry }) => entry)).toEqual(
      expect.arrayContaining(excludedBasePaths.slice(2)),
    );
    const excludedTransitiveBasePaths = [
      "engine/packages/base/src/contracts/application.ts",
      "engine/packages/base/src/contracts/asset-demand.ts",
      "engine/packages/base/src/contracts/content-maturity.ts",
      "engine/packages/base/src/contracts/diagnostics.ts",
      "engine/packages/base/src/contracts/persistence.ts",
      "engine/packages/base/src/contracts/text-catalog.ts",
    ] as const;
    for (const path of excludedTransitiveBasePaths) {
      expect(map.authoritativePaths).not.toContain(path);
    }
    const requiredBoundedBaseEntries = [
      "engine/packages/base/src/authoring/define-game-package.ts",
      "engine/packages/base/src/authoring/define-gameplay-module.ts",
      "engine/packages/base/src/authoring/patch-surface.ts",
      "engine/packages/base/src/authoring/runtime-schema.ts",
      "engine/packages/base/src/contracts/content-database.ts",
      "engine/packages/base/src/contracts/event-pool.ts",
      "engine/packages/base/src/internal/canonical-bootstrap-admission.ts",
      "engine/packages/base/src/contracts/media-audio.ts",
      "engine/packages/base/src/contracts/narrative-graph.ts",
      "engine/packages/base/src/contracts/narrative-history.ts",
      "engine/packages/base/src/contracts/pending-interaction.ts",
      "engine/packages/base/src/contracts/presentation-data.ts",
      "engine/packages/base/src/contracts/semantic-stage.ts",
      "engine/packages/base/src/contracts/semantic-stage-reducer.ts",
      "engine/packages/base/src/contracts/values.ts",
    ] as const;
    expect(
      map.baseAuthorities
        .filter(({ projection }) => projection === "bounded_closure")
        .map(({ entry }) => entry),
    ).toEqual(expect.arrayContaining([...requiredBoundedBaseEntries]));
    const requiredEntryOnlyBaseEntries = [
      "engine/packages/base/src/authoring/story-resolver.ts",
      "engine/packages/base/src/contracts/narrative-prediction.ts",
      "engine/packages/base/src/runtime/diagnostics/debug-bundle.ts",
      "engine/packages/base/src/runtime/diagnostics/debug-tools.ts",
      "engine/packages/base/src/runtime/diagnostics/privacy.ts",
    ] as const;
    expect(
      map.baseAuthorities
        .filter(({ projection }) => projection === "entry")
        .map(({ entry }) => entry),
    ).toEqual(expect.arrayContaining([...requiredEntryOnlyBaseEntries]));
    expect(map.baseAuthorities.some(
      ({ id, classification }) =>
        id === "save-projector-invocation" && classification === "durable_save_projection",
    )).toBe(true);
    expect(map.negativeControls.map(({ classification }) => classification)).toEqual(
      expect.arrayContaining([
        "host_entropy",
        "host_metadata_clock",
        "presentation",
        "presentation_clock",
        "version_stamp_ingress",
        "tooling_or_bench",
      ]),
    );
    expect(map.negativeControls.every(
      ({ entry }) => !map.authoritativePaths.includes(entry),
    )).toBe(true);
    expect(map.additionalAuthorities).toEqual([
      expect.objectContaining({
        id: "synthetic-migration-extension",
        classification: "test_extension",
        paths: expect.arrayContaining([
          "scripts/determinism/fixtures/synthetic-migration-authority.ts",
        ]),
      }),
    ]);
    expect(map.applications.every(
      ({ callbackOwner }) =>
        !callbackOwner.paths.includes(
          "scripts/determinism/fixtures/synthetic-migration-authority.ts",
        ),
    )).toBe(true);
    expect(map.baseAuthorities.every(
      ({ paths }) =>
        !paths.includes("scripts/determinism/fixtures/synthetic-migration-authority.ts"),
    )).toBe(true);
    expect(map.authoritativePaths).toContain(
      "scripts/determinism/fixtures/synthetic-migration-authority.ts",
    );

    expect(map.diagnostics).toMatchObject({
      applicationCount: sillyMakerConfigV1.appDirectories.length,
      saveProjectorCount: 0,
      additionalAuthorityCount: 1,
    });
    expect(map.diagnostics.authoritativePathCount).toBeGreaterThan(0);
    expect(map.diagnostics.managedSimulationRecordCount).toBeGreaterThan(0);
  });
});

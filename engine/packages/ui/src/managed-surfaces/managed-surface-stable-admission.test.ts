// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytes,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  type RuntimeSchemaV1,
} from "@sillymaker/base";
import { describe, expect, it } from "vitest";

import {
  parseManagedSurfaceDefinitionIdV1,
  parseManagedSurfaceLayerIdV1,
  parseManagedSurfaceOwnerIdV1,
  parseManagedSurfaceSlotIdV1,
  type ManagedSurfaceDefinitionIdV1,
  type ManagedSurfaceOwnerIdV1,
  type ManagedSurfaceResolvedDefinitionV1,
  type ManagedSurfaceResolvedSlotDescriptorV1,
  type ManagedSurfaceSlotIdV1,
} from "./managed-surface-contracts.ts";
import type {
  ManagedSurfaceStableAdmittedTargetInternalV1,
  ManagedSurfaceStableReconcileResultInternalV1,
  ManagedSurfaceStableSourceRevisionInternalV1,
} from "./managed-surface-stable-contract.ts";
import {
  createManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAcceptedBaselineInternalV1,
  type ManagedSurfaceStableAdmissionAuthorityInternalV1,
  type ManagedSurfaceStableAdmissionProposalInternalV1,
  type ManagedSurfaceStableAdmissionResultInternalV1,
  type ManagedSurfaceStableDefinitionSidecarInternalV1,
  type ManagedSurfaceStableReservationGenerationTokenInternalV1,
  type ManagedSurfaceStableRootReservationSnapshotInternalV1,
} from "./managed-surface-stable-admission.ts";
import {
  createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1,
  createManagedSurfaceStablePublisherLeaseRegistryInternalV1,
  type ManagedSurfaceStablePublisherInternalV1,
  type ManagedSurfaceStablePublisherLeaseRegistryInternalV1,
} from "./managed-surface-stable-publisher-lease.ts";

type AdmittedResultV1 = Extract<
  ManagedSurfaceStableAdmissionResultInternalV1,
  { readonly kind: "admitted" }
>;

const workspaceOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.workspace");
const narrativeOwnerIdV1 = parseManagedSurfaceOwnerIdV1("surface-owner.narrative");

const rootStackSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.root-stack");
const rootSingleSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.root-single");
const rootOtherSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.root-other");
const missingRootSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.root-missing");
const childStackSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.child-stack");
const childSingleSlotIdV1 = parseManagedSurfaceSlotIdV1("surface-slot.child-single");

const rootStackDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.workspace-root-stack",
);
const rootStackAlternateDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.workspace-root-stack-alt",
);
const rootSingleDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.workspace-root-single",
);
const rootOtherDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.workspace-root-other",
);
const rootMissingDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.workspace-root-missing",
);
const childStackDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.workspace-child-stack",
);
const childSingleDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.workspace-child-single",
);
const narrativeRootDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.narrative-root",
);
const unknownDefinitionIdV1 = parseManagedSurfaceDefinitionIdV1(
  "surface-definition.unknown",
);
const layerIdV1 = parseManagedSurfaceLayerIdV1("surface-layer.workspace");

const zeroDeltaV1 = Object.freeze({
  source: "unchanged" as const,
  runtime: "unchanged" as const,
  notificationCount: 0 as const,
  topology: "unchanged" as const,
  runtimeAllocation: "zero" as const,
});

const resolvedSlotDescriptorsV1 = Object.freeze(
  [
    Object.freeze({
      kind: "root" as const,
      slotId: rootStackSlotIdV1,
      cardinality: "stack" as const,
    }),
    Object.freeze({
      kind: "root" as const,
      slotId: rootSingleSlotIdV1,
      cardinality: "single" as const,
    }),
    Object.freeze({
      kind: "root" as const,
      slotId: rootOtherSlotIdV1,
      cardinality: "stack" as const,
    }),
    Object.freeze({
      kind: "child" as const,
      parentDefinitionId: rootStackDefinitionIdV1,
      slotId: childStackSlotIdV1,
      cardinality: "stack" as const,
    }),
    Object.freeze({
      kind: "child" as const,
      parentDefinitionId: rootStackDefinitionIdV1,
      slotId: childSingleSlotIdV1,
      cardinality: "single" as const,
    }),
  ] as const satisfies readonly ManagedSurfaceResolvedSlotDescriptorV1[],
);

function schemaV1(
  parse: (this: RuntimeSchemaV1<unknown>, value: unknown) => unknown = (value) => value,
): RuntimeSchemaV1<unknown> {
  return { parse };
}

function definitionV1(input: {
  readonly definitionId: ManagedSurfaceDefinitionIdV1;
  readonly ownerId?: ManagedSurfaceOwnerIdV1;
  readonly slotId: ManagedSurfaceSlotIdV1;
  readonly placement?: "root" | "child";
  readonly parameterSchema?: RuntimeSchemaV1<unknown> | undefined;
}): ManagedSurfaceStableDefinitionSidecarInternalV1 {
  const definition = Object.freeze({
    definitionId: input.definitionId,
    contractRevision: parsePositiveSafeInteger(1),
    ownerId: input.ownerId ?? workspaceOwnerIdV1,
    slotId: input.slotId,
    layerId: layerIdV1,
    layerOrder: parseNonNegativeSafeInteger(1),
    placement: input.placement ?? "root",
    modality: "blocking" as const,
    inputPolicy: Object.freeze({ kind: "none" as const }),
    dismissPolicy: Object.freeze({
      back: true,
      escape: true,
      backdrop: false,
      routedCancel: true,
    }),
    focusPolicy: Object.freeze({ kind: "none" as const }),
    navigationPolicy: Object.freeze({ kind: "close" as const }),
    actionIds: Object.freeze([]),
    readiness: Object.freeze({
      initialOpen: "blocking_fallback" as const,
      primaryReplacement: "retain_current" as const,
      childOpen: "blocking_fallback" as const,
    }),
  }) satisfies ManagedSurfaceResolvedDefinitionV1;
  return Object.freeze({
    definition,
    parameterSchema: input.parameterSchema ?? schemaV1(),
  });
}

function definitionSidecarsV1(
  schemaOverrides: ReadonlyMap<ManagedSurfaceDefinitionIdV1, RuntimeSchemaV1<unknown>> = new Map(),
): readonly ManagedSurfaceStableDefinitionSidecarInternalV1[] {
  const sidecar = (
    definitionId: ManagedSurfaceDefinitionIdV1,
    slotId: ManagedSurfaceSlotIdV1,
    options: {
      readonly ownerId?: ManagedSurfaceOwnerIdV1;
      readonly placement?: "root" | "child";
    } = {},
  ) =>
    definitionV1({
      definitionId,
      slotId,
      ...options,
      parameterSchema: schemaOverrides.get(definitionId),
    });
  return Object.freeze([
    sidecar(rootStackDefinitionIdV1, rootStackSlotIdV1),
    sidecar(rootStackAlternateDefinitionIdV1, rootStackSlotIdV1),
    sidecar(rootSingleDefinitionIdV1, rootSingleSlotIdV1),
    sidecar(rootOtherDefinitionIdV1, rootOtherSlotIdV1),
    sidecar(rootMissingDefinitionIdV1, missingRootSlotIdV1),
    sidecar(childStackDefinitionIdV1, childStackSlotIdV1, { placement: "child" }),
    sidecar(childSingleDefinitionIdV1, childSingleSlotIdV1, { placement: "child" }),
    sidecar(narrativeRootDefinitionIdV1, rootStackSlotIdV1, {
      ownerId: narrativeOwnerIdV1,
    }),
  ]);
}

function registryV1(): ManagedSurfaceStablePublisherLeaseRegistryInternalV1 {
  return createManagedSurfaceStablePublisherLeaseRegistryInternalV1({
    applicationEpoch: parseNonNegativeSafeInteger(31),
    resolvedOwnerIds: [workspaceOwnerIdV1, narrativeOwnerIdV1],
    leaseSequenceAllocator: createLocalManagedSurfaceStableLeaseSequenceAllocatorInternalV1(),
  });
}

interface StableAdmissionHarnessV1 {
  readonly registry: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly workspace: ManagedSurfaceStablePublisherInternalV1;
  readonly narrative: ManagedSurfaceStablePublisherInternalV1;
  readonly authority: ManagedSurfaceStableAdmissionAuthorityInternalV1;
  readonly baseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
  readonly reservationSnapshot: ManagedSurfaceStableRootReservationSnapshotInternalV1;
}

function harnessV1(input: {
  readonly registry?: ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
  readonly definitionSidecars?: readonly ManagedSurfaceStableDefinitionSidecarInternalV1[];
  readonly resolvedSlotDescriptors?: readonly ManagedSurfaceResolvedSlotDescriptorV1[];
} = {}): StableAdmissionHarnessV1 {
  const registry = input.registry ?? registryV1();
  const workspace = registry.issuePublisher(workspaceOwnerIdV1);
  const narrative = registry.issuePublisher(narrativeOwnerIdV1);
  const authority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
    publisherLeaseRegistry: registry,
    definitionSidecars: input.definitionSidecars ?? definitionSidecarsV1(),
    resolvedSlotDescriptors: input.resolvedSlotDescriptors ?? resolvedSlotDescriptorsV1,
  });
  const baseline = authority.createUnpublishedBaseline(workspace.lease);
  const generationToken = authority.createReservationGenerationToken();
  const reservationSnapshot = authority.createRootReservationSnapshot({
    subjectPublisherLease: workspace.lease,
    generationToken,
    foreignReservedRootSlotIds: [],
  });
  return { registry, workspace, narrative, authority, baseline, reservationSnapshot };
}

function targetV1(input: {
  readonly occurrenceId: string;
  readonly definitionId?: ManagedSurfaceDefinitionIdV1;
  readonly parentOccurrenceId?: string | null;
  readonly parameters?: unknown;
}) {
  return {
    occurrenceId: input.occurrenceId,
    definitionId: input.definitionId ?? rootStackDefinitionIdV1,
    parentOccurrenceId: input.parentOccurrenceId ?? null,
    parameters: Object.hasOwn(input, "parameters") ? input.parameters : null,
  };
}

function publicationV1(
  publisher: ManagedSurfaceStablePublisherInternalV1,
  sourceRevision: ManagedSurfaceStableSourceRevisionInternalV1,
  targets: unknown,
): unknown {
  return {
    publisherLease: publisher.lease,
    sourceRevision,
    targets,
  };
}

function evaluateV1(
  harness: StableAdmissionHarnessV1,
  publication: unknown,
  input: {
    readonly acceptedBaseline?: ManagedSurfaceStableAcceptedBaselineInternalV1;
    readonly reservationSnapshot?: ManagedSurfaceStableRootReservationSnapshotInternalV1;
  } = {},
): ManagedSurfaceStableAdmissionResultInternalV1 {
  return harness.authority.evaluate({
    publication,
    acceptedBaseline: input.acceptedBaseline ?? harness.baseline,
    reservationSnapshot: input.reservationSnapshot ?? harness.reservationSnapshot,
  });
}

function admittedV1(result: ManagedSurfaceStableAdmissionResultInternalV1): AdmittedResultV1 {
  expect(result.kind).toBe("admitted");
  if (result.kind !== "admitted") throw new Error(`expected admitted, got ${result.kind}`);
  return result;
}

function expectZeroResultV1(
  result: ManagedSurfaceStableAdmissionResultInternalV1,
  kind: "unchanged" | "stale" | "rejected" | "faulted",
  code: Extract<ManagedSurfaceStableReconcileResultInternalV1, { kind: typeof kind }>["code"],
): void {
  expect(result).toEqual({ kind, code, delta: zeroDeltaV1 });
  if (result.kind === "admitted") throw new Error("non-admitted result exposed a proposal");
  expect("proposal" in result).toBe(false);
}

describe("dormant managed stable vector admission", () => {
  it("keeps admission separate from runtime application", () => {
    const harness = harnessV1();
    expect(harness.baseline.kind).toBe("unpublished");
    const revision = harness.workspace.issueSourceRevision();
    const result = admittedV1(evaluateV1(harness, publicationV1(harness.workspace, revision, [])));
    expect(result.proposal.nextAcceptedBaseline.kind).toBe("accepted");
    expect(result).not.toHaveProperty("delta");
  });

  it("requires callable schemas and rejects duplicate catalog entries", () => {
    const sidecars = definitionSidecarsV1();
    expect(() =>
      harnessV1({
        definitionSidecars: definitionSidecarsV1(
          new Map([[rootStackDefinitionIdV1, { parse: null } as never]]),
        ),
      })
    ).toThrow(TypeError);
    expect(() =>
      harnessV1({
        definitionSidecars: Object.freeze([...sidecars, sidecars[0]!]),
      })
    ).toThrow(TypeError);
    expect(() =>
      harnessV1({
        resolvedSlotDescriptors: Object.freeze([
          ...resolvedSlotDescriptorsV1,
          resolvedSlotDescriptorsV1[0]!,
        ]),
      })
    ).toThrow(TypeError);
  });

  it("admits normalized identity with detached bytes and proposal provenance", () => {
    const rawParameters: { count?: number } = {};
    const parameterSchema = schemaV1((value) => ({
      count: (value as { count?: number }).count ?? 1,
    }));
    const harness = harnessV1({
      definitionSidecars: definitionSidecarsV1(
        new Map([[rootStackDefinitionIdV1, parameterSchema]]),
      ),
    });
    const occurrence = harness.workspace.issueOccurrence();
    const revision = harness.workspace.issueSourceRevision();
    const result = admittedV1(
      evaluateV1(
        harness,
        publicationV1(harness.workspace, revision, [
          targetV1({ occurrenceId: occurrence, parameters: rawParameters }),
        ]),
      ),
    );

    expect(result.proposal.relation).toBe("initial");
    expect(result.proposal.captured).toEqual({
      lease: harness.workspace.lease,
      acceptedBaseline: harness.baseline,
      reservationSnapshot: harness.reservationSnapshot,
    });
    expect(harness.authority.inspectAdmissionProposal(result.proposal)).toBe(result.proposal);
    const relationSplice = Object.freeze({
      ...result.proposal,
      relation: "greater_changed" as const,
    }) satisfies ManagedSurfaceStableAdmissionProposalInternalV1;
    const capturedSplice = Object.freeze({
      ...result.proposal,
      captured: Object.freeze({ ...result.proposal.captured }),
    }) satisfies ManagedSurfaceStableAdmissionProposalInternalV1;
    expect(harness.authority.inspectAdmissionProposal(relationSplice)).toBeNull();
    expect(harness.authority.inspectAdmissionProposal(capturedSplice)).toBeNull();
    const next = result.proposal.nextAcceptedBaseline;
    expect(next.kind).toBe("accepted");
    if (next.kind !== "accepted") throw new Error("expected accepted baseline");
    const nextBaselineSplice = Object.freeze({
      ...result.proposal,
      nextAcceptedBaseline: Object.freeze({ ...next }),
    }) as ManagedSurfaceStableAdmissionProposalInternalV1;
    expect(harness.authority.inspectAdmissionProposal(nextBaselineSplice)).toBeNull();
    expect(next.sourceRevision).toBe(revision);
    expect(next.ownerId).toBe(workspaceOwnerIdV1);
    expect(next.acceptedOccurrenceHighWater.occurrenceSequenceHighWater).toBe(1);
    const target = next.targets[0]!;
    expect(target.normalizedParameters).toEqual({ count: 1 });
    expect(target.canonicalParameterBytes.byteLength).toBe(
      canonicalJsonBytes({ count: 1 }).byteLength,
    );
    rawParameters.count = 99;
    expect(target.normalizedParameters).toEqual({ count: 1 });
  });

  it("inspects only exact same-factory admitted or retained targets without replacing proposal provenance", () => {
    const sidecars = definitionSidecarsV1();
    const expectedDefinition =
      sidecars.find((sidecar) => sidecar.definition.definitionId === rootStackDefinitionIdV1)!
        .definition;
    const harness = harnessV1({ definitionSidecars: sidecars });
    const occurrence = harness.workspace.issueOccurrence();
    const revision1 = harness.workspace.issueSourceRevision();
    const initial = admittedV1(
      evaluateV1(
        harness,
        publicationV1(harness.workspace, revision1, [
          targetV1({ occurrenceId: occurrence }),
        ]),
      ),
    );
    const initialBaseline = initial.proposal.nextAcceptedBaseline;
    const exactTarget = initialBaseline.targets[0]!;

    const capturedDefinition = harness.authority.inspectAdmittedTargetDefinition(exactTarget);
    expect(capturedDefinition).toEqual(expectedDefinition);

    const revision2 = harness.workspace.issueSourceRevision();
    const greaterSame = admittedV1(
      evaluateV1(
        harness,
        publicationV1(harness.workspace, revision2, [
          targetV1({ occurrenceId: occurrence }),
        ]),
        { acceptedBaseline: initialBaseline },
      ),
    );
    expect(greaterSame.proposal.relation).toBe("greater_same");
    const retainedTarget = greaterSame.proposal.nextAcceptedBaseline.targets[0]!;
    expect(retainedTarget).toBe(exactTarget);
    expect(harness.authority.inspectAdmittedTargetDefinition(retainedTarget)).toBe(
      capturedDefinition,
    );

    const clonedTarget = Object.freeze({
      ...exactTarget,
    }) satisfies ManagedSurfaceStableAdmittedTargetInternalV1;
    expect(harness.authority.inspectAdmittedTargetDefinition(clonedTarget)).toBeNull();

    const foreign = harnessV1();
    const foreignOccurrence = foreign.workspace.issueOccurrence();
    const foreignRevision = foreign.workspace.issueSourceRevision();
    const foreignTarget = admittedV1(
      evaluateV1(
        foreign,
        publicationV1(foreign.workspace, foreignRevision, [
          targetV1({ occurrenceId: foreignOccurrence }),
        ]),
      ),
    ).proposal.nextAcceptedBaseline.targets[0]!;
    expect(harness.authority.inspectAdmittedTargetDefinition(foreignTarget)).toBeNull();

    const matchingDefinitionHybrid = Object.freeze({
      ...foreignTarget,
      definitionId: exactTarget.definitionId,
      definitionContractRevision: exactTarget.definitionContractRevision,
    }) satisfies ManagedSurfaceStableAdmittedTargetInternalV1;
    expect(harness.authority.inspectAdmittedTargetDefinition(matchingDefinitionHybrid))
      .toBeNull();

    const proposalSplice = Object.freeze({
      ...initial.proposal,
      nextAcceptedBaseline: Object.freeze({
        ...initialBaseline,
        targets: Object.freeze([exactTarget]),
      }),
    }) as ManagedSurfaceStableAdmissionProposalInternalV1;
    expect(harness.authority.inspectAdmittedTargetDefinition(exactTarget)).toBe(
      capturedDefinition,
    );
    expect(harness.authority.inspectAdmissionProposal(proposalSplice)).toBeNull();
  });

  it("uses ordinary publication fields while preserving source and baseline precedence", () => {
    {
      const harness = harnessV1();
      const revision = harness.workspace.issueSourceRevision();
      const publication = Object.create(null) as Record<string, unknown>;
      publication.publisherLease = harness.workspace.lease;
      publication.sourceRevision = revision;
      publication.targets = [];
      expect(admittedV1(evaluateV1(harness, publication)).proposal.relation).toBe("initial");
    }

    {
      const harness = harnessV1();
      const revision = harness.workspace.issueSourceRevision();
      expect(
        admittedV1(evaluateV1(harness, {
          publisherLease: harness.workspace.lease,
          sourceRevision: revision,
          targets: [],
          extraDiagnostic: true,
        })).proposal.relation,
      ).toBe("initial");
    }

    {
      const harness = harnessV1();
      const revision = harness.workspace.issueSourceRevision();
      const clonedBaseline = Object.freeze({
        ...harness.baseline,
      }) as ManagedSurfaceStableAcceptedBaselineInternalV1;
      expectZeroResultV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision, []), {
          acceptedBaseline: clonedBaseline,
        }),
        "faulted",
        "surface.stable_admission_faulted",
      );
    }

    {
      const harness = harnessV1();
      const revision = harness.workspace.issueSourceRevision();
      const wrongLeaseBaseline = harness.authority.createUnpublishedBaseline(
        harness.narrative.lease,
      );
      expectZeroResultV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision, []), {
          acceptedBaseline: wrongLeaseBaseline,
        }),
        "faulted",
        "surface.stable_admission_faulted",
      );
    }

    {
      const harness = harnessV1();
      const revision = harness.workspace.issueSourceRevision();
      expect(harness.registry.disposePublisherLease(harness.workspace.lease)).toBe("disposed");
      expectZeroResultV1(
        evaluateV1(harness, {
          publisherLease: harness.workspace.lease,
          sourceRevision: "invalid-but-stale-wins",
          targets: [],
        }),
        "stale",
        "surface.stable_publisher_lease_stale",
      );
      expect(revision).toBe(1);
    }
  });

  it("rejects foreign factory baselines, reservations, and proposals on the same lease", () => {
    const harness = harnessV1();
    const foreignAuthority = createManagedSurfaceStableAdmissionAuthorityInternalV1({
      publisherLeaseRegistry: harness.registry,
      definitionSidecars: definitionSidecarsV1(),
      resolvedSlotDescriptors: resolvedSlotDescriptorsV1,
    });
    const foreignBaseline = foreignAuthority.createUnpublishedBaseline(harness.workspace.lease);
    const foreignReservation = foreignAuthority.createRootReservationSnapshot({
      subjectPublisherLease: harness.workspace.lease,
      generationToken: foreignAuthority.createReservationGenerationToken(),
      foreignReservedRootSlotIds: [],
    });
    const occurrence = harness.workspace.issueOccurrence();
    const revision = harness.workspace.issueSourceRevision();
    const publication = publicationV1(harness.workspace, revision, [
      targetV1({ occurrenceId: occurrence }),
    ]);

    expectZeroResultV1(
      evaluateV1(harness, publication, { acceptedBaseline: foreignBaseline }),
      "faulted",
      "surface.stable_admission_faulted",
    );
    expectZeroResultV1(
      evaluateV1(harness, publication, { reservationSnapshot: foreignReservation }),
      "faulted",
      "surface.stable_admission_faulted",
    );
    const foreignResult = admittedV1(foreignAuthority.evaluate({
      publication,
      acceptedBaseline: foreignBaseline,
      reservationSnapshot: foreignReservation,
    }));
    expect(harness.authority.inspectAdmissionProposal(foreignResult.proposal)).toBeNull();
    expect(foreignAuthority.inspectAdmissionProposal(foreignResult.proposal)).toBe(
      foreignResult.proposal,
    );
  });

  it("short-circuits lower revisions before targets, schema, canonical, and reservation", () => {
    let schemaCalls = 0;
    const harness = harnessV1({
      definitionSidecars: definitionSidecarsV1(
        new Map([[
          rootStackDefinitionIdV1,
          schemaV1((value) => {
            schemaCalls += 1;
            return value;
          }),
        ]]),
      ),
    });
    const occurrence = harness.workspace.issueOccurrence();
    const revision1 = harness.workspace.issueSourceRevision();
    const revision2 = harness.workspace.issueSourceRevision();
    const revision3 = harness.workspace.issueSourceRevision();
    const targets = [targetV1({ occurrenceId: occurrence, parameters: { value: 1 } })];
    const initial = admittedV1(
      evaluateV1(harness, publicationV1(harness.workspace, revision1, targets)),
    );
    const accepted3 = admittedV1(
      evaluateV1(harness, publicationV1(harness.workspace, revision3, targets), {
        acceptedBaseline: initial.proposal.nextAcceptedBaseline,
      }),
    ).proposal.nextAcceptedBaseline;
    schemaCalls = 0;
    const publisherSnapshot = harness.workspace.getSnapshot();
    const registrySnapshot = harness.registry.getSnapshot();
    expectZeroResultV1(
      evaluateV1(
        harness,
        publicationV1(harness.workspace, revision2, []),
        {
          acceptedBaseline: accepted3,
          reservationSnapshot: harness.reservationSnapshot,
        },
      ),
      "stale",
      "surface.stable_source_revision_stale",
    );
    expect(schemaCalls).toBe(0);
    expect(harness.workspace.getSnapshot()).toBe(publisherSnapshot);
    expect(harness.registry.getSnapshot()).toBe(registrySnapshot);
    expect(accepted3.sourceRevision).toBe(revision3);
  });

  it("enforces the 64 target bound and basic target value shape", () => {
    {
      let schemaCalls = 0;
      const harness = harnessV1({
        definitionSidecars: definitionSidecarsV1(
          new Map([[
            rootStackDefinitionIdV1,
            schemaV1((value) => {
              schemaCalls += 1;
              return value;
            }),
          ]]),
        ),
      });
      const targets = Array.from(
        { length: 64 },
        () => targetV1({ occurrenceId: harness.workspace.issueOccurrence() }),
      );
      const revision = harness.workspace.issueSourceRevision();
      const result = admittedV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision, targets)),
      );
      expect(result.proposal.nextAcceptedBaseline.targets).toHaveLength(64);
      expect(result.proposal.nextAcceptedBaseline.acceptedOccurrenceHighWater)
        .toMatchObject({ occurrenceSequenceHighWater: 64 });
      expect(schemaCalls).toBe(64);
    }

    {
      const harness = harnessV1();
      const targets = Array.from({ length: 65 });
      const revision = harness.workspace.issueSourceRevision();
      expectZeroResultV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision, targets)),
        "rejected",
        "surface.stable_target_limit_exceeded",
      );
    }

    const malformedTargets = [
      () => {
        const value: unknown[] = [];
        value.length = 1;
        return value;
      },
      () => [null],
      () => [{}],
      () => [{ ...targetV1({ occurrenceId: "unused" }), parentOccurrenceId: 42 }],
    ];
    for (const createTargets of malformedTargets) {
      const harness = harnessV1();
      const revision = harness.workspace.issueSourceRevision();
      expectZeroResultV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision, createTargets())),
        "rejected",
        "surface.stable_target_shape_invalid",
      );
    }
  });

  it("enforces R1 issuance, conservative gap burn, definition, and owner precedence", () => {
    {
      const harness = harnessV1();
      const revision = harness.workspace.issueSourceRevision();
      const future = "surface-stable-occurrence.e31.l1.n1";
      expectZeroResultV1(
        evaluateV1(
          harness,
          publicationV1(harness.workspace, revision, [
            targetV1({ occurrenceId: future }),
            targetV1({ occurrenceId: future }),
          ]),
        ),
        "rejected",
        "surface.stable_occurrence_duplicate",
      );
    }

    {
      const harness = harnessV1();
      const revision = harness.workspace.issueSourceRevision();
      expectZeroResultV1(
        evaluateV1(
          harness,
          publicationV1(harness.workspace, revision, [
            targetV1({ occurrenceId: "surface-stable-occurrence.e31.l1.n1" }),
          ]),
        ),
        "rejected",
        "surface.stable_occurrence_unissued",
      );
    }

    {
      const harness = harnessV1();
      const occurrence1 = harness.workspace.issueOccurrence();
      harness.workspace.issueOccurrence();
      const occurrence3 = harness.workspace.issueOccurrence();
      const revision1 = harness.workspace.issueSourceRevision();
      const initial = admittedV1(
        evaluateV1(
          harness,
          publicationV1(harness.workspace, revision1, [
            targetV1({ occurrenceId: occurrence3 }),
          ]),
        ),
      );
      const revision2 = harness.workspace.issueSourceRevision();
      expectZeroResultV1(
        evaluateV1(
          harness,
          publicationV1(harness.workspace, revision2, [
            targetV1({ occurrenceId: occurrence1 }),
          ]),
          { acceptedBaseline: initial.proposal.nextAcceptedBaseline },
        ),
        "rejected",
        "surface.stable_occurrence_reused",
      );
    }

    for (
      const [definitionId, code] of [
        [unknownDefinitionIdV1, "surface.stable_definition_missing"],
        [narrativeRootDefinitionIdV1, "surface.stable_definition_owner_mismatch"],
      ] as const
    ) {
      const harness = harnessV1();
      const occurrence = harness.workspace.issueOccurrence();
      const revision = harness.workspace.issueSourceRevision();
      expectZeroResultV1(
        evaluateV1(
          harness,
          publicationV1(harness.workspace, revision, [
            targetV1({ occurrenceId: occurrence, definitionId }),
          ]),
        ),
        "rejected",
        code,
      );
    }
  });

  it("faults malformed or impossible R1 occurrence classifications", () => {
    const malformedClassifications = [
      Object.freeze({ kind: "fresh", occurrenceSequence: 0 }),
      Object.freeze({ kind: "fresh", occurrenceSequence: 2 }),
      Object.freeze({ kind: "retained", occurrenceSequence: 1 }),
      Object.freeze({ kind: "unknown" }),
    ];

    for (const malformedClassification of malformedClassifications) {
      const registry = registryV1();
      const instrumentedRegistry = Object.freeze({
        ...registry,
        classifyOccurrenceAgainstAdmissionProof() {
          return malformedClassification as never;
        },
      }) satisfies ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
      const harness = harnessV1({ registry: instrumentedRegistry });
      const occurrence = harness.workspace.issueOccurrence();
      const revision = harness.workspace.issueSourceRevision();
      expectZeroResultV1(
        evaluateV1(
          harness,
          publicationV1(harness.workspace, revision, [targetV1({ occurrenceId: occurrence })]),
        ),
        "faulted",
        "surface.stable_admission_faulted",
      );
    }
    for (const impossibleKind of ["foreign", "unissued"] as const) {
      const registry = registryV1();
      let overrideRetained = false;
      const instrumentedRegistry = Object.freeze({
        ...registry,
        classifyOccurrenceAgainstAdmissionProof(
          ...args: Parameters<
            ManagedSurfaceStablePublisherLeaseRegistryInternalV1[
              "classifyOccurrenceAgainstAdmissionProof"
            ]
          >
        ) {
          return overrideRetained
            ? Object.freeze({ kind: impossibleKind })
            : registry.classifyOccurrenceAgainstAdmissionProof(...args);
        },
      }) satisfies ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
      const harness = harnessV1({ registry: instrumentedRegistry });
      const occurrence = harness.workspace.issueOccurrence();
      const revision1 = harness.workspace.issueSourceRevision();
      const accepted = admittedV1(
        evaluateV1(
          harness,
          publicationV1(harness.workspace, revision1, [targetV1({ occurrenceId: occurrence })]),
        ),
      ).proposal.nextAcceptedBaseline;
      overrideRetained = true;
      const revision2 = harness.workspace.issueSourceRevision();
      expectZeroResultV1(
        evaluateV1(
          harness,
          publicationV1(harness.workspace, revision2, [targetV1({ occurrenceId: occurrence })]),
          { acceptedBaseline: accepted },
        ),
        "faulted",
        "surface.stable_admission_faulted",
      );
    }
  });

  it("validates parent, slot, cardinality, and cycle-shaped order before parameters", () => {
    const cases = [
      {
        code: "surface.stable_root_parent_invalid" as const,
        createTargets(harness: StableAdmissionHarnessV1) {
          const occurrence = harness.workspace.issueOccurrence();
          return [targetV1({ occurrenceId: occurrence, parentOccurrenceId: occurrence })];
        },
      },
      {
        code: "surface.stable_parent_missing" as const,
        createTargets(harness: StableAdmissionHarnessV1) {
          return [targetV1({
            occurrenceId: harness.workspace.issueOccurrence(),
            definitionId: childStackDefinitionIdV1,
            parentOccurrenceId: "surface-stable-occurrence.e31.l1.n99",
          })];
        },
      },
      {
        code: "surface.stable_parent_order_invalid" as const,
        createTargets(harness: StableAdmissionHarnessV1) {
          const root = harness.workspace.issueOccurrence();
          const child = harness.workspace.issueOccurrence();
          return [
            targetV1({
              occurrenceId: child,
              definitionId: childStackDefinitionIdV1,
              parentOccurrenceId: root,
            }),
            targetV1({ occurrenceId: root }),
          ];
        },
      },
      {
        code: "surface.stable_slot_invalid" as const,
        createTargets(harness: StableAdmissionHarnessV1) {
          return [targetV1({
            occurrenceId: harness.workspace.issueOccurrence(),
            definitionId: rootMissingDefinitionIdV1,
          })];
        },
      },
      {
        code: "surface.stable_slot_occupied" as const,
        createTargets(harness: StableAdmissionHarnessV1) {
          return [
            targetV1({
              occurrenceId: harness.workspace.issueOccurrence(),
              definitionId: rootSingleDefinitionIdV1,
            }),
            targetV1({
              occurrenceId: harness.workspace.issueOccurrence(),
              definitionId: rootSingleDefinitionIdV1,
            }),
          ];
        },
      },
      {
        code: "surface.stable_parent_order_invalid" as const,
        createTargets(harness: StableAdmissionHarnessV1) {
          const first = harness.workspace.issueOccurrence();
          const second = harness.workspace.issueOccurrence();
          return [
            targetV1({
              occurrenceId: first,
              definitionId: childStackDefinitionIdV1,
              parentOccurrenceId: second,
            }),
            targetV1({
              occurrenceId: second,
              definitionId: childStackDefinitionIdV1,
              parentOccurrenceId: first,
            }),
          ];
        },
      },
    ];

    for (const current of cases) {
      const harness = harnessV1();
      const revision = harness.workspace.issueSourceRevision();
      expectZeroResultV1(
        evaluateV1(
          harness,
          publicationV1(harness.workspace, revision, current.createTargets(harness)),
        ),
        "rejected",
        current.code,
      );
    }
  });

  it("uses structurally-stable scope order while allowing insertion and cross-scope interleaving", () => {
    const harness = harnessV1();
    const first = harness.workspace.issueOccurrence();
    const second = harness.workspace.issueOccurrence();
    const otherScope = harness.workspace.issueOccurrence();
    const revision1 = harness.workspace.issueSourceRevision();
    const initial = admittedV1(
      evaluateV1(
        harness,
        publicationV1(harness.workspace, revision1, [
          targetV1({ occurrenceId: first }),
          targetV1({ occurrenceId: second }),
          targetV1({
            occurrenceId: otherScope,
            definitionId: rootOtherDefinitionIdV1,
          }),
        ]),
      ),
    ).proposal.nextAcceptedBaseline;
    expectZeroResultV1(
      evaluateV1(
        harness,
        publicationV1(harness.workspace, revision1, [
          targetV1({
            occurrenceId: otherScope,
            definitionId: rootOtherDefinitionIdV1,
          }),
          targetV1({ occurrenceId: first }),
          targetV1({ occurrenceId: second }),
        ]),
        { acceptedBaseline: initial },
      ),
      "unchanged",
      "surface.stable_publication_unchanged",
    );
    const revision2 = harness.workspace.issueSourceRevision();
    expectZeroResultV1(
      evaluateV1(
        harness,
        publicationV1(harness.workspace, revision2, [
          targetV1({ occurrenceId: second }),
          targetV1({ occurrenceId: first }),
          targetV1({
            occurrenceId: otherScope,
            definitionId: rootOtherDefinitionIdV1,
          }),
        ]),
        { acceptedBaseline: initial },
      ),
      "rejected",
      "surface.stable_order_invalid",
    );

    const inserted = harness.workspace.issueOccurrence();
    const revision3 = harness.workspace.issueSourceRevision();
    const changed = admittedV1(
      evaluateV1(
        harness,
        publicationV1(harness.workspace, revision3, [
          targetV1({
            occurrenceId: otherScope,
            definitionId: rootOtherDefinitionIdV1,
          }),
          targetV1({ occurrenceId: first }),
          targetV1({ occurrenceId: inserted }),
          targetV1({ occurrenceId: second }),
        ]),
        { acceptedBaseline: initial },
      ),
    );
    expect(changed.proposal.relation).toBe("greater_changed");
    const oldTargets = initial.targets;
    const nextTargets = changed.proposal.nextAcceptedBaseline.targets;
    for (const retained of [first, second, otherScope]) {
      expect(nextTargets.find((target) => target.occurrenceId === retained)).toBe(
        oldTargets.find((target) => target.occurrenceId === retained),
      );
    }

    const revision4 = harness.workspace.issueSourceRevision();
    const crossScopeSame = admittedV1(
      evaluateV1(
        harness,
        publicationV1(harness.workspace, revision4, [
          targetV1({
            occurrenceId: otherScope,
            definitionId: rootOtherDefinitionIdV1,
          }),
          targetV1({ occurrenceId: first }),
          targetV1({ occurrenceId: second }),
        ]),
        { acceptedBaseline: initial },
      ),
    );
    expect(crossScopeSame.proposal.relation).toBe("greater_same");
    expect(crossScopeSame.proposal.nextAcceptedBaseline.targets).toBe(initial.targets);

    const revision5 = harness.workspace.issueSourceRevision();
    expectZeroResultV1(
      evaluateV1(
        harness,
        publicationV1(harness.workspace, revision5, [
          targetV1({
            occurrenceId: first,
            definitionId: rootStackAlternateDefinitionIdV1,
          }),
          targetV1({ occurrenceId: second }),
          targetV1({
            occurrenceId: otherScope,
            definitionId: rootOtherDefinitionIdV1,
          }),
        ]),
        { acceptedBaseline: initial },
      ),
      "rejected",
      "surface.stable_occurrence_reused",
    );

    {
      const local = harnessV1();
      const drifted = local.workspace.issueOccurrence();
      const stableFirst = local.workspace.issueOccurrence();
      const stableSecond = local.workspace.issueOccurrence();
      const localRevision1 = local.workspace.issueSourceRevision();
      const localInitial = admittedV1(
        evaluateV1(
          local,
          publicationV1(local.workspace, localRevision1, [
            targetV1({ occurrenceId: drifted }),
            targetV1({ occurrenceId: stableFirst }),
            targetV1({ occurrenceId: stableSecond }),
          ]),
        ),
      ).proposal.nextAcceptedBaseline;
      const localRevision2 = local.workspace.issueSourceRevision();
      expectZeroResultV1(
        evaluateV1(
          local,
          publicationV1(local.workspace, localRevision2, [
            targetV1({
              occurrenceId: drifted,
              definitionId: rootStackAlternateDefinitionIdV1,
            }),
            targetV1({ occurrenceId: stableSecond }),
            targetV1({ occurrenceId: stableFirst }),
          ]),
          { acceptedBaseline: localInitial },
        ),
        "rejected",
        "surface.stable_order_invalid",
      );
    }
  });

  it("runs schema, bounded canonical projection, and retained bytes per target in raw order", () => {
    let firstCalls = 0;
    let secondCalls = 0;
    const firstSchema = schemaV1((value) => {
      firstCalls += 1;
      return value;
    });
    const secondSchema = schemaV1((value) => {
      secondCalls += 1;
      if (value === "explode") throw new Error("second schema should not run");
      return value;
    });
    const harness = harnessV1({
      definitionSidecars: definitionSidecarsV1(
        new Map([
          [rootStackDefinitionIdV1, firstSchema],
          [rootStackAlternateDefinitionIdV1, secondSchema],
        ]),
      ),
    });
    const first = harness.workspace.issueOccurrence();
    const second = harness.workspace.issueOccurrence();
    const revision1 = harness.workspace.issueSourceRevision();
    const initial = admittedV1(
      evaluateV1(
        harness,
        publicationV1(harness.workspace, revision1, [
          targetV1({ occurrenceId: first, parameters: { value: 1 } }),
          targetV1({
            occurrenceId: second,
            definitionId: rootStackAlternateDefinitionIdV1,
            parameters: { value: 2 },
          }),
        ]),
      ),
    ).proposal.nextAcceptedBaseline;
    firstCalls = 0;
    secondCalls = 0;
    const revision2 = harness.workspace.issueSourceRevision();
    expectZeroResultV1(
      evaluateV1(
        harness,
        publicationV1(harness.workspace, revision2, [
          targetV1({ occurrenceId: first, parameters: { value: 9 } }),
          targetV1({
            occurrenceId: second,
            definitionId: rootStackAlternateDefinitionIdV1,
            parameters: "explode",
          }),
        ]),
        { acceptedBaseline: initial },
      ),
      "rejected",
      "surface.stable_occurrence_reused",
    );
    expect(firstCalls).toBe(1);
    expect(secondCalls).toBe(0);

    const deepValue = (() => {
      let value: unknown = null;
      for (let index = 0; index < 33; index += 1) value = [value];
      return value;
    })();
    const canonicalCases = [
      {
        output: () => {
          throw new Error("schema rejected");
        },
        kind: "rejected" as const,
        code: "surface.stable_schema_invalid" as const,
      },
      {
        output: () => undefined,
        kind: "rejected" as const,
        code: "surface.stable_canonical_invalid" as const,
      },
      {
        output: () => "x".repeat(65_535),
        kind: "rejected" as const,
        code: "surface.stable_canonical_bytes_exceeded" as const,
      },
      {
        output: () => deepValue,
        kind: "rejected" as const,
        code: "surface.stable_canonical_depth_exceeded" as const,
      },
      {
        output: () => Array.from({ length: 4_097 }, () => null),
        kind: "rejected" as const,
        code: "surface.stable_canonical_nodes_exceeded" as const,
      },
    ];
    for (const current of canonicalCases) {
      const localHarness = harnessV1({
        definitionSidecars: definitionSidecarsV1(
          new Map([[rootStackDefinitionIdV1, schemaV1(current.output)]]),
        ),
      });
      const occurrence = localHarness.workspace.issueOccurrence();
      const revision = localHarness.workspace.issueSourceRevision();
      expectZeroResultV1(
        evaluateV1(
          localHarness,
          publicationV1(localHarness.workspace, revision, [
            targetV1({ occurrenceId: occurrence }),
          ]),
        ),
        current.kind,
        current.code,
      );
    }
  });

  it("binds normalized reservation provenance, conflict, and generation ABA", () => {
    const harness = harnessV1();
    const generationA = harness.authority.createReservationGenerationToken();
    const snapshotA = harness.authority.createRootReservationSnapshot({
      subjectPublisherLease: harness.workspace.lease,
      generationToken: generationA,
      foreignReservedRootSlotIds: [rootOtherSlotIdV1, rootOtherSlotIdV1],
    });
    expect(snapshotA.reservedRootSlotIds).toEqual([rootOtherSlotIdV1]);

    const generationB = harness.authority.createReservationGenerationToken();
    const snapshotB = harness.authority.createRootReservationSnapshot({
      subjectPublisherLease: harness.workspace.lease,
      generationToken: generationB,
      foreignReservedRootSlotIds: [rootStackSlotIdV1],
    });
    const generationC = harness.authority.createReservationGenerationToken();
    const snapshotC = harness.authority.createRootReservationSnapshot({
      subjectPublisherLease: harness.workspace.lease,
      generationToken: generationC,
      foreignReservedRootSlotIds: [rootOtherSlotIdV1],
    });
    expect(generationC).not.toBe(generationA);
    expect(snapshotC).not.toBe(snapshotA);
    expect(snapshotC.reservedRootSlotIds).toEqual(snapshotA.reservedRootSlotIds);

    const occurrence = harness.workspace.issueOccurrence();
    const revision = harness.workspace.issueSourceRevision();
    expectZeroResultV1(
      evaluateV1(
        harness,
        publicationV1(harness.workspace, revision, [
          targetV1({ occurrenceId: occurrence }),
        ]),
        { reservationSnapshot: snapshotB },
      ),
      "rejected",
      "surface.stable_owner_conflict",
    );

    {
      const local = harnessV1();
      const token = local.authority.createReservationGenerationToken();
      const differentRootSlot = local.authority.createRootReservationSnapshot({
        subjectPublisherLease: local.workspace.lease,
        generationToken: token,
        foreignReservedRootSlotIds: [rootOtherSlotIdV1],
      });
      const localOccurrence = local.workspace.issueOccurrence();
      const localRevision = local.workspace.issueSourceRevision();
      expect(
        admittedV1(evaluateV1(
          local,
          publicationV1(local.workspace, localRevision, [
            targetV1({ occurrenceId: localOccurrence }),
          ]),
          { reservationSnapshot: differentRootSlot },
        )).proposal.relation,
      ).toBe("initial");
    }

    const clonedHarness = harnessV1();
    const clonedSourceSnapshot = clonedHarness.authority.createRootReservationSnapshot({
      subjectPublisherLease: clonedHarness.workspace.lease,
      generationToken: clonedHarness.authority.createReservationGenerationToken(),
      foreignReservedRootSlotIds: [],
    });
    const clonedSnapshot = Object.freeze({
      ...clonedSourceSnapshot,
    }) as ManagedSurfaceStableRootReservationSnapshotInternalV1;
    const nextOccurrence = clonedHarness.workspace.issueOccurrence();
    const nextRevision = clonedHarness.workspace.issueSourceRevision();
    expectZeroResultV1(
      evaluateV1(
        clonedHarness,
        publicationV1(clonedHarness.workspace, nextRevision, [
          targetV1({ occurrenceId: nextOccurrence }),
        ]),
        { reservationSnapshot: clonedSnapshot },
      ),
      "faulted",
      "surface.stable_admission_faulted",
    );

    const foreign = harnessV1();
    const foreignToken = foreign.authority.createReservationGenerationToken();
    expect(() =>
      harness.authority.createRootReservationSnapshot({
        subjectPublisherLease: harness.workspace.lease,
        generationToken: foreignToken,
        foreignReservedRootSlotIds: [],
      })
    ).toThrow(TypeError);
    const clonedToken = Object.freeze({
      ...generationA,
    }) as ManagedSurfaceStableReservationGenerationTokenInternalV1;
    expect(() =>
      harness.authority.createRootReservationSnapshot({
        subjectPublisherLease: harness.workspace.lease,
        generationToken: clonedToken,
        foreignReservedRootSlotIds: [],
      })
    ).toThrow(TypeError);
  });

  it("distinguishes unpublished, accepted-empty, equal, greater-same, and greater-changed", () => {
    {
      const harness = harnessV1();
      harness.workspace.issueSourceRevision();
      const revision2 = harness.workspace.issueSourceRevision();
      expectZeroResultV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision2, [])),
        "rejected",
        "surface.stable_initial_revision_invalid",
      );
    }

    {
      const harness = harnessV1();
      const revision1 = harness.workspace.issueSourceRevision();
      const initialEmpty = admittedV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision1, [])),
      );
      expect(initialEmpty.proposal.relation).toBe("initial");
      const acceptedEmpty = initialEmpty.proposal.nextAcceptedBaseline;
      expect(acceptedEmpty.kind).toBe("accepted");
      expect(acceptedEmpty).not.toBe(harness.baseline);
      expect(acceptedEmpty.targets).toEqual([]);
      expectZeroResultV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision1, []), {
          acceptedBaseline: acceptedEmpty,
        }),
        "unchanged",
        "surface.stable_publication_unchanged",
      );
      const revision2 = harness.workspace.issueSourceRevision();
      const greaterEmpty = admittedV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision2, []), {
          acceptedBaseline: acceptedEmpty,
        }),
      );
      expect(greaterEmpty.proposal.relation).toBe("greater_same");
      expect(greaterEmpty.proposal.nextAcceptedBaseline.targets).toBe(acceptedEmpty.targets);
      expect(greaterEmpty.proposal.nextAcceptedBaseline.acceptedOccurrenceHighWater).toBe(
        acceptedEmpty.acceptedOccurrenceHighWater,
      );
    }

    {
      const harness = harnessV1();
      const first = harness.workspace.issueOccurrence();
      const revision1 = harness.workspace.issueSourceRevision();
      const targets = [targetV1({ occurrenceId: first, parameters: { value: 1 } })];
      const initial = admittedV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision1, targets)),
      ).proposal.nextAcceptedBaseline;
      const conflictingReservation = harness.authority.createRootReservationSnapshot({
        subjectPublisherLease: harness.workspace.lease,
        generationToken: harness.authority.createReservationGenerationToken(),
        foreignReservedRootSlotIds: [rootStackSlotIdV1],
      });
      expectZeroResultV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision1, targets), {
          acceptedBaseline: initial,
          reservationSnapshot: conflictingReservation,
        }),
        "rejected",
        "surface.stable_owner_conflict",
      );
      expectZeroResultV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision1, []), {
          acceptedBaseline: initial,
        }),
        "rejected",
        "surface.stable_source_revision_conflict",
      );
      const revision2 = harness.workspace.issueSourceRevision();
      const same = admittedV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision2, targets), {
          acceptedBaseline: initial,
        }),
      );
      expect(same.proposal.relation).toBe("greater_same");
      expect(same.proposal.nextAcceptedBaseline.targets).toBe(initial.targets);
      expect(same.proposal.nextAcceptedBaseline.acceptedOccurrenceHighWater).toBe(
        initial.acceptedOccurrenceHighWater,
      );

      const second = harness.workspace.issueOccurrence();
      const revision3 = harness.workspace.issueSourceRevision();
      const changed = admittedV1(
        evaluateV1(
          harness,
          publicationV1(harness.workspace, revision3, [
            ...targets,
            targetV1({ occurrenceId: second }),
          ]),
          { acceptedBaseline: same.proposal.nextAcceptedBaseline },
        ),
      );
      expect(changed.proposal.relation).toBe("greater_changed");
      expect(changed.proposal.nextAcceptedBaseline.acceptedOccurrenceHighWater)
        .toMatchObject({ occurrenceSequenceHighWater: 2 });
    }
  });

  it("uses the captured R1 proof across schema callbacks and later issuance", () => {
    {
      let harness!: StableAdmissionHarnessV1;
      const disposingSchema = schemaV1((value) => {
        expect(harness.registry.disposePublisherLease(harness.workspace.lease)).toBe("disposed");
        return value;
      });
      harness = harnessV1({
        definitionSidecars: definitionSidecarsV1(
          new Map([[rootStackDefinitionIdV1, disposingSchema]]),
        ),
      });
      const occurrence = harness.workspace.issueOccurrence();
      const revision = harness.workspace.issueSourceRevision();
      const result = admittedV1(
        evaluateV1(
          harness,
          publicationV1(harness.workspace, revision, [
            targetV1({ occurrenceId: occurrence }),
          ]),
        ),
      );
      expect(result.proposal.nextAcceptedBaseline.acceptedOccurrenceHighWater)
        .toMatchObject({ occurrenceSequenceHighWater: 1 });
      expect(harness.registry.inspectCurrentLease(harness.workspace.lease)).toBeNull();
    }

    {
      let harness!: StableAdmissionHarnessV1;
      let lateOccurrence: string | null = null;
      const issuingSchema = schemaV1((value) => {
        lateOccurrence = harness.workspace.issueOccurrence();
        return value;
      });
      harness = harnessV1({
        definitionSidecars: definitionSidecarsV1(
          new Map([[rootStackDefinitionIdV1, issuingSchema]]),
        ),
      });
      const occurrence = harness.workspace.issueOccurrence();
      const revision = harness.workspace.issueSourceRevision();
      const result = admittedV1(
        evaluateV1(
          harness,
          publicationV1(harness.workspace, revision, [
            targetV1({ occurrenceId: occurrence }),
          ]),
        ),
      );
      expect(lateOccurrence).not.toBeNull();
      expect(harness.workspace.getSnapshot().occurrenceIssuanceHighWater).toBe(2);
      expect(result.proposal.nextAcceptedBaseline.acceptedOccurrenceHighWater)
        .toMatchObject({ occurrenceSequenceHighWater: 1 });
    }
  });

  it("captures baseline at stage 2 and reservation at stage 9 despite later input rewrites", () => {
    {
      let evaluationInput: {
        publication: unknown;
        acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
        reservationSnapshot: ManagedSurfaceStableRootReservationSnapshotInternalV1;
      } | null = null;
      let replacementBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1 | null = null;
      const schema = schemaV1((value) => {
        if (evaluationInput !== null && replacementBaseline !== null) {
          evaluationInput.acceptedBaseline = replacementBaseline;
        }
        return value;
      });
      const harness = harnessV1({
        definitionSidecars: definitionSidecarsV1(
          new Map([[rootStackDefinitionIdV1, schema]]),
        ),
      });
      const occurrence = harness.workspace.issueOccurrence();
      const targets = [targetV1({ occurrenceId: occurrence })];
      const revision1 = harness.workspace.issueSourceRevision();
      const accepted1 = admittedV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision1, targets)),
      ).proposal.nextAcceptedBaseline;
      const revision2 = harness.workspace.issueSourceRevision();
      const accepted2 = admittedV1(
        evaluateV1(harness, publicationV1(harness.workspace, revision2, targets), {
          acceptedBaseline: accepted1,
        }),
      ).proposal.nextAcceptedBaseline;
      const revision3 = harness.workspace.issueSourceRevision();
      replacementBaseline = accepted2;
      evaluationInput = {
        publication: publicationV1(harness.workspace, revision3, targets),
        acceptedBaseline: accepted1,
        reservationSnapshot: harness.reservationSnapshot,
      };
      const result = admittedV1(harness.authority.evaluate(evaluationInput));
      expect(evaluationInput.acceptedBaseline).toBe(accepted2);
      expect(result.proposal.captured.acceptedBaseline).toBe(accepted1);
    }

    {
      const registry = registryV1();
      let evaluationInput: {
        publication: unknown;
        acceptedBaseline: ManagedSurfaceStableAcceptedBaselineInternalV1;
        reservationSnapshot: ManagedSurfaceStableRootReservationSnapshotInternalV1;
      } | null = null;
      let replacementReservation: ManagedSurfaceStableRootReservationSnapshotInternalV1 | null =
        null;
      const instrumentedRegistry = Object.freeze({
        ...registry,
        deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
          ...args: Parameters<
            ManagedSurfaceStablePublisherLeaseRegistryInternalV1[
              "deriveAcceptedOccurrenceHighWaterFromAdmissionProof"
            ]
          >
        ) {
          if (evaluationInput !== null && replacementReservation !== null) {
            evaluationInput.reservationSnapshot = replacementReservation;
          }
          return registry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(...args);
        },
      }) satisfies ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
      const harness = harnessV1({ registry: instrumentedRegistry });
      const occurrence = harness.workspace.issueOccurrence();
      const revision = harness.workspace.issueSourceRevision();
      replacementReservation = harness.authority.createRootReservationSnapshot({
        subjectPublisherLease: harness.workspace.lease,
        generationToken: harness.authority.createReservationGenerationToken(),
        foreignReservedRootSlotIds: [rootStackSlotIdV1],
      });
      evaluationInput = {
        publication: publicationV1(harness.workspace, revision, [
          targetV1({ occurrenceId: occurrence }),
        ]),
        acceptedBaseline: harness.baseline,
        reservationSnapshot: harness.reservationSnapshot,
      };
      const result = admittedV1(harness.authority.evaluate(evaluationInput));
      expect(evaluationInput.reservationSnapshot).toBe(replacementReservation);
      expect(result.proposal.captured.reservationSnapshot).toBe(harness.reservationSnapshot);
    }
  });

  it("creates no next cursor or proposal for invalid and equal-same results", () => {
    const registry = registryV1();
    let proofCaptures = 0;
    let cursorDerivations = 0;
    const instrumentedRegistry = Object.freeze({
      ...registry,
      captureAcceptedOccurrenceAdmissionProof(
        ...args: Parameters<
          ManagedSurfaceStablePublisherLeaseRegistryInternalV1[
            "captureAcceptedOccurrenceAdmissionProof"
          ]
        >
      ) {
        proofCaptures += 1;
        return registry.captureAcceptedOccurrenceAdmissionProof(...args);
      },
      deriveAcceptedOccurrenceHighWaterFromAdmissionProof(
        ...args: Parameters<
          ManagedSurfaceStablePublisherLeaseRegistryInternalV1[
            "deriveAcceptedOccurrenceHighWaterFromAdmissionProof"
          ]
        >
      ) {
        cursorDerivations += 1;
        return registry.deriveAcceptedOccurrenceHighWaterFromAdmissionProof(...args);
      },
    }) satisfies ManagedSurfaceStablePublisherLeaseRegistryInternalV1;
    const harness = harnessV1({ registry: instrumentedRegistry });
    const occurrence = harness.workspace.issueOccurrence();
    const revision = harness.workspace.issueSourceRevision();
    const invalid = evaluateV1(
      harness,
      publicationV1(harness.workspace, revision, [
        targetV1({ occurrenceId: occurrence, definitionId: unknownDefinitionIdV1 }),
      ]),
    );
    expectZeroResultV1(invalid, "rejected", "surface.stable_definition_missing");
    expect(proofCaptures).toBe(1);
    expect(cursorDerivations).toBe(0);
    expect(harness.baseline.kind).toBe("unpublished");

    const validPublication = publicationV1(harness.workspace, revision, [
      targetV1({ occurrenceId: occurrence }),
    ]);
    const admitted = admittedV1(evaluateV1(harness, validPublication));
    expect(proofCaptures).toBe(2);
    expect(cursorDerivations).toBe(1);
    const accepted = admitted.proposal.nextAcceptedBaseline;
    expectZeroResultV1(
      evaluateV1(harness, validPublication, { acceptedBaseline: accepted }),
      "unchanged",
      "surface.stable_publication_unchanged",
    );
    expect(proofCaptures).toBe(3);
    expect(cursorDerivations).toBe(1);
    expect(accepted.sourceRevision).toBe(revision);
    expect(accepted.acceptedOccurrenceHighWater.occurrenceSequenceHighWater).toBe(1);
  });
});

// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  createInitialVnReferenceTourNarrativeStateV1,
  type VnReferenceTourSignalChoiceV1,
} from "../story/narrative.ts";
import { vnReferenceTourNarrativeStateSchemaV1 } from "../game/state.ts";
import { createVnReferenceTourSimulationTargetV1 } from "../tooling/simulation-target.ts";

interface VnReferenceTourTestPublicationV1 {
  readonly game: { readonly stage: unknown };
  readonly narrative: {
    readonly phase: "idle" | "active" | "completed";
    readonly signalChoice: VnReferenceTourSignalChoiceV1 | null;
    readonly pending: null | {
      readonly kind: string;
      readonly occurrenceId: string;
      readonly textId?: string;
      readonly totalMs?: number;
      readonly remainingMs?: number;
    };
    readonly history: {
      readonly entries: readonly { readonly kind: string; readonly textId: string }[];
    };
  };
}

interface VnReferenceTourRouteRunV1 {
  readonly digest: string;
  readonly publications: readonly VnReferenceTourTestPublicationV1[];
  readonly results: readonly unknown[];
}

type VnReferenceTourSimulationTargetV1 = Awaited<
  ReturnType<typeof createVnReferenceTourSimulationTargetV1>
>;

function dispatchV1(
  target: VnReferenceTourSimulationTargetV1,
  invocation: unknown,
): Promise<unknown> {
  // The simulation target's wrapper fills the live occurrence fence into
  // occurrence-free script steps before delegating to the typed Agent port.
  return target.agent.dispatch(invocation as never);
}

function publicationV1(value: unknown): VnReferenceTourTestPublicationV1 {
  return value as VnReferenceTourTestPublicationV1;
}

async function playRouteV1(
  route: VnReferenceTourSignalChoiceV1,
): Promise<VnReferenceTourRouteRunV1> {
  const target = await createVnReferenceTourSimulationTargetV1({ seed: 4_242 });
  try {
    const scenario = target.scenarios[`${route}-voice`];
    const publications: VnReferenceTourTestPublicationV1[] = [];
    const results: unknown[] = [];
    for (const invocation of scenario) {
      results.push(await dispatchV1(target, invocation));
      publications.push(publicationV1(target.agent.observe()));
    }
    return { digest: target.stateDigest(), publications, results };
  } finally {
    await target.dispose();
  }
}

function expectCompleteRouteV1(
  route: VnReferenceTourSignalChoiceV1,
  run: VnReferenceTourRouteRunV1,
): void {
  expect(run.publications).toHaveLength(82);
  expect(
    run.results.every((result) => (result as { readonly kind?: unknown }).kind === "committed"),
  ).toBe(true);

  const afterBegin = run.publications[0]!;
  const choiceIndex = run.publications.findIndex(({ narrative }) =>
    narrative.pending?.kind === "choice"
  );
  const holdIndex = run.publications.findIndex(({ narrative }) =>
    narrative.pending?.kind === "hold"
  );
  expect(choiceIndex).toBeGreaterThan(0);
  expect(holdIndex).toBeGreaterThan(choiceIndex);
  const atChoice = run.publications[choiceIndex]!;
  const afterChoice = run.publications[choiceIndex + 1]!;
  const atHold = run.publications[holdIndex]!;
  const afterHold = run.publications[holdIndex + 1]!;
  const completed = run.publications.at(-1)!;

  expect(afterBegin.narrative).toMatchObject({
    phase: "active",
    signalChoice: null,
    pending: { kind: "say" },
  });
  expect(atChoice.narrative).toMatchObject({
    signalChoice: null,
    pending: { kind: "choice" },
  });
  expect(afterChoice.narrative.signalChoice).toBe(route);
  expect(afterChoice.narrative.pending).toMatchObject({
    kind: "say",
    textId: expect.stringContaining(`text.vn-reference-tour.${route}.prepare.`),
  });
  expect(atHold.narrative).toMatchObject({
    signalChoice: route,
    pending: { kind: "hold", totalMs: 1_200, remainingMs: 1_200 },
  });
  expect(afterHold.narrative).toMatchObject({
    signalChoice: route,
    pending: {
      kind: "say",
      textId: expect.stringContaining(`text.vn-reference-tour.${route}.roof.`),
    },
  });
  expect(afterHold.game.stage).not.toEqual(atHold.game.stage);
  expect(completed.narrative).toMatchObject({
    phase: "completed",
    signalChoice: route,
    pending: null,
  });
  expect(completed.narrative.history.entries).toHaveLength(80);
  expect(
    completed.narrative.history.entries.filter((entry) =>
      entry.textId.startsWith(`text.vn-reference-tour.${route}.`)
    ),
  ).toHaveLength(28);
  const otherRoute = route === "archive" ? "present" : "archive";
  expect(
    completed.narrative.history.entries.some((entry) =>
      entry.textId.startsWith(`text.vn-reference-tour.${otherRoute}.`)
    ),
  ).toBe(false);
}

describe("VN Reference Tour signal choice authority", () => {
  it("admits the closed route value in Narrative State", () => {
    const initial = createInitialVnReferenceTourNarrativeStateV1();
    expect(initial.signalChoice).toBeNull();
    expect(vnReferenceTourNarrativeStateSchemaV1.parse(initial).signalChoice).toBeNull();
    for (const signalChoice of ["archive", "present"] as const) {
      expect(
        vnReferenceTourNarrativeStateSchemaV1.parse({ ...initial, signalChoice }).signalChoice,
      ).toBe(signalChoice);
    }
    expect(() =>
      vnReferenceTourNarrativeStateSchemaV1.parse({ ...initial, signalChoice: "unknown" })
    ).toThrow();
  });

  it("rejects a stale material choice without changing authoritative State", async () => {
    const target = await createVnReferenceTourSimulationTargetV1({ seed: 4_242 });
    try {
      const scenario = target.scenarios["archive-voice"];
      expect(scenario).toHaveLength(82);
      const choiceIndex = scenario.findIndex((invocation) =>
        invocation.kind === "resolve" && invocation.resolution.kind === "choose"
      );
      expect(choiceIndex).toBeGreaterThan(0);
      for (const invocation of scenario.slice(0, choiceIndex)) {
        await expect(dispatchV1(target, invocation)).resolves.toMatchObject({
          kind: "committed",
        });
      }
      const before = target.agent.observe();
      const beforeDigest = target.stateDigest();
      expect(publicationV1(before).narrative).toMatchObject({
        signalChoice: null,
        pending: { kind: "choice" },
      });

      const choice = scenario[choiceIndex] as Record<string, unknown>;
      await expect(dispatchV1(target, {
        ...choice,
        expectedOccurrenceId: "interaction-occurrence.999",
      })).resolves.toMatchObject({
        kind: "rejected",
        codes: ["interaction.occurrence_mismatch"],
      });
      expect(target.stateDigest()).toBe(beforeDigest);
      expect(target.agent.observe()).toEqual(before);

      await expect(dispatchV1(target, choice)).resolves.toMatchObject({ kind: "committed" });
      expect(publicationV1(target.agent.observe()).narrative).toMatchObject({
        signalChoice: "archive",
        pending: {
          kind: "say",
          textId: expect.stringContaining("text.vn-reference-tour.archive.prepare."),
        },
      });
    } finally {
      await target.dispose();
    }
  });

  it("runs both complete named routes through ordinary interactions", async () => {
    const archive = await playRouteV1("archive");
    const present = await playRouteV1("present");
    expectCompleteRouteV1("archive", archive);
    expectCompleteRouteV1("present", present);
    expect(archive.digest).not.toBe(present.digest);

    expect((await playRouteV1("archive")).digest).toBe(archive.digest);
    expect((await playRouteV1("present")).digest).toBe(present.digest);
  }, 30_000);
});

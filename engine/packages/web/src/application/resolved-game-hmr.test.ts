// SPDX-License-Identifier: MIT
import type { BuildProvenanceV1, Digest, RuntimeInvalidationControllerV1 } from "@sillymaker/base";
import { digestBytes, parsePositiveSafeInteger } from "@sillymaker/base";
import { describe, expect, it, vi } from "vitest";

import {
  createResolvedGameHmrIdentityV1,
  installResolvedGameHmrV1,
  type ResolvedGameHmrHotAdapterV1,
  type ResolvedGameHmrRebootstrapInputV1,
} from "./resolved-game-hmr.ts";

function digest(label: string): Digest {
  return digestBytes(new TextEncoder().encode(label));
}

function provenanceV1(): BuildProvenanceV1 {
  return ({
    story: {
      id: "story.hmr.fixture",
      revision: parsePositiveSafeInteger(1),
      digest: digest("story"),
    },
    engine: { version: "SillyMaker test", digest: digest("engine") },
    resolved: {
      stateContractRevision: parsePositiveSafeInteger(1),
      stateContractDigest: digest("state-contract"),
      simulationDigest: digest("simulation"),
      presentationDigest: digest("presentation"),
      patchSet: {
        digest: digest("patch-set"),
        simulationDigest: digest("simulation-patch-set"),
        presentationDigest: digest("presentation-patch-set"),
        appliedHotfixes: [],
      },
    },
  });
}

function withProvenanceChangeV1(
  current: BuildProvenanceV1,
  field:
    | "storyId"
    | "storyRevision"
    | "storyDigest"
    | "engineDigest"
    | "stateContractRevision"
    | "stateContractDigest"
    | "simulationDigest"
    | "presentationDigest",
): BuildProvenanceV1 {
  switch (field) {
    case "storyId":
      return ({
        ...current,
        story: { ...current.story, id: "story.hmr.changed" },
      });
    case "storyRevision":
      return ({
        ...current,
        story: { ...current.story, revision: parsePositiveSafeInteger(2) },
      });
    case "storyDigest":
      return ({
        ...current,
        story: { ...current.story, digest: digest("story-changed") },
      });
    case "engineDigest":
      return ({
        ...current,
        engine: { ...current.engine, digest: digest("engine-changed") },
      });
    case "stateContractRevision":
      return ({
        ...current,
        resolved: {
          ...current.resolved,
          stateContractRevision: parsePositiveSafeInteger(2),
        },
      });
    case "stateContractDigest":
      return ({
        ...current,
        resolved: {
          ...current.resolved,
          stateContractDigest: digest("state-contract-changed"),
        },
      });
    case "simulationDigest":
      return ({
        ...current,
        resolved: {
          ...current.resolved,
          simulationDigest: digest("simulation-changed"),
        },
      });
    case "presentationDigest":
      return ({
        ...current,
        resolved: {
          ...current.resolved,
          presentationDigest: digest("presentation-changed"),
        },
      });
  }
  throw new TypeError("unknown HMR identity field");
}

function createHotFixtureV1<TModule>() {
  let accepted: ((module: TModule | undefined) => void) | undefined;
  const hot: ResolvedGameHmrHotAdapterV1<TModule> = {
    accept(handler: (module: TModule | undefined) => void) {
      accepted = handler;
    },
  };
  return ({
    hot,
    emit(module: TModule | undefined) {
      if (accepted === undefined) throw new TypeError("HMR accept handler was not installed");
      accepted(module);
    },
  });
}

function createLifecycleFixtureV1(events: string[] = []) {
  const invalidateForHmr = vi.fn(() => {
    events.push("invalidate");
  });
  const invalidationController = ({
    invalidateForHmr,
  }) as RuntimeInvalidationControllerV1;
  const handoff = { kind: "disposed" as const };
  const disposeForRebootstrap = vi.fn(async () => {
    events.push("dispose");
    return handoff;
  });
  return ({
    invalidationController,
    invalidateForHmr,
    disposeForRebootstrap,
    handoff,
  });
}

describe("resolved Game HMR", () => {
  it("extracts only the reviewed ResolvedGame identity tuple", () => {
    const provenance = provenanceV1();
    const identity = createResolvedGameHmrIdentityV1(provenance);

    expect(identity).toEqual({
      storyId: provenance.story.id,
      storyRevision: provenance.story.revision,
      storyDigest: provenance.story.digest,
      engineDigest: provenance.engine.digest,
      stateContractRevision: provenance.resolved.stateContractRevision,
      stateContractDigest: provenance.resolved.stateContractDigest,
      simulationDigest: provenance.resolved.simulationDigest,
      presentationDigest: provenance.resolved.presentationDigest,
    });
    expect(identity).not.toHaveProperty("engineVersion");
    expect(identity).not.toHaveProperty("appBuildId");
    expect(identity).not.toHaveProperty("capabilities");
    expect(identity).not.toHaveProperty("patchSetDigest");
  });

  it("ignores equal tuples including engine labels and PatchSet-only diagnostics", async () => {
    const current = provenanceV1();
    const diagnosticOnly = {
      ...current,
      engine: { ...current.engine, version: "SillyMaker relabeled" },
      resolved: {
        ...current.resolved,
        patchSet: {
          ...current.resolved.patchSet,
          digest: digest("patch-relabeled"),
        },
      },
    };
    const hot = createHotFixtureV1<{ readonly provenance: BuildProvenanceV1 }>();
    const lifecycle = createLifecycleFixtureV1();
    const rebootstrap = vi.fn(async () => undefined);
    const onAcceptedEqual = vi.fn();
    const installation = installResolvedGameHmrV1({
      hot: hot.hot,
      currentProvenance: current,
      lifecycle,
      resolveAcceptedProvenance: (module) => module!.provenance,
      onAcceptedEqual,
      rebootstrap,
    });

    hot.emit({ provenance: diagnosticOnly });
    await installation.waitForTransition();

    expect(lifecycle.invalidateForHmr).not.toHaveBeenCalled();
    expect(lifecycle.disposeForRebootstrap).not.toHaveBeenCalled();
    expect(rebootstrap).not.toHaveBeenCalled();
    expect(onAcceptedEqual).toHaveBeenCalledOnce();
    expect(onAcceptedEqual).toHaveBeenCalledWith({ provenance: diagnosticOnly });

    hot.emit({ provenance: withProvenanceChangeV1(current, "simulationDigest") });
    await installation.waitForTransition();
    expect(lifecycle.invalidateForHmr).not.toHaveBeenCalled();
    expect(rebootstrap).not.toHaveBeenCalled();
    expect(onAcceptedEqual).toHaveBeenCalledOnce();
  });

  it("hands an equal update the boundary before a later identity change", async () => {
    type AcceptedModule = {
      readonly provenance: BuildProvenanceV1;
      installNextBoundary?(): void;
    };
    const current = provenanceV1();
    const equal = {
      ...current,
      engine: { ...current.engine, version: "SillyMaker equal update" },
    };
    const changed = withProvenanceChangeV1(current, "simulationDigest");
    const firstHot = createHotFixtureV1<AcceptedModule>();
    const secondHot = createHotFixtureV1<AcceptedModule>();
    const lifecycle = createLifecycleFixtureV1();
    const rebootstrap = vi.fn(async () => undefined);
    let secondInstallation: ReturnType<typeof installResolvedGameHmrV1> | undefined;
    const equalModule: AcceptedModule = {
      provenance: equal,
      installNextBoundary() {
        secondInstallation = installResolvedGameHmrV1({
          hot: secondHot.hot,
          currentProvenance: equal,
          lifecycle,
          resolveAcceptedProvenance: (module) => module!.provenance,
          rebootstrap,
        });
      },
    };
    const firstInstallation = installResolvedGameHmrV1({
      hot: firstHot.hot,
      currentProvenance: current,
      lifecycle,
      resolveAcceptedProvenance: (module) => module!.provenance,
      onAcceptedEqual: (module) => module?.installNextBoundary?.(),
      rebootstrap,
    });

    firstHot.emit(equalModule);
    await firstInstallation.waitForTransition();
    expect(lifecycle.invalidateForHmr).not.toHaveBeenCalled();
    expect(lifecycle.disposeForRebootstrap).not.toHaveBeenCalled();
    expect(rebootstrap).not.toHaveBeenCalled();
    expect(secondInstallation).toBeDefined();

    secondHot.emit({ provenance: changed });
    if (secondInstallation === undefined) {
      throw new TypeError("next HMR boundary was not installed");
    }
    await secondInstallation.waitForTransition();
    expect(lifecycle.invalidateForHmr).toHaveBeenCalledOnce();
    expect(lifecycle.disposeForRebootstrap).toHaveBeenCalledOnce();
    expect(rebootstrap).toHaveBeenCalledOnce();
  });

  it("reports an equal-boundary handoff exception without invalidating", async () => {
    const current = provenanceV1();
    const hot = createHotFixtureV1<{ readonly provenance: BuildProvenanceV1 }>();
    const lifecycle = createLifecycleFixtureV1();
    const reportFailure = vi.fn();
    const rebootstrap = vi.fn(async () => undefined);
    const installation = installResolvedGameHmrV1({
      hot: hot.hot,
      currentProvenance: current,
      lifecycle,
      resolveAcceptedProvenance: (module) => module!.provenance,
      onAcceptedEqual() {
        throw new Error("next boundary unavailable");
      },
      rebootstrap,
      reportFailure,
    });

    expect(() => hot.emit({ provenance: current })).not.toThrow();
    await installation.waitForTransition();
    expect(reportFailure).toHaveBeenCalledOnce();
    expect(lifecycle.invalidateForHmr).not.toHaveBeenCalled();
    expect(lifecycle.disposeForRebootstrap).not.toHaveBeenCalled();
    expect(rebootstrap).not.toHaveBeenCalled();
  });

  it("keeps the predecessor live when candidate eligibility is not established", async () => {
    const current = provenanceV1();
    const changed = withProvenanceChangeV1(current, "simulationDigest");
    const hot = createHotFixtureV1<{ readonly provenance: BuildProvenanceV1 }>();
    const lifecycle = createLifecycleFixtureV1();
    const reportFailure = vi.fn();
    const rebootstrap = vi.fn(async () => undefined);
    const installation = installResolvedGameHmrV1({
      hot: hot.hot,
      currentProvenance: current,
      lifecycle,
      resolveAcceptedProvenance: (module) => module!.provenance,
      isRebootstrapEligible: () => false,
      rebootstrap,
      reportFailure,
    });

    hot.emit({ provenance: changed });
    await installation.waitForTransition();

    expect(reportFailure).toHaveBeenCalledOnce();
    expect(reportFailure.mock.calls[0]?.[0]).toMatchObject({
      message: "web.hmr_rebootstrap_ineligible",
    });
    expect(lifecycle.invalidateForHmr).not.toHaveBeenCalled();
    expect(lifecycle.disposeForRebootstrap).not.toHaveBeenCalled();
    expect(rebootstrap).not.toHaveBeenCalled();
  });

  it.each(
    [
      "storyId",
      "storyRevision",
      "storyDigest",
      "engineDigest",
      "stateContractRevision",
      "stateContractDigest",
      "simulationDigest",
      "presentationDigest",
    ] as const,
  )("invalidates once when %s changes", async (field) => {
    const events: string[] = [];
    const current = provenanceV1();
    const changed = withProvenanceChangeV1(current, field);
    const hot = createHotFixtureV1<{ readonly provenance: BuildProvenanceV1 }>();
    const lifecycle = createLifecycleFixtureV1(events);
    const rebootstrap = vi.fn(async () => {
      events.push("rebootstrap");
    });
    const installation = installResolvedGameHmrV1({
      hot: hot.hot,
      currentProvenance: current,
      lifecycle,
      resolveAcceptedProvenance: (module) => module!.provenance,
      rebootstrap,
    });

    hot.emit({ provenance: changed });
    expect(lifecycle.invalidateForHmr).toHaveBeenCalledOnce();
    hot.emit({ provenance: withProvenanceChangeV1(current, "simulationDigest") });
    await installation.waitForTransition();

    expect(lifecycle.invalidateForHmr).toHaveBeenCalledOnce();
    expect(lifecycle.disposeForRebootstrap).toHaveBeenCalledOnce();
    expect(rebootstrap).toHaveBeenCalledOnce();
    expect(rebootstrap).toHaveBeenCalledWith({
      module: { provenance: changed },
      reason: {
        kind: "identity_changed",
        previous: createResolvedGameHmrIdentityV1(current),
        next: createResolvedGameHmrIdentityV1(changed),
      },
      handoff: lifecycle.handoff,
    });
    expect(events).toEqual(["invalidate", "dispose", "rebootstrap"]);
  });

  it("reports resolution failure without retiring the predecessor", async () => {
    const events: string[] = [];
    const hot = createHotFixtureV1<object>();
    const lifecycle = createLifecycleFixtureV1(events);
    const reportFailure = vi.fn(() => {
      events.push("report");
    });
    const rebootstrap = vi.fn(async () => {
      events.push("rebootstrap");
    });
    const installation = installResolvedGameHmrV1({
      hot: hot.hot,
      currentProvenance: provenanceV1(),
      lifecycle,
      resolveAcceptedProvenance() {
        throw new Error("resolution failed at /Users/alice/story.ts");
      },
      rebootstrap,
      reportFailure,
    });

    hot.emit({});
    await installation.waitForTransition();

    expect(reportFailure).toHaveBeenCalledOnce();
    expect(lifecycle.invalidateForHmr).not.toHaveBeenCalled();
    expect(lifecycle.disposeForRebootstrap).not.toHaveBeenCalled();
    expect(rebootstrap).not.toHaveBeenCalled();
    expect(events).toEqual(["report"]);
  });

  it("retries a later accepted module after rebootstrap fails without repeating invalidation or disposal", async () => {
    type AcceptedModule = { readonly provenance: BuildProvenanceV1 };
    const current = provenanceV1();
    const firstChanged = withProvenanceChangeV1(current, "simulationDigest");
    const recovered = withProvenanceChangeV1(current, "presentationDigest");
    const hot = createHotFixtureV1<AcceptedModule>();
    const lifecycle = createLifecycleFixtureV1();
    const firstFailure = new Error("first rebootstrap failed");
    const reportFailure = vi.fn();
    const rebootstrap = vi.fn(
      async (
        _input: ResolvedGameHmrRebootstrapInputV1<AcceptedModule, typeof lifecycle.handoff>,
      ) => {
        if (rebootstrap.mock.calls.length === 1) throw firstFailure;
      },
    );
    const installation = installResolvedGameHmrV1({
      hot: hot.hot,
      currentProvenance: current,
      lifecycle,
      resolveAcceptedProvenance: (module) => module!.provenance,
      rebootstrap,
      reportFailure,
    });

    hot.emit({ provenance: firstChanged });
    await installation.waitForTransition();
    expect(reportFailure).toHaveBeenCalledWith(firstFailure);

    hot.emit({ provenance: recovered });
    await installation.waitForTransition();

    expect(lifecycle.invalidateForHmr).toHaveBeenCalledOnce();
    expect(lifecycle.disposeForRebootstrap).toHaveBeenCalledOnce();
    expect(rebootstrap).toHaveBeenCalledTimes(2);
    expect(rebootstrap.mock.calls[0]?.[0]).toMatchObject({
      module: { provenance: firstChanged },
      reason: { kind: "identity_changed" },
      handoff: lifecycle.handoff,
    });
    expect(rebootstrap.mock.calls[1]?.[0]).toMatchObject({
      module: { provenance: recovered },
      reason: { kind: "identity_changed" },
      handoff: lifecycle.handoff,
    });

    hot.emit({ provenance: firstChanged });
    await installation.waitForTransition();
    expect(rebootstrap).toHaveBeenCalledTimes(2);
  });

  it("closes a failed boundary when no current handoff remains retryable", async () => {
    type AcceptedModule = { readonly provenance: BuildProvenanceV1 };
    const current = provenanceV1();
    const firstChanged = withProvenanceChangeV1(current, "presentationDigest");
    const laterChanged = withProvenanceChangeV1(current, "simulationDigest");
    const hot = createHotFixtureV1<AcceptedModule>();
    const lifecycle = createLifecycleFixtureV1();
    const failure = new Error("rebootstrap consumed its last handoff");
    const reportFailure = vi.fn();
    const rebootstrap = vi.fn(async () => {
      throw failure;
    });
    const installation = installResolvedGameHmrV1({
      hot: hot.hot,
      currentProvenance: current,
      lifecycle,
      resolveAcceptedProvenance: (module) => module!.provenance,
      rebootstrap,
      canRetryRebootstrap: () => false,
      reportFailure,
    });

    hot.emit({ provenance: firstChanged });
    await installation.waitForTransition();
    hot.emit({ provenance: laterChanged });
    await installation.waitForTransition();

    expect(reportFailure).toHaveBeenCalledOnce();
    expect(reportFailure).toHaveBeenCalledWith(failure);
    expect(lifecycle.invalidateForHmr).toHaveBeenCalledOnce();
    expect(lifecycle.disposeForRebootstrap).toHaveBeenCalledOnce();
    expect(rebootstrap).toHaveBeenCalledOnce();
  });

  it("keeps the boundary open for a valid candidate after a resolution failure", async () => {
    type AcceptedModule =
      | { readonly kind: "unresolved" }
      | { readonly kind: "resolved"; readonly provenance: BuildProvenanceV1 };
    const current = provenanceV1();
    const recovered = withProvenanceChangeV1(current, "engineDigest");
    const hot = createHotFixtureV1<AcceptedModule>();
    const lifecycle = createLifecycleFixtureV1();
    const resolutionFailure = new Error("accepted module has no provenance");
    const reportFailure = vi.fn();
    const rebootstrap = vi.fn(
      async (
        _input: ResolvedGameHmrRebootstrapInputV1<AcceptedModule, typeof lifecycle.handoff>,
      ) => undefined,
    );
    const installation = installResolvedGameHmrV1({
      hot: hot.hot,
      currentProvenance: current,
      lifecycle,
      resolveAcceptedProvenance(module) {
        if (module?.kind !== "resolved") throw resolutionFailure;
        return module.provenance;
      },
      rebootstrap,
      reportFailure,
    });

    hot.emit({ kind: "unresolved" });
    await installation.waitForTransition();
    hot.emit({ kind: "resolved", provenance: recovered });
    await installation.waitForTransition();

    expect(reportFailure).toHaveBeenCalledOnce();
    expect(reportFailure).toHaveBeenCalledWith(resolutionFailure);
    expect(lifecycle.invalidateForHmr).toHaveBeenCalledOnce();
    expect(lifecycle.disposeForRebootstrap).toHaveBeenCalledOnce();
    expect(rebootstrap).toHaveBeenCalledOnce();
    expect(rebootstrap.mock.calls[0]?.[0]).toMatchObject({
      module: { kind: "resolved", provenance: recovered },
      reason: { kind: "identity_changed" },
      handoff: lifecycle.handoff,
    });
  });

  it("isolates unexpected disposal and failure-reporter exceptions without rebootstrap", async () => {
    const current = provenanceV1();
    const hot = createHotFixtureV1<{ readonly provenance: BuildProvenanceV1 }>();
    const lifecycle = {
      invalidationController: ({
        invalidateForHmr: vi.fn(),
      }) as RuntimeInvalidationControllerV1,
      disposeForRebootstrap: vi.fn(async () => {
        throw new Error("dispose failed");
      }),
    };
    const rebootstrap = vi.fn(async () => undefined);
    const installation = installResolvedGameHmrV1({
      hot: hot.hot,
      currentProvenance: current,
      lifecycle,
      resolveAcceptedProvenance: (module) => module!.provenance,
      rebootstrap,
      reportFailure() {
        throw new Error("reporter failed");
      },
    });

    expect(() => hot.emit({ provenance: withProvenanceChangeV1(current, "presentationDigest") }))
      .not.toThrow();
    await expect(installation.waitForTransition()).resolves.toBeUndefined();
    hot.emit({ provenance: withProvenanceChangeV1(current, "simulationDigest") });
    await expect(installation.waitForTransition()).resolves.toBeUndefined();
    expect(lifecycle.disposeForRebootstrap).toHaveBeenCalledOnce();
    expect(rebootstrap).not.toHaveBeenCalled();
  });

  it("is inert when the Host has no HMR adapter", async () => {
    const lifecycle = createLifecycleFixtureV1();
    const resolveAcceptedProvenance = vi.fn(() => provenanceV1());
    const rebootstrap = vi.fn(async () => undefined);
    const installation = installResolvedGameHmrV1({
      hot: undefined,
      currentProvenance: provenanceV1(),
      lifecycle,
      resolveAcceptedProvenance,
      rebootstrap,
    });

    await expect(installation.waitForTransition()).resolves.toBeUndefined();
    expect(resolveAcceptedProvenance).not.toHaveBeenCalled();
    expect(lifecycle.invalidateForHmr).not.toHaveBeenCalled();
    expect(rebootstrap).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { digestBytes } from "@sillymaker/base";
import type { ResolveCoreGameApplicationOptionsV1 } from "@sillymaker/base/runtime";
import {
  createFixedBootstrapEntropyV1,
  createMemoryHostRecordStoreV1,
} from "@sillymaker/base/testkit";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";
import type {
  InstalledResolvedGameHmrV1,
  ResolvedGameHmrHotAdapterV1,
  StartedWebGameApplicationV1,
} from "@sillymaker/web";

import {
  installLabGameApplicationHmrV1,
  type InstallLabGameApplicationHmrOptionsV1,
  type LabGameApplicationHmrModuleV1,
  labGameApplicationV1,
} from "../application/composition.tsx";

type BuildIdentityInputV1 = NonNullable<
  ResolveCoreGameApplicationOptionsV1["buildIdentityInput"]
>;

const startedApplicationsV1: StartedWebGameApplicationV1[] = [];

afterEach(async () => {
  for (const started of startedApplicationsV1.splice(0).toReversed()) {
    await started.dispose();
  }
  document.body.replaceChildren();
});

function buildIdentityV1(
  simulationLabel: string,
  applicationLabel = "application",
): BuildIdentityInputV1 {
  const digest = (label: string) => digestBytes(new TextEncoder().encode(label));
  return Object.freeze({
    engineVersion: "SillyMaker Engine Lab HMR test",
    engine: Object.freeze([{
      path: "engine/packages/base/src/index.ts",
      facet: "engine" as const,
      sha256: digest("engine"),
    }]),
    storySimulation: Object.freeze([{
      path: "e2e/src/simulation-definition.ts",
      facet: "story_simulation" as const,
      sha256: digest(simulationLabel),
    }]),
    storyPresentation: Object.freeze([{
      path: "e2e/src/presentation.ts",
      facet: "story_presentation" as const,
      sha256: digest("presentation"),
    }]),
    application: Object.freeze([{
      path: "e2e/src/application/composition.tsx",
      facet: "application" as const,
      sha256: digest(applicationLabel),
    }]),
  });
}

function hotFixtureV1<TModule>(): {
  readonly hot: ResolvedGameHmrHotAdapterV1<TModule>;
  emit(module: TModule): void;
} {
  let handler: ((module: TModule | undefined) => void) | null = null;
  return Object.freeze({
    hot: Object.freeze({
      accept(next: (module: TModule | undefined) => void): void {
        handler = next;
      },
    }),
    emit(module: TModule): void {
      if (handler === null) throw new TypeError("HMR boundary was not installed");
      handler(module);
    },
  });
}

function viteHotFixtureV1(): {
  readonly hot: {
    accept(handler: (module: unknown) => void): void;
    invalidate(message?: string): void;
  };
  readonly invalidate: ReturnType<typeof vi.fn>;
  emit(module: unknown): void;
} {
  let handler: ((module: unknown) => void) | null = null;
  const invalidate = vi.fn();
  return Object.freeze({
    hot: Object.freeze({
      accept(next: (module: unknown) => void): void {
        handler = next;
      },
      invalidate,
    }),
    invalidate,
    emit(module: unknown): void {
      if (handler === null) throw new TypeError("Vite HMR boundary was not installed");
      handler(module);
    },
  });
}

function applicationWithBuildIdentityV1(buildIdentityInput: BuildIdentityInputV1) {
  return Object.freeze({ ...labGameApplicationV1, buildIdentityInput });
}

describe("Engine Lab maintained application HMR boundary", () => {
  it("hands a live-identity R2 candidate to the Web composer on the same Host and root", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);
    const host = createWebHostV1({ records: createMemoryHostRecordStoreV1() });
    const predecessor = await startWebGameApplicationV1(
      applicationWithBuildIdentityV1(buildIdentityV1("simulation:predecessor")),
      {
        rootElement: root,
        host,
        capabilitySearch: "?capability=automation_bridge",
        gameBootstrapEntropy: createFixedBootstrapEntropyV1({
          seeds: [20260828],
          uuids: [],
        }),
        registerPageLifecycle: false,
      },
    );
    startedApplicationsV1.push(predecessor);
    const predecessorRoot = await within(root).findByRole("application", {
      name: "引擎实验室",
    });

    const nextBoundary: InstalledResolvedGameHmrV1 = Object.freeze({
      waitForTransition: () => Promise.resolve(),
    });
    const installNextBoundary = vi.fn(
      (
        _started: StartedWebGameApplicationV1,
        _options?: InstallLabGameApplicationHmrOptionsV1,
      ) => nextBoundary,
    );
    const acceptedModule: LabGameApplicationHmrModuleV1 = Object.freeze({
      labGameApplicationV1: applicationWithBuildIdentityV1(
        buildIdentityV1("simulation:successor"),
      ),
      installLabGameApplicationHmrV1: installNextBoundary,
    });
    const hot = hotFixtureV1<LabGameApplicationHmrModuleV1>();
    const failures: unknown[] = [];
    let successor: StartedWebGameApplicationV1 | undefined;
    const onSuccessorStarted = (started: StartedWebGameApplicationV1): void => {
      successor = started;
      startedApplicationsV1.push(started);
    };
    const reportFailure = (error: unknown): void => {
      failures.push(error);
    };
    const installation = installLabGameApplicationHmrV1(predecessor, {
      hot: hot.hot,
      rootElement: root,
      onSuccessorStarted,
      reportFailure,
    });
    expect(installation).toBeDefined();

    hot.emit(acceptedModule);
    await installation!.waitForTransition();
    await waitFor(() => expect(successor).toBeDefined());
    const successorRoot = await within(root).findByRole("application", {
      name: "引擎实验室",
    });

    expect(predecessor.isDisposed()).toBe(true);
    expect(successor!.host).toBe(host);
    expect(successor!.capabilitySearch).toBe(predecessor.capabilitySearch);
    expect(successorRoot).not.toBe(predecessorRoot);
    expect(installNextBoundary).toHaveBeenCalledOnce();
    expect(installNextBoundary).toHaveBeenCalledWith(successor, {
      rootElement: root,
      onSuccessorStarted,
      reportFailure,
    });
    expect(installNextBoundary.mock.calls[0]?.[1]).not.toHaveProperty("hot");
    expect(failures).toEqual([]);
  });

  it("requests R3 for an equal-R2 composition candidate without fencing the predecessor", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);
    const host = createWebHostV1({ records: createMemoryHostRecordStoreV1() });
    const currentApplication = applicationWithBuildIdentityV1(
      buildIdentityV1("simulation:stable", "application:predecessor"),
    );
    const predecessor = await startWebGameApplicationV1(currentApplication, {
      rootElement: root,
      host,
      gameBootstrapEntropy: createFixedBootstrapEntropyV1({
        seeds: [20260829],
        uuids: [],
      }),
      registerPageLifecycle: false,
    });
    startedApplicationsV1.push(predecessor);
    const invalidateForHmr = vi.fn();
    const disposeForRebootstrap = vi.fn(() => predecessor.disposeForRebootstrap());
    const observedPredecessor: StartedWebGameApplicationV1 = Object.freeze({
      applicationId: predecessor.applicationId,
      host: predecessor.host,
      provenance: predecessor.provenance,
      capabilitySearch: predecessor.capabilitySearch,
      instanceLease: predecessor.instanceLease,
      isDisposed: () => predecessor.isDisposed(),
      dispose: () => predecessor.dispose(),
      invalidateForHmr,
      disposeForRebootstrap,
    });
    const nextInstaller = vi.fn((): InstalledResolvedGameHmrV1 =>
      Object.freeze({ waitForTransition: () => Promise.resolve() })
    );
    const acceptedModule: LabGameApplicationHmrModuleV1 = Object.freeze({
      labGameApplicationV1: applicationWithBuildIdentityV1(
        buildIdentityV1("simulation:stable", "application:accepted"),
      ),
      installLabGameApplicationHmrV1: nextInstaller,
    });
    const viteHot = viteHotFixtureV1();
    const installation = installLabGameApplicationHmrV1(observedPredecessor, {
      viteHot: viteHot.hot,
      currentApplication,
      rootElement: root,
    });
    expect(installation).toBeDefined();

    viteHot.emit(acceptedModule);
    await installation!.waitForTransition();

    expect(viteHot.invalidate).toHaveBeenCalledOnce();
    expect(viteHot.invalidate).toHaveBeenCalledWith("e2e.hmr_application_identity_changed");
    expect(invalidateForHmr).not.toHaveBeenCalled();
    expect(disposeForRebootstrap).not.toHaveBeenCalled();
    expect(nextInstaller).not.toHaveBeenCalled();
    expect(predecessor.isDisposed()).toBe(false);
  });
});

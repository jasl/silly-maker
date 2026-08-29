// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createAgentHostInternalV1,
  createDeterministicFakeAgentSessionConnectorInternalV1,
} from "@sillymaker/agent/internal";
import type { AgentHostInternalV1 } from "@sillymaker/agent/internal";
import { createAgentSessionClientV1 } from "@sillymaker/agent/session";
import { digestBytes } from "@sillymaker/base";
import type { ResolveCoreGameApplicationOptionsV1 } from "@sillymaker/base/runtime";
import {
  createFixedBootstrapEntropyV1,
  createMemoryHostRecordStoreV1,
} from "@sillymaker/base/testkit";
import { createWebHostV1, startWebGameApplicationV1 } from "@sillymaker/web";
import type { StartedWebGameApplicationV1 } from "@sillymaker/web";
import type {
  InstalledResolvedGameHmrV1,
  ResolvedGameHmrHotAdapterV1,
} from "@sillymaker/web/internal/application-hmr";
import {
  createWebGameApplicationRebootstrapStartOptionsInternalV1,
  installWebGameApplicationHmrV1,
  resolveWebGameApplicationHmrProvenanceInternalV1,
  startWebGameApplicationForRebootstrapInternalV1,
} from "@sillymaker/web/internal/application-hmr";

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
const agentHostsV1: AgentHostInternalV1[] = [];

afterEach(async () => {
  for (const host of agentHostsV1.splice(0).toReversed()) await host.dispose();
  for (const started of startedApplicationsV1.splice(0).toReversed()) {
    await started.dispose();
  }
  document.body.replaceChildren();
});

function buildIdentityV1(
  simulationLabel: string,
  applicationLabel = "application",
  presentationLabel = "presentation",
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
      sha256: digest(presentationLabel),
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

async function inFlightAgentV1() {
  const fake = createDeterministicFakeAgentSessionConnectorInternalV1();
  const client = createAgentSessionClientV1({ connector: fake.connector });
  const host = createAgentHostInternalV1({
    client,
    allowedActionIds: ["engine-lab.scene.move-alpha"],
  });
  agentHostsV1.push(host);
  await host.connect();
  await host.start();
  await host.submit("hold through Game R2");
  fake.emit(Object.freeze({
    kind: "output_text_delta",
    sessionId: "session.1",
    runId: "run.1",
    sequence: 1,
    text: "in flight",
  }));
  return Object.freeze({ fake, host });
}

describe("Engine Lab maintained application HMR boundary", () => {
  it("retries an untouched exact handoff after successor construction rejects before Core", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);
    const host = createWebHostV1({ records: createMemoryHostRecordStoreV1() });
    const predecessorApplication = applicationWithBuildIdentityV1(
      buildIdentityV1(
        "simulation:compatible",
        "application",
        "presentation:predecessor",
      ),
    );
    const acceptedApplication = applicationWithBuildIdentityV1(
      buildIdentityV1(
        "simulation:compatible",
        "application",
        "presentation:accepted",
      ),
    );
    const predecessor = await startWebGameApplicationV1(predecessorApplication, {
      rootElement: root,
      host,
      gameBootstrapEntropy: createFixedBootstrapEntropyV1({
        seeds: [20260901],
        uuids: [],
      }),
      registerPageLifecycle: false,
    });
    startedApplicationsV1.push(predecessor);
    const nextBoundary: InstalledResolvedGameHmrV1 = Object.freeze({
      waitForTransition: () => Promise.resolve(),
    });
    const installNextBoundary = vi.fn(() => nextBoundary);
    const acceptedModule = Object.freeze({ application: acceptedApplication });
    const hot = hotFixtureV1<typeof acceptedModule>();
    const preCoreFailure = new Error("synthetic pre-Core construction failure");
    const failures: unknown[] = [];
    const observedHandoffs: unknown[] = [];
    let attempts = 0;
    let successor: StartedWebGameApplicationV1 | undefined;
    const installation = installWebGameApplicationHmrV1({
      started: predecessor,
      hot: hot.hot,
      resolveAcceptedProvenance: (module) =>
        resolveWebGameApplicationHmrProvenanceInternalV1(module.application),
      async startSuccessor({
        module,
        started,
        handoff,
        onRebootstrapStartFailureInternal,
      }) {
        attempts += 1;
        observedHandoffs.push(handoff);
        if (attempts === 1) throw preCoreFailure;
        successor = await startWebGameApplicationForRebootstrapInternalV1(
          module.application,
          Object.freeze({
            ...createWebGameApplicationRebootstrapStartOptionsInternalV1({
              predecessor: started,
              rootElement: root,
              handoff,
              onRebootstrapStartFailureInternal,
            }),
            registerPageLifecycle: false,
          }),
        );
        startedApplicationsV1.push(successor);
        return successor;
      },
      installNextBoundary,
      reportFailure: (error) => failures.push(error),
    });

    hot.emit(acceptedModule);
    await installation.waitForTransition();
    expect(predecessor.isDisposed()).toBe(true);
    expect(failures).toEqual([preCoreFailure]);
    expect(installNextBoundary).not.toHaveBeenCalled();

    hot.emit(acceptedModule);
    await installation.waitForTransition();
    expect(observedHandoffs).toHaveLength(2);
    expect(observedHandoffs[1]).toBe(observedHandoffs[0]);
    expect(successor).toBeDefined();
    expect(successor!.host).toBe(host);
    expect(installNextBoundary).toHaveBeenCalledOnce();
    expect(successor!.instanceLease.state.getCurrent()).toMatchObject({
      role: "owner",
      holderOwnerId: null,
    });
  });

  it("hands a compatible presentation-only R2 candidate to the Web composer on the same Host and root", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);
    const host = createWebHostV1({ records: createMemoryHostRecordStoreV1() });
    const predecessor = await startWebGameApplicationV1(
      applicationWithBuildIdentityV1(
        buildIdentityV1(
          "simulation:compatible",
          "application",
          "presentation:predecessor",
        ),
      ),
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
        buildIdentityV1(
          "simulation:compatible",
          "application",
          "presentation:successor",
        ),
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

  it("does not retire the predecessor for a simulation digest change without adoption", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);
    const host = createWebHostV1({ records: createMemoryHostRecordStoreV1() });
    const predecessor = await startWebGameApplicationV1(
      applicationWithBuildIdentityV1(buildIdentityV1("simulation:predecessor")),
      {
        rootElement: root,
        host,
        gameBootstrapEntropy: createFixedBootstrapEntropyV1({
          seeds: [20260831],
          uuids: [],
        }),
        registerPageLifecycle: false,
      },
    );
    startedApplicationsV1.push(predecessor);
    const predecessorRoot = await within(root).findByRole("application", {
      name: "引擎实验室",
    });
    const installNextBoundary = vi.fn(
      (): InstalledResolvedGameHmrV1 =>
        Object.freeze({ waitForTransition: () => Promise.resolve() }),
    );
    const acceptedModule: LabGameApplicationHmrModuleV1 = Object.freeze({
      labGameApplicationV1: applicationWithBuildIdentityV1(
        buildIdentityV1("simulation:unadopted-successor"),
      ),
      installLabGameApplicationHmrV1: installNextBoundary,
    });
    const hot = hotFixtureV1<LabGameApplicationHmrModuleV1>();
    let successor: StartedWebGameApplicationV1 | undefined;
    const installation = installLabGameApplicationHmrV1(predecessor, {
      hot: hot.hot,
      rootElement: root,
      onSuccessorStarted(started) {
        successor = started;
        startedApplicationsV1.push(started);
      },
    });
    expect(installation).toBeDefined();

    hot.emit(acceptedModule);
    await installation!.waitForTransition();

    expect(predecessor.isDisposed()).toBe(false);
    expect(successor).toBeUndefined();
    expect(installNextBoundary).not.toHaveBeenCalled();
    expect(
      await within(root).findByRole("application", { name: "引擎实验室" }),
    ).toBe(predecessorRoot);
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
    const installation = installLabGameApplicationHmrV1(predecessor, {
      viteHot: viteHot.hot,
      currentApplication,
      rootElement: root,
    });
    expect(installation).toBeDefined();

    viteHot.emit(acceptedModule);
    await installation!.waitForTransition();

    expect(viteHot.invalidate).toHaveBeenCalledOnce();
    expect(viteHot.invalidate).toHaveBeenCalledWith("e2e.hmr_application_identity_changed");
    expect(nextInstaller).not.toHaveBeenCalled();
    expect(predecessor.isDisposed()).toBe(false);
  });

  it("keeps an in-flight Agent sibling and retries with the latest writable Game R2 handoff", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);
    const webHost = createWebHostV1({ records: createMemoryHostRecordStoreV1() });
    const predecessor = await startWebGameApplicationV1(
      applicationWithBuildIdentityV1(
        buildIdentityV1(
          "simulation:compatible",
          "application",
          "presentation:predecessor",
        ),
      ),
      {
        rootElement: root,
        host: webHost,
        gameBootstrapEntropy: createFixedBootstrapEntropyV1({
          seeds: [20260830],
          uuids: [],
        }),
        registerPageLifecycle: false,
      },
    );
    startedApplicationsV1.push(predecessor);
    const { fake, host: agentHost } = await inFlightAgentV1();
    const agentPredecessor = agentHost.getSnapshot();
    const operationCount = fake.getOperations().length;
    expect(agentPredecessor).toMatchObject({
      readiness: "ready",
      sessionId: "session.1",
      run: { runId: "run.1", generation: 2, status: "streaming" },
      session: { status: { kind: "ready" } },
    });

    const successorStartFailure = new Error("accepted Game successor failed in UI start");
    const failingApplication = Object.freeze({
      ...applicationWithBuildIdentityV1(
        buildIdentityV1(
          "simulation:compatible",
          "application",
          "presentation:failing-successor",
        ),
      ),
      ui() {
        throw successorStartFailure;
      },
    }) as typeof labGameApplicationV1;
    const nextBoundary: InstalledResolvedGameHmrV1 = Object.freeze({
      waitForTransition: () => Promise.resolve(),
    });
    const installNextBoundary = vi.fn(() => nextBoundary);
    const failingModule: LabGameApplicationHmrModuleV1 = Object.freeze({
      labGameApplicationV1: failingApplication,
      installLabGameApplicationHmrV1: installNextBoundary,
    });
    let recoveredInstance:
      | Parameters<typeof labGameApplicationV1.ui>[0]["instance"]
      | undefined;
    const recoveredApplication = Object.freeze({
      ...applicationWithBuildIdentityV1(
        buildIdentityV1(
          "simulation:compatible",
          "application",
          "presentation:recovered-successor",
        ),
      ),
      ui(input: Parameters<typeof labGameApplicationV1.ui>[0]) {
        recoveredInstance = input.instance;
        return labGameApplicationV1.ui(input);
      },
    }) as typeof labGameApplicationV1;
    const recoveredModule: LabGameApplicationHmrModuleV1 = Object.freeze({
      labGameApplicationV1: recoveredApplication,
      installLabGameApplicationHmrV1: installNextBoundary,
    });
    const hot = hotFixtureV1<LabGameApplicationHmrModuleV1>();
    const failures: unknown[] = [];
    let successor: StartedWebGameApplicationV1 | undefined;
    const installation = installLabGameApplicationHmrV1(predecessor, {
      hot: hot.hot,
      rootElement: root,
      onSuccessorStarted(started) {
        successor = started;
        startedApplicationsV1.push(started);
      },
      reportFailure: (error) => failures.push(error),
    });
    expect(installation).toBeDefined();

    hot.emit(failingModule);
    await installation!.waitForTransition();
    expect(predecessor.isDisposed()).toBe(true);
    expect(successor).toBeUndefined();
    expect(failures).toEqual([successorStartFailure]);
    expect(agentHost.getSnapshot()).toBe(agentPredecessor);
    expect(fake.getOperations()).toHaveLength(operationCount);
    expect(fake.getConnectionCount()).toBe(1);
    expect(fake.getCloseCount()).toBe(0);

    hot.emit(recoveredModule);
    await installation!.waitForTransition();
    await waitFor(() => expect(successor).toBeDefined());
    expect(successor!.host).toBe(webHost);
    expect(successor!.instanceLease.state.getCurrent()).toMatchObject({
      role: "owner",
      holderOwnerId: null,
    });
    expect(recoveredInstance).toBeDefined();
    await expect(recoveredInstance!.persistence.save("manual.1")).resolves.toMatchObject({
      kind: "saved",
      slotId: "manual.1",
    });
    expect(agentHost.getSnapshot()).toBe(agentPredecessor);
    expect(fake.getOperations()).toHaveLength(operationCount);
    expect(fake.getConnectionCount()).toBe(1);
    expect(fake.getCloseCount()).toBe(0);

    fake.emit(Object.freeze({
      kind: "output_data",
      sessionId: "session.1",
      runId: "run.1",
      sequence: 2,
      value: Object.freeze({
        schemaRevision: 1,
        root: Object.freeze({
          kind: "action",
          nodeId: "artifact.apply",
          label: "应用",
          actionId: "engine-lab.scene.move-alpha",
        }),
      }),
    }));
    fake.emit(Object.freeze({
      kind: "run_completed",
      sessionId: "session.1",
      runId: "run.1",
      sequence: 3,
    }));
    expect(agentHost.getSnapshot()).toMatchObject({
      identity: agentPredecessor.identity,
      sessionId: "session.1",
      run: { runId: "run.1", generation: 2, status: "completed" },
      artifact: { revision: 1, source: { sessionId: "session.1", runId: "run.1" } },
      session: { status: { kind: "ready" } },
    });
  });
});

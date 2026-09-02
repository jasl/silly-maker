// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import { act, cleanup, render, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BrowserProgramRuntimeAgentHostV1 } from "../../../src/agent/browser-program-agent-host-contracts.ts";
import { browserPiDistributionIdentityV1 } from "../../../src/agent/browser-pi-distribution.ts";
import { createProgramRuntimeSurfaceDrainOwnerV1 } from "../../../src/application/program-runtime-controller.ts";
import { getSillyOsCopyV1 } from "../../../src/content/copy.ts";
import type { ProgramSurfaceHostV1 } from "../../../src/program-platform/ui/program-runtime-surface.ts";
import type {
  CreatorAgentPortV1,
  CreatorAgentSnapshotV1,
} from "../runtime-profile/browser-creator-agent-port.ts";
import type {
  CreatorControllerSnapshotV1,
  CreatorControllerV1,
} from "../runtime/creator-controller.ts";
import type { CreatorAgentRunRequestV1, CreatorAgentTerminalRunV1 } from "../runtime/contracts.ts";
import {
  createCreatorProgramSurfaceLifecycleV1,
  CreatorProgramSurfaceV1,
  readCreatorProgramSurfaceDrainBlockerV1,
  settleCreatorOwnedAgentTerminalV1,
  settleCreatorWorkspaceCleanupV1,
  useCreatorProgramAgentPortOwnerV1,
  useCreatorOwnedAgentTerminalSettlementV1,
} from "../ui/creator-program-surface.tsx";

const creatorWorkspaceProbeV1 = vi.hoisted(() => ({
  props: null as Readonly<Record<string, unknown>> | null,
}));

vi.mock("../../../src/program-platform/ui/use-process-execution-monitor.ts", () => ({
  useProcessExecutionMonitorV1: vi.fn(),
}));

vi.mock("../ui/program-workspace.tsx", () => ({
  ProgramWorkspaceV1: (props: Readonly<Record<string, unknown>>) => {
    creatorWorkspaceProbeV1.props = props;
    return null;
  },
}));

function descriptorV1(index: number) {
  return {
    revision: 1 as const,
    programId: "program.creator",
    workspaceId: "workspace.creator",
    workspaceSessionId: `workspace-session.creator.${index}`,
    generation: index,
  };
}

function snapshotV1(
  phase: "closed" | "opening" | "open" | "closing" | "failed" | "forgotten" | "disposed",
  index: number,
): CreatorAgentSnapshotV1 {
  return {
    revision: index,
    phase: "ready",
    distribution: browserPiDistributionIdentityV1,
    activeRunId: null,
    draft: "",
    candidate: null,
    terminalRuns: [],
    diagnostic: null,
    workspace: {
      phase,
      descriptor: phase === "closed" ? null : descriptorV1(index),
      receipts: [],
      lastReceipt: null,
      diagnostic: null,
    },
  };
}

function drainRegistryV1() {
  const drains = new Set<() => Promise<void>>();
  const settlements: Promise<void>[] = [];
  return {
    register(drain: () => Promise<void>): () => void {
      drains.add(drain);
      return () => {
        if (!drains.delete(drain)) return;
        settlements.push(drain());
      };
    },
    settlements,
  };
}

function creatorRunV1(agentRunId: string): CreatorAgentRunRequestV1 {
  return {
    agentRunId,
    programPackage: {
      programId: "program.creator.package",
      packageVersion: "1.0.0",
    },
    processId: "process.creator",
    processAttemptGeneration: 1,
    workspaceCheckpointId: "checkpoint.creator",
    workspaceGeneration: 1,
    proposalId: "proposal.creator",
    programId: "program.creator",
    baseProgramRevision: 1,
    baseRepositoryRevision: 1,
    text: "Refine the Program.",
  };
}

function creatorControllerSnapshotV1(): CreatorControllerSnapshotV1 {
  return {
    revision: 1,
    route: "process",
    catalog: { phase: "ready", summaries: [], nextCursor: null },
    activeProcess: {
      process: {
        processId: "process.creator",
        status: "active",
        activeAttempt: null,
        lastTerminalAttempt: null,
        checkpoint: {
          workspaceId: "workspace.creator",
          workspaceCheckpointId: "checkpoint.creator",
          workspaceGeneration: 1,
        },
      },
      subject: {
        currentProgram: {
          programId: "program.creator",
          revision: 1,
          kind: "general",
          name: "Creator fixture",
          purpose: "Exercise Surface lifecycle",
          requirements: [],
          suggestedCapabilities: [],
        },
        head: { proposal: null },
      },
      transcript: {
        entries: [],
        byteLength: 0,
        nextBeforeSequence: null,
        newerOmitted: false,
        phase: "ready",
      },
      workspaceReview: null,
    },
    durability: { phase: "ready" },
  } as unknown as CreatorControllerSnapshotV1;
}

function creatorControllerV1(input: {
  readonly prepareAgentRun: CreatorControllerV1["prepareAgentRun"];
}): CreatorControllerV1 {
  const snapshot = creatorControllerSnapshotV1();
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    prepareAgentRun: input.prepareAgentRun,
    recordAgentRunTerminal: vi.fn(),
    renewAgentRunLease: vi.fn(),
    refreshActiveProcess: vi.fn(),
    loadOlderTranscript: vi.fn(),
    reloadLatestTranscript: vi.fn(),
    sendFollowUp: vi.fn(async () => ({ kind: "busy" })),
    acceptProposal: vi.fn(),
    rejectProposal: vi.fn(),
    openHome: vi.fn(),
  } as unknown as CreatorControllerV1;
}

function creatorPortHarnessV1(): {
  readonly agentHost: BrowserProgramRuntimeAgentHostV1;
  readonly openWorkspace: ReturnType<typeof vi.fn<CreatorAgentPortV1["openWorkspace"]>>;
  readonly closeWorkspace: ReturnType<typeof vi.fn<CreatorAgentPortV1["closeWorkspace"]>>;
  readonly submit: ReturnType<typeof vi.fn<CreatorAgentPortV1["submit"]>>;
  readonly dispose: ReturnType<typeof vi.fn<CreatorAgentPortV1["dispose"]>>;
} {
  let snapshot = snapshotV1("closed", 1);
  const listeners = new Set<() => void>();
  const emitV1 = (next: CreatorAgentSnapshotV1): void => {
    snapshot = next;
    for (const listener of listeners) listener();
  };
  const openWorkspace = vi.fn<CreatorAgentPortV1["openWorkspace"]>(async () => {
    const descriptor = descriptorV1(1);
    emitV1(snapshotV1("open", 1));
    return { kind: "opened", descriptor };
  });
  const closeWorkspace = vi.fn<CreatorAgentPortV1["closeWorkspace"]>(async () => {
    const descriptor = snapshot.workspace.descriptor;
    if (descriptor === null) return { kind: "idle" };
    emitV1(snapshotV1("closed", 2));
    return { kind: "closed", descriptor };
  });
  const submit = vi.fn<CreatorAgentPortV1["submit"]>();
  const dispose = vi.fn<CreatorAgentPortV1["dispose"]>(async () => {
    emitV1(snapshotV1("disposed", 3));
  });
  const port = {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    configureCredential: vi.fn(),
    configureCredentialHandoff: vi.fn(),
    testConnection: vi.fn(),
    selectModel: vi.fn(),
    selectReasoningEffort: vi.fn(),
    openWorkspace,
    closeWorkspace,
    submit,
    cancel: vi.fn(),
    acknowledgeTerminal: vi.fn(),
    revokeCredential: vi.fn(),
    forget: vi.fn(),
    dispose,
    exportWorkspace: vi.fn(),
    synchronizeNetworkAccess: vi.fn(),
  } as unknown as CreatorAgentPortV1;
  return {
    agentHost: {
      createPort: () => port,
    } as unknown as BrowserProgramRuntimeAgentHostV1,
    openWorkspace,
    closeWorkspace,
    submit,
    dispose,
  };
}

function creatorHostV1(
  agentHost: BrowserProgramRuntimeAgentHostV1,
  registerProgramDrain: ProgramSurfaceHostV1["registerProgramDrain"],
): ProgramSurfaceHostV1 {
  const sessionState = new Map<string, unknown>();
  return {
    copy: getSillyOsCopyV1("en"),
    locale: "en",
    theme: "system",
    agentHost,
    deterministicAgent: false,
    forgetAgent: vi.fn(async () => true),
    agentReadiness: { status: "ready", recoveryTarget: null },
    activeModel: null,
    processNetworkAccess: null,
    providerModel: () => ({
      status: "ready",
      selectedValue: "provider:model",
      options: [],
      reasoningEffort: {
        status: "ready",
        selectedValue: "off",
        options: ["off"],
        onSelect: vi.fn(),
      },
      onSelect: vi.fn(),
      onOpenSettings: vi.fn(),
    }),
    sessionState: {
      read: (key) => sessionState.get(key),
      write: (key, value) => sessionState.set(key, value),
      delete: (key) => {
        sessionState.delete(key);
      },
    },
    onOpenAgentSettings: vi.fn(),
    onLocaleChange: vi.fn(),
    onThemeChange: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenProgramLibrary: vi.fn(async () => true),
    registerProgramDrain,
    registerAgentDrain: () => () => undefined,
    reportFailure: vi.fn(),
  };
}

function requireCreatorSendV1(): (value: string) => Promise<boolean> {
  const send = creatorWorkspaceProbeV1.props?.onSend;
  if (typeof send !== "function") throw new Error("Creator send fixture is unavailable");
  return send as (value: string) => Promise<boolean>;
}

afterEach(() => {
  creatorWorkspaceProbeV1.props = null;
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Creator Program Agent surface lifecycle", () => {
  it("blocks Program drain from Workspace open through deferred run preparation", async () => {
    const owner = createProgramRuntimeSurfaceDrainOwnerV1();
    const port = creatorPortHarnessV1();
    const run = creatorRunV1("agent.run.creator.preparing");
    port.submit.mockResolvedValue({ kind: "submitted", agentRunId: run.agentRunId });
    let observePreparation!: () => void;
    const preparationObserved = new Promise<void>((resolve) => {
      observePreparation = resolve;
    });
    let releasePreparation!: () => void;
    const preparationReleased = new Promise<void>((resolve) => {
      releasePreparation = resolve;
    });
    const prepareAgentRun = vi.fn<CreatorControllerV1["prepareAgentRun"]>(async () => {
      observePreparation();
      await preparationReleased;
      return { kind: "completed", value: { kind: "prepared", run } };
    });
    const view = render(
      <CreatorProgramSurfaceV1
        controller={creatorControllerV1({ prepareAgentRun })}
        host={creatorHostV1(port.agentHost, owner.register)}
      />,
    );

    await waitFor(() =>
      expect(creatorWorkspaceProbeV1.props?.executionWorkspace).toMatchObject({ phase: "closed" })
    );
    let submission!: Promise<boolean>;
    await act(async () => {
      submission = requireCreatorSendV1()(run.text);
      await preparationObserved;
    });
    expect(port.openWorkspace).toHaveBeenCalledOnce();
    await expect(owner.quiesce()).rejects.toThrow("active_run");
    expect(port.closeWorkspace).not.toHaveBeenCalled();
    expect(port.dispose).not.toHaveBeenCalled();

    releasePreparation();
    await act(async () => await expect(submission).resolves.toBe(true));
    await expect(owner.quiesce()).rejects.toThrow("active_run");
    expect(port.closeWorkspace).not.toHaveBeenCalled();

    view.unmount();
    await owner.retire();
    expect(port.dispose).toHaveBeenCalledOnce();
  });

  it("releases the exact Workspace after deferred preparation throws", async () => {
    const owner = createProgramRuntimeSurfaceDrainOwnerV1();
    const port = creatorPortHarnessV1();
    let observePreparation!: () => void;
    const preparationObserved = new Promise<void>((resolve) => {
      observePreparation = resolve;
    });
    let releasePreparation!: () => void;
    const preparationReleased = new Promise<void>((resolve) => {
      releasePreparation = resolve;
    });
    const prepareAgentRun = vi.fn<CreatorControllerV1["prepareAgentRun"]>(async () => {
      observePreparation();
      await preparationReleased;
      throw new Error("prepare failed");
    });
    const view = render(
      <CreatorProgramSurfaceV1
        controller={creatorControllerV1({ prepareAgentRun })}
        host={creatorHostV1(port.agentHost, owner.register)}
      />,
    );

    await waitFor(() => expect(creatorWorkspaceProbeV1.props?.onSend).toBeTypeOf("function"));
    let submission!: Promise<boolean>;
    await act(async () => {
      submission = requireCreatorSendV1()("Prepare a Program.");
      await preparationObserved;
    });
    await expect(owner.quiesce()).rejects.toThrow("active_run");

    releasePreparation();
    await act(async () => await expect(submission).resolves.toBe(false));
    await waitFor(() => expect(port.closeWorkspace).toHaveBeenCalledOnce());
    await expect(owner.quiesce()).resolves.toBeUndefined();

    view.unmount();
    await owner.retire();
    expect(port.dispose).toHaveBeenCalledOnce();
  });

  it("blocks drain for an exact pending submit before the port publishes its run", async () => {
    const port = {
      getSnapshot: () => ({
        ...snapshotV1("open", 1),
        activeRunId: null,
        terminalRuns: [],
      }),
      closeWorkspace: vi.fn(),
      dispose: vi.fn(() => Promise.resolve()),
    };
    const readBlocker = () =>
      readCreatorProgramSurfaceDrainBlockerV1({
        port,
        ownsRun: () => false,
        ownsAnyRun: () => true,
        terminalSettlementPending: false,
      });
    const lifecycle = createCreatorProgramSurfaceLifecycleV1({
      port,
      drainWorkspaceExport: () => Promise.resolve(),
      readBlocker,
      runWorkspaceCloseExclusive: (operation) => operation(),
      reportFailure: vi.fn(),
    });

    expect(readBlocker()).toBe("active_run");
    await expect(lifecycle.quiesce()).rejects.toThrow("active_run");
    expect(port.closeWorkspace).not.toHaveBeenCalled();
    expect(port.dispose).not.toHaveBeenCalled();
  });

  it.each([
    { label: "busy", persistence: { kind: "busy" as const } },
    {
      label: "failed",
      persistence: { kind: "failed" as const, code: "repository_failed" },
    },
  ])("retains exact ownership when terminal persistence is $label", async ({ persistence }) => {
    const acknowledgeTerminal = vi.fn();

    await expect(settleCreatorOwnedAgentTerminalV1({
      agentRunId: "agent.run.creator.1",
      leaseWasLost: false,
      persist: () => Promise.resolve(persistence),
      acknowledgeTerminal,
    })).resolves.toEqual({
      kind: "retained",
      reason: "persistence",
      persistence,
    });
    expect(acknowledgeTerminal).not.toHaveBeenCalled();
  });

  it("retains exact ownership when terminal Workspace acknowledgement is unavailable", async () => {
    const diagnostic = { code: "workspace_busy", path: "/workspace/ack" } as const;

    await expect(settleCreatorOwnedAgentTerminalV1({
      agentRunId: "agent.run.creator.1",
      leaseWasLost: false,
      persist: () =>
        Promise.resolve({
          kind: "completed" as const,
          value: { kind: "applied" as const, outcome: "completed" as const },
        }),
      acknowledgeTerminal: () =>
        Promise.resolve({
          kind: "workspace_unavailable" as const,
          diagnostic,
        }),
    })).resolves.toEqual({
      kind: "retained",
      reason: "workspace_unavailable",
      diagnostic,
    });
  });

  it("releases exact ownership only after acknowledgement or an explicit stale result", async () => {
    const acknowledgeTerminal = vi.fn(() => Promise.resolve({ kind: "acknowledged" as const }));
    await expect(settleCreatorOwnedAgentTerminalV1({
      agentRunId: "agent.run.creator.1",
      leaseWasLost: false,
      persist: () =>
        Promise.resolve({
          kind: "completed" as const,
          value: {
            kind: "stale" as const,
            current: {
              proposalId: "proposal.successor",
              programId: "program.successor",
              baseProgramRevision: 2,
            },
          },
        }),
      acknowledgeTerminal,
    })).resolves.toEqual({ kind: "released" });
    expect(acknowledgeTerminal).toHaveBeenCalledWith("agent.run.creator.1");
  });

  it("retries retained terminals only on the lease cadence across unrelated port publications", async () => {
    vi.useFakeTimers();
    const agentRunId = "agent.run.creator.retry";
    const terminal = {
      run: { agentRunId },
      outcome: "completed",
    } as unknown as CreatorAgentTerminalRunV1;
    const exactPortFixture = {
      acknowledgeTerminal: vi.fn()
        .mockResolvedValueOnce({
          kind: "workspace_unavailable",
          diagnostic: { code: "workspace_busy", path: "/workspace/ack" },
        })
        .mockResolvedValueOnce({ kind: "acknowledged" }),
      getSnapshot: () => ({
        ...snapshotV1("open", 1),
        terminalRuns: [terminal],
      }),
    };
    const exactPort = exactPortFixture as unknown as CreatorAgentPortV1;
    const latestAgentSnapshotRef: { current: CreatorAgentSnapshotV1 | null } = {
      current: {
        ...snapshotV1("open", 1),
        terminalRuns: [terminal],
      } as unknown as CreatorAgentSnapshotV1,
    };
    const ownedRuns = new Map<string, {
      readonly run: CreatorAgentRunRequestV1;
      readonly port: CreatorAgentPortV1;
    }>([[agentRunId, { run: terminal.run, port: exactPort }]]);
    const leaseLostRuns = new Set<string>();
    const terminalSettlingRuns = new Map();
    const terminalSettlementRef = { current: Promise.resolve() };
    const recordAgentRunTerminal = vi.fn()
      .mockResolvedValueOnce({ kind: "failed", code: "repository_failed" })
      .mockResolvedValue({
        kind: "completed",
        value: { kind: "applied", outcome: "completed" },
      });
    const requestWorkspaceCleanup = vi.fn();
    const reportFailure = vi.fn();
    const retryIntervalMilliseconds = 100;
    const view = renderHook(() =>
      useCreatorOwnedAgentTerminalSettlementV1({
        port: exactPort,
        terminalAgentRunId: agentRunId,
        latestAgentSnapshotRef,
        ownedRuns,
        leaseLostRuns,
        terminalSettlingRuns,
        terminalSettlementRef,
        recordAgentRunTerminal,
        requestWorkspaceCleanup,
        reportFailure,
        retryIntervalMilliseconds,
      })
    );

    await act(async () => await terminalSettlementRef.current);
    expect(recordAgentRunTerminal).toHaveBeenCalledTimes(1);
    view.rerender();
    await act(async () => await Promise.resolve());
    expect(recordAgentRunTerminal).toHaveBeenCalledTimes(1);

    await act(async () => await vi.advanceTimersByTimeAsync(99));
    expect(recordAgentRunTerminal).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await terminalSettlementRef.current;
    });
    expect(recordAgentRunTerminal).toHaveBeenCalledTimes(2);
    expect(exactPortFixture.acknowledgeTerminal).toHaveBeenCalledTimes(1);

    latestAgentSnapshotRef.current = {
      ...(latestAgentSnapshotRef.current as CreatorAgentSnapshotV1),
      revision: 2,
    };
    view.rerender();
    await act(async () => await Promise.resolve());
    expect(recordAgentRunTerminal).toHaveBeenCalledTimes(2);
    await act(async () => await vi.advanceTimersByTimeAsync(99));
    expect(recordAgentRunTerminal).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await terminalSettlementRef.current;
    });

    expect(recordAgentRunTerminal).toHaveBeenCalledTimes(3);
    expect(exactPortFixture.acknowledgeTerminal).toHaveBeenCalledTimes(2);
    expect(ownedRuns.has(agentRunId)).toBe(false);
    expect(requestWorkspaceCleanup).toHaveBeenCalledWith("workspace-session.creator.1");
  });

  it("retries the exact live Workspace close before retiring the port", async () => {
    const diagnostic = { code: "workspace_busy", path: "/workspace/close" } as const;
    const closeWorkspace = vi.fn()
      .mockResolvedValueOnce({ kind: "unavailable", diagnostic })
      .mockResolvedValueOnce({ kind: "closed", descriptor: descriptorV1(1) });
    const dispose = vi.fn(() => Promise.resolve());
    const failures: unknown[] = [];
    const lifecycle = createCreatorProgramSurfaceLifecycleV1({
      port: {
        getSnapshot: () => snapshotV1("open", 1),
        closeWorkspace,
        dispose,
      },
      drainWorkspaceExport: () => Promise.resolve(),
      readBlocker: () => null,
      runWorkspaceCloseExclusive: (operation) => operation(),
      reportFailure: (code, error) => failures.push({ code, error }),
    });

    await expect(lifecycle.quiesce()).rejects.toThrow("Creator Agent Workspace close failed");
    expect(dispose).not.toHaveBeenCalled();
    await expect(lifecycle.quiesce()).resolves.toBeUndefined();

    expect(closeWorkspace).toHaveBeenCalledTimes(2);
    expect(closeWorkspace).toHaveBeenNthCalledWith(1, "workspace-session.creator.1");
    expect(closeWorkspace).toHaveBeenNthCalledWith(2, "workspace-session.creator.1");
    expect(dispose).not.toHaveBeenCalled();
    await expect(lifecycle.retire()).resolves.toBeUndefined();
    expect(dispose).toHaveBeenCalledOnce();
    expect(failures).toEqual([{
      code: "silly_os.browser_pi_workspace_close_failed",
      error: diagnostic,
    }]);
  });

  it.each(["forgotten", "disposed"] as const)(
    "leaves a %s Workspace to Host retirement",
    async (phase) => {
      const closeWorkspace = vi.fn();
      const dispose = vi.fn(() => Promise.resolve());
      const lifecycle = createCreatorProgramSurfaceLifecycleV1({
        port: {
          getSnapshot: () => snapshotV1(phase, 1),
          closeWorkspace,
          dispose,
        },
        drainWorkspaceExport: () => Promise.resolve(),
        readBlocker: () => null,
        runWorkspaceCloseExclusive: (operation) => operation(),
        reportFailure: vi.fn(),
      });

      await expect(lifecycle.quiesce()).resolves.toBeUndefined();
      expect(closeWorkspace).not.toHaveBeenCalled();
      expect(dispose).not.toHaveBeenCalled();
      await expect(lifecycle.retire()).resolves.toBeUndefined();
      expect(dispose).toHaveBeenCalledOnce();
    },
  );

  it("closes an exact failed Workspace before retiring the port", async () => {
    const closeWorkspace = vi.fn(() =>
      Promise.resolve({ kind: "closed" as const, descriptor: descriptorV1(1) })
    );
    const dispose = vi.fn(() => Promise.resolve());
    const lifecycle = createCreatorProgramSurfaceLifecycleV1({
      port: {
        getSnapshot: () => snapshotV1("failed", 1),
        closeWorkspace,
        dispose,
      },
      drainWorkspaceExport: () => Promise.resolve(),
      readBlocker: () => null,
      runWorkspaceCloseExclusive: (operation) => operation(),
      reportFailure: vi.fn(),
    });

    await expect(lifecycle.quiesce()).resolves.toBeUndefined();
    expect(closeWorkspace).toHaveBeenCalledOnce();
    expect(closeWorkspace).toHaveBeenCalledWith("workspace-session.creator.1");
    expect(dispose).not.toHaveBeenCalled();
    await expect(lifecycle.retire()).resolves.toBeUndefined();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("does not let a predecessor cleanup close a successor Workspace session", async () => {
    const closeWorkspace = vi.fn();
    await expect(settleCreatorWorkspaceCleanupV1({
      port: {
        getSnapshot: () => snapshotV1("open", 2),
        closeWorkspace,
      },
      workspaceSessionId: "workspace-session.creator.1",
      reportFailure: vi.fn(),
    })).resolves.toBe("released");
    expect(closeWorkspace).not.toHaveBeenCalled();
  });

  it.each(["protocol_invalid", "storage_unavailable"] as const)(
    "retains a permanent %s Workspace close failure without scheduling automatic retry",
    async (diagnosticCode) => {
      const diagnostic = { code: diagnosticCode, path: "/workspace/close" } as const;
      const closeWorkspace = vi.fn(() =>
        Promise.resolve({ kind: "unavailable" as const, diagnostic })
      );
      const reportFailure = vi.fn();

      await expect(settleCreatorWorkspaceCleanupV1({
        port: {
          getSnapshot: () => snapshotV1("open", 1),
          closeWorkspace,
        },
        workspaceSessionId: "workspace-session.creator.1",
        reportFailure,
      })).resolves.toBe("blocked");

      expect(closeWorkspace).toHaveBeenCalledOnce();
      expect(reportFailure).toHaveBeenCalledWith(
        "silly_os.browser_pi_workspace_close_failed",
        diagnostic,
      );
    },
  );

  it("retires each effect-owned port without competing for Workspace close", async () => {
    const events: string[] = [];
    const ports: CreatorAgentPortV1[] = [];
    const createPort = vi.fn(() => {
      const index = ports.length + 1;
      let snapshot = snapshotV1("open", index);
      const port = {
        getSnapshot: () => snapshot,
        subscribe: () => () => undefined,
        closeWorkspace: (workspaceSessionId: string) => {
          events.push(`close:${workspaceSessionId}`);
          const descriptor = snapshot.workspace.descriptor!;
          snapshot = snapshotV1("closed", index);
          return Promise.resolve({ kind: "closed" as const, descriptor });
        },
        dispose: () => {
          events.push(`dispose:${index}`);
          return Promise.resolve();
        },
      } as unknown as CreatorAgentPortV1;
      ports.push(port);
      return port;
    });
    const firstHost = { createPort } as unknown as BrowserProgramRuntimeAgentHostV1;
    const secondHost = { createPort } as unknown as BrowserProgramRuntimeAgentHostV1;
    const agentRegistry = drainRegistryV1();
    const programDrainOwner = createProgramRuntimeSurfaceDrainOwnerV1();
    const readWorkspaceExportDrain = () => () => Promise.resolve();
    const readPortDrainBlocker = () => null;
    const revokePortOwnership = vi.fn();
    const runWorkspaceCloseExclusive = <T,>(operation: () => Promise<T>) => operation();
    const reportFailure = vi.fn();
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );

    const initialProps: { readonly agentHost: BrowserProgramRuntimeAgentHostV1 | null } = {
      agentHost: firstHost,
    };
    const view = renderHook(
      ({ agentHost }: { readonly agentHost: BrowserProgramRuntimeAgentHostV1 | null }) =>
        useCreatorProgramAgentPortOwnerV1({
          agentHost,
          registerAgentDrain: agentRegistry.register,
          registerProgramDrain: programDrainOwner.register,
          readWorkspaceExportDrain,
          readPortDrainBlocker,
          revokePortOwnership,
          runWorkspaceCloseExclusive,
          reportFailure,
        }),
      { initialProps, wrapper },
    );

    await waitFor(() => expect(ports).toHaveLength(1));
    view.rerender({ agentHost: null });
    await waitFor(() => expect(view.result.current).toBeNull());
    await act(async () => {
      await Promise.all([...agentRegistry.settlements, programDrainOwner.retire()]);
    });
    expect(events).toContain("dispose:1");
    expect(events.some((event) => event.startsWith("close:"))).toBe(false);
    expect(revokePortOwnership).toHaveBeenCalledTimes(1);

    view.rerender({ agentHost: secondHost });
    await waitFor(() => expect(ports).toHaveLength(2));
    expect(view.result.current?.getSnapshot().workspace.descriptor?.workspaceSessionId).toBe(
      "workspace-session.creator.2",
    );

    view.unmount();
    await act(async () => {
      await Promise.all([...agentRegistry.settlements, programDrainOwner.retire()]);
    });
    expect(events).toEqual(expect.arrayContaining([
      "dispose:1",
      "dispose:2",
    ]));
    expect(events.some((event) => event.startsWith("close:"))).toBe(false);
    expect(revokePortOwnership).toHaveBeenCalledTimes(2);
  });

  it.each(
    [
      "active_run",
      "retained_terminal",
      "terminal_settlement",
    ] as const,
  )("refuses to close or dispose while the exact port owns %s", async (blocker) => {
    const closeWorkspace = vi.fn();
    const dispose = vi.fn(() => Promise.resolve());
    const lifecycle = createCreatorProgramSurfaceLifecycleV1({
      port: {
        getSnapshot: () => snapshotV1("open", 1),
        closeWorkspace,
        dispose,
      },
      drainWorkspaceExport: vi.fn(() => Promise.resolve()),
      readBlocker: () => blocker,
      runWorkspaceCloseExclusive: (operation) => operation(),
      reportFailure: vi.fn(),
    });

    await expect(lifecycle.quiesce()).rejects.toThrow(blocker);
    expect(closeWorkspace).not.toHaveBeenCalled();
    expect(dispose).not.toHaveBeenCalled();
  });

  it("rechecks retained terminals after the exact Workspace closes", async () => {
    const closeWorkspace = vi.fn(() =>
      Promise.resolve({
        kind: "closed" as const,
        descriptor: descriptorV1(1),
      })
    );
    const dispose = vi.fn(() => Promise.resolve());
    let reads = 0;
    const lifecycle = createCreatorProgramSurfaceLifecycleV1({
      port: {
        getSnapshot: () => snapshotV1("open", 1),
        closeWorkspace,
        dispose,
      },
      drainWorkspaceExport: () => Promise.resolve(),
      readBlocker: () => ++reads === 3 ? "retained_terminal" : null,
      runWorkspaceCloseExclusive: (operation) => operation(),
      reportFailure: vi.fn(),
    });

    await expect(lifecycle.quiesce()).rejects.toThrow("retained_terminal");
    expect(closeWorkspace).toHaveBeenCalledOnce();
    expect(dispose).not.toHaveBeenCalled();
  });
});

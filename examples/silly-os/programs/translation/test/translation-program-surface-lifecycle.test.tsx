// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BrowserProgramAgentHostV1 } from "../../../src/agent/browser-program-agent-host-contracts.ts";
import type {
  BrowserProgramAgentCloseWorkspaceResultV1,
  BrowserProgramAgentWorkspaceSnapshotV1,
} from "../../../src/agent/browser-program-agent-port-contracts.ts";
import { browserPiDistributionIdentityV1 } from "../../../src/agent/browser-pi-distribution.ts";
import { createProgramRuntimeSurfaceDrainOwnerV1 } from "../../../src/application/program-runtime-controller.ts";
import { getSillyOsCopyV1 } from "../../../src/content/copy.ts";
import { defaultProcessExecutionLeaseRenewalIntervalMillisecondsV1 } from "../../../src/program-platform/process/process-execution-repository.ts";
import type { ProgramSurfaceHostV1 } from "../../../src/program-platform/ui/program-runtime-surface.ts";
import { useProcessExecutionMonitorV1 } from "../../../src/program-platform/ui/use-process-execution-monitor.ts";
import type { WorkspaceExecutionDescriptorV1 } from "../../../src/workspace/contracts.ts";
import type {
  TranslationAgentPortV1,
  TranslationAgentSnapshotV1,
} from "../runtime-profile/browser-translation-agent-port.ts";
import { createTranslationProgramAgentPortV1 } from "../runtime-profile/browser-translation-agent-port.ts";
import type {
  TranslationFollowUpAgentRunRequestV1,
  TranslationAgentTerminalRunV1,
} from "../runtime/translation-agent-contracts.ts";
import type {
  TranslationProcessControllerSnapshotV1,
  TranslationProcessControllerV1,
} from "../runtime/translation-process-controller.ts";
import { TranslationProgramSurfaceV1 } from "../ui/translation-program-surface.tsx";

const workspaceProbeV1 = vi.hoisted(() => ({
  props: null as Readonly<Record<string, unknown>> | null,
}));

vi.mock("../runtime-profile/browser-translation-agent-port.ts", () => ({
  createTranslationProgramAgentPortV1: vi.fn(),
}));

vi.mock("../../../src/program-platform/ui/use-process-execution-monitor.ts", () => ({
  useProcessExecutionMonitorV1: vi.fn(),
}));

vi.mock("../ui/translation-process-workspace.tsx", () => ({
  TranslationProcessWorkspaceV1: (props: Readonly<Record<string, unknown>>) => {
    workspaceProbeV1.props = props;
    return null;
  },
}));

interface TranslationPortHarnessV1 {
  readonly port: TranslationAgentPortV1;
  readonly closeWorkspace: ReturnType<typeof vi.fn<TranslationAgentPortV1["closeWorkspace"]>>;
  readonly dispose: ReturnType<typeof vi.fn<TranslationAgentPortV1["dispose"]>>;
  readonly openWorkspace: ReturnType<typeof vi.fn<TranslationAgentPortV1["openWorkspace"]>>;
  readonly submit: ReturnType<typeof vi.fn<TranslationAgentPortV1["submit"]>>;
  readonly acknowledgeTerminal: ReturnType<
    typeof vi.fn<TranslationAgentPortV1["acknowledgeTerminal"]>
  >;
  enqueueClose(result: BrowserProgramAgentCloseWorkspaceResultV1): void;
  setWorkspace(
    workspace: BrowserProgramAgentWorkspaceSnapshotV1,
    phase?: TranslationAgentSnapshotV1["phase"],
  ): void;
  setRun(input: {
    readonly phase: TranslationAgentSnapshotV1["phase"];
    readonly activeRunId: string | null;
    readonly terminalRuns: readonly TranslationAgentTerminalRunV1[];
  }): void;
}

const workspaceDescriptorV1: WorkspaceExecutionDescriptorV1 = {
  revision: 1,
  programId: "program.translation",
  workspaceId: "workspace.translation",
  workspaceSessionId: "workspace.session.translation.1",
  generation: 1,
};

function followUpRunV1(agentRunId: string): TranslationFollowUpAgentRunRequestV1 {
  return {
    kind: "follow_up",
    agentRunId,
    programPackage: {
      programId: workspaceDescriptorV1.programId,
      packageVersion: "1.0.0",
      contentDigest: "a".repeat(64),
    },
    processId: "process.translation",
    processAttemptGeneration: 1,
    workspaceCheckpointId: "checkpoint.translation.1",
    workspaceGeneration: 1,
    programId: workspaceDescriptorV1.programId,
    expectedWorksetRevision: 1,
    requestedOutputTokens: 1_024,
    instruction: "Review the completed translation.",
    context: {
      worksetRevision: 1,
      title: "Fixture",
      sourceFileName: "fixture.md",
      documentFormat: "markdown",
      sourceLocale: "en",
      targetLocale: "zh-CN",
      documentPurpose: "test",
      style: "plain",
      translatedUnitCount: 1,
      acceptedBatchCount: 1,
      recentConversation: [],
    },
  };
}

function preparedAgentBatchV1(
  run: TranslationFollowUpAgentRunRequestV1,
): Awaited<ReturnType<TranslationProcessControllerV1["prepareAgentBatch"]>> {
  return { kind: "completed", value: { kind: "prepared", run } };
}

function requireSubmitInstructionV1(): (value: string) => Promise<boolean> {
  const submit = workspaceProbeV1.props?.onSubmitInstruction;
  if (typeof submit !== "function") throw new Error("Translation submit fixture is unavailable");
  return submit as (value: string) => Promise<boolean>;
}

function closedWorkspaceV1(): BrowserProgramAgentWorkspaceSnapshotV1 {
  return {
    phase: "closed",
    descriptor: null,
    receipts: [],
    lastReceipt: null,
    diagnostic: null,
  };
}

function openWorkspaceV1(
  descriptor: WorkspaceExecutionDescriptorV1 = workspaceDescriptorV1,
): BrowserProgramAgentWorkspaceSnapshotV1 {
  return {
    phase: "open",
    descriptor,
    receipts: [],
    lastReceipt: null,
    diagnostic: null,
  };
}

function failedWorkspaceV1(
  descriptor: WorkspaceExecutionDescriptorV1 = workspaceDescriptorV1,
): BrowserProgramAgentWorkspaceSnapshotV1 {
  return {
    phase: "failed",
    descriptor,
    receipts: [],
    lastReceipt: null,
    diagnostic: { code: "protocol_invalid", path: "/workspace/receipt" },
  };
}

function createTranslationPortHarnessV1(
  initialWorkspace: BrowserProgramAgentWorkspaceSnapshotV1 = closedWorkspaceV1(),
): TranslationPortHarnessV1 {
  let snapshot: TranslationAgentSnapshotV1 = {
    revision: 1,
    phase: "ready",
    distribution: browserPiDistributionIdentityV1,
    activeRunId: null,
    candidate: null,
    draft: "",
    terminalRuns: [],
    diagnostic: null,
    workspace: initialWorkspace,
  };
  const listeners = new Set<() => void>();
  const closeResults: BrowserProgramAgentCloseWorkspaceResultV1[] = [];
  const emitV1 = (next: TranslationAgentSnapshotV1): void => {
    snapshot = next;
    for (const listener of listeners) listener();
  };
  const setWorkspace = (
    workspace: BrowserProgramAgentWorkspaceSnapshotV1,
    phase: TranslationAgentSnapshotV1["phase"] = snapshot.phase,
  ): void => emitV1({ ...snapshot, revision: snapshot.revision + 1, phase, workspace });
  const openWorkspace = vi.fn<TranslationAgentPortV1["openWorkspace"]>(async (input) => {
    const descriptor: WorkspaceExecutionDescriptorV1 = {
      revision: 1,
      programId: input.programId,
      workspaceId: input.workspaceId,
      workspaceSessionId: workspaceDescriptorV1.workspaceSessionId,
      generation: 1,
    };
    setWorkspace(openWorkspaceV1(descriptor));
    return { kind: "opened", descriptor };
  });
  const closeWorkspace = vi.fn<TranslationAgentPortV1["closeWorkspace"]>(async () => {
    const descriptor = snapshot.workspace.descriptor;
    const next = closeResults.shift() ??
      (descriptor === null ? { kind: "idle" as const } : { kind: "closed" as const, descriptor });
    if (next.kind === "closed") setWorkspace(closedWorkspaceV1());
    return next;
  });
  const dispose = vi.fn<TranslationAgentPortV1["dispose"]>(async () => {
    setWorkspace({
      phase: "disposed",
      descriptor: null,
      receipts: [],
      lastReceipt: null,
      diagnostic: null,
    }, "disposed");
  });
  const submit = vi.fn<TranslationAgentPortV1["submit"]>();
  const acknowledgeTerminal = vi.fn<TranslationAgentPortV1["acknowledgeTerminal"]>();
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
    acknowledgeTerminal,
    revokeCredential: vi.fn(),
    forget: vi.fn(),
    dispose,
  } as unknown as TranslationAgentPortV1;
  return {
    port,
    closeWorkspace,
    dispose,
    openWorkspace,
    submit,
    acknowledgeTerminal,
    enqueueClose(result) {
      closeResults.push(result);
    },
    setWorkspace,
    setRun(input) {
      emitV1({
        ...snapshot,
        revision: snapshot.revision + 1,
        phase: input.phase,
        activeRunId: input.activeRunId,
        terminalRuns: input.terminalRuns,
      });
    },
  };
}

function controllerSnapshotV1(
  activeAttemptId: string | null = null,
): TranslationProcessControllerSnapshotV1 {
  return {
    revision: 1,
    route: "process",
    durability: { phase: "ready" },
    sourceImport: { phase: "idle" },
    activeProcess: {
      process: {
        processId: "process.translation",
        activeAttempt: activeAttemptId === null
          ? null
          : { attemptId: activeAttemptId, generation: 1 },
      },
      programPackage: {
        reference: {
          programId: workspaceDescriptorV1.programId,
          packageVersion: "1.0.0",
          contentDigest: "a".repeat(64),
        },
        instructions: "Translate one admitted batch while preserving meaning.",
      },
      workspace: { workspaceId: workspaceDescriptorV1.workspaceId },
    },
  } as unknown as TranslationProcessControllerSnapshotV1;
}

function controllerV1(input: {
  readonly prepareAgentBatch?: TranslationProcessControllerV1["prepareAgentBatch"];
  readonly recordAgentRunTerminal?: TranslationProcessControllerV1["recordAgentRunTerminal"];
  readonly activeAttemptId?: string | null;
} = {}): TranslationProcessControllerV1 {
  const snapshot = controllerSnapshotV1(input.activeAttemptId ?? null);
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    prepareAgentBatch: input.prepareAgentBatch ?? vi.fn(),
    recordAgentRunTerminal: input.recordAgentRunTerminal ?? vi.fn(),
    renewAgentRunLease: vi.fn(),
    refreshActiveProcess: vi.fn(async () => ({ kind: "completed", value: false })),
    loadTranslationRowWindow: vi.fn(),
    exportCompletedTranslation: vi.fn(),
    loadOlderTranscript: vi.fn(),
    reloadLatestTranscript: vi.fn(),
    updateSettingsOverride: vi.fn(),
    acceptPendingCandidate: vi.fn(),
    rejectPendingCandidate: vi.fn(),
    importSource: vi.fn(),
    openHome: vi.fn(() => false),
  } as unknown as TranslationProcessControllerV1;
}

function hostV1(
  registerProgramDrain: ProgramSurfaceHostV1["registerProgramDrain"],
  reportFailure = vi.fn(),
  agentHost: BrowserProgramAgentHostV1 = {} as BrowserProgramAgentHostV1,
  registerAgentDrain: ProgramSurfaceHostV1["registerAgentDrain"] = () => () => undefined,
): ProgramSurfaceHostV1 {
  const sessionState = new Map<string, unknown>();
  return {
    copy: getSillyOsCopyV1("en"),
    locale: "en",
    theme: "system",
    agentHost,
    deterministicAgent: true,
    forgetAgent: vi.fn(async () => true),
    agentReadiness: { status: "ready", recoveryTarget: null },
    activeModel: { contextWindow: 32_768, maximumOutputTokens: 4_096 },
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
    registerAgentDrain,
    reportFailure,
  };
}

afterEach(async () => {
  workspaceProbeV1.props = null;
  vi.mocked(createTranslationProgramAgentPortV1).mockReset();
  vi.mocked(useProcessExecutionMonitorV1).mockClear();
  vi.useRealTimers();
  cleanup();
  await act(async () => await Promise.resolve());
});

describe("Translation Program Surface lifecycle", () => {
  it("retires through the Agent drain without competing for Workspace close", async () => {
    const owner = createProgramRuntimeSurfaceDrainOwnerV1();
    const port = createTranslationPortHarnessV1(openWorkspaceV1());
    vi.mocked(createTranslationProgramAgentPortV1).mockReturnValue(port.port);
    let agentDrain: (() => Promise<void>) | null = null;
    const view = render(
      <TranslationProgramSurfaceV1
        controller={controllerV1()}
        host={hostV1(
          owner.register,
          vi.fn(),
          {} as BrowserProgramAgentHostV1,
          (drain) => {
            agentDrain = drain;
            return () => undefined;
          },
        )}
      />,
    );

    await waitFor(() => expect(agentDrain).not.toBeNull());
    await act(async () => await agentDrain!());

    expect(port.dispose).toHaveBeenCalledOnce();
    expect(port.closeWorkspace).not.toHaveBeenCalled();
    await expect(owner.quiesce()).resolves.toBeUndefined();
    expect(port.closeWorkspace).not.toHaveBeenCalled();
    view.unmount();
    await owner.retire();
  });

  it("waits for Workspace close and retries a failed Program drain", async () => {
    const owner = createProgramRuntimeSurfaceDrainOwnerV1();
    const port = createTranslationPortHarnessV1(openWorkspaceV1());
    port.enqueueClose({
      kind: "unavailable",
      diagnostic: { code: "workspace_busy", path: "/workspace" },
    });
    port.enqueueClose({ kind: "closed", descriptor: workspaceDescriptorV1 });
    vi.mocked(createTranslationProgramAgentPortV1).mockReturnValue(port.port);
    const reportFailure = vi.fn();
    render(
      <TranslationProgramSurfaceV1
        controller={controllerV1()}
        host={hostV1(owner.register, reportFailure)}
      />,
    );

    await waitFor(() => expect(workspaceProbeV1.props).not.toBeNull());
    await expect(owner.quiesce()).rejects.toThrow("Workspace close failed");
    expect(port.dispose).not.toHaveBeenCalled();
    await expect(owner.quiesce()).resolves.toBeUndefined();
    expect(port.closeWorkspace).toHaveBeenCalledTimes(2);
    expect(port.dispose).not.toHaveBeenCalled();
    await expect(owner.retire()).resolves.toBeUndefined();
    expect(port.dispose).toHaveBeenCalledTimes(1);
    expect(reportFailure).toHaveBeenCalledWith(
      "silly_os.translation_agent_workspace_close_failed",
      expect.anything(),
    );
  });

  it("closes a protocol-failed Workspace before a successor submission opens it", async () => {
    const owner = createProgramRuntimeSurfaceDrainOwnerV1();
    const port = createTranslationPortHarnessV1(failedWorkspaceV1());
    const run = followUpRunV1("agent-run.translation.after-workspace-failure");
    port.submit.mockResolvedValue({ kind: "submitted", agentRunId: run.agentRunId });
    vi.mocked(createTranslationProgramAgentPortV1).mockReturnValue(port.port);
    const prepareAgentBatch = vi.fn<TranslationProcessControllerV1["prepareAgentBatch"]>(
      async () => preparedAgentBatchV1(run),
    );
    const view = render(
      <TranslationProgramSurfaceV1
        controller={controllerV1({ prepareAgentBatch })}
        host={hostV1(owner.register)}
      />,
    );

    await waitFor(() => expect(workspaceProbeV1.props?.onSubmitInstruction).toBeTypeOf("function"));
    await expect(owner.quiesce()).resolves.toBeUndefined();
    expect(port.closeWorkspace).toHaveBeenCalledOnce();
    expect(port.closeWorkspace).toHaveBeenCalledWith(
      workspaceDescriptorV1.workspaceSessionId,
    );

    await act(async () => {
      await expect(requireSubmitInstructionV1()(run.instruction)).resolves.toBe(true);
    });
    expect(port.openWorkspace).toHaveBeenCalledOnce();
    expect(port.submit).toHaveBeenCalledWith(run);

    view.unmount();
    await owner.retire();
  });

  it("blocks a successor submission until failed Workspace cleanup succeeds", async () => {
    vi.useFakeTimers();
    const owner = createProgramRuntimeSurfaceDrainOwnerV1();
    const port = createTranslationPortHarnessV1();
    port.enqueueClose({
      kind: "unavailable",
      diagnostic: { code: "workspace_busy", path: "/workspace" },
    });
    port.enqueueClose({ kind: "closed", descriptor: workspaceDescriptorV1 });
    vi.mocked(createTranslationProgramAgentPortV1).mockReturnValue(port.port);
    const prepareAgentBatch = vi.fn<TranslationProcessControllerV1["prepareAgentBatch"]>(
      async () => ({ kind: "busy" }),
    );
    render(
      <TranslationProgramSurfaceV1
        controller={controllerV1({ prepareAgentBatch })}
        host={hostV1(owner.register)}
      />,
    );

    await act(async () => await Promise.resolve());
    expect(workspaceProbeV1.props?.onSubmitInstruction).toBeTypeOf("function");
    const firstSubmit = workspaceProbeV1.props?.onSubmitInstruction as (
      instruction: string,
    ) => Promise<boolean>;
    await act(async () => {
      await expect(firstSubmit("Translate the next batch.")).resolves.toBe(false);
    });
    await act(async () => await Promise.resolve());
    expect(port.closeWorkspace).toHaveBeenCalledTimes(1);
    expect(workspaceProbeV1.props?.onSubmitInstruction).toBeUndefined();
    expect(port.openWorkspace).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        defaultProcessExecutionLeaseRenewalIntervalMillisecondsV1,
      );
    });
    await act(async () => await Promise.resolve());
    expect(port.closeWorkspace).toHaveBeenCalledTimes(2);
    expect(workspaceProbeV1.props?.onSubmitInstruction).toBeTypeOf("function");
    expect(port.openWorkspace).toHaveBeenCalledTimes(1);
    await owner.retire();
  });

  it.each(["protocol_invalid", "storage_unavailable"] as const)(
    "does not loop on a permanent %s Workspace cleanup failure",
    async (diagnosticCode) => {
      vi.useFakeTimers();
      const owner = createProgramRuntimeSurfaceDrainOwnerV1();
      const port = createTranslationPortHarnessV1();
      port.enqueueClose({
        kind: "unavailable",
        diagnostic: { code: diagnosticCode, path: "/workspace/close" },
      });
      port.enqueueClose({ kind: "closed", descriptor: workspaceDescriptorV1 });
      vi.mocked(createTranslationProgramAgentPortV1).mockReturnValue(port.port);
      const prepareAgentBatch = vi.fn<TranslationProcessControllerV1["prepareAgentBatch"]>(
        async () => ({ kind: "busy" }),
      );
      render(
        <TranslationProgramSurfaceV1
          controller={controllerV1({ prepareAgentBatch })}
          host={hostV1(owner.register)}
        />,
      );

      await act(async () => await Promise.resolve());
      await act(async () => {
        await expect(requireSubmitInstructionV1()("Translate the next batch.")).resolves.toBe(
          false,
        );
        await Promise.resolve();
      });
      expect(port.closeWorkspace).toHaveBeenCalledOnce();
      expect(workspaceProbeV1.props?.onSubmitInstruction).toBeUndefined();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(
          defaultProcessExecutionLeaseRenewalIntervalMillisecondsV1 * 2,
        );
      });
      expect(port.closeWorkspace).toHaveBeenCalledOnce();

      await owner.quiesce();
      expect(port.closeWorkspace).toHaveBeenCalledTimes(2);
      expect(port.dispose).not.toHaveBeenCalled();
      await owner.retire();
      expect(port.dispose).toHaveBeenCalledOnce();
    },
  );

  it("keeps an active owned run mounted instead of cancelling it through Workspace close", async () => {
    const owner = createProgramRuntimeSurfaceDrainOwnerV1();
    const port = createTranslationPortHarnessV1();
    const run = followUpRunV1("agent-run.translation.active");
    port.submit.mockResolvedValue({ kind: "submitted", agentRunId: run.agentRunId });
    vi.mocked(createTranslationProgramAgentPortV1).mockReturnValue(port.port);
    const prepareAgentBatch = vi.fn<TranslationProcessControllerV1["prepareAgentBatch"]>(
      async () => preparedAgentBatchV1(run),
    );
    const view = render(
      <TranslationProgramSurfaceV1
        controller={controllerV1({ prepareAgentBatch, activeAttemptId: run.agentRunId })}
        host={hostV1(owner.register)}
      />,
    );

    await waitFor(() => expect(workspaceProbeV1.props?.onSubmitInstruction).toBeTypeOf("function"));
    await act(async () => {
      await expect(requireSubmitInstructionV1()(run.instruction)).resolves.toBe(true);
      port.setRun({ phase: "running", activeRunId: run.agentRunId, terminalRuns: [] });
    });

    await expect(owner.quiesce()).rejects.toThrow("terminal is still pending");
    expect(port.closeWorkspace).not.toHaveBeenCalled();
    expect(port.dispose).not.toHaveBeenCalled();

    view.unmount();
    await owner.retire();
    expect(port.dispose).toHaveBeenCalledOnce();
  });

  it("blocks Program drain from Workspace open through deferred run preparation", async () => {
    const owner = createProgramRuntimeSurfaceDrainOwnerV1();
    const port = createTranslationPortHarnessV1();
    const run = followUpRunV1("agent-run.translation.preparing");
    port.submit.mockResolvedValue({ kind: "submitted", agentRunId: run.agentRunId });
    vi.mocked(createTranslationProgramAgentPortV1).mockReturnValue(port.port);
    let observePreparation!: () => void;
    const preparationObserved = new Promise<void>((resolve) => {
      observePreparation = resolve;
    });
    let releasePreparation!: () => void;
    const preparationReleased = new Promise<void>((resolve) => {
      releasePreparation = resolve;
    });
    const prepareAgentBatch = vi.fn<TranslationProcessControllerV1["prepareAgentBatch"]>(
      async () => {
        observePreparation();
        await preparationReleased;
        return preparedAgentBatchV1(run);
      },
    );
    const view = render(
      <TranslationProgramSurfaceV1
        controller={controllerV1({ prepareAgentBatch })}
        host={hostV1(owner.register)}
      />,
    );

    await waitFor(() => expect(workspaceProbeV1.props?.onSubmitInstruction).toBeTypeOf("function"));
    let submission!: Promise<boolean>;
    await act(async () => {
      submission = requireSubmitInstructionV1()(run.instruction);
      await preparationObserved;
    });
    expect(port.openWorkspace).toHaveBeenCalledOnce();
    await expect(owner.quiesce()).rejects.toThrow("preparation is still pending");
    expect(port.closeWorkspace).not.toHaveBeenCalled();
    expect(port.dispose).not.toHaveBeenCalled();

    releasePreparation();
    await act(async () => await expect(submission).resolves.toBe(true));
    await expect(owner.quiesce()).rejects.toThrow("terminal is still pending");
    expect(port.closeWorkspace).not.toHaveBeenCalled();

    view.unmount();
    await owner.retire();
    expect(port.dispose).toHaveBeenCalledOnce();
  });

  it("releases the exact Workspace after deferred preparation throws", async () => {
    const owner = createProgramRuntimeSurfaceDrainOwnerV1();
    const port = createTranslationPortHarnessV1();
    vi.mocked(createTranslationProgramAgentPortV1).mockReturnValue(port.port);
    let observePreparation!: () => void;
    const preparationObserved = new Promise<void>((resolve) => {
      observePreparation = resolve;
    });
    let releasePreparation!: () => void;
    const preparationReleased = new Promise<void>((resolve) => {
      releasePreparation = resolve;
    });
    const prepareAgentBatch = vi.fn<TranslationProcessControllerV1["prepareAgentBatch"]>(
      async () => {
        observePreparation();
        await preparationReleased;
        throw new Error("prepare failed");
      },
    );
    const view = render(
      <TranslationProgramSurfaceV1
        controller={controllerV1({ prepareAgentBatch })}
        host={hostV1(owner.register)}
      />,
    );

    await waitFor(() => expect(workspaceProbeV1.props?.onSubmitInstruction).toBeTypeOf("function"));
    let submission!: Promise<boolean>;
    await act(async () => {
      submission = requireSubmitInstructionV1()("Translate the next batch.");
      await preparationObserved;
    });
    await expect(owner.quiesce()).rejects.toThrow("preparation is still pending");

    releasePreparation();
    await act(async () => await expect(submission).resolves.toBe(false));
    await waitFor(() => expect(port.closeWorkspace).toHaveBeenCalledOnce());
    await expect(owner.quiesce()).resolves.toBeUndefined();

    view.unmount();
    await owner.retire();
    expect(port.dispose).toHaveBeenCalledOnce();
  });

  it("retains a terminal across persistence and acknowledgement failures until retry succeeds", async () => {
    vi.useFakeTimers();
    const owner = createProgramRuntimeSurfaceDrainOwnerV1();
    const port = createTranslationPortHarnessV1();
    const run = followUpRunV1("agent-run.translation.retry");
    const terminal: TranslationAgentTerminalRunV1 = {
      run,
      outcome: "completed",
      assistantReply: "The translation is ready for review.",
    };
    port.submit.mockResolvedValue({ kind: "submitted", agentRunId: run.agentRunId });
    port.acknowledgeTerminal
      .mockResolvedValueOnce({
        kind: "workspace_unavailable",
        diagnostic: { code: "storage_unavailable", path: "/workspace/acknowledge" },
      })
      .mockImplementationOnce(async () => {
        port.setRun({ phase: "ready", activeRunId: null, terminalRuns: [] });
        return { kind: "acknowledged" };
      });
    vi.mocked(createTranslationProgramAgentPortV1).mockReturnValue(port.port);
    const prepareAgentBatch = vi.fn<TranslationProcessControllerV1["prepareAgentBatch"]>(
      async () => preparedAgentBatchV1(run),
    );
    const recordAgentRunTerminal = vi.fn<
      TranslationProcessControllerV1["recordAgentRunTerminal"]
    >()
      .mockResolvedValueOnce({ kind: "failed", code: "storage_unavailable" })
      .mockResolvedValueOnce({
        kind: "completed",
        value: { kind: "persisted", candidateId: null },
      })
      .mockResolvedValueOnce({ kind: "completed", value: { kind: "stale" } });
    const view = render(
      <TranslationProgramSurfaceV1
        controller={controllerV1({
          prepareAgentBatch,
          recordAgentRunTerminal,
          activeAttemptId: run.agentRunId,
        })}
        host={hostV1(owner.register)}
      />,
    );

    await act(async () => await Promise.resolve());
    await act(async () => {
      await requireSubmitInstructionV1()(run.instruction);
      port.setRun({ phase: "completed", activeRunId: null, terminalRuns: [terminal] });
      await Promise.resolve();
    });
    expect(recordAgentRunTerminal).toHaveBeenCalledTimes(1);
    await expect(owner.quiesce()).rejects.toThrow("terminal is still pending");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        defaultProcessExecutionLeaseRenewalIntervalMillisecondsV1,
      );
      await Promise.resolve();
    });
    expect(recordAgentRunTerminal).toHaveBeenCalledTimes(2);
    expect(port.acknowledgeTerminal).toHaveBeenCalledTimes(1);
    await expect(owner.quiesce()).rejects.toThrow("terminal is still pending");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        defaultProcessExecutionLeaseRenewalIntervalMillisecondsV1,
      );
      await Promise.resolve();
    });
    expect(recordAgentRunTerminal).toHaveBeenCalledTimes(3);
    expect(port.acknowledgeTerminal).toHaveBeenCalledTimes(2);
    await act(async () => await Promise.resolve());
    await expect(owner.quiesce()).resolves.toBeUndefined();
    expect(port.dispose).not.toHaveBeenCalled();
    await expect(owner.retire()).resolves.toBeUndefined();
    expect(port.dispose).toHaveBeenCalledOnce();
    view.unmount();
  });

  it("stops renewing an exact run when its Agent Host is replaced", async () => {
    const owner = createProgramRuntimeSurfaceDrainOwnerV1();
    const firstPort = createTranslationPortHarnessV1();
    const secondPort = createTranslationPortHarnessV1();
    const run = followUpRunV1("agent-run.translation.host-replaced");
    firstPort.submit.mockResolvedValue({ kind: "submitted", agentRunId: run.agentRunId });
    vi.mocked(createTranslationProgramAgentPortV1)
      .mockReturnValueOnce(firstPort.port)
      .mockReturnValueOnce(secondPort.port);
    const prepareAgentBatch = vi.fn<TranslationProcessControllerV1["prepareAgentBatch"]>(
      async () => preparedAgentBatchV1(run),
    );
    const controller = controllerV1({ prepareAgentBatch, activeAttemptId: run.agentRunId });
    const firstHost = {} as BrowserProgramAgentHostV1;
    const secondHost = {} as BrowserProgramAgentHostV1;
    const view = render(
      <TranslationProgramSurfaceV1
        controller={controller}
        host={hostV1(owner.register, vi.fn(), firstHost)}
      />,
    );

    await act(async () => await Promise.resolve());
    await act(async () => {
      await requireSubmitInstructionV1()(run.instruction);
      firstPort.setRun({ phase: "running", activeRunId: run.agentRunId, terminalRuns: [] });
    });
    await waitFor(() => {
      const monitor = vi.mocked(useProcessExecutionMonitorV1).mock.calls.at(-1)?.[0];
      expect(monitor?.isOwnedAttempt(run.agentRunId)).toBe(true);
    });

    view.rerender(
      <TranslationProgramSurfaceV1
        controller={controller}
        host={hostV1(owner.register, vi.fn(), secondHost)}
      />,
    );
    await waitFor(() => {
      const monitor = vi.mocked(useProcessExecutionMonitorV1).mock.calls.at(-1)?.[0];
      expect(monitor?.isOwnedAttempt(run.agentRunId)).toBe(false);
      expect(monitor?.ownedExecution).toBeNull();
    });

    view.unmount();
    await owner.retire();
    expect(firstPort.dispose).toHaveBeenCalledOnce();
    expect(secondPort.dispose).toHaveBeenCalledOnce();
  });

  it("releases every effect-owned port and retains one usable port under StrictMode", async () => {
    const owner = createProgramRuntimeSurfaceDrainOwnerV1();
    const ports: TranslationPortHarnessV1[] = [];
    vi.mocked(createTranslationProgramAgentPortV1).mockImplementation(() => {
      const port = createTranslationPortHarnessV1();
      ports.push(port);
      return port.port;
    });
    const view = render(
      <StrictMode>
        <TranslationProgramSurfaceV1 controller={controllerV1()} host={hostV1(owner.register)} />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(ports.length).toBeGreaterThan(0);
      expect(ports.filter((port) => port.dispose.mock.calls.length === 0)).toHaveLength(1);
      expect(workspaceProbeV1.props?.onSubmitInstruction).toBeTypeOf("function");
    });
    view.unmount();
    await owner.retire();
    expect(ports.every((port) => port.dispose.mock.calls.length === 1)).toBe(true);
  });
});

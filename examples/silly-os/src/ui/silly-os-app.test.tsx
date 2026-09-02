// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { type ReactNode, useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ActiveProgramRuntimeHandleV1 } from "../application/program-runtime-controller.ts";
import { createProgramRuntimeSurfaceDrainOwnerV1 } from "../application/program-runtime-controller.ts";
import type { ProgramSurfaceHostV1 } from "../program-platform/ui/program-runtime-surface.ts";
import { SillyOsAppV1 } from "./silly-os-app.tsx";

const providerOwnerProbeV1 = vi.hoisted(() => ({
  current: null as Readonly<Record<string, unknown>> | null,
}));

vi.mock("./program-agent-provider-owner.ts", () => ({
  useProgramAgentProviderOwnerV1: () => providerOwnerProbeV1.current,
}));

afterEach(() => {
  providerOwnerProbeV1.current = null;
  localStorage.clear();
  cleanup();
});

function providerOwnerV1(
  settingsOpen: boolean,
  agentHost: unknown = null,
): Readonly<Record<string, unknown>> {
  return {
    runtime: "deterministic_test",
    agentHost,
    forgetAgent: vi.fn(async () => true),
    controlSnapshot: null,
    readiness: { status: "ready", recoveryTarget: null },
    activeModel: null,
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
    settingsOpen,
    settingsInitialSection: "general",
    openSettings: vi.fn(),
    closeSettings: vi.fn(),
    settingsProps: {},
  };
}

function appV1(
  activeProgram: ActiveProgramRuntimeHandleV1,
  reportFailure: (code: string, error: unknown) => void,
): ReactNode {
  const readOnlySnapshot = { phase: "idle", conversation: null };
  return (
    <SillyOsAppV1
      activeProgram={activeProgram}
      readOnlyConversationController={{
        getSnapshot: () => readOnlySnapshot,
        subscribe: () => () => undefined,
      } as never}
      workspaceAuthority={{} as never}
      programPackages={{} as never}
      programPackageZipDecodeOptions={{} as never}
      onLaunchProgramPackage={vi.fn()}
      listRecentProcesses={vi.fn()}
      onOpenRecentProcess={vi.fn()}
      onOpenProgramLibrary={vi.fn()}
      onCloseReadOnlyProcess={vi.fn<() => "program">(() => "program")}
      activeProgramRoute="program"
      agentDrainRegistry={{
        isAccepting: () => true,
        register: () => () => undefined,
      }}
      reportFailure={reportFailure}
    />
  );
}

describe("SillyOS application route lifecycle", () => {
  it("keeps a running Program Surface mounted behind the Settings overlay", async () => {
    const retire = vi.fn(async () => undefined);
    const reportFailure = vi.fn();
    const observedAgentHosts: unknown[] = [];
    const Surface = ({ host }: { readonly host: ProgramSurfaceHostV1 }): ReactNode => {
      observedAgentHosts.push(host.agentHost);
      const registerProgramDrain = host.registerProgramDrain;
      useLayoutEffect(() =>
        registerProgramDrain({
          quiesce: async () => {
            throw new Error("Agent run is active");
          },
          retire,
        }), [registerProgramDrain]);
      return <main data-testid="running-program-surface" />;
    };
    const activeProgram = {
      programPackage: {
        reference: {
          programId: "program.running",
          packageVersion: "1.0.0",
        },
        manifest: {
          capabilityIds: [],
          recommendedModelPatterns: [],
        },
      },
      programImplementationId: "installation.running.1",
      controller: {},
      surfaceDrainOwner: createProgramRuntimeSurfaceDrainOwnerV1(),
      getSnapshot: () => ({}),
      subscribe: () => () => undefined,
      loadSurface: async () => ({ Surface }),
      close: vi.fn(async () => true),
      dispose: vi.fn(async () => undefined),
    } as unknown as ActiveProgramRuntimeHandleV1;
    const scopedAgentHost = { createPort: vi.fn() };
    const bindProgramRuntime = vi.fn(() => scopedAgentHost);
    const providerOwner = providerOwnerV1(false, { bindProgramRuntime });
    providerOwnerProbeV1.current = providerOwner;
    const view = render(appV1(activeProgram, reportFailure));

    await waitFor(() =>
      expect(view.container.querySelector("[data-testid='running-program-surface']")).not.toBeNull()
    );
    expect(bindProgramRuntime).toHaveBeenCalledWith({
      programPackage: activeProgram.programPackage.reference,
      implementationId: "installation.running.1",
    });
    expect(observedAgentHosts).toContain(scopedAgentHost);
    expect(retire).not.toHaveBeenCalled();

    providerOwnerProbeV1.current = { ...providerOwner, settingsOpen: true };
    view.rerender(appV1(activeProgram, reportFailure));

    expect(view.container.querySelector("[data-silly-os-view='settings']")).not.toBeNull();
    expect(view.container.querySelector("[data-testid='running-program-surface']")).not.toBeNull();
    expect(view.container.querySelector(".silly-os-route-layer")?.hasAttribute("inert")).toBe(true);
    expect(retire).not.toHaveBeenCalled();
    expect(reportFailure).not.toHaveBeenCalled();

    view.unmount();
    await act(async () => await Promise.resolve());
    expect(retire).toHaveBeenCalledOnce();
  });
});

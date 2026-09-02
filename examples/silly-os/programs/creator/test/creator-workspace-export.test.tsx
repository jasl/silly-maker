// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CreatorAgentPortV1 } from "../runtime-profile/browser-creator-agent-port.ts";
import {
  type CreatorWorkspaceExportTargetV1,
  useCreatorWorkspaceExportV1,
} from "../ui/use-creator-workspace-export.ts";

const firstTargetV1: CreatorWorkspaceExportTargetV1 = {
  processId: "process.export.first",
  programId: "program.export.first",
  workspaceId: "workspace.export.first",
  programName: "Translation Workshop",
};

function progressV1() {
  return {
    filesCompleted: 1,
    filesTotal: 1,
    bytesWritten: 747,
    bytesTotal: 747,
  } as const;
}

function descriptorV1(target: CreatorWorkspaceExportTargetV1, generation = 2) {
  return {
    revision: 1 as const,
    programId: target.programId,
    workspaceId: target.workspaceId,
    workspaceSessionId: `session.${target.processId}`,
    generation,
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Creator Workspace export workflow", () => {
  it("authorizes only a sealed archive, reports progress, and releases its Workspace", async () => {
    vi.useFakeTimers();
    let workspace: { readonly phase: "closed"; readonly descriptor: null } | {
      readonly phase: "open";
      readonly descriptor: ReturnType<typeof descriptorV1>;
    } = { phase: "closed", descriptor: null };
    const opened: CreatorWorkspaceExportTargetV1[] = [];
    const closed: string[] = [];
    const exportedFileNames: string[] = [];
    let downloads = 0;
    const port = {
      getSnapshot: () => ({ workspace }),
      openWorkspace: async (target: CreatorWorkspaceExportTargetV1) => {
        opened.push(target);
        const descriptor = descriptorV1(target);
        workspace = { phase: "open", descriptor };
        return { kind: "opened" as const, descriptor };
      },
      closeWorkspace: async (workspaceSessionId: string) => {
        closed.push(workspaceSessionId);
        const descriptor = workspace.descriptor ?? descriptorV1(firstTargetV1);
        workspace = { phase: "closed", descriptor: null };
        return { kind: "closed" as const, descriptor };
      },
      exportWorkspace: async (
        input: Parameters<CreatorAgentPortV1["exportWorkspace"]>[0],
      ) => {
        exportedFileNames.push(input.fileName);
        input.onProgress?.(progressV1());
        const disposition = await input.onReady(
          { checkpointId: "checkpoint.export.2", generation: 2, ...progressV1() },
          async () => {
            downloads += 1;
          },
        );
        expect(disposition).toBe("release");
        return {
          kind: "released" as const,
          checkpointId: "checkpoint.export.2",
          generation: 2,
          ...progressV1(),
        };
      },
    } as unknown as CreatorAgentPortV1;
    const failures: unknown[] = [];
    const { result } = renderHook(() =>
      useCreatorWorkspaceExportV1({
        port,
        target: firstTargetV1,
        enabled: true,
        reportFailure: (_code, error) => failures.push(error),
      })
    );

    act(() => result.current.start());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.state).toEqual({ phase: "finalizing", ...progressV1() });
    expect(downloads).toBe(1);
    expect(closed).toEqual([]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(result.current.state).toEqual({
      phase: "download-started",
      ...progressV1(),
    });
    expect(opened).toEqual([{
      processId: firstTargetV1.processId,
      programId: firstTargetV1.programId,
      workspaceId: firstTargetV1.workspaceId,
    }]);
    expect(exportedFileNames).toEqual(["translation-workshop.sillyos.zip"]);
    expect(closed).toEqual(["session.process.export.first"]);
    expect(failures).toEqual([]);
  });

  it("aborts and releases the predecessor export when the active Process changes", async () => {
    let workspace: { readonly phase: "closed"; readonly descriptor: null } | {
      readonly phase: "open";
      readonly descriptor: ReturnType<typeof descriptorV1>;
    } = { phase: "closed", descriptor: null };
    const closed: string[] = [];
    let exportAborted = false;
    const port = {
      getSnapshot: () => ({ workspace }),
      openWorkspace: async (target: CreatorWorkspaceExportTargetV1) => {
        const descriptor = descriptorV1(target);
        workspace = { phase: "open", descriptor };
        return { kind: "opened" as const, descriptor };
      },
      closeWorkspace: async (workspaceSessionId: string) => {
        closed.push(workspaceSessionId);
        const descriptor = workspace.descriptor ?? descriptorV1(firstTargetV1);
        workspace = { phase: "closed", descriptor: null };
        return { kind: "closed" as const, descriptor };
      },
      exportWorkspace: async (
        input: Parameters<CreatorAgentPortV1["exportWorkspace"]>[0],
      ) =>
        await new Promise<Awaited<ReturnType<CreatorAgentPortV1["exportWorkspace"]>>>(
          (resolve) => {
            input.signal.addEventListener("abort", () => {
              exportAborted = true;
              resolve({ kind: "cancelled", ...progressV1() });
            }, { once: true });
          },
        ),
    } as unknown as CreatorAgentPortV1;
    const secondTarget = {
      ...firstTargetV1,
      processId: "process.export.second",
      programId: "program.export.second",
      workspaceId: "workspace.export.second",
    };
    const { result, rerender } = renderHook(
      ({ target }) =>
        useCreatorWorkspaceExportV1({
          port,
          target,
          enabled: true,
          reportFailure: () => undefined,
        }),
      { initialProps: { target: firstTargetV1 } },
    );

    act(() => result.current.start());
    await waitFor(() => expect(result.current.state.phase).toBe("exporting"));
    rerender({ target: secondTarget });

    await waitFor(() => {
      expect(exportAborted).toBe(true);
      expect(result.current.state).toEqual({ phase: "idle" });
      expect(closed).toEqual(["session.process.export.first"]);
    });
  });

  it("returns a quiesced export to an idle, restartable UI state", async () => {
    let workspace: { readonly phase: "closed"; readonly descriptor: null } | {
      readonly phase: "open";
      readonly descriptor: ReturnType<typeof descriptorV1>;
    } = { phase: "closed", descriptor: null };
    let exports = 0;
    const port = {
      getSnapshot: () => ({ workspace }),
      openWorkspace: async (target: CreatorWorkspaceExportTargetV1) => {
        const descriptor = descriptorV1(target, exports + 1);
        workspace = { phase: "open", descriptor };
        return { kind: "opened" as const, descriptor };
      },
      closeWorkspace: async () => {
        const descriptor = workspace.descriptor ?? descriptorV1(firstTargetV1);
        workspace = { phase: "closed", descriptor: null };
        return { kind: "closed" as const, descriptor };
      },
      exportWorkspace: async (
        input: Parameters<CreatorAgentPortV1["exportWorkspace"]>[0],
      ) => {
        exports += 1;
        return await new Promise<Awaited<ReturnType<CreatorAgentPortV1["exportWorkspace"]>>>(
          (resolve) => {
            input.signal.addEventListener(
              "abort",
              () => resolve({ kind: "cancelled", ...progressV1() }),
              { once: true },
            );
          },
        );
      },
    } as unknown as CreatorAgentPortV1;
    const { result } = renderHook(() =>
      useCreatorWorkspaceExportV1({
        port,
        target: firstTargetV1,
        enabled: true,
        reportFailure: () => undefined,
      })
    );

    act(() => result.current.start());
    await waitFor(() => expect(result.current.state.phase).toBe("exporting"));
    await act(async () => await result.current.drain());
    expect(result.current.state).toEqual({ phase: "idle" });
    expect(exports).toBe(1);

    act(() => result.current.start());
    await waitFor(() => {
      expect(result.current.state.phase).toBe("exporting");
      expect(exports).toBe(2);
    });
    await act(async () => await result.current.drain());
    expect(result.current.state).toEqual({ phase: "idle" });
  });
});

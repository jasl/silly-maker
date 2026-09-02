// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useRef, useState } from "react";

import type { CreatorAgentPortV1 } from "../runtime-profile/browser-creator-agent-port.ts";
import type { WorkpieceWorkspaceExportV1 } from "./workpiece-pane.tsx";
import { creatorWorkspaceArchiveFileNameV1 } from "./workspace-archive-file-name.ts";

type CreatorWorkspaceExportReadyV1 = Parameters<
  Parameters<CreatorAgentPortV1["exportWorkspace"]>[0]["onReady"]
>[0];

const workspaceDownloadHandoffMillisecondsV1 = 1_000;

export interface CreatorWorkspaceExportTargetV1 {
  readonly processId: string;
  readonly programId: string;
  readonly workspaceId: string;
  readonly programName: string;
}

export interface CreatorWorkspaceExportWorkflowV1 {
  readonly state: WorkpieceWorkspaceExportV1;
  readonly available: boolean;
  readonly disabled: boolean;
  readonly pending: boolean;
  readonly start: () => void;
  readonly cancel: () => void;
  readonly drain: () => Promise<void>;
}

/** Retains the Sandbox-owned archive through the browser download handoff. */
export async function commitCreatorWorkspaceDownloadV1(
  _ready: CreatorWorkspaceExportReadyV1,
  startDownload: () => Promise<void>,
  onCommitted: () => void,
): Promise<"release"> {
  await startDownload();
  onCommitted();
  await new Promise<void>((resolve) => {
    setTimeout(resolve, workspaceDownloadHandoffMillisecondsV1);
  });
  return "release";
}

function workspaceTargetMatchesV1(
  target: CreatorWorkspaceExportTargetV1,
  descriptor: NonNullable<ReturnType<CreatorAgentPortV1["getSnapshot"]>["workspace"]["descriptor"]>,
): boolean {
  return descriptor.programId === target.programId && descriptor.workspaceId === target.workspaceId;
}

function pendingWorkspaceExportV1(state: WorkpieceWorkspaceExportV1): boolean {
  return state.phase === "exporting" || state.phase === "cancelling" ||
    state.phase === "finalizing";
}

/** Creator-owned Workspace ZIP workflow over the fixed Program Agent port. */
export function useCreatorWorkspaceExportV1({
  port,
  target,
  enabled,
  reportFailure,
}: {
  readonly port: CreatorAgentPortV1 | null;
  readonly target: CreatorWorkspaceExportTargetV1 | null;
  readonly enabled: boolean;
  readonly reportFailure: (code: string, error: unknown) => void;
}): CreatorWorkspaceExportWorkflowV1 {
  const [state, setState] = useState<WorkpieceWorkspaceExportV1>({ phase: "idle" });
  const epochRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const settlementRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);

  const processId = target?.processId ?? null;
  const programId = target?.programId ?? null;
  const workspaceId = target?.workspaceId ?? null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    epochRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ phase: "idle" });
    return () => {
      epochRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [port, processId, programId, workspaceId]);

  const drain = useCallback(async (): Promise<void> => {
    epochRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    if (mountedRef.current) setState({ phase: "idle" });
    await settlementRef.current.catch(() => undefined);
  }, []);

  const cancel = useCallback((): void => {
    const abortController = abortRef.current;
    if (abortController === null) return;
    setState((current) =>
      current.phase === "exporting" ? { ...current, phase: "cancelling" } : current
    );
    abortController.abort();
  }, []);

  const start = useCallback((): void => {
    if (port === null || target === null || !enabled || abortRef.current !== null) return;

    const epoch = ++epochRef.current;
    const abortController = new AbortController();
    abortRef.current = abortController;
    setState({
      phase: "exporting",
      filesCompleted: 0,
      filesTotal: 0,
      bytesWritten: 0,
      bytesTotal: 0,
    });

    const operation = (async (): Promise<void> => {
      let workspaceSessionId: string | null = null;
      try {
        const currentWorkspace = port.getSnapshot().workspace;
        if (
          currentWorkspace.phase === "open" && currentWorkspace.descriptor !== null &&
          workspaceTargetMatchesV1(target, currentWorkspace.descriptor)
        ) {
          workspaceSessionId = currentWorkspace.descriptor.workspaceSessionId;
        } else {
          if (currentWorkspace.descriptor !== null && currentWorkspace.phase !== "closed") {
            const closed = await port.closeWorkspace(
              currentWorkspace.descriptor.workspaceSessionId,
            );
            if (closed.kind === "unavailable") {
              if (epochRef.current === epoch) {
                setState({ phase: "failed", diagnosticCode: "request_failed" });
              }
              reportFailure("silly_os.browser_pi_workspace_close_failed", closed.diagnostic);
              return;
            }
          }
          const opened = await port.openWorkspace({
            processId: target.processId,
            programId: target.programId,
            workspaceId: target.workspaceId,
          });
          if (opened.kind === "unavailable") {
            if (epochRef.current === epoch) {
              setState({ phase: "failed", diagnosticCode: "request_failed" });
            }
            reportFailure("silly_os.browser_pi_workspace_open_failed", opened.diagnostic);
            return;
          }
          workspaceSessionId = opened.descriptor.workspaceSessionId;
        }

        if (epochRef.current !== epoch) return;
        if (abortController.signal.aborted) {
          setState({
            phase: "cancelled",
            filesCompleted: 0,
            filesTotal: 0,
            bytesWritten: 0,
            bytesTotal: 0,
          });
          return;
        }

        const result = await port.exportWorkspace({
          workspaceSessionId,
          fileName: creatorWorkspaceArchiveFileNameV1(target.programName),
          signal: abortController.signal,
          onProgress: (progress) => {
            if (epochRef.current !== epoch || abortController.signal.aborted) return;
            setState({ phase: "exporting", ...progress });
          },
          onReady: (ready, startDownload) => {
            if (epochRef.current !== epoch || abortController.signal.aborted) return "cancel";
            return commitCreatorWorkspaceDownloadV1(ready, startDownload, () => {
              if (epochRef.current !== epoch) return;
              setState({
                phase: "finalizing",
                filesCompleted: ready.filesCompleted,
                filesTotal: ready.filesTotal,
                bytesWritten: ready.bytesWritten,
                bytesTotal: ready.bytesTotal,
              });
            });
          },
        });
        if (epochRef.current !== epoch) return;
        if (result.kind === "released") {
          setState({
            phase: "download-started",
            filesCompleted: result.filesCompleted,
            filesTotal: result.filesTotal,
            bytesWritten: result.bytesWritten,
            bytesTotal: result.bytesTotal,
          });
          return;
        }
        if (result.kind === "cancelled") {
          setState({
            phase: "cancelled",
            filesCompleted: result.filesCompleted,
            filesTotal: result.filesTotal,
            bytesWritten: result.bytesWritten,
            bytesTotal: result.bytesTotal,
          });
          return;
        }
        setState({ phase: "failed", diagnosticCode: result.diagnostic.code });
        reportFailure("silly_os.browser_workspace_export_failed", result.diagnostic);
      } catch (error) {
        if (epochRef.current === epoch) {
          setState({ phase: "failed", diagnosticCode: "request_failed" });
        }
        reportFailure("silly_os.browser_workspace_export_failed", error);
      } finally {
        if (workspaceSessionId !== null) {
          const closed = await port.closeWorkspace(workspaceSessionId);
          if (closed.kind === "unavailable") {
            reportFailure("silly_os.browser_pi_workspace_close_failed", closed.diagnostic);
          }
        }
        if (epochRef.current === epoch && abortRef.current === abortController) {
          abortRef.current = null;
        }
      }
    })();
    settlementRef.current = operation.then(() => undefined, () => undefined);
  }, [enabled, port, reportFailure, target]);

  const pending = pendingWorkspaceExportV1(state);
  const available = port !== null && target !== null;
  return {
    state,
    available,
    disabled: !enabled || pending,
    pending,
    start,
    cancel,
    drain,
  };
}

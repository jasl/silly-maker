// SPDX-License-Identifier: MIT

import {
  admitBrowserWorkspaceHostExportInboundMessageV1,
  admitBrowserWorkspaceHostControlRequestV1,
  admitBrowserWorkspaceHostEnvironmentRequestV1,
  admitBrowserWorkspaceVolumeAnchorWireV1,
  browserWorkspaceHostReceiptMaximumV1,
  browserWorkspaceNativePiToolPayloadMaximumBytesV1,
  type BrowserWorkspaceExecutionDescriptorWireV1,
  type BrowserWorkspaceHostControlFailureCodeV1,
  type BrowserWorkspaceHostControlOutboundMessageV1,
  type BrowserWorkspaceHostControlRequestRecordV1,
  type BrowserWorkspaceHostExportFailureCodeV1,
  type BrowserWorkspaceHostExportOutboundMessageV1,
  type BrowserWorkspaceHostExportProgressWireV1,
  type BrowserWorkspaceHostEnvironmentFailureCodeV1,
  type BrowserWorkspaceHostEnvironmentOutboundMessageV1,
  type BrowserWorkspaceHostEnvironmentRequestRecordV1,
  type BrowserWorkspaceHostFileErrorCodeV1,
  type BrowserWorkspaceHostFileErrorWireV1,
  type BrowserWorkspaceHostMutationReceiptWireV1,
  type BrowserWorkspaceHostSnapshotWireV1,
  type BrowserWorkspaceVolumeAnchorWireV1,
  isBrowserWorkspaceHostNormalizedPathV1,
} from "./browser-workspace-host-protocol.ts";

const identityPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const workspaceRootV1 = "/workspace";

export interface BrowserWorkspaceHostDurableHeadV1 {
  readonly revision: 1;
  readonly volumeId: string;
  readonly workspaceFormat: 1;
  readonly checkpointId: string;
  readonly generation: number;
}

export interface BrowserWorkspaceHostFileMetadataV1 {
  readonly kind: "missing" | "file" | "directory";
  readonly size: number;
  /** File.lastModified for files; 0 for OPFS directories, the virtual root, and missing paths. */
  readonly mtimeMs: number;
}

/** Replayable, bounded private source. It never crosses the Agent wire. */
export interface BrowserWorkspaceHostFileRangeSourceV1 {
  readonly byteLength: number;
  readRange(input: {
    readonly offset: number;
    readonly length: number;
    readonly signal: AbortSignal;
  }): Promise<Uint8Array>;
}

export interface BrowserWorkspaceHostReplaceFileInputV1 {
  readonly path: string;
  readonly source: BrowserWorkspaceHostFileRangeSourceV1;
  readonly expectedHead: BrowserWorkspaceHostDurableHeadV1;
  readonly nextCheckpointId: string;
  readonly signal: AbortSignal;
}

export interface BrowserWorkspaceHostReplaceFileResultV1 {
  readonly changed: boolean;
  readonly head: BrowserWorkspaceHostDurableHeadV1;
}

export interface BrowserWorkspaceHostPortableArchiveInputV1 {
  readonly programRevision: number;
  readonly repositoryRevision: number;
  readonly expectedHead: BrowserWorkspaceHostDurableHeadV1;
  readonly signal: AbortSignal;
  readonly onProgress: (progress: BrowserWorkspaceHostExportProgressWireV1) => void;
}

export interface BrowserWorkspaceHostPortableArchiveV1 {
  readonly file: File;
  readonly progress: BrowserWorkspaceHostExportProgressWireV1;
  release(): Promise<void>;
}

/** One exclusive, already-acquired volume lease. Only the Host receives this port. */
export interface BrowserWorkspaceHostVolumeLeasePortV1 {
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
  readHead(): Promise<BrowserWorkspaceHostDurableHeadV1>;
  stat(path: string): Promise<BrowserWorkspaceHostFileMetadataV1>;
  readFileRange(input: {
    readonly path: string;
    readonly offset: number;
    readonly length: number;
    readonly signal: AbortSignal;
  }): Promise<Uint8Array>;
  replaceFile(
    input: BrowserWorkspaceHostReplaceFileInputV1,
  ): Promise<BrowserWorkspaceHostReplaceFileResultV1>;
  createPortableArchive(
    input: BrowserWorkspaceHostPortableArchiveInputV1,
  ): Promise<BrowserWorkspaceHostPortableArchiveV1>;
  close(): Promise<void>;
}

/** Injected private-volume boundary; only explicit discard may delete a candidate. */
export interface BrowserWorkspaceHostBootstrapPortV1 {
  createCandidate(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<BrowserWorkspaceVolumeAnchorWireV1>;
  discardCandidate(volumeId: string): Promise<void>;
  openVolume(
    anchor: BrowserWorkspaceVolumeAnchorWireV1,
  ): Promise<BrowserWorkspaceHostVolumeLeasePortV1>;
  dispose(): Promise<void>;
}

export interface BrowserWorkspaceHostMessagePortV1 {
  postMessage(message: unknown): void;
  addEventListener(
    type: "message",
    listener: (event: Readonly<{ data: unknown }>) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: Readonly<{ data: unknown }>) => void,
  ): void;
  start?(): void;
  close?(): void;
}

export type BrowserWorkspaceHostStorageFailureCodeV1 =
  | "workspace_busy"
  | "workspace_mismatch"
  | "volume_busy"
  | "volume_missing"
  | "volume_corrupt"
  | "candidate_mismatch"
  | "storage_unavailable"
  | "capacity_exceeded"
  | "request_failed";

export class BrowserWorkspaceHostStorageErrorV1 extends Error {
  readonly code: BrowserWorkspaceHostStorageFailureCodeV1;
  readonly fileError: BrowserWorkspaceHostFileErrorWireV1 | null;

  constructor(
    code: BrowserWorkspaceHostStorageFailureCodeV1,
    message: string,
    fileError: BrowserWorkspaceHostFileErrorWireV1 | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "BrowserWorkspaceHostStorageErrorV1";
    this.code = code;
    this.fileError = fileError;
  }
}

/** Cleanup failure is never hidden by a simultaneous user cancellation. */
export class BrowserWorkspaceHostCleanupErrorV1 extends BrowserWorkspaceHostStorageErrorV1 {
  constructor(message: string, cause: unknown) {
    super("request_failed", message, null, {
      cause: cause instanceof Error ? cause : new Error(String(cause)),
    });
    this.name = "BrowserWorkspaceHostCleanupErrorV1";
  }
}

export interface BrowserWorkspaceHostRuntimeOptionsV1 {
  readonly bootstrap: BrowserWorkspaceHostBootstrapPortV1;
  readonly postControlMessage: (message: BrowserWorkspaceHostControlOutboundMessageV1) => void;
  readonly createWorkspaceSessionId?: () => string;
  readonly createCheckpointId?: () => string;
  readonly createObjectUrl?: (file: File) => string;
  readonly revokeObjectUrl?: (url: string) => void;
  readonly exportReadyTimeoutMilliseconds?: number;
}

export interface BrowserWorkspaceHostRuntimeV1 {
  receiveControl(
    message: unknown,
    transferredPorts?: readonly BrowserWorkspaceHostMessagePortV1[],
  ): Promise<void>;
  dispose(): Promise<void>;
}

interface NormalizedPathV1 {
  readonly absolute: string;
  readonly relative: string;
}

interface ToolScopeV1 {
  readonly toolCallId: string;
  readonly tool: "read" | "write" | "edit";
  readonly baseGeneration: number;
  readonly abortController: AbortController;
  activeOperation: Promise<unknown> | null;
  writeAttempted: boolean;
  changedPath: string | null;
  failureDiagnostic:
    | null
    | "cancelled"
    | "path_rejected"
    | "capacity_exceeded"
    | "execution_failed";
}

interface RunStateV1 {
  readonly sessionId: string;
  readonly runId: string;
  readonly expectedGeneration: number;
  readonly toolCallIds: Set<string>;
  cursor: number;
  activeScope: ToolScopeV1 | null;
}

interface SessionStateV1 {
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1;
  readonly workspaceSessionId: string;
  lease: BrowserWorkspaceHostVolumeLeasePortV1 | null;
  readonly usedRunIds: Set<string>;
  readonly receipts: BrowserWorkspaceHostMutationReceiptWireV1[];
  head: BrowserWorkspaceHostDurableHeadV1;
  phase: "open" | "closed";
  accepting: boolean;
  activeRun: RunStateV1 | null;
  nextReceiptSequence: number;
  acknowledgedThrough: number;
  reservedReceiptSlots: number;
  environment: EnvironmentAttachmentV1 | null;
  exportOperation: ExportOperationV1 | null;
  closeDrain: Promise<void> | null;
}

interface EnvironmentAttachmentV1 {
  readonly port: BrowserWorkspaceHostMessagePortV1;
  readonly listener: (event: Readonly<{ data: unknown }>) => void;
}

interface ExportOperationV1 {
  readonly exportId: string;
  readonly port: BrowserWorkspaceHostMessagePortV1;
  readonly listener: (event: Readonly<{ data: unknown }>) => void;
  readonly abortController: AbortController;
  readonly release: Promise<void>;
  readonly resolveRelease: () => void;
  completion: Promise<void>;
  releaseRequested: boolean;
  cancelRequested: boolean;
  protocolFailed: boolean;
  ready: boolean;
}

function positiveSafeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function validIdentityV1(value: unknown): value is string {
  return typeof value === "string" && identityPatternV1.test(value);
}

function durableHeadV1(
  value: unknown,
  anchor: BrowserWorkspaceVolumeAnchorWireV1,
): BrowserWorkspaceHostDurableHeadV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Readonly<Record<string, unknown>>;
  if (
    Object.keys(record).length !== 5 || record.revision !== 1 ||
    record.volumeId !== anchor.volumeId || record.workspaceFormat !== anchor.workspaceFormat ||
    !validIdentityV1(record.checkpointId) || !positiveSafeIntegerV1(record.generation)
  ) return null;
  return {
    revision: 1,
    volumeId: anchor.volumeId,
    workspaceFormat: 1,
    checkpointId: record.checkpointId,
    generation: record.generation,
  };
}

function sameHeadV1(
  left: BrowserWorkspaceHostDurableHeadV1,
  right: BrowserWorkspaceHostDurableHeadV1,
): boolean {
  return left.volumeId === right.volumeId && left.workspaceFormat === right.workspaceFormat &&
    left.checkpointId === right.checkpointId && left.generation === right.generation;
}

function normalizedPathV1(path: string): NormalizedPathV1 | BrowserWorkspaceHostFileErrorWireV1 {
  if (path.includes("\0")) {
    return fileErrorV1("invalid", "Workspace paths cannot contain NUL", path);
  }
  const absoluteInput = path.startsWith("/");
  const rawParts = path.split("/");
  const rootOffset = absoluteInput && rawParts[1] === "workspace" ? 2 : 0;
  if (absoluteInput && rootOffset === 0) {
    return fileErrorV1("permission_denied", "Path is outside /workspace", path);
  }
  const parts: string[] = [];
  for (const part of rawParts.slice(rootOffset)) {
    if (part.length === 0 || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) {
        return fileErrorV1("permission_denied", "Path escapes /workspace", path);
      }
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  const relative = parts.join("/");
  if (relative.length > 0 && !isBrowserWorkspaceHostNormalizedPathV1(relative)) {
    return fileErrorV1("invalid", "Workspace path exceeds its admitted ceiling", path);
  }
  return {
    absolute: relative.length === 0 ? workspaceRootV1 : `${workspaceRootV1}/${relative}`,
    relative,
  };
}

function fileErrorV1(
  code: BrowserWorkspaceHostFileErrorCodeV1,
  message: string,
  path: string | null,
): BrowserWorkspaceHostFileErrorWireV1 {
  return { kind: "file_error", code, message, path };
}

function isFileErrorV1(
  value: NormalizedPathV1 | BrowserWorkspaceHostFileErrorWireV1,
): value is BrowserWorkspaceHostFileErrorWireV1 {
  return "kind" in value;
}

function requestIdFromMalformedV1(value: unknown): number | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, "requestId");
    return descriptor !== undefined && Object.hasOwn(descriptor, "value") &&
        positiveSafeIntegerV1(descriptor.value)
      ? descriptor.value
      : null;
  } catch {
    return null;
  }
}

function storageFailureCodeV1(error: unknown): BrowserWorkspaceHostStorageFailureCodeV1 {
  return error instanceof BrowserWorkspaceHostStorageErrorV1 ? error.code : "request_failed";
}

function storageFileErrorV1(error: unknown): BrowserWorkspaceHostFileErrorWireV1 {
  if (error instanceof BrowserWorkspaceHostStorageErrorV1 && error.fileError !== null) {
    return error.fileError;
  }
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return fileErrorV1("unknown", "Workspace storage quota was exceeded", null);
  }
  return fileErrorV1("unknown", "Workspace storage operation failed", null);
}

function runIdentityV1(sessionId: string, runId: string): string {
  return `${sessionId}\u0000${runId}`;
}

export function createBrowserWorkspaceHostRuntimeV1(
  options: BrowserWorkspaceHostRuntimeOptionsV1,
): BrowserWorkspaceHostRuntimeV1 {
  let disposed = false;
  let currentOpenSession: SessionStateV1 | null = null;
  let controlTail = Promise.resolve();
  const candidateAnchors = new Map<string, BrowserWorkspaceVolumeAnchorWireV1>();
  const sessions = new Map<string, SessionStateV1>();
  const receiptTombstones = new Map<string, SessionStateV1>();
  const createWorkspaceSessionId = options.createWorkspaceSessionId ??
    (() => `sillyos.workspace.session.${crypto.randomUUID()}`);
  const createCheckpointId = options.createCheckpointId ??
    (() => `sillyos.workspace.checkpoint.${crypto.randomUUID()}`);
  const createObjectUrl = options.createObjectUrl ?? ((file: File) => URL.createObjectURL(file));
  const revokeObjectUrl = options.revokeObjectUrl ?? ((url: string) => URL.revokeObjectURL(url));
  const exportReadyTimeoutMilliseconds = options.exportReadyTimeoutMilliseconds ?? 30_000;
  if (!positiveSafeIntegerV1(exportReadyTimeoutMilliseconds)) {
    throw new TypeError("Workspace export ready timeout must be a positive safe integer");
  }

  const postControl = (message: BrowserWorkspaceHostControlOutboundMessageV1): void => {
    if (!disposed) options.postControlMessage(message);
  };

  const controlFailure = (
    requestId: number,
    code: BrowserWorkspaceHostControlFailureCodeV1,
  ): void => {
    postControl({ revision: 1, kind: "control_response", requestId, ok: false, code });
  };

  const postEnvironment = (
    session: SessionStateV1,
    message: BrowserWorkspaceHostEnvironmentOutboundMessageV1,
  ): void => {
    // MessagePort.postMessage has no targetOrigin.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    if (!disposed && session.environment !== null) session.environment.port.postMessage(message);
  };

  const postExport = (
    operation: ExportOperationV1,
    message: BrowserWorkspaceHostExportOutboundMessageV1,
  ): void => {
    // MessagePort.postMessage has no targetOrigin.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    operation.port.postMessage(message);
  };

  const closeTransferredPorts = (
    transferredPorts: readonly BrowserWorkspaceHostMessagePortV1[],
  ): void => {
    for (const port of transferredPorts) {
      try {
        port.close?.();
      } catch {
        // A rejected transferred port has no remaining protocol authority.
      }
    }
  };

  const environmentFailure = (
    session: SessionStateV1,
    requestId: number,
    code: BrowserWorkspaceHostEnvironmentFailureCodeV1,
    fileError: BrowserWorkspaceHostFileErrorWireV1 | null = null,
  ): void => {
    postEnvironment(session, {
      revision: 1,
      kind: "environment_response",
      requestId,
      ok: false,
      code,
      fileError,
    });
  };

  const detachEnvironment = (session: SessionStateV1): void => {
    const environment = session.environment;
    if (environment === null) return;
    environment.port.removeEventListener("message", environment.listener);
    environment.port.close?.();
    session.environment = null;
  };

  const retireSettledTombstone = (session: SessionStateV1): void => {
    if (session.phase !== "closed" || session.receipts.length !== 0) return;
    receiptTombstones.delete(session.workspaceSessionId);
    sessions.delete(session.workspaceSessionId);
    detachEnvironment(session);
  };

  const descriptor = (session: SessionStateV1): BrowserWorkspaceExecutionDescriptorWireV1 => ({
    revision: 1,
    programId: session.anchor.programId,
    workspaceId: session.anchor.workspaceId,
    workspaceSessionId: session.workspaceSessionId,
    generation: session.head.generation,
  });

  const snapshot = (session: SessionStateV1): BrowserWorkspaceHostSnapshotWireV1 => ({
    revision: 1,
    phase: session.phase,
    volumeId: session.anchor.volumeId,
    checkpointId: session.head.checkpointId,
    descriptor: descriptor(session),
    anchor: session.anchor,
  });

  const settleScope = (
    session: SessionStateV1,
    run: RunStateV1,
    scope: ToolScopeV1,
    outcome: "succeeded" | "failed" | "cancelled",
  ): void => {
    if (run.activeScope !== scope) return;
    if (scope.tool === "write" || scope.tool === "edit") {
      const effect = scope.changedPath === null ? "none" : "changed";
      const diagnosticCode = outcome === "cancelled"
        ? "cancelled"
        : scope.failureDiagnostic ?? (outcome === "failed" ? "execution_failed" : null);
      const receipt: BrowserWorkspaceHostMutationReceiptWireV1 = {
        revision: 1,
        sequence: session.nextReceiptSequence++,
        programId: session.anchor.programId,
        workspaceId: session.anchor.workspaceId,
        workspaceSessionId: session.workspaceSessionId,
        sessionId: run.sessionId,
        runId: run.runId,
        toolCallId: scope.toolCallId,
        tool: scope.tool,
        expectedGeneration: run.expectedGeneration,
        baseGeneration: scope.baseGeneration,
        resultingGeneration: session.head.generation,
        outcome,
        effect,
        changedPaths: scope.changedPath === null ? [] : [scope.changedPath],
        diagnosticCode,
      };
      session.receipts.push(receipt);
      session.reservedReceiptSlots -= 1;
      postEnvironment(session, { revision: 1, kind: "workspace_receipt", receipt });
    }
    run.activeScope = null;
  };

  const abortRunAndDrain = async (session: SessionStateV1): Promise<void> => {
    const run = session.activeRun;
    if (run === null) return;
    const scope = run.activeScope;
    if (scope !== null) {
      scope.abortController.abort();
      try {
        await scope.activeOperation;
      } catch {
        // The request handler reports the stable environment failure.
      }
      settleScope(session, run, scope, "cancelled");
    }
    session.activeRun = null;
  };

  const operate = async <T>(
    scope: ToolScopeV1,
    operation: () => Promise<T>,
  ): Promise<T> => {
    if (scope.activeOperation !== null) {
      throw new BrowserWorkspaceHostStorageErrorV1(
        "request_failed",
        "Another environment primitive is active",
      );
    }
    const pending = operation();
    scope.activeOperation = pending;
    try {
      return await pending;
    } finally {
      if (scope.activeOperation === pending) scope.activeOperation = null;
    }
  };

  const activeScope = (
    session: SessionStateV1,
  ): { readonly run: RunStateV1; readonly scope: ToolScopeV1 } | null => {
    const run = session.activeRun;
    return run === null || run.activeScope === null ? null : { run, scope: run.activeScope };
  };

  const handleFileCall = async (
    session: SessionStateV1,
    requestId: number,
    record: Extract<
      BrowserWorkspaceHostEnvironmentRequestRecordV1,
      { readonly path: string }
    >,
  ): Promise<void> => {
    const current = activeScope(session);
    if (current === null) {
      environmentFailure(session, requestId, "scope_missing");
      return;
    }
    const { run, scope } = current;
    if (!session.accepting || scope.abortController.signal.aborted) {
      scope.failureDiagnostic = "cancelled";
      environmentFailure(
        session,
        requestId,
        "workspace_closed",
        fileErrorV1("aborted", "Workspace filesystem operation was aborted", null),
      );
      return;
    }
    const lease = session.lease;
    if (lease === null) {
      scope.failureDiagnostic = "cancelled";
      environmentFailure(session, requestId, "workspace_closed");
      return;
    }
    const path = normalizedPathV1(record.path);
    if (isFileErrorV1(path)) {
      scope.failureDiagnostic = "path_rejected";
      environmentFailure(session, requestId, "request_failed", path);
      return;
    }
    try {
      if (record.method === "absolute_path" || record.method === "canonical_path") {
        postEnvironment(session, {
          revision: 1,
          kind: "environment_response",
          requestId,
          ok: true,
          response: { method: record.method, value: path.absolute },
        });
        return;
      }
      if (record.method === "exists") {
        const metadata = await operate(scope, () => lease.stat(path.relative));
        postEnvironment(session, {
          revision: 1,
          kind: "environment_response",
          requestId,
          ok: true,
          response: { method: "exists", value: metadata.kind !== "missing" },
        });
        return;
      }
      if (record.method === "file_info") {
        const metadata = await operate(scope, () => lease.stat(path.relative));
        if (metadata.kind === "missing") {
          environmentFailure(
            session,
            requestId,
            "request_failed",
            fileErrorV1("not_found", "Workspace path was not found", path.absolute),
          );
          return;
        }
        postEnvironment(session, {
          revision: 1,
          kind: "environment_response",
          requestId,
          ok: true,
          response: {
            method: "file_info",
            value: {
              name: path.relative.length === 0
                ? "workspace"
                : path.relative.slice(path.relative.lastIndexOf("/") + 1),
              path: path.absolute,
              kind: metadata.kind,
              size: metadata.size,
              mtimeMs: metadata.mtimeMs,
            },
          },
        });
        return;
      }
      if (record.method === "read_binary_file") {
        const metadata = await operate(scope, () => lease.stat(path.relative));
        if (metadata.kind === "missing") {
          environmentFailure(
            session,
            requestId,
            "request_failed",
            fileErrorV1("not_found", "Workspace file was not found", path.absolute),
          );
          return;
        }
        if (metadata.kind === "directory") {
          environmentFailure(
            session,
            requestId,
            "request_failed",
            fileErrorV1("is_directory", "Workspace path is a directory", path.absolute),
          );
          return;
        }
        if (metadata.size > browserWorkspaceNativePiToolPayloadMaximumBytesV1) {
          environmentFailure(
            session,
            requestId,
            "request_failed",
            fileErrorV1(
              "invalid",
              "Workspace file exceeds the 256 KiB native Pi read ceiling",
              path.absolute,
            ),
          );
          return;
        }
        const bytes = await operate(scope, () =>
          lease.readFileRange({
            path: path.relative,
            offset: 0,
            length: metadata.size,
            signal: scope.abortController.signal,
          }));
        if (bytes.byteLength !== metadata.size) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "volume_corrupt",
            "Workspace file metadata changed during its exclusive read",
          );
        }
        postEnvironment(session, {
          revision: 1,
          kind: "environment_response",
          requestId,
          ok: true,
          response: { method: "read_binary_file", value: bytes },
        });
        return;
      }
      if (record.method !== "write_file") return;
      if ((scope.tool !== "write" && scope.tool !== "edit") || scope.writeAttempted) {
        environmentFailure(session, requestId, "scope_busy");
        return;
      }
      scope.writeAttempted = true;
      const nextCheckpointId = createCheckpointId();
      if (!validIdentityV1(nextCheckpointId)) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "request_failed",
          "Checkpoint identity factory returned an invalid identity",
        );
      }
      await operate(scope, async () => {
        const result = await lease.replaceFile({
          path: path.relative,
          source: {
            byteLength: record.bytes.byteLength,
            async readRange({ offset, length, signal }) {
              if (signal.aborted) {
                throw new BrowserWorkspaceHostStorageErrorV1(
                  "request_failed",
                  "Workspace write was aborted",
                  fileErrorV1(
                    "aborted",
                    "Workspace filesystem operation was aborted",
                    path.absolute,
                  ),
                );
              }
              return record.bytes.slice(offset, offset + length);
            },
          },
          expectedHead: session.head,
          nextCheckpointId,
          signal: scope.abortController.signal,
        });
        const admittedHead = durableHeadV1(result.head, session.anchor);
        if (admittedHead === null) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "volume_corrupt",
            "Workspace volume returned an invalid durable head",
          );
        }
        if (result.changed) {
          if (
            admittedHead.generation !== session.head.generation + 1 ||
            admittedHead.checkpointId !== nextCheckpointId
          ) {
            throw new BrowserWorkspaceHostStorageErrorV1(
              "volume_corrupt",
              "Changed workspace bytes did not publish the exact successor head",
            );
          }
          session.head = admittedHead;
          run.cursor = admittedHead.generation;
          scope.changedPath = path.relative;
        } else if (!sameHeadV1(admittedHead, session.head)) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "volume_corrupt",
            "Same-byte workspace write changed its durable head",
          );
        }
      });
      postEnvironment(session, {
        revision: 1,
        kind: "environment_response",
        requestId,
        ok: true,
        response: { method: "write_file", value: null },
      });
    } catch (error) {
      scope.failureDiagnostic = error instanceof BrowserWorkspaceHostStorageErrorV1 &&
            error.code === "capacity_exceeded" ||
          error instanceof DOMException && error.name === "QuotaExceededError"
        ? "capacity_exceeded"
        : "execution_failed";
      environmentFailure(session, requestId, "request_failed", storageFileErrorV1(error));
    }
  };

  const handleEnvironment = async (session: SessionStateV1, message: unknown): Promise<void> => {
    const request = admitBrowserWorkspaceHostEnvironmentRequestV1(message);
    if (request === null) {
      const requestId = requestIdFromMalformedV1(message);
      if (requestId !== null) environmentFailure(session, requestId, "invalid_request");
      return;
    }
    if (disposed) {
      environmentFailure(session, request.requestId, "disposed");
      return;
    }
    const record = request.record;
    if (
      session.phase === "closed" && record.method !== "query_receipts" &&
      record.method !== "acknowledge_receipts"
    ) {
      environmentFailure(session, request.requestId, "workspace_closed");
      return;
    }
    if (
      record.method === "absolute_path" || record.method === "canonical_path" ||
      record.method === "exists" || record.method === "file_info" ||
      record.method === "read_binary_file" ||
      record.method === "write_file"
    ) {
      await handleFileCall(session, request.requestId, record);
      return;
    }
    if (record.method === "query_receipts") {
      postEnvironment(session, {
        revision: 1,
        kind: "environment_response",
        requestId: request.requestId,
        ok: true,
        response: { method: "query_receipts", receipts: [...session.receipts] },
      });
      return;
    }
    if (record.method === "acknowledge_receipts") {
      const first = session.receipts.at(0)?.sequence ?? session.acknowledgedThrough + 1;
      const last = session.receipts.at(-1)?.sequence ?? session.acknowledgedThrough;
      if (
        record.throughSequence < session.acknowledgedThrough ||
        (record.throughSequence !== session.acknowledgedThrough &&
          (record.throughSequence < first || record.throughSequence > last))
      ) {
        environmentFailure(session, request.requestId, "invalid_request");
        return;
      }
      session.acknowledgedThrough = record.throughSequence;
      while (
        session.receipts.length > 0 &&
        session.receipts[0]!.sequence <= record.throughSequence
      ) session.receipts.shift();
      postEnvironment(session, {
        revision: 1,
        kind: "environment_response",
        requestId: request.requestId,
        ok: true,
        response: {
          method: "acknowledge_receipts",
          throughSequence: record.throughSequence,
        },
      });
      retireSettledTombstone(session);
      return;
    }
    if (record.method === "begin_run") {
      if (!session.accepting) {
        environmentFailure(session, request.requestId, "workspace_closed");
        return;
      }
      if (session.activeRun !== null || session.exportOperation !== null) {
        environmentFailure(session, request.requestId, "run_busy");
        return;
      }
      if (
        record.binding.programId !== session.anchor.programId ||
        record.binding.workspaceId !== session.anchor.workspaceId ||
        record.binding.workspaceSessionId !== session.workspaceSessionId ||
        record.binding.expectedGeneration !== session.head.generation
      ) {
        environmentFailure(session, request.requestId, "invalid_binding");
        return;
      }
      const identity = runIdentityV1(record.sessionId, record.runId);
      if (session.usedRunIds.has(identity)) {
        environmentFailure(session, request.requestId, "duplicate_run");
        return;
      }
      session.usedRunIds.add(identity);
      session.activeRun = {
        sessionId: record.sessionId,
        runId: record.runId,
        expectedGeneration: record.binding.expectedGeneration,
        toolCallIds: new Set(),
        cursor: session.head.generation,
        activeScope: null,
      };
      postEnvironment(session, {
        revision: 1,
        kind: "environment_response",
        requestId: request.requestId,
        ok: true,
        response: { method: "begin_run", generation: session.head.generation },
      });
      return;
    }
    if (record.method === "begin_tool") {
      const run = session.activeRun;
      if (!session.accepting || run === null) {
        environmentFailure(
          session,
          request.requestId,
          session.accepting ? "run_not_current" : "workspace_closed",
        );
        return;
      }
      if (run.cursor !== session.head.generation) {
        environmentFailure(session, request.requestId, "cursor_mismatch");
        return;
      }
      if (run.activeScope !== null) {
        environmentFailure(session, request.requestId, "scope_busy");
        return;
      }
      if (run.toolCallIds.has(record.toolCallId)) {
        environmentFailure(session, request.requestId, "duplicate_tool_call");
        return;
      }
      if (
        (record.tool === "write" || record.tool === "edit") &&
        session.receipts.length + session.reservedReceiptSlots >=
          browserWorkspaceHostReceiptMaximumV1
      ) {
        environmentFailure(session, request.requestId, "receipt_queue_full");
        return;
      }
      run.toolCallIds.add(record.toolCallId);
      if (record.tool === "write" || record.tool === "edit") session.reservedReceiptSlots += 1;
      run.activeScope = {
        toolCallId: record.toolCallId,
        tool: record.tool,
        baseGeneration: run.cursor,
        abortController: new AbortController(),
        activeOperation: null,
        writeAttempted: false,
        changedPath: null,
        failureDiagnostic: null,
      };
      postEnvironment(session, {
        revision: 1,
        kind: "environment_response",
        requestId: request.requestId,
        ok: true,
        response: { method: "begin_tool", baseGeneration: run.cursor },
      });
      return;
    }
    if (record.method === "end_tool") {
      const run = session.activeRun;
      const scope = run?.activeScope ?? null;
      if (run === null || scope === null) {
        environmentFailure(session, request.requestId, "scope_missing");
        return;
      }
      if (scope.toolCallId !== record.toolCallId) {
        environmentFailure(session, request.requestId, "run_not_current");
        return;
      }
      if (scope.activeOperation !== null) await scope.activeOperation.catch(() => undefined);
      settleScope(session, run, scope, record.outcome);
      postEnvironment(session, {
        revision: 1,
        kind: "environment_response",
        requestId: request.requestId,
        ok: true,
        response: { method: "end_tool", generation: session.head.generation },
      });
      return;
    }
    if (record.method === "abort_run") {
      await abortRunAndDrain(session);
      postEnvironment(session, {
        revision: 1,
        kind: "environment_response",
        requestId: request.requestId,
        ok: true,
        response: { method: "abort_run", generation: session.head.generation },
      });
      return;
    }
    if (record.method === "end_run") {
      const run = session.activeRun;
      if (run === null) {
        environmentFailure(session, request.requestId, "run_not_current");
        return;
      }
      if (run.activeScope !== null) {
        environmentFailure(session, request.requestId, "scope_busy");
        return;
      }
      session.activeRun = null;
      postEnvironment(session, {
        revision: 1,
        kind: "environment_response",
        requestId: request.requestId,
        ok: true,
        response: { method: "end_run", generation: session.head.generation },
      });
    }
  };

  const runExport = async (
    session: SessionStateV1,
    operation: ExportOperationV1,
    input: {
      readonly programRevision: number;
      readonly repositoryRevision: number;
      readonly expectedHead: BrowserWorkspaceHostDurableHeadV1;
    },
  ): Promise<void> => {
    const lease = session.lease;
    let archive: BrowserWorkspaceHostPortableArchiveV1 | null = null;
    let downloadUrl: string | null = null;
    let sequence = 0;
    let progress: BrowserWorkspaceHostExportProgressWireV1 = {
      filesCompleted: 0,
      filesTotal: 0,
      bytesWritten: 0,
      bytesTotal: 0,
    };
    let totalsInitialized = false;
    let publishedProgress: BrowserWorkspaceHostExportProgressWireV1 | null = null;
    let terminalCode: BrowserWorkspaceHostExportFailureCodeV1 | null = null;

    const validProgress = (next: BrowserWorkspaceHostExportProgressWireV1): boolean =>
      Number.isSafeInteger(next.filesCompleted) && next.filesCompleted >= progress.filesCompleted &&
      Number.isSafeInteger(next.filesTotal) && next.filesTotal >= next.filesCompleted &&
      (!totalsInitialized || next.filesTotal === progress.filesTotal) &&
      Number.isSafeInteger(next.bytesWritten) && next.bytesWritten >= progress.bytesWritten &&
      Number.isSafeInteger(next.bytesTotal) && next.bytesTotal >= next.bytesWritten &&
      (!totalsInitialized || next.bytesTotal === progress.bytesTotal);

    const publishProgress = (next: BrowserWorkspaceHostExportProgressWireV1): void => {
      if (!validProgress(next) || operation.protocolFailed) {
        operation.protocolFailed = true;
        operation.abortController.abort();
        operation.resolveRelease();
        return;
      }
      progress = { ...next };
      totalsInitialized = true;
      if (
        publishedProgress !== null &&
        progress.filesCompleted - publishedProgress.filesCompleted < 64 &&
        progress.bytesWritten - publishedProgress.bytesWritten < 1024 * 1024
      ) return;
      try {
        postExport(operation, {
          revision: 1,
          kind: "workspace_export_progress",
          exportId: operation.exportId,
          sequence: ++sequence,
          ...progress,
        });
        publishedProgress = progress;
      } catch {
        operation.protocolFailed = true;
        operation.abortController.abort();
        operation.resolveRelease();
      }
    };

    try {
      if (lease === null) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "request_failed",
          "Workspace export lost its volume lease",
        );
      }
      archive = await lease.createPortableArchive({
        programRevision: input.programRevision,
        repositoryRevision: input.repositoryRevision,
        expectedHead: input.expectedHead,
        signal: operation.abortController.signal,
        onProgress: publishProgress,
      });
      if (operation.abortController.signal.aborted || operation.protocolFailed) {
        throw new DOMException("Workspace export was aborted", "AbortError");
      }
      const durableHead = durableHeadV1(await lease.readHead(), session.anchor);
      if (durableHead === null || !sameHeadV1(durableHead, input.expectedHead)) {
        throw new BrowserWorkspaceHostStorageErrorV1(
          "volume_corrupt",
          "Workspace export changed or lost its durable head",
        );
      }
      if (
        !validProgress(archive.progress) ||
        archive.progress.filesCompleted !== archive.progress.filesTotal ||
        archive.progress.bytesWritten !== archive.progress.bytesTotal ||
        archive.file.size !== archive.progress.bytesTotal
      ) {
        operation.protocolFailed = true;
        throw new BrowserWorkspaceHostStorageErrorV1(
          "request_failed",
          "Workspace archive returned invalid terminal progress",
        );
      }
      progress = { ...archive.progress };
      totalsInitialized = true;
      downloadUrl = createObjectUrl(archive.file);
      if (
        typeof downloadUrl !== "string" || downloadUrl.length > 4_096 ||
        !downloadUrl.startsWith("blob:")
      ) {
        operation.protocolFailed = true;
        throw new BrowserWorkspaceHostStorageErrorV1(
          "request_failed",
          "Workspace archive object URL is invalid",
        );
      }
      operation.ready = true;
      postExport(operation, {
        revision: 1,
        kind: "workspace_export_ready",
        exportId: operation.exportId,
        sequence: ++sequence,
        downloadUrl,
        checkpointId: input.expectedHead.checkpointId,
        generation: input.expectedHead.generation,
        ...progress,
      });
      if (operation.releaseRequested || operation.cancelRequested) operation.resolveRelease();
      let readyTimedOut = false;
      const readyTimeout = setTimeout(() => {
        readyTimedOut = true;
        operation.abortController.abort();
        operation.resolveRelease();
      }, exportReadyTimeoutMilliseconds);
      try {
        await operation.release;
      } finally {
        clearTimeout(readyTimeout);
      }
      if (operation.protocolFailed || readyTimedOut) terminalCode = "request_failed";
      else if (operation.cancelRequested) terminalCode = "cancelled";
      else if (!operation.releaseRequested) terminalCode = "request_failed";
    } catch (error) {
      if (error instanceof BrowserWorkspaceHostCleanupErrorV1) {
        terminalCode = "request_failed";
      } else if (operation.cancelRequested || operation.abortController.signal.aborted) {
        terminalCode = operation.protocolFailed ? "request_failed" : "cancelled";
      } else if (error instanceof BrowserWorkspaceHostStorageErrorV1) {
        terminalCode = error.code === "capacity_exceeded"
          ? "capacity_exceeded"
          : error.code === "storage_unavailable"
          ? "storage_unavailable"
          : "request_failed";
      } else if (error instanceof DOMException && error.name === "QuotaExceededError") {
        terminalCode = "capacity_exceeded";
      } else {
        terminalCode = "request_failed";
      }
    }

    let cleanupFailed = false;
    if (downloadUrl !== null) {
      try {
        revokeObjectUrl(downloadUrl);
      } catch {
        cleanupFailed = true;
      }
    }
    if (archive !== null) {
      try {
        await archive.release();
      } catch {
        cleanupFailed = true;
      }
    }
    if (cleanupFailed) terminalCode = "request_failed";
    if (operation.protocolFailed) terminalCode = "request_failed";

    try {
      if (terminalCode === null) {
        postExport(operation, {
          revision: 1,
          kind: "workspace_export_released",
          exportId: operation.exportId,
          sequence: ++sequence,
          checkpointId: input.expectedHead.checkpointId,
          generation: input.expectedHead.generation,
          ...progress,
        });
      } else {
        postExport(operation, {
          revision: 1,
          kind: "workspace_export_failed",
          exportId: operation.exportId,
          sequence: ++sequence,
          code: terminalCode,
          ...progress,
        });
      }
    } catch {
      // A lost page port cannot prevent Host-owned cleanup.
    } finally {
      operation.port.removeEventListener("message", operation.listener);
      operation.port.close?.();
      if (session.exportOperation === operation) session.exportOperation = null;
    }
  };

  const closeSession = (session: SessionStateV1): Promise<void> => {
    if (session.closeDrain !== null) return session.closeDrain;
    session.accepting = false;
    session.closeDrain = (async () => {
      const exportOperation = session.exportOperation;
      if (exportOperation !== null) {
        exportOperation.cancelRequested = true;
        exportOperation.abortController.abort();
        exportOperation.resolveRelease();
        await exportOperation.completion.catch(() => undefined);
      }
      await abortRunAndDrain(session);
      const lease = session.lease;
      let closeError: unknown = null;
      try {
        await lease?.close();
      } catch (error) {
        closeError = error;
      } finally {
        session.lease = null;
        session.phase = "closed";
        session.usedRunIds.clear();
        session.activeRun = null;
        session.reservedReceiptSlots = 0;
        sessions.delete(session.workspaceSessionId);
        if (currentOpenSession === session) currentOpenSession = null;
        if (session.receipts.length === 0) {
          detachEnvironment(session);
        } else {
          receiptTombstones.set(session.workspaceSessionId, session);
        }
      }
      if (closeError !== null) throw closeError;
    })();
    return session.closeDrain;
  };

  const handleControl = async (
    requestId: number,
    record: BrowserWorkspaceHostControlRequestRecordV1,
    transferredPorts: readonly BrowserWorkspaceHostMessagePortV1[],
  ): Promise<void> => {
    if (
      record.method !== "attach_environment" && record.method !== "start_export" &&
      transferredPorts.length !== 0
    ) {
      closeTransferredPorts(transferredPorts);
      controlFailure(requestId, "invalid_request");
      return;
    }
    if (record.method === "create_candidate") {
      if (
        currentOpenSession !== null || candidateAnchors.size !== 0 ||
        receiptTombstones.size !== 0
      ) {
        controlFailure(requestId, "workspace_busy");
        return;
      }
      try {
        const rawAnchor = await options.bootstrap.createCandidate(record);
        const anchor = admitBrowserWorkspaceVolumeAnchorWireV1(rawAnchor);
        if (
          anchor === null || anchor.programId !== record.programId ||
          anchor.workspaceId !== record.workspaceId
        ) {
          throw new BrowserWorkspaceHostStorageErrorV1(
            "volume_corrupt",
            "Candidate storage returned an invalid volume anchor",
          );
        }
        candidateAnchors.set(anchor.volumeId, anchor);
        postControl({
          revision: 1,
          kind: "control_response",
          requestId,
          ok: true,
          response: { method: "create_candidate", anchor },
        });
      } catch (error) {
        controlFailure(requestId, storageFailureCodeV1(error));
      }
      return;
    }
    if (record.method === "discard_candidate") {
      if (!candidateAnchors.has(record.volumeId)) {
        controlFailure(requestId, "candidate_mismatch");
        return;
      }
      try {
        await options.bootstrap.discardCandidate(record.volumeId);
        candidateAnchors.delete(record.volumeId);
        postControl({
          revision: 1,
          kind: "control_response",
          requestId,
          ok: true,
          response: { method: "discard_candidate", volumeId: record.volumeId },
        });
      } catch (error) {
        controlFailure(requestId, storageFailureCodeV1(error));
      }
      return;
    }
    if (record.method === "open_workspace") {
      if (currentOpenSession !== null || receiptTombstones.size !== 0) {
        controlFailure(requestId, "workspace_busy");
        return;
      }
      const retainedCandidate = candidateAnchors.get(record.anchor.volumeId);
      if (
        (retainedCandidate !== undefined &&
          (retainedCandidate.programId !== record.anchor.programId ||
            retainedCandidate.workspaceId !== record.anchor.workspaceId ||
            retainedCandidate.workspaceFormat !== record.anchor.workspaceFormat)) ||
        (retainedCandidate === undefined && candidateAnchors.size !== 0)
      ) {
        controlFailure(requestId, "candidate_mismatch");
        return;
      }
      try {
        const lease = await options.bootstrap.openVolume(record.anchor);
        const head = durableHeadV1(await lease.readHead(), record.anchor);
        if (head === null) {
          await lease.close().catch(() => undefined);
          throw new BrowserWorkspaceHostStorageErrorV1(
            "volume_corrupt",
            "Workspace volume head is invalid",
          );
        }
        const workspaceSessionId = createWorkspaceSessionId();
        if (!validIdentityV1(workspaceSessionId)) {
          await lease.close().catch(() => undefined);
          throw new BrowserWorkspaceHostStorageErrorV1(
            "request_failed",
            "Workspace session identity factory returned an invalid identity",
          );
        }
        const session: SessionStateV1 = {
          anchor: record.anchor,
          workspaceSessionId,
          lease,
          usedRunIds: new Set(),
          receipts: [],
          head,
          phase: "open",
          accepting: true,
          activeRun: null,
          nextReceiptSequence: 1,
          acknowledgedThrough: 0,
          reservedReceiptSlots: 0,
          environment: null,
          exportOperation: null,
          closeDrain: null,
        };
        candidateAnchors.delete(record.anchor.volumeId);
        sessions.set(workspaceSessionId, session);
        currentOpenSession = session;
        postControl({
          revision: 1,
          kind: "control_response",
          requestId,
          ok: true,
          response: { method: "open_workspace", snapshot: snapshot(session) },
        });
      } catch (error) {
        controlFailure(requestId, storageFailureCodeV1(error));
      }
      return;
    }
    const session = sessions.get(record.workspaceSessionId);
    if (session === undefined) {
      closeTransferredPorts(transferredPorts);
      controlFailure(requestId, "workspace_mismatch");
      return;
    }
    if (record.method === "query_workspace") {
      postControl({
        revision: 1,
        kind: "control_response",
        requestId,
        ok: true,
        response: { method: "query_workspace", snapshot: snapshot(session) },
      });
      return;
    }
    if (record.method === "start_export") {
      if (
        session.phase !== "open" || !session.accepting || session.lease === null ||
        session.activeRun !== null || session.exportOperation !== null
      ) {
        closeTransferredPorts(transferredPorts);
        controlFailure(requestId, "workspace_busy");
        return;
      }
      if (
        record.expectedCheckpointId !== session.head.checkpointId ||
        record.expectedGeneration !== session.head.generation
      ) {
        closeTransferredPorts(transferredPorts);
        controlFailure(requestId, "export_stale");
        return;
      }
      if (transferredPorts.length !== 1) {
        closeTransferredPorts(transferredPorts);
        controlFailure(requestId, "invalid_request");
        return;
      }
      const port = transferredPorts[0]!;
      let resolveRelease!: () => void;
      const release = new Promise<void>((resolve) => {
        resolveRelease = resolve;
      });
      const abortController = new AbortController();
      const operation = {} as ExportOperationV1;
      const listener = (event: Readonly<{ data: unknown }>): void => {
        const message = admitBrowserWorkspaceHostExportInboundMessageV1(event.data);
        if (message === null || message.exportId !== operation.exportId) {
          operation.protocolFailed = true;
          operation.abortController.abort();
          operation.resolveRelease();
          return;
        }
        if (message.kind === "workspace_export_cancel") {
          if (operation.releaseRequested) return;
          operation.cancelRequested = true;
          operation.abortController.abort();
          operation.resolveRelease();
          return;
        }
        if (!operation.ready) {
          operation.protocolFailed = true;
          operation.abortController.abort();
        } else {
          operation.releaseRequested = true;
        }
        operation.resolveRelease();
      };
      Object.assign(
        operation,
        {
          exportId: record.exportId,
          port,
          listener,
          abortController,
          release,
          resolveRelease,
          completion: Promise.resolve(),
          releaseRequested: false,
          cancelRequested: false,
          protocolFailed: false,
          ready: false,
        } satisfies ExportOperationV1,
      );
      session.exportOperation = operation;
      port.addEventListener("message", listener);
      port.start?.();
      postControl({
        revision: 1,
        kind: "control_response",
        requestId,
        ok: true,
        response: {
          method: "start_export",
          exportId: record.exportId,
          snapshot: snapshot(session),
        },
      });
      operation.completion = Promise.resolve().then(() =>
        runExport(session, operation, {
          programRevision: record.programRevision,
          repositoryRevision: record.repositoryRevision,
          expectedHead: session.head,
        })
      );
      return;
    }
    if (record.method === "attach_environment") {
      if (session.phase !== "open") {
        closeTransferredPorts(transferredPorts);
        controlFailure(requestId, "workspace_mismatch");
        return;
      }
      if (session.environment !== null) {
        closeTransferredPorts(transferredPorts);
        controlFailure(requestId, "environment_attached");
        return;
      }
      if (transferredPorts.length !== 1) {
        closeTransferredPorts(transferredPorts);
        controlFailure(requestId, "invalid_request");
        return;
      }
      const port = transferredPorts[0]!;
      const listener = (event: Readonly<{ data: unknown }>): void => {
        void handleEnvironment(session, event.data);
      };
      session.environment = { port, listener };
      port.addEventListener("message", listener);
      port.start?.();
      postControl({
        revision: 1,
        kind: "control_response",
        requestId,
        ok: true,
        response: { method: "attach_environment", snapshot: snapshot(session) },
      });
      return;
    }
    try {
      await closeSession(session);
      postControl({
        revision: 1,
        kind: "control_response",
        requestId,
        ok: true,
        response: { method: "close_workspace", snapshot: snapshot(session) },
      });
    } catch (error) {
      controlFailure(requestId, storageFailureCodeV1(error));
    }
  };

  const receiveControl = (
    message: unknown,
    transferredPorts: readonly BrowserWorkspaceHostMessagePortV1[] = [],
  ): Promise<void> => {
    const operation = controlTail.then(async () => {
      const request = admitBrowserWorkspaceHostControlRequestV1(message);
      if (request === null) {
        closeTransferredPorts(transferredPorts);
        const requestId = requestIdFromMalformedV1(message);
        if (requestId !== null) controlFailure(requestId, "invalid_request");
        return;
      }
      if (disposed) {
        closeTransferredPorts(transferredPorts);
        controlFailure(request.requestId, "disposed");
        return;
      }
      await handleControl(request.requestId, request.record, transferredPorts);
    });
    controlTail = operation.catch(() => undefined);
    return operation;
  };

  const dispose = async (): Promise<void> => {
    if (disposed) return;
    await controlTail;
    const retainedSessions = new Set([...sessions.values(), ...receiptTombstones.values()]);
    const closing = [...retainedSessions].filter((session) => session.phase === "open").map(
      closeSession,
    );
    await Promise.allSettled(closing);
    for (const session of retainedSessions) detachEnvironment(session);
    sessions.clear();
    receiptTombstones.clear();
    // A candidate may already be the winner of an outcome-unknown Repository CAS.
    // Only the explicit discard_candidate command is allowed to delete its volume.
    candidateAnchors.clear();
    await options.bootstrap.dispose();
    disposed = true;
  };

  return { receiveControl, dispose };
}

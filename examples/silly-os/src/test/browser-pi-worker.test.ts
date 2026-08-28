// SPDX-License-Identifier: MIT

import { readFile } from "node:fs/promises";

import { createAgentRpcClientInternalV1 } from "@sillymaker/agent/internal";
import { afterEach, describe, expect, it, vi } from "vitest";

import { browserPiDistributionIdentityV1 } from "../agent/browser-pi-distribution.ts";
import {
  createDefaultBrowserPiWorkerV1,
  createBrowserPiWorkerRawTransportV1,
  type BrowserPiWorkerLikeV1,
} from "../agent/browser-pi-transport.ts";
import {
  createBrowserPiWorkerRuntimeV1,
  createBrowserPiWorkspaceToolsV1,
} from "../agent/browser-pi-worker-runtime.ts";
import type {
  BrowserPiModelSelectionFailureCodeV1,
  BrowserPiModelSelectionV1,
  BrowserPiWorkerAnyOutboundMessageV1,
  BrowserPiWorkerExecutionBindingV1,
  BrowserPiWorkspaceSnapshotWireV1,
} from "../agent/browser-pi-worker-protocol.ts";
import {
  createBrowserCreatorAgentPortV1,
  type CreatorAgentPortV1,
} from "../agent/creator-agent-port.ts";
import {
  deterministicBashProbePrefixV1,
  deterministicCancellationHoldPrefixV1,
  deterministicEditProbePrefixV1,
  deterministicGrepProbePrefixV1,
  deterministicPersistenceReadPrefixV1,
} from "../agent/browser-pi-runtime-bridge.js";
import type {
  BrowserProgramWorkspaceAuthorityV1,
  BrowserProgramWorkspaceFatalV1,
} from "../product/browser-program-workspace-authority.ts";
import { serializeCreatorAgentSubmitV1 } from "../product/creator-agent-admission.ts";
import type { CreatorAgentRunRequestV1, CreatorAgentSubmitV1 } from "../product/contracts.ts";
import {
  programWorkspaceSnapshotReceiptsEqualV1,
  type ProgramWorkspaceSnapshotReceiptV1,
  workspaceRootV1,
} from "../workspace/contracts.ts";
import {
  browserWorkspaceNativePiToolPayloadMaximumBytesV1,
  type BrowserWorkspaceHostControlFailureCodeV1,
  type BrowserWorkspaceHostControlOutboundMessageV1,
  type BrowserWorkspaceHostControlRequestRecordV1,
  type BrowserWorkspaceHostControlSuccessResponseV1,
  type BrowserWorkspaceHostSnapshotWireV1,
  type BrowserWorkspaceVolumeAnchorWireV1,
} from "../workspace/browser-workspace-host-protocol.ts";
import { BrowserWorkspaceHostControlErrorV1 } from "../workspace/browser-workspace-host-port.ts";
import {
  createBrowserWorkspaceHostRuntimeV1,
  type BrowserWorkspaceHostBootstrapPortV1,
  type BrowserWorkspaceHostDurableHeadV1,
  type BrowserWorkspaceHostFileMetadataV1,
  type BrowserWorkspaceHostMessagePortV1,
  type BrowserWorkspaceHostReplaceFileInputV1,
  type BrowserWorkspaceHostReplaceFileResultV1,
  type BrowserWorkspaceHostVolumeLeasePortV1,
} from "../workspace/browser-workspace-host-runtime.ts";

const workspaceIdV1 = "workspace.preview.1";
const workspaceSessionIdV1 = "sillyos.workspace.session.1";
const roundTripArtifactRelativePathV1 = ".sillyos/p3a-round-trip.txt";
const roundTripArtifactPathV1 = `${workspaceRootV1}/${roundTripArtifactRelativePathV1}`;
const availableSelectionV1 = Object.freeze(
  {
    kind: "builtin",
    providerId: "openai",
    modelId: "gpt-4.1-nano",
    api: "openai-responses",
    baseUrl: "https://api.openai.com/v1",
  } as const,
);
const copilotAnthropicSelectionV1 = Object.freeze(
  {
    kind: "builtin",
    providerId: "github-copilot",
    modelId: "claude-haiku-4.5",
    api: "anthropic-messages",
    baseUrl: "https://api.individual.githubcopilot.com",
  } as const,
);
const copilotCompletionsSelectionV1 = Object.freeze(
  {
    kind: "builtin",
    providerId: "github-copilot",
    modelId: "claude-fable-5",
    api: "openai-completions",
    baseUrl: "https://api.individual.githubcopilot.com",
  } as const,
);
const representativeProviderSelectionsV1 = Object.freeze([
  availableSelectionV1,
  Object.freeze({
    kind: "builtin",
    providerId: "anthropic",
    modelId: "claude-sonnet-4-5-20250929",
    api: "anthropic-messages",
    baseUrl: "https://api.anthropic.com",
  }),
  Object.freeze({
    kind: "builtin",
    providerId: "google",
    modelId: "gemini-2.5-flash",
    api: "google-generative-ai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  }),
  Object.freeze({
    kind: "builtin",
    providerId: "deepseek",
    modelId: "deepseek-v4-flash",
    api: "openai-completions",
    baseUrl: "https://api.deepseek.com",
  }),
  Object.freeze({
    kind: "builtin",
    providerId: "xai",
    modelId: "grok-4.3",
    api: "openai-responses",
    baseUrl: "https://api.x.ai/v1",
  }),
]);
const customSelectionV1 = Object.freeze(
  {
    kind: "custom",
    profile: Object.freeze({
      profileId: "custom.private-gateway",
      displayName: "Private gateway",
      api: "openai-completions",
      baseUrl: "https://llm.example.test/v1",
      modelId: "private-model",
      contextWindow: 32_768,
      maxTokens: 4_096,
    }),
  } as const,
);
const testWorkspaceAuthoritiesV1 = new Set<{ dispose(): Promise<void> }>();

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  const authorities = [...testWorkspaceAuthoritiesV1];
  testWorkspaceAuthoritiesV1.clear();
  await Promise.all(authorities.map((authority) => authority.dispose()));
});

const submitV1: CreatorAgentSubmitV1 = {
  revision: 1,
  proposalId: "workspace.preview.1.proposal.1",
  programId: "program.workspace.preview.1",
  baseProgramRevision: 1,
  text: "Make review explicit.",
};

function productRunV1(
  overrides: Partial<CreatorAgentRunRequestV1> = {},
): CreatorAgentRunRequestV1 {
  return {
    agentRunId: "agent.run.product.1",
    proposalId: submitV1.proposalId,
    programId: submitV1.programId,
    baseProgramRevision: submitV1.baseProgramRevision,
    baseRepositoryRevision: 1,
    text: submitV1.text,
    ...overrides,
  };
}

async function waitUntilV1(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Timed out waiting for the Browser Pi test runtime");
}

function rpcRequestV1(
  requestId: number,
  record: Readonly<Record<string, unknown>>,
  execution?: BrowserPiWorkerExecutionBindingV1,
): Readonly<Record<string, unknown>> {
  return execution === undefined
    ? { revision: 1, kind: "rpc_request", requestId, record }
    : { revision: 1, kind: "rpc_request", requestId, record, execution };
}

function workspaceRequestV1(
  requestId: number,
  record: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return { revision: 1, kind: "workspace_request", requestId, record };
}

function executionBindingV1(expectedGeneration = 1): BrowserPiWorkerExecutionBindingV1 {
  return {
    revision: 1,
    programId: submitV1.programId,
    workspaceId: workspaceIdV1,
    workspaceSessionId: workspaceSessionIdV1,
    expectedGeneration,
  };
}

interface TestBrowserWorkspaceVolumeStateV1 {
  head: BrowserWorkspaceHostDurableHeadV1;
  preparedSnapshot: ProgramWorkspaceSnapshotReceiptV1 | null;
  readonly retainedSnapshots: Map<string, ProgramWorkspaceSnapshotReceiptV1>;
  readonly files: Map<string, Uint8Array>;
  readonly readFileRangeRequests: {
    readonly path: string;
    readonly offset: number;
    readonly length: number;
  }[];
  readonly sourceReadRequests: {
    readonly path: string;
    readonly offset: number;
    readonly length: number;
    readonly byteLength: number;
  }[];
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

class TestBrowserWorkspaceVolumeLeaseV1 implements BrowserWorkspaceHostVolumeLeasePortV1 {
  private closed = false;

  constructor(
    readonly anchor: BrowserWorkspaceVolumeAnchorWireV1,
    private readonly state: TestBrowserWorkspaceVolumeStateV1,
  ) {}

  async readHead(): Promise<BrowserWorkspaceHostDurableHeadV1> {
    return { ...this.state.head };
  }

  async stat(path: string): Promise<BrowserWorkspaceHostFileMetadataV1> {
    if (path.length === 0) return { kind: "directory", size: 0, mtimeMs: 0 };
    const bytes = this.state.files.get(path);
    if ([...this.state.files.keys()].some((candidate) => candidate.startsWith(`${path}/`))) {
      return { kind: "directory", size: 0, mtimeMs: 0 };
    }
    return bytes === undefined
      ? { kind: "missing", size: 0, mtimeMs: 0 }
      : { kind: "file", size: bytes.length, mtimeMs: 1_725_235_200_000 };
  }

  async listDirectory(input: { readonly path: string; readonly signal: AbortSignal }) {
    if (input.signal.aborted) throw new DOMException("Workspace listing aborted", "AbortError");
    const prefix = input.path.length === 0 ? "" : `${input.path}/`;
    const entries = new Map<string, "file" | "directory">();
    for (const path of this.state.files.keys()) {
      if (!path.startsWith(prefix)) continue;
      const remainder = path.slice(prefix.length);
      if (remainder.length === 0) continue;
      const separator = remainder.indexOf("/");
      entries.set(
        separator < 0 ? remainder : remainder.slice(0, separator),
        separator < 0 ? "file" : "directory",
      );
    }
    return [...entries].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(
      ([name, kind]) => ({
        name,
        kind,
        size: kind === "file" ? this.state.files.get(`${prefix}${name}`)?.byteLength ?? 0 : 0,
        mtimeMs: kind === "file" ? 1_725_235_200_000 : 0,
      }),
    );
  }

  async readFileRange(input: {
    readonly path: string;
    readonly offset: number;
    readonly length: number;
    readonly signal: AbortSignal;
  }): Promise<Uint8Array> {
    if (input.signal.aborted) throw new DOMException("Workspace read aborted", "AbortError");
    this.state.readFileRangeRequests.push({
      path: input.path,
      offset: input.offset,
      length: input.length,
    });
    return this.state.files.get(input.path)?.slice(
      input.offset,
      input.offset + input.length,
    ) ?? new Uint8Array();
  }

  async replaceFile(
    input: BrowserWorkspaceHostReplaceFileInputV1,
  ): Promise<BrowserWorkspaceHostReplaceFileResultV1> {
    if (this.closed) throw new Error("test Workspace volume lease is closed");
    if (input.signal.aborted) throw new DOMException("Workspace write aborted", "AbortError");
    if (
      input.expectedHead.checkpointId !== this.state.head.checkpointId ||
      input.expectedHead.generation !== this.state.head.generation
    ) throw new Error("test Workspace durable head is stale");
    this.state.sourceReadRequests.push({
      path: input.path,
      offset: 0,
      length: input.source.byteLength,
      byteLength: input.source.byteLength,
    });
    const bytes = await input.source.readRange({
      offset: 0,
      length: input.source.byteLength,
      signal: input.signal,
    });
    if (bytes.byteLength !== input.source.byteLength) {
      throw new Error("test Workspace source returned an inexact range");
    }
    const previous = this.state.files.get(input.path);
    if (previous !== undefined && bytesEqualV1(previous, bytes)) {
      return { changed: false, head: { ...this.state.head } };
    }
    this.state.files.set(input.path, bytes.slice());
    this.state.head = {
      ...this.state.head,
      checkpointId: input.nextCheckpointId,
      generation: this.state.head.generation + 1,
    };
    return { changed: true, head: { ...this.state.head } };
  }

  async createPortableArchive(
    input: Parameters<BrowserWorkspaceHostVolumeLeasePortV1["createPortableArchive"]>[0],
  ): ReturnType<BrowserWorkspaceHostVolumeLeasePortV1["createPortableArchive"]> {
    const progress = {
      filesCompleted: 0,
      filesTotal: 0,
      bytesWritten: 22,
      bytesTotal: 22,
    };
    input.onProgress(progress);
    return {
      file: new File(["test-workspace-archive"], "workspace.zip"),
      progress,
      release: () => Promise.resolve(),
    };
  }

  async prepareImmutableSnapshot(
    input: Parameters<BrowserWorkspaceHostVolumeLeasePortV1["prepareImmutableSnapshot"]>[0],
  ): ReturnType<BrowserWorkspaceHostVolumeLeasePortV1["prepareImmutableSnapshot"]> {
    const receipt: ProgramWorkspaceSnapshotReceiptV1 = {
      revision: 1,
      snapshotId: input.snapshotId,
      programId: this.anchor.programId,
      workspaceId: this.anchor.workspaceId,
      volumeId: this.anchor.volumeId,
      workspaceFormat: 1,
      proposalId: input.proposalId,
      programRevision: input.programRevision,
      baseRepositoryRevision: input.baseRepositoryRevision,
      checkpointId: input.expectedHead.checkpointId,
      generation: input.expectedHead.generation,
      fileCount: this.state.files.size,
      archiveBytes: 22,
    };
    this.state.preparedSnapshot = receipt;
    return receipt;
  }

  queryCurrentImmutableSnapshotCandidate(): Promise<ProgramWorkspaceSnapshotReceiptV1 | null> {
    return Promise.resolve(this.state.preparedSnapshot);
  }

  queryRetainedImmutableSnapshot(
    expected: ProgramWorkspaceSnapshotReceiptV1,
  ): Promise<ProgramWorkspaceSnapshotReceiptV1 | null> {
    const retained = this.state.retainedSnapshots.get(expected.snapshotId) ?? null;
    return Promise.resolve(
      retained !== null && programWorkspaceSnapshotReceiptsEqualV1(retained, expected)
        ? retained
        : null,
    );
  }

  resumeImmutableSnapshotPublication(
    expected: ProgramWorkspaceSnapshotReceiptV1,
  ): Promise<ProgramWorkspaceSnapshotReceiptV1> {
    if (
      this.state.preparedSnapshot === null ||
      !programWorkspaceSnapshotReceiptsEqualV1(this.state.preparedSnapshot, expected) ||
      this.state.head.checkpointId !== expected.checkpointId ||
      this.state.head.generation !== expected.generation
    ) throw new Error("test Workspace snapshot resume mismatch");
    return Promise.resolve(expected);
  }

  adoptImmutableSnapshot(
    expected: ProgramWorkspaceSnapshotReceiptV1,
  ): Promise<"adopted" | "already_retained"> {
    const retained = this.state.retainedSnapshots.get(expected.snapshotId);
    if (retained !== undefined) {
      if (!programWorkspaceSnapshotReceiptsEqualV1(retained, expected)) {
        throw new Error("test Workspace retained snapshot mismatch");
      }
      return Promise.resolve("already_retained");
    }
    if (
      this.state.preparedSnapshot === null ||
      !programWorkspaceSnapshotReceiptsEqualV1(this.state.preparedSnapshot, expected)
    ) throw new Error("test Workspace snapshot adopt mismatch");
    this.state.retainedSnapshots.set(expected.snapshotId, expected);
    this.state.preparedSnapshot = null;
    return Promise.resolve("adopted");
  }

  discardImmutableSnapshot(
    expected: ProgramWorkspaceSnapshotReceiptV1,
  ): Promise<"discarded" | "absent" | "retained"> {
    const retained = this.state.retainedSnapshots.get(expected.snapshotId);
    if (retained !== undefined) {
      if (!programWorkspaceSnapshotReceiptsEqualV1(retained, expected)) {
        throw new Error("test Workspace retained snapshot mismatch");
      }
      return Promise.resolve("retained");
    }
    if (this.state.preparedSnapshot === null) return Promise.resolve("absent");
    if (!programWorkspaceSnapshotReceiptsEqualV1(this.state.preparedSnapshot, expected)) {
      throw new Error("test Workspace snapshot discard mismatch");
    }
    this.state.preparedSnapshot = null;
    return Promise.resolve("discarded");
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

class TestBrowserWorkspaceBootstrapV1 implements BrowserWorkspaceHostBootstrapPortV1 {
  readonly anchor: BrowserWorkspaceVolumeAnchorWireV1 = Object.freeze({
    revision: 1,
    programId: submitV1.programId,
    workspaceId: workspaceIdV1,
    volumeId: "sillyos.workspace.volume.test.1",
    workspaceFormat: 1,
  });
  readonly state: TestBrowserWorkspaceVolumeStateV1 = {
    head: {
      revision: 1,
      volumeId: this.anchor.volumeId,
      workspaceFormat: 1,
      checkpointId: "sillyos.workspace.checkpoint.test.1",
      generation: 1,
    },
    preparedSnapshot: null,
    retainedSnapshots: new Map(),
    files: new Map(),
    readFileRangeRequests: [],
    sourceReadRequests: [],
  };
  private candidate = false;

  async createCandidate(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }) {
    if (
      input.programId !== this.anchor.programId || input.workspaceId !== this.anchor.workspaceId
    ) {
      throw new Error("test Workspace identity mismatch");
    }
    this.candidate = true;
    return {
      revision: 1,
      anchor: this.anchor,
      checkpointId: this.state.head.checkpointId,
      generation: this.state.head.generation,
    } as const;
  }

  async discardCandidate(volumeId: string): Promise<void> {
    if (!this.candidate || volumeId !== this.anchor.volumeId) {
      throw new Error("test Workspace candidate mismatch");
    }
    this.candidate = false;
  }

  async openVolume(
    anchor: BrowserWorkspaceVolumeAnchorWireV1,
  ): Promise<BrowserWorkspaceHostVolumeLeasePortV1> {
    if (anchor.volumeId !== this.anchor.volumeId) throw new Error("test Workspace volume missing");
    this.candidate = false;
    return new TestBrowserWorkspaceVolumeLeaseV1(this.anchor, this.state);
  }

  async dispose(): Promise<void> {}
}

/** Explicit Host-side test authority; no disposable Pi-side workspace fallback exists. */
class TestBrowserProgramWorkspaceAuthorityV1 implements BrowserProgramWorkspaceAuthorityV1 {
  private readonly bootstrap = new TestBrowserWorkspaceBootstrapV1();
  private readonly controls: BrowserWorkspaceHostControlOutboundMessageV1[] = [];
  private readonly fatalListeners = new Set<
    (fatal: BrowserProgramWorkspaceFatalV1) => void
  >();
  private readonly runtime;
  private anchor: BrowserWorkspaceVolumeAnchorWireV1 | null = null;
  private nextRequestId = 1;
  private nextCheckpointOrdinal = 2;
  private disposed = false;
  closeWorkspaceCalls = 0;
  agentSubmitAdmissionCalls = 0;
  readonly detachWorkspaceEnvironmentCalls: string[] = [];
  disposeCalls = 0;
  exportCalls = 0;
  exportAborted = false;
  holdExport = false;
  holdAuthorizedExport = false;
  authorizedExportStarted = false;
  private finishAuthorizedExport: (() => void) | null = null;
  nextOpenFailureCode: BrowserWorkspaceHostControlFailureCodeV1 | null = null;

  releaseAuthorizedExport(): void {
    this.finishAuthorizedExport?.();
    this.finishAuthorizedExport = null;
  }

  constructor() {
    testWorkspaceAuthoritiesV1.add(this);
    this.runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap: this.bootstrap,
      postControlMessage: (message) => this.controls.push(structuredClone(message)),
      createWorkspaceSessionId: () => workspaceSessionIdV1,
      createCheckpointId: () =>
        `sillyos.workspace.checkpoint.test.${String(this.nextCheckpointOrdinal++)}`,
    });
  }

  async initialize(): Promise<void> {}

  async list(): Promise<never> {
    throw new Error("test repository catalog is unavailable");
  }

  async load(): Promise<never> {
    throw new Error("test repository load is unavailable");
  }

  async inspectProgramWorkspace(): Promise<never> {
    throw new Error("test workspace review inspection is unavailable");
  }

  async create(): Promise<never> {
    throw new Error("test repository create is unavailable");
  }

  async applyRevision(): Promise<never> {
    throw new Error("test repository revision is unavailable");
  }

  async settleAgentRun(): Promise<never> {
    throw new Error("test repository Agent settlement is unavailable");
  }

  async decide(): Promise<never> {
    throw new Error("test repository decision is unavailable");
  }

  async withAgentSubmitAdmission<T>(
    input: {
      readonly programId: string;
      readonly workspaceSessionId: string;
      readonly expectedProgramRevision: number;
      readonly expectedRepositoryRevision: number;
      readonly expectedGeneration: number;
      readonly operation: () => Promise<T>;
    },
  ): Promise<T> {
    this.agentSubmitAdmissionCalls += 1;
    return await input.operation();
  }

  get readFileRangeRequests(): TestBrowserWorkspaceVolumeStateV1["readFileRangeRequests"] {
    return this.bootstrap.state.readFileRangeRequests;
  }

  get sourceReadRequests(): TestBrowserWorkspaceVolumeStateV1["sourceReadRequests"] {
    return this.bootstrap.state.sourceReadRequests;
  }

  private async control(
    record: BrowserWorkspaceHostControlRequestRecordV1,
    ports: readonly BrowserWorkspaceHostMessagePortV1[] = [],
  ): Promise<BrowserWorkspaceHostControlSuccessResponseV1["response"]> {
    if (this.disposed) throw new Error("test Workspace authority is disposed");
    const requestId = this.nextRequestId++;
    await this.runtime.receiveControl(
      { revision: 1, kind: "control_request", requestId, record },
      ports,
    );
    const response = this.controls.find((message) => message.requestId === requestId);
    if (response === undefined || !response.ok) {
      throw new Error(`test Workspace Host rejected ${record.method}`);
    }
    return response.response;
  }

  async openWorkspace(input: {
    readonly programId: string;
    readonly workspaceId: string;
  }): Promise<{
    readonly snapshot: BrowserWorkspaceHostSnapshotWireV1;
    readonly environmentPort: MessagePort;
  }> {
    if (this.nextOpenFailureCode !== null) {
      const code = this.nextOpenFailureCode;
      this.nextOpenFailureCode = null;
      throw new BrowserWorkspaceHostControlErrorV1(code, `synthetic ${code}`);
    }
    if (this.anchor === null) {
      const created = await this.control({ method: "create_candidate", ...input });
      if (created.method !== "create_candidate") {
        throw new Error("test candidate response mismatch");
      }
      this.anchor = created.candidate.anchor;
    }
    const opened = await this.control({ method: "open_workspace", anchor: this.anchor });
    if (opened.method !== "open_workspace") throw new Error("test open response mismatch");
    const channel = new MessageChannel();
    const attached = await this.control(
      {
        method: "attach_environment",
        workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
      },
      [channel.port1 as unknown as BrowserWorkspaceHostMessagePortV1],
    );
    if (attached.method !== "attach_environment") {
      channel.port2.close();
      throw new Error("test environment attachment response mismatch");
    }
    return { snapshot: attached.snapshot, environmentPort: channel.port2 };
  }

  async queryWorkspace(workspaceSessionId: string): Promise<BrowserWorkspaceHostSnapshotWireV1> {
    const response = await this.control({ method: "query_workspace", workspaceSessionId });
    if (response.method !== "query_workspace") throw new Error("test query response mismatch");
    return response.snapshot;
  }

  async detachWorkspaceEnvironment(workspaceSessionId: string): Promise<void> {
    this.detachWorkspaceEnvironmentCalls.push(workspaceSessionId);
  }

  exportWorkspace(
    input: Parameters<BrowserProgramWorkspaceAuthorityV1["exportWorkspace"]>[0],
  ): ReturnType<BrowserProgramWorkspaceAuthorityV1["exportWorkspace"]> {
    this.exportCalls += 1;
    const progress = {
      filesCompleted: 1,
      filesTotal: 1,
      bytesWritten: 128,
      bytesTotal: 128,
    };
    input.onProgress?.(progress);
    return (async () => {
      if (this.holdExport) {
        await new Promise<void>((resolve) => {
          if (input.signal.aborted) {
            this.exportAborted = true;
            resolve();
            return;
          }
          input.signal.addEventListener("abort", () => {
            this.exportAborted = true;
            resolve();
          }, { once: true });
        });
        return { kind: "cancelled", ...progress };
      }
      const decision = await input.onReady({
        ...progress,
        checkpointId: this.bootstrap.state.head.checkpointId,
        generation: this.bootstrap.state.head.generation,
      }, async () => {
        this.authorizedExportStarted = true;
        if (!this.holdAuthorizedExport) return;
        await new Promise<void>((resolve) => {
          this.finishAuthorizedExport = resolve;
        });
      });
      return decision === "release"
        ? {
          kind: "released",
          checkpointId: this.bootstrap.state.head.checkpointId,
          generation: this.bootstrap.state.head.generation,
          ...progress,
        }
        : { kind: "cancelled", ...progress };
    })();
  }

  async closeWorkspace(workspaceSessionId: string): Promise<BrowserWorkspaceHostSnapshotWireV1> {
    this.closeWorkspaceCalls += 1;
    const response = await this.control({ method: "close_workspace", workspaceSessionId });
    if (response.method !== "close_workspace") throw new Error("test close response mismatch");
    return response.snapshot;
  }

  async closeActiveWorkspace(): Promise<BrowserWorkspaceHostSnapshotWireV1 | null> {
    try {
      return await this.closeWorkspace(workspaceSessionIdV1);
    } catch {
      return null;
    }
  }

  subscribeFatal(listener: (fatal: BrowserProgramWorkspaceFatalV1) => void): () => void {
    this.fatalListeners.add(listener);
    return () => this.fatalListeners.delete(listener);
  }

  failHost(fatal: BrowserProgramWorkspaceFatalV1): void {
    for (const listener of [...this.fatalListeners]) listener(fatal);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.disposeCalls += 1;
    this.fatalListeners.clear();
    await this.runtime.dispose();
  }
}

function testWorkspaceAuthorityV1(): TestBrowserProgramWorkspaceAuthorityV1 {
  return new TestBrowserProgramWorkspaceAuthorityV1();
}

async function attachRuntimeWorkspaceV1(
  runtime: ReturnType<typeof createBrowserPiWorkerRuntimeV1>,
  messages: readonly BrowserPiWorkerAnyOutboundMessageV1[],
  authority: BrowserProgramWorkspaceAuthorityV1,
  requestId = 2,
): Promise<BrowserPiWorkerExecutionBindingV1> {
  const opened = await authority.openWorkspace({
    programId: submitV1.programId,
    workspaceId: workspaceIdV1,
  });
  const descriptor: BrowserPiWorkerExecutionBindingV1 = {
    revision: 1,
    programId: opened.snapshot.descriptor.programId,
    workspaceId: opened.snapshot.descriptor.workspaceId,
    workspaceSessionId: opened.snapshot.descriptor.workspaceSessionId,
    expectedGeneration: opened.snapshot.descriptor.generation,
  };
  runtime.receive(
    workspaceRequestV1(requestId, { method: "attach_workspace", descriptor }),
    [opened.environmentPort],
  );
  await waitUntilV1(() =>
    messages.some((message) =>
      message.kind === "workspace_response" && message.requestId === requestId && message.ok
    )
  );
  return descriptor;
}

async function configureAndTestProductPortV1(
  port: CreatorAgentPortV1,
  apiKey = "sentinel-browser-key",
): Promise<void> {
  await expect(port.configureCredential(apiKey)).resolves.toEqual({ kind: "configured" });
  await expect(port.testConnection()).resolves.toEqual({ kind: "ready" });
}

async function openProductWorkspaceV1(port: CreatorAgentPortV1): Promise<void> {
  if (port.getSnapshot().phase === "uninitialized") await configureAndTestProductPortV1(port);
  await expect(port.openWorkspace({ programId: submitV1.programId, workspaceId: workspaceIdV1 }))
    .resolves.toEqual({
      kind: "opened",
      descriptor: {
        revision: 1,
        programId: submitV1.programId,
        workspaceId: workspaceIdV1,
        workspaceSessionId: expect.any(String),
        generation: 1,
      },
    });
}

class InMemoryBrowserPiWorkerV1 {
  readonly posted: unknown[] = [];
  terminated = false;
  private readonly messageListeners = new Set<(event: { readonly data: unknown }) => void>();
  private readonly errorListeners = new Set<(event: unknown) => void>();
  private readonly runtime = createBrowserPiWorkerRuntimeV1({
    postMessage: (message) => {
      const data = structuredClone(message);
      for (const listener of [...this.messageListeners]) listener({ data });
    },
  });

  postMessage(message: unknown, transfer: Transferable[] = []): void {
    if (this.terminated) throw new Error("Worker is terminated");
    const data = structuredClone(message);
    this.posted.push(data);
    this.runtime.receive(data, transfer as unknown as MessagePort[]);
  }

  addEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void;
  addEventListener(type: "error", listener: (event: unknown) => void): void;
  addEventListener(
    type: "message" | "error",
    listener: ((event: { readonly data: unknown }) => void) | ((event: unknown) => void),
  ): void {
    if (type === "message") {
      this.messageListeners.add(listener as (event: { readonly data: unknown }) => void);
    } else {
      this.errorListeners.add(listener as (event: unknown) => void);
    }
  }

  removeEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void;
  removeEventListener(type: "error", listener: (event: unknown) => void): void;
  removeEventListener(
    type: "message" | "error",
    listener: ((event: { readonly data: unknown }) => void) | ((event: unknown) => void),
  ): void {
    if (type === "message") {
      this.messageListeners.delete(listener as (event: { readonly data: unknown }) => void);
    } else {
      this.errorListeners.delete(listener as (event: unknown) => void);
    }
  }

  terminate(): void {
    if (this.terminated) return;
    this.terminated = true;
    this.runtime.dispose();
    this.messageListeners.clear();
    this.errorListeners.clear();
  }
}

class RuntimeMismatchBrowserPiWorkerV1 implements BrowserPiWorkerLikeV1 {
  terminated = false;
  private readonly messageListeners = new Set<(event: { readonly data: unknown }) => void>();
  private readonly errorListeners = new Set<(event: unknown) => void>();

  constructor(private readonly mismatch: "runtime" | "selection" = "runtime") {}

  postMessage(message: unknown): void {
    const envelope = message as Readonly<Record<string, unknown>>;
    if (envelope.kind !== "configure") return;
    const runtime = (message as { readonly runtime?: unknown }).runtime;
    const requestedSelection = (message as { readonly selection?: unknown }).selection;
    const mismatchedRuntime = this.mismatch === "runtime"
      ? runtime === "pi_provider" ? "deterministic_test" : "pi_provider"
      : runtime;
    const selection = this.mismatch === "selection"
      ? {
        kind: "builtin",
        providerId: "openai",
        modelId: "gpt-4.1-mini",
        api: "openai-responses",
        baseUrl: "https://api.openai.com/v1",
      }
      : mismatchedRuntime === "pi_provider"
      ? availableSelectionV1
      : requestedSelection === null
      ? null
      : availableSelectionV1;
    queueMicrotask(() => {
      for (const listener of [...this.messageListeners]) {
        listener({
          data: {
            revision: 1,
            kind: "configured",
            requestId: envelope.requestId,
            runtime: mismatchedRuntime,
            selection,
            distribution: browserPiDistributionIdentityV1,
          },
        });
      }
    });
  }

  addEventListener(
    type: "message" | "error",
    listener: ((event: { readonly data: unknown }) => void) | ((event: unknown) => void),
  ): void {
    if (type === "message") {
      this.messageListeners.add(listener as (event: { readonly data: unknown }) => void);
    } else {
      this.errorListeners.add(listener as (event: unknown) => void);
    }
  }

  removeEventListener(
    type: "message" | "error",
    listener: ((event: { readonly data: unknown }) => void) | ((event: unknown) => void),
  ): void {
    if (type === "message") {
      this.messageListeners.delete(listener as (event: { readonly data: unknown }) => void);
    } else {
      this.errorListeners.delete(listener as (event: unknown) => void);
    }
  }

  terminate(): void {
    this.terminated = true;
    this.messageListeners.clear();
    this.errorListeners.clear();
  }
}

/** Minimal controllable Worker used only to drive product-terminal edge cases. */
class ControllableBrowserPiWorkerV1 implements BrowserPiWorkerLikeV1 {
  terminated = false;
  dropSubmitResponses = false;
  failConfiguration = false;
  failConnectionTest = false;
  modelSelectionFailure: BrowserPiModelSelectionFailureCodeV1 | null = null;
  selectModelRequests = 0;
  startRequests = 0;
  testConnectionRequests = 0;
  private configuredRuntime: unknown = null;
  private configuredSelection: unknown = null;
  latestPiRunId: string | null = null;
  latestExecution: BrowserPiWorkerExecutionBindingV1 | null = null;
  private readonly messageListeners = new Set<(event: { readonly data: unknown }) => void>();
  private readonly errorListeners = new Set<(event: unknown) => void>();
  private nextPiRunOrdinal = 1;
  private workspace: BrowserPiWorkspaceSnapshotWireV1 | null = null;
  private environmentPort: MessagePort | null = null;

  private emit(message: unknown): void {
    const data = structuredClone(message);
    for (const listener of [...this.messageListeners]) listener({ data });
  }

  emitProtocolFailure(): void {
    this.emit({ revision: 1, kind: "protocol_failure", code: "invalid_message" });
  }

  emitWorkerError(): void {
    for (const listener of [...this.errorListeners]) listener(new Event("error"));
  }

  postMessage(message: unknown, transfer: Transferable[] = []): void {
    if (this.terminated) throw new Error("Worker is terminated");
    const envelope = structuredClone(message) as Readonly<Record<string, unknown>>;
    if (envelope.kind === "configure") {
      if (this.failConfiguration) {
        this.emitWorkerError();
        return;
      }
      this.configuredRuntime = envelope.runtime;
      this.configuredSelection = envelope.selection;
      this.emit({
        revision: 1,
        kind: "configured",
        requestId: envelope.requestId,
        runtime: envelope.runtime,
        selection: envelope.selection,
        distribution: browserPiDistributionIdentityV1,
      });
      return;
    }
    if (envelope.kind === "test_connection") {
      this.testConnectionRequests += 1;
      this.emit(
        this.failConnectionTest
          ? {
            revision: 1,
            kind: "connection_test_failure",
            requestId: envelope.requestId,
            code: "connection_failed",
          }
          : {
            revision: 1,
            kind: "ready",
            requestId: envelope.requestId,
            runtime: this.configuredRuntime,
            selection: this.configuredSelection,
            distribution: browserPiDistributionIdentityV1,
          },
      );
      return;
    }
    if (envelope.kind === "select_model") {
      this.selectModelRequests += 1;
      if (this.modelSelectionFailure !== null) {
        this.emit({
          revision: 1,
          kind: "model_selection_failure",
          requestId: envelope.requestId,
          code: this.modelSelectionFailure,
        });
      } else {
        this.configuredSelection = envelope.selection;
        this.emit({
          revision: 1,
          kind: "model_selected",
          requestId: envelope.requestId,
          selection: envelope.selection,
        });
      }
      return;
    }
    const record = envelope.record as Readonly<Record<string, unknown>>;
    if (envelope.kind === "workspace_request") {
      if (record.method === "attach_workspace") {
        const descriptor = record.descriptor as BrowserPiWorkerExecutionBindingV1;
        this.environmentPort = transfer[0] as MessagePort | undefined ?? null;
        this.workspace = {
          revision: 1,
          phase: "open",
          programId: descriptor.programId,
          workspaceId: descriptor.workspaceId,
          workspaceSessionId: descriptor.workspaceSessionId,
          generation: descriptor.expectedGeneration,
          receipts: [],
        };
      } else if (this.workspace === null) {
        this.emit({
          revision: 1,
          kind: "workspace_response",
          requestId: envelope.requestId,
          ok: false,
          code: "workspace_mismatch",
        });
        return;
      } else if (record.method === "close_workspace") {
        this.workspace = { ...this.workspace, phase: "closed" };
      } else if (record.method === "acknowledge_workspace_receipts") {
        const throughSequence = record.throughSequence as number;
        this.workspace = {
          ...this.workspace,
          receipts: this.workspace.receipts.filter((receipt) => receipt.sequence > throughSequence),
        };
      }
      const workspace = this.workspace;
      if (workspace === null) throw new Error("expected controlled Workspace snapshot");
      const response = record.method === "acknowledge_workspace_receipts"
        ? {
          method: record.method,
          throughSequence: record.throughSequence,
          snapshot: workspace,
        }
        : { method: record.method, snapshot: workspace };
      this.emit({
        revision: 1,
        kind: "workspace_response",
        requestId: envelope.requestId,
        ok: true,
        response,
      });
      return;
    }
    if (record.method === "start") {
      this.startRequests += 1;
      this.emit({
        revision: 1,
        kind: "rpc_response",
        requestId: envelope.requestId,
        ok: true,
        response: { kind: "started", sessionId: "controlled.session.1" },
      });
      return;
    }
    if (record.method === "submit") {
      const execution = envelope.execution as BrowserPiWorkerExecutionBindingV1 | undefined;
      if (
        execution === undefined || this.workspace?.phase !== "open" ||
        execution.programId !== this.workspace.programId ||
        execution.workspaceId !== this.workspace.workspaceId ||
        execution.workspaceSessionId !== this.workspace.workspaceSessionId ||
        execution.expectedGeneration !== this.workspace.generation
      ) {
        this.emit({
          revision: 1,
          kind: "rpc_response",
          requestId: envelope.requestId,
          ok: false,
          code: "invalid_request",
        });
        return;
      }
      this.latestExecution = execution;
      this.latestPiRunId = `controlled.run.${String(this.nextPiRunOrdinal++)}`;
      if (this.dropSubmitResponses) return;
      this.emit({
        revision: 1,
        kind: "rpc_response",
        requestId: envelope.requestId,
        ok: true,
        response: { kind: "submitted", runId: this.latestPiRunId },
      });
      return;
    }
    if (record.method === "cancel") {
      this.emit({
        revision: 1,
        kind: "rpc_response",
        requestId: envelope.requestId,
        ok: true,
        response: { kind: "cancel_requested" },
      });
    }
  }

  emitRunFailure(
    code: "cancelled" | "pi_failed",
    piRunId: string = this.latestPiRunId ?? "",
  ): void {
    this.emit({
      revision: 1,
      kind: "rpc_record",
      record: {
        kind: "run_failed",
        code,
        sessionId: "controlled.session.1",
        runId: piRunId,
        sequence: 1,
      },
    });
  }

  emitCompleted(run: CreatorAgentRunRequestV1, text: string): void {
    const runId = this.latestPiRunId ?? "";
    const records = [
      { kind: "artifact_chunk", text },
      {
        kind: "artifact_complete",
        candidate: {
          revision: 1,
          proposalId: run.proposalId,
          programId: run.programId,
          baseProgramRevision: run.baseProgramRevision,
          text: run.text,
          requirement: run.text,
        },
      },
      { kind: "run_completed" },
    ];
    records.forEach((record, index) => {
      this.emit({
        revision: 1,
        kind: "rpc_record",
        record: {
          ...record,
          sessionId: "controlled.session.1",
          runId,
          sequence: index + 1,
        },
      });
    });
  }

  emitArtifactChunks(
    count: number,
    firstSequence: number,
    piRunId: string = this.latestPiRunId ?? "",
  ): void {
    for (let index = 0; index < count; index += 1) {
      this.emit({
        revision: 1,
        kind: "rpc_record",
        record: {
          kind: "artifact_chunk",
          text: "late",
          sessionId: "controlled.session.1",
          runId: piRunId,
          sequence: firstSequence + index,
        },
      });
    }
  }

  addEventListener(
    type: "message" | "error",
    listener: ((event: { readonly data: unknown }) => void) | ((event: unknown) => void),
  ): void {
    if (type === "message") {
      this.messageListeners.add(listener as (event: { readonly data: unknown }) => void);
    } else {
      this.errorListeners.add(listener as (event: unknown) => void);
    }
  }

  removeEventListener(
    type: "message" | "error",
    listener: ((event: { readonly data: unknown }) => void) | ((event: unknown) => void),
  ): void {
    if (type === "message") {
      this.messageListeners.delete(listener as (event: { readonly data: unknown }) => void);
    } else {
      this.errorListeners.delete(listener as (event: unknown) => void);
    }
  }

  terminate(): void {
    this.terminated = true;
    this.environmentPort?.close();
    this.environmentPort = null;
    this.messageListeners.clear();
    this.errorListeners.clear();
  }
}

describe("SillyOS Browser Pi Worker runtime", () => {
  it("admits the qualified native Workspace tools for deterministic and live Pi runtimes", () => {
    const calls: string[] = [];
    const factories = ["read", "write", "edit", "bash", "grep"].map((tool) => () => {
      calls.push(tool);
      return tool;
    });

    expect(createBrowserPiWorkspaceToolsV1(factories)).toEqual([
      "read",
      "write",
      "edit",
      "bash",
      "grep",
    ]);
    expect(calls).toEqual(["read", "write", "edit", "bash", "grep"]);
  });

  it("keeps the admitted Browser Pi identity equal to exact product dependencies", async () => {
    const manifest = JSON.parse(
      await readFile(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { readonly dependencies?: Readonly<Record<string, unknown>> };
    for (const dependency of browserPiDistributionIdentityV1.packages) {
      expect(manifest.dependencies?.[dependency.name]).toBe(dependency.version);
    }
  });

  it("rejects non-exact protocol envelopes without invoking accessors", () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    let getterCalls = 0;
    const accessor = {
      revision: 1,
      requestId: 1,
      runtime: "deterministic_test",
      selection: null,
      credential: { kind: "api_key", value: "key" },
    } as Record<string, unknown>;
    Object.defineProperty(accessor, "kind", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "configure";
      },
    });
    runtime.receive(accessor);
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 2,
      runtime: "deterministic_test",
      selection: null,
      credential: { kind: "api_key", value: "key" },
      extra: true,
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 3,
      runtime: "host_path_pi",
      selection: null,
      credential: { kind: "api_key", value: "key" },
    });

    expect(getterCalls).toBe(0);
    expect(messages).toEqual([
      { revision: 1, kind: "protocol_failure", code: "invalid_message" },
      { revision: 1, kind: "protocol_failure", code: "invalid_message" },
      { revision: 1, kind: "protocol_failure", code: "invalid_message" },
    ]);
    runtime.dispose();
  });

  it("configures without Provider I/O, then tests representative available routes", async () => {
    for (const [index, selection] of representativeProviderSelectionsV1.entries()) {
      const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
      const probeInputs: unknown[] = [];
      const runtime = createBrowserPiWorkerRuntimeV1({
        postMessage: (message) => messages.push(structuredClone(message)),
        probeProviderSelection: async (input) => {
          probeInputs.push(structuredClone({
            apiKey: input.apiKey,
            selection: input.selection,
            aborted: input.signal.aborted,
          }));
          return true;
        },
      });
      const configureRequestId = index * 2 + 1;
      const testRequestId = configureRequestId + 1;
      runtime.receive({
        revision: 1,
        kind: "configure",
        requestId: configureRequestId,
        runtime: "pi_provider",
        selection,
        credential: { kind: "api_key", value: `sentinel-live-key-${index}` },
      });
      expect(messages).toEqual([{
        revision: 1,
        kind: "configured",
        requestId: configureRequestId,
        runtime: "pi_provider",
        selection,
        distribution: browserPiDistributionIdentityV1,
      }]);
      expect(probeInputs).toEqual([]);

      runtime.receive({ revision: 1, kind: "test_connection", requestId: testRequestId });
      await waitUntilV1(() => messages.length === 2);
      expect(messages.at(-1)).toEqual({
        revision: 1,
        kind: "ready",
        requestId: testRequestId,
        runtime: "pi_provider",
        selection,
        distribution: browserPiDistributionIdentityV1,
      });
      expect(probeInputs).toEqual([{
        apiKey: `sentinel-live-key-${index}`,
        selection,
        aborted: false,
      }]);
      expect(JSON.stringify(messages)).not.toContain(`sentinel-live-key-${index}`);
      runtime.dispose();
    }
  });

  it("switches one credential across its builtin route and uses the new model for probes and runs", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const probeInputs: {
      readonly apiKey: string;
      readonly selection: BrowserPiModelSelectionV1;
    }[] = [];
    const agentInputs: {
      readonly apiKey: string;
      readonly selection: BrowserPiModelSelectionV1;
      readonly workspaceTools: readonly string[];
    }[] = [];
    let settlePrompt: ((value: { readonly stopReason: "aborted" }) => void) | null = null;
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
      probeProviderSelection: async (input) => {
        probeInputs.push({ apiKey: input.apiKey, selection: structuredClone(input.selection) });
        return true;
      },
      createProviderAgent: (input) => {
        agentInputs.push({
          apiKey: input.apiKey,
          selection: structuredClone(input.selection),
          workspaceTools: input.workspaceTools.map((tool) => tool.name),
        });
        return {
          prompt: () =>
            new Promise<{ readonly stopReason: "aborted" }>((resolve) => {
              settlePrompt = resolve;
            }),
          abort: () => settlePrompt?.({ stopReason: "aborted" }),
          dispose: () => undefined,
        };
      },
    });

    runtime.receive({
      revision: 1,
      kind: "select_model",
      requestId: 1,
      selection: copilotCompletionsSelectionV1,
    });
    expect(messages).toEqual([{
      revision: 1,
      kind: "model_selection_failure",
      requestId: 1,
      code: "not_configured",
    }]);

    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 2,
      runtime: "pi_provider",
      selection: copilotAnthropicSelectionV1,
      credential: { kind: "api_key", value: "route-sentinel-key" },
    });
    runtime.receive({
      revision: 1,
      kind: "select_model",
      requestId: 3,
      selection: copilotCompletionsSelectionV1,
    });
    await waitUntilV1(() =>
      messages.some((message) => message.kind === "model_selected" && message.requestId === 3)
    );
    expect(messages.at(-1)).toEqual({
      revision: 1,
      kind: "model_selected",
      requestId: 3,
      selection: copilotCompletionsSelectionV1,
    });

    runtime.receive({ revision: 1, kind: "test_connection", requestId: 4 });
    await waitUntilV1(() => probeInputs.length === 1);
    expect(probeInputs).toEqual([{
      apiKey: "route-sentinel-key",
      selection: copilotCompletionsSelectionV1,
    }]);
    const execution = await attachRuntimeWorkspaceV1(
      runtime,
      messages,
      workspaceAuthority,
      5,
    );
    runtime.receive(rpcRequestV1(6, { revision: 1, requestId: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 6 && message.ok
      )
    );
    runtime.receive(rpcRequestV1(7, {
      revision: 1,
      requestId: 2,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1(submitV1),
      },
    }, execution));
    await waitUntilV1(() => agentInputs.length === 1);
    expect(agentInputs).toEqual([{
      apiKey: "route-sentinel-key",
      selection: copilotCompletionsSelectionV1,
      workspaceTools: ["read", "write", "edit", "bash", "grep"],
    }]);

    runtime.receive({
      revision: 1,
      kind: "select_model",
      requestId: 8,
      selection: copilotAnthropicSelectionV1,
    });
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "model_selection_failure" && message.requestId === 8
      )
    );
    expect(messages.at(-1)).toEqual({
      revision: 1,
      kind: "model_selection_failure",
      requestId: 8,
      code: "busy",
    });
    runtime.receive(rpcRequestV1(9, {
      revision: 1,
      requestId: 3,
      method: "cancel",
      params: { sessionId: "sillyos.session.1", runId: "sillyos.run.1" },
    }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_failed"
      )
    );
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 10 });
    await waitUntilV1(() => probeInputs.length === 2);
    expect(probeInputs.at(-1)).toEqual({
      apiKey: "route-sentinel-key",
      selection: copilotCompletionsSelectionV1,
    });
    expect(JSON.stringify(messages)).not.toContain("route-sentinel-key");
    runtime.dispose();
  });

  it("rejects unavailable or out-of-scope selections without changing the configured model or key", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const probeInputs: {
      readonly apiKey: string;
      readonly selection: BrowserPiModelSelectionV1;
    }[] = [];
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
      probeProviderSelection: async (input) => {
        probeInputs.push({ apiKey: input.apiKey, selection: structuredClone(input.selection) });
        return true;
      },
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 20,
      runtime: "pi_provider",
      selection: copilotAnthropicSelectionV1,
      credential: { kind: "api_key", value: "preserved-route-key" },
    });
    runtime.receive({
      revision: 1,
      kind: "select_model",
      requestId: 21,
      selection: {
        ...copilotAnthropicSelectionV1,
        modelId: "not-in-the-fixed-pi-catalog",
      },
    });
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "model_selection_failure" && message.requestId === 21
      )
    );
    expect(messages.at(-1)).toEqual({
      revision: 1,
      kind: "model_selection_failure",
      requestId: 21,
      code: "selection_unavailable",
    });
    runtime.receive({
      revision: 1,
      kind: "select_model",
      requestId: 22,
      selection: representativeProviderSelectionsV1[1],
    });
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "model_selection_failure" && message.requestId === 22
      )
    );
    expect(messages.at(-1)).toEqual({
      revision: 1,
      kind: "model_selection_failure",
      requestId: 22,
      code: "credential_scope_mismatch",
    });
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 23 });
    await waitUntilV1(() => probeInputs.length === 1);
    expect(probeInputs).toEqual([{
      apiKey: "preserved-route-key",
      selection: copilotAnthropicSelectionV1,
    }]);
    expect(JSON.stringify(messages)).not.toContain("preserved-route-key");
    runtime.dispose();

    const customMessages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const customProbeInputs: BrowserPiModelSelectionV1[] = [];
    const customRuntime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => customMessages.push(structuredClone(message)),
      probeProviderSelection: async (input) => {
        customProbeInputs.push(structuredClone(input.selection));
        return true;
      },
    });
    customRuntime.receive({
      revision: 1,
      kind: "configure",
      requestId: 24,
      runtime: "pi_provider",
      selection: customSelectionV1,
      credential: { kind: "api_key", value: "preserved-custom-key" },
    });
    customRuntime.receive({
      revision: 1,
      kind: "select_model",
      requestId: 25,
      selection: customSelectionV1,
    });
    await waitUntilV1(() =>
      customMessages.some((message) =>
        message.kind === "model_selected" && message.requestId === 25
      )
    );
    const changedCustomSelection = Object.freeze(
      {
        kind: "custom",
        profile: Object.freeze({
          ...customSelectionV1.profile,
          modelId: "another-private-model",
        }),
      } as const,
    );
    customRuntime.receive({
      revision: 1,
      kind: "select_model",
      requestId: 26,
      selection: changedCustomSelection,
    });
    await waitUntilV1(() =>
      customMessages.some((message) =>
        message.kind === "model_selection_failure" && message.requestId === 26
      )
    );
    expect(customMessages.at(-1)).toEqual({
      revision: 1,
      kind: "model_selection_failure",
      requestId: 26,
      code: "credential_scope_mismatch",
    });
    customRuntime.receive({ revision: 1, kind: "test_connection", requestId: 27 });
    await waitUntilV1(() => customProbeInputs.length === 1);
    expect(customProbeInputs).toEqual([customSelectionV1]);
    expect(JSON.stringify(customMessages)).not.toContain("preserved-custom-key");
    customRuntime.dispose();
  });

  it("rejects model selection while a connection test is in progress and retains the old model", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const probeSelections: BrowserPiModelSelectionV1[] = [];
    const probeHold: { resolve: ((ready: boolean) => void) | null } = { resolve: null };
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
      probeProviderSelection: (input) => {
        probeSelections.push(structuredClone(input.selection));
        if (probeSelections.length > 1) return Promise.resolve(true);
        return new Promise<boolean>((resolve) => {
          probeHold.resolve = resolve;
        });
      },
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 30,
      runtime: "pi_provider",
      selection: copilotAnthropicSelectionV1,
      credential: { kind: "api_key", value: "testing-sentinel-key" },
    });
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 31 });
    await waitUntilV1(() => probeHold.resolve !== null);
    runtime.receive({
      revision: 1,
      kind: "select_model",
      requestId: 32,
      selection: copilotCompletionsSelectionV1,
    });
    expect(messages.at(-1)).toEqual({
      revision: 1,
      kind: "model_selection_failure",
      requestId: 32,
      code: "busy",
    });
    probeHold.resolve?.(true);
    await waitUntilV1(() =>
      messages.some((message) => message.kind === "ready" && message.requestId === 31)
    );
    expect(messages.at(-1)).toMatchObject({
      kind: "ready",
      requestId: 31,
      selection: copilotAnthropicSelectionV1,
    });
    runtime.receive({
      revision: 1,
      kind: "select_model",
      requestId: 33,
      selection: copilotCompletionsSelectionV1,
    });
    await waitUntilV1(() =>
      messages.some((message) => message.kind === "model_selected" && message.requestId === 33)
    );
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 34 });
    await waitUntilV1(() => probeSelections.length === 2);
    expect(probeSelections).toEqual([
      copilotAnthropicSelectionV1,
      copilotCompletionsSelectionV1,
    ]);
    runtime.dispose();
  });

  it("keeps a custom key execution-ready after a bounded failed test and permits a retry", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const probeState: { signal: AbortSignal | null } = { signal: null };
    let probeAttempts = 0;
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
      probeProviderSelection: (input) => {
        probeState.signal = input.signal;
        probeAttempts += 1;
        return probeAttempts === 1
          ? Promise.reject(new Error(`HTTP 401 leaked ${input.apiKey}`))
          : Promise.resolve(true);
      },
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 41,
      runtime: "pi_provider",
      selection: customSelectionV1,
      credential: { kind: "api_key", value: "custom-sentinel-key" },
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 42,
      runtime: "pi_provider",
      selection: customSelectionV1,
      credential: { kind: "api_key", value: "second-key" },
    });
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 43 });

    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "connection_test_failure" && message.requestId === 43
      )
    );
    expect(messages).toEqual([
      {
        revision: 1,
        kind: "configured",
        requestId: 41,
        runtime: "pi_provider",
        selection: customSelectionV1,
        distribution: browserPiDistributionIdentityV1,
      },
      { revision: 1, kind: "protocol_failure", code: "already_configured" },
      {
        revision: 1,
        kind: "connection_test_failure",
        requestId: 43,
        code: "connection_failed",
      },
    ]);
    expect(JSON.stringify(messages)).not.toContain("custom-sentinel-key");
    expect(JSON.stringify(messages)).not.toContain("HTTP 401");
    expect(probeState.signal?.aborted).toBe(false);

    runtime.receive(rpcRequestV1(44, { revision: 1, requestId: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 44 && message.ok
      )
    );
    expect(messages.at(-1)).toEqual({
      revision: 1,
      kind: "rpc_response",
      requestId: 44,
      ok: true,
      response: { kind: "started", sessionId: "sillyos.session.1" },
    });
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 45 });
    await waitUntilV1(() => messages.some((message) => message.kind === "ready"));
    expect(messages.at(-1)).toMatchObject({
      kind: "ready",
      requestId: 45,
      selection: customSelectionV1,
    });
    expect(probeAttempts).toBe(2);
    runtime.dispose();
  });

  it("aborts a pending Pi connection probe without publishing a late outcome", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const probeState: { signal: AbortSignal | null } = { signal: null };
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
      probeProviderSelection: (input) => {
        probeState.signal = input.signal;
        return new Promise<boolean>((resolve) =>
          input.signal.addEventListener("abort", () => resolve(false), { once: true })
        );
      },
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 44,
      runtime: "pi_provider",
      selection: customSelectionV1,
      credential: { kind: "api_key", value: "pending-custom-key" },
    });
    expect(messages.at(-1)?.kind).toBe("configured");
    messages.length = 0;
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 45 });
    await waitUntilV1(() => probeState.signal !== null);
    runtime.dispose();
    await waitUntilV1(() => probeState.signal?.aborted === true);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(messages).toEqual([]);
  });

  it("times out an uncooperative Pi connection probe with one bounded failure", async () => {
    vi.useFakeTimers();
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const probeState: { signal: AbortSignal | null } = { signal: null };
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
      probeProviderSelection: (input) => {
        probeState.signal = input.signal;
        return new Promise<boolean>(() => {});
      },
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 45,
      runtime: "pi_provider",
      selection: customSelectionV1,
      credential: { kind: "api_key", value: "timed-out-custom-key" },
    });
    expect(messages.at(-1)?.kind).toBe("configured");
    messages.length = 0;
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 46 });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(30_000);

    expect(probeState.signal?.aborted).toBe(true);
    expect(messages).toEqual([{
      revision: 1,
      kind: "connection_test_failure",
      requestId: 46,
      code: "connection_failed",
    }]);
    expect(JSON.stringify(messages)).not.toContain("timed-out-custom-key");
    runtime.dispose();
  });

  it("projects route compatibility and admits any model on an available route", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
      probeProviderSelection: () => Promise.resolve(true),
    });
    runtime.receive({ revision: 1, kind: "catalog_request", requestId: 7 });

    const response = messages[0];
    expect(response).toMatchObject({
      revision: 1,
      kind: "catalog_response",
      requestId: 7,
      ok: true,
      catalog: { revision: 1, distribution: browserPiDistributionIdentityV1 },
    });
    if (response?.kind !== "catalog_response" || !response.ok) {
      throw new Error("expected the pinned Pi catalog");
    }
    expect(response.catalog.providers).toHaveLength(40);
    expect(
      response.catalog.providers.reduce((count, provider) => count + provider.models.length, 0),
    )
      .toBe(1_312);
    const projected = response.catalog.providers.flatMap((provider) =>
      provider.models.map((model) => ({
        providerId: provider.id,
        modelId: model.id,
        availability: model.availability,
      }))
    );
    const available = projected.filter(({ availability }) => availability === "available");
    expect(available).toHaveLength(1_032);
    expect(available).toEqual(expect.arrayContaining([
      { providerId: "anthropic", modelId: "claude-sonnet-4-5", availability: "available" },
      {
        providerId: "openrouter",
        modelId: "google/gemini-2.5-flash",
        availability: "available",
      },
    ]));
    expect(projected.filter(({ availability }) => availability === "unavailable")).toHaveLength(
      280,
    );

    const selectedAnthropicModel = {
      kind: "builtin",
      providerId: "anthropic",
      modelId: "claude-sonnet-4-5",
      api: "anthropic-messages",
      baseUrl: "https://api.anthropic.com",
    } as const;
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 8,
      runtime: "pi_provider",
      selection: selectedAnthropicModel,
      credential: { kind: "api_key", value: "available-sentinel-key" },
    });
    expect(messages.at(-1)).toMatchObject({ kind: "configured", requestId: 8 });
    expect(JSON.stringify(messages)).not.toContain("available-sentinel-key");
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 9 });
    await waitUntilV1(() =>
      messages.some((message) => message.kind === "ready" && message.requestId === 9)
    );
    expect(messages.at(-1)).toEqual({
      revision: 1,
      kind: "ready",
      requestId: 9,
      runtime: "pi_provider",
      selection: selectedAnthropicModel,
      distribution: browserPiDistributionIdentityV1,
    });
    runtime.receive({ revision: 1, kind: "catalog_request", requestId: 10 });
    expect(messages.at(-1)).toEqual({
      revision: 1,
      kind: "protocol_failure",
      code: "invalid_message",
    });
    runtime.dispose();
  });

  it("runs real Pi Agent tool flow and posts the submit response before its bounded records", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "deterministic_test",
      selection: null,
      credential: { kind: "api_key", value: "sentinel-browser-key" },
    });
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 99 });
    const execution = await attachRuntimeWorkspaceV1(runtime, messages, workspaceAuthority);
    runtime.receive(rpcRequestV1(3, { revision: 1, requestId: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
      requestId: 2,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1(submitV1),
      },
    }, execution));

    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );

    expect(messages[0]).toEqual({
      revision: 1,
      kind: "configured",
      requestId: 1,
      runtime: "deterministic_test",
      selection: null,
      distribution: browserPiDistributionIdentityV1,
    });
    expect(messages[1]).toMatchObject({ kind: "ready", requestId: 99 });
    const submitResponseIndex = messages.findIndex((message) =>
      message.kind === "rpc_response" && message.requestId === 4
    );
    const firstRecordIndex = messages.findIndex((message) => message.kind === "rpc_record");
    const receiptIndex = messages.findIndex((message) => message.kind === "workspace_receipt");
    const terminalIndex = messages.findIndex((message) =>
      message.kind === "rpc_record" &&
      (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
    );
    expect(submitResponseIndex).toBeGreaterThanOrEqual(0);
    expect(firstRecordIndex).toBeGreaterThan(submitResponseIndex);
    expect(receiptIndex).toBeGreaterThan(submitResponseIndex);
    expect(terminalIndex).toBeGreaterThan(receiptIndex);

    const receiptMessage = messages[receiptIndex];
    if (receiptMessage?.kind !== "workspace_receipt") {
      throw new Error("expected one raw Workspace mutation receipt");
    }
    expect(receiptMessage.receipt).toMatchObject({
      revision: 1,
      sequence: 1,
      programId: submitV1.programId,
      workspaceId: workspaceIdV1,
      workspaceSessionId: workspaceSessionIdV1,
      sessionId: "sillyos.session.1",
      runId: "sillyos.run.1",
      tool: "write",
      expectedGeneration: 1,
      baseGeneration: 1,
      resultingGeneration: 2,
      outcome: "succeeded",
      effect: "changed",
      changedPaths: [".sillyos/p3a-round-trip.txt"],
      diagnosticCode: null,
    });
    expect(`${workspaceRootV1}/${receiptMessage.receipt.changedPaths[0]}`).toBe(
      roundTripArtifactPathV1,
    );
    const records = messages.flatMap((message) =>
      message.kind === "rpc_record" ? [message.record as Readonly<Record<string, unknown>>] : []
    );
    expect(records.map((record) => record.sequence)).toEqual(
      records.map((_record, index) => index + 1),
    );
    expect(records.filter((record) => record.kind === "artifact_chunk")).toHaveLength(1);
    expect(records.find((record) => record.kind === "artifact_complete")?.candidate).toEqual({
      ...submitV1,
      requirement: submitV1.text,
    });
    expect(records.at(-1)?.kind).toBe("run_completed");

    const persistenceProbe = `${deterministicPersistenceReadPrefixV1}${submitV1.text}`;
    runtime.receive(rpcRequestV1(5, {
      revision: 1,
      requestId: 3,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.persistence-probe",
          text: persistenceProbe,
        }),
      },
    }, { ...execution, expectedGeneration: 2 }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.2" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );
    expect(messages.filter((message) => message.kind === "workspace_receipt")).toHaveLength(1);
    const roundTripByteLength = new TextEncoder().encode(submitV1.text).byteLength;
    expect(workspaceAuthority.sourceReadRequests).toEqual([
      {
        path: roundTripArtifactRelativePathV1,
        offset: 0,
        length: roundTripByteLength,
        byteLength: roundTripByteLength,
      },
    ]);
    expect(
      workspaceAuthority.sourceReadRequests.every(({ length }) =>
        length <= browserWorkspaceNativePiToolPayloadMaximumBytesV1
      ),
    ).toBe(true);
    expect(workspaceAuthority.readFileRangeRequests).toEqual([
      { path: roundTripArtifactRelativePathV1, offset: 0, length: roundTripByteLength },
      { path: roundTripArtifactRelativePathV1, offset: 0, length: roundTripByteLength },
    ]);
    expect(JSON.stringify(messages)).not.toContain("sentinel-browser-key");
    runtime.dispose();
    await workspaceAuthority.dispose();
  });

  it("routes the pinned native Pi edit tool through the independent Workspace environment", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "deterministic_test",
      selection: null,
      credential: { kind: "api_key", value: "sentinel-edit-key" },
    });
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 99 });
    const execution = await attachRuntimeWorkspaceV1(runtime, messages, workspaceAuthority);
    runtime.receive(rpcRequestV1(3, { revision: 1, requestId: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );

    const editText = `${deterministicEditProbePrefixV1}preserve this exact final text.`;
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
      requestId: 2,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.edit",
          text: editText,
        }),
      },
    }, execution));

    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        ["run_completed", "run_failed"].includes(
          String((message.record as Readonly<Record<string, unknown>>).kind),
        )
      )
    );
    const editTerminal = messages.findLast((message) =>
      message.kind === "rpc_record" &&
      ["run_completed", "run_failed"].includes(
        String((message.record as Readonly<Record<string, unknown>>).kind),
      )
    );
    expect(editTerminal).toMatchObject({
      kind: "rpc_record",
      record: { kind: "run_completed" },
    });

    const receipts = messages.flatMap((message) =>
      message.kind === "workspace_receipt" ? [message.receipt] : []
    );
    expect(receipts).toHaveLength(2);
    expect(receipts[0]).toMatchObject({
      sequence: 1,
      runId: "sillyos.run.1",
      tool: "write",
      expectedGeneration: 1,
      baseGeneration: 1,
      resultingGeneration: 2,
      outcome: "succeeded",
      effect: "changed",
      changedPaths: [roundTripArtifactRelativePathV1],
    });
    expect(receipts[1]).toMatchObject({
      sequence: 2,
      runId: "sillyos.run.1",
      toolCallId: "sillyos-edit-1",
      tool: "edit",
      expectedGeneration: 1,
      baseGeneration: 2,
      resultingGeneration: 3,
      outcome: "succeeded",
      effect: "changed",
      changedPaths: [roundTripArtifactRelativePathV1],
    });
    const marker = "SillyOS native edit checkpoint pending:\n";
    const markedBytes = new TextEncoder().encode(marker + editText).byteLength;
    const finalBytes = new TextEncoder().encode(editText).byteLength;
    expect(workspaceAuthority.sourceReadRequests).toEqual([
      {
        path: roundTripArtifactRelativePathV1,
        offset: 0,
        length: markedBytes,
        byteLength: markedBytes,
      },
      {
        path: roundTripArtifactRelativePathV1,
        offset: 0,
        length: finalBytes,
        byteLength: finalBytes,
      },
    ]);
    expect(JSON.stringify(messages)).not.toContain("sentinel-edit-key");
    runtime.dispose();
    await workspaceAuthority.dispose();
  });

  it("routes the pinned native Pi bash tool through the bounded Workspace shell environment", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "deterministic_test",
      selection: null,
      credential: { kind: "api_key", value: "sentinel-bash-key" },
    });
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 99 });
    const execution = await attachRuntimeWorkspaceV1(runtime, messages, workspaceAuthority);
    runtime.receive(rpcRequestV1(3, { revision: 1, requestId: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );

    const bashText = `${deterministicBashProbePrefixV1}write and search one exact file.`;
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
      requestId: 2,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.bash",
          text: bashText,
        }),
      },
    }, execution));

    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        ["run_completed", "run_failed"].includes(
          String((message.record as Readonly<Record<string, unknown>>).kind),
        )
      )
    );
    const terminal = messages.findLast((message) =>
      message.kind === "rpc_record" &&
      ["run_completed", "run_failed"].includes(
        String((message.record as Readonly<Record<string, unknown>>).kind),
      )
    );
    if (
      terminal?.kind !== "rpc_record" ||
      (terminal.record as Readonly<Record<string, unknown>>).kind !== "run_completed"
    ) {
      throw new Error(JSON.stringify({
        terminal,
        receipts: messages.flatMap((message) =>
          message.kind === "workspace_receipt" ? [message.receipt] : []
        ),
        sourceReadRequests: workspaceAuthority.sourceReadRequests,
      }));
    }
    expect(terminal).toMatchObject({
      kind: "rpc_record",
      record: { kind: "run_completed" },
    });

    const receipts = messages.flatMap((message) =>
      message.kind === "workspace_receipt" ? [message.receipt] : []
    );
    expect(receipts).toHaveLength(2);
    expect(receipts[0]).toMatchObject({
      sequence: 1,
      runId: "sillyos.run.1",
      toolCallId: "sillyos-bash-setup-1",
      tool: "write",
      expectedGeneration: 1,
      baseGeneration: 1,
      resultingGeneration: 2,
      outcome: "succeeded",
      effect: "changed",
      changedPaths: [roundTripArtifactRelativePathV1],
    });
    expect(receipts[1]).toMatchObject({
      sequence: 2,
      runId: "sillyos.run.1",
      toolCallId: "sillyos-bash-1",
      tool: "bash",
      expectedGeneration: 1,
      baseGeneration: 2,
      resultingGeneration: 3,
      outcome: "succeeded",
      effect: "changed",
      changedPaths: [".sillyos/p3a-bash-round-trip.txt"],
    });
    const terminalIndex = messages.indexOf(terminal);
    const finalReceiptIndex = messages.findLastIndex((message) =>
      message.kind === "workspace_receipt"
    );
    expect(finalReceiptIndex).toBeGreaterThanOrEqual(0);
    expect(finalReceiptIndex).toBeLessThan(terminalIndex);
    const bashRoundTripBytes = new TextEncoder().encode("SillyOS native bash checkpoint\n")
      .byteLength;
    const bashSetupBytes = new TextEncoder().encode(bashText).byteLength;
    expect(workspaceAuthority.sourceReadRequests).toEqual([
      {
        path: roundTripArtifactRelativePathV1,
        offset: 0,
        length: bashSetupBytes,
        byteLength: bashSetupBytes,
      },
      {
        path: ".sillyos/p3a-bash-round-trip.txt",
        offset: 0,
        length: bashRoundTripBytes,
        byteLength: bashRoundTripBytes,
      },
    ]);
    expect(JSON.stringify(messages)).not.toContain("sentinel-bash-key");
    runtime.dispose();
    await workspaceAuthority.dispose();
  });

  it("routes the product-fixed Pi grep tool through the explicit read-only Workspace operation", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "deterministic_test",
      selection: null,
      credential: { kind: "api_key", value: "sentinel-grep-key" },
    });
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 99 });
    const execution = await attachRuntimeWorkspaceV1(runtime, messages, workspaceAuthority);
    runtime.receive(rpcRequestV1(3, { revision: 1, requestId: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );

    const grepText = `${deterministicGrepProbePrefixV1}find this exact line.`;
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
      requestId: 2,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.grep",
          text: grepText,
        }),
      },
    }, execution));

    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        ["run_completed", "run_failed"].includes(
          String((message.record as Readonly<Record<string, unknown>>).kind),
        )
      )
    );
    expect(messages.findLast((message) =>
      message.kind === "rpc_record" &&
      ["run_completed", "run_failed"].includes(
        String((message.record as Readonly<Record<string, unknown>>).kind),
      )
    )).toMatchObject({
      kind: "rpc_record",
      record: { kind: "run_completed" },
    });

    expect(
      messages.flatMap((message) => message.kind === "workspace_receipt" ? [message.receipt] : []),
    ).toEqual([
      expect.objectContaining({
        sequence: 1,
        runId: "sillyos.run.1",
        toolCallId: "sillyos-grep-setup-1",
        tool: "write",
        baseGeneration: 1,
        resultingGeneration: 2,
        outcome: "succeeded",
        effect: "changed",
        changedPaths: [roundTripArtifactRelativePathV1],
      }),
    ]);
    expect(workspaceAuthority.readFileRangeRequests).toContainEqual({
      path: roundTripArtifactRelativePathV1,
      offset: 0,
      length: new TextEncoder().encode(grepText).byteLength,
    });
    expect(JSON.stringify(messages)).not.toContain("sentinel-grep-key");
    runtime.dispose();
    await workspaceAuthority.dispose();
  });

  it("rejects a stale execution binding without disturbing the active run and retries from query", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "deterministic_test",
      selection: null,
      credential: { kind: "api_key", value: "key" },
    });
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 99 });
    const execution = await attachRuntimeWorkspaceV1(runtime, messages, workspaceAuthority);
    runtime.receive(rpcRequestV1(3, { revision: 1, requestId: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );

    runtime.receive(rpcRequestV1(4, {
      revision: 1,
      requestId: 2,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          text: `${deterministicCancellationHoldPrefixV1} stale preflight`,
        }),
      },
    }, execution));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "workspace_receipt" && message.receipt.runId === "sillyos.run.1"
      )
    );

    runtime.receive(rpcRequestV1(5, {
      revision: 1,
      requestId: 3,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.stale",
          text: "This future generation must be rejected before Pi.",
        }),
      },
    }, executionBindingV1(3)));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 5 && !message.ok
      )
    );
    expect(messages.find((message) => message.kind === "rpc_response" && message.requestId === 5))
      .toEqual({
        revision: 1,
        kind: "rpc_response",
        requestId: 5,
        ok: false,
        code: "invalid_request",
      });
    expect(messages.filter((message) => message.kind === "workspace_receipt")).toHaveLength(1);
    expect(messages.some((message) =>
      message.kind === "rpc_record" &&
      (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.1" &&
      (message.record as Readonly<Record<string, unknown>>).kind === "run_failed"
    )).toBe(false);

    runtime.receive(workspaceRequestV1(6, {
      method: "query_workspace",
      workspaceSessionId: workspaceSessionIdV1,
    }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "workspace_response" && message.requestId === 6 && message.ok
      )
    );
    const queried = messages.find((message) =>
      message.kind === "workspace_response" && message.requestId === 6 && message.ok
    );
    if (queried?.kind !== "workspace_response" || !queried.ok) {
      throw new Error("expected the current Workspace descriptor after stale rejection");
    }
    expect(queried.response.snapshot).toMatchObject({ generation: 2 });
    expect(queried.response.snapshot.receipts).toHaveLength(1);

    runtime.receive(rpcRequestV1(7, {
      revision: 1,
      requestId: 4,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.retry",
          text: "Retry from the queried generation.",
        }),
      },
    }, executionBindingV1(queried.response.snapshot.generation)));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.2" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );
    expect(messages.find((message) => message.kind === "rpc_response" && message.requestId === 7))
      .toMatchObject({
        ok: true,
        response: { kind: "submitted", runId: "sillyos.run.2" },
      });
    expect(messages.some((message) =>
      message.kind === "rpc_record" &&
      (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.1" &&
      (message.record as Readonly<Record<string, unknown>>).kind === "run_failed" &&
      (message.record as Readonly<Record<string, unknown>>).code === "replaced"
    )).toBe(true);
    runtime.dispose();
    await workspaceAuthority.dispose();
  });

  it("fences replaced and cancelled runs by session, run, and contiguous sequence", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "deterministic_test",
      selection: null,
      credential: { kind: "api_key", value: "key" },
    });
    runtime.receive({ revision: 1, kind: "test_connection", requestId: 99 });
    const execution = await attachRuntimeWorkspaceV1(runtime, messages, workspaceAuthority);
    runtime.receive(rpcRequestV1(3, { revision: 1, requestId: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
      requestId: 2,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1(submitV1),
      },
    }, execution));
    runtime.receive(rpcRequestV1(5, {
      revision: 1,
      requestId: 3,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.2",
          text: "Replace the prior run.",
        }),
      },
    }, execution));

    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.2" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );
    const records = messages.flatMap((message) =>
      message.kind === "rpc_record" ? [message.record as Readonly<Record<string, unknown>>] : []
    );
    expect(records.filter((record) => record.runId === "sillyos.run.1")).toEqual([
      {
        kind: "run_failed",
        code: "replaced",
        sessionId: "sillyos.session.1",
        runId: "sillyos.run.1",
        sequence: 1,
      },
    ]);
    expect(records.filter((record) => record.runId === "sillyos.run.2").at(-1)?.kind).toBe(
      "run_completed",
    );

    runtime.receive(workspaceRequestV1(6, {
      method: "query_workspace",
      workspaceSessionId: workspaceSessionIdV1,
    }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "workspace_response" && message.requestId === 6 && message.ok
      )
    );
    const queried = messages.find((message) =>
      message.kind === "workspace_response" && message.requestId === 6 && message.ok
    );
    if (queried?.kind !== "workspace_response" || !queried.ok) {
      throw new Error("expected current Workspace snapshot");
    }
    const currentGeneration = queried.response.snapshot.generation;

    runtime.receive(rpcRequestV1(7, {
      revision: 1,
      requestId: 4,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.3",
          text: `${deterministicCancellationHoldPrefixV1} post-effect ordering`,
        }),
      },
    }, executionBindingV1(currentGeneration)));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 7 && message.ok &&
        (message.response as Readonly<Record<string, unknown>>).kind === "submitted" &&
        (message.response as Readonly<Record<string, unknown>>).runId === "sillyos.run.3"
      )
    );
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "workspace_receipt" && message.receipt.runId === "sillyos.run.3"
      )
    );
    const preCancelReceiptIndex = messages.findIndex((message) =>
      message.kind === "workspace_receipt" && message.receipt.runId === "sillyos.run.3"
    );
    runtime.receive(rpcRequestV1(8, {
      revision: 1,
      requestId: 5,
      method: "cancel",
      params: { sessionId: "sillyos.session.1", runId: "sillyos.run.3" },
    }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.3" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_failed"
      )
    );
    const cancelResponseIndex = messages.findIndex((message) =>
      message.kind === "rpc_response" && message.requestId === 8
    );
    const cancelledRecordIndex = messages.findIndex((message) =>
      message.kind === "rpc_record" &&
      (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.3" &&
      (message.record as Readonly<Record<string, unknown>>).kind === "run_failed"
    );
    const cancelledReceiptIndex = messages.findIndex((message) =>
      message.kind === "workspace_receipt" && message.receipt.runId === "sillyos.run.3"
    );
    expect(cancelResponseIndex).toBeGreaterThan(preCancelReceiptIndex);
    expect(cancelledRecordIndex).toBeGreaterThan(cancelResponseIndex);
    expect(cancelledRecordIndex).toBeGreaterThan(cancelledReceiptIndex);
    const cancelledReceipt = messages[cancelledReceiptIndex];
    if (cancelledReceipt?.kind !== "workspace_receipt") {
      throw new Error("expected the post-effect cancelled run's Workspace receipt");
    }
    expect(cancelledReceipt.receipt).toMatchObject({
      revision: 1,
      programId: submitV1.programId,
      workspaceId: workspaceIdV1,
      workspaceSessionId: workspaceSessionIdV1,
      sessionId: "sillyos.session.1",
      runId: "sillyos.run.3",
      tool: "write",
      expectedGeneration: currentGeneration,
      baseGeneration: currentGeneration,
      resultingGeneration: currentGeneration + 1,
      outcome: "succeeded",
      effect: "changed",
      changedPaths: [".sillyos/p3a-round-trip.txt"],
      diagnosticCode: null,
    });
    expect((messages[cancelledRecordIndex] as { record: unknown }).record).toEqual({
      kind: "run_failed",
      code: "cancelled",
      sessionId: "sillyos.session.1",
      runId: "sillyos.run.3",
      sequence: 1,
    });
    runtime.dispose();
    await workspaceAuthority.dispose();
  });
});

describe("SillyOS Browser Pi transport and product port", () => {
  it("hands off exact workspace exports and aborts a held export before Forget", async () => {
    const workspaceAuthority = new TestBrowserProgramWorkspaceAuthorityV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority,
      workerFactory: () => new ControllableBrowserPiWorkerV1(),
    });
    await openProductWorkspaceV1(port);
    const progress: unknown[] = [];
    await expect(port.exportWorkspace({
      workspaceSessionId: workspaceSessionIdV1,
      fileName: "workspace-test.sillyos.zip",
      signal: new AbortController().signal,
      onProgress: (value) => progress.push(value),
      onReady: async (ready, startDownload) => {
        expect(ready.generation).toBe(1);
        await startDownload();
        return "release" as const;
      },
    })).resolves.toMatchObject({
      kind: "released",
      generation: 1,
      filesCompleted: 1,
      filesTotal: 1,
    });
    expect(progress).toHaveLength(1);

    workspaceAuthority.holdExport = true;
    const held = port.exportWorkspace({
      workspaceSessionId: workspaceSessionIdV1,
      fileName: "workspace-held.sillyos.zip",
      signal: new AbortController().signal,
      onReady: () => {
        throw new Error("held export must not become ready");
      },
    });
    await waitUntilV1(() => workspaceAuthority.exportCalls === 2);
    await expect(port.submit(productRunV1({ agentRunId: "agent.run.export-busy" }))).resolves
      .toEqual({
        kind: "unavailable",
        diagnostic: { code: "request_failed", path: "/workspace/busy" },
      });

    await port.forget();
    await expect(held).resolves.toMatchObject({ kind: "cancelled" });
    expect(workspaceAuthority.exportAborted).toBe(true);
    expect(port.getSnapshot()).toMatchObject({
      phase: "forgotten",
      workspace: { phase: "forgotten", descriptor: null },
    });
    expect(workspaceAuthority.closeWorkspaceCalls).toBe(0);
    expect(workspaceAuthority.detachWorkspaceEnvironmentCalls).toEqual([workspaceSessionIdV1]);
    expect(workspaceAuthority.disposeCalls).toBe(0);
    await expect(workspaceAuthority.queryWorkspace(workspaceSessionIdV1)).resolves.toMatchObject({
      phase: "open",
      descriptor: { workspaceSessionId: workspaceSessionIdV1 },
    });
  });

  it("drains an authorized workspace export before Forget", async () => {
    const workspaceAuthority = new TestBrowserProgramWorkspaceAuthorityV1();
    workspaceAuthority.holdAuthorizedExport = true;
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority,
      workerFactory: () => new ControllableBrowserPiWorkerV1(),
    });
    await openProductWorkspaceV1(port);
    const exported = port.exportWorkspace({
      workspaceSessionId: workspaceSessionIdV1,
      fileName: "workspace-authorized.sillyos.zip",
      signal: new AbortController().signal,
      onReady: async (_ready, startDownload) => {
        await startDownload();
        return "release" as const;
      },
    });
    await waitUntilV1(() => workspaceAuthority.authorizedExportStarted);

    let forgetSettled = false;
    const forgetting = port.forget().then(() => {
      forgetSettled = true;
    });
    await Promise.resolve();
    expect(forgetSettled).toBe(false);
    expect(workspaceAuthority.exportAborted).toBe(false);

    workspaceAuthority.releaseAuthorizedExport();
    await expect(exported).resolves.toMatchObject({ kind: "released" });
    await forgetting;
    expect(port.getSnapshot()).toMatchObject({ phase: "forgotten" });
    expect(workspaceAuthority.detachWorkspaceEnvironmentCalls).toEqual([workspaceSessionIdV1]);
  });

  it("aborts and drains a held export before closing its workspace", async () => {
    const workspaceAuthority = new TestBrowserProgramWorkspaceAuthorityV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority,
      workerFactory: () => new ControllableBrowserPiWorkerV1(),
    });
    await openProductWorkspaceV1(port);
    workspaceAuthority.holdExport = true;
    const held = port.exportWorkspace({
      workspaceSessionId: workspaceSessionIdV1,
      fileName: "workspace-close-held.sillyos.zip",
      signal: new AbortController().signal,
      onReady: () => {
        throw new Error("held export must not become ready");
      },
    });
    await waitUntilV1(() => workspaceAuthority.exportCalls === 1);

    const closed = port.closeWorkspace(workspaceSessionIdV1);
    await expect(held).resolves.toMatchObject({ kind: "cancelled" });
    await expect(closed).resolves.toMatchObject({ kind: "closed" });
    expect(workspaceAuthority.exportAborted).toBe(true);
    expect(port.getSnapshot().workspace).toMatchObject({
      phase: "closed",
      descriptor: { workspaceSessionId: workspaceSessionIdV1, generation: 1 },
    });
    await port.dispose();
    expect(workspaceAuthority.closeWorkspaceCalls).toBe(1);
    expect(workspaceAuthority.detachWorkspaceEnvironmentCalls).toEqual([workspaceSessionIdV1]);
    expect(workspaceAuthority.disposeCalls).toBe(0);
  });

  it("shows a retryable busy failure after a closed workspace and then reopens", async () => {
    const workspaceAuthority = new TestBrowserProgramWorkspaceAuthorityV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority,
      workerFactory: () => new ControllableBrowserPiWorkerV1(),
    });
    await openProductWorkspaceV1(port);
    await expect(port.closeWorkspace(workspaceSessionIdV1)).resolves.toMatchObject({
      kind: "closed",
    });
    expect(port.getSnapshot().workspace).toMatchObject({
      phase: "closed",
      descriptor: { workspaceSessionId: workspaceSessionIdV1, generation: 1 },
    });

    workspaceAuthority.nextOpenFailureCode = "volume_busy";
    await expect(
      port.openWorkspace({ programId: submitV1.programId, workspaceId: workspaceIdV1 }),
    ).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "workspace_busy", path: "/workspace/open" },
    });
    expect(port.getSnapshot().workspace).toMatchObject({
      phase: "failed",
      descriptor: null,
      diagnostic: { code: "workspace_busy", path: "/workspace/open" },
    });

    await openProductWorkspaceV1(port);
    expect(port.getSnapshot().workspace).toMatchObject({
      phase: "open",
      diagnostic: null,
    });
    await port.dispose();
  });

  it("keeps Workspace Host recovery reasons distinct from Agent diagnostics", async () => {
    const cases = [
      ["volume_busy", "workspace_busy"],
      ["storage_unavailable", "storage_unavailable"],
      ["volume_missing", "volume_missing"],
      ["workspace_mismatch", "volume_corrupt"],
      ["capacity_exceeded", "capacity_exceeded"],
      ["invalid_response", "protocol_invalid"],
      ["outcome_unknown", "recovery_required"],
    ] as const;
    for (const [hostCode, productCode] of cases) {
      const repositoryUnavailable = (): Promise<never> =>
        Promise.reject(new Error("test repository is unavailable"));
      const authority: BrowserProgramWorkspaceAuthorityV1 = {
        initialize: () => Promise.resolve(),
        list: repositoryUnavailable,
        load: repositoryUnavailable,
        inspectProgramWorkspace: repositoryUnavailable,
        create: repositoryUnavailable,
        applyRevision: repositoryUnavailable,
        settleAgentRun: repositoryUnavailable,
        decide: repositoryUnavailable,
        withAgentSubmitAdmission: async (input) => await input.operation(),
        openWorkspace: () =>
          Promise.reject(
            new BrowserWorkspaceHostControlErrorV1(hostCode, `synthetic ${hostCode}`),
          ),
        queryWorkspace: () => Promise.reject(new Error("not open")),
        exportWorkspace: () => Promise.reject(new Error("not open")),
        detachWorkspaceEnvironment: () => Promise.resolve(),
        closeWorkspace: () => Promise.reject(new Error("not open")),
        closeActiveWorkspace: () => Promise.resolve(null),
        subscribeFatal: () => () => {},
        dispose: () => Promise.resolve(),
      };
      const port = createBrowserCreatorAgentPortV1({
        runtime: "deterministic_test",
        workspaceAuthority: authority,
        workerFactory: () => new ControllableBrowserPiWorkerV1(),
      });
      await configureAndTestProductPortV1(port);
      await expect(
        port.openWorkspace({ programId: submitV1.programId, workspaceId: workspaceIdV1 }),
      ).resolves.toEqual({
        kind: "unavailable",
        diagnostic: { code: productCode, path: "/workspace/open" },
      });
      expect(port.getSnapshot().workspace).toMatchObject({
        phase: "failed",
        descriptor: null,
        diagnostic: { code: productCode, path: "/workspace/open" },
      });
      await port.dispose();
    }
  });

  it("reports unconfigured and failed Worker setup without inventing a fallback", async () => {
    let emptyKeyFactoryCalls = 0;
    const unconfigured = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => {
        emptyKeyFactoryCalls += 1;
        throw new Error("must not construct");
      },
    });
    await expect(unconfigured.testConnection()).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "unconfigured", path: "/credential" },
    });
    await expect(unconfigured.configureCredential("")).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "connection_failed", path: "/configure" },
    });
    expect(emptyKeyFactoryCalls).toBe(0);
    expect(unconfigured.getSnapshot()).toMatchObject({
      phase: "failed",
      diagnostic: { code: "connection_failed", path: "/configure" },
    });
    await unconfigured.dispose();

    const failed = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => {
        throw new Error("worker unavailable");
      },
    });
    await expect(failed.configureCredential("synthetic-key")).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "connection_failed", path: "/configure" },
    });
    expect(failed.getSnapshot()).toMatchObject({
      phase: "failed",
      diagnostic: { code: "connection_failed", path: "/configure" },
    });
    await failed.dispose();

    const configurationLoss = vi.fn();
    const failingWorker = new ControllableBrowserPiWorkerV1();
    failingWorker.failConfiguration = true;
    const failedDuringConfiguration = createBrowserCreatorAgentPortV1({
      onConnectionLost: configurationLoss,
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => failingWorker,
    });
    await expect(failedDuringConfiguration.configureCredential("synthetic-key")).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "connection_failed", path: "/configure" },
    });
    expect(configurationLoss).not.toHaveBeenCalled();
    await failedDuringConfiguration.dispose();
  });

  it("makes Workspace and Agent RPC available after configure without a Provider test", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    let workerFactoryCalls = 0;
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => {
        workerFactoryCalls += 1;
        return worker;
      },
    });
    await expect(
      port.openWorkspace({ programId: submitV1.programId, workspaceId: workspaceIdV1 }),
    ).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "request_failed", path: "/connection" },
    });
    await expect(port.submit(productRunV1())).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "unconfigured", path: "/connection" },
    });
    expect(workerFactoryCalls).toBe(0);

    await expect(port.configureCredential("sentinel-browser-key")).resolves.toEqual({
      kind: "configured",
    });
    expect(workerFactoryCalls).toBe(1);
    expect(worker.testConnectionRequests).toBe(0);
    await expect(
      port.openWorkspace({ programId: submitV1.programId, workspaceId: workspaceIdV1 }),
    ).resolves.toMatchObject({ kind: "opened" });
    await expect(port.submit(productRunV1())).resolves.toMatchObject({ kind: "submitted" });
    expect(worker.testConnectionRequests).toBe(0);
    await port.dispose();
  });

  it.each([
    ["Worker error", (worker: ControllableBrowserPiWorkerV1) => worker.emitWorkerError()],
    ["protocol failure", (worker: ControllableBrowserPiWorkerV1) => worker.emitProtocolFailure()],
  ])("reports one post-ready %s as a lost Provider connection", async (_label, fail) => {
    const worker = new ControllableBrowserPiWorkerV1();
    const onConnectionLost = vi.fn();
    const port = createBrowserCreatorAgentPortV1({
      onConnectionLost,
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => worker,
    });

    await configureAndTestProductPortV1(port);
    fail(worker);

    expect(onConnectionLost).toHaveBeenCalledOnce();
    expect(worker.terminated).toBe(true);
    await port.dispose();
    expect(onConnectionLost).toHaveBeenCalledOnce();
  });

  it("keeps Agent work available after a failed optional test and records a later success", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    const onConnectionLost = vi.fn();
    const port = createBrowserCreatorAgentPortV1({
      onConnectionLost,
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => worker,
    });
    await configureAndTestProductPortV1(port);
    expect(worker.testConnectionRequests).toBe(1);

    worker.failConnectionTest = true;
    await expect(port.testConnection()).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "connection_failed", path: "/test_connection" },
    });
    expect(worker.testConnectionRequests).toBe(2);
    expect(worker.terminated).toBe(false);
    expect(onConnectionLost).not.toHaveBeenCalled();
    expect(port.getSnapshot()).toMatchObject({
      phase: "ready",
      diagnostic: null,
    });
    await openProductWorkspaceV1(port);
    await expect(port.closeWorkspace()).resolves.toMatchObject({ kind: "closed" });

    worker.failConnectionTest = false;
    await expect(port.testConnection()).resolves.toEqual({ kind: "ready" });
    expect(worker.testConnectionRequests).toBe(3);
    expect(port.getSnapshot()).toMatchObject({ phase: "ready", diagnostic: null });
    await openProductWorkspaceV1(port);
    await port.dispose();
  });

  it.each(["forget", "dispose"] as const)(
    "does not report explicit %s as a lost Provider connection",
    async (operation) => {
      const worker = new ControllableBrowserPiWorkerV1();
      const onConnectionLost = vi.fn();
      const port = createBrowserCreatorAgentPortV1({
        onConnectionLost,
        runtime: "deterministic_test",
        workspaceAuthority: testWorkspaceAuthorityV1(),
        workerFactory: () => worker,
      });

      await configureAndTestProductPortV1(port);
      await port[operation]();
      expect(onConnectionLost).not.toHaveBeenCalled();
      expect(worker.terminated).toBe(true);
    },
  );

  it("rejects a Worker that reports a different configured runtime", async () => {
    const worker = new RuntimeMismatchBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "pi_provider",
      selection: availableSelectionV1,
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => worker,
    });

    await expect(port.configureCredential("synthetic-key")).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "connection_failed", path: "/configure" },
    });
    expect(worker.terminated).toBe(true);
    await port.dispose();
  });

  it("rejects a Worker that reports a stale selected model", async () => {
    const worker = new RuntimeMismatchBrowserPiWorkerV1("selection");
    const port = createBrowserCreatorAgentPortV1({
      runtime: "pi_provider",
      selection: availableSelectionV1,
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => worker,
    });

    await expect(port.configureCredential("synthetic-key")).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "connection_failed", path: "/configure" },
    });
    expect(worker.terminated).toBe(true);
    await port.dispose();
  });

  it("maps model-selection failures without rebuilding the Creator session or Workspace", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    let workerFactoryCalls = 0;
    const port = createBrowserCreatorAgentPortV1({
      runtime: "pi_provider",
      selection: copilotAnthropicSelectionV1,
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => {
        workerFactoryCalls += 1;
        return worker;
      },
    });
    await expect(port.selectModel(copilotCompletionsSelectionV1)).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "unconfigured", path: "/selection" },
    });
    expect(workerFactoryCalls).toBe(0);
    await expect(port.configureCredential("creator-selection-key")).resolves.toEqual({
      kind: "configured",
    });
    await openProductWorkspaceV1(port);
    const unchangedSnapshot = port.getSnapshot();
    expect(unchangedSnapshot).toMatchObject({
      phase: "ready",
      workspace: {
        phase: "open",
        descriptor: { workspaceSessionId: workspaceSessionIdV1, generation: 1 },
      },
    });
    expect(worker.startRequests).toBe(1);

    const failures = [
      ["selection_unavailable", "protocol_invalid"],
      ["credential_scope_mismatch", "protocol_invalid"],
      ["busy", "request_failed"],
      ["not_configured", "unconfigured"],
    ] as const;
    for (const [failure, diagnosticCode] of failures) {
      worker.modelSelectionFailure = failure;
      await expect(port.selectModel(copilotCompletionsSelectionV1)).resolves.toEqual({
        kind: "unavailable",
        diagnostic: { code: diagnosticCode, path: "/selection" },
      });
      expect(port.getSnapshot()).toBe(unchangedSnapshot);
      expect(worker.terminated).toBe(false);
      expect(workerFactoryCalls).toBe(1);
      expect(worker.startRequests).toBe(1);
    }

    worker.modelSelectionFailure = null;
    await expect(port.selectModel(copilotCompletionsSelectionV1)).resolves.toEqual({
      kind: "selected",
      selection: copilotCompletionsSelectionV1,
    });
    expect(port.getSnapshot()).toBe(unchangedSnapshot);
    expect(worker.startRequests).toBe(1);
    await expect(port.testConnection()).resolves.toEqual({ kind: "ready" });
    expect(worker.startRequests).toBe(1);
    expect(port.getSnapshot().workspace.descriptor).toEqual(
      unchangedSnapshot.workspace.descriptor,
    );
    await expect(port.submit(productRunV1())).resolves.toEqual({
      kind: "submitted",
      agentRunId: "agent.run.product.1",
    });
    expect(worker.startRequests).toBe(1);
    await port.dispose();
  });

  it("passes the exact built-in or custom endpoint origin to the Agent Worker factory", async () => {
    const factoryInputs: unknown[] = [];
    const builtinWorker = new ControllableBrowserPiWorkerV1();
    const builtinPort = createBrowserCreatorAgentPortV1({
      runtime: "pi_provider",
      selection: availableSelectionV1,
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: (input) => {
        factoryInputs.push(structuredClone(input));
        return builtinWorker;
      },
    });
    await configureAndTestProductPortV1(builtinPort);
    await builtinPort.dispose();

    const customWorker = new ControllableBrowserPiWorkerV1();
    const customPort = createBrowserCreatorAgentPortV1({
      runtime: "pi_provider",
      selection: customSelectionV1,
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: (input) => {
        factoryInputs.push(structuredClone(input));
        return customWorker;
      },
    });

    await configureAndTestProductPortV1(customPort);
    expect(factoryInputs).toEqual([
      { endpointOrigin: "https://api.openai.com" },
      { endpointOrigin: "https://llm.example.test" },
    ]);
    expect(JSON.stringify(factoryInputs)).not.toContain("private-model");
    expect(JSON.stringify(factoryInputs)).not.toContain("custom-key");
    await customPort.dispose();
    expect(builtinWorker.terminated).toBe(true);
    expect(customWorker.terminated).toBe(true);
  });

  it("adds exactly the selected endpoint origin to development and production Worker URLs", () => {
    const constructions: { readonly url: string; readonly options: unknown }[] = [];
    class CapturingWorkerV1 {
      constructor(url: URL, options: unknown) {
        constructions.push({ url: url.href, options: structuredClone(options) });
      }

      terminate(): void {}
    }
    vi.stubGlobal("Worker", CapturingWorkerV1);

    createDefaultBrowserPiWorkerV1({ endpointOrigin: null });
    createDefaultBrowserPiWorkerV1({ endpointOrigin: "https://llm.example.test" });

    const ordinaryDevelopmentUrl = new URL(constructions[0]?.url ?? "about:blank");
    const selectedDevelopmentUrl = new URL(constructions[1]?.url ?? "about:blank");
    expect(selectedDevelopmentUrl.searchParams.getAll("endpoint-origin")).toEqual([
      "https://llm.example.test",
    ]);
    expect(
      [...selectedDevelopmentUrl.searchParams].filter(([name]) => name !== "endpoint-origin"),
    ).toEqual([...ordinaryDevelopmentUrl.searchParams]);

    vi.stubEnv("PROD", true);
    createDefaultBrowserPiWorkerV1({ endpointOrigin: null });
    createDefaultBrowserPiWorkerV1({ endpointOrigin: "https://llm.example.test" });

    const ordinaryProductionUrl = new URL(constructions[2]?.url ?? "about:blank");
    const selectedProductionUrl = new URL(constructions[3]?.url ?? "about:blank");
    expect(selectedProductionUrl.searchParams.getAll("endpoint-origin")).toEqual([
      "https://llm.example.test",
    ]);
    expect(
      [...selectedProductionUrl.searchParams].filter(([name]) => name !== "endpoint-origin"),
    ).toEqual([...ordinaryProductionUrl.searchParams]);
    expect(ordinaryDevelopmentUrl.searchParams.has("endpoint-origin")).toBe(false);
    expect(ordinaryProductionUrl.searchParams.has("endpoint-origin")).toBe(false);
    expect(selectedProductionUrl.href).toBe(
      `${ordinaryProductionUrl.href}${ordinaryProductionUrl.search.length === 0 ? "?" : "&"}` +
        "endpoint-origin=https%3A%2F%2Fllm.example.test",
    );
    expect(selectedDevelopmentUrl.href).not.toContain(customSelectionV1.profile.modelId);
    expect(selectedDevelopmentUrl.href).not.toContain(customSelectionV1.profile.baseUrl);
    expect(selectedProductionUrl.href).not.toContain(customSelectionV1.profile.modelId);
    expect(selectedProductionUrl.href).not.toContain(customSelectionV1.profile.baseUrl);
    expect(constructions.map(({ options }) => options)).toEqual([
      { type: "module", name: "sillyos-browser-pi" },
      { type: "module", name: "sillyos-browser-pi" },
      { type: "module", name: "sillyos-browser-pi" },
      { type: "module", name: "sillyos-browser-pi" },
    ]);
    expect(() =>
      createDefaultBrowserPiWorkerV1({
        endpointOrigin: "https://llm.example.test/v1",
      })
    ).toThrow("sillyos.browser_pi_transport.endpoint_origin_invalid");
  });

  it("configures once, starts before an optional test, settles submit first, and terminates", async () => {
    let worker: InMemoryBrowserPiWorkerV1 | null = null;
    const transport = createBrowserPiWorkerRawTransportV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => {
        worker = new InMemoryBrowserPiWorkerV1();
        return worker as BrowserPiWorkerLikeV1;
      },
    });
    const client = createAgentRpcClientInternalV1({ transport });
    const settlement: boolean[] = [];
    let submitSettled = false;
    client.subscribeStream(() => settlement.push(submitSettled));

    expect(worker).toBeNull();
    await expect(transport.configureCredential("sentinel-browser-key")).resolves.toEqual({
      kind: "configured",
    });
    expect(worker).not.toBeNull();
    await expect(client.connect()).resolves.toEqual({ kind: "ready" });
    await expect(client.start()).resolves.toEqual({
      kind: "started",
      sessionId: "sillyos.session.1",
    });
    await expect(transport.testConnection()).resolves.toEqual({ kind: "ready" });
    await expect(
      transport.openWorkspace({ programId: submitV1.programId, workspaceId: workspaceIdV1 }),
    ).resolves.toMatchObject({
      phase: "open",
      programId: submitV1.programId,
      workspaceId: workspaceIdV1,
      generation: 1,
    });
    const submitted = client.submit({
      sessionId: "sillyos.session.1",
      text: serializeCreatorAgentSubmitV1(submitV1),
    }).then((result) => {
      submitSettled = true;
      return result;
    });
    await expect(submitted).resolves.toEqual({ kind: "submitted", runId: "sillyos.run.1" });
    await waitUntilV1(() => settlement.length > 0);
    expect(settlement.every(Boolean)).toBe(true);
    expect(worker).not.toBeNull();
    const posted = (worker as unknown as InMemoryBrowserPiWorkerV1).posted;
    expect(posted.filter((message) => JSON.stringify(message).includes("sentinel-browser-key")))
      .toHaveLength(1);
    expect((posted[0] as Readonly<Record<string, unknown>>).kind).toBe("configure");
    expect((posted[0] as Readonly<Record<string, unknown>>).selection).toBeNull();

    await client.dispose();
    expect((worker as unknown as InMemoryBrowserPiWorkerV1).terminated).toBe(true);
    await transport.forget();
  });

  it("sends a model-only selection envelope and keeps the credential inside the configured Worker", async () => {
    let worker: InMemoryBrowserPiWorkerV1 | null = null;
    const transport = createBrowserPiWorkerRawTransportV1({
      runtime: "pi_provider",
      selection: copilotAnthropicSelectionV1,
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => {
        worker = new InMemoryBrowserPiWorkerV1();
        return worker as BrowserPiWorkerLikeV1;
      },
    });
    await expect(transport.configureCredential("transport-selection-key")).resolves.toEqual({
      kind: "configured",
    });
    await expect(transport.selectModel(copilotCompletionsSelectionV1)).resolves.toEqual({
      kind: "selected",
      selection: copilotCompletionsSelectionV1,
    });
    expect(worker).not.toBeNull();
    const posted = (worker as unknown as InMemoryBrowserPiWorkerV1).posted;
    expect(posted).toHaveLength(2);
    expect(posted[1]).toEqual({
      revision: 1,
      kind: "select_model",
      requestId: 2,
      selection: copilotCompletionsSelectionV1,
    });
    expect(posted.filter((message) => JSON.stringify(message).includes("transport-selection-key")))
      .toHaveLength(1);
    await transport.forget();
  });

  it("fences Pi and rejects pending work when the Workspace Host becomes fatal", async () => {
    const workspaceAuthority = new TestBrowserProgramWorkspaceAuthorityV1();
    const worker = new ControllableBrowserPiWorkerV1();
    const transport = createBrowserPiWorkerRawTransportV1({
      runtime: "deterministic_test",
      workspaceAuthority,
      workerFactory: () => worker,
    });
    const failures: unknown[] = [];
    transport.subscribeWorkspaceFailures(() => {
      throw new Error("Workspace failure observation must remain observational");
    });
    transport.subscribeWorkspaceFailures((failure) => failures.push(failure));
    const client = createAgentRpcClientInternalV1({ transport });

    await expect(transport.configureCredential("sentinel-browser-key")).resolves.toEqual({
      kind: "configured",
    });
    await expect(transport.testConnection()).resolves.toEqual({ kind: "ready" });
    await expect(client.connect()).resolves.toEqual({ kind: "ready" });
    await expect(client.start()).resolves.toEqual({
      kind: "started",
      sessionId: "controlled.session.1",
    });
    await expect(
      transport.openWorkspace({ programId: submitV1.programId, workspaceId: workspaceIdV1 }),
    ).resolves.toMatchObject({ phase: "open", generation: 1 });
    worker.dropSubmitResponses = true;
    const submitted = client.submit({
      sessionId: "controlled.session.1",
      text: serializeCreatorAgentSubmitV1(submitV1),
    });
    await waitUntilV1(() => worker.latestExecution !== null);

    workspaceAuthority.failHost({ code: "outcome_unknown" });

    await expect(submitted).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "rpc.request_failed", path: "/request" },
    });
    expect(failures).toEqual([{
      revision: 1,
      code: "outcome_unknown",
      programId: submitV1.programId,
      workspaceId: workspaceIdV1,
      workspaceSessionId: workspaceSessionIdV1,
      generation: 1,
    }]);
    expect(worker.terminated).toBe(true);
    expect(workspaceAuthority.closeWorkspaceCalls).toBe(0);

    await client.dispose();
    await transport.forget();
    expect(failures).toHaveLength(1);
    expect(workspaceAuthority.detachWorkspaceEnvironmentCalls).toEqual([workspaceSessionIdV1]);
    expect(workspaceAuthority.disposeCalls).toBe(0);
  });

  it("projects a fatal Workspace Host into one failed product run and a retained recovery descriptor", async () => {
    const workspaceAuthority = new TestBrowserProgramWorkspaceAuthorityV1();
    const worker = new ControllableBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority,
      workerFactory: () => worker,
    });
    await configureAndTestProductPortV1(port);
    await openProductWorkspaceV1(port);
    const run = productRunV1({ agentRunId: "agent.run.workspace-host-fatal" });
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });

    workspaceAuthority.failHost({ code: "outcome_unknown" });
    await waitUntilV1(() => port.getSnapshot().workspace.phase === "failed");

    expect(port.getSnapshot()).toMatchObject({
      phase: "failed",
      diagnostic: { code: "connection_failed", path: "/workspace/host" },
      workspace: {
        phase: "failed",
        descriptor: {
          programId: submitV1.programId,
          workspaceId: workspaceIdV1,
          workspaceSessionId: workspaceSessionIdV1,
          generation: 1,
        },
        diagnostic: { code: "recovery_required", path: "/workspace/host" },
      },
      terminalRuns: [{
        run,
        outcome: "failed",
        diagnosticCode: "connection_failed",
      }],
    });
    expect(worker.terminated).toBe(true);
    expect(workspaceAuthority.closeWorkspaceCalls).toBe(0);
    await waitUntilV1(() => workspaceAuthority.detachWorkspaceEnvironmentCalls.length === 1);
    expect(workspaceAuthority.detachWorkspaceEnvironmentCalls).toEqual([workspaceSessionIdV1]);
    expect(port.acknowledgeTerminal(run.agentRunId)).toBe(true);
    expect(port.getSnapshot()).toMatchObject({
      phase: "failed",
      diagnostic: { code: "connection_failed", path: "/workspace/host" },
      terminalRuns: [],
      workspace: {
        phase: "failed",
        diagnostic: { code: "recovery_required", path: "/workspace/host" },
      },
    });
    await port.dispose();
  });

  it("does not publish a terminal when the Workspace Host rejects a still-pending submit", async () => {
    const workspaceAuthority = new TestBrowserProgramWorkspaceAuthorityV1();
    const worker = new ControllableBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority,
      workerFactory: () => worker,
    });
    await configureAndTestProductPortV1(port);
    await openProductWorkspaceV1(port);
    worker.dropSubmitResponses = true;
    const run = productRunV1({ agentRunId: "agent.run.workspace-host-pending" });
    const submitted = port.submit(run);
    await waitUntilV1(() => worker.latestExecution !== null);

    workspaceAuthority.failHost({ code: "outcome_unknown" });

    await expect(submitted).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "connection_failed", path: "/workspace/host" },
    });
    expect(port.getSnapshot()).toMatchObject({
      phase: "failed",
      activeRunId: null,
      diagnostic: { code: "connection_failed", path: "/workspace/host" },
      terminalRuns: [],
      workspace: {
        phase: "failed",
        diagnostic: { code: "recovery_required", path: "/workspace/host" },
      },
    });
    expect(worker.terminated).toBe(true);
    expect(workspaceAuthority.closeWorkspaceCalls).toBe(0);
    await waitUntilV1(() => workspaceAuthority.detachWorkspaceEnvironmentCalls.length === 1);
    expect(workspaceAuthority.detachWorkspaceEnvironmentCalls).toEqual([workspaceSessionIdV1]);
    await port.dispose();
  });

  it("publishes one completed product terminal without exposing Pi identities", async () => {
    let worker: InMemoryBrowserPiWorkerV1 | null = null;
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority,
      workerFactory: () => {
        worker = new InMemoryBrowserPiWorkerV1();
        return worker as BrowserPiWorkerLikeV1;
      },
    });
    expect(port.getSnapshot()).toMatchObject({
      phase: "uninitialized",
      distribution: browserPiDistributionIdentityV1,
      terminalRuns: [],
    });
    await configureAndTestProductPortV1(port);
    await openProductWorkspaceV1(port);

    let survivingObserverCalls = 0;
    port.subscribe(() => {
      throw new Error("terminal observer failure must remain observational");
    });
    port.subscribe(() => {
      survivingObserverCalls += 1;
    });
    const run = productRunV1();
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });
    expect(workspaceAuthority.agentSubmitAdmissionCalls).toBe(1);
    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 1);

    const terminal = port.getSnapshot().terminalRuns[0];
    expect(terminal).toEqual({
      run,
      outcome: "completed",
      candidate: {
        revision: 1,
        proposalId: run.proposalId,
        programId: run.programId,
        baseProgramRevision: run.baseProgramRevision,
        text: run.text,
        requirement: run.text,
      },
      finalAssistantReply: "Deterministic test proposal ready.",
    });
    expect(port.getSnapshot().terminalRuns.filter(({ outcome }) => outcome === "completed"))
      .toHaveLength(1);
    expect(JSON.stringify(terminal)).not.toContain("sillyos.session.");
    expect(JSON.stringify(terminal)).not.toContain("sillyos.run.");
    expect(JSON.stringify(terminal)).not.toContain('"sessionId"');
    expect(JSON.stringify(terminal)).not.toContain('"runId"');
    expect(survivingObserverCalls).toBeGreaterThan(0);

    const workspace = port.getSnapshot().workspace;
    expect(workspace).toMatchObject({
      phase: "open",
      descriptor: { generation: 2 },
      receipts: [
        {
          revision: 1,
          sequence: 1,
          programId: run.programId,
          workspaceId: workspaceIdV1,
          agentRunId: run.agentRunId,
          tool: "write",
          expectedGeneration: 1,
          baseGeneration: 1,
          resultingGeneration: 2,
          outcome: "succeeded",
          effect: "changed",
          changedPaths: [".sillyos/p3a-round-trip.txt"],
          diagnosticCode: null,
        },
      ],
    });
    expect(`${workspaceRootV1}/${workspace.receipts[0]?.changedPaths[0]}`).toBe(
      roundTripArtifactPathV1,
    );
    const serializedWorkspace = JSON.stringify(workspace);
    expect(serializedWorkspace).not.toContain("sillyos.session.1");
    expect(serializedWorkspace).not.toContain("sillyos.run.1");
    expect(serializedWorkspace).not.toContain('"sessionId"');
    expect(serializedWorkspace).not.toContain('"runId"');
    await expect(port.acknowledgeWorkspaceReceipts(1)).resolves.toEqual({
      kind: "acknowledged",
      throughSequence: 1,
    });
    expect(port.getSnapshot().workspace.receipts).toEqual([]);

    expect(port.acknowledgeTerminal(run.agentRunId)).toBe(true);
    expect(port.getSnapshot()).toMatchObject({ phase: "ready", terminalRuns: [] });
    expect(port.acknowledgeTerminal(run.agentRunId)).toBe(false);
    await port.forget();
    expect(port.getSnapshot()).toMatchObject({
      phase: "forgotten",
      activeRunId: null,
      draft: "",
      candidate: null,
    });
    expect((worker as unknown as InMemoryBrowserPiWorkerV1).terminated).toBe(true);
  });

  it("retains a predecessor replacement after the latest run becomes current", async () => {
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => new InMemoryBrowserPiWorkerV1(),
    });
    await configureAndTestProductPortV1(port);
    await openProductWorkspaceV1(port);
    const firstRun = productRunV1({ agentRunId: "agent.run.replaced" });
    const latestRun = productRunV1({
      agentRunId: "agent.run.latest",
      proposalId: "workspace.preview.1.proposal.latest",
      text: "Keep only the latest candidate.",
    });

    const first = port.submit(firstRun);
    const latest = port.submit(latestRun);
    await expect(first).resolves.toEqual({
      kind: "submitted",
      agentRunId: firstRun.agentRunId,
    });
    await expect(latest).resolves.toEqual({
      kind: "submitted",
      agentRunId: latestRun.agentRunId,
    });
    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 2);

    const terminals = port.getSnapshot().terminalRuns;
    expect(terminals).toHaveLength(2);
    expect(terminals.filter(({ run }) => run.agentRunId === firstRun.agentRunId)).toEqual([{
      run: firstRun,
      outcome: "replaced",
    }]);
    expect(terminals.filter(({ run }) => run.agentRunId === latestRun.agentRunId)).toEqual([{
      run: latestRun,
      outcome: "completed",
      candidate: {
        revision: 1,
        proposalId: latestRun.proposalId,
        programId: latestRun.programId,
        baseProgramRevision: latestRun.baseProgramRevision,
        text: latestRun.text,
        requirement: latestRun.text,
      },
      finalAssistantReply: "Deterministic test proposal ready.",
    }]);
    expect(terminals.filter(({ outcome }) => outcome === "replaced")).toHaveLength(1);
    expect(terminals.filter(({ outcome }) => outcome === "completed")).toHaveLength(1);
    expect(JSON.stringify(terminals)).not.toContain('"sessionId"');
    expect(JSON.stringify(terminals)).not.toContain('"runId"');

    expect(port.acknowledgeTerminal(firstRun.agentRunId)).toBe(true);
    expect(port.getSnapshot().terminalRuns.map(({ run }) => run.agentRunId)).toEqual([
      latestRun.agentRunId,
    ]);
    expect(port.acknowledgeTerminal(latestRun.agentRunId)).toBe(true);
    expect(port.getSnapshot().terminalRuns).toEqual([]);
    await port.dispose();
  });

  it("maps an authoritative remote failure exactly once", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => worker,
    });
    const run = productRunV1({ agentRunId: "agent.run.failed" });
    await openProductWorkspaceV1(port);
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });
    const piRunId = worker.latestPiRunId;
    if (piRunId === null) throw new Error("expected a transient Pi run id");

    worker.emitRunFailure("pi_failed", piRunId);
    worker.emitRunFailure("pi_failed", piRunId);
    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 1);

    expect(port.getSnapshot().terminalRuns).toEqual([{
      run,
      outcome: "failed",
      diagnosticCode: "run_failed",
    }]);
    expect(JSON.stringify(port.getSnapshot().terminalRuns)).not.toContain(piRunId);
    expect(JSON.stringify(port.getSnapshot().terminalRuns)).not.toContain("controlled.session.1");
    expect(port.acknowledgeTerminal(run.agentRunId)).toBe(true);
    await port.dispose();
  });

  it("projects a whitespace-only completed reply as one failed terminal", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => worker,
    });
    const run = productRunV1({ agentRunId: "agent.run.whitespace" });
    await openProductWorkspaceV1(port);
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });

    worker.emitCompleted(run, "   ");
    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 1);

    expect(port.getSnapshot().terminalRuns).toEqual([{
      run,
      outcome: "failed",
      diagnosticCode: "protocol_invalid",
    }]);
    expect(port.getSnapshot().phase).toBe("failed");
    expect(port.acknowledgeTerminal(run.agentRunId)).toBe(true);
    await port.dispose();
  });

  it("keeps cancel requested non-terminal until the Worker emits cancelled", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => worker,
    });
    const run = productRunV1({ agentRunId: "agent.run.cancelled" });
    await openProductWorkspaceV1(port);
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });
    const piRunId = worker.latestPiRunId;
    if (piRunId === null) throw new Error("expected a transient Pi run id");

    await expect(port.cancel(run.agentRunId)).resolves.toEqual({ kind: "cancel_requested" });
    expect(port.getSnapshot()).toMatchObject({
      phase: "running",
      activeRunId: run.agentRunId,
      terminalRuns: [],
    });

    worker.emitRunFailure("cancelled", piRunId);
    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 1);
    expect(port.getSnapshot().terminalRuns).toEqual([{ run, outcome: "cancelled" }]);
    expect(port.getSnapshot().terminalRuns.filter(({ outcome }) => outcome === "cancelled"))
      .toHaveLength(1);
    expect(JSON.stringify(port.getSnapshot().terminalRuns)).not.toContain(piRunId);
    expect(JSON.stringify(port.getSnapshot().terminalRuns)).not.toContain("controlled.session.1");
    expect(port.acknowledgeTerminal(run.agentRunId)).toBe(true);
    expect(port.acknowledgeTerminal(run.agentRunId)).toBe(false);
    worker.emitArtifactChunks(2_049, 2, piRunId);
    expect(port.getSnapshot()).toMatchObject({ phase: "ready", terminalRuns: [] });
    await port.dispose();
  });
});

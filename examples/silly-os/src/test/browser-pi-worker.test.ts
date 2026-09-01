// SPDX-License-Identifier: MIT

import { readFile } from "node:fs/promises";

import {
  createAgentSessionClientV1,
  type AgentSessionStreamEventV1,
} from "@sillymaker/agent/session";
import { afterEach, describe, expect, it, vi } from "vitest";

import { browserPiDistributionIdentityV1 } from "../agent/browser-pi-distribution.ts";
import {
  createDefaultBrowserPiWorkerV1,
  createBrowserPiWorkerConnectorV1,
  type BrowserPiWorkerLikeV1,
} from "../agent/browser-pi-transport.ts";
import {
  createBrowserPiWorkerRuntimeV1 as createBrowserPiWorkerRuntimeCoreV1,
  createBrowserPiWorkspaceToolsV1,
} from "../agent/browser-pi-worker-runtime.ts";
import { piNetworkDisabledErrorCodeV1 } from "../agent/pi-network-tool-binder.ts";
import { resolveBrowserPiReasoningEffortV1 } from "../agent/browser-pi-provider-runtime-bridge.js";
import type {
  BrowserPiModelSelectionFailureCodeV1,
  BrowserPiModelSelectionV1,
  BrowserPiWorkerAnyOutboundMessageV1,
  BrowserPiWorkerExecutionBindingV1,
  BrowserPiWorkspaceSnapshotWireV1,
} from "../agent/browser-pi-worker-protocol.ts";
import { browserPiSelectionEndpointOriginV1 } from "../agent/browser-pi-worker-protocol.ts";
import {
  createBrowserProgramAgentHostV1,
  type BrowserProgramAgentPortInputV1,
} from "../application/program-agent-composition.ts";
import {
  createCreatorProgramAgentPortV1,
  type CreatorAgentPortV1,
} from "../../programs/creator/runtime-profile/browser-creator-agent-port.ts";
import { createTranslationProgramAgentPortV1 } from "../../programs/translation/runtime-profile/browser-translation-agent-port.ts";
import type { BrowserNetworkBrokerLeaseV1 } from "../network/browser-network-broker-frame-transport.ts";
import {
  admitBrowserNetworkBrokerCancelV1,
  admitBrowserNetworkBrokerFetchUrlRequestV1,
  createBrowserNetworkBrokerFetchUrlResultV1,
} from "../network/browser-network-broker-protocol.ts";
import {
  admitBrowserNetworkDownloadChunkAckV1,
  admitBrowserNetworkDownloadRequestV1,
  admitBrowserNetworkDownloadSinkReadyV1,
  createBrowserNetworkDownloadChunkV1,
  createBrowserNetworkDownloadCompleteV1,
  createBrowserNetworkDownloadResponseV1,
} from "../network/browser-network-download-stream-protocol.ts";
import {
  deterministicBashProbePrefixV1,
  deterministicCancellationHoldPrefixV1,
  deterministicDownloadProbePrefixV1,
  deterministicEditProbePrefixV1,
  deterministicFetchUrlProbePrefixV1,
  deterministicFileOpsProbePrefixV1,
  deterministicGrepProbePrefixV1,
  deterministicPersistenceReadPrefixV1,
} from "../agent/browser-pi-runtime-bridge.js";
import type {
  BrowserProgramWorkspaceAuthorityV1,
  BrowserProgramWorkspaceFatalV1,
} from "../application/workspace/browser-program-workspace-authority.ts";
import {
  creatorProgramRuntimeProfileImplementationV1,
  creatorProgramRuntimeProfileV1,
  serializeBrowserPiCreatorAgentDispatchV1,
} from "../../programs/creator/runtime-profile/creator-runtime-profile.ts";
import {
  serializeBrowserPiTranslationAgentDispatchV1,
  translationProgramRuntimeProfileImplementationV1,
  translationProgramRuntimeProfileV1,
} from "../../programs/translation/runtime-profile/translation-runtime-profile.ts";
import {
  admitCredentialVaultHandoffReadyV2,
  createCredentialVaultHandoffDeliveryV2,
} from "../credential/credential-vault-protocol.ts";
import type { CredentialVaultBindingV2 } from "../credential/credential-vault-contracts.ts";
import type {
  CreatorAgentRunRequestV1,
  CreatorAgentSubmitV1,
} from "../../programs/creator/runtime/contracts.ts";
import type { TranslationAgentRunRequestV1 } from "../../programs/translation/runtime/translation-agent-contracts.ts";
import {
  applyProcessNetworkAccessMutationV1,
  cloneProcessNetworkAccessV1,
  createDefaultProcessNetworkAccessV1,
  type ProcessNetworkAccessV1,
} from "../program-platform/capabilities/process-network-access.ts";
import {
  workspaceImmutableSnapshotReceiptsEqualV1,
  type WorkspaceImmutableSnapshotReceiptV1,
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
  type BrowserWorkspaceHostDownloadStageV1,
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

function createTestNetworkBrokerLeaseV1(input: {
  readonly text?: string;
  readonly downloadBytes?: Uint8Array;
  readonly closeDownloadSinkSilently?: boolean;
  readonly onDownloadRequest?: (url: string) => void;
  readonly onRequest?: (url: string, respond: () => void) => void;
  readonly onCancel?: (requestId: string) => void;
  readonly onMessage?: (message: unknown) => void;
} = {}): BrowserNetworkBrokerLeaseV1 {
  const channel = new MessageChannel();
  const text = input.text ?? "SillyOS deterministic network response.";
  let terminated = false;
  channel.port1.addEventListener("message", (event: MessageEvent<unknown>) => {
    input.onMessage?.(structuredClone(event.data));
    const download = admitBrowserNetworkDownloadRequestV1(event.data);
    if (download !== null) {
      const sinkPort = event.ports.length === 1 ? event.ports[0] : undefined;
      if (sinkPort === undefined) {
        channel.port1.close();
        return;
      }
      input.onDownloadRequest?.(download.url);
      if (input.closeDownloadSinkSilently === true) {
        sinkPort.close();
        return;
      }
      const source = input.downloadBytes ?? new TextEncoder().encode(
        "SillyOS deterministic remote download.\n",
      );
      const bytes = source.slice();
      const totalBytes = bytes.byteLength;
      let responseSent = false;
      // oxlint-disable unicorn/require-post-message-target-origin -- MessagePort has no targetOrigin.
      sinkPort.addEventListener("message", (sinkEvent: MessageEvent<unknown>) => {
        if (!responseSent) {
          const ready = admitBrowserNetworkDownloadSinkReadyV1(sinkEvent.data);
          if (ready === null || ready.requestId !== download.requestId) {
            sinkPort.close();
            return;
          }
          responseSent = true;
          sinkPort.postMessage(createBrowserNetworkDownloadResponseV1({
            requestId: download.requestId,
            status: 200,
            contentType: "application/octet-stream",
            declaredBytes: totalBytes,
          }));
          if (totalBytes === 0) {
            sinkPort.postMessage(createBrowserNetworkDownloadCompleteV1({
              requestId: download.requestId,
              bytes: 0,
              chunks: 0,
            }));
            return;
          }
          const chunk = bytes.buffer;
          sinkPort.postMessage(
            createBrowserNetworkDownloadChunkV1({
              requestId: download.requestId,
              sequence: 1,
              offset: 0,
              chunk,
            }),
            [chunk],
          );
          return;
        }
        const ack = admitBrowserNetworkDownloadChunkAckV1(sinkEvent.data);
        if (
          ack === null || ack.requestId !== download.requestId || ack.sequence !== 1
        ) {
          sinkPort.close();
          return;
        }
        sinkPort.postMessage(createBrowserNetworkDownloadCompleteV1({
          requestId: download.requestId,
          bytes: totalBytes,
          chunks: 1,
        }));
      });
      sinkPort.start();
      // oxlint-enable unicorn/require-post-message-target-origin
      return;
    }
    const request = admitBrowserNetworkBrokerFetchUrlRequestV1(event.data);
    if (request !== null) {
      const respond = (): void =>
        channel.port1.postMessage(createBrowserNetworkBrokerFetchUrlResultV1({
          requestId: request.requestId,
          status: 200,
          contentType: "text/plain; charset=utf-8",
          bytes: new TextEncoder().encode(text).byteLength,
          text,
        }));
      if (input.onRequest === undefined) respond();
      else input.onRequest(request.url, respond);
      return;
    }
    const cancel = admitBrowserNetworkBrokerCancelV1(event.data);
    if (cancel === null) channel.port1.close();
    else input.onCancel?.(cancel.requestId);
  });
  channel.port1.start();
  return {
    agentPort: channel.port2,
    terminate(): void {
      if (terminated) return;
      terminated = true;
      channel.port1.close();
      channel.port2.close();
    },
  };
}

const openTestNetworkBrokerV1 = (): Promise<BrowserNetworkBrokerLeaseV1> =>
  Promise.resolve(createTestNetworkBrokerLeaseV1());

function createBrowserPiWorkerRuntimeV1(
  input:
    & Omit<
      Parameters<typeof createBrowserPiWorkerRuntimeCoreV1>[0],
      "expectedEndpointOrigin" | "providerFetch"
    >
    & Partial<
      Pick<
        Parameters<typeof createBrowserPiWorkerRuntimeCoreV1>[0],
        "expectedEndpointOrigin" | "providerFetch"
      >
    >,
): ReturnType<typeof createBrowserPiWorkerRuntimeCoreV1> {
  let inferredEndpointOrigin = input.expectedEndpointOrigin ?? null;
  const runtimeInput = {
    ...input,
    loadProgramExecution: input.loadProgramExecution ?? loadTestProgramExecutionV1,
    get expectedEndpointOrigin(): string | null {
      return input.expectedEndpointOrigin ?? inferredEndpointOrigin;
    },
    providerFetch: input.providerFetch ?? fetch,
  };
  const core = createBrowserPiWorkerRuntimeCoreV1(runtimeInput);
  let implicitLease: BrowserNetworkBrokerLeaseV1 | null = null;
  return {
    receive(message, ports = []) {
      const kind = message !== null && typeof message === "object"
        ? Object.getOwnPropertyDescriptor(message, "kind")?.value
        : null;
      if (
        kind === "configure" && input.expectedEndpointOrigin === undefined && message !== null &&
        typeof message === "object"
      ) {
        const selection = Object.getOwnPropertyDescriptor(message, "selection")?.value as
          | BrowserPiModelSelectionV1
          | null
          | undefined;
        inferredEndpointOrigin = selection === null || selection === undefined
          ? null
          : browserPiSelectionEndpointOriginV1(selection);
      }
      if (kind === "configure" && ports.length === 0) {
        implicitLease?.terminate();
        implicitLease = createTestNetworkBrokerLeaseV1();
        core.receive(message, [implicitLease.agentPort]);
        return;
      }
      core.receive(message, ports);
    },
    dispose(): void {
      core.dispose();
      implicitLease?.terminate();
      implicitLease = null;
    },
  };
}

function createBrowserCreatorAgentPortV1(
  input: Omit<BrowserProgramAgentPortInputV1, "openNetworkBroker"> & {
    readonly openNetworkBroker?: () => Promise<BrowserNetworkBrokerLeaseV1>;
  },
): CreatorAgentPortV1 {
  const host = createBrowserProgramAgentHostV1({
    ...input,
    openNetworkBroker: input.openNetworkBroker ?? openTestNetworkBrokerV1,
  } as BrowserProgramAgentPortInputV1);
  const port = createCreatorProgramAgentPortV1(host);
  testProgramAgentHostsV1.add(host);
  testProgramAgentHostByPortV1.set(port, host);
  return port;
}

const testProgramAgentHostsV1 = new Set<ReturnType<typeof createBrowserProgramAgentHostV1>>();
const testProgramAgentHostByPortV1 = new WeakMap<
  CreatorAgentPortV1,
  ReturnType<typeof createBrowserProgramAgentHostV1>
>();

function testProgramAgentHostV1(port: CreatorAgentPortV1) {
  const host = testProgramAgentHostByPortV1.get(port);
  if (host === undefined) throw new Error("test Program Agent Host is unavailable");
  return host;
}

function createTestProgramAgentPortsV1(input: BrowserProgramAgentPortInputV1) {
  const host = createBrowserProgramAgentHostV1(input);
  const creator = createCreatorProgramAgentPortV1(host);
  testProgramAgentHostsV1.add(host);
  testProgramAgentHostByPortV1.set(creator, host);
  return Object.freeze({
    host,
    creator,
    translation: createTranslationProgramAgentPortV1(host),
  });
}

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  const hosts = [...testProgramAgentHostsV1];
  testProgramAgentHostsV1.clear();
  await Promise.all(hosts.map((host) => host.dispose()));
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

function programPackageV1(programId: string, digestDigit = "c") {
  return {
    programId,
    packageVersion: "1.0.0",
    contentDigest: digestDigit.repeat(64),
  } as const;
}

const loadTestProgramExecutionV1: NonNullable<
  Parameters<typeof createBrowserPiWorkerRuntimeCoreV1>[0]["loadProgramExecution"]
> = (dispatch) => {
  const runtimeProfile = dispatch.runtimeProfile === creatorProgramRuntimeProfileV1
    ? creatorProgramRuntimeProfileImplementationV1
    : translationProgramRuntimeProfileImplementationV1;
  const admission = runtimeProfile.admitDispatch(dispatch);
  return Promise.resolve(
    admission.kind === "rejected" ? null : {
      instructions: dispatch.runtimeProfile === creatorProgramRuntimeProfileV1
        ? "Create the requested Program."
        : "Translate the admitted batch faithfully.",
      packageResources: dispatch.runtimeProfile === translationProgramRuntimeProfileV1
        ? [{
          path: "skills/translate/SKILL.md",
          mediaType: "text/markdown",
          bytes: new TextEncoder().encode("Use the exact Translation completion tool."),
        }]
        : [],
      workspaceScripts: [],
      runtimeProfile,
      invocation: admission.invocation,
    },
  );
};

function serializeCreatorAgentSubmitV1(submit: CreatorAgentSubmitV1): string {
  return serializeBrowserPiCreatorAgentDispatchV1({
    programPackage: programPackageV1(submit.programId),
    submit,
  });
}

function productRunV1(
  overrides: Partial<CreatorAgentRunRequestV1> = {},
): CreatorAgentRunRequestV1 {
  return {
    agentRunId: "agent.run.product.1",
    programPackage: programPackageV1(submitV1.programId),
    processId: "process.creator.product.1",
    processAttemptGeneration: 1,
    workspaceCheckpointId: "checkpoint.workspace.preview.1",
    workspaceGeneration: 1,
    proposalId: submitV1.proposalId,
    programId: submitV1.programId,
    baseProgramRevision: submitV1.baseProgramRevision,
    baseRepositoryRevision: 1,
    text: submitV1.text,
    ...overrides,
  };
}

function translationAgentRunV1(
  overrides: Partial<TranslationAgentRunRequestV1> = {},
): TranslationAgentRunRequestV1 {
  return {
    agentRunId: "agent.run.translation.1",
    programPackage: programPackageV1(submitV1.programId, "d"),
    processId: "process.translation.agent-port.1",
    processAttemptGeneration: 1,
    workspaceCheckpointId: "sillyos.workspace.checkpoint.test.1",
    workspaceGeneration: 1,
    programId: submitV1.programId,
    expectedWorksetRevision: 1,
    replacesCandidateId: null,
    requestedOutputTokens: 8_192,
    instruction: "Translate the next batch and preserve every meaning fact.",
    batch: {
      sourceLocale: "zh-CN",
      targetLocale: "en",
      documentPurpose: "Fictional game dialogue.",
      style: "Natural and concise.",
      glossary: [],
      confirmedMeaningFacts: [],
      neighboringUnits: { preceding: null, following: null },
      units: [{
        unitId: "translation.unit.agent-port.1",
        order: 0,
        locator: "line/1",
        context: null,
        durationMilliseconds: null,
        lineBreakPolicy: "forbidden",
        source: "欢迎回来，⟦SM:0⟧。",
        protectedSegments: [{
          token: "⟦SM:0⟧",
          kind: "placeholder",
          source: "{name}",
        }],
      }],
    },
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

function connectionTestRequestV1(
  requestId: number,
  selection: BrowserPiModelSelectionV1 | null,
): Readonly<Record<string, unknown>> {
  return { revision: 1, kind: "test_connection", requestId, selection };
}

function executionBindingV1(expectedGeneration = 1): BrowserPiWorkerExecutionBindingV1 {
  return {
    revision: 1,
    processId: productRunV1().processId,
    programId: submitV1.programId,
    workspaceId: workspaceIdV1,
    workspaceSessionId: workspaceSessionIdV1,
    expectedGeneration,
  };
}

interface TestBrowserWorkspaceVolumeStateV1 {
  head: BrowserWorkspaceHostDurableHeadV1;
  preparedSnapshot: WorkspaceImmutableSnapshotReceiptV1 | null;
  readonly retainedSnapshots: Map<string, WorkspaceImmutableSnapshotReceiptV1>;
  readonly directories: Set<string>;
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
    if (this.state.directories.has(path)) return { kind: "directory", size: 0, mtimeMs: 0 };
    const bytes = this.state.files.get(path);
    return bytes === undefined
      ? { kind: "missing", size: 0, mtimeMs: 0 }
      : { kind: "file", size: bytes.length, mtimeMs: 1_725_235_200_000 };
  }

  async listDirectory(input: { readonly path: string; readonly signal: AbortSignal }) {
    if (input.signal.aborted) throw new DOMException("Workspace listing aborted", "AbortError");
    const prefix = input.path.length === 0 ? "" : `${input.path}/`;
    const entries = new Map<string, "file" | "directory">();
    for (
      const [entryPath, leafKind] of [
        ...[...this.state.directories].map((directoryPath) =>
          [directoryPath, "directory"] as const
        ),
        ...[...this.state.files.keys()].map((filePath) => [filePath, "file"] as const),
      ]
    ) {
      if (!entryPath.startsWith(prefix)) continue;
      const remainder = entryPath.slice(prefix.length);
      if (remainder.length === 0) continue;
      const separator = remainder.indexOf("/");
      entries.set(
        separator < 0 ? remainder : remainder.slice(0, separator),
        separator < 0 ? leafKind : "directory",
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
    const parts = input.path.split("/");
    parts.pop();
    for (let index = 0; index < parts.length; index += 1) {
      this.state.directories.add(parts.slice(0, index + 1).join("/"));
    }
    this.state.files.set(input.path, bytes.slice());
    this.state.head = {
      ...this.state.head,
      checkpointId: input.nextCheckpointId,
      generation: this.state.head.generation + 1,
    };
    return { changed: true, head: { ...this.state.head } };
  }

  createDownloadStage(input: {
    readonly maximumBytes: number;
    readonly signal: AbortSignal;
  }): Promise<BrowserWorkspaceHostDownloadStageV1> {
    let bytes = new Uint8Array();
    let sealed = false;
    let released = false;
    return Promise.resolve({
      get byteLength() {
        return bytes.byteLength;
      },
      append: ({ offset, bytes: chunk, signal }) => {
        if (
          released || sealed || signal.aborted || input.signal.aborted ||
          offset !== bytes.byteLength || bytes.byteLength + chunk.byteLength > input.maximumBytes
        ) return Promise.reject(new Error("invalid test download stage append"));
        const next = new Uint8Array(bytes.byteLength + chunk.byteLength);
        next.set(bytes);
        next.set(chunk, bytes.byteLength);
        bytes = next;
        return Promise.resolve();
      },
      seal: (signal) => {
        if (released || signal.aborted || input.signal.aborted) {
          return Promise.reject(new Error("invalid test download stage seal"));
        }
        sealed = true;
        return Promise.resolve();
      },
      readRange: ({ offset, length, signal }) => {
        if (released || !sealed || signal.aborted || offset + length > bytes.byteLength) {
          return Promise.reject(new Error("invalid test download stage read"));
        }
        return Promise.resolve(bytes.slice(offset, offset + length));
      },
      release: () => {
        released = true;
        return Promise.resolve();
      },
    });
  }

  async mutateEntry(
    input: Parameters<BrowserWorkspaceHostVolumeLeasePortV1["mutateEntry"]>[0],
  ): ReturnType<BrowserWorkspaceHostVolumeLeasePortV1["mutateEntry"]> {
    if (this.closed) throw new Error("test Workspace volume lease is closed");
    if (input.signal.aborted) throw new DOMException("Workspace mutation aborted", "AbortError");
    if (
      input.expectedHead.checkpointId !== this.state.head.checkpointId ||
      input.expectedHead.generation !== this.state.head.generation
    ) throw new Error("test Workspace durable head is stale");
    const separator = input.path.lastIndexOf("/");
    const parent = separator < 0 ? "" : input.path.slice(0, separator);
    if (!this.state.directories.has(parent)) throw new Error("test Workspace parent is missing");
    if (input.operation === "create_directory") {
      if (this.state.directories.has(input.path) || this.state.files.has(input.path)) {
        throw new Error("test Workspace entry already exists");
      }
      this.state.directories.add(input.path);
    } else if (input.operation === "remove_file") {
      if (!this.state.files.delete(input.path)) throw new Error("test Workspace file is missing");
    } else {
      if (!this.state.directories.has(input.path)) {
        throw new Error("test Workspace directory is missing");
      }
      if (
        [...this.state.directories, ...this.state.files.keys()].some((candidate) =>
          candidate.startsWith(`${input.path}/`)
        )
      ) throw new Error("test Workspace directory is not empty");
      this.state.directories.delete(input.path);
    }
    this.state.head = {
      ...this.state.head,
      checkpointId: input.nextCheckpointId,
      generation: this.state.head.generation + 1,
    };
    return Promise.resolve({ changed: true, head: { ...this.state.head } });
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
    const receipt: WorkspaceImmutableSnapshotReceiptV1 = {
      revision: 1,
      snapshotId: input.snapshotId,
      programId: this.anchor.programId,
      workspaceId: this.anchor.workspaceId,
      volumeId: this.anchor.volumeId,
      workspaceFormat: 1,
      publicationId: input.publicationId,
      sourceRevision: input.sourceRevision,
      baseRevision: input.baseRevision,
      checkpointId: input.expectedHead.checkpointId,
      generation: input.expectedHead.generation,
      fileCount: this.state.files.size,
      archiveBytes: 22,
    };
    this.state.preparedSnapshot = receipt;
    return receipt;
  }

  queryCurrentImmutableSnapshotCandidate(): Promise<WorkspaceImmutableSnapshotReceiptV1 | null> {
    return Promise.resolve(this.state.preparedSnapshot);
  }

  queryRetainedImmutableSnapshot(
    expected: WorkspaceImmutableSnapshotReceiptV1,
  ): Promise<WorkspaceImmutableSnapshotReceiptV1 | null> {
    const retained = this.state.retainedSnapshots.get(expected.snapshotId) ?? null;
    return Promise.resolve(
      retained !== null && workspaceImmutableSnapshotReceiptsEqualV1(retained, expected)
        ? retained
        : null,
    );
  }

  resumeImmutableSnapshotPublication(
    expected: WorkspaceImmutableSnapshotReceiptV1,
  ): Promise<WorkspaceImmutableSnapshotReceiptV1> {
    if (
      this.state.preparedSnapshot === null ||
      !workspaceImmutableSnapshotReceiptsEqualV1(this.state.preparedSnapshot, expected) ||
      this.state.head.checkpointId !== expected.checkpointId ||
      this.state.head.generation !== expected.generation
    ) throw new Error("test Workspace snapshot resume mismatch");
    return Promise.resolve(expected);
  }

  adoptImmutableSnapshot(
    expected: WorkspaceImmutableSnapshotReceiptV1,
  ): Promise<"adopted" | "already_retained"> {
    const retained = this.state.retainedSnapshots.get(expected.snapshotId);
    if (retained !== undefined) {
      if (!workspaceImmutableSnapshotReceiptsEqualV1(retained, expected)) {
        throw new Error("test Workspace retained snapshot mismatch");
      }
      return Promise.resolve("already_retained");
    }
    if (
      this.state.preparedSnapshot === null ||
      !workspaceImmutableSnapshotReceiptsEqualV1(this.state.preparedSnapshot, expected)
    ) throw new Error("test Workspace snapshot adopt mismatch");
    this.state.retainedSnapshots.set(expected.snapshotId, expected);
    this.state.preparedSnapshot = null;
    return Promise.resolve("adopted");
  }

  discardImmutableSnapshot(
    expected: WorkspaceImmutableSnapshotReceiptV1,
  ): Promise<"discarded" | "absent" | "retained"> {
    const retained = this.state.retainedSnapshots.get(expected.snapshotId);
    if (retained !== undefined) {
      if (!workspaceImmutableSnapshotReceiptsEqualV1(retained, expected)) {
        throw new Error("test Workspace retained snapshot mismatch");
      }
      return Promise.resolve("retained");
    }
    if (this.state.preparedSnapshot === null) return Promise.resolve("absent");
    if (!workspaceImmutableSnapshotReceiptsEqualV1(this.state.preparedSnapshot, expected)) {
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
    directories: new Set([""]),
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
  private controlledWorkerGeneration: number | null = null;
  private readonly processNetworkAccess = new Map<string, ProcessNetworkAccessV1>();
  private disposed = false;
  closeWorkspaceCalls = 0;
  agentSubmitAdmissionCalls = 0;
  lastAgentSubmitAdmission:
    | Omit<
      Parameters<BrowserProgramWorkspaceAuthorityV1["withAgentSubmitAdmission"]>[0],
      "operation"
    >
    | null = null;
  readonly detachWorkspaceEnvironmentCalls: string[] = [];
  holdDetachWorkspaceEnvironment = false;
  disposeCalls = 0;
  exportCalls = 0;
  exportAborted = false;
  holdExport = false;
  holdAuthorizedExport = false;
  authorizedExportStarted = false;
  private finishAuthorizedExport: (() => void) | null = null;
  nextOpenFailureCode: BrowserWorkspaceHostControlFailureCodeV1 | null = null;

  reflectControlledWorkerGeneration(generation: number): void {
    this.controlledWorkerGeneration = generation;
  }

  private reflectControlledWorkerSnapshotV1(
    snapshot: BrowserWorkspaceHostSnapshotWireV1,
  ): BrowserWorkspaceHostSnapshotWireV1 {
    return this.controlledWorkerGeneration === null ? snapshot : {
      ...snapshot,
      descriptor: { ...snapshot.descriptor, generation: this.controlledWorkerGeneration },
    };
  }

  releaseAuthorizedExport(): void {
    this.finishAuthorizedExport?.();
    this.finishAuthorizedExport = null;
  }

  constructor() {
    testWorkspaceAuthoritiesV1.add(this);
    this.runtime = createBrowserWorkspaceHostRuntimeV1({
      bootstrap: this.bootstrap,
      loadShellRuntime: () => import("../workspace/browser-workspace-just-bash-runtime.ts"),
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

  async applyAgentRevision(): Promise<never> {
    throw new Error("test repository Agent revision is unavailable");
  }

  async settleAgentRun(): Promise<never> {
    throw new Error("test repository Agent settlement is unavailable");
  }

  async decide(): Promise<never> {
    throw new Error("test repository decision is unavailable");
  }

  async loadProcessNetworkAccess(processId: string): Promise<ProcessNetworkAccessV1> {
    return cloneProcessNetworkAccessV1(
      this.processNetworkAccess.get(processId) ?? createDefaultProcessNetworkAccessV1(processId),
    );
  }

  async setProcessNetworkAccess(
    input: Parameters<BrowserProgramWorkspaceAuthorityV1["setProcessNetworkAccess"]>[0],
  ): ReturnType<BrowserProgramWorkspaceAuthorityV1["setProcessNetworkAccess"]> {
    const applied = applyProcessNetworkAccessMutationV1(
      await this.loadProcessNetworkAccess(input.processId),
      input,
    );
    this.processNetworkAccess.set(input.processId, cloneProcessNetworkAccessV1(applied.value));
    return { kind: applied.kind, value: cloneProcessNetworkAccessV1(applied.value) };
  }

  async withAgentSubmitAdmission<T>(
    input: Parameters<BrowserProgramWorkspaceAuthorityV1["withAgentSubmitAdmission"]>[0],
  ): Promise<T> {
    this.agentSubmitAdmissionCalls += 1;
    const { operation, ...admission } = input;
    this.lastAgentSubmitAdmission = {
      ...admission,
      programPackage: structuredClone(admission.programPackage),
    };
    return await operation(await this.loadProcessNetworkAccess(input.processId)) as T;
  }

  async createProcessWorkspace(): Promise<never> {
    throw new Error("test Process Workspace creation is unavailable");
  }

  async inspectProcessWorkspace(): Promise<null> {
    return null;
  }

  async probeProcessWorkspace(): Promise<boolean> {
    return true;
  }

  async importProcessWorkspaceFile(): Promise<never> {
    throw new Error("test Process Workspace import is unavailable");
  }

  get readFileRangeRequests(): TestBrowserWorkspaceVolumeStateV1["readFileRangeRequests"] {
    return this.bootstrap.state.readFileRangeRequests;
  }

  get sourceReadRequests(): TestBrowserWorkspaceVolumeStateV1["sourceReadRequests"] {
    return this.bootstrap.state.sourceReadRequests;
  }

  workspaceEntryKind(path: string): "missing" | "file" | "directory" {
    if (this.bootstrap.state.directories.has(path)) return "directory";
    return this.bootstrap.state.files.has(path) ? "file" : "missing";
  }

  workspaceText(path: string): string | null {
    const bytes = this.bootstrap.state.files.get(path);
    return bytes === undefined ? null : new TextDecoder().decode(bytes);
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

  openProcessWorkspace(input: {
    readonly processId: string;
    readonly workspaceId: string;
  }): ReturnType<TestBrowserProgramWorkspaceAuthorityV1["openWorkspace"]> {
    if (!input.processId.startsWith("process.")) {
      return Promise.reject(new Error("test Process identity mismatch"));
    }
    return this.openWorkspace({ programId: submitV1.programId, workspaceId: input.workspaceId });
  }

  async queryWorkspace(workspaceSessionId: string): Promise<BrowserWorkspaceHostSnapshotWireV1> {
    const response = await this.control({ method: "query_workspace", workspaceSessionId });
    if (response.method !== "query_workspace") throw new Error("test query response mismatch");
    return this.reflectControlledWorkerSnapshotV1(response.snapshot);
  }

  async detachWorkspaceEnvironment(workspaceSessionId: string): Promise<void> {
    this.detachWorkspaceEnvironmentCalls.push(workspaceSessionId);
    if (this.holdDetachWorkspaceEnvironment) await new Promise<never>(() => undefined);
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
    return this.reflectControlledWorkerSnapshotV1(response.snapshot);
  }

  async closeActiveWorkspace(): Promise<BrowserWorkspaceHostSnapshotWireV1 | null> {
    try {
      return await this.closeWorkspace(workspaceSessionIdV1);
    } catch {
      return null;
    }
  }

  async inspectStorage(): ReturnType<BrowserProgramWorkspaceAuthorityV1["inspectStorage"]> {
    return {
      revision: 1,
      scope: "sandbox_origin_advisory",
      persisted: false,
      usageBytes: 0,
      quotaBytes: 0,
    };
  }

  async resetStoredData(): ReturnType<BrowserProgramWorkspaceAuthorityV1["resetStoredData"]> {
    this.processNetworkAccess.clear();
    return {
      programDataRepository: { kind: "cleared" },
      workspaceVolumes: { kind: "cleared" },
    };
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
  const opened = await authority.openProcessWorkspace({
    processId: productRunV1().processId,
    workspaceId: workspaceIdV1,
  });
  const descriptor: BrowserPiWorkerExecutionBindingV1 = {
    revision: 1,
    processId: productRunV1().processId,
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
  await expect(port.configureCredential(apiKey)).resolves.toMatchObject({ kind: "configured" });
  await expect(port.testConnection()).resolves.toEqual({ kind: "ready" });
}

async function openProductWorkspaceV1(port: CreatorAgentPortV1): Promise<void> {
  if (port.getSnapshot().phase === "uninitialized") await configureAndTestProductPortV1(port);
  await expect(port.openWorkspace({
    processId: productRunV1().processId,
    programId: submitV1.programId,
    workspaceId: workspaceIdV1,
  }))
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
  private readonly runtime;

  constructor(
    input: Partial<
      Pick<
        Parameters<typeof createBrowserPiWorkerRuntimeCoreV1>[0],
        "createProviderAgent" | "loadProgramExecution"
      >
    > = {},
  ) {
    this.runtime = createBrowserPiWorkerRuntimeV1({
      ...input,
      postMessage: (message) => {
        const data = structuredClone(message);
        for (const listener of [...this.messageListeners]) listener({ data });
      },
    });
  }

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
            effectiveReasoningEffort: "off",
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
  deferReceiptAcknowledgementResponses = false;
  dropCloseWorkspaceResponses = false;
  dropSubmitResponses = false;
  failConfiguration = false;
  failConnectionTest = false;
  failReceiptAcknowledgement = false;
  modelSelectionFailure: BrowserPiModelSelectionFailureCodeV1 | null = null;
  selectModelRequests = 0;
  startRequests = 0;
  testConnectionRequests = 0;
  cancelRequests = 0;
  readonly requestOrder: string[] = [];
  readonly networkAccessReplacements: Array<{
    readonly processId: string;
    readonly workspaceSessionId: string;
    readonly enabled: boolean;
  }> = [];
  readonly workspaceReceiptAcknowledgements: number[] = [];
  private readonly deferredWorkspaceReceiptAcknowledgementResponses: unknown[] = [];
  private configuredRuntime: unknown = null;
  private configuredSelection: unknown = null;
  private configuredPreferredReasoningEffort: unknown = null;
  private configuredEffectiveReasoningEffort = "off";
  latestPiRunId: string | null = null;
  latestExecution: BrowserPiWorkerExecutionBindingV1 | null = null;
  private readonly messageListeners = new Set<(event: { readonly data: unknown }) => void>();
  private readonly errorListeners = new Set<(event: unknown) => void>();
  private nextPiRunOrdinal = 1;
  private nextWorkspaceReceiptSequence = 1;
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

  releaseReceiptAcknowledgementResponses(): void {
    const responses = this.deferredWorkspaceReceiptAcknowledgementResponses.splice(0);
    for (const response of responses) this.emit(response);
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
      this.configuredPreferredReasoningEffort = envelope.preferredReasoningEffort;
      this.emit({
        revision: 1,
        kind: "configured",
        requestId: envelope.requestId,
        runtime: envelope.runtime,
        selection: envelope.selection,
        effectiveReasoningEffort: this.configuredEffectiveReasoningEffort,
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
          effectiveReasoningEffort: this.configuredEffectiveReasoningEffort,
        });
      }
      return;
    }
    if (envelope.kind === "set_reasoning_effort") {
      this.configuredPreferredReasoningEffort = envelope.preferredReasoningEffort;
      this.emit({
        revision: 1,
        kind: "reasoning_effort_selected",
        requestId: envelope.requestId,
        preferredReasoningEffort: envelope.preferredReasoningEffort,
        effectiveReasoningEffort: this.configuredEffectiveReasoningEffort,
      });
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
        if (this.dropCloseWorkspaceResponses) return;
        this.workspace = { ...this.workspace, phase: "closed" };
      } else if (record.method === "acknowledge_workspace_receipts") {
        if (this.failReceiptAcknowledgement) {
          this.emit({
            revision: 1,
            kind: "workspace_response",
            requestId: envelope.requestId,
            ok: false,
            code: "workspace_busy",
          });
          return;
        }
        const throughSequence = record.throughSequence as number;
        this.workspaceReceiptAcknowledgements.push(throughSequence);
        this.workspace = {
          ...this.workspace,
          receipts: this.workspace.receipts.filter((receipt) => receipt.sequence > throughSequence),
        };
      } else if (record.method === "replace_network_access") {
        this.requestOrder.push("replace_network_access");
        this.networkAccessReplacements.push(structuredClone({
          processId: record.processId,
          workspaceSessionId: record.workspaceSessionId,
          enabled: record.enabled,
        }) as {
          readonly processId: string;
          readonly workspaceSessionId: string;
          readonly enabled: boolean;
        });
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
      const outbound = {
        revision: 1,
        kind: "workspace_response",
        requestId: envelope.requestId,
        ok: true,
        response,
      };
      if (
        record.method === "acknowledge_workspace_receipts" &&
        this.deferReceiptAcknowledgementResponses
      ) {
        this.deferredWorkspaceReceiptAcknowledgementResponses.push(outbound);
      } else {
        this.emit(outbound);
      }
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
      this.requestOrder.push("submit");
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
      this.cancelRequests += 1;
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
    sequence = 1,
  ): void {
    this.emit({
      revision: 1,
      kind: "rpc_record",
      record: {
        kind: "run_failed",
        code,
        sessionId: "controlled.session.1",
        runId: piRunId,
        sequence,
      },
    });
  }

  emitWorkspaceMutation(
    piRunId: string = this.latestPiRunId ?? "",
    changedPath = ".sillyos/agent-mutation.txt",
  ): void {
    const workspace = this.workspace;
    const execution = this.latestExecution;
    if (workspace === null || execution === null) {
      throw new Error("expected an open controlled Workspace");
    }
    const sequence = this.nextWorkspaceReceiptSequence++;
    const receipt = Object.freeze({
      revision: 1 as const,
      sequence,
      programId: workspace.programId,
      workspaceId: workspace.workspaceId,
      workspaceSessionId: workspace.workspaceSessionId,
      sessionId: "controlled.session.1",
      runId: piRunId,
      toolCallId: `tool.write.${String(sequence)}`,
      tool: "write" as const,
      expectedGeneration: execution.expectedGeneration,
      baseGeneration: workspace.generation,
      resultingGeneration: workspace.generation + 1,
      outcome: "succeeded" as const,
      effect: "changed" as const,
      changedPaths: Object.freeze([changedPath]),
      diagnosticCode: null,
    });
    this.workspace = {
      ...workspace,
      generation: receipt.resultingGeneration,
      receipts: Object.freeze([...workspace.receipts, receipt]),
    };
    this.emit({ revision: 1, kind: "workspace_receipt", receipt });
  }

  emitCompleted(run: CreatorAgentRunRequestV1, text: string): void {
    const runId = this.latestPiRunId ?? "";
    const records = [
      { kind: "output_text_delta", text },
      {
        kind: "output_data",
        value: {
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

  emitTextDeltas(
    count: number,
    firstSequence: number,
    piRunId: string = this.latestPiRunId ?? "",
  ): void {
    for (let index = 0; index < count; index += 1) {
      this.emit({
        revision: 1,
        kind: "rpc_record",
        record: {
          kind: "output_text_delta",
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
  it("dispatches the fixed Translation runtime profile and keeps extra assistant text inert", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const prompts: string[] = [];
    const runtimeProfiles: string[] = [];
    const workspaceToolCounts: number[] = [];
    const programResourceReads: string[] = [];
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
      createProviderAgent: (input) => {
        runtimeProfiles.push(input.runtimeProfile.runtimeProfile);
        workspaceToolCounts.push(input.workspaceTools.length);
        return {
          async prompt(text) {
            prompts.push(text);
            const readProgramResource = input.workspaceTools.find((tool) =>
              tool.name === "sillyos_read_program_resource"
            );
            const resource = await readProgramResource?.execute("resource.call.1", {
              path: "skills/translate/SKILL.md",
            });
            const resourceText = resource?.content[0];
            if (
              resourceText !== null && typeof resourceText === "object" &&
              (resourceText as Readonly<Record<string, unknown>>).type === "text" &&
              typeof (resourceText as Readonly<Record<string, unknown>>).text === "string"
            ) {
              programResourceReads.push(
                (resourceText as Readonly<Record<string, unknown>>).text as string,
              );
            }
            await input.onCandidate({
              targets: [{
                unitId: "translation.unit.000001",
                target: "Welcome back, ⟦SM:0⟧.",
              }],
              ambiguities: [],
            });
            input.onTextDelta("This explanatory sentence is not product output.");
            return { stopReason: "stop" };
          },
          abort() {},
          dispose() {},
        };
      },
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "pi_provider",
      selection: availableSelectionV1,
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "translation-test-key" },
    });
    const execution = await attachRuntimeWorkspaceV1(
      runtime,
      messages,
      workspaceAuthority,
      2,
    );
    runtime.receive(rpcRequestV1(3, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeBrowserPiTranslationAgentDispatchV1({
          programPackage: programPackageV1(submitV1.programId, "d"),
          programId: submitV1.programId,
          requestedOutputTokens: 4_608,
          instruction: "Translate the admitted batch faithfully.",
          request: {
            sourceLocale: "zh-CN",
            targetLocale: "en",
            documentPurpose: "Fictional game dialogue.",
            style: "Natural and concise.",
            glossary: [],
            confirmedMeaningFacts: [],
            neighboringUnits: { preceding: null, following: null },
            units: [{
              unitId: "translation.unit.000001",
              order: 0,
              locator: "line/1",
              context: null,
              durationMilliseconds: null,
              lineBreakPolicy: "forbidden",
              source: "欢迎回来，⟦SM:0⟧。",
              protectedSegments: [{
                token: "⟦SM:0⟧",
                kind: "placeholder",
                source: "{name}",
              }],
            }],
          },
        }),
      },
    }, execution));

    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );
    expect(runtimeProfiles).toEqual([translationProgramRuntimeProfileV1]);
    expect(workspaceToolCounts).toEqual([1]);
    expect(programResourceReads).toEqual(["Use the exact Translation completion tool."]);
    expect(JSON.parse(prompts[0] ?? "null")).toMatchObject({
      schema: "sillyos.translation-agent-request.v1",
      instruction: "Translate the admitted batch faithfully.",
      batch: {
        sourceLocale: "zh-CN",
        targetLocale: "en",
      },
    });
    expect(messages).toContainEqual(expect.objectContaining({
      kind: "rpc_record",
      record: expect.objectContaining({
        kind: "output_data",
        value: {
          targets: [{
            unitId: "translation.unit.000001",
            target: "Welcome back, ⟦SM:0⟧.",
          }],
          ambiguities: [],
        },
      }),
    }));
    expect(messages.some((message) =>
      message.kind === "rpc_record" &&
      (message.record as Readonly<Record<string, unknown>>).kind === "output_text_delta"
    )).toBe(false);

    runtime.dispose();
    await workspaceAuthority.dispose();
  });

  it("settles submit when the exact Program execution cannot load", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
      loadProgramExecution: () =>
        Promise.reject(new TypeError("synthetic exact Program execution failure")),
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "deterministic_test",
      selection: null,
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "sentinel-browser-key" },
    });
    const execution = await attachRuntimeWorkspaceV1(
      runtime,
      messages,
      workspaceAuthority,
      2,
    );
    runtime.receive(rpcRequestV1(3, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1(submitV1),
      },
    }, execution));

    await waitUntilV1(() =>
      messages.some((message) => message.kind === "rpc_response" && message.requestId === 4)
    );
    expect(messages.find((message) => message.kind === "rpc_response" && message.requestId === 4))
      .toEqual({
        revision: 1,
        kind: "rpc_response",
        requestId: 4,
        ok: false,
        code: "program_package_unavailable",
      });

    runtime.dispose();
    await workspaceAuthority.dispose();
  });

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
      preferredReasoningEffort: "medium",
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

  it("accepts one exact Vault handoff without projecting recovered plaintext", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const broker = createTestNetworkBrokerLeaseV1();
    const delivery = new MessageChannel();
    const binding: CredentialVaultBindingV2 = {
      bindingId: "builtin:openai",
      credentialKind: "api_key",
      baseUrl: "https://api.openai.com/v1",
    };
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
      credentialHandoffDeadlineMilliseconds: 100,
    });
    const ready = new Promise<unknown>((resolve) => {
      delivery.port2.addEventListener("message", (event) => resolve(event.data), { once: true });
      delivery.port2.start();
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "pi_provider",
      selection: availableSelectionV1,
      preferredReasoningEffort: "medium",
      credential: {
        kind: "vault_handoff",
        handoffId: "credential.handoff.1",
        binding,
      },
    }, [broker.agentPort, delivery.port1]);

    expect(await ready).toEqual({
      revision: 2,
      kind: "credential_vault_handoff_ready",
      handoffId: "credential.handoff.1",
      binding,
    });
    expect(messages).toEqual([]);
    delivery.port2.postMessage(
      createCredentialVaultHandoffDeliveryV2(
        "credential.handoff.1",
        binding,
        "recovered-provider-secret",
      ),
    );
    await waitUntilV1(() => messages.some(({ kind }) => kind === "configured"));
    expect(messages.at(-1)).toMatchObject({
      revision: 1,
      kind: "configured",
      requestId: 1,
      selection: availableSelectionV1,
    });
    expect(JSON.stringify(messages)).not.toContain("recovered-provider-secret");
    expect(JSON.stringify(messages)).not.toContain("credential_vault_handoff_delivery");

    runtime.dispose();
    broker.terminate();
    delivery.port2.close();
  });

  it("fails closed on mismatched, extra-port, and expired Vault handoffs", async () => {
    const binding: CredentialVaultBindingV2 = {
      bindingId: "builtin:openai",
      credentialKind: "api_key",
      baseUrl: "https://api.openai.com/v1",
    };
    const configure = {
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "pi_provider",
      selection: availableSelectionV1,
      preferredReasoningEffort: "medium",
      credential: {
        kind: "vault_handoff",
        handoffId: "credential.handoff.1",
        binding,
      },
    } as const;

    const mismatchMessages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const mismatchBroker = createTestNetworkBrokerLeaseV1();
    const mismatchDelivery = new MessageChannel();
    const mismatchRuntime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => mismatchMessages.push(structuredClone(message)),
      credentialHandoffDeadlineMilliseconds: 100,
    });
    const ready = new Promise<unknown>((resolve) => {
      mismatchDelivery.port2.addEventListener("message", (event) => resolve(event.data), {
        once: true,
      });
      mismatchDelivery.port2.start();
    });
    mismatchRuntime.receive(configure, [mismatchBroker.agentPort, mismatchDelivery.port1]);
    expect(admitCredentialVaultHandoffReadyV2(await ready)).not.toBeNull();
    mismatchDelivery.port2.postMessage(createCredentialVaultHandoffDeliveryV2(
      "credential.handoff.other",
      binding,
      "must-not-be-accepted",
    ));
    await waitUntilV1(() => mismatchMessages.length !== 0);
    expect(mismatchMessages).toEqual([{
      revision: 1,
      kind: "configuration_failure",
      requestId: 1,
      code: "credential_handoff_failed",
    }]);

    const extraMessages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const extraBroker = createTestNetworkBrokerLeaseV1();
    const extraDelivery = new MessageChannel();
    const extra = new MessageChannel();
    const extraRuntime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => extraMessages.push(structuredClone(message)),
    });
    extraRuntime.receive(configure, [extraBroker.agentPort, extraDelivery.port1, extra.port1]);
    expect(extraMessages).toEqual([{
      revision: 1,
      kind: "protocol_failure",
      code: "invalid_message",
    }]);

    const expiredMessages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const expiredBroker = createTestNetworkBrokerLeaseV1();
    const expiredDelivery = new MessageChannel();
    const expiredRuntime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => expiredMessages.push(structuredClone(message)),
      credentialHandoffDeadlineMilliseconds: 10,
    });
    expiredRuntime.receive(configure, [expiredBroker.agentPort, expiredDelivery.port1]);
    await waitUntilV1(() => expiredMessages.length !== 0);
    expect(expiredMessages).toEqual([{
      revision: 1,
      kind: "configuration_failure",
      requestId: 1,
      code: "credential_handoff_failed",
    }]);

    mismatchRuntime.dispose();
    extraRuntime.dispose();
    expiredRuntime.dispose();
    mismatchBroker.terminate();
    extraBroker.terminate();
    expiredBroker.terminate();
    mismatchDelivery.port2.close();
    extraDelivery.port2.close();
    extra.port2.close();
    expiredDelivery.port2.close();
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
      const effectiveReasoningEffort = resolveBrowserPiReasoningEffortV1(selection, "medium");
      runtime.receive({
        revision: 1,
        kind: "configure",
        requestId: configureRequestId,
        runtime: "pi_provider",
        selection,
        preferredReasoningEffort: "medium",
        credential: { kind: "api_key", value: `sentinel-live-key-${index}` },
      });
      expect(messages).toEqual([{
        revision: 1,
        kind: "configured",
        requestId: configureRequestId,
        runtime: "pi_provider",
        selection,
        effectiveReasoningEffort,
        distribution: browserPiDistributionIdentityV1,
      }]);
      expect(probeInputs).toEqual([]);

      runtime.receive(connectionTestRequestV1(testRequestId, selection));
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

  it("keeps reasoning preference unchanged while Test Connection is in flight", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    let probeStarted = false;
    let settleProbe!: (value: boolean) => void;
    const probeResult = new Promise<boolean>((resolve) => {
      settleProbe = resolve;
    });
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
      probeProviderSelection: () => {
        probeStarted = true;
        return probeResult;
      },
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "pi_provider",
      selection: copilotAnthropicSelectionV1,
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "reasoning-test-key" },
    });
    runtime.receive(connectionTestRequestV1(2, copilotAnthropicSelectionV1));
    await waitUntilV1(() => probeStarted);

    runtime.receive({
      revision: 1,
      kind: "set_reasoning_effort",
      requestId: 3,
      preferredReasoningEffort: "max",
    });
    expect(messages.at(-1)).toEqual({
      revision: 1,
      kind: "reasoning_effort_selection_failure",
      requestId: 3,
      code: "busy",
    });

    settleProbe(true);
    await waitUntilV1(() => messages.some((message) => message.kind === "ready"));
    runtime.receive({
      revision: 1,
      kind: "select_model",
      requestId: 4,
      selection: copilotCompletionsSelectionV1,
    });
    await waitUntilV1(() =>
      messages.some((message) => message.kind === "model_selected" && message.requestId === 4)
    );
    expect(messages.at(-1)).toEqual({
      revision: 1,
      kind: "model_selected",
      requestId: 4,
      selection: copilotCompletionsSelectionV1,
      effectiveReasoningEffort: resolveBrowserPiReasoningEffortV1(
        copilotCompletionsSelectionV1,
        "medium",
      ),
    });
    runtime.dispose();
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
      readonly reasoningEffort: string;
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
          reasoningEffort: input.reasoningEffort,
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
      preferredReasoningEffort: "medium",
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
      effectiveReasoningEffort: resolveBrowserPiReasoningEffortV1(
        copilotCompletionsSelectionV1,
        "medium",
      ),
    });

    runtime.receive({
      revision: 1,
      kind: "set_reasoning_effort",
      requestId: 35,
      preferredReasoningEffort: "max",
    });
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "reasoning_effort_selected" && message.requestId === 35
      )
    );
    expect(messages.at(-1)).toEqual({
      revision: 1,
      kind: "reasoning_effort_selected",
      requestId: 35,
      preferredReasoningEffort: "max",
      effectiveReasoningEffort: resolveBrowserPiReasoningEffortV1(
        copilotCompletionsSelectionV1,
        "max",
      ),
    });

    runtime.receive(connectionTestRequestV1(4, copilotCompletionsSelectionV1));
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
    runtime.receive(rpcRequestV1(6, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 6 && message.ok
      )
    );
    runtime.receive(rpcRequestV1(7, {
      revision: 1,
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
      reasoningEffort: resolveBrowserPiReasoningEffortV1(
        copilotCompletionsSelectionV1,
        "max",
      ),
      workspaceTools: ["read", "write", "edit", "bash", "grep", "fetch_url", "download"],
    }]);

    runtime.receive({
      revision: 1,
      kind: "set_reasoning_effort",
      requestId: 36,
      preferredReasoningEffort: "low",
    });
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "reasoning_effort_selection_failure" && message.requestId === 36
      )
    );
    expect(messages.at(-1)).toEqual({
      revision: 1,
      kind: "reasoning_effort_selection_failure",
      requestId: 36,
      code: "busy",
    });

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
      method: "cancel",
      params: { sessionId: "sillyos.session.1", runId: "sillyos.run.1" },
    }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_failed"
      )
    );
    runtime.receive({
      revision: 1,
      kind: "select_model",
      requestId: 37,
      selection: copilotAnthropicSelectionV1,
    });
    await waitUntilV1(() =>
      messages.some((message) => message.kind === "model_selected" && message.requestId === 37)
    );
    expect(messages.at(-1)).toEqual({
      revision: 1,
      kind: "model_selected",
      requestId: 37,
      selection: copilotAnthropicSelectionV1,
      effectiveReasoningEffort: resolveBrowserPiReasoningEffortV1(
        copilotAnthropicSelectionV1,
        "max",
      ),
    });
    runtime.receive(connectionTestRequestV1(10, copilotAnthropicSelectionV1));
    await waitUntilV1(() => probeInputs.length === 2);
    expect(probeInputs.at(-1)).toEqual({
      apiKey: "route-sentinel-key",
      selection: copilotAnthropicSelectionV1,
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
      preferredReasoningEffort: "medium",
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
    runtime.receive(connectionTestRequestV1(23, copilotAnthropicSelectionV1));
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
      preferredReasoningEffort: "medium",
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
    customRuntime.receive(connectionTestRequestV1(27, customSelectionV1));
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
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "testing-sentinel-key" },
    });
    runtime.receive(connectionTestRequestV1(31, copilotAnthropicSelectionV1));
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
    runtime.receive(connectionTestRequestV1(34, copilotCompletionsSelectionV1));
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
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "custom-sentinel-key" },
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 42,
      runtime: "pi_provider",
      selection: customSelectionV1,
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "second-key" },
    });
    runtime.receive(connectionTestRequestV1(43, customSelectionV1));

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
        effectiveReasoningEffort: "off",
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

    runtime.receive(rpcRequestV1(44, { revision: 1, method: "start" }));
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
    runtime.receive(connectionTestRequestV1(45, customSelectionV1));
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
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "pending-custom-key" },
    });
    expect(messages.at(-1)?.kind).toBe("configured");
    messages.length = 0;
    runtime.receive(connectionTestRequestV1(45, customSelectionV1));
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
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "timed-out-custom-key" },
    });
    expect(messages.at(-1)?.kind).toBe("configured");
    messages.length = 0;
    runtime.receive(connectionTestRequestV1(46, customSelectionV1));
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
      .toBe(1_290);
    const projected = response.catalog.providers.flatMap((provider) =>
      provider.models.map((model) => ({
        providerId: provider.id,
        modelId: model.id,
        availability: model.availability,
      }))
    );
    const available = projected.filter(({ availability }) => availability === "available");
    expect(available).toHaveLength(1_015);
    expect(available).toEqual(expect.arrayContaining([
      { providerId: "anthropic", modelId: "claude-sonnet-4-5", availability: "available" },
      {
        providerId: "openrouter",
        modelId: "z-ai/glm-5.3-flash",
        availability: "available",
      },
    ]));
    expect(projected.filter(({ availability }) => availability === "unavailable")).toHaveLength(
      275,
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
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "available-sentinel-key" },
    });
    expect(messages.at(-1)).toMatchObject({ kind: "configured", requestId: 8 });
    expect(JSON.stringify(messages)).not.toContain("available-sentinel-key");
    runtime.receive(connectionTestRequestV1(9, selectedAnthropicModel));
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
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "sentinel-browser-key" },
    });
    runtime.receive(connectionTestRequestV1(99, null));
    const execution = await attachRuntimeWorkspaceV1(runtime, messages, workspaceAuthority);
    runtime.receive(rpcRequestV1(3, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
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
      effectiveReasoningEffort: "off",
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
    expect(records.filter((record) => record.kind === "output_text_delta")).toHaveLength(1);
    expect(records.find((record) => record.kind === "output_data")?.value).toEqual({
      ...submitV1,
      requirement: submitV1.text,
    });
    expect(records.at(-1)?.kind).toBe("run_completed");

    const persistenceProbe = `${deterministicPersistenceReadPrefixV1}${submitV1.text}`;
    runtime.receive(rpcRequestV1(5, {
      revision: 1,
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
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "sentinel-edit-key" },
    });
    runtime.receive(connectionTestRequestV1(99, null));
    const execution = await attachRuntimeWorkspaceV1(runtime, messages, workspaceAuthority);
    runtime.receive(rpcRequestV1(3, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );

    const editText = `${deterministicEditProbePrefixV1}preserve this exact final text.`;
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
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
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "sentinel-bash-key" },
    });
    runtime.receive(connectionTestRequestV1(99, null));
    const execution = await attachRuntimeWorkspaceV1(runtime, messages, workspaceAuthority);
    runtime.receive(rpcRequestV1(3, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );

    const bashText = `${deterministicBashProbePrefixV1}write and search one exact file.`;
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
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

  it("keeps the native Pi bash file-operations lifecycle in one exact multi-generation receipt", async () => {
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
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "sentinel-file-ops-key" },
    });
    runtime.receive(connectionTestRequestV1(99, null));
    const execution = await attachRuntimeWorkspaceV1(runtime, messages, workspaceAuthority);
    runtime.receive(rpcRequestV1(3, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );

    const fileOpsText = `${deterministicFileOpsProbePrefixV1}prove the exact durable tree.`;
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.file-ops",
          text: fileOpsText,
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
      }));
    }

    const changedPaths = [
      ".sillyos",
      ".sillyos/file-ops",
      ".sillyos/file-ops/source",
      ".sillyos/file-ops/source/nested",
      ".sillyos/file-ops/source/nested/empty.txt",
      ".sillyos/file-ops/source/nested/source.txt",
      ".sillyos/file-ops/source/nested/copied.txt",
      ".sillyos/file-ops/moved.txt",
      ".sillyos/file-ops/copied-tree",
      ".sillyos/file-ops/copied-tree/nested",
      ".sillyos/file-ops/copied-tree/nested/empty.txt",
      ".sillyos/file-ops/copied-tree/nested/source.txt",
      ".sillyos/file-ops/kept-empty.txt",
    ];
    const receipts = messages.flatMap((message) =>
      message.kind === "workspace_receipt" ? [message.receipt] : []
    );
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      sequence: 1,
      runId: "sillyos.run.1",
      toolCallId: "sillyos-file-ops-1",
      tool: "bash",
      expectedGeneration: 1,
      baseGeneration: 1,
      // Shell redirection publishes its empty truncate and final bytes as two
      // sequential effects, so the lifecycle advances 21 times from head 1.
      resultingGeneration: 22,
      outcome: "succeeded",
      effect: "changed",
      changedPaths,
    });
    expect(messages.findLastIndex((message) => message.kind === "workspace_receipt"))
      .toBeLessThan(messages.indexOf(terminal));
    expect(workspaceAuthority.workspaceText(".sillyos/file-ops/moved.txt"))
      .toBe("SillyOS workspace file operations\n");
    expect(workspaceAuthority.workspaceText(".sillyos/file-ops/kept-empty.txt")).toBe("");
    expect(workspaceAuthority.workspaceEntryKind(".sillyos/file-ops/copied-tree/nested"))
      .toBe("directory");
    expect(workspaceAuthority.workspaceEntryKind(".sillyos/file-ops/source")).toBe("missing");
    expect(workspaceAuthority.workspaceEntryKind(
      ".sillyos/file-ops/copied-tree/nested/source.txt",
    )).toBe("missing");
    expect(JSON.stringify(messages)).not.toContain("sentinel-file-ops-key");
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
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "sentinel-grep-key" },
    });
    runtime.receive(connectionTestRequestV1(99, null));
    const execution = await attachRuntimeWorkspaceV1(runtime, messages, workspaceAuthority);
    runtime.receive(rpcRequestV1(3, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );

    const grepText = `${deterministicGrepProbePrefixV1}find this exact line.`;
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
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

  it("rejects a stale Process or generation binding without disturbing the active run and retries from query", async () => {
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
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "key" },
    });
    runtime.receive(connectionTestRequestV1(99, null));
    const execution = await attachRuntimeWorkspaceV1(runtime, messages, workspaceAuthority);
    runtime.receive(rpcRequestV1(3, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );

    runtime.receive(rpcRequestV1(4, {
      revision: 1,
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

    runtime.receive(rpcRequestV1(50, {
      revision: 1,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.other-process",
          text: "This other Process must be rejected before Pi.",
        }),
      },
    }, { ...execution, processId: "process.other" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 50 && !message.ok
      )
    );
    expect(messages.find((message) => message.kind === "rpc_response" && message.requestId === 50))
      .toEqual({
        revision: 1,
        kind: "rpc_response",
        requestId: 50,
        ok: false,
        code: "invalid_request",
      });

    runtime.receive(rpcRequestV1(5, {
      revision: 1,
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
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "key" },
    });
    runtime.receive(connectionTestRequestV1(99, null));
    const execution = await attachRuntimeWorkspaceV1(runtime, messages, workspaceAuthority);
    runtime.receive(rpcRequestV1(3, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1(submitV1),
      },
    }, execution));
    runtime.receive(rpcRequestV1(5, {
      revision: 1,
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

  it("binds network access to one exact Process and Program Workspace and resets it on close", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const brokerRequests: string[] = [];
    const brokerLease = createTestNetworkBrokerLeaseV1({
      onRequest: (url, respond) => {
        brokerRequests.push(url);
        respond();
      },
    });
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const runtime = createBrowserPiWorkerRuntimeCoreV1({
      expectedEndpointOrigin: null,
      providerFetch: fetch,
      loadProgramExecution: loadTestProgramExecutionV1,
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "deterministic_test",
      selection: null,
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "sentinel-network-key" },
    }, [brokerLease.agentPort]);
    const execution = await attachRuntimeWorkspaceV1(
      runtime,
      messages,
      workspaceAuthority,
      2,
    );

    runtime.receive(workspaceRequestV1(3, {
      method: "replace_network_access",
      processId: "process.other",
      workspaceSessionId: execution.workspaceSessionId,
      enabled: true,
    }));
    runtime.receive(workspaceRequestV1(4, {
      method: "replace_network_access",
      processId: execution.processId,
      workspaceSessionId: "workspace.session.other",
      enabled: true,
    }));
    await waitUntilV1(() =>
      [3, 4].every((requestId) =>
        messages.some((message) =>
          message.kind === "workspace_response" && message.requestId === requestId &&
          !message.ok && message.code === "workspace_mismatch"
        )
      )
    );

    runtime.receive(workspaceRequestV1(5, {
      method: "replace_network_access",
      processId: execution.processId,
      workspaceSessionId: execution.workspaceSessionId,
      enabled: true,
    }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "workspace_response" && message.requestId === 5 && message.ok &&
        message.response.method === "replace_network_access"
      )
    );
    runtime.receive(rpcRequestV1(6, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 6 && message.ok
      )
    );
    const url = "https://example.test/reference.txt?revision=durable";
    const submitFetchV1 = (
      requestId: number,
      sessionId: string,
      proposalId: string,
      binding: BrowserPiWorkerExecutionBindingV1,
    ): void => {
      runtime.receive(rpcRequestV1(requestId, {
        revision: 1,
        method: "submit",
        params: {
          sessionId,
          text: serializeCreatorAgentSubmitV1({
            ...submitV1,
            proposalId,
            text: `${deterministicFetchUrlProbePrefixV1}${url}`,
          }),
        },
      }, binding));
    };
    submitFetchV1(
      7,
      "sillyos.session.1",
      "workspace.preview.1.proposal.network.durable.1",
      execution,
    );
    await waitUntilV1(() =>
      brokerRequests.length === 1 && messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.1" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );
    submitFetchV1(
      8,
      "sillyos.session.1",
      "workspace.preview.1.proposal.network.durable.2",
      execution,
    );
    await waitUntilV1(() =>
      brokerRequests.length === 2 && messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.2" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );
    runtime.receive(workspaceRequestV1(9, {
      method: "close_workspace",
      workspaceSessionId: execution.workspaceSessionId,
    }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "workspace_response" && message.requestId === 9 && message.ok
      )
    );
    await workspaceAuthority.closeWorkspace(execution.workspaceSessionId);
    const reopenedExecution = await attachRuntimeWorkspaceV1(
      runtime,
      messages,
      workspaceAuthority,
      10,
    );
    runtime.receive(rpcRequestV1(11, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 11 && message.ok
      )
    );
    submitFetchV1(
      12,
      "sillyos.session.2",
      "workspace.preview.1.proposal.network.durable.3",
      reopenedExecution,
    );
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.3" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );
    expect(brokerRequests).toEqual([url, url]);

    runtime.dispose();
    brokerLease.terminate();
    await workspaceAuthority.dispose();
  });

  it("returns a network_disabled tool error without actively terminating the Pi run", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const brokerRequests: string[] = [];
    const brokerLease = createTestNetworkBrokerLeaseV1({
      onRequest: (url, respond) => {
        brokerRequests.push(url);
        respond();
      },
    });
    const workspaceAuthority = testWorkspaceAuthorityV1();
    let toolError: unknown = null;
    let abortCalls = 0;
    const runtime = createBrowserPiWorkerRuntimeV1({
      postMessage: (message) => messages.push(structuredClone(message)),
      createProviderAgent: (input) => ({
        async prompt() {
          const fetchUrl = input.workspaceTools.find((tool) => tool.name === "fetch_url");
          if (fetchUrl === undefined) throw new Error("expected fetch_url tool");
          try {
            await fetchUrl.execute(
              "sillyos-fetch-url-disabled-1",
              { url: "https://example.test/disabled.txt" },
            );
          } catch (error) {
            toolError = error;
          }
          return { stopReason: "stop" };
        },
        abort() {
          abortCalls += 1;
        },
        dispose() {},
      }),
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "pi_provider",
      selection: availableSelectionV1,
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "sentinel-network-disabled-key" },
    }, [brokerLease.agentPort]);
    const execution = await attachRuntimeWorkspaceV1(
      runtime,
      messages,
      workspaceAuthority,
      2,
    );
    runtime.receive(rpcRequestV1(3, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );
    runtime.receive(rpcRequestV1(4, {
      revision: 1,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.network.disabled",
          text: "Try the product-fixed network tool while Process access is disabled.",
        }),
      },
    }, execution));
    await waitUntilV1(() =>
      toolError !== null && messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_failed"
      )
    );

    expect(toolError).toBeInstanceOf(Error);
    expect((toolError as Error).message).toBe(piNetworkDisabledErrorCodeV1);
    expect(brokerRequests).toEqual([]);
    expect(abortCalls).toBe(0);
    expect(messages).toContainEqual(expect.objectContaining({
      kind: "rpc_record",
      record: expect.objectContaining({ kind: "run_failed", code: "candidate_missing" }),
    }));

    runtime.dispose();
    brokerLease.terminate();
    await workspaceAuthority.dispose();
  });

  it("streams an enabled Process download directly into Workspace", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const brokerMessages: unknown[] = [];
    const downloadRequests: string[] = [];
    const downloadBytes = new TextEncoder().encode("SillyOS streamed download checkpoint.\n");
    const brokerLease = createTestNetworkBrokerLeaseV1({
      downloadBytes,
      onDownloadRequest: (url) => downloadRequests.push(url),
      onMessage: (message) => brokerMessages.push(message),
    });
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const runtime = createBrowserPiWorkerRuntimeCoreV1({
      expectedEndpointOrigin: null,
      providerFetch: fetch,
      loadProgramExecution: loadTestProgramExecutionV1,
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "deterministic_test",
      selection: null,
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "sentinel-download-key" },
    }, [brokerLease.agentPort]);
    const execution = await attachRuntimeWorkspaceV1(
      runtime,
      messages,
      workspaceAuthority,
      2,
    );
    const origin = "https://downloads.example.test";
    const url = `${origin}/assets/archive.zip?revision=1`;
    runtime.receive(workspaceRequestV1(3, {
      method: "replace_network_access",
      processId: execution.processId,
      workspaceSessionId: execution.workspaceSessionId,
      enabled: true,
    }));
    runtime.receive(rpcRequestV1(4, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      [3, 4].every((requestId) =>
        messages.some((message) =>
          (message.kind === "workspace_response" || message.kind === "rpc_response") &&
          message.requestId === requestId && message.ok
        )
      )
    );
    const downloadText = `${deterministicDownloadProbePrefixV1}${url}`;
    runtime.receive(rpcRequestV1(8, {
      revision: 1,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.download.enabled",
          text: downloadText,
        }),
      },
    }, execution));
    await waitUntilV1(() =>
      downloadRequests.length === 1 && messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.1" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );

    expect(downloadRequests).toEqual([url]);
    expect(workspaceAuthority.workspaceText(".sillyos/n2-download.bin"))
      .toBe(new TextDecoder().decode(downloadBytes));
    expect(messages).toContainEqual(expect.objectContaining({
      revision: 1,
      kind: "workspace_receipt",
      receipt: expect.objectContaining({
        programId: execution.programId,
        workspaceId: execution.workspaceId,
        workspaceSessionId: execution.workspaceSessionId,
        sessionId: "sillyos.session.1",
        runId: "sillyos.run.1",
        toolCallId: "sillyos-download-1",
        tool: "download",
        expectedGeneration: 1,
        baseGeneration: 1,
        resultingGeneration: 2,
        outcome: "succeeded",
        effect: "changed",
        changedPaths: [".sillyos/n2-download.bin"],
      }),
    }));
    expect(JSON.stringify(brokerMessages)).not.toContain("sentinel-download-key");
    runtime.dispose();
    brokerLease.terminate();
    await workspaceAuthority.dispose();
  });

  it("bounds a silently closed download peer and cancels both Broker and Workspace", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const brokerCancels: string[] = [];
    const downloadRequests: string[] = [];
    const brokerLease = createTestNetworkBrokerLeaseV1({
      closeDownloadSinkSilently: true,
      onDownloadRequest: (url) => downloadRequests.push(url),
      onCancel: (requestId) => brokerCancels.push(requestId),
    });
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const runtime = createBrowserPiWorkerRuntimeCoreV1({
      expectedEndpointOrigin: null,
      providerFetch: fetch,
      loadProgramExecution: loadTestProgramExecutionV1,
      postMessage: (message) => messages.push(structuredClone(message)),
      downloadOuterDeadlineMilliseconds: 20,
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "deterministic_test",
      selection: null,
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "sentinel-download-timeout-key" },
    }, [brokerLease.agentPort]);
    const execution = await attachRuntimeWorkspaceV1(
      runtime,
      messages,
      workspaceAuthority,
      2,
    );
    const origin = "https://downloads.example.test";
    const url = `${origin}/assets/silent.zip`;
    runtime.receive(workspaceRequestV1(3, {
      method: "replace_network_access",
      processId: execution.processId,
      workspaceSessionId: execution.workspaceSessionId,
      enabled: true,
    }));
    runtime.receive(rpcRequestV1(4, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      [3, 4].every((requestId) =>
        messages.some((message) =>
          (message.kind === "workspace_response" || message.kind === "rpc_response") &&
          message.requestId === requestId && message.ok
        )
      )
    );
    runtime.receive(rpcRequestV1(5, {
      revision: 1,
      method: "submit",
      params: {
        sessionId: "sillyos.session.1",
        text: serializeCreatorAgentSubmitV1({
          ...submitV1,
          proposalId: "workspace.preview.1.proposal.download.timeout",
          text: `${deterministicDownloadProbePrefixV1}${url}`,
        }),
      },
    }, execution));

    await waitUntilV1(() =>
      brokerCancels.length === 1 && messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_failed"
      )
    );
    expect(downloadRequests).toEqual([url]);
    expect(brokerCancels).toHaveLength(1);
    expect(workspaceAuthority.workspaceText(".sillyos/n2-download.bin")).toBeNull();
    expect(messages).toContainEqual(expect.objectContaining({
      revision: 1,
      kind: "workspace_receipt",
      receipt: expect.objectContaining({
        runId: "sillyos.run.1",
        toolCallId: "sillyos-download-1",
        tool: "download",
        baseGeneration: 1,
        resultingGeneration: 1,
        outcome: "cancelled",
        effect: "none",
        changedPaths: [],
        diagnosticCode: "cancelled",
      }),
    }));

    runtime.dispose();
    brokerLease.terminate();
    await workspaceAuthority.dispose();
  });

  it("blocks fetch_url while disabled and runs it directly after Program access is enabled", async () => {
    const messages: BrowserPiWorkerAnyOutboundMessageV1[] = [];
    const brokerMessages: unknown[] = [];
    const brokerRequests: string[] = [];
    const brokerLease = createTestNetworkBrokerLeaseV1({
      onMessage: (message) => brokerMessages.push(message),
      onRequest: (url, respond) => {
        brokerRequests.push(url);
        respond();
      },
    });
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const runtime = createBrowserPiWorkerRuntimeCoreV1({
      expectedEndpointOrigin: null,
      providerFetch: fetch,
      loadProgramExecution: loadTestProgramExecutionV1,
      postMessage: (message) => messages.push(structuredClone(message)),
    });
    runtime.receive({
      revision: 1,
      kind: "configure",
      requestId: 1,
      runtime: "deterministic_test",
      selection: null,
      preferredReasoningEffort: "medium",
      credential: { kind: "api_key", value: "sentinel-network-key" },
    }, [brokerLease.agentPort]);
    const execution = await attachRuntimeWorkspaceV1(
      runtime,
      messages,
      workspaceAuthority,
      2,
    );
    runtime.receive(rpcRequestV1(3, { revision: 1, method: "start" }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_response" && message.requestId === 3 && message.ok
      )
    );
    const url = "https://example.test/reference.txt?revision=1";
    const fetchText = `${deterministicFetchUrlProbePrefixV1}${url}`;
    const submitFetchV1 = (requestId: number, proposalId: string): void => {
      runtime.receive(rpcRequestV1(requestId, {
        revision: 1,
        method: "submit",
        params: {
          sessionId: "sillyos.session.1",
          text: serializeCreatorAgentSubmitV1({ ...submitV1, proposalId, text: fetchText }),
        },
      }, execution));
    };

    submitFetchV1(4, "workspace.preview.1.proposal.network.1");
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.1" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );
    expect(brokerRequests).toEqual([]);

    runtime.receive(workspaceRequestV1(5, {
      method: "replace_network_access",
      processId: execution.processId,
      workspaceSessionId: execution.workspaceSessionId,
      enabled: true,
    }));
    await waitUntilV1(() =>
      messages.some((message) =>
        message.kind === "workspace_response" && message.requestId === 5 && message.ok
      )
    );
    submitFetchV1(6, "workspace.preview.1.proposal.network.2");
    await waitUntilV1(() =>
      brokerRequests.length === 1 && messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.2" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );
    expect(brokerRequests).toEqual([url]);
    expect(JSON.stringify(brokerMessages)).not.toContain("sentinel-network-key");

    submitFetchV1(7, "workspace.preview.1.proposal.network.3");
    await waitUntilV1(() =>
      brokerRequests.length === 2 && messages.some((message) =>
        message.kind === "rpc_record" &&
        (message.record as Readonly<Record<string, unknown>>).runId === "sillyos.run.3" &&
        (message.record as Readonly<Record<string, unknown>>).kind === "run_completed"
      )
    );
    expect(brokerRequests).toEqual([url, url]);
    runtime.dispose();
    brokerLease.terminate();
    await workspaceAuthority.dispose();
  });
});

describe("SillyOS Browser Pi transport and product port", () => {
  it("runs Translation through the same credential-bearing Worker without requiring text output", async () => {
    const workspaceAuthority = testWorkspaceAuthorityV1();
    let workerFactoryCalls = 0;
    const ports = createTestProgramAgentPortsV1({
      runtime: "pi_provider",
      selection: availableSelectionV1,
      workspaceAuthority,
      openNetworkBroker: openTestNetworkBrokerV1,
      workerFactory: () => {
        workerFactoryCalls += 1;
        return new InMemoryBrowserPiWorkerV1({
          createProviderAgent: (input) => ({
            async prompt() {
              expect(input.runtimeProfile.runtimeProfile).toBe(
                translationProgramRuntimeProfileV1,
              );
              expect(input.workspaceTools.map((tool) => tool.name)).toEqual([
                "sillyos_read_program_resource",
              ]);
              await input.onCandidate({
                targets: [{
                  unitId: "translation.unit.agent-port.1",
                  target: "Welcome back, ⟦SM:0⟧.",
                }],
                ambiguities: [],
              });
              input.onTextDelta("This non-product explanation is intentionally ignored.");
              return { stopReason: "stop" as const };
            },
            abort() {},
            dispose() {},
          }),
        });
      },
    });
    await expect(ports.creator.configureCredential("translation-port-key")).resolves
      .toMatchObject({ kind: "configured" });
    expect(workerFactoryCalls).toBe(1);
    expect(ports.translation.getSnapshot().phase).toBe("ready");
    await expect(ports.translation.openWorkspace({
      processId: "process.translation.agent-port.1",
      programId: submitV1.programId,
      workspaceId: workspaceIdV1,
    })).resolves.toMatchObject({
      kind: "opened",
      descriptor: { programId: submitV1.programId, generation: 1 },
    });

    const run = translationAgentRunV1();
    await expect(ports.translation.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });
    await waitUntilV1(() => ports.translation.getSnapshot().terminalRuns.length === 1);
    expect(ports.translation.getSnapshot()).toMatchObject({
      phase: "completed",
      activeRunId: null,
      terminalRuns: [{
        run: { agentRunId: run.agentRunId },
        outcome: "completed",
        candidate: {
          targets: [{
            unitId: "translation.unit.agent-port.1",
            target: "Welcome back, ⟦SM:0⟧.",
          }],
          ambiguities: [],
        },
      }],
    });
    expect(ports.creator.getSnapshot().terminalRuns).toEqual([]);
    expect(JSON.stringify(ports.translation.getSnapshot())).not.toContain(
      "non-product explanation",
    );
    await expect(ports.translation.acknowledgeTerminal(run.agentRunId)).resolves.toEqual({
      kind: "acknowledged",
    });
    expect(ports.translation.getSnapshot()).toMatchObject({ phase: "ready", terminalRuns: [] });
    await ports.creator.dispose();
    expect(ports.creator.getSnapshot().phase).toBe("disposed");
    expect(ports.translation.getSnapshot().phase).toBe("ready");
    await expect(ports.translation.closeWorkspace()).resolves.toMatchObject({ kind: "closed" });
    expect(ports.translation.getSnapshot().workspace.phase).toBe("closed");
    await ports.host.dispose();
    expect(ports.translation.getSnapshot().phase).toBe("disposed");
  });

  it("fences Translation by the opened Process Workspace and projects shared connection loss", async () => {
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const worker = new ControllableBrowserPiWorkerV1();
    const ports = createTestProgramAgentPortsV1({
      runtime: "pi_provider",
      selection: availableSelectionV1,
      workspaceAuthority,
      openNetworkBroker: openTestNetworkBrokerV1,
      workerFactory: () => worker,
    });
    await expect(ports.translation.configureCredential("translation-port-key")).resolves
      .toMatchObject({ kind: "configured" });
    await expect(ports.translation.openWorkspace({
      processId: "process.translation.agent-port.1",
      programId: submitV1.programId,
      workspaceId: workspaceIdV1,
    })).resolves.toMatchObject({ kind: "opened" });
    await expect(ports.translation.submit(translationAgentRunV1({
      agentRunId: "agent.run.translation.stale-workspace",
      workspaceGeneration: 2,
    }))).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "request_failed", path: "/workspace/submit" },
    });

    const run = translationAgentRunV1({ agentRunId: "agent.run.translation.connection-loss" });
    await expect(ports.translation.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });
    worker.emitWorkerError();
    await waitUntilV1(() => ports.translation.getSnapshot().phase === "failed");
    expect(ports.translation.getSnapshot()).toMatchObject({
      phase: "failed",
      activeRunId: null,
      terminalRuns: [],
      diagnostic: { code: "connection_failed", path: "/connection" },
    });
    expect(ports.creator.getSnapshot()).toMatchObject({
      phase: "failed",
      terminalRuns: [],
      diagnostic: { code: "connection_failed" },
    });
    await ports.host.dispose();
  });

  it("detaches one active Program facade without retiring the shared Agent owner", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    const host = createBrowserProgramAgentHostV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      openNetworkBroker: openTestNetworkBrokerV1,
      workerFactory: () => worker,
    });
    const firstCreator = createCreatorProgramAgentPortV1(host);
    const translation = createTranslationProgramAgentPortV1(host);
    await expect(firstCreator.configureCredential("sentinel-browser-key")).resolves.toMatchObject({
      kind: "configured",
    });
    await openProductWorkspaceV1(firstCreator);
    await expect(firstCreator.submit(productRunV1())).resolves.toMatchObject({
      kind: "submitted",
    });

    const detachedNotifications = vi.fn();
    firstCreator.subscribe(detachedNotifications);
    await firstCreator.dispose();
    const notificationsAfterDetach = detachedNotifications.mock.calls.length;
    expect(worker.cancelRequests).toBe(1);
    expect(worker.terminated).toBe(false);
    expect(firstCreator.getSnapshot()).toMatchObject({
      phase: "disposed",
      activeRunId: null,
      terminalRuns: [],
      workspace: { phase: "disposed", descriptor: null },
    });
    expect(translation.getSnapshot().phase).toBe("ready");
    await expect(firstCreator.testConnection()).resolves.toMatchObject({
      kind: "unavailable",
      diagnostic: { code: "disposed" },
    });

    const successorCreator = createCreatorProgramAgentPortV1(host);
    const successorRun = productRunV1({ agentRunId: "agent.run.product.successor" });
    await expect(successorCreator.submit(successorRun)).resolves.toEqual({
      kind: "submitted",
      agentRunId: successorRun.agentRunId,
    });
    expect(successorCreator.getSnapshot()).toMatchObject({
      phase: "running",
      activeRunId: successorRun.agentRunId,
    });
    expect(detachedNotifications).toHaveBeenCalledTimes(notificationsAfterDetach);

    await translation.forget();
    expect(translation.getSnapshot().phase).toBe("forgotten");
    expect(successorCreator.getSnapshot().phase).toBe("running");
    expect(worker.terminated).toBe(false);
    await host.dispose();
    expect(successorCreator.getSnapshot().phase).toBe("disposed");
    expect(worker.terminated).toBe(true);
  });

  it("keeps an unconfigured shared Agent owner uninitialized when a Program facade detaches", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    const host = createBrowserProgramAgentHostV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      openNetworkBroker: openTestNetworkBrokerV1,
      workerFactory: () => worker,
    });
    const control = host.createControlPort();
    const creator = createCreatorProgramAgentPortV1(host);
    expect(control.getSnapshot().phase).toBe("uninitialized");
    expect(creator.getSnapshot().phase).toBe("uninitialized");

    await creator.dispose();

    expect(control.getSnapshot().phase).toBe("uninitialized");
    expect(worker.terminated).toBe(false);
    await host.dispose();
    expect(control.getSnapshot().phase).toBe("disposed");
  });

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

    await testProgramAgentHostV1(port).forget();
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
    const forgetting = testProgramAgentHostV1(port).forget().then(() => {
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

  it("keeps a closed workspace retryable when another tab owns the volume", async () => {
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
      port.openWorkspace({
        processId: productRunV1().processId,
        programId: submitV1.programId,
        workspaceId: workspaceIdV1,
      }),
    ).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "workspace_busy", path: "/workspace/open" },
    });
    expect(port.getSnapshot().workspace).toMatchObject({
      phase: "closed",
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
        loadProcessNetworkAccess: (processId) =>
          Promise.resolve(createDefaultProcessNetworkAccessV1(processId)),
        setProcessNetworkAccess: repositoryUnavailable,
        withAgentSubmitAdmission: (input) =>
          input.operation(createDefaultProcessNetworkAccessV1(input.processId)),
        createProcessWorkspace: repositoryUnavailable,
        inspectProcessWorkspace: () => Promise.resolve(null),
        probeProcessWorkspace: () => Promise.resolve(true),
        importProcessWorkspaceFile: repositoryUnavailable,
        openProcessWorkspace: () =>
          Promise.reject(
            new BrowserWorkspaceHostControlErrorV1(hostCode, `synthetic ${hostCode}`),
          ),
        queryWorkspace: () => Promise.reject(new Error("not open")),
        exportWorkspace: () => Promise.reject(new Error("not open")),
        detachWorkspaceEnvironment: () => Promise.resolve(),
        closeWorkspace: () => Promise.reject(new Error("not open")),
        closeActiveWorkspace: () => Promise.resolve(null),
        inspectStorage: () =>
          Promise.resolve({
            revision: 1,
            scope: "sandbox_origin_advisory",
            persisted: false,
          }),
        resetStoredData: () =>
          Promise.resolve({
            programDataRepository: { kind: "cleared" },
            workspaceVolumes: { kind: "cleared" },
          }),
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
        port.openWorkspace({
          processId: productRunV1().processId,
          programId: submitV1.programId,
          workspaceId: workspaceIdV1,
        }),
      ).resolves.toEqual({
        kind: "unavailable",
        diagnostic: { code: productCode, path: "/workspace/open" },
      });
      expect(port.getSnapshot().workspace).toMatchObject(
        productCode === "workspace_busy"
          ? {
            phase: "closed",
            descriptor: null,
            diagnostic: { code: productCode, path: "/workspace/open" },
          }
          : {
            phase: "failed",
            descriptor: null,
            diagnostic: { code: productCode, path: "/workspace/open" },
          },
      );
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
      port.openWorkspace({
        processId: productRunV1().processId,
        programId: submitV1.programId,
        workspaceId: workspaceIdV1,
      }),
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
      effectiveReasoningEffort: "off",
    });
    expect(workerFactoryCalls).toBe(1);
    expect(worker.testConnectionRequests).toBe(0);
    await expect(
      port.openWorkspace({
        processId: productRunV1().processId,
        programId: submitV1.programId,
        workspaceId: workspaceIdV1,
      }),
    ).resolves.toMatchObject({ kind: "opened" });
    await expect(port.submit(productRunV1())).resolves.toMatchObject({ kind: "submitted" });
    expect(worker.testConnectionRequests).toBe(0);
    await port.dispose();
  });

  it("synchronizes the admitted Process network setting before submitting", async () => {
    const workspaceAuthority = new TestBrowserProgramWorkspaceAuthorityV1();
    await expect(workspaceAuthority.setProcessNetworkAccess({
      processId: productRunV1().processId,
      enabled: true,
    })).resolves.toMatchObject({ kind: "committed" });
    const worker = new ControllableBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority,
      workerFactory: () => worker,
    });
    await expect(port.configureCredential("sentinel-browser-key")).resolves.toEqual({
      kind: "configured",
      effectiveReasoningEffort: "off",
    });
    await expect(
      port.openWorkspace({
        processId: productRunV1().processId,
        programId: submitV1.programId,
        workspaceId: workspaceIdV1,
      }),
    ).resolves.toMatchObject({ kind: "opened" });

    await expect(port.synchronizeNetworkAccess(
      createDefaultProcessNetworkAccessV1("process.other"),
    )).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "request_failed", path: "/networkAccess/scope" },
    });
    expect(worker.networkAccessReplacements).toEqual([]);

    await expect(port.submit(productRunV1({ workspaceCheckpointId: "/invalid" }))).resolves
      .toEqual({
        kind: "unavailable",
        diagnostic: { code: "submit_invalid", path: "/run" },
      });
    await expect(port.submit(productRunV1({ workspaceGeneration: 0 }))).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "submit_invalid", path: "/run" },
    });
    await expect(port.submit(productRunV1({
      programPackage: {
        ...programPackageV1(submitV1.programId),
        contentDigest: "invalid",
      },
    }))).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "submit_invalid", path: "/run" },
    });

    const uncappedAgentRunId = `agent.run.${"a".repeat(256)}`;
    const run = productRunV1({
      agentRunId: uncappedAgentRunId,
      workspaceCheckpointId: "checkpoint.durable.before-submit",
      workspaceGeneration: 7,
    });
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: uncappedAgentRunId,
    });
    expect(worker.networkAccessReplacements).toEqual([{
      processId: productRunV1().processId,
      workspaceSessionId: workspaceSessionIdV1,
      enabled: true,
    }]);
    expect(worker.requestOrder).toEqual(["replace_network_access", "submit"]);
    expect(workspaceAuthority.agentSubmitAdmissionCalls).toBe(1);
    expect(workspaceAuthority.lastAgentSubmitAdmission).toEqual({
      agentRunId: run.agentRunId,
      processAttemptGeneration: run.processAttemptGeneration,
      processId: run.processId,
      programId: run.programId,
      programPackage: run.programPackage,
      workspaceSessionId: workspaceSessionIdV1,
      expectedCheckpointId: run.workspaceCheckpointId,
      expectedGeneration: run.workspaceGeneration,
    });
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

    await waitUntilV1(() => onConnectionLost.mock.calls.length === 1);
    expect(onConnectionLost).toHaveBeenCalledOnce();
    expect(port.getSnapshot()).toMatchObject({
      phase: "failed",
      diagnostic: { code: "connection_failed", path: "/connection" },
    });
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
      await testProgramAgentHostV1(port)[operation]();
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
      effectiveReasoningEffort: "off",
    });
    await expect(port.selectReasoningEffort("max")).resolves.toEqual({
      kind: "selected",
      preferredReasoningEffort: "max",
      effectiveReasoningEffort: "off",
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
      effectiveReasoningEffort: "off",
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
    await testProgramAgentHostV1(builtinPort).dispose();

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
    await testProgramAgentHostV1(customPort).dispose();
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

  it("hands one recovered key directly from Vault to the endpoint-specific Worker", async () => {
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const workers: InMemoryBrowserPiWorkerV1[] = [];
    const connector = createBrowserPiWorkerConnectorV1({
      runtime: "pi_provider",
      selection: availableSelectionV1,
      workspaceAuthority,
      openNetworkBroker: openTestNetworkBrokerV1,
      createCredentialHandoffId: () => "credential.handoff.transport.1",
      workerFactory: () => {
        const worker = new InMemoryBrowserPiWorkerV1();
        workers.push(worker);
        return worker;
      },
    });
    const binding: CredentialVaultBindingV2 = {
      bindingId: "builtin:openai",
      credentialKind: "api_key",
      baseUrl: "https://api.openai.com/v1",
    };
    const calls: unknown[] = [];
    await expect(connector.configureCredentialHandoff({
      binding,
      async handoff(receivedBinding, handoffId, deliveryPort) {
        calls.push({ binding: structuredClone(receivedBinding), handoffId });
        const ready = await new Promise<unknown>((resolve) => {
          deliveryPort.addEventListener("message", (event) => resolve(event.data), { once: true });
          deliveryPort.start();
        });
        expect(ready).toEqual({
          revision: 2,
          kind: "credential_vault_handoff_ready",
          handoffId,
          binding,
        });
        const recovered = createCredentialVaultHandoffDeliveryV2(
          handoffId,
          receivedBinding,
          "vault-recovered-secret",
        );
        // MessagePort.postMessage has no targetOrigin parameter.
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- MessagePort has no targetOrigin
        deliveryPort.postMessage(recovered);
      },
    })).resolves.toEqual({ kind: "configured", effectiveReasoningEffort: "off" });
    expect(calls).toEqual([{
      binding,
      handoffId: "credential.handoff.transport.1",
    }]);
    expect(workers).toHaveLength(1);
    expect(JSON.stringify(workers[0]?.posted))
      .not.toContain("vault-recovered-secret");
    expect(JSON.stringify(workers[0]?.posted))
      .not.toContain("credential_vault_handoff_delivery");

    await expect(connector.configureCredentialHandoff({
      binding: { ...binding, baseUrl: "https://api.openai.com/v2" },
      handoff: async () => undefined,
    })).resolves.toEqual({ kind: "unavailable", reason: "failed" });
    await connector.forget();
    await workspaceAuthority.dispose();
  });

  it("terminates a pending Vault handoff without waiting for the Vault callback", async () => {
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const workers: InMemoryBrowserPiWorkerV1[] = [];
    let callbackStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      callbackStarted = resolve;
    });
    const connector = createBrowserPiWorkerConnectorV1({
      runtime: "pi_provider",
      selection: availableSelectionV1,
      workspaceAuthority,
      openNetworkBroker: openTestNetworkBrokerV1,
      createCredentialHandoffId: () => "credential.handoff.transport.pending",
      workerFactory: () => {
        const worker = new InMemoryBrowserPiWorkerV1();
        workers.push(worker);
        return worker;
      },
    });
    const configuring = connector.configureCredentialHandoff({
      binding: {
        bindingId: "builtin:openai",
        credentialKind: "api_key",
        baseUrl: "https://api.openai.com/v1",
      },
      handoff: async () => {
        callbackStarted();
        await new Promise<never>(() => undefined);
      },
    });
    await started;
    await connector.forget();
    await expect(configuring).resolves.toEqual({ kind: "unavailable", reason: "failed" });
    expect(workers).toHaveLength(1);
    expect(workers[0]?.terminated).toBe(true);
    await workspaceAuthority.dispose();
  });

  it("configures once, starts before an optional test, settles submit first, and terminates", async () => {
    let worker: InMemoryBrowserPiWorkerV1 | null = null;
    const connector = createBrowserPiWorkerConnectorV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      openNetworkBroker: openTestNetworkBrokerV1,
      workerFactory: () => {
        worker = new InMemoryBrowserPiWorkerV1();
        return worker as BrowserPiWorkerLikeV1;
      },
    });
    const client = createAgentSessionClientV1({ connector });
    const settlement: boolean[] = [];
    const events: AgentSessionStreamEventV1[] = [];
    let submitSettled = false;
    client.subscribeStream((event) => {
      settlement.push(submitSettled);
      events.push(event);
    });

    expect(worker).toBeNull();
    await expect(connector.configureCredential("sentinel-browser-key")).resolves.toEqual({
      kind: "configured",
      effectiveReasoningEffort: "off",
    });
    expect(worker).not.toBeNull();
    await expect(client.connect()).resolves.toEqual({ kind: "ready" });
    await expect(client.start()).resolves.toEqual({
      kind: "started",
      sessionId: "sillyos.session.1",
    });
    await expect(connector.testConnection()).resolves.toEqual({ kind: "ready" });
    await expect(
      connector.openWorkspace({
        processId: productRunV1().processId,
        workspaceId: workspaceIdV1,
      }),
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
    await waitUntilV1(() => events.some((event) => event.kind === "run_completed"));
    expect(settlement.every(Boolean)).toBe(true);
    expect(events.map((event) => event.kind)).toEqual([
      "output_text_delta",
      "output_data",
      "run_completed",
    ]);
    const data = events.find((event) => event.kind === "output_data");
    expect(data?.value).toEqual({ ...submitV1, requirement: submitV1.text });
    expect(worker).not.toBeNull();
    const posted = (worker as unknown as InMemoryBrowserPiWorkerV1).posted;
    expect(posted.filter((message) => JSON.stringify(message).includes("sentinel-browser-key")))
      .toHaveLength(1);
    expect((posted[0] as Readonly<Record<string, unknown>>).kind).toBe("configure");
    expect((posted[0] as Readonly<Record<string, unknown>>).selection).toBeNull();

    await client.dispose();
    expect((worker as unknown as InMemoryBrowserPiWorkerV1).terminated).toBe(true);
    await connector.forget();
  });

  it("sends a model-only selection envelope and keeps the credential inside the configured Worker", async () => {
    let worker: InMemoryBrowserPiWorkerV1 | null = null;
    const connector = createBrowserPiWorkerConnectorV1({
      runtime: "pi_provider",
      selection: copilotAnthropicSelectionV1,
      workspaceAuthority: testWorkspaceAuthorityV1(),
      openNetworkBroker: openTestNetworkBrokerV1,
      workerFactory: () => {
        worker = new InMemoryBrowserPiWorkerV1();
        return worker as BrowserPiWorkerLikeV1;
      },
    });
    await expect(connector.configureCredential("transport-selection-key")).resolves.toEqual({
      kind: "configured",
      effectiveReasoningEffort: resolveBrowserPiReasoningEffortV1(
        copilotAnthropicSelectionV1,
        "medium",
      ),
    });
    await expect(connector.setReasoningEffort("max")).resolves.toEqual({
      kind: "selected",
      preferredReasoningEffort: "max",
      effectiveReasoningEffort: resolveBrowserPiReasoningEffortV1(
        copilotAnthropicSelectionV1,
        "max",
      ),
    });
    await expect(connector.selectModel(copilotCompletionsSelectionV1)).resolves.toEqual({
      kind: "selected",
      selection: copilotCompletionsSelectionV1,
      effectiveReasoningEffort: resolveBrowserPiReasoningEffortV1(
        copilotCompletionsSelectionV1,
        "max",
      ),
    });
    expect(worker).not.toBeNull();
    const posted = (worker as unknown as InMemoryBrowserPiWorkerV1).posted;
    expect(posted).toHaveLength(3);
    expect(posted[1]).toEqual({
      revision: 1,
      kind: "set_reasoning_effort",
      requestId: 2,
      preferredReasoningEffort: "max",
    });
    expect(posted[2]).toEqual({
      revision: 1,
      kind: "select_model",
      requestId: 3,
      selection: copilotCompletionsSelectionV1,
    });
    expect(posted.filter((message) => JSON.stringify(message).includes("transport-selection-key")))
      .toHaveLength(1);
    await connector.forget();
  });

  it("fences Pi and rejects pending work when the Workspace Host becomes fatal", async () => {
    const workspaceAuthority = new TestBrowserProgramWorkspaceAuthorityV1();
    const worker = new ControllableBrowserPiWorkerV1();
    const connector = createBrowserPiWorkerConnectorV1({
      runtime: "deterministic_test",
      workspaceAuthority,
      openNetworkBroker: openTestNetworkBrokerV1,
      workerFactory: () => worker,
    });
    const failures: unknown[] = [];
    connector.subscribeWorkspaceFailures(() => {
      throw new Error("Workspace failure observation must remain observational");
    });
    connector.subscribeWorkspaceFailures((failure) => failures.push(failure));
    const client = createAgentSessionClientV1({ connector });

    await expect(connector.configureCredential("sentinel-browser-key")).resolves.toEqual({
      kind: "configured",
      effectiveReasoningEffort: "off",
    });
    await expect(connector.testConnection()).resolves.toEqual({ kind: "ready" });
    await expect(client.connect()).resolves.toEqual({ kind: "ready" });
    await expect(client.start()).resolves.toEqual({
      kind: "started",
      sessionId: "controlled.session.1",
    });
    await expect(
      connector.openWorkspace({
        processId: productRunV1().processId,
        workspaceId: workspaceIdV1,
      }),
    ).resolves.toMatchObject({ phase: "open", generation: 1 });
    worker.dropSubmitResponses = true;
    const submitted = client.submit({
      sessionId: "controlled.session.1",
      text: serializeCreatorAgentSubmitV1(submitV1),
    });
    await waitUntilV1(() => worker.latestExecution !== null);

    workspaceAuthority.failHost({ code: "outcome_unknown" });

    await expect(submitted).resolves.toEqual({ kind: "superseded" });
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
    await connector.forget();
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
    await expect(port.acknowledgeTerminal(run.agentRunId)).resolves.toEqual({
      kind: "acknowledged",
    });
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
      receipts: [],
      lastReceipt: {
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
    });
    expect(`${workspaceRootV1}/${workspace.lastReceipt?.changedPaths[0]}`).toBe(
      roundTripArtifactPathV1,
    );
    const serializedWorkspace = JSON.stringify(workspace);
    expect(serializedWorkspace).not.toContain("sillyos.session.1");
    expect(serializedWorkspace).not.toContain("sillyos.run.1");
    expect(serializedWorkspace).not.toContain('"sessionId"');
    expect(serializedWorkspace).not.toContain('"runId"');
    expect(port.getSnapshot().workspace.receipts).toEqual([]);

    await expect(port.acknowledgeTerminal(run.agentRunId)).resolves.toEqual({
      kind: "acknowledged",
    });
    expect(port.getSnapshot()).toMatchObject({ phase: "ready", terminalRuns: [] });
    await expect(port.acknowledgeTerminal(run.agentRunId)).resolves.toEqual({ kind: "idle" });
    await testProgramAgentHostV1(port).forget();
    expect(port.getSnapshot()).toMatchObject({
      phase: "forgotten",
      activeRunId: null,
      draft: "",
      candidate: null,
    });
    expect((worker as unknown as InMemoryBrowserPiWorkerV1).terminated).toBe(true);
  });

  it("releases more than 32 sequential Workspace mutations without a semantic receipt ceiling", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => worker,
    });
    await configureAndTestProductPortV1(port);
    await openProductWorkspaceV1(port);
    const run = productRunV1({ agentRunId: "agent.run.long-workspace" });
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });

    for (let ordinal = 1; ordinal <= 40; ordinal += 1) {
      worker.emitWorkspaceMutation(undefined, `.sillyos/long-run-${String(ordinal)}.txt`);
      await waitUntilV1(() => worker.workspaceReceiptAcknowledgements.at(-1) === ordinal);
    }
    await waitUntilV1(() => port.getSnapshot().workspace.receipts.length === 0);

    expect(worker.workspaceReceiptAcknowledgements).toHaveLength(40);
    expect(worker.workspaceReceiptAcknowledgements.at(-1)).toBe(40);
    expect(port.getSnapshot().workspace).toMatchObject({
      phase: "open",
      descriptor: { generation: 41 },
      receipts: [],
      lastReceipt: {
        sequence: 40,
        agentRunId: run.agentRunId,
        resultingGeneration: 41,
        changedPaths: [".sillyos/long-run-40.txt"],
      },
      diagnostic: null,
    });

    worker.emitCompleted(run, "Long Workspace run completed.");
    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 1);
    await expect(port.acknowledgeTerminal(run.agentRunId)).resolves.toEqual({
      kind: "acknowledged",
    });
    await port.dispose();
  });

  it("coalesces same-turn Workspace receipts through the last observed watermark", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => worker,
    });
    await configureAndTestProductPortV1(port);
    await openProductWorkspaceV1(port);
    const run = productRunV1({ agentRunId: "agent.run.coalesced-workspace" });
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });

    for (let ordinal = 1; ordinal <= 40; ordinal += 1) {
      worker.emitWorkspaceMutation(
        undefined,
        `.sillyos/coalesced-${String(ordinal)}.txt`,
      );
    }
    worker.emitCompleted(run, "Coalesced Workspace run completed.");
    await waitUntilV1(() => worker.workspaceReceiptAcknowledgements.length === 1);
    await waitUntilV1(() => port.getSnapshot().workspace.receipts.length === 0);
    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 1);

    expect(worker.workspaceReceiptAcknowledgements).toEqual([40]);
    expect(port.getSnapshot().workspace).toMatchObject({
      descriptor: { generation: 41 },
      receipts: [],
      lastReceipt: { sequence: 40, changedPaths: [".sillyos/coalesced-40.txt"] },
    });
    expect(port.getSnapshot().terminalRuns).toMatchObject([{
      run: { agentRunId: run.agentRunId },
      outcome: "completed",
    }]);
    await expect(port.acknowledgeTerminal(run.agentRunId)).resolves.toEqual({
      kind: "acknowledged",
    });
    await port.dispose();
  });

  it("holds terminal release behind the exact coalesced Workspace watermark", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    worker.deferReceiptAcknowledgementResponses = true;
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => worker,
    });
    await configureAndTestProductPortV1(port);
    await openProductWorkspaceV1(port);
    const run = productRunV1({ agentRunId: "agent.run.ack-race" });
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });

    worker.emitWorkspaceMutation(undefined, ".sillyos/ack-race-1.txt");
    await waitUntilV1(() => worker.workspaceReceiptAcknowledgements.length === 1);
    worker.emitWorkspaceMutation(undefined, ".sillyos/ack-race-2.txt");
    worker.emitCompleted(run, "Workspace acknowledgement race completed.");
    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 1);

    let terminalSettled = false;
    const terminalSettlement = port.acknowledgeTerminal(run.agentRunId).then((result) => {
      terminalSettled = true;
      return result;
    });
    await Promise.resolve();
    expect(terminalSettled).toBe(false);
    expect(port.getSnapshot().terminalRuns).toHaveLength(1);

    worker.releaseReceiptAcknowledgementResponses();
    await waitUntilV1(() => worker.workspaceReceiptAcknowledgements.length === 2);
    expect(worker.workspaceReceiptAcknowledgements).toEqual([1, 2]);
    expect(terminalSettled).toBe(false);
    worker.releaseReceiptAcknowledgementResponses();

    await expect(terminalSettlement).resolves.toEqual({ kind: "acknowledged" });
    expect(port.getSnapshot().terminalRuns).toEqual([]);
    expect(port.getSnapshot().workspace).toMatchObject({
      descriptor: { generation: 3 },
      receipts: [],
      lastReceipt: { sequence: 2, changedPaths: [".sillyos/ack-race-2.txt"] },
    });
    await port.dispose();
  });

  it.each(["close", "dispose"] as const)(
    "waits for an in-flight Workspace receipt acknowledgement before %s",
    async (operation) => {
      const worker = new ControllableBrowserPiWorkerV1();
      worker.deferReceiptAcknowledgementResponses = true;
      const workspaceAuthority = new TestBrowserProgramWorkspaceAuthorityV1();
      const port = createBrowserCreatorAgentPortV1({
        runtime: "deterministic_test",
        workspaceAuthority,
        workerFactory: () => worker,
      });
      await configureAndTestProductPortV1(port);
      await openProductWorkspaceV1(port);
      const workspaceSessionId = port.getSnapshot().workspace.descriptor?.workspaceSessionId;
      if (workspaceSessionId === undefined) throw new Error("expected an open Workspace");
      const run = productRunV1({ agentRunId: `agent.run.${operation}-ack` });
      await expect(port.submit(run)).resolves.toEqual({
        kind: "submitted",
        agentRunId: run.agentRunId,
      });
      worker.emitWorkspaceMutation(undefined, `.sillyos/${operation}-ack.txt`);
      workspaceAuthority.reflectControlledWorkerGeneration(2);
      await waitUntilV1(() => worker.workspaceReceiptAcknowledgements.length === 1);
      worker.emitRunFailure("cancelled");
      await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 1);

      let settled = false;
      const settlement = operation === "close"
        ? port.closeWorkspace(workspaceSessionId).then((result) => {
          settled = true;
          return result;
        })
        : testProgramAgentHostV1(port).dispose().then(() => {
          settled = true;
          return null;
        });
      await Promise.resolve();
      expect(settled).toBe(false);

      worker.releaseReceiptAcknowledgementResponses();
      if (operation === "close") {
        const closeResult = await settlement;
        if (closeResult?.kind !== "closed") {
          throw new Error(`unexpected close result: ${JSON.stringify(closeResult)}`);
        }
        await testProgramAgentHostV1(port).dispose();
      } else {
        await expect(settlement).resolves.toBeNull();
      }
      expect(worker.terminated).toBe(true);
    },
  );

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

    await expect(port.acknowledgeTerminal(firstRun.agentRunId)).resolves.toEqual({
      kind: "acknowledged",
    });
    expect(port.getSnapshot().terminalRuns.map(({ run }) => run.agentRunId)).toEqual([
      latestRun.agentRunId,
    ]);
    await expect(port.acknowledgeTerminal(latestRun.agentRunId)).resolves.toEqual({
      kind: "acknowledged",
    });
    expect(port.getSnapshot().terminalRuns).toEqual([]);
    await port.dispose();
  });

  it("fails a product run on a fatal gap in the ordered Browser connector", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    let connectionLosses = 0;
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => worker,
      onConnectionLost: () => {
        connectionLosses += 1;
      },
    });
    await configureAndTestProductPortV1(port);
    await openProductWorkspaceV1(port);
    const run = productRunV1({ agentRunId: "agent.run.session-gap" });
    await expect(port.submit(run)).resolves.toEqual({
      kind: "submitted",
      agentRunId: run.agentRunId,
    });

    worker.emitTextDeltas(1, 1);
    worker.emitTextDeltas(1, 3);
    worker.emitRunFailure("pi_failed", undefined, 4);

    await waitUntilV1(() => port.getSnapshot().terminalRuns.length === 1);
    expect(port.getSnapshot()).toMatchObject({
      phase: "failed",
      activeRunId: null,
      diagnostic: { code: "protocol_invalid", path: "/sequence" },
      terminalRuns: [{
        run,
        outcome: "failed",
        diagnosticCode: "protocol_invalid",
      }],
    });
    expect(worker.terminated).toBe(true);
    expect(connectionLosses).toBe(1);
    await expect(port.acknowledgeTerminal(run.agentRunId)).resolves.toEqual({
      kind: "acknowledged",
    });

    const retry = productRunV1({ agentRunId: "agent.run.after-session-gap" });
    await expect(port.submit(retry)).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "protocol_invalid", path: "/sequence" },
    });
    worker.emitRunFailure("pi_failed", undefined, 2);
    expect(port.getSnapshot()).toMatchObject({
      phase: "failed",
      activeRunId: null,
      terminalRuns: [],
    });
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
    await expect(port.acknowledgeTerminal(run.agentRunId)).resolves.toEqual({
      kind: "acknowledged",
    });
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
    await expect(port.acknowledgeTerminal(run.agentRunId)).resolves.toEqual({
      kind: "acknowledged",
    });
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
    await expect(port.acknowledgeTerminal(run.agentRunId)).resolves.toEqual({
      kind: "acknowledged",
    });
    await expect(port.acknowledgeTerminal(run.agentRunId)).resolves.toEqual({ kind: "idle" });
    worker.emitTextDeltas(2_049, 2, piRunId);
    expect(port.getSnapshot()).toMatchObject({ phase: "ready", terminalRuns: [] });
    await port.dispose();
  });

  it("synchronizes Process network access only for the open Workspace scope", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority: testWorkspaceAuthorityV1(),
      workerFactory: () => worker,
    });
    await openProductWorkspaceV1(port);

    await expect(port.synchronizeNetworkAccess(
      createDefaultProcessNetworkAccessV1("process.other"),
    )).resolves.toEqual({
      kind: "unavailable",
      diagnostic: { code: "request_failed", path: "/networkAccess/scope" },
    });
    expect(worker.networkAccessReplacements).toEqual([]);

    await expect(port.synchronizeNetworkAccess({
      revision: 1,
      processId: productRunV1().processId,
      enabled: true,
    })).resolves.toEqual({ kind: "synchronized" });
    expect(worker.networkAccessReplacements).toEqual([{
      processId: productRunV1().processId,
      workspaceSessionId: workspaceSessionIdV1,
      enabled: true,
    }]);
    await port.dispose();
  });

  it("revokes the credential owner before a stuck Workspace close can block cleanup", async () => {
    const worker = new ControllableBrowserPiWorkerV1();
    const workspaceAuthority = testWorkspaceAuthorityV1();
    const port = createBrowserCreatorAgentPortV1({
      runtime: "deterministic_test",
      workspaceAuthority,
      workerFactory: () => worker,
    });
    await openProductWorkspaceV1(port);
    worker.dropCloseWorkspaceResponses = true;
    workspaceAuthority.holdDetachWorkspaceEnvironment = true;

    port.revokeCredential();

    expect(worker.terminated).toBe(true);
    await expect(port.forget()).resolves.toBeUndefined();
    expect(workspaceAuthority.detachWorkspaceEnvironmentCalls).toEqual([workspaceSessionIdV1]);
    expect(port.getSnapshot()).toMatchObject({
      phase: "forgotten",
      workspace: { phase: "forgotten", descriptor: null },
    });
  });
});

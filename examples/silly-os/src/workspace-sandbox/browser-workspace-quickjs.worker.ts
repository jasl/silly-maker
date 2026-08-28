// SPDX-License-Identifier: MIT
/// <reference lib="webworker" />

import quickJsVariant from "@jitl/quickjs-singlefile-browser-release-sync";
import {
  DefaultIntrinsics,
  newQuickJSWASMModuleFromVariant,
  newVariant,
} from "quickjs-emscripten-core";

import { browserWorkspaceSandboxArtifactBuildIdentityV1 } from "../workspace/browser-workspace-sandbox-build-identity.ts";
import {
  admitBrowserWorkspaceQuickJsRequestV1,
  admitBrowserWorkspaceQuickJsSnapshotV1,
  browserWorkspaceQuickJsDeadlineMillisecondsV1,
  browserWorkspaceQuickJsGuestBootstrapV1,
  browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1,
  browserWorkspaceQuickJsStackLimitBytesV1,
  browserWorkspaceQuickJsWasmLinearMemoryBytesV1,
  BrowserWorkspaceQuickJsFailureV1,
  createBrowserWorkspaceQuickJsGuestDiagnosticV1,
  exactBrowserWorkspaceQuickJsDiffV1,
  type BrowserWorkspaceQuickJsFailureCodeV1,
  type BrowserWorkspaceQuickJsFailureResponseV1,
  type BrowserWorkspaceQuickJsRequestV1,
  type BrowserWorkspaceQuickJsResponseV1,
  type BrowserWorkspaceQuickJsSuccessResponseV1,
} from "../workspace/browser-workspace-quickjs-protocol.ts";

function executionFailureCodeV1(
  errorValue: unknown,
  deadlineTriggered: boolean,
): Exclude<BrowserWorkspaceQuickJsFailureCodeV1, "invalid_request"> {
  if (deadlineTriggered) return "deadline_exceeded";
  const message = typeof errorValue === "object" && errorValue !== null &&
      "message" in errorValue && typeof errorValue.message === "string"
    ? errorValue.message
    : "";
  return /out of memory|memory limit/iu.test(message) ? "memory_limit" : "execution_failed";
}

export async function executeBrowserWorkspaceQuickJsV1(
  request: BrowserWorkspaceQuickJsRequestV1,
): Promise<BrowserWorkspaceQuickJsSuccessResponseV1> {
  const fixedWasmMemory = new WebAssembly.Memory({ initial: 256, maximum: 256 });
  if (fixedWasmMemory.buffer.byteLength !== browserWorkspaceQuickJsWasmLinearMemoryBytesV1) {
    throw new BrowserWorkspaceQuickJsFailureV1(
      "memory_limit",
      "QuickJS fixed Wasm memory was unavailable",
    );
  }
  const fixedVariant = newVariant(quickJsVariant, { wasmMemory: fixedWasmMemory });
  const moduleStarted = performance.now();
  const quickJs = await newQuickJSWASMModuleFromVariant(fixedVariant);
  const moduleStartupMilliseconds = performance.now() - moduleStarted;
  const executionStarted = performance.now();
  const deadline = executionStarted + browserWorkspaceQuickJsDeadlineMillisecondsV1;
  let deadlineTriggered = false;
  try {
    const runtime = quickJs.newRuntime({
      memoryLimitBytes: browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1,
      maxStackSizeBytes: browserWorkspaceQuickJsStackLimitBytesV1,
      interruptHandler: () => {
        deadlineTriggered = performance.now() >= deadline;
        return deadlineTriggered;
      },
    });
    const context = runtime.newContext({ intrinsics: DefaultIntrinsics });
    try {
      const bootstrapResult = context.evalCode(
        browserWorkspaceQuickJsGuestBootstrapV1(request),
        "sillyos:qjs-bootstrap",
        { type: "global", strict: true },
      );
      if (bootstrapResult.error !== undefined) {
        const error = context.dump(bootstrapResult.error);
        bootstrapResult.error.dispose();
        throw new BrowserWorkspaceQuickJsFailureV1(
          executionFailureCodeV1(error, deadlineTriggered),
          "QuickJS bootstrap failed",
        );
      }
      bootstrapResult.value.dispose();

      const sourceResult = context.evalCode(request.source, "workspace-script.js", {
        type: "global",
        strict: true,
      });
      if (sourceResult.error !== undefined) {
        const error = context.dump(sourceResult.error);
        sourceResult.error.dispose();
        const code = executionFailureCodeV1(error, deadlineTriggered);
        throw new BrowserWorkspaceQuickJsFailureV1(
          code,
          "QuickJS source failed",
          code === "execution_failed"
            ? createBrowserWorkspaceQuickJsGuestDiagnosticV1(error)
            : null,
        );
      }
      sourceResult.value.dispose();
      if (runtime.hasPendingJob()) {
        throw new BrowserWorkspaceQuickJsFailureV1(
          "async_unsupported",
          "QuickJS supports synchronous scripts only",
        );
      }

      const snapshotResult = context.evalCode(
        "globalThis.__sillyosQuickJsSnapshotV1()",
        "sillyos:qjs-snapshot",
        { type: "global", strict: true },
      );
      if (snapshotResult.error !== undefined) {
        const error = context.dump(snapshotResult.error);
        snapshotResult.error.dispose();
        throw new BrowserWorkspaceQuickJsFailureV1(
          executionFailureCodeV1(error, deadlineTriggered),
          "QuickJS snapshot failed",
        );
      }
      const rawSnapshot = context.dump(snapshotResult.value);
      snapshotResult.value.dispose();
      if (runtime.hasPendingJob()) {
        throw new BrowserWorkspaceQuickJsFailureV1(
          "async_unsupported",
          "QuickJS supports synchronous scripts only",
        );
      }
      const snapshot = admitBrowserWorkspaceQuickJsSnapshotV1(rawSnapshot);
      if (snapshot === null) {
        throw new BrowserWorkspaceQuickJsFailureV1(
          "output_limit",
          "QuickJS snapshot was outside its bounds",
        );
      }
      return {
        revision: 1,
        kind: "quickjs_result",
        requestId: request.requestId,
        buildIdentity: browserWorkspaceSandboxArtifactBuildIdentityV1,
        ok: true,
        response: {
          changes: exactBrowserWorkspaceQuickJsDiffV1(request.files, snapshot.files),
          stdout: snapshot.stdout,
          moduleStartupMilliseconds,
          executionMilliseconds: performance.now() - executionStarted,
          runtimeAllocatorLimitBytes: browserWorkspaceQuickJsRuntimeAllocatorLimitBytesV1,
          wasmLinearMemoryBytes: fixedWasmMemory.buffer.byteLength,
          stackLimitBytes: browserWorkspaceQuickJsStackLimitBytesV1,
        },
      };
    } finally {
      context.dispose();
      runtime.dispose();
    }
  } catch (error) {
    const failure = error instanceof BrowserWorkspaceQuickJsFailureV1
      ? error
      : new BrowserWorkspaceQuickJsFailureV1(
        "execution_failed",
        "QuickJS runtime failed",
      );
    failure.wasmLinearMemoryBytes = fixedWasmMemory.buffer.byteLength;
    throw failure;
  }
}

export function browserWorkspaceQuickJsFailureResponseV1(
  requestId: number | null,
  error: unknown,
): BrowserWorkspaceQuickJsFailureResponseV1 {
  return {
    revision: 1,
    kind: "quickjs_result",
    requestId,
    buildIdentity: browserWorkspaceSandboxArtifactBuildIdentityV1,
    ok: false,
    code: error instanceof BrowserWorkspaceQuickJsFailureV1 ? error.code : "execution_failed",
    diagnostic: error instanceof BrowserWorkspaceQuickJsFailureV1 ? error.diagnostic : null,
    wasmLinearMemoryBytes: error instanceof BrowserWorkspaceQuickJsFailureV1
      ? error.wasmLinearMemoryBytes
      : null,
  };
}

function requestIdForFailureV1(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  const descriptor = Object.getOwnPropertyDescriptor(value, "requestId");
  if (descriptor === undefined || !("value" in descriptor)) return null;
  return Number.isSafeInteger(descriptor.value) && descriptor.value >= 1 &&
      descriptor.value <= 0x7fff_ffff
    ? descriptor.value as number
    : null;
}

interface BrowserWorkspaceQuickJsWorkerScopeV1 {
  sendMessage(message: BrowserWorkspaceQuickJsResponseV1): void;
  receiveMessage(listener: (event: Readonly<{ data: unknown }>) => void): void;
  closeWorker(): void;
}

function currentBrowserWorkspaceQuickJsWorkerScopeV1():
  | BrowserWorkspaceQuickJsWorkerScopeV1
  | null {
  const candidate = globalThis as typeof globalThis & {
    readonly document?: unknown;
    readonly postMessage?: unknown;
    readonly addEventListener?: unknown;
    readonly close?: unknown;
  };
  if (
    "document" in candidate || typeof candidate.postMessage !== "function" ||
    typeof candidate.addEventListener !== "function" || typeof candidate.close !== "function"
  ) return null;
  const postMessage = candidate.postMessage;
  const addEventListener = candidate.addEventListener;
  const close = candidate.close;
  return {
    sendMessage(message) {
      Reflect.apply(postMessage, candidate, [message]);
    },
    receiveMessage(listener) {
      Reflect.apply(addEventListener, candidate, ["message", listener]);
    },
    closeWorker() {
      Reflect.apply(close, candidate, []);
    },
  };
}

function installBrowserWorkspaceQuickJsWorkerV1(
  scope: BrowserWorkspaceQuickJsWorkerScopeV1,
): void {
  let received = false;
  const sendAndClose = (response: BrowserWorkspaceQuickJsResponseV1): void => {
    scope.sendMessage(response);
    queueMicrotask(() => scope.closeWorker());
  };
  scope.receiveMessage((event) => {
    if (received) return;
    received = true;
    const request = admitBrowserWorkspaceQuickJsRequestV1(event.data);
    if (
      request === null ||
      request.buildIdentity !== browserWorkspaceSandboxArtifactBuildIdentityV1
    ) {
      sendAndClose({
        revision: 1,
        kind: "quickjs_result",
        requestId: requestIdForFailureV1(event.data),
        buildIdentity: browserWorkspaceSandboxArtifactBuildIdentityV1,
        ok: false,
        code: "invalid_request",
        diagnostic: null,
        wasmLinearMemoryBytes: null,
      });
      return;
    }
    void executeBrowserWorkspaceQuickJsV1(request).then(
      sendAndClose,
      (error: unknown) =>
        sendAndClose(browserWorkspaceQuickJsFailureResponseV1(request.requestId, error)),
    );
  });
}

const workerScopeV1 = currentBrowserWorkspaceQuickJsWorkerScopeV1();
if (workerScopeV1 !== null) installBrowserWorkspaceQuickJsWorkerV1(workerScopeV1);

// SPDX-License-Identifier: MIT

import {
  createBrowserWorkspaceHostOpfsBootstrapV1,
} from "../workspace/browser-workspace-host-opfs.ts";
import {
  type BrowserWorkspaceHostMessagePortV1,
  createBrowserWorkspaceHostRuntimeV1,
} from "../workspace/browser-workspace-host-runtime.ts";
import {
  admitBrowserWorkspaceSandboxWorkerBindV1,
  createBrowserWorkspaceSandboxWorkerBoundV1,
} from "../workspace/browser-workspace-sandbox-bootstrap-protocol.ts";
import { browserWorkspaceSandboxArtifactBuildIdentityV1 } from "../workspace/browser-workspace-sandbox-build-identity.ts";
import { admitBrowserWorkspaceSandboxDownloadResponseV1 } from "../workspace/browser-workspace-sandbox-download-protocol.ts";

interface WorkspaceSandboxHostWorkerScopeV1 {
  addEventListener(
    type: "message",
    listener: (event: Readonly<{ data: unknown; ports: readonly MessagePort[] }>) => void,
  ): void;
}

const workerScope = self as unknown as WorkspaceSandboxHostWorkerScopeV1;
let bound = false;

let shellRuntimePromiseV1:
  | Promise<typeof import("../workspace/browser-workspace-just-bash-runtime.ts")>
  | null = null;

function loadWorkspaceSandboxShellRuntimeV1(): Promise<
  typeof import("../workspace/browser-workspace-just-bash-runtime.ts")
> {
  shellRuntimePromiseV1 ??= import("../workspace/browser-workspace-just-bash-runtime.ts");
  return shellRuntimePromiseV1;
}

function createWorkspaceSandboxDownloadBrokerV1(port: MessagePort): (input: {
  readonly exportId: string;
  readonly downloadUrl: string;
  readonly fileName: string;
  readonly signal: AbortSignal;
}) => Promise<void> {
  let active = false;
  return async (input): Promise<void> => {
    if (active || input.signal.aborted) {
      throw new DOMException("Workspace download was aborted", "AbortError");
    }
    active = true;
    const requestId = `sandbox.download.${crypto.randomUUID()}`;
    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const settle = (error: Error | null): void => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          input.signal.removeEventListener("abort", onAbort);
          port.removeEventListener("message", onMessage);
          if (error === null) resolve();
          else reject(error);
        };
        const onAbort = (): void =>
          settle(new DOMException("Workspace download was aborted", "AbortError"));
        const onMessage = (event: MessageEvent<unknown>): void => {
          const response = admitBrowserWorkspaceSandboxDownloadResponseV1(event.data);
          if (
            response === null || response.requestId !== requestId ||
            response.exportId !== input.exportId
          ) {
            settle(new TypeError("sillyos.workspace_sandbox.download_protocol_invalid"));
            return;
          }
          settle(
            response.kind === "workspace_sandbox_download_started"
              ? null
              : new TypeError(`sillyos.workspace_sandbox.${response.code}`),
          );
        };
        const timeout = setTimeout(() => {
          settle(new TypeError("sillyos.workspace_sandbox.download_timeout"));
        }, 10_000);
        input.signal.addEventListener("abort", onAbort, { once: true });
        port.addEventListener("message", onMessage);
        port.start();
        try {
          port.postMessage({
            revision: 1,
            kind: "workspace_sandbox_download_request",
            requestId,
            exportId: input.exportId,
            downloadUrl: input.downloadUrl,
            fileName: input.fileName,
          });
        } catch (error) {
          settle(error instanceof Error ? error : new Error("Workspace download failed"));
        }
      });
    } finally {
      active = false;
    }
  };
}

workerScope.addEventListener("message", (event) => {
  if (bound) {
    for (const port of event.ports) port.close();
    return;
  }

  const bind = admitBrowserWorkspaceSandboxWorkerBindV1(event.data);
  const controlPort = event.ports.length === 2 ? event.ports[0] : undefined;
  const downloadPort = event.ports.length === 2 ? event.ports[1] : undefined;
  if (
    bind === null || bind.buildIdentity !== browserWorkspaceSandboxArtifactBuildIdentityV1 ||
    controlPort === undefined || downloadPort === undefined
  ) {
    for (const port of event.ports) port.close();
    return;
  }

  bound = true;
  const runtime = createBrowserWorkspaceHostRuntimeV1({
    bootstrap: createBrowserWorkspaceHostOpfsBootstrapV1(),
    loadShellRuntime: loadWorkspaceSandboxShellRuntimeV1,
    startDownload: createWorkspaceSandboxDownloadBrokerV1(downloadPort),
    postControlMessage(message) {
      // MessagePort.postMessage has no targetOrigin parameter.
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      controlPort.postMessage(message);
    },
  });

  controlPort.addEventListener("message", (controlEvent) => {
    void runtime.receiveControl(
      controlEvent.data,
      controlEvent.ports as readonly unknown[] as readonly BrowserWorkspaceHostMessagePortV1[],
    );
  });
  controlPort.start();
  const boundMessage = createBrowserWorkspaceSandboxWorkerBoundV1(
    bind.nonce,
    browserWorkspaceSandboxArtifactBuildIdentityV1,
  );
  // MessagePort.postMessage has no targetOrigin parameter.
  // oxlint-disable-next-line unicorn/require-post-message-target-origin
  controlPort.postMessage(boundMessage);
});

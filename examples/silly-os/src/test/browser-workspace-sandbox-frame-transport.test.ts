// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createBrowserWorkspaceSandboxFrameReadyV1,
  createBrowserWorkspaceSandboxWorkerBoundV1,
} from "../workspace/browser-workspace-sandbox-bootstrap-protocol.ts";
import type { BrowserWorkspaceHostControlTransportV1 } from "../workspace/browser-workspace-host-port.ts";
import {
  browserWorkspaceSandboxDevelopmentControlOriginV1,
  browserWorkspaceSandboxDevelopmentOriginV1,
  browserWorkspaceSandboxOriginForControlV1,
  browserWorkspaceSandboxProductionControlOriginV1,
  browserWorkspaceSandboxProductionOriginV1,
  createBrowserWorkspaceSandboxFrameTransportV1,
} from "../workspace/browser-workspace-sandbox-frame-transport.ts";

const nonceV1 = "sandbox.bootstrap.transport-1";
const buildIdentityV1 = "00bfdf21";

type PortListenerV1 = (event: MessageEvent<unknown>) => void;

class FakeMessagePortV1 {
  readonly posts: Array<Readonly<{ message: unknown; transfer: readonly Transferable[] }>> = [];
  readonly start = vi.fn();
  readonly close = vi.fn();
  private readonly listeners = new Map<string, Set<PortListenerV1>>();

  readonly postMessage = vi.fn((message: unknown, transfer: Transferable[] = []): void => {
    this.posts.push({ message, transfer: [...transfer] });
  });

  addEventListener(type: string, listener: PortListenerV1): void {
    const listeners = this.listeners.get(type) ?? new Set<PortListenerV1>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: PortListenerV1): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: "message" | "messageerror", data?: unknown): void {
    const event = new MessageEvent(type, { data });
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

interface TransportHarnessV1 {
  readonly transport: BrowserWorkspaceHostControlTransportV1;
  readonly iframe: HTMLIFrameElement;
  readonly frameWindow: Window;
  readonly framePostMessage: ReturnType<typeof vi.spyOn>;
  readonly controlPort: FakeMessagePortV1;
  readonly framePort: FakeMessagePortV1;
}

const activeTransportsV1: BrowserWorkspaceHostControlTransportV1[] = [];
const sandboxTokensByFrameV1 = new WeakMap<HTMLIFrameElement, Set<string>>();
let originalSandboxDescriptorV1: PropertyDescriptor | undefined;

beforeAll(() => {
  originalSandboxDescriptorV1 = Object.getOwnPropertyDescriptor(
    HTMLIFrameElement.prototype,
    "sandbox",
  );
  if (originalSandboxDescriptorV1 !== undefined) return;
  Object.defineProperty(HTMLIFrameElement.prototype, "sandbox", {
    configurable: true,
    get(this: HTMLIFrameElement) {
      const tokens = sandboxTokensByFrameV1.get(this) ?? new Set<string>();
      sandboxTokensByFrameV1.set(this, tokens);
      return {
        add: (...values: string[]) => {
          for (const value of values) tokens.add(value);
        },
      };
    },
  });
});

afterAll(() => {
  if (originalSandboxDescriptorV1 === undefined) {
    Reflect.deleteProperty(HTMLIFrameElement.prototype, "sandbox");
  } else {
    Object.defineProperty(
      HTMLIFrameElement.prototype,
      "sandbox",
      originalSandboxDescriptorV1,
    );
  }
});

beforeEach(() => {
  vi.useFakeTimers();
  document.body.replaceChildren();
});

afterEach(() => {
  for (const transport of activeTransportsV1.splice(0)) transport.terminate();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function createHarnessV1(input?: {
  readonly nonce?: string;
  readonly buildIdentity?: string;
  readonly bootstrapTimeoutMilliseconds?: number;
}): TransportHarnessV1 {
  const controlPort = new FakeMessagePortV1();
  const framePort = new FakeMessagePortV1();
  const transport = createBrowserWorkspaceSandboxFrameTransportV1({
    window,
    document,
    controlOrigin: browserWorkspaceSandboxDevelopmentControlOriginV1,
    sandboxOrigin: browserWorkspaceSandboxDevelopmentOriginV1,
    buildIdentity: input?.buildIdentity ?? buildIdentityV1,
    createNonce: () => input?.nonce ?? nonceV1,
    createMessageChannel: () =>
      ({
        port1: controlPort as unknown as MessagePort,
        port2: framePort as unknown as MessagePort,
      }) as MessageChannel,
    bootstrapTimeoutMilliseconds: input?.bootstrapTimeoutMilliseconds ?? 1_000,
  });
  activeTransportsV1.push(transport);
  const iframe = document.querySelector<HTMLIFrameElement>(
    "iframe[data-silly-os-workspace-sandbox='active']",
  );
  if (iframe?.contentWindow === null || iframe?.contentWindow === undefined) {
    throw new TypeError("test.workspace_sandbox.frame_unavailable");
  }
  const frameWindow = iframe.contentWindow;
  const framePostMessage = vi.spyOn(frameWindow, "postMessage").mockImplementation(() => {});
  return { transport, iframe, frameWindow, framePostMessage, controlPort, framePort };
}

function dispatchFrameMessageV1(
  harness: Pick<TransportHarnessV1, "frameWindow">,
  data: unknown,
  input?: { readonly origin?: string; readonly source?: MessageEventSource | null },
): void {
  window.dispatchEvent(
    new MessageEvent("message", {
      data,
      origin: input?.origin ?? browserWorkspaceSandboxDevelopmentOriginV1,
      source: input?.source ?? harness.frameWindow,
    }),
  );
}

function readyFrameV1(harness: TransportHarnessV1): void {
  dispatchFrameMessageV1(
    harness,
    createBrowserWorkspaceSandboxFrameReadyV1(nonceV1, buildIdentityV1),
  );
}

describe("Browser Workspace Sandbox frame transport", () => {
  it("admits only the fixed control-to-sandbox origin pairs", () => {
    expect(
      browserWorkspaceSandboxOriginForControlV1(
        browserWorkspaceSandboxDevelopmentControlOriginV1,
      ),
    ).toBe(browserWorkspaceSandboxDevelopmentOriginV1);
    expect(
      browserWorkspaceSandboxOriginForControlV1(
        browserWorkspaceSandboxProductionControlOriginV1,
      ),
    ).toBe(browserWorkspaceSandboxProductionOriginV1);
    expect(browserWorkspaceSandboxOriginForControlV1("https://example.com")).toBeNull();

    expect(() =>
      createBrowserWorkspaceSandboxFrameTransportV1({
        window,
        document,
        controlOrigin: `${browserWorkspaceSandboxDevelopmentControlOriginV1}/`,
      })
    ).toThrowError("sillyos.workspace_sandbox.origin_unavailable");
    expect(() =>
      createBrowserWorkspaceSandboxFrameTransportV1({
        window,
        document,
        controlOrigin: browserWorkspaceSandboxDevelopmentControlOriginV1,
        sandboxOrigin: browserWorkspaceSandboxProductionOriginV1,
      })
    ).toThrowError("sillyos.workspace_sandbox.origin_unavailable");
  });

  it("ignores other sources and origins before accepting the exact frame identity", () => {
    const harness = createHarnessV1();
    const failures = vi.fn();
    harness.transport.addEventListener("messageerror", failures);
    const ready = createBrowserWorkspaceSandboxFrameReadyV1(nonceV1, buildIdentityV1);

    dispatchFrameMessageV1(harness, ready, { source: window });
    dispatchFrameMessageV1(harness, ready, { origin: "https://untrusted.example" });
    expect(harness.framePostMessage).not.toHaveBeenCalled();
    expect(failures).not.toHaveBeenCalled();

    dispatchFrameMessageV1(harness, ready);
    expect(harness.framePostMessage).toHaveBeenCalledTimes(1);
    expect(harness.framePostMessage).toHaveBeenCalledWith(
      {
        revision: 1,
        kind: "workspace_sandbox_frame_bind",
        nonce: nonceV1,
        buildIdentity: buildIdentityV1,
      },
      browserWorkspaceSandboxDevelopmentOriginV1,
      [harness.framePort],
    );
    expect(harness.controlPort.start).toHaveBeenCalledTimes(1);
  });

  it("gates and flushes queued traffic only after the exact worker-bound record", () => {
    const harness = createHarnessV1();
    const received = vi.fn();
    harness.transport.addEventListener("message", received);
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- The typed control transport has no targetOrigin parameter.
    harness.transport.postMessage({ command: "queued" });

    readyFrameV1(harness);
    expect(harness.controlPort.posts).toEqual([]);

    harness.controlPort.dispatch(
      "message",
      createBrowserWorkspaceSandboxWorkerBoundV1(nonceV1, buildIdentityV1),
    );
    expect(harness.controlPort.posts).toEqual([
      { message: { command: "queued" }, transfer: [] },
    ]);
    expect(received).not.toHaveBeenCalled();

    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- The typed control transport has no targetOrigin parameter.
    harness.transport.postMessage({ command: "live" });
    harness.controlPort.dispatch("message", { result: "ok" });
    expect(harness.controlPort.posts.at(-1)).toEqual({
      message: { command: "live" },
      transfer: [],
    });
    expect(received).toHaveBeenCalledWith({ data: { result: "ok" } });
  });

  it.each([
    [
      "malformed record",
      { revision: 1, kind: "workspace_sandbox_frame_ready", nonce: nonceV1 },
    ],
    [
      "wrong nonce",
      createBrowserWorkspaceSandboxFrameReadyV1("sandbox.bootstrap.other", buildIdentityV1),
    ],
    [
      "wrong build identity",
      createBrowserWorkspaceSandboxFrameReadyV1(nonceV1, "other-build"),
    ],
  ])("fails closed for a same-source %s", (_label, record) => {
    const harness = createHarnessV1();
    const failure = vi.fn();
    harness.transport.addEventListener("messageerror", failure);

    dispatchFrameMessageV1(harness, record);

    expect(failure).toHaveBeenCalledTimes(1);
    expect(harness.iframe.isConnected).toBe(false);
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- The typed control transport has no targetOrigin parameter.
    expect(() => harness.transport.postMessage({ after: "failure" })).toThrowError(
      "sillyos.workspace_sandbox.transport_disposed",
    );
  });

  it("fails closed on a duplicate frame-ready message", () => {
    const harness = createHarnessV1();
    const failure = vi.fn();
    harness.transport.addEventListener("messageerror", failure);
    const ready = createBrowserWorkspaceSandboxFrameReadyV1(nonceV1, buildIdentityV1);

    dispatchFrameMessageV1(harness, ready);
    dispatchFrameMessageV1(harness, ready);

    expect(failure).toHaveBeenCalledTimes(1);
    expect(harness.controlPort.close).toHaveBeenCalledTimes(1);
    expect(harness.iframe.isConnected).toBe(false);
  });

  it("times out fail-closed without binding or retaining the iframe", () => {
    const harness = createHarnessV1({ bootstrapTimeoutMilliseconds: 25 });
    const failure = vi.fn();
    harness.transport.addEventListener("error", failure);

    vi.advanceTimersByTime(25);

    expect(failure).toHaveBeenCalledTimes(1);
    expect(harness.framePostMessage).not.toHaveBeenCalled();
    expect(harness.iframe.isConnected).toBe(false);
  });

  it("terminate removes the iframe, closes the bound port, and detaches bootstrap input", () => {
    const harness = createHarnessV1();
    readyFrameV1(harness);
    expect(harness.framePostMessage).toHaveBeenCalledTimes(1);

    harness.transport.terminate();
    dispatchFrameMessageV1(
      harness,
      createBrowserWorkspaceSandboxFrameReadyV1(nonceV1, buildIdentityV1),
    );

    expect(harness.controlPort.close).toHaveBeenCalledTimes(1);
    expect(harness.iframe.isConnected).toBe(false);
    expect(harness.framePostMessage).toHaveBeenCalledTimes(1);
  });
});

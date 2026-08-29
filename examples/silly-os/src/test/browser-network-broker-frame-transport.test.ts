// @vitest-environment jsdom
// SPDX-License-Identifier: MIT

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createBrowserNetworkBrokerFrameReadyV1,
  createBrowserNetworkBrokerWorkerBoundV1,
} from "../network/browser-network-broker-bootstrap-protocol.ts";
import {
  browserNetworkBrokerDevelopmentControlOriginV1,
  browserNetworkBrokerDevelopmentOriginV1,
  browserNetworkBrokerOriginForControlV1,
  browserNetworkBrokerProductionControlOriginV1,
  browserNetworkBrokerProductionOriginV1,
  createBrowserNetworkBrokerFrameTransportV1,
} from "../network/browser-network-broker-frame-transport.ts";

const nonceV1 = "network.bootstrap.transport";
const buildIdentityV1 = "sillyos.network-broker.development";

type PortListenerV1 = (event: MessageEvent<unknown>) => void;

class FakeMessagePortV1 {
  readonly start = vi.fn();
  readonly close = vi.fn();
  private readonly listeners = new Map<string, Set<PortListenerV1>>();

  addEventListener(type: string, listener: PortListenerV1): void {
    const listeners = this.listeners.get(type) ?? new Set<PortListenerV1>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: PortListenerV1): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(data: unknown, ports: readonly MessagePort[] = []): void {
    const event = new MessageEvent("message", { data, ports: [...ports] });
    for (const listener of this.listeners.get("message") ?? []) listener(event);
  }
}

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
      return { add: (...values: string[]) => values.forEach((value) => tokens.add(value)) };
    },
  });
});

afterAll(() => {
  if (originalSandboxDescriptorV1 === undefined) {
    Reflect.deleteProperty(HTMLIFrameElement.prototype, "sandbox");
  } else {
    Object.defineProperty(HTMLIFrameElement.prototype, "sandbox", originalSandboxDescriptorV1);
  }
});

beforeEach(() => {
  vi.useFakeTimers();
  document.body.replaceChildren();
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Browser Network Broker frame transport", () => {
  it("admits only fixed control-to-Broker origin pairs", () => {
    expect(
      browserNetworkBrokerOriginForControlV1(browserNetworkBrokerDevelopmentControlOriginV1),
    ).toBe(browserNetworkBrokerDevelopmentOriginV1);
    expect(
      browserNetworkBrokerOriginForControlV1(browserNetworkBrokerProductionControlOriginV1),
    ).toBe(browserNetworkBrokerProductionOriginV1);
    expect(browserNetworkBrokerOriginForControlV1("https://untrusted.example")).toBeNull();
    expect(() =>
      createBrowserNetworkBrokerFrameTransportV1({
        window,
        document,
        controlOrigin: browserNetworkBrokerDevelopmentControlOriginV1,
        brokerOrigin: browserNetworkBrokerProductionOriginV1,
      })
    ).toThrowError("sillyos.network_broker.origin_unavailable");
  });

  it("returns one Agent port only after exact frame and Worker identity", async () => {
    const controlPort = new FakeMessagePortV1();
    const framePort = new FakeMessagePortV1();
    // Keep every port in jsdom's realm. A real Deno MessagePort cannot be
    // embedded in jsdom's MessageEvent without crossing incompatible
    // EventTarget implementations.
    const agentPort = new FakeMessagePortV1();
    const leasePromise = createBrowserNetworkBrokerFrameTransportV1({
      window,
      document,
      controlOrigin: browserNetworkBrokerDevelopmentControlOriginV1,
      brokerOrigin: browserNetworkBrokerDevelopmentOriginV1,
      buildIdentity: buildIdentityV1,
      createNonce: () => nonceV1,
      createMessageChannel: () =>
        ({ port1: controlPort, port2: framePort }) as unknown as MessageChannel,
      bootstrapTimeoutMilliseconds: 1_000,
    });
    const iframe = document.querySelector<HTMLIFrameElement>(
      "iframe[data-silly-os-network-broker='active']",
    );
    if (iframe?.contentWindow === null || iframe?.contentWindow === undefined) {
      throw new TypeError("test.network_broker.frame_unavailable");
    }
    const framePostMessage = vi.spyOn(iframe.contentWindow, "postMessage").mockImplementation(
      () => {},
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        data: createBrowserNetworkBrokerFrameReadyV1(nonceV1, buildIdentityV1),
        origin: browserNetworkBrokerDevelopmentOriginV1,
        source: iframe.contentWindow,
      }),
    );
    expect(framePostMessage).toHaveBeenCalledWith(
      {
        revision: 1,
        kind: "network_broker_frame_bind",
        nonce: nonceV1,
        buildIdentity: buildIdentityV1,
      },
      browserNetworkBrokerDevelopmentOriginV1,
      [framePort],
    );
    controlPort.dispatch(
      createBrowserNetworkBrokerWorkerBoundV1(nonceV1, buildIdentityV1),
      [agentPort as unknown as MessagePort],
    );
    const lease = await leasePromise;
    expect(lease.agentPort).toBe(agentPort);
    expect(iframe.isConnected).toBe(true);
    lease.terminate();
    expect(iframe.isConnected).toBe(false);
    expect(agentPort.close).toHaveBeenCalledOnce();
  });

  it("times out fail-closed and removes the frame", async () => {
    const promise = createBrowserNetworkBrokerFrameTransportV1({
      window,
      document,
      controlOrigin: browserNetworkBrokerDevelopmentControlOriginV1,
      brokerOrigin: browserNetworkBrokerDevelopmentOriginV1,
      buildIdentity: buildIdentityV1,
      createNonce: () => nonceV1,
      bootstrapTimeoutMilliseconds: 25,
    });
    const rejection = expect(promise).rejects.toThrowError(
      "sillyos.network_broker.bootstrap_timeout",
    );
    await vi.advanceTimersByTimeAsync(25);
    await rejection;
    expect(document.querySelector("iframe[data-silly-os-network-broker='active']")).toBeNull();
  });
});

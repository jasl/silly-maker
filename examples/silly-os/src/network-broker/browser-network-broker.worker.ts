// SPDX-License-Identifier: MIT

import {
  admitBrowserNetworkBrokerWorkerBindV1,
  createBrowserNetworkBrokerWorkerBoundV1,
} from "../network/browser-network-broker-bootstrap-protocol.ts";
import { browserNetworkBrokerArtifactBuildIdentityV1 } from "../network/browser-network-broker-build-identity.ts";
import { executeBrowserNetworkBrokerFetchUrlV1 } from "../network/browser-network-broker-fetch.ts";
import {
  admitBrowserNetworkBrokerCancelV1,
  admitBrowserNetworkBrokerFetchUrlRequestV1,
  createBrowserNetworkBrokerFetchUrlFailedV1,
} from "../network/browser-network-broker-protocol.ts";

const activeRequestMaximumV1 = 8;

interface NetworkBrokerWorkerScopeV1 {
  addEventListener(
    type: "message",
    listener: (event: Readonly<{ data: unknown; ports: readonly MessagePort[] }>) => void,
  ): void;
}

const workerScopeV1 = self as unknown as NetworkBrokerWorkerScopeV1;
let boundV1 = false;

workerScopeV1.addEventListener("message", (event) => {
  if (boundV1) {
    for (const port of event.ports) port.close();
    return;
  }
  const bind = admitBrowserNetworkBrokerWorkerBindV1(event.data);
  const bootstrapPort = event.ports.length === 1 ? event.ports[0] : undefined;
  if (
    bind === null || bind.buildIdentity !== browserNetworkBrokerArtifactBuildIdentityV1 ||
    bootstrapPort === undefined
  ) {
    for (const port of event.ports) port.close();
    return;
  }
  boundV1 = true;

  const agentChannelV1 = new MessageChannel();
  const brokerPortV1 = agentChannelV1.port1;
  const activeV1 = new Map<string, AbortController>();
  let closedV1 = false;

  const closeV1 = (): void => {
    if (closedV1) return;
    closedV1 = true;
    for (const controller of activeV1.values()) controller.abort();
    activeV1.clear();
    brokerPortV1.close();
  };

  brokerPortV1.addEventListener("messageerror", closeV1);
  brokerPortV1.addEventListener("message", (brokerEvent) => {
    if (closedV1 || brokerEvent.ports.length !== 0) {
      for (const port of brokerEvent.ports) port.close();
      closeV1();
      return;
    }
    const cancel = admitBrowserNetworkBrokerCancelV1(brokerEvent.data);
    if (cancel !== null) {
      const controller = activeV1.get(cancel.requestId);
      if (controller !== undefined) {
        activeV1.delete(cancel.requestId);
        controller.abort();
      }
      return;
    }
    const request = admitBrowserNetworkBrokerFetchUrlRequestV1(brokerEvent.data);
    if (
      request === null || activeV1.has(request.requestId) ||
      activeV1.size >= activeRequestMaximumV1
    ) {
      closeV1();
      return;
    }

    const controller = new AbortController();
    activeV1.set(request.requestId, controller);
    void executeBrowserNetworkBrokerFetchUrlV1(request, controller.signal).then(
      (result) => {
        if (closedV1 || activeV1.get(request.requestId) !== controller) return;
        activeV1.delete(request.requestId);
        try {
          // MessagePort.postMessage has no targetOrigin parameter.
          // oxlint-disable-next-line unicorn/require-post-message-target-origin -- MessagePort is an exact transferred capability
          brokerPortV1.postMessage(result);
        } catch {
          closeV1();
        }
      },
      () => {
        if (closedV1 || activeV1.get(request.requestId) !== controller) return;
        activeV1.delete(request.requestId);
        try {
          const failure = createBrowserNetworkBrokerFetchUrlFailedV1(
            request.requestId,
            "network_failed",
          );
          // MessagePort.postMessage has no targetOrigin parameter.
          // oxlint-disable-next-line unicorn/require-post-message-target-origin -- MessagePort is an exact transferred capability
          brokerPortV1.postMessage(failure);
        } catch {
          closeV1();
        }
      },
    );
  });
  brokerPortV1.start();

  try {
    bootstrapPort.postMessage(
      createBrowserNetworkBrokerWorkerBoundV1(
        bind.nonce,
        browserNetworkBrokerArtifactBuildIdentityV1,
      ),
      [agentChannelV1.port2],
    );
  } catch {
    agentChannelV1.port2.close();
    closeV1();
  } finally {
    bootstrapPort.close();
  }
});

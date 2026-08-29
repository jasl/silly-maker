// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserNetworkBrokerFrameBindV1,
  admitBrowserNetworkBrokerFrameFailedV1,
  admitBrowserNetworkBrokerFrameReadyV1,
  admitBrowserNetworkBrokerWorkerBindV1,
  admitBrowserNetworkBrokerWorkerBoundV1,
  createBrowserNetworkBrokerFrameBindV1,
  createBrowserNetworkBrokerFrameFailedV1,
  createBrowserNetworkBrokerFrameReadyV1,
  createBrowserNetworkBrokerWorkerBindV1,
  createBrowserNetworkBrokerWorkerBoundV1,
} from "../network/browser-network-broker-bootstrap-protocol.ts";

const nonceV1 = "network.bootstrap.test";
const buildIdentityV1 = "sillyos.network-broker.development";

describe("Browser Network Broker bootstrap protocol", () => {
  it("admits only the five exact bootstrap records", () => {
    const records = [
      [
        createBrowserNetworkBrokerFrameReadyV1(nonceV1, buildIdentityV1),
        admitBrowserNetworkBrokerFrameReadyV1,
      ],
      [
        createBrowserNetworkBrokerFrameBindV1(nonceV1, buildIdentityV1),
        admitBrowserNetworkBrokerFrameBindV1,
      ],
      [
        createBrowserNetworkBrokerWorkerBindV1(nonceV1, buildIdentityV1),
        admitBrowserNetworkBrokerWorkerBindV1,
      ],
      [
        createBrowserNetworkBrokerWorkerBoundV1(nonceV1, buildIdentityV1),
        admitBrowserNetworkBrokerWorkerBoundV1,
      ],
      [
        createBrowserNetworkBrokerFrameFailedV1(nonceV1, buildIdentityV1, "worker_unavailable"),
        admitBrowserNetworkBrokerFrameFailedV1,
      ],
    ] as const;
    for (const [record, admit] of records) {
      expect(Object.isFrozen(record)).toBe(true);
      expect(admit(record)).toEqual(record);
      expect(admit({ ...record, extra: true })).toBeNull();
      expect(admit({ ...record, revision: 2 })).toBeNull();
    }
  });
});

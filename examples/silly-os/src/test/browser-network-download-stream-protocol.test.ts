// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitBrowserNetworkDownloadBrokerMessageV1,
  admitBrowserNetworkDownloadChunkAckV1,
  admitBrowserNetworkDownloadChunkV1,
  admitBrowserNetworkDownloadRequestV1,
  admitBrowserNetworkDownloadSinkMessageV1,
  browserNetworkDownloadChunkMaximumBytesV1,
  browserNetworkDownloadTotalMaximumBytesV1,
  createBrowserNetworkDownloadChunkAckV1,
  createBrowserNetworkDownloadChunkV1,
  createBrowserNetworkDownloadCompleteV1,
  createBrowserNetworkDownloadFailedV1,
  createBrowserNetworkDownloadHttpErrorV1,
  createBrowserNetworkDownloadRequestV1,
  createBrowserNetworkDownloadResponseV1,
  createBrowserNetworkDownloadSinkAbortV1,
  createBrowserNetworkDownloadSinkReadyV1,
} from "../network/browser-network-download-stream-protocol.ts";

const requestIdV1 = "network.request.download.1";

describe("Browser Network Broker direct download protocol", () => {
  it("admits only one exact canonical URL request without Workspace authority", () => {
    const request = createBrowserNetworkDownloadRequestV1(
      requestIdV1,
      "https://assets.example.test/archive.zip?revision=1",
    );
    expect(admitBrowserNetworkDownloadRequestV1(request)).toEqual(request);
    for (
      const invalid of [
        { ...request, url: "http://assets.example.test/archive.zip" },
        { ...request, url: "https://assets.example.test:443/archive.zip?revision=1" },
        { ...request, destination: "/workspace/archive.zip" },
        { ...request, programId: "program.forbidden" },
        { ...request, headers: { authorization: "forbidden" } },
      ]
    ) expect(admitBrowserNetworkDownloadRequestV1(invalid)).toBeNull();
  });

  it("admits exact ready, ACK, and abort records from the Host sink", () => {
    const records = [
      createBrowserNetworkDownloadSinkReadyV1(requestIdV1),
      createBrowserNetworkDownloadChunkAckV1(requestIdV1, 1),
      createBrowserNetworkDownloadSinkAbortV1(requestIdV1, "cancelled"),
      createBrowserNetworkDownloadSinkAbortV1(requestIdV1, "sink_failed"),
    ] as const;
    for (const record of records) {
      expect(admitBrowserNetworkDownloadSinkMessageV1(record)).toEqual(record);
      expect(admitBrowserNetworkDownloadSinkMessageV1({ ...record, extra: true })).toBeNull();
    }
    expect(admitBrowserNetworkDownloadChunkAckV1({
      ...createBrowserNetworkDownloadChunkAckV1(requestIdV1, 1),
      sequence: 0,
    })).toBeNull();
  });

  it("bounds scalar metadata, chunks, totals, and terminal failures", () => {
    const chunkBuffer = new Uint8Array([1, 2, 3]).buffer;
    const messages = [
      createBrowserNetworkDownloadResponseV1({
        requestId: requestIdV1,
        status: 200,
        contentType: "application/zip",
        declaredBytes: 3,
      }),
      createBrowserNetworkDownloadChunkV1({
        requestId: requestIdV1,
        sequence: 1,
        offset: 0,
        chunk: chunkBuffer,
      }),
      createBrowserNetworkDownloadCompleteV1({ requestId: requestIdV1, bytes: 3, chunks: 1 }),
      createBrowserNetworkDownloadHttpErrorV1({
        requestId: requestIdV1,
        status: 404,
        contentType: "text/plain",
        declaredBytes: 9,
      }),
      createBrowserNetworkDownloadFailedV1(requestIdV1, "response_too_large"),
    ] as const;
    for (const message of messages) {
      expect(admitBrowserNetworkDownloadBrokerMessageV1(message)).toEqual(message);
      expect(admitBrowserNetworkDownloadBrokerMessageV1({ ...message, extra: true })).toBeNull();
    }
    expect(admitBrowserNetworkDownloadChunkV1({
      ...messages[1],
      bytes: browserNetworkDownloadChunkMaximumBytesV1 + 1,
    })).toBeNull();
    expect(admitBrowserNetworkDownloadChunkV1({
      ...messages[1],
      offset: browserNetworkDownloadTotalMaximumBytesV1,
    })).toBeNull();
    expect(admitBrowserNetworkDownloadBrokerMessageV1({
      ...messages[0],
      declaredBytes: browserNetworkDownloadTotalMaximumBytesV1 + 1,
    })).toBeNull();
    expect(admitBrowserNetworkDownloadBrokerMessageV1({
      ...messages[3],
      status: 302,
    })).toBeNull();
  });
});

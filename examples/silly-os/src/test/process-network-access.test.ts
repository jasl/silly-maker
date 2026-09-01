// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitProcessNetworkAccessMutationResultV1,
  admitProcessNetworkAccessMutationV1,
  admitProcessNetworkAccessV1,
  applyProcessNetworkAccessMutationV1,
  cloneProcessNetworkAccessV1,
  createDefaultProcessNetworkAccessV1,
  type ProcessNetworkAccessV1,
} from "../program-platform/capabilities/process-network-access.ts";

describe("Process network access V1", () => {
  it("admits only the exact Process-scoped boolean shape", () => {
    expect(admitProcessNetworkAccessV1({
      revision: 1,
      processId: "process.alpha",
      enabled: true,
    })).toEqual({
      kind: "admitted",
      value: { revision: 1, processId: "process.alpha", enabled: true },
    });
    expect(admitProcessNetworkAccessV1({
      revision: 1,
      processId: "process.alpha",
      enabled: true,
      origin: "https://example.test",
    })).toEqual({ kind: "rejected", path: "/" });
    expect(admitProcessNetworkAccessV1({
      revision: 1,
      processId: "process.alpha",
      enabled: "true",
    })).toEqual({ kind: "rejected", path: "/enabled" });
    expect(admitProcessNetworkAccessV1({
      revision: 2,
      processId: "process.alpha",
      enabled: false,
    })).toEqual({ kind: "rejected", path: "/revision" });
  });

  it("defaults to disabled and applies one idempotent boolean", () => {
    const disabled = createDefaultProcessNetworkAccessV1("process.alpha");
    expect(disabled).toEqual({ revision: 1, processId: "process.alpha", enabled: false });
    expect(applyProcessNetworkAccessMutationV1(disabled, {
      processId: "process.alpha",
      enabled: false,
    })).toEqual({ kind: "unchanged", value: disabled });

    const enabled = applyProcessNetworkAccessMutationV1(disabled, {
      processId: "process.alpha",
      enabled: true,
    });
    expect(enabled).toEqual({
      kind: "committed",
      value: { revision: 1, processId: "process.alpha", enabled: true },
    });
    expect(applyProcessNetworkAccessMutationV1(enabled.value, {
      processId: "process.alpha",
      enabled: true,
    })).toEqual({ kind: "unchanged", value: enabled.value });
  });

  it("trusts typed internal values after the admission boundary", () => {
    const internal = Object.assign(Object.create({ hostOwned: true }), {
      revision: 1 as const,
      processId: "process.alpha",
      enabled: false,
      internalOnly: "not projected",
    }) as ProcessNetworkAccessV1;

    expect(cloneProcessNetworkAccessV1(internal)).toEqual({
      revision: 1,
      processId: "process.alpha",
      enabled: false,
    });
    expect(applyProcessNetworkAccessMutationV1(internal, {
      processId: "process.alpha",
      enabled: true,
    })).toEqual({
      kind: "committed",
      value: { revision: 1, processId: "process.alpha", enabled: true },
    });
  });

  it("rejects cross-Process, grant-shaped, and malformed mutation results", () => {
    expect(() =>
      applyProcessNetworkAccessMutationV1(
        createDefaultProcessNetworkAccessV1("process.alpha"),
        { processId: "process.beta", enabled: true },
      )
    ).toThrow("sillyos.process_network_access.process_mismatch");
    expect(admitProcessNetworkAccessMutationV1({
      processId: "process.alpha",
      enabled: true,
      operation: "fetch_url",
    })).toEqual({ kind: "rejected", path: "/" });
    expect(admitProcessNetworkAccessMutationResultV1({
      kind: "committed",
      value: {
        revision: 1,
        processId: "process.alpha",
        enabled: true,
        url: "https://example.test/private",
      },
    })).toEqual({ kind: "rejected", path: "/value/" });
  });
});

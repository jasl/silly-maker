// SPDX-License-Identifier: MIT
// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createProgramAgentHostRetirementOwnerV1,
  useProgramAgentProviderOwnerV1,
} from "../ui/program-agent-provider-owner.ts";

const deterministicHostHarnessV1 = vi.hoisted(() => ({
  created: 0,
  forgetSettlements: [] as Array<{
    readonly promise: Promise<void>;
    readonly resolve: () => void;
  }>,
}));

vi.mock("../application/program-agent-composition.ts", () => ({
  createBrowserProgramAgentHostV1: () => {
    deterministicHostHarnessV1.created += 1;
    let resolve!: () => void;
    const promise = new Promise<void>((settle) => {
      resolve = settle;
    });
    deterministicHostHarnessV1.forgetSettlements.push({ promise, resolve });
    const controlSnapshot = {
      revision: 1,
      phase: "uninitialized",
      distribution: {},
      diagnostic: null,
      workspace: {
        phase: "closed",
        descriptor: null,
        receipts: [],
        lastReceipt: null,
        diagnostic: null,
      },
    };
    return {
      createControlPort: () => ({
        getSnapshot: () => controlSnapshot,
        subscribe: () => () => undefined,
        revokeCredential: () => undefined,
      }),
      forget: () => promise,
      dispose: async () => undefined,
    };
  },
}));

vi.mock("../network/browser-network-broker-frame-transport.ts", () => ({
  createBrowserNetworkBrokerFrameTransportV1: () => ({}),
}));

function deferredV1(): { readonly promise: Promise<void>; readonly resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe("Program Agent Host retirement ownership", () => {
  afterEach(() => {
    history.replaceState(null, "", "/");
    deterministicHostHarnessV1.created = 0;
    deterministicHostHarnessV1.forgetSettlements.length = 0;
  });

  it("keeps application drain pending until every detached Host has retired", async () => {
    const owner = createProgramAgentHostRetirementOwnerV1();
    const first = deferredV1();
    const second = deferredV1();
    void owner.track(first.promise);

    let drained = false;
    const draining = owner.drain().then(() => {
      drained = true;
    });
    void owner.track(second.promise);

    first.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(drained).toBe(false);

    second.resolve();
    await draining;
    expect(drained).toBe(true);
  });

  it("treats Host retirement failure as a completed best-effort release", async () => {
    const owner = createProgramAgentHostRetirementOwnerV1();
    await expect(owner.track(Promise.reject(new Error("synthetic retirement failure"))))
      .resolves.toBeUndefined();
    await expect(owner.drain()).resolves.toBeUndefined();
  });

  it("coalesces concurrent deterministic Host resets into one successor", async () => {
    history.replaceState(null, "", "/?agent=pi-test");
    const drainRegistry = {
      isAccepting: () => true,
      register: () => () => undefined,
    };
    const { result, unmount } = renderHook(() =>
      useProgramAgentProviderOwnerV1({
        workspaceAuthority: {} as never,
        programPackages: {} as never,
        agentDrainRegistry: drainRegistry,
        resetProductPreferences: () => undefined,
        reportFailure: vi.fn(),
      })
    );
    await waitFor(() => expect(deterministicHostHarnessV1.created).toBe(1));

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.forgetAgent();
      second = result.current.forgetAgent();
    });
    expect(second).toBe(first);
    expect(deterministicHostHarnessV1.created).toBe(1);

    deterministicHostHarnessV1.forgetSettlements[0]?.resolve();
    await act(async () => {
      await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    });
    await waitFor(() => expect(deterministicHostHarnessV1.created).toBe(2));
    expect(deterministicHostHarnessV1.forgetSettlements).toHaveLength(2);
    unmount();
  });
});

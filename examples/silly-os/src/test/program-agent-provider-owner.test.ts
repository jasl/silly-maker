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
  disposed: 0,
  throwOnCreateControlPort: false,
  connectionLostCallbacks: [] as Array<() => void>,
  selections: [] as unknown[],
  forgetSettlements: [] as Array<{
    readonly promise: Promise<void>;
    readonly resolve: () => void;
  }>,
}));

const providerDistributionV1 = {
  revision: 1,
  packages: [
    { name: "@earendil-works/pi-agent-core", version: "0.84.4" },
    { name: "@earendil-works/pi-ai", version: "0.84.4" },
  ],
} as const;

const providerSelectionV1 = {
  kind: "builtin",
  providerId: "deepseek",
  modelId: "deepseek-v4-flash",
  api: "openai-completions",
  baseUrl: "https://api.deepseek.com",
} as const;

vi.mock("../agent/browser-pi-catalog-port.ts", () => ({
  queryBrowserPiProviderCatalogV1: async () => ({
    kind: "ready",
    catalog: {
      revision: 1,
      distribution: providerDistributionV1,
      providers: [{
        id: "deepseek",
        name: "DeepSeek",
        baseUrl: "https://api.deepseek.com",
        availability: "available",
        models: [{
          id: "deepseek-v4-flash",
          name: "DeepSeek V4 Flash",
          api: "openai-completions",
          baseUrl: "https://api.deepseek.com",
          reasoning: false,
          supportedReasoningEfforts: ["off"],
          defaultReasoningEffort: "off",
          input: ["text"],
          contextWindow: 131_072,
          maxTokens: 8_192,
          availability: "available",
        }],
      }],
    },
  }),
}));

vi.mock("../credential/browser-credential-vault-port.ts", () => ({
  createBrowserCredentialVaultPortV2: () => {
    const snapshot = {
      revision: 2,
      protection: "device",
      state: "unlocked",
      bindings: [{
        bindingId: "builtin:deepseek",
        credentialKind: "api_key",
        baseUrl: "https://api.deepseek.com",
      }],
    };
    return {
      client: {
        initialize: async () => snapshot,
        list: async () => snapshot,
        handoff: async () => undefined,
      },
      close: () => undefined,
    };
  },
}));

vi.mock("../application/program-agent-composition.ts", () => ({
  createBrowserProgramAgentHostV1: (input: {
    readonly onConnectionLost?: () => void;
    readonly selection?: unknown;
  }) => {
    deterministicHostHarnessV1.created += 1;
    deterministicHostHarnessV1.selections.push(input.selection ?? null);
    if (input.onConnectionLost !== undefined) {
      deterministicHostHarnessV1.connectionLostCallbacks.push(input.onConnectionLost);
    }
    let resolve!: () => void;
    const promise = new Promise<void>((settle) => {
      resolve = settle;
    });
    deterministicHostHarnessV1.forgetSettlements.push({ promise, resolve });
    const controlSnapshot = {
      revision: 1,
      phase: "ready",
      distribution: providerDistributionV1,
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
      createControlPort: () => {
        if (deterministicHostHarnessV1.throwOnCreateControlPort) {
          throw new Error("synthetic control port failure");
        }
        return {
          getSnapshot: () => controlSnapshot,
          subscribe: () => () => undefined,
          configureCredentialHandoff: async () => ({
            kind: "configured",
            selection: input.selection ?? null,
            effectiveReasoningEffort: "off",
            distribution: providerDistributionV1,
          }),
          selectModel: async (selection: unknown) => ({
            kind: "selected",
            selection,
            effectiveReasoningEffort: "off",
            distribution: providerDistributionV1,
          }),
          revokeCredential: () => undefined,
        };
      },
      forget: () => promise,
      dispose: async () => {
        deterministicHostHarnessV1.disposed += 1;
      },
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
    deterministicHostHarnessV1.disposed = 0;
    deterministicHostHarnessV1.throwOnCreateControlPort = false;
    deterministicHostHarnessV1.connectionLostCallbacks.length = 0;
    deterministicHostHarnessV1.selections.length = 0;
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
        programModelSelectionContext: null,
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

  it("surfaces deterministic Host loss until the page establishes a new owner", async () => {
    history.replaceState(null, "", "/?agent=pi-test");
    const drainRegistry = {
      isAccepting: () => true,
      register: () => () => undefined,
    };
    const { result, unmount } = renderHook(() =>
      useProgramAgentProviderOwnerV1({
        workspaceAuthority: {} as never,
        programPackages: {} as never,
        programModelSelectionContext: null,
        agentDrainRegistry: drainRegistry,
        resetProductPreferences: () => undefined,
        reportFailure: vi.fn(),
      })
    );
    await waitFor(() => expect(result.current.readiness.status).toBe("ready"));

    act(() => deterministicHostHarnessV1.connectionLostCallbacks[0]?.());
    await waitFor(() => {
      expect(result.current.agentHost).toBeNull();
      expect(result.current.readiness).toEqual({
        status: "agent_failed",
        recoveryTarget: null,
      });
    });
    expect(deterministicHostHarnessV1.created).toBe(1);

    unmount();
  });

  it("retires a deterministic Host whose control port cannot be created", async () => {
    history.replaceState(null, "", "/?agent=pi-test");
    deterministicHostHarnessV1.throwOnCreateControlPort = true;
    const reportFailure = vi.fn();
    const { result, unmount } = renderHook(() =>
      useProgramAgentProviderOwnerV1({
        workspaceAuthority: {} as never,
        programPackages: {} as never,
        programModelSelectionContext: null,
        agentDrainRegistry: {
          isAccepting: () => true,
          register: () => () => undefined,
        },
        resetProductPreferences: () => undefined,
        reportFailure,
      })
    );

    await waitFor(() => {
      expect(result.current.readiness).toEqual({
        status: "agent_failed",
        recoveryTarget: null,
      });
      expect(deterministicHostHarnessV1.disposed).toBe(1);
    });
    expect(reportFailure).toHaveBeenCalledWith(
      "silly_os.browser_pi_adapter_unavailable",
      expect.any(Error),
    );
    expect(deterministicHostHarnessV1.created).toBe(1);

    unmount();
  });

  it("moves the failure fence with the Program scope and retries only by explicit choice", async () => {
    const firstFailure = vi.fn();
    const secondFailure = vi.fn();
    const drainRegistry = {
      isAccepting: () => true,
      register: () => () => undefined,
    };
    const { result, rerender, unmount } = renderHook(
      (
        { scopeKey, reportFailure }: {
          readonly scopeKey: string;
          readonly reportFailure: (code: string, error: unknown) => void;
        },
      ) =>
        useProgramAgentProviderOwnerV1({
          workspaceAuthority: {} as never,
          programPackages: {} as never,
          programModelSelectionContext: {
            scopeKey,
            recommendedModelPatterns: ["*deepseek-v4-flash*"],
          },
          agentDrainRegistry: drainRegistry,
          resetProductPreferences: () => undefined,
          reportFailure,
        }),
      { initialProps: { scopeKey: "program.scope.a", reportFailure: firstFailure } },
    );
    await waitFor(() => expect(result.current.readiness.status).toBe("ready"));
    expect(deterministicHostHarnessV1.created).toBe(1);
    expect(deterministicHostHarnessV1.selections).toEqual([providerSelectionV1]);

    rerender({ scopeKey: "program.scope.b", reportFailure: firstFailure });
    await waitFor(() => expect(result.current.readiness.status).toBe("ready"));
    expect(deterministicHostHarnessV1.created).toBe(1);

    act(() => deterministicHostHarnessV1.connectionLostCallbacks[0]?.());
    await waitFor(() => expect(result.current.readiness.status).toBe("agent_failed"));
    expect(deterministicHostHarnessV1.created).toBe(1);
    rerender({ scopeKey: "program.scope.b", reportFailure: secondFailure });
    await act(async () => await Promise.resolve());
    expect(deterministicHostHarnessV1.created).toBe(1);

    const model = result.current.providerModel("home");
    act(() => model.onSelect(model.options[0]!.value));
    await waitFor(() => expect(result.current.readiness.status).toBe("ready"));
    expect(deterministicHostHarnessV1.created).toBe(2);

    unmount();
  });
});

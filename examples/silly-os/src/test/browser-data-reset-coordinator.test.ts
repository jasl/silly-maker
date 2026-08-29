// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";

import {
  browserDataResetStorageKeyV1,
  createBrowserDataResetCoordinatorV1,
  runBrowserDataResetOperationV1,
  subscribeBrowserDataResetRemoteV1,
  type BrowserDataResetStorageEventTargetV1,
} from "../product/browser-data-reset-coordinator.ts";

class MemoryStorageV1 implements Storage {
  readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class StorageEventTargetV1 implements BrowserDataResetStorageEventTargetV1 {
  readonly listeners = new Set<(event: StorageEvent) => void>();

  addEventListener(_type: "storage", listener: (event: StorageEvent) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: "storage", listener: (event: StorageEvent) => void): void {
    this.listeners.delete(listener);
  }

  dispatch(event: StorageEvent): void {
    for (const listener of [...this.listeners]) listener(event);
  }
}

function storageEventV1(input: {
  readonly key: string;
  readonly newValue: string;
  readonly storageArea: Storage;
}): StorageEvent {
  return input as StorageEvent;
}

describe("Browser data reset coordinator V1", () => {
  it("persists only one bounded invalidation intent", () => {
    const storage = new MemoryStorageV1();
    storage.setItem("sillyos.unrelated", "preserve-me");
    const coordinator = createBrowserDataResetCoordinatorV1({
      storage,
      eventTarget: new StorageEventTargetV1(),
      createResetId: () => "reset.local.test-1",
      now: () => 123,
    });

    expect(coordinator.publish()).toEqual({
      revision: 1,
      resetId: "reset.local.test-1",
      requestedAt: 123,
    });
    expect(JSON.parse(storage.getItem(browserDataResetStorageKeyV1) ?? "null")).toEqual({
      revision: 1,
      resetId: "reset.local.test-1",
      requestedAt: 123,
    });
    expect(storage.getItem("sillyos.unrelated")).toBe("preserve-me");
    expect(storage.getItem(browserDataResetStorageKeyV1)).not.toContain("program");
    expect(storage.getItem(browserDataResetStorageKeyV1)).not.toContain("credential");
    expect(storage.getItem(browserDataResetStorageKeyV1)).not.toContain("workspaceId");
  });

  it("delivers a valid other-tab storage event once and ignores malformed or unrelated state", () => {
    const storage = new MemoryStorageV1();
    const eventTarget = new StorageEventTargetV1();
    const listener = vi.fn();
    const coordinator = createBrowserDataResetCoordinatorV1({
      storage,
      eventTarget,
      createResetId: () => "reset.local.publisher",
      now: () => 1,
    });
    const unsubscribe = coordinator.subscribe(listener);
    const valid = JSON.stringify({
      revision: 1,
      resetId: "reset.local.remote",
      requestedAt: 2,
    });

    eventTarget.dispatch(storageEventV1({
      key: "sillyos.unrelated",
      newValue: valid,
      storageArea: storage,
    }));
    eventTarget.dispatch(storageEventV1({
      key: browserDataResetStorageKeyV1,
      newValue: "not-json",
      storageArea: storage,
    }));
    eventTarget.dispatch(storageEventV1({
      key: browserDataResetStorageKeyV1,
      newValue: JSON.stringify({
        revision: 1,
        resetId: "reset.local.remote",
        requestedAt: 2,
        program: "must-not-be-admitted",
      }),
      storageArea: storage,
    }));
    eventTarget.dispatch(storageEventV1({
      key: browserDataResetStorageKeyV1,
      newValue: valid,
      storageArea: storage,
    }));
    eventTarget.dispatch(storageEventV1({
      key: browserDataResetStorageKeyV1,
      newValue: valid,
      storageArea: storage,
    }));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      revision: 1,
      resetId: "reset.local.remote",
      requestedAt: 2,
    });
    unsubscribe();
    expect(eventTarget.listeners.size).toBe(0);
  });

  it("does not notify the publishing tab because publication is storage-only", () => {
    const listener = vi.fn();
    const coordinator = createBrowserDataResetCoordinatorV1({
      storage: new MemoryStorageV1(),
      eventTarget: new StorageEventTargetV1(),
      createResetId: () => "reset.local.self",
      now: () => 3,
    });
    coordinator.subscribe(listener);

    coordinator.publish();

    expect(listener).not.toHaveBeenCalled();
  });

  it("revokes and reloads once for valid remote state, not malformed, duplicate, or wrong-key events", () => {
    const storage = new MemoryStorageV1();
    const eventTarget = new StorageEventTargetV1();
    const revokeCredential = vi.fn();
    const reloadHome = vi.fn();
    const coordinator = createBrowserDataResetCoordinatorV1({ storage, eventTarget });
    subscribeBrowserDataResetRemoteV1({
      coordinator,
      isLocalResetPending: () => false,
      isAccepting: () => true,
      onRemoteReset: () => {
        revokeCredential();
        reloadHome();
      },
    });
    const valid = JSON.stringify({
      revision: 1,
      resetId: "reset.remote.accepted",
      requestedAt: 10,
    });

    eventTarget.dispatch(storageEventV1({
      key: "sillyos.wrong-key",
      newValue: valid,
      storageArea: storage,
    }));
    eventTarget.dispatch(storageEventV1({
      key: browserDataResetStorageKeyV1,
      newValue: "malformed",
      storageArea: storage,
    }));
    eventTarget.dispatch(storageEventV1({
      key: browserDataResetStorageKeyV1,
      newValue: valid,
      storageArea: storage,
    }));
    eventTarget.dispatch(storageEventV1({
      key: browserDataResetStorageKeyV1,
      newValue: valid,
      storageArea: storage,
    }));
    eventTarget.dispatch(storageEventV1({
      key: browserDataResetStorageKeyV1,
      newValue: JSON.stringify({
        revision: 1,
        resetId: "reset.remote.second-valid-intent",
        requestedAt: 11,
      }),
      storageArea: storage,
    }));

    expect(revokeCredential).toHaveBeenCalledOnce();
    expect(reloadHome).toHaveBeenCalledOnce();
  });

  it("does not create a reload storm while this tab is clearing locally", () => {
    const storage = new MemoryStorageV1();
    const eventTarget = new StorageEventTargetV1();
    let localResetPending = true;
    const onRemoteReset = vi.fn();
    const coordinator = createBrowserDataResetCoordinatorV1({
      storage,
      eventTarget,
      createResetId: () => "reset.local.active",
      now: () => 20,
    });
    subscribeBrowserDataResetRemoteV1({
      coordinator,
      isLocalResetPending: () => localResetPending,
      isAccepting: () => true,
      onRemoteReset,
    });

    coordinator.publish();
    eventTarget.dispatch(storageEventV1({
      key: browserDataResetStorageKeyV1,
      newValue: JSON.stringify({
        revision: 1,
        resetId: "reset.remote.during-local",
        requestedAt: 21,
      }),
      storageArea: storage,
    }));
    expect(onRemoteReset).not.toHaveBeenCalled();

    localResetPending = false;
    eventTarget.dispatch(storageEventV1({
      key: browserDataResetStorageKeyV1,
      newValue: JSON.stringify({
        revision: 1,
        resetId: "reset.remote.after-local",
        requestedAt: 22,
      }),
      storageArea: storage,
    }));
    eventTarget.dispatch(storageEventV1({
      key: browserDataResetStorageKeyV1,
      newValue: JSON.stringify({
        revision: 1,
        resetId: "reset.remote.after-local-again",
        requestedAt: 23,
      }),
      storageArea: storage,
    }));
    expect(onRemoteReset).toHaveBeenCalledOnce();
  });

  it("publishes before revocation and every owned reset authority", async () => {
    const order: string[] = [];
    const coordinator = {
      publish: () => {
        order.push("publish");
        return { revision: 1 as const, resetId: "reset.local.order", requestedAt: 30 };
      },
      subscribe: () => () => undefined,
    };

    const results = await runBrowserDataResetOperationV1({
      coordinator,
      reportCoordinationFailure: vi.fn(),
      revokeLocalCapabilities: () => {
        order.push("revoke");
      },
      awaitSettledOperations: async () => {
        order.push("settled");
      },
      resetProductWorkspace: async () => {
        order.push("product");
        order.push("workspace");
        return "product-workspace-cleared";
      },
      resetCredentialVault: async () => {
        order.push("vault");
        return "vault-cleared";
      },
      resetProviderSettings: async () => {
        order.push("provider-settings");
      },
    });

    expect(order[0]).toBe("publish");
    expect(order.indexOf("publish")).toBeLessThan(order.indexOf("product"));
    expect(order.indexOf("publish")).toBeLessThan(order.indexOf("workspace"));
    expect(order.indexOf("publish")).toBeLessThan(order.indexOf("vault"));
    expect(order.slice(0, 3)).toEqual(["publish", "revoke", "settled"]);
    expect(results.every((result) => result.status === "fulfilled")).toBe(true);
  });
});

// SPDX-License-Identifier: MIT

import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import { createCredentialVaultClientV2 } from "../credential/credential-vault-client.ts";
import type { CredentialVaultBindingV2 } from "../credential/credential-vault-contracts.ts";
import {
  admitCredentialVaultHandoffDeliveryV2,
  createCredentialVaultHandoffReadyV2,
} from "../credential/credential-vault-protocol.ts";
import { createCredentialVaultWorkerRuntimeV2 } from "../credential/credential-vault-runtime.ts";
import {
  createIndexedDbCredentialVaultV2,
  credentialVaultCredentialObjectStoreNameV2,
  credentialVaultHeaderObjectStoreNameV2,
} from "../credential/indexeddb-credential-vault.ts";

const channelsV2: MessageChannel[] = [];
const disposablesV2: { close(): void }[] = [];
const runtimesV2: { dispose(): void }[] = [];

afterEach(() => {
  for (const disposable of disposablesV2.splice(0)) disposable.close();
  for (const runtime of runtimesV2.splice(0)) runtime.dispose();
  for (const channel of channelsV2.splice(0)) {
    channel.port1.close();
    channel.port2.close();
  }
});

const bindingV2: CredentialVaultBindingV2 = {
  bindingId: "builtin:anthropic",
  credentialKind: "api_key",
  baseUrl: "https://api.anthropic.com/v1",
};

function connectVaultV2(indexedDB: IDBFactory, databaseName: string) {
  const repository = createIndexedDbCredentialVaultV2({ indexedDB, databaseName });
  const control = new MessageChannel();
  channelsV2.push(control);
  const responses: unknown[] = [];
  const runtime = createCredentialVaultWorkerRuntimeV2({
    repository,
    cryptoApi: crypto,
    handoffReadyDeadlineMilliseconds: 100,
    postMessage(message): void {
      responses.push(message);
      control.port2.postMessage(message);
    },
  });
  control.port2.addEventListener("message", (event) => runtime.receive(event.data, event.ports));
  control.port2.start();
  let requestOrdinal = 0;
  const client = createCredentialVaultClientV2(control.port1, {
    createRequestId: () => `request.${String(++requestOrdinal)}`,
    deadlineMilliseconds: 2_000,
  });
  disposablesV2.push(client);
  runtimesV2.push(runtime);
  return {
    client,
    responses,
    close: () => {
      client.close();
      runtime.dispose();
    },
  };
}

function onceMessageV2(port: MessagePort): Promise<unknown> {
  return new Promise((resolve) => {
    port.addEventListener("message", (event) => resolve(event.data), { once: true });
    port.start();
  });
}

async function handoffValueV2(
  client: ReturnType<typeof connectVaultV2>["client"],
  handoffId: string,
): Promise<string | null> {
  const delivery = new MessageChannel();
  channelsV2.push(delivery);
  const delivered = onceMessageV2(delivery.port2);
  const handoff = client.handoff(bindingV2, handoffId, delivery.port1);
  delivery.port2.postMessage(createCredentialVaultHandoffReadyV2(handoffId, bindingV2));
  const message = admitCredentialVaultHandoffDeliveryV2(await delivered);
  await handoff;
  return message?.credential.value ?? null;
}

function collectArrayBuffersV2(value: unknown, output: ArrayBuffer[] = []): readonly ArrayBuffer[] {
  if (value instanceof ArrayBuffer) {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectArrayBuffersV2(entry, output);
    return output;
  }
  if (value !== null && typeof value === "object") {
    for (const entry of Object.values(value)) collectArrayBuffersV2(entry, output);
  }
  return output;
}

function bufferContainsV2(buffer: ArrayBuffer, needle: Uint8Array): boolean {
  const haystack = new Uint8Array(buffer);
  outer: for (let offset = 0; offset + needle.byteLength <= haystack.byteLength; offset += 1) {
    for (let index = 0; index < needle.byteLength; index += 1) {
      if (haystack[offset + index] !== needle[index]) continue outer;
    }
    return true;
  }
  return false;
}

function requestResultV2<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

describe("Credential Vault runtime and client V2", () => {
  it("automatically creates and cold-reopens an unlocked device Vault", async () => {
    const indexedDB = new IDBFactory();
    const first = connectVaultV2(indexedDB, "credential-v2.device-reopen");
    await expect(first.client.initialize()).resolves.toEqual({
      revision: 2,
      protection: "device",
      state: "unlocked",
      bindings: [],
    });
    await first.client.upsert(bindingV2, "provider-secret");
    first.close();

    const reopened = connectVaultV2(indexedDB, "credential-v2.device-reopen");
    await expect(reopened.client.initialize()).resolves.toEqual({
      revision: 2,
      protection: "device",
      state: "unlocked",
      bindings: [bindingV2],
    });
    await expect(handoffValueV2(reopened.client, "handoff.device-reopen")).resolves.toBe(
      "provider-secret",
    );
    expect("read" in reopened.client).toBe(false);
    expect("getCredential" in reopened.client).toBe(false);
    expect("create" in reopened.client).toBe(false);
  });

  it("rewraps device credentials under a password, locks, and unlocks after cold reopen", async () => {
    const indexedDB = new IDBFactory();
    const first = connectVaultV2(indexedDB, "credential-v2.password-reopen");
    await first.client.initialize();
    await first.client.upsert(bindingV2, "provider-secret");
    await expect(first.client.setPassword("correct passphrase")).resolves.toMatchObject({
      protection: "password",
      state: "unlocked",
      bindings: [bindingV2],
    });
    await expect(handoffValueV2(first.client, "handoff.password-live")).resolves.toBe(
      "provider-secret",
    );
    await expect(first.client.lock()).resolves.toMatchObject({
      protection: "password",
      state: "locked",
    });
    first.close();

    const reopened = connectVaultV2(indexedDB, "credential-v2.password-reopen");
    await expect(reopened.client.initialize()).resolves.toMatchObject({
      protection: "password",
      state: "locked",
      bindings: [bindingV2],
    });
    await expect(reopened.client.unlock("wrong passphrase")).rejects.toMatchObject({
      code: "invalid_passphrase",
    });
    await expect(reopened.client.unlock("correct passphrase")).resolves.toMatchObject({
      protection: "password",
      state: "unlocked",
    });
    await expect(handoffValueV2(reopened.client, "handoff.password-reopen")).resolves.toBe(
      "provider-secret",
    );
  });

  it("rewraps password credentials back to automatic device protection across reopen", async () => {
    const indexedDB = new IDBFactory();
    const first = connectVaultV2(indexedDB, "credential-v2.use-device");
    await first.client.initialize();
    await first.client.upsert(bindingV2, "provider-secret");
    await first.client.setPassword("correct passphrase");
    await expect(first.client.useDevice()).resolves.toMatchObject({
      protection: "device",
      state: "unlocked",
      bindings: [bindingV2],
    });
    first.close();

    const reopened = connectVaultV2(indexedDB, "credential-v2.use-device");
    await expect(reopened.client.initialize()).resolves.toMatchObject({
      protection: "device",
      state: "unlocked",
    });
    await expect(handoffValueV2(reopened.client, "handoff.use-device")).resolves.toBe(
      "provider-secret",
    );
  });

  it("rejects a stale cross-page upsert after protection changes and preserves the current key", async () => {
    const indexedDB = new IDBFactory();
    const current = connectVaultV2(indexedDB, "credential-v2.cross-page-upsert");
    const stale = connectVaultV2(indexedDB, "credential-v2.cross-page-upsert");
    await current.client.initialize();
    await current.client.upsert(bindingV2, "provider-secret");
    await stale.client.initialize();

    await current.client.setPassword("current password");
    await expect(stale.client.upsert(bindingV2, "stale replacement")).rejects.toMatchObject({
      code: "invalid_state",
    });
    await expect(handoffValueV2(current.client, "handoff.cross-page.current")).resolves.toBe(
      "provider-secret",
    );
    await expect(stale.client.list()).resolves.toMatchObject({
      protection: "password",
      state: "locked",
    });
  });

  it("rejects a stale cross-page handoff while the current page still delivers", async () => {
    const indexedDB = new IDBFactory();
    const current = connectVaultV2(indexedDB, "credential-v2.cross-page-handoff");
    const stale = connectVaultV2(indexedDB, "credential-v2.cross-page-handoff");
    await current.client.initialize();
    await current.client.upsert(bindingV2, "provider-secret");
    await stale.client.initialize();
    await current.client.setPassword("current password");

    const delivery = new MessageChannel();
    channelsV2.push(delivery);
    const staleHandoff = stale.client.handoff(
      bindingV2,
      "handoff.cross-page.stale",
      delivery.port1,
    );
    delivery.port2.postMessage(
      createCredentialVaultHandoffReadyV2("handoff.cross-page.stale", bindingV2),
    );
    await expect(staleHandoff).rejects.toMatchObject({ code: "invalid_state" });
    await expect(handoffValueV2(current.client, "handoff.cross-page.current")).resolves.toBe(
      "provider-secret",
    );
  });

  it("invalidates pending handoffs on password lock and rejects reused handoff IDs", async () => {
    const indexedDB = new IDBFactory();
    const { client } = connectVaultV2(indexedDB, "credential-v2.currentness");
    await client.initialize();
    await client.upsert(bindingV2, "provider-secret");
    await client.setPassword("correct passphrase");

    const pending = new MessageChannel();
    channelsV2.push(pending);
    const pendingHandoff = client.handoff(bindingV2, "handoff.pending", pending.port1);
    const pendingSettlement = expect(pendingHandoff).rejects.toMatchObject({ code: "locked" });
    await client.lock();
    await pendingSettlement;
    await client.unlock("correct passphrase");
    const duplicate = new MessageChannel();
    channelsV2.push(duplicate);
    await expect(client.handoff(bindingV2, "handoff.pending", duplicate.port1)).rejects
      .toMatchObject({
        code: "handoff_failed",
      });
  });

  it("resets Automatic state and invalidates a pending handoff without key readback", async () => {
    const indexedDB = new IDBFactory();
    const { client, responses } = connectVaultV2(indexedDB, "credential-v2.reset-device");
    await client.initialize();
    await client.upsert(bindingV2, "provider-secret");

    const pending = new MessageChannel();
    channelsV2.push(pending);
    const pendingHandoff = client.handoff(bindingV2, "handoff.reset.pending", pending.port1);
    const pendingSettlement = expect(pendingHandoff).rejects.toMatchObject({ code: "locked" });
    await expect(client.reset()).resolves.toEqual({
      revision: 2,
      protection: "device",
      state: "unlocked",
      bindings: [],
    });
    await pendingSettlement;

    const missing = new MessageChannel();
    channelsV2.push(missing);
    const missingHandoff = client.handoff(bindingV2, "handoff.reset.missing", missing.port1);
    missing.port2.postMessage(
      createCredentialVaultHandoffReadyV2("handoff.reset.missing", bindingV2),
    );
    await expect(missingHandoff).rejects.toMatchObject({ code: "binding_missing" });
    expect(JSON.stringify(responses)).not.toContain("provider-secret");

    const reopened = connectVaultV2(indexedDB, "credential-v2.reset-device");
    await expect(reopened.client.initialize()).resolves.toEqual({
      revision: 2,
      protection: "device",
      state: "unlocked",
      bindings: [],
    });
  });

  it("resets a locked Password Vault without the passphrase and fences a stale Worker", async () => {
    const indexedDB = new IDBFactory();
    const current = connectVaultV2(indexedDB, "credential-v2.reset-password");
    const stale = connectVaultV2(indexedDB, "credential-v2.reset-password");
    await current.client.initialize();
    await current.client.upsert(bindingV2, "provider-secret");
    await stale.client.initialize();
    await current.client.setPassword("correct passphrase");
    await current.client.lock();

    await expect(current.client.reset()).resolves.toEqual({
      revision: 2,
      protection: "device",
      state: "unlocked",
      bindings: [],
    });
    await expect(stale.client.upsert(bindingV2, "stale replacement")).rejects.toMatchObject({
      code: "invalid_state",
    });
    await expect(stale.client.list()).resolves.toEqual({
      revision: 2,
      protection: "device",
      state: "unlocked",
      bindings: [],
    });

    const database = await requestResultV2(indexedDB.open("credential-v2.reset-password"));
    const transaction = database.transaction([
      credentialVaultHeaderObjectStoreNameV2,
      credentialVaultCredentialObjectStoreNameV2,
    ], "readonly");
    const [headers, credentials] = await Promise.all([
      requestResultV2(
        transaction.objectStore(credentialVaultHeaderObjectStoreNameV2).getAll(),
      ),
      requestResultV2(
        transaction.objectStore(credentialVaultCredentialObjectStoreNameV2).getAll(),
      ),
    ]);
    expect(headers).toHaveLength(1);
    expect(headers[0]).toMatchObject({ protection: "device" });
    expect(headers[0]).not.toHaveProperty("salt");
    expect(headers[0]).not.toHaveProperty("kdf");
    expect(headers[0]).not.toHaveProperty("iterations");
    expect(credentials).toEqual([]);
    database.close();

    const reopened = connectVaultV2(indexedDB, "credential-v2.reset-password");
    await expect(reopened.client.initialize()).resolves.toEqual({
      revision: 2,
      protection: "device",
      state: "unlocked",
      bindings: [],
    });
  });

  it("keeps only bounded recent handoff IDs without exhausting a long-lived Worker", async () => {
    const indexedDB = new IDBFactory();
    const { client } = connectVaultV2(indexedDB, "credential-v2.handoff-history");
    await client.initialize();
    await client.upsert(bindingV2, "provider-secret");

    for (let index = 0; index < 260; index += 1) {
      await expect(handoffValueV2(client, `handoff.history.${String(index)}`)).resolves.toBe(
        "provider-secret",
      );
    }

    const recentReplay = new MessageChannel();
    channelsV2.push(recentReplay);
    await expect(
      client.handoff(bindingV2, "handoff.history.259", recentReplay.port1),
    ).rejects.toMatchObject({ code: "handoff_failed" });
    await expect(handoffValueV2(client, "handoff.history.0")).resolves.toBe("provider-secret");
  });

  it("stores no passphrase or API key plaintext outside the one-shot handoff", async () => {
    const indexedDB = new IDBFactory();
    const { client, responses } = connectVaultV2(indexedDB, "credential-v2.no-plaintext");
    await client.initialize();
    await client.upsert(bindingV2, "provider-secret");
    await client.setPassword("correct passphrase");
    expect(JSON.stringify(responses)).not.toContain("provider-secret");
    expect(JSON.stringify(responses)).not.toContain("correct passphrase");

    const database = await requestResultV2(indexedDB.open("credential-v2.no-plaintext"));
    const transaction = database.transaction(["vault", "credentials"], "readonly");
    const rawRows = await Promise.all([
      requestResultV2(transaction.objectStore("vault").getAll()),
      requestResultV2(transaction.objectStore("credentials").getAll()),
    ]);
    const raw = JSON.stringify(rawRows);
    expect(raw).not.toContain("correct passphrase");
    expect(raw).not.toContain("provider-secret");
    const needles = [
      new TextEncoder().encode("correct passphrase"),
      new TextEncoder().encode("provider-secret"),
    ];
    for (const buffer of collectArrayBuffersV2(rawRows)) {
      for (const needle of needles) expect(bufferContainsV2(buffer, needle)).toBe(false);
    }
    database.close();
  });
});

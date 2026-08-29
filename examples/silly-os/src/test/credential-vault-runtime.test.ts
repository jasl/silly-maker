// SPDX-License-Identifier: MIT

import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";

import { createCredentialVaultClientV1 } from "../credential/credential-vault-client.ts";
import type { CredentialVaultBindingV1 } from "../credential/credential-vault-contracts.ts";
import {
  admitCredentialVaultHandoffDeliveryV1,
  createCredentialVaultHandoffReadyV1,
} from "../credential/credential-vault-protocol.ts";
import { createCredentialVaultWorkerRuntimeV1 } from "../credential/credential-vault-runtime.ts";
import { createIndexedDbCredentialVaultV1 } from "../credential/indexeddb-credential-vault.ts";

const channelsV1: MessageChannel[] = [];
const disposablesV1: { close(): void }[] = [];
const runtimesV1: { dispose(): void }[] = [];

afterEach(() => {
  for (const disposable of disposablesV1.splice(0)) disposable.close();
  for (const runtime of runtimesV1.splice(0)) runtime.dispose();
  for (const channel of channelsV1.splice(0)) {
    channel.port1.close();
    channel.port2.close();
  }
});

const bindingV1: CredentialVaultBindingV1 = {
  bindingId: "builtin.anthropic",
  credentialKind: "api_key",
  baseUrl: "https://api.anthropic.com/v1",
};

function connectVaultV1(databaseName: string) {
  const indexedDB = new IDBFactory();
  const repository = createIndexedDbCredentialVaultV1({ indexedDB, databaseName });
  const control = new MessageChannel();
  channelsV1.push(control);
  const responses: unknown[] = [];
  const runtime = createCredentialVaultWorkerRuntimeV1({
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
  const requestIds = Array.from({ length: 32 }, (_, index) => `request.${String(index + 1)}`);
  const client = createCredentialVaultClientV1(control.port1, {
    createRequestId: () => requestIds.shift() ?? "request.fallback",
    deadlineMilliseconds: 2_000,
  });
  disposablesV1.push(client);
  runtimesV1.push(runtime);
  return { client, indexedDB, responses };
}

function onceMessageV1(port: MessagePort): Promise<unknown> {
  return new Promise((resolve) => {
    port.addEventListener("message", (event) => resolve(event.data), { once: true });
    port.start();
  });
}

function collectArrayBuffersV1(value: unknown, output: ArrayBuffer[] = []): readonly ArrayBuffer[] {
  if (value instanceof ArrayBuffer) {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectArrayBuffersV1(entry, output);
    return output;
  }
  if (value !== null && typeof value === "object") {
    for (const entry of Object.values(value)) collectArrayBuffersV1(entry, output);
  }
  return output;
}

function bufferContainsV1(buffer: ArrayBuffer, needle: Uint8Array): boolean {
  const haystack = new Uint8Array(buffer);
  outer: for (let offset = 0; offset + needle.byteLength <= haystack.byteLength; offset += 1) {
    for (let index = 0; index < needle.byteLength; index += 1) {
      if (haystack[offset + index] !== needle[index]) continue outer;
    }
    return true;
  }
  return false;
}

describe("Credential Vault runtime and client V1", () => {
  it("remains absent until explicit create and never exposes a generic key read", async () => {
    const { client } = connectVaultV1("credential-runtime.absent");
    await expect(client.list()).resolves.toEqual({
      revision: 1,
      state: "absent",
      bindings: [],
    });
    expect("read" in client).toBe(false);
    expect("getCredential" in client).toBe(false);
  });

  it("creates, locks, unlocks, replaces, and directly hands one key to an exact Agent port", async () => {
    const { client, indexedDB, responses } = connectVaultV1("credential-runtime.lifecycle");
    await expect(client.create("correct passphrase")).resolves.toMatchObject({
      state: "unlocked",
      bindings: [],
    });
    await expect(client.upsert(bindingV1, "provider-secret-v1")).resolves.toMatchObject({
      disposition: "created",
      binding: bindingV1,
    });
    await expect(client.upsert(bindingV1, "provider-secret-v2")).resolves.toMatchObject({
      disposition: "replaced",
    });
    await client.lock();
    await expect(client.list()).resolves.toMatchObject({ state: "locked", bindings: [bindingV1] });
    await expect(client.unlock("wrong passphrase")).rejects.toMatchObject({
      code: "invalid_passphrase",
    });
    await expect(client.unlock("correct passphrase")).resolves.toMatchObject({
      state: "unlocked",
      bindings: [bindingV1],
    });

    const delivery = new MessageChannel();
    channelsV1.push(delivery);
    const delivered = onceMessageV1(delivery.port2);
    const handoff = client.handoff(bindingV1, "handoff.1", delivery.port1);
    delivery.port2.postMessage(createCredentialVaultHandoffReadyV1("handoff.1", bindingV1));
    const message = admitCredentialVaultHandoffDeliveryV1(await delivered);
    expect(message).toMatchObject({
      handoffId: "handoff.1",
      binding: bindingV1,
      credential: { kind: "api_key", value: "provider-secret-v2" },
    });
    await expect(handoff).resolves.toBeUndefined();

    const duplicate = new MessageChannel();
    channelsV1.push(duplicate);
    await expect(client.handoff(bindingV1, "handoff.1", duplicate.port1)).rejects.toMatchObject({
      code: "handoff_failed",
    });

    expect(JSON.stringify(responses)).not.toContain("provider-secret-v1");
    expect(JSON.stringify(responses)).not.toContain("provider-secret-v2");
    const open = indexedDB.open("credential-runtime.lifecycle");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      open.addEventListener("success", () => resolve(open.result), { once: true });
      open.addEventListener("error", () => reject(open.error), { once: true });
    });
    const transaction = database.transaction(["vault", "credentials"], "readonly");
    const rawRows = await Promise.all([
      new Promise<unknown>((resolve, reject) => {
        const request = transaction.objectStore("vault").getAll();
        request.addEventListener("success", () => resolve(request.result), { once: true });
        request.addEventListener("error", () => reject(request.error), { once: true });
      }),
      new Promise<unknown>((resolve, reject) => {
        const request = transaction.objectStore("credentials").getAll();
        request.addEventListener("success", () => resolve(request.result), { once: true });
        request.addEventListener("error", () => reject(request.error), { once: true });
      }),
    ]);
    const raw = JSON.stringify(rawRows);
    expect(raw).not.toContain("correct passphrase");
    expect(raw).not.toContain("provider-secret");
    const plaintextNeedles = [
      new TextEncoder().encode("correct passphrase"),
      new TextEncoder().encode("provider-secret-v1"),
      new TextEncoder().encode("provider-secret-v2"),
    ];
    for (const buffer of collectArrayBuffersV1(rawRows)) {
      for (const needle of plaintextNeedles) expect(bufferContainsV1(buffer, needle)).toBe(false);
    }
    database.close();
  });

  it("requires the exact ready binding and lock invalidates a pending handoff", async () => {
    const { client } = connectVaultV1("credential-runtime.currentness");
    await client.create("correct passphrase");
    await client.upsert(bindingV1, "provider-secret");

    const wrong = new MessageChannel();
    channelsV1.push(wrong);
    const wrongHandoff = client.handoff(bindingV1, "handoff.1", wrong.port1);
    wrong.port2.postMessage(createCredentialVaultHandoffReadyV1("handoff.1", {
      ...bindingV1,
      baseUrl: "https://api.anthropic.com/v2",
    }));
    await expect(wrongHandoff).rejects.toMatchObject({ code: "handoff_failed" });

    const pending = new MessageChannel();
    channelsV1.push(pending);
    const pendingHandoff = client.handoff(bindingV1, "handoff.2", pending.port1);
    await client.lock();
    await expect(pendingHandoff).rejects.toMatchObject({ code: "locked" });
    const locked = new MessageChannel();
    channelsV1.push(locked);
    await expect(client.handoff(bindingV1, "handoff.3", locked.port1)).rejects.toMatchObject({
      code: "locked",
    });
  });

  it("rejects a ready record carrying an unexpected transferred port", async () => {
    const { client } = connectVaultV1("credential-runtime.handoff-extra-port");
    await client.create("correct passphrase");
    await client.upsert(bindingV1, "provider-secret");

    const delivery = new MessageChannel();
    const unexpected = new MessageChannel();
    channelsV1.push(delivery, unexpected);
    const handoff = client.handoff(bindingV1, "handoff.extra-port", delivery.port1);
    delivery.port2.postMessage(
      createCredentialVaultHandoffReadyV1("handoff.extra-port", bindingV1),
      [unexpected.port1],
    );

    await expect(handoff).rejects.toMatchObject({ code: "handoff_failed" });
  });

  it("requires Forget before reusing one binding identity with a different endpoint", async () => {
    const { client } = connectVaultV1("credential-runtime.rebind");
    await client.create("correct passphrase");
    await client.upsert(bindingV1, "provider-secret");
    const rebound = { ...bindingV1, baseUrl: "https://api.anthropic.com/v2" };
    await expect(client.upsert(rebound, "new-secret")).rejects.toMatchObject({
      code: "binding_conflict",
    });
    await expect(client.forget(bindingV1)).resolves.toBe(true);
    await expect(client.upsert(rebound, "new-secret")).resolves.toMatchObject({
      disposition: "created",
      binding: rebound,
    });
  });
});

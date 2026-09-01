// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitCredentialVaultBindingV2,
  admitCredentialVaultListV2,
  createCredentialVaultListV2,
  type CredentialVaultBindingV2,
} from "../credential/credential-vault-contracts.ts";
import {
  admitCredentialVaultHandoffDeliveryV2,
  admitCredentialVaultHandoffReadyV2,
  admitCredentialVaultWorkerRequestEnvelopeV2,
  admitCredentialVaultWorkerResponseEnvelopeV2,
  createCredentialVaultHandoffDeliveryV2,
  createCredentialVaultHandoffReadyV2,
  createCredentialVaultWorkerRequestEnvelopeV2,
  createCredentialVaultWorkerResponseEnvelopeV2,
} from "../credential/credential-vault-protocol.ts";

const bindingV2: CredentialVaultBindingV2 = {
  bindingId: "builtin.anthropic",
  credentialKind: "api_key",
  baseUrl: "https://api.anthropic.com/v1",
};

describe("Credential Vault contracts V2", () => {
  it("admits only exact canonical endpoint-bound metadata", () => {
    expect(admitCredentialVaultBindingV2(bindingV2)).toEqual({
      kind: "admitted",
      value: bindingV2,
    });
    for (
      const candidate of [
        { ...bindingV2, baseUrl: "https://api.anthropic.com/v1/" },
        { ...bindingV2, baseUrl: "http://api.anthropic.com/v1" },
        { ...bindingV2, baseUrl: "https://api.anthropic.com/v1?key=secret" },
        { ...bindingV2, credentialKind: "oauth" },
        { ...bindingV2, apiKey: "must-not-enter-metadata" },
      ]
    ) expect(admitCredentialVaultBindingV2(candidate).kind).toBe("rejected");
  });

  it("keeps sorted multi-binding metadata without a credential field or total-count limit", () => {
    const snapshot = createCredentialVaultListV2("password", "locked", [
      { ...bindingV2, bindingId: "custom.z" },
      { ...bindingV2, bindingId: "builtin.a" },
    ]);
    expect(snapshot.bindings.map((binding) => binding.bindingId)).toEqual([
      "builtin.a",
      "custom.z",
    ]);
    expect(JSON.stringify(snapshot)).not.toContain("apiKey");
    const longList = Array.from({ length: 257 }, (_, index) => ({
      ...bindingV2,
      bindingId: `binding.${String(index).padStart(3, "0")}`,
    }));
    expect(admitCredentialVaultListV2({
      revision: 2,
      protection: "password",
      state: "locked",
      bindings: longList,
    })).toMatchObject({ kind: "admitted", value: { bindings: longList } });
  });
});

describe("Credential Vault Worker protocol V2", () => {
  it("strictly admits each explicit request and rejects secret-bearing extras", () => {
    const setPassword = createCredentialVaultWorkerRequestEnvelopeV2("request.set-password", {
      method: "set_password",
      passphrase: "correct horse battery staple",
    });
    expect(admitCredentialVaultWorkerRequestEnvelopeV2(setPassword)).toEqual(setPassword);
    const reset = createCredentialVaultWorkerRequestEnvelopeV2("request.reset", {
      method: "reset",
    });
    expect(admitCredentialVaultWorkerRequestEnvelopeV2(reset)).toEqual(reset);
    const upsert = createCredentialVaultWorkerRequestEnvelopeV2("request.upsert", {
      method: "upsert",
      binding: bindingV2,
      credential: { kind: "api_key", value: "provider-secret" },
    });
    expect(admitCredentialVaultWorkerRequestEnvelopeV2(upsert)).toEqual(upsert);
    expect(admitCredentialVaultWorkerRequestEnvelopeV2({
      ...upsert,
      record: { ...upsert.record, endpointOverride: "https://evil.example" },
    })).toBeNull();
    expect(admitCredentialVaultWorkerRequestEnvelopeV2({
      revision: 2,
      kind: "credential_vault_request",
      requestId: "request.list",
      record: { method: "list", credential: "secret" },
    })).toBeNull();
    expect(admitCredentialVaultWorkerRequestEnvelopeV2({
      ...reset,
      record: { method: "reset", credential: "secret" },
    })).toBeNull();

    let reads = 0;
    const hostile = { method: "list" } as Record<string, unknown>;
    Object.defineProperty(hostile, "method", {
      enumerable: true,
      get() {
        reads += 1;
        return "list";
      },
    });
    expect(admitCredentialVaultWorkerRequestEnvelopeV2({
      revision: 2,
      kind: "credential_vault_request",
      requestId: "request.hostile",
      record: hostile,
    })).toBeNull();
    expect(reads).toBe(0);
  });

  it("keeps ordinary responses metadata-only", () => {
    const response = createCredentialVaultWorkerResponseEnvelopeV2("request.upsert", {
      kind: "success",
      method: "upsert",
      value: { disposition: "created", binding: bindingV2 },
    });
    expect(admitCredentialVaultWorkerResponseEnvelopeV2(response, "upsert")).toEqual(response);
    expect(JSON.stringify(response)).not.toContain("provider-secret");
    expect(admitCredentialVaultWorkerResponseEnvelopeV2({
      ...response,
      record: {
        ...response.record,
        value: { disposition: "created", binding: bindingV2, credential: "secret" },
      },
    }, "upsert")).toBeNull();

    const reset = createCredentialVaultWorkerResponseEnvelopeV2("request.reset", {
      kind: "success",
      method: "reset",
      value: createCredentialVaultListV2("device", "unlocked", []),
    });
    expect(admitCredentialVaultWorkerResponseEnvelopeV2(reset, "reset")).toEqual(reset);
    expect(JSON.stringify(reset)).not.toContain("provider-secret");
    expect(JSON.stringify(reset)).not.toContain("api_key");
  });

  it("uses a separate exact ready/delivery protocol for the one-time Agent port", () => {
    const ready = createCredentialVaultHandoffReadyV2("handoff.1", bindingV2);
    expect(admitCredentialVaultHandoffReadyV2(ready)).toEqual(ready);
    const delivery = createCredentialVaultHandoffDeliveryV2(
      "handoff.1",
      bindingV2,
      "provider-secret",
    );
    expect(admitCredentialVaultHandoffDeliveryV2(delivery)).toEqual(delivery);
    expect(admitCredentialVaultHandoffReadyV2({ ...ready, binding: { ...bindingV2, apiKey: "x" } }))
      .toBeNull();
    expect(admitCredentialVaultHandoffDeliveryV2({
      ...delivery,
      genericHeaders: { Authorization: "Bearer x" },
    })).toBeNull();
  });
});

// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";

import {
  admitCredentialVaultBindingV1,
  admitCredentialVaultListV1,
  createCredentialVaultListV1,
  credentialVaultMaximumBindingsV1,
  type CredentialVaultBindingV1,
} from "../credential/credential-vault-contracts.ts";
import {
  admitCredentialVaultHandoffDeliveryV1,
  admitCredentialVaultHandoffReadyV1,
  admitCredentialVaultWorkerRequestEnvelopeV1,
  admitCredentialVaultWorkerResponseEnvelopeV1,
  createCredentialVaultHandoffDeliveryV1,
  createCredentialVaultHandoffReadyV1,
  createCredentialVaultWorkerRequestEnvelopeV1,
  createCredentialVaultWorkerResponseEnvelopeV1,
} from "../credential/credential-vault-protocol.ts";

const bindingV1: CredentialVaultBindingV1 = {
  bindingId: "builtin.anthropic",
  credentialKind: "api_key",
  baseUrl: "https://api.anthropic.com/v1",
};

describe("Credential Vault contracts V1", () => {
  it("admits only exact canonical endpoint-bound metadata", () => {
    expect(admitCredentialVaultBindingV1(bindingV1)).toEqual({
      kind: "admitted",
      value: bindingV1,
    });
    for (
      const candidate of [
        { ...bindingV1, baseUrl: "https://api.anthropic.com/v1/" },
        { ...bindingV1, baseUrl: "http://api.anthropic.com/v1" },
        { ...bindingV1, baseUrl: "https://api.anthropic.com/v1?key=secret" },
        { ...bindingV1, credentialKind: "oauth" },
        { ...bindingV1, apiKey: "must-not-enter-metadata" },
      ]
    ) expect(admitCredentialVaultBindingV1(candidate).kind).toBe("rejected");
  });

  it("keeps bounded sorted multi-binding metadata without a credential field", () => {
    const snapshot = createCredentialVaultListV1("locked", [
      { ...bindingV1, bindingId: "custom.z" },
      { ...bindingV1, bindingId: "builtin.a" },
    ]);
    expect(snapshot.bindings.map((binding) => binding.bindingId)).toEqual([
      "builtin.a",
      "custom.z",
    ]);
    expect(JSON.stringify(snapshot)).not.toContain("apiKey");
    expect(
      admitCredentialVaultListV1({
        revision: 1,
        state: "locked",
        bindings: Array.from({ length: credentialVaultMaximumBindingsV1 + 1 }, (_, index) => ({
          ...bindingV1,
          bindingId: `binding.${String(index).padStart(3, "0")}`,
        })),
      }).kind,
    ).toBe("rejected");
  });
});

describe("Credential Vault Worker protocol V1", () => {
  it("strictly admits each explicit request and rejects secret-bearing extras", () => {
    const create = createCredentialVaultWorkerRequestEnvelopeV1("request.create", {
      method: "create",
      passphrase: "correct horse battery staple",
    });
    expect(admitCredentialVaultWorkerRequestEnvelopeV1(create)).toEqual(create);
    const upsert = createCredentialVaultWorkerRequestEnvelopeV1("request.upsert", {
      method: "upsert",
      binding: bindingV1,
      credential: { kind: "api_key", value: "provider-secret" },
    });
    expect(admitCredentialVaultWorkerRequestEnvelopeV1(upsert)).toEqual(upsert);
    expect(admitCredentialVaultWorkerRequestEnvelopeV1({
      ...upsert,
      record: { ...upsert.record, endpointOverride: "https://evil.example" },
    })).toBeNull();
    expect(admitCredentialVaultWorkerRequestEnvelopeV1({
      revision: 1,
      kind: "credential_vault_request",
      requestId: "request.list",
      record: { method: "list", credential: "secret" },
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
    expect(admitCredentialVaultWorkerRequestEnvelopeV1({
      revision: 1,
      kind: "credential_vault_request",
      requestId: "request.hostile",
      record: hostile,
    })).toBeNull();
    expect(reads).toBe(0);
  });

  it("keeps ordinary responses metadata-only", () => {
    const response = createCredentialVaultWorkerResponseEnvelopeV1("request.upsert", {
      kind: "success",
      method: "upsert",
      value: { disposition: "created", binding: bindingV1 },
    });
    expect(admitCredentialVaultWorkerResponseEnvelopeV1(response, "upsert")).toEqual(response);
    expect(JSON.stringify(response)).not.toContain("provider-secret");
    expect(admitCredentialVaultWorkerResponseEnvelopeV1({
      ...response,
      record: {
        ...response.record,
        value: { disposition: "created", binding: bindingV1, credential: "secret" },
      },
    }, "upsert")).toBeNull();
  });

  it("uses a separate exact ready/delivery protocol for the one-time Agent port", () => {
    const ready = createCredentialVaultHandoffReadyV1("handoff.1", bindingV1);
    expect(admitCredentialVaultHandoffReadyV1(ready)).toEqual(ready);
    const delivery = createCredentialVaultHandoffDeliveryV1(
      "handoff.1",
      bindingV1,
      "provider-secret",
    );
    expect(admitCredentialVaultHandoffDeliveryV1(delivery)).toEqual(delivery);
    expect(admitCredentialVaultHandoffReadyV1({ ...ready, binding: { ...bindingV1, apiKey: "x" } }))
      .toBeNull();
    expect(admitCredentialVaultHandoffDeliveryV1({
      ...delivery,
      genericHeaders: { Authorization: "Bearer x" },
    })).toBeNull();
  });
});

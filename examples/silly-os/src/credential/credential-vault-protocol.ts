// SPDX-License-Identifier: MIT

import {
  admitCredentialVaultBindingV2,
  admitCredentialVaultListV2,
  credentialVaultApiKeyMaximumUtf8BytesV2,
  credentialVaultExactRecordV2,
  credentialVaultPassphraseMaximumUtf8BytesV2,
  credentialVaultRevisionV2,
  isCredentialVaultBoundedTextV2,
  type CredentialVaultBindingV2,
  type CredentialVaultListV2,
} from "./credential-vault-contracts.ts";

export type CredentialVaultWorkerMethodV2 =
  | "initialize"
  | "list"
  | "set_password"
  | "use_device"
  | "unlock"
  | "lock"
  | "reset"
  | "upsert"
  | "forget"
  | "handoff";

export type CredentialVaultWorkerRequestRecordV2 =
  | { readonly method: "initialize" | "list" | "use_device" | "lock" | "reset" }
  | { readonly method: "set_password" | "unlock"; readonly passphrase: string }
  | {
    readonly method: "upsert";
    readonly binding: CredentialVaultBindingV2;
    readonly credential: { readonly kind: "api_key"; readonly value: string };
  }
  | { readonly method: "forget"; readonly binding: CredentialVaultBindingV2 }
  | {
    readonly method: "handoff";
    readonly handoffId: string;
    readonly binding: CredentialVaultBindingV2;
  };

export interface CredentialVaultWorkerRequestEnvelopeV2 {
  readonly revision: 2;
  readonly kind: "credential_vault_request";
  readonly requestId: string;
  readonly record: CredentialVaultWorkerRequestRecordV2;
}

export type CredentialVaultFailureCodeV2 =
  | "locked"
  | "invalid_state"
  | "invalid_passphrase"
  | "binding_conflict"
  | "binding_missing"
  | "capacity_exceeded"
  | "storage_unavailable"
  | "quota_exceeded"
  | "schema_invalid"
  | "crypto_failed"
  | "handoff_failed"
  | "wire_invalid";

type CredentialVaultListMethodV2 =
  | "initialize"
  | "list"
  | "set_password"
  | "use_device"
  | "unlock"
  | "lock"
  | "reset";

export type CredentialVaultWorkerSuccessRecordV2 =
  | {
    readonly kind: "success";
    readonly method: CredentialVaultListMethodV2;
    readonly value: CredentialVaultListV2;
  }
  | {
    readonly kind: "success";
    readonly method: "upsert";
    readonly value: {
      readonly disposition: "created" | "replaced";
      readonly binding: CredentialVaultBindingV2;
    };
  }
  | {
    readonly kind: "success";
    readonly method: "forget";
    readonly value: { readonly forgotten: boolean };
  }
  | {
    readonly kind: "success";
    readonly method: "handoff";
    readonly value: { readonly binding: CredentialVaultBindingV2 };
  };

export interface CredentialVaultWorkerFailureRecordV2 {
  readonly kind: "failure";
  readonly method: CredentialVaultWorkerMethodV2;
  readonly code: CredentialVaultFailureCodeV2;
}

export type CredentialVaultWorkerResponseRecordV2 =
  | CredentialVaultWorkerSuccessRecordV2
  | CredentialVaultWorkerFailureRecordV2;

export interface CredentialVaultWorkerResponseEnvelopeV2 {
  readonly revision: 2;
  readonly kind: "credential_vault_response";
  readonly requestId: string;
  readonly record: CredentialVaultWorkerResponseRecordV2;
}

export interface CredentialVaultHandoffReadyV2 {
  readonly revision: 2;
  readonly kind: "credential_vault_handoff_ready";
  readonly handoffId: string;
  readonly binding: CredentialVaultBindingV2;
}

/** This is the only Vault output containing plaintext credential material. */
export interface CredentialVaultHandoffDeliveryV2 {
  readonly revision: 2;
  readonly kind: "credential_vault_handoff_delivery";
  readonly handoffId: string;
  readonly binding: CredentialVaultBindingV2;
  readonly credential: { readonly kind: "api_key"; readonly value: string };
}

const wireIdentifierPatternV2 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,255}$/u;

function isWireIdentifierV2(value: unknown): value is string {
  return typeof value === "string" && wireIdentifierPatternV2.test(value);
}

function isFailureCodeV2(value: unknown): value is CredentialVaultFailureCodeV2 {
  return value === "locked" || value === "invalid_state" ||
    value === "invalid_passphrase" || value === "binding_conflict" ||
    value === "binding_missing" || value === "capacity_exceeded" ||
    value === "storage_unavailable" || value === "quota_exceeded" ||
    value === "schema_invalid" || value === "crypto_failed" ||
    value === "handoff_failed" || value === "wire_invalid";
}

function isMethodV2(value: unknown): value is CredentialVaultWorkerMethodV2 {
  return value === "initialize" || value === "list" || value === "set_password" ||
    value === "use_device" || value === "unlock" || value === "lock" ||
    value === "reset" || value === "upsert" || value === "forget" || value === "handoff";
}

function isListMethodV2(
  value: CredentialVaultWorkerMethodV2,
): value is CredentialVaultListMethodV2 {
  return value === "initialize" || value === "list" || value === "set_password" ||
    value === "use_device" || value === "unlock" || value === "lock" || value === "reset";
}

export function admitCredentialVaultWorkerRequestEnvelopeV2(
  value: unknown,
): CredentialVaultWorkerRequestEnvelopeV2 | null {
  const envelope = credentialVaultExactRecordV2(value, [
    "revision",
    "kind",
    "requestId",
    "record",
  ]);
  if (
    envelope === null || envelope.revision !== credentialVaultRevisionV2 ||
    envelope.kind !== "credential_vault_request" || !isWireIdentifierV2(envelope.requestId)
  ) return null;
  const methodOnly = credentialVaultExactRecordV2(envelope.record, ["method"]);
  const passphraseRecord = credentialVaultExactRecordV2(envelope.record, ["method", "passphrase"]);
  const upsertRecord = credentialVaultExactRecordV2(envelope.record, [
    "method",
    "binding",
    "credential",
  ]);
  const bindingRecord = credentialVaultExactRecordV2(envelope.record, ["method", "binding"]);
  const handoffRecord = credentialVaultExactRecordV2(envelope.record, [
    "method",
    "handoffId",
    "binding",
  ]);
  const method = methodOnly?.method ?? passphraseRecord?.method ?? upsertRecord?.method ??
    bindingRecord?.method ?? handoffRecord?.method;
  if (!isMethodV2(method)) return null;

  let record: CredentialVaultWorkerRequestRecordV2;
  if (
    method === "initialize" || method === "list" || method === "use_device" || method === "lock" ||
    method === "reset"
  ) {
    if (methodOnly?.method !== method) return null;
    record = { method };
  } else if (method === "set_password" || method === "unlock") {
    if (
      passphraseRecord?.method !== method ||
      !isCredentialVaultBoundedTextV2(
        passphraseRecord.passphrase,
        credentialVaultPassphraseMaximumUtf8BytesV2,
      )
    ) return null;
    record = { method, passphrase: passphraseRecord.passphrase };
  } else if (method === "upsert") {
    const binding = upsertRecord === null
      ? null
      : admitCredentialVaultBindingV2(upsertRecord.binding);
    const credential = upsertRecord === null
      ? null
      : credentialVaultExactRecordV2(upsertRecord.credential, ["kind", "value"]);
    if (
      upsertRecord?.method !== method || binding?.kind !== "admitted" ||
      credential === null || credential.kind !== "api_key" ||
      !isCredentialVaultBoundedTextV2(credential.value, credentialVaultApiKeyMaximumUtf8BytesV2)
    ) return null;
    record = {
      method,
      binding: binding.value,
      credential: { kind: "api_key", value: credential.value },
    };
  } else if (method === "forget") {
    const binding = bindingRecord === null
      ? null
      : admitCredentialVaultBindingV2(bindingRecord.binding);
    if (bindingRecord?.method !== method || binding?.kind !== "admitted") return null;
    record = { method, binding: binding.value };
  } else {
    const binding = handoffRecord === null
      ? null
      : admitCredentialVaultBindingV2(handoffRecord.binding);
    if (
      handoffRecord?.method !== "handoff" || !isWireIdentifierV2(handoffRecord.handoffId) ||
      binding?.kind !== "admitted"
    ) return null;
    record = { method: "handoff", handoffId: handoffRecord.handoffId, binding: binding.value };
  }
  return { revision: 2, kind: "credential_vault_request", requestId: envelope.requestId, record };
}

function admitSuccessRecordV2(value: unknown): CredentialVaultWorkerSuccessRecordV2 | null {
  const record = credentialVaultExactRecordV2(value, ["kind", "method", "value"]);
  if (record === null || record.kind !== "success" || !isMethodV2(record.method)) return null;
  if (isListMethodV2(record.method)) {
    const list = admitCredentialVaultListV2(record.value);
    return list.kind === "admitted"
      ? { kind: "success", method: record.method, value: list.value }
      : null;
  }
  if (record.method === "upsert") {
    const result = credentialVaultExactRecordV2(record.value, ["disposition", "binding"]);
    const binding = result === null ? null : admitCredentialVaultBindingV2(result.binding);
    if (
      result === null || (result.disposition !== "created" && result.disposition !== "replaced") ||
      binding?.kind !== "admitted"
    ) return null;
    return {
      kind: "success",
      method: "upsert",
      value: { disposition: result.disposition, binding: binding.value },
    };
  }
  if (record.method === "forget") {
    const result = credentialVaultExactRecordV2(record.value, ["forgotten"]);
    return result !== null && typeof result.forgotten === "boolean"
      ? { kind: "success", method: "forget", value: { forgotten: result.forgotten } }
      : null;
  }
  const result = credentialVaultExactRecordV2(record.value, ["binding"]);
  const binding = result === null ? null : admitCredentialVaultBindingV2(result.binding);
  return binding?.kind === "admitted"
    ? { kind: "success", method: "handoff", value: { binding: binding.value } }
    : null;
}

export function admitCredentialVaultWorkerResponseEnvelopeV2(
  value: unknown,
  expectedMethod?: CredentialVaultWorkerMethodV2,
): CredentialVaultWorkerResponseEnvelopeV2 | null {
  const envelope = credentialVaultExactRecordV2(value, ["revision", "kind", "requestId", "record"]);
  if (
    envelope === null || envelope.revision !== credentialVaultRevisionV2 ||
    envelope.kind !== "credential_vault_response" || !isWireIdentifierV2(envelope.requestId)
  ) return null;
  let record: CredentialVaultWorkerResponseRecordV2 | null = admitSuccessRecordV2(envelope.record);
  if (record === null) {
    const failure = credentialVaultExactRecordV2(envelope.record, ["kind", "method", "code"]);
    if (
      failure !== null && failure.kind === "failure" && isMethodV2(failure.method) &&
      isFailureCodeV2(failure.code)
    ) record = { kind: "failure", method: failure.method, code: failure.code };
  }
  if (record === null || (expectedMethod !== undefined && record.method !== expectedMethod)) {
    return null;
  }
  return { revision: 2, kind: "credential_vault_response", requestId: envelope.requestId, record };
}

export function admitCredentialVaultHandoffReadyV2(
  value: unknown,
): CredentialVaultHandoffReadyV2 | null {
  const record = credentialVaultExactRecordV2(value, ["revision", "kind", "handoffId", "binding"]);
  const binding = record === null ? null : admitCredentialVaultBindingV2(record.binding);
  if (
    record === null || record.revision !== credentialVaultRevisionV2 ||
    record.kind !== "credential_vault_handoff_ready" || !isWireIdentifierV2(record.handoffId) ||
    binding?.kind !== "admitted"
  ) return null;
  return {
    revision: 2,
    kind: "credential_vault_handoff_ready",
    handoffId: record.handoffId,
    binding: binding.value,
  };
}

export function admitCredentialVaultHandoffDeliveryV2(
  value: unknown,
): CredentialVaultHandoffDeliveryV2 | null {
  const record = credentialVaultExactRecordV2(value, [
    "revision",
    "kind",
    "handoffId",
    "binding",
    "credential",
  ]);
  const binding = record === null ? null : admitCredentialVaultBindingV2(record.binding);
  const credential = record === null
    ? null
    : credentialVaultExactRecordV2(record.credential, ["kind", "value"]);
  if (
    record === null || record.revision !== credentialVaultRevisionV2 ||
    record.kind !== "credential_vault_handoff_delivery" || !isWireIdentifierV2(record.handoffId) ||
    binding?.kind !== "admitted" || credential === null || credential.kind !== "api_key" ||
    !isCredentialVaultBoundedTextV2(credential.value, credentialVaultApiKeyMaximumUtf8BytesV2)
  ) return null;
  return {
    revision: 2,
    kind: "credential_vault_handoff_delivery",
    handoffId: record.handoffId,
    binding: binding.value,
    credential: { kind: "api_key", value: credential.value },
  };
}

export function createCredentialVaultWorkerRequestEnvelopeV2(
  requestId: string,
  record: CredentialVaultWorkerRequestRecordV2,
): CredentialVaultWorkerRequestEnvelopeV2 {
  const admitted = admitCredentialVaultWorkerRequestEnvelopeV2({
    revision: 2,
    kind: "credential_vault_request",
    requestId,
    record,
  });
  if (admitted === null) throw new TypeError("sillyos.credential_vault.request_invalid");
  return admitted;
}

export function createCredentialVaultWorkerResponseEnvelopeV2(
  requestId: string,
  record: CredentialVaultWorkerResponseRecordV2,
): CredentialVaultWorkerResponseEnvelopeV2 {
  const admitted = admitCredentialVaultWorkerResponseEnvelopeV2({
    revision: 2,
    kind: "credential_vault_response",
    requestId,
    record,
  });
  if (admitted === null) throw new TypeError("sillyos.credential_vault.response_invalid");
  return admitted;
}

export function createCredentialVaultHandoffReadyV2(
  handoffId: string,
  binding: CredentialVaultBindingV2,
): CredentialVaultHandoffReadyV2 {
  const admitted = admitCredentialVaultHandoffReadyV2({
    revision: 2,
    kind: "credential_vault_handoff_ready",
    handoffId,
    binding,
  });
  if (admitted === null) throw new TypeError("sillyos.credential_vault.handoff_ready_invalid");
  return admitted;
}

export function createCredentialVaultHandoffDeliveryV2(
  handoffId: string,
  binding: CredentialVaultBindingV2,
  credential: string,
): CredentialVaultHandoffDeliveryV2 {
  const admitted = admitCredentialVaultHandoffDeliveryV2({
    revision: 2,
    kind: "credential_vault_handoff_delivery",
    handoffId,
    binding,
    credential: { kind: "api_key", value: credential },
  });
  if (admitted === null) throw new TypeError("sillyos.credential_vault.handoff_delivery_invalid");
  return admitted;
}

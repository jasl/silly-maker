// SPDX-License-Identifier: MIT

import {
  admitCredentialVaultBindingV1,
  admitCredentialVaultListV1,
  credentialVaultApiKeyMaximumUtf8BytesV1,
  credentialVaultExactRecordV1,
  credentialVaultPassphraseMaximumUtf8BytesV1,
  credentialVaultRevisionV1,
  isCredentialVaultBoundedTextV1,
  type CredentialVaultBindingV1,
  type CredentialVaultListV1,
} from "./credential-vault-contracts.ts";

export type CredentialVaultWorkerMethodV1 =
  | "create"
  | "unlock"
  | "lock"
  | "list"
  | "upsert"
  | "forget"
  | "handoff";

export type CredentialVaultWorkerRequestRecordV1 =
  | { readonly method: "create" | "unlock"; readonly passphrase: string }
  | { readonly method: "lock" | "list" }
  | {
    readonly method: "upsert";
    readonly binding: CredentialVaultBindingV1;
    readonly credential: { readonly kind: "api_key"; readonly value: string };
  }
  | { readonly method: "forget"; readonly binding: CredentialVaultBindingV1 }
  | {
    readonly method: "handoff";
    readonly handoffId: string;
    readonly binding: CredentialVaultBindingV1;
  };

export interface CredentialVaultWorkerRequestEnvelopeV1 {
  readonly revision: 1;
  readonly kind: "credential_vault_request";
  readonly requestId: string;
  readonly record: CredentialVaultWorkerRequestRecordV1;
}

export type CredentialVaultFailureCodeV1 =
  | "already_created"
  | "not_created"
  | "locked"
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

export type CredentialVaultWorkerSuccessRecordV1 =
  | {
    readonly kind: "success";
    readonly method: "create" | "unlock" | "list";
    readonly value: CredentialVaultListV1;
  }
  | { readonly kind: "success"; readonly method: "lock"; readonly value: null }
  | {
    readonly kind: "success";
    readonly method: "upsert";
    readonly value: {
      readonly disposition: "created" | "replaced";
      readonly binding: CredentialVaultBindingV1;
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
    readonly value: { readonly binding: CredentialVaultBindingV1 };
  };

export interface CredentialVaultWorkerFailureRecordV1 {
  readonly kind: "failure";
  readonly method: CredentialVaultWorkerMethodV1;
  readonly code: CredentialVaultFailureCodeV1;
}

export type CredentialVaultWorkerResponseRecordV1 =
  | CredentialVaultWorkerSuccessRecordV1
  | CredentialVaultWorkerFailureRecordV1;

export interface CredentialVaultWorkerResponseEnvelopeV1 {
  readonly revision: 1;
  readonly kind: "credential_vault_response";
  readonly requestId: string;
  readonly record: CredentialVaultWorkerResponseRecordV1;
}

export interface CredentialVaultHandoffReadyV1 {
  readonly revision: 1;
  readonly kind: "credential_vault_handoff_ready";
  readonly handoffId: string;
  readonly binding: CredentialVaultBindingV1;
}

/** This is the only Vault output containing plaintext credential material. */
export interface CredentialVaultHandoffDeliveryV1 {
  readonly revision: 1;
  readonly kind: "credential_vault_handoff_delivery";
  readonly handoffId: string;
  readonly binding: CredentialVaultBindingV1;
  readonly credential: { readonly kind: "api_key"; readonly value: string };
}

const wireIdentifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,255}$/u;

function isWireIdentifierV1(value: unknown): value is string {
  return typeof value === "string" && wireIdentifierPatternV1.test(value);
}

function isFailureCodeV1(value: unknown): value is CredentialVaultFailureCodeV1 {
  return value === "already_created" || value === "not_created" || value === "locked" ||
    value === "invalid_passphrase" || value === "binding_conflict" ||
    value === "binding_missing" || value === "capacity_exceeded" ||
    value === "storage_unavailable" || value === "quota_exceeded" ||
    value === "schema_invalid" || value === "crypto_failed" ||
    value === "handoff_failed" || value === "wire_invalid";
}

function isMethodV1(value: unknown): value is CredentialVaultWorkerMethodV1 {
  return value === "create" || value === "unlock" || value === "lock" || value === "list" ||
    value === "upsert" || value === "forget" || value === "handoff";
}

export function admitCredentialVaultWorkerRequestEnvelopeV1(
  value: unknown,
): CredentialVaultWorkerRequestEnvelopeV1 | null {
  const envelope = credentialVaultExactRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "record",
  ]);
  if (
    envelope === null || envelope.revision !== credentialVaultRevisionV1 ||
    envelope.kind !== "credential_vault_request" || !isWireIdentifierV1(envelope.requestId)
  ) return null;
  const methodOnly = credentialVaultExactRecordV1(envelope.record, ["method"]);
  const passphraseRecord = credentialVaultExactRecordV1(envelope.record, [
    "method",
    "passphrase",
  ]);
  const upsertRecord = credentialVaultExactRecordV1(envelope.record, [
    "method",
    "binding",
    "credential",
  ]);
  const bindingRecord = credentialVaultExactRecordV1(envelope.record, [
    "method",
    "binding",
  ]);
  const handoffRecord = credentialVaultExactRecordV1(envelope.record, [
    "method",
    "handoffId",
    "binding",
  ]);
  const method = methodOnly?.method ?? passphraseRecord?.method ?? upsertRecord?.method ??
    bindingRecord?.method ?? handoffRecord?.method;
  if (!isMethodV1(method)) return null;

  let record: CredentialVaultWorkerRequestRecordV1;
  if (method === "lock" || method === "list") {
    record = { method };
  } else if (method === "create" || method === "unlock") {
    const exact = credentialVaultExactRecordV1(envelope.record, ["method", "passphrase"]);
    if (
      exact === null || exact.method !== method ||
      !isCredentialVaultBoundedTextV1(
        exact.passphrase,
        credentialVaultPassphraseMaximumUtf8BytesV1,
      )
    ) return null;
    record = { method, passphrase: exact.passphrase };
  } else if (method === "upsert") {
    const exact = credentialVaultExactRecordV1(envelope.record, [
      "method",
      "binding",
      "credential",
    ]);
    const binding = exact === null ? null : admitCredentialVaultBindingV1(exact.binding);
    const credential = exact === null
      ? null
      : credentialVaultExactRecordV1(exact.credential, ["kind", "value"]);
    if (
      exact === null || exact.method !== method || binding?.kind !== "admitted" ||
      credential === null || credential.kind !== "api_key" ||
      !isCredentialVaultBoundedTextV1(
        credential.value,
        credentialVaultApiKeyMaximumUtf8BytesV1,
      )
    ) return null;
    record = {
      method,
      binding: binding.value,
      credential: { kind: "api_key", value: credential.value },
    };
  } else if (method === "forget") {
    const exact = credentialVaultExactRecordV1(envelope.record, ["method", "binding"]);
    const binding = exact === null ? null : admitCredentialVaultBindingV1(exact.binding);
    if (exact === null || exact.method !== method || binding?.kind !== "admitted") return null;
    record = { method, binding: binding.value };
  } else {
    const exact = credentialVaultExactRecordV1(envelope.record, [
      "method",
      "handoffId",
      "binding",
    ]);
    const binding = exact === null ? null : admitCredentialVaultBindingV1(exact.binding);
    if (
      exact === null || exact.method !== "handoff" || !isWireIdentifierV1(exact.handoffId) ||
      binding?.kind !== "admitted"
    ) return null;
    record = { method: "handoff", handoffId: exact.handoffId, binding: binding.value };
  }
  return { revision: 1, kind: "credential_vault_request", requestId: envelope.requestId, record };
}

function admitSuccessRecordV1(
  value: unknown,
): CredentialVaultWorkerSuccessRecordV1 | null {
  const record = credentialVaultExactRecordV1(value, ["kind", "method", "value"]);
  if (record === null || record.kind !== "success" || !isMethodV1(record.method)) return null;
  if (record.method === "create" || record.method === "unlock" || record.method === "list") {
    const list = admitCredentialVaultListV1(record.value);
    return list.kind === "admitted"
      ? { kind: "success", method: record.method, value: list.value }
      : null;
  }
  if (record.method === "lock") {
    return record.value === null ? { kind: "success", method: "lock", value: null } : null;
  }
  if (record.method === "upsert") {
    const result = credentialVaultExactRecordV1(record.value, ["disposition", "binding"]);
    const binding = result === null ? null : admitCredentialVaultBindingV1(result.binding);
    if (
      result === null ||
      (result.disposition !== "created" && result.disposition !== "replaced") ||
      binding?.kind !== "admitted"
    ) return null;
    return {
      kind: "success",
      method: "upsert",
      value: { disposition: result.disposition, binding: binding.value },
    };
  }
  if (record.method === "forget") {
    const result = credentialVaultExactRecordV1(record.value, ["forgotten"]);
    return result !== null && typeof result.forgotten === "boolean"
      ? { kind: "success", method: "forget", value: { forgotten: result.forgotten } }
      : null;
  }
  const result = credentialVaultExactRecordV1(record.value, ["binding"]);
  const binding = result === null ? null : admitCredentialVaultBindingV1(result.binding);
  return binding?.kind === "admitted"
    ? { kind: "success", method: "handoff", value: { binding: binding.value } }
    : null;
}

export function admitCredentialVaultWorkerResponseEnvelopeV1(
  value: unknown,
  expectedMethod?: CredentialVaultWorkerMethodV1,
): CredentialVaultWorkerResponseEnvelopeV1 | null {
  const envelope = credentialVaultExactRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "record",
  ]);
  if (
    envelope === null || envelope.revision !== credentialVaultRevisionV1 ||
    envelope.kind !== "credential_vault_response" || !isWireIdentifierV1(envelope.requestId)
  ) return null;
  const success = admitSuccessRecordV1(envelope.record);
  let record: CredentialVaultWorkerResponseRecordV1 | null = success;
  if (record === null) {
    const failure = credentialVaultExactRecordV1(envelope.record, ["kind", "method", "code"]);
    if (
      failure !== null && failure.kind === "failure" && isMethodV1(failure.method) &&
      isFailureCodeV1(failure.code)
    ) record = { kind: "failure", method: failure.method, code: failure.code };
  }
  if (record === null || (expectedMethod !== undefined && record.method !== expectedMethod)) {
    return null;
  }
  return {
    revision: 1,
    kind: "credential_vault_response",
    requestId: envelope.requestId,
    record,
  };
}

export function admitCredentialVaultHandoffReadyV1(
  value: unknown,
): CredentialVaultHandoffReadyV1 | null {
  const record = credentialVaultExactRecordV1(value, [
    "revision",
    "kind",
    "handoffId",
    "binding",
  ]);
  const binding = record === null ? null : admitCredentialVaultBindingV1(record.binding);
  if (
    record === null || record.revision !== credentialVaultRevisionV1 ||
    record.kind !== "credential_vault_handoff_ready" || !isWireIdentifierV1(record.handoffId) ||
    binding?.kind !== "admitted"
  ) return null;
  return {
    revision: 1,
    kind: "credential_vault_handoff_ready",
    handoffId: record.handoffId,
    binding: binding.value,
  };
}

export function admitCredentialVaultHandoffDeliveryV1(
  value: unknown,
): CredentialVaultHandoffDeliveryV1 | null {
  const record = credentialVaultExactRecordV1(value, [
    "revision",
    "kind",
    "handoffId",
    "binding",
    "credential",
  ]);
  const binding = record === null ? null : admitCredentialVaultBindingV1(record.binding);
  const credential = record === null
    ? null
    : credentialVaultExactRecordV1(record.credential, ["kind", "value"]);
  if (
    record === null || record.revision !== credentialVaultRevisionV1 ||
    record.kind !== "credential_vault_handoff_delivery" ||
    !isWireIdentifierV1(record.handoffId) || binding?.kind !== "admitted" ||
    credential === null || credential.kind !== "api_key" ||
    !isCredentialVaultBoundedTextV1(
      credential.value,
      credentialVaultApiKeyMaximumUtf8BytesV1,
    )
  ) return null;
  return {
    revision: 1,
    kind: "credential_vault_handoff_delivery",
    handoffId: record.handoffId,
    binding: binding.value,
    credential: { kind: "api_key", value: credential.value },
  };
}

export function createCredentialVaultWorkerRequestEnvelopeV1(
  requestId: string,
  record: CredentialVaultWorkerRequestRecordV1,
): CredentialVaultWorkerRequestEnvelopeV1 {
  const admitted = admitCredentialVaultWorkerRequestEnvelopeV1({
    revision: 1,
    kind: "credential_vault_request",
    requestId,
    record,
  });
  if (admitted === null) throw new TypeError("sillyos.credential_vault.request_invalid");
  return admitted;
}

export function createCredentialVaultWorkerResponseEnvelopeV1(
  requestId: string,
  record: CredentialVaultWorkerResponseRecordV1,
): CredentialVaultWorkerResponseEnvelopeV1 {
  const admitted = admitCredentialVaultWorkerResponseEnvelopeV1({
    revision: 1,
    kind: "credential_vault_response",
    requestId,
    record,
  }, record.method);
  if (admitted === null) throw new TypeError("sillyos.credential_vault.response_invalid");
  return admitted;
}

export function createCredentialVaultHandoffReadyV1(
  handoffId: string,
  binding: CredentialVaultBindingV1,
): CredentialVaultHandoffReadyV1 {
  const admitted = admitCredentialVaultHandoffReadyV1({
    revision: 1,
    kind: "credential_vault_handoff_ready",
    handoffId,
    binding,
  });
  if (admitted === null) throw new TypeError("sillyos.credential_vault.handoff_ready_invalid");
  return admitted;
}

export function createCredentialVaultHandoffDeliveryV1(
  handoffId: string,
  binding: CredentialVaultBindingV1,
  credential: string,
): CredentialVaultHandoffDeliveryV1 {
  const admitted = admitCredentialVaultHandoffDeliveryV1({
    revision: 1,
    kind: "credential_vault_handoff_delivery",
    handoffId,
    binding,
    credential: { kind: "api_key", value: credential },
  });
  if (admitted === null) throw new TypeError("sillyos.credential_vault.handoff_delivery_invalid");
  return admitted;
}

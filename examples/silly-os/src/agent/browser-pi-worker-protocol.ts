// SPDX-License-Identifier: MIT

import { admitCreatorAgentSubmitTextV1 } from "../product/creator-agent-admission.ts";
import {
  admitProgramNetworkGrantSetV1,
  type ProgramNetworkOperationV1,
  type ProgramNetworkGrantV1,
} from "../product/program-network-grants.ts";
import { normalizeBrowserNetworkUrlV1 } from "../network/browser-network-url.ts";
import { admitCredentialVaultHandoffReadyV1 } from "../credential/credential-vault-protocol.ts";
import type { CredentialVaultBindingV1 } from "../credential/credential-vault-contracts.ts";
import { isBrowserPiDistributionIdentityV1 } from "./browser-pi-distribution.ts";
import type { BrowserPiDistributionIdentityV1 } from "./browser-pi-distribution.ts";

export type BrowserPiWorkerRuntimeV1 = "deterministic_test" | "pi_provider";

export type BrowserPiCustomModelApiV1 =
  | "openai-completions"
  | "openai-responses"
  | "anthropic-messages"
  | "google-generative-ai";

export interface BrowserPiBuiltinModelSelectionV1 {
  readonly kind: "builtin";
  readonly providerId: string;
  readonly modelId: string;
  readonly api: BrowserPiCustomModelApiV1;
  readonly baseUrl: string;
}

export interface BrowserPiCustomModelProfileV1 {
  readonly profileId: string;
  readonly displayName: string;
  readonly api: BrowserPiCustomModelApiV1;
  readonly baseUrl: string;
  readonly modelId: string;
  readonly contextWindow: number;
  readonly maxTokens: number;
}

export interface BrowserPiCustomModelSelectionV1 {
  readonly kind: "custom";
  readonly profile: BrowserPiCustomModelProfileV1;
}

export type BrowserPiModelSelectionV1 =
  | BrowserPiBuiltinModelSelectionV1
  | BrowserPiCustomModelSelectionV1;

export type BrowserPiCatalogAvailabilityV1 = "available" | "unavailable";

export interface BrowserPiCatalogModelWireV1 {
  readonly id: string;
  readonly name: string;
  readonly api: string;
  readonly baseUrl: string;
  readonly reasoning: boolean;
  readonly input: readonly ("text" | "image")[];
  readonly contextWindow: number;
  readonly maxTokens: number;
  readonly availability: BrowserPiCatalogAvailabilityV1;
}

export interface BrowserPiCatalogProviderWireV1 {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string | null;
  readonly availability: BrowserPiCatalogAvailabilityV1;
  readonly models: readonly BrowserPiCatalogModelWireV1[];
}

export interface BrowserPiProviderCatalogWireV1 {
  readonly revision: 1;
  readonly distribution: BrowserPiDistributionIdentityV1;
  readonly providers: readonly BrowserPiCatalogProviderWireV1[];
}

export interface BrowserPiWorkerCatalogRequestV1 {
  readonly revision: 1;
  readonly kind: "catalog_request";
  readonly requestId: number;
}

export interface BrowserPiWorkerConfigureV1 {
  readonly revision: 1;
  readonly kind: "configure";
  readonly requestId: number;
  readonly runtime: BrowserPiWorkerRuntimeV1;
  readonly selection: BrowserPiModelSelectionV1 | null;
  readonly credential:
    | {
      readonly kind: "api_key";
      readonly value: string;
    }
    | {
      readonly kind: "vault_handoff";
      readonly handoffId: string;
      readonly binding: CredentialVaultBindingV1;
    };
}

export type BrowserPiNetworkApprovalDecisionV1 = "allow_once" | "deny";

export interface BrowserPiWorkerResolveNetworkApprovalV1 {
  readonly revision: 1;
  readonly kind: "resolve_network_approval";
  readonly requestId: number;
  readonly approvalId: string;
  readonly decision: BrowserPiNetworkApprovalDecisionV1;
}

export interface BrowserPiWorkerTestConnectionV1 {
  readonly revision: 1;
  readonly kind: "test_connection";
  readonly requestId: number;
}

export interface BrowserPiWorkerSelectModelV1 {
  readonly revision: 1;
  readonly kind: "select_model";
  readonly requestId: number;
  readonly selection: BrowserPiModelSelectionV1;
}

export interface BrowserPiWorkerExecutionBindingV1 {
  readonly revision: 1;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly expectedGeneration: number;
}

export interface BrowserPiWorkerRpcRequestWithoutExecutionV1 {
  readonly revision: 1;
  readonly kind: "rpc_request";
  readonly requestId: number;
  readonly record: unknown;
}

export interface BrowserPiWorkerRpcSubmitRequestV1 {
  readonly revision: 1;
  readonly kind: "rpc_request";
  readonly requestId: number;
  readonly record: unknown;
  readonly execution: BrowserPiWorkerExecutionBindingV1;
}

export type BrowserPiWorkerRpcRequestV1 =
  | BrowserPiWorkerRpcRequestWithoutExecutionV1
  | BrowserPiWorkerRpcSubmitRequestV1;

export type BrowserPiWorkspaceRequestRecordV1 =
  | {
    readonly method: "attach_workspace";
    readonly descriptor: BrowserPiWorkerExecutionBindingV1;
  }
  | {
    readonly method: "close_workspace" | "query_workspace";
    readonly workspaceSessionId: string;
  }
  | {
    readonly method: "acknowledge_workspace_receipts";
    readonly workspaceSessionId: string;
    readonly throughSequence: number;
  }
  | {
    readonly method: "replace_network_grants";
    readonly programId: string;
    readonly workspaceSessionId: string;
    readonly grants: readonly ProgramNetworkGrantV1[];
  };

export interface BrowserPiWorkerWorkspaceRequestV1 {
  readonly revision: 1;
  readonly kind: "workspace_request";
  readonly requestId: number;
  readonly record: BrowserPiWorkspaceRequestRecordV1;
}

export type BrowserPiWorkerInboundMessageV1 =
  | BrowserPiWorkerCatalogRequestV1
  | BrowserPiWorkerConfigureV1
  | BrowserPiWorkerTestConnectionV1
  | BrowserPiWorkerSelectModelV1
  | BrowserPiWorkerResolveNetworkApprovalV1
  | BrowserPiWorkerRpcRequestV1
  | BrowserPiWorkerWorkspaceRequestV1;

export interface BrowserPiWorkerConfiguredV1 {
  readonly revision: 1;
  readonly kind: "configured";
  readonly requestId: number;
  readonly runtime: BrowserPiWorkerRuntimeV1;
  readonly selection: BrowserPiModelSelectionV1 | null;
  readonly distribution: BrowserPiDistributionIdentityV1;
}

export interface BrowserPiWorkerReadyV1 {
  readonly revision: 1;
  readonly kind: "ready";
  readonly requestId: number;
  readonly runtime: BrowserPiWorkerRuntimeV1;
  readonly selection: BrowserPiModelSelectionV1 | null;
  readonly distribution: BrowserPiDistributionIdentityV1;
}

export interface BrowserPiWorkerCatalogSuccessV1 {
  readonly revision: 1;
  readonly kind: "catalog_response";
  readonly requestId: number;
  readonly ok: true;
  readonly catalog: BrowserPiProviderCatalogWireV1;
}

export interface BrowserPiWorkerCatalogFailureV1 {
  readonly revision: 1;
  readonly kind: "catalog_response";
  readonly requestId: number;
  readonly ok: false;
  readonly code: "catalog_unavailable";
}

export interface BrowserPiWorkerConfigurationFailureV1 {
  readonly revision: 1;
  readonly kind: "configuration_failure";
  readonly requestId: number;
  readonly code: "selection_unavailable" | "credential_handoff_failed";
}

export interface BrowserPiWorkerConnectionTestFailureV1 {
  readonly revision: 1;
  readonly kind: "connection_test_failure";
  readonly requestId: number;
  readonly code: "not_configured" | "connection_failed";
}

export interface BrowserPiWorkerModelSelectedV1 {
  readonly revision: 1;
  readonly kind: "model_selected";
  readonly requestId: number;
  readonly selection: BrowserPiModelSelectionV1;
}

export type BrowserPiModelSelectionFailureCodeV1 =
  | "not_configured"
  | "selection_unavailable"
  | "credential_scope_mismatch"
  | "busy";

export interface BrowserPiWorkerModelSelectionFailureV1 {
  readonly revision: 1;
  readonly kind: "model_selection_failure";
  readonly requestId: number;
  readonly code: BrowserPiModelSelectionFailureCodeV1;
}

export interface BrowserPiWorkerRpcResponseV1 {
  readonly revision: 1;
  readonly kind: "rpc_response";
  readonly requestId: number;
  readonly ok: true;
  readonly response: unknown;
}

export interface BrowserPiWorkerRpcFailureV1 {
  readonly revision: 1;
  readonly kind: "rpc_response";
  readonly requestId: number;
  readonly ok: false;
  readonly code: "not_initialized" | "invalid_request" | "session_mismatch";
}

export interface BrowserPiWorkerRpcRecordV1 {
  readonly revision: 1;
  readonly kind: "rpc_record";
  readonly record: unknown;
}

export interface BrowserPiNetworkApprovalRequestV1 {
  readonly revision: 1;
  readonly approvalId: string;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly sessionId: string;
  readonly runId: string;
  readonly toolCallId: string;
  readonly operation: ProgramNetworkOperationV1;
  readonly origin: string;
  readonly url: string;
}

export interface BrowserPiWorkerNetworkApprovalRequiredV1 {
  readonly revision: 1;
  readonly kind: "network_approval_required";
  readonly approval: BrowserPiNetworkApprovalRequestV1;
}

export interface BrowserPiWorkerNetworkApprovalResolvedV1 {
  readonly revision: 1;
  readonly kind: "network_approval_response";
  readonly requestId: number;
  readonly ok: true;
  readonly approvalId: string;
  readonly decision: BrowserPiNetworkApprovalDecisionV1;
}

export interface BrowserPiWorkerNetworkApprovalUnavailableV1 {
  readonly revision: 1;
  readonly kind: "network_approval_response";
  readonly requestId: number;
  readonly ok: false;
  readonly code: "not_pending";
}

export interface BrowserPiWorkerProtocolFailureV1 {
  readonly revision: 1;
  readonly kind: "protocol_failure";
  readonly code:
    | "invalid_message"
    | "already_configured"
    | "test_in_progress"
    | "distribution_mismatch";
}

export interface BrowserPiWorkspaceMutationReceiptWireV1 {
  readonly revision: 1;
  readonly sequence: number;
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly sessionId: string;
  readonly runId: string;
  readonly toolCallId: string;
  readonly tool: "write" | "edit" | "bash" | "download";
  readonly expectedGeneration: number;
  readonly baseGeneration: number;
  readonly resultingGeneration: number;
  readonly outcome: "succeeded" | "failed" | "cancelled";
  readonly effect: "none" | "changed";
  readonly changedPaths: readonly string[];
  readonly diagnosticCode:
    | null
    | "cancelled"
    | "path_rejected"
    | "capacity_exceeded"
    | "execution_failed";
}

export interface BrowserPiWorkspaceSnapshotWireV1 {
  readonly revision: 1;
  readonly phase: "open" | "closed";
  readonly programId: string;
  readonly workspaceId: string;
  readonly workspaceSessionId: string;
  readonly generation: number;
  readonly receipts: readonly BrowserPiWorkspaceMutationReceiptWireV1[];
}

export type BrowserPiWorkspaceSuccessResponseV1 =
  | {
    readonly method:
      | "attach_workspace"
      | "close_workspace"
      | "query_workspace"
      | "replace_network_grants";
    readonly snapshot: BrowserPiWorkspaceSnapshotWireV1;
  }
  | {
    readonly method: "acknowledge_workspace_receipts";
    readonly throughSequence: number;
    readonly snapshot: BrowserPiWorkspaceSnapshotWireV1;
  };

export type BrowserPiWorkspaceFailureCodeV1 =
  | "not_initialized"
  | "invalid_request"
  | "workspace_busy"
  | "workspace_mismatch"
  | "receipt_sequence_invalid"
  | "workspace_failed";

export interface BrowserPiWorkerWorkspaceSuccessResponseV1 {
  readonly revision: 1;
  readonly kind: "workspace_response";
  readonly requestId: number;
  readonly ok: true;
  readonly response: BrowserPiWorkspaceSuccessResponseV1;
}

export interface BrowserPiWorkerWorkspaceFailureResponseV1 {
  readonly revision: 1;
  readonly kind: "workspace_response";
  readonly requestId: number;
  readonly ok: false;
  readonly code: BrowserPiWorkspaceFailureCodeV1;
}

export interface BrowserPiWorkerWorkspaceReceiptEventV1 {
  readonly revision: 1;
  readonly kind: "workspace_receipt";
  readonly receipt: BrowserPiWorkspaceMutationReceiptWireV1;
}

export type BrowserPiWorkerWorkspaceOutboundMessageV1 =
  | BrowserPiWorkerWorkspaceSuccessResponseV1
  | BrowserPiWorkerWorkspaceFailureResponseV1
  | BrowserPiWorkerWorkspaceReceiptEventV1;

export type BrowserPiWorkerOutboundMessageV1 =
  | BrowserPiWorkerConfiguredV1
  | BrowserPiWorkerReadyV1
  | BrowserPiWorkerCatalogSuccessV1
  | BrowserPiWorkerCatalogFailureV1
  | BrowserPiWorkerConfigurationFailureV1
  | BrowserPiWorkerConnectionTestFailureV1
  | BrowserPiWorkerModelSelectedV1
  | BrowserPiWorkerModelSelectionFailureV1
  | BrowserPiWorkerRpcResponseV1
  | BrowserPiWorkerRpcFailureV1
  | BrowserPiWorkerRpcRecordV1
  | BrowserPiWorkerNetworkApprovalRequiredV1
  | BrowserPiWorkerNetworkApprovalResolvedV1
  | BrowserPiWorkerNetworkApprovalUnavailableV1
  | BrowserPiWorkerProtocolFailureV1;

export type BrowserPiWorkerAnyOutboundMessageV1 =
  | BrowserPiWorkerOutboundMessageV1
  | BrowserPiWorkerWorkspaceOutboundMessageV1;

export type BrowserPiEngineRequestV1 =
  | {
    readonly revision: 1;
    readonly requestId: number;
    readonly method: "start";
  }
  | {
    readonly revision: 1;
    readonly requestId: number;
    readonly method: "submit";
    readonly params: {
      readonly sessionId: string;
      readonly text: string;
    };
  }
  | {
    readonly revision: 1;
    readonly requestId: number;
    readonly method: "cancel";
    readonly params: {
      readonly sessionId: string;
      readonly runId: string;
    };
  };

type DataRecordV1 = Readonly<Record<string, unknown>>;

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const credentialMaximumCharactersV1 = 64 * 1024;
const catalogProviderMaximumV1 = 64;
const catalogModelsPerProviderMaximumV1 = 2_048;
const catalogModelsTotalMaximumV1 = 4_096;
const catalogNameMaximumUtf8BytesV1 = 2_048;
const catalogModelIdMaximumUtf8BytesV1 = 2_048;
const catalogBaseUrlMaximumUtf8BytesV1 = 8_192;
const customProfileIdMaximumUtf8BytesV1 = 64;
const customProfileDisplayNameMaximumUtf8BytesV1 = 128;
const customProfileBaseUrlMaximumUtf8BytesV1 = 2_048;
const customProfileModelIdMaximumUtf8BytesV1 = 256;
const customProfileContextWindowMaximumV1 = 32_000_000;
const customProfileMaxTokensMaximumV1 = 4_000_000;
const workspaceReceiptMaximumV1 = 32;
const workspacePathMaximumUtf8BytesV1 = 512;
const workspacePathMaximumComponentsV1 = 32;

function exactDataRecordV1(value: unknown, keys: readonly string[]): DataRecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actual = Object.keys(descriptors);
    if (
      actual.length !== keys.length ||
      !keys.every((key) => Object.hasOwn(descriptors, key))
    ) return null;
    const entries: [string, unknown][] = [];
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) return null;
      entries.push([key, descriptor.value]);
    }
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
}

function isRequestIdV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isIdentifierV1(value: unknown): value is string {
  return typeof value === "string" && identifierPatternV1.test(value);
}

function isPositiveSafeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function exactArrayV1(value: unknown, maximumLength: number): readonly unknown[] | null {
  if (!Array.isArray(value) || value.length > maximumLength) return null;
  try {
    if (Object.getPrototypeOf(value) !== Array.prototype) return null;
    if (Object.getOwnPropertySymbols(value).length !== 0) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const names = Object.keys(descriptors);
    if (
      names.length !== value.length + 1 || !Object.hasOwn(descriptors, "length") ||
      !Array.from({ length: value.length }, (_, index) => String(index)).every((key) =>
        Object.hasOwn(descriptors, key)
      )
    ) return null;
    const admitted: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined || !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) return null;
      admitted.push(descriptor.value);
    }
    return admitted;
  } catch {
    return null;
  }
}

function utf8ByteLengthV1(value: string): number | null {
  let byteLength = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x7f) {
      byteLength += 1;
      continue;
    }
    if (codeUnit <= 0x7ff) {
      byteLength += 2;
      continue;
    }
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return null;
      byteLength += 4;
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) return null;
    byteLength += 3;
  }
  return byteLength;
}

function hasAsciiControlCharacterV1(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || codeUnit === 0x7f) return true;
  }
  return false;
}

function isBoundedTextV1(value: unknown, maximumUtf8Bytes: number): value is string {
  if (
    typeof value !== "string" || value.length === 0 || value !== value.trim() ||
    hasAsciiControlCharacterV1(value)
  ) return false;
  const byteLength = utf8ByteLengthV1(value);
  return byteLength !== null && byteLength <= maximumUtf8Bytes;
}

function isBoundedDisplayTextV1(value: unknown, maximumUtf8Bytes: number): value is string {
  if (
    typeof value !== "string" || value.trim().length === 0 ||
    hasAsciiControlCharacterV1(value)
  ) return false;
  const byteLength = utf8ByteLengthV1(value);
  return byteLength !== null && byteLength <= maximumUtf8Bytes;
}

function isBrowserPiCustomModelApiV1(value: unknown): value is BrowserPiCustomModelApiV1 {
  return value === "openai-completions" || value === "openai-responses" ||
    value === "anthropic-messages" || value === "google-generative-ai";
}

function isCustomProfileIdV1(value: unknown): value is string {
  return isBoundedTextV1(value, customProfileIdMaximumUtf8BytesV1) &&
    /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/u.test(value);
}

function canonicalHttpsBaseUrlV1(value: unknown): string | null {
  if (!isBoundedTextV1(value, customProfileBaseUrlMaximumUtf8BytesV1)) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" || url.username.length !== 0 || url.password.length !== 0 ||
      url.search.length !== 0 || url.hash.length !== 0 || url.origin === "null"
    ) return null;
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/u, "");
    const canonical = `${url.origin}${path}`;
    return canonical === value ? canonical : null;
  } catch {
    return null;
  }
}

function admitBrowserPiModelSelectionV1(value: unknown): BrowserPiModelSelectionV1 | null {
  const builtin = exactDataRecordV1(value, [
    "kind",
    "providerId",
    "modelId",
    "api",
    "baseUrl",
  ]);
  const builtinBaseUrl = builtin === null ? null : canonicalHttpsBaseUrlV1(builtin.baseUrl);
  if (
    builtin !== null && builtin.kind === "builtin" && isIdentifierV1(builtin.providerId) &&
    isBoundedTextV1(builtin.modelId, catalogModelIdMaximumUtf8BytesV1) &&
    isBrowserPiCustomModelApiV1(builtin.api) && builtinBaseUrl !== null
  ) {
    return {
      kind: "builtin",
      providerId: builtin.providerId,
      modelId: builtin.modelId,
      api: builtin.api,
      baseUrl: builtinBaseUrl,
    };
  }

  const custom = exactDataRecordV1(value, ["kind", "profile"]);
  if (custom === null || custom.kind !== "custom") return null;
  const profile = exactDataRecordV1(custom.profile, [
    "profileId",
    "displayName",
    "api",
    "baseUrl",
    "modelId",
    "contextWindow",
    "maxTokens",
  ]);
  if (profile === null) return null;
  const baseUrl = canonicalHttpsBaseUrlV1(profile.baseUrl);
  if (
    !isCustomProfileIdV1(profile.profileId) ||
    !isBoundedTextV1(profile.displayName, customProfileDisplayNameMaximumUtf8BytesV1) ||
    !isBrowserPiCustomModelApiV1(profile.api) ||
    baseUrl === null ||
    !isBoundedTextV1(profile.modelId, customProfileModelIdMaximumUtf8BytesV1) ||
    !isPositiveSafeIntegerV1(profile.contextWindow) ||
    profile.contextWindow > customProfileContextWindowMaximumV1 ||
    !isPositiveSafeIntegerV1(profile.maxTokens) ||
    profile.maxTokens > customProfileMaxTokensMaximumV1 ||
    profile.maxTokens > profile.contextWindow
  ) return null;
  return {
    kind: "custom",
    profile: {
      profileId: profile.profileId,
      displayName: profile.displayName,
      api: profile.api,
      baseUrl,
      modelId: profile.modelId,
      contextWindow: profile.contextWindow,
      maxTokens: profile.maxTokens,
    },
  };
}

export function browserPiSelectionEndpointOriginV1(
  selection: BrowserPiModelSelectionV1,
): string | null {
  const baseUrl = canonicalHttpsBaseUrlV1(
    selection.kind === "builtin" ? selection.baseUrl : selection.profile.baseUrl,
  );
  return baseUrl === null ? null : new URL(baseUrl).origin;
}

function isCatalogAvailabilityV1(value: unknown): value is BrowserPiCatalogAvailabilityV1 {
  return value === "available" || value === "unavailable";
}

function isCatalogBaseUrlV1(value: unknown): value is string {
  return value === "" || isBoundedTextV1(value, catalogBaseUrlMaximumUtf8BytesV1);
}

function admitCatalogModelV1(value: unknown): BrowserPiCatalogModelWireV1 | null {
  const model = exactDataRecordV1(value, [
    "id",
    "name",
    "api",
    "baseUrl",
    "reasoning",
    "input",
    "contextWindow",
    "maxTokens",
    "availability",
  ]);
  if (
    model === null || !isBoundedTextV1(model.id, catalogModelIdMaximumUtf8BytesV1) ||
    !isBoundedDisplayTextV1(model.name, catalogNameMaximumUtf8BytesV1) ||
    !isBoundedTextV1(model.api, catalogNameMaximumUtf8BytesV1) ||
    !isCatalogBaseUrlV1(model.baseUrl) ||
    typeof model.reasoning !== "boolean" || !isPositiveSafeIntegerV1(model.contextWindow) ||
    !isPositiveSafeIntegerV1(model.maxTokens) || !isCatalogAvailabilityV1(model.availability)
  ) return null;
  const input = exactArrayV1(model.input, 2);
  if (
    input === null || input.length === 0 ||
    input.some((kind) => kind !== "text" && kind !== "image") ||
    new Set(input).size !== input.length
  ) return null;
  return {
    id: model.id,
    name: model.name,
    api: model.api,
    baseUrl: model.baseUrl,
    reasoning: model.reasoning,
    input: input as readonly ("text" | "image")[],
    contextWindow: model.contextWindow,
    maxTokens: model.maxTokens,
    availability: model.availability,
  };
}

function admitCatalogProviderV1(value: unknown): BrowserPiCatalogProviderWireV1 | null {
  const provider = exactDataRecordV1(value, [
    "id",
    "name",
    "baseUrl",
    "availability",
    "models",
  ]);
  if (
    provider === null || !isIdentifierV1(provider.id) ||
    !isBoundedDisplayTextV1(provider.name, catalogNameMaximumUtf8BytesV1) ||
    (provider.baseUrl !== null &&
      !isBoundedTextV1(provider.baseUrl, catalogBaseUrlMaximumUtf8BytesV1)) ||
    !isCatalogAvailabilityV1(provider.availability)
  ) return null;
  const rawModels = exactArrayV1(provider.models, catalogModelsPerProviderMaximumV1);
  if (rawModels === null) return null;
  const models: BrowserPiCatalogModelWireV1[] = [];
  const modelIds = new Set<string>();
  for (const rawModel of rawModels) {
    const model = admitCatalogModelV1(rawModel);
    if (model === null || modelIds.has(model.id)) return null;
    modelIds.add(model.id);
    models.push(model);
  }
  const expectedAvailability = models.some(({ availability }) => availability === "available")
    ? "available"
    : "unavailable";
  if (provider.availability !== expectedAvailability) return null;
  return {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    availability: provider.availability,
    models,
  };
}

export function admitBrowserPiProviderCatalogWireV1(
  value: unknown,
): BrowserPiProviderCatalogWireV1 | null {
  const catalog = exactDataRecordV1(value, ["revision", "distribution", "providers"]);
  if (
    catalog === null || catalog.revision !== 1 ||
    !isBrowserPiDistributionIdentityV1(catalog.distribution)
  ) return null;
  const rawProviders = exactArrayV1(catalog.providers, catalogProviderMaximumV1);
  if (rawProviders === null) return null;
  const providers: BrowserPiCatalogProviderWireV1[] = [];
  const providerIds = new Set<string>();
  let modelCount = 0;
  for (const rawProvider of rawProviders) {
    const provider = admitCatalogProviderV1(rawProvider);
    if (provider === null || providerIds.has(provider.id)) return null;
    providerIds.add(provider.id);
    modelCount += provider.models.length;
    if (modelCount > catalogModelsTotalMaximumV1) return null;
    providers.push(provider);
  }
  return {
    revision: 1,
    distribution: catalog.distribution,
    providers,
  };
}

function isNormalizedWorkspacePathV1(value: unknown): value is string {
  const byteLength = typeof value === "string" ? utf8ByteLengthV1(value) : null;
  if (
    typeof value !== "string" || value.length === 0 || value.startsWith("/") ||
    value.endsWith("/") || value.includes("\0") ||
    byteLength === null || byteLength > workspacePathMaximumUtf8BytesV1
  ) return false;
  const components = value.split("/");
  return components.length <= workspacePathMaximumComponentsV1 &&
    components.every((component) =>
      component.length > 0 && component !== "." && component !== ".."
    );
}

function admitExecutionBindingV1(value: unknown): BrowserPiWorkerExecutionBindingV1 | null {
  const binding = exactDataRecordV1(value, [
    "revision",
    "programId",
    "workspaceId",
    "workspaceSessionId",
    "expectedGeneration",
  ]);
  if (
    binding === null || binding.revision !== 1 || !isIdentifierV1(binding.programId) ||
    !isIdentifierV1(binding.workspaceId) || !isIdentifierV1(binding.workspaceSessionId) ||
    !isPositiveSafeIntegerV1(binding.expectedGeneration)
  ) return null;
  return {
    revision: 1,
    programId: binding.programId,
    workspaceId: binding.workspaceId,
    workspaceSessionId: binding.workspaceSessionId,
    expectedGeneration: binding.expectedGeneration,
  };
}

export function admitBrowserPiNetworkApprovalRequestV1(
  value: unknown,
): BrowserPiNetworkApprovalRequestV1 | null {
  const approval = exactDataRecordV1(value, [
    "revision",
    "approvalId",
    "programId",
    "workspaceId",
    "workspaceSessionId",
    "sessionId",
    "runId",
    "toolCallId",
    "operation",
    "origin",
    "url",
  ]);
  if (
    approval === null || approval.revision !== 1 || !isIdentifierV1(approval.approvalId) ||
    !isIdentifierV1(approval.programId) || !isIdentifierV1(approval.workspaceId) ||
    !isIdentifierV1(approval.workspaceSessionId) || !isIdentifierV1(approval.sessionId) ||
    !isIdentifierV1(approval.runId) || !isIdentifierV1(approval.toolCallId) ||
    approval.operation !== "fetch_url" && approval.operation !== "download"
  ) return null;
  const url = normalizeBrowserNetworkUrlV1(approval.url);
  if (url === null || url !== approval.url || approval.origin !== new URL(url).origin) return null;
  return {
    revision: 1,
    approvalId: approval.approvalId,
    programId: approval.programId,
    workspaceId: approval.workspaceId,
    workspaceSessionId: approval.workspaceSessionId,
    sessionId: approval.sessionId,
    runId: approval.runId,
    toolCallId: approval.toolCallId,
    operation: approval.operation,
    origin: new URL(url).origin,
    url,
  };
}

function admitWorkspaceRequestRecordV1(value: unknown): BrowserPiWorkspaceRequestRecordV1 | null {
  const attach = exactDataRecordV1(value, ["method", "descriptor"]);
  if (attach !== null && attach.method === "attach_workspace") {
    const descriptor = admitExecutionBindingV1(attach.descriptor);
    if (descriptor === null) return null;
    return { method: "attach_workspace", descriptor };
  }
  const scoped = exactDataRecordV1(value, ["method", "workspaceSessionId"]);
  if (
    scoped !== null &&
    (scoped.method === "close_workspace" || scoped.method === "query_workspace") &&
    isIdentifierV1(scoped.workspaceSessionId)
  ) {
    return { method: scoped.method, workspaceSessionId: scoped.workspaceSessionId };
  }
  const acknowledge = exactDataRecordV1(value, [
    "method",
    "workspaceSessionId",
    "throughSequence",
  ]);
  if (
    acknowledge !== null && acknowledge.method === "acknowledge_workspace_receipts" &&
    isIdentifierV1(acknowledge.workspaceSessionId) &&
    isPositiveSafeIntegerV1(acknowledge.throughSequence)
  ) {
    return {
      method: "acknowledge_workspace_receipts",
      workspaceSessionId: acknowledge.workspaceSessionId,
      throughSequence: acknowledge.throughSequence,
    };
  }
  const replaceNetworkGrants = exactDataRecordV1(value, [
    "method",
    "programId",
    "workspaceSessionId",
    "grants",
  ]);
  if (
    replaceNetworkGrants !== null &&
    replaceNetworkGrants.method === "replace_network_grants" &&
    isIdentifierV1(replaceNetworkGrants.workspaceSessionId)
  ) {
    const admitted = admitProgramNetworkGrantSetV1({
      revision: 1,
      programId: replaceNetworkGrants.programId,
      grants: replaceNetworkGrants.grants,
    });
    if (admitted.kind === "rejected") return null;
    return {
      method: "replace_network_grants",
      programId: admitted.value.programId,
      workspaceSessionId: replaceNetworkGrants.workspaceSessionId,
      grants: admitted.value.grants,
    };
  }
  return null;
}

function isWorkspaceDiagnosticCodeV1(
  value: unknown,
): value is BrowserPiWorkspaceMutationReceiptWireV1["diagnosticCode"] {
  return value === null || value === "cancelled" || value === "path_rejected" ||
    value === "capacity_exceeded" || value === "execution_failed";
}

const browserPiWorkspaceBashChangedPathMaximumV1 = 64;
const browserPiWorkspaceBashGenerationDeltaMaximumV1 = 128;

export function admitBrowserPiWorkspaceMutationReceiptWireV1(
  value: unknown,
): BrowserPiWorkspaceMutationReceiptWireV1 | null {
  const receipt = exactDataRecordV1(value, [
    "revision",
    "sequence",
    "programId",
    "workspaceId",
    "workspaceSessionId",
    "sessionId",
    "runId",
    "toolCallId",
    "tool",
    "expectedGeneration",
    "baseGeneration",
    "resultingGeneration",
    "outcome",
    "effect",
    "changedPaths",
    "diagnosticCode",
  ]);
  if (
    receipt === null || receipt.revision !== 1 || !isPositiveSafeIntegerV1(receipt.sequence) ||
    !isIdentifierV1(receipt.programId) || !isIdentifierV1(receipt.workspaceId) ||
    !isIdentifierV1(receipt.workspaceSessionId) || !isIdentifierV1(receipt.sessionId) ||
    !isIdentifierV1(receipt.runId) || !isIdentifierV1(receipt.toolCallId) ||
    (receipt.tool !== "write" && receipt.tool !== "edit" && receipt.tool !== "bash" &&
      receipt.tool !== "download") ||
    !isPositiveSafeIntegerV1(receipt.expectedGeneration) ||
    !isPositiveSafeIntegerV1(receipt.baseGeneration) ||
    !isPositiveSafeIntegerV1(receipt.resultingGeneration) ||
    receipt.expectedGeneration > receipt.baseGeneration ||
    (receipt.outcome !== "succeeded" && receipt.outcome !== "failed" &&
      receipt.outcome !== "cancelled") ||
    (receipt.effect !== "none" && receipt.effect !== "changed") ||
    !isWorkspaceDiagnosticCodeV1(receipt.diagnosticCode)
  ) return null;

  const changedPaths = exactArrayV1(
    receipt.changedPaths,
    receipt.tool === "bash" ? browserPiWorkspaceBashChangedPathMaximumV1 : 1,
  );
  if (changedPaths === null) return null;
  if (receipt.effect === "none") {
    if (changedPaths.length !== 0 || receipt.resultingGeneration !== receipt.baseGeneration) {
      return null;
    }
  } else {
    if (
      changedPaths.length === 0 ||
      changedPaths.some((path) => !isNormalizedWorkspacePathV1(path)) ||
      new Set(changedPaths).size !== changedPaths.length
    ) return null;
    const generationDelta = receipt.resultingGeneration - receipt.baseGeneration;
    if (
      receipt.tool === "bash"
        ? generationDelta < 1 ||
          generationDelta > browserPiWorkspaceBashGenerationDeltaMaximumV1
        : changedPaths.length !== 1 || generationDelta !== 1
    ) return null;
  }
  if (
    (receipt.outcome === "succeeded" && receipt.diagnosticCode !== null) ||
    (receipt.outcome === "cancelled" && receipt.diagnosticCode !== "cancelled") ||
    (receipt.outcome === "failed" &&
      (receipt.diagnosticCode === null || receipt.diagnosticCode === "cancelled"))
  ) return null;

  return {
    revision: 1,
    sequence: receipt.sequence,
    programId: receipt.programId,
    workspaceId: receipt.workspaceId,
    workspaceSessionId: receipt.workspaceSessionId,
    sessionId: receipt.sessionId,
    runId: receipt.runId,
    toolCallId: receipt.toolCallId,
    tool: receipt.tool,
    expectedGeneration: receipt.expectedGeneration,
    baseGeneration: receipt.baseGeneration,
    resultingGeneration: receipt.resultingGeneration,
    outcome: receipt.outcome,
    effect: receipt.effect,
    changedPaths: changedPaths as readonly string[],
    diagnosticCode: receipt.diagnosticCode,
  };
}

export function admitBrowserPiWorkspaceSnapshotWireV1(
  value: unknown,
): BrowserPiWorkspaceSnapshotWireV1 | null {
  const snapshot = exactDataRecordV1(value, [
    "revision",
    "phase",
    "programId",
    "workspaceId",
    "workspaceSessionId",
    "generation",
    "receipts",
  ]);
  if (
    snapshot === null || snapshot.revision !== 1 ||
    (snapshot.phase !== "open" && snapshot.phase !== "closed") ||
    !isIdentifierV1(snapshot.programId) || !isIdentifierV1(snapshot.workspaceId) ||
    !isIdentifierV1(snapshot.workspaceSessionId) ||
    !isPositiveSafeIntegerV1(snapshot.generation)
  ) return null;
  const rawReceipts = exactArrayV1(snapshot.receipts, workspaceReceiptMaximumV1);
  if (rawReceipts === null) return null;
  const receipts: BrowserPiWorkspaceMutationReceiptWireV1[] = [];
  for (const rawReceipt of rawReceipts) {
    const receipt = admitBrowserPiWorkspaceMutationReceiptWireV1(rawReceipt);
    const predecessor = receipts.at(-1);
    if (
      receipt === null || receipt.programId !== snapshot.programId ||
      receipt.workspaceId !== snapshot.workspaceId ||
      receipt.workspaceSessionId !== snapshot.workspaceSessionId ||
      receipt.resultingGeneration > snapshot.generation ||
      (predecessor !== undefined && receipt.sequence !== predecessor.sequence + 1)
    ) return null;
    receipts.push(receipt);
  }
  return {
    revision: 1,
    phase: snapshot.phase,
    programId: snapshot.programId,
    workspaceId: snapshot.workspaceId,
    workspaceSessionId: snapshot.workspaceSessionId,
    generation: snapshot.generation,
    receipts,
  };
}

export function admitBrowserPiWorkerInboundMessageV1(
  value: unknown,
): BrowserPiWorkerInboundMessageV1 | null {
  const discriminator = exactDataRecordV1(value, ["revision", "kind", "requestId"]) ??
    exactDataRecordV1(value, [
      "revision",
      "kind",
      "requestId",
      "approvalId",
      "decision",
    ]) ??
    exactDataRecordV1(value, [
      "revision",
      "kind",
      "requestId",
      "record",
      "execution",
    ]) ?? exactDataRecordV1(value, ["revision", "kind", "requestId", "record"]) ??
    exactDataRecordV1(value, ["revision", "kind", "requestId", "selection"]) ??
    exactDataRecordV1(value, [
      "revision",
      "kind",
      "requestId",
      "runtime",
      "selection",
      "credential",
    ]);
  if (
    discriminator === null || discriminator.revision !== 1 ||
    !isRequestIdV1(discriminator.requestId)
  ) return null;
  if (discriminator.kind === "catalog_request") {
    return { revision: 1, kind: "catalog_request", requestId: discriminator.requestId };
  }
  if (discriminator.kind === "test_connection") {
    return { revision: 1, kind: "test_connection", requestId: discriminator.requestId };
  }
  if (discriminator.kind === "select_model") {
    const selection = admitBrowserPiModelSelectionV1(discriminator.selection);
    if (selection === null) return null;
    return {
      revision: 1,
      kind: "select_model",
      requestId: discriminator.requestId,
      selection,
    };
  }
  if (discriminator.kind === "resolve_network_approval") {
    if (
      !isIdentifierV1(discriminator.approvalId) ||
      (discriminator.decision !== "allow_once" && discriminator.decision !== "deny")
    ) return null;
    return {
      revision: 1,
      kind: "resolve_network_approval",
      requestId: discriminator.requestId,
      approvalId: discriminator.approvalId,
      decision: discriminator.decision,
    };
  }
  if (discriminator.kind === "workspace_request") {
    if (Object.hasOwn(discriminator, "execution")) return null;
    const record = admitWorkspaceRequestRecordV1(discriminator.record);
    if (record === null) return null;
    return {
      revision: 1,
      kind: "workspace_request",
      requestId: discriminator.requestId,
      record,
    };
  }
  if (discriminator.kind === "rpc_request") {
    const request = admitBrowserPiEngineRequestV1(discriminator.record);
    if (request?.method === "submit") {
      const execution = admitExecutionBindingV1(discriminator.execution);
      const submit = admitCreatorAgentSubmitTextV1(request.params.text);
      if (
        execution === null || submit.kind === "rejected" ||
        execution.programId !== submit.value.programId
      ) return null;
      return {
        revision: 1,
        kind: "rpc_request",
        requestId: discriminator.requestId,
        record: discriminator.record,
        execution,
      };
    }
    // Invalid inner records still reach the existing inner admission and
    // `invalid_request` response. Only a valid submit may carry execution data.
    if (Object.hasOwn(discriminator, "execution")) return null;
    return {
      revision: 1,
      kind: "rpc_request",
      requestId: discriminator.requestId,
      record: discriminator.record,
    };
  }
  if (
    discriminator.kind !== "configure" ||
    (discriminator.runtime !== "deterministic_test" &&
      discriminator.runtime !== "pi_provider")
  ) {
    return null;
  }
  const selection = discriminator.selection === null
    ? null
    : admitBrowserPiModelSelectionV1(discriminator.selection);
  if (
    (discriminator.runtime === "deterministic_test" && discriminator.selection !== null) ||
    (discriminator.runtime === "pi_provider" && selection === null)
  ) return null;
  const directCredential = exactDataRecordV1(discriminator.credential, ["kind", "value"]);
  const handoffCredential = exactDataRecordV1(discriminator.credential, [
    "kind",
    "handoffId",
    "binding",
  ]);
  const ready = handoffCredential?.kind === "vault_handoff"
    ? admitCredentialVaultHandoffReadyV1({
      revision: 1,
      kind: "credential_vault_handoff_ready",
      handoffId: handoffCredential.handoffId,
      binding: handoffCredential.binding,
    })
    : null;
  if (
    (directCredential === null || directCredential.kind !== "api_key" ||
      typeof directCredential.value !== "string" || directCredential.value.length === 0 ||
      directCredential.value.length > credentialMaximumCharactersV1) && ready === null
  ) return null;
  return {
    revision: 1,
    kind: "configure",
    requestId: discriminator.requestId,
    runtime: discriminator.runtime,
    selection,
    credential: ready === null
      ? { kind: "api_key", value: directCredential?.value as string }
      : { kind: "vault_handoff", handoffId: ready.handoffId, binding: ready.binding },
  };
}

export function admitBrowserPiWorkerOutboundMessageV1(
  value: unknown,
): BrowserPiWorkerOutboundMessageV1 | null {
  const approvalEvent = exactDataRecordV1(value, ["revision", "kind", "approval"]);
  if (
    approvalEvent !== null && approvalEvent.revision === 1 &&
    approvalEvent.kind === "network_approval_required"
  ) {
    const approval = admitBrowserPiNetworkApprovalRequestV1(approvalEvent.approval);
    return approval === null ? null : { revision: 1, kind: "network_approval_required", approval };
  }
  const base = exactDataRecordV1(value, ["revision", "kind", "code"]) ??
    exactDataRecordV1(value, ["revision", "kind", "record"]) ??
    exactDataRecordV1(value, ["revision", "kind", "requestId", "code"]) ??
    exactDataRecordV1(value, [
      "revision",
      "kind",
      "requestId",
      "runtime",
      "selection",
      "distribution",
    ]) ??
    exactDataRecordV1(value, ["revision", "kind", "requestId", "selection"]) ??
    exactDataRecordV1(value, ["revision", "kind", "requestId", "ok", "catalog"]) ??
    exactDataRecordV1(value, [
      "revision",
      "kind",
      "requestId",
      "ok",
      "approvalId",
      "decision",
    ]) ??
    exactDataRecordV1(value, ["revision", "kind", "requestId", "ok", "response"]) ??
    exactDataRecordV1(value, ["revision", "kind", "requestId", "ok", "code"]);
  if (base === null || base.revision !== 1) return null;
  if (base.kind === "protocol_failure") {
    if (
      base.code !== "invalid_message" && base.code !== "already_configured" &&
      base.code !== "test_in_progress" &&
      base.code !== "distribution_mismatch"
    ) return null;
    return { revision: 1, kind: "protocol_failure", code: base.code };
  }
  if (base.kind === "rpc_record") {
    return { revision: 1, kind: "rpc_record", record: base.record };
  }
  if (!isRequestIdV1(base.requestId)) return null;
  if (base.kind === "network_approval_response") {
    if (base.ok === false && base.code === "not_pending") {
      return {
        revision: 1,
        kind: "network_approval_response",
        requestId: base.requestId,
        ok: false,
        code: "not_pending",
      };
    }
    if (
      base.ok !== true || !isIdentifierV1(base.approvalId) ||
      (base.decision !== "allow_once" && base.decision !== "deny")
    ) return null;
    return {
      revision: 1,
      kind: "network_approval_response",
      requestId: base.requestId,
      ok: true,
      approvalId: base.approvalId,
      decision: base.decision,
    };
  }
  if (base.kind === "configuration_failure") {
    if (base.code !== "selection_unavailable" && base.code !== "credential_handoff_failed") {
      return null;
    }
    return {
      revision: 1,
      kind: "configuration_failure",
      requestId: base.requestId,
      code: base.code,
    };
  }
  if (base.kind === "connection_test_failure") {
    if (base.code !== "not_configured" && base.code !== "connection_failed") return null;
    return {
      revision: 1,
      kind: "connection_test_failure",
      requestId: base.requestId,
      code: base.code,
    };
  }
  if (base.kind === "model_selection_failure") {
    if (
      base.code !== "not_configured" && base.code !== "selection_unavailable" &&
      base.code !== "credential_scope_mismatch" && base.code !== "busy"
    ) return null;
    return {
      revision: 1,
      kind: "model_selection_failure",
      requestId: base.requestId,
      code: base.code,
    };
  }
  if (base.kind === "model_selected") {
    const selection = admitBrowserPiModelSelectionV1(base.selection);
    if (selection === null) return null;
    return {
      revision: 1,
      kind: "model_selected",
      requestId: base.requestId,
      selection,
    };
  }
  if (base.kind === "catalog_response") {
    if (base.ok === true && Object.hasOwn(base, "catalog")) {
      const catalog = admitBrowserPiProviderCatalogWireV1(base.catalog);
      if (catalog === null) return null;
      return {
        revision: 1,
        kind: "catalog_response",
        requestId: base.requestId,
        ok: true,
        catalog,
      };
    }
    if (base.ok === false && base.code === "catalog_unavailable") {
      return {
        revision: 1,
        kind: "catalog_response",
        requestId: base.requestId,
        ok: false,
        code: "catalog_unavailable",
      };
    }
    return null;
  }
  if (base.kind === "configured" || base.kind === "ready") {
    if (
      (base.runtime !== "deterministic_test" && base.runtime !== "pi_provider") ||
      !isBrowserPiDistributionIdentityV1(base.distribution)
    ) return null;
    const selection = base.selection === null
      ? null
      : admitBrowserPiModelSelectionV1(base.selection);
    if (
      (base.runtime === "deterministic_test" && base.selection !== null) ||
      (base.runtime === "pi_provider" && selection === null)
    ) return null;
    return {
      revision: 1,
      kind: base.kind,
      requestId: base.requestId,
      runtime: base.runtime,
      selection,
      distribution: base.distribution,
    };
  }
  if (base.kind !== "rpc_response") return null;
  if (base.ok === true && Object.hasOwn(base, "response")) {
    return {
      revision: 1,
      kind: "rpc_response",
      requestId: base.requestId,
      ok: true,
      response: base.response,
    };
  }
  if (
    base.ok === false &&
    (base.code === "not_initialized" || base.code === "invalid_request" ||
      base.code === "session_mismatch")
  ) {
    return {
      revision: 1,
      kind: "rpc_response",
      requestId: base.requestId,
      ok: false,
      code: base.code,
    };
  }
  return null;
}

function admitWorkspaceSuccessResponseV1(
  value: unknown,
): BrowserPiWorkspaceSuccessResponseV1 | null {
  const ordinary = exactDataRecordV1(value, ["method", "snapshot"]);
  if (
    ordinary !== null &&
    (ordinary.method === "attach_workspace" || ordinary.method === "close_workspace" ||
      ordinary.method === "query_workspace" || ordinary.method === "replace_network_grants")
  ) {
    const snapshot = admitBrowserPiWorkspaceSnapshotWireV1(ordinary.snapshot);
    if (
      snapshot === null ||
      ((ordinary.method === "attach_workspace" || ordinary.method === "replace_network_grants") &&
        snapshot.phase !== "open") ||
      (ordinary.method === "close_workspace" && snapshot.phase !== "closed")
    ) return null;
    return { method: ordinary.method, snapshot };
  }
  const acknowledge = exactDataRecordV1(value, [
    "method",
    "throughSequence",
    "snapshot",
  ]);
  const throughSequence = acknowledge?.throughSequence;
  if (
    acknowledge === null || acknowledge.method !== "acknowledge_workspace_receipts" ||
    !isPositiveSafeIntegerV1(throughSequence)
  ) return null;
  const snapshot = admitBrowserPiWorkspaceSnapshotWireV1(acknowledge.snapshot);
  if (
    snapshot === null ||
    snapshot.receipts.some((receipt) => receipt.sequence <= throughSequence)
  ) return null;
  return {
    method: "acknowledge_workspace_receipts",
    throughSequence,
    snapshot,
  };
}

function isWorkspaceFailureCodeV1(value: unknown): value is BrowserPiWorkspaceFailureCodeV1 {
  return value === "not_initialized" || value === "invalid_request" ||
    value === "workspace_busy" || value === "workspace_mismatch" ||
    value === "receipt_sequence_invalid" || value === "workspace_failed";
}

export function admitBrowserPiWorkerWorkspaceOutboundMessageV1(
  value: unknown,
): BrowserPiWorkerWorkspaceOutboundMessageV1 | null {
  const event = exactDataRecordV1(value, ["revision", "kind", "receipt"]);
  if (event !== null && event.revision === 1 && event.kind === "workspace_receipt") {
    const receipt = admitBrowserPiWorkspaceMutationReceiptWireV1(event.receipt);
    return receipt === null ? null : { revision: 1, kind: "workspace_receipt", receipt };
  }

  const success = exactDataRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "ok",
    "response",
  ]);
  if (
    success !== null && success.revision === 1 && success.kind === "workspace_response" &&
    isRequestIdV1(success.requestId) && success.ok === true
  ) {
    const response = admitWorkspaceSuccessResponseV1(success.response);
    if (response === null) return null;
    return {
      revision: 1,
      kind: "workspace_response",
      requestId: success.requestId,
      ok: true,
      response,
    };
  }

  const failure = exactDataRecordV1(value, [
    "revision",
    "kind",
    "requestId",
    "ok",
    "code",
  ]);
  if (
    failure === null || failure.revision !== 1 || failure.kind !== "workspace_response" ||
    !isRequestIdV1(failure.requestId) || failure.ok !== false ||
    !isWorkspaceFailureCodeV1(failure.code)
  ) return null;
  return {
    revision: 1,
    kind: "workspace_response",
    requestId: failure.requestId,
    ok: false,
    code: failure.code,
  };
}

export function admitBrowserPiWorkerAnyOutboundMessageV1(
  value: unknown,
): BrowserPiWorkerAnyOutboundMessageV1 | null {
  return admitBrowserPiWorkerWorkspaceOutboundMessageV1(value) ??
    admitBrowserPiWorkerOutboundMessageV1(value);
}

export function admitBrowserPiEngineRequestV1(value: unknown): BrowserPiEngineRequestV1 | null {
  const base = exactDataRecordV1(value, ["revision", "requestId", "method"]) ??
    exactDataRecordV1(value, ["revision", "requestId", "method", "params"]);
  if (
    base === null || base.revision !== 1 || !isRequestIdV1(base.requestId) ||
    (base.method !== "start" && base.method !== "submit" && base.method !== "cancel")
  ) return null;
  if (base.method === "start") {
    if (Object.hasOwn(base, "params")) return null;
    return { revision: 1, requestId: base.requestId, method: "start" };
  }
  if (base.method === "submit") {
    const params = exactDataRecordV1(base.params, ["sessionId", "text"]);
    if (params === null || !isIdentifierV1(params.sessionId)) return null;
    const submit = admitCreatorAgentSubmitTextV1(params.text);
    if (submit.kind === "rejected") return null;
    return {
      revision: 1,
      requestId: base.requestId,
      method: "submit",
      params: {
        sessionId: params.sessionId,
        text: params.text as string,
      },
    };
  }
  const params = exactDataRecordV1(base.params, ["sessionId", "runId"]);
  if (
    params === null || !isIdentifierV1(params.sessionId) || !isIdentifierV1(params.runId)
  ) return null;
  return {
    revision: 1,
    requestId: base.requestId,
    method: "cancel",
    params: { sessionId: params.sessionId, runId: params.runId },
  };
}

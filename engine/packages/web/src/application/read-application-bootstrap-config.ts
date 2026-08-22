// SPDX-License-Identifier: MIT
import {
  admitApplicationBootstrapConfigV1,
  parseStrictJson,
  parseStrictJsonLimitsV1,
  type ApplicationBootstrapConfigV1,
  type ApplicationBootstrapEntryV1,
  type DeepReadonly,
} from "@sillymaker/base";

const applicationBootstrapElementIdV1 = "sillymaker-application-bootstrap";
const applicationBootstrapDataAttributeV1 = "data-sillymaker-bootstrap-config";
const applicationBootstrapDataVersionV1 = "v1";
const applicationBootstrapMediaTypeV1 = "application/json";
const applicationBootstrapMaximumBytesV1 = 4_096;
const htmlNamespaceV1 = "http://www.w3.org/1999/xhtml";

const applicationBootstrapJsonLimitsV1 = parseStrictJsonLimitsV1({
  maxBytes: applicationBootstrapMaximumBytesV1,
  maxDepth: 2,
  maxArrayItems: 1,
  maxObjectMembers: 4,
  maxNodes: 8,
  maxStringBytes: 64,
});

export type ApplicationBootstrapConfigReadFailureCodeInternalV1 =
  | "web.application_bootstrap.missing_source"
  | "web.application_bootstrap.duplicate_source"
  | "web.application_bootstrap.invalid_element"
  | "web.application_bootstrap.invalid_id"
  | "web.application_bootstrap.invalid_type"
  | "web.application_bootstrap.invalid_version"
  | "web.application_bootstrap.external_source"
  | "web.application_bootstrap.source_too_large"
  | "web.application_bootstrap.malformed_json"
  | "web.application_bootstrap.entry_mismatch";

export interface ApplicationBootstrapConfigReadFailureInternalV1 extends Error {
  readonly code: ApplicationBootstrapConfigReadFailureCodeInternalV1;
}

function createReadFailureInternalV1(
  code: ApplicationBootstrapConfigReadFailureCodeInternalV1,
): ApplicationBootstrapConfigReadFailureInternalV1 {
  const failure = new TypeError(code) as ApplicationBootstrapConfigReadFailureInternalV1;
  failure.name = "ApplicationBootstrapConfigReadFailureInternalV1";
  Object.defineProperty(failure, "code", { value: code, enumerable: true });
  return Object.freeze(failure);
}

function failReadInternalV1(code: ApplicationBootstrapConfigReadFailureCodeInternalV1): never {
  throw createReadFailureInternalV1(code);
}

function resolveBootstrapScriptInternalV1(document: Document): HTMLScriptElement {
  const sources = document.querySelectorAll(
    `[id="${applicationBootstrapElementIdV1}"],[${applicationBootstrapDataAttributeV1}]`,
  );
  if (sources.length === 0) {
    return failReadInternalV1("web.application_bootstrap.missing_source");
  }
  if (sources.length !== 1) {
    return failReadInternalV1("web.application_bootstrap.duplicate_source");
  }

  const source = sources.item(0);
  if (source.namespaceURI !== htmlNamespaceV1 || source.localName !== "script") {
    return failReadInternalV1("web.application_bootstrap.invalid_element");
  }
  if (source.getAttribute("id") !== applicationBootstrapElementIdV1) {
    return failReadInternalV1("web.application_bootstrap.invalid_id");
  }
  if (source.getAttribute("type") !== applicationBootstrapMediaTypeV1) {
    return failReadInternalV1("web.application_bootstrap.invalid_type");
  }
  if (
    source.getAttribute(applicationBootstrapDataAttributeV1) !==
      applicationBootstrapDataVersionV1
  ) {
    return failReadInternalV1("web.application_bootstrap.invalid_version");
  }
  if (source.hasAttribute("src")) {
    return failReadInternalV1("web.application_bootstrap.external_source");
  }
  return source as HTMLScriptElement;
}

/** Reads one inert Host-produced config source without retaining the DOM or parsed record. */
export function readApplicationBootstrapConfigFromDocumentInternalV1(
  document: Document,
  requiredEntry: ApplicationBootstrapEntryV1,
): DeepReadonly<ApplicationBootstrapConfigV1> {
  const source = resolveBootstrapScriptInternalV1(document);
  const bytes = new TextEncoder().encode(source.textContent ?? "");
  const parsed = parseStrictJson(bytes, applicationBootstrapJsonLimitsV1);
  if (!parsed.ok) {
    if (parsed.error.code === "limit.bytes") {
      return failReadInternalV1("web.application_bootstrap.source_too_large");
    }
    return failReadInternalV1("web.application_bootstrap.malformed_json");
  }
  const config = admitApplicationBootstrapConfigV1(parsed.value);
  if (config.entry !== requiredEntry) {
    return failReadInternalV1("web.application_bootstrap.entry_mismatch");
  }
  return config;
}

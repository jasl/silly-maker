// SPDX-License-Identifier: MIT
import {
  assertExtensionIdentifierInternalV1,
  ExtensionRuntimeErrorInternalV1,
} from "./contracts.ts";
import type {
  AdmittedRequiredExtensionsInternalV1,
  ExtensionRuntimeErrorCodeInternalV1,
  ExtensionSelectedCandidateInternalV1,
  RequiredExtensionAdmissionInputInternalV1,
} from "./contracts.ts";

function normalizeRequiredIdsInternalV1(
  input: readonly string[],
  subject: string,
): readonly string[] {
  if (!Array.isArray(input)) {
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.invalid_definition",
      `${subject} must be an array`,
    );
  }
  const ids = input.map((id) => {
    assertExtensionIdentifierInternalV1(id, `${subject} id`);
    return id;
  });
  if (new Set(ids).size !== ids.length) {
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.invalid_definition",
      `${subject} must not repeat an id`,
    );
  }
  return Object.freeze(ids);
}

function normalizeSelectedCandidatesInternalV1<TValue>(
  input: readonly ExtensionSelectedCandidateInternalV1<TValue>[],
  subject: string,
): readonly ExtensionSelectedCandidateInternalV1<TValue>[] {
  if (!Array.isArray(input)) {
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.invalid_definition",
      `${subject} must be an array`,
    );
  }
  return Object.freeze(input.map((candidate) => {
    if (candidate === null || typeof candidate !== "object") {
      throw new ExtensionRuntimeErrorInternalV1(
        "extension_runtime.invalid_definition",
        `${subject} candidate must be an object`,
      );
    }
    assertExtensionIdentifierInternalV1(candidate.id, `${subject} candidate id`);
    return Object.freeze({ id: candidate.id, value: candidate.value });
  }));
}

function admitExactlyOneInternalV1<TValue>(
  selected: readonly ExtensionSelectedCandidateInternalV1<TValue>[],
  requiredIds: readonly string[],
  subject: string,
  missingCode: ExtensionRuntimeErrorCodeInternalV1,
  ambiguousCode: ExtensionRuntimeErrorCodeInternalV1,
): readonly ExtensionSelectedCandidateInternalV1<TValue>[] {
  return Object.freeze(requiredIds.map((id) => {
    const matches = selected.filter((candidate) => candidate.id === id);
    if (matches.length === 0) {
      throw new ExtensionRuntimeErrorInternalV1(
        missingCode,
        `required ${subject} ${id} has no selected candidate`,
      );
    }
    if (matches.length > 1) {
      throw new ExtensionRuntimeErrorInternalV1(
        ambiguousCode,
        `required ${subject} ${id} has ${String(matches.length)} selected candidates`,
      );
    }
    const match = matches[0];
    if (match === undefined) {
      throw new ExtensionRuntimeErrorInternalV1(
        missingCode,
        `required ${subject} ${id} has no selected candidate`,
      );
    }
    return match;
  }));
}

/**
 * Resolves only product-selected required entries. It performs no discovery,
 * mounting, provider choice, runtime lookup, or recovery.
 */
export function admitRequiredExtensionsInternalV1<TDomain, TLocalBinding>(
  input: RequiredExtensionAdmissionInputInternalV1<TDomain, TLocalBinding>,
): AdmittedRequiredExtensionsInternalV1<TDomain, TLocalBinding> {
  if (input === null || typeof input !== "object") {
    throw new ExtensionRuntimeErrorInternalV1(
      "extension_runtime.invalid_definition",
      "required extension admission input must be an object",
    );
  }
  const selectedDomains = normalizeSelectedCandidatesInternalV1(
    input.selectedDomains,
    "domain",
  );
  const requiredDomainIds = normalizeRequiredIdsInternalV1(
    input.requiredDomainIds,
    "required domains",
  );
  const selectedLocalBindings = normalizeSelectedCandidatesInternalV1(
    input.selectedLocalBindings,
    "local binding",
  );
  const requiredLocalBindingIds = normalizeRequiredIdsInternalV1(
    input.requiredLocalBindingIds,
    "required local bindings",
  );
  return Object.freeze({
    domains: admitExactlyOneInternalV1(
      selectedDomains,
      requiredDomainIds,
      "domain",
      "extension_runtime.required_domain_missing",
      "extension_runtime.required_domain_ambiguous",
    ),
    localBindings: admitExactlyOneInternalV1(
      selectedLocalBindings,
      requiredLocalBindingIds,
      "local binding",
      "extension_runtime.required_local_binding_missing",
      "extension_runtime.required_local_binding_ambiguous",
    ),
  });
}

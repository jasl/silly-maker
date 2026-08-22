// SPDX-License-Identifier: MIT
import type { DeepReadonly } from "./values.ts";

export type ApplicationBootstrapEntryV1 = "runtime" | "author";
export type ApplicationBootstrapTargetV1 = "browser" | "deno_desktop";

/**
 * The immutable, target-neutral receipt admitted once at a GUI entry boundary.
 * Product-specific startup values remain outside this foundation until a real
 * consumer defines their contract.
 */
export interface ApplicationBootstrapConfigV1 {
  readonly revision: 1;
  readonly entry: ApplicationBootstrapEntryV1;
  readonly target: ApplicationBootstrapTargetV1;
}

const applicationBootstrapFieldsV1 = ["entry", "revision", "target"] as const;

function requireApplicationBootstrapRecordV1(
  input: unknown,
): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("application_bootstrap.invalid_record");
  }
  const actualFields = Object.keys(input).toSorted();
  if (
    actualFields.length !== applicationBootstrapFieldsV1.length ||
    actualFields.some((field, index) => field !== applicationBootstrapFieldsV1[index])
  ) {
    throw new TypeError("application_bootstrap.invalid_fields");
  }
  return input as Readonly<Record<string, unknown>>;
}

/**
 * Schema-normalizes parsed Strict JSON or a trusted Host-created record into a
 * new frozen receipt. This function deliberately does not authenticate a
 * JavaScript object's prototype or property descriptors; untrusted serialized
 * input must cross its byte/JSON boundary before reaching this admission.
 */
export function admitApplicationBootstrapConfigV1(
  input: unknown,
): DeepReadonly<ApplicationBootstrapConfigV1> {
  const record = requireApplicationBootstrapRecordV1(input);
  const revision = record.revision;
  if (revision !== 1) {
    throw new TypeError("application_bootstrap.unsupported_revision");
  }
  const entry = record.entry;
  if (entry !== "runtime" && entry !== "author") {
    throw new TypeError("application_bootstrap.invalid_entry");
  }
  const target = record.target;
  if (target !== "browser" && target !== "deno_desktop") {
    throw new TypeError("application_bootstrap.invalid_target");
  }
  return Object.freeze({ revision, entry, target });
}

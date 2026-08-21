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

const applicationBootstrapFieldsV1 = Object.freeze(["entry", "revision", "target"] as const);

function exactDataFieldsV1(
  input: unknown,
): Readonly<Record<(typeof applicationBootstrapFieldsV1)[number], PropertyDescriptor>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("application_bootstrap.invalid_record");
  }
  if (Object.getPrototypeOf(input) !== Object.prototype) {
    throw new TypeError("application_bootstrap.invalid_record");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const ownKeys = Reflect.ownKeys(descriptors);
  const actualFields = ownKeys.every((field): field is string => typeof field === "string")
    ? ownKeys.toSorted()
    : [];
  if (
    ownKeys.length !== applicationBootstrapFieldsV1.length ||
    actualFields.length !== applicationBootstrapFieldsV1.length ||
    actualFields.some((field, index) => field !== applicationBootstrapFieldsV1[index])
  ) {
    throw new TypeError("application_bootstrap.invalid_fields");
  }
  for (const field of applicationBootstrapFieldsV1) {
    const descriptor = descriptors[field];
    if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
      throw new TypeError("application_bootstrap.invalid_fields");
    }
  }
  return descriptors as Readonly<
    Record<(typeof applicationBootstrapFieldsV1)[number], PropertyDescriptor>
  >;
}

/**
 * Captures an exact startup record into a new frozen receipt. The input object
 * is never retained, so later source mutation cannot change admitted startup
 * configuration.
 */
export function admitApplicationBootstrapConfigV1(
  input: unknown,
): DeepReadonly<ApplicationBootstrapConfigV1> {
  const fields = exactDataFieldsV1(input);
  const revision: unknown = fields.revision.value;
  if (revision !== 1) {
    throw new TypeError("application_bootstrap.unsupported_revision");
  }
  const entry: unknown = fields.entry.value;
  if (entry !== "runtime" && entry !== "author") {
    throw new TypeError("application_bootstrap.invalid_entry");
  }
  const target: unknown = fields.target.value;
  if (target !== "browser" && target !== "deno_desktop") {
    throw new TypeError("application_bootstrap.invalid_target");
  }
  return Object.freeze({ revision, entry, target });
}

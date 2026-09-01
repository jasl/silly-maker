// SPDX-License-Identifier: MIT

const programPlatformIdentifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u;

/** Shared syntax admission for Program, Process, Workspace, facet, and operation identifiers. */
export function isProgramPlatformIdentifierV1(value: unknown): value is string {
  return typeof value === "string" && programPlatformIdentifierPatternV1.test(value);
}

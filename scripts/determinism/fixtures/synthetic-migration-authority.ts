// SPDX-License-Identifier: MIT

/** Production-clean callback used only to prove live extension-authority collection. */
export function syntheticMigrationAuthorityV1(value: number): number {
  return value + 1;
}

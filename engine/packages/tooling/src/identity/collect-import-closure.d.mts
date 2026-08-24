// SPDX-License-Identifier: MIT

export type BuildIdentityFacetV1 =
  | "engine"
  | "story_simulation"
  | "story_presentation"
  | "application";

export interface ImportClosureExternalImportV1 {
  readonly owner: string;
  readonly specifier: string;
}

export interface ImportClosureResultV1 {
  readonly paths: readonly string[];
  readonly errors: readonly string[];
  readonly externalImports: readonly ImportClosureExternalImportV1[];
}

export interface ImportClosureRecordV1 {
  readonly path: string;
  readonly facet: BuildIdentityFacetV1;
  readonly sha256: `sha256:${string}`;
}

export function collectImportClosure(
  root: string,
  entries: readonly string[],
): Promise<ImportClosureResultV1>;

export function buildImportClosureRecordsV1(
  root: string,
  paths: readonly string[],
  facet: BuildIdentityFacetV1,
): Promise<readonly ImportClosureRecordV1[]>;

// SPDX-License-Identifier: MIT

/**
 * Human-facing build version stamp: the application's and the engine's
 * `package.json` versions plus their git commits, captured at build time and
 * injected into the page as `globalThis.__SILLYMAKER_VERSIONS__` (see the
 * tooling Vite assembly). Every field is independently optional — a missing
 * package version, a non-git checkout, or a published engine package without
 * git metadata must degrade to `null`, never to an error.
 *
 * This is presentation-grade identity for humans comparing builds (debug
 * dock, about screens, bug reports). Simulation integrity uses the separate
 * BuildIdentity digest channel, not this stamp.
 */

export interface VersionStampV1 {
  readonly applicationVersion: string | null;
  readonly applicationCommit: string | null;
  readonly engineVersion: string | null;
  readonly engineCommit: string | null;
}

export const emptyVersionStampV1: VersionStampV1 = Object.freeze({
  applicationVersion: null,
  applicationCommit: null,
  engineVersion: null,
  engineCommit: null,
});

export const versionStampGlobalKeyV1 = "__SILLYMAKER_VERSIONS__";

function fieldV1(source: unknown, key: string): string | null {
  if (source === null || typeof source !== "object") return null;
  const value = Reflect.get(source, key) as unknown;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Reads the injected stamp. Tolerates a missing global and any malformed
 * shape (each field falls back to `null` on its own) so a page built without
 * the injection — or with a hand-edited one — can never throw here.
 */
export function readVersionStampV1(source?: unknown): VersionStampV1 {
  const raw = source === undefined ? Reflect.get(globalThis, versionStampGlobalKeyV1) : source;
  return Object.freeze({
    applicationVersion: fieldV1(raw, "applicationVersion"),
    applicationCommit: fieldV1(raw, "applicationCommit"),
    engineVersion: fieldV1(raw, "engineVersion"),
    engineCommit: fieldV1(raw, "engineCommit"),
  });
}

function sideV1(label: string, version: string | null, commit: string | null): string | null {
  if (version === null && commit === null) return null;
  if (version !== null && commit !== null) return `${label} ${version} (${commit})`;
  if (version !== null) return `${label} ${version}`;
  return `${label} ${commit ?? ""}`.trimEnd();
}

/**
 * One display line with graceful omissions, e.g.
 * `app 1.2.0 (abc1234) · engine 0.4.0 (def5678)`; `null` when nothing is
 * known (callers hide the row entirely).
 */
export function formatVersionStampV1(
  stamp: VersionStampV1,
  labels?: { readonly application?: string; readonly engine?: string },
): string | null {
  const parts = [
    sideV1(labels?.application ?? "app", stamp.applicationVersion, stamp.applicationCommit),
    sideV1(labels?.engine ?? "engine", stamp.engineVersion, stamp.engineCommit),
  ].filter((part): part is string => part !== null);
  return parts.length === 0 ? null : parts.join(" · ");
}

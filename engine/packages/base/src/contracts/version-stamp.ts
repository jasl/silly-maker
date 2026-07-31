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

const versionStampFieldMaxCodePointsV1 = 128;
const nonPrintableVersionStampPatternV1 = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u;

function boundedPrintableFieldV1(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  let codePointCount = 0;
  const codePoints = trimmed[Symbol.iterator]();
  while (!codePoints.next().done) {
    codePointCount += 1;
    if (codePointCount > versionStampFieldMaxCodePointsV1) return null;
  }
  return nonPrintableVersionStampPatternV1.test(trimmed) ? null : trimmed;
}

function fieldV1(descriptors: PropertyDescriptorMap, key: string): string | null {
  const descriptor = descriptors[key];
  if (descriptor === undefined || !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
    return null;
  }
  const value = descriptor.value as unknown;
  if (typeof value !== "string") return null;
  return boundedPrintableFieldV1(value);
}

/**
 * @internal Normalizes an untrusted stamp without invoking its accessors.
 * `null` means the entire diagnostic field should be omitted.
 */
export function normalizeVersionStampInternalV1(source: unknown): VersionStampV1 | null {
  if ((typeof source !== "object" && typeof source !== "function") || source === null) return null;
  let descriptors: PropertyDescriptorMap;
  try {
    descriptors = Object.getOwnPropertyDescriptors(source);
  } catch {
    // A hostile Proxy may reject descriptor inspection. Diagnostic metadata
    // must never make a runtime or Save unreadable.
    return null;
  }
  const normalized = Object.freeze({
    applicationVersion: fieldV1(descriptors, "applicationVersion"),
    applicationCommit: fieldV1(descriptors, "applicationCommit"),
    engineVersion: fieldV1(descriptors, "engineVersion"),
    engineCommit: fieldV1(descriptors, "engineCommit"),
  });
  return normalized.applicationVersion === null &&
    normalized.applicationCommit === null &&
    normalized.engineVersion === null &&
    normalized.engineCommit === null
    ? null
    : normalized;
}

function injectedVersionStampV1(): unknown {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, versionStampGlobalKeyV1);
    return descriptor !== undefined && Object.prototype.hasOwnProperty.call(descriptor, "value")
      ? descriptor.value
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Reads the injected stamp. Tolerates a missing global and any malformed
 * shape (each field falls back to `null` on its own) so a page built without
 * the injection — or with a hand-edited one — can never throw here.
 */
export function readVersionStampV1(): VersionStampV1 {
  return normalizeVersionStampInternalV1(injectedVersionStampV1()) ?? emptyVersionStampV1;
}

function displayCommitV1(commit: string | null): string | null {
  if (commit === null) return null;
  const dirtySuffix = commit.endsWith("-dirty") ? "-dirty" : "";
  const identity = dirtySuffix === "" ? commit : commit.slice(0, -dirtySuffix.length);
  const codePoints = Array.from(identity);
  const displayIdentity = codePoints.length > 12 ? codePoints.slice(0, 7).join("") : identity;
  return `${displayIdentity}${dirtySuffix}`;
}

function sideV1(label: string, version: string | null, commit: string | null): string | null {
  const displayedCommit = displayCommitV1(commit);
  if (version === null && displayedCommit === null) return null;
  if (version !== null && displayedCommit !== null) {
    return `${label} ${version} (${displayedCommit})`;
  }
  if (version !== null) return `${label} ${version}`;
  return `${label} ${displayedCommit ?? ""}`.trimEnd();
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

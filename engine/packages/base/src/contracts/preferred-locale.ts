// SPDX-License-Identifier: MIT

/**
 * Picks the best available locale for a host-reported preference list
 * (for example `navigator.languages`). Matching is case-insensitive and
 * falls back from a full tag to its primary subtag ("zh-TW" matches an
 * available "zh-CN" when nothing closer exists), so a Story can offer a
 * small catalog set and still greet browsers with the right language.
 * Pure and host-free: pass the reported list in, get a member of
 * `available` (or the fallback) out.
 */
export function resolvePreferredLocaleV1(input: {
  readonly available: readonly string[];
  readonly requested: readonly string[];
  readonly fallback: string;
}): string {
  const available = input.available.map((locale) => locale.toLowerCase());
  for (const requested of input.requested) {
    const tag = requested.toLowerCase();
    const exact = available.indexOf(tag);
    if (exact !== -1) return input.available[exact] as string;
    const primary = tag.split("-")[0] as string;
    const primaryIndex = available.findIndex(
      (candidate) => candidate === primary || candidate.startsWith(`${primary}-`),
    );
    if (primaryIndex !== -1) return input.available[primaryIndex] as string;
  }
  return input.fallback;
}

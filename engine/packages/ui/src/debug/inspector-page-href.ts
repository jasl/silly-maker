// SPDX-License-Identifier: MIT
/**
 * Same-origin Inspector advertisement. The `sillymaker:inspector` Vite plugin
 * injects `meta[name="sillymaker-inspector"]` on the game HTML during
 * `vite dev` only; player builds and previews omit it.
 */

export const inspectorPageMetaNameV1 = "sillymaker-inspector";

export function isSafeInspectorPageHrefV1(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
}

export function readInspectorPageHrefV1(
  documentRef: Document | null | undefined = typeof document === "undefined" ? undefined : document,
): string | undefined {
  if (documentRef === null || documentRef === undefined) return undefined;
  const content = documentRef
    .querySelector(`meta[name="${inspectorPageMetaNameV1}"]`)
    ?.getAttribute("content")
    ?.trim();
  if (content === undefined || content.length === 0) return undefined;
  return isSafeInspectorPageHrefV1(content) ? content : undefined;
}

export function resolveInspectorPageHrefV1(explicit: string | undefined): string | undefined {
  const candidate = explicit ?? readInspectorPageHrefV1();
  if (candidate === undefined || candidate.length === 0) return undefined;
  return isSafeInspectorPageHrefV1(candidate) ? candidate : undefined;
}

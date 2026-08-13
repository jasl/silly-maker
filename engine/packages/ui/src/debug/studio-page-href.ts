// SPDX-License-Identifier: MIT
/**
 * Same-origin Studio advertisement. The `sillymaker:studio` Vite plugin
 * injects `meta[name="sillymaker-studio"]` on the game HTML during
 * `vite dev` only; player builds and previews omit it.
 */

export const studioPageMetaNameV1 = "sillymaker-studio";

export function isSafeStudioPageHrefV1(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
}

export function readStudioPageHrefV1(
  documentRef: Document | null | undefined = typeof document === "undefined" ? undefined : document,
): string | undefined {
  if (documentRef === null || documentRef === undefined) return undefined;
  const content = documentRef
    .querySelector(`meta[name="${studioPageMetaNameV1}"]`)
    ?.getAttribute("content")
    ?.trim();
  if (content === undefined || content.length === 0) return undefined;
  return isSafeStudioPageHrefV1(content) ? content : undefined;
}

export function resolveStudioPageHrefV1(explicit: string | undefined): string | undefined {
  const candidate = explicit ?? readStudioPageHrefV1();
  if (candidate === undefined || candidate.length === 0) return undefined;
  return isSafeStudioPageHrefV1(candidate) ? candidate : undefined;
}

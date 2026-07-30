// SPDX-License-Identifier: MIT

const desktopRecordsMarkerSourceV1 =
  '<script>globalThis.__SILLYMAKER_RECORDS__ = "local";</script>';
const htmlCommentPatternV1 = /<!--[\s\S]*?(?:-->|$)/gu;
const scriptElementPatternV1 = /<script(\s[^>]*)?>([\s\S]*?)<\/script\s*>/giu;
const localRecordsAssignmentPatternV1 =
  /^\s*globalThis\.__SILLYMAKER_RECORDS__\s*=\s*(["'])local\1\s*;?\s*$/u;

function maskHtmlCommentsV1(html: string): string {
  return html.replaceAll(htmlCommentPatternV1, (comment) => " ".repeat(comment.length));
}

function hasDesktopRecordsMarkerV1(searchableHtml: string): boolean {
  for (const match of searchableHtml.matchAll(scriptElementPatternV1)) {
    if ((match[1] ?? "").trim() !== "") continue;
    if (localRecordsAssignmentPatternV1.test(match[2] ?? "")) return true;
  }
  return false;
}

/**
 * Marks a built Player document so the browser-side runtime selects the
 * desktop HTTP record store. Vite normally emits a lowercase `<head>`, but
 * this boundary intentionally tolerates attributes, casing, and minimal HTML
 * documents so a harmless template change cannot silently switch persistence
 * back to per-origin browser storage.
 */
export function injectDesktopRecordsMarkerV1(html: string): string {
  const searchableHtml = maskHtmlCommentsV1(html);
  if (hasDesktopRecordsMarkerV1(searchableHtml)) return html;

  const openingHead = /<head(?:\s[^>]*)?>/iu.exec(searchableHtml);
  if (openingHead !== null) {
    const insertion = openingHead.index + openingHead[0].length;
    return `${html.slice(0, insertion)}${desktopRecordsMarkerSourceV1}${html.slice(insertion)}`;
  }

  // A script is valid in the document body. For non-standard/minimal output,
  // placing the marker immediately after the root/doctype (or at byte zero)
  // still guarantees it executes before later application scripts.
  const openingHtml = /<html(?:\s[^>]*)?>/iu.exec(searchableHtml);
  if (openingHtml !== null) {
    const insertion = openingHtml.index + openingHtml[0].length;
    return `${html.slice(0, insertion)}${desktopRecordsMarkerSourceV1}${html.slice(insertion)}`;
  }

  const doctype = /<!doctype(?:\s[^>]*)?>/iu.exec(searchableHtml);
  if (doctype !== null) {
    const insertion = doctype.index + doctype[0].length;
    return `${html.slice(0, insertion)}${desktopRecordsMarkerSourceV1}${html.slice(insertion)}`;
  }

  return `${desktopRecordsMarkerSourceV1}${html}`;
}

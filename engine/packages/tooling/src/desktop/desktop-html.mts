// SPDX-License-Identifier: MIT

import { isShellCapabilityInternalV1 } from "./shell-http-admission.mts";

const htmlCommentPatternV1 = /<!--[\s\S]*?(?:-->|$)/gu;
const scriptElementPatternV1 = /<script(\s[^>]*)?>([\s\S]*?)<\/script\s*>/giu;

function desktopRecordsMarkerBodyV1(capability: string): string {
  return `Object.defineProperties(globalThis,{"__SILLYMAKER_RECORDS__":{value:"local",writable:false,configurable:false},"__SILLYMAKER_DESKTOP_CAPABILITY__":{value:${JSON.stringify(
    capability,
  )},writable:false,configurable:false}});`;
}

function desktopRecordsMarkerSourceV1(capability: string): string {
  return `<script>${desktopRecordsMarkerBodyV1(capability)}</script>`;
}

function maskHtmlCommentsV1(html: string): string {
  return html.replaceAll(htmlCommentPatternV1, (comment) => " ".repeat(comment.length));
}

function hasDesktopRecordsMarkerV1(searchableHtml: string, capability: string): boolean {
  const expectedBody = desktopRecordsMarkerBodyV1(capability);
  for (const match of searchableHtml.matchAll(scriptElementPatternV1)) {
    if ((match[1] ?? "").trim() !== "") continue;
    if ((match[2] ?? "").trim() === expectedBody) return true;
  }
  return false;
}

function injectHeadScriptV1(html: string, searchableHtml: string, scriptSource: string): string {
  const openingHead = /<head(?:\s[^>]*)?>/iu.exec(searchableHtml);
  if (openingHead !== null) {
    const insertion = openingHead.index + openingHead[0].length;
    return `${html.slice(0, insertion)}${scriptSource}${html.slice(insertion)}`;
  }

  // A script is valid in the document body. For non-standard/minimal output,
  // placing the marker immediately after the root/doctype (or at byte zero)
  // still guarantees it executes before later application scripts.
  const openingHtml = /<html(?:\s[^>]*)?>/iu.exec(searchableHtml);
  if (openingHtml !== null) {
    const insertion = openingHtml.index + openingHtml[0].length;
    return `${html.slice(0, insertion)}${scriptSource}${html.slice(insertion)}`;
  }

  const doctype = /<!doctype(?:\s[^>]*)?>/iu.exec(searchableHtml);
  if (doctype !== null) {
    const insertion = doctype.index + doctype[0].length;
    return `${html.slice(0, insertion)}${scriptSource}${html.slice(insertion)}`;
  }

  return `${scriptSource}${html}`;
}

/**
 * Marks a built Player document so the browser-side runtime selects the
 * desktop HTTP record store and captures this launch's private-route
 * capability. Vite normally emits a lowercase `<head>`, but this boundary
 * intentionally tolerates attributes, casing, and minimal HTML documents so a
 * harmless template change cannot silently switch persistence back to
 * per-origin browser storage.
 */
export function injectDesktopRecordsMarkerV1(html: string, capability: string): string {
  if (!isShellCapabilityInternalV1(capability)) {
    throw new TypeError("invalid Desktop shell capability");
  }
  const searchableHtml = maskHtmlCommentsV1(html);
  if (hasDesktopRecordsMarkerV1(searchableHtml, capability)) return html;
  return injectHeadScriptV1(html, searchableHtml, desktopRecordsMarkerSourceV1(capability));
}

/** Package-internal response boundary for launch-specific Desktop HTML. */
export function createDesktopHtmlResponseInternalV1(
  html: string,
  capability: string,
  head: boolean,
): Response {
  const markedHtml = injectDesktopRecordsMarkerV1(html, capability);
  return new Response(head ? null : markedHtml, {
    headers: {
      "cache-control": "no-store",
      "content-security-policy": "frame-ancestors 'none'",
      "content-type": "text/html; charset=utf-8",
      "cross-origin-resource-policy": "same-origin",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
    },
  });
}

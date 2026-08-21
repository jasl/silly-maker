// SPDX-License-Identifier: MIT

import { isShellCapabilityInternalV1 } from "./shell-http-admission.mts";
import {
  applicationBootstrapDataAttributeV1,
  applicationBootstrapElementIdV1,
  applicationBootstrapJsonHtmlV1,
  applicationBootstrapJsonTextInternalV1,
  type ApplicationBootstrapHtmlConfigV1,
} from "./application-bootstrap-html.mts";

const htmlCommentPatternV1 = /<!--[\s\S]*?(?:-->|$)/gu;
const scriptElementPatternV1 = /<script(\s[^>]*)?>([\s\S]*?)<\/script\s*>/giu;

function desktopRecordsMarkerBodyV1(capability: string): string {
  return `Object.defineProperties(globalThis,{"__SILLYMAKER_RECORDS__":{value:"local",writable:false,configurable:false},"__SILLYMAKER_DESKTOP_CAPABILITY__":{value:${
    JSON.stringify(
      capability,
    )
  },writable:false,configurable:false}});`;
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

function htmlAttributeValueV1(attributes: string, name: string): string | null {
  const match = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(["'])([^"']*)\\1(?:\\s|$)`,
    "iu",
  ).exec(attributes);
  return match?.[2] ?? null;
}

function htmlAttributeCountV1(attributes: string, name: string): number {
  return [...attributes.matchAll(new RegExp(`(?:^|\\s)${name}\\s*=`, "giu"))].length;
}

function requireExistingRuntimeBootstrapV1(source: string): void {
  const browserRuntime = applicationBootstrapJsonTextInternalV1({
    revision: 1,
    entry: "runtime",
    target: "browser",
  });
  const desktopRuntime = applicationBootstrapJsonTextInternalV1({
    revision: 1,
    entry: "runtime",
    target: "deno_desktop",
  });
  if (source !== browserRuntime && source !== desktopRuntime) {
    throw new TypeError("desktop_html.bootstrap_conflict");
  }
}

function requireDesktopRuntimeBootstrapV1(
  config: ApplicationBootstrapHtmlConfigV1,
): ApplicationBootstrapHtmlConfigV1 {
  if (config.revision !== 1 || config.entry !== "runtime" || config.target !== "deno_desktop") {
    throw new TypeError("desktop_html.invalid_bootstrap_config");
  }
  return config;
}

/**
 * Replaces the build's Browser runtime receipt or injects one Desktop runtime
 * receipt. Literal reserved markers in this trusted build-output boundary are
 * matched with HTML's ASCII-case-insensitive attribute-name semantics;
 * duplicate, malformed, and author receipts fail closed.
 */
export function injectDesktopBootstrapConfigV1(
  html: string,
  config: ApplicationBootstrapHtmlConfigV1,
): string {
  const bootstrap = requireDesktopRuntimeBootstrapV1(config);
  const searchableHtml = maskHtmlCommentsV1(html);
  const normalizedSearchableHtml = searchableHtml.toLowerCase();
  const bootstrapIdOccurrences =
    normalizedSearchableHtml.split(applicationBootstrapElementIdV1).length - 1;
  const bootstrapDataOccurrences =
    normalizedSearchableHtml.split(applicationBootstrapDataAttributeV1).length -
    1;
  const candidates = [...searchableHtml.matchAll(scriptElementPatternV1)].filter((match) => {
    const attributes = match[1] ?? "";
    return htmlAttributeValueV1(attributes, "id") === applicationBootstrapElementIdV1 ||
      htmlAttributeValueV1(attributes, applicationBootstrapDataAttributeV1) !== null;
  });
  if (
    candidates.length > 1 || bootstrapIdOccurrences > 1 || bootstrapDataOccurrences > 1
  ) {
    throw new TypeError("desktop_html.bootstrap_conflict");
  }

  const canonical = applicationBootstrapJsonHtmlV1(bootstrap);
  const candidate = candidates[0];
  if (candidate !== undefined) {
    const attributes = candidate[1] ?? "";
    if (
      htmlAttributeCountV1(attributes, "id") !== 1 ||
      htmlAttributeCountV1(attributes, "type") !== 1 ||
      htmlAttributeCountV1(attributes, applicationBootstrapDataAttributeV1) !== 1 ||
      htmlAttributeCountV1(attributes, "src") !== 0 ||
      htmlAttributeValueV1(attributes, "id") !== applicationBootstrapElementIdV1 ||
      htmlAttributeValueV1(attributes, "type")?.toLowerCase() !== "application/json" ||
      htmlAttributeValueV1(attributes, applicationBootstrapDataAttributeV1) !== "v1"
    ) {
      throw new TypeError("desktop_html.bootstrap_conflict");
    }
    requireExistingRuntimeBootstrapV1(candidate[2] ?? "");
    const start = candidate.index;
    if (start === undefined) throw new TypeError("desktop_html.bootstrap_conflict");
    return `${html.slice(0, start)}${canonical}${html.slice(start + candidate[0].length)}`;
  }

  // A non-script element or malformed script using either reserved marker is
  // still a conflict; inserting another source would make lookup ambiguous.
  const reservedMarker = bootstrapIdOccurrences !== 0 || bootstrapDataOccurrences !== 0;
  if (reservedMarker) throw new TypeError("desktop_html.bootstrap_conflict");
  return injectHeadScriptV1(html, searchableHtml, canonical);
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
  bootstrap: ApplicationBootstrapHtmlConfigV1,
  head: boolean,
): Response {
  const withBootstrap = injectDesktopBootstrapConfigV1(html, bootstrap);
  const markedHtml = injectDesktopRecordsMarkerV1(withBootstrap, capability);
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

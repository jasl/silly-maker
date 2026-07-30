// SPDX-License-Identifier: MIT
import { desktopLifetimePathPrefixV1 } from "./shell-lifetime.mts";

const desktopRecordsMarkerSourceV1 =
  '<script>globalThis.__SILLYMAKER_RECORDS__ = "local";</script>';
const htmlCommentPatternV1 = /<!--[\s\S]*?(?:-->|$)/gu;
const scriptElementPatternV1 = /<script(\s[^>]*)?>([\s\S]*?)<\/script\s*>/giu;
const localRecordsAssignmentPatternV1 =
  /^\s*globalThis\.__SILLYMAKER_RECORDS__\s*=\s*(["'])local\1\s*;?\s*$/u;
const lifetimeAssignmentPatternV1 =
  /^\s*globalThis\.__SILLYMAKER_LIFETIME__\s*=\s*(["'])shell\1\s*;/u;

/**
 * Page-side lifetime client: heartbeat the shell and send a goodbye beacon on
 * `pagehide` so a closed window ends the shell process (see shell-lifetime).
 */
export const desktopLifetimeScriptSourceV1 =
  '<script>globalThis.__SILLYMAKER_LIFETIME__ = "shell";' +
  "(function () {" +
  `var base = ${JSON.stringify(desktopLifetimePathPrefixV1)};` +
  "var beat = function () {" +
  'try { void fetch(base + "/heartbeat", { method: "POST", keepalive: true }).catch(function () {}); } catch (error) {}' +
  "};" +
  "beat();" +
  "setInterval(beat, 5000);" +
  'addEventListener("pageshow", beat);' +
  'document.addEventListener("visibilitychange", function () {' +
  'if (document.visibilityState === "visible") beat();' +
  "});" +
  'addEventListener("pagehide", function () {' +
  'try { navigator.sendBeacon(base + "/goodbye"); } catch (error) {}' +
  "});" +
  "})();</script>";

function maskHtmlCommentsV1(html: string): string {
  return html.replaceAll(htmlCommentPatternV1, (comment) => " ".repeat(comment.length));
}

function hasScriptAssignmentV1(searchableHtml: string, pattern: RegExp): boolean {
  for (const match of searchableHtml.matchAll(scriptElementPatternV1)) {
    if ((match[1] ?? "").trim() !== "") continue;
    if (pattern.test(match[2] ?? "")) return true;
  }
  return false;
}

function hasDesktopRecordsMarkerV1(searchableHtml: string): boolean {
  return hasScriptAssignmentV1(searchableHtml, localRecordsAssignmentPatternV1);
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
 * desktop HTTP record store. Vite normally emits a lowercase `<head>`, but
 * this boundary intentionally tolerates attributes, casing, and minimal HTML
 * documents so a harmless template change cannot silently switch persistence
 * back to per-origin browser storage.
 */
export function injectDesktopRecordsMarkerV1(html: string): string {
  const searchableHtml = maskHtmlCommentsV1(html);
  if (hasDesktopRecordsMarkerV1(searchableHtml)) return html;
  return injectHeadScriptV1(html, searchableHtml, desktopRecordsMarkerSourceV1);
}

/**
 * Installs the page-side lifetime client (heartbeat + `pagehide` goodbye) so
 * the shell watchdog can end the process when the window closes.
 */
export function injectDesktopLifetimeScriptV1(html: string): string {
  const searchableHtml = maskHtmlCommentsV1(html);
  if (hasScriptAssignmentV1(searchableHtml, lifetimeAssignmentPatternV1)) return html;
  return injectHeadScriptV1(html, searchableHtml, desktopLifetimeScriptSourceV1);
}

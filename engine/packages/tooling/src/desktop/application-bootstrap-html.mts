// SPDX-License-Identifier: MIT

export interface ApplicationBootstrapHtmlConfigV1 {
  readonly revision: 1;
  readonly entry: "runtime" | "author";
  readonly target: "browser" | "deno_desktop";
}

export const applicationBootstrapElementIdV1 = "sillymaker-application-bootstrap";
export const applicationBootstrapDataAttributeV1 = "data-sillymaker-bootstrap-config";

function escapeHtmlTextV1(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtmlAttributeV1(value: string): string {
  return escapeHtmlTextV1(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** @internal Canonical script text shared by producers and Desktop replacement. */
export function applicationBootstrapJsonTextInternalV1(
  config: ApplicationBootstrapHtmlConfigV1,
): string {
  return JSON.stringify({
    revision: config.revision,
    entry: config.entry,
    target: config.target,
  })
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

/** One inert, canonical startup-config source for Browser and Desktop entries. */
export function applicationBootstrapJsonHtmlV1(
  config: ApplicationBootstrapHtmlConfigV1,
): string {
  return `<script id="${applicationBootstrapElementIdV1}" type="application/json" ${applicationBootstrapDataAttributeV1}="v1">${
    applicationBootstrapJsonTextInternalV1(config)
  }</script>`;
}

/**
 * A dependency-free, visible boot shell. React later renders into the outer
 * container and replaces the status child, so stale `aria-busy` state cannot
 * survive a successful mount.
 */
export function accessibleApplicationBootShellHtmlV1(input: {
  readonly containerId: string;
  readonly accessibleName: string;
  readonly statusText: string;
  readonly bootstrap: ApplicationBootstrapHtmlConfigV1;
}): string {
  const containerId = escapeHtmlAttributeV1(input.containerId);
  const accessibleName = escapeHtmlAttributeV1(input.accessibleName);
  const statusText = escapeHtmlTextV1(input.statusText);
  return [
    `<div id="${containerId}">`,
    `  <div role="status" aria-live="polite" aria-busy="true" aria-label="${accessibleName}" data-sillymaker-boot-shell="pending">`,
    `    <span>${statusText}</span>`,
    "  </div>",
    "</div>",
    applicationBootstrapJsonHtmlV1(input.bootstrap),
  ].join("\n");
}

// SPDX-License-Identifier: MIT
import type { Plugin } from "vite";

import {
  accessibleApplicationBootShellHtmlV1,
  type ApplicationBootstrapHtmlConfigV1,
} from "../desktop/application-bootstrap-html.mts";
import { inspectorPageUrlV1 } from "./inspector.ts";

export const applicationRuntimeBootShellElementIdInternalV1 = "sillymaker-application-boot-shell";

const browserRuntimeBootstrapV1 = {
  revision: 1,
  entry: "runtime",
  target: "browser",
} as const satisfies ApplicationBootstrapHtmlConfigV1;

const reservedRuntimeBootstrapMarkersV1 = [
  "sillymaker-application-bootstrap",
  "data-sillymaker-bootstrap-config",
  applicationRuntimeBootShellElementIdInternalV1,
  "data-sillymaker-boot-shell",
] as const;

function insertionFailureV1(code: string): never {
  throw new TypeError(`application_entry_bootstrap.${code}`);
}

/**
 * Adds the dependency-free runtime shell and inert Browser receipt before any
 * application module executes. Application HTML is trusted checked-in input,
 * but reserved markers still fail closed so DOM order never selects config.
 */
export function injectApplicationRuntimeBootstrapHtmlInternalV1(input: {
  readonly html: string;
  readonly applicationLabel: string;
}): string {
  const searchableHtml = input.html.toLowerCase();
  if (reservedRuntimeBootstrapMarkersV1.some((marker) => searchableHtml.includes(marker))) {
    return insertionFailureV1("reserved_marker_conflict");
  }
  const bodyMatches = [...input.html.matchAll(/<body(?:\s[^>]*)?>/giu)];
  if (bodyMatches.length !== 1) return insertionFailureV1("body_ambiguous");
  const body = bodyMatches[0];
  if (body === undefined || body.index === undefined) {
    return insertionFailureV1("body_ambiguous");
  }
  const shell = accessibleApplicationBootShellHtmlV1({
    containerId: applicationRuntimeBootShellElementIdInternalV1,
    accessibleName: `${input.applicationLabel} 启动状态`,
    statusText: `${input.applicationLabel} 正在启动…`,
    bootstrap: browserRuntimeBootstrapV1,
  });
  const insertionIndex = body.index + body[0].length;
  return `${input.html.slice(0, insertionIndex)}\n${shell}\n${input.html.slice(insertionIndex)}`;
}

/** @internal Build-known runtime entry producer; Inspector owns its Author page. */
export function applicationRuntimeBootstrapPluginInternalV1(input: {
  readonly applicationLabel: string;
}): Plugin {
  return {
    name: "sillymaker:application-runtime-bootstrap",
    transformIndexHtml: {
      order: "pre",
      handler(html, context) {
        if (
          context.path === inspectorPageUrlV1 ||
          context.path === inspectorPageUrlV1.slice(0, -1)
        ) {
          return html;
        }
        return injectApplicationRuntimeBootstrapHtmlInternalV1({
          html,
          applicationLabel: input.applicationLabel,
        });
      },
    },
  };
}

// SPDX-License-Identifier: MIT
import { useLayoutEffect } from "react";
import type { ReactElement, ReactNode } from "react";

/**
 * Defers startup publication until React has completed one usable product
 * commit. An uncaught sibling layout failure unmounts this boundary before the
 * queued signal can retire the static startup shell.
 */
export function WebApplicationFirstProductCommitInternalV1(props: {
  readonly children: ReactNode;
  commit(): void;
}): ReactElement {
  const { commit } = props;
  useLayoutEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) commit();
    });
    return () => {
      mounted = false;
    };
  }, [commit]);
  return <>{props.children}</>;
}

/** Reloads the current document entry for the startup shell's recovery action. */
export function retryCurrentWebApplicationEntryInternalV1(): void {
  if (typeof location === "undefined" || typeof location.reload !== "function") {
    throw new TypeError("web.application_startup.retry_unavailable");
  }
  location.reload();
}

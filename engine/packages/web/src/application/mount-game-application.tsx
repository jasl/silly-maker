// SPDX-License-Identifier: MIT
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { webStylesLoadedV1 } from "../styles-entry.ts";

void webStylesLoadedV1;

export interface MountedGameApplicationV1 {
  unmount(): void;
}

interface MountGameApplicationInternalOptionsV1 {
  readonly onUncaughtError?: (error: unknown) => void;
}

function mountGameApplicationInternalV1(
  container: Element,
  application: ReactNode,
  options: MountGameApplicationInternalOptionsV1,
): MountedGameApplicationV1 {
  const root = createRoot(
    container,
    options.onUncaughtError === undefined
      ? undefined
      : { onUncaughtError: options.onUncaughtError },
  );
  root.render(application);
  return ({ unmount: () => root.unmount() });
}

export function mountGameApplicationV1(
  container: Element,
  application: ReactNode,
): MountedGameApplicationV1 {
  return mountGameApplicationInternalV1(container, application, {});
}

/** @internal Startup-aware mount used by the default Web document entry. */
export function mountGameApplicationWithStartupDiagnosticsInternalV1(
  container: Element,
  application: ReactNode,
  onUncaughtError: (error: unknown) => void,
): MountedGameApplicationV1 {
  return mountGameApplicationInternalV1(container, application, { onUncaughtError });
}

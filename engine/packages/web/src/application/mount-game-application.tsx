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
  // This low-level synchronous mount provides Host document geometry only.
  // Consumers that want SillyMaker's visual baseline explicitly select
  // @sillymaker/ui/styles.css; the standard Game and GUI entries do so after
  // their startup boundary has been admitted and before mounting React.
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

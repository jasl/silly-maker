// SPDX-License-Identifier: MIT
import { createContext, type ReactNode, useContext, useState } from "react";

const sillyOsOverlayHostContextV1 = createContext<HTMLElement | null>(null);

/**
 * Keeps product overlays inside the SillyOS application/theme boundary.
 * Radix's default body portal would otherwise escape both product tokens and
 * the Host-provided application isolation boundary.
 */
export function SillyOsOverlayHostV1({ children }: { readonly children: ReactNode }): ReactNode {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return (
    <sillyOsOverlayHostContextV1.Provider value={host}>
      {children}
      <div
        ref={setHost}
        className="silly-os-overlay-host sos:relative sos:z-50"
        data-silly-os-overlay-host=""
      />
    </sillyOsOverlayHostContextV1.Provider>
  );
}

export function useSillyOsOverlayHostV1(): HTMLElement | null {
  return useContext(sillyOsOverlayHostContextV1);
}

// SPDX-License-Identifier: MIT

import {
  createDesktopShellFetchInternalV1,
  parseDesktopShellCapabilityInternalV1,
} from "./desktop-shell-capability.ts";

const desktopCompanionPathPrefixInternalV1 = "/sillymaker/companion";

export interface DesktopCompanionHttpPortInternalV1 {
  request(path: string, init?: RequestInit): Promise<Response>;
  readonly closePreparation: {
    fence(): void;
    prepare(): Promise<void>;
  };
}

function companionRequestPathInternalV1(path: string): string {
  if (path !== "" && (!path.startsWith("/") || path.startsWith("//"))) {
    throw new TypeError("Desktop companion request path must be same-origin relative");
  }
  const normalized = new URL(
    `${desktopCompanionPathPrefixInternalV1}${path}`,
    "http://sillymaker.invalid",
  );
  if (
    normalized.hash !== "" ||
    (normalized.pathname !== desktopCompanionPathPrefixInternalV1 &&
      !normalized.pathname.startsWith(`${desktopCompanionPathPrefixInternalV1}/`))
  ) {
    throw new TypeError("Desktop companion request path escapes its private namespace");
  }
  return `${normalized.pathname}${normalized.search}`;
}

/** @internal Fixed same-origin HTTP transport for an application-selected companion. */
export function createDesktopCompanionHttpPortInternalV1(
  options: {
    readonly capabilityMarker?: unknown;
    readonly fetchImpl?: typeof fetch;
  } = {},
): DesktopCompanionHttpPortInternalV1 | null {
  const capability = parseDesktopShellCapabilityInternalV1(
    options.capabilityMarker === undefined
      ? Reflect.get(globalThis, "__SILLYMAKER_DESKTOP_CAPABILITY__")
      : options.capabilityMarker,
  );
  if (capability === null) return null;
  const shellFetch = createDesktopShellFetchInternalV1(
    capability,
    options.fetchImpl ?? fetch.bind(globalThis),
  );
  let fenced = false;
  let active = 0;
  const idleWaiters = new Set<() => void>();

  const release = (): void => {
    active -= 1;
    if (active !== 0) return;
    for (const resolve of idleWaiters) resolve();
    idleWaiters.clear();
  };

  return {
    async request(path: string, init?: RequestInit): Promise<Response> {
      if (fenced) throw new Error("Desktop companion requests are fenced for close");
      active += 1;
      let response: Response;
      try {
        response = await shellFetch(companionRequestPathInternalV1(path), init);
      } catch (error) {
        release();
        throw error;
      }
      if (response.body === null) {
        release();
        return response;
      }
      const reader = response.body.getReader();
      let released = false;
      const releaseOnce = (): void => {
        if (released) return;
        released = true;
        release();
      };
      const body = new ReadableStream<Uint8Array>({
        async pull(controller): Promise<void> {
          try {
            const item = await reader.read();
            if (item.done) {
              releaseOnce();
              controller.close();
            } else {
              controller.enqueue(item.value);
            }
          } catch (error) {
            releaseOnce();
            controller.error(error);
          }
        },
        async cancel(reason): Promise<void> {
          try {
            await reader.cancel(reason);
          } finally {
            releaseOnce();
          }
        },
      });
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    },
    closePreparation: {
      fence(): void {
        fenced = true;
      },
      prepare(): Promise<void> {
        if (active === 0) return Promise.resolve();
        return new Promise<void>((resolve) => idleWaiters.add(resolve));
      },
    },
  };
}

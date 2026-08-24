// SPDX-License-Identifier: MIT

import { randomBytes } from "node:crypto";

export const shellCapabilityHeaderInternalV1 = "x-sillymaker-shell-capability";
export const shellFilesPathPrefixInternalV1 = "/sillymaker/files";
export const shellRecordsPathPrefixInternalV1 = "/sillymaker/records";

export type ShellHttpAdmissionInternalV1 =
  | Readonly<{ readonly kind: "static"; readonly pathname: string }>
  | Readonly<{ readonly kind: "files"; readonly subPath: string }>
  | Readonly<{ readonly kind: "records"; readonly subPath: string }>
  | Readonly<{ readonly kind: "rejected"; readonly status: 403 | 421 }>;

const shellCapabilityPatternInternalV1 = /^[A-Za-z0-9_-]{43}$/u;
const shellCapabilityEntropyBytesInternalV1 = 32;

export function isShellCapabilityInternalV1(value: unknown): value is string {
  return typeof value === "string" && shellCapabilityPatternInternalV1.test(value);
}

export function allocateShellCapabilityInternalV1(
  entropy: (size: number) => Uint8Array = randomBytes,
): string {
  const bytes = entropy(shellCapabilityEntropyBytesInternalV1);
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength !== shellCapabilityEntropyBytesInternalV1
  ) {
    throw new TypeError("invalid Desktop shell capability entropy");
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const capability = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
  if (!isShellCapabilityInternalV1(capability)) {
    throw new TypeError("invalid Desktop shell capability encoding");
  }
  return capability;
}

/**
 * Owns the shell's route classification so a caller cannot accidentally treat
 * a private endpoint as static. Every request must target the exact origin
 * allocated for this launch. Private routes additionally require the page
 * capability and reject browser cross-site requests. The token is a
 * browser-network fence, not an authentication boundary against other local
 * processes.
 */
export function classifyShellHttpRequestInternalV1(
  request: Request,
  expectedOrigin: URL | null,
  capability: string,
): ShellHttpAdmissionInternalV1 {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return { kind: "rejected", status: 421 };
  }
  if (
    expectedOrigin === null ||
    url.origin !== expectedOrigin.origin ||
    url.username !== "" ||
    url.password !== ""
  ) {
    return { kind: "rejected", status: 421 };
  }

  const route = url.pathname === shellFilesPathPrefixInternalV1 ||
      url.pathname.startsWith(`${shellFilesPathPrefixInternalV1}/`)
    ? {
      kind: "files" as const,
      subPath: url.pathname.slice(shellFilesPathPrefixInternalV1.length),
    }
    : url.pathname === shellRecordsPathPrefixInternalV1 ||
        url.pathname.startsWith(`${shellRecordsPathPrefixInternalV1}/`)
    ? {
      kind: "records" as const,
      subPath: url.pathname.slice(shellRecordsPathPrefixInternalV1.length),
    }
    : { kind: "static" as const, pathname: url.pathname };
  if (route.kind === "static") return route;

  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return { kind: "rejected", status: 403 };
  }
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== expectedOrigin.origin) {
    return { kind: "rejected", status: 403 };
  }
  return request.headers.get(shellCapabilityHeaderInternalV1) === capability
    ? route
    : { kind: "rejected", status: 403 };
}

export function createShellHttpHandlerInternalV1(input: {
  readonly expectedOrigin: () => URL | null;
  readonly capability: string;
  readonly handleStatic: (request: Request, pathname: string) => Response | Promise<Response>;
  readonly handleFiles: (request: Request, subPath: string) => Response | Promise<Response>;
  readonly handleRecords: (request: Request, subPath: string) => Response | Promise<Response>;
}): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const admission = classifyShellHttpRequestInternalV1(
      request,
      input.expectedOrigin(),
      input.capability,
    );
    if (admission.kind === "rejected") {
      return new Response(admission.status === 421 ? "misdirected request" : "forbidden", {
        status: admission.status,
      });
    }
    if (admission.kind === "files") {
      return await input.handleFiles(request, admission.subPath);
    }
    if (admission.kind === "records") {
      return await input.handleRecords(request, admission.subPath);
    }
    return await input.handleStatic(request, admission.pathname);
  };
}

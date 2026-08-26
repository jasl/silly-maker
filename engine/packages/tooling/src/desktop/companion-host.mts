// SPDX-License-Identifier: MIT

import { randomUUID } from "node:crypto";
import { chmod, copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const companionLaunchReceiptByteLimitInternalV1 = 1024;

interface CompanionChildInternalV1 {
  readonly stdin: WritableStream<Uint8Array>;
  readonly stdout: ReadableStream<Uint8Array>;
  readonly status: Promise<{ readonly success: boolean; readonly code: number }>;
}

interface CompanionEndpointInternalV1 {
  readonly port: number;
}

export interface DesktopCompanionHostInternalV1 {
  handle(request: Request, subPath: string, search: string): Promise<Response>;
  close(): Promise<void>;
}

async function drainReaderInternalV1(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<void> {
  while (!(await reader.read()).done) {
    // stdout is reserved for the one launch receipt; product logs use stderr.
  }
}

async function readLaunchReceiptInternalV1(
  stdout: ReadableStream<Uint8Array>,
): Promise<CompanionEndpointInternalV1> {
  const reader = stdout.getReader();
  const bytes: number[] = [];
  let foundLine = false;
  try {
    while (!foundLine) {
      const item = await reader.read();
      if (item.done) throw new TypeError("Desktop companion ended before its launch receipt");
      for (const byte of item.value) {
        if (byte === 0x0a) {
          foundLine = true;
          break;
        }
        bytes.push(byte);
        if (bytes.length > companionLaunchReceiptByteLimitInternalV1) {
          throw new TypeError("Desktop companion launch receipt exceeds its byte limit");
        }
      }
    }
  } catch (error) {
    void drainReaderInternalV1(reader).catch(() => undefined);
    throw error;
  }
  void drainReaderInternalV1(reader).catch(() => undefined);
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes)));
  } catch {
    throw new TypeError("Desktop companion launch receipt is not valid JSON");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Desktop companion launch receipt must be an object");
  }
  const receipt = value as { readonly revision?: unknown; readonly port?: unknown };
  if (
    receipt.revision !== 1 ||
    !Number.isSafeInteger(receipt.port) ||
    (receipt.port as number) < 1 ||
    (receipt.port as number) > 65_535
  ) {
    throw new TypeError("Desktop companion launch receipt is unsupported");
  }
  return { port: receipt.port as number };
}

function proxyRequestHeadersInternalV1(request: Request): Headers {
  const headers = new Headers(request.headers);
  for (
    const name of [
      "connection",
      "content-length",
      "host",
      "origin",
      "sec-fetch-site",
      "transfer-encoding",
      "x-sillymaker-shell-capability",
    ]
  ) {
    headers.delete(name);
  }
  return headers;
}

function proxyResponseHeadersInternalV1(response: Response): Headers {
  const headers = new Headers(response.headers);
  for (const name of ["connection", "content-length", "transfer-encoding"]) {
    headers.delete(name);
  }
  return headers;
}

function awaitEndpointForRequestInternalV1(
  endpoint: Promise<CompanionEndpointInternalV1>,
  signal: AbortSignal,
): Promise<CompanionEndpointInternalV1> {
  if (signal.aborted) {
    return Promise.reject(new DOMException("Companion request was aborted", "AbortError"));
  }
  return new Promise<CompanionEndpointInternalV1>((resolve, reject) => {
    const abort = (): void => {
      reject(new DOMException("Companion request was aborted", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    void endpoint.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

/** @internal Owns one fixed direct child and proxies its application RPC over same origin. */
export function createDesktopCompanionHostInternalV1(input: {
  readonly launch: () => Promise<CompanionChildInternalV1>;
  readonly proxyFetch?: typeof fetch;
}): DesktopCompanionHostInternalV1 {
  const proxyFetch = input.proxyFetch ?? fetch.bind(globalThis);
  let childPromise: Promise<CompanionChildInternalV1> | null = null;
  let endpointPromise: Promise<CompanionEndpointInternalV1> | null = null;
  let closePromise: Promise<void> | null = null;
  let closing = false;

  const endpoint = (): Promise<CompanionEndpointInternalV1> => {
    if (closing) return Promise.reject(new Error("Desktop companion is closing"));
    childPromise ??= input.launch();
    endpointPromise ??= childPromise.then((child) => readLaunchReceiptInternalV1(child.stdout));
    return endpointPromise;
  };

  return {
    async handle(request: Request, subPath: string, search: string): Promise<Response> {
      if (closing) return new Response("companion unavailable", { status: 503 });
      try {
        const selected = await awaitEndpointForRequestInternalV1(endpoint(), request.signal);
        const path = subPath === "" ? "/" : subPath;
        const target = `http://127.0.0.1:${String(selected.port)}${path}${search}`;
        const response = await proxyFetch(target, {
          method: request.method,
          headers: proxyRequestHeadersInternalV1(request),
          body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
          redirect: "error",
          signal: request.signal,
        });
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: proxyResponseHeadersInternalV1(response),
        });
      } catch (error) {
        if (request.signal.aborted) throw error;
        return new Response("companion unavailable", { status: 502 });
      }
    },
    close(): Promise<void> {
      if (closePromise !== null) return closePromise;
      closing = true;
      closePromise = (async () => {
        if (childPromise === null) return;
        const child = await childPromise;
        const writer = child.stdin.getWriter();
        await writer.close().catch(() => undefined);
        const status = await child.status;
        if (!status.success || status.code !== 0) {
          throw new Error(`Desktop companion exited with code ${String(status.code)}`);
        }
      })();
      return closePromise;
    },
  };
}

declare const Deno: {
  readonly build: { readonly os: string };
  readonly Command: new (
    command: string,
    options: {
      readonly args: readonly string[];
      readonly stdin: "piped";
      readonly stdout: "piped";
      readonly stderr: "inherit";
    },
  ) => { spawn(): CompanionChildInternalV1 };
};

/** @internal Materializes one build-included artifact and owns its direct child. */
export function createIncludedCompanionHostInternalV1(input: {
  readonly includedArtifactPath: string;
  readonly materializationDirectory: string;
  readonly executableName: string;
}): DesktopCompanionHostInternalV1 {
  return createDesktopCompanionHostInternalV1({
    launch: async () => {
      await mkdir(input.materializationDirectory, { recursive: true });
      const materializedPath = join(
        input.materializationDirectory,
        `${randomUUID()}-${input.executableName}`,
      );
      try {
        // The included VFS artifact is copied directly to a physical app-data
        // path; it is never buffered as one large JavaScript byte array.
        await copyFile(input.includedArtifactPath, materializedPath);
        if (Deno.build.os !== "windows") await chmod(materializedPath, 0o700);
        const child = new Deno.Command(materializedPath, {
          args: [],
          stdin: "piped",
          stdout: "piped",
          stderr: "inherit",
        }).spawn();
        void child.status.finally(() => rm(materializedPath, { force: true })).catch(() =>
          undefined
        );
        return child;
      } catch (error) {
        await rm(materializedPath, { force: true }).catch(() => undefined);
        throw error;
      }
    },
  });
}

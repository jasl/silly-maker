// SPDX-License-Identifier: MIT
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { MotionDocumentV1 } from "@sillymaker/base";
import { parseMotionDocumentV1 } from "@sillymaker/base";

import { resolveDevSourcePathV1 } from "./dev-sources.ts";

/**
 * The Motion write-back port: the dev-server half of the Motion Workbench
 * save loop. Read returns the parsed document plus a content digest; write
 * is compare-and-swap on that digest — schema-validated, id-stable,
 * deterministically formatted, and atomically renamed into place — so a
 * stale editor can never silently overwrite newer file contents. The port
 * exists only under `vite dev`; builds and previews have no such endpoint.
 * Motion files are Story sources: this channel is Host/tooling I/O and
 * never touches authoritative State, Saves, digests, or CommandLog.
 */

export const motionPortUrlV1 = "/__sillymaker/dev-sources/motion";

const motionPortMaxBodyBytesV1 = 256 * 1024;

export type MotionPortErrorCodeV1 =
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "motion_invalid"
  | "motion_id_mismatch";

export type MotionReadResultV1 =
  | {
    readonly kind: "ok";
    readonly path: string;
    readonly digest: string;
    readonly motionDocument: MotionDocumentV1;
  }
  | { readonly kind: "error"; readonly code: MotionPortErrorCodeV1; readonly detail?: string };

export type MotionWriteResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  | { readonly kind: "error"; readonly code: MotionPortErrorCodeV1; readonly detail?: string };

function motionDigestV1(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

/** The one canonical on-disk formatting the port ever writes. */
export function formatMotionDocumentV1(motionDocument: MotionDocumentV1): string {
  return `${JSON.stringify(motionDocument, null, 2)}\n`;
}

function resolveMotionFileV1(
  appRoot: string,
  path: string,
): { readonly kind: "file"; readonly filePath: string } | {
  readonly kind: "error";
  readonly code: "bad_request" | "not_found";
} {
  if (!path.endsWith(".motion.json")) return { kind: "error", code: "bad_request" };
  const resolution = resolveDevSourcePathV1(appRoot, path);
  if (resolution.kind !== "file") return { kind: "error", code: resolution.kind };
  return { kind: "file", filePath: resolution.filePath };
}

export function readMotionSourceFileV1(appRoot: string, path: string): MotionReadResultV1 {
  const resolved = resolveMotionFileV1(appRoot, path);
  if (resolved.kind === "error") return { kind: "error", code: resolved.code };
  let bytes: Uint8Array;
  try {
    bytes = readFileSync(resolved.filePath);
  } catch {
    return { kind: "error", code: "not_found" };
  }
  let motionDocument: MotionDocumentV1;
  try {
    motionDocument = parseMotionDocumentV1(
      JSON.parse(new TextDecoder().decode(bytes)) as unknown,
      `/${path}`,
    );
  } catch (error) {
    return {
      kind: "error",
      code: "motion_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  return Object.freeze({
    kind: "ok",
    path,
    digest: motionDigestV1(bytes),
    motionDocument,
  });
}

export interface WriteMotionSourceInputV1 {
  readonly path: string;
  /** The digest returned by the read this edit started from (CAS token). */
  readonly expectedDigest: string;
  readonly motionDocument: unknown;
}

export function writeMotionSourceFileV1(
  appRoot: string,
  input: WriteMotionSourceInputV1,
): MotionWriteResultV1 {
  const resolved = resolveMotionFileV1(appRoot, input.path);
  if (resolved.kind === "error") return { kind: "error", code: resolved.code };

  let currentBytes: Uint8Array;
  try {
    currentBytes = readFileSync(resolved.filePath);
  } catch {
    return { kind: "error", code: "not_found" };
  }
  if (motionDigestV1(currentBytes) !== input.expectedDigest) {
    return { kind: "error", code: "digest_conflict" };
  }

  let incoming: MotionDocumentV1;
  try {
    incoming = parseMotionDocumentV1(input.motionDocument, `/${input.path}`);
  } catch (error) {
    return {
      kind: "error",
      code: "motion_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  let current: MotionDocumentV1;
  try {
    current = parseMotionDocumentV1(
      JSON.parse(new TextDecoder().decode(currentBytes)) as unknown,
      `/${input.path}`,
    );
  } catch (error) {
    return {
      kind: "error",
      code: "motion_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  if (incoming.motionId !== current.motionId) {
    return { kind: "error", code: "motion_id_mismatch" };
  }

  const formatted = new TextEncoder().encode(formatMotionDocumentV1(incoming));
  const temporaryPath = `${resolved.filePath}.tmp-${randomUUID()}`;
  try {
    writeFileSync(temporaryPath, formatted);
    renameSync(temporaryPath, resolved.filePath);
  } catch (error) {
    try {
      rmSync(temporaryPath, { force: true });
    } catch {
      // Best-effort temp cleanup; the original file is untouched either way.
    }
    return {
      kind: "error",
      code: "bad_request",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  return Object.freeze({ kind: "ok", digest: motionDigestV1(formatted) });
}

function motionPortStatusV1(code: MotionPortErrorCodeV1): number {
  switch (code) {
    case "bad_request":
      return 400;
    case "not_found":
      return 404;
    case "digest_conflict":
      return 409;
    case "motion_invalid":
    case "motion_id_mismatch":
      return 422;
    default: {
      const exhaustive: never = code;
      throw new TypeError(`unknown motion port error ${String(exhaustive)}`);
    }
  }
}

function sendJsonV1(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

async function readRequestBodyV1(request: IncomingMessage): Promise<string | null> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of request) {
    const bytes = chunk as Uint8Array;
    total += bytes.byteLength;
    if (total > motionPortMaxBodyBytesV1) return null;
    chunks.push(bytes);
  }
  return new TextDecoder().decode(
    chunks.length === 1 ? chunks[0] : Buffer.concat(chunks as Buffer[]),
  );
}

/** Connect-style handler; exported separately so tests can drive it. */
export function createMotionPortMiddlewareV1(input: { readonly appRoot: string }): (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void {
  return (request, response, next) => {
    const [pathname = "", query = ""] = (request.url ?? "").split("?", 2);
    if (pathname !== motionPortUrlV1) {
      next();
      return;
    }

    if (request.method === "GET") {
      const path = new URLSearchParams(query).get("path");
      const result = path === null
        ? ({ kind: "error", code: "bad_request" } as const)
        : readMotionSourceFileV1(input.appRoot, path);
      if (result.kind === "error") {
        sendJsonV1(response, motionPortStatusV1(result.code), {
          error: result.code,
          ...(result.detail === undefined ? {} : { detail: result.detail }),
        });
        return;
      }
      sendJsonV1(response, 200, {
        path: result.path,
        digest: result.digest,
        motionDocument: result.motionDocument,
      });
      return;
    }

    if (request.method === "POST") {
      void readRequestBodyV1(request).then((body) => {
        if (body === null) {
          sendJsonV1(response, 400, { error: "bad_request" });
          return;
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(body);
        } catch {
          sendJsonV1(response, 400, { error: "bad_request" });
          return;
        }
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          sendJsonV1(response, 400, { error: "bad_request" });
          return;
        }
        const record = parsed as Record<string, unknown>;
        if (typeof record.path !== "string" || typeof record.expectedDigest !== "string") {
          sendJsonV1(response, 400, { error: "bad_request" });
          return;
        }
        const result = writeMotionSourceFileV1(input.appRoot, {
          path: record.path,
          expectedDigest: record.expectedDigest,
          motionDocument: record.motionDocument,
        });
        if (result.kind === "error") {
          sendJsonV1(response, motionPortStatusV1(result.code), {
            error: result.code,
            ...(result.detail === undefined ? {} : { detail: result.detail }),
          });
          return;
        }
        sendJsonV1(response, 200, { digest: result.digest });
      });
      return;
    }

    response.statusCode = 405;
    response.end("method not allowed");
  };
}

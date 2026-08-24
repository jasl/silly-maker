// SPDX-License-Identifier: MIT
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { RegionsDocumentV1 } from "@sillymaker/base";
import { parseRegionsDocumentV1 } from "@sillymaker/base";

import type {
  AuthoringProjectIndexOwnerV1,
  AuthoringProjectIndexV1,
} from "../project/authoring-index.ts";
import { resolveDevSourceCreatePathV1, resolveDevSourcePathV1 } from "./dev-sources.ts";

/**
 * The Regions write-back port (shaped-hit-regions, accepted 2026-08-21):
 * the dev-server half of the Studio region-editing save loop, a faithful
 * sibling of the Motion port. List serves the shared Project Authoring
 * Index's regions enumeration (a new `*.regions.json` is discovered by
 * convention; files the index cannot admit come back as structured skips,
 * not silence). Read returns the parsed document plus a content digest;
 * write is compare-and-swap on that digest — schema-validated, id-stable,
 * deterministically formatted, and atomically renamed into place — so a
 * stale editor can never silently overwrite newer file contents. The port
 * exists only under `vite dev`; builds and previews have no such endpoint.
 * Regions files are Story sources: this channel is Host/tooling I/O and
 * never touches authoritative State, Saves, digests, or CommandLog.
 */

export const regionsPortUrlV1 = "/__sillymaker/dev-sources/regions-document";
export const regionsListUrlV1 = "/__sillymaker/dev-sources/regions-documents";

const regionsPortMaxBodyBytesV1 = 256 * 1024;

export type RegionsPortErrorCodeV1 =
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "already_exists"
  | "regions_invalid"
  | "regions_id_mismatch";

export interface RegionsListEntryV1 {
  readonly path: string;
  readonly regionsId: string;
  readonly label: string;
}

export interface RegionsListSkipV1 {
  readonly path: string;
  readonly reason: string;
}

export interface RegionsListResultV1 {
  readonly regionsDocuments: readonly RegionsListEntryV1[];
  /** `*.regions.json` files the index could not admit, named with the reason. */
  readonly skipped: readonly RegionsListSkipV1[];
}

export type RegionsReadResultV1 =
  | {
    readonly kind: "ok";
    readonly path: string;
    readonly digest: string;
    readonly regionsDocument: RegionsDocumentV1;
  }
  | { readonly kind: "error"; readonly code: RegionsPortErrorCodeV1; readonly detail?: string };

export type RegionsWriteResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  | { readonly kind: "error"; readonly code: RegionsPortErrorCodeV1; readonly detail?: string };

function regionsDigestV1(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

/** The Project Authoring Index's regions view: catalog rows + named skips. */
export function listRegionsSourceFilesV1(index: AuthoringProjectIndexV1): RegionsListResultV1 {
  return {
    regionsDocuments: index.regions,
    skipped: index.skipped
      .filter((skip) => skip.kind === "regions")
      .map((skip) => ({ path: skip.path, reason: skip.reason })),
  };
}

/** The one canonical on-disk formatting the port ever writes. */
export function formatRegionsDocumentV1(regionsDocument: RegionsDocumentV1): string {
  return `${JSON.stringify(regionsDocument, null, 2)}\n`;
}

function resolveRegionsFileV1(
  appRoot: string,
  path: string,
): { readonly kind: "file"; readonly filePath: string } | {
  readonly kind: "error";
  readonly code: "bad_request" | "not_found";
} {
  if (!path.endsWith(".regions.json")) return { kind: "error", code: "bad_request" };
  const resolution = resolveDevSourcePathV1(appRoot, path);
  if (resolution.kind !== "file") return { kind: "error", code: resolution.kind };
  return { kind: "file", filePath: resolution.filePath };
}

export function readRegionsSourceFileV1(appRoot: string, path: string): RegionsReadResultV1 {
  const resolved = resolveRegionsFileV1(appRoot, path);
  if (resolved.kind === "error") return { kind: "error", code: resolved.code };
  let bytes: Uint8Array;
  try {
    bytes = readFileSync(resolved.filePath);
  } catch {
    return { kind: "error", code: "not_found" };
  }
  let regionsDocument: RegionsDocumentV1;
  try {
    regionsDocument = parseRegionsDocumentV1(
      JSON.parse(new TextDecoder().decode(bytes)) as unknown,
      `/${path}`,
    );
  } catch (error) {
    return {
      kind: "error",
      code: "regions_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  return {
    kind: "ok",
    path,
    digest: regionsDigestV1(bytes),
    regionsDocument,
  };
}

export interface WriteRegionsSourceInputV1 {
  readonly path: string;
  /** The digest returned by the read this edit started from (CAS token). */
  readonly expectedDigest: string;
  readonly regionsDocument: unknown;
}

export function writeRegionsSourceFileV1(
  appRoot: string,
  input: WriteRegionsSourceInputV1,
): RegionsWriteResultV1 {
  const resolved = resolveRegionsFileV1(appRoot, input.path);
  if (resolved.kind === "error") return { kind: "error", code: resolved.code };

  let currentBytes: Uint8Array;
  try {
    currentBytes = readFileSync(resolved.filePath);
  } catch {
    return { kind: "error", code: "not_found" };
  }
  if (regionsDigestV1(currentBytes) !== input.expectedDigest) {
    return { kind: "error", code: "digest_conflict" };
  }

  let incoming: RegionsDocumentV1;
  try {
    incoming = parseRegionsDocumentV1(input.regionsDocument, `/${input.path}`);
  } catch (error) {
    return {
      kind: "error",
      code: "regions_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  let current: RegionsDocumentV1;
  try {
    current = parseRegionsDocumentV1(
      JSON.parse(new TextDecoder().decode(currentBytes)) as unknown,
      `/${input.path}`,
    );
  } catch (error) {
    return {
      kind: "error",
      code: "regions_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  if (incoming.regionsId !== current.regionsId) {
    return { kind: "error", code: "regions_id_mismatch" };
  }

  const formatted = new TextEncoder().encode(formatRegionsDocumentV1(incoming));
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
  return { kind: "ok", digest: regionsDigestV1(formatted) };
}

const regionsFileSuffixV1 = ".regions.json";

export interface CreateRegionsSourceInputV1 {
  readonly path: string;
  readonly regionsDocument: unknown;
}

/**
 * Creates a brand-new regions document: the file must not exist, the
 * document must pass strict admission, the filename stem must be the
 * regionsId's final segment (the same id↔path rule `story check` lints),
 * and the regionsId must not already be admitted elsewhere in the story
 * tree. The created file enters the Project Authoring Index by
 * convention — Studio's catalog sees it with zero registration.
 */
export function createRegionsSourceFileV1(
  appRoot: string,
  index: AuthoringProjectIndexV1,
  input: CreateRegionsSourceInputV1,
): RegionsWriteResultV1 {
  if (!input.path.endsWith(regionsFileSuffixV1)) return { kind: "error", code: "bad_request" };
  const resolved = resolveDevSourceCreatePathV1(appRoot, input.path);
  if (resolved.kind !== "create") return { kind: "error", code: resolved.kind };

  let incoming: RegionsDocumentV1;
  try {
    incoming = parseRegionsDocumentV1(input.regionsDocument, `/${input.path}`);
  } catch (error) {
    return {
      kind: "error",
      code: "regions_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  const stem = input.path.split("/").at(-1)?.slice(0, -regionsFileSuffixV1.length) ?? "";
  if (!incoming.regionsId.endsWith(`.${stem}`)) {
    return {
      kind: "error",
      code: "regions_id_mismatch",
      detail: `regions id "${incoming.regionsId}" does not end with the file stem ".${stem}"`,
    };
  }

  const existing = index.regions.find((entry) => entry.regionsId === incoming.regionsId);
  if (existing !== undefined) {
    return {
      kind: "error",
      code: "already_exists",
      detail: `regions id "${incoming.regionsId}" is already declared by ${existing.path}`,
    };
  }

  const formatted = new TextEncoder().encode(formatRegionsDocumentV1(incoming));
  const temporaryPath = `${resolved.filePath}.tmp-${randomUUID()}`;
  try {
    mkdirSync(resolved.directoryPath, { recursive: true });
    writeFileSync(temporaryPath, formatted);
    renameSync(temporaryPath, resolved.filePath);
  } catch (error) {
    try {
      rmSync(temporaryPath, { force: true });
    } catch {
      // Best-effort temp cleanup; no original file exists to damage.
    }
    return {
      kind: "error",
      code: "bad_request",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  return { kind: "ok", digest: regionsDigestV1(formatted) };
}

function regionsPortStatusV1(code: RegionsPortErrorCodeV1): number {
  switch (code) {
    case "bad_request":
      return 400;
    case "not_found":
      return 404;
    case "digest_conflict":
    case "already_exists":
      return 409;
    case "regions_invalid":
    case "regions_id_mismatch":
      return 422;
    default: {
      const exhaustive: never = code;
      throw new TypeError(`unknown regions port error ${String(exhaustive)}`);
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
    if (total > regionsPortMaxBodyBytesV1) return null;
    chunks.push(bytes);
  }
  return new TextDecoder().decode(
    chunks.length === 1 ? chunks[0] : Buffer.concat(chunks as Buffer[]),
  );
}

/** Connect-style handler; exported separately so tests can drive it. */
export function createRegionsPortMiddlewareV1(input: {
  readonly appRoot: string;
  readonly projectIndexOwner: AuthoringProjectIndexOwnerV1;
}): (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void {
  return (request, response, next) => {
    const [pathname = "", query = ""] = (request.url ?? "").split("?", 2);

    if (pathname === regionsListUrlV1) {
      if (request.method !== "GET") {
        response.statusCode = 405;
        response.end("method not allowed");
        return;
      }
      sendJsonV1(response, 200, listRegionsSourceFilesV1(input.projectIndexOwner.snapshot()));
      return;
    }

    if (pathname !== regionsPortUrlV1) {
      next();
      return;
    }

    if (request.method === "GET") {
      const path = new URLSearchParams(query).get("path");
      const result = path === null
        ? ({ kind: "error", code: "bad_request" } as const)
        : readRegionsSourceFileV1(input.appRoot, path);
      if (result.kind === "error") {
        sendJsonV1(response, regionsPortStatusV1(result.code), {
          error: result.code,
          ...(result.detail === undefined ? {} : { detail: result.detail }),
        });
        return;
      }
      sendJsonV1(response, 200, {
        path: result.path,
        digest: result.digest,
        regionsDocument: result.regionsDocument,
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
        if (
          typeof record.path !== "string" ||
          (typeof record.expectedDigest !== "string" && record.expectedDigest !== null)
        ) {
          sendJsonV1(response, 400, { error: "bad_request" });
          return;
        }
        // `expectedDigest: null` is the create form of CAS: the expected
        // prior state is "no file". A string digest is the ordinary update.
        const result = record.expectedDigest === null
          ? createRegionsSourceFileV1(input.appRoot, input.projectIndexOwner.snapshot(), {
            path: record.path,
            regionsDocument: record.regionsDocument,
          })
          : writeRegionsSourceFileV1(input.appRoot, {
            path: record.path,
            expectedDigest: record.expectedDigest,
            regionsDocument: record.regionsDocument,
          });
        if (result.kind === "error") {
          sendJsonV1(response, regionsPortStatusV1(result.code), {
            error: result.code,
            ...(result.detail === undefined ? {} : { detail: result.detail }),
          });
          return;
        }
        input.projectIndexOwner.invalidate(record.path);
        sendJsonV1(response, 200, { digest: result.digest });
      });
      return;
    }

    response.statusCode = 405;
    response.end("method not allowed");
  };
}

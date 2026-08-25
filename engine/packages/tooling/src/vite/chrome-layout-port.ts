// SPDX-License-Identifier: MIT
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { ChromeLayoutDocumentV1 } from "@sillymaker/base";
import { parseChromeLayoutDocumentV1 } from "@sillymaker/base";

import type {
  AuthoringProjectIndexOwnerV1,
  AuthoringProjectIndexV1,
} from "../project/authoring-index.ts";
import { resolveDevSourceCreatePathV1, resolveDevSourcePathV1 } from "./dev-sources.ts";

/**
 * The chrome-layout write-back port (authorable-chrome-layout, accepted
 * 2026-08-22): the dev-server half of the Studio Chrome workspace save
 * loop, a faithful sibling of the Motion and Regions ports. List serves
 * the shared Project Authoring Index's chrome-layout enumeration (a new
 * `*.chrome-layout.json` is discovered by convention; files the index
 * cannot admit come back as structured skips, not silence). Read returns
 * the parsed document plus a content digest; write is compare-and-swap on
 * that digest — schema-validated, id-stable, deterministically formatted,
 * and atomically renamed into place — so a stale editor can never
 * silently overwrite newer file contents. The port exists only under
 * `vite dev`; builds and previews have no such endpoint. Layout files are
 * Story sources: this channel is Host/tooling I/O and never touches
 * authoritative State, Saves, digests, or CommandLog.
 */

export const chromeLayoutPortUrlV1 = "/__sillymaker/dev-sources/chrome-layout";
export const chromeLayoutListUrlV1 = "/__sillymaker/dev-sources/chrome-layouts";

const chromeLayoutPortMaxBodyBytesV1 = 256 * 1024;

export type ChromeLayoutPortErrorCodeV1 =
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "already_exists"
  | "chrome_layout_invalid"
  | "chrome_layout_id_mismatch";

export interface ChromeLayoutListEntryV1 {
  readonly path: string;
  readonly layoutId: string;
  readonly label: string;
}

export interface ChromeLayoutListSkipV1 {
  readonly path: string;
  readonly reason: string;
}

export interface ChromeLayoutListResultV1 {
  readonly chromeLayouts: readonly ChromeLayoutListEntryV1[];
  /** `*.chrome-layout.json` files the index could not admit, with the reason. */
  readonly skipped: readonly ChromeLayoutListSkipV1[];
}

export type ChromeLayoutReadResultV1 =
  | {
    readonly kind: "ok";
    readonly path: string;
    readonly digest: string;
    readonly chromeLayoutDocument: ChromeLayoutDocumentV1;
  }
  | {
    readonly kind: "error";
    readonly code: ChromeLayoutPortErrorCodeV1;
    readonly detail?: string;
  };

export type ChromeLayoutWriteResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  | {
    readonly kind: "error";
    readonly code: ChromeLayoutPortErrorCodeV1;
    readonly detail?: string;
  };

function chromeLayoutDigestV1(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

/** The Project Authoring Index's chrome-layout view: catalog rows + named skips. */
export function listChromeLayoutSourceFilesV1(
  index: AuthoringProjectIndexV1,
): ChromeLayoutListResultV1 {
  return {
    chromeLayouts: index.chromeLayouts,
    skipped: index.skipped
      .filter((skip) => skip.kind === "chrome-layout")
      .map((skip) => ({ path: skip.path, reason: skip.reason })),
  };
}

/** The one canonical on-disk formatting the port ever writes. */
export function formatChromeLayoutDocumentV1(layoutDocument: ChromeLayoutDocumentV1): string {
  return `${JSON.stringify(layoutDocument, null, 2)}\n`;
}

const chromeLayoutFileSuffixV1 = ".chrome-layout.json";

function resolveChromeLayoutFileV1(
  appRoot: string,
  path: string,
): { readonly kind: "file"; readonly filePath: string } | {
  readonly kind: "error";
  readonly code: "bad_request" | "not_found";
} {
  if (!path.endsWith(chromeLayoutFileSuffixV1)) return { kind: "error", code: "bad_request" };
  const resolution = resolveDevSourcePathV1(appRoot, path);
  if (resolution.kind !== "file") return { kind: "error", code: resolution.kind };
  return { kind: "file", filePath: resolution.filePath };
}

export function readChromeLayoutSourceFileV1(
  appRoot: string,
  path: string,
): ChromeLayoutReadResultV1 {
  const resolved = resolveChromeLayoutFileV1(appRoot, path);
  if (resolved.kind === "error") return { kind: "error", code: resolved.code };
  let bytes: Uint8Array;
  try {
    bytes = readFileSync(resolved.filePath);
  } catch {
    return { kind: "error", code: "not_found" };
  }
  let chromeLayoutDocument: ChromeLayoutDocumentV1;
  try {
    chromeLayoutDocument = parseChromeLayoutDocumentV1(
      JSON.parse(new TextDecoder().decode(bytes)) as unknown,
      `/${path}`,
    );
  } catch (error) {
    return {
      kind: "error",
      code: "chrome_layout_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  return {
    kind: "ok",
    path,
    digest: chromeLayoutDigestV1(bytes),
    chromeLayoutDocument,
  };
}

export interface WriteChromeLayoutSourceInputV1 {
  readonly path: string;
  /** The digest returned by the read this edit started from (CAS token). */
  readonly expectedDigest: string;
  readonly chromeLayoutDocument: unknown;
}

export function writeChromeLayoutSourceFileV1(
  appRoot: string,
  input: WriteChromeLayoutSourceInputV1,
): ChromeLayoutWriteResultV1 {
  const resolved = resolveChromeLayoutFileV1(appRoot, input.path);
  if (resolved.kind === "error") return { kind: "error", code: resolved.code };

  let currentBytes: Uint8Array;
  try {
    currentBytes = readFileSync(resolved.filePath);
  } catch {
    return { kind: "error", code: "not_found" };
  }
  if (chromeLayoutDigestV1(currentBytes) !== input.expectedDigest) {
    return { kind: "error", code: "digest_conflict" };
  }

  let incoming: ChromeLayoutDocumentV1;
  try {
    incoming = parseChromeLayoutDocumentV1(input.chromeLayoutDocument, `/${input.path}`);
  } catch (error) {
    return {
      kind: "error",
      code: "chrome_layout_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  let current: ChromeLayoutDocumentV1;
  try {
    current = parseChromeLayoutDocumentV1(
      JSON.parse(new TextDecoder().decode(currentBytes)) as unknown,
      `/${input.path}`,
    );
  } catch (error) {
    return {
      kind: "error",
      code: "chrome_layout_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  if (incoming.layoutId !== current.layoutId) {
    return { kind: "error", code: "chrome_layout_id_mismatch" };
  }

  const formatted = new TextEncoder().encode(formatChromeLayoutDocumentV1(incoming));
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
  return { kind: "ok", digest: chromeLayoutDigestV1(formatted) };
}

export interface CreateChromeLayoutSourceInputV1 {
  readonly path: string;
  readonly chromeLayoutDocument: unknown;
}

/**
 * Creates a brand-new chrome-layout document: the file must not exist,
 * the document must pass strict admission, the filename stem must be the
 * layoutId's final segment (the same id↔path rule `app check` lints),
 * and the layoutId must not already be admitted elsewhere in the story
 * tree. The created file enters the Project Authoring Index by
 * convention — Studio's catalog sees it with zero registration.
 */
export function createChromeLayoutSourceFileV1(
  appRoot: string,
  index: AuthoringProjectIndexV1,
  input: CreateChromeLayoutSourceInputV1,
): ChromeLayoutWriteResultV1 {
  if (!input.path.endsWith(chromeLayoutFileSuffixV1)) return { kind: "error", code: "bad_request" };
  const resolved = resolveDevSourceCreatePathV1(appRoot, input.path);
  if (resolved.kind !== "create") return { kind: "error", code: resolved.kind };

  let incoming: ChromeLayoutDocumentV1;
  try {
    incoming = parseChromeLayoutDocumentV1(input.chromeLayoutDocument, `/${input.path}`);
  } catch (error) {
    return {
      kind: "error",
      code: "chrome_layout_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  const stem = input.path.split("/").at(-1)?.slice(0, -chromeLayoutFileSuffixV1.length) ?? "";
  if (!incoming.layoutId.endsWith(`.${stem}`)) {
    return {
      kind: "error",
      code: "chrome_layout_id_mismatch",
      detail: `chrome-layout id "${incoming.layoutId}" does not end with the file stem ".${stem}"`,
    };
  }

  const existing = index.chromeLayouts.find((entry) => entry.layoutId === incoming.layoutId);
  if (existing !== undefined) {
    return {
      kind: "error",
      code: "already_exists",
      detail: `chrome-layout id "${incoming.layoutId}" is already declared by ${existing.path}`,
    };
  }

  const formatted = new TextEncoder().encode(formatChromeLayoutDocumentV1(incoming));
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
  return { kind: "ok", digest: chromeLayoutDigestV1(formatted) };
}

function chromeLayoutPortStatusV1(code: ChromeLayoutPortErrorCodeV1): number {
  switch (code) {
    case "bad_request":
      return 400;
    case "not_found":
      return 404;
    case "digest_conflict":
    case "already_exists":
      return 409;
    case "chrome_layout_invalid":
    case "chrome_layout_id_mismatch":
      return 422;
    default: {
      const exhaustive: never = code;
      throw new TypeError(`unknown chrome-layout port error ${String(exhaustive)}`);
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
    if (total > chromeLayoutPortMaxBodyBytesV1) return null;
    chunks.push(bytes);
  }
  return new TextDecoder().decode(
    chunks.length === 1 ? chunks[0] : Buffer.concat(chunks as Buffer[]),
  );
}

/** Connect-style handler; exported separately so tests can drive it. */
export function createChromeLayoutPortMiddlewareV1(input: {
  readonly appRoot: string;
  readonly projectIndexOwner: AuthoringProjectIndexOwnerV1;
}): (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void {
  return (request, response, next) => {
    const [pathname = "", query = ""] = (request.url ?? "").split("?", 2);

    if (pathname === chromeLayoutListUrlV1) {
      if (request.method !== "GET") {
        response.statusCode = 405;
        response.end("method not allowed");
        return;
      }
      sendJsonV1(
        response,
        200,
        listChromeLayoutSourceFilesV1(input.projectIndexOwner.snapshot()),
      );
      return;
    }

    if (pathname !== chromeLayoutPortUrlV1) {
      next();
      return;
    }

    if (request.method === "GET") {
      const path = new URLSearchParams(query).get("path");
      const result = path === null
        ? ({ kind: "error", code: "bad_request" } as const)
        : readChromeLayoutSourceFileV1(input.appRoot, path);
      if (result.kind === "error") {
        sendJsonV1(response, chromeLayoutPortStatusV1(result.code), {
          error: result.code,
          ...(result.detail === undefined ? {} : { detail: result.detail }),
        });
        return;
      }
      sendJsonV1(response, 200, {
        path: result.path,
        digest: result.digest,
        chromeLayoutDocument: result.chromeLayoutDocument,
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
          ? createChromeLayoutSourceFileV1(input.appRoot, input.projectIndexOwner.snapshot(), {
            path: record.path,
            chromeLayoutDocument: record.chromeLayoutDocument,
          })
          : writeChromeLayoutSourceFileV1(input.appRoot, {
            path: record.path,
            expectedDigest: record.expectedDigest,
            chromeLayoutDocument: record.chromeLayoutDocument,
          });
        if (result.kind === "error") {
          sendJsonV1(response, chromeLayoutPortStatusV1(result.code), {
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

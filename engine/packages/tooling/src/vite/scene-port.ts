// SPDX-License-Identifier: MIT
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { SceneDocumentV1 } from "@sillymaker/base";
import { parseSceneDocumentV1 } from "@sillymaker/base";

import type {
  AuthoringProjectIndexOwnerV1,
  AuthoringProjectIndexV1,
} from "../project/authoring-index.ts";
import { resolveDevSourceCreatePathV1, resolveDevSourcePathV1 } from "./dev-sources.ts";

/**
 * The Scene write-back port: the dev-server half of the Studio save loop,
 * mirroring the Motion port discipline. List serves the shared Project
 * Authoring Index's scene enumeration (files the index cannot admit come
 * back as structured skips, not silence); read returns the parsed Document
 * plus a content digest; write is compare-and-swap on that digest —
 * schema-validated, id-stable, deterministically formatted, and atomically
 * renamed into place. The port exists only under `vite dev`; builds and
 * previews have no such endpoint. Scene files are Story sources: this
 * channel is Host/tooling I/O and never touches authoritative State,
 * Saves, digests, or CommandLog.
 */

export const scenePortUrlV1 = "/__sillymaker/dev-sources/scene";
export const sceneListUrlV1 = "/__sillymaker/dev-sources/scenes";

const scenePortMaxBodyBytesV1 = 256 * 1024;
const sceneFileSuffixV1 = ".scene.json";

export type ScenePortErrorCodeV1 =
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "already_exists"
  | "scene_invalid"
  | "scene_id_mismatch";

export interface SceneListEntryV1 {
  readonly path: string;
  readonly sceneId: string;
  readonly label: string;
}

export interface SceneListSkipV1 {
  readonly path: string;
  readonly reason: string;
}

export interface SceneListResultV1 {
  readonly scenes: readonly SceneListEntryV1[];
  /** `*.scene.json` files the index could not admit, named with the reason. */
  readonly skipped: readonly SceneListSkipV1[];
}

export type SceneReadResultV1 =
  | {
    readonly kind: "ok";
    readonly path: string;
    readonly digest: string;
    readonly sceneDocument: SceneDocumentV1;
  }
  | { readonly kind: "error"; readonly code: ScenePortErrorCodeV1; readonly detail?: string };

export type SceneWriteResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  | { readonly kind: "error"; readonly code: ScenePortErrorCodeV1; readonly detail?: string };

function sceneDigestV1(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

/** The one canonical on-disk formatting the port ever writes. */
export function formatSceneDocumentV1(sceneDocument: SceneDocumentV1): string {
  return `${JSON.stringify(sceneDocument, null, 2)}\n`;
}

function resolveSceneFileV1(
  appRoot: string,
  path: string,
): { readonly kind: "file"; readonly filePath: string } | {
  readonly kind: "error";
  readonly code: "bad_request" | "not_found";
} {
  if (!path.endsWith(sceneFileSuffixV1)) return { kind: "error", code: "bad_request" };
  const resolution = resolveDevSourcePathV1(appRoot, path);
  if (resolution.kind !== "file") return { kind: "error", code: resolution.kind };
  return { kind: "file", filePath: resolution.filePath };
}

/** The Project Authoring Index's scene view: navigator rows + named skips. */
export function listSceneSourceFilesV1(index: AuthoringProjectIndexV1): SceneListResultV1 {
  return Object.freeze({
    scenes: index.scenes,
    skipped: Object.freeze(
      index.skipped
        .filter((skip) => skip.kind === "scene")
        .map((skip) => Object.freeze({ path: skip.path, reason: skip.reason })),
    ),
  });
}

export function readSceneSourceFileV1(appRoot: string, path: string): SceneReadResultV1 {
  const resolved = resolveSceneFileV1(appRoot, path);
  if (resolved.kind === "error") return { kind: "error", code: resolved.code };
  let bytes: Uint8Array;
  try {
    bytes = readFileSync(resolved.filePath);
  } catch {
    return { kind: "error", code: "not_found" };
  }
  let sceneDocument: SceneDocumentV1;
  try {
    sceneDocument = parseSceneDocumentV1(
      JSON.parse(new TextDecoder().decode(bytes)) as unknown,
      `/${path}`,
    );
  } catch (error) {
    return {
      kind: "error",
      code: "scene_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  return Object.freeze({
    kind: "ok",
    path,
    digest: sceneDigestV1(bytes),
    sceneDocument,
  });
}

export interface WriteSceneSourceInputV1 {
  readonly path: string;
  /** The digest returned by the read this edit started from (CAS token). */
  readonly expectedDigest: string;
  readonly sceneDocument: unknown;
}

export function writeSceneSourceFileV1(
  appRoot: string,
  input: WriteSceneSourceInputV1,
): SceneWriteResultV1 {
  const resolved = resolveSceneFileV1(appRoot, input.path);
  if (resolved.kind === "error") return { kind: "error", code: resolved.code };

  let currentBytes: Uint8Array;
  try {
    currentBytes = readFileSync(resolved.filePath);
  } catch {
    return { kind: "error", code: "not_found" };
  }
  if (sceneDigestV1(currentBytes) !== input.expectedDigest) {
    return { kind: "error", code: "digest_conflict" };
  }

  let incoming: SceneDocumentV1;
  try {
    incoming = parseSceneDocumentV1(input.sceneDocument, `/${input.path}`);
  } catch (error) {
    return {
      kind: "error",
      code: "scene_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  let current: SceneDocumentV1;
  try {
    current = parseSceneDocumentV1(
      JSON.parse(new TextDecoder().decode(currentBytes)) as unknown,
      `/${input.path}`,
    );
  } catch (error) {
    return {
      kind: "error",
      code: "scene_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  if (incoming.sceneId !== current.sceneId) {
    return { kind: "error", code: "scene_id_mismatch" };
  }

  const formatted = new TextEncoder().encode(formatSceneDocumentV1(incoming));
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
  return Object.freeze({ kind: "ok", digest: sceneDigestV1(formatted) });
}

export interface CreateSceneSourceInputV1 {
  readonly path: string;
  readonly sceneDocument: unknown;
}

/**
 * Creates a brand-new scene document (Scene Construction S4): the file must
 * not exist, the document must pass strict admission, the filename stem
 * must be the sceneId's final segment (the same id↔path rule `story check`
 * lints), and the sceneId must not already be admitted elsewhere in the
 * story tree. Missing directories are created; the write lands via temp
 * file + atomic rename, same as CAS updates.
 */
export function createSceneSourceFileV1(
  appRoot: string,
  index: AuthoringProjectIndexV1,
  input: CreateSceneSourceInputV1,
): SceneWriteResultV1 {
  if (!input.path.endsWith(sceneFileSuffixV1)) return { kind: "error", code: "bad_request" };
  const resolved = resolveDevSourceCreatePathV1(appRoot, input.path);
  if (resolved.kind !== "create") return { kind: "error", code: resolved.kind };

  let incoming: SceneDocumentV1;
  try {
    incoming = parseSceneDocumentV1(input.sceneDocument, `/${input.path}`);
  } catch (error) {
    return {
      kind: "error",
      code: "scene_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  const stem = input.path.split("/").at(-1)?.slice(0, -sceneFileSuffixV1.length) ?? "";
  if (!incoming.sceneId.endsWith(`.${stem}`)) {
    return {
      kind: "error",
      code: "scene_id_mismatch",
      detail: `scene id "${incoming.sceneId}" does not end with the file stem ".${stem}"`,
    };
  }

  const existing = index.scenes.find((scene) => scene.sceneId === incoming.sceneId);
  if (existing !== undefined) {
    return {
      kind: "error",
      code: "already_exists",
      detail: `scene id "${incoming.sceneId}" is already declared by ${existing.path}`,
    };
  }

  const formatted = new TextEncoder().encode(formatSceneDocumentV1(incoming));
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
  return Object.freeze({ kind: "ok", digest: sceneDigestV1(formatted) });
}

function scenePortStatusV1(code: ScenePortErrorCodeV1): number {
  switch (code) {
    case "bad_request":
      return 400;
    case "not_found":
      return 404;
    case "digest_conflict":
    case "already_exists":
      return 409;
    case "scene_invalid":
    case "scene_id_mismatch":
      return 422;
    default: {
      const exhaustive: never = code;
      throw new TypeError(`unknown scene port error ${String(exhaustive)}`);
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
    if (total > scenePortMaxBodyBytesV1) return null;
    chunks.push(bytes);
  }
  return new TextDecoder().decode(
    chunks.length === 1 ? chunks[0] : Buffer.concat(chunks as Buffer[]),
  );
}

/** Connect-style handler; exported separately so tests can drive it. */
export function createScenePortMiddlewareV1(input: {
  readonly appRoot: string;
  readonly projectIndexOwner: AuthoringProjectIndexOwnerV1;
}): (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void {
  return (request, response, next) => {
    const [pathname = "", query = ""] = (request.url ?? "").split("?", 2);

    if (pathname === sceneListUrlV1) {
      if (request.method !== "GET") {
        response.statusCode = 405;
        response.end("method not allowed");
        return;
      }
      sendJsonV1(response, 200, listSceneSourceFilesV1(input.projectIndexOwner.snapshot()));
      return;
    }

    if (pathname !== scenePortUrlV1) {
      next();
      return;
    }

    if (request.method === "GET") {
      const path = new URLSearchParams(query).get("path");
      const result = path === null
        ? ({ kind: "error", code: "bad_request" } as const)
        : readSceneSourceFileV1(input.appRoot, path);
      if (result.kind === "error") {
        sendJsonV1(response, scenePortStatusV1(result.code), {
          error: result.code,
          ...(result.detail === undefined ? {} : { detail: result.detail }),
        });
        return;
      }
      sendJsonV1(response, 200, {
        path: result.path,
        digest: result.digest,
        sceneDocument: result.sceneDocument,
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
          ? createSceneSourceFileV1(input.appRoot, input.projectIndexOwner.snapshot(), {
            path: record.path,
            sceneDocument: record.sceneDocument,
          })
          : writeSceneSourceFileV1(input.appRoot, {
            path: record.path,
            expectedDigest: record.expectedDigest,
            sceneDocument: record.sceneDocument,
          });
        if (result.kind === "error") {
          sendJsonV1(response, scenePortStatusV1(result.code), {
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

// SPDX-License-Identifier: MIT
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

import type {
  AdmittedAuthoringSceneV1,
  AuthoringSceneDocumentV1,
} from "@sillymaker/base/authoring/scene";
import {
  admitAuthoringSceneDocumentV1,
  admitAuthoringSceneSourceBytesV1,
  compileAuthoringSceneV1,
} from "@sillymaker/base/authoring/scene";

import type {
  AuthoringProjectIndexOwnerV1,
  AuthoringProjectIndexV1,
} from "../project/authoring-index.ts";
import { resolveDevSourcePathV1 } from "./dev-sources.ts";

/**
 * The Authoring Scene write-back port: the dev-server half of the Inspector
 * save loop. List reuses the shared Project Authoring Index; read performs the
 * strict source-bytes admission; write is an exact-digest compare-and-swap
 * followed by ordinary Authoring Scene admission, compilation, stable-scene-id
 * enforcement, deterministic formatting, and a same-directory atomic rename.
 *
 * The port exists only under `vite dev`. It writes authoring source and never
 * touches authoritative runtime State, Saves, digests, or CommandLog.
 */

export const authoringScenePortUrlV1 = "/__sillymaker/dev-sources/authoring-scene";
export const authoringSceneListUrlV1 = "/__sillymaker/dev-sources/authoring-scenes";

// The admitted source format permits large authoring scenes. Keep the HTTP
// envelope bounded without restoring the legacy 256 KiB scale ceiling.
const authoringScenePortMaxBodyBytesV1 = 68 * 1024 * 1024;
const authoringSceneFileSuffixV1 = ".authoring-scene.json";

export type AuthoringScenePortErrorCodeV1 =
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "authoring_scene_invalid"
  | "scene_id_mismatch";

export interface AuthoringSceneListEntryV1 {
  readonly path: string;
  readonly sceneId: string;
  readonly label: string;
}

export interface AuthoringSceneListSkipV1 {
  readonly path: string;
  readonly reason: string;
}

export interface AuthoringSceneListResultV1 {
  readonly scenes: readonly AuthoringSceneListEntryV1[];
  /** `*.authoring-scene.json` files the index could not admit. */
  readonly skipped: readonly AuthoringSceneListSkipV1[];
}

export type AuthoringSceneReadResultV1 =
  | {
    readonly kind: "ok";
    readonly path: string;
    readonly digest: string;
    readonly admittedScene: AdmittedAuthoringSceneV1;
  }
  | {
    readonly kind: "error";
    readonly code: AuthoringScenePortErrorCodeV1;
    readonly detail?: string;
  };

export type AuthoringSceneWriteResultV1 =
  | { readonly kind: "ok"; readonly digest: string }
  | {
    readonly kind: "error";
    readonly code: AuthoringScenePortErrorCodeV1;
    readonly detail?: string;
  };

function authoringSceneDigestV1(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

/** The one canonical on-disk formatting the port writes. */
export function formatAuthoringSceneDocumentV1(sceneDocument: AuthoringSceneDocumentV1): string {
  return `${JSON.stringify(sceneDocument, null, 2)}\n`;
}

function resolveAuthoringSceneFileV1(
  appRoot: string,
  path: string,
): { readonly kind: "file"; readonly filePath: string } | {
  readonly kind: "error";
  readonly code: "bad_request" | "not_found";
} {
  if (!path.endsWith(authoringSceneFileSuffixV1)) return { kind: "error", code: "bad_request" };
  const resolution = resolveDevSourcePathV1(appRoot, path);
  if (resolution.kind !== "file") return { kind: "error", code: resolution.kind };
  return { kind: "file", filePath: resolution.filePath };
}

/** The Project Authoring Index's Authoring Scene view: rows plus named skips. */
export function listAuthoringSceneSourceFilesV1(
  index: AuthoringProjectIndexV1,
): AuthoringSceneListResultV1 {
  return {
    scenes: index.scenes
      .filter((scene) => scene.sourceKind === "authoring_scene")
      .map((scene) => ({ path: scene.path, sceneId: scene.sceneId, label: scene.label })),
    skipped: index.skipped
      .filter((skip) => skip.kind === "scene" && skip.path.endsWith(authoringSceneFileSuffixV1))
      .map((skip) => ({ path: skip.path, reason: skip.reason })),
  };
}

export function readAuthoringSceneSourceFileV1(
  appRoot: string,
  path: string,
): AuthoringSceneReadResultV1 {
  const resolved = resolveAuthoringSceneFileV1(appRoot, path);
  if (resolved.kind === "error") return { kind: "error", code: resolved.code };

  let bytes: Uint8Array;
  try {
    bytes = readFileSync(resolved.filePath);
  } catch {
    return { kind: "error", code: "not_found" };
  }

  try {
    return {
      kind: "ok",
      path,
      digest: authoringSceneDigestV1(bytes),
      admittedScene: admitAuthoringSceneSourceBytesV1(bytes),
    };
  } catch (error) {
    return {
      kind: "error",
      code: "authoring_scene_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface WriteAuthoringSceneSourceInputV1 {
  readonly path: string;
  /** The exact digest returned by the read this edit started from. */
  readonly expectedDigest: string;
  readonly sceneDocument: unknown;
}

export function writeAuthoringSceneSourceFileV1(
  appRoot: string,
  input: WriteAuthoringSceneSourceInputV1,
): AuthoringSceneWriteResultV1 {
  const resolved = resolveAuthoringSceneFileV1(appRoot, input.path);
  if (resolved.kind === "error") return { kind: "error", code: resolved.code };

  let currentBytes: Uint8Array;
  try {
    currentBytes = readFileSync(resolved.filePath);
  } catch {
    return { kind: "error", code: "not_found" };
  }
  if (authoringSceneDigestV1(currentBytes) !== input.expectedDigest) {
    return { kind: "error", code: "digest_conflict" };
  }

  let current: AdmittedAuthoringSceneV1;
  let candidate: AdmittedAuthoringSceneV1;
  try {
    current = admitAuthoringSceneSourceBytesV1(currentBytes);
    candidate = admitAuthoringSceneDocumentV1(input.sceneDocument);
    // A source accepted by schema admission may still fail deterministic
    // lowering (for example, an overflowing composed transform).
    compileAuthoringSceneV1(candidate);
  } catch (error) {
    return {
      kind: "error",
      code: "authoring_scene_invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  if (candidate.document.sceneId !== current.document.sceneId) {
    return { kind: "error", code: "scene_id_mismatch" };
  }

  const formatted = new TextEncoder().encode(formatAuthoringSceneDocumentV1(candidate.document));
  const temporaryPath = `${resolved.filePath}.tmp-${randomUUID()}`;
  try {
    writeFileSync(temporaryPath, formatted);
    renameSync(temporaryPath, resolved.filePath);
  } catch (error) {
    try {
      rmSync(temporaryPath, { force: true });
    } catch {
      // Best-effort cleanup; the original file remains the rename authority.
    }
    return {
      kind: "error",
      code: "bad_request",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  return { kind: "ok", digest: authoringSceneDigestV1(formatted) };
}

function authoringScenePortStatusV1(code: AuthoringScenePortErrorCodeV1): number {
  switch (code) {
    case "bad_request":
      return 400;
    case "not_found":
      return 404;
    case "digest_conflict":
      return 409;
    case "authoring_scene_invalid":
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
    if (total > authoringScenePortMaxBodyBytesV1) return null;
    chunks.push(bytes);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

/** Connect-style handler; exported separately so focused tests can drive it. */
export function createAuthoringScenePortMiddlewareV1(input: {
  readonly appRoot: string;
  readonly projectIndexOwner: AuthoringProjectIndexOwnerV1;
}): (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void {
  return (request, response, next) => {
    const [pathname = "", query = ""] = (request.url ?? "").split("?", 2);

    if (pathname === authoringSceneListUrlV1) {
      if (request.method !== "GET") {
        response.statusCode = 405;
        response.end("method not allowed");
        return;
      }
      sendJsonV1(
        response,
        200,
        listAuthoringSceneSourceFilesV1(input.projectIndexOwner.snapshot()),
      );
      return;
    }

    if (pathname !== authoringScenePortUrlV1) {
      next();
      return;
    }

    if (request.method === "GET") {
      const path = new URLSearchParams(query).get("path");
      const result = path === null
        ? ({ kind: "error", code: "bad_request" } as const)
        : readAuthoringSceneSourceFileV1(input.appRoot, path);
      if (result.kind === "error") {
        sendJsonV1(response, authoringScenePortStatusV1(result.code), {
          error: result.code,
          ...(result.detail === undefined ? {} : { detail: result.detail }),
        });
        return;
      }
      sendJsonV1(response, 200, {
        path: result.path,
        digest: result.digest,
        sceneDocument: result.admittedScene.document,
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
        const result = writeAuthoringSceneSourceFileV1(input.appRoot, {
          path: record.path,
          expectedDigest: record.expectedDigest,
          sceneDocument: record.sceneDocument,
        });
        if (result.kind === "error") {
          sendJsonV1(response, authoringScenePortStatusV1(result.code), {
            error: result.code,
            ...(result.detail === undefined ? {} : { detail: result.detail }),
          });
          return;
        }
        input.projectIndexOwner.invalidate(record.path);
        sendJsonV1(response, 200, { digest: result.digest });
      }).catch(() => sendJsonV1(response, 400, { error: "bad_request" }));
      return;
    }

    response.statusCode = 405;
    response.end("method not allowed");
  };
}

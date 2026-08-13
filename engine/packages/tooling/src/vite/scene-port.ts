// SPDX-License-Identifier: MIT
import { createHash, randomUUID } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { relative, resolve, sep } from "node:path";

import type { SceneDocumentV1 } from "@sillymaker/base";
import { parseSceneDocumentV1 } from "@sillymaker/base";

import { resolveDevSourcePathV1 } from "./dev-sources.ts";

/**
 * The Scene write-back port: the dev-server half of the Studio save loop,
 * mirroring the Motion port discipline. List enumerates the app's
 * `*.scene.json` sources; read returns the parsed Document plus a content
 * digest; write is compare-and-swap on that digest — schema-validated,
 * id-stable, deterministically formatted, and atomically renamed into
 * place. The port exists only under `vite dev`; builds and previews have
 * no such endpoint. Scene files are Story sources: this channel is
 * Host/tooling I/O and never touches authoritative State, Saves, digests,
 * or CommandLog.
 */

export const scenePortUrlV1 = "/__sillymaker/dev-sources/scene";
export const sceneListUrlV1 = "/__sillymaker/dev-sources/scenes";

const scenePortMaxBodyBytesV1 = 256 * 1024;
const sceneFileSuffixV1 = ".scene.json";

export type ScenePortErrorCodeV1 =
  | "bad_request"
  | "not_found"
  | "digest_conflict"
  | "scene_invalid"
  | "scene_id_mismatch";

export interface SceneListEntryV1 {
  readonly path: string;
  readonly sceneId: string;
  readonly label: string;
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

function walkSceneFilesV1(root: string, collected: string[]): void {
  let names: string[];
  try {
    names = readdirSync(root);
  } catch {
    return;
  }
  for (const name of names) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = resolve(root, name);
    let stat;
    try {
      stat = lstatSync(path);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      walkSceneFilesV1(path, collected);
      continue;
    }
    if (stat.isFile() && name.endsWith(sceneFileSuffixV1)) collected.push(path);
  }
}

/** Every admissible scene source under the app root, in stable path order. */
export function listSceneSourceFilesV1(appRoot: string): readonly SceneListEntryV1[] {
  const root = resolve(appRoot);
  const files: string[] = [];
  walkSceneFilesV1(root, files);
  files.sort((a, b) => a.localeCompare(b));
  const entries: SceneListEntryV1[] = [];
  for (const filePath of files) {
    let sceneDocument: SceneDocumentV1;
    try {
      sceneDocument = parseSceneDocumentV1(
        JSON.parse(readFileSync(filePath, "utf8")) as unknown,
      );
    } catch {
      // Broken documents are `story check` lint findings, not navigator rows.
      continue;
    }
    entries.push(
      Object.freeze({
        path: relative(root, filePath).split(sep).join("/"),
        sceneId: sceneDocument.sceneId,
        label: sceneDocument.label,
      }),
    );
  }
  return Object.freeze(entries);
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

function scenePortStatusV1(code: ScenePortErrorCodeV1): number {
  switch (code) {
    case "bad_request":
      return 400;
    case "not_found":
      return 404;
    case "digest_conflict":
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
export function createScenePortMiddlewareV1(input: { readonly appRoot: string }): (
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
      sendJsonV1(response, 200, { scenes: listSceneSourceFilesV1(input.appRoot) });
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
        if (typeof record.path !== "string" || typeof record.expectedDigest !== "string") {
          sendJsonV1(response, 400, { error: "bad_request" });
          return;
        }
        const result = writeSceneSourceFileV1(input.appRoot, {
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
        sendJsonV1(response, 200, { digest: result.digest });
      });
      return;
    }

    response.statusCode = 405;
    response.end("method not allowed");
  };
}

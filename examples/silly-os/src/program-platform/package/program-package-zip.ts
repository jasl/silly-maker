// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import { Unzip, UnzipInflate, type UnzipFile } from "fflate";

import {
  type ProgramPackageAdmissionLimitsV1,
  type ProgramPackageArchiveFileV1,
  type UnadmittedProgramPackageArchiveV1,
} from "./program-package-archive.ts";

export interface ProgramPackageZipBudgetsV1 {
  /** Maximum number of bytes accepted from the ZIP transport. */
  readonly maximumCompressedBytes: number;
  /** Maximum aggregate bytes emitted by the decompressor, including program.json. */
  readonly maximumUncompressedBytes: number;
  /** Maximum number of ZIP entries inspected, including directory entries. */
  readonly maximumEntries: number;
}

export interface DecodeProgramPackageZipOptionsV1 {
  readonly budgets: ProgramPackageZipBudgetsV1;
  readonly archiveLimits: ProgramPackageAdmissionLimitsV1;
}

export type ProgramPackageZipFailureCodeV1 =
  | "archive_invalid"
  | "budget_invalid"
  | "compressed_budget_exceeded"
  | "duplicate_path"
  | "entry_budget_exceeded"
  | "manifest_invalid"
  | "manifest_missing"
  | "manifest_multiple"
  | "path_invalid"
  | "uncompressed_budget_exceeded";

export class ProgramPackageZipErrorV1 extends Error {
  constructor(
    readonly code: ProgramPackageZipFailureCodeV1,
    readonly path: string | null = null,
  ) {
    super(
      path === null
        ? `sillyos.program_package.zip.${code}`
        : `sillyos.program_package.zip.${code}:${path}`,
    );
    this.name = "ProgramPackageZipErrorV1";
  }
}

interface DecodedZipFileV1 {
  readonly rawPath: string;
  readonly bytes: Uint8Array<ArrayBuffer>;
}

const textEncoderV1 = new TextEncoder();
const manifestFileNameV1 = "program.json";

function positiveSafeIntegerV1(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function admitBudgetsV1(value: ProgramPackageZipBudgetsV1): ProgramPackageZipBudgetsV1 {
  if (
    value === null || typeof value !== "object" ||
    !positiveSafeIntegerV1(value.maximumCompressedBytes) ||
    !positiveSafeIntegerV1(value.maximumUncompressedBytes) ||
    !positiveSafeIntegerV1(value.maximumEntries)
  ) throw new ProgramPackageZipErrorV1("budget_invalid");
  return { ...value };
}

function cloneInputBytesV1(value: ArrayBuffer | Uint8Array): Uint8Array<ArrayBuffer> {
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  return new Uint8Array(value.slice().buffer);
}

function containsControlCharacterV1(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || codeUnit === 0x7f) return true;
  }
  return false;
}

function validateZipPathV1(value: string, maximumPathBytes: number): void {
  if (
    value.length === 0 ||
    textEncoderV1.encode(value).byteLength > maximumPathBytes ||
    value.startsWith("/") ||
    /^[a-zA-Z]:\//u.test(value) ||
    value.includes("\\") ||
    value.includes("\0") ||
    containsControlCharacterV1(value)
  ) throw new ProgramPackageZipErrorV1("path_invalid", value);

  const withoutDirectoryMarker = value.endsWith("/") ? value.slice(0, -1) : value;
  const segments = withoutDirectoryMarker.split("/");
  if (
    withoutDirectoryMarker.length === 0 ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) throw new ProgramPackageZipErrorV1("path_invalid", value);
}

function mediaTypeForPathV1(path: string): string {
  const extension = path.includes(".") ? path.slice(path.lastIndexOf(".") + 1).toLowerCase() : "";
  switch (extension) {
    case "json":
      return "application/json";
    case "md":
      return "text/markdown";
    case "txt":
    case "ass":
    case "lrc":
    case "po":
    case "srt":
      return "text/plain";
    case "csv":
      return "text/csv";
    case "vtt":
      return "text/vtt";
    case "js":
    case "mjs":
      return "application/javascript";
    case "ts":
      return "application/typescript";
    case "css":
      return "text/css";
    case "html":
      return "text/html";
    case "svg":
      return "image/svg+xml";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "pdf":
      return "application/pdf";
    case "wasm":
      return "application/wasm";
    case "zip":
      return "application/zip";
    case "epub":
      return "application/epub+zip";
    default:
      return "application/octet-stream";
  }
}

function concatenateChunksV1(
  chunks: readonly Uint8Array[],
  byteLength: number,
): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function decodeEntriesV1(
  zipBytes: Uint8Array<ArrayBuffer>,
  budgets: ProgramPackageZipBudgetsV1,
  maximumPathBytes: number,
): readonly DecodedZipFileV1[] {
  const files: DecodedZipFileV1[] = [];
  const exactPaths = new Set<string>();
  const foldedPaths = new Map<string, string>();
  let entryCount = 0;
  let uncompressedBytes = 0;
  let terminalError: unknown = null;
  let activeFiles = 0;

  const failV1 = (error: unknown, file?: UnzipFile): void => {
    if (terminalError === null) terminalError = error;
    file?.terminate?.();
  };

  const unzipper = new Unzip((file) => {
    if (terminalError !== null) {
      file.terminate?.();
      return;
    }
    entryCount += 1;
    if (entryCount > budgets.maximumEntries) {
      failV1(new ProgramPackageZipErrorV1("entry_budget_exceeded"), file);
      return;
    }

    try {
      validateZipPathV1(file.name, maximumPathBytes);
      if (
        file.originalSize !== undefined &&
        (!Number.isSafeInteger(file.originalSize) || file.originalSize < 0 ||
          file.originalSize > budgets.maximumUncompressedBytes - uncompressedBytes)
      ) {
        failV1(new ProgramPackageZipErrorV1("uncompressed_budget_exceeded", file.name), file);
        return;
      }
      if (file.name.endsWith("/")) {
        activeFiles += 1;
        file.ondata = (error, chunk, final) => {
          if (terminalError !== null) return;
          if (error !== null) {
            activeFiles -= 1;
            failV1(error, file);
            return;
          }
          uncompressedBytes += chunk.byteLength;
          if (uncompressedBytes > budgets.maximumUncompressedBytes) {
            activeFiles -= 1;
            failV1(new ProgramPackageZipErrorV1("uncompressed_budget_exceeded", file.name), file);
            return;
          }
          if (final) activeFiles -= 1;
        };
        file.start();
        return;
      }
      const folded = file.name.toLocaleLowerCase("en-US");
      const foldedPredecessor = foldedPaths.get(folded);
      if (exactPaths.has(file.name) || foldedPredecessor !== undefined) {
        failV1(
          new ProgramPackageZipErrorV1(
            "duplicate_path",
            foldedPredecessor === undefined ? file.name : `${foldedPredecessor}|${file.name}`,
          ),
          file,
        );
        return;
      }
      exactPaths.add(file.name);
      foldedPaths.set(folded, file.name);

      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let fileBytes = 0;
      activeFiles += 1;
      file.ondata = (error, chunk, final) => {
        if (terminalError !== null) return;
        if (error !== null) {
          activeFiles -= 1;
          failV1(error, file);
          return;
        }
        fileBytes += chunk.byteLength;
        uncompressedBytes += chunk.byteLength;
        if (
          fileBytes > budgets.maximumUncompressedBytes ||
          uncompressedBytes > budgets.maximumUncompressedBytes
        ) {
          activeFiles -= 1;
          failV1(new ProgramPackageZipErrorV1("uncompressed_budget_exceeded", file.name), file);
          return;
        }
        chunks.push(chunk.slice());
        if (final) {
          activeFiles -= 1;
          files.push({ rawPath: file.name, bytes: concatenateChunksV1(chunks, fileBytes) });
        }
      };
      file.start();
    } catch (error) {
      failV1(error, file);
    }
  });
  unzipper.register(UnzipInflate);

  try {
    unzipper.push(zipBytes, true);
  } catch (error) {
    if (terminalError === null) terminalError = error;
  }
  if (terminalError !== null) {
    if (terminalError instanceof ProgramPackageZipErrorV1) throw terminalError;
    throw new ProgramPackageZipErrorV1("archive_invalid");
  }
  if (activeFiles !== 0) throw new ProgramPackageZipErrorV1("archive_invalid");
  return files;
}

function stripPackageRootV1(files: readonly DecodedZipFileV1[]): {
  readonly manifestBytes: Uint8Array<ArrayBuffer>;
  readonly files: readonly ProgramPackageArchiveFileV1[];
} {
  const manifestCandidates = files.filter((file) =>
    file.rawPath === manifestFileNameV1 ||
    (file.rawPath.endsWith(`/${manifestFileNameV1}`) && file.rawPath.split("/").length === 2)
  );
  if (manifestCandidates.length === 0) throw new ProgramPackageZipErrorV1("manifest_missing");
  if (manifestCandidates.length !== 1) throw new ProgramPackageZipErrorV1("manifest_multiple");

  const manifestFile = manifestCandidates[0]!;
  const rootPrefix = manifestFile.rawPath === manifestFileNameV1
    ? ""
    : manifestFile.rawPath.slice(0, -(manifestFileNameV1.length));
  const packageFiles: ProgramPackageArchiveFileV1[] = [];
  const exactPaths = new Set<string>();
  const foldedPaths = new Set<string>();
  for (const file of files) {
    if (rootPrefix.length > 0 && !file.rawPath.startsWith(rootPrefix)) {
      throw new ProgramPackageZipErrorV1("path_invalid", file.rawPath);
    }
    const path = rootPrefix.length === 0 ? file.rawPath : file.rawPath.slice(rootPrefix.length);
    if (path === manifestFileNameV1) continue;
    const folded = path.toLocaleLowerCase("en-US");
    if (exactPaths.has(path) || foldedPaths.has(folded)) {
      throw new ProgramPackageZipErrorV1("duplicate_path", path);
    }
    exactPaths.add(path);
    foldedPaths.add(folded);
    packageFiles.push({ path, mediaType: mediaTypeForPathV1(path), bytes: file.bytes.buffer });
  }
  return { manifestBytes: manifestFile.bytes, files: packageFiles };
}

/**
 * Decodes an external ZIP into the same immutable archive data consumed by bundled Programs.
 * ZIP transport identity and directory layout do not enter the installed package identity.
 */
export async function decodeProgramPackageZipV1(
  value: ArrayBuffer | Uint8Array,
  options: DecodeProgramPackageZipOptionsV1,
): Promise<UnadmittedProgramPackageArchiveV1> {
  const budgets = admitBudgetsV1(options.budgets);
  const zipBytes = cloneInputBytesV1(value);
  if (zipBytes.byteLength > budgets.maximumCompressedBytes) {
    throw new ProgramPackageZipErrorV1("compressed_budget_exceeded");
  }
  const decoded = decodeEntriesV1(zipBytes, budgets, options.archiveLimits.maximumPathBytes);
  const packageRoot = stripPackageRootV1(decoded);
  let manifest: unknown;
  try {
    manifest = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(packageRoot.manifestBytes),
    );
  } catch {
    throw new ProgramPackageZipErrorV1("manifest_invalid", manifestFileNameV1);
  }
  return { manifest, files: packageRoot.files };
}

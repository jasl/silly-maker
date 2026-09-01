// SPDX-License-Identifier: MIT

import type {
  ProgramPackageArchiveFileV1,
  ProgramPackageArchiveV1,
  ProgramPackageManifestV1,
} from "./program-package-archive.ts";

export interface UrlProgramPackageFileSourceV1 {
  readonly path: string;
  readonly mediaType: string;
  readonly url: URL;
}

export interface LoadUrlProgramPackageArchiveInputV1 {
  readonly manifestUrl: URL;
  readonly files: readonly UrlProgramPackageFileSourceV1[];
  readonly fetch?: typeof globalThis.fetch;
}

async function fetchBytesV1(
  fetchImplementation: typeof globalThis.fetch,
  url: URL,
): Promise<ArrayBuffer> {
  const response = await fetchImplementation(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`sillyos.bundled_program_source.fetch_failed:${url.pathname}`);
  return await response.arrayBuffer();
}

/** Build-known URLs become ordinary assets and are fetched only on demand. */
export async function loadUrlProgramPackageArchiveV1(
  input: LoadUrlProgramPackageArchiveInputV1,
): Promise<ProgramPackageArchiveV1> {
  const fetchImplementation = input.fetch ?? globalThis.fetch;
  const manifestBytes = await fetchBytesV1(fetchImplementation, input.manifestUrl);
  let manifest: ProgramPackageManifestV1;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as ProgramPackageManifestV1;
  } catch {
    throw new TypeError("sillyos.bundled_program_source.manifest_invalid");
  }
  const files: ProgramPackageArchiveFileV1[] = await Promise.all(
    input.files.map(async (file) => ({
      path: file.path,
      mediaType: file.mediaType,
      bytes: await fetchBytesV1(fetchImplementation, file.url),
    })),
  );
  return { manifest, files };
}

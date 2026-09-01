// SPDX-License-Identifier: MIT

import { browserWorkspaceDownloadFileNameMaximumUtf8BytesV1 } from "../../../src/workspace/browser-workspace-host-protocol.ts";

const suffixV1 = ".sillyos.zip";
const maximumSlugBytesV1 = browserWorkspaceDownloadFileNameMaximumUtf8BytesV1 -
  new TextEncoder().encode(suffixV1).byteLength;

function utf8PrefixV1(value: string, maximumBytes: number): string {
  const encoder = new TextEncoder();
  let byteLength = 0;
  let result = "";
  for (const character of value) {
    const characterBytes = encoder.encode(character).byteLength;
    if (byteLength + characterBytes > maximumBytes) break;
    result += character;
    byteLength += characterBytes;
  }
  return result;
}

/** Creator-owned filename presentation for exporting one generated Program workspace. */
export function creatorWorkspaceArchiveFileNameV1(programName: string): string {
  const slug = programName.toLowerCase().replaceAll(/[^\p{Letter}\p{Number}]+/gu, "-").replaceAll(
    /^-+|-+$/gu,
    "",
  );
  const boundedSlug = utf8PrefixV1(
    slug.length === 0 ? "sillyos-program" : slug,
    maximumSlugBytesV1,
  ).replaceAll(/-+$/gu, "");
  return `${boundedSlug.length === 0 ? "sillyos-program" : boundedSlug}${suffixV1}`;
}

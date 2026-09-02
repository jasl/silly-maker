// SPDX-License-Identifier: MIT

import { Type } from "./pi-workspace-runtime-bridge.js";
import type { AgentTool } from "./pi-workspace-runtime-bridge.js";

import type { BrowserProgramPackageResourceV1 } from "./browser-program-runtime-profile.ts";

/**
 * Keep package-resource output aligned with Pi's ordinary read tool. The
 * shared ceiling bounds one tool result without imposing a size limit on the
 * current Program archive or requiring it to be copied into the Process VFS.
 */
export const browserProgramPackageResourceMaximumLinesV1 = 2_000;
export const browserProgramPackageResourceMaximumBytesV1 = 50 * 1_024;

export const browserProgramPackageResourceToolNameV1 = "sillyos_read_program_resource" as const;

interface BrowserProgramPackageResourceReadParametersV1 {
  readonly path: string;
  readonly offset?: number;
  readonly limit?: number;
}

interface BrowserProgramPackageResourceReadDetailsV1 {
  readonly path: string;
  readonly mediaType: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly totalLines: number;
  readonly nextOffset: number | null;
}

const resourceReadSchemaV1 = Type.Object(
  {
    path: Type.String({
      minLength: 1,
      description: "Exact Program-package-relative resource path",
    }),
    offset: Type.Optional(Type.Integer({
      minimum: 1,
      description: "1-indexed line at which to begin reading",
    })),
    limit: Type.Optional(Type.Integer({
      minimum: 1,
      description: "Maximum number of lines to return",
    })),
  },
  { additionalProperties: false },
);

function utf8LengthV1(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function readBoundedLinesV1(
  lines: readonly string[],
  startIndex: number,
  requestedLines: number,
): { readonly text: string; readonly outputLines: number } {
  const selected: string[] = [];
  let byteLength = 0;
  const endIndex = Math.min(
    lines.length,
    startIndex + Math.min(requestedLines, browserProgramPackageResourceMaximumLinesV1),
  );
  for (let index = startIndex; index < endIndex; index += 1) {
    const line = lines[index]!;
    const delimiterBytes = selected.length === 0 ? 0 : 1;
    const nextByteLength = byteLength + delimiterBytes + utf8LengthV1(line);
    if (nextByteLength > browserProgramPackageResourceMaximumBytesV1) break;
    selected.push(line);
    byteLength = nextByteLength;
  }
  if (selected.length === 0 && startIndex < lines.length) {
    throw new RangeError("sillyos.program_resource.line_exceeds_output_budget");
  }
  return { text: selected.join("\n"), outputLines: selected.length };
}

/**
 * Creates one read-only tool over resources from the current compatible Program
 * implementation. No package resource is projected into the mutable Process
 * Workspace and the Program cannot replace this Host implementation.
 */
export function createBrowserProgramPackageResourceToolV1(
  resources: readonly BrowserProgramPackageResourceV1[],
): AgentTool<
  BrowserProgramPackageResourceReadParametersV1,
  BrowserProgramPackageResourceReadDetailsV1
> {
  const resourcesByPath = new Map(resources.map((resource) => [resource.path, resource] as const));
  return {
    name: browserProgramPackageResourceToolNameV1,
    label: "Read Program resource",
    description:
      "Read a text resource from the current compatible Program implementation mounted for this Process. Use the paths named by PROGRAM.md or a loaded skill. Large resources are paged by line offset.",
    parameters: resourceReadSchemaV1,
    async execute(_toolCallId, params, signal) {
      if (signal?.aborted) throw new Error("Program resource read was cancelled");
      const offset = params.offset ?? 1;
      const limit = params.limit ?? browserProgramPackageResourceMaximumLinesV1;

      const resource = resourcesByPath.get(params.path);
      if (resource === undefined) throw new Error("sillyos.program_resource.not_found");
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(resource.bytes);
      } catch {
        throw new TypeError("sillyos.program_resource.not_utf8_text");
      }
      const lines = text.split("\n");
      const startIndex = offset - 1;
      if (startIndex >= lines.length) {
        throw new RangeError("sillyos.program_resource.offset_out_of_range");
      }
      const page = readBoundedLinesV1(lines, startIndex, limit);
      const endLine = startIndex + page.outputLines;
      const nextOffset = endLine < lines.length ? endLine + 1 : null;
      const suffix = nextOffset === null
        ? ""
        : `\n\n[Showing lines ${offset}-${endLine} of ${lines.length}. Continue with offset=${nextOffset}.]`;
      const details: BrowserProgramPackageResourceReadDetailsV1 = {
        path: resource.path,
        mediaType: resource.mediaType,
        startLine: offset,
        endLine,
        totalLines: lines.length,
        nextOffset,
      };
      return {
        content: [{ type: "text", text: `${page.text}${suffix}` }],
        details,
      };
    },
  };
}

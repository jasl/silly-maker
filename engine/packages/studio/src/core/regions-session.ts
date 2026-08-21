// SPDX-License-Identifier: MIT
import type { RegionsDocumentV1 } from "@sillymaker/base";
import { createAuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";
import type { AuthoringDocumentIoV1, AuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";

import type { RegionsSourceIoV1 } from "./regions-io.ts";

/**
 * The regions workspace's authoring session: the same shared session state
 * machine (open fence, CAS save, discard, undo/redo with coalescing) the
 * Scene workspace and the Motion Workbench run on, over the dev-server
 * regions port — one draft/conflict discipline across workspaces.
 */
export function createRegionsDocumentSessionV1(
  io: RegionsSourceIoV1,
): AuthoringDocumentSessionV1<RegionsDocumentV1> {
  const adapted: AuthoringDocumentIoV1<RegionsDocumentV1> = Object.freeze({
    read: (path: string) =>
      io.read(path).then((result) =>
        result.kind === "ok"
          ? { kind: "ok" as const, digest: result.digest, document: result.regionsDocument }
          : { kind: "error" as const, code: result.code }
      ),
    write: (input: {
      readonly path: string;
      readonly expectedDigest: string;
      readonly document: RegionsDocumentV1;
    }) =>
      io.write({
        path: input.path,
        expectedDigest: input.expectedDigest,
        regionsDocument: input.document,
      }),
  });
  return createAuthoringDocumentSessionV1({ io: adapted });
}

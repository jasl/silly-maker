// SPDX-License-Identifier: MIT
import type { ChromeLayoutDocumentV1 } from "@sillymaker/base";
import { createAuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";
import type { AuthoringDocumentIoV1, AuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";

import type { ChromeLayoutSourceIoV1 } from "./chrome-layout-io.ts";

/**
 * The Chrome workspace's authoring session: the same shared session state
 * machine (open fence, CAS save, discard, undo/redo with coalescing) the
 * Scene, Regions, and Motion workspaces run on, over the dev-server
 * chrome-layout port — one draft/conflict discipline across workspaces.
 */
export function createChromeLayoutDocumentSessionV1(
  io: ChromeLayoutSourceIoV1,
): AuthoringDocumentSessionV1<ChromeLayoutDocumentV1> {
  const adapted: AuthoringDocumentIoV1<ChromeLayoutDocumentV1> = {
    read: (path: string) =>
      io.read(path).then((result) =>
        result.kind === "ok"
          ? { kind: "ok" as const, digest: result.digest, document: result.chromeLayoutDocument }
          : { kind: "error" as const, code: result.code }
      ),
    write: (input: {
      readonly path: string;
      readonly expectedDigest: string;
      readonly document: ChromeLayoutDocumentV1;
    }) =>
      io.write({
        path: input.path,
        expectedDigest: input.expectedDigest,
        chromeLayoutDocument: input.document,
      }),
  };
  return createAuthoringDocumentSessionV1({ io: adapted });
}

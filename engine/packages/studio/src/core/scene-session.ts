// SPDX-License-Identifier: MIT
import type { SceneDocumentV1 } from "@sillymaker/base";
import { createAuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";
import type { AuthoringDocumentIoV1, AuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";

import type { SceneSourceIoV1 } from "./scene-io.ts";

/**
 * The scene workspace's authoring session: the shared session state
 * machine (open fence, CAS save, discard, undo/redo with coalescing) over
 * the dev-server scene port. The Motion Workbench runs on the same session
 * implementation — one draft/conflict discipline across workspaces.
 */
export function createSceneDocumentSessionV1(
  io: SceneSourceIoV1,
): AuthoringDocumentSessionV1<SceneDocumentV1> {
  const adapted: AuthoringDocumentIoV1<SceneDocumentV1> = Object.freeze({
    read: (path: string) =>
      io.read(path).then((result) =>
        result.kind === "ok"
          ? { kind: "ok" as const, digest: result.digest, document: result.sceneDocument }
          : { kind: "error" as const, code: result.code }
      ),
    write: (input: {
      readonly path: string;
      readonly expectedDigest: string;
      readonly document: SceneDocumentV1;
    }) =>
      io.write({
        path: input.path,
        expectedDigest: input.expectedDigest,
        sceneDocument: input.document,
      }),
  });
  return createAuthoringDocumentSessionV1({ io: adapted });
}

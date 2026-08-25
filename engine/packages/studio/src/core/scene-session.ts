// SPDX-License-Identifier: MIT
import type { AdmittedAuthoringSceneV1 } from "@sillymaker/base/authoring/scene";
import { createAuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";
import type { AuthoringDocumentIoV1, AuthoringDocumentSessionV1 } from "@sillymaker/ui/debug";

import type { AuthoringSceneSourceIoV1 } from "./authoring-scene-io.ts";

/**
 * The Inspector's Authoring Scene session: the shared session state machine
 * (open fence, CAS save, discard, undo/redo with coalescing) over the
 * dev-server source port. The session retains the admitted document and its
 * source map together, so compiler/facet consumers do not re-admit a draft.
 */
export function createSceneDocumentSessionV1(
  io: AuthoringSceneSourceIoV1,
): AuthoringDocumentSessionV1<AdmittedAuthoringSceneV1> {
  const adapted: AuthoringDocumentIoV1<AdmittedAuthoringSceneV1> = {
    read: (path: string) =>
      io.read(path).then((result) =>
        result.kind === "ok"
          ? { kind: "ok" as const, digest: result.digest, document: result.admittedScene }
          : { kind: "error" as const, code: result.code }
      ),
    write: (input: {
      readonly path: string;
      readonly expectedDigest: string;
      readonly document: AdmittedAuthoringSceneV1;
    }) =>
      io.write({
        path: input.path,
        expectedDigest: input.expectedDigest,
        admittedScene: input.document,
      }),
  };
  return createAuthoringDocumentSessionV1({
    io: adapted,
    clone: (scene) => scene,
    equals: Object.is,
  });
}

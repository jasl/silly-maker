// SPDX-License-Identifier: MIT
import { useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import type { AuthoringHostInternalV1 } from "./authoring-host.ts";
import { resolveAuthoringHostOwnerInternalV1 } from "./authoring-host.ts";
import type {
  EmbeddedAuthoringCompanionDefinitionInternalV1,
  EmbeddedAuthoringCompanionOwnerInternalV1,
} from "./embedded-authoring-companion.ts";

export function AuthoringCompanionSurfaceInternalV1(props: {
  readonly host: AuthoringHostInternalV1;
  readonly publicationRole: "visible" | "probe";
  readonly companion: {
    readonly owner: EmbeddedAuthoringCompanionOwnerInternalV1;
    readonly definition: EmbeddedAuthoringCompanionDefinitionInternalV1;
  };
}): ReactElement {
  const owner = resolveAuthoringHostOwnerInternalV1(props.host);
  const snapshot = useSyncExternalStore(
    props.host.subscribe,
    props.host.getSnapshot,
    props.host.getSnapshot,
  );
  return props.companion.definition.render(props.companion.owner, {
    sceneOperations: owner.sceneOperations,
    authoringRevision: snapshot.revision,
    publicationRole: props.publicationRole,
  });
}

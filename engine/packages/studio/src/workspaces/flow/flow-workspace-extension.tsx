// SPDX-License-Identifier: MIT
import {
  defineExtensionFactoryInternalV1,
  mountExtensionFactoryInternalV1,
} from "@sillymaker/composition/internal/extension-runtime";

import { FlowWorkspaceSectionV1 } from "./flow-workspace.tsx";
import type {
  FlowWorkspaceConsumerInternalV1,
  FlowWorkspaceMountedExtensionInternalV1,
  FlowWorkspaceRenderInputInternalV1,
} from "./flow-workspace-activation.tsx";

const flowWorkspaceFactoryIdInternalV1 = "sillymaker.studio.flow-workspace";
const flowWorkspaceFactoryGenerationInternalV1 = "flow-workspace-v1";

const flowWorkspaceConsumerInternalV1: FlowWorkspaceConsumerInternalV1 = Object.freeze({
  render(input: FlowWorkspaceRenderInputInternalV1) {
    return (
      <FlowWorkspaceSectionV1
        flow={input.flow}
        {...(input.resolveText === undefined ? {} : { resolveText: input.resolveText })}
      />
    );
  },
});

/**
 * Dynamic facade: the Flow implementation and selected private lifecycle
 * backend enter the graph together, while the mounted consumer stays neutral.
 */
export async function mountFlowWorkspaceExtensionInternalV1(): Promise<
  FlowWorkspaceMountedExtensionInternalV1
> {
  const handle = await mountExtensionFactoryInternalV1(defineExtensionFactoryInternalV1({
    id: flowWorkspaceFactoryIdInternalV1,
    generation: flowWorkspaceFactoryGenerationInternalV1,
    setup: () => flowWorkspaceConsumerInternalV1,
  }));
  let disposePromise: Promise<void> | null = null;
  return Object.freeze({
    consumer: handle.consumer,
    dispose(): Promise<void> {
      disposePromise ??= handle.dispose();
      return disposePromise;
    },
  });
}

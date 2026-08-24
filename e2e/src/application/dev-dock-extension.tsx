// SPDX-License-Identifier: MIT
import {
  defineExtensionFactoryInternalV1,
  mountExtensionFactoryInternalV1,
} from "@sillymaker/composition/internal/extension-runtime";
import type { DevDockContributionSetV1 } from "@sillymaker/ui/debug";
import { bindDevDockContributionLifecycleInternalV1 } from "@sillymaker/ui/reference/internal";

import type { LabApplicationInstanceV1 } from "./core-definition.ts";
import { createLabDevDockContributionsV1 } from "./dev-dock.tsx";

const labDevDockExtensionIdV1 = "engine-lab.devdock";
const labDevDockExtensionGenerationV1 = "engine-lab.devdock.v1";

/**
 * The literal DevDock dynamic entry. Both the implementation and the selected
 * private lifecycle backend stay in this lazy graph; the resident Story and
 * Web Host continue to exchange only the admitted contribution result.
 */
export async function loadLabDevDockExtensionV1(input: {
  readonly instance: LabApplicationInstanceV1;
}): Promise<DevDockContributionSetV1> {
  const handle = await mountExtensionFactoryInternalV1(
    defineExtensionFactoryInternalV1({
      id: labDevDockExtensionIdV1,
      generation: labDevDockExtensionGenerationV1,
      setup: () => createLabDevDockContributionsV1(input),
    }),
  );
  return bindDevDockContributionLifecycleInternalV1(
    handle.consumer,
    () => handle.dispose(),
  );
}

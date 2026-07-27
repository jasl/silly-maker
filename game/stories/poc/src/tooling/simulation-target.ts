// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { parseNonZeroUint32 } from "@sillymaker/base";
import {
  createCoreGameApplicationInstanceV1,
  createInProcessAgentGamePortV1,
  resolveCoreGameApplicationV1,
} from "@sillymaker/base/runtime";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";

import { pocCoreApplicationDefinitionV1 } from "../application/core-definition.js";

const pocDefaultSimulationSeedV1 = 23049;
const pocSimulationUuidV1 = "00000000-0000-4000-8000-00000000c0de";
const pocSimulationInstantV1 = "2026-07-16T00:00:00.000Z";

const invokeV1 = (actionId: string) =>
  Object.freeze({ kind: "invoke" as const, actionId, options: Object.freeze({}) });

/** The first ordinary week: enter the run and pick the balanced policy. */
const defaultScriptV1 = Object.freeze([invokeV1("action.run_start")]);

const scenariosV1 = Object.freeze({
  opening: defaultScriptV1,
});

/**
 * The Project Tavern simulation target for `pnpm story simulate poc-web`:
 * a fresh fixed-seed core application instance (the same declaration the
 * browser boots) whose player-safe Agent port drives the run.
 */
export async function createPocSimulationTargetV1(options: { readonly seed?: number } = {}) {
  const resolved = resolveCoreGameApplicationV1(pocCoreApplicationDefinitionV1);
  if (resolved.kind === "failed") {
    throw new TypeError(`PoC Story failed to resolve: ${resolved.failure.code}`);
  }
  const seed = options.seed ?? pocDefaultSimulationSeedV1;
  let seedConsumed = false;
  const application = await createCoreGameApplicationInstanceV1(resolved.application, {
    host: Object.freeze({
      entropy: Object.freeze({
        nextUuidV4: () => pocSimulationUuidV1,
        nextNonZeroUint32: () => {
          if (seedConsumed) {
            throw new TypeError("PoC simulation bootstrap consumed more than one seed");
          }
          seedConsumed = true;
          return parseNonZeroUint32(seed);
        },
      }),
      records: createMemoryHostRecordStoreV1(),
      now: () => pocSimulationInstantV1 as never,
      ownerId: "owner.sillymaker.poc.simulate" as never,
      nextHandoffRequestId: () => "handoff.sillymaker.poc.simulate",
    }),
  });
  const agent = createInProcessAgentGamePortV1({
    identity: Object.freeze({
      storyId: application.storyId,
      storyRevision: application.storyRevision,
    }),
    semantic: application.semantic,
  });
  return Object.freeze({
    agent,
    stateDigest: () => application.admin.stateDigest(),
    dispose: () => application.dispose(),
    defaultScript: defaultScriptV1,
    scenarios: scenariosV1,
  });
}

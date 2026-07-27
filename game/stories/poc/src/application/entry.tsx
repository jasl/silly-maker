// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { resolveGamePackageV1 } from "@sillymaker/base";
import type { BuildProvenanceV1, DeepReadonly } from "@sillymaker/base";
import { installWebGameApplicationHmrV1, startWebGameApplicationV1 } from "@sillymaker/web";
import type {
  InstalledResolvedGameHmrV1,
  ResolvedGameHmrHotAdapterV1,
  StartedWebGameApplicationV1,
} from "@sillymaker/web";

import { pocBuildIdentityV1 } from "virtual:project-tavern/poc-build-identity";
import { pocStoryEntryV1 } from "../story-definition.js";
import { pocWebApplicationV1 } from "./web-application.js";

/** The production application: the declaration plus the build identity. */
const pocWebApplicationWithIdentityV1: typeof pocWebApplicationV1 = {
  ...pocWebApplicationV1,
  buildIdentityInput: pocBuildIdentityV1,
};

/**
 * The whole Project Tavern web entry: one declaration, one start call. The
 * composer owns the Session, persistence, diagnostics, input, automation,
 * capability session, and the dev HMR lifecycle; this module only tells the
 * composer which application to run and how to read an accepted module.
 */

export interface PocEntryModuleV1 {
  readonly pocWebApplicationForHmrV1: typeof pocWebApplicationV1;
  resolvePocProvenanceV1(): DeepReadonly<BuildProvenanceV1>;
}

export const pocWebApplicationForHmrV1 = pocWebApplicationWithIdentityV1;

export function resolvePocProvenanceV1(): DeepReadonly<BuildProvenanceV1> {
  const result = resolveGamePackageV1(pocStoryEntryV1, [], pocBuildIdentityV1);
  if (result.kind === "failed") {
    throw new TypeError(`PoC HMR resolution failed: ${result.failure.code}`);
  }
  return result.resolved.provenance;
}

const acceptedHandlerKeyV1 = "projectTavernPocAcceptedModuleHandlerV1";
const initializedKeyV1 = "projectTavernPocApplicationInitializedV1";

type PocEntryHandlerV1 = (module: PocEntryModuleV1 | undefined) => void;

const entryHotV1: ResolvedGameHmrHotAdapterV1<PocEntryModuleV1> | undefined =
  import.meta.hot === undefined
    ? undefined
    : Object.freeze({
        accept(handler: PocEntryHandlerV1) {
          if (import.meta.hot !== undefined) {
            import.meta.hot.data[acceptedHandlerKeyV1] = handler;
          }
        },
      });

if (import.meta.hot !== undefined) {
  import.meta.hot.accept((module) => {
    const handler = import.meta.hot?.data[acceptedHandlerKeyV1];
    if (typeof handler === "function") {
      (handler as PocEntryHandlerV1)(module as unknown as PocEntryModuleV1 | undefined);
    }
  });
}

function installPocHmrBoundaryV1(started: StartedWebGameApplicationV1): InstalledResolvedGameHmrV1 {
  return installWebGameApplicationHmrV1<PocEntryModuleV1>({
    started,
    hot: entryHotV1,
    resolveAcceptedProvenance: (module) => module.resolvePocProvenanceV1(),
    startSuccessor: async ({ module, started: predecessor, disposition }) =>
      await startWebGameApplicationV1(module.pocWebApplicationForHmrV1, {
        host: predecessor.host,
        capabilitySearch: predecessor.capabilitySearch,
        rebootstrapDisposition: disposition,
      }),
    installNextBoundary: ({ started: successor }) => installPocHmrBoundaryV1(successor),
  });
}

function claimPocApplicationInitializationV1(): boolean {
  if (import.meta.hot === undefined) return true;
  if (import.meta.hot.data[initializedKeyV1] === true) return false;
  import.meta.hot.data[initializedKeyV1] = true;
  return true;
}

if (typeof document !== "undefined" && claimPocApplicationInitializationV1()) {
  const started = await startWebGameApplicationV1(pocWebApplicationWithIdentityV1, {
    // Existing player saves and preferences live in this database.
    databaseName: "project-tavern.runtime",
  });
  installPocHmrBoundaryV1(started);
}

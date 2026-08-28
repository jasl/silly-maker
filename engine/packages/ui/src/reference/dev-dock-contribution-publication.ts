// SPDX-License-Identifier: MIT
import type { DevDockContributionSetV1 } from "../debug/dev-dock.tsx";

/** One immutable, already-admitted dynamic DevDock contribution publication. */
export interface DevDockContributionPublicationV1 {
  readonly contributions: DevDockContributionSetV1;
}

/**
 * Observable successor publication used by optional tooling Mods. The
 * publisher keeps a candidate staged until the mounted reference surface
 * acknowledges this exact publication after its React commit.
 *
 * `getCurrent()` must return the same object while the publication is
 * unchanged, as required by `useSyncExternalStore`.
 */
export interface DevDockContributionPublicationPortV1 {
  getCurrent(): DevDockContributionPublicationV1;
  subscribe(listener: () => void): () => void;
  acknowledgeCommitted(publication: DevDockContributionPublicationV1): void;
}

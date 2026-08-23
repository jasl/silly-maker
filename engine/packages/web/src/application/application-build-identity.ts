// SPDX-License-Identifier: MIT
import type { ResolveCoreGameApplicationOptionsV1 } from "@sillymaker/base/runtime";

/** BuildIdentity shape supplied by a Story's Vite identity owner. @internal */
export type ApplicationBuildIdentityInputInternalV1 = NonNullable<
  ResolveCoreGameApplicationOptionsV1["buildIdentityInput"]
>;

/**
 * Physical fallback for tests, static analysis, and non-Vite environments.
 * A configured Story identity plugin resolves this exact package subpath to
 * its live virtual module before normal package resolution.
 *
 * @internal
 */
export const applicationBuildIdentityInputInternalV1:
  | ApplicationBuildIdentityInputInternalV1
  | undefined = undefined;

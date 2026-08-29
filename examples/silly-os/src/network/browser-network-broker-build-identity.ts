// SPDX-License-Identifier: MIT

// eslint-disable-next-line no-underscore-dangle -- Vite replaces this fixed build-time token.
declare const __SILLYOS_NETWORK_BROKER_BUILD_IDENTITY__: string;

const networkBrokerBuildIdentityPatternV1 =
  /^sillyos\.network-broker\.(?:development|(?:[0-9a-f]{40}|[0-9a-f]{64})(?:-dirty)?)$/u;

export const browserNetworkBrokerArtifactBuildIdentityV1 = import.meta.env.DEV
  ? "sillyos.network-broker.development"
  : __SILLYOS_NETWORK_BROKER_BUILD_IDENTITY__;

if (!networkBrokerBuildIdentityPatternV1.test(browserNetworkBrokerArtifactBuildIdentityV1)) {
  throw new TypeError("sillyos.network_broker.build_identity_invalid");
}

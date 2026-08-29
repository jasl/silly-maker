// SPDX-License-Identifier: MIT

export const browserNetworkBrokerProductionOriginV1 =
  "https://silly-os-network.jasl9187.workers.dev";
export const browserNetworkBrokerProductionControlOriginV1 =
  "https://silly-os.jasl9187.workers.dev";
export const browserNetworkBrokerDevelopmentOriginV1 = "http://127.0.0.1:41741";
export const browserNetworkBrokerDevelopmentControlOriginV1 = "http://127.0.0.1:41739";
export const browserNetworkBrokerInteractiveDevelopmentControlOriginV1 = "http://127.0.0.1:4173";

export function browserNetworkBrokerOriginForControlV1(controlOrigin: string): string | null {
  if (controlOrigin === browserNetworkBrokerProductionControlOriginV1) {
    return browserNetworkBrokerProductionOriginV1;
  }
  if (
    controlOrigin === browserNetworkBrokerDevelopmentControlOriginV1 ||
    controlOrigin === browserNetworkBrokerInteractiveDevelopmentControlOriginV1
  ) return browserNetworkBrokerDevelopmentOriginV1;
  return null;
}

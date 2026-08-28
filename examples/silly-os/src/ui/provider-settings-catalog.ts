// SPDX-License-Identifier: MIT

import type { BrowserPiProviderCatalogWireV1 } from "../agent/browser-pi-worker-protocol.ts";
import type { ProviderSettingsCatalogV1, ProviderSettingsModelV1 } from "./provider-settings.tsx";

const datedSnapshotSuffixV1 = /-20\d{6}$/u;

function modelRouteKeyV1(model: {
  readonly modelId: string;
  readonly api: string;
  readonly baseUrl: string;
}): string {
  return JSON.stringify([model.modelId, model.api, model.baseUrl]);
}

/**
 * Prefer a Provider-owned stable alias over its exact YYYYMMDD snapshot.
 * The alias must already exist on the same Pi API/base-URL route; SillyOS
 * never invents an alias or guesses which unrelated version is newer.
 */
export function preferProviderStableAliasesV1(
  models: readonly ProviderSettingsModelV1[],
): readonly ProviderSettingsModelV1[] {
  const routes = new Set(models.map(modelRouteKeyV1));
  return models.filter((model) => {
    const aliasId = model.modelId.replace(datedSnapshotSuffixV1, "");
    return aliasId === model.modelId ||
      !routes.has(modelRouteKeyV1({ ...model, modelId: aliasId }));
  });
}

function settingsAvailabilityV1(
  status: "available" | "unavailable",
): ProviderSettingsModelV1["availability"] {
  return status === "available" ? { status } : { status, reason: "browser_runtime_unavailable" };
}

export function projectProviderSettingsCatalogV1(
  catalog: BrowserPiProviderCatalogWireV1,
): ProviderSettingsCatalogV1 {
  return {
    phase: "ready",
    providers: catalog.providers.map((provider) => {
      const models = provider.models.map((model): ProviderSettingsModelV1 => ({
        providerId: provider.id,
        modelId: model.id,
        name: model.name,
        api: model.api,
        baseUrl: model.baseUrl,
        availability: settingsAvailabilityV1(model.availability),
      }));
      return {
        providerId: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl,
        availability: settingsAvailabilityV1(provider.availability),
        models: preferProviderStableAliasesV1(models),
      };
    }),
  };
}

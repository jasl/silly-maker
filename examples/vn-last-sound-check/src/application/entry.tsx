// SPDX-License-Identifier: MIT
import { startWebGameApplicationV1 } from "@sillymaker/web";

// Production keeps the product declaration structurally free of debug UI.
// Vite development selects a lightweight launcher composition. Complete
// Debug and Embedded Authoring surfaces remain behind explicit interaction.
if (typeof document !== "undefined") {
  const development = import.meta.hot !== undefined;
  if (development) {
    const developmentModule = await import("../tooling/development-application.tsx");
    await startWebGameApplicationV1(
      developmentModule.vnLastSoundCheckDevelopmentApplicationV1,
      { capabilitySearch: developmentModule.developmentCapabilitySearchV1(location.search) },
    );
  } else {
    const productionModule = await import("./production-application.tsx");
    await startWebGameApplicationV1(productionModule.vnLastSoundCheckGameApplicationV1);
  }
}

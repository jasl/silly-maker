// SPDX-License-Identifier: MIT
import { startWebGameApplicationV1 } from "@sillymaker/web";

import { vnReferenceTourGameApplicationV1 } from "./composition.tsx";

// Production keeps the product declaration structurally free of debug UI.
// Vite development selects a lightweight launcher composition. Complete
// Debug and Embedded Authoring surfaces remain behind explicit interaction.
if (typeof document !== "undefined") {
  const development = import.meta.hot !== undefined;
  const developmentModule = development
    ? await import("../tooling/development-application.tsx")
    : null;
  const application = developmentModule?.vnReferenceTourDevelopmentApplicationV1 ??
    vnReferenceTourGameApplicationV1;
  await startWebGameApplicationV1(
    application,
    developmentModule === null
      ? undefined
      : { capabilitySearch: developmentModule.developmentCapabilitySearchV1(location.search) },
  );
}

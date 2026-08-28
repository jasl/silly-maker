// SPDX-License-Identifier: MIT

export const browserWorkspaceSandboxProductionOriginV1 =
  "https://silly-os-sandbox.jasl9187.workers.dev";
export const browserWorkspaceSandboxProductionControlOriginV1 =
  "https://silly-os.jasl9187.workers.dev";
export const browserWorkspaceSandboxDevelopmentOriginV1 = "http://127.0.0.1:41740";
export const browserWorkspaceSandboxDevelopmentControlOriginV1 = "http://127.0.0.1:41739";
export const browserWorkspaceSandboxInteractiveDevelopmentControlOriginV1 = "http://127.0.0.1:4173";

export function browserWorkspaceSandboxOriginForControlV1(controlOrigin: string): string | null {
  if (controlOrigin === browserWorkspaceSandboxProductionControlOriginV1) {
    return browserWorkspaceSandboxProductionOriginV1;
  }
  if (
    controlOrigin === browserWorkspaceSandboxDevelopmentControlOriginV1 ||
    controlOrigin === browserWorkspaceSandboxInteractiveDevelopmentControlOriginV1
  ) return browserWorkspaceSandboxDevelopmentOriginV1;
  return null;
}

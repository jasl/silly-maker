// SPDX-License-Identifier: MIT
export { runSillymakerAppCliV1 } from "./app-cli.ts";
export type { AppCliInputV1 } from "./app-cli.ts";
export { runProjectCliV1 } from "./cli.ts";
export type { ProjectCliInputV1 } from "./cli.ts";
export {
  buildStoryApplicationV1,
  DESKTOP_TARGET_TRIPLES_V1,
  desktopStoryApplicationV1,
  checkStoryApplicationV1,
  devSmokeStoryApplicationV1,
  inspectStoryApplicationV1,
  prebuiltSmokeStoryApplicationV1,
  simulateStoryApplicationV1,
} from "./commands.ts";
export type {
  DesktopCompressionV1,
  DesktopTargetTripleV1,
  ProjectCommandRunnerV1,
  ProjectModuleLoaderV1,
  StoryBuildOptionsV1,
  StoryBuildReportV1,
  StoryDesktopOptionsV1,
  StoryDesktopOutputV1,
  StoryDesktopReportV1,
  StoryCheckReportV1,
  StoryDevSmokeReportV1,
  StoryInspectReportV1,
  StoryInspectResultV1,
  StoryPrebuiltSmokeReportV1,
  StorySimulateOptionsV1,
  StorySimulateReportV1,
  StorySimulateStepV1,
  StorySimulationTargetFactoryOptionsV1,
  StorySimulationTargetFactoryV1,
  StorySimulationTargetV1,
} from "./commands.ts";
export {
  defineSillymakerAppV1,
  defineSillymakerProjectV1,
  defineSillymakerWorkspaceV1,
  deriveStoryApplicationV1,
  joinAppPathV1,
  listStoryApplicationIdsV1,
  resolveStoryApplicationV1,
  resolveWebBuildTargetV1,
} from "./config.ts";
export type {
  ProjectModuleRefV1,
  SillymakerAppConfigV1,
  SillymakerAppWebTargetV1,
  SillymakerProjectConfigV1,
  SillymakerWorkspaceConfigV1,
  StoryApplicationConfigV1,
  StoryWebIdentityRefV1,
  StoryWebTargetV1,
} from "./config.ts";
export {
  loadSillymakerAppConfigV1,
  loadStandaloneAppProjectV1,
  loadWorkspaceAppsV1,
  loadWorkspaceProjectV1,
  sillymakerAppConfigExportNameV1,
  sillymakerAppConfigFileNameV1,
} from "./workspace.ts";
export type { WorkspaceAppV1 } from "./workspace.ts";
// The Node dynamic-import loader intentionally lives outside this barrel
// (`@sillymaker/tooling/project/loader`): build-identity closures walk this
// module from Vite configs and must stay statically analyzable.

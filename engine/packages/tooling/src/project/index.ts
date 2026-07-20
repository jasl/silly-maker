// SPDX-License-Identifier: MIT
export { runProjectCliV1 } from "./cli.js";
export type { ProjectCliInputV1 } from "./cli.js";
export {
  checkStoryApplicationV1,
  inspectStoryApplicationV1,
  simulateStoryApplicationV1,
} from "./commands.js";
export type {
  ProjectModuleLoaderV1,
  StoryCheckReportV1,
  StoryInspectReportV1,
  StoryInspectResultV1,
  StorySimulateOptionsV1,
  StorySimulateReportV1,
  StorySimulateStepV1,
  StorySimulationTargetFactoryV1,
  StorySimulationTargetV1,
} from "./commands.js";
export {
  defineSillymakerProjectV1,
  listStoryApplicationIdsV1,
  resolveStoryApplicationV1,
  resolveWebBuildTargetV1,
} from "./config.js";
export type {
  ProjectModuleRefV1,
  SillymakerProjectConfigV1,
  StoryApplicationConfigV1,
  StoryWebIdentityRefV1,
  StoryWebTargetV1,
} from "./config.js";
// The Node dynamic-import loader intentionally lives outside this barrel
// (`@sillymaker/tooling/project/loader`): build-identity closures walk this
// module from Vite configs and must stay statically analyzable.

// SPDX-License-Identifier: MIT
import { AuthoringDiagnosticErrorV1, createDiagnosticV1 } from "@sillymaker/base";

import type {
  ProjectModuleRefV1,
  SillymakerProjectConfigV1,
  StoryApplicationConfigV1,
  StoryWebTargetV1,
} from "./config-types.js";

export type {
  ProjectModuleRefV1,
  SillymakerProjectConfigV1,
  StoryApplicationConfigV1,
  StoryWebIdentityRefV1,
  StoryWebTargetV1,
} from "./config-types.js";

const identifierPatternV1 = /^[a-z0-9][a-z0-9-]*$/u;
const exportNamePatternV1 = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;

function configErrorV1(code: string, message: string, pointer: string): never {
  throw new AuthoringDiagnosticErrorV1([
    createDiagnosticV1({
      code,
      phase: "build",
      message,
      location: { jsonPointer: pointer },
      details: {},
    }),
  ]);
}

function requireRepositoryPathV1(value: string, pointer: string): string {
  const segments = value.split("/");
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("\0") ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    configErrorV1(
      "project.config_invalid",
      `"${value}" is not a safe repository-relative path`,
      pointer,
    );
  }
  return value;
}

function requireIdentifierV1(value: string, label: string, pointer: string): string {
  if (!identifierPatternV1.test(value)) {
    configErrorV1(
      "project.config_invalid",
      `${label} "${value}" must match ${identifierPatternV1.source}`,
      pointer,
    );
  }
  return value;
}

function requireExportNameV1(value: string, pointer: string): string {
  if (!exportNamePatternV1.test(value)) {
    configErrorV1("project.config_invalid", `"${value}" is not a valid export name`, pointer);
  }
  return value;
}

function freezeModuleRefV1(ref: ProjectModuleRefV1, pointer: string): ProjectModuleRefV1 {
  return Object.freeze({
    module: requireRepositoryPathV1(ref.module, `${pointer}/module`),
    exportName: requireExportNameV1(ref.exportName, `${pointer}/exportName`),
  });
}

function freezeWebTargetV1(web: StoryWebTargetV1, pointer: string): StoryWebTargetV1 {
  return Object.freeze({
    storyRoot: requireRepositoryPathV1(web.storyRoot, `${pointer}/storyRoot`),
    applicationHtml: requireRepositoryPathV1(web.applicationHtml, `${pointer}/applicationHtml`),
    applicationEntry: requireRepositoryPathV1(web.applicationEntry, `${pointer}/applicationEntry`),
    outDir: requireRepositoryPathV1(web.outDir, `${pointer}/outDir`),
    base: web.base,
    sourcemap: web.sourcemap,
    identity: Object.freeze({
      module: requireRepositoryPathV1(web.identity.module, `${pointer}/identity/module`),
      collectExport: requireExportNameV1(
        web.identity.collectExport,
        `${pointer}/identity/collectExport`,
      ),
      createPluginExport: requireExportNameV1(
        web.identity.createPluginExport,
        `${pointer}/identity/createPluginExport`,
      ),
    }),
  });
}

/**
 * Validates and freezes a project config. Adding a Story application means
 * adding one declaration here; Vite resolution, asset verification, and the
 * project commands all consume the same mechanism.
 */
export function defineSillymakerProjectV1(
  config: SillymakerProjectConfigV1,
): SillymakerProjectConfigV1 {
  requireIdentifierV1(config.projectId, "project ID", "/projectId");
  const seen = new Set<string>();
  const applications = config.applications.map((application, index) => {
    const pointer = `/applications/${String(index)}`;
    requireIdentifierV1(application.applicationId, "application ID", `${pointer}/applicationId`);
    if (seen.has(application.applicationId)) {
      configErrorV1(
        "project.application_duplicate",
        `application ID "${application.applicationId}" is declared more than once`,
        `${pointer}/applicationId`,
      );
    }
    seen.add(application.applicationId);
    if (application.label.length === 0) {
      configErrorV1("project.config_invalid", "application label must not be empty", pointer);
    }
    return Object.freeze({
      applicationId: application.applicationId,
      label: application.label,
      storyEntry: freezeModuleRefV1(application.storyEntry, `${pointer}/storyEntry`),
      assetVerification: application.assetVerification,
      simulate:
        application.simulate === null
          ? null
          : freezeModuleRefV1(application.simulate, `${pointer}/simulate`),
      web: application.web === null ? null : freezeWebTargetV1(application.web, `${pointer}/web`),
      releaseArtifact: application.releaseArtifact,
    });
  });
  return Object.freeze({
    projectId: config.projectId,
    applications: Object.freeze(applications),
  });
}

export function listStoryApplicationIdsV1(project: SillymakerProjectConfigV1): readonly string[] {
  return Object.freeze(project.applications.map((application) => application.applicationId));
}

export function resolveStoryApplicationV1(
  project: SillymakerProjectConfigV1,
  applicationId: string,
): StoryApplicationConfigV1 {
  const application = project.applications.find(
    (candidate) => candidate.applicationId === applicationId,
  );
  if (application === undefined) {
    configErrorV1(
      "project.application_unknown",
      `unknown application "${applicationId}"; known applications: ${listStoryApplicationIdsV1(
        project,
      ).join(", ")}`,
      "/applications",
    );
  }
  return application;
}

/** Resolves the dev/build web target; headless-only applications fail structurally. */
export function resolveWebBuildTargetV1(
  project: SillymakerProjectConfigV1,
  applicationId: string,
): StoryWebTargetV1 {
  const application = resolveStoryApplicationV1(project, applicationId);
  if (application.web === null) {
    configErrorV1(
      "project.web_target_missing",
      `application "${applicationId}" has no web target; web applications: ${project.applications
        .filter((candidate) => candidate.web !== null)
        .map((candidate) => candidate.applicationId)
        .join(", ")}`,
      "/applications",
    );
  }
  return application.web;
}

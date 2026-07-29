// SPDX-License-Identifier: MIT
import { AuthoringDiagnosticErrorV1, createDiagnosticV1 } from "@sillymaker/base";

import type {
  ProjectModuleRefV1,
  SillymakerAppConfigV1,
  SillymakerProjectConfigV1,
  StoryApplicationConfigV1,
  StoryWebTargetV1,
} from "./config-types.ts";

export type {
  ProjectModuleRefV1,
  SillymakerAppConfigV1,
  SillymakerAppWebTargetV1,
  SillymakerProjectConfigV1,
  SillymakerWorkspaceConfigV1,
  StoryApplicationConfigV1,
  StoryWebIdentityRefV1,
  StoryWebTargetV1,
} from "./config-types.ts";

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

function requireNonEmptyStringV1(value: string, pointer: string): string {
  if (typeof value !== "string" || value.trim() === "" || value.includes("\0")) {
    configErrorV1("project.config_invalid", "value must be a non-empty string", pointer);
  }
  return value;
}

function freezeModuleRefV1(ref: ProjectModuleRefV1, pointer: string): ProjectModuleRefV1 {
  return Object.freeze({
    module: requireRepositoryPathV1(ref.module, `${pointer}/module`),
    exportName: requireExportNameV1(ref.exportName, `${pointer}/exportName`),
  });
}

/** Application roots may be `.` when a project is its own repository root. */
function requireStoryRootV1(value: string, pointer: string): string {
  if (value === ".") return value;
  return requireRepositoryPathV1(value, pointer);
}

function freezeWebTargetV1(web: StoryWebTargetV1, pointer: string): StoryWebTargetV1 {
  return Object.freeze({
    storyRoot: requireStoryRootV1(web.storyRoot, `${pointer}/storyRoot`),
    applicationHtml: requireRepositoryPathV1(web.applicationHtml, `${pointer}/applicationHtml`),
    applicationEntry: requireRepositoryPathV1(web.applicationEntry, `${pointer}/applicationEntry`),
    outDir: requireRepositoryPathV1(web.outDir, `${pointer}/outDir`),
    base: web.base,
    sourcemap: web.sourcemap,
    identity:
      web.identity === null
        ? null
        : Object.freeze({
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
    desktop:
      web.desktop === undefined || web.desktop === null
        ? null
        : Object.freeze({
            name: requireNonEmptyStringV1(web.desktop.name, `${pointer}/desktop/name`),
            identifier: requireNonEmptyStringV1(
              web.desktop.identifier,
              `${pointer}/desktop/identifier`,
            ),
            ...(web.desktop.icon === undefined
              ? {}
              : {
                  icon: requireNonEmptyStringV1(web.desktop.icon, `${pointer}/desktop/icon`),
                }),
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

/** Joins an application-relative path under its directory (`.` = in place). */
export function joinAppPathV1(appDirectory: string, appRelativePath: string): string {
  return appDirectory === "." ? appRelativePath : `${appDirectory}/${appRelativePath}`;
}

/**
 * Validates one application project declaration (`sillymaker.config.ts`) and
 * freezes it. Paths stay app-root-relative here; `deriveStoryApplicationV1`
 * anchors them under a directory for workspace-level commands.
 */
export function defineSillymakerAppV1(config: SillymakerAppConfigV1): SillymakerAppConfigV1 {
  const pointer = "/app";
  requireIdentifierV1(config.applicationId, "application ID", `${pointer}/applicationId`);
  if (config.label.length === 0) {
    configErrorV1("project.config_invalid", "application label must not be empty", pointer);
  }
  const web = config.web ?? null;
  return Object.freeze({
    applicationId: config.applicationId,
    label: config.label,
    storyEntry: freezeModuleRefV1(config.storyEntry, `${pointer}/storyEntry`),
    assetVerification: config.assetVerification,
    simulate:
      config.simulate === undefined || config.simulate === null
        ? null
        : freezeModuleRefV1(config.simulate, `${pointer}/simulate`),
    web:
      web === null
        ? null
        : Object.freeze({
            applicationHtml: requireRepositoryPathV1(
              web.applicationHtml,
              `${pointer}/web/applicationHtml`,
            ),
            applicationEntry: requireRepositoryPathV1(
              web.applicationEntry,
              `${pointer}/web/applicationEntry`,
            ),
            outDir: requireRepositoryPathV1(web.outDir ?? "dist-web", `${pointer}/web/outDir`),
            base: web.base,
            sourcemap: web.sourcemap,
            identity:
              web.identity === undefined || web.identity === null
                ? null
                : Object.freeze({
                    module: requireRepositoryPathV1(
                      web.identity.module,
                      `${pointer}/web/identity/module`,
                    ),
                    collectExport: requireExportNameV1(
                      web.identity.collectExport,
                      `${pointer}/web/identity/collectExport`,
                    ),
                    createPluginExport: requireExportNameV1(
                      web.identity.createPluginExport,
                      `${pointer}/web/identity/createPluginExport`,
                    ),
                  }),
            desktop:
              web.desktop === undefined || web.desktop === null
                ? null
                : Object.freeze({
                    name: requireNonEmptyStringV1(web.desktop.name, `${pointer}/web/desktop/name`),
                    identifier: requireNonEmptyStringV1(
                      web.desktop.identifier,
                      `${pointer}/web/desktop/identifier`,
                    ),
                    ...(web.desktop.icon === undefined
                      ? {}
                      : {
                          icon: requireNonEmptyStringV1(
                            web.desktop.icon,
                            `${pointer}/web/desktop/icon`,
                          ),
                        }),
                  }),
          }),
    releaseArtifact: config.releaseArtifact,
  });
}

/**
 * Anchors one validated application project under a directory, producing the
 * repository-relative application record the workspace commands consume.
 * `appDirectory` is `.` when the application root is the working root itself
 * (the standalone/app-local CLI).
 */
export function deriveStoryApplicationV1(
  appDirectory: string,
  config: SillymakerAppConfigV1,
): StoryApplicationConfigV1 {
  const app = defineSillymakerAppV1(config);
  const web = app.web ?? null;
  const webIdentity = web?.identity ?? null;
  return Object.freeze({
    applicationId: app.applicationId,
    label: app.label,
    storyEntry: Object.freeze({
      module: joinAppPathV1(appDirectory, app.storyEntry.module),
      exportName: app.storyEntry.exportName,
    }),
    assetVerification: app.assetVerification,
    simulate:
      app.simulate === null || app.simulate === undefined
        ? null
        : Object.freeze({
            module: joinAppPathV1(appDirectory, app.simulate.module),
            exportName: app.simulate.exportName,
          }),
    web:
      web === null
        ? null
        : Object.freeze({
            storyRoot: appDirectory,
            applicationHtml: joinAppPathV1(appDirectory, web.applicationHtml),
            applicationEntry: joinAppPathV1(appDirectory, web.applicationEntry),
            outDir: joinAppPathV1(appDirectory, web.outDir ?? "dist-web"),
            base: web.base,
            sourcemap: web.sourcemap,
            identity:
              webIdentity === null
                ? null
                : Object.freeze({
                    module: joinAppPathV1(appDirectory, webIdentity.module),
                    collectExport: webIdentity.collectExport,
                    createPluginExport: webIdentity.createPluginExport,
                  }),
            desktop:
              web.desktop === null || web.desktop === undefined
                ? null
                : Object.freeze({
                    ...web.desktop,
                    ...(web.desktop.icon === undefined
                      ? {}
                      : { icon: joinAppPathV1(appDirectory, web.desktop.icon) }),
                  }),
          }),
    releaseArtifact: app.releaseArtifact,
  });
}

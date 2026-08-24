// SPDX-License-Identifier: MIT
import { AuthoringDiagnosticErrorV1, createDiagnosticV1 } from "@sillymaker/base";

import type {
  ProjectModuleRefV1,
  SillymakerAppConfigV1,
  SillymakerProjectConfigV1,
  SillymakerWorkspaceConfigV1,
  StoryApplicationConfigV1,
  StorySceneSourceV1,
  StoryWebTargetV1,
} from "./config-types.ts";

export type {
  ProjectModuleRefV1,
  SillymakerAppConfigV1,
  SillymakerAppWebTargetV1,
  SillymakerProjectConfigV1,
  SillymakerWorkspaceConfigV1,
  StoryApplicationConfigV1,
  StorySceneSourceV1,
  StoryWebIdentityRefV1,
  StoryWebTargetV1,
} from "./config-types.ts";

const identifierPatternV1 = /^[a-z0-9][a-z0-9-]*$/u;
const exportNamePatternV1 = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;
const desktopIdentifierPatternV1 =
  /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u;
const windowsReservedNamePatternV1 = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\..*)?$/iu;
const windowsInvalidFilenameCharacterPatternV1 = /[<>:"|?*]/u;
const sceneIdPatternV1 = /^scene\.[a-z0-9_.-]+$/u;
const sceneImportSegmentPatternV1 = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const sceneIdMaxLengthV1 = 96;
const sceneImportSpecifierMaxLengthV1 = 160;

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

function containsAsciiControlCharacterV1(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return true;
    }
  }
  return false;
}

function portablePathComparisonKeyV1(value: string): string {
  return value.normalize("NFC").toUpperCase().toLowerCase().normalize("NFC");
}

/**
 * Repository paths are persisted and consumed on every supported host, so they
 * use the portable intersection of POSIX and Windows filename rules. In
 * particular, `:` is rejected even though POSIX permits it: on Windows it can
 * introduce a drive-qualified path or an alternate data stream.
 */
function requireRepositoryPathV1(value: unknown, pointer: string): string {
  if (typeof value !== "string") {
    configErrorV1("project.config_invalid", "value must be a path string", pointer);
  }
  const segments = value.split("/");
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    containsAsciiControlCharacterV1(value) ||
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        segment !== segment.trim() ||
        segment.endsWith(".") ||
        windowsInvalidFilenameCharacterPatternV1.test(segment) ||
        windowsReservedNamePatternV1.test(segment),
    )
  ) {
    configErrorV1(
      "project.config_invalid",
      `"${value}" is not a safe repository-relative path`,
      pointer,
    );
  }
  return value;
}

function requireDesktopIconPathV1(value: unknown, pointer: string): string {
  const path = requireRepositoryPathV1(value, pointer);
  const lower = path.toLowerCase();
  if (!lower.endsWith(".png") && !lower.endsWith(".icns")) {
    configErrorV1(
      "project.config_invalid",
      "desktop icon must use the .png or .icns extension",
      pointer,
    );
  }
  return path;
}

function requireIdentifierV1(value: unknown, label: string, pointer: string): string {
  if (typeof value !== "string") {
    configErrorV1("project.config_invalid", `${label} must be a string`, pointer);
  }
  if (!identifierPatternV1.test(value)) {
    configErrorV1(
      "project.config_invalid",
      `${label} "${value}" must match ${identifierPatternV1.source}`,
      pointer,
    );
  }
  return value;
}

function requireExportNameV1(value: unknown, pointer: string): string {
  if (typeof value !== "string") {
    configErrorV1("project.config_invalid", "export name must be a string", pointer);
  }
  if (!exportNamePatternV1.test(value)) {
    configErrorV1("project.config_invalid", `"${value}" is not a valid export name`, pointer);
  }
  return value;
}

function requireNonEmptyStringV1(value: unknown, pointer: string): string {
  if (typeof value !== "string" || value.trim() === "" || value.includes("\0")) {
    configErrorV1("project.config_invalid", "value must be a non-empty string", pointer);
  }
  return value;
}

function requireDesktopNameV1(value: unknown, pointer: string): string {
  const name = requireNonEmptyStringV1(value, pointer);
  if (
    name !== name.trim() ||
    new TextEncoder().encode(name).byteLength > 120 ||
    name === "." ||
    name === ".." ||
    name.includes("/") ||
    name.includes("\\") ||
    windowsInvalidFilenameCharacterPatternV1.test(name) ||
    containsAsciiControlCharacterV1(name) ||
    name.endsWith(".") ||
    windowsReservedNamePatternV1.test(name)
  ) {
    configErrorV1(
      "project.config_invalid",
      `desktop name "${name}" is not a safe bundle filename`,
      pointer,
    );
  }
  return name;
}

function requireDesktopIdentifierV1(value: unknown, pointer: string): string {
  if (typeof value !== "string" || !desktopIdentifierPatternV1.test(value)) {
    configErrorV1(
      "project.config_invalid",
      "desktop identifier must be a lowercase reverse-DNS name",
      pointer,
    );
  }
  return value;
}

function requireBooleanV1(value: unknown, pointer: string): boolean {
  if (typeof value !== "boolean") {
    configErrorV1("project.config_invalid", "value must be a boolean", pointer);
  }
  return value;
}

function requireBaseV1(value: unknown, pointer: string): string {
  if (typeof value !== "string" || value.includes("\0")) {
    configErrorV1("project.config_invalid", "Vite base must be a string", pointer);
  }
  return value;
}

function admitModuleRefV1(ref: ProjectModuleRefV1, pointer: string): ProjectModuleRefV1 {
  if (typeof ref !== "object" || ref === null) {
    configErrorV1("project.config_invalid", "module reference must be an object", pointer);
  }
  return {
    module: requireRepositoryPathV1(ref.module, `${pointer}/module`),
    exportName: requireExportNameV1(ref.exportName, `${pointer}/exportName`),
  };
}

function requireSceneIdV1(value: unknown, pointer: string): string {
  if (
    typeof value !== "string" ||
    value.length > sceneIdMaxLengthV1 ||
    !sceneIdPatternV1.test(value)
  ) {
    configErrorV1(
      "project.config_invalid",
      `scene ID must match ${sceneIdPatternV1.source}`,
      pointer,
    );
  }
  return value;
}

function requireSceneImportSpecifierV1(value: unknown, pointer: string): string {
  if (
    typeof value !== "string" ||
    value.length > sceneImportSpecifierMaxLengthV1 ||
    !value.startsWith("#")
  ) {
    configErrorV1(
      "project.config_invalid",
      "scene specifier must be a bounded # package import",
      pointer,
    );
  }
  const segments = value.slice(1).split("/");
  if (
    segments.length === 0 ||
    segments.some((segment) => !sceneImportSegmentPatternV1.test(segment))
  ) {
    configErrorV1(
      "project.config_invalid",
      "scene specifier must be a safe # package import",
      pointer,
    );
  }
  return value;
}

function admitSceneSourcesV1(
  value: readonly StorySceneSourceV1[] | undefined,
  pointer: string,
): readonly StorySceneSourceV1[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    configErrorV1("project.config_invalid", "sceneSources must be an array", pointer);
  }

  const seenSceneIds = new Set<string>();
  const seenSpecifiers = new Set<string>();
  const sources = value.map((source, index): StorySceneSourceV1 => {
    const sourcePointer = `${pointer}/${String(index)}`;
    if (typeof source !== "object" || source === null) {
      configErrorV1(
        "project.config_invalid",
        "scene source must be an object",
        sourcePointer,
      );
    }
    const sceneId = requireSceneIdV1(source.sceneId, `${sourcePointer}/sceneId`);
    const specifier = requireSceneImportSpecifierV1(
      source.specifier,
      `${sourcePointer}/specifier`,
    );
    if (seenSceneIds.has(sceneId)) {
      configErrorV1(
        "project.scene_source_duplicate",
        `scene ID "${sceneId}" is declared more than once`,
        `${sourcePointer}/sceneId`,
      );
    }
    if (seenSpecifiers.has(specifier)) {
      configErrorV1(
        "project.scene_source_duplicate",
        `scene specifier "${specifier}" is declared more than once`,
        `${sourcePointer}/specifier`,
      );
    }
    seenSceneIds.add(sceneId);
    seenSpecifiers.add(specifier);

    if (source.sourceKind === "authoring_scene") {
      const sourcePath = requireRepositoryPathV1(
        source.source,
        `${sourcePointer}/source`,
      );
      if (!sourcePath.endsWith(".authoring-scene.json")) {
        configErrorV1(
          "project.config_invalid",
          "authoring scene source must end with .authoring-scene.json",
          `${sourcePointer}/source`,
        );
      }
      return {
        sceneId,
        specifier,
        sourceKind: source.sourceKind,
        source: sourcePath,
      };
    }
    if (source.sourceKind === "low_level_scene") {
      if ((source as { readonly source?: unknown }).source !== undefined) {
        configErrorV1(
          "project.config_invalid",
          "low-level scene bindings must not declare source",
          `${sourcePointer}/source`,
        );
      }
      return { sceneId, specifier, sourceKind: source.sourceKind };
    }
    return configErrorV1(
      "project.config_invalid",
      "scene sourceKind must be authoring_scene or low_level_scene",
      `${sourcePointer}/sourceKind`,
    );
  });
  return sources;
}

/** Application roots may be `.` when a project is its own repository root. */
function requireStoryRootV1(value: unknown, pointer: string): string {
  if (value === ".") return value;
  return requireRepositoryPathV1(value, pointer);
}

function admitWebTargetV1(web: StoryWebTargetV1, pointer: string): StoryWebTargetV1 {
  return {
    storyRoot: requireStoryRootV1(web.storyRoot, `${pointer}/storyRoot`),
    applicationHtml: requireRepositoryPathV1(web.applicationHtml, `${pointer}/applicationHtml`),
    applicationEntry: requireRepositoryPathV1(web.applicationEntry, `${pointer}/applicationEntry`),
    outDir: requireRepositoryPathV1(web.outDir, `${pointer}/outDir`),
    base: requireBaseV1(web.base, `${pointer}/base`),
    sourcemap: requireBooleanV1(web.sourcemap, `${pointer}/sourcemap`),
    identity: web.identity === null ? null : {
      module: requireRepositoryPathV1(web.identity.module, `${pointer}/identity/module`),
      collectExport: requireExportNameV1(
        web.identity.collectExport,
        `${pointer}/identity/collectExport`,
      ),
      createPluginExport: requireExportNameV1(
        web.identity.createPluginExport,
        `${pointer}/identity/createPluginExport`,
      ),
    },
    desktop: web.desktop === undefined || web.desktop === null ? null : {
      name: requireDesktopNameV1(web.desktop.name, `${pointer}/desktop/name`),
      identifier: requireDesktopIdentifierV1(
        web.desktop.identifier,
        `${pointer}/desktop/identifier`,
      ),
      ...(web.desktop.icon === undefined ? {} : {
        icon: requireDesktopIconPathV1(web.desktop.icon, `${pointer}/desktop/icon`),
      }),
    },
  };
}

/**
 * Validates and normalizes a project config. Adding a Story application means
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
    return {
      applicationId: application.applicationId,
      label: requireNonEmptyStringV1(application.label, `${pointer}/label`),
      storyEntry: admitModuleRefV1(application.storyEntry, `${pointer}/storyEntry`),
      assetVerification: requireBooleanV1(
        application.assetVerification,
        `${pointer}/assetVerification`,
      ),
      simulate: application.simulate === null
        ? null
        : admitModuleRefV1(application.simulate, `${pointer}/simulate`),
      web: application.web === null ? null : admitWebTargetV1(application.web, `${pointer}/web`),
      studio: application.studio === null
        ? null
        : admitModuleRefV1(application.studio, `${pointer}/studio`),
      sceneSources: admitSceneSourcesV1(application.sceneSources, `${pointer}/sceneSources`),
    };
  });
  return {
    projectId: config.projectId,
    applications,
  };
}

export function listStoryApplicationIdsV1(project: SillymakerProjectConfigV1): readonly string[] {
  return project.applications.map((application) => application.applicationId);
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
      `unknown application "${applicationId}"; known applications: ${
        listStoryApplicationIdsV1(
          project,
        ).join(", ")
      }`,
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
      `application "${applicationId}" has no web target; web applications: ${
        project.applications
          .filter((candidate) => candidate.web !== null)
          .map((candidate) => candidate.applicationId)
          .join(", ")
      }`,
      "/applications",
    );
  }
  return application.web;
}

/** Joins an application-relative path under its directory (`.` = in place). */
export function joinAppPathV1(appDirectory: string, appRelativePath: string): string {
  const directory = requireStoryRootV1(appDirectory, "/appDirectory");
  const relativePath = requireRepositoryPathV1(appRelativePath, "/appRelativePath");
  return directory === "." ? relativePath : `${directory}/${relativePath}`;
}

/**
 * Validates one application project declaration (`sillymaker.config.ts`) and
 * normalizes it. Paths stay app-root-relative here; `deriveStoryApplicationV1`
 * anchors them under a directory for workspace-level commands.
 */
export function defineSillymakerAppV1(config: SillymakerAppConfigV1): SillymakerAppConfigV1 {
  const pointer = "/app";
  requireIdentifierV1(config.applicationId, "application ID", `${pointer}/applicationId`);
  const web = config.web ?? null;
  return {
    applicationId: config.applicationId,
    label: requireNonEmptyStringV1(config.label, `${pointer}/label`),
    storyEntry: admitModuleRefV1(config.storyEntry, `${pointer}/storyEntry`),
    assetVerification: requireBooleanV1(config.assetVerification, `${pointer}/assetVerification`),
    simulate: config.simulate === undefined || config.simulate === null
      ? null
      : admitModuleRefV1(config.simulate, `${pointer}/simulate`),
    studio: config.studio === undefined || config.studio === null
      ? null
      : admitModuleRefV1(config.studio, `${pointer}/studio`),
    sceneSources: admitSceneSourcesV1(config.sceneSources, `${pointer}/sceneSources`),
    web: web === null ? null : {
      applicationHtml: requireRepositoryPathV1(
        web.applicationHtml,
        `${pointer}/web/applicationHtml`,
      ),
      applicationEntry: requireRepositoryPathV1(
        web.applicationEntry,
        `${pointer}/web/applicationEntry`,
      ),
      outDir: requireRepositoryPathV1(web.outDir ?? "dist-web", `${pointer}/web/outDir`),
      base: requireBaseV1(web.base, `${pointer}/web/base`),
      sourcemap: requireBooleanV1(web.sourcemap, `${pointer}/web/sourcemap`),
      identity: web.identity === undefined || web.identity === null ? null : {
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
      },
      desktop: web.desktop === undefined || web.desktop === null ? null : {
        name: requireDesktopNameV1(web.desktop.name, `${pointer}/web/desktop/name`),
        identifier: requireDesktopIdentifierV1(
          web.desktop.identifier,
          `${pointer}/web/desktop/identifier`,
        ),
        ...(web.desktop.icon === undefined ? {} : {
          icon: requireDesktopIconPathV1(
            web.desktop.icon,
            `${pointer}/web/desktop/icon`,
          ),
        }),
      },
    },
  };
}

/**
 * Validates and normalizes the repository-level workspace registry before any
 * directory is resolved or imported. Application IDs are validated after the
 * individual declarations are loaded by `loadWorkspaceAppsV1`.
 */
export function defineSillymakerWorkspaceV1(
  config: SillymakerWorkspaceConfigV1,
): SillymakerWorkspaceConfigV1 {
  const projectId = requireIdentifierV1(config.projectId, "project ID", "/projectId");
  if (!Array.isArray(config.appDirectories) || config.appDirectories.length === 0) {
    configErrorV1(
      "project.config_invalid",
      "workspace must declare at least one application directory",
      "/appDirectories",
    );
  }
  const seen = new Set<string>();
  const appDirectories = config.appDirectories.map((directory, index) => {
    const pointer = `/appDirectories/${String(index)}`;
    const validated = requireStoryRootV1(directory, pointer);
    const comparisonKey = portablePathComparisonKeyV1(validated);
    if (seen.has(comparisonKey)) {
      configErrorV1(
        "project.application_directory_duplicate",
        `application directory "${validated}" is declared more than once`,
        pointer,
      );
    }
    seen.add(comparisonKey);
    return validated;
  });
  return {
    projectId,
    appDirectories,
  };
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
  const directory = requireStoryRootV1(appDirectory, "/appDirectory");
  const app = defineSillymakerAppV1(config);
  const web = app.web ?? null;
  const webIdentity = web?.identity ?? null;
  const sceneSources = app.sceneSources ?? [];
  return {
    applicationId: app.applicationId,
    label: app.label,
    storyEntry: {
      module: joinAppPathV1(directory, app.storyEntry.module),
      exportName: app.storyEntry.exportName,
    },
    assetVerification: app.assetVerification,
    simulate: app.simulate === null || app.simulate === undefined ? null : {
      module: joinAppPathV1(directory, app.simulate.module),
      exportName: app.simulate.exportName,
    },
    studio: app.studio === null || app.studio === undefined ? null : {
      module: joinAppPathV1(directory, app.studio.module),
      exportName: app.studio.exportName,
    },
    sceneSources: sceneSources.map((source) =>
      source.sourceKind === "authoring_scene"
        ? {
          ...source,
          source: joinAppPathV1(directory, source.source),
        }
        : source
    ),
    web: web === null ? null : {
      storyRoot: directory,
      applicationHtml: joinAppPathV1(directory, web.applicationHtml),
      applicationEntry: joinAppPathV1(directory, web.applicationEntry),
      outDir: joinAppPathV1(directory, web.outDir ?? "dist-web"),
      base: web.base,
      sourcemap: web.sourcemap,
      identity: webIdentity === null ? null : {
        module: joinAppPathV1(directory, webIdentity.module),
        collectExport: webIdentity.collectExport,
        createPluginExport: webIdentity.createPluginExport,
      },
      desktop: web.desktop === null || web.desktop === undefined ? null : {
        ...web.desktop,
        ...(web.desktop.icon === undefined
          ? {}
          : { icon: joinAppPathV1(directory, web.desktop.icon) }),
      },
    },
  };
}

// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { AuthoringDiagnosticErrorV1 } from "@sillymaker/base";

import type { StoryApplicationConfigV1 } from "./config.ts";
import {
  defineSillymakerAppV1,
  defineSillymakerProjectV1,
  defineSillymakerWorkspaceV1,
  deriveStoryApplicationV1,
  listStoryApplicationIdsV1,
  resolveStoryApplicationV1,
  resolveWebBuildTargetV1,
} from "./config.ts";

function webApplicationV1(applicationId: string): StoryApplicationConfigV1 {
  return {
    applicationId,
    label: `${applicationId} application`,
    storyEntry: { module: `examples/${applicationId}/src/story.ts`, exportName: "entryV1" },
    assetVerification: true,
    simulate: null,
    web: {
      storyRoot: `examples/${applicationId}`,
      applicationHtml: `examples/${applicationId}/index.html`,
      applicationEntry: `examples/${applicationId}/src/application/entry.tsx`,
      outDir: `dist/${applicationId}`,
      base: "./",
      sourcemap: false,
      identity: {
        module: "scripts/build-poc-identity.mjs",
        collectExport: "collectPocBuildIdentityV1",
        createPluginExport: "createPocBuildIdentityVirtualPluginV1",
      },
    },
  };
}

function headlessApplicationV1(applicationId: string): StoryApplicationConfigV1 {
  return {
    applicationId,
    label: `${applicationId} headless`,
    storyEntry: { module: `examples/${applicationId}/src/story.ts`, exportName: "entryV1" },
    assetVerification: false,
    simulate: { module: `examples/${applicationId}/src/target.ts`, exportName: "createV1" },
    web: null,
  };
}

function diagnosticsOf(run: () => unknown): readonly { code: string }[] {
  try {
    run();
  } catch (error) {
    if (error instanceof AuthoringDiagnosticErrorV1) return error.diagnostics;
    throw error;
  }
  throw new Error("expected a structured diagnostic error");
}

describe("defineSillymakerProjectV1", () => {
  it("freezes a valid project and resolves applications by ID", () => {
    const project = defineSillymakerProjectV1({
      projectId: "project-test",
      applications: [webApplicationV1("alpha-web"), headlessApplicationV1("beta")],
    });

    expect(Object.isFrozen(project)).toBe(true);
    expect(Object.isFrozen(project.applications[0])).toBe(true);
    expect(listStoryApplicationIdsV1(project)).toEqual(["alpha-web", "beta"]);
    expect(resolveStoryApplicationV1(project, "beta").simulate).toEqual({
      module: "examples/beta/src/target.ts",
      exportName: "createV1",
    });
    expect(resolveWebBuildTargetV1(project, "alpha-web").outDir).toBe("dist/alpha-web");
  });

  it("accepts a new temporary application declaration without any other change", () => {
    const base = [webApplicationV1("alpha-web"), headlessApplicationV1("beta")];
    const project = defineSillymakerProjectV1({
      projectId: "project-test",
      applications: [...base, webApplicationV1("temporary-web")],
    });

    expect(resolveWebBuildTargetV1(project, "temporary-web").storyRoot).toBe(
      "examples/temporary-web",
    );
    expect(resolveStoryApplicationV1(project, "temporary-web").storyEntry.exportName).toBe(
      "entryV1",
    );
  });

  it("rejects duplicate application IDs with a structured diagnostic", () => {
    expect(
      diagnosticsOf(() =>
        defineSillymakerProjectV1({
          projectId: "project-test",
          applications: [headlessApplicationV1("beta"), headlessApplicationV1("beta")],
        }),
      ),
    ).toMatchObject([{ code: "project.application_duplicate" }]);
  });

  it("rejects unsafe repository paths", () => {
    const application = {
      ...headlessApplicationV1("beta"),
      storyEntry: { module: "../outside/story.ts", exportName: "entryV1" },
    };
    expect(
      diagnosticsOf(() =>
        defineSillymakerProjectV1({ projectId: "project-test", applications: [application] }),
      ),
    ).toMatchObject([{ code: "project.config_invalid" }]);
  });

  it("answers unknown applications and missing web targets structurally", () => {
    const project = defineSillymakerProjectV1({
      projectId: "project-test",
      applications: [headlessApplicationV1("beta")],
    });

    const unknown = diagnosticsOf(() => resolveStoryApplicationV1(project, "missing"));
    expect(unknown).toMatchObject([{ code: "project.application_unknown" }]);
    expect(unknown[0]).toMatchObject({ message: expect.stringContaining("beta") });

    expect(diagnosticsOf(() => resolveWebBuildTargetV1(project, "beta"))).toMatchObject([
      { code: "project.web_target_missing" },
    ]);
  });
});

describe("application and workspace config validation", () => {
  it("rejects runtime-invalid app fields with structured diagnostics", () => {
    const invalid = {
      applicationId: "example-app",
      label: "   ",
      storyEntry: { module: "src/story.ts", exportName: "entryV1" },
      assetVerification: "yes",
      simulate: null,
      web: null,
    } as unknown as Parameters<typeof defineSillymakerAppV1>[0];

    expect(diagnosticsOf(() => defineSillymakerAppV1(invalid))).toMatchObject([
      { code: "project.config_invalid" },
    ]);

    const desktopApp = {
      applicationId: "unsafe-desktop",
      label: "Unsafe desktop",
      storyEntry: { module: "src/story.ts", exportName: "entryV1" },
      assetVerification: false,
      simulate: null,
      web: {
        applicationHtml: "index.html",
        applicationEntry: "src/application/entry.tsx",
        base: "./",
        sourcemap: false,
        identity: null,
        desktop: { name: "Synthetic", identifier: "dev.sillymaker.synthetic" },
      },
    } as const;
    expect(
      diagnosticsOf(() =>
        defineSillymakerAppV1({
          ...desktopApp,
          web: { ...desktopApp.web, desktop: { ...desktopApp.web.desktop, name: "../Outside" } },
        }),
      ),
    ).toMatchObject([{ code: "project.config_invalid" }]);
    expect(
      diagnosticsOf(() =>
        defineSillymakerAppV1({
          ...desktopApp,
          web: {
            ...desktopApp.web,
            desktop: { ...desktopApp.web.desktop, identifier: "Dev.Sillymaker.Synthetic" },
          },
        }),
      ),
    ).toMatchObject([{ code: "project.config_invalid" }]);
    expect(
      diagnosticsOf(() =>
        defineSillymakerAppV1({
          ...desktopApp,
          web: { ...desktopApp.web, desktop: { ...desktopApp.web.desktop, name: "CON" } },
        }),
      ),
    ).toMatchObject([{ code: "project.config_invalid" }]);
    expect(
      diagnosticsOf(() =>
        defineSillymakerAppV1({
          ...desktopApp,
          web: {
            ...desktopApp.web,
            desktop: { ...desktopApp.web.desktop, icon: "assets/icon.webp" },
          },
        }),
      ),
    ).toMatchObject([{ code: "project.config_invalid" }]);
  });

  it("validates and freezes workspace directories before resolution", () => {
    const workspace = defineSillymakerWorkspaceV1({
      projectId: "project-test",
      appDirectories: ["examples/alpha", "examples/beta"],
    });
    expect(workspace).toEqual({
      projectId: "project-test",
      appDirectories: ["examples/alpha", "examples/beta"],
    });
    expect(Object.isFrozen(workspace)).toBe(true);
    expect(Object.isFrozen(workspace.appDirectories)).toBe(true);

    expect(
      diagnosticsOf(() =>
        defineSillymakerWorkspaceV1({
          projectId: "project-test",
          appDirectories: ["examples/alpha", "../outside"],
        }),
      ),
    ).toMatchObject([{ code: "project.config_invalid" }]);

    expect(
      diagnosticsOf(() =>
        defineSillymakerWorkspaceV1({
          projectId: "project-test",
          appDirectories: ["examples/alpha", "examples/alpha"],
        }),
      ),
    ).toMatchObject([{ code: "project.application_directory_duplicate" }]);

    expect(
      diagnosticsOf(() =>
        defineSillymakerWorkspaceV1({
          projectId: "project-test",
          appDirectories: ["examples/App", "examples/app"],
        }),
      ),
    ).toMatchObject([{ code: "project.application_directory_duplicate" }]);

    expect(
      diagnosticsOf(() =>
        defineSillymakerWorkspaceV1({
          projectId: "project-test",
          appDirectories: ["examples/caf\u00e9", "examples/cafe\u0301"],
        }),
      ),
    ).toMatchObject([{ code: "project.application_directory_duplicate" }]);

    const authorSpelling = "examples/\u00c9clair";
    expect(
      defineSillymakerWorkspaceV1({
        projectId: "project-test",
        appDirectories: [authorSpelling],
      }).appDirectories,
    ).toEqual([authorSpelling]);
  });

  it.each([
    ["sigma and final sigma", "examples/\u03a3", "examples/\u03c2"],
    ["sharp s and ss", "examples/\u00df", "examples/ss"],
    ["long s and s", "examples/\u017f", "examples/S"],
  ])("rejects portable directory aliases: %s", (_label, first, alias) => {
    expect(
      diagnosticsOf(() =>
        defineSillymakerWorkspaceV1({
          projectId: "project-test",
          appDirectories: [first, alias],
        }),
      ),
    ).toMatchObject([{ code: "project.application_directory_duplicate" }]);
  });

  it("rejects non-portable workspace application directories on every host", () => {
    const invalidDirectories = [
      "",
      "/examples/alpha",
      "C:/examples/alpha",
      "C:examples/alpha",
      String.raw`\\server\share\alpha`,
      String.raw`examples\alpha`,
      "examples//alpha",
      "examples/./alpha",
      "examples/../alpha",
      "examples/alpha/",
      "examples/chapter:alpha",
      "examples/alpha?draft",
      "examples/CON",
      "examples/COM\u00b9",
      "examples/LPT\u00b3.log",
      "examples/trailing.",
      "examples/trailing ",
      `examples/control-${String.fromCharCode(31)}`,
    ];

    for (const directory of invalidDirectories) {
      expect(
        diagnosticsOf(() =>
          defineSillymakerWorkspaceV1({
            projectId: "project-test",
            appDirectories: [directory],
          }),
        ),
        directory,
      ).toMatchObject([{ code: "project.config_invalid" }]);
    }
  });

  it("applies the portable path policy to web targets and module references", () => {
    const app = {
      applicationId: "example-app",
      label: "Example app",
      storyEntry: { module: "src/story.ts", exportName: "entryV1" },
      assetVerification: true,
      simulate: null,
      web: {
        applicationHtml: "index.html",
        applicationEntry: "src/application/entry.tsx",
        outDir: "dist-web",
        base: "./",
        sourcemap: false,
        identity: null,
      },
    } as const;

    expect(
      diagnosticsOf(() =>
        defineSillymakerAppV1({
          ...app,
          web: { ...app.web, outDir: "C:/outside" },
        }),
      ),
    ).toMatchObject([{ code: "project.config_invalid" }]);
    expect(
      diagnosticsOf(() =>
        defineSillymakerAppV1({
          ...app,
          web: { ...app.web, outDir: "dist:alternate" },
        }),
      ),
    ).toMatchObject([{ code: "project.config_invalid" }]);
    expect(
      diagnosticsOf(() =>
        defineSillymakerAppV1({
          ...app,
          web: { ...app.web, applicationEntry: String.raw`src\application\entry.tsx` },
        }),
      ),
    ).toMatchObject([{ code: "project.config_invalid" }]);
    expect(
      diagnosticsOf(() =>
        defineSillymakerAppV1({
          ...app,
          storyEntry: { ...app.storyEntry, module: "/outside/story.ts" },
        }),
      ),
    ).toMatchObject([{ code: "project.config_invalid" }]);
  });

  it("rejects superscript Windows device names for desktop bundles", () => {
    const desktopApp = {
      applicationId: "unsafe-desktop",
      label: "Unsafe desktop",
      storyEntry: { module: "src/story.ts", exportName: "entryV1" },
      assetVerification: false,
      simulate: null,
      web: {
        applicationHtml: "index.html",
        applicationEntry: "src/application/entry.tsx",
        base: "./",
        sourcemap: false,
        identity: null,
        desktop: { name: "Synthetic", identifier: "dev.sillymaker.synthetic" },
      },
    } as const;

    for (const name of ["COM\u00b9", "LPT\u00b2.log"]) {
      expect(
        diagnosticsOf(() =>
          defineSillymakerAppV1({
            ...desktopApp,
            web: { ...desktopApp.web, desktop: { ...desktopApp.web.desktop, name } },
          }),
        ),
        name,
      ).toMatchObject([{ code: "project.config_invalid" }]);
    }
  });

  it("rejects unsafe application roots before joining app-relative paths", () => {
    const config = {
      applicationId: "example-app",
      label: "Example app",
      storyEntry: { module: "src/story.ts", exportName: "entryV1" },
      assetVerification: true,
      simulate: null,
      web: null,
    } as const;
    expect(diagnosticsOf(() => deriveStoryApplicationV1("../outside", config))).toMatchObject([
      { code: "project.config_invalid" },
    ]);
  });
});

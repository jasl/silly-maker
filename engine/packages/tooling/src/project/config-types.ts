// SPDX-License-Identifier: MIT

/**
 * Pure project-config types with no imports. Repository config files and
 * Vite configs type against this module so their build-identity import
 * closures stay minimal; validation and resolution live in `config.ts`.
 */

/**
 * A module reference inside the repository: a source path plus the export
 * name to pick. Paths are repository-relative so the config stays plain data
 * that every consumer (Vite, Node scripts, tests) can resolve itself.
 */
export interface ProjectModuleRefV1 {
  readonly module: string;
  readonly exportName: string;
}

/** Build identity collector wiring for one web application. */
export interface StoryWebIdentityRefV1 {
  readonly module: string;
  readonly collectExport: string;
  readonly createPluginExport: string;
}

/** The dev/build target of a browser-hosted Story application. */
export interface StoryWebTargetV1 {
  readonly storyRoot: string;
  readonly applicationHtml: string;
  readonly applicationEntry: string;
  readonly outDir: string;
  readonly base: string;
  readonly sourcemap: boolean;
  readonly identity: StoryWebIdentityRefV1;
}

export interface StoryApplicationConfigV1 {
  readonly applicationId: string;
  readonly label: string;
  /** The GamePackage entry used by inspect/check and asset verification. */
  readonly storyEntry: ProjectModuleRefV1;
  /** Whether `check:assets` resolves and validates this application. */
  readonly assetVerification: boolean;
  /** Module exporting a simulation-target factory; null when not scriptable yet. */
  readonly simulate: ProjectModuleRefV1 | null;
  /** Dev/build target; null for headless-only applications. */
  readonly web: StoryWebTargetV1 | null;
  /** Whether a build of this application is a distributable product Artifact. */
  readonly releaseArtifact: boolean;
}

export interface SillymakerProjectConfigV1 {
  readonly projectId: string;
  readonly applications: readonly StoryApplicationConfigV1[];
}

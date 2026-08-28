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

/** SillyMaker's build-known Deno Desktop package targets. */
export const DESKTOP_TARGET_TRIPLES_V1 = [
  "x86_64-apple-darwin",
  "aarch64-apple-darwin",
  "x86_64-pc-windows-msvc",
  "x86_64-unknown-linux-gnu",
  "aarch64-unknown-linux-gnu",
] as const;

export type DesktopTargetTripleV1 = (typeof DESKTOP_TARGET_TRIPLES_V1)[number];

/** One application-owned executable selected at package time for its exact target. */
export interface StoryDesktopCompanionArtifactV1 {
  readonly target: DesktopTargetTripleV1;
  /** App-relative before workspace anchoring; repository-relative afterwards. */
  readonly path: string;
}

/**
 * Optional Desktop companion preview selected at package time. The private shell
 * owns at most one direct child; the renderer receives only its same-origin HTTP proxy.
 */
export interface StoryDesktopCompanionV1 {
  readonly artifacts: readonly StoryDesktopCompanionArtifactV1[];
}

/**
 * Desktop packaging preview for a web application: a thin `deno desktop`
 * host that serves the already built web Player. Engine and Story code never
 * depend on Deno Desktop APIs; each platform remains preview until it earns
 * promotion evidence.
 */
export interface StoryDesktopTargetV1 {
  /** The human-visible application name (also the bundle file name). */
  readonly name: string;
  /** The reverse-DNS bundle identifier. */
  readonly identifier: string;
  /** Optional repository-relative Darwin app icon (`.png` or `.icns`). */
  readonly icon?: string;
  /** Optional build-known, application-private direct-child companion. */
  readonly companion?: StoryDesktopCompanionV1;
}

/** The dev/build target of a browser-hosted Story application. */
export interface StoryWebTargetV1 {
  readonly storyRoot: string;
  readonly applicationHtml: string;
  readonly applicationEntry: string;
  readonly outDir: string;
  readonly base: string;
  readonly sourcemap: boolean;
  /** Optional structural build-identity collector; null for default identity. */
  readonly identity: StoryWebIdentityRefV1 | null;
  /** Optional Desktop packaging preview; null/absent for web-only applications. */
  readonly desktop?: StoryDesktopTargetV1 | null;
}

/**
 * Explicit source authority for one Story scene. `source` is app-relative in
 * `SillymakerAppConfigV1` and repository-relative after
 * `deriveStoryApplicationV1` anchors the application.
 */
export type StorySceneSourceV1 =
  | {
    readonly sceneId: string;
    readonly specifier: string;
    readonly sourceKind: "authoring_scene";
    readonly source: string;
  }
  | {
    readonly sceneId: string;
    readonly specifier: string;
    readonly sourceKind: "low_level_scene";
  };

export interface StoryApplicationConfigV1 {
  readonly applicationId: string;
  readonly label: string;
  /** The GamePackage entry used by Story commands; null for GUI-only applications. */
  readonly storyEntry: ProjectModuleRefV1 | null;
  /** Whether `check:assets` resolves and validates this application. */
  readonly assetVerification: boolean;
  /** Module exporting a simulation-target factory; null when not scriptable yet. */
  readonly simulate: ProjectModuleRefV1 | null;
  /** Dev/build target; null for headless-only applications. */
  readonly web: StoryWebTargetV1 | null;
  /** Module exporting an Inspector binding; null when the app opts out. */
  readonly inspector: ProjectModuleRefV1 | null;
  /** Explicit scene source authorities; omitted when the application has none. */
  readonly sceneSources?: readonly StorySceneSourceV1[];
}

export interface SillymakerProjectConfigV1 {
  readonly projectId: string;
  readonly applications: readonly StoryApplicationConfigV1[];
}

/**
 * The web target as an application project declares it: every path is
 * relative to the application root (the directory holding
 * `sillymaker.config.ts`), and `outDir` defaults to `dist-web` (`dist` stays the TypeScript project-references emit directory).
 */
export interface SillymakerAppWebTargetV1 {
  readonly applicationHtml: string;
  readonly applicationEntry: string;
  readonly outDir?: string;
  readonly base: string;
  readonly sourcemap: boolean;
  /** Optional build-identity collector module (app-relative); omit for default identity. */
  readonly identity?: StoryWebIdentityRefV1 | null;
  readonly desktop?: StoryDesktopTargetV1 | null;
}

/**
 * One application project's own declaration (`sillymaker.config.ts` at the
 * application root, named export `sillymakerAppConfigV1`). All module and
 * asset paths are app-root-relative, so the same project builds inside this
 * repository, as a copied starter, or as an external checkout that depends
 * on the engine packages by path.
 */
export interface SillymakerAppConfigV1 {
  readonly applicationId: string;
  readonly label: string;
  /** Omit for a GUI-only application with no authoritative Story. */
  readonly storyEntry?: ProjectModuleRefV1 | null;
  readonly assetVerification: boolean;
  readonly simulate?: ProjectModuleRefV1 | null;
  readonly web?: SillymakerAppWebTargetV1 | null;
  /**
   * Module exporting an `InspectorBindingV1` (catalog + renderers + optional
   * asset/timeline registries and build-known Scene property tools) for the
   * dev-only SillyMaker Inspector page
   * (`/__sillymaker/inspector/`). Inspector code never enters the player
   * bundle; omit to opt out.
   */
  readonly inspector?: ProjectModuleRefV1 | null;
  /**
   * Explicit scene source authorities. Tooling never infers these from files
   * or the import graph.
   */
  readonly sceneSources?: readonly StorySceneSourceV1[];
}

/**
 * The repository-level workspace registry: the project ID plus the list of
 * application directories (each holding its own `sillymaker.config.ts`).
 * CI aggregation (`app check --all`, asset verification, the root Vite `--mode`
 * dispatch) is its only consumer; applications build through their own
 * project files.
 */
export interface SillymakerWorkspaceConfigV1 {
  readonly projectId: string;
  readonly appDirectories: readonly string[];
}

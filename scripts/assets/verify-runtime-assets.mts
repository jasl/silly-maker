// SPDX-License-Identifier: MIT
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  DeepReadonly,
  ResolvedAssetManifestV1,
  TextContentBootstrapCatalogV1,
  TextCatalogSetV1,
  TextContentManifestV1,
} from "../../engine/packages/base/src/index.ts";

import type {
  RuntimeAssetValidationEnvironmentV1,
  RuntimeAssetValidationErrorV1,
} from "./validate-runtime.mts";

const repositoryRootForLoadingV1 = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

async function loadRuntimeAssetModulesV1() {
  const typeStripHooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (specifier.endsWith(".mjs")) {
          return nextResolve(`${specifier.slice(0, -4)}.mts`, context);
        }
        if (specifier.endsWith(".js")) {
          return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
        }
        throw error;
      }
    },
  });

  try {
    const [baseModule, workspaceModule, configModule, loaderModule, validatorModule] = await Promise
      .all([
        import("../../engine/packages/base/src/index.ts"),
        import("../../engine/packages/tooling/src/project/workspace.ts"),
        import("../../project.config.ts"),
        import("../../engine/packages/tooling/src/project/loader.ts"),
        import("./validate-runtime.mts"),
      ]);
    const loader = loaderModule.createImportProjectModuleLoaderV1(repositoryRootForLoadingV1);
    const apps = await workspaceModule.loadWorkspaceAppsV1({
      repositoryRoot: repositoryRootForLoadingV1,
      workspace: configModule.sillyMakerConfigV1,
    });
    const verifiedApps = apps.filter((app) => app.config.assetVerification);
    const entries = await Promise.all(
      verifiedApps.map(async (app) => {
        // Config admission guarantees that asset verification has a Story.
        const storyEntry = app.config.storyEntry!;
        const modulePath = `${app.directory}/${storyEntry.module}`;
        const record = await loader.loadModule(modulePath);
        const entry = record[storyEntry.exportName];
        if (entry === undefined) {
          throw new TypeError(
            `${app.config.applicationId}: missing Story entry export ${storyEntry.exportName}`,
          );
        }
        return {
          appDirectory: app.directory,
          entry: entry as Parameters<(typeof baseModule)["resolveGamePackageV1"]>[0],
        };
      }),
    );
    return { baseModule, validatorModule, entries };
  } finally {
    typeStripHooks.deregister();
  }
}

const {
  baseModule: baseModuleV1,
  validatorModule: validatorModuleV1,
  entries: verifiedStoryEntriesV1,
} = await loadRuntimeAssetModulesV1();

const { admitTextContentPackV1, resolveGamePackageV1, TextContentErrorV1 } = baseModuleV1;
const { validateRuntimeAssetManifestV1 } = validatorModuleV1;

const runtimeAssetVerificationBuildIdentityV1 = {
  engineVersion: "SillyMaker runtime asset verification",
  engine: [],
  storySimulation: [],
  storyPresentation: [],
  application: [],
} satisfies Parameters<typeof resolveGamePackageV1>[2];

const emptyRuntimeAssetHotfixSetV1: readonly never[] = [];

export interface RuntimeAssetStoryCheckV1 {
  readonly storyId: string;
  /** The application directory whose root the manifest's runtimePaths resolve against. */
  readonly appDirectory: string;
  resolve(): RuntimeAssetStoryResolutionV1;
}

export interface RuntimeAssetStoryResolutionV1 {
  readonly assets: ResolvedAssetManifestV1;
  readonly textContent?: {
    readonly manifest: TextContentManifestV1;
    readonly bootstrapCatalogs: readonly TextContentBootstrapCatalogV1[];
  };
}

function resolutionFailureMessageV1(
  storyId: string,
  result: Extract<ReturnType<typeof resolveGamePackageV1>, { readonly kind: "failed" }>,
): string {
  return `${storyId}:${result.failure.code}:${
    String(
      result.failure.details.message ?? "Story resolution failed",
    )
  }`;
}

export const runtimeAssetStoryChecksV1: readonly RuntimeAssetStoryCheckV1[] = verifiedStoryEntriesV1
  .map(({ appDirectory, entry }) => ({
    storyId: entry.identity.id,
    appDirectory,
    resolve(): RuntimeAssetStoryResolutionV1 {
      const result = resolveGamePackageV1(
        entry,
        emptyRuntimeAssetHotfixSetV1,
        runtimeAssetVerificationBuildIdentityV1,
      );
      if (result.kind === "failed") {
        throw new TypeError(resolutionFailureMessageV1(this.storyId, result));
      }
      const presentation = result.resolved.presentation as {
        readonly textCatalogs: TextCatalogSetV1;
        readonly textContentManifest?: TextContentManifestV1 | null;
      };
      const textContentManifest = presentation.textContentManifest ?? null;
      return {
        assets: result.resolved.assets,
        ...(textContentManifest === null ? {} : {
          textContent: {
            manifest: textContentManifest,
            bootstrapCatalogs: presentation.textCatalogs.catalogs,
          },
        }),
      };
    },
  }));

export type RuntimeAssetManifestValidatorV1 = (
  manifest: DeepReadonly<ResolvedAssetManifestV1>,
  environment: RuntimeAssetValidationEnvironmentV1,
) => Promise<{ readonly errors: readonly RuntimeAssetValidationErrorV1[] }>;

export type RuntimeAssetEnvironmentFactoryV1 = (
  appRoot: string,
) => RuntimeAssetValidationEnvironmentV1;

export interface RuntimeAssetVerificationOptionsV1 {
  readonly environmentFor?: RuntimeAssetEnvironmentFactoryV1;
  readonly validate?: RuntimeAssetManifestValidatorV1;
}

function textContentFailureV1(
  storyId: string,
  packId: string,
  locale: string,
  code: string,
  reference: string | null = null,
): string {
  return `${storyId}:${packId}:${locale}:${code}${reference === null ? "" : `:${reference}`}`;
}

async function verifyTextContentV1(
  storyId: string,
  textContent: NonNullable<RuntimeAssetStoryResolutionV1["textContent"]>,
  environment: RuntimeAssetValidationEnvironmentV1,
  failures: string[],
): Promise<void> {
  const defaultLocale = textContent.manifest.defaultLocale;
  const bootstrapDefaultIds = new Set(
    textContent.bootstrapCatalogs
      .find((catalog) => catalog.locale === defaultLocale)
      ?.entries.map((entry) => entry.textId) ?? [],
  );
  for (const catalog of textContent.bootstrapCatalogs) {
    if (catalog.locale === defaultLocale) continue;
    for (const entry of catalog.entries) {
      if (!bootstrapDefaultIds.has(entry.textId)) {
        failures.push(textContentFailureV1(
          storyId,
          "bootstrap",
          catalog.locale,
          "text_content.translation_text_id_unknown",
          entry.textId,
        ));
      }
    }
  }

  // Only stable default-locale IDs survive each iteration. Admitted strings
  // and translation maps are released before moving to the next logical pack.
  const defaultClosure = new Set(bootstrapDefaultIds);
  for (const descriptor of textContent.manifest.packs) {
    const defaultVariant = descriptor.variants.find((variant) => variant.locale === defaultLocale);
    if (defaultVariant === undefined) continue;
    let packDefaultIds: ReadonlySet<string> | null = null;
    try {
      const admitted = admitTextContentPackV1(
        descriptor,
        defaultVariant,
        await environment.readFile(defaultVariant.runtimePath),
      );
      const ids = new Set<string>();
      for (const textId of admitted.entries.keys()) {
        ids.add(textId);
        if (defaultClosure.has(textId)) {
          failures.push(textContentFailureV1(
            storyId,
            descriptor.packId,
            defaultLocale,
            "text_content.text_id_duplicate",
            textId,
          ));
        } else {
          defaultClosure.add(textId);
        }
      }
      packDefaultIds = ids;
    } catch (error) {
      if (!(error instanceof TextContentErrorV1)) throw error;
      failures.push(textContentFailureV1(
        storyId,
        descriptor.packId,
        defaultLocale,
        error.code,
        error.reference,
      ));
    }

    for (const variant of descriptor.variants) {
      if (variant.locale === defaultLocale) continue;
      try {
        const admitted = admitTextContentPackV1(
          descriptor,
          variant,
          await environment.readFile(variant.runtimePath),
        );
        if (packDefaultIds !== null) {
          for (const textId of admitted.entries.keys()) {
            if (!packDefaultIds.has(textId)) {
              failures.push(textContentFailureV1(
                storyId,
                descriptor.packId,
                variant.locale,
                "text_content.translation_text_id_unknown",
                textId,
              ));
            }
          }
        }
      } catch (error) {
        if (!(error instanceof TextContentErrorV1)) throw error;
        failures.push(textContentFailureV1(
          storyId,
          descriptor.packId,
          variant.locale,
          error.code,
          error.reference,
        ));
      }
    }
  }
}

export function createNodeRuntimeAssetEnvironmentV1(
  root: string,
): RuntimeAssetValidationEnvironmentV1 {
  const appRoot = resolve(root);
  return {
    async readFile(appRelativePath: string): Promise<Uint8Array> {
      return new Uint8Array(await readFile(join(appRoot, appRelativePath)));
    },
  };
}

export async function verifyRuntimeAssetStoryChecksV1(
  stories: readonly RuntimeAssetStoryCheckV1[],
  environmentFor: RuntimeAssetEnvironmentFactoryV1,
  validate: RuntimeAssetManifestValidatorV1 = validateRuntimeAssetManifestV1,
): Promise<readonly string[]> {
  const failures: string[] = [];
  const verifiedStoryIds: string[] = [];

  for (const story of stories) {
    const resolution = story.resolve();
    const environment = environmentFor(story.appDirectory);
    const result = await validate(resolution.assets, environment);
    verifiedStoryIds.push(story.storyId);
    for (const error of result.errors) {
      failures.push(`${story.storyId}:${error.assetId}:${error.code}`);
    }
    if (resolution.textContent !== undefined) {
      await verifyTextContentV1(
        story.storyId,
        resolution.textContent,
        environment,
        failures,
      );
    }
  }

  if (failures.length > 0) throw new TypeError(failures.join("\n"));
  return verifiedStoryIds;
}

/** Resolves each maintained Story and validates its manifest against its own application root. */
export function verifyRuntimeAssetsV1(
  root: string,
  options: RuntimeAssetVerificationOptionsV1 = {},
): Promise<readonly string[]> {
  const environmentFor = options.environmentFor ??
    ((appDirectory: string) => createNodeRuntimeAssetEnvironmentV1(join(root, appDirectory)));
  return verifyRuntimeAssetStoryChecksV1(
    runtimeAssetStoryChecksV1,
    environmentFor,
    options.validate ?? validateRuntimeAssetManifestV1,
  );
}

const isMain = process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    await verifyRuntimeAssetsV1(resolve(import.meta.dirname, "../.."));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "runtime asset verification failed");
    process.exitCode = 1;
  }
}

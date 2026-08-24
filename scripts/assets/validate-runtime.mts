// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  ResolvedAssetManifestV1,
} from "../../engine/packages/base/src/index.ts";

import { readRuntimeImageMetadataV1 } from "./runtime-image-metadata.mts";

/**
 * Runtime paths are already admitted as application-root-relative `assets/…`
 * names. The owning Host decides how those names map to its filesystem.
 */
export interface RuntimeAssetValidationEnvironmentV1 {
  readFile(appRelativePath: string): Promise<Uint8Array>;
}

export interface RuntimeAssetValidationErrorV1 {
  readonly assetId: string;
  readonly code:
    | "asset.runtime_path_unsafe"
    | "asset.runtime_file_missing"
    | "asset.runtime_media_mismatch"
    | "asset.runtime_dimensions_mismatch";
}

/**
 * Runtime assets live under the application project's own `assets/`
 * directory and are addressed app-root-relative.
 */
function hasDeclaredRuntimeRootV1(runtimePath: string): boolean {
  const segments = runtimePath.split("/");
  return segments[0] === "assets" && segments.length >= 2;
}

function safeRuntimePathV1(runtimePath: string): boolean {
  if (
    runtimePath.length === 0 ||
    runtimePath.startsWith("/") ||
    runtimePath.includes("\\") ||
    runtimePath.includes("?") ||
    runtimePath.includes("#") ||
    runtimePath.includes("\0") ||
    /%(?:00|23|25|2e|2f|3f|5c)/iu.test(runtimePath)
  ) {
    return false;
  }

  const segments = runtimePath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return false;
  }

  return hasDeclaredRuntimeRootV1(runtimePath);
}

function validationErrorV1(
  assetId: string,
  code: RuntimeAssetValidationErrorV1["code"],
): RuntimeAssetValidationErrorV1 {
  return { assetId, code };
}

export async function validateRuntimeAssetManifestV1(
  manifest: DeepReadonly<ResolvedAssetManifestV1>,
  environment: RuntimeAssetValidationEnvironmentV1,
): Promise<{ readonly errors: readonly RuntimeAssetValidationErrorV1[] }> {
  const errors: RuntimeAssetValidationErrorV1[] = [];

  for (const asset of manifest.assets) {
    if (asset.delivery !== "runtime_image") continue;

    if (!safeRuntimePathV1(asset.runtimePath)) {
      errors.push(validationErrorV1(asset.assetId, "asset.runtime_path_unsafe"));
      continue;
    }

    let bytes: Uint8Array;
    try {
      bytes = await environment.readFile(asset.runtimePath);
    } catch {
      errors.push(validationErrorV1(asset.assetId, "asset.runtime_file_missing"));
      continue;
    }

    const metadataResult = readRuntimeImageMetadataV1(bytes, asset.mediaType);
    const mediaMismatch = metadataResult.kind === "invalid"
      ? metadataResult.code !== "invalid_dimensions"
      : metadataResult.metadata.mediaType !== asset.mediaType;
    const dimensionsMismatch = metadataResult.kind === "invalid"
      ? metadataResult.code === "invalid_dimensions"
      : metadataResult.metadata.width !== asset.width ||
        metadataResult.metadata.height !== asset.height;

    if (mediaMismatch) {
      errors.push(validationErrorV1(asset.assetId, "asset.runtime_media_mismatch"));
    }
    if (dimensionsMismatch) {
      errors.push(validationErrorV1(asset.assetId, "asset.runtime_dimensions_mismatch"));
    }
  }

  return { errors };
}

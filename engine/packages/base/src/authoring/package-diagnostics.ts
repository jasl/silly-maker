// SPDX-License-Identifier: MIT
import type { DiagnosticEnvelopeV1 } from "../contracts/diagnostic-envelope.ts";
import { createDiagnosticV1, parseDiagnosticEnvelopeV1 } from "../contracts/diagnostic-envelope.ts";
import { digestBytes } from "../contracts/digest.ts";
import type { GamePackageV1 } from "../contracts/game-package.ts";
import type { StrictJsonObjectV1 } from "../contracts/strict-json.ts";
import type { BuildIdentityInputV1 } from "./build-identity.ts";
import { resolveGamePackageV1 } from "./story-resolver.ts";

export type GamePackageDiagnosticsResultV1 =
  | { readonly kind: "valid" }
  | { readonly kind: "invalid"; readonly diagnostics: readonly DiagnosticEnvelopeV1[] };

export interface CollectGamePackageDiagnosticsOptionsV1 {
  readonly buildIdentityInput?: BuildIdentityInputV1;
}

const validationSourceDigestV1 = digestBytes(Uint8Array.of(0x76, 0x61, 0x6c));

/**
 * Resolution needs a build identity even when the caller only wants
 * validation diagnostics; this synthetic identity never leaves the check.
 */
const validationBuildIdentityV1: BuildIdentityInputV1 = {
  engineVersion: "SillyMaker authoring-validation",
  engine: [
    {
      path: "authoring-validation/engine.ts",
      sha256: validationSourceDigestV1,
      facet: "engine" as const,
    },
  ],
  storySimulation: [
    {
      path: "authoring-validation/simulation.ts",
      sha256: validationSourceDigestV1,
      facet: "story_simulation" as const,
    },
  ],
  storyPresentation: [
    {
      path: "authoring-validation/presentation.ts",
      sha256: validationSourceDigestV1,
      facet: "story_presentation" as const,
    },
  ],
  application: [],
};

function embeddedDiagnosticsV1(
  details: StrictJsonObjectV1,
): readonly DiagnosticEnvelopeV1[] | null {
  const embedded = details.diagnostics;
  if (!Array.isArray(embedded) || embedded.length === 0) return null;
  try {
    return embedded.map(parseDiagnosticEnvelopeV1);
  } catch {
    return null;
  }
}

function causeDiagnosticV1(
  failureCode: string,
  message: string,
  details: StrictJsonObjectV1,
): DiagnosticEnvelopeV1 | null {
  const cause = details.cause;
  if (cause === null || typeof cause !== "object" || Array.isArray(cause)) return null;
  const causeCode = (cause as { readonly code?: unknown }).code;
  if (typeof causeCode !== "string") return null;
  const causeDetails = (cause as { readonly details?: unknown }).details;
  const path =
    causeDetails !== null && typeof causeDetails === "object" && !Array.isArray(causeDetails)
      ? (causeDetails as { readonly path?: unknown }).path
      : undefined;
  const reference =
    causeDetails !== null && typeof causeDetails === "object" && !Array.isArray(causeDetails)
      ? (causeDetails as { readonly reference?: unknown }).reference
      : undefined;
  try {
    return createDiagnosticV1({
      code: causeCode,
      phase: "resolution",
      message,
      ...(typeof path === "string" ? { location: { jsonPointer: path } } : {}),
      ...(typeof reference === "string" ? { subject: { kind: "reference", id: reference } } : {}),
      details: {
        resolutionFailureCode: failureCode,
        ...(causeDetails !== null &&
            typeof causeDetails === "object" &&
            !Array.isArray(causeDetails)
          ? (causeDetails as StrictJsonObjectV1)
          : {}),
      },
    });
  } catch {
    return null;
  }
}

/**
 * Resolves a GamePackage purely for validation and returns every failure as
 * stable structured diagnostics: authoring diagnostics thrown during
 * definition pass through unchanged, structured causes (for example scene
 * graph reference errors) keep their own codes and JSON pointers, and any
 * remaining failure is reported under its resolution failure code.
 */
export function collectGamePackageDiagnosticsV1<TSimulationFacet, TPresentationFacet>(
  entry: GamePackageV1<TSimulationFacet, TPresentationFacet>,
  options: CollectGamePackageDiagnosticsOptionsV1 = {},
): GamePackageDiagnosticsResultV1 {
  const result = resolveGamePackageV1(
    entry,
    [],
    options.buildIdentityInput ?? validationBuildIdentityV1,
  );
  if (result.kind === "resolved") return { kind: "valid" };

  const failure = result.failure;
  const message = typeof failure.details.message === "string"
    ? failure.details.message
    : failure.code;

  const embedded = embeddedDiagnosticsV1(failure.details);
  if (embedded !== null) return { kind: "invalid", diagnostics: embedded };

  const cause = causeDiagnosticV1(failure.code, message, failure.details);
  if (cause !== null) {
    return { kind: "invalid", diagnostics: [cause] };
  }

  return {
    kind: "invalid",
    diagnostics: [
      createDiagnosticV1({
        code: failure.code,
        phase: "resolution",
        message,
        details: { rejectedHotfixIds: [...failure.rejectedHotfixIds] },
      }),
    ],
  };
}

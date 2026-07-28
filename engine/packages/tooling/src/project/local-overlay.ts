// SPDX-License-Identifier: MIT
import { AuthoringDiagnosticErrorV1, createDiagnosticV1 } from "@sillymaker/base";

import type { SillymakerProjectConfigV1, StoryApplicationConfigV1 } from "./config-types.ts";

/**
 * Local application overlay: a gitignored `project.config.local.ts` at the
 * repository root may register extra Story applications (private studies,
 * tmp-only verification games, personal experiments) without touching the
 * committed registry. Every registry consumer (Vite target resolution, the
 * story CLI, asset verification) merges the overlay through this one
 * function, so a local application gets the full supported lifecycle —
 * dev, check, simulate, build — instead of a bespoke boot path.
 *
 * The overlay never enters build identity: identity collection walks static
 * imports only, and the overlay file is loaded through a runtime dynamic
 * import guarded by file existence.
 */

/** The well-known overlay module, resolved against the repository root. */
export const sillymakerLocalConfigFileNameV1 = "project.config.local.ts";

/** The export the overlay module must provide. */
export const sillymakerLocalApplicationsExportV1 = "sillyMakerLocalApplicationsV1";

/**
 * Appends local applications to the committed registry. A local application
 * must not shadow a committed one; collisions fail with a structured
 * diagnostic instead of silently picking a winner. The merged config still
 * goes through `defineSillymakerProjectV1` on validating consumers.
 */
export function mergeLocalStoryApplicationsV1(
  base: SillymakerProjectConfigV1,
  localApplications: readonly StoryApplicationConfigV1[],
): SillymakerProjectConfigV1 {
  if (localApplications.length === 0) return base;
  const committed = new Set(base.applications.map((application) => application.applicationId));
  localApplications.forEach((application, index) => {
    if (committed.has(application.applicationId)) {
      throw new AuthoringDiagnosticErrorV1([
        createDiagnosticV1({
          code: "project.local_application_conflict",
          phase: "build",
          message:
            `local application ID "${application.applicationId}" already exists in the ` +
            `committed registry; local applications may only add new IDs`,
          location: {
            jsonPointer: `/${sillymakerLocalApplicationsExportV1}/${String(index)}/applicationId`,
          },
          details: {},
        }),
      ]);
    }
  });
  return Object.freeze({
    projectId: base.projectId,
    applications: Object.freeze([...base.applications, ...localApplications]),
  });
}

/** Reads the overlay export from an already-imported overlay module record. */
export function readLocalStoryApplicationsV1(
  moduleRecord: Readonly<Record<string, unknown>>,
): readonly StoryApplicationConfigV1[] {
  const value = moduleRecord[sillymakerLocalApplicationsExportV1];
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) {
    throw new AuthoringDiagnosticErrorV1([
      createDiagnosticV1({
        code: "project.local_config_invalid",
        phase: "build",
        message: `${sillymakerLocalApplicationsExportV1} must be an array of application configs`,
        location: { jsonPointer: `/${sillymakerLocalApplicationsExportV1}` },
        details: {},
      }),
    ]);
  }
  return Object.freeze([...(value as StoryApplicationConfigV1[])]);
}

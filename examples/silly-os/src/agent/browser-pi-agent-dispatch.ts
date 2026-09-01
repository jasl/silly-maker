// SPDX-License-Identifier: MIT

import {
  admitInstalledProgramPackageReferenceV1,
  type InstalledProgramPackageReferenceV1,
} from "../program-platform/package/program-package-archive.ts";

/**
 * Generic wire envelope for one exact Process-pinned Program execution.
 *
 * The Agent transport deliberately does not understand the payload. The
 * build-known runtime profile selected by application composition owns its
 * admission, prompt projection, completion protocol, and output budgets.
 */
export interface BrowserPiAgentDispatchV1 {
  readonly revision: 1;
  readonly runtimeProfile: string;
  readonly programPackage: InstalledProgramPackageReferenceV1;
  /** Program identity owned by the Process Workspace; it may differ from the executing package. */
  readonly workspaceProgramId: string;
  readonly payload: unknown;
}

export type BrowserPiAgentDispatchAdmissionResultV1 =
  | { readonly kind: "admitted"; readonly value: BrowserPiAgentDispatchV1 }
  | { readonly kind: "rejected" };

type DataRecordV1 = Readonly<Record<string, unknown>>;

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u;

function exactRecordV1(value: unknown, keys: readonly string[]): DataRecordV1 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const actual = Object.keys(value);
  if (actual.length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) return null;
  return value as DataRecordV1;
}

function isIdentifierV1(value: unknown): value is string {
  return typeof value === "string" && identifierPatternV1.test(value);
}

export function admitBrowserPiAgentDispatchV1(
  value: unknown,
): BrowserPiAgentDispatchAdmissionResultV1 {
  const discriminator = exactRecordV1(value, [
    "revision",
    "runtimeProfile",
    "programPackage",
    "workspaceProgramId",
    "payload",
  ]);
  if (
    discriminator === null || discriminator.revision !== 1 ||
    !isIdentifierV1(discriminator.runtimeProfile) ||
    !isIdentifierV1(discriminator.workspaceProgramId)
  ) return { kind: "rejected" };

  let programPackage: InstalledProgramPackageReferenceV1;
  try {
    programPackage = admitInstalledProgramPackageReferenceV1(discriminator.programPackage);
  } catch {
    return { kind: "rejected" };
  }
  return {
    kind: "admitted",
    value: {
      revision: 1,
      runtimeProfile: discriminator.runtimeProfile,
      programPackage,
      workspaceProgramId: discriminator.workspaceProgramId,
      payload: discriminator.payload,
    },
  };
}

export function admitBrowserPiAgentDispatchTextV1(
  text: unknown,
): BrowserPiAgentDispatchAdmissionResultV1 {
  if (typeof text !== "string" || text.length === 0) return { kind: "rejected" };
  try {
    return admitBrowserPiAgentDispatchV1(JSON.parse(text));
  } catch {
    return { kind: "rejected" };
  }
}

export function serializeBrowserPiAgentDispatchV1(value: BrowserPiAgentDispatchV1): string {
  let text: string;
  try {
    text = JSON.stringify(value);
  } catch {
    throw new TypeError("sillyos.browser_pi_agent_dispatch.invalid");
  }
  if (admitBrowserPiAgentDispatchTextV1(text).kind === "rejected") {
    throw new TypeError("sillyos.browser_pi_agent_dispatch.invalid");
  }
  return text;
}

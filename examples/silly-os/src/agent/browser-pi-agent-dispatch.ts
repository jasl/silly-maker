// SPDX-License-Identifier: MIT

import {
  admitInstalledProgramPackageReferenceV1,
  type InstalledProgramPackageReferenceV1,
} from "../program-platform/package/program-package-archive.ts";

/**
 * Generic wire envelope for one Process and its compatible Program execution.
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

/**
 * Host-owned transient fence for one mounted Program implementation.
 *
 * `implementationId` is repository-private current-installation state. It is
 * carried only across one submit and is never Program or Process identity.
 */
export interface BrowserPiProgramImplementationBindingV1 {
  readonly programPackage: InstalledProgramPackageReferenceV1;
  readonly implementationId: string;
}

export interface BrowserPiBoundAgentDispatchV1 {
  readonly revision: 1;
  readonly implementation: BrowserPiProgramImplementationBindingV1;
  /** Program-owned serialized dispatch; the Worker remains its single admission owner. */
  readonly dispatchText: string;
}

export type BrowserPiAgentDispatchAdmissionResultV1 =
  | { readonly kind: "admitted"; readonly value: BrowserPiAgentDispatchV1 }
  | { readonly kind: "rejected" };

export type BrowserPiBoundAgentDispatchAdmissionResultV1 =
  | { readonly kind: "admitted"; readonly value: BrowserPiBoundAgentDispatchV1 }
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

export function admitBrowserPiBoundAgentDispatchV1(
  value: unknown,
): BrowserPiBoundAgentDispatchAdmissionResultV1 {
  const envelope = exactRecordV1(value, ["revision", "implementation", "dispatchText"]);
  if (
    envelope === null || envelope.revision !== 1 ||
    typeof envelope.dispatchText !== "string" || envelope.dispatchText.length === 0
  ) return { kind: "rejected" };
  const implementation = exactRecordV1(envelope.implementation, [
    "programPackage",
    "implementationId",
  ]);
  if (implementation === null || !isIdentifierV1(implementation.implementationId)) {
    return { kind: "rejected" };
  }
  let programPackage: InstalledProgramPackageReferenceV1;
  try {
    programPackage = admitInstalledProgramPackageReferenceV1(implementation.programPackage);
  } catch {
    return { kind: "rejected" };
  }
  return {
    kind: "admitted",
    value: {
      revision: 1,
      implementation: {
        programPackage,
        implementationId: implementation.implementationId,
      },
      dispatchText: envelope.dispatchText,
    },
  };
}

export function admitBrowserPiBoundAgentDispatchTextV1(
  text: unknown,
): BrowserPiBoundAgentDispatchAdmissionResultV1 {
  if (typeof text !== "string" || text.length === 0) return { kind: "rejected" };
  try {
    return admitBrowserPiBoundAgentDispatchV1(JSON.parse(text));
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

export function serializeBrowserPiBoundAgentDispatchV1(
  value: BrowserPiBoundAgentDispatchV1,
): string {
  let text: string;
  try {
    text = JSON.stringify(value);
  } catch {
    throw new TypeError("sillyos.browser_pi_bound_agent_dispatch.invalid");
  }
  if (admitBrowserPiBoundAgentDispatchTextV1(text).kind === "rejected") {
    throw new TypeError("sillyos.browser_pi_bound_agent_dispatch.invalid");
  }
  return text;
}

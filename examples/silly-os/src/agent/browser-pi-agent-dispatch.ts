// SPDX-License-Identifier: MIT

import { admitCreatorAgentSubmitV1 } from "../product/creator-agent-admission.ts";
import type { CreatorAgentSubmitV1 } from "../product/contracts.ts";
import { builtinCreatorProgramCompatibilityReferenceV1 } from "../product/program-process-repository.ts";
import {
  admitTranslationBatchRequestV1,
  type TranslationBatchRequestV1,
} from "../product/translation/translation-batch-protocol.ts";
import { translationProgramHarnessReferenceV1 } from "../product/translation/translation-program-definition.ts";

export const creatorProgramHarnessReferenceV1 = builtinCreatorProgramCompatibilityReferenceV1;

export interface BrowserPiCreatorAgentDispatchV1 {
  readonly revision: 1;
  readonly harnessReference: typeof creatorProgramHarnessReferenceV1;
  readonly programId: string;
  readonly submit: CreatorAgentSubmitV1;
}

export interface BrowserPiTranslationAgentDispatchV1 {
  readonly revision: 1;
  readonly harnessReference: typeof translationProgramHarnessReferenceV1;
  readonly programId: string;
  readonly request: TranslationBatchRequestV1;
}

export type BrowserPiAgentDispatchV1 =
  | BrowserPiCreatorAgentDispatchV1
  | BrowserPiTranslationAgentDispatchV1;

export type BrowserPiAgentDispatchAdmissionResultV1 =
  | { readonly kind: "admitted"; readonly value: BrowserPiAgentDispatchV1 }
  | { readonly kind: "rejected" };

type DataRecordV1 = Readonly<Record<string, unknown>>;

const identifierPatternV1 = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;

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
    "harnessReference",
    "programId",
    "submit",
  ]) ?? exactRecordV1(value, [
    "revision",
    "harnessReference",
    "programId",
    "request",
  ]);
  if (
    discriminator === null || discriminator.revision !== 1 ||
    !isIdentifierV1(discriminator.programId)
  ) return { kind: "rejected" };

  if (discriminator.harnessReference === creatorProgramHarnessReferenceV1) {
    const admitted = admitCreatorAgentSubmitV1(discriminator.submit);
    if (
      admitted.kind === "rejected" || admitted.value.programId !== discriminator.programId
    ) return { kind: "rejected" };
    return {
      kind: "admitted",
      value: {
        revision: 1,
        harnessReference: creatorProgramHarnessReferenceV1,
        programId: admitted.value.programId,
        submit: admitted.value,
      },
    };
  }

  if (discriminator.harnessReference !== translationProgramHarnessReferenceV1) {
    return { kind: "rejected" };
  }
  const admittedRequest = admitTranslationBatchRequestV1(discriminator.request);
  if (admittedRequest.kind === "rejected") return { kind: "rejected" };
  return {
    kind: "admitted",
    value: {
      revision: 1,
      harnessReference: translationProgramHarnessReferenceV1,
      programId: discriminator.programId,
      request: admittedRequest.request,
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

function serializeDispatchV1(value: BrowserPiAgentDispatchV1): string {
  const admitted = admitBrowserPiAgentDispatchV1(value);
  if (admitted.kind === "rejected") {
    throw new TypeError("sillyos.browser_pi_agent_dispatch.invalid");
  }
  return JSON.stringify(admitted.value);
}

export function serializeBrowserPiCreatorAgentDispatchV1(input: {
  readonly executionCompatibilityReference: string;
  readonly submit: CreatorAgentSubmitV1;
}): string {
  return serializeDispatchV1({
    revision: 1,
    harnessReference: input
      .executionCompatibilityReference as typeof creatorProgramHarnessReferenceV1,
    programId: input.submit.programId,
    submit: input.submit,
  });
}

export function serializeBrowserPiTranslationAgentDispatchV1(input: {
  readonly executionCompatibilityReference: string;
  readonly programId: string;
  readonly request: TranslationBatchRequestV1;
}): string {
  return serializeDispatchV1({
    revision: 1,
    harnessReference: input
      .executionCompatibilityReference as typeof translationProgramHarnessReferenceV1,
    programId: input.programId,
    request: input.request,
  });
}

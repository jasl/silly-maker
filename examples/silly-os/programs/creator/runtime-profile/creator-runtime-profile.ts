// SPDX-License-Identifier: MIT

import { Type } from "@earendil-works/pi-ai";

import {
  admitCreatorAgentSubmitV1,
  admitCreatorProgramRevisionCandidateV1,
} from "../runtime/creator-agent-admission.ts";
import {
  creatorAgentFinalReplyMaximumCharactersV1,
  creatorAgentTextMaximumCharactersV1,
  type CreatorAgentSubmitV1,
} from "../runtime/contracts.ts";
import {
  serializeBrowserPiAgentDispatchV1,
  type BrowserPiAgentDispatchV1,
} from "../../../src/agent/browser-pi-agent-dispatch.ts";
import type { BrowserProgramRuntimeProfileV1 } from "../../../src/agent/browser-program-runtime-profile.ts";
import type { InstalledProgramPackageReferenceV1 } from "../../../src/program-platform/package/program-package-archive.ts";
import {
  creatorProgramRuntimeProfileDescriptorV1,
  creatorProgramRuntimeProfileV1,
} from "./creator-runtime-profile-descriptor.ts";

export { creatorProgramRuntimeProfileV1 } from "./creator-runtime-profile-descriptor.ts";

export const creatorProgramRevisionToolNameV1 = "sillyos_propose_program_revision" as const;

const creatorProgramRevisionToolSchemaV1 = Type.Object(
  {
    requirement: Type.String({ minLength: 1, maxLength: creatorAgentTextMaximumCharactersV1 }),
  },
  { additionalProperties: false },
);

export const creatorProgramRuntimeProfileImplementationV1: BrowserProgramRuntimeProfileV1 = {
  runtimeProfile: creatorProgramRuntimeProfileV1,
  packageDescriptor: creatorProgramRuntimeProfileDescriptorV1,
  harnessToolIds: [
    "read",
    "write",
    "edit",
    "bash",
    "grep",
    "fetch_url",
    "download",
  ],
  providerTimeoutMilliseconds: 30_000,
  admitDispatch(dispatch) {
    if (dispatch.runtimeProfile !== creatorProgramRuntimeProfileV1) return { kind: "rejected" };
    const admittedSubmit = admitCreatorAgentSubmitV1(dispatch.payload);
    if (
      admittedSubmit.kind === "rejected" ||
      admittedSubmit.value.programId !== dispatch.workspaceProgramId
    ) return { kind: "rejected" };
    const submit = admittedSubmit.value;
    return {
      kind: "admitted",
      invocation: {
        requestedOutputTokens: 2_048,
        userPrompt: submit.text,
        textOutput: {
          kind: "publish",
          maximumCharacters: creatorAgentFinalReplyMaximumCharactersV1,
        },
        deterministicTest: {
          completionArguments: { requirement: submit.text },
          finalReply: "Deterministic test proposal ready.",
        },
        createCompletionTool(input) {
          return {
            name: creatorProgramRevisionToolNameV1,
            label: "Propose Program revision",
            description:
              "Propose one concise Program requirement. SillyOS binds it to the current reviewed revision.",
            parameters: creatorProgramRevisionToolSchemaV1,
            execute: async (_toolCallId, params, signal) => {
              if (signal?.aborted) throw new Error("Creator run was cancelled");
              const requirement = (params as { readonly requirement: string }).requirement;
              const candidate = {
                revision: 1,
                proposalId: submit.proposalId,
                programId: submit.programId,
                baseProgramRevision: submit.baseProgramRevision,
                text: submit.text,
                requirement,
              };
              await input.onCandidate(candidate);
              return {
                content: [{
                  type: "text",
                  text: "Program revision candidate recorded for review.",
                }],
                details: candidate,
              };
            },
          };
        },
        admitCandidate(value) {
          const admitted = admitCreatorProgramRevisionCandidateV1(value);
          if (admitted.kind === "rejected") {
            return { kind: "rejected", failure: "candidate_invalid" };
          }
          if (
            admitted.value.revision !== submit.revision ||
            admitted.value.proposalId !== submit.proposalId ||
            admitted.value.programId !== submit.programId ||
            admitted.value.baseProgramRevision !== submit.baseProgramRevision ||
            admitted.value.text !== submit.text
          ) {
            return { kind: "rejected", failure: "candidate_context_mismatch" };
          }
          return { kind: "admitted", candidate: admitted.value };
        },
      },
    };
  },
};

export function serializeBrowserPiCreatorAgentDispatchV1(input: {
  readonly programPackage: InstalledProgramPackageReferenceV1;
  readonly submit: CreatorAgentSubmitV1;
}): string {
  return serializeBrowserPiAgentDispatchV1(
    {
      revision: 1,
      runtimeProfile: creatorProgramRuntimeProfileV1,
      programPackage: input.programPackage,
      workspaceProgramId: input.submit.programId,
      payload: input.submit,
    } satisfies BrowserPiAgentDispatchV1,
  );
}

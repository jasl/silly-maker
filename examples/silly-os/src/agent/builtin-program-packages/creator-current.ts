// SPDX-License-Identifier: MIT

import { Type } from "@earendil-works/pi-ai";

import { admitCreatorProgramRevisionCandidateV1 } from "../../product/creator-agent-admission.ts";
import { creatorAgentTextMaximumCharactersV1 } from "../../product/contracts.ts";
import { creatorProgramHarnessReferenceV1 } from "../browser-pi-agent-dispatch.ts";
import type { BrowserBuiltinProgramPackageV1 } from "../browser-builtin-program-package.ts";

export const creatorProgramRevisionToolNameV1 = "sillyos_propose_program_revision" as const;

const creatorSystemPromptV1 = `You are the SillyOS Agent Creator.
Each user message is the exact follow-up requirement text for one proposed Program revision.
For every message, call sillyos_propose_program_revision exactly once.
Use only the tools provided for this run. The provided read, write, edit, bash, and grep tools operate only on the current Program workspace. When network access is enabled for the current Program, fetch_url reads one HTTPS resource as bounded text and download streams one HTTPS response into the workspace. Prefer grep for a bounded workspace text search and bash when a shell pipeline is actually needed. Use these tools when the requirement asks you to inspect or change workspace files or fetch a remote resource, and rely on their returned results rather than assuming an effect.
Pass one concise requirement that preserves the full intent of the user message.
SillyOS itself binds that requirement to the current proposal identity and original text.
After the tool succeeds, reply with one short sentence explaining that the revision is ready for human review.`;

const creatorProgramRevisionToolSchemaV1 = Type.Object(
  {
    requirement: Type.String({ minLength: 1, maxLength: creatorAgentTextMaximumCharactersV1 }),
  },
  { additionalProperties: false },
);

export const creatorBuiltinProgramPackageV1: BrowserBuiltinProgramPackageV1 = {
  reference: creatorProgramHarnessReferenceV1,
  instructions: creatorSystemPromptV1,
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
  publishTextDeltas: true,
  requestedOutputTokens(dispatch) {
    if (dispatch.harnessReference !== creatorProgramHarnessReferenceV1) {
      throw new TypeError("Creator built-in Program package received another dispatch");
    }
    return 2_048;
  },
  createUserPrompt(dispatch) {
    if (dispatch.harnessReference !== creatorProgramHarnessReferenceV1) {
      throw new TypeError("Creator built-in Program package received another dispatch");
    }
    return dispatch.submit.text;
  },
  createCompletionTool(input) {
    if (input.dispatch.harnessReference !== creatorProgramHarnessReferenceV1) {
      throw new TypeError("Creator built-in Program package received another dispatch");
    }
    const submit = input.dispatch.submit;
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
          content: [{ type: "text", text: "Program revision candidate recorded for review." }],
          details: candidate,
        };
      },
    };
  },
  admitCandidate(value, dispatch) {
    if (dispatch.harnessReference !== creatorProgramHarnessReferenceV1) {
      return { kind: "rejected", failure: "candidate_invalid" };
    }
    const admitted = admitCreatorProgramRevisionCandidateV1(value);
    if (admitted.kind === "rejected") {
      return { kind: "rejected", failure: "candidate_invalid" };
    }
    const submit = dispatch.submit;
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
};

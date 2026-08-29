// SPDX-License-Identifier: MIT
import {
  createAgentSessionClientV1,
  type AgentSessionCancelInputV1,
  type AgentSessionClientV1,
  type AgentSessionConnectorV1,
  type AgentSessionStreamEventV1,
  type AgentSessionSubmitInputV1,
} from "@sillymaker/agent/session";
// @ts-expect-error Host and UiArtifact stay behind the workspace-private entry.
import { createAgentHostInternalV1 } from "@sillymaker/agent/session";

type EqualV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectV1<TValue extends true> = TValue;

type SessionRuntimeKeysV1 = ExpectV1<
  EqualV1<keyof typeof import("@sillymaker/agent/session"), "createAgentSessionClientV1">
>;

declare const connectorV1: AgentSessionConnectorV1;
const clientV1: AgentSessionClientV1 = createAgentSessionClientV1({ connector: connectorV1 });
const submitInputV1: AgentSessionSubmitInputV1 = { sessionId: "session.1", text: "hello" };
const cancelInputV1: AgentSessionCancelInputV1 = {
  sessionId: "session.1",
  runId: "run.1",
};
declare const streamEventV1: AgentSessionStreamEventV1;

void clientV1.submit(submitInputV1);
void clientV1.cancel(cancelInputV1);
streamEventV1;
createAgentHostInternalV1;

export type { SessionRuntimeKeysV1 };

// SPDX-License-Identifier: MIT
import type { StrictJsonValueV1 } from "@sillymaker/base/strict-json";

export interface AgentSessionDiagnosticV1 {
  readonly code:
    | "agent_session.unconfigured"
    | "agent_session.offline"
    | "agent_session.connection_failed"
    | "agent_session.operation_failed"
    | "agent_session.record_invalid"
    | "agent_session.record_too_large"
    | "agent_session.sequence_duplicate"
    | "agent_session.sequence_gap"
    | "agent_session.unknown_run";
  readonly path: string;
}

export type AgentSessionConnectionStatusV1 =
  | { readonly kind: "unconfigured" }
  | { readonly kind: "disconnected" }
  | { readonly kind: "connecting" }
  | { readonly kind: "ready" }
  | { readonly kind: "unavailable"; readonly diagnostic: AgentSessionDiagnosticV1 }
  | { readonly kind: "disposed" };

export interface AgentSessionClientSnapshotV1 {
  readonly revision: number;
  readonly status: AgentSessionConnectionStatusV1;
  readonly diagnostic: AgentSessionDiagnosticV1 | null;
}

export type AgentSessionCallFailureV1 =
  | { readonly kind: "unavailable"; readonly diagnostic: AgentSessionDiagnosticV1 }
  | { readonly kind: "superseded" }
  | { readonly kind: "disposed" };

export type AgentSessionConnectResultV1 =
  | { readonly kind: "ready" }
  | AgentSessionCallFailureV1;

export type AgentSessionStartResultV1 =
  | { readonly kind: "started"; readonly sessionId: string }
  | AgentSessionCallFailureV1;

export interface AgentSessionSubmitInputV1 {
  readonly sessionId: string;
  readonly text: string;
}

export type AgentSessionSubmitResultV1 =
  | { readonly kind: "submitted"; readonly runId: string }
  | AgentSessionCallFailureV1;

export interface AgentSessionCancelInputV1 {
  readonly sessionId: string;
  readonly runId: string;
}

export type AgentSessionCancelResultV1 =
  | { readonly kind: "cancel_requested" }
  | AgentSessionCallFailureV1;

export type AgentSessionStreamEventV1 =
  | {
    readonly kind: "output_text_delta";
    readonly sessionId: string;
    readonly runId: string;
    readonly sequence: number;
    readonly text: string;
  }
  | {
    readonly kind: "output_data";
    readonly sessionId: string;
    readonly runId: string;
    readonly sequence: number;
    readonly value: StrictJsonValueV1;
  }
  | {
    readonly kind: "run_completed";
    readonly sessionId: string;
    readonly runId: string;
    readonly sequence: number;
  }
  | {
    readonly kind: "run_failed";
    readonly sessionId: string;
    readonly runId: string;
    readonly sequence: number;
    readonly diagnostic: AgentSessionDiagnosticV1;
  };

export interface AgentSessionClientV1 {
  getSnapshot(): AgentSessionClientSnapshotV1;
  subscribe(listener: () => void): () => void;
  subscribeStream(listener: (event: AgentSessionStreamEventV1) => void): () => void;
  connect(): Promise<AgentSessionConnectResultV1>;
  start(): Promise<AgentSessionStartResultV1>;
  submit(input: AgentSessionSubmitInputV1): Promise<AgentSessionSubmitResultV1>;
  cancel(input: AgentSessionCancelInputV1): Promise<AgentSessionCancelResultV1>;
  reconnect(): Promise<AgentSessionConnectResultV1>;
  dispose(): Promise<void>;
}

export interface AgentSessionConnectionV1 {
  /**
   * Fulfills once this connection can no longer be used, including after an
   * expected local `close()`. The client owns expected-close fencing; adapters
   * do not encode a provider-specific reason here. An adapter rejection is
   * defensively treated as the same retirement signal.
   */
  readonly whenClosed: Promise<void>;
  start(): Promise<unknown>;
  /**
   * The result must settle before this connection forwards the run's first
   * event candidate. The client accepts settlement reactions in the following
   * microtask; an adapter must not call `onEvent` from the `submit` call stack.
   * A wire that arrives earlier owns the bounded reordering.
   */
  submit(input: AgentSessionSubmitInputV1): Promise<unknown>;
  cancel(input: AgentSessionCancelInputV1): Promise<unknown>;
  close(): Promise<void>;
}

export type AgentSessionConnectorConnectResultV1 =
  | { readonly kind: "connected"; readonly connection: AgentSessionConnectionV1 }
  | { readonly kind: "unconfigured" }
  | { readonly kind: "unavailable"; readonly reason: "offline" | "failed" };

export interface AgentSessionConnectorV1 {
  isConfigured(): boolean;
  connect(input: {
    readonly onEvent: (candidate: unknown) => void;
  }): Promise<AgentSessionConnectorConnectResultV1>;
}

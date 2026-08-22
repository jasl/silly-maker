// SPDX-License-Identifier: MIT

export interface AgentRpcDiagnosticInternalV1 {
  readonly code:
    | "rpc.unconfigured"
    | "rpc.offline"
    | "rpc.connection_failed"
    | "rpc.request_failed"
    | "rpc.record_invalid"
    | "rpc.record_too_large"
    | "rpc.sequence_duplicate"
    | "rpc.sequence_gap"
    | "rpc.unknown_run";
  readonly path: string;
}

export type AgentRpcConnectionStatusInternalV1 =
  | { readonly kind: "unconfigured" }
  | { readonly kind: "disconnected" }
  | { readonly kind: "connecting"; readonly connectionGeneration: number }
  | { readonly kind: "ready"; readonly connectionGeneration: number }
  | { readonly kind: "unavailable"; readonly diagnostic: AgentRpcDiagnosticInternalV1 }
  | { readonly kind: "disposed" };

export interface AgentRpcClientSnapshotInternalV1 {
  readonly revision: number;
  readonly status: AgentRpcConnectionStatusInternalV1;
  readonly diagnostic: AgentRpcDiagnosticInternalV1 | null;
}

export type AgentRpcCallFailureInternalV1 =
  | { readonly kind: "unavailable"; readonly diagnostic: AgentRpcDiagnosticInternalV1 }
  | { readonly kind: "superseded" }
  | { readonly kind: "disposed" };

export type AgentRpcConnectResultInternalV1 =
  | { readonly kind: "ready" }
  | AgentRpcCallFailureInternalV1;

export type AgentRpcStartResultInternalV1 =
  | { readonly kind: "started"; readonly sessionId: string }
  | AgentRpcCallFailureInternalV1;

export type AgentRpcSubmitResultInternalV1 =
  | { readonly kind: "submitted"; readonly runId: string }
  | AgentRpcCallFailureInternalV1;

export type AgentRpcCancelResultInternalV1 =
  | { readonly kind: "cancel_requested" }
  | AgentRpcCallFailureInternalV1;

export type AgentRpcStreamEventInternalV1 =
  | {
    readonly kind: "artifact_chunk";
    readonly connectionGeneration: number;
    readonly sessionId: string;
    readonly runId: string;
    readonly sequence: number;
    readonly text: string;
  }
  | {
    readonly kind: "artifact_complete";
    readonly connectionGeneration: number;
    readonly sessionId: string;
    readonly runId: string;
    readonly sequence: number;
    readonly candidate: unknown;
  }
  | {
    readonly kind: "run_completed";
    readonly connectionGeneration: number;
    readonly sessionId: string;
    readonly runId: string;
    readonly sequence: number;
  }
  | {
    readonly kind: "run_failed";
    readonly connectionGeneration: number;
    readonly sessionId: string;
    readonly runId: string;
    readonly sequence: number;
    readonly diagnostic: AgentRpcDiagnosticInternalV1;
  };

export interface AgentRpcClientPortInternalV1 {
  getSnapshot(): AgentRpcClientSnapshotInternalV1;
  subscribe(listener: () => void): () => void;
  subscribeStream(listener: (event: AgentRpcStreamEventInternalV1) => void): () => void;
  connect(): Promise<AgentRpcConnectResultInternalV1>;
  start(): Promise<AgentRpcStartResultInternalV1>;
  submit(input: {
    readonly sessionId: string;
    readonly text: string;
  }): Promise<AgentRpcSubmitResultInternalV1>;
  cancel(input: {
    readonly sessionId: string;
    readonly runId: string;
  }): Promise<AgentRpcCancelResultInternalV1>;
  reconnect(): Promise<AgentRpcConnectResultInternalV1>;
  dispose(): Promise<void>;
}

export type AgentRpcRawConnectResultInternalV1 =
  | { readonly kind: "connected"; readonly connection: AgentRpcRawConnectionInternalV1 }
  | { readonly kind: "unconfigured" }
  | { readonly kind: "unavailable"; readonly reason: "offline" | "failed" };

export interface AgentRpcRawConnectionInternalV1 {
  /**
   * For submit, the response must settle before this connection forwards the
   * resulting run's first stream record to `onRecord`. A protocol adapter that
   * receives frames in another order owns that bounded reordering.
   */
  request(record: unknown): Promise<unknown>;
  close(): Promise<void>;
}

export interface AgentRpcRawTransportInternalV1 {
  isConfigured(): boolean;
  connect(input: {
    readonly onRecord: (record: unknown) => void;
  }): Promise<AgentRpcRawConnectResultInternalV1>;
}

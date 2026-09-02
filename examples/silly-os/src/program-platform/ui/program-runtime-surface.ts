// SPDX-License-Identifier: MIT

import type { ComponentType } from "react";

import type { BrowserProgramAgentHostV1 } from "../../agent/browser-program-agent-host-contracts.ts";
import type { BrowserProgramAgentWorkspaceDiagnosticV1 } from "../../agent/browser-program-agent-port-contracts.ts";
import type { BrowserPiReasoningEffortV1 } from "../../agent/browser-pi-worker-protocol.ts";
import type { SillyOsCopyV1, SillyOsLocaleV1 } from "../../content/copy.ts";
import {
  optionalProcessNetworkAccessCapabilityIdV1,
  type ProcessNetworkAccessMutationResultV1,
  type ProcessNetworkAccessV1,
} from "../capabilities/process-network-access.ts";
import type { ProgramSurfaceSessionStateV1 } from "./program-surface-session-state.ts";

export type ProgramSurfaceThemeModeV1 = "system" | "light" | "dark";

export type ProgramSurfaceAgentReadinessV1 =
  | { readonly status: "catalog_loading"; readonly recoveryTarget: null }
  | { readonly status: "catalog_failed"; readonly recoveryTarget: "providers" }
  | { readonly status: "vault_loading"; readonly recoveryTarget: null }
  | { readonly status: "vault_unavailable"; readonly recoveryTarget: "credential_vault" }
  | { readonly status: "vault_locked"; readonly recoveryTarget: "credential_vault" }
  | { readonly status: "model_required"; readonly recoveryTarget: "providers" }
  | { readonly status: "credential_required"; readonly recoveryTarget: "providers" }
  | { readonly status: "agent_initializing"; readonly recoveryTarget: null }
  | { readonly status: "agent_failed"; readonly recoveryTarget: "providers" | null }
  | { readonly status: "ready"; readonly recoveryTarget: null };

export interface ProgramSurfaceModelControlV1 {
  readonly status: "required" | "initializing" | "ready" | "failed";
  readonly disabled?: boolean;
  readonly selectedValue: string | null;
  readonly options: readonly {
    readonly value: string;
    readonly modelName: string;
    readonly providerName: string;
  }[];
  readonly reasoningEffort: {
    readonly status: "ready" | "initializing" | "failed";
    readonly selectedValue: BrowserPiReasoningEffortV1;
    readonly options: readonly BrowserPiReasoningEffortV1[];
    readonly onSelect: (value: BrowserPiReasoningEffortV1) => void;
  };
  readonly onSelect: (value: string) => void;
  readonly onOpenSettings: (surface?: "home" | "workspace") => void;
}

export interface ProgramSurfaceActiveModelV1 {
  readonly contextWindow: number;
  readonly maximumOutputTokens: number;
}

/** Fixed Host harness capability, exposed only to packages that declare it. */
export interface ProgramSurfaceProcessNetworkAccessV1 {
  load(processId: string): Promise<ProcessNetworkAccessV1 | null>;
  set(input: {
    readonly processId: string;
    readonly enabled: boolean;
  }): Promise<ProcessNetworkAccessMutationResultV1>;
}

/** Origin-neutral package declaration gate for the fixed Host capability. */
export function selectProgramSurfaceProcessNetworkAccessV1(
  capabilityIds: readonly string[],
  capability: ProgramSurfaceProcessNetworkAccessV1 | null,
): ProgramSurfaceProcessNetworkAccessV1 | null {
  return capability !== null && capabilityIds.includes(optionalProcessNetworkAccessCapabilityIdV1)
    ? capability
    : null;
}

/**
 * Stable SillyOS capabilities offered to any admitted Program surface.
 *
 * This is a Host container, not a service locator: the finite capabilities are
 * fixed by the SillyOS build and do not expose another Program's controller,
 * package files, or Process state.
 */
export interface ProgramSurfaceHostV1 {
  readonly copy: SillyOsCopyV1;
  readonly locale: SillyOsLocaleV1;
  readonly theme: ProgramSurfaceThemeModeV1;
  readonly agentHost: BrowserProgramAgentHostV1 | null;
  readonly deterministicAgent: boolean;
  /** Retires the shared Agent owner and establishes a fresh owner when still configured. */
  readonly forgetAgent: () => Promise<boolean>;
  readonly agentReadiness: ProgramSurfaceAgentReadinessV1;
  readonly activeModel: ProgramSurfaceActiveModelV1 | null;
  /** Null when this exact package did not request the optional network capability. */
  readonly processNetworkAccess: ProgramSurfaceProcessNetworkAccessV1 | null;
  readonly providerModel: (surface: "home" | "workspace") => ProgramSurfaceModelControlV1;
  /** Exact-package-scoped, non-durable UI state retained while a surface is unloaded. */
  readonly sessionState: ProgramSurfaceSessionStateV1;
  readonly onOpenAgentSettings: (
    surface: "home" | "workspace",
    target: "providers" | "credential_vault",
  ) => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly onThemeChange: (theme: ProgramSurfaceThemeModeV1) => void;
  readonly onOpenSettings: (surface?: "home" | "workspace") => void;
  readonly onOpenProgramLibrary: () => Promise<boolean>;
  /** Joins lazy Surface resources to exact Program close and later retirement. */
  readonly registerProgramDrain: (resource: {
    readonly quiesce: () => Promise<void>;
    readonly retire: () => Promise<void>;
  }) => () => void;
  readonly registerAgentDrain: (drain: () => Promise<void>) => () => void;
  readonly reportFailure: (code: string, error: unknown) => void;
}

export interface ProgramRuntimeSurfacePropsV1 {
  /** Opaque to the Host; this surface belongs to the adapter that created it. */
  readonly controller: unknown;
  readonly host: ProgramSurfaceHostV1;
}

export interface ProgramRuntimeSurfaceModuleV1 {
  readonly Surface: ComponentType<ProgramRuntimeSurfacePropsV1>;
}

/**
 * Only transient Host/Workspace contention is eligible for automatic cleanup
 * retry. A Program keeps permanent failures visible for explicit recovery
 * instead of starting an unbounded timer loop.
 */
export function shouldRetryProgramWorkspaceCleanupV1(
  diagnostic: BrowserProgramAgentWorkspaceDiagnosticV1,
): boolean {
  return diagnostic.code === "request_failed" ||
    diagnostic.code === "workspace_busy";
}

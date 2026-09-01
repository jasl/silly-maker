// SPDX-License-Identifier: MIT
import { KeyRound, LoaderCircle, LockKeyhole, Settings2, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import type { SillyOsCopyV1 } from "../../../src/content/copy.ts";
import type {
  AgentReadinessRecoveryTargetV1,
  AgentReadinessV1,
} from "../../../src/ui/agent-readiness.ts";
import { ButtonV1 as Button } from "../../../src/ui/design-system/button.tsx";
import {
  StatusActionV1,
  StatusContentV1,
  StatusDescriptionV1,
  StatusTitleV1,
  StatusV1,
  type StatusVariantV1,
} from "../../../src/ui/design-system/status.tsx";

export interface CreatorReadinessNoticePropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly readiness: AgentReadinessV1;
  readonly surface: "home" | "workspace";
  readonly onRecover?: (target: Exclude<AgentReadinessRecoveryTargetV1, null>) => void;
}

function readinessContentV1(
  copy: SillyOsCopyV1,
  status: Exclude<AgentReadinessV1["status"], "ready">,
): {
  readonly title: string;
  readonly description: string;
  readonly variant: StatusVariantV1;
  readonly icon: typeof LoaderCircle;
  readonly busy: boolean;
} {
  switch (status) {
    case "catalog_loading":
      return {
        title: copy.programAgentReadinessCatalogLoadingTitle,
        description: copy.programAgentReadinessCatalogLoadingDescription,
        variant: "info",
        icon: LoaderCircle,
        busy: true,
      };
    case "catalog_failed":
      return {
        title: copy.programAgentReadinessCatalogFailedTitle,
        description: copy.programAgentReadinessCatalogFailedDescription,
        variant: "danger",
        icon: TriangleAlert,
        busy: false,
      };
    case "vault_loading":
      return {
        title: copy.programAgentReadinessVaultLoadingTitle,
        description: copy.programAgentReadinessVaultLoadingDescription,
        variant: "info",
        icon: LoaderCircle,
        busy: true,
      };
    case "vault_unavailable":
      return {
        title: copy.programAgentReadinessVaultUnavailableTitle,
        description: copy.programAgentReadinessVaultUnavailableDescription,
        variant: "danger",
        icon: TriangleAlert,
        busy: false,
      };
    case "vault_locked":
      return {
        title: copy.programAgentReadinessVaultLockedTitle,
        description: copy.programAgentReadinessVaultLockedDescription,
        variant: "warning",
        icon: LockKeyhole,
        busy: false,
      };
    case "model_required":
      return {
        title: copy.programAgentReadinessModelRequiredTitle,
        description: copy.programAgentReadinessModelRequiredDescription,
        variant: "warning",
        icon: Settings2,
        busy: false,
      };
    case "credential_required":
      return {
        title: copy.programAgentReadinessCredentialRequiredTitle,
        description: copy.programAgentReadinessCredentialRequiredDescription,
        variant: "warning",
        icon: KeyRound,
        busy: false,
      };
    case "agent_initializing":
      return {
        title: copy.programAgentReadinessAgentInitializingTitle,
        description: copy.programAgentReadinessAgentInitializingDescription,
        variant: "info",
        icon: LoaderCircle,
        busy: true,
      };
    case "agent_failed":
      return {
        title: copy.programAgentReadinessAgentFailedTitle,
        description: copy.programAgentReadinessAgentFailedDescription,
        variant: "danger",
        icon: TriangleAlert,
        busy: false,
      };
  }
  const exhaustive: never = status;
  return exhaustive;
}

export function CreatorReadinessNoticeV1({
  copy,
  readiness,
  surface,
  onRecover,
}: CreatorReadinessNoticePropsV1): ReactNode {
  if (readiness.status === "ready") return null;
  const content = readinessContentV1(copy, readiness.status);
  const recoveryTarget = readiness.recoveryTarget;

  return (
    <StatusV1
      className="creator-readiness"
      variant={content.variant}
      icon={content.icon}
      data-busy={content.busy}
      data-creator-readiness={readiness.status}
      data-creator-readiness-surface={surface}
      role={content.variant === "danger" ? "alert" : "status"}
      aria-live={content.variant === "danger" ? "assertive" : "polite"}
    >
      <StatusContentV1>
        <StatusTitleV1>{content.title}</StatusTitleV1>
        <StatusDescriptionV1>{content.description}</StatusDescriptionV1>
      </StatusContentV1>
      {recoveryTarget === null || onRecover === undefined ? null : (
        <StatusActionV1>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={Settings2}
            onClick={() => onRecover(recoveryTarget)}
          >
            {recoveryTarget === "credential_vault"
              ? copy.programAgentReadinessOpenVault
              : copy.programAgentReadinessOpenProviders}
          </Button>
        </StatusActionV1>
      )}
    </StatusV1>
  );
}

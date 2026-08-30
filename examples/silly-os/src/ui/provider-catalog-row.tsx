// SPDX-License-Identifier: MIT
import { Cloud, Globe2 } from "lucide-react";
import { forwardRef, type MouseEventHandler, type ReactNode, type Ref } from "react";

import { cnV1 } from "./design-system/utils.ts";

interface ProviderCatalogRowPropsV1 {
  readonly kind: "builtin" | "custom";
  readonly label: string;
  readonly detail: string;
  readonly status?: ReactNode;
  readonly facts: string;
  readonly active: boolean;
  readonly className?: string;
  readonly onClick?: MouseEventHandler<HTMLButtonElement>;
  readonly "data-provider-id"?: string;
  readonly "data-custom-profile-id"?: string;
  readonly "data-credential-status"?: string;
  readonly "data-connection-status"?: string;
}

/** Product-specific master-list row for built-in and custom Provider records. */
export const ProviderCatalogRowV1 = forwardRef(function ProviderCatalogRowV1(
  {
    kind,
    label,
    detail,
    status,
    facts,
    active,
    className,
    onClick,
    "data-provider-id": providerId,
    "data-custom-profile-id": customProfileId,
    "data-credential-status": credentialStatus,
    "data-connection-status": connectionStatus,
  }: ProviderCatalogRowPropsV1,
  ref: Ref<HTMLButtonElement>,
): ReactNode {
  const Icon = kind === "builtin" ? Cloud : Globe2;
  return (
    <button
      ref={ref}
      type="button"
      className={cnV1(active && "is-active", className)}
      aria-current={active ? "page" : undefined}
      data-provider-id={providerId}
      data-custom-profile-id={customProfileId}
      data-credential-status={credentialStatus}
      data-connection-status={connectionStatus}
      onClick={onClick}
    >
      <span
        className={cnV1("provider-settings__provider-mark", kind === "custom" && "is-custom")}
        aria-hidden="true"
      >
        <Icon size={16} />
      </span>
      <span className="provider-settings__provider-copy">
        <strong title={label}>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className="provider-settings__provider-meta">
        {status}
        <small>{facts}</small>
      </span>
    </button>
  );
});

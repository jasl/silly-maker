// SPDX-License-Identifier: MIT
/**
 * Multi-instance lease banner: when this window is not the save writer,
 * a persistent strip explains the role and offers a manual takeover.
 * Driven by the composed `instanceLease` port; owner/unavailable render nothing.
 */
import { useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";

import { Button } from "../primitives/button.tsx";
import styles from "./instance-lease-banner.module.css";

export type InstanceLeaseBannerRoleV1 = "waiting" | "read_only" | "lost";

export interface InstanceLeaseBannerStateV1 {
  readonly role: "owner" | "waiting" | "read_only" | "lost" | "unavailable";
}

export interface InstanceLeaseBannerPortV1 {
  readonly state: {
    getCurrent(): InstanceLeaseBannerStateV1;
    subscribe(listener: () => void): () => void;
  };
  takeOver(): Promise<unknown>;
}

export interface InstanceLeaseBannerLabelsV1 {
  readonly lostText: string;
  readonly waitingText: string;
  readonly readOnlyText: string;
  readonly takeOverLabel: string;
  readonly takeOverBusyLabel: string;
}

export const defaultInstanceLeaseBannerLabelsV1: InstanceLeaseBannerLabelsV1 = Object.freeze({
  lostText: "存档已被另一个游戏窗口接管——本窗口已停止写档。",
  waitingText: "等待另一个游戏窗口退出——本窗口暂为只读。",
  readOnlyText: "另一个游戏窗口正在写档——本窗口为只读。",
  takeOverLabel: "接管",
  takeOverBusyLabel: "接管中…",
});

export interface InstanceLeaseBannerPropsV1 {
  readonly port: InstanceLeaseBannerPortV1;
  readonly portalTarget: Element;
  readonly labels?: Partial<InstanceLeaseBannerLabelsV1>;
}

function bannerMessageV1(
  role: InstanceLeaseBannerRoleV1,
  labels: InstanceLeaseBannerLabelsV1,
): string {
  switch (role) {
    case "lost":
      return labels.lostText;
    case "waiting":
      return labels.waitingText;
    case "read_only":
      return labels.readOnlyText;
    default: {
      const exhaustive: never = role;
      return exhaustive;
    }
  }
}

export function InstanceLeaseBannerV1(props: InstanceLeaseBannerPropsV1): ReactElement | null {
  const labels = { ...defaultInstanceLeaseBannerLabelsV1, ...props.labels };
  const state = useSyncExternalStore(
    props.port.state.subscribe,
    props.port.state.getCurrent,
    props.port.state.getCurrent,
  );
  const [busy, setBusy] = useState(false);
  if (state.role === "owner" || state.role === "unavailable") return null;
  const role = state.role;
  return createPortal(
    <div
      className={styles["instance-lease-banner"]}
      data-instance-lease-banner={role}
    >
      <div className={styles["instance-lease-banner__card"]} role="status">
        <span>{bannerMessageV1(role, labels)}</span>
        <Button
          data-instance-lease-take-over="true"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void props.port
              .takeOver()
              .catch(() => undefined)
              .finally(() => setBusy(false));
          }}
        >
          {busy ? labels.takeOverBusyLabel : labels.takeOverLabel}
        </Button>
      </div>
    </div>,
    props.portalTarget,
  );
}

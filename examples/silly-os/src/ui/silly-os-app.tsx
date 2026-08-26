// SPDX-License-Identifier: MIT
import { type ReactNode, useState, useSyncExternalStore } from "react";

import { getSillyOsCopyV1, resolveSillyOsCopyV1, type SillyOsLocaleV1 } from "../content/copy.ts";
import { createCreatorSessionV1 } from "../product/creator-session.ts";
import { createDeterministicFakeCreatorV1 } from "../product/fake-creator.ts";
import { CreatorHomeV1 } from "./creator-home.tsx";
import { ProgramWorkspaceV1 } from "./program-workspace.tsx";
import "./silly-os.css";

export interface SillyOsAppPropsV1 {
  readonly reportFailure: (code: string, error: unknown) => void;
}

export function SillyOsAppV1({ reportFailure }: SillyOsAppPropsV1): ReactNode {
  const [session] = useState(() =>
    createCreatorSessionV1({ creator: createDeterministicFakeCreatorV1() })
  );
  const initialCopy = resolveSillyOsCopyV1();
  const [locale, setLocale] = useState<SillyOsLocaleV1>(initialCopy.locale);
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const copy = getSillyOsCopyV1(locale);

  const changeLocaleV1 = (next: SillyOsLocaleV1): void => {
    setLocale(next);
    const url = new URL(location.href);
    url.searchParams.set("locale", next);
    history.replaceState(history.state, "", url);
  };

  return (
    <div className="silly-os" lang={locale} data-locale={locale}>
      {snapshot.route === "home"
        ? (
          <CreatorHomeV1
            copy={copy}
            onLocaleChange={changeLocaleV1}
            onCreate={(intent, resourceNames) => {
              const result = session.submitIntent(intent);
              if (result.kind !== "created") {
                reportFailure("silly_os.creator_intent_rejected", result.reason);
                return;
              }
              if (resourceNames.length > 0) {
                const resourceSummary = locale === "zh-CN"
                  ? `已添加这些附件名称：${
                    resourceNames.join("、")
                  }。文件内容尚未发送给 Agent Host。`
                  : `Added these attachment names: ${
                    resourceNames.join(", ")
                  }. File contents were not sent to an Agent Host.`;
                session.sendFollowUp(resourceSummary);
              }
            }}
          />
        )
        : (
          <ProgramWorkspaceV1
            key={snapshot.workspace?.workspaceId}
            copy={copy}
            snapshot={snapshot}
            onHome={() => session.openHome()}
            onLocaleChange={changeLocaleV1}
            onAccept={() => {
              const proposal = snapshot.proposal;
              if (proposal === null) {
                reportFailure("silly_os.proposal_unavailable", proposal);
                return;
              }
              const result = session.acceptProposal(proposal);
              if (result.kind === "unavailable" || result.kind === "stale") {
                reportFailure(
                  result.kind === "stale"
                    ? "silly_os.proposal_stale"
                    : "silly_os.proposal_unavailable",
                  result,
                );
              }
            }}
            onReject={() => {
              const proposal = snapshot.proposal;
              if (proposal === null) {
                reportFailure("silly_os.proposal_unavailable", proposal);
                return;
              }
              const result = session.rejectProposal(proposal);
              if (result.kind === "unavailable" || result.kind === "stale") {
                reportFailure(
                  result.kind === "stale"
                    ? "silly_os.proposal_stale"
                    : "silly_os.proposal_unavailable",
                  result,
                );
              }
            }}
            onSend={(text) => {
              const result = session.sendFollowUp(text);
              if (result.kind !== "sent") {
                reportFailure("silly_os.follow_up_rejected", result);
              }
            }}
          />
        )}
    </div>
  );
}

// SPDX-License-Identifier: MIT
import { ArrowLeft, CircleCheck, LayoutGrid, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

import type { SillyOsCopyV1, SillyOsLocaleV1 } from "../content/copy.ts";
import type { SillyOsThemeModeV1 } from "../product/browser-product-preferences-repository.ts";
import { IconButtonV1 } from "./design-system/button.tsx";
import { SillyOsBrandV1 } from "./product-chrome.tsx";
import { ProductMenuV1 } from "./product-menu.tsx";

export type WorkspaceMobilePaneV1 = "chat" | "preview" | "activity";

export function ProgramWorkspaceTopbarV1({
  copy,
  workspaceTitle,
  homeDisabled = false,
  onHome,
  onLocaleChange,
  theme,
  onThemeChange,
  onOpenSettings,
}: {
  readonly copy: SillyOsCopyV1;
  readonly workspaceTitle: string;
  readonly homeDisabled?: boolean;
  readonly onHome: () => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly theme: SillyOsThemeModeV1;
  readonly onThemeChange: (theme: SillyOsThemeModeV1) => void;
  readonly onOpenSettings?: () => void;
}): ReactNode {
  return (
    <header className="silly-os-topbar program-workspace__topbar">
      <div className="program-workspace__topbar-leading">
        <IconButtonV1
          variant="ghost"
          size="sm"
          icon={ArrowLeft}
          accessibleName={copy.home}
          disabled={homeDisabled}
          onClick={onHome}
        />
        <SillyOsBrandV1 copy={copy} />
        <span className="program-workspace__crumb" aria-hidden="true">/</span>
        <span className="program-workspace__title">{workspaceTitle}</span>
      </div>
      <div className="program-workspace__topbar-actions">
        <ProductMenuV1
          copy={copy}
          theme={theme}
          surface="workspace"
          onThemeChange={onThemeChange}
          onLocaleChange={onLocaleChange}
          {...(onOpenSettings === undefined ? {} : { onOpenSettings })}
        />
      </div>
    </header>
  );
}

export function ProgramWorkspaceMobileNavV1({
  copy,
  activePane,
  onChat,
  onPreview,
  onActivity,
}: {
  readonly copy: SillyOsCopyV1;
  readonly activePane: WorkspaceMobilePaneV1;
  readonly onChat: () => void;
  readonly onPreview: () => void;
  readonly onActivity: () => void;
}): ReactNode {
  return (
    <nav className="program-workspace__mobile-nav" aria-label={copy.mobileNavigation}>
      <button
        type="button"
        className={activePane === "chat" ? "is-active" : undefined}
        aria-pressed={activePane === "chat"}
        onClick={onChat}
      >
        <MessageCircle size={18} aria-hidden="true" />
        {copy.chat}
      </button>
      <button
        type="button"
        className={activePane === "preview" ? "is-active" : undefined}
        aria-pressed={activePane === "preview"}
        onClick={onPreview}
      >
        <LayoutGrid size={18} aria-hidden="true" />
        {copy.previewTab}
      </button>
      <button
        type="button"
        className={activePane === "activity" ? "is-active" : undefined}
        aria-pressed={activePane === "activity"}
        onClick={onActivity}
      >
        <CircleCheck size={18} aria-hidden="true" />
        {copy.activityTab}
      </button>
    </nav>
  );
}

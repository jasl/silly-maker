// SPDX-License-Identifier: MIT
import { Boxes, Globe2, Laptop, Moon, Settings, Sun } from "lucide-react";
import { type ReactNode } from "react";

import {
  sillyOsLocaleRegistryV1,
  type SillyOsCopyV1,
  type SillyOsLocaleV1,
} from "../content/copy.ts";
import { type SillyOsThemeModeV1 } from "../application/preferences/browser-product-preferences-repository.ts";
import { IconButtonV1 } from "./design-system/button.tsx";
import {
  DropdownMenuContentV1,
  DropdownMenuItemV1,
  DropdownMenuLabelV1,
  DropdownMenuRadioGroupV1,
  DropdownMenuRadioItemV1,
  DropdownMenuSeparatorV1,
  DropdownMenuSubContentV1,
  DropdownMenuSubTriggerV1,
  DropdownMenuSubV1,
  DropdownMenuTriggerV1,
  DropdownMenuV1,
} from "./design-system/dropdown-menu.tsx";

export type ProductMenuSurfaceV1 = "home" | "workspace" | "settings";

export interface ProductMenuPropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly theme: SillyOsThemeModeV1;
  readonly surface: ProductMenuSurfaceV1;
  readonly onThemeChange: (theme: SillyOsThemeModeV1) => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly onOpenSettings?: () => void;
  readonly onOpenProgramLibrary?: () => void;
}

const themeChoicesV1 = [
  { value: "system" as const, icon: Laptop, label: (copy: SillyOsCopyV1) => copy.themeSystem },
  { value: "light" as const, icon: Sun, label: (copy: SillyOsCopyV1) => copy.themeLight },
  { value: "dark" as const, icon: Moon, label: (copy: SillyOsCopyV1) => copy.themeDark },
] as const;

/** One reusable product entry for theme, locale, and Settings navigation. */
export function ProductMenuV1({
  copy,
  theme,
  surface,
  onThemeChange,
  onLocaleChange,
  onOpenSettings,
  onOpenProgramLibrary,
}: ProductMenuPropsV1): ReactNode {
  return (
    <DropdownMenuV1>
      <DropdownMenuTriggerV1 asChild>
        <IconButtonV1
          className="silly-os-product-menu__trigger"
          variant="ghost"
          size="base"
          icon={Settings}
          accessibleName={copy.productMenu}
          data-open-settings={surface}
        />
      </DropdownMenuTriggerV1>
      <DropdownMenuContentV1 align="end" aria-label={copy.productMenu}>
        <DropdownMenuLabelV1>{copy.productName}</DropdownMenuLabelV1>
        <DropdownMenuSeparatorV1 />
        <DropdownMenuSubV1>
          <DropdownMenuSubTriggerV1>
            {theme === "dark"
              ? <Moon className="sos:size-4" aria-hidden="true" />
              : theme === "light"
              ? <Sun className="sos:size-4" aria-hidden="true" />
              : <Laptop className="sos:size-4" aria-hidden="true" />}
            <span>{copy.settingsTheme}</span>
          </DropdownMenuSubTriggerV1>
          <DropdownMenuSubContentV1>
            <DropdownMenuRadioGroupV1 value={theme}>
              {themeChoicesV1.map((choice) => {
                const Icon = choice.icon;
                return (
                  <DropdownMenuRadioItemV1
                    key={choice.value}
                    value={choice.value}
                    onSelect={() => onThemeChange(choice.value)}
                  >
                    <Icon className="sos:size-4" aria-hidden="true" />
                    {choice.label(copy)}
                  </DropdownMenuRadioItemV1>
                );
              })}
            </DropdownMenuRadioGroupV1>
          </DropdownMenuSubContentV1>
        </DropdownMenuSubV1>
        <DropdownMenuSubV1>
          <DropdownMenuSubTriggerV1>
            <Globe2 className="sos:size-4" aria-hidden="true" />
            <span>{copy.settingsLanguage}</span>
          </DropdownMenuSubTriggerV1>
          <DropdownMenuSubContentV1>
            <DropdownMenuRadioGroupV1 value={copy.locale}>
              {sillyOsLocaleRegistryV1.map((locale) => (
                <DropdownMenuRadioItemV1
                  key={locale.value}
                  value={locale.value}
                  onSelect={() => onLocaleChange(locale.value)}
                >
                  {locale.label}
                </DropdownMenuRadioItemV1>
              ))}
            </DropdownMenuRadioGroupV1>
          </DropdownMenuSubContentV1>
        </DropdownMenuSubV1>
        <DropdownMenuSeparatorV1 />
        {onOpenProgramLibrary === undefined ? null : (
          <DropdownMenuItemV1
            onSelect={() => setTimeout(onOpenProgramLibrary, 0)}
          >
            <Boxes className="sos:size-4" aria-hidden="true" />
            <span>{copy.home}</span>
          </DropdownMenuItemV1>
        )}
        <DropdownMenuItemV1
          disabled={surface === "settings" || onOpenSettings === undefined}
          aria-current={surface === "settings" ? "page" : undefined}
          onSelect={() => {
            if (onOpenSettings === undefined || surface === "settings") return;
            setTimeout(onOpenSettings, 0);
          }}
        >
          <Settings className="sos:size-4" aria-hidden="true" />
          <span>{copy.settings}</span>
        </DropdownMenuItemV1>
      </DropdownMenuContentV1>
    </DropdownMenuV1>
  );
}

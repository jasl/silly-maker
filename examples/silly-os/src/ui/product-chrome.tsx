// SPDX-License-Identifier: MIT
import { ChevronDown, Globe2 } from "lucide-react";
import type { ReactNode } from "react";

import {
  type SillyOsCopyV1,
  type SillyOsLocaleV1,
  sillyOsLocaleRegistryV1,
} from "../content/copy.ts";

export function SillyOsMarkV1(): ReactNode {
  return (
    <span className="silly-os-mark" aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

export function SillyOsBrandV1({ copy }: { readonly copy: SillyOsCopyV1 }): ReactNode {
  return (
    <span className="silly-os-brand">
      <SillyOsMarkV1 />
      <span className="silly-os-brand__name">{copy.productName}</span>
    </span>
  );
}

export function LocaleSelectV1({
  copy,
  onChange,
}: {
  readonly copy: SillyOsCopyV1;
  readonly onChange: (locale: SillyOsLocaleV1) => void;
}): ReactNode {
  return (
    <label className="silly-os-locale">
      <Globe2 className="silly-os-locale__globe" size={15} aria-hidden="true" />
      <span className="silly-os-visually-hidden">{copy.settingsLanguage}</span>
      <select
        aria-label={copy.settingsLanguage}
        value={copy.locale}
        onChange={(event) => {
          const selected = sillyOsLocaleRegistryV1.find((locale) =>
            locale.value === event.currentTarget.value
          );
          if (selected !== undefined) onChange(selected.value);
        }}
      >
        {sillyOsLocaleRegistryV1.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronDown className="silly-os-locale__chevron" size={14} aria-hidden="true" />
    </label>
  );
}

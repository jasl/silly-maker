// SPDX-License-Identifier: MIT
import { Globe2 } from "lucide-react";
import type { ReactNode } from "react";

import type { SillyOsCopyV1, SillyOsLocaleV1 } from "../content/copy.ts";
import { SillyButtonV1 as Button } from "./controls.tsx";

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

export function LocaleSwitchV1({
  copy,
  onChange,
}: {
  readonly copy: SillyOsCopyV1;
  readonly onChange: (locale: SillyOsLocaleV1) => void;
}): ReactNode {
  return (
    <div className="silly-os-locale" aria-label="Language">
      <Globe2 size={16} aria-hidden="true" />
      <Button
        className={copy.locale === "en" ? "is-active" : ""}
        size="sm"
        variant="ghost"
        aria-pressed={copy.locale === "en"}
        onClick={() => onChange("en")}
      >
        EN
      </Button>
      <Button
        className={copy.locale === "zh-CN" ? "is-active" : ""}
        size="sm"
        variant="ghost"
        aria-pressed={copy.locale === "zh-CN"}
        onClick={() => onChange("zh-CN")}
      >
        中文
      </Button>
    </div>
  );
}

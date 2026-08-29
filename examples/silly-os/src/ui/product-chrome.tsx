// SPDX-License-Identifier: MIT
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";

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
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const selectedIndex = sillyOsLocaleRegistryV1.findIndex((locale) => locale.value === copy.locale);
  const selectedLocale = selectedIndex >= 0
    ? sillyOsLocaleRegistryV1[selectedIndex]
    : sillyOsLocaleRegistryV1[0];

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointerV1 = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointerV1);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointerV1);
  }, [open]);

  const openMenuV1 = (): void => {
    triggerRef.current?.focus({ preventScroll: true });
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const selectIndexV1 = (index: number): void => {
    const locale = sillyOsLocaleRegistryV1[index];
    if (locale === undefined) return;
    onChange(locale.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDownV1 = (event: KeyboardEvent<HTMLButtonElement>): void => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openMenuV1();
        else setActiveIndex((current) => (current + 1) % sillyOsLocaleRegistryV1.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openMenuV1();
        else {
          setActiveIndex((current) =>
            (current - 1 + sillyOsLocaleRegistryV1.length) % sillyOsLocaleRegistryV1.length
          );
        }
        break;
      case "Home":
        if (!open) return;
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        if (!open) return;
        event.preventDefault();
        setActiveIndex(sillyOsLocaleRegistryV1.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) selectIndexV1(activeIndex);
        else openMenuV1();
        break;
      case "Escape":
        if (!open) return;
        event.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        if (open) setOpen(false);
        break;
    }
  };

  return (
    <div
      ref={rootRef}
      className="silly-os-locale"
      onBlur={() => {
        requestAnimationFrame(() => {
          const root = rootRef.current;
          if (root !== null && !root.contains(document.activeElement)) setOpen(false);
        });
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        className="silly-os-locale__trigger"
        aria-label={copy.settingsLanguage}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-option-${String(activeIndex)}` : undefined}
        aria-haspopup="listbox"
        data-selected-value={copy.locale}
        onClick={() => {
          if (open) setOpen(false);
          else openMenuV1();
        }}
        onKeyDown={onKeyDownV1}
      >
        <Globe2 className="silly-os-locale__globe" size={15} aria-hidden="true" />
        <span className="silly-os-locale__label">{selectedLocale?.label}</span>
        <ChevronDown className="silly-os-locale__chevron" size={14} aria-hidden="true" />
      </button>

      {open
        ? (
          <div className="silly-os-locale__popover">
            <div id={listboxId} role="listbox" aria-label={copy.settingsLanguage}>
              {sillyOsLocaleRegistryV1.map((locale, index) => (
                <button
                  key={locale.value}
                  id={`${listboxId}-option-${String(index)}`}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  className="silly-os-locale__option"
                  aria-selected={locale.value === copy.locale}
                  data-active={index === activeIndex ? "true" : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectIndexV1(index)}
                >
                  <span>{locale.label}</span>
                  <Check size={15} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )
        : null}
    </div>
  );
}

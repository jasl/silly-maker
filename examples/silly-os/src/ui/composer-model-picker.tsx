// SPDX-License-Identifier: MIT
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  LoaderCircle,
  Settings,
  Sparkles,
} from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";

import type { BrowserPiReasoningEffortV1 } from "../agent/browser-pi-worker-protocol.ts";
import type { SillyOsCopyV1 } from "../content/copy.ts";

export interface ComposerReasoningEffortControlV1 {
  readonly status: "ready" | "initializing" | "failed";
  readonly selectedValue: BrowserPiReasoningEffortV1;
  readonly options: readonly BrowserPiReasoningEffortV1[];
  readonly onSelect: (value: BrowserPiReasoningEffortV1) => void;
}

export interface ComposerModelControlV1 {
  readonly status: "required" | "initializing" | "ready" | "failed";
  readonly selectedValue: string | null;
  readonly options: readonly {
    readonly value: string;
    readonly modelName: string;
    readonly providerName: string;
  }[];
  readonly reasoningEffort: ComposerReasoningEffortControlV1;
  readonly onSelect: (value: string) => void;
  readonly onOpenSettings: () => void;
}

export interface ComposerModelPickerPropsV1 extends ComposerModelControlV1 {
  readonly copy: SillyOsCopyV1;
  readonly surface: "home" | "workspace";
  readonly disabled?: boolean;
}

export function ComposerModelPickerV1({
  copy,
  surface,
  disabled = false,
  status,
  selectedValue,
  options,
  reasoningEffort,
  onSelect,
  onOpenSettings,
}: ComposerModelPickerPropsV1): ReactNode {
  const [open, setOpen] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeReasoningIndex, setActiveReasoningIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reasoningTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const reasoningListboxId = useId();
  const selectedIndex = options.findIndex((option) => option.value === selectedValue);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const selectedReasoningIndex = reasoningEffort.options.indexOf(reasoningEffort.selectedValue);
  const interactionDisabled = disabled || status === "initializing" ||
    reasoningEffort.status === "initializing";
  const reasoningInteractionDisabled = interactionDisabled || reasoningEffort.status === "failed" ||
    reasoningEffort.options.length <= 1;

  useEffect(() => {
    if (!open && !reasoningOpen) return undefined;
    const closeOnOutsidePointerV1 = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
        setReasoningOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointerV1);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointerV1);
  }, [open, reasoningOpen]);

  useEffect(() => {
    if (!interactionDisabled) return;
    if (open) setOpen(false);
    if (reasoningOpen) setReasoningOpen(false);
  }, [interactionDisabled, open, reasoningOpen]);

  useEffect(() => {
    if (!reasoningInteractionDisabled || !reasoningOpen) return;
    setReasoningOpen(false);
  }, [reasoningInteractionDisabled, reasoningOpen]);

  const openPickerV1 = (): void => {
    if (interactionDisabled) return;
    // WebKit does not consistently focus buttons after a pointer click. Keep
    // focus inside the picker so the root blur fence cannot close the popover
    // immediately after it opens.
    triggerRef.current?.focus({ preventScroll: true });
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setReasoningOpen(false);
    setOpen(true);
  };

  const openReasoningPickerV1 = (): void => {
    if (reasoningInteractionDisabled) return;
    reasoningTriggerRef.current?.focus({ preventScroll: true });
    setActiveReasoningIndex(selectedReasoningIndex >= 0 ? selectedReasoningIndex : 0);
    setOpen(false);
    setReasoningOpen(true);
  };

  const selectActiveV1 = (): void => {
    const option = options[activeIndex];
    if (option === undefined) return;
    onSelect(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const openSettingsV1 = (): void => {
    setOpen(false);
    setReasoningOpen(false);
    onOpenSettings();
  };

  const onKeyDownV1 = (event: KeyboardEvent<HTMLButtonElement>): void => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          openPickerV1();
        } else if (options.length === 0) {
          settingsButtonRef.current?.focus();
        } else {
          setActiveIndex((current) => (current + 1) % options.length);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          openPickerV1();
        } else if (options.length === 0) {
          settingsButtonRef.current?.focus();
        } else {
          setActiveIndex((current) => (current - 1 + options.length) % options.length);
        }
        break;
      case "Home":
        if (!open || options.length === 0) return;
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        if (!open || options.length === 0) return;
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) selectActiveV1();
        else openPickerV1();
        break;
      case "Escape":
        if (!open) return;
        event.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        if (!open || event.shiftKey) return;
        event.preventDefault();
        settingsButtonRef.current?.focus();
        break;
    }
  };

  const selectActiveReasoningV1 = (): void => {
    const option = reasoningEffort.options[activeReasoningIndex];
    if (option === undefined) return;
    if (option !== reasoningEffort.selectedValue) reasoningEffort.onSelect(option);
    setReasoningOpen(false);
    reasoningTriggerRef.current?.focus();
  };

  const onReasoningKeyDownV1 = (event: KeyboardEvent<HTMLButtonElement>): void => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!reasoningOpen) openReasoningPickerV1();
        else if (reasoningEffort.options.length > 0) {
          setActiveReasoningIndex((current) => (current + 1) % reasoningEffort.options.length);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!reasoningOpen) openReasoningPickerV1();
        else if (reasoningEffort.options.length > 0) {
          setActiveReasoningIndex((current) =>
            (current - 1 + reasoningEffort.options.length) % reasoningEffort.options.length
          );
        }
        break;
      case "Home":
        if (!reasoningOpen || reasoningEffort.options.length === 0) return;
        event.preventDefault();
        setActiveReasoningIndex(0);
        break;
      case "End":
        if (!reasoningOpen || reasoningEffort.options.length === 0) return;
        event.preventDefault();
        setActiveReasoningIndex(reasoningEffort.options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (reasoningOpen) selectActiveReasoningV1();
        else openReasoningPickerV1();
        break;
      case "Escape":
        if (!reasoningOpen) return;
        event.preventDefault();
        setReasoningOpen(false);
        break;
    }
  };

  const reasoningLabelV1 = (effort: BrowserPiReasoningEffortV1): string => {
    switch (effort) {
      case "off":
        return copy.creatorReasoningEffortOff;
      case "minimal":
        return copy.creatorReasoningEffortMinimal;
      case "low":
        return copy.creatorReasoningEffortLow;
      case "medium":
        return copy.creatorReasoningEffortMedium;
      case "high":
        return copy.creatorReasoningEffortHigh;
      case "xhigh":
        return copy.creatorReasoningEffortXHigh;
      case "max":
        return copy.creatorReasoningEffortMax;
    }
    const exhaustive: never = effort;
    return exhaustive;
  };

  return (
    <div
      ref={rootRef}
      className="creator-composer__model-picker"
      data-creator-model-selector="true"
      data-model-picker-surface={surface}
      data-model-state={status}
      data-reasoning-state={reasoningEffort.status}
      aria-busy={status === "initializing" || reasoningEffort.status === "initializing"}
      onBlur={() => {
        requestAnimationFrame(() => {
          const root = rootRef.current;
          if (root !== null && !root.contains(document.activeElement)) {
            setOpen(false);
            setReasoningOpen(false);
          }
        });
      }}
    >
      <div className="creator-composer__model-control">
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          className="creator-composer__model-selector"
          aria-label={copy.creatorModelSelection}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && options.length > 0
            ? `${listboxId}-option-${activeIndex}`
            : undefined}
          aria-haspopup="listbox"
          data-selected-value={selectedValue ?? ""}
          disabled={interactionDisabled}
          title={status === "initializing"
            ? copy.creatorModelSwitching
            : selectedOption === undefined
            ? copy.creatorSelectModel
            : `${selectedOption.modelName} · ${selectedOption.providerName}`}
          onClick={() => {
            if (open) setOpen(false);
            else openPickerV1();
          }}
          onKeyDown={onKeyDownV1}
        >
          <span className="creator-composer__model-mark" aria-hidden="true">
            <Sparkles size={13} />
          </span>
          <span className="creator-composer__model-copy">
            <strong>{selectedOption?.modelName ?? copy.creatorSelectModel}</strong>
            {status === "initializing"
              ? <small>{copy.creatorModelSwitching}</small>
              : selectedOption !== undefined && <small>{selectedOption.providerName}</small>}
          </span>
          {status === "initializing"
            ? (
              <LoaderCircle
                className="creator-composer__model-chevron is-spinning"
                size={14}
                aria-hidden="true"
              />
            )
            : (
              <ChevronDown
                className="creator-composer__model-chevron"
                size={14}
                aria-hidden="true"
              />
            )}
        </button>
      </div>

      <div className="creator-composer__reasoning-control">
        <button
          ref={reasoningTriggerRef}
          type="button"
          role="combobox"
          className="creator-composer__reasoning-selector"
          aria-label={copy.creatorReasoningEffortSelection}
          aria-expanded={reasoningOpen}
          aria-controls={reasoningListboxId}
          aria-activedescendant={reasoningOpen && reasoningEffort.options.length > 0
            ? `${reasoningListboxId}-option-${activeReasoningIndex}`
            : undefined}
          aria-haspopup="listbox"
          data-selected-value={reasoningEffort.selectedValue}
          disabled={reasoningInteractionDisabled}
          title={reasoningEffort.status === "initializing"
            ? copy.creatorReasoningEffortSwitching
            : `${copy.creatorReasoningEffort}: ${reasoningLabelV1(reasoningEffort.selectedValue)}`}
          onClick={() => {
            if (reasoningOpen) setReasoningOpen(false);
            else openReasoningPickerV1();
          }}
          onKeyDown={onReasoningKeyDownV1}
        >
          <BrainCircuit size={14} aria-hidden="true" />
          <span>{reasoningLabelV1(reasoningEffort.selectedValue)}</span>
          {reasoningEffort.status === "initializing"
            ? <LoaderCircle className="is-spinning" size={13} aria-hidden="true" />
            : <ChevronDown size={13} aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div className="creator-composer__model-popover">
          <div id={listboxId} role="listbox" aria-label={copy.creatorModelSelection}>
            {options.map((option, index) => {
              const selected = option.value === selectedValue;
              return (
                <button
                  key={option.value}
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  className="creator-composer__model-option"
                  aria-selected={selected}
                  data-active={index === activeIndex ? "true" : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onSelect(option.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                >
                  <span className="creator-composer__model-provider-mark" aria-hidden="true">
                    {option.providerName.slice(0, 2).toLocaleUpperCase()}
                  </span>
                  <span className="creator-composer__model-option-copy">
                    <strong>{option.modelName}</strong>
                    <small>{option.providerName}</small>
                  </span>
                  <Check
                    className="creator-composer__model-check"
                    size={14}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
          {options.length === 0 && (
            <p className="creator-composer__model-empty">{copy.creatorNoConnectedModels}</p>
          )}
          <div className="creator-composer__model-divider" aria-hidden="true" />
          <button
            ref={settingsButtonRef}
            type="button"
            className="creator-composer__model-settings"
            data-model-settings-action="true"
            onClick={openSettingsV1}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                triggerRef.current?.focus();
              } else if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openSettingsV1();
              }
            }}
          >
            <Settings size={14} aria-hidden="true" />
            <span>{copy.creatorModelSettings}</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {reasoningOpen && (
        <div className="creator-composer__reasoning-popover">
          <div
            id={reasoningListboxId}
            role="listbox"
            aria-label={copy.creatorReasoningEffortSelection}
          >
            {reasoningEffort.options.map((effort, index) => {
              const selected = effort === reasoningEffort.selectedValue;
              return (
                <button
                  key={effort}
                  id={`${reasoningListboxId}-option-${index}`}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  className="creator-composer__reasoning-option"
                  aria-selected={selected}
                  data-active={index === activeReasoningIndex ? "true" : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveReasoningIndex(index)}
                  onClick={() => {
                    if (effort !== reasoningEffort.selectedValue) reasoningEffort.onSelect(effort);
                    setReasoningOpen(false);
                    reasoningTriggerRef.current?.focus();
                  }}
                >
                  <span>{reasoningLabelV1(effort)}</span>
                  <Check size={14} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

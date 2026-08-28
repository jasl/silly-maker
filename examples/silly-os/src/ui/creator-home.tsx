// SPDX-License-Identifier: MIT
import {
  ArrowRight,
  Drama,
  FileText,
  FolderOpen,
  KeyRound,
  Languages,
  Paperclip,
  PenTool,
  Settings,
  Sparkles,
} from "lucide-react";
import { type FormEvent, type ReactNode, useRef, useState } from "react";

import type { SillyOsCopyV1, SillyOsLocaleV1 } from "../content/copy.ts";
import type { PreviewProgramKindV1, ProgramProposalStatusV1 } from "../product/contracts.ts";
import { type ComposerModelControlV1, ComposerModelPickerV1 } from "./composer-model-picker.tsx";
import { SillyButtonV1 as Button } from "./controls.tsx";
import { LocaleSwitchV1, SillyOsBrandV1 } from "./product-chrome.tsx";

const promptIconsV1 = [Languages, PenTool, Drama] as const;

export interface CreatorHomePropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly onCreate: (intent: string, resourceNames: readonly string[]) => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly onOpenSettings?: () => void;
  readonly createDisabled?: boolean;
  readonly programCatalog?: {
    readonly status: "loading" | "ready" | "failed";
    readonly programs: readonly {
      readonly programId: string;
      readonly name: string;
      readonly kind: PreviewProgramKindV1;
      readonly programRevision: number;
      readonly proposalStatus: ProgramProposalStatusV1;
    }[];
    readonly openDisabled: boolean;
    readonly onOpen: (programId: string) => void;
  };
  readonly piAgentSetup?: {
    readonly runtime: "deterministic_test";
    readonly status: "loading" | "available" | "initializing" | "ready" | "failed";
    readonly onInitialize: (credential: string) => void;
  };
  readonly providerSetup?: {
    readonly status:
      | "loading"
      | "available"
      | "saving"
      | "credential_saved"
      | "testing"
      | "ready"
      | "test_failed"
      | "failed";
    readonly onOpenSettings: () => void;
  };
  readonly providerModel?: ComposerModelControlV1;
}

export function CreatorHomeV1({
  copy,
  onCreate,
  onLocaleChange,
  onOpenSettings,
  createDisabled = false,
  piAgentSetup,
  providerModel,
  providerSetup,
  programCatalog,
}: CreatorHomePropsV1): ReactNode {
  const [intent, setIntent] = useState("");
  const [resourceNames, setResourceNames] = useState<readonly string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const piAgentKeyRef = useRef<HTMLInputElement>(null);

  const programKindLabelV1 = (kind: PreviewProgramKindV1): string => {
    switch (kind) {
      case "translation":
        return copy.programKindTranslation;
      case "writing":
        return copy.programKindWriting;
      case "roleplay":
        return copy.programKindRoleplay;
      case "general":
        return copy.programKindGeneral;
    }
    const exhaustive: never = kind;
    return exhaustive;
  };

  const submitV1 = (event?: FormEvent): void => {
    event?.preventDefault();
    if (createDisabled) return;
    const normalized = intent.trim();
    if (normalized.length === 0) return;
    onCreate(normalized, resourceNames);
  };

  return (
    <main className="creator-home" data-silly-os-view="home">
      <header className="silly-os-topbar creator-home__topbar">
        <SillyOsBrandV1 copy={copy} />
        <div className="creator-home__topbar-actions">
          <LocaleSwitchV1 copy={copy} onChange={onLocaleChange} />
          {onOpenSettings !== undefined && (
            <Button
              variant="ghost"
              shape="square"
              size="sm"
              icon={Settings}
              aria-label={copy.settings}
              data-open-settings="home"
              onClick={onOpenSettings}
            />
          )}
        </div>
      </header>

      <div className="creator-home__body">
        <section className="creator-home__hero" aria-labelledby="creator-home-title">
          <div className="creator-home__agent-mark" aria-hidden="true">
            <Sparkles size={22} fill="currentColor" />
          </div>
          <p className="creator-home__kicker">{copy.creatorKicker}</p>
          <h1 id="creator-home-title">{copy.creatorTitle}</h1>
          <p className="creator-home__description">{copy.creatorDescription}</p>

          {piAgentSetup !== undefined && (
            <form
              className="pi-agent-setup"
              data-pi-agent-runtime={piAgentSetup.runtime}
              data-pi-agent-status={piAgentSetup.status}
              onSubmit={(event) => {
                event.preventDefault();
                const input = piAgentKeyRef.current;
                if (input === null || input.value.length === 0) return;
                let credential = input.value;
                input.value = "";
                piAgentSetup.onInitialize(credential);
                credential = "";
              }}
            >
              <div className="pi-agent-setup__heading">
                <KeyRound size={16} aria-hidden="true" />
                <strong>{copy.piTestTitle}</strong>
                <span>
                  {piAgentSetup.status === "ready"
                    ? copy.piTestReady
                    : piAgentSetup.status === "failed"
                    ? copy.piTestFailed
                    : piAgentSetup.status === "initializing"
                    ? copy.piTestInitializing
                    : piAgentSetup.status === "loading"
                    ? copy.piTestLoading
                    : copy.preview}
                </span>
              </div>
              <p>{copy.piTestDescription}</p>
              {piAgentSetup.status !== "ready" && (
                <div className="pi-agent-setup__controls">
                  <label htmlFor="pi-agent-key">{copy.piTestKeyLabel}</label>
                  <input
                    id="pi-agent-key"
                    ref={piAgentKeyRef}
                    type="password"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={copy.piTestKeyPlaceholder}
                    disabled={piAgentSetup.status === "loading" ||
                      piAgentSetup.status === "initializing"}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    disabled={piAgentSetup.status === "loading" ||
                      piAgentSetup.status === "initializing"}
                  >
                    {piAgentSetup.status === "initializing"
                      ? copy.piTestInitializing
                      : copy.piTestInitialize}
                  </Button>
                </div>
              )}
            </form>
          )}

          {providerSetup !== undefined && (
            <button
              type="button"
              className="pi-agent-setup pi-agent-setup--warning"
              data-pi-agent-runtime="pi_provider"
              data-pi-agent-status={providerSetup.status}
              onClick={providerSetup.onOpenSettings}
            >
              <div className="pi-agent-setup__heading">
                <KeyRound size={16} aria-hidden="true" />
                <strong>{copy.piLiveTitle}</strong>
                <span>
                  {providerSetup.status === "failed"
                    ? copy.piLiveFailed
                    : providerSetup.status === "saving"
                    ? copy.providerSaving
                    : copy.piLiveSetupRequired}
                </span>
              </div>
              <p>{copy.piLiveDescription}</p>
              <span className="pi-agent-setup__warning-action">
                {copy.settings}
                <ArrowRight size={15} aria-hidden="true" />
              </span>
            </button>
          )}

          <form className="creator-composer" onSubmit={submitV1}>
            <label className="silly-os-visually-hidden" htmlFor="creator-intent">
              {copy.creatorTitle}
            </label>
            <textarea
              id="creator-intent"
              value={intent}
              rows={4}
              maxLength={4_000}
              placeholder={copy.creatorPlaceholder}
              onChange={(event) => setIntent(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitV1();
                }
              }}
            />
            {resourceNames.length > 0 && (
              <div className="creator-composer__resources" aria-label="Selected resources">
                {resourceNames.map((name) => (
                  <span key={name}>
                    <FileText size={14} aria-hidden="true" />
                    {name}
                  </span>
                ))}
              </div>
            )}
            <div className="creator-composer__actions">
              <input
                ref={fileInputRef}
                hidden
                type="file"
                multiple
                onChange={(event) =>
                  setResourceNames(
                    Array.from(event.currentTarget.files ?? [], (file) => file.name),
                  )}
              />
              <Button
                type="button"
                variant="ghost"
                icon={Paperclip}
                className="creator-composer__resource-button"
                aria-label={copy.addResource}
                onClick={() => fileInputRef.current?.click()}
              >
                <span>{copy.addResource}</span>
              </Button>
              <div className="creator-composer__primary-actions">
                {providerModel !== undefined
                  ? <ComposerModelPickerV1 copy={copy} surface="home" {...providerModel} />
                  : null}
                <Button
                  type="submit"
                  variant="primary"
                  icon={ArrowRight}
                  disabled={createDisabled || intent.trim().length === 0}
                >
                  {copy.create}
                </Button>
              </div>
            </div>
          </form>
        </section>

        {programCatalog !== undefined && (
          <section
            className="creator-home__recent"
            aria-labelledby="recent-programs-title"
            data-program-catalog-state={programCatalog.status}
          >
            <div className="creator-home__section-heading">
              <h2 id="recent-programs-title">{copy.recentProgramsLabel}</h2>
              <span>{copy.browserLocal}</span>
            </div>
            {programCatalog.status === "loading"
              ? <p className="creator-home__catalog-state" role="status">{copy.programsLoading}</p>
              : programCatalog.status === "failed"
              ? (
                <p className="creator-home__catalog-state is-failed" role="alert">
                  {copy.programsUnavailable}
                </p>
              )
              : programCatalog.programs.length === 0
              ? <p className="creator-home__catalog-state">{copy.recentProgramsEmpty}</p>
              : (
                <div className="creator-home__program-grid">
                  {programCatalog.programs.map((program) => (
                    <button
                      type="button"
                      className="creator-home__program"
                      key={program.programId}
                      data-program-id={program.programId}
                      aria-label={`${copy.openProgram}: ${program.name}`}
                      disabled={programCatalog.openDisabled}
                      onClick={() => programCatalog.onOpen(program.programId)}
                    >
                      <span className="creator-home__program-icon" aria-hidden="true">
                        <FolderOpen size={17} />
                      </span>
                      <span className="creator-home__program-main">
                        <strong>{program.name}</strong>
                        <small>{programKindLabelV1(program.kind)}</small>
                      </span>
                      <span className="creator-home__program-meta">
                        {`v${String(program.programRevision)} · ${
                          program.proposalStatus === "pending"
                            ? copy.preview
                            : program.proposalStatus === "accepted"
                            ? copy.accepted
                            : copy.rejected
                        }`}
                      </span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
          </section>
        )}

        <section className="creator-home__ideas" aria-labelledby="starter-ideas-title">
          <div className="creator-home__section-heading">
            <h2 id="starter-ideas-title">{copy.examplesLabel}</h2>
            <span>{copy.creatorName}</span>
          </div>
          <div className="creator-home__idea-grid">
            {copy.samplePrompts.map((prompt, index) => {
              const Icon = promptIconsV1[index] ?? Sparkles;
              return (
                <button
                  type="button"
                  className="creator-home__idea"
                  key={prompt}
                  onClick={() => setIntent(prompt)}
                >
                  <span className="creator-home__idea-icon">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span>{prompt}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

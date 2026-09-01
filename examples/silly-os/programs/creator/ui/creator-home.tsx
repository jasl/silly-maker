// SPDX-License-Identifier: MIT
import {
  ArrowRight,
  Drama,
  FolderOpen,
  KeyRound,
  Languages,
  LoaderCircle,
  PenTool,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { type FormEvent, type ReactNode, useRef, useState } from "react";

import type { SillyOsLocaleV1 } from "../../../src/content/copy.ts";
import type { SillyOsThemeModeV1 } from "../../../src/application/preferences/browser-product-preferences-repository.ts";
import { isComposerCompositionKeyV1 } from "../../../src/ui/composer-keyboard.ts";
import {
  type ComposerModelControlV1,
  ComposerModelPickerV1,
} from "../../../src/ui/composer-model-picker.tsx";
import { CollectionStateV1 } from "../../../src/ui/collection-state.tsx";
import type {
  AgentReadinessRecoveryTargetV1,
  AgentReadinessV1,
} from "../../../src/ui/agent-readiness.ts";
import type { PreviewProgramKindV1, ProgramProposalStatusV1 } from "../runtime/contracts.ts";
import { CreatorReadinessNoticeV1 } from "./creator-readiness-notice.tsx";
import { ButtonV1 as Button } from "../../../src/ui/design-system/button.tsx";
import { InputV1 } from "../../../src/ui/design-system/input.tsx";
import { TextareaV1 } from "../../../src/ui/design-system/textarea.tsx";
import { SillyOsBrandV1 } from "../../../src/ui/product-chrome.tsx";
import { ProductMenuV1 } from "../../../src/ui/product-menu.tsx";
import type { CreatorProgramCopyV1 } from "./creator-program-copy.ts";
import "./creator-home.css";

const promptIconsV1 = [Languages, PenTool, Drama] as const;

export interface CreatorHomePropsV1 {
  readonly copy: CreatorProgramCopyV1;
  readonly onCreate: (intent: string) => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly theme: SillyOsThemeModeV1;
  readonly onThemeChange: (theme: SillyOsThemeModeV1) => void;
  readonly onOpenSettings?: () => void;
  readonly onOpenProgramLibrary?: () => void;
  readonly createDisabled?: boolean;
  readonly programCatalog?: {
    readonly status: "loading" | "loading_more" | "ready" | "failed";
    readonly programs: readonly {
      readonly programId: string;
      readonly name: string;
      readonly kind: PreviewProgramKindV1;
      readonly programRevision: number;
      readonly proposalStatus: ProgramProposalStatusV1;
    }[];
    readonly openDisabled: boolean;
    readonly onEdit: (programId: string) => void;
    readonly onRun?: (programId: string) => void;
    readonly hasMore: boolean;
    readonly onLoadMore: () => void;
  };
  readonly piAgentSetup?: {
    readonly runtime: "deterministic_test";
    readonly status: "loading" | "available" | "initializing" | "ready" | "failed";
    readonly onInitialize: (credential: string) => void;
  };
  readonly programAgentReadiness?: AgentReadinessV1;
  readonly onOpenCreatorSettings?: (
    target: Exclude<AgentReadinessRecoveryTargetV1, null>,
  ) => void;
  readonly providerModel?: ComposerModelControlV1;
}

export function CreatorHomeV1({
  copy,
  onCreate,
  onLocaleChange,
  theme,
  onThemeChange,
  onOpenSettings,
  onOpenProgramLibrary,
  createDisabled = false,
  piAgentSetup,
  programAgentReadiness,
  onOpenCreatorSettings,
  providerModel,
  programCatalog,
}: CreatorHomePropsV1): ReactNode {
  const [intent, setIntent] = useState("");
  const piAgentKeyRef = useRef<HTMLInputElement>(null);
  const creatorReady = programAgentReadiness === undefined ||
    programAgentReadiness.status === "ready";
  const modelSelectionAvailable = creatorReady ||
    programAgentReadiness?.status === "model_required" ||
    programAgentReadiness?.status === "agent_failed";

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
    if (createDisabled || !creatorReady) return;
    const normalized = intent.trim();
    if (normalized.length === 0) return;
    onCreate(normalized);
  };

  return (
    <main className="creator-home" data-silly-os-view="home">
      <header className="silly-os-topbar creator-home__topbar">
        <SillyOsBrandV1 copy={copy} />
        <div className="creator-home__topbar-actions">
          <ProductMenuV1
            copy={copy}
            theme={theme}
            surface="home"
            onThemeChange={onThemeChange}
            onLocaleChange={onLocaleChange}
            {...(onOpenSettings === undefined ? {} : { onOpenSettings })}
            {...(onOpenProgramLibrary === undefined ? {} : { onOpenProgramLibrary })}
          />
        </div>
      </header>

      <div className="creator-home__body">
        <section className="creator-home__hero" aria-labelledby="creator-home-title">
          <div className="creator-home__agent-mark" aria-hidden="true">
            <Sparkles size={22} fill="currentColor" />
          </div>
          <p className="creator-home__kicker">{copy.programAgentKicker}</p>
          <h1 id="creator-home-title">{copy.programAgentTitle}</h1>
          <p className="creator-home__description">{copy.programAgentDescription}</p>

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
                  <InputV1
                    id="pi-agent-key"
                    ref={piAgentKeyRef}
                    type="password"
                    controlSize="sm"
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

          {programAgentReadiness === undefined ? null : (
            <CreatorReadinessNoticeV1
              copy={copy}
              readiness={programAgentReadiness}
              surface="home"
              {...(onOpenCreatorSettings === undefined ? {} : { onRecover: onOpenCreatorSettings })}
            />
          )}

          <form className="program-agent-composer" onSubmit={submitV1}>
            <label className="silly-os-visually-hidden" htmlFor="creator-intent">
              {copy.programAgentTitle}
            </label>
            <TextareaV1
              id="creator-intent"
              value={intent}
              rows={4}
              maxLength={4_000}
              placeholder={copy.programAgentPlaceholder}
              onChange={(event) => setIntent(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (isComposerCompositionKeyV1(event.nativeEvent)) return;
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitV1();
                }
              }}
            />
            <div className="program-agent-composer__actions">
              <div className="program-agent-composer__primary-actions">
                {modelSelectionAvailable && providerModel !== undefined
                  ? <ComposerModelPickerV1 copy={copy} surface="home" {...providerModel} />
                  : null}
                <Button
                  type="submit"
                  variant="primary"
                  icon={ArrowRight}
                  disabled={createDisabled || !creatorReady || intent.trim().length === 0}
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
              ? (
                <CollectionStateV1
                  className="creator-home__catalog-state"
                  icon={LoaderCircle}
                  iconMotion="spin"
                  title={copy.programsLoading}
                  role="status"
                  aria-live="polite"
                />
              )
              : programCatalog.status === "failed"
              ? (
                <CollectionStateV1
                  className="creator-home__catalog-state"
                  icon={TriangleAlert}
                  tone="danger"
                  title={copy.programsUnavailable}
                  role="alert"
                />
              )
              : programCatalog.programs.length === 0
              ? (
                <CollectionStateV1
                  className="creator-home__catalog-state"
                  icon={FolderOpen}
                  title={copy.recentProgramsEmpty}
                />
              )
              : (
                <>
                  <div className="creator-home__program-grid">
                    {programCatalog.programs.map((program) => {
                      const runnable = program.kind === "translation" &&
                        program.proposalStatus === "accepted" &&
                        programCatalog.onRun !== undefined;
                      return (
                        <article
                          className="creator-home__program"
                          key={program.programId}
                          data-program-id={program.programId}
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
                          <span className="creator-home__program-actions">
                            {runnable && (
                              <Button
                                type="button"
                                size="sm"
                                aria-label={`${copy.runProgram}: ${program.name}`}
                                disabled={programCatalog.openDisabled}
                                onClick={() => programCatalog.onRun?.(program.programId)}
                              >
                                {copy.runProgram}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              aria-label={`${copy.editProgram}: ${program.name}`}
                              disabled={programCatalog.openDisabled}
                              onClick={() => programCatalog.onEdit(program.programId)}
                            >
                              {copy.editProgram}
                            </Button>
                          </span>
                        </article>
                      );
                    })}
                  </div>
                  {programCatalog.hasMore && (
                    <div className="creator-home__catalog-more">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-busy={programCatalog.status === "loading_more"}
                        {...(programCatalog.status === "loading_more"
                          ? { icon: LoaderCircle }
                          : {})}
                        disabled={programCatalog.openDisabled ||
                          programCatalog.status === "loading_more"}
                        onClick={programCatalog.onLoadMore}
                      >
                        {programCatalog.status === "loading_more"
                          ? copy.loadingMorePrograms
                          : copy.loadMorePrograms}
                      </Button>
                    </div>
                  )}
                </>
              )}
          </section>
        )}

        <section className="creator-home__ideas" aria-labelledby="starter-ideas-title">
          <div className="creator-home__section-heading">
            <h2 id="starter-ideas-title">{copy.examplesLabel}</h2>
            <span>{copy.programAgentName}</span>
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

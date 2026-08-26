// SPDX-License-Identifier: MIT
import {
  ArrowRight,
  Drama,
  FileText,
  KeyRound,
  Languages,
  Paperclip,
  PenTool,
  Sparkles,
} from "lucide-react";
import { type FormEvent, type ReactNode, useRef, useState } from "react";

import type { BrowserPiWorkerRuntimeV1 } from "../agent/browser-pi-worker-protocol.ts";
import type { SillyOsCopyV1, SillyOsLocaleV1 } from "../content/copy.ts";
import { SillyButtonV1 as Button } from "./controls.tsx";
import { LocaleSwitchV1, SillyOsBrandV1 } from "./product-chrome.tsx";

const promptIconsV1 = [Languages, PenTool, Drama] as const;

export interface CreatorHomePropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly onCreate: (intent: string, resourceNames: readonly string[]) => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
  readonly createDisabled?: boolean;
  readonly piAgentSetup?: {
    readonly runtime: BrowserPiWorkerRuntimeV1;
    readonly status: "loading" | "available" | "initializing" | "ready" | "failed";
    readonly onInitialize: (credential: string) => void;
  };
}

export function CreatorHomeV1({
  copy,
  onCreate,
  onLocaleChange,
  createDisabled = false,
  piAgentSetup,
}: CreatorHomePropsV1): ReactNode {
  const [intent, setIntent] = useState("");
  const [resourceNames, setResourceNames] = useState<readonly string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const piAgentKeyRef = useRef<HTMLInputElement>(null);
  const liveAgent = piAgentSetup?.runtime === "openai_direct";
  const agentTitle = liveAgent ? copy.piLiveTitle : copy.piTestTitle;
  const agentDescription = liveAgent ? copy.piLiveDescription : copy.piTestDescription;
  const agentKeyLabel = liveAgent ? copy.piLiveKeyLabel : copy.piTestKeyLabel;
  const agentKeyPlaceholder = liveAgent ? copy.piLiveKeyPlaceholder : copy.piTestKeyPlaceholder;
  const agentInitialize = liveAgent ? copy.piLiveInitialize : copy.piTestInitialize;
  const agentReady = liveAgent ? copy.piLiveReady : copy.piTestReady;
  const agentFailed = liveAgent ? copy.piLiveFailed : copy.piTestFailed;

  const submitV1 = (event?: FormEvent): void => {
    event?.preventDefault();
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
                <strong>{agentTitle}</strong>
                <span>
                  {piAgentSetup.status === "ready"
                    ? agentReady
                    : piAgentSetup.status === "failed"
                    ? agentFailed
                    : piAgentSetup.status === "initializing"
                    ? copy.piTestInitializing
                    : piAgentSetup.status === "loading"
                    ? copy.piTestLoading
                    : copy.preview}
                </span>
              </div>
              <p>{agentDescription}</p>
              {piAgentSetup.status !== "ready" && (
                <div className="pi-agent-setup__controls">
                  <label htmlFor="pi-agent-key">{agentKeyLabel}</label>
                  <input
                    id="pi-agent-key"
                    ref={piAgentKeyRef}
                    type="password"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={agentKeyPlaceholder}
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
                      : agentInitialize}
                  </Button>
                </div>
              )}
            </form>
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
                onClick={() => fileInputRef.current?.click()}
              >
                {copy.addResource}
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={ArrowRight}
                disabled={createDisabled || intent.trim().length === 0}
              >
                {copy.create}
              </Button>
            </div>
          </form>
        </section>

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

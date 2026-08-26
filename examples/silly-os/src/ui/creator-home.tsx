// SPDX-License-Identifier: MIT
import { ArrowRight, Drama, FileText, Languages, Paperclip, PenTool, Sparkles } from "lucide-react";
import { type FormEvent, type ReactNode, useRef, useState } from "react";

import type { SillyOsCopyV1, SillyOsLocaleV1 } from "../content/copy.ts";
import { SillyButtonV1 as Button } from "./controls.tsx";
import { LocaleSwitchV1, SillyOsBrandV1 } from "./product-chrome.tsx";

const promptIconsV1 = [Languages, PenTool, Drama] as const;

export interface CreatorHomePropsV1 {
  readonly copy: SillyOsCopyV1;
  readonly onCreate: (intent: string, resourceNames: readonly string[]) => void;
  readonly onLocaleChange: (locale: SillyOsLocaleV1) => void;
}

export function CreatorHomeV1({
  copy,
  onCreate,
  onLocaleChange,
}: CreatorHomePropsV1): ReactNode {
  const [intent, setIntent] = useState("");
  const [resourceNames, setResourceNames] = useState<readonly string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
                disabled={intent.trim().length === 0}
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

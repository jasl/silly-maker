// SPDX-License-Identifier: MIT
import { useEffect } from "react";
import type { ReactElement } from "react";

/**
 * The boot splash: the brief front card games show before the title
 * screen (studio marks, legal lines — here typically an AI-generation
 * notice). Purely presentational: it auto-dismisses after a short beat
 * and any click, Enter, or Space skips it immediately.
 */

export interface BootSplashDefinitionV1 {
  /** Centered lines, first line largest. */
  readonly lines: readonly string[];
  /** Auto-dismiss delay; defaults to 2400ms. */
  readonly durationMs?: number;
}

export function BootSplashV1(props: {
  readonly splash: BootSplashDefinitionV1;
  onDismiss(): void;
}): ReactElement {
  const { onDismiss } = props;
  const durationMs = props.splash.durationMs ?? 2400;
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);
  return (
    <section
      data-boot-splash="true"
      role="dialog"
      aria-label={props.splash.lines[0] ?? ""}
      tabIndex={0}
      onClick={onDismiss}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " " || event.key === "Escape") onDismiss();
      }}
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeContent: "center",
        gap: "10px",
        textAlign: "center",
        backgroundColor: "#0a0c10",
        color: "#f2efe8",
        zIndex: "var(--silly-surface-z-splash)",
        pointerEvents: "auto",
        cursor: "pointer",
      }}
    >
      {props.splash.lines.map((line, index) => (
        <p
          key={line}
          style={{
            margin: 0,
            fontSize: index === 0 ? "clamp(18px, 3vw, 28px)" : "clamp(12px, 1.8vw, 16px)",
            opacity: index === 0 ? 1 : 0.72,
          }}
        >
          {line}
        </p>
      ))}
    </section>
  );
}

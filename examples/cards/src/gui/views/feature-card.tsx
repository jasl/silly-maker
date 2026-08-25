// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactElement } from "react";
import type { CodeSurfaceViewPropsV1 } from "@sillymaker/ui/code-surface";

import type { CardsCodeSurfaceContextV1, FeatureCardPropsV1 } from "../catalog.ts";
import { useCardsScreenSessionV1 } from "../cards-context.ts";

export default function FeatureCardV1(
  input: CodeSurfaceViewPropsV1<CardsCodeSurfaceContextV1, FeatureCardPropsV1, never>,
): ReactElement {
  const [button, setButton] = useState<HTMLButtonElement | null>(null);
  const session = useCardsScreenSessionV1();
  const { registerCard } = session;
  const { accent, caption, cardId, detail, order, title } = input.props;
  const open = session.openOrder === order;
  const focused = session.focusedOrder === order;
  const detailId = `cards-detail-${cardId}`;

  useEffect(() => {
    if (button === null) return undefined;
    return registerCard(order, button);
  }, [button, order, registerCard]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.code === "ArrowLeft" || event.code === "ArrowUp") {
      event.preventDefault();
      session.moveFocus(-1);
    } else if (event.code === "ArrowRight" || event.code === "ArrowDown") {
      event.preventDefault();
      session.moveFocus(1);
    } else if (event.code === "KeyZ") {
      event.preventDefault();
      session.toggleCard(order);
    }
  };

  return (
    <div className="cards-card-shell">
      <button
        ref={setButton}
        type="button"
        className={`cards-card cards-card--${accent}`}
        style={{ "--cards-column": order + 1 } as CSSProperties}
        data-card-id={cardId}
        data-card-focused={focused ? "true" : "false"}
        aria-expanded={open}
        aria-controls={detailId}
        onFocus={() => session.focusCard(order)}
        onBlur={(event) => {
          const grid = event.currentTarget.closest(".cards-grid");
          if (grid?.contains(event.relatedTarget) !== true) session.clearFocus(order);
        }}
        onClick={() => {
          session.focusCard(order);
          session.toggleCard(order);
        }}
        onKeyDown={onKeyDown}
      >
        <span className="cards-card__accent" aria-hidden="true" />
        <span className="cards-card__title">{title}</span>
        <span className="cards-card__caption">{caption}</span>
        <span className="cards-card__signal" aria-hidden="true">↗</span>
      </button>

      {open
        ? (
          <div
            id={detailId}
            key={cardId}
            className={`cards-detail cards-detail--${accent}`}
            style={{ "--cards-column": order + 1 } as CSSProperties}
            role="status"
            aria-live="polite"
          >
            <span className="cards-detail__bar" aria-hidden="true" />
            <div>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
          </div>
        )
        : null}
    </div>
  );
}

// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { inputHandledV1, inputIgnoredV1, useInputRouterV1 } from "@sillymaker/ui/input";
import type { CodeSurfaceViewPropsV1 } from "@sillymaker/ui/code-surface";

import type { CardsCodeSurfaceContextV1, CardsScreenPropsV1 } from "../catalog.ts";
import { CardsScreenContextV1 } from "../cards-context.ts";
import type { CardsScreenSessionV1 } from "../cards-context.ts";
import {
  cardsActivateActionV1,
  cardsFocusNextActionV1,
  cardsFocusPreviousActionV1,
} from "../input.ts";
import "../cards.css";

export default function CardsScreenV1(
  input: CodeSurfaceViewPropsV1<CardsCodeSurfaceContextV1, CardsScreenPropsV1, "cards">,
): ReactElement {
  const [focusedOrder, setFocusedOrder] = useState<number | null>(null);
  const [openOrder, setOpenOrder] = useState<number | null>(null);
  const focusedOrderRef = useRef<number | null>(null);
  const cardElementsRef = useRef(new Map<number, HTMLButtonElement>());
  const inputRouter = useInputRouterV1();

  const updateFocusedOrder = useCallback((order: number | null): void => {
    focusedOrderRef.current = order;
    setFocusedOrder(order);
  }, []);

  const registerCard = useCallback((order: number, element: HTMLButtonElement): () => void => {
    cardElementsRef.current.set(order, element);
    return () => {
      if (cardElementsRef.current.get(order) === element) {
        cardElementsRef.current.delete(order);
      }
    };
  }, []);

  const focusCard = useCallback((order: number): void => {
    const element = cardElementsRef.current.get(order);
    if (element === undefined) return;
    updateFocusedOrder(order);
    element.focus();
  }, [updateFocusedOrder]);

  const clearFocus = useCallback((order: number): void => {
    if (focusedOrderRef.current === order) updateFocusedOrder(null);
  }, [updateFocusedOrder]);

  const moveFocus = useCallback((delta: -1 | 1): void => {
    const orders = [...cardElementsRef.current.keys()].sort((left, right) => left - right);
    if (orders.length === 0) return;
    const current = focusedOrderRef.current;
    const currentIndex = current === null ? -1 : orders.indexOf(current);
    const nextIndex = current === null
      ? (delta === 1 ? 0 : orders.length - 1)
      : Math.min(Math.max(currentIndex + delta, 0), orders.length - 1);
    const nextOrder = orders[nextIndex];
    if (nextOrder !== undefined) focusCard(nextOrder);
  }, [focusCard]);

  const toggleCard = useCallback((order: number): void => {
    setOpenOrder((current) => current === order ? null : order);
  }, []);

  const activateFocused = useCallback((): void => {
    const current = focusedOrderRef.current;
    if (current !== null) toggleCard(current);
  }, [toggleCard]);

  const session = useMemo<CardsScreenSessionV1>(() => ({
    focusedOrder,
    openOrder,
    registerCard,
    focusCard,
    clearFocus,
    moveFocus,
    toggleCard,
    activateFocused,
  }), [
    activateFocused,
    clearFocus,
    focusCard,
    focusedOrder,
    moveFocus,
    openOrder,
    registerCard,
    toggleCard,
  ]);

  useEffect(() =>
    inputRouter.register({
      context: "interaction",
      handle: (event) => {
        if (event.kind !== "action") return inputIgnoredV1;
        if (event.actionId === cardsFocusPreviousActionV1) moveFocus(-1);
        else if (event.actionId === cardsFocusNextActionV1) moveFocus(1);
        else if (event.actionId === cardsActivateActionV1) activateFocused();
        else return inputIgnoredV1;
        return inputHandledV1;
      },
    }), [activateFocused, inputRouter, moveFocus]);

  return (
    <CardsScreenContextV1.Provider value={session}>
      <main
        className="cards-screen"
        data-cards-product="ready"
        data-cards-focused={focusedOrder ?? "none"}
        data-cards-open={openOrder ?? "none"}
      >
        <header className="cards-header">
          <div>
            <p className="cards-eyebrow">{input.props.eyebrow}</p>
            <h1>{input.props.title}</h1>
          </div>
          <p className="cards-count">{input.props.moduleCountLabel}</p>
        </header>

        <section className="cards-grid" aria-label="SillyMaker capability modules">
          <div className="cards-streak cards-streak--a" aria-hidden="true" />
          <div className="cards-streak cards-streak--b" aria-hidden="true" />
          {input.slots.cards}
        </section>

        <footer className="cards-help">{input.props.helpText}</footer>
      </main>
    </CardsScreenContextV1.Provider>
  );
}

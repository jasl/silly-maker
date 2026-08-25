// SPDX-License-Identifier: MIT
import { createContext, useContext } from "react";

export interface CardsScreenSessionV1 {
  readonly focusedOrder: number | null;
  readonly openOrder: number | null;
  registerCard(order: number, element: HTMLButtonElement): () => void;
  focusCard(order: number): void;
  clearFocus(order: number): void;
  moveFocus(delta: -1 | 1): void;
  toggleCard(order: number): void;
  activateFocused(): void;
}

export const CardsScreenContextV1 = createContext<CardsScreenSessionV1 | null>(null);

export function useCardsScreenSessionV1(): CardsScreenSessionV1 {
  const session = useContext(CardsScreenContextV1);
  if (session === null) throw new Error("cards.screen_session_missing");
  return session;
}

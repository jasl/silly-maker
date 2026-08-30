// SPDX-License-Identifier: MIT
import { createContext, useContext } from "react";
import type { HomeConsoleRoutePropsV1 } from "./home-console-catalog.ts";

export interface HomeConsoleSessionV1 {
  readonly selectedRouteId: string | null;
  readonly routes: ReadonlyMap<string, HomeConsoleRoutePropsV1>;
  registerRoute(
    routeId: string,
    route: HomeConsoleRoutePropsV1,
    element: HTMLAnchorElement,
  ): () => void;
  selectRoute(routeId: string, focus?: boolean): void;
  moveSelection(delta: -1 | 1): void;
}

export const HomeConsoleSessionContextV1 = createContext<HomeConsoleSessionV1 | null>(null);

export function useHomeConsoleSessionV1(): HomeConsoleSessionV1 {
  const session = useContext(HomeConsoleSessionContextV1);
  if (session === null) throw new Error("website.home_console_session_missing");
  return session;
}

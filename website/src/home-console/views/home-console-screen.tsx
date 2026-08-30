// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import type { CodeSurfaceViewPropsV1 } from "@sillymaker/ui/code-surface";
import {
  inputHandledV1,
  inputIgnoredV1,
  parseInputActionIdV1,
  useInputRouterV1,
} from "@sillymaker/ui/input";

import type {
  HomeConsoleRoutePropsV1,
  HomeConsoleScreenPropsV1,
  WebsiteHomeConsoleContextV1,
} from "../home-console-catalog.ts";
import {
  HomeConsoleSessionContextV1,
  type HomeConsoleSessionV1,
} from "../home-console-context.tsx";
import "../home-console.css";

const previousActionV1 = parseInputActionIdV1("website.home-console.previous");
const nextActionV1 = parseInputActionIdV1("website.home-console.next");

export default function HomeConsoleScreenV1(
  input: CodeSurfaceViewPropsV1<
    WebsiteHomeConsoleContextV1,
    HomeConsoleScreenPropsV1,
    "routes"
  >,
): ReactElement {
  const [requestedRouteId, setRequestedRouteId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<ReadonlyMap<string, HomeConsoleRoutePropsV1>>(
    () => new Map(),
  );
  const routeElementsRef = useRef(new Map<string, HTMLAnchorElement>());
  const inputRouter = useInputRouterV1();

  const registerRoute = useCallback((
    routeId: string,
    route: HomeConsoleRoutePropsV1,
    element: HTMLAnchorElement,
  ): () => void => {
    const registeredElement = routeElementsRef.current.get(routeId);
    if (registeredElement !== undefined && registeredElement !== element) {
      throw new TypeError(`website.home_console_route_duplicate:${routeId}`);
    }
    routeElementsRef.current.set(routeId, element);
    setRoutes((current) => {
      const next = new Map(current);
      next.set(routeId, route);
      return next;
    });
    return () => {
      if (routeElementsRef.current.get(routeId) === element) {
        routeElementsRef.current.delete(routeId);
      }
      setRoutes((current) => {
        if (current.get(routeId) !== route) return current;
        const next = new Map(current);
        next.delete(routeId);
        return next;
      });
      setRequestedRouteId((current) => current === routeId ? null : current);
    };
  }, []);

  const orderedRouteIds = useMemo(() =>
    [...routes.entries()]
      .sort(([leftId, left], [rightId, right]) =>
        left.order - right.order || leftId.localeCompare(rightId)
      )
      .map(([routeId]) => routeId), [routes]);
  const selectedRouteId = requestedRouteId !== null && routes.has(requestedRouteId)
    ? requestedRouteId
    : orderedRouteIds[0] ?? null;

  const selectRoute = useCallback((routeId: string, focus = false): void => {
    if (!routeElementsRef.current.has(routeId)) return;
    setRequestedRouteId(routeId);
    if (focus) routeElementsRef.current.get(routeId)?.focus();
  }, []);

  const moveSelection = useCallback((delta: -1 | 1): void => {
    if (orderedRouteIds.length === 0) return;
    const currentIndex = Math.max(0, orderedRouteIds.indexOf(selectedRouteId ?? ""));
    const nextIndex = Math.min(
      Math.max(currentIndex + delta, 0),
      orderedRouteIds.length - 1,
    );
    const nextRouteId = orderedRouteIds[nextIndex];
    if (nextRouteId !== undefined) selectRoute(nextRouteId, true);
  }, [orderedRouteIds, selectRoute, selectedRouteId]);

  useEffect(() =>
    inputRouter.register({
      context: "interaction",
      handle(event) {
        if (event.kind !== "action") return inputIgnoredV1;
        if (event.actionId === previousActionV1) moveSelection(-1);
        else if (event.actionId === nextActionV1) moveSelection(1);
        else return inputIgnoredV1;
        return inputHandledV1;
      },
    }), [inputRouter, moveSelection]);

  const session = useMemo<HomeConsoleSessionV1>(() => ({
    selectedRouteId,
    routes,
    registerRoute,
    selectRoute,
    moveSelection,
  }), [moveSelection, registerRoute, routes, selectRoute, selectedRouteId]);
  const selected = selectedRouteId === null ? undefined : routes.get(selectedRouteId);
  const selectedRouteIndex = selectedRouteId === null
    ? -1
    : orderedRouteIds.indexOf(selectedRouteId);
  const routeCountLabel = String(orderedRouteIds.length).padStart(2, "0");

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    const action = event.code === "ArrowLeft"
      ? previousActionV1
      : event.code === "ArrowRight"
      ? nextActionV1
      : null;
    if (action === null) return;
    event.preventDefault();
    inputRouter.route({ kind: "action", actionId: action });
  };

  return (
    <HomeConsoleSessionContextV1.Provider value={session}>
      <section
        className={`home-console home-console--${selected?.accent ?? "indigo"}`}
        data-home-console-ready="true"
        data-home-console-selected={selected?.routeId ?? "loading"}
        tabIndex={0}
        aria-label={input.props.label}
        onKeyDown={onKeyDown}
      >
        <header className="home-console__header">
          <div className="home-console__identity">
            <span aria-hidden="true">S</span>
            <div>
              <strong>SillyMaker</strong>
              <small>{input.props.label}</small>
            </div>
          </div>
          <div className="home-console__status">
            <i aria-hidden="true"></i>
            <span>{input.props.statusLabel}</span>
            <b>{selected?.number ?? "--"} / {routeCountLabel}</b>
          </div>
        </header>

        <div className="home-console__slide" aria-live="polite">
          {selected === undefined
            ? <p className="home-console__loading">Loading routes…</p>
            : (
              <div key={selected.routeId} className="home-console__slide-copy">
                <p>{selected.eyebrow}</p>
                <h2>{selected.title}</h2>
                <span>{selected.summary}</span>
                <div className="home-console__slide-meta">
                  <a href={selected.href}>
                    {input.props.openLabel}
                    <span aria-hidden="true">→</span>
                  </a>
                  <ul>{selected.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                </div>
              </div>
            )}
          <div className="home-console__orbit" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <nav className="home-console__deck" aria-label={input.props.routeLabel}>
          {input.slots.routes}
        </nav>

        <footer className="home-console__footer">
          <div className="home-console__controls">
            <button
              type="button"
              aria-label={input.props.previousLabel}
              disabled={selectedRouteIndex <= 0}
              onClick={() => moveSelection(-1)}
            >
              ←
            </button>
            <button
              type="button"
              aria-label={input.props.nextLabel}
              disabled={selectedRouteIndex < 0 || selectedRouteIndex === orderedRouteIds.length - 1}
              onClick={() => moveSelection(1)}
            >
              →
            </button>
          </div>
          <p>{input.props.helpText}</p>
        </footer>
      </section>
    </HomeConsoleSessionContextV1.Provider>
  );
}

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
  const [selectedOrder, setSelectedOrder] = useState(0);
  const [routes, setRoutes] = useState<ReadonlyMap<number, HomeConsoleRoutePropsV1>>(
    () => new Map(),
  );
  const routeElementsRef = useRef(new Map<number, HTMLAnchorElement>());
  const inputRouter = useInputRouterV1();

  const registerRoute = useCallback((
    order: number,
    route: HomeConsoleRoutePropsV1,
    element: HTMLAnchorElement,
  ): () => void => {
    routeElementsRef.current.set(order, element);
    setRoutes((current) => {
      const next = new Map(current);
      next.set(order, route);
      return next;
    });
    return () => {
      if (routeElementsRef.current.get(order) === element) {
        routeElementsRef.current.delete(order);
      }
      setRoutes((current) => {
        if (current.get(order) !== route) return current;
        const next = new Map(current);
        next.delete(order);
        return next;
      });
    };
  }, []);

  const selectRoute = useCallback((order: number, focus = false): void => {
    if (!routeElementsRef.current.has(order)) return;
    setSelectedOrder(order);
    if (focus) routeElementsRef.current.get(order)?.focus();
  }, []);

  const moveSelection = useCallback((delta: -1 | 1): void => {
    const orders = [...routeElementsRef.current.keys()].sort((left, right) => left - right);
    if (orders.length === 0) return;
    const currentIndex = Math.max(0, orders.indexOf(selectedOrder));
    const nextIndex = Math.min(Math.max(currentIndex + delta, 0), orders.length - 1);
    const nextOrder = orders[nextIndex];
    if (nextOrder !== undefined) selectRoute(nextOrder, true);
  }, [selectRoute, selectedOrder]);

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
    selectedOrder,
    routes,
    registerRoute,
    selectRoute,
    moveSelection,
  }), [moveSelection, registerRoute, routes, selectRoute, selectedOrder]);
  const selected = routes.get(selectedOrder) ?? routes.values().next().value;

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
        className="home-console"
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
            <b>{selected?.number ?? "--"} / 04</b>
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
              disabled={selectedOrder === 0}
              onClick={() => moveSelection(-1)}
            >
              ←
            </button>
            <button
              type="button"
              aria-label={input.props.nextLabel}
              disabled={selectedOrder === 3}
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

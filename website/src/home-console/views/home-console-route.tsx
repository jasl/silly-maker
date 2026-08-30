// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import type { CodeSurfaceViewPropsV1 } from "@sillymaker/ui/code-surface";

import type {
  HomeConsoleRoutePropsV1,
  WebsiteHomeConsoleContextV1,
} from "../home-console-catalog.ts";
import { useHomeConsoleSessionV1 } from "../home-console-context.tsx";

export default function HomeConsoleRouteV1(
  input: CodeSurfaceViewPropsV1<WebsiteHomeConsoleContextV1, HomeConsoleRoutePropsV1, never>,
): ReactElement {
  const [element, setElement] = useState<HTMLAnchorElement | null>(null);
  const session = useHomeConsoleSessionV1();
  const { registerRoute } = session;
  const selected = session.selectedRouteId === input.props.routeId;

  useEffect(() => {
    if (element === null) return undefined;
    return registerRoute(input.props.routeId, input.props, element);
  }, [element, input.props, registerRoute]);

  return (
    <a
      ref={setElement}
      className={`home-console-route home-console-route--${input.props.accent}`}
      data-selected={selected ? "true" : "false"}
      href={input.props.href}
      aria-label={`${input.props.number}. ${input.props.title}`}
      onFocus={() => session.selectRoute(input.props.routeId)}
      onPointerEnter={() => session.selectRoute(input.props.routeId)}
    >
      <span className="home-console-route__number" aria-hidden="true">{input.props.number}</span>
      <span className="home-console-route__cover" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
      </span>
      <strong>{input.props.title}</strong>
      <span className="home-console-route__signal" aria-hidden="true">↗</span>
    </a>
  );
}

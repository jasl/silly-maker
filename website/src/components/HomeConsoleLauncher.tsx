// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import {
  WebsiteHomeConsoleV1,
  type WebsiteHomeConsoleLocaleV1,
} from "../home-console/home-console-application.tsx";

export interface HomeConsoleLauncherPropsV1 {
  readonly locale: WebsiteHomeConsoleLocaleV1;
}

export function HomeConsoleLauncherV1(props: HomeConsoleLauncherPropsV1): ReactElement {
  return (
    <div
      id="website-home-console-root"
      className="home-console-mount"
      data-home-console-locale={props.locale}
    >
      <WebsiteHomeConsoleV1 locale={props.locale} />
    </div>
  );
}

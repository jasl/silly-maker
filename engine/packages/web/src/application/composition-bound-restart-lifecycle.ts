// SPDX-License-Identifier: MIT
import type { SessionAnchorResultV1 } from "@sillymaker/base";

import type { WebApplicationTerminalSupervisorInternalV1 } from "./application-terminal-supervisor.ts";
import type { PresentationSuccessorAcknowledgmentBrokerInternalV1 } from "./presentation-successor-acknowledgment.ts";

interface PreparedRestartInternalV1 {
  readonly publicationContext: object;
  run(): Promise<SessionAnchorResultV1>;
}

export interface CompositionBoundRestartLifecycleInternalV1 {
  restart(): Promise<SessionAnchorResultV1>;
}

/**
 * @internal Positive-gates one raw authoritative restart on the exact prepared
 * token's presentation successor. Rejected/faulted pre-commit outcomes retain
 * their Base meaning and merely cancel the unused acknowledgment arm.
 */
export function createCompositionBoundRestartLifecycleInternalV1(input: {
  prepareRestart(): PreparedRestartInternalV1;
  readonly acknowledgments: Pick<
    PresentationSuccessorAcknowledgmentBrokerInternalV1,
    "arm" | "take" | "takeNonAnchored" | "cancel"
  >;
  readonly terminal: Pick<
    WebApplicationTerminalSupervisorInternalV1<unknown>,
    "getTerminalError" | "terminate"
  >;
}): CompositionBoundRestartLifecycleInternalV1 {
  const restart = async (): Promise<SessionAnchorResultV1> => {
    const existingTerminal = input.terminal.getTerminalError();
    if (existingTerminal !== null) {
      return await input.terminal.terminate(existingTerminal);
    }
    const prepared = input.prepareRestart();
    const token = prepared.publicationContext;
    input.acknowledgments.arm(token);

    let result: SessionAnchorResultV1;
    try {
      result = await prepared.run();
    } catch (error) {
      const terminalError = input.terminal.getTerminalError();
      if (terminalError !== null) {
        input.acknowledgments.cancel(token);
        return await input.terminal.terminate(terminalError);
      }
      const acknowledgment = input.acknowledgments.takeNonAnchored(token);
      if (acknowledgment.kind === "desynchronized") {
        return await input.terminal.terminate(
          new Error("ui.presentation_successor_activation_failed"),
        );
      }
      throw error;
    }

    const terminalError = input.terminal.getTerminalError();
    if (terminalError !== null) {
      input.acknowledgments.cancel(token);
      return await input.terminal.terminate(terminalError);
    }
    if (result.kind !== "anchored") {
      const acknowledgment = input.acknowledgments.takeNonAnchored(token);
      if (acknowledgment.kind === "unobserved") return result;
      return await input.terminal.terminate(
        new Error("ui.presentation_successor_activation_failed"),
      );
    }
    const acknowledgment = input.acknowledgments.take(token);
    if (acknowledgment.kind === "installed") return result;
    return await input.terminal.terminate(
      new Error("ui.presentation_successor_activation_failed"),
    );
  };

  return Object.freeze({ restart });
}

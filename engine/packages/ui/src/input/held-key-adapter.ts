// SPDX-License-Identifier: MIT
import type { InputActionIdV1 } from "./contracts.ts";
import { closestFromEventTargetV1 } from "./keyboard-adapter.ts";
import { nativeBehaviorEditableSelectorV1 } from "../shell/native-behavior-reset.ts";

/**
 * Held-key (modifier/chord) input: a declared map from `KeyboardEvent.key`
 * values (logical keys — `"Control"` collapses both physical Ctrl keys) to
 * input actions whose *held state*, not a discrete press, is the signal.
 *
 * Held actions never enter the InputRouter (the router routes discrete
 * events through context priority; a hold is continuous state) and never
 * enter the CommandLog. They publish through `HeldInputPortV1` as plain
 * presentation-side state; Stories subscribe and own the policy (for
 * example: hold Ctrl → pin the presentation rate to 2× and enable auto).
 *
 * Engagement is scope-filtered: editable controls, `data-native-text`
 * subtrees, debug/system chrome, and IME composition never engage a hold,
 * so Ctrl+A in a form field stays a form shortcut. The generic interactive
 * control selector is deliberately NOT included — a held modifier over a
 * focused stage button has no native meaning and must not block the hold.
 * A mapped hold is exclusive: it engages only when that key is the sole
 * currently-down key and no extra modifiers are asserted. Any later
 * keydown releases the hold and taints the mapped key until its keyup,
 * so host chords (Ctrl+Alt+A, Ctrl+C) never pin presentation rate.
 * Releasing the extra keys while the mapped key stays down does not
 * resume the hold.
 *
 * Release is unconditional: an engaged key releases wherever its keyup
 * lands, window blur releases everything, and uninstalling releases
 * everything, so a hold can never stick across focus loss.
 */

export type HeldKeyMapV1 = Readonly<Record<string, InputActionIdV1>>;

export interface HeldInputStateV1 {
  readonly heldActionIds: ReadonlySet<InputActionIdV1>;
}

export interface HeldInputPortV1 {
  readonly state: {
    getCurrent(): HeldInputStateV1;
    subscribe(listener: () => void): () => void;
  };
}

export interface InstallHeldKeyAdapterOptionsV1 {
  readonly map: HeldKeyMapV1;
  /** Defaults to `document`; injectable for tests. */
  readonly target?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
  /** Defaults to `window`; `blur` here releases every hold. */
  readonly windowTarget?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
}

export interface HeldKeyInputV1 {
  readonly port: HeldInputPortV1;
  /** Installs the document listeners; returns the uninstaller. */
  install(options: InstallHeldKeyAdapterOptionsV1): () => void;
}

const heldKeyIgnoreScopeSelectorV1 =
  `${nativeBehaviorEditableSelectorV1}, [data-native-text], [data-devdock-window], ` +
  "[data-debug-dock], [data-blocking-focus-scope]";

function shouldIgnoreHeldKeyEngageV1(event: KeyboardEvent): boolean {
  if (event.isComposing || event.key === "Process") return true;
  return closestFromEventTargetV1(event.target, heldKeyIgnoreScopeSelectorV1) !== null;
}

function extraModifiersOnHeldKeyV1(event: KeyboardEvent, key: string): boolean {
  return (key !== "Alt" && event.altKey) ||
    (key !== "Meta" && event.metaKey) ||
    (key !== "Shift" && event.shiftKey) ||
    (key !== "Control" && event.ctrlKey);
}

const emptyHeldStateV1: HeldInputStateV1 = {
  heldActionIds: new Set<InputActionIdV1>() as ReadonlySet<InputActionIdV1>,
};

export function createHeldKeyInputV1(): HeldKeyInputV1 {
  const downKeys = new Set<string>();
  const taintedKeys = new Set<string>();
  const engagedKeys = new Map<string, InputActionIdV1>();
  let current = emptyHeldStateV1;
  const listeners = new Set<() => void>();
  let installed = false;

  const publish = (): void => {
    const next = new Set<InputActionIdV1>(engagedKeys.values());
    const previous = current.heldActionIds;
    // Exclusive hold means at most one mapped key is engaged. The set
    // only changes when a hold engages or releases.
    if (next.size === previous.size && [...next].every((id) => previous.has(id))) return;
    current = { heldActionIds: next as ReadonlySet<InputActionIdV1> };
    for (const listener of [...listeners]) listener();
  };

  const releaseAll = (): void => {
    downKeys.clear();
    taintedKeys.clear();
    if (engagedKeys.size === 0) return;
    engagedKeys.clear();
    publish();
  };

  const port: HeldInputPortV1 = {
    state: {
      getCurrent: () => current,
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
  };

  return {
    port,
    install(options: InstallHeldKeyAdapterOptionsV1): () => void {
      if (installed) throw new TypeError("ui.held_key_adapter_already_installed");
      const target = options.target ?? (typeof document === "undefined" ? null : document);
      if (target === null) return () => {};
      const windowTarget = options.windowTarget ??
        (typeof window === "undefined" ? null : window);
      installed = true;

      const onKeyDown = (event: Event): void => {
        const keyboardEvent = event as KeyboardEvent;
        downKeys.add(keyboardEvent.key);
        if (keyboardEvent.defaultPrevented) return;
        const actionId = options.map[keyboardEvent.key];
        if (downKeys.size > 1 && engagedKeys.size > 0) {
          for (const heldKey of engagedKeys.keys()) taintedKeys.add(heldKey);
          if (actionId !== undefined) taintedKeys.add(keyboardEvent.key);
          engagedKeys.clear();
          publish();
          return;
        }
        if (actionId === undefined) return;
        if (keyboardEvent.repeat) return;
        if (engagedKeys.has(keyboardEvent.key)) return;
        if (taintedKeys.has(keyboardEvent.key)) return;
        if (shouldIgnoreHeldKeyEngageV1(keyboardEvent)) return;
        if (
          downKeys.size !== 1 ||
          extraModifiersOnHeldKeyV1(keyboardEvent, keyboardEvent.key)
        ) {
          taintedKeys.add(keyboardEvent.key);
          return;
        }
        engagedKeys.set(keyboardEvent.key, actionId);
        publish();
      };
      const onKeyUp = (event: Event): void => {
        const key = (event as KeyboardEvent).key;
        downKeys.delete(key);
        taintedKeys.delete(key);
        if (!engagedKeys.delete(key)) return;
        publish();
      };
      const onBlur = (): void => releaseAll();

      target.addEventListener("keydown", onKeyDown);
      target.addEventListener("keyup", onKeyUp);
      windowTarget?.addEventListener("blur", onBlur);
      return () => {
        target.removeEventListener("keydown", onKeyDown);
        target.removeEventListener("keyup", onKeyUp);
        windowTarget?.removeEventListener("blur", onBlur);
        installed = false;
        releaseAll();
      };
    },
  };
}

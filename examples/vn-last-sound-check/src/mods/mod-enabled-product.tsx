// SPDX-License-Identifier: MIT
import type {
  ApplicationHostCapabilitiesV1,
  TextContentPackDescriptorV1,
  TextContentPackVariantDescriptorV1,
} from "@sillymaker/base";
import type {
  CoreRebootstrapHandoffInternalV1,
  CoreRebootstrapStartFailureInternalV1,
} from "@sillymaker/base/runtime/internal";
import type { StartedWebGameApplicationV1 } from "@sillymaker/web";
import { startWebGameApplicationV1 } from "@sillymaker/web";
import {
  createWebGameApplicationRebootstrapStartOptionsInternalV1,
  disposeStartedWebGameApplicationForRebootstrapInternalV1,
  invalidateStartedWebGameApplicationForHmrInternalV1,
  startWebGameApplicationForRebootstrapInternalV1,
} from "@sillymaker/web/internal/application-hmr";

import { vnLastSoundCheckGameApplicationV1 } from "../application/production-application.tsx";
import {
  createVnLastSoundCheckDeclarativeModManagerV1,
  type VnLastSoundCheckDeclarativeModManagerV1,
  type VnLastSoundCheckDeclarativeModSelectionV1,
} from "./declarative-override-selection.ts";
import {
  createVnLastSoundCheckModAssetLoaderV1,
  createVnLastSoundCheckModTextPackLoaderV1,
  loadVnLastSoundCheckBrowserModSourcesV1,
  validateVnLastSoundCheckBrowserImageOverrideV1,
  type VnLastSoundCheckBrowserImageEnvironmentV1,
  type VnLastSoundCheckBrowserModFetchV1,
} from "./declarative-overrides-browser.ts";

const maxBaseTextPackBytesV1 = 16_777_216;

export interface StartVnLastSoundCheckModEnabledProductOptionsV1 {
  readonly rootElement?: HTMLElement;
  /** Injectable Host for Browser conformance and embedding. */
  readonly host?: ApplicationHostCapabilitiesV1;
  readonly selectionUrl?: URL;
  readonly fetch?: VnLastSoundCheckBrowserModFetchV1;
  readonly imageEnvironment?: VnLastSoundCheckBrowserImageEnvironmentV1;
  readonly registerPageLifecycle?: boolean;
}

export interface StartedVnLastSoundCheckModEnabledProductV1 {
  /** Re-reads the explicit selection file and enables that exact set. */
  enable(): Promise<VnLastSoundCheckDeclarativeModSelectionV1>;
  /** Re-reads every selected manifest/resource and installs one successor. */
  reload(): Promise<VnLastSoundCheckDeclarativeModSelectionV1>;
  /** Installs a complete application successor with no active Mods. */
  disable(): Promise<VnLastSoundCheckDeclarativeModSelectionV1>;
  getSelection(): VnLastSoundCheckDeclarativeModSelectionV1;
  getStartedApplication(): StartedWebGameApplicationV1;
  dispose(): Promise<void>;
}

function requireRootElementV1(input: HTMLElement | undefined): HTMLElement {
  const root = input ?? document.querySelector("#root");
  if (!(root instanceof HTMLElement)) {
    throw new TypeError("vn-last-sound-check.mod_enabled_root_missing");
  }
  return root;
}

function createBaseTextPackLoaderV1(
  fetchV1: VnLastSoundCheckBrowserModFetchV1,
): (
  descriptor: TextContentPackDescriptorV1,
  variant: TextContentPackVariantDescriptorV1,
) => Promise<Uint8Array> {
  return async (_descriptor, variant) => {
    const url = new URL(variant.runtimePath, document.baseURI);
    const response = await fetchV1(url, { cache: "no-store" });
    if (!response.ok) {
      throw new TypeError(`vn-last-sound-check.text_pack_fetch_failed:${response.status}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > maxBaseTextPackBytesV1) {
      throw new TypeError("vn-last-sound-check.text_pack_size_invalid");
    }
    return bytes;
  };
}

function selectionUrlV1(input: URL | undefined): URL {
  return input ?? new URL("assets/mods/selection.json", document.baseURI);
}

/**
 * Starts the explicitly selected post-release-data build. Mod replacement is
 * an exact Web application successor: the predecessor is fenced, its Save +
 * lease handoff is adopted, and only then does the Mod selection commit.
 */
export async function startVnLastSoundCheckModEnabledProductV1(
  options: StartVnLastSoundCheckModEnabledProductOptionsV1 = {},
): Promise<StartedVnLastSoundCheckModEnabledProductV1> {
  const rootElement = requireRootElementV1(options.rootElement);
  const initialRootOption = options.rootElement === undefined ? {} : { rootElement };
  const fetchV1 = options.fetch ?? fetch;
  const selectionUrl = selectionUrlV1(options.selectionUrl);
  const baseTextPackLoader = createBaseTextPackLoaderV1(fetchV1);
  let started: StartedWebGameApplicationV1 | null = null;
  let retryHandoff: CoreRebootstrapHandoffInternalV1 | null = null;
  let acceptingOperations = true;
  let operationTail: Promise<void> = Promise.resolve();
  let disposePromise: Promise<void> | null = null;

  const createAssetLoader = (selection: VnLastSoundCheckDeclarativeModSelectionV1) =>
    createVnLastSoundCheckModAssetLoaderV1(selection, options.imageEnvironment);
  const createTextLoader = (selection: VnLastSoundCheckDeclarativeModSelectionV1) =>
    createVnLastSoundCheckModTextPackLoaderV1(selection, baseTextPackLoader);

  const manager: VnLastSoundCheckDeclarativeModManagerV1 =
    createVnLastSoundCheckDeclarativeModManagerV1({
      applicationGeneration: "vn-last-sound-check.mod-enabled-product",
      loadBaseTextPackBytes: baseTextPackLoader,
      validateAsset: (input) =>
        validateVnLastSoundCheckBrowserImageOverrideV1(
          input,
          options.imageEnvironment,
        ),
      async publishSelectionSuccessor(successor) {
        const predecessor = started;
        if (predecessor === null) {
          throw new TypeError("vn-last-sound-check.mod_enabled_predecessor_missing");
        }
        const assetLoader = createAssetLoader(successor);
        let handoff = retryHandoff;
        if (handoff === null) {
          invalidateStartedWebGameApplicationForHmrInternalV1(predecessor);
          try {
            handoff = await disposeStartedWebGameApplicationForRebootstrapInternalV1(
              predecessor,
            );
          } catch (error) {
            assetLoader.dispose();
            throw error;
          }
        }
        let failureOutcome: CoreRebootstrapStartFailureInternalV1 = {
          kind: "ready",
          handoff,
        };
        try {
          const candidate = await startWebGameApplicationForRebootstrapInternalV1(
            vnLastSoundCheckGameApplicationV1,
            {
              ...createWebGameApplicationRebootstrapStartOptionsInternalV1({
                predecessor,
                rootElement,
                handoff,
                onRebootstrapStartFailureInternal: (outcome) => {
                  failureOutcome = outcome;
                },
              }),
              assetLoader,
              loadTextContentPackBytes: createTextLoader(successor),
              ...(options.registerPageLifecycle === undefined
                ? {}
                : { registerPageLifecycle: options.registerPageLifecycle }),
            },
          );
          started = candidate;
          retryHandoff = null;
        } catch (error) {
          assetLoader.dispose();
          retryHandoff = failureOutcome.kind === "ready" ? failureOutcome.handoff : null;
          throw error;
        }
      },
    });

  const readSelectedSources = () =>
    loadVnLastSoundCheckBrowserModSourcesV1({
      selectionUrl,
      fetch: fetchV1,
    });

  let initialSelection: VnLastSoundCheckDeclarativeModSelectionV1;
  const initialSources = await readSelectedSources();
  try {
    initialSelection = initialSources.length === 0
      ? await manager.disable()
      : await manager.enable(initialSources);
  } catch (error) {
    await manager.dispose();
    throw error;
  }
  const initialAssetLoader = createAssetLoader(initialSelection);
  try {
    started = await startWebGameApplicationV1(vnLastSoundCheckGameApplicationV1, {
      ...initialRootOption,
      ...(options.host === undefined ? {} : { host: options.host }),
      assetLoader: initialAssetLoader,
      loadTextContentPackBytes: createTextLoader(initialSelection),
      ...(options.registerPageLifecycle === undefined
        ? {}
        : { registerPageLifecycle: options.registerPageLifecycle }),
    });
  } catch (error) {
    initialAssetLoader.dispose();
    await manager.dispose();
    throw error;
  }

  const requireSelection = (): VnLastSoundCheckDeclarativeModSelectionV1 => {
    const current = manager.getCurrent();
    if (current === null) {
      throw new TypeError("vn-last-sound-check.mod_enabled_selection_missing");
    }
    return current;
  };
  const requireStarted = (): StartedWebGameApplicationV1 => {
    if (started === null) {
      throw new TypeError("vn-last-sound-check.mod_enabled_application_missing");
    }
    return started;
  };
  const enqueueOperation = <T,>(operation: () => Promise<T>): Promise<T> => {
    if (!acceptingOperations) {
      return Promise.reject(
        new TypeError("vn-last-sound-check.mod_enabled_product_disposed"),
      );
    }
    const result = operationTail.then(operation);
    operationTail = result.then(() => undefined, () => undefined);
    return result;
  };

  return {
    enable: () => enqueueOperation(async () => await manager.enable(await readSelectedSources())),
    reload: () => enqueueOperation(async () => await manager.reload(await readSelectedSources())),
    disable: () => enqueueOperation(() => manager.disable()),
    getSelection: requireSelection,
    getStartedApplication: requireStarted,
    dispose() {
      if (disposePromise !== null) return disposePromise;
      acceptingOperations = false;
      disposePromise = (async () => {
        await operationTail;
        const currentApplication = started;
        started = null;
        try {
          if (currentApplication !== null && !currentApplication.isDisposed()) {
            await currentApplication.dispose();
          }
        } finally {
          await manager.dispose();
        }
      })();
      return disposePromise;
    },
  };
}

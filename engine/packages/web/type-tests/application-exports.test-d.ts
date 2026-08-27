// SPDX-License-Identifier: MIT
import type {
  ApplicationHostCapabilitiesV1,
  ContentPreferencePortV1,
  GameSimulationTypeMapV1,
  HostAtomicRecordStoreV1,
  RuntimeCapabilityIdV1,
  RuntimeCapabilityPortV1,
  StoryId,
} from "@sillymaker/base";
import { createMemoryHostRecordStoreV1 } from "@sillymaker/base/testkit";
import type {
  NarrativeSurfaceDefinitionV1,
  PointerActionMapV1,
  WholeCanvasSurfaceDefinitionV1,
} from "@sillymaker/ui";
import { playerInputActionIdsV1 } from "@sillymaker/ui";
import {
  createRuntimeCapabilitySessionOverlayV1,
  createWebContentPreferencePortV1,
  createWebHostV1,
  mountGameApplicationV1,
  parseCapabilityRequestV1,
  startWebGuiApplicationV1,
} from "@sillymaker/web";
import type {
  CapabilityRequestParseResultV1,
  RuntimeCapabilitySessionOverlayV1,
  WebGuiClosePreparationV1,
  WebGuiApplicationV1,
  WebGuiUiDefinitionV1,
  WebAddressableRuntimeDefinitionV1,
  WebGameApplicationV1,
  WebGameLocalizedUiCopyV1,
  WebGameUiDefinitionV1,
} from "@sillymaker/web";

declare const publicGuiApplicationV1: WebGuiApplicationV1;
void startWebGuiApplicationV1(publicGuiApplicationV1, { registerPageLifecycle: false });
declare const publicGuiClosePreparationV1: WebGuiClosePreparationV1;
const publicGuiUiDefinitionV1: WebGuiUiDefinitionV1 = {
  content: null,
  requiredDomainReady: Promise.resolve(),
  closePreparation: publicGuiClosePreparationV1,
  dispose: async () => await Promise.resolve(),
};
void publicGuiUiDefinitionV1;
type PublicGuiAsyncDisposeResultV1 = Exclude<
  ReturnType<NonNullable<WebGuiUiDefinitionV1["dispose"]>>,
  void
>;
const publicGuiAsyncDisposeResultV1: PublicGuiAsyncDisposeResultV1 = Promise.resolve();
void publicGuiAsyncDisposeResultV1;

declare const pointerActionMapV1: PointerActionMapV1;
type WebInputDeclarationV1 = NonNullable<
  WebGameUiDefinitionV1<unknown, unknown, unknown, unknown, unknown, string, unknown>["input"]
>;
const webInputDeclarationV1: WebInputDeclarationV1 = {
  pointer: pointerActionMapV1,
  held: { Control: playerInputActionIdsV1.fastForward },
  nativeBehavior: false,
};
const publicPointerActionMapV1: PointerActionMapV1 | undefined = webInputDeclarationV1.pointer;
void publicPointerActionMapV1;

declare const narrativeSurfaceDefinitionV1: NarrativeSurfaceDefinitionV1<unknown>;
type WebNarrativeDefinitionV1 = NonNullable<
  WebGameUiDefinitionV1<unknown, unknown, unknown, unknown, unknown, string, unknown>["narrative"]
>;
const webNarrativeDefinitionV1: WebNarrativeDefinitionV1 = narrativeSurfaceDefinitionV1;
void webNarrativeDefinitionV1;

const localizedUiCopyV1: WebGameLocalizedUiCopyV1 = {
  accessibleName: "Localized application",
  titleScreenTitle: "Localized title",
  labels: { settingsLabel: "Localized settings" },
};
type WebLocalizedCopyResolverV1 = NonNullable<
  WebGameUiDefinitionV1<unknown, unknown, unknown, unknown, unknown, string, unknown>[
    "resolveLocalizedCopy"
  ]
>;
const webLocalizedCopyResolverV1: WebLocalizedCopyResolverV1 = () => localizedUiCopyV1;
void webLocalizedCopyResolverV1;

interface WebWholeCanvasSemanticV1 {
  readonly kind: "web.whole-canvas.semantic";
}

declare const wholeCanvasSurfaceDefinitionV1: WholeCanvasSurfaceDefinitionV1<
  WebWholeCanvasSemanticV1
>;
type WebWholeCanvasDefinitionV1 = NonNullable<
  WebGameUiDefinitionV1<
    WebWholeCanvasSemanticV1,
    unknown,
    unknown,
    unknown,
    unknown,
    string,
    unknown
  >["wholeCanvas"]
>;
type WebWholeCanvasPropertyV1 = Pick<
  WebGameUiDefinitionV1<
    WebWholeCanvasSemanticV1,
    unknown,
    unknown,
    unknown,
    unknown,
    string,
    unknown
  >,
  "wholeCanvas"
>;
const omittedWebWholeCanvasDefinitionV1: WebWholeCanvasPropertyV1 = {};
const webWholeCanvasDefinitionV1: WebWholeCanvasDefinitionV1 = wholeCanvasSurfaceDefinitionV1;
void omittedWebWholeCanvasDefinitionV1;
void webWholeCanvasDefinitionV1;

declare const mismatchedWholeCanvasSurfaceDefinitionV1: WholeCanvasSurfaceDefinitionV1<{
  readonly kind: "different.semantic";
}>;
// @ts-expect-error A whole-canvas definition is bound to this Web UI's semantic publication.
const mismatchedWebWholeCanvasDefinitionV1: WebWholeCanvasDefinitionV1 =
  mismatchedWholeCanvasSurfaceDefinitionV1;
void mismatchedWebWholeCanvasDefinitionV1;

// @ts-expect-error Public authoring omits wholeCanvas; null exists only in the hosted aggregate.
const nullWebWholeCanvasDefinitionV1: WebWholeCanvasPropertyV1 = { wholeCanvas: null };
void nullWebWholeCanvasDefinitionV1;

// @ts-expect-error Web accepts only the opaque public definition, never raw Host authority.
const invalidWebWholeCanvasDefinitionV1: WebWholeCanvasDefinitionV1 = Object.freeze({
  getSnapshotInternalV1: () => null,
});
void invalidWebWholeCanvasDefinitionV1;

const injectedRecordsV1 = createMemoryHostRecordStoreV1();
const publicWebHostV1: ApplicationHostCapabilitiesV1 = createWebHostV1({
  databaseName: "sillymaker.type-test.runtime",
});
createWebHostV1({ records: injectedRecordsV1 });
publicWebHostV1.records;
publicWebHostV1.files;
publicWebHostV1.metadataClock;
publicWebHostV1.log;
// @ts-expect-error platform identity is not a neutral Host capability
publicWebHostV1.platform;
// @ts-expect-error Game bootstrap entropy belongs to Game Domain admission
publicWebHostV1.bootstrapEntropy;
// @ts-expect-error unproven reload/exit behavior is not a neutral Host capability
publicWebHostV1.navigation;

// @ts-expect-error persistence composition requires databaseName or records
createWebHostV1({});
// @ts-expect-error persistence composition forbids databaseName and records together
createWebHostV1({
  databaseName: "sillymaker.type-test.runtime",
  records: injectedRecordsV1,
});
// @ts-expect-error Game bootstrap seeds are no longer Web Host options
createWebHostV1({ records: injectedRecordsV1, seeds: [1] });
// @ts-expect-error Game bootstrap UUIDs are no longer Web Host options
createWebHostV1({ records: injectedRecordsV1, uuids: [] });
// @ts-expect-error ambient crypto belongs to the private Game bootstrap adapter
createWebHostV1({ records: injectedRecordsV1, crypto: globalThis.crypto });

declare const preferenceInputV1: Parameters<typeof createWebContentPreferencePortV1>[0];
const preferenceRecordsV1: HostAtomicRecordStoreV1 = preferenceInputV1.records;
const preferenceStoryIdV1: StoryId = preferenceInputV1.storyId;
void preferenceRecordsV1;
void preferenceStoryIdV1;

// @ts-expect-error Content preference storage is not a runtime capability port.
const preferenceCapabilityV1: RuntimeCapabilityPortV1 = preferenceInputV1.records;
void preferenceCapabilityV1;

declare const contentPreferencePortV1: Awaited<ReturnType<typeof createWebContentPreferencePortV1>>;
const contentPreferenceContractV1: ContentPreferencePortV1 = contentPreferencePortV1;
void contentPreferenceContractV1;
contentPreferencePortV1.observe();
contentPreferencePortV1.subscribe(() => undefined);
void contentPreferencePortV1.set({
  allowedFlags: preferenceInputV1.policy.defaultAllowedFlags,
});

// @ts-expect-error Content preference has no capability mutation surface.
contentPreferencePortV1.setEnabled("debug_tools", true);
// @ts-expect-error Content preference exposes no Snapshot.
contentPreferencePortV1.snapshot;

declare const persistedCapabilityPortV1: RuntimeCapabilityPortV1;
const capabilitySessionV1: RuntimeCapabilitySessionOverlayV1 =
  createRuntimeCapabilitySessionOverlayV1(persistedCapabilityPortV1, ["debug_tools"]);
const effectiveCapabilityPortV1: RuntimeCapabilityPortV1 = capabilitySessionV1;
const sessionRequestedCapabilityV1: RuntimeCapabilityIdV1 | undefined =
  capabilitySessionV1.sessionRequested[0];
const capabilityRequestV1: CapabilityRequestParseResultV1 = parseCapabilityRequestV1(
  "?capability=debug_tools",
);
void effectiveCapabilityPortV1;
void sessionRequestedCapabilityV1;
void capabilityRequestV1;
capabilitySessionV1.persisted.state.getCurrent();
capabilitySessionV1.dispose();

// @ts-expect-error session overlays accept only the closed capability ID set.
createRuntimeCapabilitySessionOverlayV1(persistedCapabilityPortV1, ["unknown"]);

interface RequiredWebExecutionContextV1 {
  readonly runtimeOwner: "required";
}
type SyntheticWebSimulationTypesV1<TExecutionContext> =
  & Omit<GameSimulationTypeMapV1, "executionContext">
  & { readonly executionContext: TExecutionContext };
type SyntheticWebApplicationV1<TExecutionContext> = WebGameApplicationV1<
  unknown,
  unknown,
  SyntheticWebSimulationTypesV1<TExecutionContext>,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  string
>;

declare const requiredAddressableRuntimeV1: WebAddressableRuntimeDefinitionV1<
  RequiredWebExecutionContextV1,
  unknown,
  SyntheticWebSimulationTypesV1<RequiredWebExecutionContextV1>["snapshot"]
>;

export const requiredAddressableRuntimeDeclarationV1: Pick<
  SyntheticWebApplicationV1<RequiredWebExecutionContextV1>,
  "addressableRuntime"
> = { addressableRuntime: requiredAddressableRuntimeV1 };

// @ts-expect-error Web must construct every non-undefined Core execution context.
export const missingRequiredAddressableRuntimeDeclarationV1: Pick<
  SyntheticWebApplicationV1<RequiredWebExecutionContextV1>,
  "addressableRuntime"
> = {};

export const omittedUndefinedAddressableRuntimeDeclarationV1: Pick<
  SyntheticWebApplicationV1<undefined>,
  "addressableRuntime"
> = {};

export const omittedUnionAddressableRuntimeDeclarationV1: Pick<
  SyntheticWebApplicationV1<RequiredWebExecutionContextV1 | undefined>,
  "addressableRuntime"
> = {};

export {
  createRuntimeCapabilitySessionOverlayV1,
  createWebContentPreferencePortV1,
  createWebHostV1,
  mountGameApplicationV1,
  parseCapabilityRequestV1,
};
// @ts-expect-error the application root does not export removed Developer UI
export { DevelopmentPanel as ForbiddenDevelopmentPanel } from "@sillymaker/web";
// @ts-expect-error the single Artifact surface has no Developer subpath
export { DevelopmentPanel as ForbiddenDeveloperSubpath } from "@sillymaker/web/developer";
// @ts-expect-error the Desktop close bridge is package-internal
export { installDesktopCloseFlushV1 } from "@sillymaker/web";
// @ts-expect-error the Desktop close global key is package-internal
export { desktopCloseFlushGlobalKeyV1 } from "@sillymaker/web";

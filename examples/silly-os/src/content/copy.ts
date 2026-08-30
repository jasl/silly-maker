// SPDX-License-Identifier: MIT

export const sillyOsLocaleRegistryV1 = Object.freeze(
  [
    {
      value: "en",
      label: "English",
      queryAliases: Object.freeze([]),
      navigatorPrefixes: Object.freeze(["en"]),
    },
    {
      value: "zh-CN",
      label: "简体中文",
      queryAliases: Object.freeze(["zh"]),
      navigatorPrefixes: Object.freeze(["zh"]),
    },
  ] as const,
);

export type SillyOsLocaleV1 = (typeof sillyOsLocaleRegistryV1)[number]["value"];

const defaultSillyOsLocaleV1: SillyOsLocaleV1 = "en";

export interface SillyOsCopyV1 {
  readonly locale: SillyOsLocaleV1;
  readonly productName: string;
  readonly preview: string;
  readonly creatorName: string;
  readonly creatorKicker: string;
  readonly creatorTitle: string;
  readonly creatorDescription: string;
  readonly creatorPlaceholder: string;
  readonly create: string;
  readonly examplesLabel: string;
  readonly recentProgramsLabel: string;
  readonly browserLocal: string;
  readonly recentProgramsEmpty: string;
  readonly programsLoading: string;
  readonly programsUnavailable: string;
  readonly loadMorePrograms: string;
  readonly loadingMorePrograms: string;
  readonly openProgram: string;
  readonly openingProgram: string;
  readonly savingProgram: string;
  readonly retry: string;
  readonly persistenceFailure: string;
  readonly persistenceConflict: string;
  readonly persistenceOutcomeUnknown: string;
  readonly programKindTranslation: string;
  readonly programKindWriting: string;
  readonly programKindRoleplay: string;
  readonly programKindGeneral: string;
  readonly home: string;
  readonly chat: string;
  readonly loadOlderTranscript: string;
  readonly loadingOlderTranscript: string;
  readonly transcriptUnavailable: string;
  readonly transcriptInterrupted: string;
  readonly retryInterruptedRun: string;
  readonly transcriptSystem: string;
  readonly transcriptTool: string;
  readonly transcriptReasoning: string;
  readonly transcriptToolCall: string;
  readonly transcriptToolResult: string;
  readonly transcriptArtifact: string;
  readonly previewTab: string;
  readonly capabilitiesTab: string;
  readonly fullscreen: string;
  readonly exitFullscreen: string;
  readonly closePreview: string;
  readonly openPreview: string;
  readonly sendPlaceholder: string;
  readonly send: string;
  readonly accept: string;
  readonly reject: string;
  readonly accepted: string;
  readonly rejected: string;
  readonly proposedProgram: string;
  readonly workspaceReview: string;
  readonly acceptedSnapshot: string;
  readonly pendingReview: string;
  readonly snapshotId: string;
  readonly proposalId: string;
  readonly programRevision: string;
  readonly acceptedHead: string;
  readonly reviewedHead: string;
  readonly mutableHead: string;
  readonly generation: string;
  readonly fileCount: string;
  readonly archiveSize: string;
  readonly mutableHeadUnavailable: string;
  readonly pendingReviewMatches: string;
  readonly pendingReviewChanged: string;
  readonly pendingReviewUnavailable: string;
  readonly acceptedSnapshotMatches: string;
  readonly acceptedSnapshotChanged: string;
  readonly acceptedSnapshotUnavailable: string;
  readonly workspaceAria: string;
  readonly resizeAria: string;
  readonly mobileNavigation: string;
  readonly piTestTitle: string;
  readonly piTestDescription: string;
  readonly piTestKeyLabel: string;
  readonly piTestKeyPlaceholder: string;
  readonly piTestInitialize: string;
  readonly piTestLoading: string;
  readonly piTestInitializing: string;
  readonly piTestReady: string;
  readonly piTestFailed: string;
  readonly piTestDraft: string;
  readonly piTestCancel: string;
  readonly piTestForget: string;
  readonly piLiveFailed: string;
  readonly creatorReadinessCatalogLoadingTitle: string;
  readonly creatorReadinessCatalogLoadingDescription: string;
  readonly creatorReadinessCatalogFailedTitle: string;
  readonly creatorReadinessCatalogFailedDescription: string;
  readonly creatorReadinessVaultLoadingTitle: string;
  readonly creatorReadinessVaultLoadingDescription: string;
  readonly creatorReadinessVaultUnavailableTitle: string;
  readonly creatorReadinessVaultUnavailableDescription: string;
  readonly creatorReadinessVaultLockedTitle: string;
  readonly creatorReadinessVaultLockedDescription: string;
  readonly creatorReadinessModelRequiredTitle: string;
  readonly creatorReadinessModelRequiredDescription: string;
  readonly creatorReadinessCredentialRequiredTitle: string;
  readonly creatorReadinessCredentialRequiredDescription: string;
  readonly creatorReadinessAgentInitializingTitle: string;
  readonly creatorReadinessAgentInitializingDescription: string;
  readonly creatorReadinessAgentFailedTitle: string;
  readonly creatorReadinessAgentFailedDescription: string;
  readonly creatorReadinessOpenProviders: string;
  readonly creatorReadinessOpenVault: string;
  readonly networkAccessTitle: string;
  readonly networkAccessToggle: string;
  readonly networkAccessDescription: string;
  readonly settings: string;
  readonly productMenu: string;
  readonly settingsTheme: string;
  readonly settingsThemeDescription: string;
  readonly themeSystem: string;
  readonly themeLight: string;
  readonly themeDark: string;
  readonly settingsBack: string;
  readonly settingsCategoryGeneral: string;
  readonly settingsCategoryProviders: string;
  readonly settingsCategoryCredentialVault: string;
  readonly settingsGeneralDescription: string;
  readonly settingsLanguage: string;
  readonly settingsLanguageDescription: string;
  readonly settingsDataManagement: string;
  readonly settingsDataManagementDescription: string;
  readonly settingsStorageSillyOsData: string;
  readonly settingsStorageSillyOsDataDescription: string;
  readonly settingsStorageWorkspaceData: string;
  readonly settingsStorageWorkspaceDataDescription: string;
  readonly settingsStorageChecking: string;
  readonly settingsStorageUnavailable: string;
  readonly settingsStorageUsageUnavailable: string;
  readonly settingsStorageQuota: string;
  readonly settingsStorageReportedTotal: string;
  readonly settingsStorageAdvisory: string;
  readonly settingsStorageRefresh: string;
  readonly settingsClearAllTitle: string;
  readonly settingsClearAllDescription: string;
  readonly settingsClearAllAction: string;
  readonly settingsClearAllConfirmTitle: string;
  readonly settingsClearAllConfirmDescription: string;
  readonly settingsClearAllConfirmWarning: string;
  readonly settingsClearAllCancel: string;
  readonly settingsClearingAll: string;
  readonly settingsClearAllFailed: string;
  readonly providerSettingsTitle: string;
  readonly providerSettingsDescription: string;
  readonly providersLabel: string;
  readonly providerSearchLabel: string;
  readonly providerSearchPlaceholder: string;
  readonly providerSearchEmpty: string;
  readonly providerBuiltInSection: string;
  readonly providerCustomSection: string;
  readonly providerAddCustom: string;
  readonly providerAddCustomTitle: string;
  readonly providerAddCustomDescription: string;
  readonly providerCustomEmpty: string;
  readonly providerCustomStatus: string;
  readonly providerCustomConfigured: string;
  readonly providerCustomTestFailed: string;
  readonly providerCustomVerified: string;
  readonly providerCustomDescription: string;
  readonly providerCustomSaveFailed: string;
  readonly providerCustomNameLabel: string;
  readonly providerCustomApiLabel: string;
  readonly providerCustomEndpointHint: string;
  readonly providerCustomModelLabel: string;
  readonly providerContextWindowLabel: string;
  readonly providerMaxTokensLabel: string;
  readonly providerCustomPersistenceNotice: string;
  readonly providerSaveCustom: string;
  readonly providerRemoveCustom: string;
  readonly providerCustomModelProfileTitle: string;
  readonly providerCustomModelProfileDescription: string;
  readonly providerCatalogLoading: string;
  readonly providerCatalogLoadingDescription: string;
  readonly providerCatalogFailed: string;
  readonly providerCatalogFailedDescription: string;
  readonly providerCatalogEmpty: string;
  readonly providerDetailEmpty: string;
  readonly backToProviders: string;
  readonly providerStatusAvailable: string;
  readonly providerStatusUnavailable: string;
  readonly providerAvailableDescription: string;
  readonly providerBrowserUnavailable: string;
  readonly providerCredentialUnavailable: string;
  readonly providerPublicHttpUnavailable: string;
  readonly providerRouteConfigurationUnavailable: string;
  readonly modelsCountSuffix: string;
  readonly providerModelsTitle: string;
  readonly providerModelsDescription: string;
  readonly providerModelsEmpty: string;
  readonly modelSearchLabel: string;
  readonly modelSearchPlaceholder: string;
  readonly modelSearchEmpty: string;
  readonly creatorModelSelection: string;
  readonly creatorSelectModel: string;
  readonly creatorModelSwitching: string;
  readonly creatorNoConnectedModels: string;
  readonly creatorModelSettings: string;
  readonly creatorReasoningEffort: string;
  readonly creatorReasoningEffortSelection: string;
  readonly creatorReasoningEffortSwitching: string;
  readonly creatorReasoningEffortOff: string;
  readonly creatorReasoningEffortMinimal: string;
  readonly creatorReasoningEffortLow: string;
  readonly creatorReasoningEffortMedium: string;
  readonly creatorReasoningEffortHigh: string;
  readonly creatorReasoningEffortXHigh: string;
  readonly creatorReasoningEffortMax: string;
  readonly creatorModelTitle: string;
  readonly creatorModelDescription: string;
  readonly providerConnectionModelRequired: string;
  readonly selectedModelUnavailable: string;
  readonly providerConnectionTitle: string;
  readonly providerConnectionDescription: string;
  readonly providerConnectionModelLabel: string;
  readonly providerConnectionModelDescription: string;
  readonly providerConnectionModelEmpty: string;
  readonly providerEndpointLabel: string;
  readonly providerEndpointPresetDescription: string;
  readonly providerEndpointCustomDescription: string;
  readonly providerEndpointManaged: string;
  readonly providerConnectionTestNotice: string;
  readonly providerShowKey: string;
  readonly providerHideKey: string;
  readonly providerTestConnection: string;
  readonly providerTesting: string;
  readonly providerTestResultPointInTime: string;
  readonly providerTestRequiresSavedKey: string;
  readonly providerKeyLabel: string;
  readonly providerKeyPlaceholder: string;
  readonly providerReplacementKeyPlaceholder: string;
  readonly providerSaveCredential: string;
  readonly providerUpdateCredential: string;
  readonly providerSaving: string;
  readonly providerCredentialSaved: string;
  readonly providerWorkerUnavailable: string;
  readonly providerConnectionPassed: string;
  readonly providerConnectionFailed: string;
  readonly providerDeleteCredential: string;
  readonly providerDeletingCredential: string;
  readonly credentialVaultTitle: string;
  readonly credentialVaultDescription: string;
  readonly credentialVaultLockedTitle: string;
  readonly credentialVaultLockedDescription: string;
  readonly credentialVaultUnlockedTitle: string;
  readonly credentialVaultUnlockedDescription: string;
  readonly credentialVaultUnavailableTitle: string;
  readonly credentialVaultUnavailableDescription: string;
  readonly credentialVaultBusyTitle: string;
  readonly credentialVaultBusyDescription: string;
  readonly credentialVaultFailedTitle: string;
  readonly credentialVaultFailedDescription: string;
  readonly credentialVaultModeTitle: string;
  readonly credentialVaultAutomaticMode: string;
  readonly credentialVaultAutomaticDescription: string;
  readonly credentialVaultPasswordMode: string;
  readonly credentialVaultPasswordDescription: string;
  readonly credentialVaultSwitchToAutomatic: string;
  readonly credentialVaultSwitchToPassword: string;
  readonly credentialVaultChangePassword: string;
  readonly credentialVaultAutomaticSecurityNotice: string;
  readonly credentialVaultPasswordSecurityNotice: string;
  readonly credentialVaultSavedUntilForget: string;
  readonly credentialVaultPassphrase: string;
  readonly credentialVaultConfirmPassphrase: string;
  readonly credentialVaultCreate: string;
  readonly credentialVaultUnlock: string;
  readonly credentialVaultLock: string;
  readonly credentialVaultPassphraseMismatch: string;
  readonly credentialVaultBindingsTitle: string;
  readonly credentialVaultBindingsCountSuffix: string;
  readonly credentialVaultBindingsEmpty: string;
  readonly credentialVaultForgetBinding: string;
  readonly samplePrompts: readonly string[];
}

const englishV1: SillyOsCopyV1 = {
  locale: "en",
  productName: "SillyOS",
  preview: "Preview",
  creatorName: "Agent Creator",
  creatorKicker: "One built-in program",
  creatorTitle: "What would you like to make?",
  creatorDescription:
    "Describe an outcome. Agent Creator will propose a focused program whose instructions, capabilities, work and review surface stay together.",
  creatorPlaceholder:
    "For example: translate this visual novel, preserve character voices, and give me a review queue for uncertain lines…",
  create: "Create program",
  examplesLabel: "Try a starting point",
  recentProgramsLabel: "Recent programs",
  browserLocal: "Stored in this browser",
  recentProgramsEmpty: "Programs you create here will appear in this browser.",
  programsLoading: "Opening the local Program catalog…",
  programsUnavailable: "The local Program catalog is unavailable.",
  loadMorePrograms: "Load more programs",
  loadingMorePrograms: "Loading more programs…",
  openProgram: "Open program",
  openingProgram: "Opening program…",
  savingProgram: "Saving Program…",
  retry: "Retry",
  persistenceFailure: "The Program was not saved. Your previous committed version is unchanged.",
  persistenceConflict: "Another page updated this Program. The durable version has been reopened.",
  persistenceOutcomeUnknown: "Checking whether the Program was committed…",
  programKindTranslation: "Translation",
  programKindWriting: "Writing",
  programKindRoleplay: "Role-play",
  programKindGeneral: "Creator tool",
  home: "Creator home",
  chat: "Chat",
  loadOlderTranscript: "Load earlier messages",
  loadingOlderTranscript: "Loading earlier messages…",
  transcriptUnavailable: "The conversation could not be loaded.",
  transcriptInterrupted: "This response was interrupted before it completed.",
  retryInterruptedRun: "Retry interrupted run",
  transcriptSystem: "System",
  transcriptTool: "Tool",
  transcriptReasoning: "Reasoning summary",
  transcriptToolCall: "Tool call",
  transcriptToolResult: "Tool result",
  transcriptArtifact: "Artifact",
  previewTab: "View",
  capabilitiesTab: "Capabilities",
  fullscreen: "Open full screen",
  exitFullscreen: "Exit full screen",
  closePreview: "Close workpiece",
  openPreview: "Open workpiece",
  sendPlaceholder: "Ask for a change…",
  send: "Send",
  accept: "Accept program",
  reject: "Reject proposal",
  accepted: "Program accepted",
  rejected: "Proposal rejected",
  proposedProgram: "Proposed program",
  workspaceReview: "Workspace review",
  acceptedSnapshot: "Accepted snapshot",
  pendingReview: "Pending review",
  snapshotId: "Snapshot ID",
  proposalId: "Proposal ID",
  programRevision: "Program revision",
  acceptedHead: "Accepted head",
  reviewedHead: "Reviewed head",
  mutableHead: "Current working head",
  generation: "Generation",
  fileCount: "Files",
  archiveSize: "Archive bytes",
  mutableHeadUnavailable: "Unavailable",
  pendingReviewMatches: "The working copy matches the reviewed proposal.",
  pendingReviewChanged:
    "The workspace changed after this proposal was reviewed. Ask Agent Creator for a new revision before accepting.",
  pendingReviewUnavailable:
    "The current working head is unavailable, so its relationship to this proposal is unknown.",
  acceptedSnapshotMatches: "The working copy matches the accepted snapshot.",
  acceptedSnapshotChanged:
    "The working copy has changes after the accepted snapshot. Those changes are not accepted.",
  acceptedSnapshotUnavailable:
    "The current working head is unavailable, so its relationship to the accepted snapshot is unknown.",
  workspaceAria: "SillyOS program workspace",
  resizeAria: "Resize conversation and workpiece panes",
  mobileNavigation: "Workspace views",
  piTestTitle: "Browser Pi wiring check",
  piTestDescription:
    "Runs the product-pinned Pi 0.84.4 Agent with a deterministic local provider. It does not contact an LLM or validate a real provider key.",
  piTestKeyLabel: "Synthetic test key (memory only)",
  piTestKeyPlaceholder: "Enter a disposable test value",
  piTestInitialize: "Initialize Pi test",
  piTestLoading: "Loading the Browser adapter…",
  piTestInitializing: "Starting the Agent Worker…",
  piTestReady: "Pi test ready",
  piTestFailed: "Pi test unavailable",
  piTestDraft: "Agent Creator draft",
  piTestCancel: "Cancel run",
  piTestForget: "Forget test key",
  piLiveFailed: "Provider Agent unavailable",
  creatorReadinessCatalogLoadingTitle: "Loading model Providers",
  creatorReadinessCatalogLoadingDescription: "Reading this device's Provider and model settings.",
  creatorReadinessCatalogFailedTitle: "Provider catalog unavailable",
  creatorReadinessCatalogFailedDescription:
    "Open Providers to retry the bundled catalog before using Agent Creator.",
  creatorReadinessVaultLoadingTitle: "Opening Credential Vault",
  creatorReadinessVaultLoadingDescription: "Preparing saved Provider keys for this session.",
  creatorReadinessVaultUnavailableTitle: "Credential Vault unavailable",
  creatorReadinessVaultUnavailableDescription:
    "Saved Provider keys cannot be used in this browser until the Vault is available.",
  creatorReadinessVaultLockedTitle: "Credential Vault locked",
  creatorReadinessVaultLockedDescription: "Unlock the Vault to use its saved Provider keys.",
  creatorReadinessModelRequiredTitle: "Choose a model",
  creatorReadinessModelRequiredDescription:
    "Select at least one model to make it available to Agent Creator.",
  creatorReadinessCredentialRequiredTitle: "API key required",
  creatorReadinessCredentialRequiredDescription:
    "Save an API key for a Provider that offers one of your selected models.",
  creatorReadinessAgentInitializingTitle: "Starting Agent Creator",
  creatorReadinessAgentInitializingDescription: "Preparing the selected model for this session.",
  creatorReadinessAgentFailedTitle: "Agent Creator unavailable",
  creatorReadinessAgentFailedDescription:
    "Open Providers to choose another model or update the Provider API key.",
  creatorReadinessOpenProviders: "Open Providers",
  creatorReadinessOpenVault: "Open Credential Vault",
  networkAccessTitle: "Network access",
  networkAccessToggle: "Allow network access",
  networkAccessDescription:
    "Off by default. When enabled, Agent tools may fetch pages and download files over HTTPS for this Program. Full URL paths and queries may be sent to remote sites, and browser CORS still applies.",
  settings: "Settings",
  productMenu: "SillyOS menu",
  settingsTheme: "Theme",
  settingsThemeDescription: "Use a light or dark appearance, or follow this device.",
  themeSystem: "System",
  themeLight: "Light",
  themeDark: "Dark",
  settingsBack: "Back to Agent Creator",
  settingsCategoryGeneral: "General",
  settingsCategoryProviders: "Providers",
  settingsCategoryCredentialVault: "Credential Vault",
  settingsGeneralDescription: "Product-wide preferences for this browser.",
  settingsLanguage: "Language",
  settingsLanguageDescription: "Choose the language used by SillyOS controls and product copy.",
  settingsDataManagement: "Data management",
  settingsDataManagementDescription:
    "Review advisory storage estimates or remove this SillyOS installation's local data.",
  settingsStorageSillyOsData: "SillyOS data",
  settingsStorageSillyOsDataDescription: "Product, preferences, and Credential Vault origin",
  settingsStorageWorkspaceData: "Workspace data",
  settingsStorageWorkspaceDataDescription: "Independent Workspace Sandbox origin",
  settingsStorageChecking: "Checking…",
  settingsStorageUnavailable: "Estimate unavailable",
  settingsStorageUsageUnavailable: "Usage not reported",
  settingsStorageQuota: "Quota",
  settingsStorageReportedTotal: "Reported total",
  settingsStorageAdvisory:
    "Browser estimates are advisory and origin-wide. Quotas are not fixed limits and cannot be added together.",
  settingsStorageRefresh: "Refresh usage",
  settingsClearAllTitle: "Clear all local data",
  settingsClearAllDescription:
    "Remove Programs, preferences, Provider keys, and every Workspace volume stored by this SillyOS installation.",
  settingsClearAllAction: "Clear all data",
  settingsClearAllConfirmTitle: "Clear all SillyOS data?",
  settingsClearAllConfirmDescription:
    "This removes Programs, preferences, Provider credentials, and Workspace files from this browser. Other open SillyOS tabs return to Home. This cannot be undone.",
  settingsClearAllConfirmWarning:
    "If one storage authority is busy or unavailable, the remaining data may need another clear attempt.",
  settingsClearAllCancel: "Cancel",
  settingsClearingAll: "Clearing…",
  settingsClearAllFailed: "Some local data could not be cleared. Close this dialog and try again.",
  providerSettingsTitle: "Providers",
  providerSettingsDescription: "Choose built-in models or add a custom HTTPS endpoint.",
  providersLabel: "Model Providers",
  providerSearchLabel: "Search Providers",
  providerSearchPlaceholder: "Search Providers…",
  providerSearchEmpty: "No Providers match this search.",
  providerBuiltInSection: "Built-in Providers",
  providerCustomSection: "Custom Endpoints",
  providerAddCustom: "Add",
  providerAddCustomTitle: "Add a custom endpoint",
  providerAddCustomDescription:
    "Declare the protocol explicitly. SillyOS never guesses an API family from a URL.",
  providerCustomEmpty: "Add an HTTPS endpoint",
  providerCustomStatus: "Custom",
  providerCustomConfigured: "Available",
  providerCustomTestFailed: "Last test failed",
  providerCustomVerified: "Last test passed",
  providerCustomDescription: "This non-secret endpoint and model profile is stored on this device.",
  providerCustomSaveFailed: "This custom profile is invalid or could not be saved.",
  providerCustomNameLabel: "Name",
  providerCustomApiLabel: "API format",
  providerCustomEndpointHint:
    "HTTPS only. URL credentials, query strings, and fragments are not admitted; there is no HTTP exception for localhost or LAN endpoints.",
  providerCustomModelLabel: "Model ID",
  providerContextWindowLabel: "Context window",
  providerMaxTokensLabel: "Maximum output tokens",
  providerCustomPersistenceNotice:
    "The endpoint and model profile are stored on this device. Saving an API key keeps its exact endpoint binding in the Credential Vault until you Forget it or clear site data.",
  providerSaveCustom: "Save endpoint",
  providerRemoveCustom: "Remove",
  providerCustomModelProfileTitle: "Declared model profile",
  providerCustomModelProfileDescription:
    "These limits are supplied by you; they are not discovered or verified by SillyOS.",
  providerCatalogLoading: "Loading the model catalog…",
  providerCatalogLoadingDescription:
    "Provider and model details are loaded lazily from the product-bundled catalog.",
  providerCatalogFailed: "The model catalog is unavailable",
  providerCatalogFailedDescription:
    "No Provider or model was inferred locally. Retry the bundled catalog request.",
  providerCatalogEmpty: "No Providers are available.",
  providerDetailEmpty: "Choose a Provider to inspect its Browser status and models.",
  backToProviders: "Back to Providers",
  providerStatusAvailable: "Available",
  providerStatusUnavailable: "Unavailable",
  providerAvailableDescription:
    "Built-in Providers become Available when an API key is configured. A complete admitted custom endpoint is Available independently of its credential state.",
  providerBrowserUnavailable: "This Provider API is not available in the Browser target.",
  providerCredentialUnavailable:
    "This Provider's credential flow is not available in the Browser target.",
  providerPublicHttpUnavailable:
    "Public HTTP endpoints cannot be used from the deployed HTTPS application.",
  providerRouteConfigurationUnavailable:
    "This Provider needs configuration that the Browser product does not support.",
  modelsCountSuffix: "models",
  providerModelsTitle: "Available models",
  providerModelsDescription:
    "Choose which models appear in Agent Creator. The current composer choice is the preferred default; both are independent of the API key and connection diagnostics.",
  providerModelsEmpty: "No models are available for this Provider.",
  modelSearchLabel: "Search models",
  modelSearchPlaceholder: "Search model name or ID…",
  modelSearchEmpty: "No models match this search.",
  creatorModelSelection: "Agent Creator model",
  creatorSelectModel: "Select model",
  creatorModelSwitching: "Switching model…",
  creatorNoConnectedModels: "No checked model is currently available to Agent Creator.",
  creatorModelSettings: "Model settings",
  creatorReasoningEffort: "Reasoning effort",
  creatorReasoningEffortSelection: "Agent Creator reasoning effort",
  creatorReasoningEffortSwitching: "Changing reasoning effort…",
  creatorReasoningEffortOff: "Off",
  creatorReasoningEffortMinimal: "Minimal",
  creatorReasoningEffortLow: "Low",
  creatorReasoningEffortMedium: "Medium",
  creatorReasoningEffortHigh: "High",
  creatorReasoningEffortXHigh: "Extra high",
  creatorReasoningEffortMax: "Maximum",
  creatorModelTitle: "Use with Agent Creator",
  creatorModelDescription:
    "This device-local preference configures the current supervisor. The key never becomes Program or Workspace data.",
  providerConnectionModelRequired:
    "Choose at least one available model before running Agent Creator. Saving an API key does not change model preferences.",
  selectedModelUnavailable:
    "The selected model is not available through this Provider in the current Browser build.",
  providerConnectionTitle: "Connection",
  providerConnectionDescription:
    "Store one API key for the fixed endpoint scopes below. Model visibility and connection tests are configured separately.",
  providerConnectionModelLabel: "Test with model",
  providerConnectionModelDescription:
    "Choose any technically callable model from this Provider. This ignores visibility checkboxes and does not change your preferred model.",
  providerConnectionModelEmpty: "No model is callable from this Browser build",
  providerEndpointLabel: "Endpoint",
  providerEndpointPresetDescription:
    "Fixed endpoint scopes from the bundled Provider catalog; they cannot be edited.",
  providerEndpointCustomDescription:
    "Saved in this custom profile; add another profile to change it.",
  providerEndpointManaged: "This Provider resolves its endpoint from additional configuration.",
  providerConnectionTestNotice:
    "Testing is optional and may send a potentially billable request for the selected technically callable model. Results are point-in-time diagnostics and never change model preferences or availability.",
  providerShowKey: "Show API key",
  providerHideKey: "Hide API key",
  providerTestConnection: "Test connection",
  providerTesting: "Testing…",
  providerTestResultPointInTime:
    "A test result describes only that request. It never changes checked models, the preferred model, Provider availability, or qualification state.",
  providerTestRequiresSavedKey: "Save an API key before testing this connection.",
  providerKeyLabel: "API key",
  providerKeyPlaceholder: "Paste the Provider API key",
  providerReplacementKeyPlaceholder: "Paste a new key to update the saved key",
  providerSaveCredential: "Save",
  providerUpdateCredential: "Update",
  providerSaving: "Saving…",
  providerCredentialSaved: "API key saved in Credential Vault",
  providerWorkerUnavailable:
    "The Agent Worker is unavailable. The saved key remains in the Credential Vault and can be handed to a fresh Worker when the Agent restarts.",
  providerConnectionPassed: "Last connection test passed",
  providerConnectionFailed:
    "The optional connection test failed. Check the key, tested model, endpoint, and Browser access. This diagnostic does not change the saved key, model preferences, or Provider status; an Agent call reports its own failure.",
  providerDeleteCredential: "Delete saved API key",
  providerDeletingCredential: "Deleting…",
  credentialVaultTitle: "Credential Vault",
  credentialVaultDescription:
    "Provider keys are saved here until you Forget them or clear site data. Fresh installs use Automatic unlock; Password mode adds explicit Lock and Unlock.",
  credentialVaultLockedTitle: "Locked",
  credentialVaultLockedDescription:
    "Password mode is locked. Saved Provider keys stay unavailable until you enter the Vault password.",
  credentialVaultUnlockedTitle: "Unlocked",
  credentialVaultUnlockedDescription:
    "The Vault can hand an exact saved Provider key directly to its matching Agent Worker.",
  credentialVaultUnavailableTitle: "Unavailable",
  credentialVaultUnavailableDescription:
    "This browser cannot open the local Credential Vault, so Provider keys cannot be saved or used until it becomes available.",
  credentialVaultBusyTitle: "Updating Credential Vault…",
  credentialVaultBusyDescription: "Wait for the current Vault action to finish.",
  credentialVaultFailedTitle: "Credential Vault action failed",
  credentialVaultFailedDescription:
    "The requested Vault action did not finish. Retry before saving or using a Provider key.",
  credentialVaultModeTitle: "Unlock mode",
  credentialVaultAutomaticMode: "Automatic",
  credentialVaultAutomaticDescription:
    "Uses a random non-extractable device key created and stored inside the Vault boundary. No password is required.",
  credentialVaultPasswordMode: "Password",
  credentialVaultPasswordDescription:
    "Uses your Vault password. You explicitly Lock and Unlock access to saved Provider keys.",
  credentialVaultSwitchToAutomatic: "Use Automatic unlock",
  credentialVaultSwitchToPassword: "Use Password mode",
  credentialVaultChangePassword: "Change password",
  credentialVaultAutomaticSecurityNotice:
    "Automatic unlock does not provide locked-state protection for local ciphertext: the persisted device key remains available to this browser. The independent Workspace Sandbox is the primary boundary keeping generated and project code away from Provider keys.",
  credentialVaultPasswordSecurityNotice:
    "Only Password mode while locked protects local ciphertext with a secret that is not stored by the browser. An unlocked control plane can still use the key, and this does not promise protection from XSS, malicious extensions, or a compromised device.",
  credentialVaultSavedUntilForget:
    "Provider keys remain saved until you Forget them or clear this site's data.",
  credentialVaultPassphrase: "Vault password",
  credentialVaultConfirmPassphrase: "Confirm password",
  credentialVaultCreate: "Create Vault",
  credentialVaultUnlock: "Unlock",
  credentialVaultLock: "Lock",
  credentialVaultPassphraseMismatch: "Passwords do not match.",
  credentialVaultBindingsTitle: "Saved Provider keys",
  credentialVaultBindingsCountSuffix: "saved",
  credentialVaultBindingsEmpty: "No Provider API key is saved.",
  credentialVaultForgetBinding: "Forget",
  samplePrompts: [
    "Translate a visual novel and keep each character’s voice consistent",
    "Turn my research notes into a chapter-by-chapter writing room",
    "Create a role-play studio with editable character and world memory",
  ],
};

const chineseV1: SillyOsCopyV1 = {
  locale: "zh-CN",
  productName: "SillyOS",
  preview: "预览",
  creatorName: "Agent Creator",
  creatorKicker: "唯一的内置程序",
  creatorTitle: "你想创作什么？",
  creatorDescription:
    "描述你想得到的结果。Agent Creator 会提出一个专注的程序，把指令、能力、工作内容和人工审查界面组织在同一个工程中。",
  creatorPlaceholder:
    "例如：翻译这部视觉小说，保留每位角色的说话风格，并把不确定的文本放进人工审查队列……",
  create: "创建程序",
  examplesLabel: "从一个想法开始",
  recentProgramsLabel: "最近的程序",
  browserLocal: "保存在此浏览器中",
  recentProgramsEmpty: "你在这里创建的程序会出现在此浏览器中。",
  programsLoading: "正在打开本地 Program 目录……",
  programsUnavailable: "本地 Program 目录当前不可用。",
  loadMorePrograms: "载入更多程序",
  loadingMorePrograms: "正在载入更多程序……",
  openProgram: "打开程序",
  openingProgram: "正在打开程序……",
  savingProgram: "正在保存 Program……",
  retry: "重试",
  persistenceFailure: "Program 未保存；上一个已提交版本保持不变。",
  persistenceConflict: "另一个页面已更新此 Program，已重新打开持久版本。",
  persistenceOutcomeUnknown: "正在核对 Program 是否已经提交……",
  programKindTranslation: "翻译",
  programKindWriting: "写作",
  programKindRoleplay: "角色扮演",
  programKindGeneral: "创作工具",
  home: "Creator 首页",
  chat: "对话",
  loadOlderTranscript: "载入更早的消息",
  loadingOlderTranscript: "正在载入更早的消息……",
  transcriptUnavailable: "无法载入当前对话。",
  transcriptInterrupted: "这条回复在完成前被中断。",
  retryInterruptedRun: "重试中断的运行",
  transcriptSystem: "系统",
  transcriptTool: "工具",
  transcriptReasoning: "推理摘要",
  transcriptToolCall: "工具调用",
  transcriptToolResult: "工具结果",
  transcriptArtifact: "产物",
  previewTab: "界面",
  capabilitiesTab: "能力",
  fullscreen: "全屏打开",
  exitFullscreen: "退出全屏",
  closePreview: "关闭工作界面",
  openPreview: "打开工作界面",
  sendPlaceholder: "告诉 Agent 你想修改什么……",
  send: "发送",
  accept: "接受程序",
  reject: "拒绝方案",
  accepted: "已接受程序",
  rejected: "已拒绝方案",
  proposedProgram: "建议的程序",
  workspaceReview: "工作区审查",
  acceptedSnapshot: "已接受快照",
  pendingReview: "待审查方案",
  snapshotId: "快照 ID",
  proposalId: "方案 ID",
  programRevision: "Program 版本",
  acceptedHead: "已接受版本头",
  reviewedHead: "已审查版本头",
  mutableHead: "当前工作版本头",
  generation: "代次",
  fileCount: "文件数",
  archiveSize: "归档字节数",
  mutableHeadUnavailable: "不可用",
  pendingReviewMatches: "当前工作副本与已审查方案一致。",
  pendingReviewChanged:
    "工作区在本方案完成审查后发生了变化。请先让 Agent Creator 生成新的修订版本，再执行接受。",
  pendingReviewUnavailable: "当前工作版本头不可用，因此无法判断它与本方案的关系。",
  acceptedSnapshotMatches: "当前工作副本与已接受快照一致。",
  acceptedSnapshotChanged: "当前工作副本在已接受快照之后发生了变化；这些变化尚未被接受。",
  acceptedSnapshotUnavailable: "当前工作版本头不可用，因此无法判断它与已接受快照的关系。",
  workspaceAria: "SillyOS 程序工作区",
  resizeAria: "调整对话区和工作界面的宽度",
  mobileNavigation: "工作区视图",
  piTestTitle: "浏览器 Pi 接线检查",
  piTestDescription:
    "使用产品固定的 Pi 0.84.4 Agent 和确定性本地 provider；不会连接 LLM，也不会校验真实 provider key。",
  piTestKeyLabel: "合成测试 key（仅内存）",
  piTestKeyPlaceholder: "输入可随时丢弃的测试值",
  piTestInitialize: "初始化 Pi 测试",
  piTestLoading: "正在加载 Browser 适配器……",
  piTestInitializing: "正在启动 Agent Worker……",
  piTestReady: "Pi 测试已就绪",
  piTestFailed: "Pi 测试不可用",
  piTestDraft: "Agent Creator 草稿",
  piTestCancel: "取消运行",
  piTestForget: "忘记测试 key",
  piLiveFailed: "Provider Agent 不可用",
  creatorReadinessCatalogLoadingTitle: "正在载入模型 Provider",
  creatorReadinessCatalogLoadingDescription: "正在读取此设备上的 Provider 与模型设置。",
  creatorReadinessCatalogFailedTitle: "Provider 目录不可用",
  creatorReadinessCatalogFailedDescription: "打开 Provider 设置并重试产品随附的目录。",
  creatorReadinessVaultLoadingTitle: "正在打开凭据保险库",
  creatorReadinessVaultLoadingDescription: "正在为当前会话准备已保存的 Provider Key。",
  creatorReadinessVaultUnavailableTitle: "凭据保险库不可用",
  creatorReadinessVaultUnavailableDescription:
    "保险库恢复可用前，此浏览器无法使用已保存的 Provider Key。",
  creatorReadinessVaultLockedTitle: "凭据保险库已锁定",
  creatorReadinessVaultLockedDescription: "解锁保险库后才能使用已保存的 Provider Key。",
  creatorReadinessModelRequiredTitle: "请选择模型",
  creatorReadinessModelRequiredDescription: "至少勾选一个希望 Agent Creator 使用的模型。",
  creatorReadinessCredentialRequiredTitle: "需要 API Key",
  creatorReadinessCredentialRequiredDescription: "请为提供已选模型的 Provider 保存 API Key。",
  creatorReadinessAgentInitializingTitle: "正在启动 Agent Creator",
  creatorReadinessAgentInitializingDescription: "正在为当前会话准备所选模型。",
  creatorReadinessAgentFailedTitle: "Agent Creator 不可用",
  creatorReadinessAgentFailedDescription: "打开 Provider 设置，更换模型或更新 Provider API Key。",
  creatorReadinessOpenProviders: "打开 Provider 设置",
  creatorReadinessOpenVault: "打开凭据保险库",
  networkAccessTitle: "网络访问",
  networkAccessToggle: "允许网络访问",
  networkAccessDescription:
    "默认关闭。启用后，Agent 工具可以为此 Program 通过 HTTPS 抓取页面和下载文件；完整 URL 的路径与查询参数可能发送至远程站点，且仍受浏览器 CORS 限制。",
  settings: "设置",
  productMenu: "SillyOS 菜单",
  settingsTheme: "主题",
  settingsThemeDescription: "使用浅色或深色外观，或跟随此设备的系统设置。",
  themeSystem: "跟随系统",
  themeLight: "浅色",
  themeDark: "深色",
  settingsBack: "返回 Agent Creator",
  settingsCategoryGeneral: "通用",
  settingsCategoryProviders: "Provider",
  settingsCategoryCredentialVault: "凭据保险库",
  settingsGeneralDescription: "此浏览器中的产品级偏好设置。",
  settingsLanguage: "语言",
  settingsLanguageDescription: "选择 SillyOS 控件和产品文案使用的语言。",
  settingsDataManagement: "数据管理",
  settingsDataManagementDescription: "查看浏览器估算的空间用量，或清除此 SillyOS 安装的本地数据。",
  settingsStorageSillyOsData: "SillyOS 数据",
  settingsStorageSillyOsDataDescription: "产品、偏好设置与凭据保险库所在来源",
  settingsStorageWorkspaceData: "Workspace 数据",
  settingsStorageWorkspaceDataDescription: "独立 Workspace Sandbox 所在来源",
  settingsStorageChecking: "正在检查…",
  settingsStorageUnavailable: "无法获取估算",
  settingsStorageUsageUnavailable: "未报告已用空间",
  settingsStorageQuota: "配额",
  settingsStorageReportedTotal: "已报告用量合计",
  settingsStorageAdvisory:
    "浏览器提供的是按来源统计的参考估算。配额不是固定上限，也不能跨来源相加。",
  settingsStorageRefresh: "刷新用量",
  settingsClearAllTitle: "清空所有本地数据",
  settingsClearAllDescription:
    "删除此 SillyOS 安装保存的 Program、偏好设置、Provider 密钥和所有 Workspace 卷。",
  settingsClearAllAction: "清空所有数据",
  settingsClearAllConfirmTitle: "清空所有 SillyOS 数据？",
  settingsClearAllConfirmDescription:
    "此操作将从该浏览器删除 Program、偏好设置、Provider 凭据和 Workspace 文件；其他已打开的 SillyOS 标签页将回到主页。此操作无法撤销。",
  settingsClearAllConfirmWarning:
    "如果某个存储边界正忙或不可用，可能需要再次执行清空操作来删除剩余数据。",
  settingsClearAllCancel: "取消",
  settingsClearingAll: "正在清空…",
  settingsClearAllFailed: "部分本地数据未能清空。关闭此对话框后再试一次。",
  providerSettingsTitle: "Provider",
  providerSettingsDescription: "选择预设模型，或添加自定义 HTTPS Endpoint。",
  providersLabel: "模型 Provider",
  providerSearchLabel: "搜索 Provider",
  providerSearchPlaceholder: "搜索 Provider……",
  providerSearchEmpty: "没有符合搜索条件的 Provider。",
  providerBuiltInSection: "预设 Provider",
  providerCustomSection: "自定义 Endpoint",
  providerAddCustom: "添加",
  providerAddCustomTitle: "添加自定义 Endpoint",
  providerAddCustomDescription: "请明确选择协议；SillyOS 不会根据 URL 猜测 API 类型。",
  providerCustomEmpty: "添加 HTTPS Endpoint",
  providerCustomStatus: "自定义",
  providerCustomConfigured: "可用",
  providerCustomTestFailed: "最近一次测试失败",
  providerCustomVerified: "最近一次测试通过",
  providerCustomDescription: "这个不包含凭据的 Endpoint 与模型 Profile 会保存在当前设备。",
  providerCustomSaveFailed: "这个自定义 Profile 无效或无法保存。",
  providerCustomNameLabel: "名称",
  providerCustomApiLabel: "API 格式",
  providerCustomEndpointHint:
    "仅支持 HTTPS；不接受 URL 凭据、查询参数与片段，也不会为 localhost 或 LAN Endpoint 放宽 HTTP 限制。",
  providerCustomModelLabel: "模型 ID",
  providerContextWindowLabel: "上下文窗口",
  providerMaxTokensLabel: "最大输出 token",
  providerCustomPersistenceNotice:
    "Endpoint 与模型 Profile 会保存在当前设备。保存 API Key 后，其精确 Endpoint 绑定会留在凭据保险库中，直到你选择“忘记”或清除站点数据。",
  providerSaveCustom: "保存 Endpoint",
  providerRemoveCustom: "移除",
  providerCustomModelProfileTitle: "声明的模型 Profile",
  providerCustomModelProfileDescription: "这些限制由你提供，并非 SillyOS 自动发现或验证。",
  providerCatalogLoading: "正在加载模型目录……",
  providerCatalogLoadingDescription: "Provider 与模型详情会从产品随附的目录中按需加载。",
  providerCatalogFailed: "模型目录不可用",
  providerCatalogFailedDescription: "SillyOS 没有在本地猜测 Provider 或模型；请重试目录请求。",
  providerCatalogEmpty: "当前没有可用的 Provider。",
  providerDetailEmpty: "请选择一个 Provider，查看其浏览器状态与模型。",
  backToProviders: "返回 Provider 列表",
  providerStatusAvailable: "可用",
  providerStatusUnavailable: "不可用",
  providerAvailableDescription:
    "预设 Provider 只有在已配置 API Key 时才显示“可用”；完整且通过格式检查的自定义 Endpoint 独立显示“可用”，其凭据状态在连接配置中单独展示。",
  providerBrowserUnavailable: "这个 Provider API 在浏览器目标中不可用。",
  providerCredentialUnavailable: "这个 Provider 的凭据流程在浏览器目标中不可用。",
  providerPublicHttpUnavailable: "部署后的 HTTPS 应用无法使用公开 HTTP endpoint。",
  providerRouteConfigurationUnavailable: "这个 Provider 需要浏览器产品暂不支持的额外配置。",
  modelsCountSuffix: "个模型",
  providerModelsTitle: "可用模型",
  providerModelsDescription:
    "勾选希望在 Agent Creator 中显示的模型；当前输入框中的选择就是首选默认模型。两者都与 API Key 和连接诊断相互独立。",
  providerModelsEmpty: "这个 Provider 当前没有可用模型。",
  modelSearchLabel: "搜索模型",
  modelSearchPlaceholder: "搜索模型名称或 ID……",
  modelSearchEmpty: "没有符合搜索条件的模型。",
  creatorModelSelection: "Agent Creator 模型",
  creatorSelectModel: "选择模型",
  creatorModelSwitching: "正在切换模型……",
  creatorNoConnectedModels: "当前没有已勾选且可供 Agent Creator 使用的模型。",
  creatorModelSettings: "模型设置",
  creatorReasoningEffort: "推理强度",
  creatorReasoningEffortSelection: "Agent Creator 推理强度",
  creatorReasoningEffortSwitching: "正在切换推理强度……",
  creatorReasoningEffortOff: "关闭",
  creatorReasoningEffortMinimal: "最低",
  creatorReasoningEffortLow: "低",
  creatorReasoningEffortMedium: "中",
  creatorReasoningEffortHigh: "高",
  creatorReasoningEffortXHigh: "极高",
  creatorReasoningEffortMax: "最高",
  creatorModelTitle: "用于 Agent Creator",
  creatorModelDescription:
    "此设备上的模型偏好用于配置当前 supervisor；Key 永远不会成为 Program 或 Workspace 数据。",
  providerConnectionModelRequired:
    "运行 Agent Creator 前请至少勾选一个可用模型；保存 API Key 不会改变模型偏好。",
  selectedModelUnavailable: "当前浏览器版本无法通过这个 Provider 使用所选模型。",
  providerConnectionTitle: "连接配置",
  providerConnectionDescription:
    "为下方固定的 Endpoint 范围保存一个 API Key。模型可见性与连接测试在各自区域中独立设置。",
  providerConnectionModelLabel: "使用此模型测试",
  providerConnectionModelDescription:
    "可选择此 Provider 中任何技术上可调用的模型；这里不受可见模型勾选影响，也不会改变首选模型。",
  providerConnectionModelEmpty: "当前浏览器版本没有可调用模型",
  providerEndpointLabel: "Endpoint",
  providerEndpointPresetDescription: "由产品随附的 Provider 目录固定提供，不可编辑。",
  providerEndpointCustomDescription: "保存在此自定义 Profile 中；如需更改请新建 Profile。",
  providerEndpointManaged: "这个 Provider 需要通过额外配置解析 Endpoint。",
  providerConnectionTestNotice:
    "测试是可选操作，可能会为当前选择的技术上可调用模型发送一次可能计费的请求。结果仅是即时诊断，不会改变模型偏好或可用状态。",
  providerShowKey: "显示 API key",
  providerHideKey: "隐藏 API key",
  providerTestConnection: "测试连接",
  providerTesting: "正在测试……",
  providerTestResultPointInTime:
    "测试结果只描述该次请求；不会改变模型勾选、首选模型、Provider 可用状态或准入记录。",
  providerTestRequiresSavedKey: "请先保存 API Key，再测试此连接。",
  providerKeyLabel: "API Key",
  providerKeyPlaceholder: "粘贴 Provider API key",
  providerReplacementKeyPlaceholder: "粘贴新 Key 来更新已保存的 Key",
  providerSaveCredential: "保存",
  providerUpdateCredential: "更新",
  providerSaving: "正在保存……",
  providerCredentialSaved: "API Key 已保存到凭据保险库",
  providerWorkerUnavailable:
    "Agent Worker 当前不可用；已保存的 Key 仍留在凭据保险库中，Agent 重启后可交给新的 Worker。",
  providerConnectionPassed: "最近一次连接测试通过",
  providerConnectionFailed:
    "可选连接测试失败；请检查 Key、被测模型、Endpoint 与浏览器网络访问。该诊断不会改变已保存的 Key、模型偏好或 Provider 状态；Agent 调用失败时会单独报告。",
  providerDeleteCredential: "删除已保存的 API Key",
  providerDeletingCredential: "正在删除……",
  credentialVaultTitle: "凭据保险库",
  credentialVaultDescription:
    "Provider Key 会保存在这里，直到你选择“忘记”或清除站点数据。新安装默认使用自动解锁；密码模式提供显式锁定与解锁。",
  credentialVaultLockedTitle: "已锁定",
  credentialVaultLockedDescription:
    "密码模式已锁定；输入保险库密码后才能使用已保存的 Provider Key。",
  credentialVaultUnlockedTitle: "已解锁",
  credentialVaultUnlockedDescription:
    "保险库可以把精确绑定的已保存 Provider Key 直接交给匹配的 Agent Worker。",
  credentialVaultUnavailableTitle: "不可用",
  credentialVaultUnavailableDescription:
    "此浏览器无法打开本地凭据保险库；在恢复可用前无法保存或使用 Provider Key。",
  credentialVaultBusyTitle: "正在更新凭据保险库……",
  credentialVaultBusyDescription: "请等待当前保险库操作完成。",
  credentialVaultFailedTitle: "凭据保险库操作失败",
  credentialVaultFailedDescription: "请求的保险库操作未完成；请先重试，再保存或使用 Provider Key。",
  credentialVaultModeTitle: "解锁模式",
  credentialVaultAutomaticMode: "自动",
  credentialVaultAutomaticDescription:
    "使用在保险库边界内创建并保存的随机、不可导出设备密钥；无需输入密码。",
  credentialVaultPasswordMode: "密码",
  credentialVaultPasswordDescription:
    "使用你的保险库密码；你需要显式锁定或解锁已保存 Provider Key 的访问能力。",
  credentialVaultSwitchToAutomatic: "使用自动解锁",
  credentialVaultSwitchToPassword: "使用密码模式",
  credentialVaultChangePassword: "修改密码",
  credentialVaultAutomaticSecurityNotice:
    "自动解锁不提供本地密文的锁定态保护：持久化设备密钥仍可由此浏览器使用。独立 Workspace Sandbox 才是隔离生成代码、项目代码与 Provider Key 的核心边界。",
  credentialVaultPasswordSecurityNotice:
    "只有密码模式处于锁定状态时，才会用浏览器未保存的秘密保护本地密文。已解锁控制面仍可使用 Key；这不承诺抵御 XSS、恶意扩展或已被入侵的设备。",
  credentialVaultSavedUntilForget: "Provider Key 会一直保存，直到你选择“忘记”或清除此站点的数据。",
  credentialVaultPassphrase: "保险库密码",
  credentialVaultConfirmPassphrase: "确认密码",
  credentialVaultCreate: "创建保险库",
  credentialVaultUnlock: "解锁",
  credentialVaultLock: "锁定",
  credentialVaultPassphraseMismatch: "两次输入的密码不一致。",
  credentialVaultBindingsTitle: "已保存的 Provider Key",
  credentialVaultBindingsCountSuffix: "项已保存",
  credentialVaultBindingsEmpty: "尚未保存任何 Provider API Key。",
  credentialVaultForgetBinding: "忘记",
  samplePrompts: [
    "翻译一部视觉小说，并保持每位角色的语言风格一致",
    "把我的调研笔记整理成可以逐章推进的写作工作室",
    "创建一个能编辑角色设定与世界记忆的 AI 角色扮演工作室",
  ],
};

const copyByLocaleV1: Readonly<Record<SillyOsLocaleV1, SillyOsCopyV1>> = Object.freeze({
  en: englishV1,
  "zh-CN": chineseV1,
});

export function getSillyOsCopyV1(locale: SillyOsLocaleV1): SillyOsCopyV1 {
  return copyByLocaleV1[locale];
}

function localeFromQueryV1(value: string | null): SillyOsLocaleV1 | null {
  if (value === null) return null;
  return sillyOsLocaleRegistryV1.find((locale) =>
    locale.value === value || locale.queryAliases.some((alias) => alias === value)
  )?.value ?? null;
}

/** Returns only an explicit, admitted locale for the current navigation. */
export function resolveSillyOsLocaleQueryOverrideV1(
  search = typeof location === "undefined" ? "" : location.search,
): SillyOsLocaleV1 | null {
  return localeFromQueryV1(new URLSearchParams(search).get("locale"));
}

/** URL overrides the persisted preference; navigator remains the first-install fallback. */
export function resolveSillyOsCopyV1(
  preferredLocale: SillyOsLocaleV1 | null = null,
): SillyOsCopyV1 {
  const navigationLocale = resolveSillyOsLocaleQueryOverrideV1();
  if (navigationLocale !== null) return getSillyOsCopyV1(navigationLocale);
  if (preferredLocale !== null) return getSillyOsCopyV1(preferredLocale);
  if (typeof navigator !== "undefined") {
    const browserLocale = navigator.language.toLowerCase();
    const locale = sillyOsLocaleRegistryV1.find((candidate) =>
      candidate.navigatorPrefixes.some((prefix) => browserLocale.startsWith(prefix))
    )?.value;
    if (locale !== undefined) return getSillyOsCopyV1(locale);
  }
  return getSillyOsCopyV1(defaultSillyOsLocaleV1);
}

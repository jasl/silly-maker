// SPDX-License-Identifier: MIT

// eslint-disable-next-line no-underscore-dangle -- Vite replaces this fixed build-time token.
declare const __SILLYOS_WORKSPACE_SANDBOX_BUILD_IDENTITY__: string;

const workspaceSandboxBuildIdentityPatternV1 =
  /^sillyos\.workspace-sandbox\.(?:development|(?:[0-9a-f]{40}|[0-9a-f]{64})(?:-dirty)?)$/u;

export const browserWorkspaceSandboxArtifactBuildIdentityV1 = import.meta.env.DEV
  ? "sillyos.workspace-sandbox.development"
  : __SILLYOS_WORKSPACE_SANDBOX_BUILD_IDENTITY__;

if (!workspaceSandboxBuildIdentityPatternV1.test(browserWorkspaceSandboxArtifactBuildIdentityV1)) {
  throw new TypeError("sillyos.workspace_sandbox.build_identity_invalid");
}

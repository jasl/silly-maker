// SPDX-License-Identifier: MIT
/** Keeps consumers neutral while Composition owns the single backend choice. */
export {
  createDirectExtensionLifecycleBackendInternalV1 as createExtensionLifecycleBackendInternalV1,
  mountExtensionFactoryDirectInternalV1 as mountExtensionFactoryInternalV1,
} from "./direct-backend.ts";

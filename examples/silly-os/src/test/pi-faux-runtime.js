// SPDX-License-Identifier: MIT

// Keep the Provider package behind the same JavaScript boundary as the product
// runtime. The adjacent declaration exposes only the test behavior exercised by
// SillyOS instead of importing every bundled Provider SDK type into the root
// repository typecheck.
export { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@earendil-works/pi-ai";

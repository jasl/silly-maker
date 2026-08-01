// SPDX-License-Identifier: MIT

try {
  Object.defineProperty(Date, "parse", { value: () => 0 });
} catch {
  // The tripwire latch, not the platform TypeError, owns the classification.
}

export const intentionalAmbientDateReflectionV1 = true;

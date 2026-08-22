// SPDX-License-Identifier: MIT

interface ImportMeta {
  readonly hot?: {
    accept(handler: (module: unknown) => void): void;
    invalidate(message?: string): void;
  };
}

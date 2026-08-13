// SPDX-License-Identifier: MIT
// The launch-editor npm package ships no type declarations.
declare module "launch-editor" {
  export default function launch(
    file: string,
    specifiedEditor?: string,
    onErrorCallback?: (fileName: string, errorMessage: string | null) => void,
  ): void;
}

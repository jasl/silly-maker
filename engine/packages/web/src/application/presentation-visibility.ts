// SPDX-License-Identifier: MIT

/**
 * Keeps the Web Host's presentation clock paused while the document is
 * hidden. The clock owns elapsed-time continuity; consumers such as VN holds,
 * typewriter reveal, and shared Stage motion do not each reimplement page
 * visibility accounting.
 *
 * @internal
 */
export function bindDocumentPresentationVisibilityInternalV1(input: {
  readonly document: Document;
  readonly presentation: {
    pause(): void;
    resume(): void;
  };
}): () => void {
  const apply = (): void => {
    if (input.document.visibilityState === "hidden") input.presentation.pause();
    else input.presentation.resume();
  };
  input.document.addEventListener("visibilitychange", apply);
  apply();
  return () => input.document.removeEventListener("visibilitychange", apply);
}

// SPDX-License-Identifier: MIT
import type { HostFilePortV1 } from "@sillymaker/base/host";

/**
 * File port for pages served by the desktop shell: the embedded webview does
 * not honor `<a download>` clicks, so downloads POST their bytes to the
 * shell's `/sillymaker/files/download` endpoint and land in the platform
 * Downloads folder. File selection stays on the browser picker (the webview
 * renders the native open panel itself).
 */
export function createShellFilePortV1(input: {
  readonly baseUrl: string;
  /** Browser port used for `selectOne` (and nothing else). */
  readonly picker: HostFilePortV1;
  readonly fetchImpl?: typeof fetch;
}): HostFilePortV1 {
  const fetchImpl = input.fetchImpl ?? fetch.bind(globalThis);
  return ({
    selectOne: (request: Parameters<HostFilePortV1["selectOne"]>[0]) =>
      input.picker.selectOne(request),
    async download(request: Parameters<HostFilePortV1["download"]>[0]) {
      const payload = Uint8Array.from(request.bytes);
      const response = await fetchImpl(`${input.baseUrl}/download`, {
        method: "POST",
        headers: {
          "content-type": request.mediaType,
          "x-sillymaker-filename": encodeURIComponent(request.filename),
        },
        body: payload,
      });
      if (!response.ok) {
        throw new Error(`shell download failed (${String(response.status)})`);
      }
    },
  });
}

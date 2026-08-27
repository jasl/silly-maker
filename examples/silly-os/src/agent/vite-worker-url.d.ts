// SPDX-License-Identifier: MIT

declare module "*?worker&url" {
  const workerUrl: string;
  export default workerUrl;
}

interface ImportMetaEnv {
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// SPDX-License-Identifier: MIT

/** Source-tree/default package selection: no companion and no subprocess graph. */
export interface SelectedDesktopCompanionInternalV1 {
  handle(request: Request, subPath: string, search: string): Promise<Response>;
  close(): Promise<void>;
}

export function createSelectedCompanionInternalV1(_input: {
  readonly moduleDir: string;
  readonly userDataDir: string;
}): SelectedDesktopCompanionInternalV1 | null {
  return null;
}

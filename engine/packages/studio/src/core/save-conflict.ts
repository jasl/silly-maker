// SPDX-License-Identifier: MIT
import type {
  AuthoringDocumentSessionV1,
  AuthoringSessionOpenResultV1,
  AuthoringSessionSaveResultV1,
} from "@sillymaker/ui/debug";

export interface SaveWithConflictRefreshResultInternalV1 {
  readonly save: AuthoringSessionSaveResultV1;
  readonly refresh: AuthoringSessionOpenResultV1 | null;
}

/** One 409 recovery rule shared by every Studio document workspace. */
export async function saveWithConflictRefreshInternalV1<TDocument>(
  session: AuthoringDocumentSessionV1<TDocument>,
  input: { readonly document?: TDocument } = {},
): Promise<SaveWithConflictRefreshResultInternalV1> {
  const save = await session.save(input);
  if (save.kind !== "error" || save.code !== "digest_conflict") {
    return Object.freeze({ save, refresh: null });
  }
  const refresh = await session.refreshSaved();
  return Object.freeze({ save, refresh });
}

// SPDX-License-Identifier: MIT

declare const Deno: { readonly readTextFile: (path: string) => Promise<string> };

export const intentionalAmbientEnvironmentRootV1 = Deno.readTextFile("deno.json");

<!-- SPDX-License-Identifier: MIT -->

# SillyMaker website

The public site combines Astro + Starlight documentation with a focused
SillyMaker GUI application. It keeps the ordinary documentation workflow close
to VitePress:

- write normal documentation as Markdown under `src/content/docs/`;
- use MDX only when a page needs a React component or a custom layout;
- keep English at the root and mirror every public page under `zh/`;
- run `deno run dev`, `deno run build`, and `deno run preview` from this
  directory. The equivalent repository-root tasks are `deno task docs:dev`,
  `deno task docs:build`, and `deno task docs:preview`.

The landing page and documentation shell are website-owned Starlight component
overrides. Its full-width navigation console is an in-page SillyMaker surface
running through GUI Composition, React Code Surfaces, and the Input Router. The
documentation page remains the Host: the headline, primary links, lower page,
and server-rendered console links are ordinary static site content. The console
handles only its own focused keyboard, pointer, and touch interaction; it does
not take ownership of global documentation navigation or load an
application-wide theme.

The current content tree establishes the new information architecture. A page
marked `TODO` owns that topic and URL even when its full guide has not yet been
rewritten. Do not bulk-copy retired VitePress prose merely to remove a TODO.

## Content and locale ownership

Starlight owns static page routing, navigation, built-in UI strings, Markdown
content, and the `/zh/` language switch. Website prose stays in ordinary
Markdown or MDX; it is not moved into runtime text packs. The localized home
console uses separate build-known GUI Composition documents while sharing one
React implementation.

The English and Chinese content trees use the same relative paths. When adding
or moving a page, update both trees and the shared sidebar in `astro.config.ts`
in the same change.

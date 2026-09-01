# Translation Program

This package defines SillyOS's bundled Translation Program. Bundling controls
only initial distribution: an imported package selecting the same available
runtime profile is admitted, installed, loaded, and executed by the same
SillyOS boundaries.

- SillyOS supplies the static Agent, Provider, VFS, available interpreters,
  and typed Translation batch harness.
- This Program supplies reusable instructions, references, workflow, and a
  closed two-field settings document.
- A Process supplies source files, confirmed translation context, mutable work,
  review decisions, checkpoints, and exports.

## Workflow

1. Import source bytes through a format-owned deterministic adapter.
2. Confirm source/target locale, document purpose, style, names, terminology,
   relationships, and protected content.
3. Let the Host select a bounded pending batch and inject only glossary entries
   that occur in that batch.
4. Translate the admitted batch with this package's instructions and the typed
   Translation completion tool.
5. Let the Host validate structure and completeness before any target is
   publishable.
6. Present semantic ambiguities and the candidate in structured human Review.
7. Commit only an accepted candidate to this Process.
8. Repeat from the last committed Process checkpoint.
9. Verify the complete Process workset, then export through the original format
   adapter.

## Settings

The package exposes complete defaults for `targetLocale` and `defaultStyle`,
the only settings consumed by the production Translation path. The Process UI
edits exactly those two values as JSON, and every value is admitted before it
becomes a preference. This package does not declare a settings schema because
the current Host has no schema-driven settings consumer. Provider credentials,
active-model selection, review flow, OCR, and export behavior remain outside
the settings document.

The package's immutable defaults supply the fallback when a Process has no
admitted override. A Process may store one complete admitted replacement
settings document before importing a source. At import, the controller resolves
the exact override against the package defaults and records the resulting
target locale and style in the Process workset. A later settings edit never
rewrites an existing workset, running request, or committed result, so the UI
offers this editor only before a workset exists. There is no separate mutable
Program-level preference. The complete settings document is optional. Missing
settings use defaults;
malformed JSON falls back as a whole, while a parseable partial document uses
its valid fields and falls back field by field with exact-path diagnostics.
This best-effort interpretation exists only for the current settings draft and
does not turn the document into a persisted merge patch. Only a complete
diagnostic-free Process replacement is a persistence candidate, so partial,
unknown, or invalid input never replaces the last saved preference.

Born-digital PDF import has one fixed behavior: it extracts a complete text
projection through the deterministic PDF adapter. Image-only PDFs and partial
extraction are rejected, OCR is not implemented, and the original PDF is never
rewritten. There is no PDF settings surface or configurable output mode.

Mechanical parsing, stable IDs, protected-token checks, completeness,
write-back, and structural verification are deterministic Host work. The
current formal package carries no fixed script; its manifest has `scripts: []`.
The model owns language judgment only. A failed batch remains a candidate and
never overwrites source data.

## Context policy

Load only the current stage instructions. Pass the model only the current
batch, short adjacent context, and Process facts or glossary entries relevant
to those units. Do not append the entire workset or all prior conversation
turns.

Keep the stable Program instructions and completion schema before dynamic
Process facts and batch text so providers can reuse a shared prompt prefix.

## Compatibility

The manifest compatibility value selects a SillyOS harness contract; it does
not ask SillyOS to preserve an old implementation. A Process pins the complete
immutable package reference selected when it was created. Installing a newer
package changes only the default for a newly created Process and never migrates
an existing Process or its VFS.

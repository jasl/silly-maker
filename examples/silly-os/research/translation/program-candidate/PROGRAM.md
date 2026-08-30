# Translation Program research candidate

This package is a clean-room research candidate, not a shipped Program or a
public package format. It tests the intended division of work:

- SillyOS supplies the static Agent, Provider, VFS, QuickJS, and typed
  Translation batch harness.
- This Program supplies reusable instructions, references, workflow, and a
  fixed deterministic script.
- A Process supplies source files, confirmed project context, mutable work,
  review decisions, checkpoints, and exports.

## Workflow

1. Import source bytes through a format-owned deterministic adapter.
2. Confirm source/target locale, document purpose, style, names, terminology,
   relationships, and protected content.
3. Run `translation-project.js prepare` to select a bounded pending batch and
   inject only glossary entries that occur in that batch.
4. Translate the admitted batch with `prompts/translate.md` and the typed
   Translation completion tool.
5. Run `translation-project.js validate` before any target is publishable.
6. Present semantic ambiguities and the candidate in structured human Review.
7. Run `translation-project.js commit` only after the candidate is accepted.
8. Repeat from the last committed project checkpoint.
9. Run `translation-project.js verify`, then export through the original
   format adapter.

## Settings

The package exposes `settings.schema.json` plus complete defaults. The research
UI may begin with a raw JSON editor, but every value must be admitted before it
becomes a preference. SillyOS owns Provider credentials and validates that a
selected model exists and satisfies the role's required text or image input;
the Program cannot grant itself a Provider or capability through JSON.

Program-level preferences supply the fallback for every later attempt whose
Process has no admitted override; changing them does not rewrite an earlier
attempt or committed result. A Process may store one complete admitted
replacement settings document. Each Agent attempt captures
the exact effective document when it begins, so an edit affects only a later
attempt or batch and never changes a running request or committed result.
The complete settings document is optional. Missing settings use defaults;
malformed JSON falls back as a whole, while a parseable partial document uses
its valid fields and falls back field by field with exact-path diagnostics.
This best-effort interpretation exists only for the current Agent attempt and
does not turn the document into a persisted merge patch. Only a complete
diagnostic-free Process replacement is a persistence candidate, so partial,
unknown, or invalid input never replaces the last saved preference.
Model-role references support separate translation, semantic-review, and OCR
routes without coupling credentials or Provider configuration to Program data.
The first PDF experiment never rewrites the original PDF. Its honest derived
outputs are translation JSON, translated Markdown, or bilingual Markdown.
The OCR preference and model role reserve a later experiment; this candidate
does not yet deliver OCR execution.

Mechanical parsing, stable IDs, protected-token checks, completeness,
write-back, and structural verification are script or Host work. The model
owns language judgment only. A failed batch remains a candidate and never
overwrites source data.

## Context policy

Load this entry first. Load the translation rules and prompt only for a
translation stage. Pass the model only the current batch, short adjacent
context, and project facts or glossary entries relevant to those units. Do not
append the entire project or all prior conversation turns.

Keep the stable Program instructions and completion schema before dynamic
project facts and batch text so providers can reuse a shared prompt prefix.

## Compatibility

`harnessCompatibility.revision` is a contract generation, not a request to run
old SillyOS code. After an application refresh, SillyOS should select its
latest implementation compatible with generation 1. `packageRevision`
identifies this research package's own content and is independent of the
harness implementation. This directory is not yet selected by the current
built-in loader; its manifest, script, settings, and UI implications become
runtime behavior only through the formal P5-B integration.

# Translation workbench request

Create a reusable Translation Program rather than a one-shot chat prompt.

The user may attach a supported file without naming its format. The Program
must preserve the original, deterministically extract stable translation
units, confirm terminology and relationships, translate in resumable bounded
batches, validate placeholders and locked glossary entries, present a
structured human review, and export a derived artifact.

Use deterministic operations for parsing, batch preparation, validation,
commit, verification, and export. Use the model only for translation and
semantic review. Expose optional settings for target locale, style, review
policy, translate/review/OCR model roles, and PDF behavior. Invalid or missing
settings must fall back without blocking the Process. OCR requires an image
capable model but is not part of the first delivered PDF path.

The Program must use only the capabilities and packaged assets offered by the
Creator. Do not invent another interpreter, Provider, credential store,
workflow runtime, or file format.

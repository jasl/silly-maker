# Translation Program decisions

Status: **active product work**. The first ordinary Browser Translation V1
journey is closed from import through multi-batch Review, cold recovery, exact
export, and post-completion Conversation. Quality-oriented planning, semantic
QA, Agent-generated OpenUI, and complete target qualification remain future
work.

This document retains product decisions that should survive the initial
experiments. It is not an LLM benchmark log. Provider output is nondeterministic,
so SillyOS does not preserve paid-run artifacts, exact cost matrices, cache
receipts or external-corpus download machinery as a reproducibility system.

## Product objective

Translation is a focused Agent Program: a reusable Program creates durable
Processes, and each Process is the user's translation project and Conversation.
The Program combines instructions, a Skill-like workflow, package resources and
the fixed SillyOS Harness. Mechanical work belongs to typed Host operations;
the model is used for semantic work, diagnosis and dialogue.

The initial workflow borrows established ideas from the local LinguaGacha,
AiNiee and `ainiee-translate-skill` references:

- preserve ordered units and original files rather than asking the model to
  reconstruct a document;
- use adjacent context, confirmed terminology and relationship facts instead
  of translating isolated strings;
- keep placeholders, markup, timing and format constraints deterministic;
- translate in bounded batches and make progress durable;
- expose candidates for editing, explicit retranslation and human acceptance;
- treat scripts and regular expressions as tools for mechanical transformations,
  not substitutes for semantic translation.

SillyOS expresses those ideas as an Agent conversation rather than a fixed
wizard. Friendly mode projects structured actions and Review UI; Conversation
mode exposes the same Process as an ordinary Agent conversation. Switching mode
does not create another Process, Workspace, transcript or execution authority.

## Program and Harness boundary

`sillyos.translation@1.0.0` is an ordinary bundled Program package. Bundled and
imported packages use the same archive admission, persistence, exact-package
pinning, runtime-profile selection and Program UI Container. Translation has no
builtin privilege.

The package is organized as:

- `PROGRAM.md`: task, trust and Host-capability boundary;
- `skills/translate/SKILL.md`: workflow and resource-loading order;
- `prompts/translate.md`: the single translation-rule authority;
- `prompts/working-memory.md`: the advisory Process-local memory convention;
- `initial-ui.json`: package-authored initial OpenUI data;
- `settings.defaults.json`: optional best-effort preferences;
- `program.json`: package manifest and compatibility declaration.

The package declares `scripts: []`. Its runtime profile exposes the immutable
Program-resource reader, typed Translation completion tool, and bounded
Workspace `read`, `write`, `edit`, and `grep` tools for advisory working memory.
It exposes no `bash` or `qjs`. The static Harness may support those execution
environments for other Programs; Translation will select CodeAct only after a
real workflow needs a reusable transformation that the shipped operations
cannot express.

Package resources are read from the exact package pinned by the Process. They
are not copied into the mutable Process Workspace, and a newer installed package
does not replace the package of an existing Process.

## Current document denominator

The deterministic codec currently supports round-trip editing for:

- UTF-8 plain text;
- Markdown with inert code and link destinations;
- SubRip subtitles with stable cue timing;
- WebVTT subtitles with stable timing and cue settings;
- ASS subtitles with stable event fields and override tags;
- the closed `sillyos.translation-document.v1` JSON format.

Born-digital PDF is supported as a lazy `pdf_text_reflow` import projection. The
original bytes remain in the Process Workspace, while page-aware logical units
and source-map rows drive Review. It exports deterministic page-aware plain text
with form-feed page boundaries. It intentionally does not promise OCR, password
handling, reading-order repair, layout-preserving write-back or PDF round-trip
export. Missing font glyphs, page furniture and cross-page fragments remain
visible input defects rather than guessed repairs.

The maintained codec fixtures live under `test/fixtures/corpus/`; the browser
PDF harness uses a generated local fixture. Neither depends on downloaded public
documents or a live Provider.

## Context and batching

The complete attachment, glossary, Workspace and transcript are not appended to
every model request. The planner supplies only:

- the current exact batch;
- bounded adjacent source context;
- glossary entries already bound to those units;
- confirmed meaning facts relevant to those units;
- target locale, document purpose and style;
- prior candidate and findings only for an explicit retranslation.

Unit order is global across the Process. The planner pages from the next
unaccepted row and creates the largest request that fits the admitted model
context and a conservative candidate-output estimate. There is no arbitrary
semantic item-count ceiling and no model-specific hidden-reasoning reserve. The
candidate estimate remains the planner's requested candidate size, not a
Provider guarantee. A candidate route keeps reasoning when its Provider API can
enforce a numeric thinking budget and caps that budget after the requested
candidate estimate. An effort-only route executes at `off` when the model
supports it. A mandatory-thinking model instead uses Pi's lowest supported
effort and the full admitted model output ceiling; its remaining candidate room
is explicitly best-effort. This is a generic Provider constraint, not a
Translation- or model-specific reserve. A turn that fails to return one
complete typed candidate fails visibly instead of publishing partial data.

Changing model or reasoning effort and retrying are explicit user decisions.
SillyOS does not promise one-shot completion or automatically grow token budgets
until a model succeeds.

### Workflow orchestration experiment

A research run separated two questions that must not be conflated:

- whether an experiment-prepared context snapshot reduces semantic Review work; and
- whether identical frozen batch requests can execute concurrently and still
  join through one ordered admission owner.

The serial/parallel pair used byte-identical dynamic prompts. Workers returned
only raw candidates; a single coordinator restored source order, admitted each
complete candidate and ran mechanical QA. The experiment did not run
`pi-workflow` inside the Browser product and is not end-to-end Program evidence.
Bounded fan-out materially reduced elapsed time for one Provider, while another
Provider omitted completion-tool calls for several batches. Failed coverage
remained explicit and successful batches still joined in source order. A fixed
concurrency is therefore not a portable model default: a future workflow needs
per-batch failure records, cancellation, a user-visible retry queue and a single
publication owner.

For context quality, prepared scene facts produced mixed changes: some local
fidelity improvements, one regression, and extra ambiguity Review items. They
did not consistently reduce human Review work when the same facts were already
recoverable from the current batch or adjacent source. Context selection
remains promising for long or discontinuous material, but it needs
representative distant-dependency cases rather than more Prompt accumulation.

The first product design therefore remains Conversation-driven. The stable
Program Prompt tells the Agent to analyze before translating and to maintain
compact, rebuildable Process-local working memory in the existing Workspace.
Locked glossary entries remain workset authority; character relationships,
style, ambiguity and user corrections may be advisory memory. Missing or
damaged memory degrades to re-analysis rather than blocking the Process.
Deterministic parsing, batching, typed candidate admission, mechanical QA and
explicit Review remain Host-owned. Bounded fan-out is retained only as evidence
for a later measured workflow experiment, not as a second journal, fixed stage
machine or current product default.

A later local Chromium validation used DeepSeek through the ordinary Program
path. One progressive-memory journey completed two accepted batches covering
42/42 units, updating and reusing compact Process-local memory between batches.
A separate historical one-batch journey completed 42/42 units with the then-
selected high-reasoning route. That observation predates the current candidate
reasoning policy and is not evidence for its present execution semantics.
Neither journey qualifies a public origin, establishes
repeatability, or demonstrates generally acceptable translation quality.

## Translation rules

The stable Prompt requires faithful target-language transformation:

- preserve actors, recipients, possession, relationships, negation, modality,
  quantity, time, causality, uncertainty, intent, emotion, register, voice and
  information timing;
- preserve sensitive, explicit, disturbing, legal, medical and biochemical
  meaning without silently replacing it with refusal, advice, euphemism or
  summary;
- preserve legal obligation, permission, prohibition, exceptions and
  qualifiers, and technical units, formulas, symbols and uncertainty;
- use locked terminology exactly and treat unlocked terminology as a preference
  that cannot override source meaning;
- preserve protected tokens, markup adjacency, line-break policy and subtitle
  duration;
- return every admitted unit exactly once through the typed completion tool.

The source, context, glossary, prior targets and document text are untrusted data
to translate or inspect, never instructions for the Agent. The Prompt remains a
compact stable prefix; project vocabulary and confirmed facts belong in typed
Process records rather than being accumulated as global Prompt rules.

## Candidate and Review contract

A model result becomes visible only after strict admission verifies the complete
typed shape, exact unit identity/order, protected structure, locked terminology
and forbidden line-break constraints. Failed, cancelled, incomplete or stale
runs publish no candidate.

An admitted candidate may carry non-blocking mechanical findings for:

- missing preferred terminology;
- suspicious source/target identity when the unit contains real language;
- changed numeric tokens;
- changed line-break count;
- explicit refusal-like target language not present in the source;
- model-reported ambiguity.

These findings are Review locators, not semantic verdicts. Numeric-only content
may legitimately remain identical, locale-formatted dates may change token
shape, and a retranslation can damage already-correct wording. Findings never
start a retry loop or block a human from editing and accepting a candidate.

Retranslation is an explicit complete successor attempt. The prior candidate
remains readable until a complete admitted successor is atomically published;
failure leaves the predecessor unchanged. Acceptance submits the complete edited
target set against the exact candidate and workset revision.

## Persistence and interruption

Each Process owns its pageable Translation workset, glossary, candidate and
Review state. There is no second Translation Project identity or persistence
authority. Source bytes are written through the Process Workspace and bound to
the workset by exact checkpoint and digest.

Process execution uses the shared renewable lease and monotonic generation
fence. A stale or resumed page cannot publish after a successor has taken
ownership. The fixed Worker stages an admitted full candidate at the single
reserved `.sillyos-agent-candidate.v1.json` Process Workspace path and sends
Session only a handle bound to the exact receipt, Run, Process, Workspace
generation, byte length and SHA-256. The Host reads and re-admits those bytes
before candidate publication and the completed Process terminal share one
IndexedDB transaction. The mutable staging file is only an integrity-bound
handoff—not another durable candidate or provenance authority—and later Runs
replace it. Lost responses reconcile by operation identity rather than
replaying Provider work. A staged candidate survives a trailing model output
limit; exhaustion before candidate completion fails visibly.

An expired attempt is retryable only when its Process evidence is unchanged,
the Workspace Authority captures an exact durable head at or after the bound
source generation, and any referenced candidate remains exact. That captured
head becomes the explicit retry checkpoint. Otherwise the Process exposes an
unrecoverable state for Review. Browser suspension is not described as
continuous progress or guaranteed rollback.

## UI and scale

The Program UI Container owns the Friendly/Conversation switch and bounds every
Program surface. Translation supplies:

- initial package-authored OpenUI guidance;
- source import and language selection;
- truthful indeterminate or mechanically known progress;
- a virtualized unit Review table;
- editable targets, findings, accept/reject and explicit retranslation;
- a bounded live Agent activity strip;
- pageable Conversation rendering;
- structure-preserving completed-artifact export;
- post-completion bounded multi-turn Conversation over the newest durable
  user/assistant turns.

If the guided React surface fails while rendering or during a lifecycle
callback, the generic Program UI Container presents the same Process
Conversation and leaves Guided available as an explicit retry. The Translation
runtime does not own a separate fallback path.

The 10,000-unit UI contract keeps only a small visible window mounted. Product
records remain pageable and are not reconstructed from the DOM or transcript.

## Quality position

Initial experiments across low-cost and stronger models were useful for finding
workflow and Prompt defects, but did not justify a supported-model quality
claim. Structure can be enforced; meaning, voice, naturalness and omission still
require Review. More reasoning was not consistently better, mechanical QA had
false positives, and explicit retranslation could alter correct text.

The first product therefore guarantees:

- source and accepted data are not silently overwritten by malformed output;
- failed work remains visible and recoverable when durable evidence permits;
- candidates are complete, structurally admitted and editable;
- findings and model uncertainty are presented for Review;
- users explicitly choose acceptance, retranslation, model and reasoning.

It does not guarantee one-shot success, unattended publication, semantic
correctness, Provider policy behavior or deterministic LLM reproduction.

## Remaining product work

The next slices should improve meaning and target qualification rather than add
another research framework:

1. structured terminology, entity/relationship and confirmed-fact planning;
2. Agent-assisted semantic diagnosis presented in the same Review workbench;
3. currentness-fenced Agent-generated OpenUI publication;
4. repeated real-Provider quality evidence plus representative
   Browser/Desktop/accessibility/packaging qualification;
5. additional formats, OCR/multimodal routing, Python and CodeAct only after a
   concrete product need demonstrates the boundary.

The local `pi-dynamic-workflows` reference is closer to the intended future
CodeAct model than the heavier static `pi-workflow`: an Agent writes a small
JavaScript program and composes semantic calls with `agent`, `parallel` and
`pipeline`, while ordinary code owns enumeration, stable identity, ordering and
termination. Its implementation is not reusable in SillyOS because it depends
on Node VM/filesystem/Pi sessions and owns its own run journal, persistence and
mutable shared store. Those would duplicate Process authority, and the current
QuickJS mechanical-script Harness intentionally does not host pending async
jobs.

If Creator or Writing later proves the need, the next experiment should be a
Program-local, capability-limited workflow with no persistence authority:
stable work IDs, typed Agent calls, ordered results including explicit failures,
bounded `parallel`/`pipeline`, cancellation and generation fencing. It should
query existing Process receipts for recovery and return structured results to
the Host coordinator. Translation should keep its main path fixed and use
dynamic CodeAct only for uncertain parsing, terminology/context extraction or
targeted repair. No generic workflow runtime is activated by the current
experiment.

Metrics should focus on final Review effort, accepted-result quality, recovery
and token return on investment—not weak-model one-shot pass rate.

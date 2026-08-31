# Translation Program research plan

Status: **P5-A completed on 2026-08-31; prompt revisions 4 and 5 have recorded
model-protocol evidence, including a revision-5 confirmed-plan ablation. The
first formal P5-B route/storage foundation is implemented: an ordinary
Translation Process, Process-owned Workspace source import, durable V11 Project
head and pageable rows, cold reopen, and lazy born-digital PDF text projection.
The real Agent batch/commit/review/export workflow, OpenUI, and P5-B through
P5-D qualification remain incomplete**.

This plan activates the first real Program study described by
[PLAN.md](./PLAN.md#p5--translation-program). It asks whether SillyOS can carry
a reusable, multi-turn translation Program from an opaque user attachment to a
reviewed, format-preserving export. It is not a prompt bake-off, a claim that a
provider is supported, or permission to build a generic workflow framework in
advance of the product.

## Research question and denominator

The first denominator is one complete, inspectable journey:

1. accept one attachment without asking the user to identify its format;
2. propose a supported format and language pair, then admit that proposal into
   a closed product format;
3. extract stable, ordered source units while preserving non-translatable
   structure;
4. propose and let a human revise terminology, named entities, relationships,
   style, placeholders, tags, and other constraints;
5. translate in bounded committed batches and resume after an interruption;
6. expose source, target, context, QA findings, and review state for editing;
7. export the same supported format and prove that protected structure remains
   intact.

The Program may complete a small document in one Agent turn, but its Process
must remain usable as a multi-turn workbench. Conversation is the durable
explanation and decision record; translation units and exported artifacts are
product-owned records rather than text reconstructed from the transcript.

### Formal product foundation implemented after P5-A

The first formal slice deliberately stops before claiming an ordinary
Translation product journey. It establishes the following product-owned
foundations:

- a SillyOS-owned Program UI Container with `guided` (labelled “Simple” in the
  Translation UI) and `conversation` views over the same `processId`; switching
  presentation does not create another Process, Conversation, Workspace, or
  Agent authority;
- a closed Program UI boundary. Host-owned React surfaces are implementation
  inputs only. A later Program-produced OpenUI document must first be admitted
  as data and rendered by a closed SillyOS renderer inside the guided slot; it
  cannot supply a React node, portal, renderer, outer chrome, overlay, or
  activity strip;
- a bottom Agent-run projection that shows the latest activity line when
  collapsed and at most the latest three when expanded. Exact mechanical work
  may expose determinate completed/total progress; model work remains
  indeterminate. Elapsed time, cancellation, and expansion are supported, but
  the UI invents no completion percentage or ETA;
- a Translation workbench with import and language inputs, workflow stages,
  a virtualized unit list, and a target-detail/editor presentation on desktop
  and mobile. Durable target save/mutation is disabled and committed counters
  remain zero until the future candidate-commit loop. The 10,000-unit contract proves that only
  the visible row window enters the DOM. The later V11 repository slice now
  stores one compact Project head plus separately pageable unit and glossary
  rows; the UI paging source asks only for the visible bounded row window and
  does not move a complete aggregate through the Worker;
- an ordinary Translation Process route and controller. It publishes the
  built-in `sillyos.builtin.translation` Definition at revision 1, opens only an accepted Translation
  subject, creates one Process with its own Workspace and initial transcript,
  and cold-reopens the exact Process/Workspace binding without pre-acquiring an
  idle Workspace. Removing a subject from the current catalog does not erase an
  existing Process: it remains explicitly reopenable by `processId` at the
  controller boundary, although Home does not yet discover orphan Processes.
  Source import acquires the shared Process execution lease only after parsing,
  in the same IndexedDB transaction that verifies the Project is still absent
  or at the caller's exact staging revision;
  the Workspace write, Project begin, each byte-bounded append, and finalize all
  verify its exact attempt and fencing generation. The long Workspace write has
  an operation-scoped foreground renewal loop; later persistence cuts renew only
  near expiry. Browser suspension can still stop renewal, so correctness remains
  generation-fenced rather than claiming background execution. Project
  finalization and the completed Process terminal/checkpoint share one
  IndexedDB transaction, so a ready Project cannot coexist with a failed or
  uncheckpointed import attempt. An expired unfinished import is retained as
  explicitly unrecoverable for direct review, while a later Home start creates
  a fresh Process instead of reopening that terminal Process;
- a V11 Translation Project authority with a human-facing title, immutable
  source identity, compact progress counts, exact operation receipts, and
  pageable unit/glossary rows without an arbitrary total-row ceiling. Import
  admits File or bytes, computes the raw SHA-256, stores a canonical relative
  source path, imports the original through the same Browser Workspace
  Authority, and binds the resulting checkpoint before publishing the ready
  Project head;
- the four round-trip text formats plus a lazy born-digital PDF text-only path.
  PDF yields a truthful `pdf_text_reflow` projection and retains the original
  PDF bytes. Any per-page extraction diagnostic rejects the complete import
  because this slice has no durable partial-document review state. It does not
  claim OCR, layout-preserving translation, password UI, PDF rewriting, or PDF
  round-trip export;
- a batch-order correction for Project subsets: unit order remains global and
  contiguous across the complete Project, so a later batch may correctly begin
  at a non-zero `order` while still being checked against the authoritative
  Project selection; and
- a real fixed QuickJS 0.32 harness test for ordinary regular expressions,
  Unicode property escapes, lookbehind, and named capture groups. This proves
  the fixed SillyOS `qjs` environment can support those mechanics. It does not
  authorize `qjs`, `bash`, or Agent Workspace tools for Translation: the
  published Translation Definition advertises no capabilities and no
  Translation Agent execution profile exists.

The slice does **not** deliver a real Agent batching, candidate commit,
interruption/resume, structured Review, QA, or export loop; target-row mutation;
OpenUI production or rendering; Python; or CodeAct. The ordinary route and
durable import substrate are therefore implementation inputs to P5-B and P5-C,
not evidence that either stage has closed. The mounted workbench now connects
guided source import and bounded Project row paging to those controller
operations, but remains an import-and-browse foundation rather than a qualified
end-user import-to-export journey.

## Clean-room reference boundary

LinguaGacha and other local reference checkouts are product pressure sources
only. Research may inspect their user-visible workflow, terminology, failure
cases, and repository-owned test sample shapes. SillyOS does not copy their
source code, prompts, fixtures, assets, schemas, generated output, or product
names. Reference behavior is first written as an implementation-independent
observation; SillyOS then implements and tests an original contract against an
original corpus.

Any reference revision actually inspected must be recorded in the research
notes before its observation is used. A reference's successful output is not a
golden translation. Provider responses are experiment evidence, never fixtures
silently promoted into the repository. Licenses and notices remain the release
authority; this study does not create a parallel provenance system.

`references/pi-workflow` may be inspected for orchestration pressure, but P5
does not adopt its code, workflow language, or lifecycle. The first Program is
a product-owned state machine over the existing Program, Process, Conversation,
Workspace, and Agent Session contracts. `references/pi-subagents` is outside
this study: translation does not initially require delegation, a subagent
scheduler, parallel Agent authority, or cross-Agent reconciliation. Either
reference may be reconsidered only after a measured real journey demonstrates
a capability that cannot be expressed cleanly by the current single-Agent
flow.

### Recorded translation-reference observations

The 2026-08-31 review inspected these exact local revisions:

- AiNiee `633e366a475c8339e6b1d4f73fa03b69a5444e5c`;
- LinguaGacha `31cfd3fbcd15a37d227a67a14788a938eb0f26a2`;
- ainiee-translate-skill `11f58b050ff4019a5dc8d58e64fbdc181afa004a`.

AiNiee and ainiee-translate-skill are AGPL references. The latter explicitly
vendors and adapts AiNiee parsing/export code and reuses its cache and prompt
conventions, so none of that implementation or template text is eligible for
copying into this MIT product. LinguaGacha is a separate redesign rather than a
runtime dependency of the current checkout; it has no repository license file,
so this study likewise uses only implementation-independent behavior
observations. The implementation rule for this study is to author the SillyOS
prompt, schemas, codecs, fixtures, and tests independently against its own
corpus.

The common useful pattern is not one special prompt. It is a layered workflow:

1. keep a small stable execution contract for fidelity, unit mapping, protected
   structure, and candidate publication;
2. build a project-owned, human-confirmed translation profile containing only
   relevant terminology, entity/relationship facts, style decisions, and
   accepted examples;
3. calibrate a new project on a small representative sample before bulk work;
4. commit bounded batches to durable Process checkpoints and resume from the
   last admitted batch;
5. separate deterministic structure/glossary checks from semantic review and
   expose uncertain findings to a human instead of treating heuristics as a
   quality gate;

SillyOS adds one corrective requirement rather than copying the references:
an optional polish pass must produce another reviewable candidate instead of
overwriting the accepted translation. Both inspected AGPL implementations
replace their current translated text during polish, which is not an appropriate
authority model for this product.

The references do not establish translation quality by themselves. AiNiee's
current tests do not cover its translation prompt builder or semantic output.
ainiee-translate-skill contains focused tests for cache, batch, prompt assembly,
glossary, parse/export, polish, verify, and scan mechanics, but no recorded,
test-qualified provider-backed semantic run, executed human sample-confirmation
journey, semantic quality corpus, or crash-resume qualification. It prescribes a
human sample-confirmation mode, but the inspected repository does not record a
completed real journey through it. Its default batch-size and suggested/adaptive
parallelism heuristics, Latin-specific checks, global active module, whole-file
backup, and direct cache writes are reference-product choices rather than
SillyOS contracts.

## Original four-format corpus

The checked-in research corpus will be written specifically for SillyOS and
contain no reference-product or commercial text. It covers Chinese-to-English
first; a later reverse-language run may reuse the same structure without
becoming a completion gate.

| Format              | Original fixture                                                                                                                                                | Structural pressure                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Plain text          | A short fictional product brief with headings expressed only by line breaks, repeated terminology, ambiguous pronouns, dialogue, and literal placeholder tokens | paragraph boundaries, whitespace, glossary consistency, relationship inference, and an intentionally ambiguous format signal |
| Markdown            | An original fictional release guide containing headings, lists, emphasis, links, a table, inline code, fenced code, HTML-like tags, and placeholders            | translate prose while preserving Markdown, URLs, code, tags, and placeholder spelling                                        |
| SRT                 | An original short fictional scene with overlapping context, repeated speaker terms, punctuation across adjacent cues, and strict cue numbers/timestamps         | cue order and timing preservation, concise target text, adjacent-context reasoning, and no invented or dropped cue           |
| Translation JSON V1 | An original structured dialogue/resource file using the closed schema below, with stable IDs, context, locked entries, placeholders, and nested metadata        | exact key/order/type preservation, translate only admitted fields, retain locked entries and unknown admitted metadata       |

Translation JSON V1 is deliberately small and explicit:

```json
{
  "schema": "sillyos.translation-document.v1",
  "sourceLocale": "zh-CN",
  "targetLocale": null,
  "entries": [
    {
      "id": "scene.arrival.001",
      "text": "欢迎回来，{playerName}。",
      "context": "A station operator greets the returning player.",
      "locked": false,
      "metadata": { "speaker": "operator" }
    }
  ]
}
```

`sourceLocale` describes the source-side text and review context and therefore
does not change during export. `targetLocale` is `null` for an untranslated
workpiece and becomes the admitted target locale when unlocked `text` fields
are translated. `context`, locked entries, and metadata remain source-side
review evidence; they are not silently rewritten as target content.

The corpus must include a deterministic expected structural projection for each
fixture: format, ordered unit IDs, protected spans, and an export round-trip
oracle. It must not include a predetermined ideal translation. Human review
records adequacy and recurring errors without converting subjective prose into
a fake byte-exact model test.

## Responsibility split

### Deterministic product authority

SillyOS owns attachment bytes and size admission, a closed supported-format
catalog, exact parsers and exporters, stable ordered unit identity, protected
span extraction, immutable source text, batching, Process checkpointing,
currentness fencing, edits, review state, QA rule execution, and final export.
It also validates any model-proposed format, language pair, glossary entry,
constraint, unit result, and UI action before publication.

A model may suggest that opaque bytes are Markdown or SRT; that suggestion is
not authoritative until the corresponding deterministic parser accepts the
same bytes. Unsupported or ambiguous input remains an explicit user-reviewable
state. The model never rewrites a whole source file as the export mechanism.

### Model responsibility

The model may classify format and language, infer document purpose, propose
terminology and entity/relationship context, translate admitted source units,
explain ambiguity, and propose semantic or consistency QA findings. It receives
only bounded units plus the context and constraints needed for that step.

The model does not own Program or Process state, unit IDs, batch commitment,
Workspace publication, protected-span truth, retry policy, acceptance of its
own output, or final file serialization. A higher-intelligence model may improve
language quality; it must not be required to repair missing product invariants.

## Program package and context discipline

The Translation Program is not just its system prompt. Like a complex Skill, its
package combines concise entry instructions, selectively loaded references,
deterministic scripts/assets, and structured workflow/profile data. The fixed
SillyOS harness supplies Pi, Provider transport, VFS tools, interpreters, and UI
adapters; a Program selects from those capabilities but cannot install another
runtime or tool implementation.
The Program owns the reusable workflow, domain schema/operations, and
Program-owned UI definitions. A Process owns the actual translation records,
Conversation, user input, mutable work, review decisions, and exported
artifacts. It retains the immutable Definition content and compatibility
requirement that created it, so removing the Program from the current catalog
does not erase or silently reinterpret the Process. After refresh, a built-in
Program normally uses the newest SillyOS-shipped implementation compatible with
that requirement. The current prototype loader updates only its Agent
instructions, prompt projection, completion/admission, tool selection, and run
policy. Workflow, packaged scripts, and Program-owned UI join that rule only
when the formal Program package actually owns those facets. Committed Process
records are never rewritten by that update.

The first implementation slice only co-locates the two current build-known
built-in Program packages. Creator and Translation each own their current
instructions, prompt projection, completion contract, candidate admission,
selected fixed-tool subset, text-delta policy, Provider timeout, and output
envelope. Translation keeps `sillyos.harness.translation@1` while its current
system-prompt revision is 5. The Worker resolves the selected built-in package
before beginning an Agent run and does not fall back from an unknown reference.

This remains bootstrap structure rather than the final externally authored
Program package format. Today's persisted `harnessReference` selects a
compatibility generation, not an exact built-in source revision; the built-in
implementation may improve with SillyOS. P5-B must separately retain the exact
content of an externally authored package so a removed package cannot strand a
Process, while its compatibility marker selects a current fixed harness able to
execute that content.

The current lookup is only over shipped modules. Its dynamic imports defer
module initialization, while the Vite Worker IIFE still includes the package
bytes in one Worker asset. It is not a package manager, resource dependency
graph, workflow language, separate network-chunk claim, or general Program SDK.
Capability IDs remain descriptive Program data and do not grant runtime tools.

A Process VFS should eventually present the pinned Program tree read-only, keep
admitted user originals in an input area, and separate mutable intermediate work
from final output. Packaged scripts run from that Program tree through an
interpreter shipped by SillyOS. Agent-authored one-off scripts live only in the
Process work area until a human explicitly promotes them into a new Program
revision. Exact mount names and storage deduplication are not product contracts.

The implementation should prefer tools for mechanical work. Format probing,
parse/extract, stable unit construction, source matching, batch selection,
placeholder/tag checks, progress accounting, write-back, structural QA, and
export are deterministic operations. The Agent performs judgment: proposing a
project profile, resolving genuine ambiguity with a human, translating admitted
units, and identifying semantic concerns. It may author a one-off data script
inside the admitted Workspace when no shipped operation fits, but that script's
outputs remain candidates for the same validation and publication boundaries.
The first Translation slice uses shipped deterministic operations; one-off
script authoring is activated only when a real step demonstrates that those
operations are insufficient.

Each Agent attempt receives a stage-specific context projection, not an append
of everything known by the product. For a translation batch that projection is:

1. the stable execution contract and current workflow stage;
2. current human-confirmed language, terminology, entity/relationship, style,
   and example decisions relevant to the selected units;
3. the exact current source units, protected segments, local neighboring
   context, and unresolved questions;
4. exact references to prior accepted batches or artifacts when comparison is
   required; and
5. only the recent human exchange needed to understand a still-open decision.

The complete attachment, Workspace, project profile, accepted translations,
and Conversation must remain addressable through structured lookup or tools.
They are not copied into every prompt. Initial Profile matching, bounded query
results, and the final context projection must be repeatable and inspectable.
The Agent may request additional bounded context, but the Host records the exact
query and returned evidence; it cannot admit the whole project implicitly.
Source-matching terminology must become the first concrete selector delivered
in P5-B—the research runner demonstrates only the intended pressure. Available
context is calculated from admitted model-profile context metadata with space
reserved for the requested output, without inventing a fixed semantic item
limit. When the evidence does not fit, the product context planner reduces the
batch or loads a different slice instead of silently truncating it.

Conversation records explain decisions but are not workflow state. Any context
projection cache, if measurement later justifies one, must be rebuildable from
exact authoritative records rather than become another checkpoint schema.
Pi session compaction cannot become the sole copy of terminology, review state,
or progress, and SillyOS must be able to start a fresh model attempt from the
pinned Program plus durable Process state.

## Optional Program and Process settings

A Program may publish a closed settings schema and complete defaults. The first
research form uses JSON Schema plus raw JSON editing; a schema-rendered form can
reuse the same admission contract later. Program preferences establish the
fallback for every later attempt whose Process has no admitted override, while
a Process may supply its own document. Each attempt captures one immutable
effective snapshot, so a settings edit affects only later attempts or batches.

Settings are deliberately non-blocking. Missing settings use defaults; malformed
JSON falls back; and missing or invalid fields fall back to the next valid
Program or built-in value with exact diagnostics. Only a complete, schema-valid
canonical document is a persistence candidate, so invalid input never replaces
the last saved preference. The Program may expose model-selection references
for translation, semantic review, or OCR roles, but Provider credentials,
available routes, and text/image capability admission remain SillyOS-owned.
The research candidate and normalizer live under
`research/translation/program-candidate/`; they are not yet a general settings
repository or product UI.

## Tool packages, CodeAct, and structured Review

Translation may later use three execution forms without treating them as
interchangeable. Format adapters, stable unit construction, profile matching,
batching, structural QA, and export are ordinary typed product operations. A
Program-owned script is admitted, versioned content in the pinned Program
package and runs only through a fixed harness-owned interpreter/tool boundary.
The current built-in prototype comes from the build graph and carries no script;
a later dynamic Program package may carry script bytes without extending the
harness. A script written by the Agent is a mutable Process Workspace file and
may execute only after the workflow explicitly enters a CodeAct stage. Neither
script form is delivered for Translation yet.

The Browser already has bounded primitives suitable for testing a first CodeAct
slice: Pi remains the only tool dispatcher, its `bash` tool reaches the fixed
just-bash environment, and `qjs` lazily runs synchronous JavaScript in a fresh
bounded Worker over only the explicitly staged Workspace files. Guest code
receives no DOM, ambient network, Provider credential, or product-repository
authority. A real Translation workflow still has to validate that composition.
It is intended for short data transforms and checks, not a general development
container or an asynchronous workflow runtime.

The model must not expand its own live tool set. Translation currently selects
only its completion tool and has no Workspace tool profile. If a later real
workflow cannot express a mechanical step with shipped operations, it may admit
a structured CodeAct request containing the reason, exact input references, and
expected artifact. The Host could then start a fenced successor attempt with an
explicit CodeAct profile. That later attempt may author and run a Workspace
script, but its output must remain a candidate subject to the same domain
admission, currentness, and publication rules. Network remains a separate
explicit Program capability. No structured request, stage transition, fenced
successor, fixed-script asset, or Translation CodeAct profile exists yet.

Review also cannot remain only an explanatory chat response. The planned Review
product slice should use a Translation-owned React workpiece with:

- a filterable queue of pending, modified, confirmed, and finding-bearing units;
- immutable source, locator, nearby context, and protected-token evidence;
- editable target text beside relationship, omission, and terminology findings;
- explicit human dispositions such as corrected, not an issue, intentional
  exception, or follow up; and
- separate save-draft, confirm-current-target, and mark-follow-up operations.

The proposed minimum durable model is one immutable candidate revision, admitted
semantic finding proposals with exact source/target evidence, and one current
unit-review record containing the editable target revision and human decisions.
Agent output may propose candidates, findings, and replacement text; it cannot
confirm a unit, decide export eligibility, or write Repository revisions.
Product-private operations should use the current Process, candidate, target,
profile, and Repository revisions for CAS. Program and source identities should
be derived from those authoritative records rather than copied into every UI
intent.

OpenUI is not the first editor implementation. Its earliest useful slice is a
complete read-only review summary with unit navigation, mapped through the
existing `column`/`text`/`action` UiArtifact vocabulary. The ordinary React
editor owns text entry and confirmation. If a later Program proves a need for
writable generated UI, the generated artifact still only requests a typed
product operation and never becomes Review state or mutation authority.

## Dual-model experiment matrix

The initial study uses two deliberately named routes supplied through the
operator's existing research credentials:

- DeepSeek `deepseek-v4-flash`;
- OpenRouter `z-ai/glm-5.3-flash`.

No credential value is copied into SillyMaker, committed, printed, or written
to evidence. Provider/model discovery must confirm the exact route before a run;
an unavailable or incompatible route is a recorded environment/provider result,
not silently replaced by another model. The study makes no claim about either
route until the real calls and evidence review complete.

Each available model runs the same versioned Program revision, corpus revision,
source/target locale, deterministic extraction, constraint set, batch sizes,
and fresh Process. Temperature/reasoning controls and provider-reported model
identity are recorded where the provider exposes them. At minimum, each route
is exercised on all four formats in these stages:

| Stage       | Purpose                                                                             | Evidence                                                                                         |
| ----------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Intake      | format/language proposal and ambiguity handling                                     | proposal, parser admission result, corrections, latency, and usage                               |
| Planning    | glossary, entities/relationships, style, and protected constraints                  | admitted/rejected proposals and human corrections                                                |
| Translation | bounded unit batches, including one controlled interruption after a committed batch | per-batch output, constraint failures, retries, checkpoint, and resume result                    |
| Review      | semantic/consistency QA followed by human editing                                   | useful findings, false positives, missed known pressure cases, edits, and final review decisions |
| Export      | deterministic serialization independent of the model                                | structural oracle, parser reopen, protected-span result, and output artifact                     |

The matrix characterizes fitness and failure modes; it does not rank providers
or infer that untested OpenAI or Anthropic routes pass because these two do.

## Metrics and staged gates

Metrics are reported per format, model route, Program revision, and corpus
revision. A total score is not used.

1. **Deterministic floor:** every source parses into the expected stable unit
   projection; an unchanged target round-trips with structure, timestamps,
   IDs, protected spans, and locked fields intact.
2. **Intake correctness:** supported format/language proposals are admitted by
   the matching parser; ambiguity or unsupported input becomes review rather
   than fabricated certainty.
3. **Mapping completeness:** every translatable source unit has exactly one
   current target or an explicit unresolved state; no unit is invented,
   dropped, duplicated, or reordered.
4. **Constraint integrity:** placeholders, code, links, tags, timestamps,
   locked entries, and JSON structure pass deterministic checks before a batch
   commits.
5. **Recovery:** after the controlled interruption, the Process resumes from
   the last committed batch without replaying it or accepting stale output.
6. **Human review:** reviewers record terminology corrections, semantic errors,
   fluency/style changes, useful QA findings, false positives, and remaining
   unresolved items. This is evidence, not an automated claim of translation
   quality.
7. **Operational evidence:** request count, provider-reported token usage when
   present, latency, retries, cancellation behavior, exported size, and peak
   product memory are raw observations rather than universal budgets.

P5-A may close on the deterministic floor without any model call. P5-B requires
both named routes to be attempted truthfully, but route unavailability is a
reported blocker or scoped result rather than permission to forge coverage.
Product readiness additionally requires P5-C and P5-D.

## Failure classification

Every failed or corrected case receives one primary owner:

- **Corpus/expectation:** original fixture or oracle is invalid or ambiguous.
- **Import/admission:** attachment limits, format proposal, locale proposal, or
  deterministic parser rejects or misclassifies the input.
- **Extraction/export:** unit identity, protected spans, ordering, serializer,
  or reopen/round-trip behavior is wrong; this is never repaired by prompting.
- **Program/prompt:** the versioned instructions or supplied context are
  insufficient, contradictory, or encourage unsupported output.
- **Model language:** mistranslation, omission within an admitted unit,
  hallucination, terminology inconsistency, tone, or fluency failure.
- **Provider/transport:** route unavailable, wrong model identity, rate limit,
  malformed stream, timeout, connection loss, usage omission, or cancellation
  failure.
- **Constraint/admission:** a candidate violates placeholders, tags, schema,
  mapping, or another deterministic publication rule.
- **Process/recovery:** checkpoint, lease, fencing, retry, resume, or terminal
  reconciliation produces duplicate, stale, lost, or unrecoverable work.
- **Review/UI:** the user cannot understand, inspect, edit, accept, reject, or
  navigate the real artifact efficiently.
- **Scale/target:** Browser or Deno Desktop bundle, memory, latency, persistence,
  or packaging behavior fails on the representative corpus/project.

The classification decides the repair location. It does not turn every product
finding into an engine request or every provider failure into a prompt change.

## Delivery order

### P5-A — deterministic corpus and round-trip laboratory

Check in the four original fixtures and structural oracles. Implement the
closed format adapters, stable unit projection, protected-span rules, and exact
export/reopen checks. Add a research runner that records versioned raw evidence
without provider secrets. Do not add Pi workflow composition or generated UI.

### P5-B — bounded dual-model workflow

Use the delivered build-known Translation package cleanup as the starting point,
then define the first durable Skill-like Program package revision, bounded
workflow stages, context selectors, deterministic operations, VFS projection,
and durable records. Run the same intake, planning, bounded translation,
interruption/resume, and QA journey against both named routes. Keep batch commits
and currentness under existing Process/Workspace authorities. Revise prompts and
product contracts only from classified evidence; retain failed cases in the
research report. The delivered package selector alone does not close P5-B.

### P5-C — complete product journey and minimal P4 extraction

Ship import, planning, translation progress, review/edit, QA, and export through
the ordinary SillyOS product. Extract only the build-known Pi capability and
OpenUI mappings used by this journey. Prefer ordinary product React UI; if
generated UI is justified, add only the smallest admitted component/action set
required by a real step and preserve the existing UiArtifact/UiIntent authority.

### P5-D — resilience, scale, and target qualification

Exercise cold reopen, cancellation, provider loss, Process takeover, committed-
batch resume, backup/export, long-project paging, Browser/Deno Desktop startup,
accessibility, responsive review, memory, and final module graphs. Reconcile P4
and P5 documentation against actual delivered behavior and remove study-only
instrumentation that has no maintained consumer.

## Engine handback gates

A finding remains in SillyOS unless all of these are true:

1. it concerns a business-neutral GUI, lifecycle, State/Save, content,
   authoring, Mod, or Agent Session contract rather than translation policy;
2. the current public engine contract and a minimal neutral reproduction are
   identified;
3. a product-local Host, React component, format adapter, or Pi capability
   cannot solve it without creating a second authority;
4. its Browser and Deno Desktop effects are stated, including when only one
   target reproduces it;
5. a second real consumer exists or the accepted engine plan explicitly owns
   the missing neutral denominator; and
6. the handback can be tested outside SillyOS without the translation corpus,
   provider credentials, or reference-product material.

A new OpenUI component alone is not an engine handback. It first remains a
product-private mapping; generally useful renderer vocabulary needs neutral
second-consumer evidence. Pi provider quirks, prompts, workflow sequencing,
format parsing, translation records, and human-review policy remain SillyOS
responsibilities. No engine API changes are implied by activating this study.

## Evidence and claim discipline

Research notes must bind each observation to the repository commit, Program
revision, corpus revision, provider route, provider-reported model identity when
available, settings, target, and timestamp. Raw model output may be retained in
an ignored or explicitly reviewed evidence location; it is not silently added
to product fixtures.

Until a stage is actually run, its table entry is **not run**. A green
deterministic round-trip says nothing about translation quality, a successful
model response says nothing about resume or export, and one provider result
says nothing about another provider. The final P5 claim must list passed,
failed, unavailable, and intentionally omitted evidence separately.

## Current working-tree evidence — prompt revision 4

The first repeatable model-protocol smoke completed against the exact two named
routes on 2026-08-31 local time. It used harness
`sillyos.harness.translation@1`, prompt revision 4, corpus revision 1, low
reasoning, temperature 0, SSE, no automatic retries, and the same four requests
per run. Three fresh runs were made through each route. The ignored raw evidence
records HEAD `7c5086fd8c77097b60427c37984a33d0f2eee642` and
`workingTreeDirty: true`; that commit alone therefore cannot reproduce this
uncommitted candidate.

| Configured route                | Runs | Requests | Admission/export/reopen | Source/exported units | Recorded request latency | Recorded tokens | Pi cost observation |
| ------------------------------- | ---: | -------: | ----------------------: | --------------------: | -----------------------: | --------------: | ------------------: |
| DeepSeek `deepseek-v4-flash`    |    3 |       12 |                   12/12 |                 57/57 |                57,785 ms |          26,730 |        0.0027854736 |
| OpenRouter `z-ai/glm-5.3-flash` |    3 |       12 |                   12/12 |                 57/57 |               439,539 ms |          37,795 |        0.0067857750 |
| **Total**                       |    6 |       24 |                   24/24 |               114/114 |               497,324 ms |          64,525 |        0.0095712486 |

The total token observation consists of 16,087 input, 16,512 cache-read,
31,926 output, and zero cache-write tokens. The reported 26,426 reasoning
tokens are a subset of output and are not added again. `cacheRetention: none`
does not mean the provider performed no cache reads. The cost field is Pi's
unitless usage observation, not an invoice or currency claim. Every result
reported terminal `toolUse`, but provider-reported response-model identity was
`null`; the evidence proves execution through the configured route, not a
provider-attested model identity.

All 24 requests ended with `toolUse`; their model candidates contained every admitted unit once in order, preserved
the deterministic protected-token topology, exported through the format-owned
serializer, and reopened to the same structural projection. Two DeepSeek
responses also emitted 110 characters of non-tool assistant text in total. That
text is inert: when there is exactly one valid translation tool call, only its
admitted payload is a publication candidate. This avoids treating harmless
provider narration as a second translation authority.

This is deliberately narrower than P5-B. It did not run separate Intake or
Planning turns, commit multiple batches, interrupt and resume a Process, render
the product review UI, accept human edits, or qualify a final translation. A
manual reading of the candidates found recurring issues that the product flow
must retain rather than prompt away:

- names and terms varied across runs, including `Foglight`/`Fog Lamp`,
  `Star Whale`/`Starwhale`, and several renderings of operator and signal terms;
- four of six plain-text results changed the possessive relationship in
  `{stationName} 的灯` into a location relationship, and one OpenRouter SRT
  result mistranslated passengers _holding_ `{ticketCode}` as passengers _for_
  that code; neither semantic error is visible to the structural checker;
- models sometimes raised unnecessary questions about in-document explanatory
  sentences, while genuinely useful questions about official names and
  `Echo Bell` versus `Echo Clock` also appeared; five of the ten recorded
  ambiguities were useful in this review and five were redundant or already
  answered by the source;
- structurally valid SRT output still needs concise-reading review; timing
  preservation alone does not establish subtitle usability, and the observed
  cue rates reached 22.2 visible characters per second without a product-owned
  pass/fail threshold;
- grammatical English was generally usable, but semantic adequacy and product
  terminology still require a human-confirmed glossary and Review stage.

The four unique `requestSha256` values bind the prompt, tool schema, and selected
generation settings for each corpus case; they intentionally do not identify a
Provider route and are not a complete transport-request digest. One OpenRouter
request recorded 132,893 ms despite the configured 120,000 ms timeout, so the
timeout field is a requested setting rather than a proven wall-clock ceiling.

| Corpus case             | Source SHA-256                                                     | Prompt/tool/settings SHA-256                                       |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `brief.txt`             | `c3edc6ac46ddf4cd59ef6255c6a955810ab1c381e65df61f816821afb2eadd38` | `7ec67d4b5da1859e73ac430c0c98c087191211e64d94651f4ebedadb29907937` |
| `release-guide.md`      | `fffff020d1628ec3a14e94a6993a0d9c2fc8e3d0fb5824ad373b94b229c2c166` | `ad4ae9a66bc922d5fa0cabcded11da835dedab5a8feee356c1058e97d1416800` |
| `platform-night.srt`    | `7dd5876c22da54e06720b715ec31424252f90ce9a100d5e4fcb5df50f213b1ba` | `29492ec6e55e958ba20395f56a99b4504e85229d9cd2e414b35b50adebe13f8c` |
| `station-dialogue.json` | `693bf4626d35081c096ef2d6d0fa7151343f859813ce770ad18d5aababcd0690` | `b9a8fad25e429c8f166d09ab3f6c7a7110b63b003e15c71c90c2d265327de70e` |

The corresponding P5-A deterministic floor is the checked-in original corpus,
format adapters, strict batch admission, export/reopen oracles, secret-safe
research runner, and focused tests. It closed only that deterministic research
stage. The subsequent formal slice now consumes the Process-owned Workspace
binding, exact Host import, Browser Translation dispatch, V11 Project head and
pageable rows for a real Translation Process route and cold reopen. It still
does not close P5-B or P5-C because no real Agent batch/commit/review/export
journey consumes those records.

## Follow-up evidence — prompt revision 5 and confirmed plan

Prompt revision 5 is the study's execution prompt informed by the behavior-level
observations above. It strengthens fidelity, relationship/negation/causality
preservation, source-text-as-data handling, relevant-context use, and candidate
self-review without adopting reference prompt text, visible chain-of-thought,
line-number protocols, or a universal literary style. The same two configured
routes, corpus revision 1, low reasoning, temperature 0, SSE, no automatic
retries, and four requests per run were retained.

Two conditions were exercised three times per route:

- `baseline` retained the revision-4 study's three simple glossary entries;
- `confirmed-plan` selected only source-matching entries from a research-owned
  canonical glossary and added two explicit per-unit relationship facts.

The six baseline artifacts were produced immediately before the runner began
writing its explicit `condition` field; an absent field in those artifacts is
the historical default `baseline`, and their four request digests match that
default exactly. Confirmed-plan artifacts record the field directly.

The latter is a controlled Planning-input ablation, not evidence that the
product has run a Planning turn, persisted a human decision, calibrated a
sample, committed multiple batches, or resumed a Process. The ignored evidence
records HEAD `f557ab8936c3097757ddb579cccd9aab1a11ebe8` with a dirty working
tree; the final checked-in prompt and runner must therefore be used with this
report rather than treating that commit as a complete reproduction point.

| Condition / configured route | Runs | Requests | Admission/export/reopen | Source/exported units | Recorded request latency | Recorded tokens | Pi cost observation |
| ---------------------------- | ---: | -------: | ----------------------: | --------------------: | -----------------------: | --------------: | ------------------: |
| baseline / DeepSeek          |    3 |       12 |                   12/12 |                 57/57 |                60,730 ms |          30,856 |        0.0034372016 |
| baseline / OpenRouter        |    3 |       12 |                   11/12 |                 57/53 |               103,876 ms |          22,269 |        0.0018759550 |
| confirmed / DeepSeek         |    3 |       12 |                   12/12 |                 57/57 |                57,359 ms |          31,634 |        0.0031968664 |
| confirmed / OpenRouter       |    3 |       12 |                   12/12 |                 57/57 |                74,356 ms |          22,729 |        0.0017732450 |

The baseline total was 164,606 ms, 53,125 tokens, and a 0.0053131566 Pi cost
observation. Its tokens were 20,983 input, 20,224 cache-read, and 11,918 output;
6,187 reasoning tokens are a subset of output. The confirmed-plan total was
131,715 ms, 54,363 tokens, and a 0.0049701114 Pi cost observation: 17,002 input,
25,216 cache-read, and 12,145 output, with 6,444 reasoning tokens inside output.
These are raw observations from a small run, not performance or cost claims.
Provider-reported response-model identity remained unavailable.

The revision-5 baseline was associated with improvements over the recorded
revision-4 runs, but this small, unpaired comparison does not establish a causal
prompt effect or make the workflow unnecessary:

- across all six baseline runs, each brief candidate translated the
  instruction-looking sentence as content; separately, each SRT candidate
  preserved the _holding a ticket_ relationship, where the revision-4 evidence
  had one ticket-relationship error;
- the possessive station/light relationship was preserved in three of six
  baseline candidates, compared with two of six under revision 4;
- revision 4 produced ten admitted ambiguity questions, half judged redundant;
  revision 5 produced no admitted ambiguity, but one OpenRouter SRT candidate
  was correctly rejected because its single redundant question omitted the
  required unit identity even though its four target rows were otherwise usable;
- without a confirmed profile, the chosen canonical forms appeared in only
  1/6 `Foglight Station`, 3/6 `Starwhale Terminal`, and 0/6 `Echo Clock`
  candidates.

The confirmed-plan condition made all three canonical forms exact in 6/6 runs
and improved the station/light relationship to 5/6. It still did not guarantee
semantic adequacy: one DeepSeek result changed that relationship to location
despite the explicit fact, and another shortened “the last train has pulled
into the station” to “the last train has arrived.” Subtitle pressure also
remained, reaching 22.5 visible characters per second without a product-owned
quality threshold.

The result does not support the broad attribution “the models are too weak.” It
is consistent with revision 4 being under-specified and revision 5 addressing
part of that problem. The absent product workflow remains the larger untested
gap: confirmed terminology and entity facts, sample calibration, durable batch
state, semantic Review, and human edits. Even when confirmed inputs were
supplied directly in this ablation, individual candidates still contained
semantic misses and must be reviewable. The next slice should therefore
implement Planning, Calibration, and Review as Process-owned product state
rather than continue to grow the execution system prompt or introduce parallel
subagents.

Revision-5 request digests are condition-specific:

| Corpus case             | Baseline prompt/tool/settings SHA-256                              | Confirmed-plan prompt/tool/settings SHA-256                        |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `brief.txt`             | `bf0a25fe82c014b317d185418df6dcd11cc6695648ec6b3e2aa3a33df8fe67da` | `90c73d4aa541de3d4d79c778563d269f8c3551fcd84f32bd4feedcfc10eb9023` |
| `release-guide.md`      | `6b06176d3de697ee41909d9a5eb7eb55ada85bd5290c6b3a87997aae3b172a1d` | `7f7f4edb95b9b47fda87ee73c366a484b0512823228bbdc26f20aa6ccad1ab6d` |
| `platform-night.srt`    | `993dcdc6648288d7485235a74a112ac01ab19c618cc1ecc15369f6804ed41bfc` | `3784d680a2ce0ac8de0156e713df65c1db9117febe61a74ead8692a08897eff0` |
| `station-dialogue.json` | `898dbdfafb1c4241aa38c8754cbda15688d6d8943e9fc45e89546287d7f862d2` | `436bbba8220a1751e4964c92cfc3059597f958970d48e1cfb0dca7106fb386cb` |

## Skill-package and prompt-condition feasibility closure

The 2026-08-31 follow-up tested the proposed Program split rather than adding
another production prompt revision. It kept one stable completion schema and
request prefix, then compared the current revision-5 prompt with an
independently authored workflow prompt that first asks the model to account for
actors, actions, objects, possession, quantity, time, causality, and protected
structure. Each of the four corpus cases ran once through each prompt condition
and configured route.

| Configured route / prompt condition | Exported | Rejected | Recorded latency | Input | Cache read | Output | Total tokens | Pi cost observation |
| ----------------------------------- | -------: | -------: | ---------------: | ----: | ---------: | -----: | -----------: | ------------------: |
| DeepSeek / current                  |      4/4 |        0 |        25,022 ms | 2,374 |      4,992 |  3,999 |       11,365 |        0.0014660576 |
| DeepSeek / clean-room               |      3/4 |        1 |        22,590 ms | 2,946 |      2,688 |  3,662 |        9,296 |        0.0014453264 |
| OpenRouter / current                |      4/4 |        0 |        12,388 ms | 6,695 |          0 |    858 |        7,553 |        0.0007166250 |
| OpenRouter / clean-room             |      4/4 |        0 |       203,148 ms | 5,001 |          0 |  9,038 |       14,039 |        0.0026345750 |

The matrix contains 16 real calls, 15 exported candidates, one deterministic
rejection, and 42,253 provider-reported total tokens. Reasoning is a subset of
output and is not added again. Pi's `usage.cost.total` records no currency, so
the table does not call it USD or an invoice. Provider-reported response-model
identity remained unavailable.

The current prompt was structurally more stable, but both routes repeatedly
reduced the supplied station/light possessive relationship to a location
relationship. Even an explicit confirmed-plan fact did not repair that
reliably. The clean-room condition preserved that relationship in both routes,
but it also produced unnecessary ambiguities, one variable-count agreement
miss, and one correctly rejected DeepSeek candidate that inserted whitespace
before an `adjacentBefore` protected token. This evidence supports a
Process-owned pre-translation meaning ledger for actor/object/relationship and
quantity facts. It does not support replacing the production prompt wholesale,
removing deterministic admission, or cancelling human Review.

The request layout now keeps system instructions, one invariant tool schema,
and a stable workflow prefix before dynamic project facts and units. Repeated
DeepSeek requests reported cache reads; the observed OpenRouter route did not.
DeepSeek still reported cache reads when Pi requested `cacheRetention: none`,
so that setting is not evidence that provider automatic caching was disabled.
The runner records this behavior rather than turning it into a Program
guarantee. One OpenRouter clean-room request took 158,533 ms despite a requested
120,000 ms timeout; this streaming route therefore has no proved hard wall-clock
deadline from that option alone.

The checked-in research candidate also exercises the non-model parts of the
Program design:

- `PROGRAM.md`, selectively loaded references and prompts, a manifest, complete
  settings defaults, and one fixed QuickJS script form a cohesive Skill-like
  package without installing another runtime;
- the fixed script prepares bounded pending work, selects only matching
  glossary entries, validates protected tokens and locked terminology, commits
  to a successor project, and verifies completeness without overwriting source.
  Commit first re-derives the exact pending units, source/context metadata, and
  glossary from the current Project, so an outdated or mismatched batch cannot
  publish into the wrong source units and later batches retain their global
  unit order. This is ordinary mutable-work consistency, not a provenance or
  supply-chain mechanism;
- settings are optional and non-blocking. Missing settings use defaults;
  malformed JSON falls back; valid fields in a partial document may influence
  only the current attempt while missing or invalid fields fall back. Only a
  complete diagnostic-free canonical Process document is eligible to replace a
  saved preference;
- the closed Creator blueprint was admitted twice by each configured route and
  selected every required workflow stage, deterministic asset, reference,
  model role, setting, compatibility reference, and human workbench without
  inventing a capability;
- the born-digital PDF adapter lazily loads PDF.js in a dedicated same-origin
  Worker, copies the input bytes, emits stable text units plus a separate source
  map, and truthfully labels the result `pdf_text_reflow`. It does not deliver
  OCR, password UI, layout-preserving PDF translation, or PDF round-trip output.
  The formal Translation controller now selects this adapter only for a PDF
  import, so PDF.js and its Worker remain outside the initial application chunk
  and are not fetched or executed until a PDF import. Formal import currently
  consumes the text units only; source-map persistence and Review highlighting
  are not delivered.

These experiments plus the route/storage slice are sufficient to continue the
formal P5-B Program work. They now ship a Translation Process route, durable
source import and PDF text-only projection, but not the Agent workflow,
settings application, structured Review workbench, target commits, interruption
resume, or final exporter. P5-B should next connect Intake, confirmed
planning/meaning facts, one bounded Agent batch, structured human Review,
deterministic candidate commit, and resume. A generic workflow engine, Program
SDK, OCR pipeline, or generated-UI vocabulary remains outside that first
product slice.

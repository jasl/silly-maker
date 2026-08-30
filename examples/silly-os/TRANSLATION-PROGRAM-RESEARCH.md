# Translation Program research plan

Status: **P5-A completed on 2026-08-31; a prompt-revision-4 model-protocol
smoke is recorded, while P5-B through P5-D, every model route, and the complete
product journey remain unqualified**.

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

Define the first version-pinned translation Program capability set and run the
same intake, planning, bounded translation, interruption/resume, and QA journey
against both named routes. Keep batch commits and currentness under existing
Process/Workspace authorities. Revise prompts and product contracts only from
classified evidence; retain failed cases in the research report.

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
stage. The Process-owned Workspace binding, exact Host import, and build-known
Browser Translation dispatch delivered beside it are deliberately unconsumed
substrate for the next product slice; they do not close P5-B or P5-C and are not
an ordinary Translation Program journey.

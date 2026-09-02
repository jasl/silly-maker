# SillyOS Program package contract

Status: active clean replacement, 2026-08-31

## Product model

A Program is one cohesive, lazily loaded package. Bundling is only an install
source: a Program shipped with SillyOS, imported from a user-selected archive,
or installed by a later community catalog enters the same admission,
installation, loading, Process, harness, and UI-container boundaries.

```text
Program package = admitted files + manifest
Installation    = one current implementation per programId
Process         = programId + compatibility marker + Conversation + isolated Workspace
SillyOS         = fixed harness + package/runtime authorities + UI container
```

The distributable package is modeled after the useful shape of a complex Skill:

```text
program-name/
|-- program.json       machine-readable manifest
|-- PROGRAM.md         concise instructions and workflow
|-- references/        optional stage-specific context
|-- scripts/           optional code for a SillyOS-provided interpreter
|-- assets/            optional templates and media
`-- settings.schema.json  optional closed settings schema
```

Production package files live below one package root. Source tests, research
fixtures, and development notes may be siblings of that root inside the
Program's repository directory, but neither archive generation nor the
production module graph may include them.

The repository keeps every source concern owned by one Program under the same
strict top-level directory while making the distributable boundary explicit:

```text
programs/<name>/
|-- package/          production files admitted into bundled or imported packages
|-- distribution/     build-time source adapter for a bundled archive
|-- persistence/      optional Program-owned domain facet over Host storage
|-- runtime/          domain logic compiled only for a supported Host profile
|-- runtime-profile/ fixed Host adapter selected by the package manifest
|-- ui/               Host-compiled surface inside Program UI Container
|-- test/             source tests; never archived or shipped as runtime input
`-- notes/            research/fixtures/tools; excluded from production builds
```

`distribution/`, `persistence/`, `runtime-profile/`, and `ui/` are build-known
SillyOS code, not hidden files inside a bundled archive. `distribution/` has no
runtime privilege: it only reconstructs the same serializable archive that a
ZIP importer admits. An imported package that selects the same available
profile follows the exact same persistence/controller/agent/UI path. A package
cannot carry same-realm TypeScript or React code; its executable extension is
limited to declared scripts for interpreters already supplied by the fixed
harness.

The build also emits one lightweight metadata row for each bundled package.
Program Library reads only that row; opening the Library never fetches, clones,
or installs bundled package bodies. Resolving a bundled Program loads its body,
admits it through the same archive boundary as ZIP import, and installs it as the
current implementation unless a user-installed external implementation is
current. Package-source tests derive metadata from the body so a stale build
index cannot ship unnoticed. Metadata does not persist content length or a
content digest as Program identity.

## Authorities and isolation

SillyOS ships and owns the Pi bridge, Provider transport, fixed tool
implementations, VFS adapter, QJS and any future interpreter, package
admission, Process persistence, and the Program UI Container. A package cannot
import code into the SillyOS/React realm, replace a dispatcher, add an
interpreter, reach another Program or Process namespace, or obtain ambient
Browser authority. Package scripts run only through an explicitly available
fixed interpreter and admitted file/tool boundary.

The currently installed archive is treated as immutable while in use and may be
shared read-only. Reinstalling the same `programId` replaces that current archive
rather than retaining historical versions. Every
Process receives an independent runtime instance, Conversation namespace,
workspace volume, work/output tree, settings override, capability preference,
and domain-data namespace. No mutable singleton may be shared between
Processes. SillyOS-owned Provider credentials and global product preferences
remain outside Program data and do not weaken Process isolation.

The fixed Browser harness reserves `.sillyos-agent-candidate.v1.json` at the
root of each Process Workspace as its single mutable completion-candidate
staging slot. A successful admission does not delete the slot; a later Run
overwrites it. Program scripts must not treat this Host-owned name as durable
Program data, and the slot never becomes a second candidate or Conversation
authority.

The Creator Catalog is an explicit Host-shared library of Programs produced by
Creator, analogous to the installed-package library rather than to Process
mutable state. A package must explicitly request `creator.catalog`, and the
fixed Creator profile requires that declaration before it can publish or review
immutable Program revisions. This is not bundled-origin privilege: an admitted
external package selecting the same profile follows the same check. Sharing the
Catalog never shares a Process Conversation, Workspace/VFS volume, settings
override, execution lease, or Program-owned domain-data facet.

An optional settings schema and its complete defaults are immutable package
files. One Process may persist one separately admitted override; absence uses
the package defaults. Missing, malformed, partial, unknown, or invalid input
does not block the Process and does not replace the last admitted override.
Each Agent attempt captures the exact override present when it begins. There is
no separate mutable Program-default preference authority.

A package may declare an ordered `recommendedModelPatterns` array as a soft model
preference. Each entry uses the same case-insensitive full-model-ID pattern as a
prompt overlay: `*` is the only wildcard and every other character is literal;
an exact ID is therefore a pattern without `*`. SillyOS considers patterns in
declaration order and stops at the first one with usable matches. An exact
saved last-successful model reference may disambiguate that tier against the
current catalog and custom-profile set; one remaining match is selected
directly. Multiple unresolved snapshots
or Provider routes require a manual choice rather than inferred catalog, date or
lexical ordering. If no pattern matches, SillyOS falls back only to the exact
saved model reference; if it no longer resolves, the user must choose.

The package neither makes a model available nor gains access to Provider
configuration, credentials or catalog state through this declaration. Matching
uses only the resolved `model.id`, never Provider/API/endpoint identity or the
response model reported after a Run. Missing and explicit empty lists admit to
the same property-omitted manifest. SillyOS provides no global recommendation
list and the current bundled Programs declare none.

A package may also declare an ordered `modelPromptOverlays` array. Each entry
contains only a case-insensitive `modelPattern` and a package-relative text
`path`; the pattern is a full-model-ID glob in which `*` is the only wildcard.
After Pi resolves the model for one Run, the fixed Program harness appends every
matching file to the unchanged base instructions in declaration order and
inserts a repeated path only once. The dynamic task remains the ordinary user
prompt. Missing or empty declarations leave the base instructions byte-for-byte
unchanged.

Overlay files are admitted immutable UTF-8 package resources under the same
path and aggregate resource budgets as other files. They cannot select or match
a Provider, API, endpoint, credential, reasoning effort, token budget, timeout,
retry policy, tool, or candidate admission. Selection is repeated for every Run
from the resolved `model.id`, so switching models affects only later Runs and
adds no Process prompt state, receipt, or provenance authority. SillyOS ships no
global overlay and the current bundled Programs declare none; bundled and ZIP
packages use the same optional mechanism when an author supplies one.

The Program UI Container owns the outer geometry, mode switch, overlays,
focus, and Run projection. A Program supplies admitted UI data or selects a
supported Host surface; it does not supply arbitrary React nodes, portals, DOM
code, or outer chrome. Complete package-authored OpenUI data maps through the
current closed Host renderer inside this boundary; Agent-generated OpenUI
publication remains later work. The Host also provides one non-durable
session-state scope for the Program identity and compatibility marker. A Program
may key draft, selection, and scroll state
by Process there before its rendered subtree is released; another package
cannot read that scope, and the scope is cleared with the application session.
It is presentation continuity only, never Conversation, Process, Workspace, or
package authority.

## Install, upgrade, removal, and degradation

Admission normalizes path names and manifest data, rejects traversal, duplicate
paths and unsupported manifest/runtime declarations, and measures the admitted
archive against physical budgets. Browser installs retain one current archive
per `programId` in IndexedDB. Content length is derived while admitting or
loading bytes and is not durable Program metadata. A later Desktop adapter may
use a dedicated local Program directory behind the same repository contract.

A bundled source remains metadata-only until the Program is resolved. Each new
SillyOS application session may refresh a bundled installation from the shipped
body so compatible fixes become current after an application update. A current
external installation takes precedence until the user replaces or removes it;
this acquisition distinction affects refresh policy only and grants no runtime
privilege.

Materializing the same admitted bytes from the same acquisition source is a
cold-path no-op and retains the repository-private installation ID. Replacing
the bytes creates a new ID. A mounted Surface and its Agent facade carry that ID
only as a transient execution fence, so they cannot combine old UI/settings
with a newer Prompt or script body installed by another tab. An in-flight run
may finish; the old Surface's next submit fails, and reopening adopts the
current implementation as one unit.

Creating a Process stores `programId` plus `packageVersion` as a compatibility
marker. It does not retain a digest, byte length, installation ID, or historical
archive. Reopening resolves the current installed implementation with that
`programId`; equal compatibility markers use the current code and resources.
Different markers degrade rather than attempting an implicit migration.
Replacing a Program does not rewrite Conversation or VFS data and SillyOS does
not promise that Program-private storage remains compatible.

Conversation identity and transcript persistence do not depend on the Program
remaining installed or executable. If the current implementation is missing,
damaged or incompatible—or optional Program storage or a Process workspace is
unavailable—the Process still opens in Conversation/read-only mode and reports
the unavailable capability. Conversation remains the minimum readable product
fact; losing an optional service degrades that Process rather than deleting its
transcript. For a Workspace-bound Process, Recent restore probes the durable volume
without attaching an execution environment and closes any probe-only Host
session before settling. A missing, inaccessible or busy volume therefore
selects the read-only Conversation immediately and does not leave an idle
Workspace held by the failed restore.
SillyOS does not promise third-party package, domain-data, or VFS
forward/backward compatibility. Current preview Program Data Repository V17 performs
a row-blind reset of an older incompatible database and carries no migration
reader, obsolete wire/method/type alias or compatibility fallback. Within the
current database version, an unselected or removed optional persistence facet is
ignored; a selected missing/damaged facet reports unavailable while Conversation
Core remains readable. Explicit product reset clears Core and every physically
present facet store. No migration mechanism exists in the current product; any
post-stable migration would require a separately accepted contract.

## Runtime denominator

The first denominator is intentionally smaller than a general plugin system:

- serializable package files treated as immutable while current;
- one strict archive and manifest admission path;
- bundled and imported packages persisted by the same repository;
- Process `programId` plus compatibility marker and read-only degraded reopen;
- fixed-harness compatibility admission;
- lazy package/runtime acquisition plus two-phase deterministic release;
- process-scoped Workspace and mutable domain state;
- optional scripts only through shipped interpreters;
- optional ordered model-ID-pattern recommendations as soft selection input;
- optional immutable model-ID prompt overlays selected for each Run;
- Program UI only inside the SillyOS-owned container.

The current formal Creator and Translation packages both declare `scripts: []`
and ship no package-owned workflow script. Creator's build-known profile exposes
the fixed `bash` and QJS Harness tools. Translation's `agent.translation.v1`
profile selects only bounded Workspace `read`, `write`, `edit`, and `grep` tools
for advisory working memory and no interpreter.

A mounted Program Surface registers exact lazy resources with its runtime. A
route change first performs a repeatable, reversible quiesce: it aborts and
drains transient Surface work such as export, declines while an active or
unpersisted Agent terminal is still owned, and closes the exact Workspace while
the Program's Agent port remains usable. Controller close may still decline, in
which case the mounted predecessor remains current and a later close can retry.
Only a successful close and committed route change—or terminal unmount/disposal—
retires the registered resources and disposes the port. This is a small product
lifecycle join point, not another service container or package privilege.

This does not add npm resolution, arbitrary same-realm JavaScript, a dependency
solver, a marketplace, cross-Program services, automatic VFS migration, or a
compatibility guarantee. Creator is an ordinary bundled Program under these
rules. Its smaller Browser harness may produce less polished packages than a
full coding Agent, and that is an accepted product limitation rather than a
reason to grant it a privileged path.

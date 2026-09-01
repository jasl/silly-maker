# SillyOS Program package contract

Status: active clean replacement, 2026-08-31

## Product model

A Program is one cohesive, lazily loaded package. Bundling is only an install
source: a Program shipped with SillyOS, imported from a user-selected archive,
or installed by a later community catalog enters the same admission,
installation, loading, Process, harness, and UI-container boundaries.

```text
Program package = immutable admitted files + manifest + exact content digest
Installation    = retained exact packages + current pointer for new Processes
Process         = exact package reference + Conversation + isolated Workspace
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
|-- package/          exact files admitted into bundled or imported packages
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

The build also emits one exact, lightweight metadata row for each bundled
package. Program Library reads only that row; opening the Library never fetches,
clones, hashes, or installs bundled package bodies. The first exact open loads
the body, admits it through the same archive boundary as ZIP import, verifies it
against that metadata, and then installs it. Package-source tests recompute the
metadata from the body so a stale build index cannot ship unnoticed.

## Authorities and isolation

SillyOS ships and owns the Pi bridge, Provider transport, fixed tool
implementations, VFS adapter, QJS and any future interpreter, package
admission, Process persistence, and the Program UI Container. A package cannot
import code into the SillyOS/React realm, replace a dispatcher, add an
interpreter, reach another Program or Process namespace, or obtain ambient
Browser authority. Package scripts run only through an explicitly available
fixed interpreter and admitted file/tool boundary.

Installed package bytes are immutable and may be shared read-only. Every
Process receives an independent runtime instance, Conversation namespace,
workspace volume, work/output tree, settings override, capability preference,
and domain-data namespace. No mutable singleton may be shared between
Processes. SillyOS-owned Provider credentials and global product preferences
remain outside Program data and do not weaken Process isolation.

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

The Program UI Container owns the outer geometry, mode switch, overlays,
focus, and Run projection. A Program supplies admitted UI data or selects a
supported Host surface; it does not supply arbitrary React nodes, portals, DOM
code, or outer chrome. OpenUI remains a later admitted-data renderer inside
this boundary. The Host also provides one non-durable session-state scope for
the exact Program package. A Program may key draft, selection, and scroll state
by Process there before its rendered subtree is released; another package
cannot read that scope, and the scope is cleared with the application session.
It is presentation continuity only, never Conversation, Process, Workspace, or
package authority.

## Install, upgrade, removal, and degradation

Admission normalizes path names and manifest data, rejects traversal,
duplicate paths and unsupported manifest/runtime declarations, and derives one exact content digest from
the admitted file set. Browser installs retain that immutable content in
IndexedDB. A later Desktop adapter may use a dedicated local Program directory
behind the same repository contract.

A bundled source remains metadata-only until its exact package is opened. That
open installs the admitted body with `if_missing` selection semantics: it
initializes a Program that has no current package but can never replace a
package the user already selected for new Processes. This decision and package
installation share one IndexedDB transaction, so a concurrent tab cannot turn
bundling into an implicit update authority.

Creating a Process stores the complete immutable package reference. Updating a
Program installs a successor; it never rewrites an existing Process, migrates
its VFS, changes its package reference, or silently substitutes newer package
content. New Processes may select the newest installed successor.

Conversation identity and transcript persistence do not depend on the package
remaining installed or executable. If exact package content, a compatible
harness, optional Program storage, or a Process workspace is unavailable, the
Process still opens in Conversation/read-only mode and reports the unavailable
capability. Conversation remains the minimum readable product fact; losing an
optional service degrades that Process rather than deleting its transcript.
For a Workspace-bound Process, Recent restore probes the exact durable volume
without attaching an execution environment and closes any probe-only Host
session before settling. A missing, inaccessible or busy volume therefore
selects the read-only Conversation immediately and does not leave an idle
Workspace held by the failed restore.
SillyOS does not promise third-party package, domain-data, or VFS
forward/backward compatibility. Current preview Program Data Repository V16 performs
a row-blind reset of an older incompatible database and carries no migration
reader, obsolete wire/method/type alias or compatibility fallback. Within the
current database version, an unselected or removed optional persistence facet is
ignored; a selected missing/damaged facet reports unavailable while Conversation
Core remains readable. Explicit product reset clears Core and every physically
present facet store. No migration mechanism exists in the current product; any
post-stable migration would require a separately accepted contract.

## Runtime denominator

The first denominator is intentionally smaller than a general plugin system:

- immutable serializable package files;
- one strict archive and manifest admission path;
- bundled and imported packages persisted by the same repository;
- exact Process package pinning and read-only degraded reopen;
- fixed-harness compatibility admission;
- lazy package/runtime acquisition and deterministic release;
- process-scoped Workspace and mutable domain state;
- optional scripts only through shipped interpreters;
- Program UI only inside the SillyOS-owned container.

The current formal Creator and Translation packages both declare `scripts: []`.
Translation's fixed-script experiment remains below its source-only `notes/`
tree and is not an archive file or production runtime input.

This does not add npm resolution, arbitrary same-realm JavaScript, a dependency
solver, a marketplace, cross-Program services, automatic VFS migration, or a
compatibility guarantee. Creator is an ordinary bundled Program under these
rules. Its smaller Browser harness may produce less polished packages than a
full coding Agent, and that is an accepted product limitation rather than a
reason to grant it a privileged path.

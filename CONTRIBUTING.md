# Contributing to SillyMaker

The whole repository is MIT-licensed; project-owned media assets are dedicated to the public domain under CC0 1.0. Contributions are accepted inbound=outbound under the same terms: by submitting a contribution you represent that you have the right to license it, and you agree it becomes available under the repository's MIT License (media assets under CC0). Preserve existing copyright and license notices.

## Third-party material

Discuss copied or adapted third-party material with the owner before submitting it. If approved, follow its license and preserve every required notice. Do not submit commercial material or code with incompatible terms. For a clean-room implementation, one person may document public specifications and independently observable behavior; the implementer must work only from that independent specification and must not inspect the incompatible source.

Do not add a source-history/provenance file, register, catalog, database, or dependency-tree scanner. `references/` stays untracked local research input (see `docs/policies/assets-and-references.md`); production code, tests, generators, and artifacts must not depend on it.

## Workflow

Run `deno task check` before submitting; browser-affecting changes should also pass `deno task test:e2e`. See `AGENTS.md` and `docs/engine/development.md` for the development workflow, and `TRADEMARKS.md` for naming boundaries.

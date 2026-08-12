# Assets, third-party material, and references

状态：持续维护的素材输入与运行时提升政策。

This policy keeps product assets deliberate and keeps local research out of the
runtime. It does not create a source-history or compliance subsystem.

## 1. Project-owned runtime assets

A product asset becomes part of a game only when a maintainer intentionally
creates or copies it into the application's own `assets/` directory
(`<appRoot>/assets/**`) and references it from the Story's validated asset
catalog.

Before promotion, review whether the file is needed, its dimensions and format,
browser behavior, accessibility and fallback needs, stable asset ID, and intended
renderer use. Runtime manifests and digests exist for loading, caching,
diagnostics, and compatibility; they are not legal metadata.

Code-native text, controls, focus states, HUD structure, and small accessible
symbols should remain code-native unless an intentional design change requires
an asset.

## 2. Media working archives

Project-owned media working material may live under:

```text
art-source/<collection>/**
```

Organization below that directory is a maintainer choice. No prompt log, model
record, terms snapshot, source hash, sidecar, or other history file is required.
Archive files are not automatically product assets and must not be bundled into
a Player. Promotion is a deliberate copy into the application's runtime asset
directory followed by ordinary technical asset validation.

Local candidates and working output may remain in ignored
`art-source/**/candidates/` or `art-source/**/work/` paths.

## 3. Third-party material

Do not add copied or adapted third-party code, text, data, images, fonts, models,
audio, translations, purchased assets, or similar material without first
agreeing the dependency and distribution plan with the owner.

When compatible material is intentionally used, follow its license and preserve
the notices it actually requires. Do not copy commercial material or code with
incompatible terms. For a clean-room implementation, a spec/test author may
document public specifications and independently observable behavior; the
implementer works only from that independent specification and must not inspect
the incompatible source. Validate the result with ordinary review and tests.

The repository does not maintain a source-history/provenance file, universal
sidecar schema, legal database, or recursive dependency/vendor scanner. If a
future change genuinely introduces copied or adapted material, add the required
license and notice information with that change after owner review.

## 4. Local references

`references/` is ignored, untracked, local-only research input. It may inform
general product requirements and established industry practice, but production
code, tests, fixtures, generators, Image Gen inputs, screenshots, builds, and
Artifacts must not import, scan, read, or depend on it.

Technical research notes may cite public specifications and upstream project
documentation in the ordinary way. They are not source registries. For
commercial or incompatibly licensed implementations, tracked specifications and
tests must define SillyMaker's behavior independently. The implementer must not
inspect the incompatible source or copy code, data, assets, prose, schemas,
constants, or distinctive structures.

## 5. Artifact boundary

A Player Artifact contains only the runtime assets intentionally selected by the
application. It excludes media working archives, `references/`, research notes,
calibration output, local Saves, DebugBundles, diagnostics,
screenshots, and test output.

Artifact preparation validates actual runtime paths and technical integrity.

## 6. Contributions

Contributions follow [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Do not add a
custom disclosure database or source-history artifact.

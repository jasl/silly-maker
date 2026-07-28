# Contributing to SillyMaker

The whole repository is MIT-licensed; AI-generated and synthesized media assets are dedicated to the public domain under CC0 1.0. Contributions are accepted inbound=outbound under the same terms: by submitting a contribution you represent that you have the right to license it, and you agree it becomes available under the repository's MIT License (media assets under CC0). Preserve existing copyright, license, and attribution notices.

## Third-party material

Place intentionally copied third-party code, text, data, images, fonts, models, audio, translations, purchased assets, and similar material under `vendor/**`. It retains its own license, contract, notice, or public-domain status and is not covered by the repository's MIT or CC0 grants. You must have the right to submit it and preserve required notices; the absence of an automated scanner is not approval.

`references/` stays untracked local research input (see `docs/policies/assets-and-references.md`): production code, tests, generators, and artifacts must not depend on it or copy distinctive third-party material from it.

## Workflow

Run `deno task check` before submitting; browser-affecting changes should also pass `deno task test:e2e`. See `AGENTS.md` and `docs/engine/development.md` for the development workflow, and `TRADEMARKS.md` for naming boundaries.

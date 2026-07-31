# Licensing policy

Status: simplified 2026-07-28 after the repository rename to SillyMaker. `LICENSE.md` is controlling; this note records the policy intent.

## Policy

- The whole repository — engine packages, Story packages (e2e, template, examples including the Cat Cafe), scripts, configuration, and documentation — is **MIT**. Inbound contributions are accepted inbound=outbound MIT.
- **AI-generated and synthesized media assets** (images and audio under `examples/*/assets/**`, source archives under `art-source/**` and `examples/*/art-source/**`) are dedicated to the public domain under **CC0 1.0**: commercial use, derivatives, and redistribution are unrestricted and need no attribution.
- npm dependencies and vendored third-party material retain their own terms (`THIRD_PARTY_NOTICES.md`).
- `references/` stays untracked local research input; production code, tests, generators, and artifacts must not depend on it or copy distinctive third-party material from it (see `docs/policies/assets-and-references.md`).
- Product names and branding stay governed by `TRADEMARKS.md`; copyright licenses grant no trademark rights.

## Distribution

SillyMaker follows the same practical availability model documented for
[Godot's MIT-licensed engine](https://docs.godotengine.org/en/stable/about/complying_with_licenses.html):
a distributed game must make the engine's MIT license text available to its
recipients, while the game may use its own license.

For a SillyMaker Player or Desktop package, make the SillyMaker MIT text and
notices that actually apply to bundled material available through at least one
durable channel:

- an in-product licenses or credits page;
- license files accompanying the distribution; or
- a stable public link reachable by recipients.

Hosted `dist-web/` output may be deployed directly; it does not need an Artifact
manifest. `scripts/prepare-artifact.mjs` remains an optional way to produce an
offline, integrity-checked handoff with local legal files. Its technical
manifest, `wrangler.jsonc`, app-bundle metadata, and installer metadata are not
legal inventories or substitutes for reviewing the material actually bundled.
The repository's Engine Lab, starter template, and first-party examples include
stable `rel="license"` links to both the SillyMaker MIT text and the maintained
first-party hosted Player baseline in `THIRD_PARTY_NOTICES.md`. That notice page
contains concrete copyright and license text for the runtime packages observed
in the current first-party bundles; it deliberately does not claim to enumerate
every dependency an arbitrary Story may ship. Distributors remain responsible
for preserving notice availability, inspecting their actual bundle, and adding
every notice required by other material they include.

Examples and the starter template are MIT inside this repository. A copied
template may choose a different license for new project-owned Story code and
content, but independent distribution must retain the SillyMaker MIT text for
the engine code and must preserve notices required by any bundled third-party
material. This policy describes the repository's release expectation; it is not
legal advice.

## History

Before 2026-07-28 the repository was multi-licensed (MIT engine, PolyForm Noncommercial game software, CC BY-NC-SA content) while it hosted the retired Project Tavern PoC. With the PoC deleted and the repository renamed to SillyMaker, the owner relicensed all project-owned material as above. Git history predating the change retains the old headers; the current tree is controlling.

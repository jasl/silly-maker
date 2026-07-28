# Licensing policy

Status: simplified 2026-07-28 after the repository rename to SillyMaker. `LICENSE.md` is controlling; this note records the policy intent.

## Policy

- The whole repository — engine packages, Story packages (e2e, template, examples including the Cat Cafe), scripts, configuration, and documentation — is **MIT**. Inbound contributions are accepted inbound=outbound MIT.
- **AI-generated and synthesized media assets** (images and audio under `examples/*/assets/**`, source archives under `art-source/**` and `examples/*/art-source/**`) are dedicated to the public domain under **CC0 1.0**: commercial use, derivatives, and redistribution are unrestricted and need no attribution.
- npm dependencies and vendored third-party material retain their own terms (`THIRD_PARTY_NOTICES.md`).
- `references/` stays untracked local research input; production code, tests, generators, and artifacts must not depend on it or copy distinctive third-party material from it (see `docs/policies/assets-and-references.md`).
- Product names and branding stay governed by `TRADEMARKS.md`; copyright licenses grant no trademark rights.

## History

Before 2026-07-28 the repository was multi-licensed (MIT engine, PolyForm Noncommercial game software, CC BY-NC-SA content) while it hosted the retired Project Tavern PoC. With the PoC deleted and the repository renamed to SillyMaker, the owner relicensed all project-owned material as above. Git history predating the change retains the old headers; the current tree is controlling.

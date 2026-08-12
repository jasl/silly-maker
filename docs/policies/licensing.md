# Licensing policy

Status: simplified 2026-08-12. `LICENSE.md` is controlling.

## Policy

- The whole repository — engine packages, Story packages, examples, scripts,
  configuration, and documentation — is **MIT**. Contributions are accepted
  inbound=outbound MIT.
- Project-owned media assets under
  `examples/*/assets/**`, `art-source/**`, and `examples/*/art-source/**` are
  dedicated to the public domain under **CC0 1.0**.
- Product names and branding remain governed by `TRADEMARKS.md`.
- The repository does not maintain source-tracking or dependency-license
  machinery. A future change that intentionally copies or adapts third-party
  material must first be discussed with the owner and must add only the license
  and notices actually required by that material.

## Distribution

Make the SillyMaker MIT text available with a distributed Player or Desktop
package through an in-product page, accompanying file, or stable public link.
Hosted `dist-web/` output may be deployed directly. The optional
`scripts/prepare-artifact.mjs` workflow adds the project license files to an
offline, integrity-checked handoff.

Examples and the starter template are MIT inside this repository. A copied
template may choose a different license for new project-owned Story code and
content, while retaining the SillyMaker MIT text for engine code it distributes.

## History

Before 2026-07-28 the repository was multi-licensed while it hosted the retired
Project Tavern PoC. With that PoC removed and the repository renamed to
SillyMaker, the owner relicensed all current project-owned material as described
above. The current tree and `LICENSE.md` control the current project.

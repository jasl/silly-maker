# Third-Party Material

SillyMaker's MIT and CC0 grants apply only to the project-owned scopes identified in `LICENSE.md`. They do not relicense npm packages, browser or operating-system components, build tools, services, or other third-party material.

## Package-manager dependencies

npm and other package-manager dependencies retain their own licenses, contracts, notices, and public-domain status. Exact manifests and the frozen lockfile are maintained for reproducible engineering, not as an exhaustive copyright inventory.

This repository does not enumerate every direct, transitive, development, optional, or production dependency here. Dependency copyright extraction, LICENSE-file scanning, and legal classification are not universal test or build gates.

A distributor is still responsible for the licenses and notices of third-party
components actually bundled into a Player. A hosted Player may make those
notices available through a licenses or credits screen, accompanying document,
or stable public link. Offline and installed distributions should carry the
applicable texts locally. An Artifact manifest may help audit that handoff, but
the manifest is not itself a license inventory or a substitute for the notices.

## First-party hosted Player baseline

The following is the maintained **minimum notice set** observed in Vite debug
sourcemaps for the current Engine Lab, starter template, and first-party
examples. The sourcemaps were used as local bundle evidence and are not
committed. Tree-shaking, application code, optional features, and future
dependency changes can produce a different set, so this section is not a claim
that every possible Player contains only these packages. A distributor must
still inspect the Player it actually ships.

### React family — MIT

- `react@19.2.7`
- `react-dom@19.2.7`
- `scheduler@0.27.0`

Copyright (c) Meta Platforms, Inc. and affiliates.

Upstream source and license:
[React v19.2.7](https://github.com/facebook/react/tree/v19.2.7).

### Radix UI primitives — MIT

- `@radix-ui/primitive@1.1.5`
- `@radix-ui/react-compose-refs@1.1.3`
- `@radix-ui/react-context@1.2.0`
- `@radix-ui/react-dialog@1.1.19`
- `@radix-ui/react-dismissable-layer@1.1.15`
- `@radix-ui/react-focus-guards@1.1.4`
- `@radix-ui/react-focus-scope@1.1.12`
- `@radix-ui/react-id@1.1.2`
- `@radix-ui/react-portal@1.1.13`
- `@radix-ui/react-presence@1.1.7`
- `@radix-ui/react-primitive@2.1.7`
- `@radix-ui/react-slot@1.3.0`
- `@radix-ui/react-use-callback-ref@1.1.2`
- `@radix-ui/react-use-controllable-state@1.2.3`
- `@radix-ui/react-use-layout-effect@1.1.2`

Copyright (c) 2022 WorkOS.

Upstream source and license:
[Radix Primitives](https://github.com/radix-ui/primitives) and the
version-pinned
[`@radix-ui/react-dialog@1.1.19` package](https://www.npmjs.com/package/@radix-ui/react-dialog/v/1.1.19).

### Focus and scroll helpers — MIT

- `aria-hidden@1.2.6`
- `get-nonce@1.0.1`
- `react-remove-scroll@2.7.2`
- `react-remove-scroll-bar@2.3.8`
- `react-style-singleton@2.2.3`
- `use-callback-ref@1.3.3`
- `use-sidecar@1.1.3`

The installed license files for these package families state:

- Copyright (c) 2017 Anton Korzunov.
- Copyright (c) 2020 Anton Korzunov (`get-nonce`).

The published `react-remove-scroll-bar@2.3.8` package identifies Anton Korzunov
as its author and declares MIT in package metadata, but does not include a
standalone license file. Its
[upstream source](https://github.com/theKashey/react-remove-scroll-bar) and the
common MIT text below are provided here as the maintained notice channel.

### Zod — MIT

- `zod@4.4.3`

Copyright (c) 2025 Colin McDonnell.

Upstream source and license:
[Zod v4.4.3](https://github.com/colinhacks/zod/tree/v4.4.3).

### tslib — 0BSD

- `tslib@2.8.1`

Copyright (c) Microsoft Corporation.

Upstream source and license:
[tslib v2.8.1](https://github.com/microsoft/tslib/tree/v2.8.1).

### MIT license text for the packages above

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### 0BSD license text for tslib

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.

## Vendored material

Third-party source, binaries, fonts, icons, images, models, audio, data, translations, and other material intentionally copied into Git belong under `vendor/**`.

Everything under `vendor/**` retains whatever original license, contract, notice, attribution, or public-domain status actually applies to it. The repository's project licenses do not apply to that directory. Repository automation does not scan, classify, approve, reject, or promise an exhaustive inventory of `vendor/**`.

## Excluded research material

The ignored `references/` directory is local research input, is not tracked, and must not enter production code, tests, generated artifacts, screenshots, releases, or AIGC inputs. It is not part of `vendor/**` and is outside every project license.

## Project-generated material

Project-owned and AI-assisted source is not third-party vendored material. AIGC source is organized for human maintenance under `art-source/aigc/<source>/**` and is outside automated license scanning. Images selected for the game are manually copied into a runtime asset package or Story and then follow the ordinary technical manifest and Asset Pack digest rules.

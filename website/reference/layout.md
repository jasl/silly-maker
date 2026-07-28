# Repository layout

```text
engine/packages/base      contracts, deterministic runtime, sessions,
                          persistence, replay, diagnostics (MIT)
engine/packages/ui        React shell, stage, overlays, DevDock (MIT)
engine/packages/web       browser host, IndexedDB/HTTP persistence,
                          automation, pointer input (MIT)
engine/packages/tooling   project config, story CLI commands (MIT)

e2e/                      Engine Lab: the neutral conformance Story (MIT)
template/                 minimal starter Story — copy me (MIT)
examples/bookshop         narrative-writing example (MIT)
examples/cat-cafe         the systems showcase: content DB, hit regions,
                          event pool, contest, meta progress, i18n
                          (PolyForm-NC code, CC BY-NC-SA content)

project.config.ts         every application registered in one place
scripts/                  build identity, asset verification, save server
docs/                     internal engineering docs (plans, research,
                          proposals, policies) — not published
website/                  this documentation site (en + zh)
```

Packages consume each other only through declared exports (`@sillymaker/*`); Stories never import another Story's sources. Licensing is per-path and per-package — `LICENSE.md` at the root controls.

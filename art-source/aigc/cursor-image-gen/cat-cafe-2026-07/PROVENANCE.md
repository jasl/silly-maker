# Cat Cafe art set — generation provenance

- Date: 2026-07-28
- Tool: Cursor image generation (agent-invoked), text-to-image with
  reference-image chaining for style/identity consistency.
- Style anchor: `cc-bg-shopfront.png` (storybook gouache, warm amber
  interior vs cool rainy blue exterior). Every later image passed either
  the anchor or a previously accepted cat sprite as a reference input.
- Identity chain: `cc-cat-kitten-calm.png` defines the cat (blue-grey
  tabby, white chest and paws, green eyes); stage/expression variants
  reference it or the stage-adjacent calm sprite.
- Promoted runtime copies: `examples/cat-cafe/assets/*.webp`
  (cwebp -q 88), digests declared in the Story's asset pack
  (`examples/cat-cafe/src/presentation.ts`).
- `cc-app-icon.png` is promoted as `examples/cat-cafe/icon.png` for
  desktop packaging (not a runtime asset).

These archive files are source material, not product assets. Promotion
is the deliberate copy above; see docs/policies/assets-and-references.md.

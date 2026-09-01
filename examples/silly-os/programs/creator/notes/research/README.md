# Program Creator closed-blueprint research

This research asks one narrow question: can a modest model map an ordinary
product request onto a cohesive Program made only from SillyOS-provided
building blocks? It does not ask the model to invent code, install a runtime,
or publish a Program.

The checked-in request describes a reusable Translation workbench. The stable
Creator prompt and tool schema expose one compatibility generation, eight
workflow stages, three deterministic assets/operations, two Program resources,
three model roles, eight optional settings, and one structured human-review
surface. The model may select only those identifiers. Product admission rejects
unknown, duplicate, or malformed identifiers and reports missing required
coverage separately.

## 2026-08-31 observation

Two fresh calls and one immediate repeat per route were made with low reasoning,
temperature zero, short cache retention, no retry, and the same request:

| Route                           | Admitted | Required groups complete | First / repeat input | Repeat cache read | Output total |
| ------------------------------- | -------: | -----------------------: | -------------------: | ----------------: | -----------: |
| DeepSeek `deepseek-v4-flash`    |      2/2 |              5/5 per run |           1,237 / 85 |             1,152 |        1,451 |
| OpenRouter `z-ai/glm-5.3-flash` |      2/2 |              5/5 per run |        1,086 / 1,086 |                 0 |          471 |

Both routes selected the complete expected workflow, deterministic assets,
resources, model roles, settings, compatibility reference, and human workbench.
Neither invented another capability. DeepSeek's immediate repeat reused 1,152
provider-reported input tokens; the observed OpenRouter route reported no cache
read. These are raw Pi usage observations, not a pricing or broad cache-support
claim.

The ignored raw evidence lives under
`tmp/sillyos-program-creator-research/`. It contains no credential value.

## Interpretation

The result supports a closed, Skill-like Program blueprint as a useful Creator
output. It does not prove that Creator can author correct scripts, install a
package, execute the workflow, preserve a Process across upgrades, or design a
new capability outside the offered vocabulary. Those steps remain ordinary
SillyOS admission, authoring, and product work rather than model authority.

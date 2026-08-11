# Examples

Every example is a complete, independently runnable project under `examples/` in the repository — copy any of them as a starting point, or play the deployed builds right here.

## Cat Cafe 《雨巷猫舍》

<p><a href="/play/cat-cafe/" target="_self">▶ Play in the browser</a></p>

The flagship: a complete, publishable raising-sim. You take over a rainy-alley shop, raise a soaked kitten across seven weeks, and run the business toward one of four endings (plus an endless postgame).

What it exercises in the engine:

- **Content database** — activities, petting reactions, contest moves, rivals, and album entries are typed, validated tables; tuning is editing a row.
- **Stage hit regions** — petting routes through content-declared zones that scale with the cat's growth stage; feedback bursts in place (emoji + speech bubble).
- **Production Narrative surface** — Cat Cafe declares one `application.ui().narrative`; the engine owns typewriter, auto/skip-read, History, and Seen tracking while the Story supplies the passive skin.
- **Deterministic simulation** — event-pool encounters, a turn-based contest, player rollback with hard barriers, save safepoints.
- **Scene-driven audio** — BGM/ambient/SFX follow the published game view; three volume buses persist in the player profile.
- **Bilingual text + auto locale**, AIGC art with a consistent storybook style, and host/cross-target Desktop packaging previews (`.app`, Windows `.msi`, or `.AppImage`) whose file-backed persistence still has a durability promotion gate.

## SillyOS 98

<p><a href="/play/silly-os/" target="_self">▶ Boot in the browser</a></p>

A retro desktop — not a game. An off-label use of the engine: boot straight to overlapping windows, a taskbar, a Start menu, and apps (deterministic Minesweeper, Notepad, a period browser, Display Properties, Control Panel).

Why it exists: to prove the engine outside visual novels.

- **Fluid viewport** — the desktop fills any browser area 1:1, portrait phones included; no letterbox.
- **Window management as UI transients** — a ~180-line Story-side store handles z-order, focus, minimize/maximize, drag, and bounds clamping.
- **Hard disk, not save UI** — persistence is entirely internal; players never see slots or save dialogs. Close the tab, reboot, your files are back.
- **Custom shell chrome** — the engine's default system menu, title screen, and settings dialog are all hidden; Win98-style pressed-button and inset-field styling is plain CSS.
- **No Narrative writer** — `application.ui()` intentionally omits `narrative`; the desktop does not pay for or imitate a dialogue runtime it does not use.

## Bookshop 《打烊前的旧书店》

A short narrative vignette — the first Story ever authored for the engine by an external model in a single pass. It stays in the repository as the minimal script-writing reference: say/choice nodes, flags, a coin, and two endings. Like the starter and Cat Cafe, it now declares the composition-owned production Narrative surface through `defineNarrativeSurfaceV1`.

# Emberfall

A small turn-based RPG for your phone, built as an installable web app (PWA) — no app store, no build step.

## Play it

Serve the folder over HTTP and open it on your phone (or in a desktop browser at a narrow width):

```
python3 -m http.server 8765
```

Then visit `http://<your-machine-ip>:8765/` from your phone on the same network, or `http://localhost:8765/` locally. On mobile, use "Add to Home Screen" to install it like a native app (works offline after the first load).

## How to play

- Move with the on-screen D-pad or arrow keys.
- Walking through grass risks a random encounter; the path is safe.
- Battles are turn-based: Attack, Fireball (costs MP), use an Item, or Run.
- Winning fights grants gold and XP; leveling up raises your stats and fully heals you.
- The town (top of the map) lets you rest for free and buy Potions/Ethers with gold.
- Your progress autosaves (browser local storage) after town visits and battles — use Continue from the title screen to resume.
- The Dark Knight guards the stairs at the bottom of the map — defeat him to complete this slice.

## Project layout

- `index.html`, `css/style.css` — screens and mobile-first styling
- `js/data.js` — stats, enemies, items, and the overworld map layout
- `js/state.js`, `js/save.js` — game state and localStorage persistence
- `js/map.js` — tile rendering and movement/encounter logic
- `js/battle.js` — turn-based combat and leveling
- `js/ui.js`, `js/main.js` — screen wiring and app bootstrap
- `manifest.json`, `service-worker.js`, `icons/` — PWA installability + offline caching
- `scripts/gen-icons.js` — one-off script that generated the app icons (pure Node, no image libraries)

This is a vertical slice: one hero, one map, a handful of enemy types, and one boss. It's built to be easy to extend — add more `MAP` tiles/enemies/items in `data.js`, or new screens alongside the existing ones in `ui.js`.

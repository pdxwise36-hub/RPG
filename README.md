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
- The town (top of the map) lets you rest for free, buy Potions/Ethers, and visit the Armory to buy and equip better weapons/armor.
- Your progress autosaves (browser local storage) after town visits, battles, and area transitions — use Continue from the title screen to resume.
- The Dark Knight guards the stairs at the bottom of the map — defeat him and his tile becomes a permanent portal down into a second area, The Ember Depths, home to tougher monsters and a final boss, the Lich.

## Project layout

- `index.html`, `css/style.css` — screens and mobile-first styling
- `js/data.js` — stats, enemies, items, equipment, and the `MAPS` registry (overworld + Depths, each with its own grid, palette, enemy pool, and boss)
- `js/state.js`, `js/save.js` — game state and localStorage persistence
- `js/map.js` — tile rendering and movement/encounter/portal logic, driven by the current map in `MAPS`
- `js/battle.js` — turn-based combat and leveling
- `js/ui.js`, `js/main.js` — screen wiring and app bootstrap
- `manifest.json`, `service-worker.js`, `icons/` — PWA installability + offline caching
- `scripts/png-lib.js` — shared pure-Node PNG encoder (no image libraries available in this environment)
- `scripts/gen-icons.js`, `scripts/gen-sprites.js` — one-off scripts that generated the app icons and pixel-art hero/monster sprites

Built to be easy to extend: add a new zone by adding an entry to `MAPS` in `data.js` (grid, palette, enemy pool, boss, portal linkage) — `map.js` and `ui.js` are already generic across maps.

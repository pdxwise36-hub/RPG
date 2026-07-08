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
- Battles are turn-based: Attack, cast a Skill (costs MP), use an Item, or Run.
- Winning fights grants gold and XP; leveling up raises your stats and fully heals you. Regular (non-boss) wins also have a chance to drop a treasure chest — gold, a Potion/Ether, or a scroll that teaches a random skill you don't already know for free.
- The town (top of the map) lets you rest for free, buy Potions/Ethers, and visit the Armory to buy and equip better weapons/armor.
- The Knight and the Master Mage (two huts off the path, south of town) teach permanent new skills for gold — physical techniques and spells respectively, though mechanically both just spend MP for bonus damage.
- Your progress autosaves (browser local storage) after town visits, battles, and area transitions — use Continue from the title screen to resume.
- Four areas, each with its own monster type and boss: the overworld (Slime/Goblin/Wolf, boss the Dark Knight) → The Ember Depths (Bat/Specter, boss the Lich) → The Frostreach (Frost Golem/Ice Sprite, boss the Glacial Titan) → The Dragon's Spire (Wyrmling/Drake, boss the Ancient Dragon — the true final boss). Beating a boss turns its tile into a permanent portal down to the next area; a matching portal tile at each area's entrance leads back up.

## Project layout

- `index.html`, `css/style.css` — screens and mobile-first styling
- `js/data.js` — stats, enemies, items, equipment, and the `MAPS` registry (four zones, each with its own grid, palette, enemy pool, and boss)
- `js/state.js`, `js/save.js` — game state and localStorage persistence
- `js/map.js` — tile rendering and movement/encounter/portal logic, driven by the current map in `MAPS`
- `js/battle.js` — turn-based combat and leveling
- `js/ui.js`, `js/main.js` — screen wiring and app bootstrap
- `manifest.json`, `service-worker.js`, `icons/` — PWA installability + offline caching
- `scripts/png-lib.js` — shared pure-Node PNG encoder (no image libraries available in this environment)
- `scripts/gen-icons.js`, `scripts/gen-sprites.js` — one-off scripts that generated the app icons and pixel-art hero/monster sprites

Built to be easy to extend: add a new zone by adding an entry to `MAPS` in `data.js` (grid, palette, enemy pool, boss, portal linkage) — `map.js` and `ui.js` are already generic across maps.

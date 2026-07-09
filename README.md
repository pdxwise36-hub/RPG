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
- Winning fights grants gold and XP; leveling up raises your stats and fully heals you. The XP needed per level compounds through level 10 (the original curve), then grows by a flat amount per level after that so grinding through all 14 zones stays achievable instead of demanding an ever-exploding amount of XP. Regular (non-boss) wins also have a chance to drop a treasure chest — gold, a Potion/Ether, a weapon or armor piece you don't already own, or a scroll that teaches a random skill you don't already know for free. Both the gold and the gear tier scale up the deeper you've traveled, so chests found late in the run are worth noticeably more.
- The town (top of the map) lets you rest for free, buy Potions/Ethers, and visit the Armory to buy and equip better weapons/armor.
- The Knight and the Master Mage (two huts off the path, south of town) each teach 12 permanent skills for gold — physical techniques and spells respectively, though mechanically both just spend MP for bonus damage, spanning cheap/weak to expensive/strong.
- The Pet Tamer (a hut further south of town) sells ten battle pets, cheap-and-weak to rare-and-strong: Turtle, Wolf Pup, Fox, Hawk, Boar, Salamander, Owl, Baby Golem, Panther, and the Dragonling. An adopted, active pet fights beside you: after your action each turn, it automatically lands its own bonus hit on the enemy before it strikes back. Only one pet can be active at a time, but switching between owned pets is free. Each pet levels up from XP earned while it's active in battle, permanently boosting its damage — no level cap, same as your own character, so a pet you've stuck with for a long run keeps getting stronger right alongside you. A pet's level and XP stick with it even if you bench it for another pet later, and the Status screen shows its XP bar plus its exact per-hit damage.
- The Status screen (top-right of the map HUD) isn't just a summary — you can drink Potions/Ethers and equip any weapon or armor you already own directly from there, no battle or trip to the Armory required.
- Your progress autosaves (browser local storage) after town visits, battles, and area transitions — use Continue from the title screen to resume.
- The Armory sells ten tiers of weapons and armor, from the free starting gear up to the Celestial Edge and Celestial Aegis.
- Fourteen areas in a chain, each with its own monster pair and boss, escalating from the overworld all the way to the true final boss: Emberfall (Slime/Goblin/Wolf → Dark Knight) → The Ember Depths (Bat/Specter → Lich) → The Frostreach (Frost Golem/Ice Sprite → Glacial Titan) → The Dragon's Spire (Wyrmling/Drake → Ancient Dragon) → The Sunken Ruins (Merfolk Raider/Reef Serpent → Drowned Queen) → The Whispering Woods (Thornling/Wisp Moth → Elder Ent) → The Sandscar Wastes (Dust Jackal/Sand Viper → Sand Reaver) → The Volcanic Depths (Cinder Imp/Magma Hound → Molten Wyrm) → The Shattered Peaks (Storm Harpy/Rock Wyvern → Stormguard Titan) → The Blightmarsh (Bog Leech/Plague Rat → Rotlord) → The Crystal Caverns (Crystal Stalker/Gem Ooze → Prism Colossus) → The Shadowfen (Shade Stalker/Nightmare Hound → Nightmare Drake) → The Celestial Spire (Star Wisp/Cloud Serpent → Astral Guardian) → The Void Rift (Void Spawn/Chaos Hound → the World Serpent, the true final boss). Beating a boss turns its tile into a permanent portal down to the next area; a matching portal tile at each area's entrance leads back up.
- Every area past the overworld is procedurally generated — the winding path from entrance to boss, the vendor placement, and the scatter of trees/water are randomized fresh each time you step into that zone, so it's never the same straight corridor twice. The overworld (your home town) stays fixed once generated, so it always feels like a stable home base.

## Project layout

- `index.html`, `css/style.css` — screens and mobile-first styling
- `js/data.js` — stats, enemies, items, equipment, and the `MAPS` registry (fourteen zones, each with its own theme, enemy pool, and boss — no fixed layout, since layouts are generated)
- `js/mapgen.js` — procedural zone-layout generator: a randomized winding path from entry to boss, with vendor placement and a reachability check/retry so a level is never accidentally unsolvable
- `js/state.js`, `js/save.js` — game state, per-zone layout caching, and localStorage persistence
- `js/map.js` — tile rendering and movement/encounter/portal logic, reading the current zone's cached layout from state
- `js/battle.js` — turn-based combat, player leveling, pet XP gain, and chest-loot rolls (gold/item/gear/scroll, scaled by zone depth)
- `js/ui.js`, `js/main.js` — screen wiring and app bootstrap
- `manifest.json`, `service-worker.js`, `icons/` — PWA installability + offline caching
- `scripts/png-lib.js` — shared pure-Node PNG encoder (no image libraries available in this environment)
- `scripts/gen-icons.js`, `scripts/gen-sprites.js` — one-off scripts that generated the app icons and pixel-art sprites; monster/boss art reuses a handful of body-plan templates (quadruped/biped/flier/blob/serpent, and four boss archetypes) recolored per zone rather than one-off art for every creature

Built to be easy to extend: add a new zone by adding an entry to `MAPS` in `data.js` (theme, enemy pool, boss, `hasTown`/`vendors`, `portalTarget`/`nextMap` by zone id) — `mapgen.js` generates its layout automatically, and `map.js`/`ui.js` are already generic across zones.

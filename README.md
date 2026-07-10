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
- **Town is completely separate from the levels, and completely safe** — its layout is fixed (same every playthrough, never regenerates) and has no grass tiles at all, so no random encounter can ever happen there. It's your permanent home base: Town Center (rest for free, General Store, Armory), the Knight, the Master Mage, and the Pet Tamer all sit at fixed spots you'll come to know by heart. An exit portal at the south end leads out to the levels.
- Walking through grass in a level risks a random encounter; the path is safe. Battles are turn-based: Attack, cast a Skill (costs MP), use an Item, or Run.
- **Town Scrolls** teleport you straight back to Town from anywhere in the levels — buy them at the General Store or find them in chests. Walking into Town's exit portal opens a **Travel menu** listing every level you've ever reached — pick any one to go straight there, so you can freely revisit and explore earlier levels instead of only ever being sent back to your farthest one.
- Winning fights grants gold and XP; leveling up raises your stats and fully heals you. The XP needed per level compounds through level 10 (the original curve), then grows by a flat amount per level after that so grinding through all 14 levels stays achievable instead of demanding an ever-exploding amount of XP. Regular (non-boss) wins also have a chance to drop a treasure chest — gold, a Potion/Ether/Town Scroll, a weapon or armor piece you don't already own, or a scroll that teaches a random skill you don't already know for free. Both the gold and the gear tier scale up the deeper you've traveled, so chests found late in the run are worth noticeably more.
- The Knight and the Master Mage each teach 12 permanent skills for gold — physical techniques and spells respectively, though mechanically both just spend MP for bonus damage, spanning cheap/weak to expensive/strong.
- The Pet Tamer sells ten battle pets, cheap-and-weak to rare-and-strong: Turtle, Wolf Pup, Fox, Hawk, Boar, Salamander, Owl, Baby Golem, Panther, and the Dragonling. An adopted, active pet fights beside you: after your action each turn, it automatically lands its own bonus hit on the enemy before it strikes back. Only one pet can be active at a time, but switching between owned pets is free. Each pet earns the exact same XP as you do from every kill it's active for, leveling up on the exact same curve — no level cap, same as your own character — so a pet levels in lockstep with you instead of lagging behind. A pet's level and XP stick with it even if you bench it for another pet later, and the Status screen shows its XP bar plus its exact per-hit damage.
- The Status screen (top-right of the map HUD) isn't just a summary — you can drink Potions/Ethers, use a Town Scroll, and equip any weapon or armor you already own directly from there, no battle or trip to the Armory required. A second **Bestiary** tab lists every monster (and boss) in every level, with a strikethrough on anything you've already defeated at least once, so you can track what's left to hunt down.
- Your progress autosaves (browser local storage) after town visits, battles, and area transitions — use Continue from the title screen to resume.
- The Armory sells ten tiers of weapons and armor, from the free starting gear up to the Celestial Edge and Celestial Aegis.
- Nineteen levels in a chain, each with its own monster pair and boss, escalating from the outskirts of town all the way to the true final boss: The Emberfall Outskirts (Slime/Goblin/Wolf → Dark Knight) → The Ember Depths (Bat/Specter → Lich) → The Frostreach (Frost Golem/Ice Sprite → Glacial Titan) → The Dragon's Spire (Wyrmling/Drake → Ancient Dragon) → The Sunken Ruins (Merfolk Raider/Reef Serpent → Drowned Queen) → The Whispering Woods (Thornling/Wisp Moth → Elder Ent) → The Sandscar Wastes (Dust Jackal/Sand Viper → Sand Reaver) → The Volcanic Depths (Cinder Imp/Magma Hound → Molten Wyrm) → The Shattered Peaks (Storm Harpy/Rock Wyvern → Stormguard Titan) → The Blightmarsh (Bog Leech/Plague Rat → Rotlord) → The Crystal Caverns (Crystal Stalker/Gem Ooze → Prism Colossus) → The Shadowfen (Shade Stalker/Nightmare Hound → Nightmare Drake) → The Celestial Spire (Star Wisp/Cloud Serpent → Astral Guardian) → The Void Rift (Void Spawn/Chaos Hound → the World Serpent) → The Ashen Wastes (Ash Wraith/Cinder Golem → the Ashlord) → The Storm Citadel (Thunder Hawk/Storm Elemental → the Tempest King) → The Bone Wastes (Bone Reaper/Wraith Serpent → the Bone Emperor) → The Chaos Rift (Chaos Spawn/Void Hound → the Chaos Harbinger) → The Throne of Eternity (Eternal Guardian/Timeless Wraith → the Eternal Sovereign, the true final boss). Beating a boss turns its tile into a permanent portal down to the next level. Every level's own entrance portal leads straight back to Town regardless of how deep you are — it never chains through intermediate levels or "closes," so walking back is always a one-step trip.
- Every level is procedurally generated — the winding path from entrance to boss and the scatter of trees/water are randomized fresh each time you step into that level, so it's never the same straight corridor twice.
- **The Arena** (in Town, mirroring the Pet Tamer) is an endless wave-based challenge for when you want something to do besides pushing through levels: each win pits you against a tougher reskinned-and-scaled version of a regular monster (drawing from progressively deeper zones as the wave count climbs) for better-than-normal gold and XP, and you choose after every win whether to press on for wave N+1 or bank your rewards and leave. Losing (or leaving) resets you to wave 1 next time, but your best wave ever is tracked and shown in the Status screen.

## Project layout

- `index.html`, `css/style.css` — screens and mobile-first styling
- `js/data.js` — stats, enemies, items, equipment, and the `MAPS` registry: Town (fixed, no boss/enemyPool) plus nineteen procedurally-generated monster levels, each with its own theme, enemy pool, and boss, chained purely by `nextMap`
- `js/mapgen.js` — `generateZoneGrid()` builds a randomized winding path from entry to boss for the 19 levels (with a reachability check/retry so one's never accidentally unsolvable); `getTownLayout()` returns Town's one fixed, hand-authored grid (including the Arena tile)
- `js/state.js`, `js/save.js` — game state, per-zone layout caching, `currentLevelId` tracking (which level Town's exit / a Town Scroll returns you to), and localStorage persistence
- `js/map.js` — tile rendering and movement/encounter/portal logic (every level's portal leads straight to Town; Town's leads straight to `currentLevelId`), reading the current zone's cached layout from state
- `js/battle.js` — turn-based combat, player leveling, pet XP gain, chest-loot rolls (gold/item/gear/scroll, scaled by zone depth), and `pickArenaEnemy()` (reskins/scales a random regular-level enemy per Arena wave)
- `js/ui.js`, `js/main.js` — screen wiring and app bootstrap
- `manifest.json`, `service-worker.js`, `icons/` — PWA installability + offline caching
- `scripts/png-lib.js` — shared pure-Node PNG encoder (no image libraries available in this environment)
- `scripts/gen-icons.js`, `scripts/gen-sprites.js` — one-off scripts that generated the app icons and pixel-art sprites; monster/boss art reuses a handful of body-plan templates (quadruped/biped/flier/blob/serpent, and four boss archetypes) recolored per zone rather than one-off art for every creature

Built to be easy to extend: add a new level by adding an entry to `MAPS` in `data.js` (theme, enemy pool, boss, `nextMap` by zone id — the level's own portal back to Town is automatic) — `mapgen.js` generates its layout automatically, and `map.js`/`ui.js` are already generic across levels. Town, being fixed, is edited directly in `mapgen.js`'s `getTownLayout()`.

# TARTARUS — Technical Architecture

## Mandatory Constraints

*(These constraints apply to all AI-assisted development of this project.)*

- **Static files only.** No server-side code, APIs, or databases. The game must run entirely in the browser from static files with no backend.
- **Zero external dependencies.** Do not use `npm`, `yarn`, or any package manager. Do not load React, Vue, Phaser, PixiJS, Three.js, or any game engine or framework via CDN or otherwise.
- **Vanilla JavaScript + HTML5 Canvas + CSS only.** All game rendering is done on a `<canvas>` element using the 2D Context API. All UI chrome (health bar, HUD labels, overlays, shop panels) is standard HTML and CSS.

---

## Why Vanilla Canvas Is the Right Choice

- **All entities are geometric primitives** — circles, triangles, hexagons, short lines. No sprite sheets, tilemaps, or asset pipelines are needed.
- **Pathfinding is trivially simple** — every enemy moves toward the rig center. The math is: `normalize(target - position) * speed * dt`. No A*, no navmesh, no library required.
- **Collision detection is circle-vs-circle and circle-vs-point** — approximately 3 lines of math per check pair. No physics engine needed.
- **Object pooling from scratch is straightforward** at this entity count and gives full control over garbage collection.
- **Zero dependencies = zero failure modes**: no CDN outages, no version conflicts, smallest possible page weight.

---

## Core Technical Requirements

### Game Loop

- Must use `window.requestAnimationFrame`
- All entity movement, cooldowns, timers, and spawn logic must use **Delta Time (`dt`)** for frame-rate independence
- `dt = (currentTimestamp - lastTimestamp) / 1000` (seconds)
- Cap `dt` at a maximum (e.g., 0.1s) to prevent large jumps when the tab loses focus

### Object Pooling

Implement Object Pools for:
- **Enemies** — pre-allocate on startup; pull from pool on spawn, return on death (HP reset, reposition off-screen)
- **Projectiles** — same; fire rate may sustain hundreds of active projectiles per second at peak
- **Particles** — death bursts, exhaust blasts, laser beams, deposit glow pulses

Do not call `new Enemy()` or `new Projectile()` during active gameplay. All instantiation happens during the pool initialization at load time.

### Input Handling

All player interactions target the canvas element or the DOM dashboard below it:

| Interaction | Input | Handler |
|:---|:---|:---|
| Wall-Harvest Laser | Click/tap canvas edge deposit | Canvas `mousedown` / `touchstart` |
| Targeting Override | Click/tap any enemy on canvas | Canvas `mousedown` / `touchstart` (hit-test against enemy positions) |
| Tier 1 slot upgrade | Click/tap weapon slot button | DOM `click` on slot element |
| Tier 2 overhaul panel | Click/tap Rig on canvas, or dedicated button | Canvas hit-test + DOM button |
| Active system (Ultimate) | Click/tap Ultimate button | DOM `click` |
| Coolant Vent direction | Tap canvas area | Canvas `mousedown` / `touchstart` (angle from rig to tap point) |

---

## File Structure

```
arcade/tartarus/
├── index.html          # Canvas element, UI shell, Google Fonts <link> tags, ES6 module entry
├── style.css           # HUD, dashboard layout, overlays, screen transitions, corporate theme
├── main.js             # Entry point; initializes all modules, starts game loop
├── gameState.js        # Central store: HP, Scrap, Depth, Phase, Zone, Wave flags, Upgrade state, Run metadata
├── entities.js         # Classes: Rig, Enemy (+ subclasses), Projectile, Particle; Object Pool management
├── spawner.js          # Phase-based spawn config; strata/zone transition logic; boss spawn triggers
├── uiManager.js        # HUD value updates, shop panel open/close, screen transitions, comm line display
├── metaProgress.js     # Black Box death cause tracking, Data Core ledger, Blueprint state, Sector Map data
└── rigNames.js         # Name generator word lists and randomization function
```

All files use **ES6 `import`/`export`** syntax loaded as modules from `index.html` via `<script type="module" src="main.js">`.

---

## Build Milestones

Do not prompt the entire game build at once. Follow this sequence to catch architectural issues early and avoid context overflow.

**Milestone 1 — Foundation**
Create all project files. Implement the HTML/CSS shell with all UI regions rendered correctly (top bar, canvas placeholder, weapon slots, Ultimate button). Set up the `requestAnimationFrame` loop with Delta Time. Log `dt` to confirm frame-rate independence. No game logic yet.

**Milestone 2 — Rig + Single Enemy**
Render the Rig as a white rectangle at canvas center. Spawn one Scout (triangle) off-screen at a random edge. Implement normalized pathfinding toward the Rig center. Confirm movement is smooth and frame-rate independent.

**Milestone 3 — Auto-Targeting + Combat**
The Rig fires at the nearest enemy using a cooldown timer. Implement the Projectile object pool. Enemies take damage and return to the pool on death. Confirm the full combat loop works with 1, then 10, then 50 simultaneous enemies without GC stuttering.

**Milestone 4 — Phase & Zone Progression**
Implement the 30-second Phase timer. Build the spawn config table (enemy type, count, HP per phase). Zone transitions update the depth counter, zone label, and background parallax rate. Confirm strata progress is accurate with Delta Time.

**Milestone 5 — Scrap Economy + Tier 1 Shop**
Enemies drop Scrap on death; counter updates in the HUD. Tapping a weapon slot applies a Mk-level upgrade if Scrap is sufficient. Upgrade affects turret DPS. Mk.IV cap prevents further purchases on that slot.

**Milestone 6 — Wall Deposits + Harvest Laser**
Render Kyloric deposits at canvas left/right edges. Tap interaction fires the laser beam (visual line), channels briefly, and pays out Scrap. Implement Harvester cling-state on a subset of deposits. Targeting a guarded deposit spawns the Harvester as a live enemy.

**Milestone 7 — Targeting Override**
Canvas tap-on-enemy applies the priority mark (pulsing red ring). All turrets snap to marked enemy. Mark expires after 5 seconds. Confirm turret targeting reverts correctly.

**Milestone 8 — Tier 2 Rig Overhaul Panel**
Open panel on Rig tap or button press. Render 2–3 upgrade cards with costs. Purchase flow: deduct Scrap, apply effect (new weapon in empty slot, passive bonus, or manual system unlock). Panel dismisses after purchase.

**Milestone 9 — Canister Launch Events**
Every 3 phases: trigger launch animation (streak of light toward top of canvas), exhaust blast AoE (damage to enemies in arc), display Megacorp comm line referencing the rig's designation.

**Milestone 10 — Elite + Mini-Boss Spawns**
Zone 2 Elite spawn logic (single guaranteed; larger, harder). Zone 4 Mini-Boss spawn (segmented Magma-Worm + beetle retinue). Boss HP bars. Boss Scrap drops on kill.

**Milestone 11 — Extraction Sequence (Win Condition)**
Phase 15 triggers the 45-second extraction timer displayed prominently on the HUD. Win state on timer expiry. Full Extraction screen displayed. Death state on HP = 0 at any point.

**Milestone 12 — Meta-Progression Shell**
Run-end screen with stat summary and Data Core award. Death cause detection → reactive loadout flag for next run. Static Sector Map screen. Orbital Workshop screen (no purchased upgrades need to function yet, just the UI shell and Data Core spending logic).

**Milestone 13 — Megacorp Comms + Rig Names**
Implement the name generator. Comm lines trigger on zone transitions, canister launches, critical health, and run-end states. Display as a brief overlay banner with corporate-style typography.

**Milestone 14 — Polish Pass**
Particle effects for enemy death, canister launch blast, and laser harvesting. Health bar color transitions. Parallax depth texture. Background scroll acceleration by zone. (Audio is out of scope for Iteration 1 unless using the Web Audio API directly — no external audio libraries.)

# 🌌 Deep Space Drill: Game Design Document

## 1. Concept & Lore
**The Setting:** The player is an AI Overseer on an orbital command ship for the **Exo-Extract Megacorporation**. Below lies Tartarus-9, a hostile planet rich in "Kyloric Geodes"—massive, subterranean crystalline energy structures. The Megacorp views the loss of a billion-dollar surface mining rig as acceptable "operational overhead."

**The Conflict:** The native insectoid aliens (The Swarm) consume Kyloric energy to survive. The sonic vibrations of the orbital drill hitting the crust act as a dinner bell. The Swarm isn't just defending territory; they are defending their food supply. 

**The Meta-Progression (Death & Rebirth):** When a Rig is overwhelmed and destroyed, it is abandoned as scrap. However, prior to critical failure, the Rig uploads its **Black Box Combat Telemetry** (Data Cores) back to orbit. 
* Players spend Data Cores to permanently upgrade the **Orbital 3D-Printer Blueprints**. 
* Every new run is a freshly printed Rig dropped into a new sector, armed with upgraded base stats or new weapon schematics.

**Procedural Sectors:** Cracking a Geode Core enrages the local hive mind within a 1,000-mile radius. Once extracted, the sector is drained, and the orbital ship moves to a new drop zone. This justifies **Procedural Biome Modifiers** for each run (e.g., a "Cryo-World" biome where bugs move 10% slower, but Rig weapons fire 10% slower).

---

## 2. Core Gameplay & The Extraction Timeline
The game tracks progress via **Depth**. Every 30 seconds, the drill penetrates a new geological layer ("Strata"), triggering escalating swarm responses. A full run consists of 15 Strata (roughly 8–10 minutes).

* **Strata I (Depth 0 - 200m) | The Surface Crust (Phases 1-4):** Light tremors. The swarm sends fragile, fast "Scouts" to investigate.
* **Strata II (Depth 500m) | The Hive Aquifer (Phase 5):** The drill punctures a subterranean water table. **Guaranteed Elite spawn.**
* **Strata III (Depth 1000m) | The Obsidian Mantle (Phases 6-9):** Rock density increases alongside enemy armor. Introduces heavily armored "Geode-Beetles" that resist light attacks.
* **Strata IV (Depth 2000m) | The Magma Vents (Phase 10):** Heat triggers massive territorial defenders. **Guaranteed Mini-Boss** (e.g., Armored Magma-Worm).
* **Strata V (Depth 3000m) | The Deep Hive (Phases 11-14):** Drilling directly through central nesting grounds. Maximum spawn rates of all enemy types.
* **Strata VI (Depth 4000m) | The Kyloric Core (Phase 15):** The drill hits the motherlode. The extraction sequence takes exactly 45 seconds. The local hive mind converges completely. **Survive this to win the run.**

---

## 3. Mathematical Pacing & Economy
The core tension is driven by intersecting mathematical curves: smooth enemy scaling vs. stepped player power scaling.

* **Enemy Scaling (Exponential):** `Enemy HP = Base HP * (1.15 ^ Strata Level)`
* **Player Power:** Remains flat until a Scrap purchase is made, forcing periods of vulnerability.

### Pacing & Tension Table
*Assumptions: Base Rig DPS is 10. Scrap drop rate slightly increases as swarms get denser.*

| Strata | Phase / Event | Swarmer HP | Scrap Earned | Total Scrap (If Saved) | The Tension Cycle |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Crust - Scouts | 10 HP | 50 | 50 | **Overpowered:** Rig one-shots enemies effortlessly. |
| **2** | Crust - Swarm | 12 HP | 60 | 110 | **Comfortable:** Takes 2 hits, but still no threat. |
| **3** | Crust - Swarm | 13 HP | 70 | 180 | **Slipping:** Enemies get halfway to the Rig. |
| **4** | Crust - Swarm | 15 HP | 80 | 260 | **Struggling:** *Buy Tier 1 Upgrade (-150 Scrap).* DPS doubles. |
| **5** | **Aquifer (Elite)** | 17 HP | 120 (Boss Drop) | 230 | **Comfortable:** New upgrade handles the Elite easily. |
| **6** | Mantle - Armor | 20 HP | 100 | 330 | **Comfortable:** Upgraded Rig easily handles swarms. |
| **7** | Mantle - Armor | 23 HP | 110 | 440 | **Slipping:** Armored enemies take longer to kill. |
| **8** | Mantle - Armor | 26 HP | 120 | 560 | **Struggling:** Enemies are hitting the Rig! |
| **9** | Mantle - Armor | 30 HP | 130 | 690 | **Panic!:** *Buy Tier 2 Upgrade (-600 Scrap).* Massive AoE acquired. |
| **10** | **Magma (Mini-Boss)**| 35 HP | 200 (Boss Drop) | 290 | **Overpowered:** AoE melts the Boss and its minions. |
| **11** | Deep Hive | 40 HP | 150 | 440 | **Comfortable:** Enjoying the new massive damage output. |
| **12** | Deep Hive | 46 HP | 160 | 600 | **Slipping:** Massive spawn numbers dilute the AoE damage. |
| **13** | Deep Hive | 53 HP | 170 | 770 | **Struggling:** Rig taking heavy damage. Health dropping. |
| **14** | Deep Hive | 61 HP | 180 | 950 | **Panic!:** *Buy Tier 3 Ultimate (-900 Scrap).* Final desperate buy. |
| **15** | **Core (Extract)** | 70 HP | N/A | N/A | **The Climax:** 45 seconds of pure chaos. Survive with whatever HP is left. |

---

## 4. User Interface (UI) Blueprint
The UI uses a **Portrait/Square layout** optimized for both desktop mouse clicks and mobile touch interactions.

* **A. Top Bar (Telemetry):**
    * *Left:* Depth/Strata counter (e.g., `DEPTH: 1,400m (STRATA 7)`).
    * *Center:* Chunky horizontal Rig Health bar.
    * *Right:* Currency counter (`⚙️ 340 Scrap`).
* **B. Center Canvas (Action Zone):**
    * Central focal point is the fixed Hephaestus Drill Rig.
    * Parallax rock textures scroll upward to simulate downward drilling.
    * 360-degree spawn ring just outside the viewport.
* **C. Bottom Dashboard (Controls):**
    * Row of 4 modular Weapon Slots (tap/click to open Shop).
    * Large, circular "Ultimate" button above the slots with a radial battery-charge fill.
* **D. Upgrade Overlay (The Shop):**
    * Pauses the game on wave transition.
    * Presents three vertical cards offering procedural upgrades (e.g., "Plasma Cutter - 150 Scrap").
    * Tapping deducts scrap, visually installs the module, and resumes gameplay.

---

## 5. Technical Architecture & Constraints
*(Developer Note: AI coding assistants must adhere strictly to the following parameters.)*

* **Tech Stack:** Build exclusively using **Vanilla JavaScript, HTML5 Canvas, and standard CSS**. Zero external dependencies. Do not use React, Vue, Phaser, Unity, or Godot.
* **Game Loop:** The core loop must use `window.requestAnimationFrame`. All logic, movement, and cooldowns must be calculated using **Delta Time (`dt`)** to ensure frame-rate independence.
* **Object Pooling:** Implement an **Object Pool** pattern for Enemies, Projectiles, and Particle Effects. Instantiate pools on startup to prevent Garbage Collection lag spikes during heavy swarms.
* **File Structure:** Modularize via ES6 imports/exports:
    * `index.html` (Canvas and UI shell)
    * `style.css` (UI styling)
    * `main.js` (Game loop initialization)
    * `gameState.js` (Central store for Scrap, HP, Depth, Upgrades)
    * `entities.js` (Classes for Rig, Enemies, Projectiles)
    * `uiManager.js` (DOM and overlay updates)
* **Visuals (Programmer Art):** Iteration 1 must use Canvas primitives only (no image files). White square for the Rig, red circles/triangles for enemies, yellow lines for projectiles, dark `#0f0f11` background.

### AI Prompting Milestones
Do not prompt the entire build at once. Follow this sequence:
1. Setup project files, basic HTML/CSS UI shell, and an empty game loop with Delta Time.
2. Render the central Rig and implement a single enemy spawning off-screen and pathfinding to the center.
3. Implement basic auto-firing logic for the Rig to target the closest enemy and handle HP reduction/death.

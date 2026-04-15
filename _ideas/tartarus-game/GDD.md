# TARTARUS — Game Design Document

> *"Drill faster for profit. Drill slower to survive."*

**TARTARUS** is a roguelite survival game for the web browser. You are an AI Overseer commanding a disposable mining rig on a hostile alien planet. Your objective: drill through six geological zones to reach and extract a Kyloric Geode Core — while the planet's insectoid inhabitants do everything they can to stop you.

Each run lasts 8–10 minutes. Death is permanent within a run but feeds meta-progression. Your rig's Black Box survives every catastrophic failure, uploading combat telemetry to orbit to improve the next unit. The megacorp considers this acceptable.

---

## Design Pillars

1. **Survival through economy** — Scrap dropped by enemies funds two tiers of upgrades. The loop is constant: earn, decide, survive, earn more.
2. **Active command, passive defense** — Auto-turrets handle baseline defense. The player commands: harvest wall deposits, override targeting priority, deploy unlockable active systems.
3. **Roguelite depth** — No two runs are identical. Procedural biome sectors, random rig designations, reactive Black Box loadouts, and player-chosen sector order create meaningful variety.
4. **Dark corporate satire** — You are not a hero. You are an expense line item. The megacorp's communications remind you of this throughout.

---

## Document Index

| Document | Contents |
|:---|:---|
| [Lore & Narrative](./lore.md) | Setting, the Swarm, Kyloric extraction, megacorp voice, rig naming |
| [Gameplay & Mechanics](./gameplay.md) | Extraction timeline, geological zones, enemy roster, manual interactions, canister launches |
| [Economy & Shop](./economy.md) | Scrap, Data Cores, two-tier shop system, mathematical pacing table |
| [Meta-Progression](./meta-progression.md) | Black Box system, sector map, planet progression, biome unlocks |
| [UI Blueprint](./ui.md) | Layout, HUD, controls, screen designs, programmer art spec |
| [Technical Architecture](./technical.md) | Tech stack, game loop, file structure, build milestones |

---

## At a Glance

| Property | Value |
|:---|:---|
| **Title** | TARTARUS |
| **Genre** | Roguelite / Survival / Tower Defense |
| **Platform** | Web browser (desktop + mobile) |
| **Tech Stack** | Vanilla JS, HTML5 Canvas, CSS — zero dependencies |
| **Session Length** | 8–10 minutes per run |
| **Campaign Scope** | 3 planets × 5 sectors = 15 total extractions |
| **Status** | Concept / Pre-Production |

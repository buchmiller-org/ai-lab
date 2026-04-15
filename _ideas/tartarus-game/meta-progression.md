# TARTARUS — Meta-Progression

## Overview

Meta-progression in TARTARUS operates across three layers:

1. **The Black Box** — run-to-run reactive loadout improvements driven by *how* the previous rig was lost
2. **Orbital Blueprints** — permanent stat and schematic upgrades purchased with Data Cores between runs
3. **The Sector Map** — a player-driven campaign structure with biome variety, player-chosen sector order, and planet progression

---

## The Black Box System

Every rig carries a **Black Box** — a hardened telemetry recorder that survives destruction and is uplinked to the orbital ship before catastrophic failure. Even a failed run produces a complete Black Box upload. The Black Box is the mechanical reason death doesn't feel punishing: every loss teaches the system something.

### What the Black Box Records

- **Death cause** — the enemy type or in-game event responsible for the final HP loss
- **Lowest-HP phase** — the phase where the rig was most critically stressed
- **Data Cores earned** — a meta-currency amount scaled by overall run performance (depth reached + Canisters launched + enemies killed)

### Reactive Starting Loadout

The recorded death cause directly influences the starting weapon loadout of the *next* run. The Overseer's system adapts to patterns of failure:

| Death Cause | Next Run Reactive Advantage |
|:---|:---|
| Overwhelmed by Scouts / Swarmers | Start with a wider-spread auto-turret schematic already installed |
| Killed by Aquifer Elite (Zone 2) | Start with one weapon slot pre-upgraded to Mk.II |
| Killed by Geode-Beetles (Zone 3) | Start with an AoE splash weapon schematic installed |
| Failed the extraction sequence (Zone 6) | Start with +15% max hull HP |
| Killed by Magma-Worm or retinue (Zone 4) | Start with a heavy single-target cannon schematic installed |
| Killed by a disturbed Harvester | Wall-Harvest Laser yields 25% more Scrap for that run |
| Killed by Hive Convergence (Zone 5) | Start with Coolant Vent unlocked (normally a Tier 2 purchase) |

**Design intent:** A player who dies three times in Zone 2 will start their fourth run noticeably better equipped for Zone 2. They will make it further. Progress is earned even when it comes from failure — it just takes longer. A skilled player who completes early runs cleanly won't accumulate these advantages, but won't need them either.

**First run:** No reactive advantage exists for run 1. The starting loadout is always the base configuration.

### Megacorp Comms — Black Box Acknowledgment

When the reactive loadout is applied:
> *"Black Box telemetry from [PREVIOUS-RIG-NAME] processed. Revised specifications applied to [NEW-RIG-NAME] blueprints. Learn faster."*

---

## Orbital Blueprints

Spent between runs at the **Orbital Workshop** screen (accessible from the Sector Map). Data Cores fund permanent improvements to the Exo-Extract 3D-Printer Blueprint specifications — the template used to manufacture every new rig.

Unlike the reactive Black Box system (which adapts to failure automatically), Blueprint upgrades are manual purchases. They represent long-term investment decisions.

### Blueprint Categories

| Category | Example Upgrades |
|:---|:---|
| **Hull** | +Max HP, start each run with a small HP buffer already repaired |
| **Weapons** | Unlock new weapon schematics as possible Tier 2 shop options |
| **Economy** | +Starting Scrap, +Scrap drop rate multiplier, +wall deposit yield |
| **Systems** | Unlock new Tier 2-purchasable manual systems (Coolant Vent, Drill Angle Nudge, Canister Overload) |
| **Black Box** | Improve reactive loadout strength and accuracy of death-cause detection |
| **Canister Efficiency** | Increase Data Cores earned per successful Canister launch |

---

## The Sector Map

Between runs, the Overseer views the **Orbital Sector Map** — a stylized representation of the current planet from orbit, showing all extraction sectors and their status.

### Layout & Navigation

- Each planet has **5 named sectors**, each representing a distinct geographic region
- **Sector 1** (always the Standard biome) is the only available sector at the start of Planet 1. It is always completed first — it is the tutorial run.
- After completing a sector, adjacent sectors on the map become available for selection
- The player freely chooses which available sector to tackle next
- Harder sectors are further from the starting sector and offer increased Data Core rewards
- **All 5 sectors must be completed** to unlock the next planet

### Sector Node Display

Each sector node on the map shows:
- Sector name (e.g., "Cryo Shelf," "Sulfur Wastes")
- Biome tag and modifier preview
- Data Core reward estimate
- Completion status (not started / completed / in progress)

### First Run Protection

The first run of Planet 1 is always played in the **Standard biome** with no modifiers. No biome system is mentioned or visible until the player lands on the Sector Map screen after completing their first run. This prevents cognitive overload during the learning run.

---

## Biome System

Each sector has a fixed **biome tag** that applies asymmetric modifiers to the entire run. Biomes are fixed to sectors — they do not randomize per run — so players making sector selection choices have reliable information.

### Design Philosophy

Biomes are not balanced debuffs paired with equal buffs. They are **asymmetric tradeoffs** that reward different builds and playstyles. The best biome modifier creates a deal: something is meaningfully harder, and something else is tangibly advantageous in a way that changes how you play — not just a stat offset.

---

### Tartarus-9 Biomes *(Planet 1)*

| Sector | Biome | The Deal |
|:---|:---|:---|
| 1 | **Standard** | No modifiers. Tutorial sector. Learn the core loop. |
| 2 | **Cryo-Shelf** | Projectile speed −15% / Enemy move speed −20%. Wall deposit Scrap yield +30%. *Deal: Your weapons feel sluggish, but harvesting the walls is significantly more profitable — rewarding active use of the Wall-Harvest Laser.* |
| 3 | **Sulfur Wastes** | Enemy HP +20%. All Scrap drops +25%. *Deal: Every fight takes longer, but you accumulate Scrap faster — rewarding aggressive spending over conservative banking.* |
| 4 | **Fungal Network** | Enemies slowly regenerate HP if they reach the rig and survive contact — but Harvesters **never guard** wall deposits. *Deal: Letting enemies reach the rig has a new cost, but wall harvesting becomes completely risk-free.* |
| 5 | **Ion Storm** | Auto-turret fire rate −20%. Targeting Override duration doubled to 10 seconds. *Deal: Passive defense is weakened, but manual commanding is dramatically more powerful — heavily rewards active Targeting Override use.* |

---

## Planet Progression

Completing all 5 sectors of a planet triggers the Exo-Extract orbital ship to **relocate to a new extraction system.** Each subsequent planet has a harder baseline difficulty, new biome conditions, and new enemy variants introduced via a brief corporate briefing transmission.

The campaign scope: **3 planets × 5 sectors = 15 total extractions.**

| # | Planet | Theme | Unlock Condition |
|:---|:---|:---|:---|
| 1 | **Tartarus-9** | Cold volcanic crust, insectoid Swarm | Starting planet |
| 2 | **Gehenna-IV** | Superheated dense atmosphere, fire-adapted Swarm variants | All 5 Tartarus-9 sectors complete |
| 3 | **Dis-Prime** | Crushing pressure, near-darkness, crystalline geology, evolved Swarm | All 5 Gehenna-IV sectors complete |

*Sector maps, biome modifier tables, and enemy variants for Gehenna-IV and Dis-Prime are to be designed during pre-production for Planet 2.*

### Planet Transition Transmission

> *"Tartarus-9 extraction complete. All sectors drained. The Megacorporation thanks the planet for its resources. Relocating to Gehenna-IV. New unit print queued. Prepare for drop."*

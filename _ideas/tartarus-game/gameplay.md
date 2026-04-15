# TARTARUS — Gameplay & Mechanics

## The Extraction Timeline

A run consists of **15 Phases**, each lasting approximately 30 seconds, organized into **6 Geological Zones**. Total run time: 8–10 minutes.

Progress is tracked by **Depth** in meters, advancing **500m per Phase**. The Depth counter is always visible in the HUD and scrolls smoothly between values.

### Geological Zones

| Zone | Name | Depth | Phases | Description |
|:---|:---|:---|:---|:---|
| **1** | The Surface Crust | 0 – 2,000m | 1–4 | Light tremors. Fragile Scouts and early Swarmers investigate the noise. |
| **2** | The Hive Aquifer | 2,000 – 2,500m | 5 | The drill punctures a subterranean water table. **Guaranteed Elite spawn.** |
| **3** | The Obsidian Mantle | 2,500 – 4,500m | 6–9 | Rock density increases. Heavily armored Geode-Beetles resist light attacks. Harvesters begin appearing on wall deposits. |
| **4** | The Magma Vents | 4,500 – 5,000m | 10 | Extreme heat triggers massive territorial defenders. **Guaranteed Mini-Boss.** |
| **5** | The Deep Hive | 5,000 – 7,000m | 11–14 | The drill passes through central nesting grounds. Maximum spawn rates of all enemy types simultaneously. |
| **6** | The Kyloric Core | 7,000m+ | 15 | The motherlode. The hive mind converges completely. **Survive 45 seconds to win the run.** |

---

## Canister Launch Events

Every 3 Phases (end of Phases 3, 6, 9, and 12), the rig pressurizes a batch of processed Kyloric material and fires a **Canister** toward the orbital ship. 

Each launch event:
- Plays a brief launch animation with a streak of light toward the top of the screen
- Fires a **directional exhaust blast** from the rig's launch port, dealing area damage to all enemies in its arc
- Triggers a Megacorp confirmation transmission referencing the rig's designation
- Seals the launch bay immediately — no vulnerability window

The exhaust direction is fixed (upward, toward the orbital ship's position). It provides a reliable area clear on a predictable cadence, rewarding players who anticipate it rather than react to it.

---

## Enemy Roster

### Scout *(Zone 1)*
The Swarm's first responders. Drawn to drill vibrations rather than organized by the hive — these are instinctual investigators. Die in one or two hits from a stock turret. Their danger is always volume, never individual strength.

- **Shape (programmer art):** Small triangle, apex toward rig
- **Behavior:** Direct-path to rig center at high speed
- **Threat:** Numbers. Nothing else.

### Swarmer *(Zone 1–2)*
Standard Swarm infantry. More resilient than Scouts, slightly slower. The baseline enemy against which the starting economy is balanced. Every subsequent enemy is tougher than a Swarmer by design.

- **Shape:** Filled circle
- **Behavior:** Direct-path to rig center
- **Threat:** Moderate HP; the "normal" enemy

### Geode-Beetle *(Zone 3–4)*
Chitinous defenders born in the mineral-rich Obsidian Mantle. Their exoskeletons have crystallized around local rock over their lifetimes, making them near-impervious to light fire. AoE attacks crack the shell effectively; sustained single-target fire also works with patience. Light turrets are largely ineffective.

- **Shape:** Thick-bordered hexagon
- **Behavior:** Slow, direct-path; absorbs hits
- **Threat:** Forces AoE weapons or upgraded single-target; punishes players who haven't diversified their weapon loadout

### Harvester *(Zone 3+)*
Found clinging to Kyloric wall deposits deep in the Mantle and below. Harvesters are feeding — not attacking. **They only detach and engage the rig if the player's Wall-Harvest Laser targets the deposit they occupy.** Undisturbed Harvesters never move.

- **Shape:** Flat elongated oval, pressed against the wall edge; visually pulsing
- **Behavior:** Stationary until disturbed; then direct-path to rig
- **Threat:** Conditional. The player chooses when and whether to provoke them. The deposit they guard yields bonus Scrap if harvested.

### Aquifer Elite *(Zone 2 — One guaranteed spawn)*
A large aquifer organism disturbed by the drill breaching the water table. Faster than a Geode-Beetle; substantially more durable than anything in Zone 1. This is the run's first real skill check and the moment a player's first upgrade purchase is tested.

- **Shape:** Large circle with a visible inner ring (suggests mass and layers)
- **Behavior:** Direct-path, slightly erratic movement (minor course adjustments every 2 seconds)
- **Threat:** First major HP test. Its kill reward is the largest Scrap drop to this point in the run.

### Magma-Worm *(Zone 4 — One guaranteed Mini-Boss)*
A massive deep-crust territorial organism, adapted to extreme heat. Segmented body — each segment has independent HP. Spawns with a retinue of Geode-Beetles. Slow-moving but extremely durable. Sustained AoE fire is most effective.

- **Shape:** Chain of large circles, progressively smaller toward the tail
- **Behavior:** Slow direct movement; segments each have independent HP and must be eliminated
- **Threat:** Forces sustained AoE. The beetle retinue adds concurrent pressure. Killing the full worm awards the run's largest Scrap drop.

### Hive Convergence *(Zone 5–6)*
Not a new enemy type — Zone 5 and 6 spawn all previous enemy types simultaneously at maximum rate. The hive mind's total response to the drill reaching the nesting grounds. No new mechanics; pure escalation.

---

## Manual Interactions

The player's role as **AI Overseer** is active command — not passive observation. Auto-turrets handle baseline damage. The player's manual inputs are meaningful but **never punishing if unused**: a player who never harvests a wall deposit or uses the targeting override will still have a valid run. These are upside interactions, not required mechanics.

This philosophy prevents "wasted presence" — the feeling that a system is failing if you're not engaging it constantly.

---

### Wall-Harvest Laser *(Available from run start)*

Kyloric deposits glow at the **left and right edges of the center canvas** — the exposed tunnel walls scrolling upward as the drill descends. The player can tap or click a visible deposit to fire the rig's Wall-Harvest Laser, channeling for a brief moment before the deposit pays out **bonus Scrap**.

**Risk — Harvesters:** Some deposits are guarded. A Harvester is visually obvious: a pulsing, clinging shape attached to the deposit's face. Targeting a guarded deposit causes the Harvester to detach and beeline for the rig. The player must decide: skip the deposit (lose the resource), or accept the fight (extra Scrap, extra threat).

**Deposit visibility:** Wall deposits are always visible at the canvas edges — no scrolling, panning, or secondary view required. The player never leaves the main game view to interact with them. Deposits appear and disappear naturally as new wall faces are exposed with each phase of drilling.

**Design intent:** Pull-based and breathing-room-driven. Dense wave = ignore the walls and focus on survival. Lull in spawns = scan the edges and harvest aggressively. Experienced players will harvest efficiently; new players won't be punished for ignoring it.

---

### Targeting Override *(Available from run start)*

The player can tap or click any active enemy on the canvas to **mark it as priority target**. All auto-turrets immediately snap their targeting to the marked enemy and maintain focus for approximately **5 seconds**, then return to normal targeting logic.

**Use cases:**
- Mark the Aquifer Elite the instant it enters the screen to burn it down before it closes distance
- Mark a Magma-Worm segment to clear it faster, reducing the surface area the retinue can follow
- Mark a freshly detached Harvester to neutralize the threat before it reaches the rig
- Mark a nearly-dead enemy a turret got distracted from to finish the kill and recover the Scrap drop

**Design intent:** One click. Enormous tactical leverage. If unused, auto-turrets continue operating normally — zero downside to ignoring it. If used well, it decisively changes the outcome of a bad moment.

---

### Unlockable Manual Systems *(Tier 2 shop purchases)*

These systems are purchased through the Tier 2 Rig Overhaul panel and represent earned complexity. They are not available at run start, intentionally reducing the cognitive load on early runs.

| System | Effect | Recharge | Input |
|:---|:---|:---|:---|
| **Coolant Vent** | Spray coolant in a chosen direction, slowing all enemies in a cone by 60% for 3 seconds | 20s | Tap a direction on the canvas |
| **Drill Angle Nudge** | Mid-phase event: the drill hits a geological pocket. Tap the correct direction within 3 seconds to maintain depth progress. Miss: 5-second depth stall. Hit: small Scrap bonus | Event-triggered | Timed directional tap |
| **Canister Overload** | Trigger an emergency mini-exhaust-blast immediately — area damage, no Canister delivered to orbit | 45s | Dedicated button on dashboard |

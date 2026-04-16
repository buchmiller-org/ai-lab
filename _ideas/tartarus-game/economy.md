# TARTARUS — Economy & Shop System

## Currencies

### Scrap *(In-run currency)*
Dropped by enemies on death. Spent exclusively on in-run upgrades via the two-tier shop. **Does not persist between runs.**

Scrap sources:
- Standard enemy kills (primary source — see pacing table)
- Elite and Mini-Boss kill bonuses (large single drops)
- Wall-Harvest Laser deposits (optional bonus; varies by Harvester presence and risk)

### Data Cores *(Meta-currency)*
Recovered from the rig's **Black Box** after any run — win or lose. Amount scales with run performance: depth reached, Canisters launched, and enemies killed all contribute. Spent between runs at the Orbital Workshop on permanent Blueprint upgrades.

See [Meta-Progression](./meta-progression.md) for Data Core usage.

---

## The Two-Tier Shop

The shop operates **live during active gameplay** — the game never pauses for purchases. All decisions are made under pressure and in real time.

The two tiers serve different economic rhythms: Tier 1 keeps the player in constant micro-dialogue with their Scrap balance; Tier 2 delivers the "panic buy" dramatic moments the pacing table is designed around.

---

### Tier 1 — Weapon Slot Micro-Upgrades

Each of the **4 weapon slots** on the bottom dashboard can be **tapped or clicked directly** to purchase a small upgrade to that weapon — no menu, no confirmation screen.

| Property | Value |
|:---|:---|
| **Cost per upgrade** | 50–100 Scrap (scales slightly with Mk level) |
| **Upgrade progression** | Mk.I → Mk.II → *(fork)* → Mk.III → Mk.IV (hard cap) |
| **Visual feedback** | Mk level indicator on slot ticks up; brief flash animation |

#### The Mk.II Fork

At Mk.II, each weapon slot presents a **one-time, permanent path choice** before the upgrade is applied. The slot highlights with a dual-option prompt: 

- **Path A — Overcharge:** Increase damage per shot. More effective against high-HP armored targets (Geode-Beetles, Elites, Mini-Boss segments).
- **Path B — Overdrive:** Increase fire rate. More effective against swarm volume (Scouts, Swarmers, Hive Convergence).

The choice cannot be reversed. Mk.III and Mk.IV upgrades deepen the chosen path rather than offering a new fork.

**The Mark Cap matters:** Each weapon can only be upgraded 4 times before it stops accepting investment. This prevents hyper-focusing one slot. Diversifying all 4 slots remains the optimal long-term strategy — but the fork means each slot also serves a distinct role.

**Design intent:** The fork is a forecasting decision. A player who looks at what zone is coming next and what enemies they've been struggling with will choose differently than one who picks arbitrarily. Over a full run, the combination of 4 slot paths shapes a personal weapon profile. Players who go all Path A will have a very different Zone 5 experience than those who mixed paths. This is the primary source of build identity in a single run.

---

### Tier 2 — Rig Overhaul Panel

Tapping the **central Rig** on the canvas (or a dedicated button on the dashboard) opens the Rig Overhaul panel. The panel slides up over the lower half of the screen; the canvas remains visible and live above it.

| Property | Value |
|:---|:---|
| **Cost per card** | 350–700 Scrap |
| **Cards shown** | 2–3 options per opening |
| **Card pool** | New weapon schematics, hull upgrades, passive economy upgrades, manual system unlocks |
| **Offer refresh** | Offers refresh on each strata transition (not on repeated openings mid-phase) |
| **After purchase** | Panel dismisses automatically; game continues |

**Design intent:** The Tier 2 panel is the run's dramatic anchor. The pacing table is engineered so that panic moments — when the player *must* buy something significant or lose the run — align with having just enough Scrap saved to afford a Tier 2 upgrade. Opening the panel during a wave is high-risk, high-reward.

---

## Mathematical Pacing

**Enemy HP formula:** `HP = Base HP × (1.15 ^ Phase)`

**Player power:** Flat between purchases; stepped up sharply at each Tier 1 and Tier 2 buy moment.

The core tension is two intersecting curves: exponential enemy HP growth vs. stepped player power spikes. The player is always falling behind until they buy something.

*Assumptions: Base Rig DPS = 10. Standard enemy Scrap rates shown — wall-harvest deposits provide optional bonus Scrap not reflected here. Boss drops are guaranteed on Elite and Mini-Boss kills.*

| Phase | Zone / Event | Depth | Enemy HP | Scrap Earned | Shop Activity | Tension |
|:---|:---|:---|:---|:---|:---|:---|
| **1** | Crust — Scouts | 0m | 10 HP | 40 | — | **Overpowered:** The rig one-shots everything. |
| **2** | Crust — Swarm | 500m | 12 HP | 50 | — | **Comfortable:** 2 shots to kill. Still no threat. |
| **3** | Crust — Swarm | 1,000m | 13 HP | 65 | — | **Slipping:** Enemies reach halfway to the rig. |
| **4** | Crust — Swarm | 1,500m | 15 HP | 80 | *Tier 1 buy: −80 Scrap* | **Struggling → First micro-buy.** DPS ticks up. |
| **5** | **Aquifer — Elite** | 2,000m | 17 HP | 120 *(Elite Drop)* | — | **Comfortable:** Upgrade + Elite drop restores confidence. |
| **6** | Mantle — Armor | 2,500m | 20 HP | 85 | *Tier 1 buy: −80 Scrap* | **Comfortable → Second micro-buy.** Sitting on good Scrap. |
| **7** | Mantle — Armor | 3,000m | 23 HP | 95 | — | **Slipping:** Beetles are sponging shots. |
| **8** | Mantle — Armor | 3,500m | 26 HP | 105 | — | **Struggling:** The rig is taking hits now. |
| **9** | Mantle — Armor | 4,000m | 30 HP | 115 | *Tier 2 buy: −450 Scrap* | **Panic → Big buy. AoE weapon acquired.** |
| **10** | **Magma — Mini-Boss** | 4,500m | 35 HP | 200 *(Boss Drop)* | — | **Overpowered:** AoE melts the worm and its retinue. |
| **11** | Deep Hive | 5,000m | 40 HP | 125 | *Tier 1 ×2: −160 Scrap* | **Comfortable:** Spending the boss windfall on micro-upgrades. |
| **12** | Deep Hive | 5,500m | 46 HP | 135 | — | **Slipping:** Spawn volume is diluting AoE effectiveness. |
| **13** | Deep Hive | 6,000m | 53 HP | 145 | — | **Struggling:** Rig HP dropping. Scrap banking urgently. |
| **14** | Deep Hive | 6,500m | 61 HP | 155 | *Tier 2 buy: −500 Scrap* | **Panic → Final desperate buy. Ultimate system acquired.** |
| **15** | **Core — Extraction** | 7,000m+ | 70 HP | N/A | — | **Climax:** 45 seconds. Survive with whatever HP remains. |

---

## Scrap Flow Notes

- Phases 1–5: Slow Scrap accumulation, small buys possible, player is learning the economy
- Phase 5 Elite drop is the run's first significant windfall — tests whether the player saves or spends
- Phases 6–9: Deliberate Scrap banking leads to the Phase 9 panic buy; premature spending leads to crisis
- Phase 10 Boss drop is the second windfall — provides breathing room for the Deep Hive gauntlet
- Phases 11–14: A player who reaches Phase 14 with ~500 Scrap and buys the Ultimate has completed the core economic arc
- Wall-harvest Scrap (not in table) adds a skill-expression layer on top of the base economy

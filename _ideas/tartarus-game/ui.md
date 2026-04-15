# TARTARUS — UI Blueprint

## Layout Philosophy

The game uses a **portrait/square layout** optimized for both desktop mouse input and mobile touch. All critical controls live in the bottom third of the screen (thumb-reachable on mobile). The center canvas is the primary visual focus — nothing should pull the player's eyes away from it for more than a glance.

---

## Screen Regions: Main Game

```
┌──────────────────────────────────┐
│  A. TOP BAR — TELEMETRY          │
├──────────────────────────────────┤
│                                  │
│                                  │
│   B. CENTER CANVAS               │
│      (Action Zone)               │
│                                  │
│                                  │
├──────────────────────────────────┤
│  C. BOTTOM DASHBOARD             │
│     [ Slot 1 ][ Slot 2 ]         │
│     [ Slot 3 ][ Slot 4 ]         │
│        [ ULTIMATE ]              │
└──────────────────────────────────┘
```

---

### A. Top Bar — Telemetry

Persistent HUD. Three columns, always visible.

| Left | Center | Right |
|:---|:---|:---|
| `DEPTH: 3,000m` / `ZONE 3` | Rig Health Bar | `⚙ 340 Scrap` |

- **Depth counter:** Scrolls smoothly between values. The Zone label updates on zone transition with a brief flash.
- **Health bar:** Chunky horizontal bar. Color transitions: green → yellow (below 50%) → red (below 25%). A Megacorp comm line is triggered when it crosses each threshold.
- **Scrap counter:** Ticks up on each enemy kill. Brief highlight animation when a large drop occurs (Elite/Boss).

---

### B. Center Canvas — The Action Zone

The primary game area. Full-width between the top bar and bottom dashboard.

**Center:** The fixed Hephaestus-class Rig. It does not move.

**Background:** Parallax geological texture layers scrolling upward, simulating downward drilling. Multiple layers scroll at different rates to create depth. Scroll speed increases subtly as the player descends through deeper zones.

**Spawn ring:** Enemies spawn from a 360° ring just beyond the canvas edge. They can approach from any direction.

**Wall edges:** The left and right canvas edges display exposed tunnel walls. **Kyloric deposits glow cyan at these edges** — always visible, always at the edge, never requiring a pan or scroll to see. Deposits appear naturally as new wall faces are exposed by the drilling. Harvesters visually cling to guarded deposits (pulsing, clearly distinguishable from the deposit itself).

**Enemy interaction:** Tapping or clicking any visible enemy applies the Targeting Override (marks it for priority fire). This is a core interaction — the canvas is not just a viewing window but an input surface.

---

### C. Bottom Dashboard — Controls

A fixed panel below the canvas. Three rows from top to bottom:

**Row 1 — Weapon Slots:** Four equal-width slots arranged horizontally.

Each slot displays:
- Weapon name / icon
- Mark level indicator (e.g., `Mk.II` or four pip icons, 2 filled)
- Upgrade cost label (grayed if insufficient Scrap; hidden if at Mk.IV cap)
- **Tap directly to purchase Tier 1 upgrade** — no menu, instant transaction

**Row 2 — Rig Overhaul Button:** A small text button below the weapon slots (`[ RIG OVERHAUL ]`). Alternatively, tapping the Rig on the canvas also opens this panel. Opens the Tier 2 upgrade panel.

**Row 3 — Ultimate Button:** Large circular button, centered. Shows the name of the currently installed active system (Coolant Vent, Canister Overload, etc.). A radial battery-fill indicator shows recharge progress. **Grayed and labeled `[ LOCKED ]` until the first Tier 2 active system is purchased.**

---

### D. Tier 2 Rig Overhaul Panel

Slides up over the lower half of the screen (the canvas remains live and visible above). The player can still see the action zone during a purchase decision.

- Shows **2–3 upgrade cards** stacked vertically
- Each card: upgrade name, effect description, Scrap cost
- Tap a card to purchase (Scrap deducted immediately, upgrade applied)
- Panel dismisses automatically after a purchase
- Tap outside the panel to dismiss without purchasing
- Offer pool refreshes on each strata transition, not on each panel open

---

## Additional Screens

### Run Start Screen

Displayed immediately before rig deployment. Full-screen overlay.

- Planet and sector name at top (e.g., `TARTARUS-9 / CRYO-SHELF`)
- Biome modifier listed in corporate-style spec text (e.g., `MODIFIER: ION STORM ACTIVE — REDUCED TURRET CYCLE RATE, EXTENDED TARGETING LOCK`)
- Large centered unit designation: `"Designating unit: EMBER-JAW"` — dramatic, bold typography
- If a reactive Black Box loadout is active: `"Loaded with anti-armor schematic based on VOID-FANG telemetry"`
- Tap anywhere to drop

---

### Run End Screen

Two states: **Extraction Complete** and **Unit Lost**

**Extraction Complete:**
- Megacorp confirmation transmission (full text, not scroll)
- Data Cores earned this run (animated tally)
- Key stats: Depth reached, Canisters launched, Enemies eliminated, Scrap spent
- Buttons: `[ RETURN TO SECTOR MAP ]` / `[ ORBITAL WORKSHOP ]`

**Unit Lost:**
- Megacorp loss acknowledgment transmission
- Black Box upload animation (progress bar with corporate copy: *"Compressing telemetry..."*)
- Death cause summary (`"Unit lost to: GEODE-BEETLE SWARM at depth 3,500m"`)
- Reactive loadout preview: `"Next unit will be equipped with AoE Splash Cannon based on this telemetry"`
- Data Cores earned (partial credit for depth and Canisters launched)
- Buttons: `[ RETURN TO SECTOR MAP ]` / `[ DEPLOY NEW UNIT ]` (quick restart, same sector)

---

### Sector Map Screen

Displayed between runs. The orbital view of the current planet.

- Stylized planet below, dark space above
- 5 sector nodes on the planet surface, connected by path lines
- **Completed sectors:** Lit, with a checkmark and sector name
- **Available sectors:** Pulsing highlight; tap to see biome details and Data Core reward estimate
- **Locked sectors:** Grayed; adjacent sectors must be completed first
- Top-right corner: Data Core balance + `[ ORBITAL WORKSHOP ]` button
- Corporate ambient design: the UI looks like an actual megacorp operations dashboard

---

### Orbital Workshop Screen

Blueprint upgrade interface. Accessed from the Sector Map.

- Shows Data Core balance prominently
- Upgrades organized in tabs by category (Hull / Weapons / Economy / Systems / Black Box)
- Each upgrade card: name, effect, cost, purchased indicator
- Clean, corporate aesthetic — this is official Exo-Extract procurement software

---

## Programmer Art Spec *(Iteration 1)*

All visuals use Canvas 2D primitives only. No image files in the first build iteration. Visual clarity takes priority over aesthetics at this stage.

| Element | Shape | Color |
|:---|:---|:---|
| Rig body | Rectangle | `#e0e0e0` |
| Turret barrels | Lines extending from Rig | `#ffffff` |
| Scouts | Small triangle (apex toward rig) | `#ff4444` |
| Swarmers | Filled circle | `#ff6633` |
| Geode-Beetles | Thick-bordered hexagon | `#cc44ff` |
| Harvesters | Flat oval, at wall edge | `#44ffcc` (distinct from deposits) |
| Aquifer Elite | Large circle + inner ring | `#ff2222` |
| Magma-Worm segments | Chain of large circles | `#ff8c00` |
| Turret projectiles | Short yellow lines | `#ffee00` |
| Kyloric wall deposits | Glowing cyan rectangles at canvas edge | `#00ffcc` |
| Background base | Dark void | `#0f0f11` |
| Rock texture layers | Upward-scrolling stripe layers | Alternating `#13131a` / `#0f0f11` |
| Targeting Override marker | Pulsing red ring around marked enemy | `#ff0000` at 60% opacity |
| Wall-Harvest Laser beam | Thin line from Rig to deposit | `#00ffcc` |

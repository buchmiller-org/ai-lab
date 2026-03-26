# Optics — Game Design Document (v1)

**Title:** *Optics*
**Genre:** Corporate satire / Oregon Trail-style resource management RPG
**Tagline:** *The art of looking busy.*

---

## 1. Premise

You are a mid-level employee at a nameless corporation. Your goal isn't to do great work — it's to *survive*. Navigate the politics, perform productivity for the right audiences, and avoid burning out before you can find a way out.

The game is a dark satire about the gap between **visible productivity** and **actual productivity** — and how corporate life rewards the performance of work as much as (or more than) the work itself.

---

## 2. The Three Meters

The core resource system. All three are always visible and always in tension.

| Meter | Represents | Depleted by | Crisis at 0 |
|---|---|---|---|
| **Wellbeing** | Personal energy, mental health | Overwork, unpaid overtime, covering for others, staying late | Burnout — forced leave / quit |
| **Output** | Actual work completed | Delegation, meetings that produce nothing, being blocked | PIP → fired |
| **Visibility** | What leadership thinks of you | WFH, saying no, working quietly/invisibly, layoffs | Overlooked → restructured out |

**The cruel joke:** Visibility is boosted by things that hurt Output and Wellbeing. Wellbeing is protected by things that hurt Visibility. Output is maximized by ignoring the other two.

---

## 3. Time Structure — The Quarter

Time is divided into **Quarters (Q1–Q4)**, each ending in a **Performance Review**.

Within a quarter, time advances in **work days** — roughly 10–15 decision moments per quarter before the review. Each day might present:
- A task to handle, delegate, or ignore
- A social event (optional trap)
- A random event (unfair, systemic, or funny)
- A quiet moment to choose how to spend your energy

At the Performance Review, your meter states translate into a **rating**:
- 🌟 Exceeds Expectations — bonus to Visibility, slight Wellbeing cost
- ✓ Meets Expectations — stable
- ⚠️ Needs Improvement — Output debuff next quarter
- 🚨 PIP — crisis; must max Output next quarter or get fired

**The Promotion Trap:** Getting promoted resets difficulty upward — higher Visibility demands, more complex politics, same Wellbeing ceiling. The tower gets taller.

---

## 4. Gameplay Mode A — Decision Engine (Oregon Trail)

Each "day" presents a choice moment — visual, illustrated, not text-only.

### Task Events
> *"The Brannigan report is due Friday. It's yours to handle."*
- **Do it yourself** → +Output, -Wellbeing
- **Delegate to Marcus** → neutral Output risk, +social debt
- **Request an extension** → -Visibility, Wellbeing preserved
- **Quietly ignore it** → Wellbeing preserved, Output time-bomb (escalates later)

### Social Events
> *"Team happy hour tonight. It's 'optional.'"*
- **Attend** → +Visibility, -Wellbeing, -Output time
- **Decline** → Wellbeing/Output time saved, soft -Visibility
- **Attend but leave early** → small +Visibility, neutral risk

### Random Events
Systemic, unfair, sometimes darkly funny:
> *"Your quiet, competent colleague got promoted over you. Their manager plays golf with yours."*
> *"Mandatory Fun Friday: 2-hour pizza party. The client deadline is also Friday."*
> *"Your WFH setup died during a video call. CTO was on it."*
> *"New VP wants 'a fresh look' at your team's project. Rewrite starts Monday."*

### Quiet Hours
Periodically: *"You're the only one in early. No meetings for 90 minutes."*
Choose how to spend the time:
- **Deep work** → big Output boost, -Wellbeing
- **Read / decompress** → +Wellbeing
- **Strategic visibility move** (email the exec distribution list) → +Visibility

---

## 5. Gameplay Mode B — Top-Down Office (Corporate Kabuki)

A real-time, top-down view of the office floor where movement and positioning *are* the mechanics.

### Core Idea: Line of Sight
Bosses and senior stakeholders have visible **LOS cones** that sweep the floor. While inside a cone, the player must be performing visible productivity: standing at their desk, walking purposefully, hovering near a whiteboard. While outside all cones, the player can move efficiently and handle real tasks without penalty.

### The Floor
- **Desks** — where Output tasks appear and can be completed
- **Meeting Rooms** — entering boosts Visibility but drains Wellbeing and locks you in for a duration
- **Break Areas** — recover Wellbeing, but only safe when no LOS present
- **Exec Corridor** — high-risk, high-reward Visibility zone; being seen here with the right prop (+notebook) spikes Visibility

### Task Pickups
Tasks materialize at various stations (printer, inbox tray, colleague's desk). Picking them up and bringing them to your desk completes them for +Output. Leaving them too long triggers an escalation event.

### Performance Under Observation
When in LOS, the player's movement speed is penalized (you can't sprint past the boss). A **Performance Meter** fills while observed — if you look genuinely busy (interacting with a task/desk), it contributes to Visibility. If you're caught standing idle or heading to the break room, it ticks down.

### Visibility Directionality
Not all watchers are equal:
- **Direct Manager** — most common LOS watcher; affects quarterly rating
- **Skip-Level / Exec** — rare patrols; massive Visibility spike if impressed
- **Gossipy Peer** — neutral to Visibility, but reports idle behavior to manager

### The Stealth Loop
The rhythm: move efficiently when unobserved → snap into "looking busy" posture when LOS appears → grab tasks and route between stations → occasionally sacrifice efficient routing to be seen near the right person at the right time.

---

## 6. Win Conditions

| Path | How | Trade-off |
|---|---|---|
| **The Exit** | Build Visibility + Output enough to get an outside offer | Takes 2–3 in-game years; costs Wellbeing |
| **The Coaster** | Keep all three meters in the safe band indefinitely | No advancement; risk of restructure |
| **The Climber** | Chase promotions each quarter | Wellbeing eventually crashes |
| **Burnout** | Any meter hits zero | Run ends; debrief screen |

---

## 7. Visual Identity

- **Art style:** Stylized flat office vignettes. Think illustrated cards, not pixel art. Warm-cool color contrast between "real self" and "work performance."
- **Non-text-critical:** Every event has a visual scene, character expression, and iconography for what's at stake.
- **Three meter bars** always visible — color-coded, with subtle animations when stressed (Wellbeing bar starts to pulse and desaturate at low levels).
- **The office** is a persistent background that evolves: more clutter as Output drops, brighter/emptier as Visibility rises, darker/greyer as Wellbeing falls.

---

## 8. Prototype Plan

### Prototype A — Decision Engine *(build first)*
*Does the trilemma feel meaningful?*

- **Scope:** One full quarter (10–15 decision moments) + Performance Review screen
- **Visuals:** Placeholder shapes and colored bars — no illustrations
- **Events:** No flavor text. Each choice displays its stat effects explicitly (e.g., `+Output  −Wellbeing`) so balance can be tuned before writing
- **Goal:** Validate that the three-meter tradeoffs feel interesting to make

### Prototype B — Top-Down Office *(build second)*
*Does the Corporate Kabuki movement feel fun?*

- **Scope:** One office floor with 2–3 boss/watcher AIs and a handful of routable tasks
- **Visuals:** Placeholder sprites and LOS cone geometry
- **Goal:** Validate that the stealth-routing loop creates tension and interesting positioning decisions

### Hybrid *(after evaluation)*
Combine what works. Likely: the quarterly Decision Engine as the meta-layer, with certain events triggering a real-time Top-Down mini-session (e.g., a task event drops you into the office to physically retrieve a report before the boss spots you).

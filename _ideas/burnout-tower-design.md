# Burnout Tower — Game Design Document (v3)

**Working Title:** *Burnout Tower*
**Genre:** Roguelite Action-Survival

---

## 1. Premise & Fantasy

You are an over-qualified, under-appreciated office worker. Every floor is another soul-crushing workday. Run up the corporate tower one shift at a time, managing your Stress, neutralizing demands, and dodging the wrath of middle management before you burn out completely. 

The fantasy is the **power trip of being hyper-competent in a chaotic system** — not combat mastery, but *task mastery*. The feeling of clearing a backlog while chaos explodes around you.

---

## 2. Core Gameplay Loop

The game is a **top-down action-survival** where you move your character in real time through an office floor while enemies approach you automatically. The moment-to-moment loop is:

**Move → Position → Output → Collect → Upgrade**

### The Player Character
- Controlled with WASD / arrow keys or a gamepad.
- Has **one active ability** on a cooldown (see below).
- Has **one passive auto-output** that fires automatically. This starts as a slow, short-range "Filing" burst and is expanded by upgrades.

### The "Work" (Enemies)
Work comes in several archetypes, each with distinct behavior:

| Type | Behavior | Visual |
|---|---|---|
| **Distraction** (Chatty Coworker) | Slow-moving, high Stress on contact | Person sprite power-walking with a coffee cup |
| **Deadline** (Floating Email) | Fast, homing projectile | Red envelope icon with an exclamation mark |
| **Blocker** (Meeting Invite) | Stationary. Blocks a path until cleared | Calendar popup anchored to a doorway |
| **Stampede** (End-of-Quarter) | Emerges in massive waves, briefly overwhelming | Dozens of small paper icon sprites |

When their "Needs Bar" is depleted, **enemies are not killed**. A green checkmark springs over their head, they look satisfied, and they power-walk off-screen. Nothing violent. It's all satisfying resolution sounds and animations.

### Stress (Health)
- Your **Stress Bar** fills when enemies reach you. If it hits 100%, you Burn Out (run ends).
- Stress can be partially relieved by collecting **"Mints"** (dropped rarely) or by standing near a **Water Cooler** on the map for two seconds.
- Stress is your primary resource to manage — not health points, lives, or shields.

---

## 3. The Active Ability — "Coffee Jitters"

This is the single most important skill-expression mechanic. The player has a dash usable on a **4-second cooldown** that lets them phase through enemies and desks without taking Stress.

The skill ceiling comes from using Coffee Jitters to:
- Escape a chokepoint before getting surrounded
- Rush to an Urgent Task zone while cutting through a crowd
- "Dodge" a fast-moving Deadline projectile

Good players use it for escape. Great players use it aggressively to cut across the map.

---

## 4. The Floor Structure

### Hand-Crafted Floors
Floors are **hand-designed layouts**, not procedurally generated. Starting with 10–12 distinct office environments (Open-Plan, Cubicle Farm, Finance Floor, Executive Suite, Server Room, etc.), each with:
- Unique geometry and chokepoints
- Unique environmental obstacles (e.g., the Server Room is dark with server racks blocking sightlines)
- A distinct enemy composition emphasis (Finance Floor = lots of Deadlines, Open-Plan = lots of Distractions)

Procedural generation can be added later. For early development, hand-crafted floors guarantee fair, tested player experiences.

### The Shift Timer
Each floor runs for **3 real-time minutes** (one "shift"). Survive to 5:00 PM, and the elevator opens.

### Urgent Tasks (Anti-Turtling)
Every **50–70 seconds**, the boss's voice barks from off-screen and a zone is highlighted on the map (e.g., the Printer, the Boss's Desk, the Break Room). The player has **25 seconds** to reach and stand in the zone for 2 seconds.

**Fairness Contract (Non-Negotiable Rules):**
1. The zone is always reachable from any point on the map within 25 seconds at base movement speed.
2. A 3-second **"wind-up" animation** plays before the zone appears — the boss starts talking — giving the player time to begin repositioning.
3. The required time decreases slightly on higher floors, never spikes randomly.
4. Failing an Urgent Task inflicts **a flat 20% Stress penalty**, clearly displayed as "TASK FAILED" — never feels like a mystery damage source.

---

## 5. Between-Floor Events (The Elevator Ride)

After clearing a floor, you ride the elevator up. This is not purely passive — it's a short **decision menu**:

1. **Performance Review (Upgrade Pick):** Choose 1 of 3 upgrade options. Always presented here, regardless of whether you leveled up during the shift.
2. **HR Break Room:** Optionally spend a small amount of "Overtime" (meta-currency earned in-run) to reduce Stress. Forces a tradeoff: heal now, or save currency for the shop?
3. **Every 3rd Floor — Department Review:** A larger, rarer upgrade choice with higher-synergy options (more on this in the upgrades doc).

---

## 6. Visual Style

- **Perspective:** Top-down, slight isometric lean for depth.
- **Art Style:** Clean vector-pixel hybrid — crisp, readable sprites. Inspired by the aesthetic of old-school Rolodex graphics and 90s office supply catalogues.
- **Color Palette:** The *office world* itself is deliberately sterile — fluorescent white, beige, slate gray. Your character and their "productivity" outputs (attacks) are the only sources of vivid color (cyan, magenta). EXP gems ("Praise Tokens") glow golden.
- **Stress Escalation:** As Stress climbs:
  - 0–50%: Normal
  - 50–75%: Screen edges get a faint red vignette. Music tempo increases.
  - 75–99%: Screen starts to visually "breathe" (subtle pulse). Music warps and pitches up. Mouse cursor on UI shows a trembling hand icon.
  - 100%: Burnout. Screen goes white, crossfades to a "You've Been Let Go" memo screen.

---

## 7. Endgame — The CEO Floor

Upon clearing the final floor, you reach the **Penthouse**.

The CEO fight is a boss encounter with unique mechanics:
- The CEO doesn't approach you. They sit in the center of the room.
- They periodically spawn "Layoff Notices" (fast, wall-bouncing projectiles) and "Performance Improvement Plans" (Blockers that anchor to key map positions and must be cleared to reach new zones).
- An Urgent Task fires every **15 seconds** instead of 50, keeping the player in constant motion.
- Clearing all Urgent Tasks and surviving long enough depletes the CEO's **"Board Confidence"** bar.

**The Twist — Instant Promotion:**
When the CEO's confidence collapses, they resign. A cutscene: you are handed the corner office key. The company stock ticker soars. Then... a news alert banner crawls across the bottom of the screen:

> *"BREAKING: [Your Company] acquired by MegaCorp Holdings. All staff reassigned effective immediately."*

You are back in the lobby. Intern badge. The tower is now taller.

---

## 8. Meta-Progression ("Severance Pay")

At the end of every run (win or lose), you earn **Severance Pay** based on how many floors you cleared and Urgent Tasks you completed. This is spent in the **"Perks & Benefits" office** between runs on permanent upgrades — a small catalog that grows over time. Examples of categories:

- **Ergonomics** (movement, Stress capacity)
- **Networking** (better starting loadouts, synergies)
- **Union Rights** (protection against certain enemy types)

The meta-progression is deliberately shallow at first and deepens over multiple completed runs. Reaching the CEO unlock new upgrade tiers unlocked in the Perks office.

---

## 9. Prototype Priority Order

To validate the fun before building content:

1. **Core movement** through a single hand-crafted floor. Does it feel snappy?
2. **One enemy type** (Distraction) approaching the player and filling Stress on contact.
3. **Auto-productivity** firing and resolving the enemy with a satisfying checkmark.
4. **One Urgent Task** firing with a wind-up, zone highlight, and a Stress penalty for failure.
5. **One upgrade** from a pool of three between runs.

If steps 1–4 feel tense and fun in a single room with placeholder art, the game is worth building.

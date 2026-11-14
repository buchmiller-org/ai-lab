# The Arcade — Quality Roadmap & Gravity Wars Benchmark

**Status:** Living Roadmap (`arcade/`)  
**Reference Benchmark:** [Gravity Wars](../arcade/gravity-wars/index.html) (`arcade/gravity-wars/`)

This document captures what makes `arcade/gravity-wars/` the quality benchmark for The Arcade and lays out concrete, multi-session upgrade plans to bring the other 14 arcade games up to a comparable level of polish, reliability, game feel, and player retention.

> **Repository Guardrails (Apply to Every Upgrade Session):**
> - Pure static HTML/CSS/JS only (no `npm`/`pnpm`, no `package.json`, no build step).
> - Relative paths only (`./`, `../`); never use domain-root `/...` paths.
> - Load Google Fonts (`Orbitron`, `Inter`) via `<link>` + `preconnect` in HTML, never CSS `@import`.
> - Link suite styles via `../styles.css`; never import assets across sibling games or suites.
> - Namespace all `localStorage` keys as `arcade.<game-name>.<key>` inside `try...catch` blocks.
> - Run `python3 scripts/check.py` (or `python scripts/check.py`) at the end of every session.

---

## 1. The Gravity Wars Benchmark (8 Quality Pillars)

`arcade/gravity-wars/` achieves console/indie arcade feel inside a zero-dependency static folder (~3.4k lines across clean, single-purpose files) built iteratively across 4 focused sessions. Its quality rests on eight transferable pillars:

1. **Modular Architecture & Deterministic Simulation (`window.<NS>`)**
   - Splits responsibilities across small, readable IIFE modules attached to a shared namespace (`window.GW` across `entities.js`, `physics.js`, `weapons.js`, `challenges.js`, `ai.js`, `audio.js`, `renderer.js`, and `game.js`).
   - Decouples simulation from display refresh rate using a fixed timestep (`FRAME_DT = 1 / 60`), `SUBSTEPS = 8` physics sub-stepping, a fixed logical arena (`WORLD = { width: 800, height: 600 }`), and a seeded PRNG (`mulberry32`) for reproducible layouts.

2. **Structured Multi-Mode Loop & Onboarding (`mode-bar`)**
   - Provides three distinct ways to play from the title screen and switchable in-game via a persistent `mode-bar`:
     - **Vs AI:** Three named tiers (`novice`, `tactical`, `ace`) with minimum think pacing (`MIN_THINK_TIME = 0.8`) and time-sliced rollout search (`MAX_PROJECTIONS = 40`, `PROJECTIONS_PER_FRAME = 2`, `FRAME_BUDGET_MS = 4`) so the UI never freezes.
     - **2P Local:** Seamless pass-and-play / split-input competition.
     - **Solo Challenges:** 6 curated puzzle/skill levels (`First Light`, `Event Horizon`, `Shield Arc`, `Slalom`, `The Corridor`, `Singularity Gauntlet`) with par shot targets and 1–3 star ratings.

3. **Zero-Dependency Procedural Web Audio (`audio.js`)**
   - Synthesizes all SFX and ambient telemetry in real time via Web Audio API (`AudioContext` + cached noise buffer + filtered oscillators): launch cues per weapon, ambient propulsion/gravity proximity hums, explosion impacts, turn chimes, and synth victory/defeat fanfares.
   - Safe against autoplay restrictions (unlocks cleanly on first user gesture) and exposes a persistent header Mute toggle.
   - **Audit Finding:** Across all 15 games in `arcade/`, `gravity-wars` is currently the **only** game with Web Audio (`audio.js` / mute toggle). The other 14 games are completely silent—even where card copy advertises audio.

4. **HiDPI Canvas Visual Craft & Game Feel (`renderer.js`)**
   - Renders into DPI-scaled canvases mapped cleanly to logical `WORLD` coordinates so lines, typography, and bloom remain sharp on Retina/4K screens and responsive on mobile viewports.
   - Adds layered visual juice: additive motion ribbons, expanding shockwaves, directional debris bursts, floating contextual text, and damped trauma screen shake.

5. **Multi-Modal Input & Accessibility**
   - Combines direct canvas pointer/touch aiming (drag-and-pull / tap), precision UI controls (angle/power sliders and weapon selectors), and full keyboard navigation/shortcuts with visible `:focus-visible` states.

6. **Guarded Persistence (`Store`)**
   - Wraps `localStorage` reads/writes in `try...catch` JSON helpers using strict namespacing: `arcade.gravity-wars.challenges`, `arcade.gravity-wars.ai-record`, and `arcade.gravity-wars.muted`.

7. **Custom Landing Card Artwork (`arcade/index.html`)**
   - Uses a dedicated inline `<svg class="gw-thumb-svg" viewBox="0 0 240 160">` scene in `arcade/index.html` with glowing orbital wells and trajectories instead of flat CSS divs or raw emoji placeholders.

8. **Disciplined Multi-Session Build Cadence**
   - Built sequentially in 4 clean passes: (1) deterministic physics & core game loop, (2) AI, challenges & arsenal variety, (3) HiDPI VFX & procedural audio, (4) UI polish, accessibility & SVG landing artwork.

---

## 2. Arcade Portfolio Triage Matrix & Priority Tiers

Every game was audited across code structure, timestep determinism, bugs/broken promises, AI/modes, audio/VFX, input ergonomics, and `localStorage` hygiene.

### Portfolio Overview

| Priority | Game | Current Strengths | Critical Bugs & Quality Gaps | Target Sessions |
| --- | --- | --- | --- | --- |
| **Tier 1** | [`warp-chess`](../arcade/warp-chess/index.html) | Uses `chess.js` CDN for core legality; distinct 2-portal concept | Carries `⚠️ EARLY ACCESS` banner; fragile `600ms` `setTimeout` `remove()`/`put()` portal hack corrupts state & skips click-locks; unused `#captured-pieces`; no AI; no audio; no persistence | 3–4 |
| **Tier 1** | [`quantum-checkers`](../arcade/quantum-checkers/index.html) | Clean board UI; limited `teleports` budget (`2` each) | Card promises *"entangled pieces"*, but zero entanglement exists; `handleCellClick` allows selecting another piece mid-multi-jump (breaks mandatory captures); inline `onclick`; no AI; no audio; no persistence | 3 |
| **Tier 1** | [`cyber-pong`](../arcade/cyber-pong/index.html) | Plays cleanly for 1P/2P with basic ball trail | Meta description promises *"explosive power-ups"*, none exist; keyboard-only (unplayable on touch/mobile); unscaled frame-rate speed (`INITIAL_BALL_SPEED = 2.8` per rAF); `image-rendering: pixelated`; no `dt`; no audio; no persistence | 2–3 |
| **Tier 1** | [`grid-lock`](../arcade/grid-lock/index.html) | Clean grid routing mechanic (`levels.js`) & node logic | **Crash bug:** `loadLevel` calls undefined `showOverlay(overlayGameComplete)` after Level 3 (`ReferenceError`); only 3 levels exist; no undo, no par/stars, no keyboard controls, no audio | 3 |
| **Tier 2** | [`bit-breaker`](../arcade/bit-breaker/index.html) | Has `particles.js` debris & smooth paddle concept | Lacks `.bg-grid`/`.orb` wrapper & `user-scalable=no`; zero touch input; `update(dt)` ignores `dt`; edge paddle bounce unnormalized (velocity spike); only 1-hit bricks & 2 power-ups; unguarded `localStorage`; no audio | 2–3 |
| **Tier 2** | [`neon-snake`](../arcade/neon-snake/index.html) | Responsive mobile D-pad + swipe + swipe-safe layout | Card promises *"pulsing beats"*, completely silent; single `nextDir` drops rapid 2-key turns inside a `140ms` tick; single food/mode; discrete non-interpolated movement | 2 |
| **Tier 2** | [`gravity-drop`](../arcade/gravity-drop/index.html) | High-speed descent loop + trail + mobile controls | Card promises *"shifting gravity fields"*, but `barriers` are only static horizontal bars; fixed `400x600` non-HiDPI canvas; frame-rate dependent (`fallSpeed` unscaled by `dt`); no audio | 2–3 |
| **Tier 2** | [`parallax-runner`](../arcade/parallax-runner/index.html) | Unique 3-lane depth-switching runner concept | Independent per-layer `obstacles` spawning can generate impossible triple-lane walls; frame-rate dependent (`frameCount++`, `speed` per rAF); unguarded `localStorage`; no visible touch buttons; no audio | 2–3 |
| **Tier 2** | [`pixel-maze`](../arcade/pixel-maze/index.html) | Kruskal maze generation + fog-of-war concept + difficulties | Zero in-game HUD (no timer/steps visible while playing); redraws static maze walls + `shadowBlur` every `rAF` frame; swipe-per-single-cell tedious on 40×40 grids; no hazards/items/par; no audio | 2–3 |
| **Tier 3** | [`rogue-signal`](../arcade/rogue-signal/index.html) | Deepest strategy loop (`RSData`/`RSEngine`/`RSRender`/`RSGame`) | **Card bug:** `playCard()` resolves `Power Cycle` (`discardHand: true, draw: 4`) *before* removing the card from `hand`, discarding an innocent drawn card & duplicating `Power Cycle`; zero `localStorage` persistence; no Draw/Discard modal; no audio | 2 |
| **Tier 3** | [`tower-surge`](../arcade/tower-surge/index.html) | Clean `TS` namespace, range previews, wave scaling & persistence | Single hardcoded map; Resume replaces Start with no `"New Game"` option; no `2x` speed or targeting priority; only 3 towers; fixed canvas; unguarded `localStorage.getItem`; no audio | 2–3 |
| **Tier 3** | [`starfield-survivor`](../arcade/starfield-survivor/index.html) | Solid `Entity`/`Renderer`/`Game` split, enemies & XP progression | Canvas size tracks raw `container.clientWidth` (viewport size alters arena difficulty); keyboard offset fights mouse lerp; unguarded `localStorage.getItem`; purely passive dodging; no audio | 2 |
| **Tier 3** | [`glyph-decoder`](../arcade/glyph-decoder/index.html) | Tactile grid pad, crisp visual symbols, streak scoring | One wrong tap triggers instant Game Over without showing expected pattern; `setInterval` timer (`100ms`); no `1–9`/`Backspace` keyboard shortcuts; single Endless mode; no audio | 2 |
| **Tier 3** | [`asteroid-miner`](../arcade/asteroid-miner/index.html) | Clean incremental loop, upgrades, auto-miners & persistence | Dual `click`+`touchstart` binding on `#asteroid` instead of unified `pointerdown`; no offline idle gain, no prestige/save reset, no active meteor/overcharge events; no audio | 2 |

### Tier Definitions
- **Tier 1 (Immediate Triage & Structural Repairs):** Games with runtime crashes, state-corrupting gameplay bugs, unplayable mobile gaps, or flagship features explicitly promised on the Arcade landing card that are currently unimplemented.
- **Tier 2 (Simulation Determinism, Depth & Game Feel):** Action/arcade games held back by frame-rate dependence (`dt` bugs), missing HiDPI scaling, shallow mode/power-up variety, and silence.
- **Tier 3 (Systems Polish & Meta-Progression):** Already strong games (including multi-module designs like `rogue-signal`, `tower-surge`, and `starfield-survivor`) that primarily need targeted bugfixes, audio synthesis, quality-of-life HUD improvements, and meta-progression/persistence.

---

## 3. Per-Game Audit & Multi-Session Upgrade Plans

---

### 1. Warp Chess (`arcade/warp-chess/`) — **Tier 1**

#### Current State & Verified Issues
- `index.html` displays a prominent `⚠️ EARLY ACCESS` banner (`L30-32`) and contains an empty `#captured-pieces` container (`L38`) that `game.js` never populates.
- `handleTeleport` (`game.js` L154–190) performs standard `game.move()`, waits `600ms` via `setTimeout`, and mutates the board behind `chess.js`'s back using `game.remove(target)` and `game.put(movedPiece, exitPortal)`.
  - Clicks are not locked during the `600ms` timeout, allowing race conditions.
  - Because `chess.js` evaluates move legality, check, checkmate, and pins *before* teleportation occurs, portal exits cannot put the opponent in check safely or trigger legitimate warp captures/evasion, and `remove`/`put` resets castling/state expectations.
- Strictly 2P local with zero AI, zero move history/undo, zero Web Audio, and zero `localStorage` persistence.

#### Target Architecture & Modes
- Split into `window.WC` modules: `portals.js` (portal generation & warp rules), `ai.js` (alpha-beta / minimax with positional tables + warp evaluation), `audio.js`, `renderer.js` (DOM/SVG board overlay for portal beams & check pulses), and `game.js`.
- Add `mode-bar`: **Vs AI (Novice / Tactical / Ace)**, **2P Local**, and **Daily/Seeded Portal Puzzles** (4–6 curated mate-in-1/2 warp challenges with star/par tracking).

#### Gameplay & Mechanics Upgrades
- Replace the fragile `setTimeout` board mutation with deterministic synchronous turn state transitions:
  - Lock input during brief visual animation (`isAnimating`), compute post-warp FEN cleanly, resolve portal exit captures (with warp-shield/self-capture prevention rules made explicit in a collapsible Rules popover), and check win/check status *after* the warp resolves.
- Populate `#captured-pieces` with material advantage calculation (`+3`, etc.) and highlight valid portal-exit previews on hover/selection so players can see *where* a piece will emerge before committing the move.
- Remove the `⚠️ EARLY ACCESS` banner once warp resolution, input locking, and captures are rock solid.

#### Audio & FX
- Synthesized crystal/slide wood-synth taps, harmonic portal whoosh + shimmer on warp, warning chord on Check, and victory/stalemate stingers.
- SVG beam arc connecting entry and exit portals during warp transitions.

#### Persistence Keys
- `arcade.warp-chess.record` (Vs AI win/loss/draw stats per tier)
- `arcade.warp-chess.puzzles` (completed puzzle IDs & best moves)
- `arcade.warp-chess.muted`

#### Session Checklist
- [ ] **Session 1:** Fix deterministic warp engine, input lock during animation, portal-exit preview indicators, and `#captured-pieces` material bar.
- [ ] **Session 2:** Build time-budgeted chess + warp AI (`ai.js`) across 3 difficulty tiers + move history / undo in casual modes.
- [ ] **Session 3:** Add procedural `audio.js`, warp beam SVG animations, keyboard navigation, and 6 seeded Warp Puzzles; remove `EARLY ACCESS` banner and run final QA.

---

### 2. Quantum Checkers (`arcade/quantum-checkers/`) — **Tier 1**

#### Current State & Verified Issues
- Landing card & `<meta name="description">` promise *"teleportation and entangled pieces"*, yet `game.js` only implements basic 2P checkers plus a hardcoded `teleports = { 1: 2, 2: 2 }` swap/move budget. Zero entanglement mechanics exist.
- **Multi-jump bug (`game.js` L113 `handleCellClick`):** While inside a mandatory capture chain, clicking another friendly piece cancels the current selection and switches pieces instead of locking the jumping piece until no jumps remain.
- `index.html` uses inline `onclick="initGame()"` handlers (`L33, L53`) instead of clean event listeners.
- Zero AI opponent, zero audio, and zero `localStorage`.

#### Target Architecture & Modes
- Refactor into `window.QC`: `rules.js` (board representation, mandatory jump enforcement, quantum entanglement state, teleport rules), `ai.js` (negamax/alpha-beta search understanding jump chains and entangled pairs), `audio.js`, `game.js`.
- Add `mode-bar`: **Vs AI (Novice / Tactical / Ace)** and **2P Local**.

#### Gameplay & Mechanics Upgrades
- **True Quantum Entanglement:** At match start (or via limited Quantum Link charges), pair pieces on opposite colors/ranks with matching phase indicators (α / β / γ glyphs + faint SVG/CSS entanglement tether).
  - Moving or capturing an entangled piece imparts a defined tactical side-effect (e.g., phased/quantum-state toggle or synced defensive shield/swap option, clearly documented in an in-game Quick Rules tooltip).
- **Mandatory Multi-Jump Lock:** Lock `activeJumpPiece` once a chain capture begins until all follow-up captures complete; highlight forced jump targets unmistakably.
- **Quantum Teleport Upgrade:** Allow teleporting onto quantum nodes or safe squares with visual destination previews and prevent instant self-trap teleports if undesired.
- Remove inline `onclick` attributes in favor of `addEventListener`.

#### Audio & FX
- Synthesized crisp disc clicks, chain-capture ascending pitch tones, quantum phase-shift chime on teleport/entanglement trigger, king-crowning fanfare.

#### Persistence Keys
- `arcade.quantum-checkers.stats` (AI wins/losses by tier)
- `arcade.quantum-checkers.muted`

#### Session Checklist
- [ ] **Session 1:** Fix mandatory multi-jump lock, remove inline `onclick`, and implement clean `rules.js` with entanglement state & visual tether rendering.
- [ ] **Session 2:** Implement 3-tier `ai.js` (time-sliced / bounded-depth search) + `mode-bar` selector.
- [ ] **Session 3:** Add procedural `audio.js`, phase-shift particles, Quick Rules modal, and guarded `localStorage` stats.

---

### 3. Cyber Pong (`arcade/cyber-pong/`) — **Tier 1**

#### Current State & Verified Issues
- `<meta name="description">` promises *"explosive power-ups"*, yet zero power-ups exist in `game.js`.
- **Keyboard-only input (`game.js` L68–86):** Listens only for `W`/`S` and `ArrowUp`/`ArrowDown`—completely unplayable on touch/mobile devices and misses smooth mouse tracking.
- **Frame-rate dependent physics:** Uses `INITIAL_BALL_SPEED = 2.8` applied raw per `requestAnimationFrame` without `dt` scaling, making 120Hz/144Hz monitors run at 2x+ speed compared to 60Hz. Uses `setInterval` for countdowns.
- Low-res `800x500` canvas styled with `image-rendering: pixelated`, hurting neon anti-aliased clarity; zero audio and zero `localStorage`.

#### Target Architecture & Modes
- Refactor into `window.CP`: `physics.js` (fixed `FRAME_DT = 1/60` with sub-stepping for fast shots), `powerups.js`, `ai.js` (reaction-window + trajectory prediction tiers), `audio.js`, `renderer.js` (HiDPI canvas), `game.js`.
- Add `mode-bar`: **Vs AI (Rookie / Cyber / Overdrive)**, **2P Local (Touch Zones + Dual Keys)**, and **Arcade Power-Up Chaos vs Classic Purist toggle**.

#### Gameplay & Mechanics Upgrades
- **Fulfill Power-Up Promise:** Spawn collectible neon anomalies in mid-court (hit by the ball or triggered by timed gates): *Overcharge Smash* (high-speed fireball + curve), *Paddle Expand / Shrink*, *Split Multiball*, *Laser Barrier* (temporary goal shield), and *Phase Warp* (ball blinks forward).
- **Universal Controls:** Support direct pointer/mouse paddle tracking in 1P, left/right touch drag zones on canvas for 2P mobile/tablet play, plus `W/S` and `↑/↓` keyboard support.
- **HiDPI & Sub-Stepped Ball Physics:** Eliminate `image-rendering: pixelated`, scale canvas cleanly via `devicePixelRatio`, and run fixed `1/60` accumulator steps so ball speed and spin are identical on 60Hz, 120Hz, and 240Hz displays.

#### Audio & FX
- Pitch-escalating paddle hits (rising with rally speed/combo), bass wall thuds, power-up synth sweeps, goal explosion shockwaves + trauma screen shake + slow-mo impact flash on match point.

#### Persistence Keys
- `arcade.cyber-pong.stats` (best win streak, fastest rally speed, AI tier clears)
- `arcade.cyber-pong.muted`

#### Session Checklist
- [x] **Session 1:** Implement fixed `FRAME_DT` accumulator + HiDPI `renderer.js` + mouse/dual-touch paddle controls.
- [x] **Session 2:** Build 4–5 mid-court power-ups, 3-tier AI, and Classic/Arcade mode switcher.
- [x] **Session 3:** Add procedural `audio.js`, impact sparks/chromatic goal shockwaves, and `localStorage` stats.

---

### 4. Grid Lock (`arcade/grid-lock/`) — **Tier 1**

#### Current State & Verified Issues
- **Blocking Crash Bug (`game.js` L76–79):** `loadLevel(index)` checks `if (index >= LEVELS.length) { showOverlay(overlayGameComplete); return; }`—but neither `showOverlay` nor `overlayGameComplete` exist (`showPanel` is used everywhere else in `game.js`). Completing Level 3 via any path that hits `loadLevel(3)` throws a `ReferenceError` (and `checkWinCondition` L346–357 only hides `#btn-next` on the final level).
- Only **3 levels** exist in `levels.js`, leaving the puzzle campaign thin.
- Missing Undo move, par/star move-efficiency ratings, keyboard cursor controls, Web Audio, and full completion modal.

#### Target Architecture & Modes
- Refactor into `window.GL`: `levels.js` (12–15 handcrafted levels across 3 chapters + endless procedural generator), `solver.js` (BFS/verifier for daily/random levels), `audio.js`, `renderer.js` (smooth HiDPI trace flow & circuit pulse animations), `game.js`.
- Add `mode-bar`: **Campaign (15 Levels)** and **Daily / Endless Procedural Grid**.

#### Gameplay & Mechanics Upgrades
- Immediately fix the completion flow (`showPanel` + proper Campaign Complete modal showing total stars, efficiency rating, and "Play Endless" CTA).
- Add **Undo (`Z` / button)**, **Par & 1–3 Star Ratings** per level (based on move count & node efficiency), and **Arrow/WASD + Space** keyboard support alongside pointer drag-to-connect routing.
- Introduce escalating puzzle mechanics in later chapters: **Signal Bridges (crossovers)**, **Color-Filtered Gateways**, and **Locked Relay Nodes** to justify 12–15 levels.

#### Audio & FX
- Rising pentatonic synth notes per connected cell (harmonic tension as paths lengthen), circuit lock-in chime when a pair completes, error buzz on invalid crosses, level-clear chord progression.

#### Persistence Keys
- `arcade.grid-lock.progress` (level unlock states, best moves, stars per level)
- `arcade.grid-lock.muted`

#### Session Checklist
- [ ] **Session 1:** Fix `showOverlay`/`overlayGameComplete` crash, add Undo stack, and implement par/star rating + Level Select grid modal.
- [ ] **Session 2:** Expand `levels.js` to 15 curated levels with Signal Bridges & Gateways + BFS-verified Endless procedural mode.
- [ ] **Session 3:** Upgrade HiDPI neon circuit pulse rendering, keyboard navigation, and procedural `audio.js`.

---

### 5. Bit Breaker (`arcade/bit-breaker/`) — **Tier 2**

#### Current State & Verified Issues
- `index.html` lacks `.bg-grid` and `.orb` suite wrappers and `user-scalable=no` viewport protection.
- **Unplayable on Touch:** `game.js` only supports desktop mouse movement and `Space` launch—zero `touchstart`/`touchmove`/`pointermove` support.
- **Physics & Timestep Bugs:** `update(dt)` (`L276`) accepts `dt` cleanly from `requestAnimationFrame` but completely ignores it, stepping positions linearly per frame! Paddle collision (`L333–347`) assigns `b.dx = hitOffset * b.speed * 1.5` without re-normalizing the `[dx, dy]` vector to `b.speed`, causing edge shots to move ~50%+ faster than center hits.
- Thin content: 1-hit bricks only, only 2 power-ups (`WIDE`, `MULTIBALL`), unguarded `localStorage` (`L30`, `L209`), zero Web Audio.

#### Target Architecture & Modes
- Refactor into `window.BB`: `levels.js` (distinct stage patterns & brick archetypes), `physics.js` (fixed `FRAME_DT`, swept/sub-stepped ball collision), `particles.js`, `audio.js`, `renderer.js` (HiDPI), `game.js`.
- Add `mode-bar`: **Arcade Stages (10+ curated levels)** and **Endless Brick Descent**.

#### Gameplay & Mechanics Upgrades
- Fix `dt` normalization using a fixed `1/60` accumulator + proper unit-vector reflection on paddle hit (varying angle up to ±60° while preserving exact speed magnitude).
- Add touch/pointer paddle dragging + tap-to-launch + `A/D` / `←/→` keyboard fallback.
- Expand brick types (2-hit armored, explosive bomb bricks, indestructible deflector bumpers, mystery capsules) and power-ups (`LASER`, `MAGNET CATCH`, `FIREBALL` piercer, `SLOW-MO`).
- Restore `.bg-grid` / `.orb` styling and wrap `arcade.bit-breaker.high-score` reads/writes in `try...catch`.

#### Audio & FX
- Harmonic combo escalation (brick pitches climb up a synth scale until paddle touch resets combo), metallic clink on armored bricks, laser zap, explosion boom, power-up pickup chime.

#### Persistence Keys
- `arcade.bit-breaker.high-score`
- `arcade.bit-breaker.stages` (unlocked stages & high stage stars)
- `arcade.bit-breaker.muted`

#### Session Checklist
- [ ] **Session 1:** Fix fixed-timestep physics, vector speed normalization on paddle bounce, HiDPI scaling, and universal pointer/touch/keyboard input.
- [ ] **Session 2:** Add brick variants (armored, bomb, bumper), 4 new power-ups, 10 handcrafted stages, and guarded `localStorage`.
- [ ] **Session 3:** Add `.bg-grid`/`.orb` suite parity, procedural `audio.js`, trauma shake, and laser/fireball VFX.

---

### 6. Neon Snake (`arcade/neon-snake/`) — **Tier 2**

#### Current State & Verified Issues
- Landing card (`arcade/index.html` L92) explicitly promises *"pulsing beats"*, yet the game has zero Web Audio.
- **Input Buffer Bug (`game.js` L345–347):** Uses a single `nextDir` variable—pressing two quick orthogonal keys inside a `140ms` tick (e.g., Up → Left for a U-turn) overwrites `nextDir`, dropping the first turn and often causing accidental self-collision or missed corners.
- Single basic gameplay mode (Classic grid wrap-around with 1 apple type); grid rendering jumps discretely per tick with zero sub-tick interpolation or food spawn anticipation.

#### Target Architecture & Modes
- Keep clean structure or modularize into `audio.js`, `renderer.js` (HiDPI + smooth head/tail interpolation between grid ticks), `game.js`.
- Add `mode-bar`: **Classic**, **Solid Walls (High-Risk)**, **Portal Grid**, and **Speed Blitz**.

#### Gameplay & Mechanics Upgrades
- Replace single `nextDir` with a **2-input FIFO direction queue** (capped at length 2, validating each queued turn against the *previous queued direction*, never directly reversing 180°).
- Add **combo multiplier timer** (eat food quickly to keep multiplier alive) and special bonus pickups (*Overclock Gold* timed orb, *Phase Shield* 1-hit self/wall buffer).
- Smooth sub-tick visual interpolation on HiDPI canvas while keeping crisp deterministic grid logic.

#### Audio & FX
- **Deliver on "Pulsing Beats":** Subtle BPM-locked Web Audio synth bassline/pulse tied to snake speed (`tickMs`), plus pitched food-pickup arpeggios, phase-shield activation shimmer, and synth crash FX.

#### Persistence Keys
- `arcade.neon-snake.high-scores` (high score per mode, migrating or preserving `arcade.neon-snake.high-score`)
- `arcade.neon-snake.muted`

#### Session Checklist
- [ ] **Session 1:** Implement 2-step input queue, HiDPI canvas with sub-tick interpolation, and mode selector (Classic / Walls / Portal / Blitz).
- [ ] **Session 2:** Add procedural `audio.js` with speed-reactive pulsing synth beat, combo multiplier orbs, and particle burst / mute toggle.

---

### 7. Gravity Drop (`arcade/gravity-drop/`) — **Tier 2**

#### Current State & Verified Issues
- **Broken Card Promise (`arcade/index.html` L65):** Advertises *"Dodge shifting gravity fields"*—in reality `barriers` in `game.js` are purely static horizontal lines with gaps scrolling upward at constant speed.
- Uses a fixed `400x600` non-HiDPI canvas and frame-rate-dependent updates (`fallSpeed += SPEED_INC` unscaled by `dt`), causing inconsistent speed across 60Hz/120Hz displays.
- Zero Web Audio and limited depth variety (only gap width / scroll speed scale).

#### Target Architecture & Modes
- Modularize into `audio.js`, `hazards.js` (real gravity wells/repulsors + shifting barriers), `renderer.js` (HiDPI), `game.js` with `FRAME_DT = 1/60` physics accumulator.
- Add `mode-bar`: **Endless Descent** and **Time Trial / Depth Dash**.

#### Gameplay & Mechanics Upgrades
- **Implement Real Shifting Gravity Fields:**
  - *Crosswind / Lateral Shear Zones* (visible vector chevrons shifting horizontal drift left/right).
  - *Attractor / Repulsor Singularity Orbs* curving the falling orb's trajectory (`Physics` borrowed conceptually from Gravity Wars).
  - *Phase-Invert Gates* that momentarily flip steer polarity or boost vertical drop with bonus score multipliers.
- Convert to fixed-timestep `dt` simulation and HiDPI canvas scaling, keeping responsive swipe/tap/arrow input.
- Add Near-Miss Graze & Risk-Dive bonus (holding Down or skimming barrier edges builds multiplier + glow).

#### Audio & FX
- Continuous low-pass filtered wind/gravity hum proportional to descent speed, field-shift sweep cues, graze sparks, barrier shatter/impact sub-bass.

#### Persistence Keys
- `arcade.gravity-drop.high-score` / `arcade.gravity-drop.stats`
- `arcade.gravity-drop.muted`

#### Session Checklist
- [ ] **Session 1:** Convert to fixed-timestep `dt` physics & HiDPI `renderer.js`; implement Near-Miss graze scoring.
- [ ] **Session 2:** Build Lateral Shear Zones, Gravity Well/Repulsor hazards, and Phase-Invert Gates.
- [ ] **Session 3:** Add procedural `audio.js` with velocity-reactive wind/field hum and polish mobile HUD/mute toggle.

---

### 8. Parallax Runner (`arcade/parallax-runner/`) — **Tier 2**

#### Current State & Verified Issues
- **Impossible Wall Spawning (`game.js` L128–141):** `obstacles = [[], [], []]` calls `spawnObstacle(li)` independently for Foreground, Midground, and Background layers with no cross-layer clearance coordination—allowing unavoidable obstacles across all 3 depth layers at the same horizontal position.
- Frame-rate dependent (`frameCount++`, `speed`, and jump arcs run per `requestAnimationFrame` tick rather than `dt`).
- `localStorage` calls (`L56`, `L534`) omit `try...catch`.
- Touch/mobile controls rely on invisible gestures/taps without clear on-screen Jump / Depth-Switch buttons or HUD indicators.

#### Target Architecture & Modes
- Refactor into `audio.js`, `spawner.js` (fair cross-layer pattern generator ensuring ≥1 open lane at all times), `renderer.js` (HiDPI depth-fog & motion blur), `game.js` with `FRAME_DT = 1/60`.
- Add `mode-bar`: **Endless Sector** and **Daily Seeded Run** (deterministic `mulberry32` obstacle sequence so players can compete on identical runs).

#### Gameplay & Mechanics Upgrades
- **Fair Cross-Layer Spawner:** Generate coordinated wave patterns across the 3 parallax layers so an obstacle closing Lane A/B always leaves at least one reachable safe path given jump & layer-switch cooldowns.
- Fixed `FRAME_DT = 1/60` physics for jump gravity, lane-shift tweening, and speed ramp.
- Add clear mobile control bar (`Layer Up`, `Layer Down`, `Jump/Dash`) alongside `W/S`, `↑/↓`, `Space` keyboard play, plus collectible *Phase Orbs* for temporary invulnerability / score boosts.

#### Audio & FX
- Depth-filtered jump thumps, harmonic Z-axis phase-shift whooshes (different pitch per depth plane: Front/Mid/Back), collectible chimes, collision glitch burst.

#### Persistence Keys
- `arcade.parallax-runner.high-score` (guarded `try...catch`)
- `arcade.parallax-runner.daily` (date-keyed seeded best)
- `arcade.parallax-runner.muted`

#### Session Checklist
- [ ] **Session 1:** Fix cross-layer coordinated `spawner.js`, convert physics to fixed `FRAME_DT = 1/60`, and wrap `localStorage` in `try...catch`.
- [ ] **Session 2:** Add HiDPI `renderer.js`, visible mobile controls (`Layer +/-`, `Jump`), Daily Seeded Run mode, and `audio.js`.

---

### 9. Pixel Maze (`arcade/pixel-maze/`) — **Tier 2**

#### Current State & Verified Issues
- **Performance Waste (`game.js` L140–218):** `draw()` clears and re-renders *every wall segment* and applies `ctx.shadowBlur` on every single `requestAnimationFrame` frame even though the maze topology is 100% static after generation.
- **Zero In-Game HUD:** Time elapsed, step count, and par/efficiency are hidden during gameplay until the completion panel appears.
- **Tedious Touch Controls (`L306–327`):** `touchend` moves only **1 single cell per swipe**—fatiguing on `25×25` and `40×40` mazes compared to corridor auto-gliding or continuous swipe/D-pad hold.
- Minimal depth: Kruskal generator + simple Fog-of-War, zero hazards, keys/doors, pickups, or time targets.

#### Target Architecture & Modes
- Split into `maze.js` (Kruskal + optional Braided/Portal loops + Key/Gate generator), `audio.js`, `renderer.js` (offscreen static maze cache canvas + lightweight per-frame player/fog/FX overlay), `game.js`.
- Add `mode-bar`: **Classic Fog**, **Time Attack (Par Countdown)**, and **Key-Hunter (Multi-Gate)**.

#### Gameplay & Mechanics Upgrades
- **Offscreen Maze Layer Caching:** Pre-render static neon walls (including glow) onto an offscreen HiDPI canvas once per level/resize; composite in O(1) each frame so even `40×40` runs locked at 60/120fps.
- **Live HUD:** Display active timer, steps, keys collected, and current par target continuously in the header/HUD bar.
- **Corridor Glide / Continuous Hold:** Holding an arrow key / D-pad repeats smoothly after a brief initial delay, and optional Junction Glide lets swipe controls zip smoothly along straight corridors until hitting a branch or dead-end.

#### Audio & FX
- Soft crisp micro-step ticks, sonar pulse ping (`R` or tap to briefly reveal wall echoes on a cooldown in Fog mode), key-pickup bell, exit portal chime.

#### Persistence Keys
- `arcade.pixel-maze.records` (best time, stars, fastest clears per grid size & mode)
- `arcade.pixel-maze.muted`

#### Session Checklist
- [ ] **Session 1:** Implement offscreen HiDPI static maze caching, live timer/step/par HUD, and smooth continuous key-hold + junction-glide touch movement.
- [ ] **Session 2:** Add Sonar Ping ability, Key-Hunter locked gates, Time Attack mode, `audio.js`, and guarded `localStorage` best times.

---

### 10. Rogue Signal (`arcade/rogue-signal/`) — **Tier 3**

#### Current State & Verified Issues
- Already features one of the strongest architectures outside `gravity-wars` (`RSData`/`RSEngine`/`RSRender`/`RSGame` across `index.html`, `engine.js`, `game.js`), crisp tactical deckbuilder UX, and multi-enemy combat.
- **Critical Card Bug in `engine.js` `playCard()` (`L277–302`):**
  - Calls `resolveCardEffect(card, targetEnemyUid)` at `L289` **before** splicing the played card out of `state.hand` at `L292` (`state.hand.splice(cardIdx, 1); state.discardPile.push(card);`).
  - When playing `Power Cycle` (`discardHand: true, draw: 4`), `resolveCardEffect` clears `state.hand` (moving `Power Cycle` into discard) and draws 4 fresh cards—and then `L292` deletes whichever newly drawn card happens to sit at `cardIdx` and pushes a *duplicate* `Power Cycle` to `discardPile`!
- **Zero `localStorage` Persistence:** Refreshing mid-run wipes everything; no career victory/run history or unlocked telemetry stats exist.
- **Missing Deck/Pile Inspection:** Players cannot click Draw Pile, Discard Pile, or Exhausted/Deck counters to inspect remaining cards—vital tactical info in any deckbuilder.

#### Target Architecture & Upgrades
- Fix `playCard()` ordering immediately: remove/move `card` out of `state.hand` into a transient resolving slot (pushing to `discardPile` / `exhaustPile` right after resolution or marking by `uid`), eliminating index-based `splice` hazards for any hand-manipulating card.
- Add interactive **Draw / Discard / Full Deck Modal Viewer** (shuffled display for Draw Pile so draw order isn't spoiled).
- Add mid-run **Auto-Save (`resume run`)** + **Career Run History & Ascension Tiers** using `arcade.rogue-signal.*`.
- Add procedural `audio.js`: synth card draw flick, energy charge hum, laser/EMP strike SFX, enemy intent warning chime, relic pickup chime, node clear fanfare.

#### Persistence Keys
- `arcade.rogue-signal.run-save` (auto-saved current floor/HP/deck/relics)
- `arcade.rogue-signal.career` (wins, best floor, highest Ascension unlocked)
- `arcade.rogue-signal.muted`

#### Session Checklist
- [ ] **Session 1:** Fix `playCard()` `Power Cycle` / index-splice bug cleanly; add Draw/Discard/Deck modal viewer and guarded mid-run auto-save + Ascension unlocking.
- [ ] **Session 2:** Build procedural `audio.js`, card-impact screen shake / floating damage polish, and mute toggle.

---

### 11. Tower Surge (`arcade/tower-surge/`) — **Tier 3**

#### Current State & Verified Issues
- Modular `TS` namespace (`renderer.js` 307L, `game.js` 403L) with save-game resume, tower upgrade/sell inspectors, and particle projectiles.
- **UX Dead-End (`game.js` L60–62):** When an existing save is detected, `#btn-start` switches to `"Resume Campaign"`, leaving **no `"New Game"` button** without clearing `localStorage` manually or dying first.
- Single hardcoded `PATH_WAYPOINTS` map, fixed canvas size (no HiDPI scaling), only 3 tower types (`pulse`, `spark`, `nova`), no `1x / 2x` speed toggle, no tower targeting priority (`First`, `Strong`, `Close`), and unguarded `localStorage.getItem` at `L22`.
- Zero Web Audio.

#### Target Architecture & Upgrades
- Add explicit **`New Game`** alongside **`Resume Campaign`** (plus confirmation if overwriting active wave > 1) and wrap `localStorage` in `try...catch`.
- Add **`1x / 2x` Wave Speed Toggle**, **Tower Targeting Priority** (`First`, `Strong`, `Closest`), and **4th Control/Debuff Tower** (e.g., *Cryo/Stasis Slow Node*) + **2 additional Map Layouts** selectable at campaign start.
- Scale `renderer.js` cleanly for HiDPI displays.
- Add procedural `audio.js`: distinct fire SFX per tower (pulse zap, arc crackle, nova thump, cryo hum), enemy pop ticks, tower place/upgrade chimes, wave start horn.

#### Persistence Keys
- `arcade.tower-surge.save` (guarded JSON state)
- `arcade.tower-surge.best` (best wave/score per map)
- `arcade.tower-surge.muted`

#### Session Checklist
- [ ] **Session 1:** Fix `"New Game"` vs `"Resume"` flow, guard `localStorage`, add HiDPI canvas scaling, `1x/2x` speed toggle, and tower targeting priorities.
- [ ] **Session 2:** Add Stasis Slow Tower + 2 selectable maps + procedural `audio.js` & mute toggle.

---

### 12. Starfield Survivor (`arcade/starfield-survivor/`) — **Tier 3**

#### Current State & Verified Issues
- Clean OOP split (`Entity` / `Renderer` / `Game`), dynamic starfield, enemy archetypes, XP gems, and wave scaling.
- **Viewport-Dependent Gameplay (`game.js` L84–89):** `resizeCanvas()` sets logical `canvas.width = container.clientWidth` and `canvas.height = container.clientHeight`. Playing on a narrow phone or huge 4K monitor changes arena size, spawn distances, and difficulty drastically instead of maintaining a fixed logical `WORLD` scaled via HiDPI.
- **Awkward Keyboard Steering (`game.js` L199–205):** Keyboard input overwrites `mouseX = player.x ± kSpeed` per frame while mouse inertia fights it rather than cleanly switching between velocity-vector keyboard control and pointer-follow mode.
- Purely passive dodging (no active graze-charged Burst/EMP skill); unguarded `localStorage.getItem` (`L17`); zero Web Audio.

#### Target Architecture & Upgrades
- Adopt Gravity Wars' fixed logical arena (`WORLD`, e.g., `900×650` or aspect-fitted viewport camera centered smoothly around a bounded arena) + HiDPI `devicePixelRatio` rendering so balance is identical across devices.
- Cleanly separate input modes: direct velocity vector for `WASD`/Arrows vs smooth follow target for active pointer/touch (no fighting `mouseX` state).
- Add **Graze-Charged Overdrive Burst (`Space` / double-tap / button):** close misses fill a charge bar allowing players to trigger a shockwave clear or brief warp-dash.
- Guard `arcade.starfield-survivor.*` reads/writes with `try...catch`.
- Add procedural `audio.js`: XP gem ascending pickups, graze sparks, weapon auto-fire/pulse bursts, Overdrive shockwave, boss alert siren.

#### Persistence Keys
- `arcade.starfield-survivor.high-score` / `arcade.starfield-survivor.stats`
- `arcade.starfield-survivor.muted`

#### Session Checklist
- [ ] **Session 1:** Fix HiDPI logical `WORLD` scaling, decouple keyboard/pointer steering cleanly, wrap `localStorage` in `try...catch`, and add Graze Overdrive active burst.
- [ ] **Session 2:** Build procedural `audio.js`, add boss-wave alert telegraphing & mute toggle.

---

### 13. Glyph Decoder (`arcade/glyph-decoder/`) — **Tier 3**

#### Current State & Verified Issues
- Crisp memory-matrix presentation and smooth streak progression.
- **Punishing Single-Mistake Ending (`handleWrong` L352–358):** One mis-click ends the entire run immediately *without* revealing which glyph sequence was expected, denying players visual closure or learning feedback.
- Uses `setInterval` (`L263–270`, 100ms increments) for countdown timing instead of `requestAnimationFrame` timestamp delta (`performance.now()`).
- Zero keyboard shortcuts (`1–9` mapped to the 3×3 glyph pad, `Backspace` to undo, `Space` to replay flash hint), single Endless mode only, and zero Web Audio (which directly reinforces memory sequences!).

#### Target Architecture & Upgrades
- **Audio-Visual Synesthesia:** Assign every glyph slot (`1–9`) a distinct pentatonic/synth tone in `audio.js` so players memorize *melodies + patterns* simultaneously (massive upgrade for memory games).
- **Signal Integrity (3 Lives / Shields) & Failure Reveal:** Give 3 Signal Integrity bars in Standard mode (while offering a strict **1-Life Sudden Death** mode via `mode-bar` alongside **Classic 3-Life** and **Time Blitz**). On wrong tap or game over, highlight expected glyphs vs tapped glyphs clearly for 1.5s before finalizing.
- Replace `setInterval` with `performance.now()` rAF timing; add `1–9` numpad/number-key shortcuts & `Z`/`Backspace` undo (where valid) + `:focus-visible` outlines.

#### Persistence Keys
- `arcade.glyph-decoder.best` (best score & max sequence length per mode)
- `arcade.glyph-decoder.muted`

#### Session Checklist
- [ ] **Session 1:** Replace `setInterval` with rAF timestamp delta, add 3-Life Signal Integrity + expected-pattern reveal overlay, and wire `1–9` keyboard shortcuts.
- [ ] **Session 2:** Add pitched 9-tone Web Audio `audio.js` synchronized to sequence flash + player taps + mode selector (`Classic` / `Sudden Death` / `Time Blitz`).

---

### 14. Asteroid Miner (`arcade/asteroid-miner/`) — **Tier 3**

#### Current State & Verified Issues
- Clean incremental economy, upgrade tiers, floating click numbers, and auto-miner passive ticks.
- **Duplicate Input Binding (`game.js` L463–464):** Attaches separate `click` and `touchstart` handlers on `$asteroid`; standardizing on `pointerdown` with `touch-action: manipulation` gives crisp multi-touch/mouse parity without synthetic click workarounds.
- No offline idle earnings calculation on return, no **Prestige / Sector Jump** loop (`Warp Core Reset` for permanent multiplier), no **Reset Save** option, and minimal active gameplay beyond clicking (no periodic passing *Golden Comets* or *Overheat Mining Combo* meter).
- Zero Web Audio.

#### Target Architecture & Upgrades
- Replace dual `click`/`touchstart` on `$asteroid` with unified `pointerdown` + CSS `touch-action: manipulation`.
- **Active Engagement Layer:** Add a *Drill Resonance / Heat Combo Bar* (rhythmic clicks build multiplier up to `3x`) and periodic **Drifting Gold/Plasma Comets** across the backdrop canvas that reward burst clicks/resources.
- **Meta-Progression & QoL:** Compute guarded **Offline Mining Progress** (capped cleanly, e.g., 4–8 hours with a "Welcome Back" summary toast), add **Sector Jump (Prestige)** resetting credits/rigs for permanent Quantum Core multipliers, and include an accessible **Reset Save** confirmation button.
- **Procedural Audio + Asteroid Canvas:** Subtle tactile pickaxe/laser crunch pitched to combo level, golden comet radar ping, upgrade purchase synth confirm, milestone jingle.

#### Persistence Keys
- `arcade.asteroid-miner.save` (credits, upgrades, lastTimestamp, prestigeCores, totalMined)
- `arcade.asteroid-miner.muted`

#### Session Checklist
- [ ] **Session 1:** Switch to unified `pointerdown`, add Welcome-Back offline progress calculation, Reset Save option, and Sector Jump prestige loop.
- [ ] **Session 2:** Add Drill Resonance combo bar, passing Golden Comets, and procedural `audio.js` with mute toggle.

---

## 4. Suite-Wide Shared Upgrades

Beyond individual game upgrades, two small suite-level improvements will keep future arcade games aligned with `gravity-wars` by default:

1. **Upgrade the Arcade Starter Template (`.templates/arcade-game/`)**
   - Include a lightweight optional `audio.js` starter (with `AudioContext` unlock-on-gesture, mute flag under `arcade.<game-name>.muted`, and helper synth tones) plus a header **Mute button**.
   - Provide a standard **`Store` helper** (`try...catch` `get`/`set` JSON wrapper) and a **`FRAME_DT = 1 / 60` fixed-timestep + HiDPI resize helper** in the template `game.js`.
   - Include commented starter markup for the `.mode-bar` selector pattern.
   - *(Note: Respect project isolation—improvements live in `.templates/arcade-game/` for new/upgraded games, not as shared JS imports across sibling game folders.)*

2. **Modernize Landing Card Thumbnails (`arcade/index.html` & `arcade/landing.css`)**
   - Currently, 14 cards in `arcade/index.html` rely on flat CSS shapes or emojis while `gravity-wars` uses a bespoke inline `<svg class="gw-thumb-svg" viewBox="0 0 240 160">` scene with glows, gradients, and motion arcs.
   - As each game completes its upgrade sessions, replace its landing card thumbnail with a bespoke `240×160` inline SVG scene matching its upgraded visual identity (e.g., glowing warp portals for `warp-chess`, entangled quantum beams for `quantum-checkers`, split prism ball + laser barrier for `cyber-pong`).

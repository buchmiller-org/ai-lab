---
description: How to add a new game to The Arcade
---

# Add a New Arcade Game

> **Note:** These instructions are specifically for adding new games to The Arcade suite (inside the `arcade/` directory). Games built outside of the arcade suite are not bound by these specific rules and structure.


## Steps

1. **Copy the starter template** — Copy `.templates/arcade-game/` to `arcade/<game-name>/` (kebab-case directory name, e.g. `arcade/space-invaders/`).

2. **Customize game files**:
   - `index.html`: Update `<title>` (`<Game Name> — Arcade`), `<meta name="description">`, header title, and emoji favicon.
   - `style.css`: Adjust custom colors, canvas aspect ratio, and HUD accents. Game styles must reside in `style.css` (do not use inline CSS).
   - `game.js`: Implement game logic, controls, rendering, and state machine. For larger or more complex games, split logic across multiple focused files (e.g. `map.js`, `entities.js`, `renderer.js`, `game.js`) loaded via `<script>` tags in dependency order.
   - **LocalStorage Convention:** If persisting high scores or settings, use the namespaced key convention `arcade.<game-name>.<key>` (e.g. `arcade.neon-snake.high-score`) since `localStorage` is shared across the entire origin.

3. **Register card and thumbnail on the landing page** — Open `arcade/index.html` and add a new game card inside `<section class="games-grid">`, following the instructions in [`arcade/AGENTS.md`](../../arcade/AGENTS.md#landing-page-cards--thumbnail-design-arcadeindexhtml--landingcss):
   - Add the card markup inside `<section class="games-grid" id="games-grid">`.
   - Add abstract SVG or CSS shapes inside the card's `game-card__thumb` div.
   - Add the `.game-card__thumb--<game-name>` background gradient rule to `arcade/landing.css`.

4. **Update Idea Doc (if graduating from `_ideas/`)**:
   - If this game was built from a design doc in `_ideas/`, update the status line at the top of that doc to `Status: Shipped (arcade/<game-name>/)`.

5. **Verify locally** — Test the game using `npx -y serve -l 3000` or `python3 -m http.server 3000`. Complete the Definition of Done checklist below.


## Definition of Done

Before marking the task complete, verify each item:

- [ ] **Starter template copied:** Built from `.templates/arcade-game/` with clean file separation (`index.html`, `style.css`, `game.js`).
- [ ] **Landing page card registered:** Card markup added to `arcade/index.html` and thumbnail gradient rule added to `arcade/landing.css`.
- [ ] **Relative links verified:**
  - Back link (`href="../"`) navigates to `arcade/index.html`.
  - Shared arcade stylesheet linked via `href="../styles.css"`.
  - Local assets use relative paths (`./style.css`, `./game.js`).
  - No domain-root absolute paths (`href="/..."`, `src="/..."`).
- [ ] **Page metadata complete:**
  - `<title>` matches `<Game Name> — Arcade`.
  - `<meta name="description">` is present and descriptive.
  - Viewport `<meta>` tag is present (`user-scalable=no` permitted for touch gameplay).
- [ ] **Fonts & styling:**
  - Google Fonts (Orbitron + Inter) loaded via HTML `<link>` with preconnect hints.
  - No CSS `@import` used for fonts (prevents FOUT).
  - No cross-project asset imports from sibling games or external tools.
- [ ] **LocalStorage namespaced:**
  - Any saved high scores or settings use `arcade.<game-name>.<key>`.
- [ ] **Clean console:**
  - No JavaScript runtime errors, unhandled exceptions, or missing asset 404s in the browser devtools.
- [ ] **Mobile viewport & responsive check:**
  - Game layout, canvas, controls, and HUD scale properly and are usable on smaller mobile screens.
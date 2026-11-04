---
description: How to add a new game to The Arcade
---

# Add a New Arcade Game

> **Note:** These instructions are specifically for adding new games to The Arcade suite (inside the `arcade/` directory). Games built outside of the arcade suite are not bound by these specific rules and structure.


## Steps

1. **Create the game folder** — Create a new directory under `arcade/` with a kebab-case name (e.g. `arcade/space-invaders/`).

2. **Create `index.html`** — Add an `index.html` file inside the game folder. This is the entry point. Include these in the `<head>`:
   - `<meta charset="UTF-8">` and viewport meta tag
   - `<title>` in the format `Game Name — Arcade`
   - `<meta name="description">` with a short game summary
   - Preconnect and Google Fonts links (copy from the landing page `index.html`):
     ```html
     <link rel="preconnect" href="https://fonts.googleapis.com">
     <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
     <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap">
     ```
   - The shared stylesheet: `<link rel="stylesheet" href="../styles.css">`
   - The shared favicon (copy from an existing game page)

   And in the `<body>`:
   - A standard arcade header with the back link and game title:
     ```html
     <header class="arcade-header">
       <a href="../" class="back-link">← Back to Arcade</a>
       <h1 class="arcade-header__title">Game Name</h1>
     </header>
     ```
   - Game styles must be in a separate `style.css` file within the game folder. (Do not use inline CSS).
   - Game logic must be in separate `.js` files within the game folder (do not use inline JS). For simpler games a single `game.js` may suffice, but for larger or more complex games, split the logic across multiple focused files (e.g. `map.js`, `entities.js`, `renderer.js`, `game.js`) and load them via `<script>` tags in dependency order.
   - Any CDN library imports via `<script>` or `<link>` tags. Feel free to use CDN game libraries for more complex games.

   > **Important:** Do NOT use `@import` in CSS for Google Fonts — always use `<link>` tags in HTML to avoid font flash (FOUT).

3. **Add a card to the landing page** — Open the arcade `index.html` (`arcade/index.html`) and add a new `<a class="game-card">` element inside `<section class="games-grid">`. Follow the card HTML pattern documented in `arcade/AGENTS.md`.

4. **Add thumbnail shapes** — Inside the card's `game-card__thumb` div, add abstract SVG or CSS shapes that visually represent the game. Look at existing cards in `index.html` for examples. These should have limited motion to keep the page from being too busy.
---
description: How to add a new game to the AI Games Arcade
---

# Add a New Arcade Game

> **Note:** These instructions are specifically for adding new games to the AI Games Arcade suite (inside the `arcade/` directory). Games built outside of the arcade suite are not bound by these specific rules and structure.


## Steps

1. **Create the game folder** — Create a new directory under `arcade/` with a kebab-case name (e.g. `arcade/space-invaders/`).

2. **Create `index.html`** — Add an `index.html` file inside the game folder. This is the entry point. Include these in the `<head>`:
   - `<meta charset="UTF-8">` and viewport meta tag
   - `<title>` in the format `Game Name — AI Games Arcade`
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
   - Game logic must be split into a separate `game.js` file and styles into a `style.css` file within the game folder. (Do not use inline JS/CSS).
   - Any CDN library imports via `<script>` or `<link>` tags

   > **Important:** Do NOT use `@import` in CSS for Google Fonts — always use `<link>` tags in HTML to avoid font flash (FOUT).

3. **Add a card to the landing page** — Open the arcade `index.html` (`arcade/index.html`) and add a new `<a class="game-card">` element inside `<section class="games-grid">`. Follow the card HTML pattern documented in `AGENTS.md`. Choose an existing color theme or create a new one.

4. **Add thumbnail shapes** — Inside the card's `game-card__thumb` div, add abstract SVG or CSS shapes that visually represent the game. Look at existing cards in `index.html` for examples.

5. **(If creating a new color theme)** — Define these rules in `styles.css`:
   - `game-card--<theme>::before` — gradient border glow
   - `game-card--<theme>:hover` — box-shadow glow
   - `game-card__thumb--<game>` — thumbnail background gradient
   - Keep hover CTA color as white (default) unless a brighter accent has high contrast against the dark card body

6. **Test** — Serve the site locally (`cmd /c "npx -y serve . -l 8080"`) and verify:
   - The new card renders correctly on the landing page
   - Hover effect looks good (no color bleed-through on the card body)
   - The card links to the game page
   - The game page works and the "← Back to Arcade" link returns to the landing page
   - Google Fonts load quickly with minimal flash
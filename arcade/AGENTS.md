# The Arcade — Agent Instructions

These instructions apply specifically when creating or modifying games and pages within the `arcade/` directory.

## Core Rules

1. **Static-only** — Every game must work on a static-content hosted website with no back-end server. No server-side code, no APIs, no databases.
2. **No package managers** — Do not use `npm`, `yarn`, or `pnpm` to install dependencies.
3. **CDN imports are welcome** — You may use any framework or library (game engines, CSS frameworks, utility libraries) as long as it can be loaded via a `<script>` or `<link>` tag from a CDN (e.g. unpkg, cdnjs, jsdelivr).

## Recommended Libraries

These are popular, CDN-friendly libraries well-suited for Arcade games:

- **Game engines:** Phaser, PixiJS, Babylon.js, Three.js, Kaboom.js
- **Creative coding:** p5.js
- **Physics:** Matter.js, Planck.js
- **Audio:** Howler.js, Tone.js
- **Animation:** GSAP, Anime.js
- **CSS frameworks:** Any that work via a `<link>` tag

## Project Structure

```
arcade/
├── index.html          # Arcade landing page with game cards
├── styles.css          # Shared arcade styles
├── landing.css         # Landing page styles
├── AGENTS.md           # These arcade instructions
└── <game-name>/        # Each game in its own folder
    ├── index.html      # Game entry point
    ├── style.css       # Game-specific styles
    └── game.js         # Game logic (split into modules if complex)
```

## Font Loading & Visual Identity

The Arcade uses Google Fonts (Orbitron for headers + Inter for UI/body), loaded via `<link>` tags in the HTML `<head>`, **not** CSS `@import`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap">
```

> **Warning:** Do NOT use `@import url(...)` in CSS for fonts — it creates a blocking request chain and causes a visible font flash (FOUT). Always use `<link>` tags in HTML with preconnect hints.

## Game Page Conventions

Each game page (`arcade/<game-name>/index.html`) should:

- Be fully self-contained within its folder (`arcade/<game-name>/`).
- Include the preconnect + Google Fonts `<link>` tags for Orbitron and Inter.
- Include `<meta charset="UTF-8">` and viewport meta tag.
- Include a descriptive `<title>` in the format: `Game Name — Arcade`.
- Include a meta description.
- Include a standard arcade header with a "← Back to Arcade" link pointing to `../`:
  ```html
  <header class="arcade-header">
    <a href="../" class="back-link">← Back to Arcade</a>
    <h1 class="arcade-header__title">Game Name</h1>
  </header>
  ```
- Game styles must be in a separate `style.css` file within the game folder (no large inline `<style>` blocks).
- Game logic must be in separate `.js` file(s) within the game folder (`game.js`, `entities.js`, etc.).

## Arcade Landing Page Cards (`arcade/index.html`)

When adding a new game, a card must be added to `arcade/index.html` inside the `<section class="games-grid" id="games-grid">` element. Follow this pattern:

```html
<a href="<game-name>/" class="game-card" id="card-<game-name>">
  <div class="game-card__thumb game-card__thumb--<game-name>">
    <!-- Abstract thumbnail SVG/CSS shapes -->
  </div>
  <div class="game-card__body">
    <h2 class="game-card__title">Game Name</h2>
    <p class="game-card__desc">Short one-line description of the game.</p>
    <span class="game-card__cta">Play <span class="game-card__cta-arrow">→</span></span>
  </div>
</a>
```

### Card hover effects & color themes

The game cards automatically cycle through 5 distinct color themes using CSS `:nth-child` rules in `landing.css`. You do not need to add or define new classes for the border glow, box-shadow glow, or play button color. When adding a new game card, you only need to define its thumbnail background gradient in `landing.css`:

1. `game-card__thumb--<game-name>` — the thumbnail background gradient.

Keep these hover gotchas in mind:
- **`backdrop-filter` + `::before` glow conflict:** The card has `backdrop-filter: blur(16px)` which will blur the `::before` gradient behind it, causing color bleed-through. On hover, `backdrop-filter: none` is set to prevent this.
- **Opaque card body on hover:** `.game-card__body` must have a solid background on hover so the gradient glow only appears at card edges.

## Workflows

See `.agents/workflows/add-arcade-game.md` for the full step-by-step checklist.

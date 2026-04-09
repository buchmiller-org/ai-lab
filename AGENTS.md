# The Arcade — Agent Instructions

## Core Rules

1. **Static-only** — Every game must work on a static-content hosted website with no back-end server. No server-side code, no APIs, no databases.
2. **No package managers** — Do not use `npm`, `yarn`, or `pnpm` to install dependencies.
3. **CDN imports are welcome** — You may use any framework or library (game engines, CSS frameworks, utility libraries) as long as it can be loaded via a `<script>` or `<link>` tag from a CDN (e.g. unpkg, cdnjs, jsdelivr).

## Recommended Libraries

These are popular, CDN-friendly libraries well-suited for this project:

- **Game engines:** Phaser, PixiJS, Babylon.js, Three.js, Kaboom.js
- **Creative coding:** p5.js
- **Physics:** Matter.js, Planck.js
- **Audio:** Howler.js, Tone.js
- **Animation:** GSAP, Anime.js
- **CSS frameworks:** Any that work via a `<link>` tag

## Project Structure

```
ai-lab/
├── index.html          # Landing page with game cards
├── styles.css          # Shared site styles
├── AGENTS.md           # These instructions
├── README.md           # Human-facing readme
├── arcade/
│   └── <game-name>/    # Each game in its own folder
│       └── index.html  # Game entry point (self-contained)
```

## Font Loading

Google Fonts (Orbitron + Inter) are loaded via `<link>` tags in the HTML `<head>`, **not** CSS `@import`. This is critical for performance:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap">
```

> **Warning:** Do NOT use `@import url(...)` in CSS for fonts — it creates a blocking request chain and causes a visible font flash (FOUT). Always use `<link>` tags in HTML with preconnect hints.

## CSS Patterns & Gotchas

### Card hover effects

The game cards use a `::before` pseudo-element for a gradient border glow on hover. Be aware of these traps:

- **`backdrop-filter` + `::before` glow conflict.** The card has `backdrop-filter: blur(16px)` which will blur the `::before` gradient behind it, causing color bleed-through. On hover, `backdrop-filter: none` must be set to prevent this.
- **Opaque card body on hover.** The `.game-card__body` must have a solid background on hover (not transparent) so the gradient glow only appears at the card edges, not behind the text.
- **Transition timing.** The `::before` opacity, `box-shadow`, and card body background all use instant (`0s`) transitions. Only the card's `transform` (lift) uses smooth transitions. If you add new hover effects, keep transitions in sync to avoid visual artifacts.

### New card color themes

The game cards automatically cycle through 5 distinct color themes using CSS `:nth-child` rules. You do not need to add or define new classes for the border glow, box-shadow glow, or play button color. When adding a new game card, you only need to define its thumbnail background gradient:

1. `game-card__thumb--<game>` — the thumbnail background gradient

## Game Page Conventions

Each game page (`arcade/<game-name>/index.html`) should:

- Be fully self-contained (all game code in this file or sibling files within the folder)
- Include the preconnect + Google Fonts `<link>` tags (see Font Loading above)
- Include `<meta charset="UTF-8">` and viewport meta tag
- Include a descriptive `<title>` in the format: `Game Name — Arcade`
- Include a meta description
- Include a "← Back to Arcade" link pointing to `../`

## Landing Page Cards

When adding a game, a card must be added to `index.html` inside the `<section class="games-grid">` element. Each card follows this pattern:

```html
<a href="arcade/<game-name>/" class="game-card" id="card-<game-name>">
  <div class="game-card__thumb game-card__thumb--<game>">
    <!-- Abstract thumbnail shapes -->
  </div>
  <div class="game-card__body">
    <h2 class="game-card__title">Game Name</h2>
    <p class="game-card__desc">Short one-line description of the game.</p>
    <span class="game-card__cta">Play <span class="game-card__cta-arrow">→</span></span>
  </div>
</a>
```

The game card will automatically receive a color theme based on its order in the grid.

## Local Development

To serve the site locally, use `cmd /c "npx -y serve -l 3000"` from inside the project directory (will be available at `http://localhost:3000/`). The `cmd /c` wrapper is needed if using PowerShell.

## Workflows

See `.agents/workflows/` for step-by-step procedures (e.g. `add-arcade-game.md`).

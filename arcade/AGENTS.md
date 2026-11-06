# The Arcade — Agent Instructions

These instructions apply specifically when creating or modifying games and pages within the `arcade/` directory.

## Rules & Inheritance

The Arcade **inherits all universal rules from root [`AGENTS.md`](../AGENTS.md)** (Static-Only, No Package Managers for project dependencies or build tooling, Subpath Safety / Relative Paths Only, Self-Contained Isolation).

Arcade-specific rules & additions:
1. **Shared Suite Stylesheet:** Games inside `arcade/<game-name>/` link to The Arcade's shared stylesheet: `<link rel="stylesheet" href="../styles.css">`. (They must NOT import root `../../styles.css` or assets from sibling games.)
2. **Visual & Font Identity:** Google Fonts (Orbitron for headers + Inter for UI/body) must be loaded via `<link>` tags in HTML `<head>` with preconnect hints. **Never use CSS `@import`** to prevent font flash (FOUT).
3. **Mobile Viewport & `user-scalable=no` Decision:** Arcade game pages may use `<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">` to prevent accidental double-tap-to-zoom or pinch gestures from disrupting fast canvas/touch gameplay.
   - *Accessibility Trade-off:* Disabling user scaling impacts low-vision accessibility. This is an intentional trade-off *strictly limited* to interactive arcade game canvases requiring fast touch interactions. It must never be applied to landing pages, documentation, tools, or non-arcade projects. Ensure game typography, HUD elements, and high-contrast visuals remain clearly legible on smaller mobile screens.

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

- Be self-contained within its folder (`arcade/<game-name>/`), with the sole exception of importing `<link rel="stylesheet" href="../styles.css">`.
- Include the preconnect + Google Fonts `<link>` tags for Orbitron and Inter.
- Include `<meta charset="UTF-8">` and the game viewport meta tag (`user-scalable=no` permitted for touch gesture handling).
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

## Landing Page Cards & Thumbnail Design (`arcade/index.html` & `landing.css`)

When adding a new game, register its card in `arcade/index.html` and define its thumbnail background in `arcade/landing.css`.

### 1. Card Markup (`arcade/index.html`)

Add the card inside `<section class="games-grid" id="games-grid">`:

```html
<a href="<game-name>/" class="game-card" id="card-<game-name>">
  <div class="game-card__thumb game-card__thumb--<game-name>">
    <!-- Abstract thumbnail SVG/CSS shapes representing the game -->
  </div>
  <div class="game-card__body">
    <h2 class="game-card__title">Game Name</h2>
    <p class="game-card__desc">Short one-line description of the game.</p>
    <span class="game-card__cta">Play <span class="game-card__cta-arrow">→</span></span>
  </div>
</a>
```

### 2. Thumbnail Visuals (SVG/CSS Shapes + Gradient)

A complete game thumbnail consists of two components:
- **Background Gradient (`arcade/landing.css`):** Add a rule for `.game-card__thumb--<game-name>` setting a custom linear or radial gradient reflecting the game's color palette:
  ```css
  .game-card__thumb--<game-name> {
    background: linear-gradient(135deg, #1a103c 0%, #2e1065 50%, #0f172a 100%);
  }
  ```
- **Abstract Shapes (inside `.game-card__thumb` in HTML):** Add lightweight SVG or CSS shapes that visually symbolize the game (e.g. geometric icons, grid lines, stylized ships, or glowing nodes). Keep animation subtle or static to prevent the landing grid from feeling noisy.

### 3. Card Hover & Color Themes

The game cards automatically cycle through 5 distinct neon color themes using CSS `:nth-child` rules in `landing.css`. You do **not** need to define border glows, box-shadows, or CTA arrow colors.
Keep these hover styling gotchas in mind:
- **`backdrop-filter` + `::before` glow conflict:** The card has `backdrop-filter: blur(16px)` which blurs the `::before` gradient behind it, causing color bleed. On hover, `backdrop-filter: none` is set to prevent this.
- **Opaque card body on hover:** `.game-card__body` must have a solid background on hover so the gradient glow only frames the card edges.

---

## LocalStorage Key Convention

`localStorage` is shared across the entire origin (all subprojects on `ai-lab`). To prevent key collisions across games, prototypes, and tools:

- **Always namespace keys:** `arcade.<game-name>.<key>`
- **Standard examples:**
  - `arcade.neon-snake.high-score`
  - `arcade.bit-breaker.best-score`
  - `arcade.tower-surge.save`
  - `arcade.grid-lock.progress`
- Always wrap `localStorage` access in `try...catch` blocks to protect against private browsing restrictions or storage quota errors.

---

## Starter Template & Workflows

Always start new arcade games by copying the starter template:
- **Starter Template:** [`.templates/arcade-game/`](../.templates/arcade-game/) (`index.html`, `style.css`, `game.js`).
- **Step-by-Step Workflow:** [`.agents/workflows/add-arcade-game.md`](../.agents/workflows/add-arcade-game.md).

---

## Graduating a Prototype from Sandbox to Arcade

When promoting an experimental prototype from `sandbox/` to `arcade/`:
1. Copy `.templates/arcade-game/` to `arcade/<game-name>/`.
2. Port validated mechanics into `game.js`, elevating visuals to the Arcade neon/cyberpunk aesthetic, Orbitron typography, and responsive HUD.
3. Namespace persistence keys using `arcade.<game-name>.<key>`.
4. Register the new game card in `arcade/index.html` and thumbnail gradient in `arcade/landing.css`.
5. If the game originated from a document in `_ideas/`, update its top status line to `Status: Shipped (arcade/<game-name>/)`. The idea doc stays in `_ideas/` as the canonical design record.


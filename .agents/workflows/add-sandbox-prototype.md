---
description: How to add a new experimental prototype to The Sandbox
---

# Add a New Sandbox Prototype

> **Scope:** This workflow applies specifically to interactive prototypes, tech demos, and experimental mechanics in the `sandbox/` directory.

## Steps

1. **Check for Design Specs**
   - Check the `_ideas/` folder at the repo root to see if an idea doc or GDD already exists for this concept. Review the core loop, state machines, and intended controls.

2. **Create the Prototype Directory**
   - Create a new kebab-case directory under `sandbox/` (e.g. `sandbox/gravity-puzzle/`).

3. **Create `index.html`**
   - Inside `sandbox/<prototype-name>/`, create `index.html`.
   - Include standard `<meta charset="UTF-8">` and viewport meta tags.
   - Set the `<title>` format: `Prototype Name — Sandbox`.
   - Add the back link to Sandbox:
     ```html
     <a href="../" class="back-link">← Back to Sandbox</a>
     ```
   - Import necessary CDN dependencies (e.g., Phaser, Pixi, Three.js, p5.js, Howler.js).
   - Keep styles in a local `style.css` or concise `<style>` block. Single-file prototypes (HTML + `<style>` + `<script>` combined in `index.html`) are completely allowed for quick tests.

4. **Implement the Prototype Logic**
   - For rapid experiments or single-file prototypes, write script logic directly in `<script>` tags or a single `main.js`/`game.js`.
   - For larger prototypes with entities, states, or UI, split into focused files (e.g. `gameState.js`, `entities.js`, `ui.js`) loaded via `<script>` tags.

5. **Register Card in `sandbox/index.html`**
   - Open `sandbox/index.html`.
   - Add a card inside `<div class="prototype-grid">`:
     ```html
     <a href="<prototype-name>/" class="prototype-card">
       <div class="prototype-card__content">
         <h2 class="prototype-card__title">Prototype Name</h2>
         <p class="prototype-card__desc">Short description of mechanics or hypothesis being tested.</p>
         <span class="prototype-card__cta">Play<span class="prototype-card__cta-arrow">→</span></span>
       </div>
     </a>
     ```

6. **Verify Navigation & Gameplay**
   - Test locally with `npx -y serve -l 3000` or `python3 -m http.server 3000`.
   - Verify that clicking "← Back to Sandbox" takes you back to `sandbox/index.html`, and from there back to AI Lab.

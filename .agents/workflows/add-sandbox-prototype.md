---
description: How to add a new experimental prototype to The Sandbox
---

# Add a New Sandbox Prototype

> **Scope:** This workflow applies specifically to interactive prototypes, tech demos, and experimental mechanics in the `sandbox/` directory.

## Steps

1. **Check for Design Specs**
   - Check the `_ideas/` folder at the repo root to see if an idea doc or GDD already exists for this concept. Review the core loop, state machines, and intended controls.
   - If an idea doc exists, update its status line at the top to `Status: Prototyping (sandbox/<prototype-name>/)`.

2. **Scaffold the Starter Template (or Create Single-File Prototype)**
   - Run `./scripts/new-prototype.sh <prototype-name>` (or copy `.templates/sandbox-prototype/` to `sandbox/<prototype-name>/` with a kebab-case directory name, e.g. `sandbox/gravity-puzzle/`).
   - *Alternative:* For rapid proof-of-concepts or game jams, single-file prototypes (`index.html` containing inline `<style>` and `<script>`) are completely allowed and encouraged.

3. **Customize Prototype Files**
   - `index.html`: Update `<title>` format (`<Prototype Name> — Sandbox`), `<meta name="description">`, and prototype title in the header. Ensure back link points to `../` (`← Back to Sandbox`).
   - `style.css`: Clean, theme-agnostic styling suited to the prototype (avoid copying arcade Orbitron/neon glow unless intentionally testing that style).
   - `main.js`: Implement experimental mechanics, canvas loop, or import CDN libraries (e.g., Phaser, Pixi, Three.js, p5.js, Howler.js).

4. **Register Card in `sandbox/index.html`**
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

5. **Verify Locally & Validate**
   - Test locally with `./scripts/serve.sh` (or `npx -y serve -l 3000` / `python3 -m http.server 3000`).
   - Run `python3 scripts/check.py` to verify architecture, links, and metadata.
   - Complete the Definition of Done checklist below.


## Definition of Done

Before marking the task complete, verify each item:

- [ ] **Repository validator passes:** Run `python3 scripts/check.py` with zero errors.
- [ ] **Starter template copied or single-file prototype created:** Built from `.templates/sandbox-prototype/` or concise single-file `index.html`.
- [ ] **Landing page card registered:** Card markup added inside `<div class="prototype-grid">` in `sandbox/index.html`.
- [ ] **Relative links verified:**
  - Back link (`href="../"`) navigates to `sandbox/index.html`.
  - Local assets use relative paths (`./style.css`, `./main.js`).
  - No domain-root absolute paths (`href="/..."`, `src="/..."`).
- [ ] **Page metadata complete:**
  - `<title>` matches `<Prototype Name> — Sandbox`.
  - `<meta name="description">` is present and descriptive.
  - Viewport `<meta>` tag is present and responsive.
- [ ] **Theme-agnostic & isolated:**
  - Styling is tailored to the prototype, avoiding accidental arcade styling (no Orbitron / neon glow defaults).
  - No cross-project asset leaks (does not import `../arcade/styles.css` or root `styles.css`).
  - No CSS `@import` used for fonts.
- [ ] **Idea doc status updated:**
  - If originating from `_ideas/`, document status line updated to `Status: Prototyping (sandbox/<prototype-name>/)`.
- [ ] **Clean console:**
  - No JavaScript runtime errors, unhandled exceptions, or missing asset 404s in the browser devtools.
- [ ] **Mobile viewport & responsive check:**
  - Layout scales properly and interactive controls are usable on mobile and desktop viewports.

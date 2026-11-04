# The Sandbox — Agent Instructions

These instructions apply when creating or modifying prototypes within the `sandbox/` directory.

## Purpose & Scope

The Sandbox is an incubator for experimental mechanics, rapid interactive prototypes, game design tests, and tech demos. 

Unlike **The Arcade** (which demands a unified retro-neon theme, Orbitron font, and arcade headers), **The Sandbox is theme-agnostic**:
- Prototypes should prioritize testing core gameplay loops, mechanics, controls, or systems over visual finish.
- Styling should be clean, focused, and suited to the specific prototype's needs.

---

## Core Rules

1. **Static-Only** — Pure client-side static hosting. No backend servers, no server-side APIs, no databases.
2. **No Package Managers** — Do not use `npm`, `yarn`, or `pnpm`. Load game libraries (Phaser, Three.js, PixiJS, Matter.js, p5.js, Howler.js, etc.) via CDN `<script>` or `<link>` tags.
3. **Subpath Safety & Relative Paths** — Always use relative links:
   - Sibling assets: `./style.css`, `./game.js`
   - Back to Sandbox: `../`
4. **Self-Contained** — Keep all assets, styles, and logic within the prototype folder (`sandbox/<prototype-name>/`). Do not import stylesheets from `arcade/` or the root `styles.css`.

---

## Relationship to `_ideas/`

Many prototypes in the sandbox originate from design documents located in the `_ideas/` directory at the repository root:
- Check `_ideas/` for relevant design notes, economy spreadsheets, or game design documents (GDDs) before building or updating a prototype.
- When creating a prototype based on an idea doc, review the core mechanics and player verbs outlined in the doc.

---

## Prototype Page Conventions

Each prototype (`sandbox/<prototype-name>/index.html`) should:

1. Be fully self-contained within its folder.
2. Include standard HTML5 meta tags (`<meta charset="UTF-8">`, viewport).
3. Include a descriptive `<title>`: `Prototype Name — Sandbox`.
4. Include a back navigation link to Sandbox:
   ```html
   <a href="../" class="back-link">← Back to Sandbox</a>
   ```
5. Split complex logic into modular JS files if needed (e.g., `gameState.js`, `entities.js`, `spawner.js`).

---

## Registering Prototypes in `sandbox/index.html`

Whenever a new prototype is created, a card **must** be added to `sandbox/index.html` inside `<div class="prototype-grid">`:

```html
<a href="<prototype-name>/" class="prototype-card">
  <div class="prototype-card__content">
    <h2 class="prototype-card__title">Prototype Name</h2>
    <p class="prototype-card__desc">One or two sentences describing the mechanics or systems being tested.</p>
    <span class="prototype-card__cta">Play<span class="prototype-card__cta-arrow">→</span></span>
  </div>
</a>
```

See `.agents/workflows/add-sandbox-prototype.md` for the step-by-step checklist.

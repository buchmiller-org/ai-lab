# The Sandbox — Agent Instructions

These instructions apply when creating or modifying prototypes within the `sandbox/` directory.

## Purpose & Scope

The Sandbox is an incubator for experimental mechanics, rapid interactive prototypes, game design tests, and tech demos. 

Unlike **The Arcade** (which demands a unified retro-neon theme, Orbitron font, and arcade headers), **The Sandbox is theme-agnostic**:
- Prototypes should prioritize testing core gameplay loops, mechanics, controls, or systems over visual finish.
- Styling should be clean, focused, and suited to the specific prototype's needs.

---

## Rules & Inheritance

The Sandbox **inherits all universal rules from root [`AGENTS.md`](../AGENTS.md)** (Static-Only, No Package Managers for project dependencies or build tooling, Subpath Safety / Relative Paths Only, Self-Contained Isolation).

Sandbox-specific additions:
- **Theme-Agnostic:** Prototypes are not bound to any arcade aesthetic, Orbitron font, or neon glow borders. Prioritize testing core gameplay loops, mechanics, controls, or systems with clean, purposeful styling.
- **Strict Isolation:** Prototypes must never import stylesheets or scripts from `arcade/` or root `styles.css`. All assets must reside within the prototype directory or load via CDN.

---

## Relationship to `_ideas/`

Many prototypes in the sandbox originate from design documents located in the `_ideas/` directory at the repository root:
- Check `_ideas/` for relevant design notes, economy spreadsheets, or game design documents (GDDs) before building or updating a prototype.
- When creating a prototype based on an idea doc, review the core mechanics and player verbs outlined in the doc.

---

## Prototype Conventions & Structure

Each prototype (`sandbox/<prototype-name>/index.html`) should:

1. **Be self-contained** within its folder (`sandbox/<prototype-name>/`).
2. **Structure flexibility (Single-file vs. Multi-file):**
   - **Single-file prototypes are fully allowed** and encouraged for fast proof-of-concepts, game jams, or isolated mechanics experiments (e.g., `castle-siege` and `optics/*`, where HTML, `<style>`, and `<script>` are in one `index.html`).
   - **Multi-file prototypes** (`index.html`, `style.css`, and modular JS files like `gameState.js`, `entities.js`, `spawner.js`) are recommended when mechanics grow in scope or complexity (e.g., `tartarus`).
3. Include standard HTML5 meta tags (`<meta charset="UTF-8">`, responsive viewport).
4. Include a descriptive `<title>`: `Prototype Name — Sandbox`.
5. Include a back navigation link to Sandbox:
   ```html
   <a href="../" class="back-link">← Back to Sandbox</a>
   ```

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

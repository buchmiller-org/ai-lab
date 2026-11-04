# AI Lab — Agent Instructions

## Repository Identity & Architecture

`ai-lab` is a multi-project static website deployed at a subpath: `<domain>/ai-lab/`.
It serves as a parent hub for diverse, independent web experiments, tools, visualizers, prototypes, and games.

### Project Taxonomy

- **`arcade/` (The Arcade):** A suite of retro browser arcade games sharing a cyberpunk/neon aesthetic, Orbitron typography, and game card grid. **See [`arcade/AGENTS.md`](arcade/AGENTS.md) and [`.agents/workflows/add-arcade-game.md`](.agents/workflows/add-arcade-game.md).**
- **`sandbox/` (The Sandbox):** Experimental game mechanics, interactive prototypes, and tech demos in active development. **See [`sandbox/AGENTS.md`](sandbox/AGENTS.md) and [`.agents/workflows/add-sandbox-prototype.md`](.agents/workflows/add-sandbox-prototype.md).**
- **`_ideas/` (Design Docs & Specs):** Game design documents (GDDs), feature specs, and mechanics notes. Check here before starting a prototype if an idea document exists.
- **`tools/`, `apps/`, or new project directories:** Standalone utilities, visualizers, dashboards, calculators, and creative coding experiments. Start non-game pages from [`.templates/tool/index.html`](.templates/tool/index.html).

---

## Universal Rules for All Projects

1. **Static-Only**
   - Pure client-side static hosting.
   - No backend servers, no server-side APIs, no databases, no server-side environment secrets.

2. **No Package Managers**
   - Do **not** use `npm`, `yarn`, or `pnpm` to install packages or build tools.
   - Use CDN imports (`<script>` or `<link>` tags via unpkg, jsdelivr, cdnjs, etc.) for any external libraries or CSS frameworks.

3. **Subpath Safety — Relative Paths Only**
   - This site is served under `/ai-lab/`. **NEVER use domain-root absolute paths** like `<a href="/arcade/">`, `<script src="/main.js">`, or `<link href="/styles.css">`. Those resolve to `<domain>/` instead of `<domain>/ai-lab/` and break navigation in production.
   - Always use relative paths:
     - Root-level pages link to subdirectories: `href="arcade/"`, `href="sandbox/"`.
     - Subprojects link back to AI Lab: `href="../"`.
     - Sibling assets: `href="./style.css"`, `src="./app.js"`.

4. **Self-Contained & Isolated (No Cross-Project Asset Leaks)**
   - Every subproject must be completely self-contained within its own folder.
   - Never import stylesheets or scripts from sibling directories (e.g., a tool or sandbox prototype should never link to `../arcade/styles.css` or root `styles.css`).

---

## Project Independence & Anti-Patterns (Crucial)

When creating or modifying pages outside of `arcade/`, **do NOT copy patterns from `arcade/`**:

- ⛔ **Do NOT default to Orbitron or cyberpunk glow aesthetics.** Orbitron and dark neon glowing borders are exclusive to The Arcade. Non-arcade pages, tools, and visualizers should choose typography and visual styling appropriate to their own concept (e.g., system fonts, Inter, Roboto, Tailwind CSS, or clean modern CSS).
- ⛔ **Do NOT add "← Back to Arcade" to non-arcade projects.**
  - If a page is inside `arcade/<game>/`: link back to `../` with "← Back to Arcade".
  - If a page is inside `sandbox/<project>/`: link back to `../` with "← Back to Sandbox".
  - If a page is an independent tool or experiment: link back to AI Lab with "← Back to AI Lab" (`href="../"` or appropriate relative path).
- ⛔ **Do NOT add non-arcade projects to `arcade/index.html`.** Only add projects to `arcade/index.html` if they belong to The Arcade game suite.
- ⛔ **Do NOT replicate the arcade card grid or hover filters** unless specifically building for The Arcade.

---

## Designing New Pages & Standalone Projects

When the user asks for a new webpage, tool, or experiment:
1. **Identify the scope:** Ask or infer if it belongs in `arcade/` (arcade game), `sandbox/` (prototype), or a new independent folder (e.g. `tools/<tool-name>/` or `<concept-name>/`).
2. **Start with the right baseline:**
   - Standalone tools, utilities, or visualizers: Start from [`.templates/tool/index.html`](.templates/tool/index.html).
   - Prototypes: Refer to [`sandbox/AGENTS.md`](sandbox/AGENTS.md) and check `_ideas/`.
   - Arcade games: Refer to [`arcade/AGENTS.md`](arcade/AGENTS.md).
3. **Registering on the Root Hub (`index.html`):**
   - If introducing a new top-level project category (e.g., `tools/`), update the root [index.html](index.html) by replacing the placeholder card (`<div class="project-card project-card--placeholder">`) or adding a new `<a class="project-card">` link.

---

## Local Development

To serve the site locally, run the following from the project root:

```sh
cmd /c "npx -y serve -l 3000"
```

The site will be available locally at `http://localhost:3000/`.

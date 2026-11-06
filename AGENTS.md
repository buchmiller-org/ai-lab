# AI Lab — Agent Instructions

## Repository Identity & Architecture

`ai-lab` is a multi-project static website deployed at a subpath: `<domain>/ai-lab/`.
It serves as a parent hub for diverse, independent web experiments, tools, visualizers, prototypes, and games.

### Project Taxonomy

- **`arcade/` (The Arcade):** A suite of retro browser arcade games sharing a cyberpunk/neon aesthetic, Orbitron typography, and game card grid. **See [`arcade/AGENTS.md`](arcade/AGENTS.md) and [`.agents/workflows/add-arcade-game.md`](.agents/workflows/add-arcade-game.md).**
- **`sandbox/` (The Sandbox):** Experimental game mechanics, interactive prototypes, and tech demos in active development. **See [`sandbox/AGENTS.md`](sandbox/AGENTS.md) and [`.agents/workflows/add-sandbox-prototype.md`](.agents/workflows/add-sandbox-prototype.md).**
- **`_ideas/` (Design Docs & Specs):** Game design documents (GDDs), feature specs, and mechanics notes. Check here before starting a prototype if an idea document exists.
- **`tools/` (Tools & Utilities):** Standalone utilities, visualizers, dashboards, calculators, and creative coding experiments. Start non-game pages from [`.templates/tool/index.html`](.templates/tool/index.html).

---

## Universal Rules for All Projects

1. **Static-Only**
   - Pure client-side static hosting.
   - No backend servers, no server-side APIs, no databases, no server-side environment secrets.

2. **No Package Managers for Project Dependencies / Build Tooling**
   - Do **not** use `npm`, `yarn`, or `pnpm` to install project dependencies or build tools (no `package.json`, `node_modules/`, bundlers, or compilation steps in the repo).
   - Use CDN imports (`<script>` or `<link>` tags via unpkg, jsdelivr, cdnjs, etc.) for any external libraries or CSS frameworks.
   - Using one-off commands like `npx -y serve` or `python3 -m http.server` for local development preview is completely fine, provided no dependency files or lockfiles are generated or committed.

3. **Subpath Safety — Relative Paths Only**
   - This site is served under `/ai-lab/`. **NEVER use domain-root absolute paths** like `<a href="/arcade/">`, `<script src="/main.js">`, or `<link href="/styles.css">`. Those resolve to `<domain>/` instead of `<domain>/ai-lab/` and break navigation in production.
   - Always use relative paths:
     - Root-level pages link to subdirectories: `href="arcade/"`, `href="sandbox/"`.
     - Subprojects link back to AI Lab: `href="../"`.
     - Sibling assets: `href="./style.css"`, `src="./app.js"`.

4. **Self-Contained & Isolated (No Cross-Project Asset Leaks)**
   - Every subproject must be completely self-contained within its own folder.
   - Never import stylesheets, scripts, or assets across sibling project suites (e.g., a tool or sandbox prototype should never link to `../arcade/styles.css` or root `styles.css`).
   - **Exception:** Subprojects within a suite may import that suite's shared stylesheet if one exists (specifically, games inside `arcade/<game>/` link to their suite's shared `../styles.css`). Sandbox prototypes and standalone tools do not share a suite stylesheet and remain strictly self-contained.

---

## Designing New Pages & Standalone Projects

When the user asks for a new webpage, tool, prototype, or game, use this decision table:

| What you are building | Location | Visual styling | Template / Baseline | Back link | Registration |
| --- | --- | --- | --- | --- | --- |
| **Retro / arcade game** | `arcade/<game-name>/` | Neon / cyberpunk glow, Orbitron + Inter, canvas/game loop | Existing games or `.templates/` (see [`arcade/AGENTS.md`](arcade/AGENTS.md)) | `← Back to Arcade` (`href="../"`) | Add card to `arcade/index.html` + thumb gradient in `arcade/landing.css` |
| **Gameplay prototype / tech demo** | `sandbox/<prototype-name>/` | Theme-agnostic, mechanic-focused; single-file prototypes allowed | [`sandbox/AGENTS.md`](sandbox/AGENTS.md) (check `_ideas/` for GDD) | `← Back to Sandbox` (`href="../"`) | Add card to `sandbox/index.html` |
| **Standalone tool / utility / visualizer** | `tools/<tool-name>/` | Clean modern UI (system fonts, Inter, Tailwind via CDN); no arcade neon | [`.templates/tool/index.html`](.templates/tool/index.html) | `← Back to AI Lab` (`href="../../"` or relative path) | If introducing `tools/`, replace placeholder card in root [`index.html`](index.html) |

### Registering `tools/` on the Root Hub (`index.html`)

When the first standalone tool in `tools/` is introduced, update the root [index.html](index.html) by replacing the placeholder card:

```html
<!-- Replace this placeholder: -->
<div class="project-card project-card--placeholder delay-3">
  <div class="project-card__icon">🛠️</div>
  <h3 class="project-card__title">Future Concept</h3>
  <p class="project-card__desc">Reserving this space for a future AI tooling experiment or interactive visualizer.</p>
</div>

<!-- With an active category link card: -->
<a href="tools/" class="project-card delay-3">
  <div class="project-card__icon">🛠️</div>
  <h3 class="project-card__title">Tools & Utilities</h3>
  <p class="project-card__desc">Interactive calculators, visualizers, and developer utilities.</p>
  <span class="project-card__cta">Explore <span aria-hidden="true">→</span></span>
</a>
```

### Anti-Patterns to Avoid

When creating or modifying pages outside of `arcade/`, **do NOT copy patterns from `arcade/`**:

- ⛔ **Do NOT default to Orbitron or cyberpunk glow aesthetics.** Orbitron and dark neon glowing borders are exclusive to The Arcade. Non-arcade pages, tools, and visualizers should choose typography and visual styling appropriate to their own concept (e.g., system fonts, Inter, Roboto, Tailwind CSS, or clean modern CSS).
- ⛔ **Do NOT add "← Back to Arcade" to non-arcade projects.**
  - If a page is inside `arcade/<game>/`: link back to `../` with "← Back to Arcade".
  - If a page is inside `sandbox/<project>/`: link back to `../` with "← Back to Sandbox".
  - If a page is an independent tool or experiment: link back to AI Lab with "← Back to AI Lab" (`href="../"` or appropriate relative path).
- ⛔ **Do NOT add non-arcade projects to `arcade/index.html`.** Only add projects to `arcade/index.html` if they belong to The Arcade game suite.
- ⛔ **Do NOT replicate the arcade card grid or hover filters** unless specifically building for The Arcade.

---

## Local Development

To serve the site locally, run one of the following cross-platform commands from the project root:

```sh
npx -y serve -l 3000
# or
python3 -m http.server 3000
```

The site will be available locally at `http://localhost:3000/`.

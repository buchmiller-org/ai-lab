# AI Lab — Agent Instructions

## Repository Identity & Architecture

`ai-lab` is a multi-project static website deployed at a subpath: `<domain>/ai-lab/`.
It serves as a parent hub for diverse, independent web experiments, tools, visualizers, prototypes, and games.

### Project Taxonomy

- **`arcade/` (The Arcade):** A suite of retro browser arcade games sharing a cyberpunk/neon aesthetic, Orbitron typography, and game card grid. **All arcade-specific conventions live in [`arcade/AGENTS.md`](arcade/AGENTS.md).**
- **`sandbox/` (The Sandbox):** Experimental game mechanics, interactive prototypes, and tech demos in active development.
- **`tools/`, `apps/`, or new project directories:** Standalone utilities, visualizers, dashboards, calculators, and creative coding experiments.

---

## Universal Rules for All Projects

1. **Static-Only**
   - Pure client-side static hosting.
   - No backend servers, no server-side APIs, no databases, no server-side environment secrets.

2. **No Package Managers**
   - Do **not** use `npm`, `yarn`, or `pnpm` to install packages or build tools.
   - Use CDN imports (`<script>` or `<link>` tags via unpkg, jsdelivr, cdnjs, etc.) for any libraries or CSS frameworks.

3. **Subpath Safety — Relative Paths Only**
   - This site is served under `/ai-lab/`. **NEVER use domain-root absolute paths** like `<a href="/arcade/">`, `<script src="/main.js">`, or `<link href="/styles.css">`. Those resolve to `<domain>/` instead of `<domain>/ai-lab/` and break navigation in production.
   - Always use relative paths:
     - Root-level pages link to subdirectories: `href="arcade/"`, `href="sandbox/"`.
     - Subprojects link back to AI Lab: `href="../"`.
     - Sibling assets: `href="./style.css"`, `src="./app.js"`.

---

## Project Independence & Anti-Patterns (Crucial)

When creating or modifying pages outside of `arcade/`, **do NOT copy patterns from `arcade/`**:

- ⛔ **Do NOT default to Orbitron or cyberpunk glow aesthetics.** Orbitron and dark neon glowing borders are exclusive to The Arcade. Non-arcade pages, tools, and visualizers should choose typography and visual styling appropriate to their own concept (e.g., system fonts, Inter, Roboto, Tailwind CSS, or clean modern CSS).
- ⛔ **Do NOT add "← Back to Arcade" to non-arcade projects.**
  - If a page is inside `arcade/<game>/`: link back to `../` with "← Back to Arcade".
  - If a page is inside `sandbox/<project>/`: link back to `../` with "← Back to Sandbox" or "← Back to AI Lab".
  - If a page is an independent tool or experiment: link back to AI Lab with "← Back to AI Lab" (`href="../"` or appropriate relative path).
- ⛔ **Do NOT add non-arcade projects to `arcade/index.html`.** Only add projects to `arcade/index.html` if they belong to The Arcade game suite.
- ⛔ **Do NOT replicate the arcade card grid or hover filters** unless specifically building for The Arcade.

---

## Designing New Pages

When the user asks for a new webpage, tool, or experiment:
1. **Identify the scope:** Ask or infer if it belongs in `arcade/` (arcade game), `sandbox/` (prototype), or a new independent folder (e.g. `tools/<tool-name>/` or `<concept-name>/`).
2. **Choose an appropriate design language:**
   - Utilities/tools: Clean, readable, responsive, high-contrast, modern UI (e.g., system fonts, Pico.css or Tailwind via CDN).
   - Visualizers/experiments: Minimalist chrome, focused canvas or WebGL viewport.
   - Arcade games: Refer to [`arcade/AGENTS.md`](arcade/AGENTS.md).
3. **Keep each project self-contained:** Keep scripts, stylesheets, and assets inside that project's folder or load dependencies via CDN.

---

## Local Development

To serve the site locally, run the following from the project root:

```sh
cmd /c "npx -y serve -l 3000"
```

The site will be available locally at `http://localhost:3000/`.

# AI Lab

A collection of web projects built with the help of AI.

🌐 **Live Site:** [https://buchmiller-org.github.io/ai-lab/](https://buchmiller-org.github.io/ai-lab/)

> **Frameworks & Libraries Are Welcome** — You may use external frameworks and libraries (CSS frameworks, game engines, utility libraries, etc.) as long as they are imported directly into the page via `<script>` or `<link>` tags from a CDN. No package managers, bundlers, or build systems are used for project code. Running zero-config dev preview servers (like `npx serve` or `python3 -m http.server`) is welcomed, provided no dependency files or lockfiles are committed to the repo.

## Projects

### 🕹️ [The Arcade](https://buchmiller-org.github.io/ai-lab/arcade/) (`arcade/`)

A collection of retro browser arcade games sharing a cyberpunk/neon aesthetic, Orbitron typography, and an interactive game card grid.

### 🧪 [The Sandbox](https://buchmiller-org.github.io/ai-lab/sandbox/) (`sandbox/`)

Experimental game mechanics, rapid interactive prototypes, and tech demos in active development.

## Running Locally

Run one of the following cross-platform commands from the project root to serve the site locally at `http://localhost:3000/`:

```sh
npx -y serve -l 3000
# or
python3 -m http.server 3000
```

## Project Structure

```
ai-lab/
├── .agents/
│   └── workflows/          # Step-by-step procedures for AI coding agents
├── .templates/
│   ├── arcade-game/        # Starter template for arcade games
│   ├── sandbox-prototype/  # Starter template for sandbox prototypes
│   └── tool/               # Starter template for standalone utilities
├── _ideas/                 # Game design documents (GDDs) & mechanics specs
├── arcade/
│   ├── AGENTS.md           # Instructions & conventions for arcade games
│   ├── index.html          # The Arcade landing page & game card grid
│   ├── styles.css          # Shared arcade suite stylesheet
│   ├── landing.css         # Arcade landing page styling & card themes
│   └── <game-name>/        # Each game in its own directory
│       ├── index.html
│       ├── style.css
│       └── game.js
├── sandbox/
│   ├── AGENTS.md           # Instructions & conventions for sandbox prototypes
│   ├── index.html          # The Sandbox landing page & prototype grid
│   ├── style.css           # Sandbox landing page styles
│   └── <project-name>/     # Each prototype in its own directory (single or multi-file)
├── 404.html                # Custom 404 page with dynamic subpath resolution
├── AGENTS.md               # Universal agent rules & project taxonomy
├── index.html              # AI Lab parent hub landing page
├── styles.css              # Root landing page styles
└── README.md               # Project documentation
```

## Contributing (for AI Agents)

See [AGENTS.md](AGENTS.md) for universal rules, architectural boundaries, and project taxonomy.
Check `.agents/workflows/` for step-by-step checklists and procedures specifically designed for AI agents adding arcade games or sandbox prototypes.

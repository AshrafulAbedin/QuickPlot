# QuickPlot

A web-based interactive graphing platform. Type a mathematical expression and it renders in real time — 2D curves on a canvas, 3D surfaces in WebGL.

**Course:** SWE 4404 – Software Project Lab II · **Group:** 09

---

## What's in the repo

QuickPlot is three separate web apps sharing one set of math packages:

| App | Port | What it does |
| --- | --- | --- |
| **Landing** | 5173 | Entry point — sign in / register, and launchers into the two graphers |
| **2D grapher** | 5174 | Cartesian, polar, parametric, implicit curves and point data |
| **3D grapher** | 5175 | Surface plots `z = f(x, y)` with orbit controls |

Development uses the landing origin at http://localhost:5173. Its Vite proxy serves
the graphers at `/2d/` and `/3d/`, keeping Firebase auth on the same origin.
All apps load the shared configuration from `code/.env`.

---

## Quick start

You need **Node 18+** and **pnpm**. Developed against Node 22.17 and pnpm 11.4.

```bash
git clone https://github.com/AshrafulAbedin/QuickPlot.git
cd QuickPlot/code          # note: all commands run from code/, not the repo root
pnpm install
pnpm dev
```

Then open **<http://localhost:5173>**.

`pnpm dev` starts all three apps at once. If you only want one:

```bash
pnpm dev:landing    # http://localhost:5173
pnpm dev:2d         # http://localhost:5174
pnpm dev:3d         # http://localhost:5175
```

There is **no build step** before running. The shared packages point `main` at their
TypeScript source, so Vite compiles them directly — `pnpm install` is all the setup there is.

> **If a dev server won't start**, it's almost always a port collision. All three configs use
> `strictPort: true`, so Vite fails outright rather than picking another port. Kill whatever is
> holding 5173–5175 instead of changing the port — the landing page's launcher buttons are
> hardcoded to 5174/5175 unless you set the env vars below.

---

## Commands

All from inside `code/`:

```bash
pnpm dev            # all three apps in parallel
pnpm -r build       # build every app and package
pnpm -r test        # Vitest across the workspace
pnpm -r lint        # lint everything
```

---

## Current status

### Working

**2D grapher** — Cartesian `y = f(x)`, polar `r = f(θ)`, parametric `(x(t), y(t))`, implicit
`f(x,y) = 0`, and point datasets. Derivative overlay, trace animation, and special points
(roots, extrema, intersections). Pan, zoom, double-click reset, DPR-aware canvas. Parameter
sliders auto-detected from your expression, with play/pause and a ×0.25–×4 speed control.
Canvas themes, share links (state encoded in the URL hash), copy-to-clipboard image export,
and JSON/CSV/TSV data import.

**3D grapher** — Surface plots with orbit controls, wireframe and axes toggles, a bounding-box
frame, scene themes, multiple surfaces at once, and JSON/CSV point-cloud import. A `? help`
button in the header holds a gallery of example surfaces and a syntax reference.

**Landing page** — Split layout with the auth screens on the dark half and the 2D / 3D / Tools
launchers on the light half.

### Authentication and storage

- **Authentication** — shared Firebase authentication supports Google sign-in and
  email/password service methods. Configure `VITE_FIREBASE_*` in `code/.env`.
- **Database** — Supabase stores 2D workspaces. Manual save/load restores equations,
  points, sliders, viewport and theme. JSON import/export and share/unshare are
  available in the workspace panel. Cloud share pages show a read-only summary.
  See [setup and verification](docs/supabase-setup.md).

### Not built yet

- **3D cloud storage** — 3D surfaces and point clouds currently use local state and hash links.
- **Chrome extension** — `apps/extension/` is an empty scaffold. Its `dev` and `build` scripts are
  deliberate no-ops so `pnpm -r build` doesn't fail on it.
- **Routing** — the landing and graphers are single pages; the optional `apps/web`
  app includes login, register and shared workspace routes.
- **CI** — `.github/` has no workflows.

---

## Project structure

```text
QuickPlot/
├── code/                   # pnpm workspace root — run all commands from here
│   ├── apps/
│   │   ├── landing/        # marketing + auth entry point
│   │   ├── 2d/             # 2D grapher
│   │   ├── 3d/             # 3D grapher
│   │   └── extension/      # Chrome MV3 scaffold (empty)
│   └── packages/
│       ├── core/           # parser, evaluator, dataset parsing (pure logic, no React)
│       ├── renderer/       # 2D canvas drawing, viewport/zoom math
│       ├── types/          # shared TypeScript types
│       ├── core-3d/        # 3D expression parsing and evaluation
│       ├── renderer-3d/    # Three.js geometry, themes, bounding box
│       ├── types-3d/       # 3D shared types
│       └── config/         # shared eslint / prettier / tsconfig
├── docs/                   # design docs, proposal, report, presentation
└── README.md
```

**The rule of thumb:** `apps/` holds things you deploy, `packages/` holds things you import.
`packages/core*` must stay framework-free — no React, no DOM, no Three.js — so the same math can
be reused anywhere.

Import shared code through the workspace alias, never a deep relative path:

```ts
import { parseExpression } from '@quickplot/core';   // yes
import { parseExpression } from '../../../packages/core/src';  // no
```

---

## How it fits together

The whole app is one data flow:

```text
User types "y = sin(x)"
  → parser        compiles the string into a callable function   [packages/core/src/parser.ts]
  → toCurve()     wraps it into a PlotCurve                      [apps/2d/.../useEquations.ts]
  → renderer      samples the function and draws it              [packages/renderer/src/renderer-2d.ts]
```

The 3D app mirrors this with `@quickplot/core-3d` → `Renderer3D.tsx` → `@quickplot/renderer-3d`.

Parsing, numerical analysis, and drawing stay in separate layers. When adding features, keep them
there — `evaluator.ts` (roots, extrema, intersections) is a numerical-analysis utility and is
*not* part of the curve-drawing path above.

---

## Environment variables

For this combined branch, copy `code/.env.example` to `code/.env`. All three
Vite configurations set `envDir` to `code/`. Firebase and Supabase settings are
read from that file; secrets must not be committed. Use `VITE_URL_2D=/2d/` and
`VITE_URL_3D=/3d/` for the shared development origin. Supabase setup details are
in [docs/supabase-setup.md](docs/supabase-setup.md).

Anonymous plotting runs with the localhost defaults. Authentication and cloud
storage require the shared configuration. Never commit a `.env`; it is gitignored.

---

## Notes for contributors

A few things that aren't obvious from reading the code:

- **`core-3d` and `renderer-3d` are forks, not extensions.** They contain their own copies of the
  parser, evaluator, and 2D renderer that were branched from `core` and `renderer`. **A fix in
  `core` will not fix `core-3d`** — patch both, or consolidate them.
- **`apps/3d/src/features/{canvas-2d,equations,sliders}/` is dead code** — a leftover copy of the
  2D app that `apps/3d/src/App.tsx` never imports.
- **The 3D scene is Z-up.** Surface geometry stores the function's height on Z, so the camera sets
  `up: [0, 0, 1]`. Under Three.js's default Y-up the graph renders on its side.
- **Never use `eval()`** on user input — all expression parsing goes through mathjs.
- **Invalid expressions must degrade gracefully**, surfacing an inline error rather than crashing
  the canvas.
- **TypeScript is strict.** Add a Vitest test alongside any new function in `packages/core*` —
  it's pure logic and easy to cover.

---

## Branches

`main` stays stable. Work happens on a topic branch, merges into `Integration` for combined
testing, then into `main`.

| Branch | Scope |
| --- | --- |
| `Integration` | All three apps assembled and tested together |
| `Canvas` | Parser, evaluator, 2D rendering |
| `threed` | Three.js surfaces and the 3D engine |
| `Frontend` | UI, landing page, theming, share |
| `Database` | Auth and persistence |

Commit messages use `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.

First push of a new branch needs upstream tracking:

```bash
git push -u origin <branch>
```

---

## Tech stack

TypeScript (strict) · React 18 · Vite 5 · Tailwind CSS · mathjs · Three.js via
@react-three/fiber · Vitest · pnpm workspaces

The stack is intentionally lean. Don't add heavy dependencies (Redux, MUI, a router) without a
clear reason.

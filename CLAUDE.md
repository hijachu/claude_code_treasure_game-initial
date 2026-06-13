# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server at http://localhost:3000 (auto-opens browser)
npm run build     # production build → build/
```

No lint or test scripts are configured in this project.

## Architecture

This is a single-page React + TypeScript + Vite application. All game logic lives in **`src/App.tsx`** — there is intentionally no routing or additional page-level components.

### Game mechanics (`src/App.tsx`)
Three treasure boxes are rendered; one is randomly assigned the treasure at game start (`initializeGame`). Clicking a closed box opens it: +$100 for treasure, -$50 for skeleton. The game ends when the treasure box is found or all boxes are opened. State is three values: `boxes: Box[]`, `score: number`, `gameEnded: boolean`.

### Key directories
| Path | Contents |
|---|---|
| `src/assets/` | Chest images: `treasure_closed.png`, `treasure_opened.png`, `treasure_opened_skeleton.png`, `key.png` |
| `src/audios/` | Sound effects: `chest_open.mp3`, `chest_open_with_evil_laugh.mp3` |
| `src/results/` | `key_hover.png` (result overlay image) |
| `src/components/ui/` | shadcn/ui components (Radix UI wrappers) — treat as generated, avoid editing directly |
| `src/components/figma/` | Figma-exported components (`ImageWithFallback.tsx`) |

### Styling
Tailwind CSS v4 — the compiled output is inlined into `src/index.css`. Use Tailwind utility classes directly in JSX; there is no separate config file to edit. CSS custom properties for theming (`--background`, `--primary`, etc.) are defined in `src/styles/globals.css`.

### Path alias
`@` resolves to `src/` (configured in `vite.config.ts`).

### Animation
Uses `motion/react` (Motion library) for chest flip/scale animations and result reveals.

### Vite config note
`vite.config.ts` contains explicit version-pinned aliases for every dependency (e.g. `'vaul@1.1.2': 'vaul'`). This is intentional for the build environment — do not remove them.

# solid2-2048

A small 2048 clone built with SolidJS and Vite.

## Features

- 4x4 board
- Slide and merge logic for all four directions
- Random tile spawning with 90% `2` and 10% `4`
- Undo support
- Restart support
- Keyboard shortcuts for play

## Controls

- Move: `Arrow Keys` or `WASD`
- Undo: `U`
- Restart: `R`
- Buttons for undo and restart are also available in the UI

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```

Preview the production build:

```bash
pnpm preview
```

## Notes

- The game starts with one random tile.
- Undo steps back one full turn.
- Restart clears the board, history, and score, then spawns a new starting tile.

# TBH Companion

A web companion app for **TBH: Task Bar Hero**, the idle RPG by shigake.

This project fuses two existing fan tools — **tbh-copilot** (by shigake) and **giba-steam-market** (by lezards) — into a unified Next.js + TypeScript experience deployed on Vercel. All game data is processed **entirely in the browser** — no save file ever leaves your machine.

## Status

**Phase 1 — Foundation: DONE**

The full monorepo is implemented and ships three packages:

- **`@tbh/engine`** — the TBH optimization engine ported to TypeScript; verified by a 103-assertion oracle suite (Vitest)
- **`@tbh/game-data`** — vendored, typed game data with a code-split lazy loader
- **`apps/web`** — Next.js App Router + Tailwind CSS + shadcn/ui; a 100%-client-side save layer (Web Crypto decrypt + file picker + File System Access live-watch + demo mode); a `/lab` proof-of-life page that connects a real save and shows engine output

CI runs on GitHub Actions (Node 20, Vitest, Next.js build check).

## Project Structure

```
tbh-companion/
├── apps/
│   └── web/          # Next.js frontend (App Router)
├── packages/
│   ├── engine/       # TBH optimization engine (TypeScript port)
│   └── game-data/    # Vendored game data + types
├── turbo.json
├── tsconfig.base.json
└── pnpm-workspace.yaml
```

## Getting Started

Requires **Node 20** and **pnpm 10+**.

```bash
pnpm install        # install all workspace dependencies
pnpm test           # run the 103-assertion oracle suite
pnpm typecheck      # typecheck all packages
pnpm -F web dev     # start the Next.js dev server → open http://localhost:3000/lab
```

## Roadmap

Upcoming phases include:
- Market price proxy (Steam Community Market integration via giba-steam-market)
- Full UI tabs: Inventory, Market, Recommendations
- Vercel deployment pipeline

## Credits

- **shigake** — creator of TBH: Task Bar Hero and tbh-copilot
- **lezards** — creator of giba-steam-market

## License

MIT

## Disclaimer

This is an unofficial fan project. It is not affiliated with, endorsed by, or connected to Valve Corporation or the creators of TBH: Task Bar Hero in any official capacity. All game assets and trademarks belong to their respective owners.

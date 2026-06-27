# tbh-companion

A web companion app for **TBH: Task Bar Hero**, the idle RPG by shigake.

This project fuses two existing fan tools — **tbh-copilot** (by shigake) and **giba-steam-market** (by lezards) — into a unified Next.js + TypeScript experience deployed on Vercel.

## Status

**Fase 1 — Fundação** (in progress)

The monorepo scaffold, tooling, and project configuration are being established. Package workspaces (`apps/web`, `packages/engine`, `packages/game-data`) will be added in subsequent phases.

## Project Structure

```
tbh-companion/
├── apps/
│   └── web/          # Next.js frontend (Phase 2+)
├── packages/
│   ├── engine/       # Game logic & calculations (Phase 3+)
│   └── game-data/    # Static game data & types (Phase 3+)
├── turbo.json
├── tsconfig.base.json
└── pnpm-workspace.yaml
```

## Development

Requires Node 20 and pnpm 10+.

```bash
pnpm install
pnpm dev       # run all dev servers
pnpm build     # build all packages
pnpm test      # run all tests
pnpm typecheck # typecheck all packages
```

## Credits

- **shigake** — creator of TBH: Task Bar Hero and tbh-copilot
- **lezards** — creator of giba-steam-market

## Disclaimer

This is an unofficial fan project. It is not affiliated with, endorsed by, or connected to Valve Corporation or the creators of TBH: Task Bar Hero in any official capacity. All game assets and trademarks belong to their respective owners.

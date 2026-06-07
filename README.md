<h1 align="center">Lumen</h1>
<h3 align="center">The open-source documentation and wiki platform</h3>

<p align="center">
<a href="https://github.com/nebulora/lumen">
<img alt="License" src="https://img.shields.io/badge/license-proprietary-blue.svg"/>
</a>
<a href="https://github.com/nebulora/lumen/releases">
<img alt="Release" src="https://img.shields.io/github/release/nebulora/lumen.svg"/>
</a>
</p>

---

Lumen is a documentation and wiki platform built with **Angular 21** and **ASP.NET Core 10**. It features a block-based editor, real-time collaboration via SignalR, threaded comments, and deep customization.

No strings attached: no premium tiers, no hidden features. Just a clean, functional docs platform.

<strong>Want to get started?</strong><br/>
Run with Docker: `docker compose up -d` — the frontend is served at `http://localhost:6000`.

<strong>Something not working?</strong><br/>
Open an [issue](https://github.com/nebulora/lumen/issues) on GitHub.

<strong>Want to contribute?</strong><br/>
See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## Features

- **Block editor** — 14 content types: headings, paragraphs, lists, todos, callouts, code blocks (syntax highlighted), blockquotes, dividers, tables, images, and videos. Inline formatting for bold, italic, code, and links.
- **Collaboration** — Real-time viewer presence, threaded block-level and page-level comments with Markdown, emoji reactions, activity inbox, and granular share permissions.
- **Navigation** — Command palette with fuzzy search (Cmd+K), hierarchical tree navigation with drag-and-drop reorder, backlinks, favorites, and browser-style history.
- **Customization** — Dark/light theme, custom accent colors, configurable page widths, and emoji or custom image icons for pages and folders.

## Tech Stack

- **Frontend:** Angular 21.2 (standalone, zoneless), TypeScript 5.9, Angular Signals
- **Real-time:** SignalR (`@microsoft/signalr`)
- **Backend:** ASP.NET Core 10 (C#), Entity Framework Core, PostgreSQL 16
- **Auth:** ASP.NET Core Identity + JWT + OAuth (Microsoft, Facebook, GitHub, Twitter, Keycloak)
- **Build:** Angular CLI (esbuild), Docker / docker-compose

---

## Development

### Prerequisites

- Node.js 20+
- .NET 10 SDK
- Docker / docker-compose (optional)

### Setup

```bash
# Frontend
npm install
npm start           # :6000

# Backend
cd src-backend/Lumen.API
dotnet run          # :6002

# Or full stack with Docker
docker compose up -d
```

### Commands

| Command | Action |
|---------|--------|
| `npm start` | Start Angular dev server |
| `npm run build` | Production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run lint` | Lint with Prettier |
| `npm run format` | Format code |

---

## License

Proprietary. See [LICENSE](LICENSE) for details.

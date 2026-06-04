# Lumen API seed data

Bundled JSON loaded automatically when the API starts (`DataSeeder.Initialize`).

| File | Purpose |
|------|---------|
| `pages-catalog.json` | All wiki pages (blocks + metadata) |
| `navigation-tree.json` | Acme workspace sidebar |
| `navigation-tree.personal.json` | Personal workspace sidebar |
| `navigation-tree.lab.json` | Acme Labs workspace (empty tree) |
| `comments-seed.json` | Block and page comments |
| `reactions-seed.json` | Page emoji reactions |
| `inbox-seed.json` | Inbox notifications |
| `workspaces-seed.json` | Workspace list |

Users and default preferences for `MC` are defined in `Services/DataSeeder.cs` on first database creation.

To reset: drop and recreate the `lumen` database (or `docker compose down -v`), then restart the API.

**Sign-in (local dev):** any seeded user, password `lumen`.

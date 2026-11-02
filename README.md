# AGENTGATE Studio

Phase 1 is in progress. The first slice creates, lists, and reopens local projects. Model execution, shared context, RAG, security scanning, and evaluations are not implemented yet.

## Run locally

Use Node.js 24 (`nvm use`) and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Create a project, return to the workspace, then reopen it. Restart the application to verify the record persists.

By default SQLite lives in `~/.agentgate/agentgate.sqlite`. Set `AGENTGATE_DATA_DIR` to an absolute directory to use separate data. The database is private to its OS user (mode 0600); newly created storage directories use mode 0700. SQLite is not encrypted. Do not store secrets in project names. Runtime files are not application source and must not be committed.

Development and production start scripts bind to loopback. This is a single-user local application, without remote-user authentication; do not expose it on a public interface. Project mutations explicitly require a matching loopback Origin and Host, in addition to Next.js server-action checks. No arbitrary file operations, agent tools, destructive actions, or provider credential entry are enabled.

## Verify

```sh
npm run check
npm run start
```

`check` runs strict TypeScript checks, lint, formatting checks, controller integration tests using real temporary SQLite databases, and the production Next.js build. GitHub Actions runs the same command without model credentials. This initial workflow is a foundation check, not yet the Phase 1 security evaluation suite.

See [implementation plan](docs/IMPLEMENTATION_PLAN.md), [architecture](docs/ARCHITECTURE.md), and the supplied [Phase 1 specification](docs/phase1.md).

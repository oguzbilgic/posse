# Changelog

## Unreleased (fork)

### Features
- **Rubrics + evals** — Define reusable grading rubrics and trigger a model-based judge against any session's transcript. Adds posse's first local persistence (SQLite, `rubrics` + `eval_runs` tables) since everything else is fetched live from Anthropic.

## v0.2.0 - 2026-04-25

### Features
- **Models** — Load Claude model choices from Anthropic's Models API instead of a stale hardcoded dropdown.
- **MCP servers** — Configure remote MCP servers on agents and automatically attach matching MCP toolsets.
- **Environments** — Create execution environments with package/network config from the UI.
- **Memory access** — Attach memory stores to new sessions as read-only or read-write.

### Fixes
- Removed unsupported custom instructions from session creation payloads; instructions belong on agents, not sessions.
- Fixed memory file edits by using Anthropic's POST-based memory update endpoint.

## v0.1.0

Initial release.

### Features
- **Agent management** — List, create, edit, archive agents; view version history; archived agents shown in collapsible sidebar group
- **Sessions** — Create sessions with environment selection, list per-agent sessions, send messages, poll for agent responses
- **Chat UI** — Render agent messages, tool calls (`bash`, `write`, etc.), tool results with syntax highlighting and markdown
- **Memory stores** — Browse memory stores, view individual memories, graceful fallback if API tier doesn't support it
- **Environments** — List and select execution environments, detail modal with full config
- **Docker** — Production Dockerfile with standalone Next.js output (`ghcr.io/oguzbilgic/posse`)
- **Server-side API key** — Anthropic key stays in `.env.local`, proxied through Next.js API route, never exposed to browser

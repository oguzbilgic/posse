# posse

A web UI for [Anthropic Managed Agents](https://docs.anthropic.com/en/docs/agents/managed-agents), with rubrics and model-based evals layered on top.

> This is a fork of [oguzbilgic/posse](https://github.com/oguzbilgic/posse). Upstream stays a zero-backend, stateless proxy on principle — this fork intentionally diverges from that to add its own local rubrics/eval store, so it's not intended to be merged back.

Anthropic ships the best agent infrastructure — sandboxed environments, persistent memory, tool use, multi-agent orchestration — but no UI. You're stuck with curl and the API console.

Posse gives you the missing interface: create agents, run sessions, manage memory stores, and watch your agents work — all from a browser. This fork adds a way to define rubrics and trigger a model-based judge against any session's transcript.

![posse](public/screenshot.png)

## What you get

- **Agent management** — Create, edit, archive, and version agents with different models (Sonnet, Opus, Haiku)
- **Sessions** — Start sessions, send messages, watch tool calls and code execution in real time
- **Memory stores** — Browse and edit persistent memory that agents carry across sessions
- **Environments** — Switch between execution environments with different tools and configurations
- **Multi-agent** — Run multiple agents side by side, each with their own sessions and memory
- **Rubrics + evals** — Define reusable grading rubrics and trigger a model-based judge against any session's transcript, on demand

## Quick start

```bash
docker run -p 3000:3000 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -v posse-data:/app/data \
  ghcr.io/oguzbilgic/posse:latest
```

The volume mount keeps your rubrics and eval history across container restarts — without it, they live only in the container's ephemeral filesystem.

Open [http://localhost:3000](http://localhost:3000).

## From source

```bash
git clone https://github.com/<you>/posse.git
cd posse
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm install && npm run dev
```

Run the test suite with `npm test`.

## How it works

Posse is a lightweight Next.js app that proxies requests to the [Anthropic API](https://docs.anthropic.com/en/docs/agents/managed-agents). Your API key stays server-side — never exposed to the browser.

Everything about agents, sessions, memory, and vaults still comes straight from the Anthropic API — posse doesn't cache or duplicate any of it. The one exception is this fork's rubrics/eval-runs data, which lives in a local SQLite file (`data/posse.sqlite3` by default, override with `POSSE_DB_PATH`) since Anthropic has no API surface for that today.

### Stack

- Next.js 16 + React 19
- TypeScript + Tailwind CSS
- better-sqlite3 for the local rubrics/eval-runs store
- Zustand for client state
- Marked + highlight.js for markdown/code rendering
- Vitest for tests

## Evals

1. Create a **rubric** from the sidebar (Rubrics): judge instructions plus a list of named criteria.
2. Open any session and click **Eval**, pick the rubric and a **judge agent** (any existing agent — start with a generic one, swap in a fine-tuned judge later), then **Run Eval**.
3. Posse serializes the full transcript (including tool calls and thinking, not just the chat view), sends it to a fresh session against the judge agent along with the rubric, and polls for a verdict the same way it polls chat sessions.
4. The verdict — score, pass/fail, rationale, per-criterion notes — shows up in the eval's run history once the judge responds.

Rubrics and eval runs are the only state posse itself stores; everything else is still fetched live from Anthropic.

## Why

Anthropic's managed agents are powerful but invisible. You define agents in JSON, create sessions via API, and parse events from streams. It works, but you can't *see* what's happening.

With posse, you get a real workspace: watch an agent write code, see it execute bash commands, check what it stored in memory, start a new session with a different environment. The kind of feedback loop you need when building with agents.

## Status

Early. Shipping fast. Core features work — agents, sessions, chat, memory, environments. What's next:

- [ ] SSE streaming (currently polling)
- [ ] File upload / media attachments
- [ ] Session event filtering and search
- [ ] Agent skill configuration UI
- [ ] Callable agent orchestration view
- [ ] Auto-trigger evals when a session completes, instead of only on demand
- [ ] Investigate `Agent.callable_agents` as a way to attach an eval run to its target session instead of spinning up a disconnected one

## License

MIT

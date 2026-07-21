// Direct server-to-server Anthropic calls, for use inside route handlers that
// need to call the API themselves (e.g. to drive an eval agent) rather than
// proxying a request that originated in the browser. Mirrors the header/auth
// logic in app/api/anthropic/route.ts.
import type { Session, SessionEvent } from "./types";

function getApiKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return key;
}

const HEADERS = {
  "anthropic-version": "2023-06-01",
  "anthropic-beta": "managed-agents-2026-04-01",
  "content-type": "application/json",
};

async function anthropicFetch(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.anthropic.com${path}`, {
    ...init,
    headers: { "x-api-key": getApiKey(), ...HEADERS },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

export async function getSessionServer(sessionId: string): Promise<Session> {
  return anthropicFetch(`/v1/sessions/${sessionId}`);
}

export async function listSessionEventsServer(sessionId: string): Promise<SessionEvent[]> {
  const data = await anthropicFetch(`/v1/sessions/${sessionId}/events`);
  return Array.isArray(data) ? data : data?.data || [];
}

export async function createSessionServer(agentId: string, environmentId: string): Promise<Session> {
  return anthropicFetch("/v1/sessions", {
    method: "POST",
    body: JSON.stringify({ agent: agentId, environment_id: environmentId }),
  });
}

export async function sendSessionEventServer(sessionId: string, text: string): Promise<unknown> {
  return anthropicFetch(`/v1/sessions/${sessionId}/events`, {
    method: "POST",
    body: JSON.stringify({ events: [{ type: "user.message", content: [{ type: "text", text }] }] }),
  });
}

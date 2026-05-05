// Anthropic Managed Agents API (via /api/anthropic server proxy)
// API key is server-side only — client never sees it
import type { Agent, AgentVersion, CreateEnvironmentRequest, Environment, Session, SessionEvent, MemoryStore, Memory, ModelInfo, McpServer, Vault, VaultCredential, SessionMemoryResource } from "./types";

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`/api/anthropic?path=${encodeURIComponent(path)}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

// Health check — is the server configured with an API key?
export async function checkConfig(): Promise<boolean> {
  const res = await fetch("/api/anthropic");
  const data = await res.json();
  return data.configured === true;
}

export async function listAgents(): Promise<Agent[]> {
  const data = await api("/v1/agents?include_archived=true");
  return data.data || [];
}

export async function listModels(): Promise<ModelInfo[]> {
  const data = await api("/v1/models?limit=100");
  return data.data || [];
}

export async function getAgent(agentId: string): Promise<Agent> {
  return api(`/v1/agents/${agentId}`);
}

export async function createAgent(params: {
  name: string;
  model: string;
  system?: string;
  description?: string;
  tools?: unknown[];
  mcp_servers?: McpServer[];
}): Promise<Agent> {
  return api("/v1/agents", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      model: params.model,
      ...(params.system ? { system: params.system } : {}),
      ...(params.description ? { description: params.description } : {}),
      tools: params.tools || [{ type: "agent_toolset_20260401" }],
      ...(params.mcp_servers?.length ? { mcp_servers: params.mcp_servers } : {}),
    }),
  });
}

export async function updateAgent(agentId: string, version: number, params: {
  name?: string;
  model?: string;
  system?: string | null;
  description?: string | null;
  tools?: unknown[];
  mcp_servers?: McpServer[];
}): Promise<Agent> {
  return api(`/v1/agents/${agentId}`, {
    method: "POST",
    body: JSON.stringify({ version, ...params }),
  });
}

export async function archiveAgent(agentId: string): Promise<Agent> {
  return api(`/v1/agents/${agentId}/archive`, { method: "POST" });
}

export async function listAgentVersions(agentId: string): Promise<AgentVersion[]> {
  const data = await api(`/v1/agents/${agentId}/versions`);
  return data.data || [];
}

export async function listEnvironments(): Promise<Environment[]> {
  const data = await api("/v1/environments");
  return data.data || [];
}

export async function createEnvironment(params: CreateEnvironmentRequest): Promise<Environment> {
  return api("/v1/environments", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function listSessions(): Promise<Session[]> {
  const data = await api("/v1/sessions?include_archived=true&limit=100");
  return data.data || [];
}

export async function getSession(sessionId: string): Promise<Session> {
  return api(`/v1/sessions/${sessionId}`);
}

export async function listSessionEvents(sessionId: string): Promise<SessionEvent[]> {
  const data = await api(`/v1/sessions/${sessionId}/events`);
  return Array.isArray(data) ? data : (data.data || []);
}

export async function createSession(
  agentId: string,
  environmentId: string,
  memoryStores?: string[] | SessionMemoryResource[],
  vaultIds?: string[],
): Promise<Session> {
  const resources = memoryStores?.map((store) => typeof store === "string" ? {
    type: "memory_store" as const,
    memory_store_id: store,
    access: "read_write" as const,
  } : store);
  return api("/v1/sessions", {
    method: "POST",
    body: JSON.stringify({
      agent: agentId,
      environment_id: environmentId,
      ...(resources?.length ? { resources } : {}),
      ...(vaultIds?.length ? { vault_ids: vaultIds } : {}),
    }),
  });
}

export async function sendSessionEvent(
  sessionId: string,
  text: string,
): Promise<unknown> {
  return api(`/v1/sessions/${sessionId}/events`, {
    method: "POST",
    body: JSON.stringify({
      events: [{
        type: "user.message",
        content: [{ type: "text", text }],
      }],
    }),
  });
}


// --- Vaults + MCP credentials ---

export async function listVaults(): Promise<Vault[]> {
  const data = await api("/v1/vaults?limit=100");
  return data.data || [];
}

export async function createVault(displayName: string): Promise<Vault> {
  return api("/v1/vaults", {
    method: "POST",
    body: JSON.stringify({ display_name: displayName }),
  });
}

export async function listVaultCredentials(vaultId: string): Promise<VaultCredential[]> {
  const data = await api(`/v1/vaults/${vaultId}/credentials?limit=100`);
  return data.data || [];
}

export async function createStaticBearerCredential(
  vaultId: string,
  params: { mcpServerUrl: string; token: string; displayName?: string },
): Promise<VaultCredential> {
  return api(`/v1/vaults/${vaultId}/credentials`, {
    method: "POST",
    body: JSON.stringify({
      display_name: params.displayName || undefined,
      auth: {
        type: "static_bearer",
        mcp_server_url: params.mcpServerUrl,
        token: params.token,
      },
    }),
  });
}

// --- Memory Stores ---

export async function listMemoryStores(): Promise<MemoryStore[]> {
  const data = await api("/v1/memory_stores");
  return data.data || [];
}

export async function createMemoryStore(name: string, description: string): Promise<MemoryStore> {
  return api("/v1/memory_stores", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export async function listMemories(storeId: string, pathPrefix?: string): Promise<Memory[]> {
  const pp = pathPrefix ? `?path_prefix=${encodeURIComponent(pathPrefix)}` : "";
  const data = await api(`/v1/memory_stores/${storeId}/memories${pp}`);
  return data.data || [];
}

export async function getMemory(storeId: string, memoryId: string): Promise<Memory> {
  return api(`/v1/memory_stores/${storeId}/memories/${memoryId}`);
}

export async function writeMemory(storeId: string, path: string, content: string): Promise<Memory> {
  return api(`/v1/memory_stores/${storeId}/memories`, {
    method: "POST",
    body: JSON.stringify({ path, content }),
  });
}

export async function updateMemory(storeId: string, memoryId: string, updates: { content?: string; path?: string }): Promise<Memory> {
  // Anthropic's memory update endpoint uses POST, not PATCH.
  return api(`/v1/memory_stores/${storeId}/memories/${memoryId}`, {
    method: "POST",
    body: JSON.stringify(updates),
  });
}

export async function deleteMemory(storeId: string, memoryId: string): Promise<void> {
  await api(`/v1/memory_stores/${storeId}/memories/${memoryId}`, {
    method: "DELETE",
  });
}

"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "../components/Sidebar";
import { Chat } from "../components/Chat";
import { Input } from "../components/Input";
import { AgentPanel } from "../components/AgentPanel";
import { EnvironmentPanel } from "../components/EnvironmentPanel";
import { MemoryPanel } from "../components/MemoryPanel";
import { VaultPanel } from "../components/VaultPanel";
import { RubricsPanel } from "../components/RubricsPanel";
import { EvalRunsPanel } from "../components/EvalRunsPanel";
import { NewSessionModal } from "../components/NewSessionModal";
import { checkConfig, listAgents, listEnvironments, listSessions, listSessionEvents, sendSessionEvent, getSession, listVaults } from "../lib/api";
import { eventsToMessages } from "../lib/events";
import type { Agent, Environment, Session, Message, Vault } from "../lib/types";

const STATUS_COLORS: Record<string, string> = {
  idle: "#fcd53a",
  running: "#12c905",
  rescheduling: "#ff9800",
  terminated: "#fc533a",
};

function getAgentId(session: Session): string {
  if (typeof session.agent === "string") return session.agent;
  return session.agent.id;
}

function SessionList({
  sessions,
  agentId,
  activeSessionId,
  onSelect,
}: {
  sessions: Session[];
  agentId: string;
  activeSessionId: string | null;
  onSelect: (s: Session) => void;
}) {
  const agentSessions = sessions.filter((s) => getAgentId(s) === agentId);

  if (agentSessions.length === 0) {
    return (
      <div style={{ padding: "20px 16px", color: "#666", fontSize: 13 }}>
        No sessions yet
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
      {agentSessions.map((s) => (
        <div
          key={s.id}
          onClick={() => onSelect(s)}
          style={{
            padding: "10px 16px",
            cursor: "pointer",
            background: s.id === activeSessionId ? "#252525" : "transparent",
            borderLeft: s.id === activeSessionId ? "2px solid #fcd53a" : "2px solid transparent",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: STATUS_COLORS[s.status] || "#666",
            }} />
            <div style={{ fontSize: 13, color: "#eee", fontWeight: 500 }}>
              {s.title || s.id.slice(0, 20) + "…"}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 4, paddingLeft: 16 }}>
            {s.status} · {new Date(s.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [active, setActive] = useState<Agent | null>(null);
  const [activeEnv, setActiveEnv] = useState<Environment | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [envDetail, setEnvDetail] = useState<Environment | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const [showVaults, setShowVaults] = useState(false);
  const [showRubrics, setShowRubrics] = useState(false);
  const [showEvalRuns, setShowEvalRuns] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [showEnvironmentPanel, setShowEnvironmentPanel] = useState(false);
  const [agentPanel, setAgentPanel] = useState<{ mode: "create" } | { mode: "edit"; agent: Agent } | null>(null);

  // Check server config on mount
  useEffect(() => {
    checkConfig().then((ok) => {
      setConfigured(ok);
      if (ok) {
        listAgents().then(setAgents).catch(console.error);
        listEnvironments().then((envs) => {
          setEnvironments(envs);
          if (envs.length > 0 && !activeEnv) setActiveEnv(envs[0]);
        }).catch(console.error);
        listSessions().then(setSessions).catch(console.error);
        listVaults().then(setVaults).catch(console.error);
      }
    }).catch(() => setConfigured(false));
  }, []);

  // Load events when a session is selected
  useEffect(() => {
    if (!configured || !activeSession) return;
    setEventsLoading(true);
    listSessionEvents(activeSession.id)
      .then((events) => {
        setMessages(eventsToMessages(events));
      })
      .catch((e) => {
        console.error("Failed to load events:", e);
        setMessages([{ role: "system", content: `Failed to load events: ${e.message}` }]);
      })
      .finally(() => setEventsLoading(false));
  }, [configured, activeSession?.id]);

  const handleSelect = (agent: Agent) => {
    setActive(agent);
    setActiveSession(null);
    setMessages([]);
  };

  const handleSelectSession = (session: Session) => {
    setActiveSession(session);
    setMessages([]);
  };

  const handleSessionCreated = (session: Session) => {
    setSessions((prev) => [session, ...prev]);
    setActiveSession(session);
    setMessages([]);
    setShowNewSession(false);
  };

  const handleSend = async (text: string) => {
    if (!active || active.archived_at) return;

    if (!activeSession) {
      setShowNewSession(true);
      return;
    }

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      await sendSessionEvent(activeSession.id, text);

      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const [events, updated] = await Promise.all([
          listSessionEvents(activeSession.id),
          getSession(activeSession.id),
        ]);
        setMessages(eventsToMessages(events));
        if (updated.status === "idle" || updated.status === "terminated") break;
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "system", content: `Error: ${e}` }]);
    } finally {
      setLoading(false);
    }
  };

  // Not configured — show setup message
  if (configured === null) return null;
  if (configured === false) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: "100vw", height: "100vh", background: "#111",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#eee" }}>posse</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 12, lineHeight: 1.6 }}>
            Set <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, color: "#fcd53a" }}>ANTHROPIC_API_KEY</code> in <code style={{ background: "#1a1a1a", padding: "2px 6px", borderRadius: 4, color: "#aaa" }}>.env.local</code> and restart the server.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", background: "#111" }}>
      <Sidebar
        agents={agents}
        environments={environments}
        activeId={active?.id || null}
        activeEnvId={activeEnv?.id || null}
        onSelect={handleSelect}
        onSelectEnv={setActiveEnv}
        onShowEnvDetail={setEnvDetail}
        onShowMemory={() => setShowMemory(true)}
        onShowVaults={() => setShowVaults(true)}
        onShowRubrics={() => setShowRubrics(true)}
        onCreateAgent={() => setAgentPanel({ mode: "create" })}
        onEditAgent={(a) => setAgentPanel({ mode: "edit", agent: a })}
        onCreateEnvironment={() => setShowEnvironmentPanel(true)}
      />
      {active && (
        <div style={{
          width: 260, borderRight: "1px solid #2a2a2a", background: "#161616",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid #2a2a2a",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 12, color: "#888", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Sessions
            </span>
            {!active.archived_at && (
              <button
                onClick={() => setShowNewSession(true)}
                style={{
                  background: "transparent", border: "1px solid #333", borderRadius: 6,
                  color: "#aaa", fontSize: 12, padding: "3px 10px", cursor: "pointer",
                }}
              >
                + New
              </button>
            )}
          </div>
          <SessionList
            sessions={sessions}
            agentId={active.id}
            activeSessionId={activeSession?.id || null}
            onSelect={handleSelectSession}
          />
        </div>
      )}

      {envDetail && (
        <div
          onClick={() => setEnvDetail(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12,
              width: 500, maxHeight: "80vh", overflowY: "auto", padding: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#eee" }}>
                  {envDetail.name || "Environment"}
                </div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 2, fontFamily: "monospace" }}>
                  {envDetail.id}
                </div>
              </div>
              <button
                onClick={() => setEnvDetail(null)}
                style={{
                  background: "transparent", border: "none", color: "#666",
                  fontSize: 18, cursor: "pointer", padding: "0 4px",
                }}
              >
                ×
              </button>
            </div>
            {Object.entries(envDetail).map(([key, value]) => (
              <div key={key} style={{ display: "flex", padding: "8px 0", borderBottom: "1px solid #222" }}>
                <div style={{ width: 140, flexShrink: 0, fontSize: 12, color: "#888", fontFamily: "monospace" }}>
                  {key}
                </div>
                <div style={{ flex: 1, fontSize: 13, color: "#ddd", wordBreak: "break-all" }}>
                  {value === null || value === undefined
                    ? <span style={{ color: "#555" }}>—</span>
                    : typeof value === "object"
                    ? <pre style={{ margin: 0, fontSize: 12, color: "#aaa", whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    : String(value)
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {agentPanel && (
        <AgentPanel
          agent={agentPanel.mode === "edit" ? agentPanel.agent : null}
          onClose={() => setAgentPanel(null)}
          onSaved={(saved) => {
            setAgents((prev) => {
              const idx = prev.findIndex((a) => a.id === saved.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = saved;
                return next;
              }
              return [saved, ...prev];
            });
            if (active?.id === saved.id) setActive(saved);
            setAgentPanel(null);
          }}
          onArchived={(id) => {
            setAgents((prev) => prev.filter((a) => a.id !== id));
            if (active?.id === id) { setActive(null); setActiveSession(null); setMessages([]); }
            setAgentPanel(null);
          }}
        />
      )}

      {showVaults && (
        <VaultPanel
          agentsMcpServers={agents.flatMap((agent) => agent.mcp_servers || [])}
          onClose={() => setShowVaults(false)}
          onChanged={() => listVaults().then(setVaults).catch(console.error)}
        />
      )}

      {showMemory && (
        <MemoryPanel onClose={() => setShowMemory(false)} />
      )}

      {showRubrics && (
        <RubricsPanel onClose={() => setShowRubrics(false)} />
      )}

      {showEvalRuns && activeSession && (
        <EvalRunsPanel
          sessionId={activeSession.id}
          agents={agents}
          onClose={() => setShowEvalRuns(false)}
        />
      )}

      {showEnvironmentPanel && (
        <EnvironmentPanel
          onClose={() => setShowEnvironmentPanel(false)}
          onCreated={(env) => {
            setEnvironments((prev) => [env, ...prev.filter((e) => e.id !== env.id)]);
            setActiveEnv(env);
            setShowEnvironmentPanel(false);
          }}
        />
      )}

      {showNewSession && (
        <NewSessionModal
          agents={agents}
          environments={environments}
          defaultAgentId={active?.id}
          defaultEnvId={activeEnv?.id}
          onCreated={handleSessionCreated}
          onClose={() => setShowNewSession(false)}
        />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {active ? (
          <>
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid #2a2a2a",
              fontSize: 15, fontWeight: 500, color: "#eee",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {active.name}
              <span style={{ fontSize: 12, color: "#666" }}>{active.model.id}</span>
              {activeSession && (
                <>
                  <span style={{ fontSize: 11, color: "#555", marginLeft: "auto" }}>
                    {activeSession.title || activeSession.id.slice(0, 24)}
                  </span>
                  <button
                    onClick={() => setShowEvalRuns(true)}
                    style={{
                      background: "transparent", border: "1px solid #333", borderRadius: 6,
                      color: "#aaa", fontSize: 12, padding: "3px 10px", cursor: "pointer",
                    }}
                  >
                    Eval
                  </button>
                </>
              )}
            </div>
            {eventsLoading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
                Loading events…
              </div>
            ) : messages.length > 0 ? (
              <Chat messages={messages} loading={loading} />
            ) : (
              <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                color: "#444", fontSize: 13,
              }}>
                {activeSession ? "No messages yet" : "Send a message to start a new session"}
              </div>
            )}
            <Input onSend={handleSend} disabled={loading || eventsLoading || !!active?.archived_at} />
          </>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { avatarColor } from "../lib/colors";
import type { Agent, Environment } from "../lib/types";

interface Props {
  agents: Agent[];
  environments: Environment[];
  activeId: string | null;
  activeEnvId: string | null;
  onSelect: (agent: Agent) => void;
  onSelectEnv: (env: Environment) => void;
  onShowEnvDetail: (env: Environment) => void;

  onShowMemory?: () => void;
  onShowVaults?: () => void;
  onShowRubrics?: () => void;
  onCreateAgent?: () => void;
  onEditAgent?: (agent: Agent) => void;
  onCreateEnvironment?: () => void;
}

function AgentRow({ agent, active, onSelect, onEdit }: {
  agent: Agent; active: boolean;
  onSelect: () => void; onEdit?: () => void;
}) {
  const archived = !!agent.archived_at;
  const color = avatarColor(agent.name);
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 8px", borderRadius: 6, cursor: "pointer",
        background: active ? "#2a2a2a" : "transparent",
        opacity: archived ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: "22%",
        background: color, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 14, fontWeight: 600,
        color: "#fff", flexShrink: 0,
      }}>
        {agent.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: "#eee",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{agent.name}</div>
        <div style={{
          fontSize: 11, color: "#666",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{agent.model.id}</div>
      </div>
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          style={{
            background: "none", border: "none", color: "#555",
            fontSize: 14, cursor: "pointer", padding: "2px 4px",
            flexShrink: 0, opacity: 0.5,
          }}
          title="Edit agent"
        >⚙</button>
      )}
    </div>
  );
}

export function Sidebar({ agents, environments, activeId, activeEnvId, onSelect, onSelectEnv, onShowEnvDetail, onShowMemory, onShowVaults, onShowRubrics, onCreateAgent, onEditAgent, onCreateEnvironment }: Props) {
  const [showArchived, setShowArchived] = useState(false);
  const activeAgents = agents.filter((a) => !a.archived_at);
  const archivedAgents = agents.filter((a) => !!a.archived_at);

  return (
    <div style={{
      width: 200, minWidth: 200, height: "100vh",
      background: "#161616", borderRight: "1px solid #2a2a2a",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 14px 12px", borderBottom: "1px solid #2a2a2a",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#eee" }}>posse</span>
        {onCreateAgent && (
          <button
            onClick={onCreateAgent}
            style={{
              background: "transparent", border: "1px solid #333", borderRadius: 6,
              color: "#aaa", fontSize: 12, padding: "2px 8px", cursor: "pointer",
            }}
          >+</button>
        )}
      </div>

      {/* Agent list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
        {activeAgents.map((a) => (
          <AgentRow
            key={a.id}
            agent={a}
            active={a.id === activeId}
            onSelect={() => onSelect(a)}
            onEdit={onEditAgent ? () => onEditAgent(a) : undefined}
          />
        ))}

        {/* Archived section */}
        {archivedAgents.length > 0 && (
          <>
            <div
              onClick={() => setShowArchived(!showArchived)}
              style={{
                padding: "8px 8px 4px", marginTop: 8,
                fontSize: 10, color: "#555", textTransform: "uppercase",
                letterSpacing: "0.5px", cursor: "pointer", userSelect: "none",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ fontSize: 9 }}>{showArchived ? "▾" : "▸"}</span>
              Archived ({archivedAgents.length})
            </div>
            {showArchived && archivedAgents.map((a) => (
              <AgentRow
                key={a.id}
                agent={a}
                active={a.id === activeId}
                onSelect={() => onSelect(a)}
                onEdit={onEditAgent ? () => onEditAgent(a) : undefined}
              />
            ))}
          </>
        )}
      </div>

      {/* Environments */}
      <div style={{ padding: "8px 6px", borderTop: "1px solid #2a2a2a" }}>
        <div style={{
          fontSize: 10, color: "#666", textTransform: "uppercase",
          letterSpacing: "0.5px", padding: "4px 8px 6px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>Environments</span>
          {onCreateEnvironment && (
            <button
              onClick={onCreateEnvironment}
              style={{
                background: "transparent", border: "1px solid #333", borderRadius: 5,
                color: "#777", fontSize: 11, padding: "0 6px", cursor: "pointer",
                lineHeight: "16px",
              }}
              title="Create environment"
            >+</button>
          )}
        </div>
        {environments.length === 0 ? (
          <div style={{ padding: "6px 8px", fontSize: 12, color: "#555" }}>
            No environments
          </div>
        ) : environments.map((env) => (
              <div
                key={env.id}
                onClick={() => onShowEnvDetail(env)}
                style={{
                  padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                  fontSize: 13, color: "#888",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: "#555",
                }} />
                <span style={{
                  flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {env.name || env.id.slice(0, 24)}
                </span>
              </div>
        ))}
      </div>

      {/* Vaults + Memory + Rubrics */}
      {(onShowVaults || onShowMemory || onShowRubrics) && (
        <div style={{ padding: "8px 6px", borderTop: "1px solid #2a2a2a" }}>
          {onShowRubrics && (
            <div
              onClick={onShowRubrics}
              style={{
                padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                fontSize: 13, color: "#888",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>📋</span>
              <span style={{ flex: 1 }}>Rubrics</span>
            </div>
          )}
          {onShowVaults && (
            <div
              onClick={onShowVaults}
              style={{
                padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                fontSize: 13, color: "#888",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>🔐</span>
              <span style={{ flex: 1 }}>Vaults</span>
            </div>
          )}
          {onShowMemory && (
            <div
              onClick={onShowMemory}
              style={{
                padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                fontSize: 13, color: "#888",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>🧠</span>
              <span style={{ flex: 1 }}>Memory</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: "10px 14px", borderTop: "1px solid #2a2a2a",
      }}>

      </div>
    </div>
  );
}

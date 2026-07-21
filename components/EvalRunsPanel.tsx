"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { listRubrics, createEvalRun, listEvalRuns, getEvalRun } from "../lib/api";
import type { Rubric, EvalRun, Agent } from "../lib/types";

interface Props {
  sessionId: string;
  agents: Agent[];
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#888",
  running: "#12c905",
  completed: "#fcd53a",
  failed: "#fc533a",
};

export function EvalRunsPanel({ sessionId, agents, onClose }: Props) {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [rubricId, setRubricId] = useState("");
  const [evalAgentId, setEvalAgentId] = useState("");
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState("");
  const pollTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    listRubrics().then((r) => {
      setRubrics(r);
      if (r[0]) setRubricId(r[0].id);
    }).catch(() => setRubrics([]));
    if (agents[0]) setEvalAgentId(agents[0].id);
  }, [agents]);

  const loadRuns = useCallback(() => {
    listEvalRuns(sessionId).then(setRuns).catch(() => {});
  }, [sessionId]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const pollRun = useCallback((runId: string) => {
    const tick = async () => {
      try {
        const run = await getEvalRun(runId);
        setRuns((prev) => prev.map((r) => (r.id === runId ? run : r)));
        if (run.status === "pending" || run.status === "running") {
          pollTimers.current.set(runId, setTimeout(tick, 2000));
        } else {
          pollTimers.current.delete(runId);
        }
      } catch {
        pollTimers.current.delete(runId);
      }
    };
    tick();
  }, []);

  useEffect(() => {
    for (const run of runs) {
      if ((run.status === "pending" || run.status === "running") && !pollTimers.current.has(run.id)) {
        pollRun(run.id);
      }
    }
  }, [runs, pollRun]);

  useEffect(() => {
    const timers = pollTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
    };
  }, []);

  const handleTrigger = async () => {
    if (!rubricId || !evalAgentId) return;
    setTriggering(true);
    setError("");
    try {
      const run = await createEvalRun({ session_id: sessionId, rubric_id: rubricId, eval_agent_id: evalAgentId });
      setRuns((prev) => [run, ...prev]);
      pollRun(run.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTriggering(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: "#888", fontWeight: 500, textTransform: "uppercase",
    letterSpacing: "0.5px", marginBottom: 6, display: "block",
  };
  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
    background: "#1a1a1a", border: "1px solid #333", color: "#eee",
    outline: "none", boxSizing: "border-box", appearance: "none", WebkitAppearance: "none",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#161616", border: "1px solid #2a2a2a", borderRadius: 12,
          width: 560, maxHeight: "85vh", overflowY: "auto", padding: 0,
        }}
      >
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #2a2a2a",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#eee" }}>Evals</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {rubrics.length === 0 ? (
            <div style={{ fontSize: 12, color: "#666" }}>
              No rubrics yet — create one from the sidebar first.
            </div>
          ) : (
            <>
              <div>
                <label style={labelStyle}>Rubric</label>
                <select value={rubricId} onChange={(e) => setRubricId(e.target.value)} style={selectStyle}>
                  {rubrics.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Judge agent</label>
                <select value={evalAgentId} onChange={(e) => setEvalAgentId(e.target.value)} style={selectStyle}>
                  {agents.filter((a) => !a.archived_at).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <button
                  onClick={handleTrigger}
                  disabled={triggering}
                  style={{
                    padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: triggering ? "#333" : "#fcd53a", color: "#111",
                    border: "none", cursor: triggering ? "default" : "pointer",
                    opacity: triggering ? 0.6 : 1,
                  }}
                >
                  {triggering ? "Starting…" : "Run Eval"}
                </button>
              </div>
            </>
          )}

          {error && <div style={{ fontSize: 12, color: "#fc533a" }}>{error}</div>}

          <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
              Runs
            </div>
            {runs.length === 0 ? (
              <div style={{ fontSize: 12, color: "#555" }}>No eval runs for this session yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {runs.map((run) => {
                  const rubric = rubrics.find((r) => r.id === run.rubric_id);
                  return (
                    <div key={run.id} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[run.status] }} />
                        <div style={{ fontSize: 13, color: "#eee", fontWeight: 500 }}>
                          {rubric?.name || run.rubric_id.slice(0, 8)}
                        </div>
                        <div style={{ fontSize: 11, color: "#666", marginLeft: "auto" }}>{run.status}</div>
                      </div>
                      {run.verdict && (
                        <div style={{ marginTop: 8, fontSize: 12, color: "#ccc" }}>
                          <div>Score: {(run.verdict.overall_score * 100).toFixed(0)}% · {run.verdict.pass ? "Pass" : "Fail"}</div>
                          <div style={{ marginTop: 4, color: "#999" }}>{run.verdict.rationale}</div>
                        </div>
                      )}
                      {run.error && (
                        <div style={{ marginTop: 8, fontSize: 12, color: "#fc533a" }}>{run.error}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

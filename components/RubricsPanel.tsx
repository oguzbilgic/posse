"use client";

import { useState, useEffect, useCallback } from "react";
import { listRubrics, createRubric, updateRubric, archiveRubric } from "../lib/api";
import type { Rubric, RubricCriterion } from "../lib/types";

interface Props {
  onClose: () => void;
}

function emptyCriterion(): RubricCriterion {
  return { id: crypto.randomUUID(), label: "", description: "" };
}

export function RubricsPanel({ onClose }: Props) {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    listRubrics().then(setRubrics).catch((e) => setError(e.message || String(e)));
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = rubrics.find((r) => r.id === activeId) || null;

  const startCreate = () => {
    setCreating(true);
    setActiveId(null);
    setName("");
    setDescription("");
    setInstructions("");
    setCriteria([emptyCriterion()]);
    setError("");
  };

  const startEdit = (r: Rubric) => {
    setCreating(false);
    setActiveId(r.id);
    setName(r.name);
    setDescription(r.description || "");
    setInstructions(r.instructions);
    setCriteria(r.criteria.length ? r.criteria : [emptyCriterion()]);
    setError("");
  };

  const handleSave = async () => {
    if (!name.trim() || !instructions.trim()) { setError("Name and instructions are required"); return; }
    setSaving(true);
    setError("");
    const cleanCriteria = criteria.filter((c) => c.label.trim());
    try {
      if (creating) {
        const rubric = await createRubric({
          name: name.trim(),
          description: description.trim() || undefined,
          instructions: instructions.trim(),
          criteria: cleanCriteria,
        });
        setRubrics((prev) => [rubric, ...prev]);
        startEdit(rubric);
      } else if (activeId) {
        const rubric = await updateRubric(activeId, {
          name: name.trim(),
          description: description.trim() || undefined,
          instructions: instructions.trim(),
          criteria: cleanCriteria,
        });
        setRubrics((prev) => prev.map((r) => (r.id === rubric.id ? rubric : r)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!activeId || !confirm("Archive this rubric?")) return;
    setSaving(true);
    try {
      await archiveRubric(activeId);
      setRubrics((prev) => prev.filter((r) => r.id !== activeId));
      setActiveId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const updateCriterion = (index: number, patch: Partial<RubricCriterion>) => {
    setCriteria((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };
  const addCriterion = () => setCriteria((prev) => [...prev, emptyCriterion()]);
  const removeCriterion = (index: number) => setCriteria((prev) => prev.filter((_, i) => i !== index));

  const sectionLabel: React.CSSProperties = {
    fontSize: 10, color: "#666", textTransform: "uppercase",
    letterSpacing: "0.5px", padding: "8px 12px 4px",
  };
  const rowStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#ccc",
    background: isActive ? "#252525" : "transparent",
    borderLeft: isActive ? "2px solid #fcd53a" : "2px solid transparent",
  });
  const btnStyle: React.CSSProperties = {
    background: "transparent", border: "1px solid #333", borderRadius: 6,
    color: "#aaa", fontSize: 11, padding: "3px 8px", cursor: "pointer",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 13,
    background: "#1a1a1a", border: "1px solid #333", color: "#eee",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: "#888", display: "block", marginBottom: 4, fontWeight: 500,
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)", display: "flex", zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: "auto", width: "90%", maxWidth: 900, height: "80vh",
          background: "#161616", border: "1px solid #2a2a2a", borderRadius: 12,
          display: "flex", overflow: "hidden",
        }}
      >
        {/* Left: rubric list */}
        <div style={{ width: 240, minWidth: 240, borderRight: "1px solid #2a2a2a", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px 0" }}>
            <div style={sectionLabel}>Rubrics</div>
            <button style={btnStyle} onClick={startCreate}>+ New</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", marginTop: 4 }}>
            {rubrics.map((r) => (
              <div key={r.id} onClick={() => startEdit(r)} style={rowStyle(r.id === activeId)}>
                <div style={{ fontWeight: 500 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "#666" }}>{r.criteria.length} criteria</div>
              </div>
            ))}
            {rubrics.length === 0 && (
              <div style={{ padding: "12px", color: "#555", fontSize: 12 }}>No rubrics yet</div>
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid #2a2a2a",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#eee" }}>
              {creating ? "New Rubric" : active ? active.name : "Rubrics"}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {active && !creating && (
                <button style={{ ...btnStyle, color: "#fc533a" }} onClick={handleArchive} disabled={saving}>Archive</button>
              )}
              <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 18, cursor: "pointer", padding: "0 4px" }}>×</button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {creating || active ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Task completion" autoFocus />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this rubric checks for" />
                </div>
                <div>
                  <label style={labelStyle}>Judge instructions</label>
                  <textarea
                    style={{ ...inputStyle, height: 100, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="You are grading a coding agent's session transcript. Be strict about..."
                  />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={labelStyle}>Criteria</label>
                    <button type="button" style={{ ...btnStyle, padding: "5px 10px" }} onClick={addCriterion}>+ Add criterion</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {criteria.map((c, i) => (
                      <div key={c.id} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 6 }}>
                          <input style={inputStyle} value={c.label} onChange={(e) => updateCriterion(i, { label: e.target.value })} placeholder="Criterion label" />
                          <button
                            type="button"
                            style={{ ...btnStyle, color: "#fc533a", borderColor: "#fc533a44" }}
                            onClick={() => removeCriterion(i)}
                            aria-label={`Remove criterion ${i + 1}`}
                          >×</button>
                        </div>
                        <input
                          style={inputStyle}
                          value={c.description || ""}
                          onChange={(e) => updateCriterion(i, { description: e.target.value })}
                          placeholder="Optional description"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {error && <div style={{ fontSize: 12, color: "#fc533a" }}>{error}</div>}
                <div>
                  <button
                    style={{ ...btnStyle, color: "#eee", borderColor: "#fcd53a66", background: "#fcd53a15", padding: "8px 16px" }}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : creating ? "Create Rubric" : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: "#555", fontSize: 13, textAlign: "center", marginTop: 40 }}>
                Select a rubric or create a new one
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

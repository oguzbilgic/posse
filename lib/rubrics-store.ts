// CRUD helpers over the local rubrics/eval_runs tables. Plain SQL, no ORM —
// consistent with the rest of posse's minimal-dependency approach.
import { randomUUID } from "crypto";
import db from "./db";
import type { Rubric, RubricCriterion, EvalRun, EvalRunStatus, EvalVerdict } from "./types";

interface RubricRow {
  id: string;
  name: string;
  description: string | null;
  instructions: string;
  criteria: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

function rowToRubric(row: RubricRow): Rubric {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    instructions: row.instructions,
    criteria: JSON.parse(row.criteria),
    created_at: row.created_at,
    updated_at: row.updated_at,
    archived_at: row.archived_at,
  };
}

export function listRubrics(includeArchived = false): Rubric[] {
  const rows = includeArchived
    ? (db.prepare("SELECT * FROM rubrics ORDER BY created_at DESC").all() as RubricRow[])
    : (db.prepare("SELECT * FROM rubrics WHERE archived_at IS NULL ORDER BY created_at DESC").all() as RubricRow[]);
  return rows.map(rowToRubric);
}

export function getRubric(id: string): Rubric | null {
  const row = db.prepare("SELECT * FROM rubrics WHERE id = ?").get(id) as RubricRow | undefined;
  return row ? rowToRubric(row) : null;
}

export function createRubric(params: {
  name: string;
  description?: string;
  instructions: string;
  criteria: RubricCriterion[];
}): Rubric {
  const now = new Date().toISOString();
  const row: RubricRow = {
    id: randomUUID(),
    name: params.name,
    description: params.description || null,
    instructions: params.instructions,
    criteria: JSON.stringify(params.criteria),
    created_at: now,
    updated_at: now,
    archived_at: null,
  };
  db.prepare(
    `INSERT INTO rubrics (id, name, description, instructions, criteria, created_at, updated_at, archived_at)
     VALUES (@id, @name, @description, @instructions, @criteria, @created_at, @updated_at, @archived_at)`
  ).run(row);
  return rowToRubric(row);
}

export function updateRubric(
  id: string,
  params: Partial<{ name: string; description?: string; instructions: string; criteria: RubricCriterion[] }>
): Rubric | null {
  const existing = getRubric(id);
  if (!existing) return null;
  const merged: RubricRow = {
    id,
    name: params.name ?? existing.name,
    description: (params.description ?? existing.description) || null,
    instructions: params.instructions ?? existing.instructions,
    criteria: JSON.stringify(params.criteria ?? existing.criteria),
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
    archived_at: existing.archived_at,
  };
  db.prepare(
    `UPDATE rubrics SET name=@name, description=@description, instructions=@instructions,
     criteria=@criteria, updated_at=@updated_at WHERE id=@id`
  ).run(merged);
  return rowToRubric(merged);
}

export function archiveRubric(id: string): Rubric | null {
  if (!getRubric(id)) return null;
  const now = new Date().toISOString();
  db.prepare("UPDATE rubrics SET archived_at=?, updated_at=? WHERE id=?").run(now, now, id);
  return getRubric(id);
}

// --- eval runs ---

interface EvalRunRow {
  id: string;
  session_id: string;
  rubric_id: string;
  eval_agent_id: string;
  eval_session_id: string | null;
  status: EvalRunStatus;
  verdict: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function rowToEvalRun(row: EvalRunRow): EvalRun {
  return {
    id: row.id,
    session_id: row.session_id,
    rubric_id: row.rubric_id,
    eval_agent_id: row.eval_agent_id,
    eval_session_id: row.eval_session_id,
    status: row.status,
    verdict: row.verdict ? JSON.parse(row.verdict) : null,
    error: row.error,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
  };
}

export function listEvalRuns(sessionId?: string): EvalRun[] {
  const rows = sessionId
    ? (db.prepare("SELECT * FROM eval_runs WHERE session_id = ? ORDER BY created_at DESC").all(sessionId) as EvalRunRow[])
    : (db.prepare("SELECT * FROM eval_runs ORDER BY created_at DESC").all() as EvalRunRow[]);
  return rows.map(rowToEvalRun);
}

export function getEvalRun(id: string): EvalRun | null {
  const row = db.prepare("SELECT * FROM eval_runs WHERE id = ?").get(id) as EvalRunRow | undefined;
  return row ? rowToEvalRun(row) : null;
}

export function createEvalRun(params: { session_id: string; rubric_id: string; eval_agent_id: string }): EvalRun {
  const now = new Date().toISOString();
  const row: EvalRunRow = {
    id: randomUUID(),
    session_id: params.session_id,
    rubric_id: params.rubric_id,
    eval_agent_id: params.eval_agent_id,
    eval_session_id: null,
    status: "pending",
    verdict: null,
    error: null,
    created_at: now,
    updated_at: now,
    completed_at: null,
  };
  db.prepare(
    `INSERT INTO eval_runs (id, session_id, rubric_id, eval_agent_id, eval_session_id, status, verdict, error, created_at, updated_at, completed_at)
     VALUES (@id, @session_id, @rubric_id, @eval_agent_id, @eval_session_id, @status, @verdict, @error, @created_at, @updated_at, @completed_at)`
  ).run(row);
  return rowToEvalRun(row);
}

export function updateEvalRun(
  id: string,
  patch: Partial<{
    eval_session_id: string;
    status: EvalRunStatus;
    verdict: EvalVerdict;
    error: string;
    completed_at: string;
  }>
): EvalRun | null {
  const existing = getEvalRun(id);
  if (!existing) return null;
  const merged: EvalRunRow = {
    id,
    session_id: existing.session_id,
    rubric_id: existing.rubric_id,
    eval_agent_id: existing.eval_agent_id,
    eval_session_id: patch.eval_session_id ?? existing.eval_session_id,
    status: patch.status ?? existing.status,
    verdict: patch.verdict ? JSON.stringify(patch.verdict) : existing.verdict ? JSON.stringify(existing.verdict) : null,
    error: patch.error ?? existing.error,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
    completed_at: patch.completed_at ?? existing.completed_at,
  };
  db.prepare(
    `UPDATE eval_runs SET eval_session_id=@eval_session_id, status=@status, verdict=@verdict,
     error=@error, updated_at=@updated_at, completed_at=@completed_at WHERE id=@id`
  ).run(merged);
  return rowToEvalRun(merged);
}

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// lib/db.ts reads POSSE_DB_PATH at import time, so point it at a scratch file
// before importing the store — this keeps tests isolated from dev data.
const dbPath = path.join(os.tmpdir(), `posse-test-${Date.now()}.sqlite3`);
process.env.POSSE_DB_PATH = dbPath;

let store: typeof import("./rubrics-store");

beforeAll(async () => {
  store = await import("./rubrics-store");
});

afterAll(() => {
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(dbPath + suffix, { force: true });
});

describe("rubrics-store", () => {
  it("creates, lists, updates, and archives a rubric", () => {
    const rubric = store.createRubric({
      name: "Correctness",
      instructions: "Check correctness",
      criteria: [{ id: "c1", label: "No bugs" }],
    });
    expect(rubric.id).toBeTruthy();
    expect(store.listRubrics()).toHaveLength(1);

    const updated = store.updateRubric(rubric.id, { name: "Correctness v2" });
    expect(updated?.name).toBe("Correctness v2");

    const archived = store.archiveRubric(rubric.id);
    expect(archived?.archived_at).not.toBeNull();
    expect(store.listRubrics()).toHaveLength(0);
    expect(store.listRubrics(true)).toHaveLength(1);
  });

  it("creates an eval run and updates it through its lifecycle", () => {
    const rubric = store.createRubric({ name: "R", instructions: "I", criteria: [] });
    const run = store.createEvalRun({ session_id: "sess_1", rubric_id: rubric.id, eval_agent_id: "agent_1" });
    expect(run.status).toBe("pending");

    const running = store.updateEvalRun(run.id, { status: "running", eval_session_id: "sess_eval" });
    expect(running?.status).toBe("running");
    expect(running?.eval_session_id).toBe("sess_eval");

    const verdict = { overall_score: 0.9, pass: true, rationale: "great", per_criterion: [] };
    const completed = store.updateEvalRun(run.id, { status: "completed", verdict, completed_at: "2026-01-01T00:00:00Z" });
    expect(completed?.status).toBe("completed");
    expect(completed?.verdict).toEqual(verdict);

    expect(store.listEvalRuns("sess_1")).toHaveLength(1);
    expect(store.listEvalRuns("sess_other")).toHaveLength(0);
  });
});

// Local SQLite store for rubrics + eval runs.
// This is posse's first local persistence — everything else in the app
// (agents, sessions, memory, vaults) lives on Anthropic's side.
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.POSSE_DB_PATH || path.join(process.cwd(), "data", "posse.sqlite3");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS rubrics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    instructions TEXT NOT NULL,
    criteria TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS eval_runs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    rubric_id TEXT NOT NULL,
    eval_agent_id TEXT NOT NULL,
    eval_session_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    verdict TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_eval_runs_session ON eval_runs(session_id);
`);

export default db;

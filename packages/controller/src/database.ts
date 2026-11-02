import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

const PROJECTS_V1 = `CREATE TABLE projects (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
  created_at TEXT NOT NULL
) STRICT`;

const SESSIONS_V2 = `
CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id),
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;
CREATE TABLE messages (
  session_id TEXT NOT NULL REFERENCES sessions(id),
  seq INTEGER NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (session_id, seq)
) STRICT;
CREATE TABLE runs (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  prompt TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','running','completed','failed','cancelled')),
  error TEXT,
  created_at TEXT NOT NULL,
  finished_at TEXT
) STRICT;
CREATE TABLE run_events (
  run_id TEXT NOT NULL REFERENCES runs(id),
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (run_id, seq)
) STRICT;`;

/** Single owner of the application database file, schema, and migrations. */
export function openDatabase(filename: string): Database.Database {
  if (filename !== ':memory:') {
    mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  }
  const db = new Database(filename);
  try {
    if (filename !== ':memory:') chmodSync(filename, 0o600);
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    db.pragma('journal_mode = WAL');
    const version = db.pragma('user_version', { simple: true });
    if (version !== 0 && version !== 1 && version !== 2)
      throw new Error('Unsupported database version.');
    db.transaction(() => {
      if (version === 0) db.exec(PROJECTS_V1);
      if (version === 0 || version === 1) {
        db.exec(SESSIONS_V2);
        db.pragma('user_version = 2');
      }
    })();
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

const PROJECTS = `CREATE TABLE projects (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
  created_at TEXT NOT NULL
) STRICT`;

const SESSIONS = `
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

const CONTEXT_AND_DOCUMENTS = `
CREATE TABLE context_items (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id),
  kind TEXT NOT NULL CHECK(kind IN ('goal','decision','outcome')),
  text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 500),
  created_at TEXT NOT NULL
) STRICT;
CREATE TABLE documents (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  path TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','quarantined')),
  created_at TEXT NOT NULL,
  UNIQUE (project_id, path)
) STRICT;
CREATE TABLE chunks (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  seq INTEGER NOT NULL,
  text TEXT NOT NULL
) STRICT;
CREATE VIRTUAL TABLE chunks_fts USING fts5(text, tokenize = 'porter unicode61');`;

/** Ordered migrations; PRAGMA user_version is the number applied. Never edit an applied entry. */
const MIGRATIONS = [PROJECTS, SESSIONS, CONTEXT_AND_DOCUMENTS];

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
    if (
      typeof version !== 'number' ||
      version < 0 ||
      version > MIGRATIONS.length
    )
      throw new Error('Unsupported database version.');
    db.transaction(() => {
      MIGRATIONS.slice(version).forEach((migration) => db.exec(migration));
      db.pragma(`user_version = ${MIGRATIONS.length}`);
    })();
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

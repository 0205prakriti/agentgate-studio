import { randomUUID } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { z } from 'zod';
import {
  projectSchema,
  type Project,
  type ProjectRepository,
} from './projects';

/** One database owns project metadata. Call close on application/test shutdown. */
export class SqliteProjects implements ProjectRepository {
  private readonly db: Database.Database;

  constructor(filename: string) {
    if (filename !== ':memory:') {
      mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
    }
    this.db = new Database(filename);
    try {
      if (filename !== ':memory:') chmodSync(filename, 0o600);
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('busy_timeout = 5000');
      this.db.pragma('journal_mode = WAL');
      const version = this.db.pragma('user_version', { simple: true });
      if (version !== 0 && version !== 1)
        throw new Error('Unsupported database version.');
      if (version === 0) {
        this.db.transaction(() => {
          this.db.exec(`CREATE TABLE projects (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
            created_at TEXT NOT NULL
          ) STRICT`);
          this.db.pragma('user_version = 1');
        })();
      }
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  create(name: string): Project {
    const project = projectSchema.parse({
      id: randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    });
    this.db
      .prepare('INSERT INTO projects (id, name, created_at) VALUES (?, ?, ?)')
      .run(project.id, project.name, project.createdAt);
    return project;
  }

  list(): Project[] {
    return z
      .array(projectSchema)
      .parse(
        this.db
          .prepare(
            'SELECT id, name, created_at AS createdAt FROM projects ORDER BY created_at DESC, id ASC',
          )
          .all(),
      );
  }

  find(id: string): Project | null {
    const row = this.db
      .prepare(
        'SELECT id, name, created_at AS createdAt FROM projects WHERE id = ?',
      )
      .get(id);
    return row === undefined ? null : projectSchema.parse(row);
  }

  close(): void {
    this.db.close();
  }
}

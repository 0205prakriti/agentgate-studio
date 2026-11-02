import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import {
  projectSchema,
  type Project,
  type ProjectRepository,
} from './projects';

export class SqliteProjects implements ProjectRepository {
  constructor(private readonly db: Database.Database) {}

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
}
